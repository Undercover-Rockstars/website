/* Newsletter signup. Posts to the same Function as the reservation form.
   Until that Function has a mail provider it reports the failure rather than
   showing a success state for a message that never went anywhere. */
(function () {
  'use strict';
  var form = document.getElementById('signal-form');
  if (!form) return;
  var ok = document.getElementById('signal-ok');
  var err = document.getElementById('signal-err');
  var input = document.getElementById('signal-email');
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


  var btn = document.getElementById('signal-submit');
  var label = document.getElementById('signal-label');
  var human = document.getElementById('signal-human');
  var BAD = "That email address doesn't look right. Check it and try again.";
  var CONTACT = 'Could not save that right now. Try again in a moment, or write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a>.';

  function busy(on) {
    if (!btn) return;
    btn.disabled = on;
    if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    if (label) label.textContent = on ? 'Sending…' : 'Join →';
  }
  // Inline error. Fixed strings only: html is never built from input.
  function fail(html, onEmail) {
    if (err) { err.innerHTML = html; err.hidden = false; }
    input.setAttribute('aria-invalid', onEmail ? 'true' : 'false');
    if (onEmail) input.focus();
  }
  input.addEventListener('input', function () {
    if (input.getAttribute('aria-invalid') === 'true') { input.setAttribute('aria-invalid', 'false'); if (err) err.hidden = true; }
  });
  var again = ok && ok.querySelector('[data-again]');
  if (again) again.addEventListener('click', function () {
    ok.hidden = true; form.hidden = false; if (human) human.hidden = false;
    resetTurnstile();
    input.focus(); input.select();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn && btn.disabled) return;
    if (err) err.hidden = true;
    var email = (input.value || '').trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) { fail(BAD, true); return; }
    input.setAttribute('aria-invalid', 'false');
    busy(true);
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'signal', email: email, turnstileToken: turnstileToken() })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok, status: r.status, d: d }; }); })
      .then(function (r) {
        busy(false);
        if (r.ok) {
          form.hidden = true; if (human) human.hidden = true;
          if (ok) {
            ok.querySelector('[data-done-email]').textContent = email;
            ok.hidden = false; ok.focus();
          }
          return;
        }
        resetTurnstile();
        var msg = (r.d && r.d.error) || '';
        if (/email/i.test(msg)) fail(BAD, true);
        else if (/verif/i.test(msg)) fail("The human check didn't go through. It's been reset — complete it again, then send.", false);
        else if (r.status === 429) fail('Too many tries. Wait a minute, then try again.', false);
        else fail(CONTACT, false);
      })
      .catch(function () { busy(false); resetTurnstile(); fail(CONTACT, false); });
  });
})();
