# Original castle arrival court — v4 insurance continuity candidate

This is original, purpose-built geometry, not an imported/copy of Igloo's site or models. The user-supplied reference screenshots informed scale, material, quiet composition and contact-lighting goals only. It is an integration prototype; no claim of equivalent final visual quality.

Runtime files:
- `arrival-court-v1.glb` — canonical runtime filename; authored revision v4 insurance slice.
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

Five `room-*` roots own their doorway frames/mullions/latches; three `closed-*` meshes are sealed wings. `focus-*` and `approach-*` are authored spatial anchors. Renderer must perform actual occlusion raycasts, preserve original room/reader/auth/data controllers, retain immediate DOM routes, and fall back to the existing painted castle if 3D is unavailable. Phone focuses the burgundy study entrance instead of shrinking all destinations into a miniature.

Do not ship the intermediate raw GLB, `.blend` source caches, or inspection PNGs as application assets. Keep this source directory and the three small maps for future maintenance. Actual WebGL lighting, focus views, quality/fallback and device QA remain the integration owner's release gate.

Revision v3.1 changes only the existing five textile and hanging-rail clusters by 0.46 m toward the court. Actual WebGL showed them embedded behind the pier faces. Mesh counts, materials, camera composition, portal targets and functions are unchanged; native source carries the corrected placements.

Revision v3.2 changes only the native phone establishing camera to Y-up position[0.5,2.6,16], target[-3.85,3.5,-1.5], verticalFOV44 degrees. Source, glTF camera and layout agree; it is not a hidden renderer override. Actual WebGL composition acceptance remains pending.

Revision v3.3 assigns only the closed lottery textile to the existing matte cloth_teal material, keeping its green family and separating it from the intentionally open copper dome shadow policy. No new material, primitive, geometry or camera is added.


## Native insurance portal (v4 vertical slice)

`split_insurance_portal.py`, called by the main build after static joining, partitions **only** the existing insurance body, fanlight, wood bars and knobs. It bisects and caps the centre cut, preserving original exterior UVs/custom normals and existing materials. The static arch, iron reveal, burgundy textile and rail stay in place. No new room imagery, lighting, camera, decoration or material is included.

The ownership root is now an EMPTY `room-insurance`, with an object-valued `courtPortal` glTF extras contract. Children are `portal-frame-insurance`, two native `hinge-insurance-{left,right}` empties, and their `leaf-insurance-*` / `handle-insurance-*` mesh children. Axes and pivots in extras are **world/Y-up**, not Blender-local. Renderer derives the appropriate local axis from the native world quaternion. Mesh-only quantization scale does not alter EMPTY pivots.

Closed native appearance matches v3.3. The existing arched silhouette is NOT a fully opaque rectangle: only `opaqueRect` is guaranteed within the closed leaf union. Use the exact exported metadata to derive a viewport-covering seal, verify full-alpha rendered pixels before switching world/DOM layers, and keep exterior lighting continuous through the seal. The inward hinge angles are left +85 degrees / right -85 degrees around world Y. Final crossing eye Z=-4.10 puts the open leaves (minimum Z approximately -3.92017) physically behind the eye. No final door fade or disappearance is needed.

Native geometry checks: each frame/leaf/handle closed and manifold; 525 safe-rectangle CPU rays covered; 441 ultrawide final-crossing rays clear; all five unchanged approach targets remain honest first-hit room geometry. These are topology/CPU and Blender inspection checks, **not actual WebGL midframe acceptance**. Remaining release gate: the single adopted live canvas, opaque seal/lighting continuity, static real reader handoff and exact reverse path at all four sizes, including reduced/instant/failure paths.

Budget: 54,440 triangles (+76 cut/cap triangles), 52 primitive groups (approved insurance target; hard maximum 64), 12 unchanged PBR materials, three unchanged embedded maps / 118,784 source texels. Runtime GLB must remain below 2,000,000 bytes and 60,000 triangles. Other 15 meshes and both cameras remain unchanged from final v3.3.

A clean portable rebuild reproduced the exact native nodes/extras, camera transforms, named material definitions and all quantized position/normal/UV vertex sets, with the same byte/triangle/group totals. Blender can choose a different triangulation/index ordering for coplanar n-gons, so a rebuild is geometrically equivalent but is not promised to have the identical GLB SHA. The supplied provenance binds the shipped artifact exactly; the quantizer is deterministic for the same raw export.
