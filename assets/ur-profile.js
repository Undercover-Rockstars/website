/* UR Profile, the screen between "you have been measured" and "reserve it"
 * (#6). Every measurement with its confidence on a simple body diagram,
 * every value correctable with a one-line tape hint, because a tape is
 * still the truth and some people own one. The numbers save to
 * localStorage under ur.profile.v1 (numbers only, never photos) and delete
 * in one tap. A made-to-measure reservation from this browser carries them
 * along (#6 attach), a standard one does not.
 *
 * The tape-check block is #5's spike, run by real people on real phones:
 * enter what a tape says, see the difference per value, read the summary
 * out loud to whoever is collecting the data. Tape values live in memory
 * for the session and are never stored, saved or sent anywhere.
 */
(function () {
  'use strict';

  var KEY = 'ur.profile.v1';
  var LOW_AT = (window.URMeasure && window.URMeasure.LOW_AT) || 0.6;

  /* Copy that states the deal per measurement: label, the one-line tape
     hint, and the sane human range the field and the server both enforce. */
  var FIELDS = [
    { id: 'chest', label: 'Chest', tape: 'Tape around the fullest part of the chest, under the arms, level all round, relaxed.', min: 60, max: 200 },
    { id: 'waist', label: 'Waist', tape: 'Tape around the natural waist, the narrowest part, not sucked in.', min: 50, max: 200 },
    { id: 'hip', label: 'Seat', tape: 'Tape around the widest part of the seat, feet together.', min: 60, max: 210 },
    { id: 'shoulder', label: 'Shoulder', tape: 'Across the back, from the point of one shoulder bone to the other.', min: 30, max: 70 },
    { id: 'sleeve', label: 'Sleeve', tape: 'Shoulder point, over a slightly bent elbow, to the wrist bone.', min: 30, max: 90 },
    { id: 'back', label: 'Back length', tape: 'From the bone at the base of the neck down to the natural waist.', min: 30, max: 90 },
    { id: 'inseam', label: 'Inseam', tape: 'From the top of the inner thigh, down the inside of the leg, to the floor without shoes.', min: 30, max: 100 }
  ];

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

  function readSaved() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return v && v.v === 1 && v.values ? v : null;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------ persistence */

  function save(profile) {
    var clean = sanitise(profile);
    if (!clean) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(clean));
      return true;
    } catch (e) { return false; }
  }

  function clearSaved() {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
  }

  /* Numbers only, unknown keys dropped, every value in its sane human
     range. The server re-validates the same way before anything reaches a
     tailor's inbox; this side keeps the browser honest. */
  function sanitise(profile) {
    if (!profile || typeof profile.heightCm !== 'number') return null;
    var out = {
      v: 1,
      engine: String(profile.engine || '').slice(0, 80),
      created: String(profile.created || new Date().toISOString()).slice(0, 40),
      heightCm: Math.round(profile.heightCm * 10) / 10,
      values: {}
    };
    if (!(out.heightCm >= 100 && out.heightCm <= 250)) return null;
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      var v = profile.values && profile.values[f.id];
      if (!v || typeof v.cm !== 'number') return null;
      var cm = Math.round(v.cm * 10) / 10;
      if (!(cm >= f.min && cm <= f.max)) return null;
      out.values[f.id] = {
        cm: cm,
        confidence: typeof v.confidence === 'number' ? Math.round(v.confidence * 100) / 100 : null,
        low: !!v.low,
        edited: !!v.edited
      };
    }
    return out;
  }

  /* What the bag attaches to a tailored reservation (#6). Null when
     nothing sane is saved; the server drops anything it does not like. */
  function attachPayload() {
    var p = readSaved();
    return p ? sanitise(p) : null;
  }

  /* ------------------------------------------------------- the screen */

  function present(profile, opts) {
    opts = opts || {};
    var root = document.getElementById('fit-profile');
    if (!root) return;
    root.textContent = '';
    root.hidden = false;

    var values = {};
    FIELDS.forEach(function (f) {
      var v = profile.values && profile.values[f.id];
      values[f.id] = {
        cm: v ? v.cm : null,
        confidence: v && typeof v.confidence === 'number' ? v.confidence : null,
        low: v ? !!v.low : true,
        edited: false
      };
    });
    var tape = {};   // session memory only, never persisted
    var dirty = false;
    var savedNow = false;

    root.appendChild(el('span', { class: 'eyebrow acc', text: 'Your profile' }));
    root.appendChild(el('h3', {
      style: 'margin:0;font-weight:700;text-transform:uppercase;font-size:18px;letter-spacing:.01em',
      text: 'An estimate, not a tape'
    }));
    root.appendChild(el('p', {
      class: 'fit-note',
      style: 'margin-top:10px',
      text: 'Read on this phone by ' + (profile.engine || 'the pose engine') + ', from two photos that were discarded on the spot. Circumferences treat your cross-section as an ellipse, which a real body is not, so treat every number as a starting point: good enough to pick a block, never a cut. Values the engine was unsure about say check this one.'
    }));

    var diagram = el('div', { class: 'pf-diagram' });
    root.appendChild(diagram);

    var rows = el('div', { class: 'pf-rows', role: 'group', 'aria-label': 'Your measurements' });
    var inputs = {};
    FIELDS.forEach(function (f) {
      var v = values[f.id];
      var conf = v.confidence == null ? null : v.confidence;
      var word = conf == null ? 'no data' : conf >= 0.8 ? 'high confidence' : conf >= LOW_AT ? 'ok confidence' : 'low confidence';
      var chip = el('span', {
        class: 'pf-conf' + (conf != null && conf < LOW_AT ? ' is-low' : conf != null && conf >= 0.8 ? ' is-hi' : ''),
        text: word + (v.edited ? ' · you corrected this' : '')
      });
      var name = el('span', { class: 'pf-name' });
      var nameText = f.label;
      if (v.low && !v.edited) {
        nameText = el('span', null, [
          document.createTextNode(f.label),
          el('span', { class: 'low-flag', text: 'Check this one' })
        ]);
      } else {
        nameText = el('span', null, [document.createTextNode(f.label)]);
      }
      name.appendChild(nameText);
      var input = el('input', {
        type: 'number', inputmode: 'decimal', step: '0.5',
        min: f.min, max: f.max, 'aria-label': f.label + ' in centimetres',
        value: v.cm == null ? '' : String(Math.round(v.cm * 10) / 10)
      });
      inputs[f.id] = input;
      var hint = el('p', { class: 'pf-hint', text: 'How to check with a tape: ' + f.tape });
      var row = el('div', { class: 'pf-row' + (v.low && !v.edited ? ' is-low' : ''), 'data-field': f.id }, [
        name,
        el('span', { class: 'pf-val' }, [input, el('span', { class: 'unit', text: 'cm' })]),
        chip,
        hint
      ]);
      input.addEventListener('change', function () {
        var n = parseFloat(input.value);
        if (isNaN(n)) { input.value = v.cm == null ? '' : String(v.cm); return; }
        if (n < f.min || n > f.max) {
          hint.textContent = 'A ' + f.label.toLowerCase() + ' of ' + n + ' cm is outside anything a body produces. Check the tape hint below.';
          input.value = String(v.cm == null ? '' : v.cm);
          return;
        }
        hint.textContent = 'How to check with a tape: ' + f.tape;
        v.cm = Math.round(n * 10) / 10;
        v.edited = true;
        dirty = true;
        row.classList.remove('is-low');
        chip.textContent = 'you set this';
        drawDiagram();
        drawTapeDiffs();
      });
      rows.appendChild(row);
    });
    root.appendChild(rows);

    /* The tape-check block: #5's spike, on real people. */
    var tapeBlock = el('div', { class: 'pf-block' });
    tapeBlock.appendChild(el('span', { class: 'eyebrow', text: 'Check against a tape' }));
    tapeBlock.appendChild(el('p', {
      class: 'fit-note',
      text: 'If you have a tape, measure the same things and enter what it says. The app shows the difference per value, and a summary meant to be read out loud. The tape numbers stay in this screen for this session only: nothing is stored, saved or sent, and they leave nothing behind when you close the page.'
    }));
    var tapeRows = el('div', { class: 'pf-tape-rows' });
    var tapeInputs = {};
    var diffs = {};
    FIELDS.forEach(function (f) {
      var input = el('input', {
        type: 'number', inputmode: 'decimal', placeholder: 'tape',
        'aria-label': 'What the tape says for ' + f.label + ', in centimetres',
        min: f.min, max: f.max
      });
      tapeInputs[f.id] = input;
      var diff = el('span', { class: 'diff', text: '' });
      diffs[f.id] = diff;
      input.addEventListener('input', function () {
        tape[f.id] = parseFloat(input.value);
        if (isNaN(tape[f.id])) delete tape[f.id];
        drawTapeDiffs();
      });
      tapeRows.appendChild(el('div', { class: 'pf-tape-row' }, [
        el('span', { text: f.label }),
        input,
        diff
      ]));
    });
    var readout = el('p', { class: 'pf-readout', id: 'pf-readout', text: 'Enter tape values and the comparison reads out here, line by line.' });
    tapeBlock.appendChild(tapeRows);
    tapeBlock.appendChild(readout);
    root.appendChild(tapeBlock);

    /* Actions. */
    var actions = el('div', { class: 'pf-actions' });
    var state = el('p', { class: 'pf-saved' });
    var btnScan = el('button', { type: 'button', class: 'btn btn--ghost' }, [
      el('span', { text: 'Scan again' }), el('span', { 'aria-hidden': 'true', text: '↺' })
    ]);
    btnScan.addEventListener('click', function () {
      if (typeof opts.onRetake === 'function') opts.onRetake();
    });
    actions.appendChild(btnScan);
    root.appendChild(actions);
    root.appendChild(state);

    function syncState() {
      var saved = readSaved();
      var bits = [];
      if (saved) {
        bits.push('Saved in this browser (' + new Date(saved.created).toLocaleDateString() + '): numbers only, no photos. A made-to-measure reservation from this browser carries them, a standard one does not.');
      } else {
        bits.push('Nothing is saved yet. Saving keeps numbers in this browser only, never photos, never a server.');
      }
      if (savedNow) bits.unshift('Saved.');
      state.textContent = bits.join(' ');
    }
    syncState();

    var saveBtn = el('button', { type: 'button', class: 'btn' }, [
      el('span', { text: 'Save these numbers' }), el('span', { 'aria-hidden': 'true', text: '→' })
    ]);
    saveBtn.addEventListener('click', function () {
      var snap = {
        engine: profile.engine,
        created: new Date().toISOString(),
        heightCm: profile.heightCm,
        values: values
      };
      if (!save(snap)) {
        state.textContent = 'Could not save: a value is outside its sane range, so nothing was written. Fix the flagged field and save again.';
        return;
      }
      dirty = false;
      savedNow = true;
      syncState();
    });
    actions.insertBefore(saveBtn, btnScan);

    var delBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, [
      el('span', { text: 'Delete my measurements' }), el('span', { 'aria-hidden': 'true', text: '×' })
    ]);
    delBtn.addEventListener('click', function () {
      clearSaved();
      savedNow = false;
      dirty = false;
      syncState();
      state.textContent = 'Deleted. Nothing from the scan remains in this browser: the profile, the height and any trace of it are gone. The email is the only place numbers ever went, if you reserved with them attached.';
    });
    actions.insertBefore(delBtn, btnScan);

    /* ------------------------------------------------------ diagram */

    function drawDiagram() {
      var bodyPath = 'M60 8 a10 10 0 1 1 -0.1 0 ' +
        'M40 58 C34 66 33 92 36 112 L34 138 C40 148 52 152 60 152 C68 152 80 148 86 138 L84 112 C87 92 86 66 80 58 Z' +
        'M44 154 L42 250 M76 154 L78 250 M40 58 C34 48 30 44 24 42 M80 58 C86 48 90 44 96 42';
      var lines = [
        { id: 'chest', y: 84, label: 'Chest' },
        { id: 'waist', y: 112, label: 'Waist' },
        { id: 'hip', y: 140, label: 'Seat' }
      ];
      var svg = ['<svg viewBox="0 0 120 260" role="img" aria-label="A body diagram with the chest, waist and seat lines marked">'];
      svg.push('<path class="body" d="' + bodyPath + '"/>');
      lines.forEach(function (l) {
        var v = values[l.id];
        var cm = v && v.cm != null ? Math.round(v.cm) + ' cm' : '·';
        svg.push('<line class="guide" x1="8" y1="' + l.y + '" x2="86" y2="' + l.y + '"/>');
        svg.push('<text x="10" y="' + (l.y - 3) + '">' + l.label + ' ' + cm + '</text>');
      });
      svg.push('</svg>');
      diagram.innerHTML = svg.join('');
    }

    function drawTapeDiffs() {
      var any = false;
      var spoken = [];
      FIELDS.forEach(function (f) {
        var d = diffs[f.id];
        if (!(f.id in tape) || isNaN(tape[f.id])) { d.textContent = ''; return; }
        any = true;
        var scan = Math.round(values[f.id].cm);
        var t = Math.round(tape[f.id]);
        var delta = scan - t;
        var word = delta === 0 ? 'the same' : (delta > 0 ? delta + ' over' : (-delta) + ' under');
        d.textContent = 'scan ' + word;
        d.className = 'diff' + (delta > 1 ? ' over' : delta < -1 ? ' under' : '');
        spoken.push(f.label + ': scan ' + scan + ', tape ' + t + ', scan ' + word + '.');
      });
      readout.textContent = any ? spoken.join('\n') : 'Enter tape values and the comparison reads out here, line by line.';
    }

    drawDiagram();
  }

  /* Dropping the screen drops the tape values with it: they were never
     written anywhere, and now they are not held anywhere either. */
  function hide() {
    var root = document.getElementById('fit-profile');
    if (root) { root.hidden = true; root.textContent = ''; }
  }

  window.URProfile = {
    present: present,
    hide: hide,
    saved: readSaved,
    save: save,
    clear: clearSaved,
    attachPayload: attachPayload,
    FIELDS: FIELDS
  };
})();
