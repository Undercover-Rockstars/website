#!/usr/bin/env bash
# Assembles dist/ — the exact set of files that should be public.
# An explicit allowlist, so repo tooling can never leak onto the site.
# There is no build step for development: serve the repo root directly.
set -euo pipefail
cd "$(dirname "$0")/.."

node tools/pages.js >/dev/null

rm -rf dist
mkdir -p dist

for f in index.html 404.html robots.txt sitemap.xml llms.txt catalogue.json site.webmanifest _headers; do
  cp "$f" dist/
done
for d in assets .well-known collection thesis fitting-room waitlist bag product; do
  cp -R "$d" "dist/$d"
done

find dist -name '.DS_Store' -delete

# Cache busting. Asset filenames are not content-hashed in the repo, so a deploy
# alone cannot invalidate a cached CSS/JS file and visitors keep running the old
# one. Stamp each reference with a short content hash.
for f in ur.css ur-data.js ur-common.js ur-collection.js ur-product.js ur-signal.js ur-bag.js ur-waitlist.js ur-fitting.js; do
  [ -f "dist/assets/$f" ] || continue
  h=$(shasum -a 256 "dist/assets/$f" | cut -c1-8)
  find dist -name '*.html' -exec sed -i '' "s|/assets/$f\"|/assets/$f?v=$h\"|g" {} +
done

echo "dist/: $(find dist -type f | wc -l | tr -d ' ') files, $(find dist -name '*.html' | wc -l | tr -d ' ') pages"
