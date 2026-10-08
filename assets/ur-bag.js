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


  var input = document.getElementById('rv-email');
  var BAD = "That email address doesn't look right. Check it and try again.";
  var CONTACT = 'Could not reserve right now. Try again in a moment, or write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will hold it by hand.';

  function busy(on) {
    btn.disabled = on;
    if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    if (label) label.textContent = on ? 'Reserving…' : 'Reserve this bag';
  }
  // Inline error. Fixed strings only: html is never built from input.
  function fail(html, onEmail) {
    if (!err) return;
    err.innerHTML = html;
    err.hidden = false;
    input.setAttribute('aria-invalid', onEmail ? 'true' : 'false');
    if (onEmail) input.focus();
  }
  input.addEventListener('input', function () {
    if (input.getAttribute('aria-invalid') === 'true') { input.setAttribute('aria-invalid', 'false'); if (err) err.hidden = true; }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    if (err) err.hidden = true;

    var email = (input.value || '').trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      fail(BAD, true);
      return;
    }
    input.setAttribute('aria-invalid', 'false');
    var lines = (window.URBag && window.URBag.lines()) || [];
    if (!lines.length) {
      fail('Your bag is empty. Add a pair first.', false);
      return;
    }

    busy(true);

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
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok, status: r.status, d: d }; }); })
      .then(function (r) {
        busy(false);
        if (r.ok) {
          form.hidden = true;
          if (ok) {
            ok.querySelector('[data-done-email]').textContent = email;
            var note = ok.querySelector('[data-done-profile]');
            if (note) note.hidden = !profile;
            ok.hidden = false;
            ok.focus();
          }
          return;
        }
        resetTurnstile();
        var msg = (r.d && r.d.error) || '';
        if (/email/i.test(msg)) fail(BAD, true);
        else if (/bag is empty/i.test(msg)) fail('Your bag is empty. Add a pair first.', false);
        else if (/verif/i.test(msg)) fail("The human check didn't go through. It's been reset — complete it again, then send.", false);
        else if (r.status === 429) fail('Too many tries. Wait a minute, then try again.', false);
        else fail(CONTACT, false);
      })
      .catch(function () {
        busy(false);
        resetTurnstile();
        fail(CONTACT, false);
      });
  });
})();
