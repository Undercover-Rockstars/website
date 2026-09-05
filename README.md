<p align="center">
  <img src="assets/readme-banner.png" alt="Undercover Rockstars. Everyone has a rockstar undercover." width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/DROP-01-FF3B30?style=flat-square&labelColor=0A0A0B" alt="Drop 01">
  <img src="https://img.shields.io/badge/PAIRS-08-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="8 pairs">
  <img src="https://img.shields.io/badge/PAGES-14-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="14 pages">
  <img src="https://img.shields.io/badge/BUILD%20STEP-NONE-ECEBE6?style=flat-square&labelColor=0A0A0B" alt="No build step">
  <img src="https://img.shields.io/badge/DEPENDENCIES-ZERO-FF3B30?style=flat-square&labelColor=0A0A0B" alt="Zero dependencies">
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

Eight pairs, sixteen garments. Unisex, cut in Bali.

| | Pair | Category | Day | Night | Price |
| :--- | :--- | :--- | :--- | :--- | ---: |
| UR/01 | The Boardroom Pair | Blazer | Charcoal wool, clean notch lapel | Same cut in black, satin-faced lapel | €2,290 |
| UR/02 | After Hours Pair | Jacket | Structured, unlined, stone grey | Bonded black with a zipped storm flap | €2,850 |
| UR/03 | Two-Face Pair | Shirt | Crisp oxford white | Ink black, same collar, same cuff | €1,180 |
| UR/04 | Backstage Pair | Knit | Fine-gauge crew | Same crew, hand-distressed hem and cuffs | €1,390 |
| UR/05 | Double Life Pair | Jacket | Charcoal flannel, tonal buttons | Charcoal flannel, signal-red lining | €1,590 |
| UR/06 | Encore Pair | Blazer | Soft-shoulder double-breasted, navy | Oversized black, worn as a coat | €2,650 |
| UR/07 | Quiet Riot Pair | Shirt | Plain black poplin | Lyrics stitched tone on tone | €1,120 |
| UR/08 | Curtain Call Pair | Knit | Slim turtleneck, closed seams | Same turtleneck, slashed shoulder seams | €1,480 |

---

# The site

Static HTML, CSS and vanilla JavaScript. **No build step to develop, no
framework, no dependencies.** Serve the repo root and it runs.

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
/fitting-room/        try-on interface
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
  ur-fitting.js       fitting room
  ur-signal.js        newsletter
  ur-bag.js           reservation form
  tryon.js            try-on provider hook (nothing connected yet)
  og*.png             one Open Graph card per page (generated)
functions/api/
  contact.js          reservations and signups
tools/
  pages.js            generates every page from ur-data.js
  build.js            shared layout, head, chrome, JSON-LD
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

The provider hook is kept with the same signature, but until something real is
connected it returns nothing and the UI says *"No provider connected — we are
not going to hand your own photo back and call it a render."* The photo is read
with `FileReader` and never leaves the browser in this state; if you connect a
provider that uploads it, the copy on that page has to change.

### Other deviations from the source

- **`style-hover`** — the source sets `style-hover="..."` on tiles, buttons and
  links, but `dc-runtime` implements no such attribute, so none of those hovers
  ever fired. Reimplemented as real CSS `:hover`.
- **`ur-scan`** — the fitting-room scan line animated to `translateY(100vh)`,
  which is the viewport rather than its container. Now `100%`.
- **Responsive** — the source is desktop-only (12-column grids, four-across
  tiles, 7fr/5fr splits). Added breakpoints at 1100, 900 and 700px.

### The NFC tag

The tag is a garment feature, not a site feature: nothing on this site reads or
writes one, and there is no `/verify/<id>` route, no tag registry and no
message relay for a finder. The home page (`06 / The tag`), every product page
and `llms.txt` say plainly that tags travel with the garments and that Drop 01
has not shipped, so nothing is in circulation to tap. Building the verify page
and the finder-to-owner relay is what has to happen before that hedge can come
out, and the copy has to change with it.

### Search and answer engines

Every page carries a unique title, description, canonical, its own generated
1200×630 card, and JSON-LD: `Organization` / `WebSite` on the home page,
`CollectionPage` with an `ItemList` on the collection, a full `Product` with
`Offer` on each pair, and a `BreadcrumbList` throughout. `llms.txt` states
plainly that the drop is not on sale and that the fitting room has no provider,
so answer engines do not claim otherwise.

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
