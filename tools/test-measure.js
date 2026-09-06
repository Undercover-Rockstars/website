#!/usr/bin/env node
/* The synthetic fixture test for the measurement core (#5's spike, the
 * part that needs no volunteers).
 *
 *   node tools/test-measure.js
 *
 * No framework, no browser, no camera. Each fixture builds a mask of a
 * shape whose real dimensions are known, pushes it through the same pure
 * functions ur-measure.js uses in the browser (scale, row scanning, level
 * finding, the ellipse circumference), and asserts the numbers come back
 * correct within a stated tolerance. If this passes, the
 * pixels-to-centimetres path is proven; what remains unproven, honestly,
 * is how well a real photo of a real person becomes one of these masks.
 * That is what the tape-check mode in the app measures, with people.
 *
 * A mask here is a plain Uint8Array, width*height, non-zero = body, the
 * same shape MPMask.getAsUint8Array() produces in the browser.
 */
'use strict';

const M = require('../assets/ur-measure.js');
const core = M.core;

let failures = 0;
let checks = 0;

function check(name, got, want, tol) {
  checks++;
  const ok = typeof want === 'boolean' ? got === want
    : Math.abs(got - want) <= tol;
  const verdict = ok ? 'ok  ' : 'FAIL';
  const detail = typeof want === 'boolean'
    ? `got ${got}`
    : `got ${got.toFixed(3)}, want ${want} ± ${tol}`;
  console.log(`${verdict} ${name} (${detail})`);
  if (!ok) failures++;
}

function section(name) {
  console.log(`\n# ${name}`);
}

/* --------------------------------------------------------- mask helpers */

function blank(w, h) { return new Uint8Array(w * h); }

function fillRect(mask, w, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x >= 0 && x < w) mask[y * w + x] = 1;
    }
  }
}

/* A rectangle standing for a person: the fixture whose dimensions are
   exactly known. 480 px tall at 180 cm means 0.375 cm per pixel. */
function standingPerson(w, h, top, pxTall, pxWide) {
  const m = blank(w, h);
  fillRect(m, w, Math.floor((w - pxWide) / 2), top, Math.floor((w + pxWide) / 2) - 1, top + pxTall - 1);
  return m;
}

/* ------------------------------------------------------ 1 · the scale */

section('scale: stated height over pixel stature');

{
  // A silhouette 480 px tall standing for 180 cm.
  const w = 360, h = 720, m = standingPerson(w, h, 60, 480, 120);
  const st = core.pixelStature(m, w, h);
  check('pixel stature top', st.top, 60, 0);
  check('pixel stature bottom', st.bottom, 60 + 480 - 1, 0);
  check('pixel stature px', st.px, 480, 0);
  const cpp = core.cmPerPixel(180, st.px);
  check('cm per pixel', cpp, 0.375, 1e-9);
  // The width in cm that follows from it.
  const row = core.rowScan(m, w, h, 300);
  check('row width px', row.width, 120, 0);
  check('row width cm', row.width * cpp, 45.0, 1e-9);
}

{
  // Different stature, same assertion: 1600 px for 175 cm.
  const w = 1080, h = 1920, m = standingPerson(w, h, 100, 1600, 432);
  const st = core.pixelStature(m, w, h);
  const cpp = core.cmPerPixel(175, st.px);
  check('cm per pixel, tall frame', cpp, 175 / 1600, 1e-9);
  check('width cm, tall frame', core.rowScan(m, w, h, 900).width * cpp, 432 * 175 / 1600, 1e-9);
}

/* --------------------------------------------- 2 · the row scanning */

section('row scan: torso run vs arms');

{
  // Torso run 100 px wide, a 20 px arm run 15 px to its right, a 25 px
  // arm to its left: the widest single run is the torso.
  const w = 320, h = 240, m = blank(w, h);
  fillRect(m, w, 100, 100, 199, 200);  // torso
  fillRect(m, w, 10, 100, 34, 200);    // left arm, wider gap
  fillRect(m, w, 215, 100, 234, 200);  // right arm
  const r = core.rowScan(m, w, h, 150);
  check('run count', r.runs.length, 3, 0);
  check('span includes arms', r.span, 234 - 10 + 1, 0);
  check('widest run is the torso', r.width, 100, 0);
  check('torso start', r.start, 100, 0);
  check('torso end', r.end, 199, 0);
}

