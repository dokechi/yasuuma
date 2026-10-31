# Original architectural arrival court — isolated preview

## State and scope

This is a separate, opt-in prototype after PR94. The production entry and the
established castle remain the default. `lounge/arrival-prototype.html` opens the
same application with `?experience=court`; it does not provide authentication or
records on its own. The owned browser fixture supplies synthetic records through
the existing same-origin parent. No production credentials are used.

The first slice evaluates real three-dimensional architecture, physically based
materials, grounded light and quieter composition, inspired by the user's actual
Igloo screenshots. No Igloo assets/code are copied. It is **not** a claim of visual
equivalence, a complete 3D castle, or a finished continuous entry/return journey.
Existing characters/interiors and the original manuscript DOM are unchanged. The
first phone camera intentionally frames the study and upper gallery; other rooms
remain available through the immediate five-destination rail. This slice does not
claim full three-dimensional exploration of every room from that narrow view.

## Ownership and progressive failure

- The canvas renders and selects architectural entrances. Existing account/desk
  controllers still own routing, source IDs, manuscripts, favorites and copy.
- Five labeled direct work actions remain truly instant. Exploring an entrance
  selects its camera/label; explicit entry opens the existing owner reader.
- The old castle remains visible and usable while loading, parsing, compiling and
  drawing the first real frame. Only successful first-frame initialization can
  hide its controls. Existing keyboard work defers automatic promotion.
- Missing module/style/model, malformed model, unsupported WebGL2 or context loss
  leaves/restores the original castle. There is no automatic context retry loop.
- Reduced motion or save-data/low-memory startup does not create the renderer.
  Enabling reduced motion later returns to the old castle; an already initialized
  renderer requires explicit re-entry after that setting ends. If startup bypassed
  graphics entirely, a fresh page visit is required to attempt initialization after
  the device preference changes; there is no automatic retry. Hidden/native work
  surfaces suspend rendering.
- New rendering does not add backend reads, polling, source mutations, external
  posting, audio defaults, permissions, security settings or paid services.

## Rendering and asset constraints

Three.js r187 is pinned, locally bundled, MIT-attributed and recorded with source
hashes and a reproducible build script. No runtime CDN or decoder download is
required. Original Blender geometry is authored separately, then independently
reviewed before adoption. Named five-room entrances and three closed wings map
only to existing destinations.

Initial budgets: 2,000,000-byte self-contained GLB, 60,000 scene triangles,
12 materials, DPR at most 1.5 and at most 1,800,000 drawing-buffer pixels.
Embedded material images, if adopted, are inspected before decoding (at most
512 pixels per side and 1M total texels). A bounded environment reflection and
one shadow light replace heavy post-processing. A static, original 256×128
gradient sky uses one standard texture (32,768 runtime texels), separately counted
from the three embedded material maps and disposed with the renderer. Idle, hidden and reading states
have no continuous rendering loop. Diagnostics report actual draw calls and
rendered triangles separately from source geometry counts.

## Verification gates

Pure camera/scheduler/resource/controller tests are separate from actual WebGL
proof. An isolated trusted CI job uses pinned Chromium and Chromium's documented
SwiftShader flags **only against this owned, synthetic localhost fixture**.
Those flags are not applied to the user's browser or production environment.
The GL job must really render geometry and non-empty pixels, and must exercise
actual context loss. It cannot silently pass by showing the fallback alone.

Four widths: 320×640, 390×900, actual-host Fold 800×648, desktop 1440×900.
Coverage includes visible projected targets, physical entry and direct routes,
original reader/copy/tools, sourcing, Back/focus, resize, render suspension,
reduced motion, and missing/broken/context-loss fallbacks. Existing PR93/PR94
regressions remain unchanged. Actual intermediate frames and independent art/UX
review are required before further promotion.

Software GL proves rendering and lifecycle behavior, **not Galaxy Z Fold GPU
frame rate, thermals or battery use**. A prototype pass is not a production gate.

## Primary implementation references

- https://github.com/mrdoob/three.js/releases/tag/r187
- https://threejs.org/manual/pages/rendering-on-demand.html
- https://threejs.org/manual/pages/cleanup.html
- https://playwright.dev/docs/browsers
- https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md
- https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/
