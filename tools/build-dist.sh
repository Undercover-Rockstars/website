#!/usr/bin/env bash
# Assembles dist/ — the exact set of files that should be public.
# An explicit allowlist, so repo tooling can never leak onto the site.
# There is no build step for development: serve the repo root directly.
set -euo pipefail
cd "$(dirname "$0")/.."

node tools/pages.js >/dev/null

rm -rf dist
mkdir -p dist

for f in index.html 404.html robots.txt sitemap.xml llms.txt catalogue.json site.webmanifest _headers _redirects; do
  cp "$f" dist/
done
for d in assets .well-known collection thesis fit waitlist bag product; do
  cp -R "$d" "dist/$d"
done

find dist -name '.DS_Store' -delete

# Cache busting. Asset filenames are not content-hashed in the repo, so a deploy
# alone cannot invalidate a cached CSS/JS file and visitors keep running the old
# one. Stamp each reference with a short content hash.
for f in ur.css ur-data.js ur-common.js ur-collection.js ur-product.js ur-signal.js ur-bag.js ur-waitlist.js ur-fit.js ur-handoff.js ur-capture.js ur-measure.js ur-profile.js vendor/qrcode-generator/qrcode.js; do
  [ -f "dist/assets/$f" ] || continue
  h=$(shasum -a 256 "dist/assets/$f" | cut -c1-8)
  find dist -name '*.html' -exec sed -i '' "s|/assets/$f\"|/assets/$f?v=$h\"|g" {} +
  # The fit service worker precaches the same assets, in single quotes. Its keys
  # have to carry the same stamp or the precache never matches what the page
  # requests, and the app is only offline-capable by accident of the runtime
  # cache.
  [ -f dist/fit/sw.js ] && sed -i '' "s|'/assets/$f'|'/assets/$f?v=$h'|g" dist/fit/sw.js
done

# The fit viewer is an ES module imported on demand by path from inside
# ur-fit.js, so its cache-bust stamp has to be written into the JS files
# themselves, not just the HTML. three.js needs no stamp: its path carries
# the version.
for f in ur-viewer.js; do
  [ -f "dist/assets/$f" ] || continue
  h=$(shasum -a 256 "dist/assets/$f" | cut -c1-8)
  find dist -name '*.js' -exec sed -i '' "s|/assets/$f'|/assets/$f?v=$h'|g" {} +
done

# Rotate the shell cache whenever any stamped shell asset changes, so a deploy
# evicts the previous entries instead of accumulating them forever under one key.
# The pattern matches whatever version pages.js currently emits (it was bumped
# v1 -> v2 once already, and the old fixed 'v1' pattern silently stopped
# rotating the cache after that).
if [ -f dist/fit/sw.js ]; then
  sh=$(shasum -a 256 dist/fit/sw.js | cut -c1-8)
  sed -i '' -E "s|SHELL_VERSION = 'v[0-9a-z-]*'|SHELL_VERSION = 'v1-$sh'|" dist/fit/sw.js
fi

echo "dist/: $(find dist -type f | wc -l | tr -d ' ') files, $(find dist -name '*.html' | wc -l | tr -d ' ') pages"
