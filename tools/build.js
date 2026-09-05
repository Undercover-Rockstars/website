#!/usr/bin/env node
/* Generates every page of the site from assets/ur-data.js.
 *
 * The Claude Design source was a single-page app: one HTML file that swapped
 * screens from component state. That is bad for a shop, because nothing is
 * indexable and there is no URL for a product. This emits real pages instead,
 * with the bag and the day/night mode kept in localStorage so they survive
 * navigation.
 *
 *   node tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'assets/ur-data.js'));
const { PRODUCTS, CATEGORIES, SIZES, format } = D;

const ORIGIN = 'https://undercoverrockstars.com';
const BRAND = 'Undercover Rockstars';
const TAGLINE = 'Everyone has a rockstar undercover.';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAV = [
  { href: '/collection/',   label: 'Drop 01', key: 'collection' },
  { href: '/thesis/',       label: 'Thesis',  key: 'thesis' },
  { href: '/fitting-room/', label: 'Fitting room', key: 'fitting' },
  { href: '/waitlist/',     label: 'Waitlist', key: 'waitlist', accent: true },
  { href: '/#signal',       label: 'Signal',  key: 'signal' },
];

/* ------------------------------------------------------------------ head */

function head({ slug, title, description, canonical, og, jsonld, scripts = [], noindex = false }) {
  const url = ORIGIN + canonical;
  const image = ORIGIN + '/assets/' + (og || 'og.png');
  const ld = jsonld
    ? `\n<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>` : '';
  return `<!DOCTYPE html>
<html lang="en" data-mode="night">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
<meta name="theme-color" content="#0a0a0b">
<meta name="color-scheme" content="dark light">

<meta property="og:type" content="${slug === 'product' ? 'product' : 'website'}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">

<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<link rel="alternate" type="application/json" href="/catalogue.json" title="Product catalogue">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/ur.css">
<script>/* set the saved mode before first paint so the page never flashes */
(function(){try{var m=JSON.parse(localStorage.getItem('ur.mode'));if(m==='day'||m==='night')document.documentElement.setAttribute('data-mode',m);}catch(e){}})();</script>${ld}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>
<div class="backdrop" aria-hidden="true"></div>
`;
}

/* ---------------------------------------------------------------- chrome */

const WORDMARK = `<span>U</span><span class="veil">ndercover</span><span class="veil gap">&nbsp;</span><span>R</span><span class="veil">ockst</span><span class="star" aria-hidden="true">★</span><span class="veil">rs</span>`;

