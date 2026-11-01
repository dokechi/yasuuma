import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectCourtGLB,courtRoomAtHit,disposeCourtResources,prepareCourtPortal} from '../command-center-98/lounge/arrival-camera.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Asset-owner contract is intentionally explicit: no network or missing-asset skip.
const asset=path.join(root,'command-center-98/lounge/assets/arrival-court-v1.glb');
const provenance=path.join(root,'command-center-98/lounge/assets/arrival-court-v1-provenance.json');
const keys=['insurance','otoku','rakuten','lottery','sourcing'];
const required=[...keys.map(key=>'room-'+key),...keys.map(key=>'focus-'+key),...keys.map(key=>'approach-'+key),'closed-planned-5','closed-planned-6','closed-reserve','arrival-camera','phone-camera'];

function parseGLB(bytes){
 assert.ok(bytes.length>=20,'GLB header exists');
 assert.equal(bytes.toString('ascii',0,4),'glTF','GLB magic');
 assert.equal(bytes.readUInt32LE(4),2,'GLB version 2');
 assert.equal(bytes.readUInt32LE(8),bytes.length,'declared GLB length matches actual bytes');
 let offset=12,json=null,bin=null,chunks=0;
 while(offset<bytes.length){
  assert.ok(offset+8<=bytes.length,'complete chunk header');
  const size=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4);offset+=8;
  assert.equal(size%4,0,'four-byte aligned chunk');assert.ok(offset+size<=bytes.length,'chunk in bounds');
  const data=bytes.subarray(offset,offset+size);offset+=size;
  if(kind===0x4e4f534a){assert.equal(chunks,0,'JSON is first and unique');json=JSON.parse(data.toString('utf8').replace(/\x00+$/,''));}
  else if(kind===0x004e4942){assert.ok(json&&!bin,'one BIN follows JSON');bin=data;}
  else assert.fail('unexpected GLB chunk');chunks++;
 }
 assert.ok(json&&bin,'JSON and BIN present');assert.equal(json.asset?.version,'2.0');
 const supportedRequired=new Set(['KHR_mesh_quantization','KHR_texture_transform','KHR_materials_unlit','KHR_materials_emissive_strength']);
 assert.ok((json.extensionsRequired||[]).every(name=>supportedRequired.has(name)),'only explicitly supported, decoder-free required extensions');
 assert.ok(!(json.extensionsUsed||[]).some(name=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_meshopt_compression','KHR_texture_basisu'].includes(name)),'no runtime decoder dependency');
 assert.ok(Array.isArray(json.buffers)&&json.buffers.length===1,'one embedded buffer');
 assert.equal(json.buffers[0].uri,undefined,'binary buffer has no external URI');
 assert.ok(json.buffers[0].byteLength<=bin.length&&bin.length-json.buffers[0].byteLength<=3,'BIN padding only');
 for(const view of json.bufferViews||[]){assert.equal(view.buffer,0);assert.ok(Number.isSafeInteger(view.byteLength)&&view.byteLength>=0);assert.ok((view.byteOffset||0)+view.byteLength<=json.buffers[0].byteLength,'bufferView in bounds');}
 for(const image of json.images||[]){assert.equal(image.uri,undefined,'images must be embedded, not external');assert.ok(Number.isInteger(image.bufferView)&&json.bufferViews[image.bufferView],'embedded image view exists');}
 return {json,bin};
}

function triangleCount(json){
 const nodes=json.nodes||[],accessors=json.accessors||[];let total=0;
 const scene=json.scenes?.[json.scene??0];assert.ok(scene&&Array.isArray(scene.nodes),'default scene exists');
 const visit=(index,ancestors)=>{
  assert.ok(Number.isInteger(index)&&nodes[index],'scene node exists');assert.ok(!ancestors.has(index),'no cyclic hierarchy');
  const chain=new Set(ancestors).add(index),node=nodes[index];
  if(node.mesh!==undefined){
   const mesh=json.meshes?.[node.mesh];assert.ok(mesh,'mesh exists');
   let instances=1;const attributes=node.extensions?.EXT_mesh_gpu_instancing?.attributes;
   if(attributes){const counts=Object.values(attributes).map(index=>accessors[index]?.count);assert.ok(counts.length&&counts.every(count=>Number.isSafeInteger(count)&&count>0&&count===counts[0]),'consistent instance counts');instances=counts[0];}
   for(const primitive of mesh.primitives||[]){
    assert.equal(primitive.mode??4,4,'court is exported as triangle primitives');
    const accessor=accessors[primitive.indices??primitive.attributes?.POSITION];assert.ok(accessor,'triangle accessor exists');
    assert.ok(Number.isSafeInteger(accessor.count)&&accessor.count>=0&&accessor.count%3===0,'whole triangle indices');total+=accessor.count/3*instances;
   }
  }
  for(const child of node.children||[])visit(child,chain);
 };
 for(const index of scene.nodes)visit(index,new Set());return total;
}

test('arrival court is a bounded, self-contained real GLB with all eight destination anchors',()=>{
 const bytes=fs.readFileSync(asset),{json}=parseGLB(bytes),triangles=triangleCount(json);
 const runtime=inspectCourtGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.ok(runtime.imageCount<=4&&runtime.textureCount<=4&&runtime.texels<=1_000_000,'decoded texture budget');
 assert.ok(runtime.imageSizes.every(image=>image.width<=512&&image.height<=512),'bounded embedded image dimensions');
 assert.ok(bytes.length<=2_000_000,`GLB budget: ${bytes.length} bytes`);
 assert.ok(triangles>0&&triangles<=60_000,`rendered scene budget: ${triangles} triangles`);
 const groups=(json.nodes||[]).reduce((count,node)=>count+(node.mesh===undefined?0:json.meshes[node.mesh].primitives.length),0);
 assert.ok(groups>0&&groups<=64,`primitive draw-group budget: ${groups}`);
 assert.ok((json.materials||[]).length>0&&(json.materials||[]).length<=12,'one to twelve materials');
 const names=(json.nodes||[]).map(node=>node.name);
 for(const name of required)assert.equal(names.filter(candidate=>candidate===name).length,1,`unique destination node ${name}`);
 console.log(JSON.stringify({asset:path.relative(root,asset),bytes:bytes.length,triangles,materials:json.materials.length,primitiveGroups:groups,nodes:json.nodes.length,images:runtime.imageSizes,texels:runtime.texels,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
});

test('arrival court has local original-source provenance',()=>{
 const source=JSON.parse(fs.readFileSync(provenance,'utf8'));
 assert.ok(source&&typeof source==='object'&&!Array.isArray(source),'provenance object');
 assert.ok(JSON.stringify(source).length>100,'meaningful original-source provenance, not an empty marker');
 const bytes=fs.readFileSync(asset);assert.equal(source.runtimeBytes,bytes.length);assert.equal(source.runtimeSha256,crypto.createHash('sha256').update(bytes).digest('hex'),'provenance binds the exact shipped model');
 const sourceRoot=path.join(root,'scripts/arrival-art');assert.ok(Object.keys(source.sourceFiles||{}).length>=3,'source recipes are retained');
 for(const [name,record]of Object.entries(source.sourceFiles)){const file=path.resolve(sourceRoot,name);assert.ok(file.startsWith(sourceRoot+path.sep),'source path stays in its provenance directory');const data=fs.readFileSync(file);assert.equal(data.length,record.bytes,name+' byte count');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),record.sha256,name+' source integrity');}
 const text=JSON.stringify(source);
 assert.match(text,/original|originally|オリジナル|procedural/i,'original asset origin is documented');
 assert.match(text,/blender|gltf|glb/i,'authoring/export method documented');
});

test('asset parser rejects truncated and external-resource GLBs',()=>{
 assert.throws(()=>parseGLB(Buffer.alloc(12)),/header/);
 const json={asset:{version:'2.0'},buffers:[{byteLength:4,uri:'https://untrusted.invalid/model.bin'}]};
 const payload=Buffer.from(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length/4)*4,' ')),bytes=Buffer.alloc(12+8+payload.length+8+4);
 bytes.write('glTF');bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(payload.length,12);bytes.writeUInt32LE(0x4e4f534a,16);payload.copy(bytes,20);bytes.writeUInt32LE(4,20+payload.length);bytes.writeUInt32LE(0x004e4942,24+payload.length);
 assert.throws(()=>parseGLB(bytes),/external URI/);
});

