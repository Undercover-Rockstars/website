#!/usr/bin/env node
/* The fixture test for the block maths under made to measure (#7's code
 * half, the machinery the pattern cutter's real numbers will slot into).
 *
 *   node tools/test-blocks.js
 *
 * No framework, no browser. Three profiles go through blockFor(): one
 * that lands exactly on a size, one between sizes, one outside the run
 * entirely. The last must raise the flag that sends the order to the
 * human step (#8), and the first test asserts the flag does NOT fire for
 * an ordinary body. blockLine() is asserted against the exact sentence
 * the profile screen and the reservation email both show.
 *
 * The numbers in SIZE_RUN and BLOCKS are a draft, clearly marked as one
 * in assets/ur-data.js; what this file proves is the mapping maths, not
 * the tailoring. When the cutter replaces the table, these tests still
 * hold because they assert behaviour (nearest, delta, flag, sentence),
 * with the one exception of sizesBetweenSizes, which pins the drafted
 * run itself so nobody edits it by accident.
 */
'use strict';

const D = require('../assets/ur-data.js');

let failures = 0;
let checks = 0;

function check(name, got, want, tol) {
  checks++;
  const ok = typeof want === 'boolean' ? got === want
    : typeof want === 'string' ? got === want
    : Math.abs(got - want) <= tol;
  const verdict = ok ? 'ok  ' : 'FAIL';
  const detail = typeof want === 'boolean' || typeof want === 'string'
    ? `got ${JSON.stringify(got)}`
    : `got ${got}, want ${want}${tol ? ` ± ${tol}` : ''}`;
  console.log(`${verdict} ${name} (${detail})`);
  if (!ok) failures++;
}

function section(name) {
  console.log(`\n# ${name}`);
}

/* A saved-profile shape, the same one ur.profile.v1 stores: every value
   an object with cm. A null in `over` drops that value entirely. */
function profile(over) {
  const base = {
    chest: 96, waist: 82, hip: 101, shoulder: 44.5, sleeve: 61, back: 43.5
  };
  const values = {};
  Object.keys(base).forEach(k => {
    if (over[k] === null) return;
    values[k] = { cm: over[k] != null ? over[k] : base[k], confidence: 0.8, low: false };
  });
  Object.keys(over).filter(k => !(k in base) && over[k] !== null).forEach(k => {
    values[k] = { cm: over[k], confidence: 0.8, low: false };
  });
  return { v: 1, engine: 'test', created: '2026-01-01T00:00:00.000Z', heightCm: 174, values };
}

/* ------------------------------------------- 1 · lands exactly on a size */

section('a profile that lands exactly on M');

{
  const r = D.blockFor(profile({}), 'Blazer');
  check('size is M', r.size, 'M');
  check('no deltas', Object.values(r.deltas).every(d => d === 0), true);
  check('nothing flagged', r.flagged.length, 0, 0);
  check('beyond is false', r.beyond, false);
  check('ease carried from the category', r.ease.chest, D.BLOCKS.Blazer.ease.chest, 0);
  check('sentence is the plain form', D.blockLine(r), 'cut from an M');
}

/* ---------------------------------------------- 2 · between two sizes */

section('a profile between sizes');

{
  // Chest 94 sits between S (90) and M (96): nearest is M by 2 cm.
  const r = D.blockFor(profile({ chest: 94, sleeve: 63, back: 44.8, hip: 104 }), 'Blazer');
  check('nearest by chest', r.size, 'M');
  check('chest delta', r.deltas.chest, -2, 0);
  check('sleeve delta', r.deltas.sleeve, 2, 0);
  check('back delta', r.deltas.back, 1.3, 0.01);
  check('hip delta', r.deltas.hip, 3, 0);
  check('ordinary body is not flagged', r.beyond, false);
  check('sentence lists the deltas', D.blockLine(r), 'cut from an M, chest -2 cm, seat +3 cm, sleeve +2 cm, back +1.3 cm');
}

{
  // The same chest measured at 94 still picks M, but 92 is nearer S.
  check('94 rounds to M', D.blockFor(profile({ chest: 94 }), 'Shirt').size, 'M');
  check('92 rounds to S', D.blockFor(profile({ chest: 92 }), 'Shirt').size, 'S');
}

/* ------------------------------------------- 3 · outside the run entirely */

section('a profile outside the run');

{
  // A 130 cm chest is 18 cm over XL: beyond what any block in the run
  // can absorb, so the flag must fire. That flag is the signal for the
  // human step in #8, not an error.
  const r = D.blockFor(profile({ chest: 130, waist: 122 }), 'Blazer');
  check('clamps to the nearest size, XL', r.size, 'XL');
  check('chest flagged', r.flagged.includes('chest'), true);
  check('waist flagged', r.flagged.includes('waist'), true);
  check('beyond is true', r.beyond, true);
  check('sentence names what is outside', D.blockLine(r).includes('Outside the XL block on chest and waist'), true);
}

