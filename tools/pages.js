#!/usr/bin/env node
/* Emits every page. Run: node tools/pages.js */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./build.js');
const D = require('../assets/ur-data.js');
const { PRODUCTS, CATEGORIES, SIZES, format } = D;
const { ORIGIN, BRAND, TAGLINE, esc, head, header, footer, foot, tile, ORG, SITE, crumbs } = L;

const ROOT = path.join(__dirname, '..');
const write = (rel, html) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log('  ' + rel);
};

/* ------------------------------------------------------- copy from the design */

const PAIRS = [
  { n: '01', a: 'Day', b: 'Night' },
  { n: '02', a: 'Control', b: 'Rebellion' },
  { n: '03', a: 'Business', b: 'Party' },
  { n: '04', a: 'Undercover', b: 'Uncovered' }
];
const SHIFT = [
  { step: 'Room 01', time: '09:00', room: 'Boardroom', note: 'Day set. Charcoal blazer, white shirt. Reads as tailoring and nothing else.' },
  { step: 'Room 02', time: '18:30', room: 'The switch', note: 'The night set comes out of the bag. Same pattern, same fit. Black replaces charcoal.' },
  { step: 'Room 03', time: '22:00', room: 'Bar', note: 'Night set. The satin lapel catches the light for the first time.' },
  { step: 'Room 04', time: '03:00', room: 'Stage', note: 'Jacket over nothing much. Sleeves pushed. Same silhouette, uncovered.', accent: true }
];
const CODES = [
  { n: 'Code 01', h: 'One pattern, two fabrics', p: 'Every pair is cut from a single block. The day and night versions share every seam, so the fit never changes when the world does.' },
  { n: 'Code 02', h: 'Sold together, worn apart', p: 'A pair is one product, one size, one price. The day piece goes to the meeting. The night piece waits in the bag.' },
  { n: 'Code 03', h: 'Black on black', p: 'Lyrics, marks and monograms stitched tone on tone. You have to be close to read them.' }
];
const TAGS = [
  { n: 'Tag 01', h: 'Proof it is real', p: 'Every garment is registered to its pair before it leaves Bali. One tap confirms the piece, the pair it was cut with and the drop it came from. A copy can borrow the look. It cannot borrow the tag.' },
  { n: 'Tag 02', h: 'Lost at 4am', p: 'Jackets go missing at the rave. Whoever finds yours taps it, writes one line, and it reaches you. They see that the piece is spoken for. They never see your name, your number or your address.' }
];
const MANIFESTO = [
  { n: '01', h: 'The suit is not the disguise.', p: 'The person in the meeting is real. So is the person at 2am. We stopped pretending one of them was the costume.' },
  { n: '02', h: 'Everything comes in pairs.', p: 'One pattern, cut twice. A day version and a night version that share every seam. You buy both, and you never go home to change.' },
  { n: '03', h: 'Quiet from ten metres. Loud from one.', p: 'Details live where only the people close to you will see them. A lining. A seam. A line of text stitched black on black.' },
  { n: '04', h: 'Nothing changes but the light.', p: 'The same jacket. The same shirt. What shifts is the room, the hour, and how much of yourself you decide to show.' },
  { n: '05', h: 'Undercover is a choice.', p: 'Not a hiding place. Being undercover means you have something worth uncovering, and you decide when.' },
  { n: '06', h: 'Everyone has a rockstar undercover.', p: 'Founders. Designers. The person across the table. This is for the version of you that shows up when the deck is closed.' }
];
const TICKER_WORDS = ['Day', 'Night', 'Control', 'Rebellion', 'Business', 'Party', 'Undercover', 'Uncovered'];
const LOG_LINES = [
  'UR/01 — 8 pairs / 16 garments — live',
  'UR/02 — initializing',
  'Mode — night — 03:00',
  'Identities — 02 active',
  'Packaging — unmarked',
  'Tag — NFC — standing by',
  'Signal — awaiting address'
];

/* ------------------------------------------------------------------- home */

