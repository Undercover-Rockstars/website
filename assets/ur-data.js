/* Undercover Rockstars — single source of truth for the drop.
   Ported verbatim from the Claude Design source `Undercover Rockstars v3.dc.html`.
   tools/build.js reads this to generate the collection and product pages, and the
   browser loads the same file so the bag can price lines client-side. */

(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.UR_DATA = data;
})(typeof self !== 'undefined' ? self : this, function () {

  var PRODUCTS = [
    { id: 'boardroom', code: '01', name: 'The Boardroom Pair', price: 2290, cat: 'Blazer',
      day: 'Charcoal wool, clean notch lapel',
      night: 'Same cut in black, satin-faced lapel',
      fabric: 'Wool 320g · Wool / silk satin',
      desc: 'Two blazers from one pattern. The day version is charcoal wool with a clean lapel and nothing to explain. The night version is the identical cut in black with a satin-faced lapel that catches the light. Same shoulders, same length, same you.' },
    { id: 'afterhours', code: '02', name: 'After Hours Pair', price: 2850, cat: 'Jacket',
      day: 'Structured, unlined, stone grey',
      night: 'Bonded black with a zipped storm flap',
      fabric: 'Wool · Bonded wool',
      desc: 'A jacket built twice. By day, an unlined structured jacket in stone grey that sits like tailoring. By night, the same silhouette in bonded matte black with a storm flap that zips into a hard, straight line.' },
    { id: 'twoface', code: '03', name: 'Two-Face Pair', price: 1180, cat: 'Shirt',
      day: 'Crisp oxford white',
      night: 'Ink black, same collar, same cuff',
      fabric: 'Italian poplin, both',
      desc: 'Two shirts, one collar. The day shirt is crisp oxford white. The night shirt is ink black, cut from the same block with the same collar and cuff so the jacket sits identically over both.' },
    { id: 'backstage', code: '04', name: 'Backstage Pair', price: 1390, cat: 'Knit',
      day: 'Fine-gauge crew, sits under a blazer',
      night: 'Same crew, hand-distressed hem and cuffs',
      fabric: 'Merino · 14-gauge, both',
      desc: 'Two merino crews from one knit programme. The day crew is pristine and disappears under a blazer. The night crew is the same gauge and colour with the hem and cuffs hand-distressed after knitting.' },
    { id: 'doublelife', code: '05', name: 'Double Life Pair', price: 1590, cat: 'Jacket',
      day: 'Charcoal flannel, tonal buttons',
      night: 'Charcoal flannel, signal-red lining',
      fabric: 'Brushed wool flannel, both',
      desc: 'Two overshirts that look identical from the outside. The day version is lined in charcoal. The night version is lined in signal red that shows only at the cuff and the hem, only when you move.' },
    { id: 'encore', code: '06', name: 'Encore Pair', price: 2650, cat: 'Blazer',
      day: 'Soft-shoulder double-breasted, navy',
      night: 'Oversized black, worn as a coat',
      fabric: 'Wool crepe, both',
      desc: 'A double-breasted pair. The day blazer is navy wool crepe cut to size. The night blazer is the same pattern graded a half-size up in black, so it wears as a coat over nothing much.' },
    { id: 'quietriot', code: '07', name: 'Quiet Riot Pair', price: 1120, cat: 'Shirt',
      day: 'Plain black poplin',
      night: 'Black poplin, lyrics stitched tone on tone',
      fabric: 'Italian poplin, both',
      desc: 'Two black shirts. The day shirt is plain. The night shirt carries a line of text stitched black on black along the placket. You have to be close to read it.' },
    { id: 'curtaincall', code: '08', name: 'Curtain Call Pair', price: 1480, cat: 'Knit',
      day: 'Slim turtleneck, closed seams',
      night: 'Same turtleneck, slashed shoulder seams',
      fabric: 'Cashmere blend, both',
      desc: 'Two turtlenecks from one pattern. The day version is finished clean. The night version has the shoulder seams left open and bound. Under a jacket both disappear. Without one, only one does.' }
  ];

  /* Every pair can be cut to measure instead of to the size run, for 30% more.
     The premium lives here alone: the pages, the bag, the feed and the
     reservation email all price through priceOf(), so there is one number to
     change and no way for two surfaces to quote different money. */
  var FITS = [
    { id: 'standard', name: 'Standard sizing', premium: 0,
      note: 'Cut to the size run, XS to XL.' },
    { id: 'tailored', name: 'Made to measure', premium: 0.30,
      note: 'Cut to your measurements. Pick the size closest to you now; we take the measurements after you reserve.' }
  ];

  function fitOf(id) {
    return FITS.filter(function (f) { return f.id === id; })[0] || FITS[0];
  }
  function priceOf(product, fit) {
    return Math.round(product.price * (1 + fitOf(fit).premium));
  }

  /* =======================================================================
   * PROVISIONAL BLOCK DATA. DRAFT, NOT A DECISION (#7).
   *
   * Everything from here to the end of blockFor/blockLine is drafted by an
   * engineer from standard published grading and drafting practice (metric
   * size runs for a unisex XS to XL chest; classic ease ranges per
   * garment category). It exists so the machinery that reads it,
   * blockFor(), the profile screen, the reservation email and the fit
   * viewer, can be built and tested before a pattern cutter delivers real
   * numbers. When they do, ONLY THIS TABLE CHANGES. Until then nothing
   * downstream is a promise about a cut: measurements are still confirmed
   * with a tape after the reservation, by a person.
   *
   * Two parts:
   *
   *  SIZE_RUN  the body measurements each standard size assumes, in cm.
   *            The same body run backs every category: a knit and a blazer
   *            of one size are cut for the same body and differ only in
   *            the ease their category adds.
   *  BLOCKS    per category, the ease that category's cut adds over the
   *            body at chest, waist and hip, how far below the seat line
   *            the hem of that cut sits, what the cutter still needs by
   *            tape, and the largest delta a block can absorb before the
   *            pattern has to be re-drafted rather than graded.
   * ===================================================================== */

  var SIZE_RUN = {
    XS: { chest: 84,  waist: 70, hip: 89,  shoulder: 41.5, sleeve: 58,   back: 40.5, height: 168 },
    S:  { chest: 90,  waist: 76, hip: 95,  shoulder: 43,   sleeve: 59.5, back: 42,   height: 171 },
    M:  { chest: 96,  waist: 82, hip: 101, shoulder: 44.5, sleeve: 61,   back: 43.5, height: 174 },
    L:  { chest: 104, waist: 90, hip: 109, shoulder: 46.5, sleeve: 62.5, back: 45,   height: 177 },
    XL: { chest: 112, waist: 98, hip: 117, shoulder: 48.5, sleeve: 64,   back: 46.5, height: 180 }
  };
  var SIZES = ['XS', 'S', 'M', 'L', 'XL'];

  var BLOCKS = {
    Blazer: {
      ease: { chest: 11, waist: 9, hip: 9 }, hemBelowSeat: 24,
      needsByTape: 'half back, bicep, and a posture note',
      note: 'Classic tailored jacket drafting: roughly 10 to 12 cm over the chest.'
    },
    Jacket: {
      ease: { chest: 10, waist: 8, hip: 8.5 }, hemBelowSeat: 18,
      needsByTape: 'none beyond the scanned set',
      note: 'A slightly closer cut than the blazer, unstructured.'
    },
    Shirt: {
      ease: { chest: 13, waist: 12, hip: 10 }, hemBelowSeat: 14,
      needsByTape: 'neck and cuff',
      note: 'A shirt moves more, so it carries more room.'
    },
    Knit: {
      ease: { chest: 6, waist: 5, hip: 5 }, hemBelowSeat: 12,
      needsByTape: 'none beyond the scanned set',
      note: 'Knits are worn close; the fabric stretches where the cut does not.'
    }
  };

  /* The largest delta from the nearest size a block can absorb by grading
     alone, in cm. Beyond this the pattern is re-drafted, which is the
     human step in #8, and the profile is flagged rather than quietly
     forced onto a block it does not fit. Drafted, like everything here. */
  var BLOCK_TOLERANCE = { girth: 8, length: 4 };
  var BLOCK_GIRTHS = ['chest', 'waist', 'hip'];
  var BLOCK_LENGTHS = ['shoulder', 'sleeve', 'back'];
  var BLOCK_ORDER = BLOCK_GIRTHS.concat(BLOCK_LENGTHS);
  var BLOCK_LABELS = { chest: 'chest', waist: 'waist', hip: 'seat', shoulder: 'shoulder', sleeve: 'sleeve', back: 'back' };

  function cmOf(v) {
    if (v && typeof v === 'object' && typeof v.cm === 'number') return v.cm;
    return typeof v === 'number' ? v : null;
  }

  /* blockFor(profile, category) -> how a saved measurement profile maps
     onto a standard block. The nearest size is picked by the primary
     measurement, the chest, exactly as #7 specifies; the rest of the
     profile is expressed as deltas from that size; any delta beyond the
     tolerance is flagged, which is the signal for #8's human step.
     Unknown categories or a profile without a chest return null: no
     mapping is better than a made-up one. */
  function blockFor(profile, category) {
    var block = BLOCKS[category];
    var values = profile && profile.values;
    if (!block || !values) return null;
    var chest = cmOf(values.chest);
    if (chest == null) return null;

    var size = null, best = Infinity;
    SIZES.forEach(function (z) {
      var d = Math.abs(chest - SIZE_RUN[z].chest);
      if (d < best) { best = d; size = z; }
    });

    var deltas = {}, missing = [], flagged = [];
    BLOCK_ORDER.forEach(function (m) {
      var v = cmOf(values[m]);
      if (v == null) { deltas[m] = null; missing.push(m); return; }
      var d = Math.round((v - SIZE_RUN[size][m]) * 10) / 10;
      deltas[m] = d;
      var tol = BLOCK_GIRTHS.indexOf(m) !== -1 ? BLOCK_TOLERANCE.girth : BLOCK_TOLERANCE.length;
      if (Math.abs(d) > tol) flagged.push(m);
    });

    return {
      category: category,
      size: size,
      deltas: deltas,
      flagged: flagged,
      beyond: flagged.length > 0,
      ease: block.ease,
      hemBelowSeat: block.hemBelowSeat,
      needsByTape: block.needsByTape,
      provisional: true
    };
  }

  /* The one-line human form, the same sentence on the profile screen and
     in the reservation email: "cut from an M, sleeve +2 cm, back +1 cm".
     Deltas under half a centimetre are left out; they are noise a phone
     scan cannot stand behind. */
  function blockLine(r) {
    if (!r) return '';
    var parts = [];
    BLOCK_ORDER.forEach(function (m) {
      var d = r.deltas[m];
      if (d == null || Math.abs(d) < 0.5) return;
      parts.push(BLOCK_LABELS[m] + ' ' + (d > 0 ? '+' : '') + (Math.round(d * 10) / 10) + ' cm');
    });
    var line = 'cut from an ' + r.size + (parts.length ? ', ' + parts.join(', ') : '');
    if (r.beyond) {
      line += '. Outside the ' + r.size + ' block on ' +
        r.flagged.map(function (m) { return BLOCK_LABELS[m]; }).join(' and ') +
        ': the cutter checks this one with you';
    }
    return line;
  }

  /* The waitlist is the one thing on this site that takes money, and it is the
     only paid item until a real checkout exists. Amount, currency and every
     promise made about it live here, so the page, the feed, llms.txt and the
     Stripe line item cannot drift from each other. */
  var WAITLIST = {
    // Flip to true in the same commit that sets the Stripe secret. While it is
    // false the page shows the offer but cannot charge, and says so.
    live: false,
    amount: 9,
    currency: 'USD',
    unitAmount: 900,               // minor units, what Stripe is sent
    formatted: '$9',
    name: 'Drop 01 waitlist place',
    perks: [
      'A numbered place in the queue for Drop 01.',
      'Paid places are served first when the drop opens, before it goes public.',
      'The $9 comes off your first pair.'
    ],
    terms: 'A place is not a pair: it does not hold a size, a fit or a piece, and ' +
      'the $9 is not refundable. It comes off your first pair when Drop 01 opens.'
  };

  return {
    PRODUCTS: PRODUCTS,
    WAITLIST: WAITLIST,
    CATEGORIES: ['All', 'Blazer', 'Jacket', 'Shirt', 'Knit'],
    SIZES: SIZES,
    FITS: FITS,
    fitOf: fitOf,
    priceOf: priceOf,
    SIZE_RUN: SIZE_RUN,
    BLOCKS: BLOCKS,
    BLOCK_TOLERANCE: BLOCK_TOLERANCE,
    BLOCK_ORDER: BLOCK_ORDER,
    BLOCK_LABELS: BLOCK_LABELS,
    blockFor: blockFor,
    blockLine: blockLine,
    CURRENCY: 'USD',
    // Prices are shown as whole dollars, formatted the way the design did.
    format: function (n) { return '$' + n.toLocaleString('en-US'); }
  };
});
