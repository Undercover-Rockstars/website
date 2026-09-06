#!/usr/bin/env node
/* Emits every page. Run: node tools/pages.js */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./build.js');
const D = require('../assets/ur-data.js');
const { PRODUCTS, CATEGORIES, SIZES, FITS, WAITLIST, format, priceOf } = D;
const { ORIGIN, BRAND, TAGLINE, esc, head, header, footer, foot, tile, ORG, SITE, SHIPPING, FEED, crumbs } = L;

const ROOT = path.join(__dirname, '..');
const CONTENTS = '1 day garment + 1 night garment';
const NOT_FOR_SALE = 'Drop 01 is not open for sale. There is no checkout, no cart API and ' +
  'no payment endpoint on this site, so neither a person nor an agent can buy anything today. ' +
  'The bag takes a reservation: a name, an email, and the pair and size wanted.';
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
  jsonld: { '@context': 'https://schema.org', '@graph': [ORG, SITE, FEED, {
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
        <p class="fit-note" style="margin-top:10px">Or <a href="/waitlist/">hold a place in the queue for ${WAITLIST.formatted}</a>. Paid places are served first when Drop 01 opens.</p>
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
      // Each entry carries price, sizes and availability, so one fetch of this
      // page answers what a shopping agent would otherwise crawl 8 pages for.
      mainEntity: { '@type': 'ItemList', numberOfItems: PRODUCTS.length,
        itemListElement: PRODUCTS.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, url: ORIGIN + '/product/' + p.id + '/', name: p.name,
          item: {
            '@type': 'Product', '@id': ORIGIN + '/product/' + p.id + '/#product',
            name: p.name, sku: 'UR-' + p.code, category: p.cat, url: ORIGIN + '/product/' + p.id + '/',
            size: SIZES, material: p.fabric,
            offers: {
              '@type': 'Offer', url: ORIGIN + '/product/' + p.id + '/',
              price: p.price, priceCurrency: D.CURRENCY,
              availability: 'https://schema.org/PreOrder',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@id': ORIGIN + '/#organization' }
            }
          } })) } },
    FEED,
    crumbs([{ name: BRAND, path: '/' }, { name: 'Drop 01', path: '/collection/' }])
  ] }
}) + header('collection') + `
<main id="main" class="page-pad">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/01 · <span id="filter-count">08</span> pairs · <span data-mode-lower>night</span> mode</p>
      <h1 class="h-page">Drop 01</h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">Eight pairs. Sixteen garments. Each pair is one pattern cut twice: once for the day, once for the night. Unisex. Cut in Bali. All sixteen carry an NFC tag in the seam, and every pair can be made to measure for 30% more.</p>
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
        mpn: 'UR-' + p.code,
        // One price, one size run, sold as a pair. An agent asking "what sizes,
        // what is in the box, is it real" gets all three without reading prose.
        size: SIZES,
        audience: { '@type': 'PeopleAudience', suggestedGender: 'unisex' },
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Contents', value: CONTENTS },
          { '@type': 'PropertyValue', name: 'Authenticity tag', value: 'NFC tag in the seam of both pieces' }
        ],
        offers: {
          '@type': 'Offer',
          url: ORIGIN + '/product/' + p.id + '/',
          price: p.price, priceCurrency: D.CURRENCY,
          // Drop 01 is not open for sale yet: the bag takes reservations, so
          // PreOrder is the honest availability rather than InStock.
          availability: 'https://schema.org/PreOrder',
          itemCondition: 'https://schema.org/NewCondition',
          shippingDetails: SHIPPING,
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
      <p class="eyebrow" style="margin-bottom:12px">Fit — <span id="fit-label">Standard sizing</span></p>
      <div class="fits" role="group" aria-label="Choose a fit">
${FITS.map((f, i) => `        <button type="button" data-fit="${f.id}" aria-pressed="${i === 0}"><span>${esc(f.name)}</span><span class="p">${format(priceOf(p, f.id))}${f.premium ? ' · +' + Math.round(f.premium * 100) + '%' : ''}</span></button>`).join('\n')}
      </div>
      <p class="fit-note" id="fit-note" style="margin-top:10px">${esc(FITS[0].note)}</p>
    </div>
    <div>
      <p class="eyebrow" style="margin-bottom:12px">Size — <span id="size-label">select</span></p>
      <div class="sizes" role="group" aria-label="Choose a size">
${SIZES.map(z => `        <button type="button" data-size="${z}" aria-pressed="false">${z}</button>`).join('\n')}
      </div>
      <p class="fit-note" id="size-hint" hidden style="margin-top:10px">The size closest to you. A made-to-measure pair is cut from your own measurements, taken after you reserve.</p>
    </div>
    <div style="display:grid;gap:8px">
      <button type="button" class="btn btn--lg" id="add-to-bag" disabled><span id="add-label">Select a size</span><span aria-hidden="true">→</span></button>
      <a class="btn btn--ghost" id="tryon" href="/fit/?pair=${p.id}&fit=tailored&from=product"><span>Try it on</span><span aria-hidden="true">◎</span></a>
      <button type="button" class="handoff-reveal" id="handoff-reveal" hidden>Show the code anyway</button>
      <div class="handoff-panel" id="handoff-panel" hidden>
        <p class="eyebrow" style="margin:0">Send this pair to your phone</p>
        <div class="handoff-qr" id="handoff-qr" role="img" aria-label="QR code that opens UR Fit with ${esc(p.name)} selected"></div>
        <p class="fit-note" style="max-width:46ch">Scan with a phone to open UR Fit with ${esc(p.name)} already selected. Finish on your phone: the bag and the reservation live on the device you started on, and nothing needs to sync.</p>
        <p class="fit-note" style="max-width:46ch">UR Fit explains made-to-measure and asks for no permissions. Measurement is not connected yet, so it captures nothing today.</p>
        <div class="handoff-url">
          <label class="sr-only" for="handoff-url">Link to UR Fit for this pair</label>
          <input id="handoff-url" readonly>
          <button type="button" id="handoff-copy">Copy</button>
        </div>
        <a class="handoff-open" id="handoff-open" href="/fit/?pair=${p.id}&fit=tailored&from=product">Open on this device →</a>
      </div>
    </div>
    <dl class="spec-table">
      <div><dt>Contents</dt><dd>1 day + 1 night</dd></div>
      <div><dt>Tag</dt><dd>NFC · both pieces</dd></div>
      <div><dt>Made to measure</dt><dd>+30% · ${format(priceOf(p, 'tailored'))}</dd></div>
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
` + footer() + foot(['/assets/ur-product.js', '/assets/vendor/qrcode-generator/qrcode.js', '/assets/ur-handoff.js']));
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

