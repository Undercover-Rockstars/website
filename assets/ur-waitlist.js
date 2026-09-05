/* Waitlist page: hand an email to /api/waitlist and follow it to Stripe.
   No card field exists on this site. If no processor is configured the endpoint
   says so and this page says so too, rather than pretending to take money. */
(function () {
  'use strict';
  var form = document.getElementById('wl-form');
  if (!form) return;

  var btn = document.getElementById('wl-submit');
  var label = document.getElementById('wl-label');
  var err = document.getElementById('wl-err');
  var paid = document.getElementById('wl-paid');

  // Stripe sends the buyer back here with ?ok=1 and nothing else.
  if (/[?&]ok=1\b/.test(location.search)) {
    if (paid) paid.hidden = false;
    form.hidden = true;
    history.replaceState(null, '', location.pathname);
  }

  function fail(html) {
    if (!err) return;
    err.innerHTML = html;
    err.hidden = false;
  }
  function reset() {
    btn.disabled = false;
    if (label) label.textContent = 'Hold my place · $9';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (err) err.hidden = true;

    var email = (document.getElementById('wl-email').value || '').trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      fail('A valid email address is required.');
      return;
    }

    btn.disabled = true;
    if (label) label.textContent = 'Opening checkout…';

    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email,
        company: document.getElementById('wl-company').value
      })
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (r) {
        if (r.status === 200 && r.d.url) { location.href = r.d.url; return; }
        reset();
        if (r.status === 503) {
          fail('The waitlist is not open yet: no payment processor is connected, so there is nothing to charge. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will note you by hand.');
          return;
        }
        fail(r.d.error && r.d.error.length < 120 && r.status === 400
          ? r.d.error
          : 'Could not open checkout right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a>.');
      })
      .catch(function () {
        reset();
        fail('Could not open checkout right now. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a>.');
      });
  });
})();
