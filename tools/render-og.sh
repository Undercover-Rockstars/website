#!/usr/bin/env bash
# Regenerates every Open Graph card and the icons with headless Chrome.
# ImageMagick cannot rasterize these correctly on macOS: it silently falls back
# to its internal renderer and drops colour.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

shoot() { # src w h out [scale]
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor="${5:-1}" --window-size="$2,$3" \
    --virtual-time-budget=10000 --screenshot="$4" "file://$1" >/dev/null 2>&1
}
urlenc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
card() { # out title kind sub [fontsize]
  local extra=""; [ -n "${5:-}" ] && extra="&fs=$5"
  shoot "$ROOT/tools/og-render.html?t=$(urlenc "$2")&k=$(urlenc "$3")&s=$(urlenc "$4")$extra" \
    1200 630 "$ROOT/assets/$1"
}

card og.png 'Everyone has a rockstar <span class="acc">undercover.</span>' \
  'Drop 01 · 08 pairs live' \
  'Clothing that comes in matched pairs: one cut for the day, the same pattern cut for the night.'

card og-collection.png 'Drop <span class="acc">01</span>' 'UR/01 · 08 pairs · 16 garments' \
  'Eight pairs. Sixteen garments. Each pair is one pattern cut twice. Unisex, cut in Italy.'

card og-thesis.png 'The day is the <span class="acc">disguise.</span>' 'Thesis · UR/T.01' \
  'Six lines on why clothing should come in pairs.'

card og-fitting.png 'Fitting <span class="acc">room</span>' 'UR/FIT · try-on' \
  'One photo, both versions. Your photo is read in the browser and is not uploaded.'

# one card per pair, driven by the same data the site uses
node -e '
const D=require("./assets/ur-data.js");
console.log(D.PRODUCTS.map(p=>[p.id,p.name,"UR/"+p.code+" · "+p.cat+" · "+D.format(p.price),p.day+" / "+p.night].join("\t")).join("\n"));
' | while IFS=$'\t' read -r id name kind sub; do
  card "og-$id.png" "$name" "$kind" "$sub" 76
done

# README banner (2x for retina), same template at a wider, shorter size
shoot "$ROOT/tools/og-render.html?w=1280&h=420&fs=86&t=$(urlenc 'Everyone has a rockstar <span class="acc">undercover.</span>')&k=$(urlenc 'Drop 01 · 08 pairs · 16 garments')&s=$(urlenc 'One pattern, cut twice. A day version and a night version that share every seam.')" \
  1280 420 "$ROOT/assets/readme-banner.png" 2

# icons
cat > "$TMP/icon.html" <<HTML
<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;background:#0a0a0b;width:512px;height:512px}
svg{display:block;width:512px;height:512px}</style>
$(cat "$ROOT/assets/favicon.svg")
HTML
shoot "$TMP/icon.html" 512 512 "$ROOT/assets/icon-512.png"
sips -z 180 180 "$ROOT/assets/icon-512.png" --out "$ROOT/assets/apple-touch-icon.png" >/dev/null

echo "cards: $(ls "$ROOT"/assets/og*.png | wc -l | tr -d ' ')"
sips -g pixelWidth -g pixelHeight "$ROOT/assets/og.png" | tail -2 | tr -d ' \n'; echo
