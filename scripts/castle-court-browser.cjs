/* Owned synthetic CI only. No production credentials, posts, or remote traffic.
 * Real app-v130 -> castle-parent -> default lounge index -> explicit lazy entry.
 * Only synthetic records are injected; the host/iframe route is not substituted.
 * Software GL verifies rendering and lifecycle, NOT a physical phone FPS claim.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-court');
const authoredCourt=JSON.parse(fs.readFileSync(path.join(root,'command-center-98/lounge/assets/arrival-court-v1-layout.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
const keys=['insurance','otoku','rakuten','lottery'];
const titles={insurance:'保険の保存原稿',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿'};
const rows=keys.map((key,i)=>({id:971+i,taskId:key+'-threads-v1',eventKey:'court-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。入口の見た目が変わっても、保存した本文と出典は変わりません。\n\n'+'コピーは投稿ではありません。元の原稿棚とお気に入りをそのまま使います。\n\n'.repeat(10),date:'2026-10-31',review_status:'検証専用下書き',sources_note:'合成データ・送信不可'}}));
const fixtureScript=`(()=>{
 const rows=${JSON.stringify(rows)};__rpgQA.threads.events.push(...rows);
 window.__courtRecords={original:JSON.stringify(rows),ids:rows.map(r=>r.id),requests:[],external:[]};
 window.open=(...args)=>{__courtRecords.external.push(args);return null;};
 const previous=window.fetch;
 window.fetch=async(input,options={})=>{
  const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href),method=(options.method||input?.method||'GET').toUpperCase();
  __courtRecords.requests.push({url:url.href,method});
  const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  if(method==='GET'&&url.searchParams.get('resource')==='task-events'&&rows.some(r=>r.taskId===url.searchParams.get('taskId')))return json({ok:true,events:rows.filter(r=>r.taskId===url.searchParams.get('taskId')),nextOffset:null});
  if(method==='GET'&&url.searchParams.get('resource')==='threads-images')return json({ok:true,id:url.searchParams.get('id'),accountKey:url.searchParams.get('accountKey'),manifest:{contract:'threads-post-images-v1',revision:0,images:[]},assets:[]});
  return previous(input,options);
 };
})();`;

const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
 const relative=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,bytes)=>{
  if(error)return res.writeHead(404).end();let content=bytes;
  if(relative==='/command-center-98/app.html')content=bytes.toString().replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script><script>'+fixtureScript+'</script>');
  if(relative==='/scripts/ui-fixtures.js')content=bytes.toString().replace(/document\.addEventListener\('DOMContentLoaded',[\s\S]*?\n  \}\);/,'');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(content);
 });
});

function pixelStats(bytes){
 const png=PNG.sync.read(bytes),colors=new Set();let sum=0,square=0,opaque=0,count=0;
 for(let y=0;y<png.height;y+=3)for(let x=0;x<png.width;x+=3){
  const p=(y*png.width+x)*4,r=png.data[p],g=png.data[p+1],b=png.data[p+2],a=png.data[p+3],l=(r+g+b)/3;
  sum+=l;square+=l*l;count++;if(a>240)opaque++;colors.add((r>>4)*256+(g>>4)*16+(b>>4));
 }
 return {width:png.width,height:png.height,colors:colors.size,mean:sum/count,deviation:Math.sqrt(Math.max(0,square/count-(sum/count)**2)),opaqueFraction:opaque/count};
}

const results=[],environment={softwareGLRequested:true,physicalDeviceTested:false};let failures=0;
function check(result,name,pass,detail){
 result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
 assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));
}
async function snapshot(frame){return frame.evaluate(()=>window.__arrivalCourt.snapshot());}
async function settled(frame){await frame.waitForFunction(()=>{const value=window.__arrivalCourt?.snapshot();return value?.ready&&value.renderer&&!value.renderer.pendingFrame&&!value.renderer.presentation?.active;});}
async function capture(ctx,name){
 const file=`${ctx.result.label}-${name}.png`;await ctx.page.screenshot({path:path.join(out,file)});ctx.result.frames.push(file);
}
async function openHost(browser,origin,{width=390,height=900,label,fault=null,shadowOff=false,reducedMotion='no-preference',autoActivate=true,deferModel=false}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=800,reducedMotion,serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),result={label:label||`${width}-${height}`,width,height,checks:[],frames:[],errors:[],blocked:[],expectedFaults:[],heavyRequests:[]};results.push(result);
 let releaseModel,modelRequested;const modelGate=new Promise(resolve=>releaseModel=resolve),modelRequest=new Promise(resolve=>modelRequested=resolve);
 page.on('request',request=>{if(/\/arrival-(atelier|renderer|camera)\.js|\/vendor\/three-r187\/|\/arrival-court-v1\.glb/.test(new URL(request.url()).pathname))result.heavyRequests.push(request.url());});
 if(shadowOff){result.diagnosticOnly=true;result.sourceSubstitutions=[];}
 page.on('pageerror',error=>result.errors.push(error.message));
 page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')(result.console||=[]).push(message.text());});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin||!['GET','HEAD'].includes(request.method())){result.blocked.push({url:url.href,method:request.method()});return route.abort();}
  if(deferModel&&url.pathname.endsWith('/arrival-court-v1.glb')){modelRequested();await modelGate;}
  if(shadowOff&&url.pathname.endsWith('/arrival-renderer.js')){
   const original=fs.readFileSync(path.join(root,'command-center-98/lounge/arrival-renderer.js'),'utf8'),needle='renderer.shadowMap.enabled=true';
   assert.equal(original.split(needle).length-1,1,'owned diagnostic substitution has one exact source target');
   result.sourceSubstitutions.push({path:url.pathname,from:needle,to:'renderer.shadowMap.enabled=false'});
   return route.fulfill({status:200,contentType:'text/javascript',body:original.replace(needle,'renderer.shadowMap.enabled=false')});
  }
  if(fault==='invalid-model'&&url.pathname.endsWith('/arrival-court-v1.glb')){result.expectedFaults.push(url.pathname);return route.fulfill({status:200,contentType:'model/gltf-binary',body:Buffer.from('invalid synthetic GLB')});}
  if((fault==='model'&&url.pathname.endsWith('/arrival-court-v1.glb'))||(fault==='module'&&url.pathname.endsWith('/arrival-renderer.js'))||(fault==='entry-module'&&url.pathname.endsWith('/arrival-atelier.js'))){result.expectedFaults.push(url.pathname);return route.abort();}
  if((fault==='passage-module'&&url.pathname.endsWith('/arrival-passage.js'))||(fault==='passage-css'&&url.pathname.endsWith('/court-passage.css'))){result.expectedFaults.push(url.pathname);return route.abort();}
  return route.continue();
 });
 const ctx={context,page,result,frame:null,f:null,releaseModel,modelRequest};
 try{
  await page.goto(origin+'/command-center-98/app-v130.html');
  await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
  ctx.frame=page.frames().find(frame=>new URL(frame.url()).pathname.endsWith('/lounge/index.html'));
  assert.ok(ctx.frame,'real unmodified host loads its default lounge index');ctx.f=page.frameLocator('#ccCastleFrame');
  await ctx.f.locator('.account-board').waitFor({state:'attached'});
  await ctx.frame.evaluate(async()=>{await document.fonts.ready;const script=document.querySelector('script[src^="app.js"]');if(script)window.__courtLiving=(await import(script.src)).getLivingDesk();});
  await ctx.frame.waitForFunction(()=>window.__courtLiving?.snapshot().complete===true);
  await ctx.f.locator('[data-arrival-entry]').waitFor();await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
  check(result,'default real host has no prototype route or eagerly loaded graphics',!new URL(ctx.frame.url()).searchParams.has('experience')&&result.heavyRequests.length===0&&await ctx.frame.evaluate(()=>!window.__arrivalCourt),[...result.heavyRequests]);
  const entry=await ctx.f.locator('[data-arrival-entry]').evaluate(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth};});
  check(result,'default castle exposes a bounded 44px optional 3D entry',entry.width>=44&&entry.height>=44&&entry.left>=-.5&&entry.right<=entry.viewport[0]+.5&&entry.bottom<=entry.viewport[1]+.5&&!entry.overflow,entry);
  await capture(ctx,'default-castle');
  if(autoActivate)await ctx.f.locator('[data-arrival-entry]').click();
  return ctx;
 }catch(error){releaseModel();await fail(ctx,error);await context.close();throw error;}
}
async function fail(ctx,error){
 failures++;ctx.result.failure=String(error.stack||error);
 if(ctx.frame)ctx.result.failureState=await snapshot(ctx.frame).catch(()=>null);
 await capture(ctx,'failure').catch(()=>{});
 console.error(`FAIL ${ctx.result.label}: ${error.stack||error}`);
}
async function unchanged(ctx){
 check(ctx.result,'synthetic source data was not modified',await ctx.page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(row=>__courtRecords.ids.includes(row.id)))===__courtRecords.original));
 check(ctx.result,'no source writes or external actions',await ctx.page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0&&__courtRecords.external.length===0));
 check(ctx.result,'no unexpected transport',ctx.result.blocked.length===0,ctx.result.blocked);
 check(ctx.result,'no uncaught browser exceptions',ctx.result.errors.length===0,ctx.result.errors);
}
async function reader(ctx,key){
 await ctx.f.locator(`#room[data-account=${key}][data-spatial-desk=ready]`).waitFor();
 await ctx.f.locator('#draft-body').filter({hasText:key+' の合成原稿です。'}).waitFor();
 const geometry=await ctx.f.locator('#desk-scroll').evaluate(node=>({height:node.clientHeight,bodyTop:document.getElementById('draft-body').getBoundingClientRect().top,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,buttons:['desk-copy','desk-done'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,height:r.height,top:r.top,bottom:r.bottom};})}));
 check(ctx.result,key+' reader keeps its usable live DOM geometry',geometry.height>=180&&geometry.bodyTop<geometry.viewport-80&&!geometry.overflow&&geometry.buttons.every(button=>button.height>=44&&button.bottom<=geometry.viewport+1),geometry);
 check(ctx.result,key+' original text retained',await ctx.f.locator('#draft-body').textContent()===rows.find(row=>row.taskId===key+'-threads-v1').payload.draft);
 await ctx.f.locator('#desk-copy').click();await ctx.f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
 check(ctx.result,key+' original copy action works',(await ctx.page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===rows.find(row=>row.taskId===key+'-threads-v1').payload.draft);
}
async function back(ctx){await ctx.f.locator('#back').click();await ctx.f.locator('.account-board:not([hidden])').waitFor();}
async function closeSettings(ctx){
 // HTMLDialogElement queues its close event; wait for that actual lifecycle
 // boundary, not an arbitrary delay or a predicate that could hide focus bugs.
 await ctx.frame.evaluate(()=>{window.__courtSettingsClose=new Promise(resolve=>document.getElementById('settings').addEventListener('close',()=>resolve(true),{once:true}));});
 await ctx.f.locator('#settings-close').click();await ctx.frame.evaluate(()=>window.__courtSettingsClose);
}
async function targetsUncovered(ctx,label){
 const targets=await ctx.f.locator('.arrival-target:not([hidden]):not(:disabled)').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {key:node.dataset.courtRoom,hit:hit?.closest('[data-court-room]')?.dataset.courtRoom||hit?.className||null};}));
 check(ctx.result,label+' visible physical entrances are not covered by UI',targets.length>0&&targets.every(target=>target.hit===target.key),targets);
}
async function overviewContrast(ctx){
 const contrast=await ctx.frame.evaluate(()=>{
  const rgba=value=>{const values=value.match(/[\d.]+/g)?.map(Number);if(!values||values.length<3)throw Error('Unsupported computed color '+value);return [...values.slice(0,3),values[3]??1];};
  const composite=(front,back)=>front.slice(0,3).map((value,index)=>value*front[3]+back[index]*(1-front[3]));
  const luminance=color=>color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  return ['.arrival-identity h1','.arrival-detail h2','.arrival-kicker','.arrival-hint','.arrival-text-button'].map(selector=>{
   const node=document.querySelector(selector),rect=node.getBoundingClientRect();if(!rect.width||!rect.height)return {selector,visible:false};
   const text=rgba(getComputedStyle(node).color),surfaces=[];let opacity=1;
   for(let current=node;current&&!current.matches('.arrival-court');current=current.parentElement){const style=getComputedStyle(current);opacity*=Number(style.opacity);if(style.backgroundImage!=='none')throw Error('Contrast surface requires explicit gradient handling: '+selector);surfaces.push(rgba(style.backgroundColor));}
   const ratios=[[0,0,0],[255,255,255]].map(base=>{let background=base;for(const surface of [...surfaces].reverse())background=composite(surface,background);return ratio(composite(text,background),background);});
   return {selector,visible:true,text,surfaces,opacity,ratios,minRatio:Math.min(...ratios)};
  });
 });
 check(ctx.result,'overview ink remains AA against its alpha surfaces over both black and white scene extrema',contrast.filter(item=>item.visible).length>=3&&contrast.filter(item=>item.visible).every(item=>item.opacity===1&&item.minRatio>=4.5),contrast);
}

async function normalCase(browser,origin,width,height){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{width,height});const {context,page,frame,f,result}=ctx;
  await f.locator('.arrival-court[data-state=ready]').waitFor({timeout:30_000});await settled(frame);
  const first=await snapshot(frame),render=first.renderer;
  check(result,'genuine WebGL2 rendered real bounded geometry',render.webgl2===true&&render.frameCount>0&&render.meshTriangles>0&&render.meshTriangles<=60_000&&render.drawCalls>0&&render.renderedTriangles>0&&!render.contextLost,render);
  check(result,'materials, main-plus-shadow draw calls and decoded textures stay bounded',render.drawCalls<=128&&render.materialCount<=12&&render.assetTextureCount<=4&&render.assetTexels<=1_000_000,{drawCalls:render.drawCalls,materialCount:render.materialCount,assetTextureCount:render.assetTextureCount,assetTexels:render.assetTexels,gpuTextures:render.gpuTextures});
  check(result,'generated runtime sky is one bounded texture, separate from authored asset textures',render.runtimeSkyTextures===1&&render.runtimeSkyTexels===32_768,{runtimeSkyTextures:render.runtimeSkyTextures,runtimeSkyTexels:render.runtimeSkyTexels,atmosphere:render.atmosphere});
  check(result,'normal court retains supported bounded cached shadows rather than hiding the defect by disabling them',render.shadowEnabled===true&&render.shadowFilter==='pcf'&&render.shadowMapSize<=1024&&render.staticShadow===true&&render.closedShadowMaterials===11,{shadowEnabled:render.shadowEnabled,shadowFilter:render.shadowFilter,shadowMapSize:render.shadowMapSize,shadowRadius:render.shadowRadius,staticShadow:render.staticShadow,closedShadowMaterials:render.closedShadowMaterials,shadowBounds:render.shadowBounds,doorLight:render.doorLight});
  check(result,'warm fanlight stays behind its measured pane without a new shadow pass',render.doorLight.position.every((value,index)=>Math.abs(value-[-5.6,2.8,-2.852][index])<.0001)&&render.doorLight.intensity===.8&&render.doorLight.distance===3.5&&render.doorLight.castsShadow===false,render.doorLight);
  check(result,'drawing buffer is bounded',render.pixelRatio<=1.5&&render.physicalPixels<=1_800_000&&render.physicalWidth*render.physicalHeight<=1_800_000&&render.width>0&&render.height>0,render);
  const gl=await f.locator('.arrival-court canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:gl instanceof WebGL2RenderingContext,version:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};});
  gl.backend=/swiftshader|software/i.test(gl.renderer)?'software':/angle|nvidia|intel|amd|adreno|mali/i.test(gl.renderer)?'hardware-or-unknown':'unknown';
  check(result,'software GL job has a real WebGL2 context',gl.webgl2&&/WebGL 2/i.test(gl.version),gl);result.gl=gl;console.log('COURT_GL '+JSON.stringify({case:result.label,...gl}));
  const pixels=await f.locator('.arrival-court canvas').screenshot();fs.writeFileSync(path.join(out,result.label+'-canvas.png'),pixels);const statistics=pixelStats(pixels);
  check(result,'canvas contains visibly varied rendered geometry, not a blank surface',statistics.colors>=24&&statistics.deviation>=8&&statistics.opaqueFraction>.8,statistics);
  await capture(ctx,'arrival');
  await overviewContrast(ctx);await targetsUncovered(ctx,'overview');
  const host=await page.locator('#ccCastleFrame').boundingBox(),rail=await page.locator('#requestProgressShortcut').boundingBox();
  check(result,'actual host reserves its request rail',host.y>=rail.y+rail.height-.5,{host,rail});
  const controls=await f.locator('[data-court-room], [data-court-open]').evaluateAll(nodes=>nodes.filter(node=>!node.disabled&&node.getBoundingClientRect().width>0).map(node=>{const r=node.getBoundingClientRect();return {key:node.dataset.courtRoom||node.dataset.courtOpen,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:[innerWidth,innerHeight]};}));
  check(result,'visible court destinations have usable bounded touch targets',controls.length>=5&&controls.every(control=>control.width>=44&&control.height>=44&&control.left>=-.5&&control.right<=control.viewport[0]+.5&&control.top>=-.5&&control.bottom<=control.viewport[1]+.5),controls);
  const alignment=await frame.evaluate(()=>{const state=window.__arrivalCourt.snapshot();return state.projection.map(point=>{const button=document.querySelector('[data-court-room="'+point.key+'"]'),r=button.getBoundingClientRect(),court=document.querySelector('.arrival-court').getBoundingClientRect();return {key:point.key,visible:!button.hidden,delta:Math.max(Math.abs(r.left+r.width/2-court.left-point.x),Math.abs(r.top+r.height/2-court.top-point.y))};});});
  check(result,'all eight named anchors project from the real camera and visible controls match',alignment.length===8&&alignment.filter(item=>item.visible).every(item=>item.delta<.6),alignment);
  const idle=await snapshot(frame);await page.waitForTimeout(250);const afterIdle=await snapshot(frame);
  check(result,'settled court stops animation frames',idle.renderer.frameCount===afterIdle.renderer.frameCount&&!afterIdle.renderer.pendingFrame,{before:idle.renderer,after:afterIdle.renderer});
  await f.locator('.arrival-menu summary').click();await f.locator('.arrival-menu').getByRole('button',{name:'いつもの城へ',exact:true}).click();
  await f.locator('.spatial-castle').waitFor({state:'visible'});await f.locator('.arrival-launch').waitFor();
  const launchGeometry=await f.locator('.arrival-launch').evaluate(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth};});
  check(result,'manual classic view keeps its 44px re-entry control inside the viewport without overflow',launchGeometry.width>=44&&launchGeometry.height>=44&&launchGeometry.left>=-.5&&launchGeometry.right<=launchGeometry.viewport[0]+.5&&launchGeometry.top>=-.5&&launchGeometry.bottom<=launchGeometry.viewport[1]+.5&&!launchGeometry.overflow,launchGeometry);
  await capture(ctx,'manual-classic-reentry');await f.locator('.arrival-launch').click();await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
  check(result,'manual classic round trip reuses the ready live renderer',(await snapshot(frame)).active===true);
  if(width<=800){
   const touchPoint=await frame.evaluate(()=>{const canvas=document.querySelector('.arrival-court canvas');for(const y of [120,170,220,270])for(const portion of [.18,.5,.82]){const x=innerWidth*portion;if(y+40<innerHeight&&document.elementFromPoint(x,y)===canvas&&document.elementFromPoint(x+24,y+32)===canvas)return {x,y};}return null;});
   check(result,'touch exploration has a real unobstructed canvas region',!!touchPoint,touchPoint);
   const offset=await page.locator('#ccCastleFrame').boundingBox(),touch=await context.newCDPSession(page),beforeTouch=await snapshot(frame);
   try{for(const [dx,dy] of [[0,32],[24,32]]){
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:offset.x+touchPoint.x,y:offset.y+touchPoint.y,id:1}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:offset.x+touchPoint.x+dx,y:offset.y+touchPoint.y+dy,id:1}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }}finally{await touch.detach();}
   const afterTouch=await snapshot(frame);check(result,'real vertical and diagonal touch gestures never open or select a door',afterTouch.selected===beforeTouch.selected&&await f.locator('#room').isHidden(),{before:beforeTouch.selected,after:afterTouch.selected});
   const drag=await context.newCDPSession(page);
   try{await drag.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:offset.x+touchPoint.x,y:offset.y+touchPoint.y,id:1}]});await drag.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:offset.x+touchPoint.x+36,y:offset.y+touchPoint.y,id:1}]});await drag.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await drag.detach();}
   await settled(frame);const afterDrag=await snapshot(frame);
   check(result,'horizontal touch drag changes real camera perspective without routing',afterDrag.renderer.camera.position.some((value,index)=>Math.abs(value-afterTouch.renderer.camera.position[index])>.0001)&&afterDrag.selected===afterTouch.selected&&await f.locator('#room').isHidden(),{before:afterTouch.renderer.camera,after:afterDrag.renderer.camera});
  }
  const movingKey=await f.locator('.arrival-target:not([hidden]):not(:disabled)').evaluateAll(nodes=>nodes.map(node=>node.dataset.courtRoom).find(key=>['insurance','otoku','rakuten','lottery'].includes(key)));
  check(result,'a visible publishing entrance can begin a real camera move',!!movingKey,{movingKey});
  await frame.evaluate(key=>{
   window.__courtMotionProbe={record:null};const initialFrame=window.__arrivalCourt.snapshot().renderer.frameCount;
   const observer=new MutationObserver(()=>{
    const state=window.__arrivalCourt.snapshot();if(!state.renderer?.pendingFrame||state.renderer.selected!==key||state.renderer.frameCount<=initialFrame)return;
    const root=document.querySelector('.arrival-court').getBoundingClientRect();
    const planes=[...document.querySelectorAll('.arrival-identity,.arrival-utilities,.arrival-detail,.arrival-footer,.arrival-menu[open] .arrival-menu-items')].map(node=>{const r=node.getBoundingClientRect();return {name:node.className,left:r.left-root.left,right:r.right-root.left,top:r.top-root.top,bottom:r.bottom-root.top,width:r.width,height:r.height};}).filter(r=>r.width>0&&r.height>0);
    const targets=state.projection.map(point=>{const button=document.querySelector('[data-court-room="'+point.key+'"]'),rect=button.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);const overlaps=planes.filter(r=>point.x+22>r.left&&point.x-22<r.right&&point.y+22>r.top&&point.y-22<r.bottom),obstructions=point.uiObstructions||[];return {key:point.key,visible:!button.hidden,physicalVisible:point.visible,inSafeBounds:point.x>=22&&point.x<=root.width-22&&point.y>=80&&point.y<=root.height-114,uiOccluded:point.uiOccluded,uiReasonMeasured:point.uiOccluded===!!overlaps.length&&obstructions.length===overlaps.length&&obstructions.every(r=>overlaps.some(a=>a.name===r.name&&['left','right','top','bottom'].every(k=>Math.abs(a[k]-r[k])<.1))),disabled:button.disabled,center:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},hit:hit?.closest('[data-court-room]')?.dataset.courtRoom||hit?.className||null,hitElement:hit?{tag:hit.tagName,id:hit.id,html:hit.outerHTML.slice(0,300)}:null,delta:Math.max(Math.abs(rect.left+rect.width/2-root.left-point.x),Math.abs(rect.top+rect.height/2-root.top-point.y))};});
    window.__courtMotionProbe.record={pendingFrame:state.renderer.pendingFrame,initialFrame,frameCount:state.renderer.frameCount,selected:state.selected,camera:state.renderer.camera,targets};observer.disconnect();
   });observer.observe(document.querySelector('.arrival-targets'),{subtree:true,attributes:true,attributeFilter:['style','hidden']});
  },movingKey);
  await f.locator('[data-court-room="'+movingKey+'"]').focus();await page.keyboard.press('Enter');
  await frame.waitForFunction(()=>window.__courtMotionProbe.record,null,{timeout:10_000});
  const moving=await frame.evaluate(()=>window.__courtMotionProbe.record);
  check(result,'during real motion all painted entrance targets share the same camera projection',moving.pendingFrame&&moving.targets.length===8&&moving.targets.some(target=>target.physicalVisible)&&moving.targets.filter(target=>target.visible).every(target=>target.delta<.6),moving);
  check(result,'moving hidden targets have independently measured UI occlusion or physical bounds reasons',moving.targets.every(target=>target.uiReasonMeasured&&(target.visible?target.physicalVisible&&target.inSafeBounds&&!target.uiOccluded:!target.physicalVisible||!target.inSafeBounds||target.uiOccluded)),moving.targets);
  check(result,'during real motion visible active entrances remain the actual pointer targets',moving.targets.filter(target=>target.visible&&!target.disabled).every(target=>target.hit===target.key),moving.targets);
  const latestKey=movingKey==='insurance'?'otoku':'insurance';await f.locator('[data-court-open="'+latestKey+'"]').focus();await page.keyboard.press('Enter');await reader(ctx,latestKey);await capture(ctx,'interrupted-camera-reader');
  await back(ctx);await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
  check(result,'new direct intent wins over the old camera and Back restores that same destination',(await snapshot(frame)).selected===latestKey&&await f.locator('[data-court-open="'+latestKey+'"]').evaluate(node=>node===document.activeElement),{movingKey,latestKey,final:await snapshot(frame)});
  let focusedCount=0,enteredFromDoor=false;
  for(const key of [...keys,'sourcing']){
   if(await f.locator('.arrival-overview').isVisible()){await f.locator('.arrival-overview').click();await settled(frame);}
   const focus=f.locator(`[data-court-room="${key}"]`).first();
   if(!await focus.isVisible()){
    const hiddenTarget=await frame.evaluate(key=>{const state=window.__arrivalCourt.snapshot(),point=state.projection.find(point=>point.key===key),root=document.querySelector('.arrival-court');const origin=root.getBoundingClientRect(),overlaps=[...document.querySelectorAll('.arrival-identity,.arrival-utilities,.arrival-detail,.arrival-footer,.arrival-menu[open] .arrival-menu-items')].map(node=>{const r=node.getBoundingClientRect();return {name:node.className,left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width,height:r.height};}).filter(r=>r.width>0&&r.height>0&&point.x+22>r.left&&point.x-22<r.right&&point.y+22>r.top&&point.y-22<r.bottom),reasons=point.uiObstructions||[];return {point,width:root.clientWidth,height:root.clientHeight,uiReasonMeasured:point.uiOccluded===true&&overlaps.length>0&&reasons.length===overlaps.length&&reasons.every(r=>overlaps.some(a=>a.name===r.name&&['left','right','top','bottom'].every(k=>Math.abs(a[k]-r[k])<.1)))};},key);
    const p=hiddenTarget.point;check(result,key+' offscreen aperture does not receive a misleading visible hitbox',p&&(!p.visible||p.x<22||p.x>hiddenTarget.width-22||p.y<80||p.y>hiddenTarget.height-114||hiddenTarget.uiReasonMeasured),hiddenTarget);continue;
   }
   await focus.click();await settled(frame);focusedCount++;
   const selected=await snapshot(frame);check(result,'camera focuses the requested visible '+key,selected.renderer.selected===key&&selected.projection.find(point=>point.key===key)?.visible===true,{selected:selected.selected,renderer:selected.renderer});
   await targetsUncovered(ctx,key+' focused');
   await capture(ctx,key+'-focus');
   if(!enteredFromDoor&&keys.includes(key)){
    await f.locator('.arrival-enter').click();await reader(ctx,key);await capture(ctx,'door-enter-reader');await back(ctx);await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
    check(result,'architectural entrance opens the owner reader and Back restores its entrance control',await f.locator('.arrival-enter').evaluate(node=>node===document.activeElement));enteredFromDoor=true;
   }
  }
  check(result,'the composed overview has a reachable architectural manuscript entrance',focusedCount>0&&enteredFromDoor,{focusedCount,enteredFromDoor});
  // The renderer never owns manuscript data or a replacement reader.
  for(const key of keys){
   const open=f.locator(`[data-court-open="${key}"]`).first();
   if(key==='insurance'){await open.focus();await page.keyboard.press('Enter');}else await open.click();
   await reader(ctx,key);await capture(ctx,key+'-reader');
   if(key==='insurance'){
    await f.locator('.living-toggle').click();await f.locator('#living-workbench').waitFor();
    check(result,'existing room objects are still real owner tools',await f.locator('#living-workbench [data-object]').count()===4);await capture(ctx,'insurance-tools');
    await f.locator('.living-toggle').click();await f.locator('#draft-body').waitFor();
   }
   await back(ctx);await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
   const returned=await frame.evaluate(()=>{const state=window.__arrivalCourt.snapshot();return {key:document.activeElement?.dataset.courtOpen||document.activeElement?.dataset.courtRoom,selected:state.selected,visible:state.projection.find(point=>point.key===state.selected)?.visible};});
   check(result,key+' Back restores the same source room and visible trigger focus',returned.key===key&&returned.selected===key&&returned.visible===true,returned);await capture(ctx,key+'-return-focus');
  }
  await f.locator('[data-court-open="sourcing"]').first().click();await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
  check(result,'sourcing opens the unchanged native workspace',await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing'&&await page.locator('#ccCastleFrame').isHidden());await capture(ctx,'sourcing');
  await page.locator('[data-lounge-home]').click();await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
  const sourcingReturn=await snapshot(frame);check(result,'native sourcing Back shows its own real unobstructed doorway',sourcingReturn.selected==='sourcing'&&sourcingReturn.projection.find(point=>point.key==='sourcing')?.visible===true,sourcingReturn);
  await capture(ctx,'sourcing-return-focus');
  const beforeResize=await snapshot(frame);await page.setViewportSize({width:width===320?390:320,height:640});await settled(frame);
  const resized=await snapshot(frame);check(result,'resizing retains selection and bounded rendering',resized.renderer.selected===beforeResize.renderer.selected&&resized.renderer.pixelRatio<=1.5&&resized.renderer.physicalPixels<=1_800_000,resized.renderer);
  await capture(ctx,'resized');
  // A native workspace hides the actual iframe and must suspend the renderer.
  await f.locator('[data-court-open="sourcing"]').first().click();await page.locator('#ccCastleFrame').waitFor({state:'hidden'});
  const hidden=await snapshot(frame);await page.waitForTimeout(200);const hiddenLater=await snapshot(frame);
  check(result,'hidden host frame is inactive and renders no background frames',hiddenLater.renderer.active===false&&!hiddenLater.renderer.pendingFrame&&hidden.renderer.frameCount===hiddenLater.renderer.frameCount,{hidden,hiddenLater});
  await page.locator('[data-lounge-home]').click();await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
  const openCourtSettings=async()=>{await f.locator('.arrival-menu summary').click();await f.locator('.arrival-menu').getByRole('button',{name:'音・演出',exact:true}).click();await f.locator('#settings[open]').waitFor();};
  await openCourtSettings();await closeSettings(ctx);
  check(result,'normal settings close restores the visible court menu summary',await f.locator('.arrival-menu summary').evaluate(node=>node===document.activeElement));
  await openCourtSettings();await f.locator('#settings .setting-line:has(#reduce-setting)').click();
  check(result,'changing motion setting leaves focus inside the open original modal',await f.locator('#settings').evaluate(node=>node.open&&node.contains(document.activeElement)));
  const reduced=await snapshot(frame);check(result,'real reduce control immediately returns to the proven castle and stops 3D',!reduced.active&&reduced.renderer.active===false&&!reduced.renderer.pendingFrame,reduced.renderer);
  await capture(ctx,'settings-reduced');await closeSettings(ctx);
  check(result,'settings close after fallback restores a visible original settings control',await f.locator('.castle-experience-settings').evaluate(node=>node===document.activeElement)&&await f.locator('.castle-experience-settings').isVisible());
  await capture(ctx,'reduced-fallback');await f.locator('.castle-quick-open[data-room=insurance]').click();await reader(ctx,'insurance');await back(ctx);
  await f.locator('.castle-experience-settings').click();await f.locator('#settings .setting-line:has(#reduce-setting)').click();await closeSettings(ctx);
  await f.locator('.arrival-launch').click();await f.locator('.arrival-court[data-state=ready]').waitFor();await settled(frame);
  check(result,'explicit opt-in restores the same live renderer after reduced motion ends',(await snapshot(frame)).active===true);
  if(width===390){await page.emulateMedia({reducedMotion:'reduce'});await f.locator('.spatial-castle').waitFor({state:'visible'});check(result,'OS reduced-motion changes also stop the optional renderer',!(await snapshot(frame)).renderer.active);await page.emulateMedia({reducedMotion:'no-preference'});await f.locator('.arrival-launch').click();await settled(frame);}
  // SwiftShader may lack this optional asynchronous-compile extension; the
  // actual first-frame gate still proves synchronous compilation succeeded.
  // No shader errors, removed/deprecated features, or other Three warnings pass.
  const allowedCapabilityNotice='THREE.WebGLRenderer: KHR_parallel_shader_compile extension not supported.';
  const threeWarnings=(result.console||[]).filter(message=>message.startsWith('THREE.'));
  check(result,'normal rendering has no unexpected Three shader or deprecation diagnostics',threeWarnings.every(message=>message===allowedCapabilityNotice),threeWarnings);
  await unchanged(ctx);console.log(`PASS ${result.label}: ${result.checks.length} checks, ${result.frames.length} screenshots.`);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function fallbackCase(browser,origin,fault){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-'+fault,fault});const {frame,f,result}=ctx;
  if(fault==='context-loss'){
   await f.locator('.arrival-court[data-state=ready]').waitFor({timeout:30_000});await settled(frame);await capture(ctx,'before-loss');
   const extension=await f.locator('.arrival-court canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;window.__courtLostContext=gl;ext.loseContext();return true;});
   check(result,'real WEBGL_lose_context extension is available and invoked',extension);
   await frame.waitForFunction(()=>window.__courtLostContext.isContextLost());
  }
  if(fault==='entry-module')await f.locator('[data-arrival-entry][data-arrival-entry-state=unavailable]').waitFor();
  else await frame.waitForFunction(()=>document.querySelector('.arrival-court')?.dataset.state==='fallback',null,{timeout:30_000});
  if(fault==='no-webgl')check(result,'WebGL-disabled browser really cannot create a WebGL2 context',await frame.evaluate(()=>document.createElement('canvas').getContext('webgl2')===null));
  await f.locator('.spatial-castle').waitFor({state:'visible',timeout:30_000});
  check(result,'fallback has live original court-independent navigation',await f.locator('.castle-quick-open[data-room=insurance]').isVisible());
  await capture(ctx,'fallback');
  await f.locator('.castle-quick-open[data-room=insurance]').click();await reader(ctx,'insurance');await capture(ctx,'reader');await back(ctx);
  await f.locator('.castle-quick-open[data-room=sourcing]').click();await ctx.page.locator('#mainWindow[data-cc-view=sourcing]').waitFor();
  check(result,'fallback still reaches native sourcing',await ctx.page.locator('#ccCastleFrame').isHidden());
  if(['model','module','invalid-model','entry-module'].includes(fault))check(result,'requested optional resource failure was actually exercised',result.expectedFaults.length>0,result.expectedFaults);
  await unchanged(ctx);console.log(`PASS ${result.label}: ${result.checks.length} fallback checks.`);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function lazyCancellationCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-lazy-cancel',autoActivate:false,deferModel:true});
  const requested=ctx.page.waitForRequest(request=>new URL(request.url()).pathname.endsWith('/arrival-court-v1.glb'),{timeout:30_000});
  await ctx.f.locator('[data-arrival-entry]').click();await requested;
  check(ctx.result,'pending 3D load leaves the original castle controls accessible',await ctx.f.locator('.castle-quick-open[data-room=insurance]').isVisible()&&await ctx.f.locator('.spatial-castle').evaluate(node=>!node.inert&&node.getAttribute('aria-hidden')!=='true'));
  await capture(ctx,'loading-original');await ctx.f.locator('.castle-quick-open[data-room=insurance]').click();await reader(ctx,'insurance');
  const focused=await ctx.frame.evaluate(()=>document.activeElement?.id);ctx.releaseModel();
  await ctx.frame.waitForFunction(()=>window.__arrivalCourt?.snapshot().ready===true);await ctx.f.locator('[data-arrival-entry][data-arrival-entry-state=ready]').waitFor({state:'attached'});
  const late=await snapshot(ctx.frame);
  check(ctx.result,'late module replays the owner selection without reopening the castle over its reader',!late.active&&late.selected==='insurance'&&late.renderer.selected==='insurance'&&late.renderer.active===false&&await ctx.f.locator('#room[data-account=insurance]').isVisible()&&await ctx.frame.evaluate(id=>document.activeElement?.id===id,focused),late);
  await capture(ctx,'late-ready-reader');await back(ctx);await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
  check(ctx.result,'Back after canceled preparation retains the original castle until another explicit tap',!(await snapshot(ctx.frame)).active&&await ctx.f.locator('[data-arrival-entry]').isEnabled());await capture(ctx,'canceled-return');
  await ctx.f.locator('[data-arrival-entry]').click();await ctx.frame.waitForFunction(()=>window.__arrivalCourt?.snapshot().active===true);await settled(ctx.frame);
  const reentered=await snapshot(ctx.frame),camera=reentered.renderer.camera,near=(a,b)=>a?.length===3&&a.every((value,index)=>Math.abs(value-b[index])<.0001);
  check(ctx.result,'a fresh explicit tap enters the matching authored insurance camera, not a mislabeled overview',reentered.active===true&&reentered.selected==='insurance'&&reentered.renderer.selected==='insurance'&&near(camera.position,authoredCourt.anchors['approach-insurance'])&&near(camera.target,authoredCourt.anchors['focus-insurance'])&&camera.fov===40,reentered);await capture(ctx,'explicit-reentry');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{ctx?.releaseModel();await ctx?.context.close();}
}

async function initialReducedCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-initial-reduced',autoActivate:false,reducedMotion:'reduce'});
  const entry=ctx.f.locator('[data-arrival-entry]');
  check(ctx.result,'initial reduced motion keeps a visible explained disabled entry without loading graphics',await entry.isDisabled()&&!!await entry.getAttribute('title')&&ctx.result.heavyRequests.length===0,[...ctx.result.heavyRequests]);
  await ctx.f.locator('.castle-quick-open[data-room=insurance]').click();await reader(ctx,'insurance');await back(ctx);
  check(ctx.result,'default reduced-motion reader use still loads no optional renderer',ctx.result.heavyRequests.length===0,[...ctx.result.heavyRequests]);
  await ctx.page.emulateMedia({reducedMotion:'no-preference'});await entry.waitFor();
  check(ctx.result,'ending OS reduce does not override the established app motion preference',await ctx.f.locator('#reduce-setting').isChecked()&&await entry.isDisabled()&&ctx.result.heavyRequests.length===0);
  await ctx.f.locator('.castle-experience-settings').click();await ctx.f.locator('#settings .setting-line:has(#reduce-setting)').click();await closeSettings(ctx);
  await ctx.frame.waitForFunction(()=>!document.querySelector('[data-arrival-entry]').disabled);
  check(ctx.result,'explicitly ending the app reduce preference enables entry without automatically importing graphics',ctx.result.heavyRequests.length===0&&await ctx.frame.evaluate(()=>!window.__arrivalCourt));
  await entry.click();await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
  check(ctx.result,'explicit tap after preference change reaches real 3D',(await snapshot(ctx.frame)).active===true);await capture(ctx,'explicit-after-reduce');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

// Real application passage acceptance. The only timeline controls are native
// WAAPI pause/currentTime/finish on the ordinary parent animation. There is no
// production seek, readback or fake renderer hook.
async function prepareInsurancePassage(ctx){
 await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
 const native=(await snapshot(ctx.frame)).renderer.nativePortals;
 check(ctx.result,'insurance has a validated native portal before optional passage installation',native?.find(portal=>portal.key==='insurance')?.available===true,native);
 await ctx.frame.waitForFunction(()=>window.__arrivalCourt?.snapshot().passage?.available===true,null,{timeout:30_000});
 const target=ctx.f.locator('[data-court-room=insurance]');
 if(await target.isVisible()){await target.click();await settled(ctx.frame);}
 else{await ctx.f.locator('[data-court-open=insurance]').click();await ctx.f.locator('#room[data-account=insurance][data-spatial-desk=ready]').waitFor();await back(ctx);await settled(ctx.frame);}
 await ctx.page.evaluate(()=>{
  const source=document.getElementById('ccCastleFrame').contentDocument,canvas=source.querySelector('.arrival-court canvas');
  window.__passageOriginal={canvas,gl:canvas.getContext('webgl2'),parent:canvas.parentNode,next:canvas.nextSibling,style:canvas.getAttribute('style')};
 });
}
async function beginInsurancePassage(ctx){
 await ctx.f.locator('.arrival-enter').click();
 await ctx.page.waitForFunction(()=>document.getAnimations().some(animation=>animation.id==='court-passage-clock'),null,{timeout:10_000});
}
async function samplePassage(ctx,progress,{seal=false}={}){
 return ctx.page.evaluate(async({progress,seal})=>{
  const animation=document.getAnimations().find(value=>value.id==='court-passage-clock');if(!animation)throw Error('No real passage animation to sample');
  animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*progress;
  // The compositor registered its RAF before the test. Read immediately after
  // its second paint, before the browser may clear a non-preserved GL buffer.
  return new Promise((resolve,reject)=>requestAnimationFrame(()=>requestAnimationFrame(()=>{try{
   const layer=document.querySelector('.court-passage'),canvas=layer?.querySelector('canvas'),original=window.__passageOriginal;
   const frame=document.getElementById('ccCastleFrame'),source=frame.contentDocument,state=frame.contentWindow.__arrivalCourt.snapshot(),gl=canvas?.getContext('webgl2');
   let pixels=null;
   if(seal&&gl){const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);let nonOpaque=0,minAlpha=255,maxAlpha=0;for(let i=3;i<rgba.length;i+=4){const alpha=rgba[i];if(alpha<255)nonOpaque++;minAlpha=Math.min(minAlpha,alpha);maxAlpha=Math.max(maxAlpha,alpha);}pixels={width,height,total:width*height,nonOpaque,minAlpha,maxAlpha,error:gl.getError()};}
   const r=layer?.getBoundingClientRect(),fr=frame.getBoundingClientRect(),copy=source.getElementById('desk-copy'),cr=copy?.getBoundingClientRect();
   resolve({progress,direction:layer?.dataset.direction,phase:layer?.dataset.phase,sameCanvas:canvas===original.canvas,sameContext:gl===original.gl,canvasCount:layer?.querySelectorAll('canvas').length,ownerParent:canvas?.ownerDocument===document,contextLost:gl?.isContextLost(),inert:layer?.inert,ariaHidden:layer?.getAttribute('aria-hidden'),pointerEvents:layer&&getComputedStyle(layer).pointerEvents,layerRect:r&&{left:r.left,top:r.top,width:r.width,height:r.height},frameRect:{left:fr.left,top:fr.top,width:fr.width,height:fr.height},room:source.getElementById('room')?.dataset.account,roomHidden:source.getElementById('room')?.hidden,copyReachable:copy&&!copy.disabled&&cr.width>=44&&cr.height>=44,renderer:state.renderer,passage:state.passage,pixels});
  }catch(error){reject(error);}})));
 },{progress,seal});
}
async function finishPassage(ctx){
 await ctx.page.evaluate(()=>{const animation=document.getAnimations().find(value=>value.id==='court-passage-clock');if(!animation)throw Error('Passage clock disappeared before native finish');animation.finish();});
 await ctx.page.locator('.court-passage').waitFor({state:'detached'});
}
async function restoredPassage(ctx,label){
 const state=await ctx.page.evaluate(()=>{const o=window.__passageOriginal,frame=document.getElementById('ccCastleFrame'),r=frame.contentWindow.__arrivalCourt.snapshot();return {sameNode:o.canvas.parentNode===o.parent,sameNext:o.canvas.nextSibling===o.next,sameStyle:o.canvas.getAttribute('style')===o.style,sameContext:o.canvas.getContext('webgl2')===o.gl,ownerChild:o.canvas.ownerDocument===frame.contentDocument,layerCount:document.querySelectorAll('.court-passage').length,clockCount:document.getAnimations().filter(a=>a.id==='court-passage-clock').length,presentationActive:r.renderer?.presentation?.active,passageActive:r.passage?.active,selected:r.selected};});
 check(ctx.result,label+' returns the only canvas exactly without a clock or layer lease',state.sameNode&&state.sameNext&&state.sameStyle&&state.sameContext&&state.ownerChild&&state.layerCount===0&&state.clockCount===0&&!state.presentationActive&&!state.passageActive,state);
}
async function passageCase(browser,origin,width,height){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{width,height,label:`${width}-${height}-passage`});await prepareInsurancePassage(ctx);await capture(ctx,'source');await beginInsurancePassage(ctx);
  const frames=[0,.2,.4,.479,.481,.65,.84];
  for(const progress of frames){
   const state=await samplePassage(ctx,progress,{seal:progress===.481});
   check(ctx.result,'entry '+progress+' uses the same real context in the nonblocking parent surface',state.sameCanvas&&state.sameContext&&state.canvasCount===1&&state.ownerParent&&!state.contextLost&&state.inert&&state.ariaHidden==='true'&&state.pointerEvents==='none'&&state.direction==='in'&&Math.abs(state.renderer.passage.u-progress)<.0001&&Math.abs(state.layerRect.top-state.frameRect.top)<.5&&Math.abs(state.layerRect.height-state.frameRect.height)<.5,state);
   check(ctx.result,'entry '+progress+' has already committed the real insurance reader and usable copy control',state.room==='insurance'&&!state.roomHidden&&state.copyReachable,{room:state.room,roomHidden:state.roomHidden,copyReachable:state.copyReachable});
   if(progress===.481)check(ctx.result,'closed native portal seals every drawing-buffer pixel without an opaque sky or CSS substitute',state.renderer.transparentBackground===true&&state.renderer.clearAlpha===0&&state.renderer.mainLayerMask===2&&state.renderer.shadowLayerMask===3&&state.renderer.passage.hinges.length===2&&state.renderer.passage.hinges.map(h=>h.node).sort().join(',')==='hinge-insurance-left,hinge-insurance-right'&&state.renderer.passage.hinges.every(h=>h.angle<.00001)&&state.pixels.total>0&&state.pixels.nonOpaque===0&&state.pixels.minAlpha===255&&state.pixels.error===0,state);
   await capture(ctx,'entry-'+String(progress).replace('.',''));
  }
  await finishPassage(ctx);await restoredPassage(ctx,'completed entry');await reader(ctx,'insurance');await capture(ctx,'entry-end');
  await back(ctx);await ctx.page.waitForFunction(()=>document.getAnimations().some(a=>a.id==='court-passage-clock'),null,{timeout:10_000});
  for(const progress of [0,.2,.5]){const state=await samplePassage(ctx,progress);check(ctx.result,'reverse '+progress+' follows the same native doorway with the canonical court already restored',state.sameCanvas&&state.sameContext&&!state.contextLost&&state.direction==='out'&&Math.abs(state.renderer.passage.u-(1-progress))<.0001&&state.passage.active===true,state);await capture(ctx,'return-'+String(progress).replace('.',''));}
  await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,'completed reverse');
  const returned=await snapshot(ctx.frame);check(ctx.result,'reverse ends on the actual insurance aperture and original source control',returned.selected==='insurance'&&returned.renderer.selected==='insurance'&&returned.projection.find(point=>point.key==='insurance')?.visible===true&&await ctx.f.locator('.arrival-enter').evaluate(node=>node===document.activeElement),returned);await capture(ctx,'return-end');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function interruptedPassageCase(browser,origin,kind){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-passage-'+kind});await prepareInsurancePassage(ctx);await beginInsurancePassage(ctx);await samplePassage(ctx,.2);
  if(['escape','early-back','reduce'].includes(kind)){
   await ctx.page.evaluate(()=>{window.__testPassageStarts=[];document.addEventListener('court:passage-start',event=>window.__testPassageStarts.push(event.detail));});
   if(kind==='escape')await ctx.f.locator('#desk-copy').press('Escape');
   else if(kind==='reduce')await ctx.page.emulateMedia({reducedMotion:'reduce'});
   else await back(ctx);
   await ctx.page.locator('.court-passage').waitFor({state:'detached'});await restoredPassage(ctx,kind+' interruption');
   if(kind!=='early-back'){
    check(ctx.result,kind+' cancels graphics without leaving the current insurance reader',await ctx.f.locator('#room[data-account=insurance]').isVisible());
    await reader(ctx,'insurance');await back(ctx);
   }
   if(kind==='reduce'){
    await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
    const state=await snapshot(ctx.frame);check(ctx.result,'OS reduced motion during the loan leaves a quiet original castle after Back',!state.active&&!state.renderer.pendingFrame&&!state.renderer.presentation.active&&await ctx.f.locator('.castle-quick-open[data-room=insurance]').isVisible(),state);
   }else await settled(ctx.frame);
   const starts=await ctx.page.evaluate(()=>window.__testPassageStarts);
   check(ctx.result,'an interrupted arrival never invents a completed-room reverse journey',starts.length===0&&await ctx.page.locator('.court-passage').count()===0,starts);
  }else if(kind==='copy'){
   await reader(ctx,'insurance');await ctx.page.locator('.court-passage').waitFor({state:'detached'});await restoredPassage(ctx,'copy interruption');
   check(ctx.result,'copy during travel remains an actual copy, not a route or publication',await ctx.f.locator('#room[data-account=insurance]').isVisible());
  }else if(kind==='quick'){
   await ctx.f.locator('.spatial-room-name').click();await ctx.f.locator('.spatial-destination[data-destination=otoku]').click();await reader(ctx,'otoku');await ctx.page.locator('.court-passage').waitFor({state:'detached'});await restoredPassage(ctx,'latest room interruption');await back(ctx);await settled(ctx.frame);
   check(ctx.result,'new quick destination and Back are never overwritten by the old passage',(await snapshot(ctx.frame)).selected==='otoku'&&await ctx.page.locator('.court-passage').count()===0);
  }else if(kind==='resize'){
   await ctx.page.setViewportSize({width:800,height:648});await ctx.page.locator('.court-passage').waitFor({state:'detached'});await restoredPassage(ctx,'Fold resize');await reader(ctx,'insurance');await back(ctx);await settled(ctx.frame);
   check(ctx.result,'resizing cancels only visual history, never stretches the old return trip',await ctx.page.locator('.court-passage').count()===0&&(await snapshot(ctx.frame)).selected==='insurance');
  }else if(kind==='context-loss'){
   const invoked=await ctx.page.evaluate(()=>{const ext=window.__passageOriginal.gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});check(ctx.result,'actual adopted context loss is exercised',invoked);
   await ctx.page.locator('.court-passage').waitFor({state:'detached'});await ctx.frame.waitForFunction(()=>window.__arrivalCourt.snapshot().failed);await reader(ctx,'insurance');await restoredPassage(ctx,'context failure');await back(ctx);await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
   check(ctx.result,'failed borrowed graphics leave the existing reader and original castle functional',await ctx.f.locator('.castle-quick-open[data-room=insurance]').isVisible());
  }
  await capture(ctx,'settled');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function optionalPassageFailure(browser,origin,fault){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-'+fault,fault});await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
  const deadline=Date.now()+10_000;while(!ctx.result.expectedFaults.length&&Date.now()<deadline)await ctx.page.waitForTimeout(50);
  check(ctx.result,'optional passage dependency failure was actually requested',ctx.result.expectedFaults.length>0,[...ctx.result.expectedFaults]);
  check(ctx.result,'passage failure does not retire the real courtyard renderer',(await snapshot(ctx.frame)).active===true&&(await snapshot(ctx.frame)).failed===false);
  await ctx.f.locator('[data-court-open=insurance]').click();await reader(ctx,'insurance');await back(ctx);await settled(ctx.frame);
  check(ctx.result,'optional passage failure preserves direct reader and matching 3D return',(await snapshot(ctx.frame)).selected==='insurance'&&await ctx.page.locator('.court-passage').count()===0);
  await ctx.f.locator('.arrival-enter').click();await reader(ctx,'insurance');await back(ctx);await settled(ctx.frame);
  check(ctx.result,'ordinary doorway also falls through to its real reader when passage is unavailable',(await snapshot(ctx.frame)).selected==='insurance'&&await ctx.page.locator('.court-passage').count()===0);await capture(ctx,'retained-court');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function shadowDiagnostic(browser,origin,width,height){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{width,height,label:`${width}-${height}-shadow-off`,shadowOff:true});
  await ctx.f.locator('.arrival-court[data-state=ready]').waitFor({timeout:30_000});await settled(ctx.frame);
  const value=await snapshot(ctx.frame);
  check(ctx.result,'diagnostic-only fresh context really rendered geometry with shadows disabled',value.renderer.webgl2===true&&value.renderer.frameCount>0&&value.renderer.shadowEnabled===false,value.renderer);
  check(ctx.result,'diagnostic source substitution was exact and isolated',ctx.result.sourceSubstitutions.length===1,ctx.result.sourceSubstitutions);
  await capture(ctx,'arrival');
  if(width===1440){
   await ctx.f.locator('[data-court-open=insurance]').click();await ctx.f.locator('#room[data-account=insurance][data-spatial-desk=ready]').waitFor();await back(ctx);await settled(ctx.frame);
   check(ctx.result,'shadow diagnostic uses the actual insurance approach', (await snapshot(ctx.frame)).renderer.selected==='insurance');
   await capture(ctx,'insurance-focus');
  }
  await unchanged(ctx);console.log(`PASS ${ctx.result.label}: isolated shadow diagnostic, not the normal exact-head rendering gate.`);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser,disabled;
 try{
  // Documented opt-in is confined to this trusted local fixture. Never reused
  // for browsing an external site or changing the connected user's browser.
  browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']});
  environment.browserVersion=browser.version();
  try{const session=await browser.newBrowserCDPSession();try{environment.gpu=(await session.send('SystemInfo.getInfo')).gpu;}finally{await session.detach();}}catch(error){environment.gpuDiagnosticError=String(error.message);}
  console.log('COURT_BROWSER '+JSON.stringify(environment));
  for(const [width,height] of [[390,900],[320,640],[800,648],[1440,900]])await normalCase(browser,origin,width,height);
  for(const fault of ['model','invalid-model','module','entry-module','context-loss'])await fallbackCase(browser,origin,fault);
  disabled=await chromium.launch({channel:'chromium',headless:true,args:['--disable-webgl']});await fallbackCase(disabled,origin,'no-webgl');
  await lazyCancellationCase(browser,origin);await initialReducedCase(browser,origin);
  for(const [width,height] of [[390,900],[320,640],[800,648],[1440,900]])await passageCase(browser,origin,width,height);
  for(const kind of ['copy','quick','resize','context-loss','escape','early-back','reduce'])await interruptedPassageCase(browser,origin,kind);
  for(const fault of ['passage-module','passage-css'])await optionalPassageFailure(browser,origin,fault);
  // Diagnostic-only A/B. The normal four widths and all fault cases above use
  // unchanged exact-head source. No production flag, API, or asset is added.
  await shadowDiagnostic(browser,origin,1440,900);await shadowDiagnostic(browser,origin,390,900);
 }finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment,results,failures},null,2));
  await disabled?.close();await browser?.close();server.close();
 }
 assert.equal(failures,0,`${failures} court fixture case(s) failed; screenshots and exact diagnostics retained`);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