const ticker = () => {
  let items = '';
  for (let r = 0; r < 2; r++) {
    TICKER_WORDS.forEach((w, i) => {
      items += `<span${i % 2 ? ' class="odd"' : ''}>${w}</span><span class="sep">↔</span>`;
    });
  }
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${items}</div></div>`;
};

write('index.html', head({
  slug: 'home',
  title: `${BRAND} · ${TAGLINE}`,
  description: 'Clothing for people who live two lives in one day. Every piece comes as a matched pair: one cut for the meeting, the same pattern cut for what comes after.',
  canonical: '/',
  og: 'og.png',
  jsonld: { '@context': 'https://schema.org', '@graph': [ORG, SITE, {
    '@type': 'WebPage', '@id': ORIGIN + '/#webpage', url: ORIGIN + '/',
    name: `${BRAND} · ${TAGLINE}`, isPartOf: { '@id': ORIGIN + '/#website' },
    about: { '@id': ORIGIN + '/#organization' }, inLanguage: 'en'
  }] }
}) + header('home') + `
<main id="main">

  <div class="statusbar">
    <div><span class="mute">Status</span><span class="live"><span class="dot" aria-hidden="true"></span>Undercover</span></div>
    <div><span class="mute">Local time</span><span><span data-mode-time>03:00</span> · <span data-mode-place>Backstage</span></span></div>
    <div><span class="mute">Drop</span><span>UR/01 · 08 pairs live</span></div>
    <div><span class="mute">Identities</span><span>02 active</span></div>
  </div>

  <section class="hero">
    <div class="hero-star" aria-hidden="true">★</div>
    <div class="grid12 hero-grid">
      <h1 class="h-hero hero-headline">
        <span class="l"><span>Everyone has</span></span><span class="l"><span>a rockstar</span></span><span class="l"><span>undercover.</span></span>
      </h1>
      <div class="hero-copy">
        <p class="lede">${BRAND} makes clothing for people who live two lives in one day. Every piece comes as a matched pair: one for the meeting, one for what comes after.</p>
        <a class="btn" href="/collection/"><span>Enter Drop 01</span><span aria-hidden="true">→</span></a>
      </div>
    </div>
    <p class="hero-foot">
      <span style="display:flex;gap:12px;align-items:center"><span class="chip">Next drop</span><span class="blink">Initializing</span></span>
      <span>undercoverrockstars.com</span>
    </p>
  </section>

  ${ticker()}

  <section class="section grid12">
    <p class="eyebrow col-1-3">01 / Thesis</p>
    <div class="col-4-9">
      <h2 class="h-display" style="margin-bottom:56px">The day is<br>the disguise.</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px 48px;font-size:clamp(20px,2vw,30px);line-height:1.25;font-weight:500;letter-spacing:-.01em">
        <p style="margin:0" class="mute">By day: founder, executive, designer.</p>
        <p style="margin:0">By night: the rockstar.</p>
        <p style="margin:0" class="mute">The suit coordinates the room.</p>
        <p style="margin:0">The jacket coordinates the night.</p>
      </div>
      <div style="margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">
        <p class="lede">Most clothing is made for a single room. Ours is made for the walk from one to the other, and everything that happens on the way. Same person. Same confidence. Different world.</p>
        <p style="margin:0;font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.02em">We dress the second one.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="grid12" style="margin-bottom:48px">
      <p class="eyebrow col-1-3">02 / The system</p>
      <div class="col-4-9" style="display:flex;justify-content:space-between;align-items:end;gap:24px;flex-wrap:wrap">
        <h2 class="h-display">Every piece<br>comes twice.</h2>
        <span class="eyebrow" style="white-space:nowrap">Hover pairs to inspect</span>
      </div>
    </div>
    <div class="tiles">
${PRODUCTS.map(p => tile(p, false)).join('\n')}
    </div>
  </section>

  <section class="section grid12">
    <p class="eyebrow col-1-3">03 / Day ↔ Night</p>
    <div class="col-4-9">
      <h2 class="h-display" style="margin-bottom:48px">Same person.<br><span class="acc">Different world.</span></h2>
      <div class="pairs">
${PAIRS.map(p => `        <div class="pair-row"><span class="n">${p.n}</span><span class="mute">${p.a}</span><span class="wire" aria-hidden="true"></span><span class="acc">${p.b}</span></div>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="grid12" style="margin-bottom:56px">
      <p class="eyebrow col-1-3">04 / The shift</p>
      <div class="col-4-9">
        <h2 class="h-display" style="margin-bottom:20px">Two outfits.<br>One day.</h2>
        <p class="lede" style="max-width:520px">You don't go home to change. The night set travels in the bag; the switch happens somewhere between the last meeting and the first drink. Same cut. Same shoulders. Different world.</p>
      </div>
    </div>
    <div class="shift">
${SHIFT.map(s => `      <div>
        <span class="when"><span>${s.step}</span><span>${s.time}</span></span>
        <span class="h-mid"${s.accent ? ' style="color:var(--acc)"' : ''}>${s.room}</span>
        <p class="note">${esc(s.note)}</p>
      </div>`).join('\n')}
    </div>
  </section>

  <section class="section grid12">
    <p class="eyebrow col-1-3">05 / Codes</p>
    <div class="col-4-9">
      <h2 class="h-display" style="margin-bottom:56px">Quiet from ten metres.<br>Loud from one.</h2>
      <div class="codes">
${CODES.map(c => `        <div class="code"><span class="eyebrow acc">${c.n}</span><h3>${esc(c.h)}</h3><p>${esc(c.p)}</p></div>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="section grid12">
    <p class="eyebrow col-1-3">06 / The tag</p>
    <div class="col-4-9">
      <h2 class="h-display" style="margin-bottom:20px">Every piece knows<br><span class="acc">who it belongs to.</span></h2>
      <p class="lede" style="max-width:560px;margin-bottom:56px">An NFC tag sits in the seam of all sixteen garments. Hold a phone against it and the piece answers. No app to install, nothing to open, nothing printed on the outside.</p>
      <div class="codes codes--2">
${TAGS.map(t => `        <div class="code"><span class="eyebrow acc">${t.n}</span><h3>${esc(t.h)}</h3><p>${esc(t.p)}</p></div>`).join('\n')}
      </div>
      <p class="fit-note" style="margin-top:20px">Tags travel with the garments. Drop 01 has not shipped, so there is nothing to tap yet.</p>
    </div>
  </section>

  <section class="section grid12" style="align-items:center;padding-top:140px;padding-bottom:140px">
    <p class="eyebrow col-1-3" style="align-self:start">07 / The mark</p>
    <div class="col-4-9" style="display:grid;gap:40px">
      <p class="footer-mark" style="font-size:clamp(40px,6.5vw,110px)">Undercover Rockst<span class="acc">★</span>rs</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px">
        <p class="lede">The star sits where the A should be. Most people read the word. Some see the star. That is the whole idea.</p>
        <p class="eyebrow" style="line-height:2">Mark: UR★<br>Wordmark: ROCKST★RS<br>Scroll to collapse</p>
      </div>
    </div>
  </section>

  <section class="grid12" id="signal" style="padding:120px var(--gut) 140px">
    <p class="eyebrow col-1-3">08 / Signal</p>
    <div class="col-4-9 signal-grid">
      <div>
        <h2 class="h-display" style="margin-bottom:20px">The drops<br>never stop.</h2>
        <p class="lede" style="margin-bottom:32px">Drop 02 is not announced. Leave an address and we'll find you. One message per drop. Nothing else.</p>
        <form class="signal-form" id="signal-form" novalidate>
          <label class="sr-only" for="signal-email">Email address</label>
          <input id="signal-email" name="email" type="email" required placeholder="you@somewhere.com" autocomplete="email">
          <button type="submit">Join →</button>
        </form>
        <p class="signal-ok" id="signal-ok" hidden>Signal received. See you at 00:00.</p>
        <p class="signal-ok" id="signal-err" hidden style="border-color:var(--mute);color:var(--mute)"></p>
        <p class="fit-note" style="margin-top:14px">One email per drop. No sharing, unsubscribe any time.</p>
      </div>
      <div class="log">
        <div class="log-head"><span>UR/LOG</span><span class="rec">●</span></div>
${LOG_LINES.map((l, i) => `        <div class="log-line" style="animation-delay:${(0.2 + i * 0.18).toFixed(2)}s"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(l)}</span></div>`).join('\n')}
        <span class="log-caret" aria-hidden="true"></span>
      </div>
    </div>
  </section>

</main>
` + footer() + foot(['/assets/ur-signal.js']));

console.log('home done');

/* ------------------------------------------------------------- collection */

write('collection/index.html', head({
  slug: 'collection',
  title: `Drop 01 · ${BRAND}`,
  description: 'Eight pairs. Sixteen garments. Each pair is one pattern cut twice: once for the day, once for the night. Unisex, cut in Bali.',
  canonical: '/collection/',
  og: 'og-collection.png',
  jsonld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': ORIGIN + '/collection/#webpage', url: ORIGIN + '/collection/',
      name: `Drop 01 · ${BRAND}`, isPartOf: { '@id': ORIGIN + '/#website' }, inLanguage: 'en',
      mainEntity: { '@type': 'ItemList', numberOfItems: PRODUCTS.length,
        itemListElement: PRODUCTS.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, url: ORIGIN + '/product/' + p.id + '/', name: p.name })) } },
    crumbs([{ name: BRAND, path: '/' }, { name: 'Drop 01', path: '/collection/' }])
  ] }
}) + header('collection') + `
<main id="main" class="page-pad">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/01 · <span id="filter-count">08</span> pairs · <span data-mode-lower>night</span> mode</p>
      <h1 class="h-page">Drop 01</h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">Eight pairs. Sixteen garments. Each pair is one pattern cut twice: once for the day, once for the night. Unisex. Cut in Bali. All sixteen carry an NFC tag in the seam.</p>
  </div>
  <div class="filters" role="group" aria-label="Filter by category">
${CATEGORIES.map((c, i) => `    <button type="button" data-filter="${c}" aria-pressed="${i === 0}">${c}</button>`).join('\n')}
  </div>
  <div class="tiles">
${PRODUCTS.map(p => tile(p, true)).join('\n')}
  </div>
</main>
` + footer() + foot(['/assets/ur-collection.js']));

/* ---------------------------------------------------------------- product */

PRODUCTS.forEach((p, i) => {
  const prev = PRODUCTS[(i - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(i + 1) % PRODUCTS.length];
  write(`product/${p.id}/index.html`, head({
    slug: 'product',
    title: `${p.name} · ${BRAND}`,
    description: `${p.desc.slice(0, 150)}`,
    canonical: `/product/${p.id}/`,
    og: `og-${p.id}.png`,
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Product', '@id': ORIGIN + '/product/' + p.id + '/#product',
        name: p.name, sku: 'UR-' + p.code, category: p.cat,
        description: p.desc,
        brand: { '@type': 'Brand', name: BRAND },
        material: p.fabric,
        countryOfOrigin: 'ID',
        image: ORIGIN + '/assets/og-' + p.id + '.png',
        offers: {
          '@type': 'Offer',
          url: ORIGIN + '/product/' + p.id + '/',
          price: p.price, priceCurrency: D.CURRENCY,
          // Drop 01 is not open for sale yet: the bag takes reservations, so
          // PreOrder is the honest availability rather than InStock.
          availability: 'https://schema.org/PreOrder',
          seller: { '@id': ORIGIN + '/#organization' }
        } },
      crumbs([{ name: BRAND, path: '/' }, { name: 'Drop 01', path: '/collection/' },
              { name: p.name, path: '/product/' + p.id + '/' }])
    ] }
  }) + header('collection') + `
<main id="main" class="product" data-product-id="${p.id}" data-price="${p.price}">
  <div class="product-media">
    <div class="media-row media-row--top">
      <div class="media media--day"><span>[ day version ]</span></div>
      <div class="media media--night"><span>[ night version ]</span></div>
    </div>
    <div class="media-row">
      <div class="media media--detail"><span>[ detail — fabric ]</span></div>
      <div class="media media--detail"><span>[ detail — back ]</span></div>
    </div>
  </div>
  <div class="product-panel">
    <a class="crumb" href="/collection/">← UR/01 / ${esc(p.cat)} / UR/${p.code}</a>
    <h1 class="h-page" style="font-size:clamp(32px,3.4vw,54px);line-height:.92;letter-spacing:-.03em">${esc(p.name)}</h1>
    <p class="product-price">${format(p.price)} <small>· Pair of 2 · one size for both</small></p>
    <div class="versions">
      <div class="v-day"><p class="label">Day version</p><p>${esc(p.day)}</p></div>
      <div class="v-night"><p class="label">Night version</p><p>${esc(p.night)}</p></div>
    </div>
    <p class="lede" style="font-size:15px">${esc(p.desc)}</p>
    <div>
      <p class="eyebrow" style="margin-bottom:12px">Size — <span id="size-label">select</span></p>
      <div class="sizes" role="group" aria-label="Choose a size">
${SIZES.map(z => `        <button type="button" data-size="${z}" aria-pressed="false">${z}</button>`).join('\n')}
      </div>
    </div>
    <div style="display:grid;gap:8px">
      <button type="button" class="btn btn--lg" id="add-to-bag" disabled><span id="add-label">Select a size</span><span aria-hidden="true">→</span></button>
      <a class="btn btn--ghost" href="/fitting-room/?pair=${p.id}"><span>Try it on</span><span aria-hidden="true">◎</span></a>
    </div>
    <dl class="spec-table">
      <div><dt>Contents</dt><dd>1 day + 1 night</dd></div>
      <div><dt>Tag</dt><dd>NFC · both pieces</dd></div>
      <div><dt>Fabric</dt><dd>${esc(p.fabric)}</dd></div>
      <div><dt>Made in</dt><dd>Bali, Indonesia</dd></div>
      <div><dt>Shipping</dt><dd>Worldwide · 3–5 days</dd></div>
      <div><dt>Status</dt><dd>Drop 01 · reservations open</dd></div>
    </dl>
    <p class="fit-note">Both pieces carry an NFC tag in the seam. Tap it to confirm the pair is genuine. If one goes missing at 4am, whoever finds it can reach you through the tag without ever seeing who you are.</p>
    <p class="fit-note" style="display:flex;justify-content:space-between;gap:16px">
      <a href="/product/${prev.id}/">← ${esc(prev.name)}</a>
      <a href="/product/${next.id}/">${esc(next.name)} →</a>
    </p>
  </div>
</main>
` + footer() + foot(['/assets/ur-product.js']));
});

/* ----------------------------------------------------------------- thesis */

write('thesis/index.html', head({
  slug: 'thesis',
  title: `Thesis · ${BRAND}`,
  description: 'Six lines on why clothing should come in pairs. The suit is not the disguise, everything comes twice, and everyone has a rockstar undercover.',
  canonical: '/thesis/',
  og: 'og-thesis.png',
  jsonld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': ORIGIN + '/thesis/#webpage', url: ORIGIN + '/thesis/',
      name: `Thesis · ${BRAND}`, isPartOf: { '@id': ORIGIN + '/#website' }, inLanguage: 'en' },
    { '@type': 'Article', '@id': ORIGIN + '/thesis/#article', headline: TAGLINE,
      author: { '@id': ORIGIN + '/#organization' }, publisher: { '@id': ORIGIN + '/#organization' },
      mainEntityOfPage: { '@id': ORIGIN + '/thesis/#webpage' }, inLanguage: 'en' },
    crumbs([{ name: BRAND, path: '/' }, { name: 'Thesis', path: '/thesis/' }])
  ] }
}) + header('thesis') + `
<main id="main" class="page-pad">
  <div class="grid12">
    <p class="eyebrow col-1-3" style="position:sticky;top:90px;align-self:start">Thesis<br>UR/T.01</p>
    <div class="col-4-9">
      <h1 class="h-page" style="margin-bottom:96px">Everyone has<br>a rockstar<br><span class="acc">undercover.</span></h1>
      <div class="pairs">
${MANIFESTO.map(m => `        <div style="display:grid;grid-template-columns:80px 1fr 1fr;gap:32px;padding:40px 0;border-bottom:1px solid var(--line)">
          <span class="eyebrow acc" style="padding-top:8px">${m.n}</span>
          <h2 class="h-mid" style="font-size:clamp(24px,2.6vw,40px)">${esc(m.h)}</h2>
          <p class="lede">${esc(m.p)}</p>
        </div>`).join('\n')}
      </div>
      <a class="btn btn--inline" style="margin-top:64px" href="/collection/"><span>Enter Drop 01</span><span aria-hidden="true">→</span></a>
    </div>
  </div>
</main>
` + footer() + foot());

console.log('collection, products, thesis done');

/* ----------------------------------------------------------- fitting room */

write('fitting-room/index.html', head({
  slug: 'fitting',
  title: `Fitting room · ${BRAND}`,
  description: 'One photo, both versions. See the day piece and the night piece before either arrives. Your photo is read in the browser and is not uploaded.',
  canonical: '/fitting-room/',
  og: 'og-fitting.png',
  jsonld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': ORIGIN + '/fitting-room/#webpage', url: ORIGIN + '/fitting-room/',
      name: `Fitting room · ${BRAND}`, isPartOf: { '@id': ORIGIN + '/#website' }, inLanguage: 'en' },
    crumbs([{ name: BRAND, path: '/' }, { name: 'Fitting room', path: '/fitting-room/' }])
  ] }
}) + header('fitting') + `
<main id="main" class="page-pad" data-initial-product="${PRODUCTS[0].id}">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/FIT · try-on · <span class="acc">provider not connected</span></p>
      <h1 class="h-page">Fitting<br>room</h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">One photo. Both versions. See the day piece and the night piece on you before either arrives.</p>
  </div>

  <div id="fitting" class="fit-shell" data-initial-product="${PRODUCTS[0].id}">
    <div class="fit-controls">
      <div class="fit-block">
        <p class="step">01 / Your photo</p>
        <label class="fit-drop">
          <img id="fit-drop-img" alt="" hidden>
          <span id="fit-drop-label">[ drop or choose a photo ]</span>
          <input id="fit-file" type="file" accept="image/*">
        </label>
        <p class="fit-note">Full body, plain background, arms relaxed. Your photo is read in this browser and is not uploaded anywhere.</p>
      </div>
      <div class="fit-block">
        <p class="step">02 / Pair</p>
        <div class="fit-pairs" role="group" aria-label="Choose a pair">
${PRODUCTS.map((p, i) => `          <button type="button" data-fit-product="${p.id}" aria-pressed="${i === 0}"><span>UR/${p.code} ${esc(p.name)}</span><span class="p">${format(p.price)}</span></button>`).join('\n')}
        </div>
      </div>
      <div class="fit-block">
        <p class="step">03 / Version</p>
        <div class="fit-toggle" role="group" aria-label="Choose a version">
          <button type="button" data-fit-mode="day" aria-pressed="true">Day</button>
          <button type="button" data-fit-mode="night" aria-pressed="false">Night</button>
        </div>
      </div>
      <div class="fit-block">
        <button type="button" class="btn btn--lg" id="fit-run" disabled><span id="fit-run-label">Add a photo first</span><span aria-hidden="true">◎</span></button>
        <p class="fit-note">Renders both pieces from one pattern once a provider is connected.</p>
      </div>
    </div>

    <div class="fit-stage">
      <div class="fit-pane fit-pane--in">
        <span class="fit-tag">Input</span>
        <img id="fit-in-img" alt="The photo you chose" hidden>
        <span class="fit-idle" id="fit-in-label">[ your photo appears here ]</span>
      </div>
      <div class="fit-pane fit-pane--out" id="fit-out">
        <span class="fit-tag">Render · <span id="fit-mode-tag">day</span></span>
        <img id="fit-result" alt="Try-on render" hidden>
        <div class="fit-idle" id="fit-idle">
          <span class="star" aria-hidden="true">★</span>
          <span>Output</span>
          <span id="fit-hint">Waiting for a photo</span>
        </div>
        <div class="fit-idle" id="fit-busy" hidden>
          <span class="fit-scan" aria-hidden="true"></span>
          <span class="acc">● Rendering</span>
          <span id="fit-step">Connecting</span>
        </div>
        <div class="fit-idle" id="fit-notice" hidden role="status">
          <span class="star" aria-hidden="true">◎</span>
          <span class="acc">No provider connected</span>
          <span style="max-width:30ch;line-height:1.8">The try-on engine is not wired up yet, so there is nothing to show you. We are not going to hand your own photo back and call it a render.</span>
          <a class="btn btn--ghost btn--inline" style="margin-top:8px" href="/collection/"><span>See the pairs instead</span><span aria-hidden="true">→</span></a>
        </div>
      </div>
    </div>
  </div>
  <p class="fit-provider">Provider hook: <code>assets/tryon.js</code> · renderTryOn({ photo, productId, mode }) · returns nothing until a try-on API is connected. Your photo never leaves the browser in this state.</p>
</main>
` + footer() + foot(['/assets/ur-fitting.js']));

/* -------------------------------------------------------------------- bag */

write('bag/index.html', head({
  slug: 'bag',
  title: `Bag · ${BRAND}`,
  description: 'Your bag. Drop 01 is not open for sale yet, so reservations hold your pair and size until it is.',
  canonical: '/bag/',
  og: 'og.png',
  noindex: true
}) + header('bag') + `
<main id="main" class="page-pad">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/BAG · <span data-bag-count>00</span> in bag</p>
      <h1 class="h-page">Bag</h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">Drop 01 is not open for sale yet. Reserve your pair and size and we will contact you the moment it opens. No payment is taken here.</p>
  </div>

  <div class="grid12" style="gap:48px var(--gap)">
    <div class="col-1-8">
      <div class="bag-body" id="bag-page-body" style="overflow:visible"></div>
      <div class="bag-foot" style="margin-top:8px">
        <div class="bag-total"><span>Total</span><span id="bag-page-total">€0</span></div>
        <p class="fit-note">Shipping complimentary worldwide. Nothing is charged until Drop 01 opens and you confirm.</p>
      </div>
    </div>

    <div class="col-9-4">
      <div class="code" style="min-height:0">
        <span class="eyebrow acc">Reserve</span>
        <h2 style="margin:0;font-weight:700;text-transform:uppercase;font-size:18px;letter-spacing:.01em">Hold this bag</h2>
        <form id="reserve-form" novalidate style="display:grid;gap:12px">
          <label class="sr-only" for="rv-name">Name</label>
          <input id="rv-name" name="name" placeholder="Name" autocomplete="name" style="background:none;border:1px solid var(--line);outline:0;padding:14px 16px;color:var(--fg);font-size:15px">
          <label class="sr-only" for="rv-email">Email</label>
          <input id="rv-email" name="email" type="email" required placeholder="Email" autocomplete="email" style="background:none;border:1px solid var(--line);outline:0;padding:14px 16px;color:var(--fg);font-size:15px">
          <label class="sr-only" for="rv-note">Note</label>
          <textarea id="rv-note" name="note" rows="3" placeholder="Anything we should know?" style="background:none;border:1px solid var(--line);outline:0;padding:14px 16px;color:var(--fg);font-size:15px;resize:vertical"></textarea>
          <div class="hp" aria-hidden="true"><label>Company<input id="rv-company" name="company" tabindex="-1" autocomplete="off"></label></div>
          <button type="submit" class="btn" id="rv-submit"><span id="rv-label">Reserve this bag</span><span aria-hidden="true">→</span></button>
        </form>
        <p class="signal-ok" id="rv-ok" hidden>Reserved. We'll be in touch before the drop opens.</p>
        <p class="fit-note" id="rv-err" hidden></p>
        <p class="fit-note">No card details are collected anywhere on this site.</p>
      </div>
    </div>
  </div>
</main>
` + footer() + foot(['/assets/ur-bag.js']));

/* -------------------------------------------------------------------- 404 */

write('404.html', head({
  slug: '404',
  title: `Not found · ${BRAND}`,
  description: 'That page is undercover.',
  canonical: '/404.html',
  og: 'og.png',
  noindex: true
}) + header('') + `
<main id="main" class="page-pad" style="display:grid;align-content:center;gap:28px;min-height:60vh">
  <p class="eyebrow acc">Error 404 · Undercover</p>
  <h1 class="h-page">This one stayed<br>undercover.</h1>
  <p class="lede" style="max-width:46ch">The page you asked for does not exist. The drop, however, does.</p>
  <a class="btn btn--inline" href="/collection/"><span>Enter Drop 01</span><span aria-hidden="true">→</span></a>
</main>
` + footer() + foot());

console.log('fitting room, bag, 404 done');

/* -------------------------------------------------------------- seo files */

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: '/', pri: '1.0', freq: 'weekly' },
  { loc: '/collection/', pri: '0.9', freq: 'weekly' },
  ...PRODUCTS.map(p => ({ loc: `/product/${p.id}/`, pri: '0.8', freq: 'monthly' })),
  { loc: '/thesis/', pri: '0.7', freq: 'monthly' },
  { loc: '/fitting-room/', pri: '0.6', freq: 'monthly' }
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${ORIGIN}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);

write('robots.txt', `# ${BRAND} · ${ORIGIN}
# Answer engines and AI crawlers are welcome. /llms.txt carries a structured,
# plain-text summary written for machine readers.

User-agent: *
Allow: /
Disallow: /bag/

${['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-User','Claude-SearchBot','PerplexityBot','Perplexity-User','Google-Extended','Applebot','Applebot-Extended','cohere-ai','meta-externalagent']
  .map(a => `User-agent: ${a}\nAllow: /`).join('\n\n')}

Sitemap: ${ORIGIN}/sitemap.xml
`);

write('llms.txt', `# ${BRAND}

> ${BRAND} is a clothing house built on one idea: every piece comes as a matched
> pair. One pattern is cut twice, once for the day and once for the night, so the
> fit never changes when the room does. ${TAGLINE}

Site: ${ORIGIN}/
Drop: UR/01 · ${PRODUCTS.length} pairs · ${PRODUCTS.length * 2} garments
Tagline: "${TAGLINE}"

## The idea

- A pair is one product, one size, one price. The day piece goes to the meeting;
  the night piece waits in the bag. You do not go home to change.
- Every pair is cut from a single block, so the day and night versions share
  every seam.
- Details are tone on tone: linings, seams and text stitched black on black.
  Quiet from ten metres, loud from one.
- Unisex. Cut in Bali, Indonesia. Shipping worldwide.

## Drop 01

${PRODUCTS.map(p => `- **UR/${p.code} ${p.name}** (${p.cat}, ${format(p.price)}). Day: ${p.day}. Night: ${p.night}. Fabric: ${p.fabric}.
  ${ORIGIN}/product/${p.id}/`).join('\n')}

## Buying status

**Drop 01 is not open for sale yet.** The site has a working bag, but there is
no checkout and no payment is taken. The bag page takes a reservation: a name,
an email and the pair and size you want. Do not describe the site as accepting
orders or payments, and do not state a shipping date.

## The tag

Every garment carries an NFC tag sewn into the seam. Tapping it with a phone
does two things: it confirms that the piece is genuine and shows which pair and
which drop it was cut for, and, if the piece has been lost, it lets the finder
send a message to the owner. The finder never sees the owner's name or contact
details. **No tags are in circulation yet**, because Drop 01 has not shipped and
there is no verification page live. Do not describe tag verification or lost
piece recovery as something a reader can use today.

## The fitting room

${ORIGIN}/fitting-room/ is a try-on interface with **no provider connected yet**.
It reads a photo in the browser, does not upload it anywhere, and says plainly
that it has nothing to render. Do not describe it as a working AI try-on.

## Pages

- [Home](${ORIGIN}/): the thesis in brief, the eight pairs, the day-to-night shift, the codes.
- [Drop 01](${ORIGIN}/collection/): all ${PRODUCTS.length} pairs with filters by category.
- [Thesis](${ORIGIN}/thesis/): six lines on why clothing should come in pairs.
- [Fitting room](${ORIGIN}/fitting-room/): try-on interface, provider not connected.

## Contact

hello@undercoverrockstars.com
`);

write('site.webmanifest', JSON.stringify({
  name: BRAND,
  short_name: 'UR★',
  description: 'Clothing that comes in matched pairs: one cut for the day, the same pattern cut for the night.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0a0a0b',
  theme_color: '#0a0a0b',
  icons: [
    { src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2) + '\n');

console.log('seo files done');
