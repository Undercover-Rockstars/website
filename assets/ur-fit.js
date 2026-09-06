/* UR Fit, the /fit/ app shell. Phase 0 (#3, #12): the honest empty state.
 *
 * This file preselects the pair from the URL (the #2 handoff contract:
 * ?pair=<id>&fit=tailored&from=product) and registers the service worker
 * scoped to /fit/. That is everything it does. There is no camera call, no
 * canvas, no upload and no progress animation anywhere in this app, because
 * the measurement engine (#5) does not exist yet, and a shell that pretended
 * to measure would be the fake-render mistake again. The begin button on the
 * page is disabled, on purpose, and says why. */

(function () {
  'use strict';

  var D = window.UR_DATA;
  var root = document.getElementById('fit-app');
  if (!root || !D) return;

  /* ------------------------------------------------------------ the pair */

  var qs = new URLSearchParams(window.location.search);
  var wanted = qs.get('pair');
  // An unknown or missing pair falls back to the first one, same as the old
  // fitting room did. The ids come from ur-data.js and nowhere else.
  var pairId = D.PRODUCTS.some(function (p) { return p.id === wanted; })
    ? wanted : D.PRODUCTS[0].id;
  var measurementMode = qs.get('fit') === 'tailored';
  var fromProduct = qs.get('from') === 'product';

  var pairBtns = Array.prototype.slice.call(root.querySelectorAll('[data-fit-product]'));
  var pairName = document.getElementById('fit-pair-name');
  var pairPrice = document.getElementById('fit-pair-price');
  var modeChip = document.getElementById('fit-mode-chip');
  var fromBlock = document.getElementById('fit-from');
  var fromLinks = document.getElementById('fit-from-links');

  function pair() {
    return D.PRODUCTS.filter(function (p) { return p.id === pairId; })[0];
  }

  function syncPair() {
    var p = pair();
    pairBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.fitProduct === pairId));
    });
    if (pairName) pairName.textContent = p.name;
    if (pairPrice) {
      pairPrice.textContent = D.format(D.priceOf(p, 'tailored')) +
        ' made to measure · ' + D.format(p.price) + ' standard';
    }
    if (fromLinks) fromLinks.href = '/product/' + p.id + '/';
  }

  pairBtns.forEach(function (b) {
    b.addEventListener('click', function () { pairId = b.dataset.fitProduct; syncPair(); });
  });

  if (modeChip) modeChip.hidden = !measurementMode;

  /* The QR page on the desktop says "finish on your phone". This is that
     finish, in its phase 0 form: the bag works on any device, so reserving
     here and now is real, and the measurements join the reservation when
     they exist. The bag on the device the buyer started on is untouched. */
  if (fromBlock) fromBlock.hidden = !fromProduct;

  /* ---------------------------------------------------- service worker */

  // The worker file lives at /fit/sw.js, so its scope is /fit/ and only this
  // app is controlled. The shop pages stay out of it on purpose: they are
  // cache-busted every deploy and a worker that wedged them would cost more
  // than offline fit pages are worth (#3).
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('/fit/sw.js');
    } catch (e) { /* the page works without it; the next visit can retry */ }
  }

  syncPair();
})();