{
  // Arms merged with the torso (no gap): widest run equals span, the
  // number is inflated, and the arms factor is expected to flag it.
  const w = 320, h = 240, m = blank(w, h);
  fillRect(m, w, 60, 100, 259, 200);
  const r = core.rowScan(m, w, h, 150);
  check('merged: one run', r.runs.length, 1, 0);
  check('merged: widest = span', r.width, r.span, 0);
}

/* ---------------------------------------------- 3 · the line levels */

section('levels: waist is narrowest, hip is widest');

{
  // A torso that narrows to 80 px at the waist row and widens to 140 px
  // at the seat, between shoulder y=100 and hip-joint y=300.
  const w = 360, h = 720, m = blank(w, h);
  for (let y = 100; y <= 420; y++) {
    // width(y): 120 at y=100, 80 at y=260, 140 at y=340, 110 below.
    let width;
    if (y < 260) width = 120 - (40 * (y - 100)) / 160;
    else if (y < 340) width = 80 + (60 * (y - 260)) / 80;
    else width = 140 - (30 * (y - 340)) / 80;
    const x0 = Math.floor((w - width) / 2);
    fillRect(m, w, x0, y, x0 + Math.floor(width) - 1, y);
  }
  // Bands as frameGeometry derives them from a 100..300 torso:
  // waist 0.55..1.05 -> 210..310, hip 0.90..1.35 -> 280..370.
  const waist = core.narrowestRow(m, w, h, 210, 310);
  // Pixel flooring puts the first 80-px row at y=257 of the taper, so the
  // argmin lands a few rows above the mathematical 260.
  check('waist y found', waist.y, 260, 4);
  check('waist width', waist.width, 80, 1);
  const hip = core.widestRow(m, w, h, 280, 370);
  check('hip y found', hip.y, 340, 1);
  check('hip width', hip.width, 140, 1);
}

{
  // The crotch: legs split below y=500, so the split row is 500.
  const w = 360, h = 720, m = blank(w, h);
  fillRect(m, w, 130, 300, 229, 499);      // hips, single run
  fillRect(m, w, 140, 500, 179, 700);      // left leg
  fillRect(m, w, 185, 500, 224, 700);      // right leg, 5 px gap at 180..184
  const split = core.legSplitRow(m, w, h, 330, 650);
  check('leg split row', split, 500, 0);
  const noSplit = blank(360, 720);
  fillRect(noSplit, 360, 140, 300, 219, 700); // legs bridged
  check('bridged legs report null', core.legSplitRow(noSplit, 360, 720, 330, 650) === null, true, 0);
}

/* --------------------------------------- 4 · the circumference maths */

section('circumference: Ramanujan ellipse');

{
  // A circle: Ramanujan is exact. r=10 -> 62.83185307...
  const c = core.ramanujan(10, 10);
  check('circle exact', c, 2 * Math.PI * 10, 1e-6);

  // A known ellipse, a=20 b=10. Ramanujan I is within ~1e-5 of the true
  // perimeter; integrate numerically for ground truth rather than trust
  // a second approximation.
  const a = 20, b = 10;
  const n = 4000000;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * Math.PI * 2 / n;
    s += Math.sqrt((a * Math.sin(t)) ** 2 + (b * Math.cos(t)) ** 2);
  }
  const exact = (Math.PI * 2 / n) * s;
  check('ellipse vs numeric integral', core.ramanujan(a, b), exact, exact * 5e-5);

  // The shape the app actually calls: width 46 cm, depth 25 cm.
  const circ = core.circumference(46, 25);
  const want = core.ramanujan(23, 12.5);
  check('from width and depth', circ, want, 1e-9);
  // And a sanity band: a 46x25 torso is a plausibly human ~110 cm chest.
  check('human-plausible chest', circ > 100 && circ < 120, true, 0);
}

/* ------------------------------------------------ 5 · the confidence */

section('confidence: factors behave as documented');

