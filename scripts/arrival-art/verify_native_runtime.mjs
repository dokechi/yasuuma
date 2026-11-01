// CPU geometry proof only: remove texture references in memory to avoid browser
// image decoding. It does NOT certify shader/material rendering.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const moduleDir=path.resolve(process.argv[3]||'command_center_continuity/command-center-98/lounge');
const T=await import(pathToFileURL(path.join(moduleDir,'vendor/three-r187/court-three.js')));
const {COURT_KEYS,courtRoomAtHit,inspectCourtGLB,prepareCourtPortal,courtPassageSample}=await import(pathToFileURL(path.join(moduleDir,'arrival-camera.js')));
const f=await fs.readFile(process.argv[2]);const original=f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength),info=inspectCourtGLB(original);console.log('asset',JSON.stringify({...info,json:undefined}));
const json=info.json;function removeMaps(o){if(!o||typeof o!=='object')return;for(const key of Object.keys(o)){if(/Texture$/.test(key))delete o[key];else removeMaps(o[key]);}}for(const material of json.materials||[])removeMaps(material);delete json.images;delete json.textures;
const v=new DataView(original),jsonLength=v.getUint32(12,true),bin=new Uint8Array(original,28+jsonLength),raw=new TextEncoder().encode(JSON.stringify(json)),length=Math.ceil(raw.length/4)*4,out=new ArrayBuffer(28+length+bin.length),ov=new DataView(out);ov.setUint32(0,0x46546c67,true);ov.setUint32(4,2,true);ov.setUint32(8,out.byteLength,true);ov.setUint32(12,length,true);ov.setUint32(16,0x4e4f534a,true);new Uint8Array(out,20,length).fill(32);new Uint8Array(out,20,raw.length).set(raw);ov.setUint32(20+length,bin.length,true);ov.setUint32(24+length,0x004e4942,true);new Uint8Array(out,28+length).set(bin);
const {scene}=await new T.GLTFLoader().parseAsync(out,'');scene.updateMatrixWorld(true);const ray=new T.Raycaster(),anchors=new Map();for(const key of COURT_KEYS){const door=scene.getObjectByName('room-'+key)||scene.getObjectByName('closed-'+key);door.traverse(o=>{if(o.isMesh)o.userData.courtRoom=key;});const focus=scene.getObjectByName('focus-'+key);anchors.set(key,focus?focus.getWorldPosition(new T.Vector3()):new T.Box3().setFromObject(door).getCenter(new T.Vector3()));}

const {inspectNativeCourtPortal,prepareNativeCourtPortalPlan,validateCourtApproachPath}=await import(pathToFileURL(path.join(moduleDir,'arrival-renderer.js')));

const results=[],curves=[];const assetDir=path.dirname(path.resolve(process.argv[2]));
for(const key of ['insurance','otoku','rakuten','lottery','sourcing']){
 const root=scene.getObjectByName('room-'+key),before=[];scene.traverse(n=>before.push([n,n.quaternion.toArray()]));
 const record=inspectNativeCourtPortal(scene,root,key),result={key,mode:record.leafMode,geometry:record.geometry,views:[],homePaths:[],opaqueRectRays:0};
 for(const [w,h]of [[320,588],[390,848],[800,596],[1440,848],[3840,1080]]){
  const p=prepareNativeCourtPortalPlan(scene,record,w,h),approach={position:record.approach,target:p.eye,fov:40};
  const samples=[];for(let i=0;i<=240;i++){const u=.52+i*.002;const sample=courtPassageSample(approach,approach,p,u);samples.push([u,sample.open,...sample.pose.position]);}
  curves.push({room:key,width:w,height:h,near:.1,fov:40,hinges:record.spec.hinges,samples});
  result.views.push({w,h,seal:p.seal.position,inside:p.inside.position,near:.1,curveSamples:samples.length});
 }
 for(const name of ['arrival-camera','phone-camera']){validateCourtApproachPath(scene,[scene.getObjectByName(name).getWorldPosition(new T.Vector3()).toArray(),record.approach]);result.homePaths.push(name);}
 const rect=record.spec.opaqueRect;
 for(let yi=0;yi<=20;yi++)for(let xi=0;xi<=24;xi++){
  const x=rect.min[0]+(rect.max[0]-rect.min[0])*xi/24,y=rect.min[1]+(rect.max[1]-rect.min[1])*yi/20;
  ray.set(new T.Vector3(x,y,rect.min[2]+1.2),new T.Vector3(0,0,-1));
  if(courtRoomAtHit(ray.intersectObject(scene,true))!==key)throw Error(key+' opaque rectangle hole '+x+','+y);result.opaqueRectRays++;
 }
 result.restored=before.every(([n,q])=>n.quaternion.toArray().every((v,i)=>v===q[i]));if(!result.restored)throw Error('Native pose changed');results.push(result);
}
const report={assetSha256:crypto.createHash('sha256').update(f).digest('hex'),runtimeCameraSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(moduleDir,'arrival-camera.js'))).digest('hex'),runtimeRendererSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(moduleDir,'arrival-renderer.js'))).digest('hex'),method:'Exact repository runtime helpers on texture-free CPU-loaded GLB; dense seal rays use ordinary Raycaster without seam fallback; no shader/render claim.',pass:true,results};
await fs.writeFile(path.join(assetDir,'native-runtime-proof.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(assetDir,'native-camera-curves.json'),JSON.stringify({...report,curves}));
console.log('NATIVE_RUNTIME_PASS',report.assetSha256,results.length,'rooms',curves.length,'view curves');
