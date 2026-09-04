/* Collection filters. Every tile is already in the HTML, so this only shows and
   hides them: the full collection stays indexable with JavaScript off. */
(function () {
  'use strict';
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));
  var count = document.getElementById('filter-count');
  if (!filters.length || !tiles.length) return;

  function apply(cat) {
    var shown = 0;
    tiles.forEach(function (t) {
      var match = cat === 'All' || t.dataset.cat === cat;
      t.hidden = !match;
      if (match) shown++;
    });
    filters.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === cat));
    });
    if (count) count.textContent = String(shown).padStart(2, '0');
    try { history.replaceState(null, '', cat === 'All' ? location.pathname : '?cat=' + encodeURIComponent(cat)); } catch (e) {}
  }

  filters.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.filter); });
  });

  var initial = new URLSearchParams(location.search).get('cat');
  if (initial && filters.some(function (b) { return b.dataset.filter === initial; })) apply(initial);
})();
