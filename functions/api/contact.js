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
 *  - An optional `profile` (UR Fit measurements, #6) is validated like the
 *    bag: numbers in sane human ranges, unknown keys dropped, and it is
 *    ignored entirely unless a made-to-measure line is reserved. A chest of
 *    400 cm drops the profile; it never reaches the email.
 *  - The block mapping in the email is derived here, server-side, from the
 *    same ur-data.js the whole site prices from, never echoed from the
 *    client payload.
 */

import UR_DATA from '../../assets/ur-data.js';

const LIMITS = { name: 200, email: 254, message: 4000, body: 20000, bag: 40 };
const INTENTS = new Set(['reserve', 'signal']);
// Fit is an enum, never free text: a tampered payload cannot invent a cut.
const FITS = new Set(['standard', 'tailored']);
// The measurement profile from UR Fit (#6), validated the way the bag is:
// every field a number in a sane human range, unknown keys dropped, the
// whole profile ignored unless a made-to-measure line is actually being
// reserved. A chest of 400 cm drops the profile, it is not emailed.
const PROFILE_HEIGHT = [100, 250];
const PROFILE_FIELDS = new Map([
  ['chest', [60, 200]],
  ['waist', [50, 200]],
  ['hip', [60, 210]],
  ['shoulder', [30, 70]],
  ['sleeve', [30, 90]],
  ['back', [30, 90]],
  ['inseam', [30, 100]],
]);
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

/* Parses the profile or returns null. All or nothing: one out-of-range
   value drops the whole object, because half a profile is worse than none
   in a tailor's inbox. Numbers are rounded to a precision a phone scan
   can support (0.1 cm), never strings, never extra keys. */
const parseProfile = (raw, hasTailoredLine) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasTailoredLine) return null;
  const height = Number(raw.heightCm);
  if (!(height >= PROFILE_HEIGHT[0] && height <= PROFILE_HEIGHT[1])) return null;
  const incoming = raw.values;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return null;
  const values = {};
  for (const [id, [min, max]] of PROFILE_FIELDS) {
    const v = incoming[id];
    if (!v || typeof v !== 'object') return null;
    const cm = Number(v.cm);
    if (!(cm >= min && cm <= max)) return null;
    const confidence = Number(v.confidence);
    values[id] = {
      cm: Math.round(cm * 10) / 10,
      confidence: Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
        ? Math.round(confidence * 100) / 100 : null,
      low: v.low === true,
      edited: v.edited === true,
    };
  }
  return { heightCm: Math.round(height * 10) / 10, values };
};

const confidenceWord = (c) =>
  c == null ? 'no confidence data' : c >= 0.8 ? 'high confidence' : c >= 0.6 ? 'ok confidence' : 'low confidence, check with buyer';

const profileEmailLines = (p) => {
  const lines = ['', 'Measurements (phone-scan estimate from UR Fit, not a tape):',
    `  Height (stated by buyer): ${p.heightCm} cm`];
  for (const [id] of PROFILE_FIELDS) {
    const v = p.values[id];
    lines.push(`  ${id.padEnd(9)}: ${String(v.cm).padStart(6)} cm  · ${confidenceWord(v.confidence)}` +
      (v.edited ? ' · corrected by buyer' : ''));
  }
  lines.push('  These are estimates to pre-cut from. Confirm with a tape before cutting (#8).');
  return lines;
};

/* How each made-to-measure line maps onto a standard block (#7): the
   nearest size by chest, the deltas from it, and the flag for #8's human
   step. Derived from the validated profile and the drafted (provisional)
   table in ur-data.js, never from anything the client sent as prose. */
const blockEmailLines = (profile, bagLines) => {
  if (!profile) return [];
  const lines = ['', 'Block mapping (drafted size run, provisional until the pattern cutter signs it):'];
  let any = false;
  for (const l of bagLines) {
    if (l.fit !== 'tailored') continue;
    const p = UR_DATA.PRODUCTS.find(pr => pr.id === l.id);
    if (!p) continue;
    any = true;
    const r = UR_DATA.blockFor(profile, p.cat);
    if (!r) {
      lines.push(`  ${l.id} (${p.cat}): no block mapping, chest unreadable`);
      continue;
    }
    const ease = `ease draft: chest +${r.ease.chest}, waist +${r.ease.waist}, seat +${r.ease.hip} cm`;
    const tape = r.needsByTape && !r.needsByTape.startsWith('none')
      ? ` · tape needed: ${r.needsByTape}` : '';
    lines.push(`  ${l.id} (${p.cat}): ${UR_DATA.blockLine(r)} · ${ease}${tape}`);
  }
  return any ? lines : [];
};

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
        fit: FITS.has(oneLine(l && l.fit, 20)) ? oneLine(l && l.fit, 20) : 'standard',
        qty: Math.max(1, Math.min(20, parseInt(l && l.qty, 10) || 0)),
      }))
      .filter(l => l.id && l.size);
    if (!bagLines.length) return json(400, { error: 'Your bag is empty.' });
  }

  // The profile only ever rides a made-to-measure reservation, and only if
  // every value survives validation. Dropped otherwise, silently to the
  // tailor: a partial or tampered profile is not a measurement.
  const hasTailored = bagLines.some(l => l.fit === 'tailored');
  const profile = intent === 'reserve' ? parseProfile(body.profile, hasTailored) : null;

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
    bagLines.forEach(l => lines.push(
      `  ${l.qty} × ${l.id} · size ${l.size}` +
      (l.fit === 'tailored' ? ' · MADE TO MEASURE (+30%)' : '')));
  }
  if (profile) lines.push(...profileEmailLines(profile));
  if (profile) lines.push(...blockEmailLines(profile, bagLines));
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
