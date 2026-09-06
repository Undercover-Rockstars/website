<p align="center">
  <img src="assets/readme-banner.png" alt="Undercover Rockstars. Everyone has a rockstar undercover." width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/DROP-01-FF3B30?style=flat-square&labelColor=0A0A0B" alt="Drop 01">
  <img src="https://img.shields.io/badge/PAIRS-08-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="8 pairs">
  <img src="https://img.shields.io/badge/PAGES-15-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="15 pages">
  <img src="https://img.shields.io/badge/BUILD%20STEP-NONE-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="No build step">
  <img src="https://img.shields.io/badge/DEPS-VENDORED%20%C2%B7%20NO%20CDN-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="Dependencies vendored, no CDN">
</p>

<p align="center"><b>undercoverrockstars.com</b> · UR/01</p>

---

# The house

Undercover Rockstars makes clothing for people who live two lives in one day.
Every piece comes as a matched pair: one for the meeting, one for what comes
after.

> **The day is the disguise.**
> By day: founder, executive, designer. By night: the rockstar.
> The suit coordinates the room. The jacket coordinates the night.

### The system

| | |
| :--- | :--- |
| One pattern, two fabrics | Every pair is cut from a single block, so the day and night versions share every seam and the fit never changes when the world does. |
| Sold together, worn apart | A pair is one product, one size, one price. The day piece goes to the meeting; the night piece waits in the bag. |
| Black on black | Lyrics, marks and monograms stitched tone on tone. Quiet from ten metres, loud from one. |
| Tap to answer | Every garment has an NFC tag in the seam. It proves the piece is genuine, and if one goes missing at 4am the finder can reach the owner through it without ever seeing who they are. |

### Drop 01

Eight pairs, sixteen garments. Unisex, cut in Bali. Every pair comes two ways:
standard sizing at the listed price, or **made to measure at 30% more**, cut
from the buyer's own measurements. The premium lives in `FITS` in
`assets/ur-data.js` and everything else prices through `priceOf()`, so the
product page, the bag, the feed and the reservation email cannot quote different
money.

| | Pair | Category | Day | Night | Price |
| :--- | :--- | :--- | :--- | :--- | ---: |
| UR/01 | The Boardroom Pair | Blazer | Charcoal wool, clean notch lapel | Same cut in black, satin-faced lapel | $2,290 |
| UR/02 | After Hours Pair | Jacket | Structured, unlined, stone grey | Bonded black with a zipped storm flap | $2,850 |
| UR/03 | Two-Face Pair | Shirt | Crisp oxford white | Ink black, same collar, same cuff | $1,180 |
| UR/04 | Backstage Pair | Knit | Fine-gauge crew | Same crew, hand-distressed hem and cuffs | $1,390 |
| UR/05 | Double Life Pair | Jacket | Charcoal flannel, tonal buttons | Charcoal flannel, signal-red lining | $1,590 |
| UR/06 | Encore Pair | Blazer | Soft-shoulder double-breasted, navy | Oversized black, worn as a coat | $2,650 |
| UR/07 | Quiet Riot Pair | Shirt | Plain black poplin | Lyrics stitched tone on tone | $1,120 |
| UR/08 | Curtain Call Pair | Knit | Slim turtleneck, closed seams | Same turtleneck, slashed shoulder seams | $1,480 |

---

# The site

Static HTML, CSS and vanilla JavaScript. **No build step to develop, no
framework, nothing loaded from a CDN.** Serve the repo root and it runs.
When a problem genuinely needs a library (the QR encoder in the fit-app
handoff was the first, MediaPipe's pose runtime for the fit scanner is the
second), the file is vendored into `assets/vendor/` with its version,
licence and checksum recorded in `assets/vendor/README.md`. That posture
was decided once, in #3, so dependencies do not drift in one script tag at
a time.

Implemented from the Claude Design source `Undercover Rockstars v3.dc.html`,
which targets the `dc-runtime` preview environment (`<x-dc>` templates, `{{ }}`
bindings, `<sc-for>` / `<sc-if>`, a React `DCLogic` class). That runtime is a
design-time dependency, so the logic was ported to plain JavaScript.