{
  // The flag also fires on a single length far off the block, even with
  // a centred chest: a 70 cm sleeve is 6 cm over XL, over the 4 cm
  // length tolerance.
  const r = D.blockFor(profile({ sleeve: 70 }), 'Knit');
  check('length alone can flag', r.beyond, true);
  check('sleeve is the flagged one', r.flagged.join(','), 'sleeve');
}

/* --------------------------------------------------- 4 · the guard rails */

section('unknown inputs return no mapping');

{
  check('unknown category', D.blockFor(profile({}), 'Onesie') === null, true);
  check('no values', D.blockFor({ heightCm: 174 }, 'Blazer') === null, true);
  check('no chest', D.blockFor(profile({ chest: null }), 'Blazer') === null, true);
  check('blockLine of nothing', D.blockLine(null), '');
}

/* ------------------------------------------------ 5 · the drafted run */

section('the drafted size run itself');

{
  // Every category resolves, every size exists, and the run steps up
  // monotonically, so nothing can pick an M block smaller than an S one.
  const cats = ['Blazer', 'Jacket', 'Shirt', 'Knit'];
  cats.forEach(c => check(`category ${c} has a block`, D.blockFor(profile({}), c) != null, true));
  D.SIZES.forEach((z, i) => {
    if (!i) return;
    check(`${z} chest above previous`, D.SIZE_RUN[z].chest > D.SIZE_RUN[D.SIZES[i - 1]].chest, true);
  });
  // Ease is positive everywhere: a garment is a shell, never smaller
  // than the body it is cut for.
  cats.forEach(c => Object.keys(D.BLOCKS[c].ease).forEach(m =>
    check(`${c} ${m} ease positive`, D.BLOCKS[c].ease[m] > 0, true)));
}

/* -------------------------------------------------------- 6 · the email */

section('the sentence the reservation email carries');

{
  // The same derivation the server does: a tailored line for a Blazer,
  // from the profile the bag attaches.
  const r = D.blockFor(profile({ sleeve: 63, back: 44.5 }), 'Blazer');
  check('email sentence', D.blockLine(r), 'cut from an M, sleeve +2 cm, back +1 cm');
}

/* -------------------------------------------------------- 7 · the loft */

section('the viewer maths: measurements to rings');

(async () => {
  const V = await import('../assets/ur-viewer.js');

  // The inverse of the engine's circumference(): a circumference plus a
  // squash ratio gives axes whose ellipse has that exact circumference.
  const ax = V.axesFor(96, 0.7);
  check('axes invert Ramanujan', V.ramanujan(ax.a, ax.b), 96, 0.001);
  check('a circle is exact', V.axesFor(80, 1).b, V.axesFor(80, 1).a, 1e-9);

  // Levels from a real-shaped profile: waist is nape minus back, crotch
  // is the inseam, and the canon-placed levels sit between them.
  const v = { chest: 96, waist: 82, hip: 101, shoulder: 44.5, sleeve: 61, back: 43.5, inseam: 80 };
  const L = V.levelsFor(v, 178);
  check('waist from back length', L.waistY, L.shoulderY - 43.5, 0.001);
  check('crotch from inseam', L.crotchY, 80, 0.001);
  check('seat below waist, above crotch', L.hipY < L.waistY && L.hipY > L.crotchY, true);
  check('chest between waist and shoulder', L.chestY > L.waistY && L.chestY < L.shoulderY, true);

  // The body rings: every measured ring's circumference is the measured
  // number, so the mannequin cannot imply a shape that was not measured.
  const body = V.bodyRings(v, 178);
  const ringCirc = i => V.ramanujan(body.rings[i].a, body.rings[i].b);
  check('seat ring is the seat measurement', ringCirc(1), 101, 0.01);
  check('waist ring is the waist measurement', ringCirc(2), 82, 0.01);
  check('chest ring is the chest measurement', ringCirc(4), 96, 0.01);

  // The shell: the same levels plus the drafted ease, so the visible
  // gap at each level is exactly the category's drafted number.
  const ease = { chest: 11, waist: 9, hip: 9 };
  const shell = V.garmentRings(body, ease, 24);
  const shellCirc = i => V.ramanujan(shell[i].a, shell[i].b);
  check('shell chest = body + ease', shellCirc(4), 96 + 11, 0.05);
  check('shell waist = body + ease', shellCirc(2), 82 + 9, 0.05);
  check('shell seat = body + ease', shellCirc(1), 101 + 9, 0.05);
  check('hem below the seat by the drafted drop', shell[0].y, L.hipY - 24, 0.001);
  check('shell is outside the body everywhere', shell[4].a > body.rings[4].a && shell[1].a > body.rings[1].a, true);

  finish();
})();

/* -------------------------------------------------------------- exit */

function finish() {
  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures) {
    console.error('FAILED');
    process.exit(1);
  }
  console.log('The block mapping holds: nearest size, deltas, flag, sentence.');
  console.log('What this cannot prove: the tailoring. The table is a draft,');
  console.log('marked as one, until the pattern cutter replaces it.');
  process.exit(0);
}
