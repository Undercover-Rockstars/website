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
  // Turnstile: the widget writes its token into a hidden input inside the form.
  function turnstileToken(form) {
    var el = (form || document).querySelector('[name="cf-turnstile-response"]');
    return el ? el.value : '';
  }
  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      try { window.turnstile.reset(); } catch (e) { /* not rendered */ }
    }
  }


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

    // #6 attach: a made-to-measure line carries the profile saved by UR Fit
    // in this browser, numbers only, never photos. If nothing sane is
    // saved, or a vendor scanner left no profile, nothing is attached and
    // the reservation is the same as it ever was.
    var hasTailored = lines.some(function (l) { return l.fit === 'tailored'; });
    var profile = hasTailored && window.URProfile ? window.URProfile.attachPayload() : null;

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'reserve',
        email: email,
        name: document.getElementById('rv-name').value,
        message: document.getElementById('rv-note').value,
        company: document.getElementById('rv-company').value,
        bag: lines,
        profile: profile,
        turnstileToken: turnstileToken(form)
      })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d.ok, d: d }; }); })
      .then(function (r) {
        btn.disabled = false;
        if (label) label.textContent = 'Reserve this bag';
        if (r.ok) {
          form.hidden = true;
          if (ok) {
            ok.hidden = false;
            if (profile) {
              ok.textContent = 'Reserved, with your saved measurements attached to the email. They are numbers only, still in this browser, and one tap in UR Fit deletes them.';
            }
          }
          return;
        }
        fail('Could not reserve right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will hold it by hand.');
      })
      .catch(function () {
        btn.disabled = false;
        if (label) label.textContent = 'Reserve this bag';
        fail('Could not reserve right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will hold it by hand.');
      });
  });
})();