### From one page to fourteen

The design source is a **single-page app**: one HTML file that swapped screens
from component state. For a shop that is the wrong shape, because nothing is
indexable and there is no URL for a product. This is a real multi-page site:

```
/                     home
/collection/          Drop 01, filterable
/product/<id>/        one page per pair, ×8
/thesis/              the manifesto
/fit/                 UR Fit, the fit app (installable, /fit/ scope)
/waitlist/            the $9 place in the queue
/bag/                 bag and reservation (noindex)
```

The two pieces of state that have to survive navigation — the bag and the
day/night mode — live in `localStorage`. Mode is applied before first paint by a
tiny inline script, so the page never flashes the wrong theme.

### Layout

```
assets/
  ur-data.js          ← the drop lives here (single source of truth)
  ur.css              design system, day/night via [data-mode]
  ur-common.js        theme, wordmark collapse, bag, drawer, toast
  ur-collection.js    category filters
  ur-product.js       size selection, add to bag
  ur-fit.js           /fit/ app shell: pair preselect, scan flow, service worker
  ur-capture.js       the guided two-photo shoot (#4): guide, timer, review
  ur-measure.js       the measurement engine (#5): measure() and its pure core
  ur-profile.js       review, correct, tape-check, save, delete, attach (#6)
  ur-handoff.js       Try it on QR handoff on product pages
  ur-signal.js        newsletter
  ur-bag.js           reservation form
  ur-waitlist.js      waitlist checkout hand-off
  vendor/             vendored dependencies (version + licence + checksum)
  og*.png             one Open Graph card per page (generated)
fit/
  index.html          the fit app (generated)
  manifest.webmanifest its own manifest, UR Fit, scoped to /fit/ (generated)
  sw.js               service worker, /fit/ scope only (generated)
functions/api/
  contact.js          reservations and signups
  waitlist.js         Stripe Checkout Session for the $9 place
tools/
  pages.js            generates every page from ur-data.js
  build.js            shared layout, head, chrome, JSON-LD
  test-measure.js     the measurement fixture test: node tools/test-measure.js
  og-render.html      OG card and banner template
  render-og.sh        regenerates every raster asset
  build-dist.sh       assembles dist/ (allowlist + cache-bust stamping)
```

### Editing the drop

Everything is data. Edit `assets/ur-data.js`, then:

```sh
node tools/pages.js      # regenerates all 14 pages, the sitemap and llms.txt
./tools/render-og.sh     # regenerates the OG cards (needs Chrome)
```

### Run it locally

```sh
python3 -m http.server 8100
# → http://127.0.0.1:8100/
```

### What I did not ship, and why

Two things in the design prototype would have been dishonest on a live,
public, indexed shop. Both are implemented, but honestly.

**1. The checkout collected card details and did nothing with them.**
The source has a full checkout form (card number, MM/YY, CVC) whose submit
handler only sets `ordered: true`. There is no processor, no PCI handling and
no order anywhere. Shipping that would take payment details under false
pretenses.

Instead, Drop 01 is **not open for sale**, and the site says so. The bag works
fully, and `/bag/` takes a *reservation* — name, email, pair and size — with no
payment fields anywhere on the site. Product JSON-LD uses
`availability: PreOrder` rather than `InStock` to match. Wire a real processor
and the checkout can replace the reservation form.

**2. The fitting room returned your own photo as an "AI render".**
The source's `tryon.js` waited through six fake progress steps and then returned
the input photo unchanged. A visitor would reasonably believe they were seeing
themselves in the garment.