test('triangle accounting includes repeated nodes and GPU instances',()=>{
 const json={scene:0,scenes:[{nodes:[0,1]}],nodes:[{mesh:0},{mesh:0,extensions:{EXT_mesh_gpu_instancing:{attributes:{TRANSLATION:1}}}}],meshes:[{primitives:[{indices:0}]}],accessors:[{count:9},{count:4}]};
 assert.equal(triangleCount(json),15);
 json.nodes[0].children=[0];assert.throws(()=>triangleCount(json),/cyclic/);
});

async function geometryScene(t){
 const bytes=fs.readFileSync(asset),{json,bin}=parseGLB(bytes);
 // Validate ORIGINAL embedded textures/budgets first. CPU geometry inspection
 // then removes only material map bindings in a detached JSON copy, so Node
 // does not need browser image decode. This is not shader/material proof.
 inspectCourtGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const geometryJSON=structuredClone(json);
 const removeMaps=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(/Texture$/.test(key))delete value[key];else removeMaps(value[key]);}};
 for(const material of geometryJSON.materials||[])removeMaps(material);delete geometryJSON.images;delete geometryJSON.textures;
 const encoded=Buffer.from(JSON.stringify(geometryJSON)),length=Math.ceil(encoded.length/4)*4,cpu=Buffer.alloc(28+length+bin.length);
 cpu.write('glTF');cpu.writeUInt32LE(2,4);cpu.writeUInt32LE(cpu.length,8);cpu.writeUInt32LE(length,12);cpu.writeUInt32LE(0x4e4f534a,16);cpu.fill(32,20,20+length);encoded.copy(cpu,20);cpu.writeUInt32LE(bin.length,20+length);cpu.writeUInt32LE(0x004e4942,24+length);bin.copy(cpu,28+length);
 const T=await import('../command-center-98/lounge/vendor/three-r187/court-three.js');
 const {scene}=await new T.GLTFLoader().parseAsync(cpu.buffer.slice(cpu.byteOffset,cpu.byteOffset+cpu.byteLength),'');t.after(()=>disposeCourtResources(scene));scene.updateMatrixWorld(true);
 for(const key of [...keys,'planned-5','planned-6','reserve']){const door=scene.getObjectByName('room-'+key)||scene.getObjectByName('closed-'+key);assert.ok(door,'physical destination '+key);door.traverse(node=>{if(node.isMesh)node.userData.courtRoom=key;});}
 return {T,scene,bytes};
}

