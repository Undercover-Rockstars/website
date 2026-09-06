# Vendored dependencies

The site ships as static files with no build step, and nothing it serves may
depend on a CDN at runtime. When a problem genuinely needs a library, the file
is vendored here instead: pinned to an upstream release, unmodified, with its
licence committed beside it. Each entry records where the file came from and
its SHA-256, so a diff against upstream is one command.

Vendored files are served as-is and referenced by version-stamped URLs by
`tools/build-dist.sh`, same as first-party assets.

## qrcode-generator

| | |
| :--- | :--- |
| File | `qrcode-generator/qrcode.js` |
| Upstream | https://github.com/kazuhikoarase/qrcode-generator |
| Version | 2.0.4 (`js/dist/qrcode.js` at tag `js2.0.4`, master at time of vendoring) |
| Licence | MIT (see `qrcode-generator/LICENSE`) |
| SHA-256 | `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c` |
| Used by | `assets/ur-handoff.js`, the "Try it on" QR handoff (#2) |
| Global | `qrcode` (plain `<script>`; UMD footer covers AMD/CommonJS too) |

Chosen in #3's dependency decision. Nayuki's QR Code generator is the other
strong candidate, but its repository only publishes TypeScript source and
compiles the JavaScript with a build script, and a build step is exactly what
this repo does not have. Arase's build is published as a finished single file.

API as used: `qrcode(0, 'M')` (auto type number, medium error correction),
`addData(url)`, `make()`, `createSvgTag({ cellSize, margin, scalable: true })`.
The module includes UTF-8 support; the URLs it encodes here are ASCII.

If this is ever replaced or upgraded, regenerate the QR decodes in the phase 0
verification steps before shipping: a code that scans on one phone and fails
on another is worse than no code.
