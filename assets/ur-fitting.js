/* Fitting room.
   The photo is read with FileReader and never leaves the browser: there is no
   upload here. If a provider is wired up in tryon.js it would be sent onward,
   and the copy on the page has to say so at that point. */

(function () {
  'use strict';

  var D = window.UR_DATA;
  var root = document.getElementById('fitting');
  if (!root || !D) return;

  var state = { photo: null, productId: root.dataset.initialProduct || D.PRODUCTS[0].id, mode: 'day', busy: false };

  var fileInput   = document.getElementById('fit-file');
  var dropLabel   = document.getElementById('fit-drop-label');
  var dropImg     = document.getElementById('fit-drop-img');
  var inImg       = document.getElementById('fit-in-img');
  var inLabel     = document.getElementById('fit-in-label');
  var outPane     = document.getElementById('fit-out');
  var outIdle     = document.getElementById('fit-idle');
  var outBusy     = document.getElementById('fit-busy');
  var outStep     = document.getElementById('fit-step');
  var outResult   = document.getElementById('fit-result');
  var outNotice   = document.getElementById('fit-notice');
  var runBtn      = document.getElementById('fit-run');
  var runLabel    = document.getElementById('fit-run-label');
  var hint        = document.getElementById('fit-hint');
  var modeTag     = document.getElementById('fit-mode-tag');
  var pairBtns    = Array.prototype.slice.call(root.querySelectorAll('[data-fit-product]'));
  var modeBtns    = Array.prototype.slice.call(root.querySelectorAll('[data-fit-mode]'));

  function show(el, on) { if (el) el.hidden = !on; }

  function sync() {
    pairBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.fitProduct === state.productId));
    });
    modeBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.fitMode === state.mode));
    });
    if (modeTag) modeTag.textContent = state.mode;
    if (outPane) {
      outPane.style.background = state.mode === 'night' ? 'var(--fg)' : 'var(--panel)';
      outPane.style.color = state.mode === 'night' ? 'var(--bg)' : 'var(--fg)';
    }
    if (runBtn) runBtn.disabled = !state.photo || state.busy;
    if (runLabel) {
      runLabel.textContent = state.busy ? 'Rendering…'
        : state.photo ? 'Render ' + state.mode + ' version'
        : 'Add a photo first';
    }
    if (hint) hint.textContent = state.photo ? 'Ready — press render' : 'Waiting for a photo';
  }

  function clearResult() {
    show(outResult, false);
    show(outNotice, false);
    if (outResult) outResult.removeAttribute('src');
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) return;
      var r = new FileReader();
      r.onload = function () {
        state.photo = r.result;
        if (dropImg) { dropImg.src = r.result; dropImg.hidden = false; }
        if (inImg) { inImg.src = r.result; inImg.hidden = false; }
        if (dropLabel) dropLabel.textContent = 'Replace photo';
        if (inLabel) inLabel.hidden = true;
        clearResult();
        show(outIdle, true);
        sync();
      };
      r.readAsDataURL(f);
    });
  }

  pairBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.productId = b.dataset.fitProduct;
      clearResult(); show(outIdle, true); sync();
    });
  });
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.mode = b.dataset.fitMode;
      clearResult(); show(outIdle, true); sync();
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', async function () {
      if (!state.photo || state.busy) return;
      state.busy = true; sync();
      clearResult();
      show(outIdle, false);
      show(outBusy, true);

      try {
        var mod = await import('./tryon.js');
        var out = await mod.renderTryOn({
          photo: state.photo,
          productId: state.productId,
          mode: state.mode,
          onProgress: function (step) { if (outStep) outStep.textContent = step; }
        });
        show(outBusy, false);
        if (out && out.image) {
          outResult.src = out.image;
          show(outResult, true);
        } else {
          // No provider: say so plainly rather than showing the input photo back.
          show(outNotice, true);
        }
      } catch (e) {
        show(outBusy, false);
        show(outNotice, true);
      }
      state.busy = false;
      sync();
    });
  }

  sync();
})();
