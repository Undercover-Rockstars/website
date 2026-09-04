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

  return {
    PRODUCTS: PRODUCTS,
    CATEGORIES: ['All', 'Blazer', 'Jacket', 'Shirt', 'Knit'],
    SIZES: ['XS', 'S', 'M', 'L', 'XL'],
    CURRENCY: 'EUR',
    // Prices are shown as whole euros, formatted the way the design did.
    format: function (n) { return '€' + n.toLocaleString('en-IE'); }
  };
});