/* ------------------------------------------------------------------- fit */

/* Phase 0 of the fitting room v2 epic (#1): /fit/ is the honest shell of a
   body-scanning app whose scanner does not exist yet (#3), with the consent
   copy spelled out before any camera would ever open (#12). Nothing on this
   page may imply measurement works: no progress bar, no capture, and a
   disabled primary button that says why, the same posture as the waitlist's
   "Not open yet". */

write('fit/index.html', head({
  slug: 'fit',
  title: `UR Fit · ${BRAND}`,
  description: 'The fit app: two photos, your measurements, a made-to-measure pair cut from them. Measurement is not connected yet, so nothing is captured.',
  canonical: '/fit/',
  og: 'og-fit.png',
  manifest: '/fit/manifest.webmanifest',
  jsonld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': ORIGIN + '/fit/#webpage', url: ORIGIN + '/fit/',
      name: `UR Fit · ${BRAND}`, isPartOf: { '@id': ORIGIN + '/#website' }, inLanguage: 'en' },
    crumbs([{ name: BRAND, path: '/' }, { name: 'UR Fit', path: '/fit/' }])
  ] }
}) + header('fit') + `
<main id="main" class="page-pad">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/FIT · body scan · <span class="acc">measurement not connected</span></p>
      <h1 class="h-page">Cut from<br><span class="acc">you.</span></h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">Two photos, taken here on your phone. Your measurements, read on the device. A made-to-measure pair cut from the numbers. That is what this app becomes once measurement is connected. It is not connected yet, so today this page captures nothing.</p>
  </div>

  <div class="grid12" style="gap:48px var(--gap)">
    <div class="col-1-8">
      <div class="codes codes--tight">
${[
  { n: '01', h: 'Two photos', p: 'Front and side, in tight clothing or underwear. Photograph whatever you are comfortable with: the measurements need your shape, not your face or your room.' },
  { n: '02', h: 'Read on this phone', p: 'The measurement engine runs on this device. The camera is only asked for after you read the consent note below and accept it, never on arrival.' },
  { n: '03', h: 'Numbers, not photos', p: 'Your measurements are kept in this browser and travel with your reservation. The photos are discarded the moment they have been read, and one tap deletes the numbers, any time.' }
].map(s => `        <div class="code"><span class="eyebrow acc">${s.n}</span><h3>${esc(s.h)}</h3><p style="font-size:15px;color:var(--fg);line-height:1.6">${esc(s.p)}</p></div>`).join('\n')}
      </div>

      <div class="fit-consent">
        <p class="eyebrow">Consent, before anything captures</p>
        <p>When measurement is connected and you choose to begin, the camera takes two photos of you, front and side. They are processed on this device and never uploaded anywhere. They are thrown away as soon as your measurements have been read; only the numbers are kept, in this browser, and deleting them is one tap. Nothing is stored on a server, and a reservation email carries numbers, never images. If any of that ever changes, this note changes in the same commit. This app is for adults.</p>
      </div>

      <div class="fit-empty">
        <button type="button" class="btn btn--lg" disabled><span>Measurement is not connected yet</span><span aria-hidden="true">◎</span></button>
        <p class="fit-note">There is no scanner behind this button today, so it stays here, disabled. No camera is requested, nothing is captured, and no progress bar pretends otherwise. Reserve in the bag as usual: measurements are taken after you reserve, with or without the scan.</p>
      </div>
    </div>

    <div class="col-9-4">
      <div class="code" id="fit-app" style="min-height:0">
        <span class="eyebrow acc">The pair</span>
        <h2 style="margin:0;font-weight:700;text-transform:uppercase;font-size:18px;letter-spacing:.01em">Made to measure</h2>
        <p class="fit-note" id="fit-mode-chip" hidden>Measurement mode · opened from a product page with made to measure selected.</p>
        <div class="fit-pairs" role="group" aria-label="Choose a pair">
${PRODUCTS.map((p, i) => `          <button type="button" data-fit-product="${p.id}" aria-pressed="${i === 0}"><span>UR/${p.code} ${esc(p.name)}</span><span class="p">${format(p.price)}</span></button>`).join('\n')}
        </div>
        <p class="fit-note" style="margin-top:12px"><span id="fit-pair-name">${esc(PRODUCTS[0].name)}</span><br><span id="fit-pair-price"></span></p>
        <p class="fit-note">Every pair is cut to measure for 30% more than the listed price. Pick the size closest to you when you reserve; measurements are taken after you reserve, and the scan will be the start of that, not the end of it.</p>
      </div>

      <div class="code" id="fit-from" hidden style="min-height:0">
        <span class="eyebrow acc">Sent from a product page</span>
        <p class="fit-note">The bag and the reservation live on the device you started on, and nothing needs to sync. You can also reserve this pair right here: the bag works on any device.</p>
        <div style="display:grid;gap:8px;margin-top:12px">
          <a class="btn btn--ghost" id="fit-from-links" href="/product/${PRODUCTS[0].id}/"><span>Open the pair on this phone</span><span aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="/bag/"><span>Reserve in the bag</span><span aria-hidden="true">→</span></a>
        </div>
      </div>

      <div class="code" style="min-height:0">
        <span class="eyebrow acc">Installable</span>
        <p class="fit-note">Add this page to your home screen and UR Fit opens as its own app, separate from the shop. Once it has loaded here it opens again even with no signal. It asks for no permissions today.</p>
      </div>
    </div>
  </div>
</main>
` + footer() + foot(['/assets/ur-fit.js']));

