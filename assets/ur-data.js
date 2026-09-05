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
    SIZES: ['XS', 'S', 'M', 'L', 'XL'],
    FITS: FITS,
    fitOf: fitOf,
    priceOf: priceOf,
    CURRENCY: 'USD',
    // Prices are shown as whole dollars, formatted the way the design did.
    format: function (n) { return '$' + n.toLocaleString('en-US'); }
  };
});
