/* Optional real geometry and light. The existing application owns all routes,
   records and accessible controls. This module never reads user storage. */
import * as T from './vendor/three-r187/court-three.js?v=20261101.5-arrival';
import {COURT_KEYS,COURT_BUDGET,COURT_ATMOSPHERE,courtSkyPixels,fitCourtShadow,closedCourtShadowMaterial,renderDimensions,createCameraMotion,createDemandDriver,createSurfaceFrames,courtSurfaceAvailable,createPresentationLeases,prepareCourtPortal,COURT_PORTAL_MODES,courtPassageSample,courtEntryFrameReusable,copyPose,orbitPose,focusPose,inspectCourtGLB,embeddedCourtURL,courtRoomAtHit,disposeCourtResources} from './arrival-camera.js?v=20261101.6-passage';

export class CourtRendererError extends Error{constructor(code,message,cause){super(message,{cause});this.name='CourtRendererError';this.code=code;}}
const abortError=()=>new DOMException('Court initialization cancelled','AbortError');
const boundedRead=async response=>{
 if(Number(response.headers.get('content-length'))>COURT_BUDGET.bytes)throw new CourtRendererError('asset-budget','Court model is too large');
 if(!response.body?.getReader){const data=await response.arrayBuffer();inspectCourtGLB(data);return data;}
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>COURT_BUDGET.bytes)throw new CourtRendererError('asset-budget','Court model is too large');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return data.buffer;
};


const beneath=(object,ancestor)=>{for(let node=object;node;node=node.parent)if(node===ancestor)return true;return false;};
const hasMesh=object=>{let found=false;object?.traverse(node=>{if(node.isMesh)found=true;});return found;};
// CPU-only native inspection. Temporarily opening leaves never renders, allocates
// materials, or changes the caller's closed pose. Source/asset tests separately
// certify the complete angular sweep against the authored static architecture.
export function inspectNativeCourtPortal(model,root,key,near=.1){
 const spec=root?.userData.courtPortal;
 if(!Object.hasOwn(COURT_PORTAL_MODES,key)||spec?.room!==key)throw Error('Missing native room portal');
 const plan=prepareCourtPortal(spec,1,1,near),frame=model.getObjectByName(spec.frame),approach=model.getObjectByName(spec.approach);
 if(!frame||!beneath(frame,root)||!hasMesh(frame))throw Error('Missing native portal frame');
 if(!approach)throw Error('Missing native portal approach');
 const waypoint=plan.waypointNode?model.getObjectByName(plan.waypointNode):null;
 if(plan.waypointNode&&!waypoint)throw Error('Missing native passage waypoint');
 const hinges=spec.hinges.map(h=>{
  const node=model.getObjectByName(h.node);if(!node||!beneath(node,root)||node===root)throw Error('Missing native hinge');
  const leaf=model.getObjectByName(h.leaf);if(!leaf||!beneath(leaf,node)||!hasMesh(leaf))throw Error('Missing native leaf geometry');
  if(h.handle!==null){const handle=model.getObjectByName(h.handle);if(!handle||!beneath(handle,node)||!hasMesh(handle))throw Error('Missing native handle');}
  if(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...h.pivot))>.001)throw Error('Native hinge pivot does not match world metadata');
  const meshes=[];node.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const world=node.getWorldQuaternion(node.quaternion.clone());return {node,leaf,initial:node.quaternion.clone(),axis:new T.Vector3(...h.axis).applyQuaternion(world.clone().invert()).normalize(),angle:h.openRadians,rotation:node.quaternion.clone(),meshes};
 });
 for(let i=0;i<hinges.length;i++)for(let j=i+1;j<hinges.length;j++)if(beneath(hinges[i].node,hinges[j].node)||beneath(hinges[j].node,hinges[i].node))throw Error('Native hinges must be independent');
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(const mesh of meshes)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(!mat||mat.transparent||mat.opacity!==1||mat.alphaTest>0||mat.transmission>0)throw Error('Portal seal must be opaque native material');
 let openLeafClearance=Infinity,rearClearance=Infinity;
 try{
  for(const h of hinges)h.node.quaternion.copy(h.initial).multiply(h.rotation.setFromAxisAngle(h.axis,h.angle));model.updateMatrixWorld(true);
  for(const h of hinges){const bounds=new T.Box3().setFromObject(h.node),clearance=bounds.min.z-plan.inside.position[2];if(!Number.isFinite(clearance)||clearance<near)throw Error('Native crossing remains in the open leaf envelope');openLeafClearance=Math.min(openLeafClearance,clearance);}
  const ray=new T.Raycaster();ray.near=.001;ray.far=20;
  // Include the open leaves AND fixed fanlight/jamb, never hide them from this
  // check. The center must meet genuine retained rear masonry; a side ray may
  // exit an open niche, but no ray may meet a surface before the eye clears.
  const required=plan.seal.position[2]-plan.inside.position[2];
  for(const dx of[-near,0,near])for(const dy of[-near,0,near]){
   ray.set(new T.Vector3(plan.eye[0]+dx,plan.eye[1]+dy,plan.seal.position[2]),new T.Vector3(0,0,-1));
   const hit=ray.intersectObject(model,true)[0];if((hit&&hit.distance<required+near)||(!hit&&dx===0&&dy===0))throw Error('Native crossing corridor is blocked or has no retained rear surface');if(hit)rearClearance=Math.min(rearClearance,hit.distance-required);
  }
 }finally{for(const h of hinges)h.node.quaternion.copy(h.initial);model.updateMatrixWorld(true);}
 return {root,spec,leafMode:plan.leafMode,hinges,meshes,approach:approach.getWorldPosition(new T.Vector3()).toArray(),waypoint:waypoint?.getWorldPosition(new T.Vector3()).toArray()||null,geometry:{openLeafClearance,rearClearance,corridorRays:9},plan:null,planSize:'',reason:null};
}
export function validateCourtApproachPath(model,points,near=.1){
 if(!Array.isArray(points)||points.length<2||points.length>3||!points.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||!Number.isFinite(near)||near<=0)throw Error('Invalid native approach corridor');
 const ray=new T.Raycaster();ray.near=.001;
 for(let i=1;i<points.length;i++){
  const from=new T.Vector3(...points[i-1]),to=new T.Vector3(...points[i]),direction=to.clone().sub(from),distance=direction.length();if(distance<1e-6)continue;direction.normalize();ray.far=distance+near;
  for(const dx of[-near,0,near])for(const dy of[-near,0,near]){ray.set(from.clone().add(new T.Vector3(dx,dy,0)),direction);if(ray.intersectObject(model,true).length)throw Error('Native approach crosses solid architecture');}
 }
 return true;
}

