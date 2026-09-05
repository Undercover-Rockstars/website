/**
 * POST /api/waitlist — buy a place in the queue for Drop 01.
 *
 * Security posture (public, unauthenticated, and it moves money):
 *  - No card data ever reaches this site. This endpoint only creates a Stripe
 *    Checkout Session and returns its URL; the card is entered on Stripe.
 *  - The amount is fixed server-side. The client sends an email address and
 *    nothing else that could change what is charged.
 *  - STRIPE_SECRET_KEY (or STRIPE_PAYMENT_LINK) is a Cloudflare Pages secret and
 *    never reaches the browser. Without one this returns 503 not_configured and
 *    the page says the waitlist is not open, rather than pretending to charge.
 *  - Origin-locked, honeypot, and Turnstile-verified when configured, because an
 *    open session-creating endpoint is a free way to fill someone's dashboard.
 */

const PRICE = { currency: 'usd', unitAmount: 900, name: 'Drop 01 waitlist place' };
const SITE = 'https://undercoverrockstars.com';
const ALLOWED_ORIGINS = new Set([SITE, 'https://www.undercoverrockstars.com']);
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });

const oneLine = (v, max) => String(v ?? '').replace(/[\r\n\0]+/g, ' ').trim().slice(0, max);

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return json(204, {});
  if (request.method !== 'POST') return json(405, { error: 'method not allowed' });

  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(403, { error: 'forbidden' });

  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json(415, { error: 'expected application/json' });
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return json(413, { error: 'too large' });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid request' });
  }

  // Honeypot: accept silently so bots learn nothing, but send them nowhere.
  if (oneLine(body.company, 10)) return json(200, { ok: true, url: null });

  const email = oneLine(body.email, 254);
  if (!EMAIL_RE.test(email)) return json(400, { error: 'A valid email address is required.' });

  if (env.TURNSTILE_SECRET) {
    const token = oneLine(body.turnstileToken, 2048);
    if (!token) return json(400, { error: 'Verification is required.' });
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) form.append('remoteip', ip);
    try {
      const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: form });
      const r = await v.json();
      if (!r.success) return json(403, { error: 'Verification failed. Please try again.' });
    } catch {
      return json(502, { error: 'Could not verify right now.' });
    }
  }

  // A Payment Link is the no-code path: paste one into the Pages env and this
  // endpoint just hands it over with the address prefilled.
  if (env.STRIPE_PAYMENT_LINK) {
    const url = new URL(env.STRIPE_PAYMENT_LINK);
    url.searchParams.set('prefilled_email', email);
    return json(200, { ok: true, url: url.toString() });
  }

  if (!env.STRIPE_SECRET_KEY) return json(503, { error: 'not_configured' });

  const site = env.SITE_ORIGIN || SITE;
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': PRICE.currency,
    'line_items[0][price_data][unit_amount]': String(PRICE.unitAmount),
    'line_items[0][price_data][product_data][name]': PRICE.name,
    'line_items[0][price_data][product_data][description]':
      'Holds a numbered place in the queue for Drop 01. Comes off your first pair. Not a pair, a size or a fit, and not refundable.',
    customer_email: email,
    success_url: `${site}/waitlist/?ok=1`,
    cancel_url: `${site}/waitlist/`,
    'metadata[intent]': 'waitlist',
    'metadata[drop]': 'UR/01',
  });

  let session;
  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    session = await res.json();
    if (!res.ok || !session.url) {
      console.log('stripe session failed', res.status, session && session.error && session.error.type);
      return json(502, { error: 'checkout_failed' });
    }
  } catch (e) {
    console.log('stripe unreachable', e.message);
    return json(502, { error: 'checkout_failed' });
  }

  return json(200, { ok: true, url: session.url });
}