console.log('fit app done');

/* The fit app gets its own manifest (#3): its own scope and start URL and its
   own name, so installing UR Fit does not install the whole shop. */
write('fit/manifest.webmanifest', JSON.stringify({
  name: 'UR Fit',
  short_name: 'UR Fit',
  description: 'The Undercover Rockstars fit app. Two photos, your measurements, a made-to-measure pair cut from them. Measurement is not connected yet.',
  start_url: '/fit/',
  scope: '/fit/',
  display: 'standalone',
  background_color: '#0a0a0b',
  theme_color: '#0a0a0b',
  icons: [
    { src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2) + '\n');

/* The service worker lives at /fit/sw.js so its scope is /fit/ and nothing
   else, and it is registered only by the fit page (#3, #8 in the brief's
   constraint list). It caches the app shell for a second visit with no
   signal and never touches /api/*. Bump SHELL_VERSION to retire old caches. */
write('fit/sw.js', `/* UR Fit service worker. Generated by tools/pages.js, do not edit by hand.
 *
 * Scope is /fit/ only, because the file sits at /fit/sw.js. The marketing
 * pages are not controlled or cached by this worker on purpose: they change
 * with every deploy and are cache-busted by tools/build-dist.sh, and a worker
 * that wedged the shop would be a worse outcome than no worker.
 *
 * Network-first for navigations with the cached shell as the offline
 * fallback; stale-while-revalidate for same-origin assets; the API is never
 * cached or intercepted.
 */
'use strict';

const SHELL_VERSION = 'v1';
const SHELL_CACHE = 'ur-fit-' + SHELL_VERSION;
const NAV_FALLBACK = '/fit/';
const SHELL_ASSETS = [
  '/fit/',
  '/fit/manifest.webmanifest',
  '/assets/ur.css',
  '/assets/ur-data.js',
  '/assets/ur-common.js',
  '/assets/ur-fit.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      return k === SHELL_CACHE ? null : caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Reservations and the waitlist must always reach the network or fail
  // loudly. Never cached, never synthesized from a cache.
  if (url.pathname.indexOf('/api/') === 0) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  var cache = await caches.open(SHELL_CACHE);
  try {
    var fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    // Offline: fall back to the cached shell, ignoring any ?pair= query.
    var hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    var shell = await cache.match(NAV_FALLBACK);
    if (shell) return shell;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  var cache = await caches.open(SHELL_CACHE);
  // The dist build stamps assets with ?v=, so match on the path alone.
  var hit = await cache.match(request, { ignoreSearch: true });
  var refresh = fetch(request).then(function (response) {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(function () { return null; });
  if (hit) return hit;
  var fresh = await refresh;
  if (fresh) return fresh;
  return new Response('offline', { status: 503, statusText: 'Offline' });
}
`);

/* --------------------------------------------------------------- waitlist */

write('waitlist/index.html', head({
  slug: 'waitlist',
  title: `Waitlist · ${BRAND}`,
  description: `Drop 01 is not open yet. ${WAITLIST.formatted} holds a numbered place in the queue, paid places are served first, and it comes off your first pair.`,
  canonical: '/waitlist/',
  og: 'og-waitlist.png',
  jsonld: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': ORIGIN + '/waitlist/#webpage', url: ORIGIN + '/waitlist/',
      name: `Waitlist · ${BRAND}`, isPartOf: { '@id': ORIGIN + '/#website' }, inLanguage: 'en' },
    { '@type': 'Product', '@id': ORIGIN + '/waitlist/#place',
      name: WAITLIST.name, category: 'Waitlist place',
      description: WAITLIST.perks.join(' ') + ' ' + WAITLIST.terms,
      brand: { '@type': 'Brand', name: BRAND },
      offers: {
        '@type': 'Offer', url: ORIGIN + '/waitlist/',
        price: WAITLIST.amount, priceCurrency: WAITLIST.currency,
        // PreOrder until a processor is connected: the offer is real, but it
        // cannot be completed yet, and saying InStock would be a lie.
        availability: WAITLIST.live ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        seller: { '@id': ORIGIN + '/#organization' }
      } },
    crumbs([{ name: BRAND, path: '/' }, { name: 'Waitlist', path: '/waitlist/' }])
  ] }
}) + header('waitlist') + `
<main id="main" class="page-pad">
  <div class="grid12 collection-head">
    <div class="col-1-8">
      <p class="eyebrow" style="margin-bottom:20px">UR/01 · waitlist · ${WAITLIST.formatted}</p>
      <h1 class="h-page">Hold your<br><span class="acc">place.</span></h1>
    </div>
    <p class="lede col-9-4" style="font-size:15px">Drop 01 is eight pairs and sixteen garments, and it is not open yet. ${WAITLIST.formatted} holds a numbered place in the queue for it.</p>
  </div>

  <div class="grid12" style="gap:48px var(--gap)">
    <div class="col-1-8">
      <div class="codes codes--tight">
${WAITLIST.perks.map((t, i) => `        <div class="code"><span class="eyebrow acc">${String(i + 1).padStart(2, '0')}</span><p style="font-size:15px;color:var(--fg);line-height:1.5">${esc(t)}</p></div>`).join('\n')}
      </div>
      <p class="fit-note" style="margin-top:20px;max-width:60ch">${esc(WAITLIST.terms)}</p>
      <p class="fit-note" style="margin-top:10px;max-width:60ch">Payment is taken by Stripe on Stripe's own page. No card details are entered on this site, and none are stored here.</p>
    </div>

    <div class="col-9-4">
      <div class="code" style="min-height:0">
        <span class="eyebrow acc">Waitlist</span>
        <h2 style="margin:0;font-weight:700;text-transform:uppercase;font-size:18px;letter-spacing:.01em">${WAITLIST.formatted} · one place</h2>
        <p class="fit-note" id="wl-paid" hidden style="border:1px solid var(--acc);padding:12px 14px;color:var(--fg)">Paid. Your place is held and the receipt is on its way. We will write before the drop opens.</p>
        <form id="wl-form" novalidate style="display:grid;gap:12px">
          <label class="sr-only" for="wl-email">Email</label>
          <input id="wl-email" name="email" type="email" required placeholder="you@somewhere.com" autocomplete="email" style="background:none;border:1px solid var(--line);outline:0;padding:14px 16px;color:var(--fg);font-size:15px">
          <div class="hp" aria-hidden="true"><label>Company<input id="wl-company" name="company" tabindex="-1" autocomplete="off"></label></div>
          <button type="submit" class="btn" id="wl-submit"${WAITLIST.live ? '' : ' disabled'}><span id="wl-label">${WAITLIST.live ? 'Hold my place · ' + WAITLIST.formatted : 'Not open yet'}</span><span aria-hidden="true">→</span></button>
        </form>
        <p class="fit-note" id="wl-err" hidden></p>
${WAITLIST.live ? '' : `        <p class="fit-note">No payment processor is connected yet, so nothing can be charged today and nothing is being collected. Write to <a href="mailto:hello@undercoverrockstars.com">hello@undercoverrockstars.com</a> and we will note you by hand.</p>`}
        <p class="fit-note">One place per address. Reserving a pair in the <a href="/bag/">bag</a> stays free.</p>
      </div>
    </div>
  </div>
</main>
` + footer() + foot(['/assets/ur-waitlist.js']));

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
    <p class="lede col-9-4" style="font-size:15px">Drop 01 is not open for sale yet. Reserve your pair, size and fit and we will contact you the moment it opens. No payment is taken here.</p>
  </div>

  <div class="grid12" style="gap:48px var(--gap)">
    <div class="col-1-8">
      <div class="bag-body" id="bag-page-body" style="overflow:visible"></div>
      <div class="bag-foot" style="margin-top:8px">
        <div class="bag-total"><span>Total</span><span id="bag-page-total">$0</span></div>
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
        <p class="fit-note">Reserving is free and does not hold a place in the queue. A <a href="/waitlist/">${WAITLIST.formatted} waitlist place</a> is served first when the drop opens.</p>
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

