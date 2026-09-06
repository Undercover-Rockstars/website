/* UR Measure, the on-device measurement engine behind /fit/ (#5).
 *
 * The hook is the contract, and it is the whole contract:
 *
 *   URMeasure.measure({ front, side, heightCm }) -> Promise<Profile>
 *
 * `front` and `side` are canvases (or anything MediaPipe can read: an
 * ImageBitmap, an img). Nothing here uploads anything; the frames are read
 * where they were captured and dropped. A vendor scanner could replace this
 * whole file and the app would keep working, the way the old tryon.js could
 * be swapped, as long as it resolves a Profile of the same shape.
 *
 * THE MOST IMPORTANT TECHNICAL POINT IN THIS FILE: pose landmarks are joint
 * centres, not body edges. The shoulder landmark sits inside the shoulder
 * joint, the hip landmark inside the hip joint. Widths measured by
 * subtracting landmark x-coordinates come out plausible, far too small, and
 * wrong in a way nobody sees until a jacket does not fit. So:
 *
 *   1. MediaPipe Pose Landmarker runs with outputSegmentationMasks: true.
 *   2. Landmarks are used ONLY to find the y level of each measuring line
 *      (chest, waist, hip) and for lengths that genuinely are joint to joint.
 *   3. At each level the SEGMENTATION MASK is scanned left to right and the
 *      width of the body's pixel run is the real silhouette width.
 *   4. The side photo gives the depth at the same anatomical levels, the
 *      same way.
 *
 * Circumferences assume the cross-section is an ellipse. Real torsos are
 * not ellipses; this is an approximation of an approximation, it is said so
 * in the profile UI, and no number here is exact. The profile carries a
 * confidence per value, and low confidence is flagged, never hidden.
 *
 * Loading: the vendored ES module and WASM (assets/vendor/mediapipe/) are
 * imported lazily on the first call to loadEngine(), which the app touches
 * only after consent and a tap on Begin. Nothing large loads on page load.
 *
 * Node: the pure maths at the bottom of the factory is requirable by
 * tools/test-measure.js (module.exports branch). The MediaPipe import only
 * happens inside measure(), so the fixture test runs with no browser, no
 * camera and no model.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.URMeasure = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VENDOR = '/assets/vendor/mediapipe';
  var BUNDLE = VENDOR + '/tasks-vision-1.0.1/vision_bundle.mjs';
  var WASM_DIR = VENDOR + '/tasks-vision-1.0.1/wasm';
  var MODEL = VENDOR + '/pose_landmarker_lite.task';

  var ENGINE_NAME = 'mediapipe pose landmarker lite, on device';

  /* MediaPipe Pose, 33 points. Only the ones used here are named. */
  var LM = {
    nose: 0,
    lShoulder: 11, rShoulder: 12,
    lElbow: 13, rElbow: 14,
    lWrist: 15, rWrist: 16,
    lHip: 23, rHip: 24,
    lKnee: 25, rKnee: 26,
    lAnkle: 27, rAnkle: 28
  };

  /* Measuring-line placement as fractions of the shoulder-to-hip distance.
     Documented heuristics, not truths: chest at roughly nipple / armpit
     level, waist searched as the narrowest row, hip (seat) searched as the
     widest row below the hip joints. */
  var LINE = {
    chestDown: 0.30,          // chest line: 30% of the way shoulder -> hip
    waistBandTop: 0.55,       // waist search band, shoulder-relative
    waistBandBottom: 1.05,
    hipBandTop: 0.90,
    hipBandBottom: 1.35
  };

  /* A value below this confidence is flagged in the UI with "check this
     one". Chosen so that a clean square photo with visible landmarks lands
     above it, and a merged-arms or tilted pose lands below. */
  var LOW_AT = 0.6;

  /* -------------------------------------------------------- engine state */

  var vision = null;        // the imported ES module
  var landmarker = null;    // one PoseLandmarker, shared by capture + measure
  var loadPromise = null;
  var runningMode = null;   // 'VIDEO' | 'IMAGE'
  var masksOn = false;

  /* Loads the vendored bundle, the wasm runtime and the lite model, once.
     onStep gets human sentences for the measuring screen; every one of them
     is true, there is no fake progress here. */
  function loadEngine(onStep) {
    if (loadPromise) return loadPromise;
    loadPromise = (async function () {
      var say = typeof onStep === 'function' ? onStep : function () {};
      say('Loading the pose engine');
      var mod;
      try {
        mod = await import(/* webpackIgnore: true */ BUNDLE);
      } catch (e) {
        throw fail('engine-load', 'The measurement engine could not load. Check the connection and try again.');
      }
      vision = mod;
      say('Starting the vision runtime');
      var fileset = await mod.FilesetResolver.forVisionTasks(WASM_DIR);
      say('Loading the pose model, about 6 MB, once');
      var opts = function (delegate) {
        return {
          baseOptions: { modelAssetPath: MODEL, delegate: delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          outputSegmentationMasks: false
        };
      };
      try {
        landmarker = await mod.PoseLandmarker.createFromOptions(fileset, opts('GPU'));
      } catch (e) {
        // GPU is faster but not always available or correct on every phone.
        landmarker = await mod.PoseLandmarker.createFromOptions(fileset, opts('CPU'));
      }
      runningMode = 'VIDEO';
      masksOn = false;
      say('Engine ready');
      return landmarker;
    })();
    return loadPromise;
  }

  function fail(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  async function setMode(mode, masks) {
    if (!landmarker) throw fail('engine-load', 'The engine is not loaded.');
    if (runningMode === mode && masksOn === masks) return;
    await landmarker.setOptions({
      runningMode: mode,
      outputSegmentationMasks: masks,
      numPoses: 1
    });
    runningMode = mode;
    masksOn = masks;
  }

  /* Guidance pass for ur-capture (#4): one VIDEO-mode frame, no mask.
     Returns the 33 normalized landmarks or null. This is a convenience
     helper, not part of the measure() contract; if a replacement engine
     lacks it, capture falls back to its plain timer mode. */
  async function videoFrame(source, timestampMs) {
    if (!landmarker) throw fail('engine-load', 'The engine is not loaded.');
    await setMode('VIDEO', false);
    var r = landmarker.detectForVideo(source, timestampMs);
    return r && r.landmarks && r.landmarks.length ? r.landmarks[0] : null;
  }

  /* --------------------------------------------------------- the engine */

  /* measure({ front, side, heightCm, onProgress }) -> Promise<Profile>.
     The brief's hook, unchanged in shape since tryon.js. */
  async function measure(opts) {
    var front = opts && opts.front, side = opts && opts.side;
    var heightCm = Number(opts && opts.heightCm);
    var say = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};

    if (!front || !side || typeof front.width !== 'number' || typeof side.width !== 'number') {
      throw fail('bad-input', 'Two captured frames are needed.');
    }
    if (!(heightCm >= 100 && heightCm <= 250)) {
      throw fail('bad-input', 'A height between 100 and 250 cm is needed.');
    }

    await loadEngine(say);

    say('Reading the front photo');
    var F = await analyse(front, true);
    say('Reading the side photo');
    var S = await analyse(side, false);

    say('Measuring the silhouette');
    var profile = buildProfile(F, S, heightCm);
    say('Done');
    return profile;
  }

  /* One frame through the model: IMAGE mode with segmentation masks.
     Returns landmarks in mask-pixel coordinates plus the mask itself. */
  async function analyse(source, isFront) {
    await setMode('IMAGE', true);
    var r = landmarker.detect(source);
    if (!r || !r.landmarks || !r.landmarks.length) {
      throw fail('no-pose', 'No person was found in the ' + (isFront ? 'front' : 'side') + ' photo. Retake it with the whole body in frame.');
    }
    if (!r.segmentationMasks || !r.segmentationMasks.length) {
      throw fail('no-mask', 'The silhouette could not be read from the ' + (isFront ? 'front' : 'side') + ' photo. Retake it against a plainer background.');
    }
    var mask = r.segmentationMasks[0];
    var out = {
      landmarksPx: r.landmarks[0].map(function (p) {
        return { x: p.x * mask.width, y: p.y * mask.height, visibility: p.visibility == null ? 1 : p.visibility };
      }),
      mask: mask.getAsUint8Array(),
      w: mask.width,
      h: mask.height
    };
    // The MPMask can be released once the bytes are copied out.
    if (mask.close) { try { mask.close(); } catch (e) { /* already closed */ } }
    return out;
  }

  /* Front and side analysed + a stated height -> the Profile. All the
     geometry lives in the pure helpers below so the fixture test can prove
     it without a camera. */
  function buildProfile(F, S, heightCm) {
    var pf = frameGeometry(F, 'front');
    var ps = frameGeometry(S, 'side');

    // Scale: stated height over the pixel height of the silhouette, per
    // frame. Per-frame matters: if the person stood a little closer for the
    // side shot, the side depth uses the side's own scale.
    var scaleF = core.cmPerPixel(heightCm, pf.stature.px);
    var scaleS = core.cmPerPixel(heightCm, ps.stature.px);

    // Widths (front) and depths (side) at the three levels, in cm.
    var wChest = pf.chest.width * scaleF;
    var wWaist = pf.waist.width * scaleF;
    var wHip = pf.hip.width * scaleF;
    var dChest = ps.chest.width * scaleS;
    var dWaist = ps.waist.width * scaleS;
    var dHip = ps.hip.width * scaleS;

    var chest = core.circumference(wChest, dChest);
    var waist = core.circumference(wWaist, dWaist);
    var hip = core.circumference(wHip, dHip);

    // Lengths: joint to joint, genuinely landmark distances, front frame.
    var L = F.landmarksPx;
    var shoulderPx = core.dist(L[LM.lShoulder], L[LM.rShoulder]);
    var sleeve = armLength(L);
    var backPx = core.dist(shoulderMid(L), { x: shoulderMid(L).x, y: pf.waist.y });
    var inseam = inseamFromMask(F, pf, L);

    // Confidence factors, all in [0,1]; see combine() for the reasoning.
    var visTorso = minVis(L, [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip]);
    var visShoulder = minVis(L, [LM.lShoulder, LM.rShoulder]);
    var visArm = minVis(L, [LM.lShoulder, LM.lElbow, LM.lWrist, LM.rShoulder, LM.rElbow, LM.rWrist]);
    var visLeg = minVis(L, [LM.lHip, LM.rHip, LM.lAnkle, LM.rAnkle]);
    var squareF = core.squarenessFront(L);
    var squareS = core.squarenessSide(S.landmarksPx);
    var statureF = core.statureConfidence(pf.stature.px, F.h);
    var statureS = core.statureConfidence(ps.stature.px, S.h);
    var edgeChest = core.edgeConfidence(pf.chest.jitter, pf.chest.width);
    var edgeWaist = core.edgeConfidence(pf.waist.jitter, pf.waist.width);
    var edgeHip = core.edgeConfidence(pf.hip.jitter, pf.hip.width);
    var armsF = core.armsApartConfidence(F.landmarksPx, pf.chest, pf.waist, pf.hip, F.w);
    var armsS = core.armsApartConfidence(S.landmarksPx, ps.chest, ps.waist, ps.hip, S.w);

    function circConf(vis, edge, square, stature, arms) {
      return core.combine([vis, edge, square, stature, arms]);
    }

    var values = {
      chest: {
        cm: chest,
        confidence: circConf(visTorso, edgeChest, squareF, statureF, armsF)
      },
      waist: {
        cm: waist,
        confidence: circConf(visTorso, edgeWaist, squareF, statureF, armsF)
      },
      hip: {
        cm: hip,
        confidence: circConf(visTorso, edgeHip, squareF, statureF, armsF)
      },
      shoulder: {
        cm: shoulderPx * scaleF,
        confidence: core.combine([visShoulder, squareF, statureF])
      },
      sleeve: {
        cm: sleeve.px * scaleF,
        confidence: core.combine([sleeve.vis, squareF, statureF])
      },
      back: {
        cm: backPx * scaleF,
        confidence: core.combine([visTorso, squareF, statureF])
      },
      inseam: {
        cm: inseam.px * scaleF,
        confidence: core.combine([inseam.vis, squareF, statureF])
      }
    };
    Object.keys(values).forEach(function (k) {
      var v = values[k];
      v.cm = Math.round(v.cm * 10) / 10;
      v.low = v.confidence < LOW_AT;
    });

    return {
      engine: ENGINE_NAME,
      created: new Date().toISOString(),
      heightCm: heightCm,
      frames: {
        front: { width: F.w, height: F.h },
        side: { width: S.w, height: S.h }
      },
      // Diagnostics stay on the device; they never join the reservation.
      scale: {
        cmPerPixel: Math.round(scaleF * 10000) / 10000,
        frontPixelHeight: pf.stature.px,
        sideCmPerPixel: Math.round(scaleS * 10000) / 10000,
        sidePixelHeight: ps.stature.px
      },
      levels: {
        chestY: Math.round(pf.chest.y), waistY: Math.round(pf.waist.y), hipY: Math.round(pf.hip.y),
        sideChestY: Math.round(ps.chest.y), sideWaistY: Math.round(ps.waist.y), sideHipY: Math.round(ps.hip.y)
      },
      factors: {
        squareFront: round2(squareF), squareSide: round2(squareS),
        armsFront: round2(armsF), armsSide: round2(armsS),
        statureFront: round2(statureF), statureSide: round2(statureS)
      },
      lowAt: LOW_AT,
      values: values,
      honesty: 'Phone-scan estimate. Cross-sections are treated as ellipses, which real torsos are not. Every value carries a confidence; low-confidence values are flagged. Nothing here replaces a tape.'
    };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* Levels and silhouette widths for one frame. Chest level comes from the
     landmarks (30% shoulder -> hip). Waist is the narrowest torso run in its
     band, hip the widest run in its band, both from the mask. */
  function frameGeometry(F, label) {
    var L = F.landmarksPx;
    var sMid = shoulderMid(L);
    var hMid = hipMid(L);
    var torso = Math.max(1, hMid.y - sMid.y);

    var chestY = Math.round(sMid.y + LINE.chestDown * torso);
    var chestRow = core.rowScan(F.mask, F.w, F.h, chestY);
    if (!chestRow.widest) throw fail('no-silhouette', 'The body does not reach the chest line in the ' + label + ' photo. Whole body, plainer background, retake.');

    var waistY0 = Math.round(sMid.y + LINE.waistBandTop * torso);
    var waistY1 = Math.round(sMid.y + LINE.waistBandBottom * torso);
    var waistRow = core.narrowestRow(F.mask, F.w, F.h, waistY0, waistY1);
    if (!waistRow) throw fail('no-silhouette', 'The waist line could not be found in the ' + label + ' photo. Whole body in frame, retake.');

    var hipY0 = Math.round(sMid.y + LINE.hipBandTop * torso);
    var hipY1 = Math.round(sMid.y + LINE.hipBandBottom * torso);
    var hipRow = core.widestRow(F.mask, F.w, F.h, hipY0, hipY1);
    if (!hipRow) throw fail('no-silhouette', 'The hip line could not be found in the ' + label + ' photo. Whole body in frame, retake.');

    var stature = core.pixelStature(F.mask, F.w, F.h);
    if (!stature.px) throw fail('no-silhouette', 'No body silhouette was found in the ' + label + ' photo.');

    return {
      shoulderMid: sMid, hipMid: hMid, torso: torso, stature: stature,
      chest: chestRow, waist: waistRow, hip: hipRow
    };
  }

  function shoulderMid(L) {
    return {
      x: (L[LM.lShoulder].x + L[LM.rShoulder].x) / 2,
      y: (L[LM.lShoulder].y + L[LM.rShoulder].y) / 2
    };
  }
  function hipMid(L) {
    return {
      x: (L[LM.lHip].x + L[LM.rHip].x) / 2,
      y: (L[LM.lHip].y + L[LM.rHip].y) / 2
    };
  }
  function minVis(L, idxs) {
    var m = 1;
    for (var i = 0; i < idxs.length; i++) {
      var v = L[idxs[i]].visibility;
      if (v == null) v = 1;
      if (v < m) m = v;
    }
    return m;
  }

  /* Sleeve: shoulder -> elbow -> wrist, summed on the straight arm. Uses
     the more visible side, or the mean of both when both are clear. */
  function armLength(L) {
    function one(s, e, w) {
      return core.dist(L[s], L[e]) + core.dist(L[e], L[w]);
    }
    var visL = Math.min(L[LM.lShoulder].visibility, L[LM.lElbow].visibility, L[LM.lWrist].visibility);
    var visR = Math.min(L[LM.rShoulder].visibility, L[LM.rElbow].visibility, L[LM.rWrist].visibility);
    if (visL >= 0.5 && visR >= 0.5) {
      return { px: (one(LM.lShoulder, LM.lElbow, LM.lWrist) + one(LM.rShoulder, LM.rElbow, LM.rWrist)) / 2, vis: Math.min(visL, visR) };
    }
    if (visL >= visR) return { px: one(LM.lShoulder, LM.lElbow, LM.lWrist), vis: visL };
    return { px: one(LM.rShoulder, LM.rElbow, LM.rWrist), vis: visR };
  }

  /* Inseam: the row where the legs split (last single-run row above the
     gap) down to the lowest body pixel, i.e. the floor. To the floor, said
     plainly; the hem choice belongs to the tailor. Falls back to the hip
     landmark line at reduced confidence when clothing bridges the legs. */
  function inseamFromMask(F, pf, L) {
    var ankleY = (L[LM.lAnkle].y + L[LM.rAnkle].y) / 2;
    var split = core.legSplitRow(F.mask, F.w, F.h, pf.hip.y, ankleY);
    var vis = minVis(L, [LM.lHip, LM.rHip, LM.lAnkle, LM.rAnkle]);
    if (split != null) {
      return { px: pf.stature.bottom - split, vis: vis };
    }
    // Bridged legs: estimate from the hip joint line, and say so by
    // halving the confidence. Honest and crude, not precise and quiet.
    return { px: pf.stature.bottom - pf.hipMid.y, vis: vis * 0.5 };
  }

  /* ------------------------------------------------------ the pure core */
  /* Everything below is plain data-in, data-out, requirable from Node by
     tools/test-measure.js. `mask` is a w*h array where any non-zero value
     is a body pixel, the exact shape MPMask.getAsUint8Array() gives. */
  var core = {

    cmPerPixel: function (heightCm, pixelHeight) {
      return heightCm / pixelHeight;
    },

    /* Topmost to lowest body row: head to soles, from the mask, not from
       landmarks (the nose is not the top of the head). */
    pixelStature: function (mask, w, h) {
      var top = -1, bottom = -1;
      for (var y = 0; y < h; y++) {
        var row = y * w;
        var hit = false;
        for (var x = 0; x < w; x++) {
          if (mask[row + x]) { hit = true; break; }
        }
        if (hit) { if (top < 0) top = y; bottom = y; }
      }
      return { top: top, bottom: bottom, px: top < 0 ? 0 : bottom - top + 1 };
    },

    /* Body runs along one row. The brief asks for first-to-last body
       pixel; in an A-pose the arms form their own runs beside the torso,
       so first-to-last would measure hand-to-hand. The torso is the widest
       single run; when the arms are properly out it is the body alone,
       and when they are not, both numbers coincide and the confidence
       drops (armsApartConfidence below). Span is kept for the record. */
    rowScan: function (mask, w, h, y) {
      if (y < 0 || y >= h) return { y: y, runs: [], span: 0, widest: null, start: 0, end: 0, width: 0, jitter: 0 };
      var runs = [];
      var row = y * w;
      var x = 0;
      while (x < w) {
        if (mask[row + x]) {
          var s = x;
          while (x < w && mask[row + x]) x++;
          runs.push({ start: s, end: x - 1, width: x - s });
        } else x++;
      }
      var widest = null;
      for (var i = 0; i < runs.length; i++) {
        if (!widest || runs[i].width > widest.width) widest = runs[i];
      }
      var span = runs.length ? runs[runs.length - 1].end - runs[0].start + 1 : 0;
      return {
        y: y, runs: runs, span: span,
        widest: widest,
        start: widest ? widest.start : 0,
        end: widest ? widest.end : 0,
        width: widest ? widest.width : 0,
        jitter: widest ? core._edgeJitter(mask, w, h, y, widest) : 0
      };
    },

    /* How much the torso run's edges wander over the two rows either side
       of the line. A ragged edge (hair, loose fabric, background bleed)
       jitters and the measurement inherits it. Returned in pixels, mean of
       both edges' standard deviations. */
    _edgeJitter: function (mask, w, h, y, run) {
      var lefts = [], rights = [];
      for (var dy = -2; dy <= 2; dy++) {
        var yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        // Find the run overlapping the torso run's x range, if any.
        var row = yy * w;
        var s = -1, e = -1;
        var x = Math.max(0, run.start - 8);
        var stop = Math.min(w - 1, run.end + 8);
        while (x <= stop) {
          if (mask[row + x]) { if (s < 0) s = x; e = x; }
          else if (s >= 0) { break; }
          x++;
        }
        if (s >= 0) { lefts.push(s); rights.push(e); }
      }
      if (lefts.length < 3) return 0;
      function sd(a) {
        var m = a.reduce(function (p, c) { return p + c; }, 0) / a.length;
        return Math.sqrt(a.reduce(function (p, c) { return p + (c - m) * (c - m); }, 0) / a.length);
      }
      return (sd(lefts) + sd(rights)) / 2;
    },

    /* Narrowest torso run in a band of rows: the waist. */
    narrowestRow: function (mask, w, h, y0, y1) {
      var best = null;
      for (var y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
        var r = core.rowScan(mask, w, h, y);
        if (r.widest && (!best || r.width < best.width)) best = r;
      }
      return best;
    },

    /* Widest torso run in a band of rows: the seat. */
    widestRow: function (mask, w, h, y0, y1) {
      var best = null;
      for (var y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
        var r = core.rowScan(mask, w, h, y);
        if (r.widest && (!best || r.width > best.width)) best = r;
      }
      return best;
    },

    /* The first row, top down from `from`, where the silhouette splits
       into two separated runs: the crotch. Null when the legs never
       clearly separate (long skirts, bridged shadows). */
    legSplitRow: function (mask, w, h, from, to) {
      var y0 = Math.max(0, Math.round(from));
      var y1 = Math.min(h - 1, Math.round(to));
      for (var y = y0; y <= y1; y++) {
        var r = core.rowScan(mask, w, h, y);
        if (r.runs.length >= 2 && r.runs[1].start - r.runs[0].end > 2) return y;
      }
      return null;
    },

    /* Ramanujan's approximation of an ellipse's circumference, with the
       semi-axes given. An approximation of an approximation: real torsos
       are not ellipses, and the UI says so. Exact for a circle. */
    ramanujan: function (a, b) {
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    },

    /* A circumference from the front width and side depth, both in cm. */
    circumference: function (widthCm, depthCm) {
      return core.ramanujan(widthCm / 2, depthCm / 2);
    },

    dist: function (p, q) {
      return Math.hypot(p.x - q.x, p.y - q.y);
    },

    /* Was the front pose square to the camera: shoulders level, hips
       level, spine near vertical. Tilt is measured as degrees of the
       shoulder-mid -> hip-mid line from vertical, plus shoulder tilt. */
    squarenessFront: function (L) {
      var sMid = { x: (L[LM.lShoulder].x + L[LM.rShoulder].x) / 2, y: (L[LM.lShoulder].y + L[LM.rShoulder].y) / 2 };
      var hMid = { x: (L[LM.lHip].x + L[LM.rHip].x) / 2, y: (L[LM.lHip].y + L[LM.rHip].y) / 2 };
      var torso = Math.abs(hMid.y - sMid.y) || 1;
      var spineTiltDeg = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y)) * 180 / Math.PI;
      // Shoulder levelness as a ratio of vertical drop to horizontal span,
      // so it is scale free. 0.25 is roughly 14 degrees of shrug.
      var shoulderRatio = Math.abs(L[LM.lShoulder].y - L[LM.rShoulder].y) / (Math.abs(L[LM.lShoulder].x - L[LM.rShoulder].x) || torso);
      var c1 = clamp(1 - spineTiltDeg / 20, 0.1, 1);
      var c2 = clamp(1 - shoulderRatio / 0.25, 0.1, 1);
      return c1 * c2;
    },

    /* Was the side pose a real profile: the spine near vertical like the
       front, and the two shoulders stacked onto nearly the same x, which
       is what says the camera saw the body edge-on rather than half
       turned. */
    squarenessSide: function (L) {
      var sMid = { x: (L[LM.lShoulder].x + L[LM.rShoulder].x) / 2, y: (L[LM.lShoulder].y + L[LM.rShoulder].y) / 2 };
      var hMid = { x: (L[LM.lHip].x + L[LM.rHip].x) / 2, y: (L[LM.lHip].y + L[LM.rHip].y) / 2 };
      var torso = Math.abs(hMid.y - sMid.y) || 1;
      var spineTiltDeg = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y)) * 180 / Math.PI;
      // Stack ratio: shoulder x separation over torso height. A true
      // profile is near 0; 0.35 is roughly 20 degrees of body rotation.
      var stackRatio = Math.abs(L[LM.lShoulder].x - L[LM.rShoulder].x) / torso;
      var c1 = clamp(1 - spineTiltDeg / 20, 0.1, 1);
      var c2 = clamp(1 - stackRatio / 0.35, 0.1, 1);
      return c1 * c2;
    },

    /* How much of the frame height the person fills. A silhouette under
       three quarters of the frame was taken from too far away; the guide
       says two to three metres, and this grades it. */
    statureConfidence: function (staturePx, frameH) {
      return clamp(staturePx / (0.75 * frameH), 0.3, 1);
    },

    /* Were the arms clear of the torso at the measuring lines? If a wrist
       landmark sits horizontally inside a line's torso run, the arm lay
       over the body there and the silhouette width is inflated. */
    armsApartConfidence: function (L, chest, waist, hip, w) {
      function wristInside(row) {
        if (!row || !row.widest) return false;
        var margin = w * 0.01;
        var inL = L[LM.lWrist].x >= row.start - margin && L[LM.lWrist].x <= row.end + margin;
        var inR = L[LM.rWrist].x >= row.start - margin && L[LM.rWrist].x <= row.end + margin;
        return inL || inR;
      }
      var bad = (wristInside(chest) ? 1 : 0) + (wristInside(waist) ? 1 : 0) + (wristInside(hip) ? 1 : 0);
      if (bad === 0) return 1;
      if (bad === 1) return 0.75;
      return 0.45;
    },

    /* Edge jitter -> confidence. A couple of pixels of wander on a 150 px
       torso is nothing; twenty is a ragged edge and the number inherits it. */
    edgeConfidence: function (jitterPx, widthPx) {
      if (!widthPx) return 0.1;
      return clamp(1 - (4 * jitterPx) / widthPx, 0.1, 1);
    },

    /* Multiply independent factors, none trusted absolutely. A phone scan
       is never certainty, so the ceiling is 0.95, not 1. */
    combine: function (factors) {
      var out = 0.95;
      for (var i = 0; i < factors.length; i++) {
        var f = Math.max(0, Math.min(1, factors[i]));
        out *= f;
      }
      return Math.max(0.05, out);
    }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  return {
    measure: measure,
    loadEngine: loadEngine,
    videoFrame: videoFrame,
    LOW_AT: LOW_AT,
    LM: LM,
    core: core
  };
});
