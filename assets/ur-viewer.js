/* UR Viewer, the layer 1 fit viewer (#10).
 *
 * What this draws and what it refuses to draw:
 *
 *   The body is LOFTED FROM THE MEASUREMENTS THEMSELVES: elliptical
 *   rings at the chest, waist and seat, each sized from that level's
 *   measured circumference, interpolated smoothly between, limbs as
 *   tapered tubes along the measured sleeve and inseam lengths, head and
 *   everything the profile does not carry closed off plainly. The
 *   mannequin is exactly as detailed as the data behind it and no more;
 *   it cannot imply a shape that was never measured, and the screen says
 *   so. No parametric human mesh, no garment model, no fabric.
 *
 *   The garment is THE SAME LOFT PLUS EASE: the extra room the
 *   category's cut leaves over the body at each level, drawn as a
 *   translucent shell. The gap between body and shell is the visible
 *   thing, because that gap is the fit. Day and night versions share
 *   every seam of geometry, like the garments: colour and finish only,
 *   driven by the site's [data-mode] attribute.
 *
 * Loading: three.js (vendored, 0.185.1) is imported on first open(),
 * never on the /fit/ page view, exactly like the pose engine. The
 * service worker caches it on demand, never in install.
 *
 * Privacy: the profile is read from localStorage (ur.profile.v1) in
 * this browser. Nothing about it is uploaded, and no request leaves the
 * origin when the viewer runs.
 *
 * Node: everything above the `open()` marker is pure maths, exported so
 * tools/test-blocks.js can prove the loft without a GPU. three.js and
 * the DOM are touched only inside open() and the functions it builds.
 */

export const PROFILE_KEY = 'ur.profile.v1';

/* Mirrors the sane ranges in ur-profile.js FIELDS; the server validates
   the same ranges. Duplicated here so the viewer stays loadable alone. */
export const PROFILE_RANGES = {
  chest: [60, 200], waist: [50, 200], hip: [60, 210],
  shoulder: [30, 70], sleeve: [30, 90], back: [30, 90], inseam: [30, 100]
};

/* Canon: proportions used ONLY where the profile is silent. Every ring
   size comes from a measured circumference; the level heights come from
   the buyer's own back and inseam where they exist, and from standard
   figure-drawing proportions for the rest. Squash ratios say how deep
   an ellipse is relative to its width when only the circumference was
   measured; real torsos are not ellipses and the engine that produced
   the numbers already said so. */
export const CANON = {
  shoulderHeight: 0.84,   // of stature, the neck base / shoulder line
  hipDownFactor: 0.72,    // seat line, fraction from waist down to crotch
  chestUpFactor: 0.45,    // chest line, fraction of back length below nape
  inseamFactor: 0.465,    // of stature, when no inseam was measured
  squash: { chest: 0.70, waist: 0.78, hip: 0.82 },
  neckWidth: 0.21,        // of shoulder width, half-width of the neck ring
  armAngle: 8,            // degrees out from vertical, arms at rest
  armUpper: 0.32,         // upper arm circumference, of chest
  armWrist: 0.17,
  legThigh: 0.60,         // thigh circumference, of seat
  legKnee: 0.38,
  legAnkle: 0.22
};

export function ramanujan(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/* A circumference and a squash ratio -> the ellipse semi-axes. The
   engine's circumference() ran the same approximation in the other
   direction; this inverts it by bisection, which converges in a dozen
   steps and is exact for a circle. */
export function axesFor(circCm, squash) {
  let lo = 0.5, hi = Math.max(2, circCm);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const c = ramanujan(mid, mid * squash);
    if (c < circCm) lo = mid; else hi = mid;
  }
  const a = (lo + hi) / 2;
  return { a, b: a * squash };
}

/* The measuring levels, in cm above the floor. waist and crotch come
   from the profile's own back and inseam; the shoulder line, and the
   chest and seat placement between measured levels, come from CANON. */
