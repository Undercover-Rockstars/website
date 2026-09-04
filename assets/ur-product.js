/* Product page: size selection and add-to-bag. */
(function () {
  'use strict';
  var root = document.querySelector('main.product');
  if (!root || !window.URBag) return;

  var id = root.dataset.productId;
  var price = Number(root.dataset.price);
  var sizes = Array.prototype.slice.call(root.querySelectorAll('[data-size]'));
  var label = document.getElementById('size-label');
  var addBtn = document.getElementById('add-to-bag');
  var addLabel = document.getElementById('add-label');
  var chosen = null;

  function fmt(n) { return '€' + n.toLocaleString('en-IE'); }

  function choose(size) {
    chosen = size;
    sizes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.size === size)); });
    if (label) label.textContent = size;
    if (addBtn) addBtn.disabled = false;
    if (addLabel) addLabel.textContent = 'Add to bag — ' + fmt(price);
  }

  sizes.forEach(function (b) {
    b.addEventListener('click', function () { choose(b.dataset.size); });
  });

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (!chosen) return;
      window.URBag.add(id, chosen);
    });
  }
})();
