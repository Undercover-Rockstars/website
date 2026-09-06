/* UR Capture, the guided two-photo shoot (#4).
 *
 * URCapture.run({ onStatus }) -> Promise<{ front, side } | null>
 *
 * Runs the whole shoot inside the #fit-camera and #fit-review screens the
 * generated /fit/ page provides: front photo, side photo, review, retake
 * either. Resolves with the two frames as canvases at a fixed 720x960, or
 * null if the person stopped. The frames go to the caller and to nobody
 * else; this file never stores them and never sends them anywhere.
 *
 * The pose guide needs live landmarks. They come from the engine's VIDEO
 * mode (URMeasure.videoFrame, no segmentation, fast). If the engine is not
 * available or still loading, capture degrades honestly to a plain timer
 * with a static silhouette and says so in the feedback line; it never
 * pretends to read a pose it is not reading.
 *
 * Capture modes, both offered (#4): auto, which fires once the pose has
 * been held good and still for a second, and a 3s timer with a beeped
 * countdown, because the person is two metres from the phone.
 */
(function () {
  'use strict';

  var CAP_W = 720, CAP_H = 960;
  var HOLD_MS = 1000;
  var DETECT_EVERY_MS = 120;
  var STABLE_WINDOW = 9;
  var STABLE_SPREAD = 0.025;
  var GUIDE_GREEN = '#4cc38a';
  var GUIDE_ACCENT = '#ff5a36';

  var M = window.URMeasure;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* ------------------------------------------------------------- beeps */

  var audioCtx = null;
  function beep(freq, ms, vol) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.value = vol == null ? 0.12 : vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
      o.stop(audioCtx.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* a beep is a courtesy, not a feature */ }
  }

  /* --------------------------------------------------- the whole shoot */

  function run(onStatus) {
    var say = typeof onStatus === 'function' ? onStatus : function () {};
    return captureView('front')
      .then(function (front) {
        if (!front) return null;
        return captureView('side').then(function (side) {
          if (!side) return null;
          return review(front, side);
        });
      });

    /* Review both frames; retake either until they are accepted. */
    function review(front, side) {
      return new Promise(function (resolve) {
        var screens = screensOf();
        show(screens.camera, false);
        show(screens.review, true);

        var body = document.getElementById('cap-review-body');
        body.textContent = '';

        function thumb(label, canvas, onRetake) {
          var view = document.createElement('canvas');
          view.width = 240; view.height = 320;
          view.getContext('2d').drawImage(canvas, 0, 0, 240, 320);
          var fig = el('figure', null, [
            view,
            el('figcaption', null, [
              document.createTextNode(label),
              el('button', { type: 'button', class: 'rm', text: 'Retake', 'aria-label': 'Retake the ' + label.toLowerCase() })
            ])
          ]);
          fig.querySelector('button').addEventListener('click', function () {
            show(screens.review, false);
            captureView(label === 'Front' ? 'front' : 'side').then(function (again) {
              if (again) {
                if (label === 'Front') { discard(front); front = again; }
                else { discard(side); side = again; }
              }
              review(front, side).then(resolve);
            });
          });
          return fig;
        }

        body.appendChild(thumb('Front', front));
        body.appendChild(thumb('Side', side));

        var use = document.getElementById('cap-use');
        function accept() {
          use.removeEventListener('click', accept);
          show(screens.review, false);
          resolve({ front: front, side: side });
        }
        use.addEventListener('click', accept);

        say('Review the two photos. Retake either, or continue.');
      });
    }
  }

  /* ---------------------------------------------------- one view pass */

  function captureView(view) {
    return new Promise(function (resolve) {
      var screens = screensOf();
      show(screens.camera, true);
      show(screens.review, false);

      var stage = document.getElementById('cap-stage');
      var feedback = document.getElementById('cap-feedback');
      var controls = document.getElementById('cap-controls');
      var viewLabel = document.getElementById('cap-view-label');
      var viewNote = document.getElementById('cap-view-note');

      viewLabel.textContent = view === 'front' ? 'Front photo' : 'Side photo';
      viewNote.textContent = view === 'front'
        ? 'Face the camera, arms slightly out from your body, feet a little apart.'
        : 'Turn side-on, either side, arms relaxed at your sides.';

      stage.textContent = '';
      controls.textContent = '';

      var video = el('video', { autoplay: '', muted: '', playsinline: '' });
      video.setAttribute('playinline', '');
      var overlay = el('canvas', { class: 'cap-overlay' });
      var flash = el('div', { class: 'cap-flash', 'aria-hidden': 'true' });
      stage.appendChild(video);
      stage.appendChild(overlay);
      stage.appendChild(flash);

      var facing = 'user';
      var mode = 'auto';
      var stream = null;
      var done = false;
      var raf = 0;
      var countdown = null;
      var countdownText = null;
      var history = [];
      var okSince = null;
      var lastDetect = 0;
      var landmarks = null;

      function finish(canvas) {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        if (countdown) clearInterval(countdown);
        window.removeEventListener('resize', onResize);
        stopStream();
        if (canvas) {
          flash.classList.add('is-on');
          beep(920, 120);
          setTimeout(function () {
            flash.classList.remove('is-on');
            show(screens.camera, false);
            resolve(canvas);
          }, 260);
        } else {
          show(screens.camera, false);
          resolve(null);
        }
      }

      function stopStream() {
        if (stream) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          stream = null;
        }
      }

      /* ------------------------------------------------ the controls */

      controls.appendChild(el('button', { type: 'button', class: 'btn', id: 'cap-shutter', text: 'Take photo · 3s timer' }));
      controls.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', id: 'cap-mode', text: 'Mode · auto' }));
      controls.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', id: 'cap-flip', text: 'Rear camera' }));
      controls.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', id: 'cap-stop', text: 'Stop' }));

      controls.querySelector('#cap-shutter').addEventListener('click', function () {
        startCountdown();
      });
      controls.querySelector('#cap-mode').addEventListener('click', function () {
        mode = mode === 'auto' ? 'timer' : 'auto';
        this.textContent = 'Mode · ' + (mode === 'auto' ? 'auto when steady' : '3s timer');
        sayFeedback(mode === 'auto'
          ? 'Auto: hold a good pose for a second and it fires itself.'
          : 'Timer: tap Take photo for a 3 second countdown.');
      });
      controls.querySelector('#cap-flip').addEventListener('click', function () {
        facing = facing === 'user' ? 'environment' : 'user';
        this.textContent = facing === 'user' ? 'Rear camera' : 'Front camera';
        openCamera();
      });
      controls.querySelector('#cap-stop').addEventListener('click', function () {
        finish(null);
      });

      function startCountdown() {
        if (done || countdown) return;
        var n = 3;
        countdownText = String(n);
        sayFeedback(String(n));
        beep(620, 90);
        countdown = setInterval(function () {
          n--;
          if (n > 0) {
            countdownText = String(n);
            sayFeedback(String(n));
            beep(620, 90);
          } else {
            clearInterval(countdown);
            countdown = null;
            countdownText = null;
            grab();
          }
        }, 1000);
      }

      /* --------------------------------------------------- the camera */

      function openCamera() {
        stopStream();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          sayFeedback('This browser will not share a camera. A timer alone cannot help without one.', true);
          return;
        }
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 1920 }
          }
        }).then(function (s) {
          stream = s;
          video.srcObject = s;
          video.classList.toggle('mirror', facing === 'user');
          return video.play();
        }).then(function () {
          sizeStage();
          loop();
        }).catch(function (err) {
          var name = err && err.name;
          sayFeedback(name === 'NotAllowedError'
            ? 'The camera was declined. Allow it in the browser bar and try again; nothing is used without the camera, and nothing is sent anywhere.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : 'The camera could not start (' + (name || 'unknown') + '). Try again.', true);
        });
      }

      function sizeStage() {
        var r = stage.getBoundingClientRect();
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        overlay.width = Math.round(r.width * dpr);
        overlay.height = Math.round(r.height * dpr);
      }
      function onResize() { sizeStage(); }
      window.addEventListener('resize', onResize);

      /* ------------------------------------------- pose reading loop */

      /* Guide canvas the engine sees: small, redrawn from the video each
         detect. Landmarks come back normalised, so its exact size does not
         matter, only that the video is drawn full-frame. */
      var guide = document.createElement('canvas');
      guide.width = 216; guide.height = 288;

      function detect(now) {
        if (now - lastDetect < DETECT_EVERY_MS || !video.videoWidth) return;
        lastDetect = now;
        var g = guide.getContext('2d');
        var s = Math.max(guide.width / video.videoWidth, guide.height / video.videoHeight);
        var dw = video.videoWidth * s, dh = video.videoHeight * s;
        g.drawImage(video, (guide.width - dw) / 2, (guide.height - dh) / 2, dw, dh);
        var p = Promise.resolve(null);
        if (M && M.videoFrame) {
          p = M.videoFrame(guide, performance.now()).catch(function () { return null; });
        }
        p.then(function (lm) {
          landmarks = lm;
          if (!lm && M && M.videoFrame) {
            // Engine not ready yet: honest note, timer still works.
            if (!detect.warned) {
              detect.warned = true;
              sayFeedback('Still loading the pose engine. The timer works without it; the live guide joins when it is ready.');
            }
          }
        });
      }
      detect.warned = false;

      function loop() {
        if (done) return;
        raf = requestAnimationFrame(loop);
        if (!stream) return;
        var now = performance.now();
        detect(now);
        var state = judge(landmarks);
        draw(state, now);
        steer(state, now);
      }

      /* All the pose judgements, from normalised landmarks. Each returns
         null when fine, or the sentence to show. The first failing check
         is the one spoken; they are ordered by how much it ruins the
         measurement. */
      function judge(lm) {
        var out = { msg: null, ok: false, anchors: null, lm: lm };
        if (!lm) { out.msg = video.readyState >= 2 ? 'No body found yet. Step into the frame.' : null; return out; }
        var need = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
        var sideNeed = [0, 11, 12, 23, 24, 25, 26, 27, 28];
        var want = view === 'front' ? need : sideNeed;
        for (var i = 0; i < want.length; i++) {
          var v = lm[want[i]] && lm[want[i]].visibility;
          if (v == null || v < 0.5) { out.msg = 'Step back until the whole body is in frame.'; return out; }
        }
        var xs = want.map(function (j) { return lm[j].x; });
        var ys = want.map(function (j) { return lm[j].y; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
        var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var bodyH = y1 - y0;
        if (x0 < 0.01 || x1 > 0.99 || y0 < 0.015 || y1 > 0.985) { out.msg = 'Whole body in frame: step back a little.'; return out; }
        if (bodyH < 0.5) { out.msg = 'Closer: fill more of the frame, about two metres.'; return out; }
        var sMid = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
        var hMid = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
        var spineTilt = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y)) * 180 / Math.PI;
        if (spineTilt > 8) { out.msg = 'Stand upright, phone upright too.'; return out; }
        if (view === 'front') {
          var shoulderW = Math.abs(lm[11].x - lm[12].x) || 1e-4;
          var level = Math.abs(lm[11].y - lm[12].y) / shoulderW;
          if (level > 0.18) { out.msg = 'Stand square to the camera, shoulders level.'; return out; }
          var outEnough = Math.abs(lm[15].x - sMid.x) > shoulderW * 0.62 &&
                          Math.abs(lm[16].x - sMid.x) > shoulderW * 0.62;
          if (!outEnough) { out.msg = 'Arms out a little more, off the body.'; return out; }
        } else {
          var stack = Math.abs(lm[11].x - lm[12].x) / (bodyH || 1e-4);
          if (stack > 0.07) { out.msg = 'Turn side-on: one shoulder hiding the other.'; return out; }
        }
        out.anchors = { s: sMid, h: hMid, n: lm[0] };
        out.bodyBox = { x0: x0, x1: x1, y0: y0, y1: y1 };
        out.ok = true;
        return out;
      }

      function steer(state, now) {
        if (!state.ok) {
          history.length = 0;
          okSince = null;
          if (state.msg) sayFeedback(state.msg, true);
          return;
        }
        history.push(state.anchors);
        if (history.length > STABLE_WINDOW) history.shift();
        var still = history.length >= STABLE_WINDOW && spread(history) < STABLE_SPREAD;
        if (mode === 'auto') {
          if (!still) {
            okSince = null;
            sayFeedback('Good pose. Hold still…', true);
            return;
          }
          if (!okSince) okSince = now;
          var held = now - okSince;
          sayFeedback('Hold it', false, Math.min(1, held / HOLD_MS));
          if (held >= HOLD_MS) grab();
        } else {
          sayFeedback(still ? 'Steady. Tap Take photo when ready.' : 'Good pose. Keep still…', true);
        }
      }

      function spread(h) {
        var m = 0;
        for (var i = 0; i < h.length; i++) {
          for (var j = i + 1; j < h.length; j++) {
            m = Math.max(m,
              Math.abs(h[i].s.x - h[j].s.x), Math.abs(h[i].s.y - h[j].s.y),
              Math.abs(h[i].h.x - h[j].h.x), Math.abs(h[i].h.y - h[j].h.y));
          }
        }
        return m;
      }

      function sayFeedback(msg, warn, ring) {
        if (done) return;
        feedback.textContent = msg == null ? '' : msg;
        feedback.classList.toggle('is-ok', !warn && !!ring);
        feedback.classList.toggle('is-warn', !!warn);
        feedback.dataset.ring = ring == null ? '' : String(ring);
      }

      /* --------------------------------------------------- the overlay */

      function draw(state, now) {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var W = overlay.width / dpr, H = overlay.height / dpr;
        var ctx = overlay.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (facing === 'user') {
          // Draw in landmark space onto the mirrored preview.
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
        }
        var ok = state && state.ok;
        var col = ok ? GUIDE_GREEN : GUIDE_ACCENT;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;

        drawSilhouette(ctx, W, H, ok);

        if (state && state.lm) {
          var dots = view === 'front' ? [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] : [0, 11, 12, 23, 24, 25, 26, 27, 28];
          for (var i = 0; i < dots.length; i++) {
            var p = state.lm[dots[i]];
            if (!p || (p.visibility != null && p.visibility < 0.5)) continue;
            ctx.beginPath();
            ctx.arc(p.x * W, p.y * H, 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }

        // The hold ring, drawn unmirrored so the number reads correctly.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (countdown && countdownText) {
          ctx.font = '700 72px ' + getComputedStyle(document.body).fontFamily;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(countdownText, W / 2, H / 2);
        } else if (ok && mode === 'auto' && okSince) {
          var t = Math.min(1, (now - okSince) / HOLD_MS);
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = GUIDE_GREEN;
          ctx.arc(W - 26, 26, 12, -Math.PI / 2, -Math.PI / 2 + t * 2 * Math.PI);
          ctx.stroke();
        }
      }

      /* A minimal A-pose / profile figure: enough to stand where the body
         should stand, and no more. */
      function drawSilhouette(ctx, W, H, ok) {
        var gh = H * 0.8;
        var cy = H * 0.08;
        var cx = W / 2;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = ok ? 0.55 : 0.3;
        ctx.beginPath();
        // head
        ctx.arc(cx, cy + gh * 0.06, gh * 0.055, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        if (view === 'front') {
          var sY = cy + gh * 0.18, hY = cy + gh * 0.50, cY = cy + gh * 0.56;
          var shW = gh * 0.115;
          // torso
          ctx.moveTo(cx - shW, sY);
          ctx.lineTo(cx - shW * 0.72, hY);
          ctx.lineTo(cx + shW * 0.72, hY);
          ctx.lineTo(cx + shW, sY);
          // arms, slightly out
          ctx.moveTo(cx - shW, sY);
          ctx.lineTo(cx - gh * 0.20, cy + gh * 0.44);
          ctx.moveTo(cx + shW, sY);
          ctx.lineTo(cx + gh * 0.20, cy + gh * 0.44);
          // legs
          ctx.moveTo(cx - shW * 0.5, cY);
          ctx.lineTo(cx - shW * 0.62, cy + gh);
          ctx.moveTo(cx + shW * 0.5, cY);
          ctx.lineTo(cx + shW * 0.62, cy + gh);
        } else {
          var sY2 = cy + gh * 0.18, hY2 = cy + gh * 0.50, cY2 = cy + gh * 0.56;
          var sw = gh * 0.035;
          ctx.moveTo(cx - sw, sY2);
          ctx.lineTo(cx - sw * 1.6, hY2);
          ctx.lineTo(cx + sw * 1.6, hY2);
          ctx.lineTo(cx + sw, sY2);
          ctx.moveTo(cx - sw * 0.5, cY2);
          ctx.lineTo(cx - sw * 0.8, cy + gh);
          ctx.moveTo(cx + sw * 0.5, cY2);
          ctx.lineTo(cx + sw * 0.8, cy + gh);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* --------------------------------------------------- the grab */

      function grab() {
        if (done || !video.videoWidth) return;
        var canvas = document.createElement('canvas');
        canvas.width = CAP_W;
        canvas.height = CAP_H;
        var ctx = canvas.getContext('2d');
        var s = Math.max(CAP_W / video.videoWidth, CAP_H / video.videoHeight);
         var dw = video.videoWidth * s, dh = video.videoHeight * s;
         ctx.drawImage(video, (CAP_W - dw) / 2, (CAP_H - dh) / 2, dw, dh);
         finish(canvas);
      }

      openCamera();
    });
  }

  /* --------------------------------------------------------- plumbing */

  function screensOf() {
    return {
      camera: document.getElementById('fit-camera'),
      review: document.getElementById('fit-review')
    };
  }

  function show(node, on) {
    if (node) node.hidden = !on;
  }

  /* Wipe a canvas bitmap once the pixels are no longer needed, so the
     photo is discarded in fact, not only in reference. */
  function discard(canvas) {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }

  window.URCapture = { run: run };
})();