export function levelsFor(v, heightCm) {
  const H = heightCm;
  const back = v.back || 0.25 * H;
  const shoulderY = CANON.shoulderHeight * H;
  const waistY = shoulderY - back;
  const inseam = v.inseam && v.inseam < waistY - 10 ? v.inseam : CANON.inseamFactor * H;
  const crotchY = Math.min(inseam, waistY - 10);
  const hipY = waistY - CANON.hipDownFactor * (waistY - crotchY);
  const chestY = shoulderY - CANON.chestUpFactor * back;
  const neckY = shoulderY + 4;
  return { H, shoulderY, neckY, chestY, waistY, hipY, crotchY };
}

/* Body control rings, bottom to top: crotch (the seat closing onto the
   legs), seat, waist, armpit, chest, shoulder, neck. Each carries its
   ellipse semi-axes a (half width) and b (half depth) in cm. */
export function bodyRings(v, heightCm) {
  const L = levelsFor(v, heightCm);
  const chest = axesFor(v.chest, CANON.squash.chest);
  const waist = axesFor(v.waist, CANON.squash.waist);
  const hip = axesFor(v.hip, CANON.squash.hip);
  const shoulderHalf = v.shoulder / 2;
  return {
    levels: L,
    rings: [
      { y: L.crotchY + 2, a: hip.a * 0.74, b: hip.b * 0.86 },
      { y: L.hipY, a: hip.a, b: hip.b },
      { y: L.waistY, a: waist.a, b: waist.b },
      { y: (L.chestY + L.waistY) / 2, a: (chest.a + waist.a) / 2, b: (chest.b + waist.b) / 2 },
      { y: L.chestY, a: chest.a, b: chest.b },
      { y: L.chestY + (L.shoulderY - L.chestY) * 0.5, a: (chest.a + shoulderHalf) / 2, b: chest.b * 0.82 },
      { y: L.shoulderY, a: shoulderHalf, b: chest.b * 0.68 },
      { y: L.neckY, a: Math.max(5.5, v.shoulder * CANON.neckWidth), b: Math.max(6, v.shoulder * CANON.neckWidth * 1.05) }
    ]
  };
}

/* The garment: the same levels with the category's ease added at chest,
   waist and seat, carried unchanged down to the hem, easing to almost
   nothing at the neck. ease = { chest, waist, hip }, hemBelowSeat in
   cm, both from BLOCKS in ur-data.js (the provisional draft). */
export function garmentRings(body, ease, hemBelowSeat) {
  const L = body.levels;
  const ring = (circ, squash) => axesFor(circ, squash);
  const chest = ring(circOf(body.rings, 4) + ease.chest, CANON.squash.chest);
  const waist = ring(circOf(body.rings, 2) + ease.waist, CANON.squash.waist);
  const hip = ring(circOf(body.rings, 1) + ease.hip, CANON.squash.hip);
  const hemY = L.hipY - hemBelowSeat;
  return [
    { y: hemY, a: hip.a * 0.97, b: hip.b * 0.95 },
    { y: L.hipY, a: hip.a, b: hip.b },
    { y: L.waistY, a: waist.a, b: waist.b },
    { y: (L.chestY + L.waistY) / 2, a: (chest.a + waist.a) / 2, b: (chest.b + waist.b) / 2 },
    { y: L.chestY, a: chest.a, b: chest.b },
    { y: L.chestY + (L.shoulderY - L.chestY) * 0.5, a: (chest.a + over(body.rings[5].a)) / 2, b: chest.b * 0.86 },
    { y: L.shoulderY, a: over(body.rings[6].a), b: chest.b * 0.74 },
    { y: L.neckY, a: over(body.rings[7].a), b: chest.b * 0.62 }
  ];
}

/* over(): the shell at an unmeasured level (shoulder, neck) hugs the
   body with a fixed couple of centimetres of room instead of a drafted
   ease nobody measured. */
