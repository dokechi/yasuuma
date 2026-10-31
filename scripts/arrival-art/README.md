# Original castle arrival court — approved v3 integration candidate

This is original, purpose-built geometry, not an imported/copy of Igloo's site or models. The user-supplied reference screenshots informed scale, material, quiet composition and contact-lighting goals only. It is an integration prototype; no claim of equivalent final visual quality.

Runtime files:
- `arrival-court-v1.glb` — canonical runtime filename; authored revision v3.
- `arrival-court-v1-layout.json` — metre units, glTF Y-up cameras/targets, room/focus/approach anchors.
- `arrival-court-v1-provenance.json` — source/material provenance and exact SHA256.

Authored inputs and rebuild (Blender 4.3.2, Python 3):
```
blender --factory-startup -b -t 8 -P bake_stone_material.py
blender --factory-startup -b -t 8 -P build_arrival_court.py
python quantize_arrival_court.py
```
The supplied maps already match the accepted source. The first command is optional and regenerates technical normal/ORM maps from the included original periodic material; it does not recreate the basecolor image. Add `-- --render` to the build command to make Blender inspection PNGs. No OpenImageDenoise dependency.

The small original basecolor JPEG is a frozen built-in-imagegen output, downscaled only for runtime; its full prompt is in `materials/stone-basecolor-prompt.txt`. The normal is an actual tangent-space Blender bake of original periodic microrelief, not an AI picture presented as measured normals. ORM packs neutral AO=1, native baked roughness, metal=0. Identical embedded maps are used by Blender and standard glTF PBR.

The quantizer preserves topology, uses millimetre SHORT positions, signed normalized BYTE normals, signed SHORT UVs, and decoder-free KHR_mesh_quantization / KHR_texture_transform. It copies the image bytes unchanged, deduplicates identical texture records, and explicitly carries the source stone tint factors into standard PBR (Blender's MixRGB export omitted them). Maximum position quantization error is 0.5 mm.

Five `room-*` meshes own their doorway frames/mullions/latches; three `closed-*` meshes are sealed wings. `focus-*` and `approach-*` are authored spatial anchors. Renderer must perform actual occlusion raycasts, preserve original room/reader/auth/data controllers, retain immediate DOM routes, and fall back to the existing painted castle if 3D is unavailable. Phone focuses the burgundy study entrance instead of shrinking all destinations into a miniature.

Do not ship the intermediate raw GLB, `.blend` source caches, or inspection PNGs as application assets. Keep this source directory and the three small maps for future maintenance. Actual WebGL lighting, focus views, quality/fallback and device QA remain the integration owner's release gate.