function header(current) {
  const links = NAV.map(n =>
    `<a href="${n.href}"${n.key === current ? ' aria-current="page"' : ''}${n.accent && n.key !== current ? ' style="color:var(--acc)"' : ''}>${n.label}</a>`
  ).join('\n    ');
  return `<header class="site-header">
  <a class="wordmark" href="/" aria-label="${BRAND}, home">${WORDMARK}</a>
  <nav class="site-nav" aria-label="Primary">
    ${links}
  </nav>
  <div class="header-right">
    <button type="button" class="btn-mode" data-mode-toggle aria-label="Switch between day and night mode">
      <span class="led" aria-hidden="true"></span>
      Mode <span class="mute">/</span> <span data-mode-label>Night</span>
    </button>
    <button type="button" class="btn-bag" data-bag-open>
      Bag <span data-bag-count>00</span>
      <span class="sr-only" data-bag-count-label>0 items in your bag</span>
    </button>
  </div>
</header>
`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="footer-cols">
    <div>
      <p class="footer-mark">Undercover<br>Rockst<span class="acc">★</span>rs</p>
    </div>
    <nav aria-label="Drop">
      <span class="mute">Drop</span>
      <a href="/collection/">UR/01</a>
      <a href="/collection/?cat=Blazer">Blazers</a>
      <a href="/collection/?cat=Knit">Knitwear</a>
    </nav>
    <nav aria-label="House">
      <span class="mute">House</span>
      <a href="/thesis/">Thesis</a>
      <a href="/fitting-room/">Fitting room</a>
      <a href="/waitlist/">Waitlist</a>
      <a href="/#signal">Signal</a>
    </nav>
    <nav aria-label="Channels">
      <span class="mute">Channels</span>
      <a href="mailto:hello@undercoverrockstars.com">Mail</a>
      <a href="/bag/">Bag</a>
    </nav>
  </div>
  <p class="footer-legal">
    <span>undercoverrockstars.com · UR/01</span>
    <span class="fz-credit"><a href="https://factory0.ventures" rel="noopener">
      <svg class="fz-ring" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.1" fill="none" stroke="#FF5A36" stroke-width="1.9" stroke-dasharray="28.7 9.6"/></svg>
      <span>&copy; ${new Date().getFullYear()} Factory Zero</span>
    </a></span>
    <span><span data-mode-time>03:00</span> · <span data-mode-label>Night</span> mode</span>
  </p>
</footer>
`;
}

function bagDrawer() {
  return `<button type="button" class="scrim" id="bag-scrim" hidden aria-label="Close bag"></button>
<aside class="bag" id="bag" hidden aria-label="Bag">
  <div class="bag-head">
    <span>Bag · <span data-bag-count>00</span></span>
    <button type="button" data-bag-close>Close</button>
  </div>
  <div class="bag-body" id="bag-body"></div>
  <div class="bag-foot">
    <div class="bag-total"><span>Total</span><span id="bag-total">$0</span></div>
    <a class="btn" id="bag-checkout" href="/bag/"><span>Review bag</span><span aria-hidden="true">→</span></a>
  </div>
</aside>
`;
}

function foot(scripts = []) {
  const tags = ['/assets/ur-data.js', '/assets/ur-common.js', ...scripts]
    .map(s => `<script src="${s}"${s.endsWith('ur-fitting.js') ? ' type="module"' : ''}></script>`).join('\n');
  return bagDrawer() + '\n' + tags + '\n</body>\n</html>\n';
}

/* ----------------------------------------------------------------- tiles */

function tile(p, tall) {
  return `      <a class="tile${tall ? ' tile--tall' : ''}" href="/product/${p.id}/" data-cat="${esc(p.cat)}">
        <span class="tile-head"><span>UR/${p.code}</span><span class="cat">${esc(p.cat)} · Pair · 2 pcs</span></span>
        <span class="tile-swatches" aria-hidden="true"><span>[ day ]</span><span>[ night ]</span></span>
        <span class="tile-foot">
          <span class="tile-name"><span>${esc(p.name)}</span><span class="price">${format(p.price)}</span></span>
          <span class="tile-spec spec-day">Day / ${esc(p.day)}</span>
          <span class="tile-spec spec-night">Night / ${esc(p.night)}</span>
        </span>
      </a>`;
}

/* ------------------------------------------------------------- json-ld */

const ORG = {
  '@type': 'Organization',
  '@id': ORIGIN + '/#organization',
  name: BRAND,
  url: ORIGIN + '/',
  slogan: TAGLINE,
  description: 'A clothing house that sells matched pairs: one piece cut for the day, the same pattern cut for the night.',
  logo: { '@type': 'ImageObject', url: ORIGIN + '/assets/icon-512.png', width: 512, height: 512 },
  image: ORIGIN + '/assets/og.png',
  sameAs: ['https://github.com/Undercover-Rockstars']
};
const SITE = {
  '@type': 'WebSite',
  '@id': ORIGIN + '/#website',
  url: ORIGIN + '/',
  name: BRAND,
  inLanguage: 'en',
  publisher: { '@id': ORIGIN + '/#organization' }
};
/* Everything below is stated in visible copy too: the product spec table says
   "Worldwide · 3–5 days" and the bag page says shipping is complimentary. Do not
   add a returns policy here: the site does not publish one, and inventing one in
   markup would answer an agent's question with a fact nobody decided. */
const SHIPPING = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 5, unitCode: 'DAY' }
  }
};
const FEED = {
  '@type': 'DataFeed',
  '@id': ORIGIN + '/catalogue.json#feed',
  url: ORIGIN + '/catalogue.json',
  name: BRAND + ' product catalogue',
  description: 'Every pair in Drop 01 as JSON: price, sizes, fabric, availability and buying status.',
  encodingFormat: 'application/json',
  inLanguage: 'en',
  isAccessibleForFree: true,
  creator: { '@id': ORIGIN + '/#organization' }
};
const crumbs = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: ORIGIN + it.path
  }))
});

module.exports = { ORIGIN, BRAND, TAGLINE, esc, head, header, footer, foot, tile, ORG, SITE, SHIPPING, FEED, crumbs, NAV };