function over(bodyA) {
  return bodyA + 1.6;
}

/* The circumference a body ring was built from, recovered from its axes
   so garmentRings needs no parallel table of raw circumferences. */
function circOf(rings, i) {
  return ramanujan(rings[i].a, rings[i].b);
}

/* Limb tubes, as axis endpoints plus radii at fractions along. All
   radii are canon fractions of the measured chest / seat; the lengths
   are the measured sleeve and inseam. */
export function armSpec(v, heightCm, side) {
  const L = levelsFor(v, heightCm);
  const dx = Math.tan(CANON.armAngle * Math.PI / 180) * v.sleeve;
  const rU = (v.chest * CANON.armUpper) / (2 * Math.PI);
  const rW = (v.chest * CANON.armWrist) / (2 * Math.PI);
  return {
    from: { x: side * v.shoulder * 0.46, y: L.shoulderY - 1, z: 0 },
    to: { x: side * (v.shoulder * 0.46 + dx), y: L.shoulderY - 1 - v.sleeve, z: 0 },
    radii: [
      { t: 0.04, r: rU },
      { t: 0.5, r: (rU + rW) / 2 + 0.35 },
      { t: 1, r: rW }
    ]
  };
}

export function legSpec(v, heightCm, side) {
  const L = levelsFor(v, heightCm);
  const hip = axesFor(v.hip, CANON.squash.hip);
  const rT = (v.hip * CANON.legThigh) / (2 * Math.PI);
  const rK = (v.hip * CANON.legKnee) / (2 * Math.PI);
  const rA = (v.hip * CANON.legAnkle) / (2 * Math.PI);
  const topY = L.crotchY + 4;
  return {
    from: { x: side * hip.a * 0.45, y: topY, z: 0 },
    to: { x: side * hip.a * 0.4, y: 0, z: 0 },
    radii: [
      { t: 0.02, r: rT },
      { t: 0.45, r: rK + 0.6 },
      { t: 1, r: rA }
    ]
  };
}

/* ------------------------------------------------------- open() marker */

/* Everything below builds a scene, needs the DOM, and imports three.js
   lazily. open(section, opts) returns a controller:
     setCategory(cat)  rebuild the shell for another category's ease
     setSize(size)     in size-run mode, rebuild for another size
     reload()          re-read the saved profile (post-scan)
     close()           stop, tear down, drop three.js references
   opts: { category, size } with defaults Blazer / M.
 */