console.log('waitlist, bag, 404 done');

/* -------------------------------------------------------------- seo files */

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: '/', pri: '1.0', freq: 'weekly' },
  { loc: '/collection/', pri: '0.9', freq: 'weekly' },
  ...PRODUCTS.map(p => ({ loc: `/product/${p.id}/`, pri: '0.8', freq: 'monthly' })),
  { loc: '/thesis/', pri: '0.7', freq: 'monthly' },
  { loc: '/fit/', pri: '0.6', freq: 'monthly' },
  { loc: '/waitlist/', pri: '0.8', freq: 'monthly' }
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${ORIGIN}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);

write('robots.txt', `# ${BRAND} · ${ORIGIN}
# Answer engines and AI crawlers are welcome. /llms.txt carries a structured,
# plain-text summary written for machine readers, and /catalogue.json carries the
# whole drop as JSON: prices, sizes, availability and buying status.

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

## Fits

Every pair comes two ways, from the same pattern and the same size run:

- **Standard sizing**, XS to XL, at the listed price.
- **Made to measure**, cut to the buyer's own measurements, at **30% more**.
  The buyer picks the closest size when reserving; measurements are taken after.

Both prices are listed on each product page and in /catalogue.json, per pair.
Quote the standard price unless the buyer asks about tailoring.

## Buying status

**Drop 01 is not open for sale yet.** The site has a working bag, but there is
no checkout for garments and no payment is taken for them. The bag page takes a
reservation: a name, an email, and the pair, size and fit wanted. Do not
describe the site as accepting orders or payments for garments, and do not state
a shipping date.

The one payable item is the **${WAITLIST.formatted} waitlist place** at
${ORIGIN}/waitlist/: a numbered place in the queue for Drop 01, served first
when it opens, credited against the first pair. It is not a pair, a size or a
fit, and it is **not refundable**.${WAITLIST.live ? '' : ' Right now no payment\nprocessor is connected, so even this cannot be charged yet and the page says so.'}

## The tag

Every garment carries an NFC tag sewn into the seam. Tapping it with a phone
does two things: it confirms that the piece is genuine and shows which pair and
which drop it was cut for, and, if the piece has been lost, it lets the finder
send a message to the owner. The finder never sees the owner's name or contact
details. **No tags are in circulation yet**, because Drop 01 has not shipped and
there is no verification page live. Do not describe tag verification or lost
piece recovery as something a reader can use today.

## The fit app

${ORIGIN}/fit/ is the shell of a body-scanning app, and the scanner does not
exist yet. The page explains what measurement will do when connected: two
photos taken on your phone, processed on the device and never uploaded, photos
discarded once the numbers are read, numbers kept in the browser and deletable
in one tap, adults only. It shows a disabled begin button that says measurement
is not connected, it captures nothing and it requests no camera permission.
Do not describe it as working body scanning, AI sizing or a working try-on.
Product pages hand off to it as ${ORIGIN}/fit/?pair=<pair id>&fit=tailored&from=product.
The old /fitting-room/ try-on page is retired and redirects here.

## For shopping agents

The whole drop is one JSON document: ${ORIGIN}/catalogue.json. It carries every
pair with price, currency, sizes, fabric, contents, availability and a
\`purchasable\` field, plus shipping, the NFC tag and the buying status. It is
served with \`Access-Control-Allow-Origin: *\`, so it can be fetched from a
browser context. Every page also links it as \`rel="alternate"\`, each product
page carries schema.org \`Product\` with \`Offer\`, sizes and shipping, and
${ORIGIN}/collection/ carries the same eight products inside one \`ItemList\`,
so a single fetch answers most questions without crawling.

What an agent can do here: quote pairs, prices, sizes, fabrics and materials;
say what a pair contains; explain that the piece carries an NFC tag; point a
buyer at the fit app with a pair preselected
(\`${ORIGIN}/fit/?pair=<pair id>&fit=tailored&from=product\`), which describes
made-to-measure honestly; and hand the buyer ${ORIGIN}/bag/ or
hello@undercoverrockstars.com.

What an agent cannot do here: **buy a garment.** There is no checkout for the
pairs, no cart API and no order status. The only payable item is the
${WAITLIST.formatted} waitlist place${WAITLIST.live ? '' : ', and no processor is connected yet, so it cannot be charged today either'}.
\`POST /api/contact\` (reservations) and \`POST /api/waitlist\` (the place) back the
site's own forms, are locked to this origin and are gated by Turnstile: neither
is an order API and neither should be called by an agent. No returns policy is
published for garments, so do not state one. Shipping is the one commercial term
that is published: complimentary worldwide, 3 to 5 days in transit.

## Pages

- [Home](${ORIGIN}/): the thesis in brief, the eight pairs, the day-to-night shift, the codes.
- [Drop 01](${ORIGIN}/collection/): all ${PRODUCTS.length} pairs with filters by category.
- [Thesis](${ORIGIN}/thesis/): six lines on why clothing should come in pairs.
- [UR Fit](${ORIGIN}/fit/): the fit app. Body-scan shell, measurement not connected, captures nothing.
- [Waitlist](${ORIGIN}/waitlist/): ${WAITLIST.formatted} for a numbered place in the queue for Drop 01.
- [Catalogue](${ORIGIN}/catalogue.json): the whole drop as JSON, for agents and feeds.

## Contact

hello@undercoverrockstars.com
`);

