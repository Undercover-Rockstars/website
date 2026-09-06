/* "Try it on" handoff (#2): the pair travels to the phone, because the
 * camera is on the phone.
 *
 * On a desktop the button reveals a QR code that opens /fit/ with this pair
 * preselected; on a phone it stays a plain link to the same URL. Detection
 * is by capability (coarse pointer, camera API, narrow viewport), never by
 * user-agent string. Neither branch is a dead end: the panel carries the
 * plain link and a copyable URL, and phone mode gets a "show the code
 * anyway" reveal, so a laptop with a webcam or a convertible is never
 * trapped in the wrong branch.
 *
 * The QR is drawn inline as SVG by the vendored qrcode-generator. No image
 * request leaves the page, so the URL, which names the pair being looked
 * at, is not leaked to any third party. */

(function () {
  'use strict';

  var link = document.getElementById('tryon');
  var panel = document.getElementById('handoff-panel');
  if (!link || !panel || typeof qrcode !== 'function') return;

  var reveal = document.getElementById('handoff-reveal');
  var qrBox = document.getElementById('handoff-qr');
  var urlInput = document.getElementById('handoff-url');
  var copyBtn = document.getElementById('handoff-copy');

  // The href is prebaked server-side; .href resolves it against the current
  // origin, so production encodes the production URL and a local server
  // encodes one a phone on the same network can actually open.
  var url = link.href;

  function phoneLike() {
    try {
      var coarse = window.matchMedia('(pointer: coarse)').matches;
      var narrow = window.matchMedia('(max-width: 700px)').matches;
      var camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      return coarse && narrow && camera;
    } catch (e) { return false; }
  }

  function qrSvg(text) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true })
      .replace('<svg ', '<svg shape-rendering="crispEdges" ');
  }

  var built = false;
  function openPanel() {
    if (!built) {
      qrBox.innerHTML = qrSvg(url);
      urlInput.value = url;
      built = true;
    }
    panel.hidden = false;
    panel.scrollIntoView({ block: 'nearest' });
  }

  if (phoneLike()) {
    // The anchor is already the plain link; offer the code only on request.
    if (reveal) reveal.hidden = false;
  } else {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openPanel();
    });
  }
  if (reveal) reveal.addEventListener('click', openPanel);

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = 'Copied';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { urlInput.select(); });
      } else {
        urlInput.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* select() leaves it copyable */ }
      }
    });
  }
})();
