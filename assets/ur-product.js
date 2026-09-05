/* Product page: fit, size and add-to-bag.
   Two fits share one pattern and one size run: standard, and made to measure at
   a premium. Both prices come from UR_DATA.priceOf so this page can never quote
   a number the bag or the feed disagrees with. */
(function () {
  'use strict';
  var root = document.querySelector('main.product');
  if (!root || !window.URBag) return;

  var D = window.UR_DATA;
  var id = root.dataset.productId;
  var product = D.PRODUCTS.filter(function (p) { return p.id === id; })[0];
  if (!product) return;

  var fits = Array.prototype.slice.call(root.querySelectorAll('[data-fit]'));
  var sizes = Array.prototype.slice.call(root.querySelectorAll('[data-size]'));
  var fitLabel = document.getElementById('fit-label');
  var fitNote = document.getElementById('fit-note');
  var sizeLabel = document.getElementById('size-label');
  var sizeHint = document.getElementById('size-hint');
  var addBtn = document.getElementById('add-to-bag');
  var addLabel = document.getElementById('add-label');
  var chosenFit = 'standard';
  var chosenSize = null;

  function price() { return D.priceOf(product, chosenFit); }

  function paint() {
    var fit = D.fitOf(chosenFit);
    fits.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.fit === chosenFit)); });
    if (fitLabel) fitLabel.textContent = fit.name;
    if (fitNote) fitNote.textContent = fit.note;
    if (sizeHint) sizeHint.hidden = chosenFit !== 'tailored';
    if (sizeLabel) sizeLabel.textContent = chosenSize || 'select';
    if (!addBtn) return;
    addBtn.disabled = !chosenSize;
    if (addLabel) {
      addLabel.textContent = chosenSize
        ? 'Add to bag · ' + D.format(price())
        : 'Select a size';
    }
  }

  fits.forEach(function (b) {
    b.addEventListener('click', function () { chosenFit = D.fitOf(b.dataset.fit).id; paint(); });
  });
  sizes.forEach(function (b) {
    b.addEventListener('click', function () {
      chosenSize = b.dataset.size;
      sizes.forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.size === chosenSize)); });
      paint();
    });
  });

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (!chosenSize) return;
      window.URBag.add(id, chosenSize, chosenFit);
    });
  }

  paint();
})();