/* One JSON document that answers what a shopping agent actually asks: what is
   for sale, at what price, in what sizes, and can it be bought right now. The
   answer to the last one is no, so `purchasable` is a first-class field rather
   than something to infer from prose. Generated from the same ur-data.js as the
   pages, so the two cannot drift. */
write('catalogue.json', JSON.stringify({
  brand: BRAND,
  site: ORIGIN + '/',
  drop: 'UR/01',
  generated: today,
  documentation: ORIGIN + '/llms.txt',
  currency: D.CURRENCY,
  purchasable: false,
  status: {
    forSale: false,
    payableItems: WAITLIST.live ? [ORIGIN + '/waitlist/'] : [],
    availability: 'https://schema.org/PreOrder',
    note: NOT_FOR_SALE,
    checkoutUrl: null,
    paymentAccepted: false,
    reserveUrl: ORIGIN + '/bag/',
    reservationApi: null,
    apiNote: 'POST /api/contact (reservations) and POST /api/waitlist (the ' +
      WAITLIST.formatted + ' place) exist for the site\'s own forms. Both are locked to this ' +
      'origin and gated by Turnstile, neither is an order API, and agents should not call ' +
      'them. Send the buyer to ' + ORIGIN + '/bag/, ' + ORIGIN + '/waitlist/ or to ' +
      'hello@undercoverrockstars.com.'
  },
  sizes: SIZES,
  categories: CATEGORIES.filter(c => c !== 'All'),
  fits: FITS.map(f => ({ id: f.id, name: f.name, premiumPercent: Math.round(f.premium * 100), note: f.note })),
  waitlist: {
    url: ORIGIN + '/waitlist/',
    name: WAITLIST.name,
    amount: WAITLIST.amount,
    currency: WAITLIST.currency,
    // The one payable thing on this site, and only once a processor is wired up.
    purchasable: WAITLIST.live,
    live: WAITLIST.live,
    perks: WAITLIST.perks,
    terms: WAITLIST.terms,
    note: WAITLIST.live
      ? 'Paid by card on Stripe. The site never sees card details.'
      : 'The offer is published but no payment processor is connected yet, so nothing can be charged today.'
  },
  shipping: { cost: 0, currency: D.CURRENCY, destination: 'worldwide', transitDays: [3, 5] },
  returnPolicy: { published: false, note: 'No returns policy is published yet. Do not state one.' },
  tag: {
    type: 'NFC',
    perGarment: true,
    purpose: ['authenticity check', 'lost piece returned to its owner without exposing the owner'],
    live: false,
    note: 'Tags travel with the garments. Drop 01 has not shipped, there is no verification URL yet, and nothing is in circulation to tap.'
  },
  fittingRoom: { url: ORIGIN + '/fit/', app: 'UR Fit', measurementConnected: false, captures: 'nothing',
    movedFrom: ORIGIN + '/fitting-room/',
    note: 'The shell of a body-scanning app whose scanner does not exist yet. It explains what measurement will do, keeps its begin button disabled, and captures nothing. Do not describe it as working body scanning, AI sizing or a working try-on.' },
  contact: 'hello@undercoverrockstars.com',
  products: PRODUCTS.map(p => ({
    id: p.id,
    sku: 'UR-' + p.code,
    code: p.code,
    name: p.name,
    url: ORIGIN + '/product/' + p.id + '/',
    image: ORIGIN + '/assets/og-' + p.id + '.png',
    category: p.cat,
    price: p.price,
    currency: D.CURRENCY,
    priceFormatted: format(p.price),
    fits: FITS.map(f => ({
      id: f.id, name: f.name,
      premiumPercent: Math.round(f.premium * 100),
      price: priceOf(p, f.id), priceFormatted: format(priceOf(p, f.id))
    })),
    availability: 'https://schema.org/PreOrder',
    purchasable: false,
    sizes: SIZES,
    unisex: true,
    contents: CONTENTS,
    day: p.day,
    night: p.night,
    fabric: p.fabric,
    madeIn: 'Bali, Indonesia',
    countryOfOrigin: 'ID',
    nfcTag: true,
    description: p.desc
  }))
}, null, 2) + '\n');

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