The honest version shipped first as a fitting room that read the photo in the
browser and said *"No provider connected — we are not going to hand your own
photo back and call it a render."* That page is now retired (the old
`/fitting-room/` URL 301s to `/fit/`), and its successor is **UR Fit**, now in
phase 1 of the fitting room v2 epic (issue #1): a real on-device scanner with
the privacy deal unchanged from the phase 0 shell.

- `/fit/` asks for consent first, in one paragraph, and the engine (a vendored
  MediaPipe pose model, about 17 MB) loads only after consent and a tap on
  Begin, never on arrival. The page stays as fast to read as it was before
  the scanner existed.
- The shoot (#4): setup notes, a remembered height in cm or ft/in, a live
  pose guide with spoken-plain feedback, auto-capture after a steady second
  or a beeped 3s timer, review, retake. Portrait only, front or rear camera.
- The measurement (#5): `URMeasure.measure({ front, side, heightCm })`, the
  swappable hook a vendor scanner could replace. Landmarks find the measuring
  lines; widths and depths are scanned from the segmentation mask, because
  landmarks are joint centres, not body edges; circumferences assume an
  ellipse and say so. Every value carries a confidence, low values are
  flagged, and `tools/test-measure.js` proves the pixels-to-centimetres path
  on synthetic shapes whose dimensions are known.
- The profile (#6): every value on a body diagram, correctable with tape
  hints, a tape-check mode that prints the scan-vs-tape difference line by
  line for the spike in #5, saved as numbers under `ur.profile.v1` (never
  photos), one tap to delete, and attached to made-to-measure reservations,
  where the endpoint validates it like the bag: numbers in sane human ranges
  or the whole profile is dropped, never emailed.
- Photos never leave the device (issue #12's promise, kept and published in
  `llms.txt` and `catalogue.json`): frames go canvas to engine to wiped. The
  site still says a phone scan is an estimate, not a tape, and measurements
  are confirmed after you reserve.
- "Try it on" on a product page hands off to the phone: a QR code on a
  desktop (rendered client-side as SVG by a vendored encoder, so the URL
  never leaves the page), a plain link on a phone, with "show the code
  anyway" so no device is trapped in the wrong branch.
- It is an installable PWA with its own manifest (`UR Fit`, scope `/fit/`,
  so installing it does not install the shop) and a service worker scoped
  to `/fit/` only: network-first for pages, stale-while-revalidate for
  assets, `/api/*` never touched, the shell precached and the ~17 MB
  engine cached on demand after its first use, never in `install`. The
  marketing pages are deliberately outside its control.

The consent note on `/fit/` states the privacy deal in one paragraph, and the
deal and the note change in the same commit or not at all (issue #12).

### Other deviations from the source

- **`style-hover`** — the source sets `style-hover="..."` on tiles, buttons and
  links, but `dc-runtime` implements no such attribute, so none of those hovers
  ever fired. Reimplemented as real CSS `:hover`.
- **Responsive** — the source is desktop-only (12-column grids, four-across
  tiles, 7fr/5fr splits). Added breakpoints at 1100, 900 and 700px.

### The waitlist, and the only money on this site

`/waitlist/` sells one thing: a **$9 place in the queue** for Drop 01. Numbered
place, paid places served first when the drop opens, credited against the first
pair, **not refundable**. The amount and every promise made about it live in
`WAITLIST` in `assets/ur-data.js`, so the page, `catalogue.json`, `llms.txt` and
the Stripe line item say one thing.

Prices across the site are US dollars. The numbers did not move when the
currency did: this is a currency change, not an FX conversion, so `$2,290` is
the same 2290 the design shipped with. `CURRENCY` and `format()` in
`assets/ur-data.js` are the only two places that decide it.

**No card field exists anywhere on this site.** `functions/api/waitlist.js`
creates a Stripe Checkout Session and returns its URL; the card is entered on
Stripe. The amount is fixed server-side, so a tampered payload cannot change
what is charged. The endpoint is origin-locked, honeypotted and Turnstile-gated
like the contact one, because an open session-creating endpoint is a free way to
fill a Stripe dashboard with junk.

It is **not live yet**, and the site says so rather than pretending:
`WAITLIST.live` is `false`, the button reads *Not open yet* and is disabled, the
JSON-LD offer is `PreOrder` rather than `InStock`, and `catalogue.json` carries
`waitlist.live: false`. Two steps turn it on, and they belong in one commit:

```sh
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name undercover-rockstars
# or, for the no-code path, set STRIPE_PAYMENT_LINK to a Stripe Payment Link URL
```

then flip `live: true` in `WAITLIST` and run `node tools/pages.js`. Without
either secret the endpoint returns `503 not_configured` and the page says the
waitlist is not open, so a half-finished setup never takes money it cannot
account for.

### The NFC tag

The tag is a garment feature, not a site feature: nothing on this site reads or
writes one, and there is no `/verify/<id>` route, no tag registry and no
message relay for a finder. The home page (`06 / The tag`), every product page
and `llms.txt` say plainly that tags travel with the garments and that Drop 01
has not shipped, so nothing is in circulation to tap. Building the verify page
and the finder-to-owner relay is what has to happen before that hedge can come
out, and the copy has to change with it.

### Agent-readable commerce

A shopping agent asks four things: what is for sale, at what price, in what
sizes, and can it be bought right now. Prose answers none of them reliably, so
each has a field:

- **`/catalogue.json`** is the whole drop as JSON, generated from `ur-data.js`
  by `tools/pages.js` like every page, so the two cannot drift. Per pair: sku,
  url, price, currency, sizes, category, fabric, contents, country of origin,
  the NFC tag and `purchasable`. Alongside them: shipping, the buying status,
  the tag, the fit app and a `returnPolicy` that says *no policy is
  published, do not state one*, because the alternative is an agent inventing
  one.
- **Discovery** without reading this file: every page carries
  `<link rel="alternate" type="application/json" href="/catalogue.json">`, the
  home and collection JSON-LD graphs carry a `DataFeed` node pointing at it,
  `robots.txt` names it, and `_headers` sends a `Link:` header on the page
  routes so a HEAD request finds it without parsing HTML.
- **CORS.** `/catalogue.json` and `/llms.txt` are served
  `Access-Control-Allow-Origin: *`. An agent in a browser context cannot read
  them otherwise. Both are public and carry no user data.
- **Structured data.** Each product carries `size`, `audience`, `mpn`,
  `additionalProperty` (contents, authenticity tag) and an `Offer` with
  `itemCondition` and `shippingDetails`. `/collection/` embeds all eight
  products inside its `ItemList`, so one fetch replaces an eight page crawl.
- **`llms.txt`** has a *For shopping agents* section stating what an agent can
  do here and what it cannot, plus a *Fits* section so a quote for a pair is
  never off by the 30% tailoring premium.
- **Both prices per pair** are in the feed (`products[].fits[]`) and on the page,
  and the waitlist is its own feed block with `live` and `purchasable` flags.

The honest part matters most: **nothing on this site can be bought, by a person
or an agent.** There is no checkout, no cart API, no payment endpoint and no
order status, and `purchasable: false` says so in the first fifteen lines of the
feed. `POST /api/contact` backs the site's own two forms, is locked to this
origin and is gated by Turnstile; it is not an order API and the feed says so.
When a processor is wired up, the fields to flip are `purchasable`,
`status.forSale`, `status.checkoutUrl` and the `PreOrder` availability, in the
feed and in the product JSON-LD together.

### Search and answer engines

Every page carries a unique title, description, canonical, its own generated
1200×630 card, and JSON-LD: `Organization` / `WebSite` on the home page,
`CollectionPage` with an `ItemList` on the collection, a full `Product` with
`Offer` on each pair, and a `BreadcrumbList` throughout. `llms.txt` states
plainly that the drop is not on sale and that the fit app's scan is an
on-device estimate with a confidence, never exact sizing, so answer engines
do not claim otherwise.

### Deployment

Cloudflare Pages, direct upload from `dist/`:

```sh
./tools/build-dist.sh
npx wrangler pages deploy dist --project-name undercover-rockstars --branch main
```

`tools/build-dist.sh` builds from an explicit allowlist and stamps every CSS/JS
reference with a content hash, so `_headers` can cache assets immutably and a
deploy always reaches visitors.

The reservation and signal forms need two Pages secrets, and neither belongs in
this repo:

```sh
npx wrangler pages secret put RESEND_API_KEY   --project-name undercover-rockstars
npx wrangler pages secret put TURNSTILE_SECRET --project-name undercover-rockstars
```

Verify the **subdomain** `send.undercoverrockstars.com` in Resend, not the apex,
so a sending MX record cannot displace inbound mail on the apex.