function worldLeafHit(root,raycaster){
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3();let closest=null;
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||mesh.visible===false)return;
  const geometry=mesh.geometry,positions=geometry.attributes.position,index=geometry.index,count=index?.count||positions.count;
  for(let i=0;i<count;i+=3){
   const group=Array.isArray(mesh.material)?geometry.groups.find(g=>i>=g.start&&i<g.start+g.count):null,material=Array.isArray(mesh.material)?mesh.material[group?.materialIndex??0]:mesh.material;if(!material||material.visible===false)continue;
   a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   const hit=material.side===T.BackSide?raycaster.ray.intersectTriangle(c,b,a,true,point):raycaster.ray.intersectTriangle(a,b,c,material.side!==2,point);
   if(!hit)continue;const distance=raycaster.ray.origin.distanceTo(hit);if(distance<raycaster.near||distance>raycaster.far||closest&&distance>=closest.distance)continue;
   closest={object:mesh,distance,point:hit.clone()};
  }
 });return closest;
}
// Inverse-local Raycaster arithmetic can lose an EXACT shared capped edge.
// Only that paired optical seam gets a second, world-space triangle test: no
// ray perturbation, epsilon, enlarged geometry, or bounds-only acceptance.
export function courtPortalSealHit(model,record,raycaster){
 const hits=raycaster.intersectObject(model,true),key=record.spec.room;if(courtRoomAtHit(hits)===key)return {ok:true,method:'local',distance:hits[0]?.distance};
 const failed={ok:false,method:'blocked'};if(record.leafMode!=='paired'||record.hinges.length!==2)return failed;
 const centre=record.spec.aperture.center[0],ray=raycaster.ray;if(ray.origin.x!==centre||ray.direction.x!==0)return failed;
 const left=record.hinges[0].leaf,right=record.hinges[1].leaf;
 if(new T.Box3().setFromObject(left).max.x!==centre||new T.Box3().setFromObject(right).min.x!==centre)return failed;
 const l=worldLeafHit(left,raycaster),r=worldLeafHit(right,raycaster);
 if(!l||!r||!l.point.equals(r.point)||l.distance!==r.distance||(hits[0]&&hits[0].distance<=l.distance))return failed;
 return {ok:true,method:'world-seam',distance:l.distance};
}

