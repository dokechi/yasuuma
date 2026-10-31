/* Pure geometry, bounded assets and demand scheduling for the optional court.
   No browser state, routes, data requests or global animation loop. */
export const COURT_KEYS=Object.freeze(['insurance','otoku','rakuten','lottery','sourcing','planned-5','planned-6','reserve']);
export const COURT_BUDGET=Object.freeze({bytes:2_000_000,triangles:60_000,materials:12,pixels:1_800_000,dpr:1.5,dimension:4096,textureSide:512,texels:1_000_000,images:4});
const finite=value=>Number.isFinite(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function renderDimensions(width,height,dpr=1){
 if(!finite(width)||!finite(height)||width<=0||height<=0||width>1_000_000||height>1_000_000)throw Error('Court dimensions must be positive and bounded');
 const ratio=Math.min(finite(dpr)&&dpr>0?dpr:1,COURT_BUDGET.dpr,Math.sqrt(COURT_BUDGET.pixels/(width*height)),COURT_BUDGET.dimension/Math.max(width,height));
 const physicalWidth=Math.max(1,Math.floor(width*ratio)),physicalHeight=Math.max(1,Math.floor(height*ratio));
 return {width,height,pixelRatio:ratio,physicalWidth,physicalHeight,physicalPixels:physicalWidth*physicalHeight};
}
export function copyPose(pose){return {position:[...pose.position],target:[...pose.target],fov:pose.fov};}
export function validPose(pose){return !!pose&&['position','target'].every(key=>Array.isArray(pose[key])&&pose[key].length===3&&pose[key].every(finite))&&finite(pose.fov)&&pose.fov>=10&&pose.fov<=100&&pose.position.some((value,i)=>Math.abs(value-pose.target[i])>1e-6);}
export function interpolatePose(from,to,t){
 const progress=clamp(t,0,1);if(progress===0)return copyPose(from);if(progress===1)return copyPose(to);const eased=progress*progress*(3-2*progress);
 return {position:from.position.map((value,i)=>value+(to.position[i]-value)*eased),target:from.target.map((value,i)=>value+(to.target[i]-value)*eased),fov:from.fov+(to.fov-from.fov)*eased};
}
export function orbitPose(pose,yaw){
 const angle=clamp(finite(yaw)?yaw:0,-.3,.3),[x,y,z]=pose.position.map((value,i)=>value-pose.target[i]),c=Math.cos(angle),s=Math.sin(angle);
 return {...copyPose(pose),position:[pose.target[0]+x*c+z*s,pose.target[1]+y,pose.target[2]+z*c-x*s]};
}
export function focusPose(home,point,approach=null){
 if(!Array.isArray(point)||point.length!==3||!point.every(finite))throw Error('Invalid room focus');
 if(approach){const pose={position:[...approach],target:[...point],fov:40};if(!validPose(pose))throw Error('Invalid authored room approach');return pose;}
 return {position:home.position.map((v,i)=>v+(point[i]-v)*(i===1?.06:.20)),target:home.target.map((v,i)=>v+(point[i]-v)*.77),fov:Math.max(28,home.fov-3)};
}
export function createCameraMotion(initial,now=()=>performance.now()){
 if(!validPose(initial))throw Error('Invalid court camera');let from=copyPose(initial),to=copyPose(initial),started=0,duration=0;
 const sample=(time=now())=>duration?interpolatePose(from,to,(time-started)/duration):copyPose(to);
 return {sample,moving:(time=now())=>duration>0&&time<started+duration,to(next,{instant=false,durationMs=680}={}){if(!validPose(next))throw Error('Invalid court camera');const time=now();from=sample(time);to=copyPose(next);started=time;duration=instant?0:clamp(finite(durationMs)?durationMs:680,1,1200);return sample(time);},settle(){duration=0;from=copyPose(to);return copyPose(to);}};
}
export function createDemandDriver({render,request=cb=>requestAnimationFrame(cb),cancel=id=>cancelAnimationFrame(id)}){
 let active=true,disposed=false,pending=null;
 const tick=time=>{pending=null;if(disposed||!active)return;if(render(time))invalidate();};
 function invalidate(){if(!disposed&&active&&pending===null)pending=request(tick);}
 return {invalidate,setActive(value){const next=!!value;if(disposed||next===active)return;active=next;if(!active&&pending!==null){cancel(pending);pending=null;}if(active)invalidate();},dispose(){disposed=true;active=false;if(pending!==null)cancel(pending);pending=null;},state:()=>({active,disposed,pendingFrame:pending!==null})};
}
function imageDimensions(bytes,mime){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'){
  if(bytes.length<33||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a||view.getUint32(8)!==13||view.getUint32(12)!==0x49484452)throw Error('Invalid embedded court PNG');
  return {width:view.getUint32(16),height:view.getUint32(20)};
 }
 if(mime==='image/jpeg'){
  if(bytes.length<4||view.getUint16(0)!==0xffd8)throw Error('Invalid embedded court JPEG');
  let offset=2;
  while(offset<bytes.length){
   if(bytes[offset++]!==0xff)throw Error('Invalid embedded court JPEG marker');
   while(bytes[offset]===0xff)offset++;
   const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;
   if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   if(offset+2>bytes.length)break;const length=view.getUint16(offset);
   if(length<2||offset+length>bytes.length)throw Error('Invalid embedded court JPEG segment');
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
    if(length<8)throw Error('Invalid embedded court JPEG dimensions');
    return {width:view.getUint16(offset+5),height:view.getUint16(offset+3)};
   }
   offset+=length;
  }
  throw Error('Missing embedded court JPEG dimensions');
 }
 throw Error('Court supports embedded PNG or JPEG only');
}
export function inspectCourtGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>COURT_BUDGET.bytes)throw Error('Court GLB exceeds its size contract');
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid court GLB header');
 const jsonLength=view.getUint32(12,true);if(view.getUint32(16,true)!==0x4e4f534a||jsonLength%4||20+jsonLength>buffer.byteLength)throw Error('Invalid court GLB JSON chunk');
 const data=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
 let binary=null;for(let offset=20+jsonLength;offset<buffer.byteLength;){
  if(offset+8>buffer.byteLength)throw Error('Invalid court GLB chunk');const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);
  if(length%4||offset+8+length>buffer.byteLength||type!==0x004e4942||binary)throw Error('Invalid court GLB binary chunk');
  binary=new Uint8Array(buffer,offset+8,length);offset+=8+length;
 }
 if(data.asset?.version!=='2.0')throw Error('Court requires glTF 2.0');
 if([...(data.buffers||[]),...(data.images||[])].some(item=>item.uri!==undefined))throw Error('Court GLB cannot request external or data-URI resources');
 if((data.extensionsUsed||[]).some(name=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(name)))throw Error('Court does not load optional decoders');
 if((data.materials||[]).length>COURT_BUDGET.materials)throw Error('Court exceeds material budget');
 const images=data.images||[];if(images.length>COURT_BUDGET.images)throw Error('Court exceeds image budget');
 let texels=0;const imageSizes=images.map(image=>{
  const ref=data.bufferViews?.[image.bufferView],offset=ref?.byteOffset??0,length=ref?.byteLength,bufferLength=data.buffers?.[0]?.byteLength;
  if(!Number.isSafeInteger(image.bufferView)||!binary||ref?.buffer!==0||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<1||!Number.isSafeInteger(bufferLength)||bufferLength>binary.length||offset+length>bufferLength)throw Error('Invalid embedded court image buffer');
  const size=imageDimensions(binary.subarray(offset,offset+length),image.mimeType);
  if(!size.width||!size.height||size.width>COURT_BUDGET.textureSide||size.height>COURT_BUDGET.textureSide)throw Error('Court image exceeds decoded dimensions');
  texels+=size.width*size.height;if(texels>COURT_BUDGET.texels)throw Error('Court exceeds decoded texture budget');return {...size,mime:image.mimeType};
 });
 const textures=data.textures||[];if(textures.length>COURT_BUDGET.images||textures.some(texture=>!Number.isSafeInteger(texture.source)||texture.source<0||texture.source>=images.length))throw Error('Invalid court texture sources');
 const triangleCounts=(data.meshes||[]).map(mesh=>(mesh.primitives||[]).reduce((sum,primitive)=>{if(primitive.mode!==undefined&&primitive.mode!==4)throw Error('Court mesh must use triangles');const accessor=data.accessors?.[primitive.indices??primitive.attributes?.POSITION],count=accessor?.count;if(!Number.isSafeInteger(count)||count<0||count%3)throw Error('Invalid court triangle indices');return sum+count/3;},0));
 const triangles=(data.nodes||[]).reduce((sum,node)=>{
  let instances=1;const attributes=node.extensions?.EXT_mesh_gpu_instancing?.attributes;
  if(attributes){const counts=Object.values(attributes).map(index=>data.accessors?.[index]?.count);if(!counts.length||!counts.every(count=>Number.isSafeInteger(count)&&count>0&&count===counts[0]))throw Error('Invalid court instance counts');instances=counts[0];}
  return sum+(node.mesh===undefined?0:(triangleCounts[node.mesh]??Infinity)*instances);
 },0);
 if(!finite(triangles)||triangles>COURT_BUDGET.triangles)throw Error('Court exceeds triangle budget');
 return {json:data,bytes:buffer.byteLength,triangles,materials:(data.materials||[]).length,textureCount:textures.length,imageCount:images.length,texels,imageSizes};
}
// GLTFLoader creates these URLs only for already-validated embedded image bytes.
// No loader-supplied remote/data URI is allowed, even after validation.
export function embeddedCourtURL(value,origin){
 const url=new URL(value);if(url.protocol!=='blob:'||url.origin!==origin)throw Error('Court model may not load secondary resources');return value;
}
// First visible physical surface wins. A different wall/prop blocks a portal;
// no broad distance tolerance can select a destination through architecture.
export function courtRoomAtHit(hits){
 for(const hit of hits){
  const object=hit.object;let visible=true,room=null;
  for(let node=object;node;node=node.parent){if(node.visible===false)visible=false;if(!room&&COURT_KEYS.includes(node.userData?.courtRoom))room=node.userData.courtRoom;}
  const material=Array.isArray(object.material)?object.material[hit.face?.materialIndex??0]:object.material;
  if(!visible||material?.visible===false||(material?.transparent&&material.opacity===0))continue;
  return room;
 }
 return null;
}
export function disposeCourtResources(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse?.(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
 for(const texture of textures){texture.dispose?.();texture.source?.data?.close?.();}
 for(const material of materials)material.dispose?.();for(const geometry of geometries)geometry.dispose?.();
 return {geometries:geometries.size,materials:materials.size,textures:textures.size};
}
