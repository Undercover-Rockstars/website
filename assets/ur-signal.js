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


  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (err) err.hidden = true;
    var email = (input.value || '').trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      if (err) { err.textContent = 'That does not look like an email address.'; err.hidden = false; }
      return;
    }
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'signal', email: email, turnstileToken: turnstileToken() })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d.ok, d: d }; }); })
      .then(function (r) {
        if (r.ok) { form.hidden = true; if (ok) ok.hidden = false; return; }
        resetTurnstile();
        if (err) {
          err.innerHTML = 'Could not save that right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a>.';
          err.hidden = false;
        }
      })
      .catch(function () {
        if (err) {
          err.innerHTML = 'Could not save that right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a>.';
          err.hidden = false;
        }
      });
  });
})();
