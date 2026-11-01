"""Bind the frozen original artifact, source recipe and independent proof files."""
import os,json,hashlib,struct
from pathlib import Path
R=Path(__file__).resolve().parent
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(name):return json.loads((R/name).read_text())
asset=R/'arrival-court-v1.glb';sha=digest(asset);raw=asset.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length])
stats=read('arrival-court-v1-quantization.json');assert stats['sha256']==sha
proofs={}
for name in ['native-swept-volume-proof.json','native-runtime-proof.json','native-camera-curve-proof.json']:
 p=read(name);assert p['pass']and p['assetSha256']==sha,(name,'not a passing proof of this artifact');proofs[name]={'sha256':digest(R/name),'assetSha256':sha,'pass':True,'method':p['method']}
source_names=['build_arrival_court.py','split_native_portals.py','quantize_arrival_court.py','bake_stone_material.py','verify_native_sweeps.py','verify_native_runtime.mjs','verify_native_camera_curve.py','finalize_native_handoff.py','README.md']
source_names += [str(p.relative_to(R))for p in sorted((R/'materials').iterdir())if p.is_file()]
sources={name:{'bytes':(R/name).stat().st_size,'sha256':digest(R/name)}for name in source_names}
layout=read('arrival-court-v1-layout.json');layout['authoredRevision']='v5-native-finish';layout['runtimeSha256']=sha;layout['runtimeBytes']=len(raw)
layout['notes'][0]='Original five-portal architectural finish candidate; actual WebGL material/midframe acceptance remains an integration gate.'
layout['notes'][1]='Four original embedded standard-PBR maps: stone basecolor/normal/ORM and one smoked-oak basecolor. No copied assets, external image URI, or user-data changes.'
layout['portals']={n['extras']['courtPortal']['room']:n['extras']['courtPortal']for n in gltf['nodes']if n.get('extras',{}).get('courtPortal')}
layout['budget'].update(trianglesMaximum=60000,primitiveGroupsTarget=64,primitiveGroupsMaximum=64,drawCallsMaximum=128)
layout['physicalProofs']=proofs
(R/'arrival-court-v1-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2))
provenance={
 'asset':asset.name,'authoredRevision':'v5-native-finish','runtimeSha256':sha,'runtimeBytes':len(raw),
 'authoring':'Original Blender 4.3.2 Python procedural architecture, native semantic leaf partition/caps, standard glTF PBR export and decoder-free mesh quantization.',
 'source':'build_arrival_court.py','sourceRecipe':source_names,'sourceFiles':sources,
 'rebuildCommands':['blender --factory-startup -b -t 8 -P build_arrival_court.py','python quantize_arrival_court.py','node verify_native_runtime.mjs arrival-court-v1.glb <repository>/command-center-98/lounge','blender --factory-startup -b -t 8 -P verify_native_camera_curve.py','python finalize_native_handoff.py'],
 'materialOrigin':'Original built-in imagegen stone/oak basecolors with saved prompts; original Blender periodic microrelief normal and roughness bakes. Runtime images are frozen authoring inputs. No third-party images or models.',
 'references':'User-provided Igloo screenshots inform scale/material/quiet-space criteria only; no proprietary asset extraction/copy and no claim of equal production finish.',
 'rasterBudget':{'embeddedImages':4,'decodedSourceTexels':151552,'embeddedImageBytes':stats['embeddedImageBytes'],'maximumImageSide':256,'oakMap':'materials/oak-basecolor-v1.jpg','oakColourFactor':'materials/oak-basecolor-v1.json'},
 'geometry':layout,'quantization':stats,'physicalProofs':proofs,
 'mechanisms':{'lowerThree':'Original upper arch/fanlight fixed; capped rectangular wood leaves and existing knobs move. A real 3mm head clearance is cut, not hidden.', 'archive':'Two inward full arched casements, without invented handles. Rear return rebate stays inside the original wall envelope.', 'observatory':'Single left high clerestory, moving only above Y5.603; original lower pane/grille and dining roof remain fixed. Real3mm sill clearance.', 'pivots':'Front-mounted native hinges, local-X0 centre joint and exact millimetre EMPTY/leaf offsets; no seam overlap, ray perturbation or gap tolerance.', 'pockets':'Local rear jamb/haunch pockets are actual Boolean geometry; central workshop has a continuous retained rear lining inside the old wall envelope. Full-world collision proof includes all fixed frames/fanlights and other rooms.'},
 'explicitTradeoffs':['63 varied rectangular paving courses replace121 small square slabs; original facade RNG is preserved.','Four nonfunctional cage-lantern fixtures and the two associated floor pedestals are omitted to retain64 groups after the fixed lottery lower pane. All room fanlights and the actual study warm-light cue remain.','No distant scenery, extra interior mesh, character replacement, new material, or shadow-noise masking.'],
 'verificationLimits':['Blender inspection PNGs are composition/material intent, not actual WebGL acceptance.','CPU tests certify the exact quantized artifact, not browser alpha pixels or performance.','Actual draw calls including shadow+main+sky must remain <=128 in integration, including moving-leaf peak.','Blender may triangulate coplanar n-gons in a different index order on rebuild; geometric/source equivalence is checked separately, not a promise of identical rebuild bytes.'],
 'licenses':'Original purpose-built geometry/materials; no external model, raster, data or authentication dependency.'}
(R/'arrival-court-v1-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2))
print('NATIVE_HANDOFF_BOUND',sha,len(raw),len(sources),'source files')