{
  // Landmarks for a clean, square front pose.
  function pose(vis) {
    return (Array.apply(null, Array(33))).map((_, i) => ({
      x: 0, y: 0, visibility: vis == null ? 0.98 : vis[i] || 0.98
    }));
  }
  const L = pose();
  L[M.LM.lShoulder] = { x: 150, y: 100, visibility: 0.98 };
  L[M.LM.rShoulder] = { x: 210, y: 101, visibility: 0.97 };
  L[M.LM.lHip] = { x: 160, y: 300, visibility: 0.95 };
  L[M.LM.rHip] = { x: 200, y: 300, visibility: 0.95 };
  const sq = core.squarenessFront(L);
  check('square front close to ceiling', sq, 0.9, 0.15);

  // Tilt the spine 20 degrees: confidence must drop hard.
  const T = pose();
  T[M.LM.lShoulder] = { x: 150, y: 100, visibility: 0.98 };
  T[M.LM.rShoulder] = { x: 210, y: 101, visibility: 0.97 };
  T[M.LM.lHip] = { x: 218, y: 295, visibility: 0.95 };   // ~20deg lean
  T[M.LM.rHip] = { x: 258, y: 294, visibility: 0.95 };
  check('tilted front penalised', core.squarenessFront(T) < sq * 0.7, true, 0);

  // Side pose stacked: shoulders near same x, hips same y.
  const SP = pose();
  SP[M.LM.lShoulder] = { x: 180, y: 100, visibility: 0.9 };
  SP[M.LM.rShoulder] = { x: 182, y: 102, visibility: 0.85 };
  SP[M.LM.lHip] = { x: 181, y: 300, visibility: 0.9 };
  SP[M.LM.rHip] = { x: 183, y: 301, visibility: 0.88 };
  check('stacked profile reads square', core.squarenessSide(SP), 0.9, 0.2);

  // Arms over the torso: wrist landmark inside the run halves confidence.
  const row = { start: 100, end: 200, widest: { start: 100, end: 200, width: 101 } };
  const AW = pose();
  AW[M.LM.lWrist] = { x: 60, y: 400, visibility: 0.9 };
  AW[M.LM.rWrist] = { x: 320, y: 400, visibility: 0.9 };
  const apart = core.armsApartConfidence(AW, row, row, row, 360);
  AW[M.LM.rWrist] = { x: 180, y: 400, visibility: 0.9 };  // right wrist over the torso
  const over = core.armsApartConfidence(AW, row, row, row, 360);
  check('arms apart full', apart, 1, 0);
  check('arm over body penalised at every line', over, 0.45, 0);

  // Ragged edge: jitter of 20 px on a 100 px width must fail the factor.
  check('clean edge confidence', core.edgeConfidence(1, 100), 0.96, 0.01);
  check('ragged edge confidence', core.edgeConfidence(20, 100) < 0.3, true, 0);

  // Nothing ever combines to certainty.
  check('combine ceiling', core.combine([1, 1, 1, 1]) <= 0.95, true, 0);
  check('combine floor', core.combine([0, 0, 0]) >= 0.05, true, 0);
}

/* ------------------------------------------- 6 · an end-to-end shape */

section('a person-shaped fixture, levels to centimetres');

