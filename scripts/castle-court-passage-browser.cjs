/* Technical adoption proof, NOT application routing/door-art acceptance.
 * One actual renderer/context is moved from a same-origin iframe into an inert
 * parent layer. Only parent RAF drives its explicit presentation lease while
 * the iframe is hidden. No production credentials or external requests exist.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright-core'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-court-passage');
const layout=JSON.parse(fs.readFileSync(path.join(root,'command-center-98/lounge/assets/arrival-court-v1-layout.json'),'utf8'));
const mime={'.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const host=`<!doctype html><meta charset="utf-8"><title>Same-canvas adoption proof</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ece5d7;color:#24333b;font:14px system-ui}header{height:52px;box-sizing:border-box;padding:15px;background:#17282f;color:#f9ecd0}iframe{position:absolute;left:0;top:52px;width:100%;height:calc(100% - 52px);border:0}iframe[hidden]{display:none}#work{position:absolute;inset:52px 0 0;padding:24px;box-sizing:border-box}#presentation{position:fixed;inset:52px 0 0;pointer-events:none;z-index:10;overflow:clip}#presentation canvas{display:block;width:100%;height:100%}
</style><header>Technical proof · one canvas / one context</header><main id="work">Synthetic underlying work surface. No live records.</main><iframe id="scene" title="Owned same-origin renderer fixture" src="/__passage-child.html"></iframe>`;
const child=`<!doctype html><meta charset="utf-8"><style>html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}</style><main id="stage"><canvas id="court" style="display:block;width:100%;height:100%" aria-hidden="true"></canvas><span id="after" hidden></span></main><script type="module">
window.__contexts=new Set();window.__losses=0;window.__failures=[];window.__normalFrames=0;
const original=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(type,...args){const value=original.call(this,type,...args);if(/^webgl/.test(type)&&value)window.__contexts.add(value);return value;};
const canvas=document.getElementById('court');canvas.addEventListener('webglcontextlost',()=>window.__losses++);
try{
 const {createCourtRenderer}=await import('/command-center-98/lounge/arrival-renderer.js');
 window.__renderer=await createCourtRenderer({canvas,modelURL:new URL('/command-center-98/lounge/assets/arrival-court-v1.glb',location.href).href,onFrame:()=>window.__normalFrames++,onFailure:error=>window.__failures.push({code:error.code,message:error.message})});
 window.__ready=true;
}catch(error){window.__error=String(error.stack||error);}
</script>`;
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/__passage-host.html'||name==='/__passage-child.html')return res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(name.includes('host')?host:child);
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data));
});
function stats(bytes){const p=PNG.sync.read(bytes),colors=new Set();let count=0,sum=0,square=0;for(let y=0;y<p.height;y+=3)for(let x=0;x<p.width;x+=3){const at=(y*p.width+x)*4,r=p.data[at],g=p.data[at+1],b=p.data[at+2],v=(r+g+b)/3;colors.add((r>>4)*256+(g>>4)*16+(b>>4));count++;sum+=v;square+=v*v;}return {width:p.width,height:p.height,colors:colors.size,deviation:Math.sqrt(Math.max(0,square/count-(sum/count)**2)),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
function difference(a,b){const p=PNG.sync.read(a),q=PNG.sync.read(b);assert.equal(p.width,q.width);assert.equal(p.height,q.height);let sum=0,changed=0,pixels=0,changedPixels=0,maxDifference=0;for(let i=0;i<p.data.length;i+=4){let diff=0,exact=false;for(let k=0;k<4;k++){const delta=Math.abs(p.data[i+k]-q.data[i+k]);if(k<3)diff+=delta;maxDifference=Math.max(maxDifference,delta);if(delta)exact=true;}sum+=diff;if(diff>15)changed++;if(exact)changedPixels++;pixels++;}return {meanChannelDifference:sum/(pixels*3),changedFraction:changed/pixels,changedPixels,maxDifference};}
const results=[];let failures=0;
function check(result,name,pass,detail){result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));}
async function capture(page,result,name,canvas=false){const file=`${result.label}-${name}.png`;const bytes=canvas?await page.locator('#presentation canvas').screenshot():await page.screenshot();fs.writeFileSync(path.join(out,file),bytes);result.frames.push(file);return bytes;}
async function createProof(browser,origin,width,height,label){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference',serviceWorkers:'block'}),page=await context.newPage();
 const result={label:label||`${width}-${height}`,width,height,checks:[],frames:[],errors:[],blocked:[]};results.push(result);
 page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))(result.console||=[]).push(m.text());});
 await context.route('**/*',route=>{const req=route.request();if(new URL(req.url()).origin!==origin||!['GET','HEAD'].includes(req.method())){result.blocked.push(req.url());return route.abort();}return route.continue();});
 try{
 await page.goto(origin+'/__passage-host.html');
 await page.waitForFunction(()=>{const w=document.getElementById('scene').contentWindow;return w.__ready||w.__error;},null,{timeout:30_000});
 const error=await page.evaluate(()=>document.getElementById('scene').contentWindow.__error);assert.equal(error,undefined,'actual renderer initialized');
 await page.evaluate(anchors=>{
  const iframe=document.getElementById('scene'),child=iframe.contentWindow,canvas=child.document.getElementById('court'),renderer=child.__renderer,gl=canvas.getContext('webgl2');
  const debug=gl.getExtension('WEBGL_debug_renderer_info'),glInfo={version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};
  const rect=canvas.getBoundingClientRect(),originalParent=canvas.parentNode,originalNext=canvas.nextSibling,originalStyle=canvas.getAttribute('style'),originalHidden=iframe.hidden;
  const state=window.__proof={iframe,child,canvas,renderer,gl,originalParent,originalNext,originalStyle,originalHidden,rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},lease:null,layer:null,parentRAF:null,parentTicks:0,invalidations:[],progress:0,finishResults:[]};
  const copyRect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
  state.snapshot=()=>({gl:glInfo,normalCallbacks:child.__normalFrames,sameContext:canvas.getContext('webgl2')===gl,contextCanvasSame:gl.canvas===canvas,contextCount:child.__contexts.size,contextLost:gl.isContextLost(),lossEvents:child.__losses,owner:canvas.ownerDocument===document?'parent':canvas.ownerDocument===child.document?'child':'other',sameOriginalParent:canvas.parentNode===originalParent,sameOriginalNext:canvas.nextSibling===originalNext,style:canvas.getAttribute('style'),rect:copyRect(canvas),originalRect:{...state.rect},iframeHidden:iframe.hidden,parentRAF:state.parentRAF!==null,parentTicks:state.parentTicks,layerCount:document.querySelectorAll('#presentation').length,invalidations:[...state.invalidations],failures:[...child.__failures],alpha:gl.getContextAttributes()?.alpha,renderer:renderer.diagnostics()});
  state.adopt=()=>{
   state.lease=renderer.acquirePresentation({onInvalidated:reason=>state.invalidations.push(reason)});if(!state.lease)throw Error('Presentation lease unavailable');
   state.returnState=state.lease.returnState;state.progress=0;
   const layer=document.createElement('div');layer.id='presentation';layer.inert=true;layer.setAttribute('aria-hidden','true');document.body.append(layer);state.layer=layer;
   layer.append(canvas);iframe.hidden=true;renderer.setActive(false);
   return {returnState:state.returnState,snapshot:state.snapshot(),inert:layer.inert,ariaHidden:layer.getAttribute('aria-hidden'),pointerEvents:getComputedStyle(layer).pointerEvents};
  };
  state.paintTo=(progress,frames=6)=>new Promise((resolve,reject)=>{
   const from=state.progress,pose=state.returnState.pose,target={position:anchors['approach-insurance'],target:anchors['focus-insurance'],fov:40};let frame=0;
   const draw=()=>{state.parentRAF=null;state.parentTicks++;const fraction=from+(progress-from)*(++frame/frames),mix=(a,b)=>a.map((v,i)=>v+(b[i]-v)*fraction);
    try{const ok=state.lease.paintPose({position:mix(pose.position,target.position),target:mix(pose.target,target.target),fov:pose.fov+(target.fov-pose.fov)*fraction},{width:state.rect.width,height:state.rect.height});if(!ok)throw Error('Manual parent paint rejected');state.progress=fraction;if(frame===frames)resolve(state.snapshot());else state.parentRAF=requestAnimationFrame(draw);}catch(error){reject(error);}
   };state.parentRAF=requestAnimationFrame(draw);
  });
  state.restore=()=>{
   if(state.parentRAF!==null){cancelAnimationFrame(state.parentRAF);state.parentRAF=null;}
   originalParent.insertBefore(canvas,originalNext);if(originalStyle===null)canvas.removeAttribute('style');else canvas.setAttribute('style',originalStyle);iframe.hidden=originalHidden;state.layer?.remove();state.layer=null;
   const finished=state.lease?.finish({cancelled:true,direction:'in'})??false;state.finishResults.push(finished);state.lease=null;return {finished,snapshot:state.snapshot()};
  };
 },layout.anchors);
 return {context,page,result};
 }catch(error){error.proofContext={context,page,result};throw error;}
}
async function runCase(browser,origin,width,height,loss=false){
 let ctx;
 try{
  ctx=await createProof(browser,origin,width,height,loss?`${width}-${height}-context-loss`:undefined);const {page,result}=ctx;
  const initial=await page.evaluate(()=>__proof.snapshot());
  check(result,'one real alpha-enabled WebGL2 context rendered nonempty bounded geometry',initial.contextCount===1&&/WebGL 2/.test(initial.gl.version)&&initial.sameContext&&initial.contextCanvasSame&&initial.alpha===true&&initial.renderer.webgl2&&initial.renderer.frameCount>0&&initial.renderer.meshTriangles>0&&initial.renderer.meshTriangles<=60_000&&initial.renderer.physicalPixels<=1_800_000,initial);
  const original=await page.frameLocator('#scene').locator('#court').screenshot();fs.writeFileSync(path.join(out,result.label+'-original-canvas.png'),original);const initialPixels=stats(original);
  check(result,'initial context has real varied pixels, not only successful imports',initialPixels.colors>=24&&initialPixels.deviation>=8,initialPixels);await capture(page,result,'original');
  const adopted=await page.evaluate(()=>__proof.adopt());
  check(result,'same canvas/context is adopted into a noninteractive parent layer while child frame is hidden',adopted.snapshot.sameContext&&adopted.snapshot.contextCanvasSame&&adopted.snapshot.contextCount===1&&adopted.snapshot.owner==='parent'&&adopted.snapshot.iframeHidden&&adopted.inert&&adopted.ariaHidden==='true'&&adopted.pointerEvents==='none'&&!adopted.snapshot.renderer.pendingFrame,adopted);
  // Do not call paintTo/paintPose before this proof. DOM adoption must retain
  // the already-composited normal frame even with preserveDrawingBuffer=false.
  const retainedPixels=await capture(page,result,'adopted-retained-canvas',true),retained=await page.evaluate(()=>__proof.snapshot()),retention=difference(original,retainedPixels);
  check(result,'adoption retains exactly the original visible pixels BEFORE any manual redraw',retention.changedPixels===0&&retention.maxDifference===0&&retained.renderer.frameCount===adopted.snapshot.renderer.frameCount&&retained.parentTicks===0&&!retained.parentRAF&&!retained.renderer.pendingFrame&&retained.sameContext&&!retained.contextLost,{pixels:retention,frameCountBefore:adopted.snapshot.renderer.frameCount,frameCountAfter:retained.renderer.frameCount,parentTicks:retained.parentTicks,owner:retained.owner});
  const zero=await page.evaluate(()=>__proof.paintTo(0,2));const zeroPixels=await capture(page,result,'adopted-zero-canvas',true);
  const continuity=difference(original,zeroPixels);check(result,'first adopted frame preserves the actual pre-move camera pixels',continuity.meanChannelDifference<1.5,continuity);
  check(result,'manual parent RAF paints despite the suspended child driver',zero.parentTicks>=2&&zero.normalCallbacks===initial.normalCallbacks&&zero.renderer.frameCount>=initial.renderer.frameCount+2&&zero.renderer.active===false&&!zero.renderer.pendingFrame&&zero.sameContext&&!zero.contextLost,zero);
  await capture(page,result,'adopted-zero');
  if(loss){
   const hasExtension=await page.evaluate(()=>{const ext=__proof.gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});check(result,'real context-loss extension is available and exercised',hasExtension);
   await page.waitForFunction(()=>__proof.gl.isContextLost()&&__proof.renderer.diagnostics().disposed);
   const restored=await page.evaluate(()=>__proof.restore());
   check(result,'terminal graphics failure still permits exact DOM restoration with no parent RAF or overlay',restored.snapshot.owner==='child'&&restored.snapshot.sameOriginalParent&&restored.snapshot.sameOriginalNext&&restored.snapshot.style===await page.evaluate(()=>__proof.originalStyle)&&restored.snapshot.layerCount===0&&!restored.snapshot.parentRAF&&!restored.snapshot.renderer.pendingFrame&&restored.snapshot.lossEvents===1,restored);await capture(page,result,'lost-restored');
  }else{
   for(const progress of [.33,.67,1]){const moved=await page.evaluate(value=>__proof.paintTo(value),progress);check(result,'hidden-child manual paint advances safely at '+progress,moved.owner==='parent'&&moved.sameContext&&!moved.contextLost&&moved.contextCount===1&&moved.iframeHidden&&moved.renderer.active===false&&!moved.renderer.pendingFrame,moved);await capture(page,result,'progress-'+String(progress).replace('.',''));}
   const endPixels=await capture(page,result,'end-canvas',true),movement=difference(zeroPixels,endPixels);check(result,'parent-owned frames materially change real geometry pixels',movement.meanChannelDifference>2&&movement.changedFraction>.05,movement);
   const restored=await page.evaluate(()=>__proof.restore()),s=restored.snapshot;
   check(result,'restore returns the exact original node position style rectangle and live context',restored.finished&&s.owner==='child'&&s.sameOriginalParent&&s.sameOriginalNext&&s.style===await page.evaluate(()=>__proof.originalStyle)&&['left','top','width','height'].every(k=>Math.abs(s.rect[k]-s.originalRect[k])<.01)&&s.sameContext&&s.contextCount===1&&!s.contextLost&&s.lossEvents===0&&s.layerCount===0&&!s.parentRAF&&!s.renderer.pendingFrame&&s.renderer.active===false,restored);
   await page.evaluate(()=>__proof.renderer.setActive(true));await page.waitForFunction(()=>!__proof.renderer.diagnostics().pendingFrame);
   const restoredPixels=await page.frameLocator('#scene').locator('#court').screenshot(),roundtrip=difference(original,restoredPixels);fs.writeFileSync(path.join(out,result.label+'-restored-canvas.png'),restoredPixels);
   check(result,'normal child presentation resumes at the original actual camera without a visual jump',roundtrip.meanChannelDifference<1.5,roundtrip);await capture(page,result,'restored');
   const idle=await page.evaluate(()=>__proof.snapshot());await page.waitForTimeout(180);const later=await page.evaluate(()=>__proof.snapshot());
   check(result,'finished presentation leaves no orphan parent or child RAF',!later.parentRAF&&!later.renderer.pendingFrame&&idle.renderer.frameCount===later.renderer.frameCount&&later.layerCount===0,later);
  }
  check(result,'no uncaught exceptions or remote requests',result.errors.length===0&&result.blocked.length===0,{errors:result.errors,blocked:result.blocked});
  console.log('PASS '+result.label+': '+result.checks.length+' same-context adoption checks');
 }catch(error){failures++;ctx ||= error.proofContext;if(ctx){ctx.result.failure=String(error.stack||error);ctx.result.failureState=await ctx.page.evaluate(()=>window.__proof?.snapshot()).catch(()=>null);await capture(ctx.page,ctx.result,'failure').catch(()=>{});}console.error(error.stack||error);
 }finally{if(ctx){await ctx.page.evaluate(()=>{const p=window.__proof;if(p?.layer)p.restore();p?.renderer.dispose();}).catch(()=>{});await ctx.context.close();}}
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;let browser;
 const environment={scope:'isolated real renderer/canvas adoption; no application route claim',softwareGLRequested:true,physicalDeviceTested:false};
 try{browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']});environment.browserVersion=browser.version();for(const [w,h]of[[390,900],[320,640],[800,648],[1440,900]])await runCase(browser,origin,w,h);await runCase(browser,origin,390,900,true);}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment,results,failures},null,2));await browser?.close();server.close();}
 assert.equal(failures,0,`${failures} real canvas-adoption proof case(s) failed`);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
