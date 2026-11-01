/* Optional real geometry and light. The existing application owns all routes,
   records and accessible controls. This module never reads user storage. */
import * as T from './vendor/three-r187/court-three.js?v=20261101.4-arrival';
import {COURT_KEYS,COURT_BUDGET,COURT_ATMOSPHERE,courtSkyPixels,fitCourtShadow,closedCourtShadowMaterial,renderDimensions,createCameraMotion,createDemandDriver,copyPose,orbitPose,focusPose,inspectCourtGLB,embeddedCourtURL,courtRoomAtHit,disposeCourtResources} from './arrival-camera.js?v=20261101.4-arrival';

export class CourtRendererError extends Error{constructor(code,message,cause){super(message,{cause});this.name='CourtRendererError';this.code=code;}}
const abortError=()=>new DOMException('Court initialization cancelled','AbortError');
const boundedRead=async response=>{
 if(Number(response.headers.get('content-length'))>COURT_BUDGET.bytes)throw new CourtRendererError('asset-budget','Court model is too large');
 if(!response.body?.getReader){const data=await response.arrayBuffer();inspectCourtGLB(data);return data;}
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>COURT_BUDGET.bytes)throw new CourtRendererError('asset-budget','Court model is too large');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return data.buffer;
};

export async function createCourtRenderer({canvas,modelURL,onFrame=()=>{},onFailure=()=>{},signal}={}){
 if(!canvas?.getContext)throw new CourtRendererError('canvas','A visible court canvas is required');
 if(signal?.aborted)throw abortError();
 const win=canvas.ownerDocument?.defaultView||globalThis,now=()=>win.performance.now();
 const url=new URL(modelURL,import.meta.url);if(!['http:','https:'].includes(url.protocol)||url.origin!==new URL(import.meta.url).origin)throw new CourtRendererError('asset-origin','Court assets must stay on this application origin');
 let renderer=null,model=null,scene=null,sky=null,environment=null,environmentTarget=null,pmrem=null,driver=null,motion=null,camera=null,ready=false,disposed=false,contextLost=false,active=true,failureNotified=false,frameCount=0,selected=null,yaw=0,dimensions=null,projected=[];
 let deadline=0,stopReject;const stopped=new Promise((_,reject)=>{stopReject=reject;});stopped.catch(()=>{});
 const loadAbort=new AbortController(),anchors=new Map(),homePoses=new Map(),roomPoses=new Map();
 const raycaster=new T.Raycaster(),point=new T.Vector3(),bufferSize=new T.Vector2();
 let assetInfo=null,meshTriangles=0,materialCount=0,closedShadowMaterials=0,shadowBounds=null,drawCalls=0,renderedTriangles=0,pose=null;
 function release(reason=abortError()){
  if(disposed)return;disposed=true;active=false;ready=false;clearTimeout(deadline);loadAbort.abort();driver?.dispose();
  canvas.removeEventListener('webglcontextlost',lost,true);signal?.removeEventListener('abort',aborted);stopReject(reason);
  disposeCourtResources(model);model=null;anchors.clear();homePoses.clear();roomPoses.clear();sky?.dispose();sky=null;environment?.dispose();environment=null;environmentTarget?.dispose();environmentTarget=null;pmrem?.dispose();pmrem=null;
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
 function applyPose(value){pose=orbitPose(value,yaw);camera.position.fromArray(pose.position);camera.fov=pose.fov;camera.aspect=dimensions.width/dimensions.height;camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function roomAt(x,y){raycaster.setFromCamera(new T.Vector2(x,y),camera);return courtRoomAtHit(raycaster.intersectObject(model,true));}
 function project(){
  projected=[...anchors].map(([key,item])=>{point.copy(item.point).project(camera);const inFrustum=point.z>=-1&&point.z<=1&&point.x>=-1&&point.x<=1&&point.y>=-1&&point.y<=1;const visible=inFrustum&&roomAt(point.x,point.y)===key;return {key,x:(point.x+1)*dimensions.width/2,y:(1-point.y)*dimensions.height/2,depth:point.z,inFrustum,visible,occluded:inFrustum&&!visible};});
  return projected.map(value=>({...value}));
 }
 function draw(time=now()){
  if(disposed||!active||!model)return false;
  try{
   applyPose(motion.sample(time));renderer.render(scene,camera);if(renderer.getContext().isContextLost())throw new CourtRendererError('context-lost','The court graphics context is unavailable');
   const info=renderer.info.render;drawCalls=info.calls;renderedTriangles=info.triangles;frameCount++;
   onFrame({rooms:project(),camera:copyPose(pose),selected});return motion.moving(time);
  }catch(error){fail(error instanceof CourtRendererError?error:new CourtRendererError('render','The court could not draw safely',error));return false;}
 }
 function resize(width,height){
  if(disposed)return false;const next=renderDimensions(width,height,win.devicePixelRatio||1),changed=!dimensions||next.width!==dimensions.width||next.height!==dimensions.height||next.pixelRatio!==dimensions.pixelRatio;
  if(!changed)return true;dimensions=next;renderer.setPixelRatio(next.pixelRatio);renderer.setSize(next.width,next.height,false);
  if(motion){motion.to(destinationPose(),{instant:true});driver?.invalidate();}return true;
 }
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
  const gl=renderer.getContext();if(!String(gl.getParameter(gl.VERSION)).includes('WebGL 2'))throw new CourtRendererError('webgl2','WebGL2 is unavailable');
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=COURT_ATMOSPHERE.exposure;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.debug.onShaderError=()=>{throw new CourtRendererError('shader','A court material shader could not compile');};
  const box=canvas.getBoundingClientRect();resize(Math.max(1,box.width||canvas.clientWidth||canvas.width),Math.max(1,box.height||canvas.clientHeight||canvas.height));
  scene=new T.Scene();const skyPixels=courtSkyPixels();sky=new T.DataTexture(skyPixels.data,skyPixels.width,skyPixels.height,T.RGBAFormat,T.UnsignedByteType);sky.mapping=T.EquirectangularReflectionMapping;sky.colorSpace=T.SRGBColorSpace;sky.magFilter=T.LinearFilter;sky.minFilter=T.LinearFilter;sky.generateMipmaps=false;sky.needsUpdate=true;scene.background=sky;scene.fog=new T.FogExp2(COURT_ATMOSPHERE.fogColor,COURT_ATMOSPHERE.fogDensity);
  const hemi=new T.HemisphereLight('#bcc9de','#44342b',COURT_ATMOSPHERE.hemisphere);scene.add(hemi);
  const sun=new T.DirectionalLight('#ffe0b5',COURT_ATMOSPHERE.sun);sun.position.set(-10,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:.5,far:70});sun.shadow.normalBias=COURT_ATMOSPHERE.shadowNormalBias;sun.shadow.bias=-.00012;sun.shadow.radius=1;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.target.position.set(0,1,-2);scene.add(sun,sun.target);
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
  camera=new T.PerspectiveCamera(43,dimensions.width/dimensions.height,.1,120);motion=createCameraMotion(homePose(),now);applyPose(motion.sample());scene.add(model);
  scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);const lightBounds=bounds.clone().applyMatrix4(sun.shadow.camera.matrixWorldInverse);shadowBounds=fitCourtShadow(lightBounds.min.toArray(),lightBounds.max.toArray());Object.assign(sun.shadow.camera,shadowBounds);sun.shadow.camera.updateProjectionMatrix();
  // One restrained spill at the visible study fanlight. Ambient
  // architecture only: it never claims activity or follows workflow state.
  const lamp=new T.PointLight('#ffc68a',3,4,2);lamp.position.set(-5.6,2.8,-2.65);scene.add(lamp);
  await wait(renderer.compileAsync(scene,camera));alive();draw();alive();if(!frameCount)throw new CourtRendererError('first-frame','Court did not render a first frame');
  driver=createDemandDriver({render:draw,request:callback=>win.requestAnimationFrame(callback),cancel:id=>win.cancelAnimationFrame(id)});
  ready=true;clearTimeout(deadline);
  return {
   resize,
   select(key,{instant=false}={}){if(disposed||!anchors.has(key))return false;selected=key;yaw=0;motion.to(destinationPose(),{instant});driver.invalidate();return true;},
   home({instant=false}={}){if(disposed)return false;selected=null;yaw=0;motion.to(homePose(),{instant});driver.invalidate();return true;},
   nudge(deltaX){if(disposed||!Number.isFinite(deltaX))return false;yaw=Math.max(-.3,Math.min(.3,yaw+deltaX*.002));driver.invalidate();return true;},
   setActive(value){if(disposed)return;active=!!value;if(!active)motion.settle();driver.setActive(active);},
   pick(x,y){if(disposed||!active||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)return null;return roomAt(x,y);},
   diagnostics(){const size=renderer?.getDrawingBufferSize(bufferSize);return {webgl2:true,ready,disposed,contextLost,active,frameCount,meshTriangles,materialCount,shadowEnabled:renderer?.shadowMap.enabled===true,shadowFilter:renderer?.shadowMap.type===T.PCFShadowMap?'pcf':'other',shadowMapSize:sun.shadow.mapSize.x,shadowRadius:sun.shadow.radius,closedShadowMaterials,shadowBounds:shadowBounds?{...shadowBounds}:null,staticShadow:sun.shadow.autoUpdate===false,doorLight:{position:lamp.position.toArray(),intensity:lamp.intensity,distance:lamp.distance,castsShadow:lamp.castShadow},atmosphere:{...COURT_ATMOSPHERE},runtimeSkyTextures:sky?1:0,runtimeSkyTexels:sky?COURT_ATMOSPHERE.skyWidth*COURT_ATMOSPHERE.skyHeight:0,drawCalls,renderedTriangles,assetTextureCount:assetInfo?.textureCount||0,assetTexels:assetInfo?.texels||0,gpuTextures:renderer?.info.memory.textures||0,assetBytes:assetInfo?.bytes||0,physicalPixels:dimensions?.physicalPixels||0,physicalWidth:size?.x||0,physicalHeight:size?.y||0,pixelRatio:dimensions?.pixelRatio||0,width:dimensions?.width||0,height:dimensions?.height||0,pendingFrame:driver?.state().pendingFrame||false,selected,camera:pose?copyPose(pose):null,projectedRooms:projected.map(value=>({...value}))};},
   dispose
  };
 }catch(error){fail(error,false);throw error;}
}
