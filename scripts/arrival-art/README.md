# Original arrival court — v5 native continuity and material finish

Purpose-built original architecture for the existing castle, not a copy of Igloo models or a claim of equivalent final rendering. The user’s reference informed architectural scale, contact, restrained light and quiet composition. Existing characters, room images, reader, authentication and data are unchanged.

## Runtime and source contract

- `arrival-court-v1.glb`: canonical runtime filename, authored revision v5.
- `arrival-court-v1-layout.json`: exact glTF Y-up metre coordinates, camera/anchor metadata and native portals.
- `arrival-court-v1-provenance.json`: exact runtime SHA, all source hashes, original material provenance, explicit tradeoffs and proof hashes.
- Hard budgets: 2,000,000 bytes; 60,000 scene-instance triangles; 12 materials; 64 primitive groups; four embedded images / at most 1M source texels. Actual shadow+main+sky draw calls, including moving-door peak, must remain <=128.

The five `room-*` roots own their physical frames, leaves and handles. Three `closed-*` wings remain sealed. Native `courtPortal` extras are object-valued on each room root and copied exactly into layout `portals`. Hinge axes/pivots are world/Y-up, not Blender-local. The renderer derives local axes from native world quaternions; quantization scales only mesh nodes, never EMPTY pivots.

Insurance, rakuten and sourcing retain fixed upper arches/fanlights; only their lower capped wood leaves and original knobs move. Archive has paired arched casements. Observatory has one left high clerestory leaf above Y5.603; its lower pane/grille and the dining roof remain fixed. Upper casements explicitly have `handle:null`; no invented hardware. Real 3mm head/sill gaps keep moving and fixed parts separate. Front-mounted hinge axes avoid thick-leaf centre interpenetration. Shared joints are authored at leaf-local X=0 and pivots/child offsets at exact millimetres, without overlapping leaves or tolerant rays.

## Bounded material/geometry finish

63 quiet, varied rectangular paving courses replace121 small squares. Original facade RNG consumption is preserved. Shared stone basecolor uses a broader mineral scale while true baked fine normal/roughness remain unchanged. One128×256 original smoked-oak basecolor adds restrained grain; a documented linear mean-preserving factor retains the original oak brightness. This is not a noise layer to conceal shadow aliasing.

Native rear pockets and jamb/haunch rebates are real Boolean cuts within the old envelopes. A continuous workshop rear lining closes original masonry joints inside the existing back wall. No whole3D interior, exterior roof demolition, distant prop or camera-through-wall trick is included. Four unused miniature cage lanterns and two associated floor pedestals are explicitly omitted to keep64 groups after the fixed observatory lower pane. All room fanlights and the renderer’s actual study light remain.

## Rebuild (Blender4.3.2, Python3, Node)

Run from this source directory, with the repository’s pinned runtime modules available:

```sh
blender --factory-startup -b -t 8 -P build_arrival_court.py
python quantize_arrival_court.py
node verify_native_runtime.mjs arrival-court-v1.glb <repository>/command-center-98/lounge
blender --factory-startup -b -t 8 -P verify_native_camera_curve.py
python finalize_native_handoff.py
```

`split_native_portals.py` is called by the main build after source face semantics are attached. It preserves exterior UV/custom normals, makes real cuts/caps, and owns the native hierarchy. Do not substitute the old insurance-only splitter.

Frozen material images and their prompts are original authoring inputs. `bake_stone_material.py` optionally regenerates the original periodic technical normal/ORM maps, not the imagegen basecolors. Normal is a real tangent-space bake; ORM has neutral AO=1, baked roughness and metal=0. Standard glTF embeds exactly the same four maps. No external URLs, runtime custom material shader or compressed-image decoder is needed.

The quantizer keeps topology, millimetre SHORT positions (maximum error0.5mm), normalized BYTE normals and SHORT UVs at1/256 tile. It preserves legitimate KHR_texture_transform scale/offset, deduplicates texture records, and explicitly retains source stone/oak factors. It is deterministic for a given raw export. Blender can choose a different triangulation/index order for coplanar polygons; rebuild byte equality is not promised.

## Physical verification and limits

`verify_native_runtime.mjs` uses the actual repository runtime helpers on the exact quantized GLB (texture decoding removed only in CPU memory). It checks five discoveries,25 aspect-specific seals/approaches,10 authored home paths and2,625 ordinary dense seal rays. It records exact `courtPassageSample` poses, including the overlap where camera motion begins at u=.68 while hinges finish at.78.

`verify_native_sweeps.py` imports the exact GLB, tests every <=1° moving-triangle interval against all nearby retained static triangles with a conservative0.15mm SAT expansion (greater than measured arc/chord error), and checks analytic paired-centre extrema. The complete angular/contact union is collected, not only the first failing angle. Blender float32 import tolerance is documented as1µm.

`verify_native_camera_curve.py` runs the sweep proof, then checks every0.002-u interval for25 views. It tests a swept camera near-plane volume against the full retained world and conservative moving-triangle hulls. It does not hide architecture early. The generated `native-camera-curves.json` is temporary reproducible input, not a runtime asset. Compact proof JSONs are bound to the artifact SHA by `finalize_native_handoff.py`.

Blender proof PNGs are inspection images, not browser evidence. Actual WebGL all-room/full-DPR opaque seals, uninterrupted material/shadow, physical reveal/reverse, all device widths, peak draw calls and preserved fast/reduced/fallback paths remain mandatory integration gates. Do not claim success from CPU or Blender alone.

Do not ship `.blend`, raw GLB, proof PNGs, temporary camera curves or caches as app assets. Ship the GLB/layout/provenance and preserve the source scripts, README, compact proofs and four small maps with their provenance in the repository’s authoring directory.
