#!/usr/bin/env node
/* The geometry test for the fit viewer (#10, the hardening pass).
 *
 *   node tools/test-geometry.js
 *
 * No framework, no browser, no GPU. Three viewer bugs shipped past 105
 * green checks because nothing ever looked at the buffers WebGL eats:
 *
 *   1. buildScene used an argument it never received and threw before
 *      the first frame. Caught here by building the whole scene's worth
 *      of geometry at every size and with a seeded profile: a missing
 *      argument is a throw in this file, not a blank canvas in a shop.
 *   2. a preset read fields off a function object and put the camera at
 *      NaN, which silently rendered nothing. The same family, undefined
 *      input reaching maths, is caught by the no-NaN and finite-bounds
 *      assertions on every position array.
 *   3. tubeGeometry indexed a cap centre one vertex past the end of the
 *      buffer. WebGL draws nothing for a geometry with an out of range
 *      index, so four limbs existed, reported triangles, and drew
 *      nothing. Caught here by the one assertion that matters most:
 *      every index an integer inside [0, vertexCount).
 *
 * The builders are imported from ur-viewer.js, where they live above
 * the open() marker and take THREE as an argument. The stub below
 * supplies the four classes they touch, so the real shipped code runs,
 * not a copy of it. Placement assertions then hold the parts to where
 * a body's parts belong, because bug 3 proved that existing and drawing
 * are not the same thing.
 *
 * What this cannot prove: how anything looks once a GPU shades it, that
 * three.js itself draws the buffers it is given, and anything about the
 * camera or the lights. A pair of eyes on the open viewer remains part
 * of the release check.
 */
'use strict';

const D = require('../assets/ur-data.js');

/* The THREE stub: exactly the surface loftGeometry and tubeGeometry
   touch. Float32BufferAttribute converts a plain array the way the real
   one does, so position arrays are Float32Array either way. */
class BufferAttribute {
  constructor(array, itemSize) {
    this.array = array instanceof Float32Array ? array : Float32Array.from(array);
    this.itemSize = itemSize;
    this.count = this.array.length / itemSize;
  }
}
class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; }
  setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  setIndex(idx) {
    this.index = Array.isArray(idx) ? idx.slice() : Array.from(idx.array);
    return this;
  }
  computeVertexNormals() { return this; }   // never asserted on
}
const T = {
  BufferGeometry,
  BufferAttribute,
  Float32BufferAttribute: class extends BufferAttribute {}
};

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

/* For the assertions whose healthy result is "no complaint": the
   failure detail travels in `got`, so a FAIL line says exactly which
   geometry and which index. */
function checkClean(name, err) {
  check(name, err || 'clean', 'clean');
}

/* ------------------------------------------------ the buffer assertions */

function indicesValid(geo) {
  const idx = geo.index;
  if (!idx || !idx.length) return 'no index buffer';
  if (idx.length % 3 !== 0) return `${idx.length} indices, not a whole triangle count`;
  const n = geo.attributes.position.count;
  for (let i = 0; i < idx.length; i++) {
    if (!Number.isInteger(idx[i]) || idx[i] < 0 || idx[i] >= n) {
      return `index ${idx[i]} at ${i} outside [0, ${n})`;
    }
  }
  return null;   // valid
}

function positionsFinite(geo) {
  const a = geo.attributes.position.array;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i])) return `component ${i} is ${a[i]}`;
  }
  return null;
}

function bboxOf(geo) {
  const a = geo.attributes.position.array;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < a.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (a[i + k] < min[k]) min[k] = a[i + k];
      if (a[i + k] > max[k]) max[k] = a[i + k];
    }
  }
  return { min, max };
}

function bboxSane(name, box) {
  for (let k = 0; k < 3; k++) {
    if (!Number.isFinite(box.min[k]) || !Number.isFinite(box.max[k])) {
      return `${name} bounds not finite on axis ${k}`;
    }
    // A real part occupies real space: a degenerate (flat or empty) box
    // means the part exists as data but could never be seen in 3D.
    if (!(box.max[k] - box.min[k] > 1)) {
      return `${name} degenerate on axis ${k} (${box.min[k]}..${box.max[k]})`;
    }
  }
  return null;
}

/* --------------------------------------------- the scene, built in node */