{
  // Build a simple parametric "person": head, shoulders, torso that
  // narrows at the waist, widens at the seat, then legs, all centred in a
  // 480x854 frame, 760 px tall, for a stated 190 cm.
  const W = 480, H = 854, TOP = 40, BOTTOM = 799;  // 760 px stature
  const m = blank(W, H);
  const cx = W / 2;

  // Width profile down the body, in px, at key y values (interpolated):
  //   head   y=40..100:  70
  //   chest  y=140:      150   (the chest line will be found here)
  //   waist  y=300:      104   (narrowest)
  //   seat   y=400:      146   (widest)
  //   thighs y=420..600: 130 -> 90, two legs with a gap from y=430
  function torsoWidth(y) {
    if (y < 100) return 70;
    if (y < 140) return 70 + (80 * (y - 100)) / 40;
    if (y < 300) return 150 - (46 * (y - 140)) / 160;
    if (y < 400) return 104 + (42 * (y - 300)) / 100;
    if (y < 430) return 146 - (16 * (y - 400)) / 30;
    return 130 - (40 * (y - 430)) / 170;
  }
  for (let y = TOP; y <= 430; y++) {
    const wpx = torsoWidth(y);
    const x0 = Math.round(cx - wpx / 2);
    fillRect(m, W, x0, y, x0 + Math.round(wpx) - 1, y);
  }
  // Legs from 430 down, two runs with a gap.
  for (let y = 431; y <= BOTTOM; y++) {
    const wpx = torsoWidth(y);
    const gap = Math.max(6, Math.round(wpx * 0.12));
    const leg = Math.floor((wpx - gap) / 2);
    fillRect(m, W, Math.round(cx - wpx / 2), y, Math.round(cx - wpx / 2) + leg - 1, y);
    fillRect(m, W, Math.round(cx + wpx / 2) - leg, y, Math.round(cx + wpx / 2) - 1, y);
  }

  const cpp = core.cmPerPixel(190, core.pixelStature(m, W, H).px);
  check('fixture cm per pixel', cpp, 190 / 760, 1e-9);

  // Landmarks consistent with the shape: shoulders y=140, hips y=360.
  // Chest line = 30% of shoulder->hip: y = 140 + 0.30*220 = 206.
  const L = (Array.apply(null, Array(33))).map(() => ({ x: cx, y: 0, visibility: 0.97 }));
  L[M.LM.lShoulder] = { x: cx - 60, y: 140, visibility: 0.97 };
  L[M.LM.rShoulder] = { x: cx + 60, y: 140, visibility: 0.97 };
  L[M.LM.lHip] = { x: cx - 32, y: 360, visibility: 0.95 };
  L[M.LM.rHip] = { x: cx + 32, y: 360, visibility: 0.95 };
  L[M.LM.lWrist] = { x: cx - 150, y: 330, visibility: 0.9 };
  L[M.LM.rWrist] = { x: cx + 150, y: 330, visibility: 0.9 };
  L[M.LM.lAnkle] = { x: cx - 30, y: 780, visibility: 0.95 };
  L[M.LM.rAnkle] = { x: cx + 30, y: 780, visibility: 0.95 };

  // Chest: at y=206 the fixture is 150 - 46*(206-140)/160 = 131.0 px.
  const chestRow = core.rowScan(m, W, H, 206);
  check('chest line width cm', chestRow.width * cpp, (150 - (46 * 66) / 160) * 190 / 760, 0.3);

  // Waist: narrowest row in the band, exactly y=300, width 104 px.
  const waist = core.narrowestRow(m, W, H, Math.round(140 + 0.55 * 220), Math.round(140 + 1.05 * 220));
  check('waist y', waist.y, 300, 1);
  check('waist width cm', waist.width * cpp, 104 * 190 / 760, 0.3);

  // Seat: widest row below the hip joints: y=400, width 146 px.
  const seat = core.widestRow(m, W, H, Math.round(140 + 0.9 * 220), Math.round(140 + 1.35 * 220));
  check('seat y', seat.y, 400, 1);
  check('seat width cm', seat.width * cpp, 146 * 190 / 760, 0.3);

  // The legs split at y=431 (first row with a real gap).
  check('fixture leg split', core.legSplitRow(m, W, H, 380, 770), 431, 0);

  // Inseam: split row to the floor, in cm: (799-431+1) px.
  check('inseam cm', (799 - 431 + 1) * cpp, 369 * 190 / 760, 0.3);

  // Shoulder width, landmark to landmark, the one length that is joint
  // to joint: 120 px.
  check('shoulder cm', core.dist(L[M.LM.lShoulder], L[M.LM.rShoulder]) * cpp, 120 * 190 / 760, 1e-9);

  // A circumference from this fixture: front width 104 px, if the side
  // photo gave a depth of 80 px, at the same scale.
  check('waist circumference cm', core.circumference(104 * cpp, 80 * cpp), core.ramanujan(52 * cpp, 40 * cpp), 1e-9);
}

/* -------------------------------------------------------------- exit */

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error('FAILED');
  process.exit(1);
}
console.log('The pixels-to-centimetres path holds on synthetic shapes.');
console.log('What this cannot prove: that a real photo becomes a clean mask.');
console.log('That is what the tape-check mode in the app is for.');
