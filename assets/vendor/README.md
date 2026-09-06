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

## mediapipe/tasks-vision

| | |
| :--- | :--- |
| Files | `mediapipe/tasks-vision-1.0.1/vision_bundle.mjs` and the four files in `mediapipe/tasks-vision-1.0.1/wasm/` (`vision_wasm_internal.{js,wasm}`, `vision_wasm_nosimd_internal.{js,wasm}`). The upstream package also ships `vision_wasm_module_internal.{js,wasm}`, 11.5 MB that `FilesetResolver` never selects: it chooses between the SIMD and no-SIMD `internal` builds. Not vendored. |
| Upstream | https://www.npmjs.com/package/@mediapipe/tasks-vision (npm tarball, `npm pack @mediapipe/tasks-vision@1.0.1`) |
| Version | 1.0.1, only the vision task runtime taken: the ES module bundle and the WASM loader pairs. The `.cjs`, UMD and `.map` files in the package are not vendored. |
| Licence | Apache-2.0 (see `mediapipe/LICENSE`, the licence text from the MediaPipe repository; the npm tarball itself carries only the SPDX id) |
| SHA-256 | `vision_bundle.mjs` `d885630c297c0b20b1fe86096cb06291c4c8080876f27852e724f24ac603713f` |
| | `wasm/vision_wasm_internal.js` `e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73` |
| | `wasm/vision_wasm_internal.wasm` `8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886` |
| | `wasm/vision_wasm_nosimd_internal.js` `e81d715a3d42cc3373602eb2f7aff795d164934db680e32496b65dab537f9658` |
| | `wasm/vision_wasm_nosimd_internal.wasm` `a28483cd42e74e855bf5ebdb6b40d9b66a5b49e35e95020bc97669e6822a3192` |
| Used by | `assets/ur-measure.js` and `assets/ur-capture.js`, the on-device measurement engine (#5) |
| Global | none; loaded with a dynamic `import()` of the `.mjs` after the user consents and begins, so nothing large loads on page load |

At runtime `FilesetResolver.forVisionTasks('/assets/vendor/mediapipe/tasks-vision-1.0.1/wasm')`
fetches exactly one of the three loader pairs: the SIMD one on modern phones,
the no-SIMD one on old ones, and the module variant only if the caller opts
into module loading (we do not). All three pairs are vendored so no reachable
branch 404s on a phone with no signal. Loaded over venue wifi this costs about
one 11 MB wasm fetch plus the model below, which is why `lite` was chosen.

Chosen in #3's dependency decision: no build step is needed, the bundle is a
finished ES module that runs from static files.

## pose_landmarker_lite (MediaPipe Pose Landmarker, lite)

| | |
| :--- | :--- |
| File | `mediapipe/pose_landmarker_lite.task` (5.8 MB) |
| Upstream | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task |
| Version | float16 revision 1 of `pose_landmarker_lite` |
| Licence | Apache-2.0 (see `mediapipe/LICENSE`) |
| SHA-256 | `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` |
| Used by | `assets/ur-measure.js` (via `PoseLandmarker.createFromOptions`), the on-device pose + silhouette engine (#5) |

`lite`, not `full` (9 MB) or `heavy` (29 MB): this runs on a phone over venue
wifi, and the spike in #5 is about whether a small on-device model is good
enough to pick a made-to-measure block, not about squeezing the last
landmark. The model is fetched only after consent, and the fit service worker
caches it on demand, never in `install`.

## three

| | |
| :--- | :--- |
| Files | `three/0.185.1/three.module.min.js` and `three/0.185.1/three.core.min.js` (the module build is a pair since r167: the module file re-exports from the core file, so both ship side by side and the relative import resolves unchanged) |
| Upstream | https://www.npmjs.com/package/three (npm tarball, `npm pack three@0.185.1`) |
| Version | 0.185.1, only the minified ES module build taken. The `.cjs`, webgpu, TSL and non-minified variants in the package are not vendored. No addons are vendored: the viewer uses a purpose-built turntable controller instead of `OrbitControls`, so nothing has to be rewritten to drop its bare `three` specifier. |
| Licence | MIT (see `three/LICENSE`) |
| SHA-256 | `three.module.min.js` `86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6` |
| | `three.core.min.js` `05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90` |
| Used by | `assets/ur-viewer.js`, the layer 1 fit viewer (#10) |
| Global | none; `ur-viewer.js` is an ES module that imports it with a dynamic `import()` only when the buyer opens the viewer, so nothing loads on the `/fit/` page view |

Chosen in #3's dependency decision, like everything here. About 730 KB
minified arrives on first open, cached afterwards by the fit service
worker's asset strategy on demand, never in `install`, exactly like the
pose engine. The version is in the path, so a bump is a new directory
and old caches simply expire.