(async () => {
  const V = await import('../assets/ur-viewer.js');

  /* The same bodies the app draws: the five size-run bodies (the
     mapping sizeRunValues does inside open()) and one seeded profile
     with a measured inseam. The Blazer block stands in for the shell,
     as the default category does. */
  const ease = D.BLOCKS.Blazer.ease;
  const hem = D.BLOCKS.Blazer.hemBelowSeat;
  const configs = [];
  for (const z of D.SIZES) {
    const s = D.SIZE_RUN[z];
    configs.push([`size ${z} (${s.height} cm)`, {
      chest: s.chest, waist: s.waist, hip: s.hip, shoulder: s.shoulder,
      sleeve: s.sleeve, back: s.back, inseam: null
    }, s.height]);
  }
  configs.push(['seeded profile (178 cm)', {
    chest: 96, waist: 82, hip: 101, shoulder: 44.5,
    sleeve: 61, back: 43.5, inseam: 80
  }, 178]);

  // open() must refuse cleanly outside a browser, not throw: the module
  // stays importable wherever the page runs.
  check('open() without a DOM refuses, not throws', V.open({}, {}).error, 'no-data');

  for (const [label, v, h] of configs) {
    section(`the scene at ${label}`);

    // Bug 1's family: any builder missing an argument throws HERE.
    let scene;
    try {
      const body = V.bodyRings(v, h);
      scene = {
        L: body.levels,
        torso: V.loftGeometry(T, body.rings, V.MESH.bodyRadial, V.MESH.bodySmooth, true),
        armL: V.tubeGeometry(T, V.armSpec(v, h, -1), V.MESH.limbRadial, 0),
        armR: V.tubeGeometry(T, V.armSpec(v, h, 1), V.MESH.limbRadial, 0),
        legL: V.tubeGeometry(T, V.legSpec(v, h, -1), V.MESH.limbRadial, 0),
        legR: V.tubeGeometry(T, V.legSpec(v, h, 1), V.MESH.limbRadial, 0),
        shell: V.loftGeometry(T, V.garmentRings(body, ease, hem), V.MESH.bodyRadial, V.MESH.shellSmooth, false),
        shellArmL: V.tubeGeometry(T, V.armSpec(v, h, -1), V.MESH.limbRadial, V.MESH.sleeveShellEase),
        shellArmR: V.tubeGeometry(T, V.armSpec(v, h, 1), V.MESH.limbRadial, V.MESH.sleeveShellEase),
        head: V.headSpec(v, h)
      };
    } catch (e) {
      check(`${label} builds without throwing`, false, true);
      console.log('    threw: ' + (e && e.message));
      continue;
    }
    check(`${label} builds without throwing`, true, true);

    const parts = ['torso', 'armL', 'armR', 'legL', 'legR', 'shell', 'shellArmL', 'shellArmR'];
    const boxes = {};
    let badIndex = null, badFinite = null, badBox = null;
    for (const p of parts) {
      const g = scene[p];
      badIndex = badIndex || indicesValid(g) && `${p}: ${indicesValid(g)}`;
      badFinite = badFinite || positionsFinite(g) && `${p}: ${positionsFinite(g)}`;
      boxes[p] = bboxOf(g);
      badBox = badBox || bboxSane(p, boxes[p]);
    }
    checkClean('every index of every geometry is an integer in [0, vertexCount)', badIndex);
    checkClean('no NaN or infinity in any position array', badFinite);
    checkClean('every bounding box finite and non-degenerate', badBox);

    const L = scene.L;
    const handY = L.shoulderY - 1 - v.sleeve;

    // The torso: lofted from crotch ring to neck ring, so it reaches
    // from inside the seat to the shoulder line and never beyond the
    // neck by much.
    check('torso reaches below the seat line', boxes.torso.min[1] < L.hipY, true);
    check('torso reaches above the shoulder line', boxes.torso.max[1] > L.shoulderY, true);
    check('torso stops at the neck, not far above it', boxes.torso.max[1] < L.neckY + 8, true);

    // The arms: shoulder height down to hand height, joint end inside
    // the torso's vertical span.
    for (const side of ['armL', 'armR']) {
      const b = boxes[side];
      check(`${side} top sits at the shoulder line`, Math.abs(b.max[1] - L.shoulderY) <= 8, true);
      check(`${side} ends at hand height`, Math.abs(b.min[1] - handY) <= 8, true);
      check(`${side} joint end overlaps the torso's span`, b.max[1] >= L.shoulderY - 5, true);
    }

    // The legs: crotch to the floor, joint end inside the torso's span.
    for (const side of ['legL', 'legR']) {
      const b = boxes[side];
      check(`${side} reaches the floor`, b.min[1] <= 4 && b.min[1] >= -8, true);
      check(`${side} starts at the crotch`, b.max[1] >= L.crotchY - 2 && b.max[1] <= L.crotchY + 20, true);
      check(`${side} joint end overlaps the torso's span`, b.max[1] >= L.crotchY, true);
    }

    // The head: sits on the neck ring, above the torso, and does not
    // poke through the stated stature.
    const hd = scene.head;
    const headBottom = hd.y - hd.ry, headTop = hd.y + hd.ry;
    check("head sits on the torso's top ring", Math.abs(headBottom - L.neckY) <= 0.01, true);
    check('head is above the shoulder line', headTop > L.shoulderY, true);
    check('head does not exceed the stature', headTop <= h + 0.01, true);
  }

  finish();
})();

/* -------------------------------------------------------------- exit */

function finish() {
  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures) {
    console.error('FAILED');
    process.exit(1);
  }
  console.log('Every buffer the viewer builds is drawable and every part is');
  console.log('where a body keeps it. What this cannot prove: how it looks');
  console.log('once a GPU shades it. Eyes on the viewer stay in the loop.');
  process.exit(0);
}