export function open(section, opts) {
  const D = (typeof window !== 'undefined' && window.UR_DATA) || null;
  if (!D || !D.BLOCKS) {
    return { error: 'no-data' };
  }
  const stage = section.querySelector('#vw-stage');
  const statusEl = section.querySelector('#vw-status');
  const sourceEl = section.querySelector('#vw-source');
  const easeEl = section.querySelector('#vw-ease');
  const sizesRow = section.querySelector('#vw-sizes');
  const reloadBtn = section.querySelector('#vw-reload');
  if (!stage) return { error: 'no-stage' };

  const state = {
    category: (opts && opts.category) || 'Blazer',
    size: (opts && opts.size) || 'M',
    profile: null,
    open: true
  };

  const say = t => { if (statusEl) statusEl.textContent = t; };
  const THREE_PATH = '/assets/vendor/three/0.185.1/three.module.min.js';

  /* Valid saved profile -> the seven numbers plus height, or null. Same
     ranges the profile screen and the server enforce. */
  function readProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_KEY));
      if (!raw || raw.v !== 1 || typeof raw.heightCm !== 'number') return null;
      const out = {};
      for (const id of Object.keys(PROFILE_RANGES)) {
        const cm = raw.values && raw.values[id] && Number(raw.values[id].cm);
        if (!(cm >= PROFILE_RANGES[id][0] && cm <= PROFILE_RANGES[id][1])) return null;
        out[id] = cm;
      }
      return { heightCm: raw.heightCm, v: out };
    } catch (e) { return null; }
  }

  function sizeRunValues(size) {
    const z = D.SIZE_RUN[size];
    return {
      chest: z.chest, waist: z.waist, hip: z.hip, shoulder: z.shoulder,
      sleeve: z.sleeve, back: z.back, inseam: null
    };
  }

  let api = null;   // the three.js scene controller, built below

  function currentValues() {
    return state.profile ? state.profile.v : sizeRunValues(state.size);
  }
  function currentHeight() {
    return state.profile
      ? state.profile.heightCm
      : D.SIZE_RUN[state.size].height;
  }

  function syncLabels() {
    const block = D.BLOCKS[state.category] || D.BLOCKS.Blazer;
    if (easeEl) {
      easeEl.textContent = 'Ease shown over the body: chest +' + block.ease.chest +
        ' cm, waist +' + block.ease.waist + ', seat +' + block.ease.hip +
        '. The same draft the profile screen and the order email quote, provisional until our pattern cutter signs it.';
    }
    if (sourceEl) {
      sourceEl.textContent = state.profile
        ? 'Drawn from the profile saved in this browser: ' + Object.keys(PROFILE_RANGES).length +
          ' numbers and your height, nothing else. Correct a number on your profile screen and reopen the viewer.'
        : 'No profile is saved in this browser, so this is the standard size ' + state.size +
          ' body from the drafted size run, not you. Scan above and it becomes your own shape.';
    }
    if (sizesRow) sizesRow.hidden = !!state.profile;
    if (reloadBtn) reloadBtn.hidden = !!state.profile;
  }

  function rebuild() {
    if (!api) return;
    const block = D.BLOCKS[state.category] || D.BLOCKS.Blazer;
    api.setBody(currentValues(), currentHeight());
    api.setShell(block.ease, block.hemBelowSeat);
    syncLabels();
  }

  const controller = {
    setCategory(cat) {
      if (!D.BLOCKS[cat]) return;
      state.category = cat;
      rebuild();
    },
    setSize(size) {
      if (D.SIZES.indexOf(size) === -1) return;
      state.size = size;
      if (!state.profile) rebuild();
    },
    reload() {
      state.profile = readProfile();
      rebuild();
    },
    close() {
      state.open = false;
      if (api) { api.dispose(); api = null; }
    }
  };

  say('Loading the viewer library, about 730 KB, once.');
  import(/* webpackIgnore: true */ THREE_PATH).then(THREE => {
    if (!state.open) return;
    try {
      api = buildScene(THREE, stage, D, say, section);
    } catch (e) {
      console.warn('fit viewer failed to start', e);
      say('The viewer could not start here. Every number it would show is on your profile screen.');
      return;
    }
    state.profile = readProfile();
    rebuild();
    say(state.profile
      ? 'Your body, as measured. Drag to turn, pinch or scroll to zoom.'
      : 'The size-run body. Drag to turn, pinch or scroll to zoom.');
  }).catch(err => {
    console.warn('three.js failed to load', err);
    say('The viewer library could not load. It needs the network once, then it is cached; try again.');
  });

  return controller;
}

/* ---------------------------------------------------------- the scene */

