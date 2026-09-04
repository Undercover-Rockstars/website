/* Bag page: reservation form.
   Drop 01 is not open for sale, so this takes a reservation rather than a
   payment. No card details are collected anywhere on this site. */
(function () {
  'use strict';
  var form = document.getElementById('reserve-form');
  if (!form) return;

  var ok = document.getElementById('rv-ok');
  var err = document.getElementById('rv-err');
  var btn = document.getElementById('rv-submit');
  var label = document.getElementById('rv-label');

  function fail(html) {
    if (!err) return;
    err.innerHTML = html;
    err.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (err) err.hidden = true;

    var email = (document.getElementById('rv-email').value || '').trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      fail('A valid email address is required.');
      return;
    }
    var lines = (window.URBag && window.URBag.lines()) || [];
    if (!lines.length) {
      fail('Your bag is empty. Add a pair first.');
      return;
    }

    btn.disabled = true;
    if (label) label.textContent = 'Reserving…';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'reserve',
        email: email,
        name: document.getElementById('rv-name').value,
        message: document.getElementById('rv-note').value,
        company: document.getElementById('rv-company').value,
        bag: lines
      })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d.ok, d: d }; }); })
      .then(function (r) {
        btn.disabled = false;
        if (label) label.textContent = 'Reserve this bag';
        if (r.ok) { form.hidden = true; if (ok) ok.hidden = false; return; }
        fail('Could not reserve right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will hold it by hand.');
      })
      .catch(function () {
        btn.disabled = false;
        if (label) label.textContent = 'Reserve this bag';
        fail('Could not reserve right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will hold it by hand.');
      });
  });
})();