export function prepareNativeCourtPortalPlan(model,record,width,height,near=.1,far=120){
 const plan=prepareCourtPortal(record.spec,width,height,near);
 if(record.waypoint)plan.waypoint={position:[...record.waypoint],target:[...plan.eye],fov:40};
 validateCourtApproachPath(model,[record.approach,...(record.waypoint?[record.waypoint]:[]),plan.seal.position],near);
 const check=new T.PerspectiveCamera(plan.seal.fov,width/height,near,far);check.position.fromArray(plan.seal.position);check.lookAt(...plan.seal.target);check.updateMatrixWorld();
 // The real closed portal, not its metadata bbox, must be the first opaque
 // surface at every corner/edge/center of this actual viewport's sealed view.
 const ray=new T.Raycaster();for(const x of[-.999,0,.999])for(const y of[-.999,0,.999]){ray.setFromCamera(new T.Vector2(x,y),check);if(!courtPortalSealHit(model,record,ray).ok)throw Error('Native portal does not cover its safe seal');}
 return plan;
}

export async function createCourtRenderer({canvas,modelURL,onFrame=()=>{},onFailure=()=>{},signal}={}){
 if(!canvas?.getContext)throw new CourtRendererError('canvas','A visible court canvas is required');
 if(signal?.aborted)throw abortError();
 const win=canvas.ownerDocument?.defaultView||globalThis,now=()=>win.performance.now(),surfaceView=()=>canvas.ownerDocument?.defaultView||win;
 const url=new URL(modelURL,import.meta.url);if(!['http:','https:'].includes(url.protocol)||url.origin!==new URL(import.meta.url).origin)throw new CourtRendererError('asset-origin','Court assets must stay on this application origin');
 let renderer=null,model=null,scene=null,sky=null,environment=null,environmentTarget=null,pmrem=null,driver=null,leases=null,motion=null,normalVersion=0,camera=null,sun=null,ready=false,disposed=false,contextLost=false,active=true,failureNotified=false,frameCount=0,selected=null,yaw=0,dimensions=null,projected=[];
 let deadline=0,stopReject;const stopped=new Promise((_,reject)=>{stopReject=reject;});stopped.catch(()=>{});
 const loadAbort=new AbortController(),anchors=new Map(),homePoses=new Map(),roomPoses=new Map(),portals=new Map();
 const raycaster=new T.Raycaster(),point=new T.Vector3(),bufferSize=new T.Vector2();
 let assetInfo=null,meshTriangles=0,materialCount=0,closedShadowMaterials=0,shadowBounds=null,drawCalls=0,peakDrawCalls=0,renderedTriangles=0,pose=null,shadowRefreshes=0,passageView=null,visualGeneration=0,lastNormalPaint=null,lastPaintMode=null,reusedEntryFrames=0,lastPassageRefusal=null;
 function release(reason=abortError()){
  if(disposed)return;disposed=true;active=false;lastNormalPaint=null;ready=false;clearTimeout(deadline);loadAbort.abort();driver?.dispose();leases?.dispose();
  canvas.removeEventListener('webglcontextlost',lost,true);signal?.removeEventListener('abort',aborted);stopReject(reason);
  disposeCourtResources(model);model=null;anchors.clear();homePoses.clear();roomPoses.clear();portals.clear();sky?.dispose();sky=null;environment?.dispose();environment=null;environmentTarget?.dispose();environmentTarget=null;pmrem?.dispose();pmrem=null;
  if(scene){scene.traverse(object=>{object.shadow?.map?.dispose();object.shadow?.mapPass?.dispose();});scene.environment=null;scene.background=null;scene.clear();}
  renderer?.dispose();if(renderer&&!contextLost)renderer.forceContextLoss();
 }
 const dispose=()=>release();
 function fail(error,notify=true){if(disposed)return;release(error);if(notify&&!failureNotified){failureNotified=true;try{onFailure(error);}catch{ /* The owner retains fallback even if its reporter fails. */ }}}
 function lost(){contextLost=true;fail(new CourtRendererError('context-lost','The 3D context was lost. Continue in the original castle.'));}
 function aborted(){fail(abortError(),false);}
 canvas.addEventListener('webglcontextlost',lost,true);signal?.addEventListener('abort',aborted,{once:true});
 const alive=()=>{if(disposed||signal?.aborted)throw abortError();};
 const wait=promise=>Promise.race([promise,stopped]);
 deadline=win.setTimeout(()=>fail(new CourtRendererError('initialization-timeout','Court initialization exceeded its bounded loading time.')),15000);
 function cameraPose(node,center){
  const position=node.getWorldPosition(new T.Vector3()),direction=node.getWorldDirection(new T.Vector3()),distance=Math.max(5,position.distanceTo(center));
  return {position:position.toArray(),target:position.clone().addScaledVector(direction,distance).toArray(),fov:Math.min(80,Math.max(22,node.fov||45))};
 }
 const homePose=()=>copyPose(homePoses.get(dimensions?.width<=600?'phone':'wide'));
 function destinationPose(){const home=homePose();return selected?copyPose(roomPoses.get(selected)||focusPose(home,anchors.get(selected).point.toArray())):home;}
 function applyPose(value,useYaw=true){pose=useYaw?orbitPose(value,yaw):copyPose(value);camera.position.fromArray(pose.position);camera.fov=pose.fov;camera.aspect=dimensions.width/dimensions.height;camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function roomAt(x,y){raycaster.setFromCamera(new T.Vector2(x,y),camera);return courtRoomAtHit(raycaster.intersectObject(model,true));}
 function project(){
  projected=[...anchors].map(([key,item])=>{point.copy(item.point).project(camera);const inFrustum=point.z>=-1&&point.z<=1&&point.x>=-1&&point.x<=1&&point.y>=-1&&point.y<=1;const visible=inFrustum&&roomAt(point.x,point.y)===key;return {key,x:(point.x+1)*dimensions.width/2,y:(1-point.y)*dimensions.height/2,depth:point.z,inFrustum,visible,occluded:inFrustum&&!visible};});
  return projected.map(value=>({...value}));
 }
 const opaqueWorld=()=>scene?.background===sky&&!!sky&&renderer?.getClearAlpha()===1&&camera?.layers.mask===1&&sun?.shadow.camera.layers.mask===1;
 function renderPose(value,{manual=false}={}){
  if(disposed||!model)return false;
  try{
   applyPose(value,!manual);const updateShadow=sun?.shadow.needsUpdate===true;renderer.render(scene,camera);if(updateShadow&&sun.shadow.needsUpdate===false)shadowRefreshes++;if(renderer.getContext().isContextLost())throw new CourtRendererError('context-lost','The court graphics context is unavailable');
   const info=renderer.info.render;drawCalls=info.calls;peakDrawCalls=Math.max(peakDrawCalls,drawCalls);renderedTriangles=info.triangles;frameCount++;lastPaintMode=manual?'presentation':'normal';
   if(!manual&&opaqueWorld())lastNormalPaint={serial:frameCount,generation:visualGeneration,pose:copyPose(pose),width:dimensions.width,height:dimensions.height,pixelRatio:dimensions.pixelRatio,physicalWidth:dimensions.physicalWidth,physicalHeight:dimensions.physicalHeight};
   if(!manual)onFrame({rooms:project(),camera:copyPose(pose),selected});return true;
  }catch(error){fail(error instanceof CourtRendererError?error:new CourtRendererError('render','The court could not draw safely',error));return false;}
 }
 function draw(time=now()){
  if(disposed||!active||leases?.active()||!model||!courtSurfaceAvailable(canvas))return false;
  return renderPose(motion.sample(time))&&motion.moving(time);
 }
 function discoverPortal(){
  for(const key of Object.keys(COURT_PORTAL_MODES)){
   const root=anchors.get(key)?.door;if(!root?.userData.courtPortal)continue;
   try{portals.set(key,inspectNativeCourtPortal(model,root,key,camera.near));}
   catch(error){portals.set(key,{reason:String(error.message||error)});}
  }
 }
 function portalPlan(key){
  const record=portals.get(key);if(!record||record.reason||disposed||!ready)return null;
  const size=dimensions.width+'x'+dimensions.height;if(record.planSize===size)return record.plan;if(leases?.active())return null;
  try{const plan=prepareNativeCourtPortalPlan(model,record,dimensions.width,dimensions.height,camera.near,camera.far);record.plan=plan;record.planSize=size;record.planReason=null;return plan;}
  catch(error){record.plan=null;record.planSize=size;record.planReason=String(error.message||error);return null;}
 }
 function beginPassage({room,returnState,onInvalidated}={}){
  const plan=portalPlan(room),record=portals.get(room);if(!plan||!record)return null;
  try{validateCourtApproachPath(model,[(returnState?.pose||pose).position,record.approach],camera.near);lastPassageRefusal=null;}
  catch(error){lastPassageRefusal={room,reason:String(error.message||error)};return null;}
  let lease=null,restored=false,layered=false,lastOpen=0;
  let captured=false,background=null,clearAlpha=1,cameraMask=1,shadowMask=1;const layers=[];
  function restoreNative(){
   if(restored)return;restored=true;if(!captured)return;visualGeneration++;
   for(const hinge of record.hinges)hinge.node.quaternion.copy(hinge.initial);
   for(const [object,mask]of layers)object.layers.mask=mask;
   camera.layers.mask=cameraMask;sun.shadow.camera.layers.mask=shadowMask;scene.background=background;renderer.setClearAlpha(clearAlpha);
   if(lastOpen!==0)sun.shadow.needsUpdate=true;model.updateMatrixWorld(true);passageView=null;
  }
  lease=leases.acquire({...(returnState?{returnState,resumeAtReturn:true}:{}),onInvalidated(reason){restoreNative();try{onInvalidated?.(reason);}catch{}}});
  if(!lease)return null;
  background=scene.background;clearAlpha=renderer.getClearAlpha();cameraMask=camera.layers.mask;shadowMask=sun.shadow.camera.layers.mask;
  for(const mesh of record.meshes)layers.push([mesh,mesh.layers.mask]);scene.traverse(o=>{if(o.isLight)layers.push([o,o.layers.mask]);});captured=true;
  const approach={position:[...record.approach],target:[...plan.eye],fov:40};
  return Object.freeze({returnState:lease.returnState,
   paint(progress,viewport){
    if(restored||!leases.active())return false;
    let sample;try{sample=courtPassageSample(lease.returnState.pose,approach,plan,progress);}catch{leases.invalidate('invalid-progress');return false;}
    try{
     if(sample.portalOnly!==layered){
      layered=sample.portalOnly;visualGeneration++;
      for(const [object,mask]of layers)object.layers.mask=layered?mask|2:mask;
      camera.layers.mask=layered?2:cameraMask;
      // r187 supports explicit shadow-camera layers. Original world casters
      // remain in the SAME map even when the main camera sees only the portal.
      sun.shadow.camera.layers.mask=layered?shadowMask|2:shadowMask;
      scene.background=layered?null:background;renderer.setClearAlpha(layered?0:clearAlpha);
     }
     if(sample.open!==lastOpen){visualGeneration++;for(const hinge of record.hinges)hinge.node.quaternion.copy(hinge.initial).multiply(hinge.rotation.setFromAxisAngle(hinge.axis,hinge.angle*sample.open));lastOpen=sample.open;sun.shadow.needsUpdate=true;model.updateMatrixWorld(true);}
     if(!lease.paintPose(sample.pose,{...viewport,reuseEntry:sample.u===0&&!returnState}))return false;
     passageView={room,u:sample.u,phase:sample.phase,portalOnly:layered,open:sample.open};return Object.freeze({ok:true,u:sample.u,phase:sample.phase});
    }catch{leases.invalidate('portal-paint-failed');return false;}
   },
   finish(options){restoreNative();return lease.finish(options);}
  });
 }
 function resize(width,height){
  if(disposed)return false;let next=renderDimensions(width,height,surfaceView().devicePixelRatio||1);const changed=!dimensions||next.width!==dimensions.width||next.height!==dimensions.height||next.pixelRatio!==dimensions.pixelRatio;
  if(!changed)return true;if(leases?.active()){leases.invalidate('resize');if(disposed)return false;next=renderDimensions(width,height,surfaceView().devicePixelRatio||1);}normalVersion++;visualGeneration++;dimensions=next;renderer.setPixelRatio(next.pixelRatio);renderer.setSize(next.width,next.height,false);
  if(motion){motion.to(destinationPose(),{instant:true});driver?.invalidate();}return true;
 }
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
  const gl=renderer.getContext();if(!String(gl.getParameter(gl.VERSION)).includes('WebGL 2'))throw new CourtRendererError('webgl2','WebGL2 is unavailable');
  renderer.setClearAlpha(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=COURT_ATMOSPHERE.exposure;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.debug.onShaderError=()=>{throw new CourtRendererError('shader','A court material shader could not compile');};
  const box=canvas.getBoundingClientRect();resize(Math.max(1,box.width||canvas.clientWidth||canvas.width),Math.max(1,box.height||canvas.clientHeight||canvas.height));
  scene=new T.Scene();const skyPixels=courtSkyPixels();sky=new T.DataTexture(skyPixels.data,skyPixels.width,skyPixels.height,T.RGBAFormat,T.UnsignedByteType);sky.mapping=T.EquirectangularReflectionMapping;sky.colorSpace=T.SRGBColorSpace;sky.magFilter=T.LinearFilter;sky.minFilter=T.LinearFilter;sky.generateMipmaps=false;sky.needsUpdate=true;scene.background=sky;scene.fog=new T.FogExp2(COURT_ATMOSPHERE.fogColor,COURT_ATMOSPHERE.fogDensity);
  const hemi=new T.HemisphereLight('#bcc9de','#44342b',COURT_ATMOSPHERE.hemisphere);scene.add(hemi);
  sun=new T.DirectionalLight('#ffe0b5',COURT_ATMOSPHERE.sun);sun.position.set(-10,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:.5,far:70});sun.shadow.normalBias=COURT_ATMOSPHERE.shadowNormalBias;sun.shadow.bias=-.00012;sun.shadow.radius=1;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.target.position.set(0,1,-2);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight('#9eafce',COURT_ATMOSPHERE.fill);fill.position.set(12,8,-14);scene.add(fill);
  environment=new T.RoomEnvironment();pmrem=new T.PMREMGenerator(renderer);environmentTarget=pmrem.fromScene(environment,.04,.1,80,{size:256});scene.environment=environmentTarget.texture;scene.environmentIntensity=COURT_ATMOSPHERE.environment;environment.dispose();environment=null;pmrem.dispose();pmrem=null;
  const response=await wait(fetch(url,{credentials:'omit',signal:loadAbort.signal,cache:'force-cache'}));alive();if(!response.ok)throw new CourtRendererError('asset-load','Court model could not be loaded');
  const buffer=await wait(boundedRead(response));alive();assetInfo=inspectCourtGLB(buffer);
  const manager=new T.LoadingManager();manager.setURLModifier(value=>{try{return embeddedCourtURL(value,url.origin);}catch(error){throw new CourtRendererError('asset-reference','Court model may not load secondary resources',error);}});
  const loader=new T.GLTFLoader(manager);const gltf=await wait(loader.parseAsync(buffer,'').then(value=>{if(disposed){disposeCourtResources(value.scene);throw abortError();}return value;}));
  if(disposed){disposeCourtResources(gltf.scene);throw abortError();}model=gltf.scene;model.updateMatrixWorld(true);
  const materials=new Set();model.traverse(object=>{if(!object.isMesh)return;meshTriangles+=(object.geometry.index?.count||object.geometry.attributes.position?.count||0)/3*(object.isInstancedMesh?object.count:1);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);if(closedCourtShadowMaterial(material.name))material.shadowSide=T.BackSide;}object.castShadow=true;object.receiveShadow=true;});
  materialCount=materials.size;closedShadowMaterials=[...materials].filter(material=>material.shadowSide===T.BackSide).length;if(meshTriangles>COURT_BUDGET.triangles||materialCount>COURT_BUDGET.materials)throw new CourtRendererError('asset-budget','Court geometry exceeded its bounded budget');
  const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
  for(const key of COURT_KEYS){
   const door=model.getObjectByName('room-'+key)||model.getObjectByName('closed-'+key)||model.getObjectByName('sealed-'+key),focus=model.getObjectByName('focus-'+key)||door;
   if(!door||!focus)throw new CourtRendererError('asset-anchor','Court model is missing a named destination');
   const at=focus.getWorldPosition(new T.Vector3());if(!model.getObjectByName('focus-'+key))new T.Box3().setFromObject(door).getCenter(at);
   anchors.set(key,{door,point:at});door.traverse(child=>{if(child.isMesh){child.userData.courtRoom=key;}});
  }
  const fallback=new T.PerspectiveCamera(43,1,.1,120);fallback.position.set(11,7.2,21);fallback.lookAt(0,3.2,-2);fallback.updateMatrixWorld();
  const wide=model.getObjectByName('arrival-camera')||gltf.cameras?.[0]||fallback,phone=model.getObjectByName('phone-camera')||wide;
  homePoses.set('wide',cameraPose(wide,center));homePoses.set('phone',cameraPose(phone,center));
  for(const key of COURT_KEYS){const fixed=model.getObjectByName('camera-'+key),approach=model.getObjectByName('approach-'+key);if(fixed?.isPerspectiveCamera)roomPoses.set(key,cameraPose(fixed,anchors.get(key).point));else if(approach)roomPoses.set(key,focusPose(homePose(),anchors.get(key).point.toArray(),approach.getWorldPosition(new T.Vector3()).toArray()));}
  camera=new T.PerspectiveCamera(43,dimensions.width/dimensions.height,.1,120);discoverPortal();motion=createCameraMotion(homePose(),now);applyPose(motion.sample());scene.add(model);
  scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);const lightBounds=bounds.clone().applyMatrix4(sun.shadow.camera.matrixWorldInverse);shadowBounds=fitCourtShadow(lightBounds.min.toArray(),lightBounds.max.toArray());Object.assign(sun.shadow.camera,shadowBounds);sun.shadow.camera.updateProjectionMatrix();
  // One restrained lighting approximation behind the study fanlight. Ambient
  // architecture only: it never claims activity or follows workflow state.
  const lamp=new T.PointLight('#ffc68a',.8,3.5,2);lamp.position.set(-5.6,2.8,-2.852);scene.add(lamp);
  await wait(renderer.compileAsync(scene,camera));alive();draw();alive();if(!frameCount)throw new CourtRendererError('first-frame','Court did not render a first frame');
  driver=createDemandDriver({render:draw,...createSurfaceFrames(surfaceView,now)});
  leases=createPresentationLeases({
   snapshot:()=>({room:selected,pose:copyPose(pose),width:dimensions.width,height:dimensions.height}),version:()=>normalVersion,
   valid:()=>!disposed&&ready&&courtSurfaceAvailable(canvas),
   suspend(state){driver.setActive(false);motion.to(state.pose,{instant:true});yaw=0;},
   paint(value,{reuseEntry=false}={}){
    if(reuseEntry){const rect=canvas.getBoundingClientRect(),closed=[...portals.values()].every(p=>!p.hinges||p.hinges.every(h=>h.node.quaternion.equals(h.initial)));
    if(courtEntryFrameReusable(lastNormalPaint,{...dimensions,width:rect.width,height:rect.height,physicalWidth:canvas.width,physicalHeight:canvas.height,frameCount,generation:visualGeneration,pose:value,worldOpaque:opaqueWorld(),contextValid:!contextLost&&!renderer.getContext().isContextLost(),shadowDirty:sun.shadow.needsUpdate||renderer.shadowMap.needsUpdate,closed})){reusedEntryFrames++;return true;}}
    return renderPose(value,{manual:true});
   },
   restore(state){motion.to(state.pose,{instant:true});yaw=0;},
   resume(){if(disposed)return;const available=active&&courtSurfaceAvailable(canvas);driver.setActive(available);if(available)draw();}
  });
  ready=true;clearTimeout(deadline);
  return {
   resize,
   select(key,{instant=false}={}){if(disposed||!anchors.has(key))return false;normalVersion++;selected=key;yaw=0;motion.to(destinationPose(),{instant});driver.invalidate();return true;},
   home({instant=false}={}){if(disposed)return false;normalVersion++;selected=null;yaw=0;motion.to(homePose(),{instant});driver.invalidate();return true;},
   nudge(deltaX){if(disposed||!Number.isFinite(deltaX))return false;normalVersion++;yaw=Math.max(-.3,Math.min(.3,yaw+deltaX*.002));driver.invalidate();return true;},
   setActive(value){if(disposed)return;active=!!value;if(!active)motion.settle();driver.setActive(active&&!leases.active()&&courtSurfaceAvailable(canvas));},
   acquirePresentation(options){return leases.acquire(options);},
   canPassage(key){return !!portalPlan(key);},
   prepareDoor(key){const plan=portalPlan(key);return plan?{room:key,leafMode:plan.leafMode,hingeCount:plan.hinges.length,width:plan.width,height:plan.height,seal:copyPose(plan.seal),inside:copyPose(plan.inside),coverage:{...plan.coverage}}:null;},
   beginPassage,
   pick(x,y){if(disposed||!active||leases.active()||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)return null;return roomAt(x,y);},
   diagnostics(){const size=renderer?.getDrawingBufferSize(bufferSize);return {webgl2:true,ready,disposed,contextLost,active,presentation:leases?.state()||{active:false},reusedEntryFrames,normalPaintSerial:lastNormalPaint?.serial??null,lastPaintMode,visualGeneration,lastPassageRefusal:lastPassageRefusal?{...lastPassageRefusal}:null,surfaceOwner:canvas.ownerDocument===win.document?'court':'adopted',frameCount,meshTriangles,materialCount,primitiveGroups:assetInfo?.primitiveGroups||0,nativePortals:[...portals].map(([key,value])=>({key,leafMode:value.leafMode||null,hingeCount:value.hinges?.length||0,geometry:value.geometry?{...value.geometry}:null,available:!value.reason&&!value.planReason,reason:value.reason||value.planReason||null})),passage:passageView?{...passageView,hinges:portals.get(passageView.room)?.hinges.map(h=>({node:h.node.name,quaternion:h.node.quaternion.toArray(),angle:h.node.quaternion.angleTo(h.initial)}))}:null,transparentBackground:scene?.background===null,mainLayerMask:camera?.layers.mask,shadowLayerMask:sun.shadow.camera.layers.mask,shadowRefreshes,clearAlpha:renderer?.getClearAlpha(),shadowEnabled:renderer?.shadowMap.enabled===true,shadowFilter:renderer?.shadowMap.type===T.PCFShadowMap?'pcf':'other',shadowMapSize:sun.shadow.mapSize.x,shadowRadius:sun.shadow.radius,closedShadowMaterials,shadowBounds:shadowBounds?{...shadowBounds}:null,staticShadow:sun.shadow.autoUpdate===false,doorLight:{position:lamp.position.toArray(),intensity:lamp.intensity,distance:lamp.distance,castsShadow:lamp.castShadow},atmosphere:{...COURT_ATMOSPHERE},runtimeSkyTextures:sky?1:0,runtimeSkyTexels:sky?COURT_ATMOSPHERE.skyWidth*COURT_ATMOSPHERE.skyHeight:0,drawCalls,peakDrawCalls,renderedTriangles,assetTextureCount:assetInfo?.textureCount||0,assetTexels:assetInfo?.texels||0,gpuTextures:renderer?.info.memory.textures||0,assetBytes:assetInfo?.bytes||0,physicalPixels:dimensions?.physicalPixels||0,physicalWidth:size?.x||0,physicalHeight:size?.y||0,pixelRatio:dimensions?.pixelRatio||0,width:dimensions?.width||0,height:dimensions?.height||0,pendingFrame:driver?.state().pendingFrame||false,selected,camera:pose?copyPose(pose):null,projectedRooms:projected.map(value=>({...value}))};},
   dispose
  };
 }catch(error){fail(error,false);throw error;}
}
