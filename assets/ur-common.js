/* Undercover Rockstars — shared behaviour on every page.
   The design source was a single-page app holding everything in component
   state. This is a real multi-page site, so the two pieces of state that must
   survive navigation (the bag and the day/night mode) live in localStorage. */

(function () {
  'use strict';

  var D = window.UR_DATA;
  var LS_CART = 'ur.cart';
  var LS_MODE = 'ur.mode';

  var MODE_META = {
    day:   { label: 'Day',   time: '09:00', place: 'Boardroom' },
    night: { label: 'Night', time: '03:00', place: 'Backstage' }
  };

  /* --------------------------------------------------------- storage */

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  /* ------------------------------------------------------------ mode */

  function currentMode() {
    return document.documentElement.getAttribute('data-mode') === 'day' ? 'day' : 'night';
  }
  function applyMode(mode) {
    document.documentElement.setAttribute('data-mode', mode);
    write(LS_MODE, mode);
    var meta = MODE_META[mode];
    document.querySelectorAll('[data-mode-label]').forEach(function (el) { el.textContent = meta.label; });
    document.querySelectorAll('[data-mode-time]').forEach(function (el) { el.textContent = meta.time; });
    document.querySelectorAll('[data-mode-place]').forEach(function (el) { el.textContent = meta.place; });
    document.querySelectorAll('[data-mode-lower]').forEach(function (el) { el.textContent = meta.label.toLowerCase(); });
  }
  applyMode(currentMode());

  document.querySelectorAll('[data-mode-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyMode(currentMode() === 'day' ? 'night' : 'day');
    });
  });

  /* -------------------------------------------------- wordmark collapse */

  var scrolled = null;
  function onScroll() {
    var next = (window.scrollY || document.documentElement.scrollTop || 0) > 80;
    if (next === scrolled) return;
    scrolled = next;
    document.documentElement.classList.toggle('is-scrolled', next);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------- bag */

  var cart = read(LS_CART, []);
  if (!Array.isArray(cart)) cart = [];
  // drop anything that no longer matches a real product
  cart = cart.filter(function (l) {
    return l && typeof l.id === 'string' && D && D.PRODUCTS.some(function (p) { return p.id === l.id; })
      && D.SIZES.indexOf(l.size) !== -1 && l.qty > 0;
  });

  function productOf(id) {
    return D.PRODUCTS.filter(function (p) { return p.id === id; })[0];
  }
  function count() { return cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function total() {
    return cart.reduce(function (a, l) { return a + productOf(l.id).price * l.qty; }, 0);
  }
  function persist() { write(LS_CART, cart); render(); }

  function add(id, size) {
    var existing = cart.filter(function (l) { return l.id === id && l.size === size; })[0];
    if (existing) existing.qty++;
    else cart.push({ id: id, size: size, qty: 1 });
    persist();
    toast('Added to bag');
  }
  function setQty(index, delta) {
    var line = cart[index];
    if (!line) return;
    line.qty += delta;
    cart = cart.filter(function (l) { return l.qty > 0; });
    persist();
  }
  function removeAt(index) {
    cart.splice(index, 1);
    persist();
  }

  /* ---------------------------------------------------------- rendering */

  var elCheckout = document.getElementById('bag-checkout');
  // the drawer exists on every page; the bag page adds a second, larger copy
  var bodies = ['bag-body', 'bag-page-body'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var totals = ['bag-total', 'bag-page-total'].map(function (id) { return document.getElementById(id); }).filter(Boolean);

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

  function render() {
    var n = count();
    document.querySelectorAll('[data-bag-count]').forEach(function (b) {
      b.textContent = String(n).padStart(2, '0');
    });
    document.querySelectorAll('[data-bag-count-label]').forEach(function (b) {
      b.textContent = n === 1 ? '1 item in your bag' : n + ' items in your bag';
    });
    totals.forEach(function (t) { t.textContent = D.format(total()); });
    if (elCheckout) elCheckout.classList.toggle('is-empty', !cart.length);
    document.querySelectorAll('[data-bag-has]').forEach(function (e) { e.hidden = !cart.length; });
    document.querySelectorAll('[data-bag-none]').forEach(function (e) { e.hidden = !!cart.length; });
    if (!bodies.length) return;

    bodies.forEach(function (elBody) {
    elBody.textContent = '';
    if (!cart.length) {
      elBody.appendChild(el('p', { class: 'bag-empty' , text: 'Nothing yet. The night is young.' }));
    } else {
      cart.forEach(function (l, i) {
        var p = productOf(l.id);
        var minus = el('button', { type: 'button', 'aria-label': 'Decrease quantity of ' + p.name, text: '−' });
        var plus  = el('button', { type: 'button', 'aria-label': 'Increase quantity of ' + p.name, text: '+' });
        var rm    = el('button', { type: 'button', class: 'rm', text: 'Remove' });
        minus.addEventListener('click', function () { setQty(i, -1); });
        plus.addEventListener('click', function () { setQty(i, 1); });
        rm.addEventListener('click', function () { removeAt(i); });

        elBody.appendChild(el('div', { class: 'bag-line' }, [
          el('div', { class: 'thumb', 'aria-hidden': 'true' }),
          el('div', { class: 'body' }, [
            el('div', { class: 'title' }, [
              el('span', { text: p.name }),
              el('span', { class: 'amt', text: D.format(p.price * l.qty) })
            ]),
            el('p', { class: 'size', text: 'Size ' + l.size }),
            el('div', { class: 'qty' }, [minus, el('span', { class: 'n', text: String(l.qty) }), plus, rm])
          ])
        ]));
      });
    }
    });
  }

  /* ---------------------------------------------------------- drawer */

  var drawer = document.getElementById('bag');
  var scrim = document.getElementById('bag-scrim');
  var lastFocus = null;

  function openBag() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = drawer.querySelector('button');
    if (first) first.focus();
    document.addEventListener('keydown', onKey);
  }
  function closeBag() {
    if (!drawer) return;
    drawer.hidden = true;
    if (scrim) scrim.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) { if (e.key === 'Escape') closeBag(); }

  document.querySelectorAll('[data-bag-open]').forEach(function (b) {
    b.addEventListener('click', openBag);
  });
  document.querySelectorAll('[data-bag-close]').forEach(function (b) {
    b.addEventListener('click', closeBag);
  });
  if (scrim) scrim.addEventListener('click', closeBag);

  /* ----------------------------------------------------------- toast */

  var toastTimer;
  function toast(text) {
    var existing = document.getElementById('ur-toast');
    if (existing) existing.remove();
    var view = el('button', { type: 'button', text: 'View bag' });
    view.addEventListener('click', function () { openBag(); node.remove(); });
    var node = el('div', { id: 'ur-toast', class: 'toast', role: 'status' }, [
      document.createTextNode(text + ' '), view
    ]);
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.remove(); }, 4000);
  }

  render();

  window.URBag = { add: add, count: count, open: openBag, lines: function () { return cart.slice(); } };
})();