function buildScene(THREE, stage, D, say, section) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  stage.textContent = '';
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'A generated body with the garment shell around it. Drag to turn.');
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);

  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(90, 260, 160);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(-140, 120, -180);
  const amb = new THREE.HemisphereLight(0xffffff, 0x22201c, 0.75);
  scene.add(key, rim, amb);

  const groundTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.5;
  scene.add(ground);

  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const shellMat = new THREE.MeshStandardMaterial({
    transparent: true, opacity: 0.36, roughness: 0.9, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false
  });
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });

  const bodyGroup = new THREE.Group();
  const shellGroup = new THREE.Group();
  scene.add(bodyGroup, shellGroup);

  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
    }
  }

  /* loft(rings, radial): Catmull-Rom through the control rings, sampled
     to smoothRings, triangulated as an open tube. ~2k tris for a torso. */
  function loftGeometry(rings, radial, smoothRings, capBottom) {
    const pts = [];
    const cr = (p0, p1, p2, p3, t) => {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    };
    for (let i = 0; i < rings.length - 1; i++) {
      const r0 = rings[Math.max(0, i - 1)], r1 = rings[i], r2 = rings[i + 1], r3 = rings[Math.min(rings.length - 1, i + 2)];
      const steps = Math.max(2, Math.round(smoothRings / (rings.length - 1)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        pts.push({ y: cr(r0.y, r1.y, r2.y, r3.y, t), a: cr(r0.a, r1.a, r2.a, r3.a, t), b: cr(r0.b, r1.b, r2.b, r3.b, t) });
      }
    }
    pts.push(rings[rings.length - 1]);

    const n = pts.length;
    const pos = new Float32Array(n * radial * 3);
    let k = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < radial; j++) {
        const th = (j / radial) * Math.PI * 2;
        pos[k++] = pts[i].a * Math.sin(th);
        pos[k++] = pts[i].y;
        pos[k++] = pts[i].b * Math.cos(th);
      }
    }
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const j2 = (j + 1) % radial;
        const a = i * radial + j, b = i * radial + j2, c = (i + 1) * radial + j, d = (i + 1) * radial + j2;
        idx.push(a, c, b, b, c, d);
      }
    }
    if (capBottom) {
      const center = n * radial;
      for (let j = 0; j < radial; j++) idx.push(center, j, (j + 1) % radial);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (capBottom) {
      const withCenter = new Float32Array(pos.length + 3);
      withCenter.set(pos);
      withCenter[pos.length] = 0; withCenter[pos.length + 1] = pts[0].y; withCenter[pos.length + 2] = 0;
      geo.setAttribute('position', new THREE.BufferAttribute(withCenter, 3));
    }
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  /* A tapered tube along a straight axis, rings of given radii. Used
     for arms and legs; the axis angle comes from the spec's endpoints. */
  function tubeGeometry(spec, radial, sleeveEase) {
    const dx = spec.to.x - spec.from.x, dy = spec.to.y - spec.from.y, dz = spec.to.z - spec.from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    // two unit vectors orthogonal to the axis
    let px = -uy, py = ux, pz = 0;
    let pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
    const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;
    const rings = spec.radii.map(w => {
      const r = w.r + (sleeveEase || 0);
      return { y: w.t, r };
    });
    const pos = [], idx = [];
    let vi = 0;
    rings.forEach(w => {
      const cx = spec.from.x + dx * w.y, cy = spec.from.y + dy * w.y, cz = spec.from.z + dz * w.y;
      for (let j = 0; j < radial; j++) {
        const th = (j / radial) * Math.PI * 2;
        const c = Math.cos(th) * w.r, s = Math.sin(th) * w.r;
        pos.push(cx + px * c + qx * s, cy + py * c + qy * s, cz + pz * c + qz * s);
      }
      vi++;
    });
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const j2 = (j + 1) % radial;
        const a = i * radial + j, b = i * radial + j2, c = (i + 1) * radial + j, d = (i + 1) * radial + j2;
        idx.push(a, c, b, b, c, d);
      }
    }
    // cap both ends: shoulder end is hidden inside the torso, wrist and
    // floor ends are closed plainly
    const ringCap = (ringIdx, flip) => {
      const base = ringIdx * radial;
      for (let j = 0; j < radial; j++) {
        const j2 = (j + 1) % radial;
        if (flip) idx.push(base + j, base + j2, pos.length / 3);
        else idx.push(base + j2, base + j, pos.length / 3);
      }
    };
    const capPoint = (ringIdx) => {
      const w = rings[ringIdx];
      pos.push(spec.from.x + dx * w.y, spec.from.y + dy * w.y, spec.from.z + dz * w.y);
    };
    capPoint(0);
    ringCap(0, true);
    capPoint(rings.length - 1);
    ringCap(rings.length - 1, false);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function ringLine(y, a, b) {
    const pts = [];
    for (let j = 0; j <= 48; j++) {
      const th = (j / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(a * Math.sin(th), y, b * Math.cos(th)));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  }

  let H = 174;
  let currentValuesCache = null;

  function setBody(values, heightCm) {
    H = heightCm;
    currentValuesCache = values;
    clearGroup(bodyGroup);
    const body = bodyRings(values, heightCm);
    const L = body.levels;
    bodyGroup.add(new THREE.Mesh(loftGeometry(body.rings, 28, 34, true), bodyMat));
    for (const side of [-1, 1]) {
      bodyGroup.add(new THREE.Mesh(tubeGeometry(armSpec(values, heightCm, side), 10, 0), bodyMat));
      bodyGroup.add(new THREE.Mesh(tubeGeometry(legSpec(values, heightCm, side), 10, 0), bodyMat));
    }
    const headH = Math.max(18, H - L.neckY);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bodyMat);
    head.scale.set(Math.max(7.5, values.shoulder * 0.185), headH / 2, Math.max(9, values.shoulder * 0.21));
    head.position.set(0, L.neckY + headH / 2, 0);
    bodyGroup.add(head);
    // the three measured lines, drawn where they were taken
    const chestRing = body.rings[4];
    bodyGroup.add(ringLine(chestRing.y, chestRing.a + 0.2, chestRing.b + 0.2));
    bodyGroup.add(ringLine(L.waistY, body.rings[2].a + 0.2, body.rings[2].b + 0.2));
    bodyGroup.add(ringLine(L.hipY, body.rings[1].a + 0.2, body.rings[1].b + 0.2));
  }

  function setShell(ease, hemBelowSeat) {
    clearGroup(shellGroup);
    const body = bodyRings(currentValuesCache, H);
    const rings = garmentRings(body, ease, hemBelowSeat);
    shellGroup.add(new THREE.Mesh(loftGeometry(rings, 28, 30, false), shellMat));
    for (const side of [-1, 1]) {
      shellGroup.add(new THREE.Mesh(tubeGeometry(armSpec(currentValuesCache, H, side), 10, 0.7), shellMat));
    }
  }

  const api = {
    setBody(values, heightCm) {
      setBody(values, heightCm);
      applyCameraPreset(currentPreset, true);
    },
    setShell(ease, hem) {
      setShell(ease, hem);
    },
    dispose() {
      stop();
      clearGroup(bodyGroup); clearGroup(shellGroup);
      groundTex.dispose();
      modeObserver.disconnect();
      resizeObserver.disconnect();
      stage.textContent = '';
    }
  };

  /* day / night: colour and finish only, geometry untouched, driven by
     the site's [data-mode] attribute. */
  const PALETTES = {
    day: {
      body: 0xc9c5bd, shell: 0x8e8b84, shellOpacity: 0.34, shellRough: 0.9,
      line: 0xd6402a, hem: 0x6f6c66
    },
    night: {
      body: 0x514e48, shell: 0x0c0c0e, shellOpacity: 0.5, shellRough: 0.32,
      line: 0xff5a36, hem: 0x2a2926
    }
  };
  function applyMode(mode) {
    const p = PALETTES[mode === 'day' ? 'day' : 'night'];
    bodyMat.color.setHex(p.body);
    shellMat.color.setHex(p.shell);
    shellMat.opacity = p.shellOpacity;
    shellMat.roughness = p.shellRough;
    lineMat.color.setHex(p.line);
  }
  const modeObserver = new MutationObserver(() => {
    applyMode(document.documentElement.getAttribute('data-mode'));
  });
  modeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  applyMode(document.documentElement.getAttribute('data-mode'));

  /* the turntable: drag to turn, pinch or scroll to zoom, auto-rotate
     when idle for a few seconds. A few dozen lines instead of an addon. */
  const orbit = { az: 0.35, pol: 1.38, dist: 350, target: new THREE.Vector3(0, 95, 0) };
  let idleAt = performance.now();

  function applyCamera() {
    const sp = Math.sin(orbit.pol), cp = Math.cos(orbit.pol);
    camera.position.set(
      orbit.target.x + orbit.dist * sp * Math.sin(orbit.az),
      orbit.target.y + orbit.dist * cp,
      orbit.target.z + orbit.dist * sp * Math.cos(orbit.az)
    );
    camera.lookAt(orbit.target);
  }

  const pointers = new Map();
  let pinchDist = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.setPointerCapture(e.pointerId);
    idleAt = performance.now();
  });
  el.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    idleAt = performance.now();
    if (pointers.size === 1) {
      orbit.az -= dx * 0.006;
      orbit.pol = Math.min(1.75, Math.max(1.02, orbit.pol - dy * 0.005));
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist > 0) {
        orbit.dist = Math.min(H * 3, Math.max(H * 0.32, orbit.dist * (pinchDist / d)));
      }
      pinchDist = d;
    }
  });
  const lift = e => { pointers.delete(e.pointerId); pinchDist = 0; };
  el.addEventListener('pointerup', lift);
  el.addEventListener('pointercancel', lift);
  el.addEventListener('wheel', e => {
    e.preventDefault();
    idleAt = performance.now();
    orbit.dist = Math.min(H * 3, Math.max(H * 0.32, orbit.dist * (1 + Math.sign(e.deltaY) * 0.08)));
  }, { passive: false });

  /* camera presets: full figure, torso, detail on the chest and seat. */
  const PRESETS = {
    full: () => ({ ty: H * 0.52, dist: H * 2.05 }),
    torso: () => ({ ty: (H * 0.84 + H * 0.45) / 2, dist: H * 0.95 }),
    detail: () => ({ ty: H * 0.74, dist: H * 0.55 })
  };
  let currentPreset = 'full';
  let presetTo = null;
  function applyCameraPreset(name, jump) {
    // Each preset is a function of H, the current body height, so it has to be
    // called. Reading .ty off the function itself yields undefined, which sets
    // orbit.dist to undefined, puts the camera at NaN and renders an empty
    // frame without throwing anything.
    const p = (PRESETS[name] || PRESETS.full)();
    const to = { ty: p.ty, dist: p.dist };
    if (jump) {
      orbit.target.y = to.ty; orbit.dist = to.dist;
      presetTo = null;
      return;
    }
    presetTo = to;
  }
  applyCameraPreset('full', true);

  const resizeObserver = new ResizeObserver(() => {
    const w = stage.clientWidth || 320, h = stage.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(stage);

  let running = true;
  let rafId = 0;
  const t0 = performance.now();
  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (presetTo) {
      orbit.target.y += (presetTo.ty - orbit.target.y) * 0.12;
      orbit.dist += (presetTo.dist - orbit.dist) * 0.12;
      if (Math.abs(presetTo.ty - orbit.target.y) < 0.4 && Math.abs(presetTo.dist - orbit.dist) < 0.6) presetTo = null;
    }
    if (now - idleAt > 4000) orbit.az += 0.0028;
    // quietly alive: a breath, a couple of millimetres at the chest
    const t = (now - t0) / 1000;
    const breath = 1 + 0.004 * Math.sin(t * 2 * Math.PI / 5.2);
    bodyGroup.scale.set(breath, 1, breath);
    shellGroup.scale.set(breath + 0.001, 1, breath + 0.001);
    applyCamera();
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(frame);

  function stop() { running = false; cancelAnimationFrame(rafId); }

  section.querySelectorAll('[data-vw-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPreset = btn.dataset.vwPreset;
      applyCameraPreset(currentPreset, false);
      section.querySelectorAll('[data-vw-preset]').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  return api;
}