test('all five authored approaches hit their own real doorway before any roof or wall',async t=>{
 const {T,scene,bytes}=await geometryScene(t);
 const results=[];
 for(const key of keys){
  const focus=scene.getObjectByName('focus-'+key),approach=scene.getObjectByName('approach-'+key);assert.ok(focus&&approach,'authored focus and approach '+key);
  const point=focus.getWorldPosition(new T.Vector3()),camera=new T.PerspectiveCamera(40,390/600,.1,120);camera.position.copy(approach.getWorldPosition(new T.Vector3()));camera.lookAt(point);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const ndc=point.clone().project(camera),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(ndc.x,ndc.y),camera);const hits=ray.intersectObject(scene,true),owner=courtRoomAtHit(hits),detail={key,owner,front:hits[0]?.object.name,ndc:ndc.toArray()};results.push(detail);
  assert.ok(Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z>=-1&&ndc.z<=1,'target in authored view: '+JSON.stringify(detail));
  assert.equal(owner,key,'nearest actual surface belongs to chosen doorway: '+JSON.stringify(detail));
 }
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex'),crypto.createHash('sha256').update(bytes).digest('hex'),'CPU proof never changes the canonical GLB');
 console.log('COURT_APPROACH_RAYS '+JSON.stringify(results));
});


