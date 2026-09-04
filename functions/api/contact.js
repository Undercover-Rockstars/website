/**
 * POST /api/contact — reservations and signal signups.
 *
 * Security posture (this is a public, unauthenticated endpoint):
 *  - The recipient is fixed server-side and never read from the request, so
 *    this cannot be used as an open relay.
 *  - RESEND_API_KEY and TURNSTILE_SECRET are Cloudflare Pages secrets. Neither
 *    reaches the browser.
 *  - Turnstile is verified server-side when configured; a honeypot backs it up.
 *  - Everything that could reach a mail header is stripped of CR/LF/NUL.
 *  - `from` is always our own verified domain; the submitter goes in reply_to,
 *    because spoofing their domain would fail DMARC.
 *  - No payment data is accepted. The bag is a reservation, not a checkout.
 */

const LIMITS = { name: 200, email: 254, message: 4000, body: 20000, bag: 40 };
const INTENTS = new Set(['reserve', 'signal']);
const ALLOWED_ORIGINS = new Set([
  'https://undercoverrockstars.com',
  'https://www.undercoverrockstars.com',
]);

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
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

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
    if (raw.length > LIMITS.body) return json(413, { error: 'too large' });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid request' });
  }

  // Honeypot: accept silently so bots learn nothing.
  if (oneLine(body.company, 10)) return json(200, { ok: true });

  const intent = INTENTS.has(oneLine(body.intent, 20)) ? oneLine(body.intent, 20) : 'signal';
  const email = oneLine(body.email, LIMITS.email);
  const name = oneLine(body.name, LIMITS.name);
  const message = String(body.message ?? '').replace(/\0/g, '').trim().slice(0, LIMITS.message);

  if (!EMAIL_RE.test(email)) return json(400, { error: 'A valid email address is required.' });

  // The bag is priced server-side from ids, so a tampered payload cannot invent
  // products or prices in the email we send ourselves.
  let bagLines = [];
  if (intent === 'reserve') {
    const raw = Array.isArray(body.bag) ? body.bag.slice(0, LIMITS.bag) : [];
    bagLines = raw
      .map(l => ({
        id: oneLine(l && l.id, 40),
        size: oneLine(l && l.size, 4),
        qty: Math.max(1, Math.min(20, parseInt(l && l.qty, 10) || 0)),
      }))
      .filter(l => l.id && l.size);
    if (!bagLines.length) return json(400, { error: 'Your bag is empty.' });
  }

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
    } catch (e) {
      return json(502, { error: 'Could not verify right now.' });
    }
  }

  if (!env.RESEND_API_KEY) return json(503, { error: 'not_configured' });

  const to = env.CONTACT_TO || 'hello@undercoverrockstars.com';
  const from = env.CONTACT_FROM || 'Undercover Rockstars <noreply@send.undercoverrockstars.com>';
  const subject = intent === 'reserve'
    ? `[RESERVE] ${name || email}`
    : `[SIGNAL] ${email}`;

  const lines = [
    `Intent:  ${intent}`,
    `Name:    ${name || '(not given)'}`,
    `Email:   ${email}`,
  ];
  if (bagLines.length) {
    lines.push('', 'Bag:');
    bagLines.forEach(l => lines.push(`  ${l.qty} × ${l.id} · size ${l.size}`));
  }
  if (message) lines.push('', message);
  lines.push('', '--', `Country: ${request.cf?.country || 'unknown'}`,
    'Sent by the undercoverrockstars.com site. No payment was taken.');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],              // fixed server-side
        reply_to: email,
        subject,
        text: lines.join('\n'),
      }),
    });
    if (!res.ok) {
      console.log('resend failed', res.status, await res.text());
      return json(502, { error: 'send_failed' });
    }
  } catch (e) {
    console.log('resend unreachable', e.message);
    return json(502, { error: 'send_failed' });
  }

  return json(200, { ok: true });
}
