/* UR Fit, the /fit/ app shell and flow controller.
 *
 * Phase 1 (#4, #5, #6) on top of the phase 0 shell (#3, #12): this file
 * preselects the pair from the URL (the #2 handoff contract:
 * ?pair=<id>&fit=tailored&from=product), registers the /fit/ service
 * worker, and walks the scan: consent, setup, height, capture, measure,
 * profile. The engine, the camera and the photos exist only inside that
 * flow. Nothing loads on arrival: the page a reader sees is as fast as it
 * was in phase 0, and the 17 MB of model and wasm arrive after consent and
 * a tap on Begin, never before.
 *
 * The contract between #4 and #5 is one call:
 *   URMeasure.measure({ front, side, heightCm }) -> Promise<Profile>
 * and between #5 and #6 one screen: URProfile.present(profile). The
 * frames are dropped the moment the profile exists: canvas bitmaps wiped,
 * references released, photos discarded in fact, not only by promise.
 */

(function () {
  'use strict';

  var D = window.UR_DATA;
  var root = document.getElementById('fit-app');
  if (!root || !D) return;

  var LS_HEIGHT = 'ur.fit.height.v1';
  var LS_SETUP = 'ur.fit.setup.v1';

  /* ------------------------------------------------------------ the pair */

  var qs = new URLSearchParams(window.location.search);
  var wanted = qs.get('pair');
  // An unknown or missing pair falls back to the first one, same as the old
  // fitting room did. The ids come from ur-data.js and nowhere else.
  var pairId = D.PRODUCTS.some(function (p) { return p.id === wanted; })
    ? wanted : D.PRODUCTS[0].id;
  var measurementMode = qs.get('fit') === 'tailored';
  var fromProduct = qs.get('from') === 'product';

  var pairBtns = Array.prototype.slice.call(root.querySelectorAll('[data-fit-product]'));
  var pairName = document.getElementById('fit-pair-name');
  var pairPrice = document.getElementById('fit-pair-price');
  var modeChip = document.getElementById('fit-mode-chip');
  var fromBlock = document.getElementById('fit-from');
  var fromLinks = document.getElementById('fit-from-links');
  var viewerCtl = null;   // set when the fit viewer is opened, below

  function pair() {
    return D.PRODUCTS.filter(function (p) { return p.id === pairId; })[0];
  }

  function syncPair() {
    var p = pair();
    pairBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.fitProduct === pairId));
    });
    if (pairName) pairName.textContent = p.name;
    if (pairPrice) {
      pairPrice.textContent = D.format(D.priceOf(p, 'tailored')) +
        ' made to measure · ' + D.format(p.price) + ' standard';
    }
    if (fromLinks) fromLinks.href = '/product/' + p.id + '/';
  }
  pairBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      pairId = b.dataset.fitProduct;
      syncPair();
      // The profile screen's block line follows the selected pair's
      // category, and so does the viewer when it is open.
      if (window.URProfile && !document.getElementById('fit-profile').hidden) {
        window.URProfile.showBlock(pair().cat);
      }
      if (viewerCtl && viewerCtl.setCategory) viewerCtl.setCategory(pair().cat);
    });
  });
  if (modeChip) modeChip.hidden = !measurementMode;
  if (fromBlock) fromBlock.hidden = !fromProduct;

  /* ---------------------------------------------------- service worker */

  // The worker file lives at /fit/sw.js, so its scope is /fit/ and only this
  // app is controlled. The shop pages stay out of it on purpose: they are
  // cache-busted every deploy and a worker that wedged them would cost more
  // than offline fit pages are worth (#3).
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('/fit/sw.js');
    } catch (e) { /* the page works without it; the next visit can retry */ }
  }

  /* ------------------------------------------------------- the scan flow */

  var consent = document.getElementById('fit-consent');
  var consentCheck = document.getElementById('fit-consent-check');
  var begin = document.getElementById('fit-begin');
  var screens = ['fit-setup', 'fit-height', 'fit-camera', 'fit-review', 'fit-measuring', 'fit-profile']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var mlog = document.getElementById('fit-mlog');
  var engineNote = document.createElement('p');
  engineNote.className = 'fit-note';
  engineNote.style.marginTop = '8px';
  if (consent) consent.appendChild(engineNote);

  function showOnly(node) {
    screens.forEach(function (s) { s.hidden = (s !== node); });
  }
  function landing() {
    screens.forEach(function (s) { s.hidden = true; });
    if (consent) consent.hidden = false;
    if (engineNote) engineNote.textContent = '';
  }

  if (consentCheck && begin) {
    consentCheck.addEventListener('change', function () {
      begin.disabled = !consentCheck.checked;
    });
    begin.addEventListener('click', onBegin);
  }

  /* The engine download starts here, after consent and a tap. While it
     runs, the person reads the setup notes and enters their height, so the
     wait is usually over before the camera is. */
  function onBegin() {
    if (begin.disabled) return;
    consent.hidden = true;
    var loading = null;
    if (window.URMeasure) {
      loading = window.URMeasure.loadEngine(function (step) {
        if (engineNote) engineNote.textContent = step + '…';
      }).catch(function (err) {
        if (engineNote) {
          engineNote.textContent = err && err.message
            ? err.message
            : 'The engine could not load. The camera and a plain timer still work; the live pose guide will not.';
        }
        return null;
      });
    }

    var setupSeen = false;
    try { setupSeen = localStorage.getItem(LS_SETUP) === 'seen'; } catch (e) { /* private mode */ }
    if (setupSeen) {
      toHeight();
    } else {
      var next = document.getElementById('fit-setup-next');
      showOnly(document.getElementById('fit-setup'));
      next.addEventListener('click', function () {
        try { localStorage.setItem(LS_SETUP, 'seen'); } catch (e) { /* private mode */ }
        toHeight();
      }, { once: true });
    }
  }

  function toHeight() {
    var screen = document.getElementById('fit-height');
    var cmIn = document.getElementById('fit-height-cm');
    var ftIn = document.getElementById('fit-height-ft');
    var inIn = document.getElementById('fit-height-in');
    var err = document.getElementById('fit-height-err');
    var next = document.getElementById('fit-height-next');
    var unitCm = document.getElementById('fit-unit-cm');
    var unitFt = document.getElementById('fit-unit-ft');
    var fieldsCm = document.getElementById('fit-fields-cm');
    var fieldsFt = document.getElementById('fit-fields-ft');

    var remembered = null;
    try { remembered = parseFloat(localStorage.getItem(LS_HEIGHT)); } catch (e) { /* ignore */ }
    if (remembered >= 100 && remembered <= 250 && cmIn) {
      cmIn.value = String(Math.round(remembered));
    }

    function setUnit(isCm) {
      unitCm.setAttribute('aria-pressed', String(isCm));
      unitFt.setAttribute('aria-pressed', String(!isCm));
      fieldsCm.hidden = !isCm;
      fieldsFt.hidden = isCm;
    }
    unitCm.addEventListener('click', function () { setUnit(true); });
    unitFt.addEventListener('click', function () { setUnit(false); });

    showOnly(screen);
    err.hidden = true;

    function collect() {
      if (fieldsCm.hidden) {
        var ft = parseFloat(ftIn.value), inch = parseFloat(inIn.value);
        if (isNaN(ft)) return null;
        if (isNaN(inch)) inch = 0;
        return Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
      }
      var v = parseFloat(cmIn.value);
      return isNaN(v) ? null : Math.round(v * 10) / 10;
    }

    next.addEventListener('click', function go() {
      var cm = collect();
      if (cm == null || cm < 100 || cm > 250) {
        err.textContent = 'A height between 100 and 250 cm, without shoes. It is the scale of every number.';
        err.hidden = false;
        return;
      }
      try { localStorage.setItem(LS_HEIGHT, String(cm)); } catch (e) { /* private mode */ }
      next.removeEventListener('click', go);
      toCapture(cm);
    });
  }

  function toCapture(heightCm) {
    if (!window.URCapture) return landing();
    window.URCapture.run(function (status) {
      /* capture narrates into its own feedback line; nothing to do here */ })
      .then(function (frames) {
        if (!frames) return landing();
        toMeasure(frames, heightCm);
      })
      .catch(function () { return landing(); });
  }

  function toMeasure(frames, heightCm) {
    if (!window.URMeasure) {
      discard(frames.front); discard(frames.side);
      return landing();
    }
    var screen = document.getElementById('fit-measuring');
    mlog.textContent = '';
    showOnly(screen);
    log('Two photos in hand, reading them on this phone');

    window.URMeasure.measure({
      front: frames.front,
      side: frames.side,
      heightCm: heightCm,
      onProgress: log
    }).then(function (profile) {
      // The photos are discarded here, in fact: bitmaps wiped, references
      // dropped. What survives is numbers.
      discard(frames.front);
      discard(frames.side);
      frames = null;
      toProfile(profile, heightCm);
    }).catch(function (err) {
      discard(frames.front);
      discard(frames.side);
      log(err && err.message ? err.message : 'The measurement failed.', true);
      log('Nothing was uploaded, and nothing is kept. Scan again, or reserve without a scan: measurements are confirmed after you reserve either way.', false);
      var again = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--ghost';
      btn.innerHTML = '<span>Back to the start</span>';
      btn.addEventListener('click', landing);
      again.appendChild(btn);
      mlog.appendChild(again);
    });

    function log(line, isErr) {
      var li = document.createElement('li');
      li.textContent = line;
      if (isErr) li.style.color = 'var(--acc)';
      mlog.appendChild(li);
      while (mlog.children.length > 9) mlog.removeChild(mlog.firstChild);
    }
  }

  function toProfile(profile, heightCm) {
    if (!window.URProfile) return landing();
    window.URProfile.present(profile, {
      category: pair().cat,
      onRetake: function () {
        window.URProfile.hide();
        toCapture(heightCm);
      }
    });
    screens.forEach(function (s) { s.hidden = true; });
    document.getElementById('fit-profile').hidden = false;
    document.getElementById('fit-profile').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function discard(canvas) {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }

  // Stop buttons on the generated screens all mean: leave the flow, keep
  // nothing. The camera (and its stream) is stopped by capture itself.
  document.querySelectorAll('[data-fit-cancel]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (window.URProfile) window.URProfile.hide();
      landing();
    });
  });

  syncPair();
})();