test('native insurance leaves physically seal the viewport and clear the crossing corridor',async t=>{
 const {T,scene}=await geometryScene(t),portal=scene.getObjectByName('room-insurance'),spec=portal.userData.courtPortal;
 assert.ok(spec,'native portal metadata exists');
 assert.deepEqual(spec.hinges.map(hinge=>hinge.node),['hinge-insurance-left','hinge-insurance-right'],'exactly two native hinges');
 assert.ok(scene.getObjectByName(spec.frame),'native arch frame exists');
 const isDescendant=(node,parent)=>{for(let current=node;current;current=current.parent)if(current===parent)return true;return false;};
 for(const hinge of spec.hinges){
  const node=scene.getObjectByName(hinge.node),leaf=scene.getObjectByName(hinge.leaf),handle=scene.getObjectByName(hinge.handle);
  assert.ok(node&&leaf&&handle&&isDescendant(node,portal)&&isDescendant(leaf,node)&&isDescendant(handle,node),'physical leaf and handle belong to their real hinge');
  assert.ok(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...hinge.pivot))<=.001,'authored hinge pivot matches metadata within 1mm');
  assert.ok(Math.abs(Math.abs(hinge.openRadians)-85*Math.PI/180)<1e-6,'authored leaf opens 85 degrees');
 }
 const ray=new T.Raycaster(),rect=spec.opaqueRect;let closedSamples=0;
 for(let yi=0;yi<=20;yi++)for(let xi=0;xi<=24;xi++){
  const x=rect.min[0]+(rect.max[0]-rect.min[0])*xi/24,y=rect.min[1]+(rect.max[1]-rect.min[1])*yi/20;
  ray.set(new T.Vector3(x,y,rect.min[2]+1),new T.Vector3(0,0,-1));
  assert.equal(courtRoomAtHit(ray.intersectObject(portal,true)),'insurance',`opaque safe rectangle has no hole at ${x},${y}`);closedSamples++;
 }
 assert.equal(closedSamples,525);
 const seals=[];
 for(const [width,height]of [[320,588],[390,848],[800,596],[1440,848],[3840,1080]]){
  const plan=prepareCourtPortal(spec,width,height),camera=new T.PerspectiveCamera(plan.seal.fov,width/height,.1,120);
  camera.position.fromArray(plan.seal.position);camera.lookAt(...plan.seal.target);camera.updateMatrixWorld();
  for(const x of[-.999,0,.999])for(const y of[-.999,0,.999]){ray.setFromCamera(new T.Vector2(x,y),camera);assert.equal(courtRoomAtHit(ray.intersectObject(scene,true)),'insurance',`closed portal covers ${width}x${height} at ${x},${y}`);}
  seals.push({width,height,coverage:plan.coverage});
 }
 for(const hinge of spec.hinges){
  const node=scene.getObjectByName(hinge.node),inverse=node.getWorldQuaternion(node.quaternion.clone()).invert(),axis=new T.Vector3(...hinge.axis).applyQuaternion(inverse);
  node.quaternion.multiply(node.quaternion.clone().setFromAxisAngle(axis,hinge.openRadians));
 }
 scene.updateMatrixWorld(true);
 for(const hinge of spec.hinges)assert.ok(new T.Box3().setFromObject(scene.getObjectByName(hinge.node)).min.z>spec.crossing.position[2],'opened native leaf is physically behind the crossing eye');
 const inside=new T.PerspectiveCamera(40,3.2,.1,120);inside.position.fromArray(spec.crossing.position);inside.lookAt(...spec.crossing.target);inside.updateMatrixWorld();let cleared=0;
 for(let yi=0;yi<=20;yi++)for(let xi=0;xi<=20;xi++){
  ray.setFromCamera(new T.Vector2(-1+xi/10,-1+yi/10),inside);
  assert.equal(ray.intersectObject(portal,true).length,0,'no native frame or open leaf remains in front of the crossed camera');cleared++;
 }
 assert.equal(cleared,441);
 console.log('COURT_NATIVE_PORTAL_GEOMETRY '+JSON.stringify({closedSamples,seals,crossingClearRays:cleared,shaderProof:false}));
});
