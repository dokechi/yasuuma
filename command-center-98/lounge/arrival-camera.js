/* Pure geometry, bounded assets and demand scheduling for the optional court.
   No browser state, routes, data requests or global animation loop. */
export const COURT_KEYS=Object.freeze(['insurance','otoku','rakuten','lottery','sourcing','planned-5','planned-6','reserve']);
export const COURT_BUDGET=Object.freeze({bytes:2_000_000,triangles:60_000,materials:12,groups:64,pixels:1_800_000,dpr:1.5,dimension:4096,textureSide:512,texels:1_000_000,images:4});
export const COURT_ATMOSPHERE=Object.freeze({exposure:.85,hemisphere:.45,fill:.2,sun:2.2,environment:.25,shadowNormalBias:.012,fogDensity:.022,fogColor:'#586774',skyWidth:256,skyHeight:128});
// An original, quiet latitude gradient. No asset fetch, time loop or custom PBR
// shader: the standard Three equirectangular background follows the camera.
export function courtSkyPixels(){
 const width=COURT_ATMOSPHERE.skyWidth,height=COURT_ATMOSPHERE.skyHeight,data=new Uint8Array(width*height*4);
 const horizon=[88,103,116],zenith=[36,56,77],nadir=[50,71,82];
 for(let y=0;y<height;y++){
  const latitude=y/(height-1)*2-1,other=latitude>=0?zenith:nadir,mix=Math.pow(Math.abs(latitude),.65);
  for(let x=0;x<width;x++){const at=(y*width+x)*4;for(let c=0;c<3;c++)data[at+c]=Math.round(horizon[c]+(other[c]-horizon[c])*mix);data[at+3]=255;}
 }
 return {width,height,data};
}
const finite=value=>Number.isFinite(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function fitCourtShadow(min,max){
 if(![min,max].every(v=>Array.isArray(v)&&v.length===3&&v.every(finite))||min.some((v,i)=>v>=max[i])||max[2]>=-.1)throw Error('Invalid court light-space bounds');
 return {left:min[0]-.5,right:max[0]+.5,bottom:min[1]-.5,top:max[1]+.5,near:Math.max(.1,-max[2]-.5),far:-min[2]+.5};
}
// The authored copper material includes an intentionally open hemisphere. Only
// the audited closed-solid materials use back-face casting; visible PBR faces
// and the open dome remain unchanged.
export function closedCourtShadowMaterial(name){return ['stone_shadow','stone_worn','stone_dusk','oak_smoked','window_amber','brass_aged','iron_forged','cloth_burgundy','cloth_amber','cloth_violet','cloth_teal'].includes(name);}
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
 let active=true,disposed=false,pending=null,generation=0;
 function invalidate(){if(!disposed&&active&&pending===null){const epoch=generation;pending=request(time=>{if(epoch!==generation)return;pending=null;if(disposed||!active)return;if(render(time))invalidate();});}}
 return {invalidate,setActive(value){const next=!!value;if(disposed||next===active)return;generation++;active=next;if(!active&&pending!==null){cancel(pending);pending=null;}if(active)invalidate();},dispose(){generation++;disposed=true;active=false;if(pending!==null)cancel(pending);pending=null;},state:()=>({active,disposed,pendingFrame:pending!==null})};
}
// Each RAF ticket remembers the window that created it. Canvas adoption can
// change ownerDocument; cancelling on its new window would leave an old RAF live.
export function courtSurfaceAvailable(canvas){return canvas?.isConnected===true&&!!canvas.ownerDocument&&!canvas.ownerDocument.hidden;}
export function createSurfaceFrames(getView,now){
 return {
  request(callback){const view=getView();if(!view?.requestAnimationFrame)throw Error('Court surface has no animation owner');const ticket={view,id:null};ticket.id=view.requestAnimationFrame(()=>callback(now()));return ticket;},
  cancel(ticket){if(ticket?.view&&ticket.id!==null)ticket.view.cancelAnimationFrame(ticket.id);}
 };
}
function presentationState(value){
 if(!value||!validPose(value.pose)||!finite(value.width)||!finite(value.height)||value.width<=0||value.height<=0||value.width>1_000_000||value.height>1_000_000||!(value.room===null||COURT_KEYS.includes(value.room)))throw Error('Invalid court presentation state');
 const pose=copyPose(value.pose);Object.freeze(pose.position);Object.freeze(pose.target);Object.freeze(pose);
 return Object.freeze({room:value.room,pose,width:value.width,height:value.height});
}
// A renderer-only exclusive lease. Its owner moves/restores the SAME DOM canvas;
// this state machine never owns DOM, route decisions, timers, or a GL context.
export function createPresentationLeases({snapshot,version=()=>0,valid=()=>true,suspend,paint,restore,resume}){
 let current=null,serial=0,disposed=false,lastReason='idle';
 function close(record,{cancelled=true,direction='in',reason='finished',notify=false,resuming=true}={}){
  if(current!==record||!record||record.closed)return false;
  current=null;record.closed=true;lastReason=reason;
  if(!cancelled&&direction==='out'&&version()===record.version)try{restore(record.returnState);}catch{lastReason='restore-failed';}
  if(notify)try{record.onInvalidated?.(reason);}catch{ /* The renderer still releases its own lease. */ }
  if(resuming&&!disposed&&!current)resume();
  return true;
 }
 function invalidate(reason='cancelled'){serial++;return close(current,{reason,notify:true});}
 function acquire({returnState,onInvalidated,resumeAtReturn=false}={}){
  const intent=++serial;
  close(current,{reason:'replaced',notify:true,resuming:false});
  if(disposed||serial!==intent)return null;if(!valid()){if(!current)resume();return null;}
  let start,saved;try{start=presentationState(snapshot());saved=returnState?presentationState(returnState):start;if(saved.width!==start.width||saved.height!==start.height)throw Error('Changed court return viewport');}catch{if(!current&&!disposed)resume();return null;}
  const record={id:intent,version:version(),start,returnState:saved,onInvalidated,closed:false,paintCount:0};
  current=record;lastReason='leased';
  // Entry freezes the painted departure. Native exit may explicitly seed
  // the saved canonical court resume pose: cancelling it must not strand the
  // camera inside the doorway while waiting for a normal owner-window RAF.
  try{suspend(resumeAtReturn&&returnState?saved:start);}catch{close(record,{reason:'suspend-failed',notify:true});return null;}
  if(current!==record||disposed)return null;
  return Object.freeze({
   id:record.id,returnState:saved,
   paintPose(pose,{width=start.width,height=start.height}={}){
    if(current!==record||record.closed||disposed)return false;
    if(!validPose(pose)){invalidate('invalid-pose');return false;}
    if(width!==start.width||height!==start.height){invalidate('resize');return false;}
    if(!valid()){invalidate('surface-unavailable');return false;}
    let drawn=false;try{drawn=paint(copyPose(pose),{width,height})!==false;}catch{drawn=false;}
    if(current!==record||record.closed||disposed)return false;
    if(!drawn){invalidate('paint-failed');return false;}
    record.paintCount++;return true;
   },
   finish({cancelled=true,direction='in'}={}){return close(record,{cancelled:!!cancelled,direction,reason:cancelled?'cancelled':'finished'});}
  });
 }
 return {acquire,invalidate,active:()=>!!current,state:()=>current?{active:true,id:current.id,room:current.returnState.room,paintCount:current.paintCount,width:current.start.width,height:current.start.height}:{active:false,reason:lastReason},dispose(){if(disposed)return;disposed=true;serial++;close(current,{reason:'disposed',notify:true,resuming:false});}};
}
// The first native passage is deliberately a validated insurance-only slice.
// Bounds describe a guaranteed opaque rectangle BELOW the arch, not its bbox.
export function prepareCourtPortal(spec,width,height,near=.1){
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(finite),same=(a,b)=>vector(a)&&a.every((v,i)=>Math.abs(v-b[i])<1e-6);
 if(!spec||spec.version!==1||spec.units!=='meters'||spec.up!=='Y'||spec.axisSpace!=='world'||spec.room!=='insurance'||spec.frame!=='portal-frame-insurance'||spec.approach!=='approach-insurance')throw Error('Unsupported court portal');
 const a=spec.aperture,r=spec.opaqueRect,hinges=spec.hinges;
 if(!a||a.shape!=='arched'||!vector(a.center)||!same(a.normal,[0,0,1])||!same(a.right,[1,0,0])||!same(a.up,[0,1,0])||!finite(a.springY)||!r||!vector(r.min)||!vector(r.max)||r.min[0]>=r.max[0]||r.min[1]>=r.max[1]||Math.abs(r.min[2]-r.max[2])>1e-6||r.max[1]>=a.springY)throw Error('Portal requires an exact opaque seal rectangle');
 if(!Array.isArray(hinges)||hinges.length!==2||!hinges.every((h,i)=>h.node==='hinge-insurance-'+(i?'right':'left')&&h.leaf==='leaf-insurance-'+(i?'right':'left')&&h.handle==='handle-insurance-'+(i?'right':'left')&&vector(h.pivot)&&same(h.axis,[0,1,0])&&finite(h.openRadians)&&Math.sign(h.openRadians)===(i?-1:1)&&Math.abs(h.openRadians)>=1&&Math.abs(h.openRadians)<=Math.PI/2))throw Error('Invalid native portal hinges');
 if(!finite(width)||!finite(height)||width<=0||height<=0||!finite(near)||near<=0)throw Error('Invalid portal viewport');
 const eye=[...a.center],fov=40,tan=Math.tan(fov*Math.PI/360),horizontal=Math.min(eye[0]-r.min[0],r.max[0]-eye[0]),vertical=Math.min(eye[1]-r.min[1],r.max[1]-eye[1]),front=r.min[2]-eye[2];
 if(horizontal<=0||vertical<=0||front<-.1||front>.2||horizontal>5||vertical>5)throw Error('Portal eye is outside its opaque rectangle');
 const distance=Math.min(1.1,front+.9*Math.min(horizontal/(tan*width/height),vertical/tan)),depth=distance-front;
 if(depth<near*3)throw Error('Portal viewport cannot safely clear the near plane');
 const crossing=spec.crossing;
 if(!crossing||!vector(crossing.position)||!vector(crossing.target)||crossing.position[0]!==eye[0]||crossing.position[1]!==eye[1]||crossing.target[0]!==eye[0]||crossing.target[1]!==eye[1]||crossing.position[2]>=eye[2]-1.2||crossing.target[2]>=crossing.position[2]-.2)throw Error('Invalid portal crossing corridor');
 return {room:spec.room,width,height,near,eye,seal:{position:[eye[0],eye[1],eye[2]+distance],target:eye,fov},inside:{position:[...crossing.position],target:[...crossing.target],fov},coverage:{depth,horizontalHalf:depth*tan*width/height,verticalHalf:depth*tan},hinges:hinges.map(h=>({node:h.node,axis:[...h.axis],openRadians:h.openRadians}))};
}
export function courtPassageSample(start,approach,plan,progress){
 if(!validPose(start)||!validPose(approach)||!validPose(plan?.seal)||!validPose(plan?.inside)||!finite(progress))throw Error('Invalid court passage sample');
 const u=clamp(progress,0,1),smooth=t=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
 const pose=u<.22?interpolatePose(start,approach,u/.22):u<.44?interpolatePose(approach,plan.seal,(u-.22)/.22):u<=.68?copyPose(plan.seal):u<.94?interpolatePose(plan.seal,plan.inside,(u-.68)/.26):copyPose(plan.inside);
 return {u,pose,open:smooth((u-.52)/.26),portalOnly:u>=.48,phase:u<.44?'approach':u<=.52?'sealed':u<.94?'reveal':'inside'};
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
 let primitiveGroups=0;const triangles=(data.nodes||[]).reduce((sum,node)=>{
  let instances=1;const attributes=node.extensions?.EXT_mesh_gpu_instancing?.attributes;
  if(attributes){const counts=Object.values(attributes).map(index=>data.accessors?.[index]?.count);if(!counts.length||!counts.every(count=>Number.isSafeInteger(count)&&count>0&&count===counts[0]))throw Error('Invalid court instance counts');instances=counts[0];}
  if(node.mesh!==undefined)primitiveGroups+=(data.meshes?.[node.mesh]?.primitives?.length??Infinity)*instances;
  return sum+(node.mesh===undefined?0:(triangleCounts[node.mesh]??Infinity)*instances);
 },0);
 if(!finite(triangles)||triangles>COURT_BUDGET.triangles)throw Error('Court exceeds triangle budget');
 if(!finite(primitiveGroups)||primitiveGroups>COURT_BUDGET.groups)throw Error('Court exceeds primitive group budget');
 return {json:data,bytes:buffer.byteLength,triangles,primitiveGroups,materials:(data.materials||[]).length,textureCount:textures.length,imageCount:images.length,texels,imageSizes};
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
