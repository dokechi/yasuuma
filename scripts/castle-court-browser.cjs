/* Owned synthetic CI only. No production credentials, posts, or remote traffic.
 * Real app-v130 -> default storybook -> visible Settings/archive -> explicit lazy court entry.
 * Only synthetic records are injected; the host/iframe route is not substituted.
 * Software GL verifies rendering and lifecycle, NOT a physical phone FPS claim.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const {openStorybookArchive}=require('./storybook-archive-entry.cjs');
const root=path.resolve(__dirname,'..'),mode=process.env.COURT_MODE||'all';
const widths=[[390,900],[320,640],[800,648],[1440,900]],nativeWidth=Number(process.env.COURT_WIDTH),nativeHeight=Number(process.env.COURT_HEIGHT);
assert.ok(['all','baseline','native'].includes(mode),'explicit supported court fixture mode');
if(mode==='native')assert.ok(widths.some(([w,h])=>w===nativeWidth&&h===nativeHeight),'native matrix uses one of the four real host sizes');
const out=path.join(root,'artifacts',mode==='native'?`castle-court-native-${nativeWidth}-${nativeHeight}`:'castle-court');
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

const results=[],environment={mode,...(mode==='native'?{nativeViewport:{width:nativeWidth,height:nativeHeight}}:{}),softwareGLRequested:true,physicalDeviceTested:false};let failures=0;
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
 let releaseModel,modelRequested,releaseNativeSnapshot;const modelGate=new Promise(resolve=>releaseModel=resolve),modelRequest=new Promise(resolve=>modelRequested=resolve),nativeSnapshotGate=new Promise(resolve=>releaseNativeSnapshot=resolve);
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
  if(['native-snapshot-abort','native-snapshot-stall'].includes(fault)&&url.pathname.endsWith('/court-native-snapshot.js')){result.expectedFaults.push(url.pathname);if(fault==='native-snapshot-stall')await nativeSnapshotGate;return route.abort();}
  if((fault==='passage-module'&&url.pathname.endsWith('/arrival-passage.js'))||(fault==='passage-css'&&url.pathname.endsWith('/court-passage.css'))){result.expectedFaults.push(url.pathname);return route.abort();}
  return route.continue();
 });
 const ctx={context,page,result,frame:null,f:null,releaseModel,modelRequest,releaseNativeSnapshot};
 try{
  const archive=await openStorybookArchive(page,origin,{check:(name,pass,detail)=>check(result,name,pass,detail)});
  ctx.frame=archive.frame;ctx.f=archive.f;
  await ctx.f.locator('.account-board').waitFor({state:'attached'});
  await ctx.frame.evaluate(async()=>{await document.fonts.ready;const script=document.querySelector('script[src^="app.js"]');if(script)window.__courtLiving=(await import(script.src)).getLivingDesk();});
  await ctx.frame.waitForFunction(()=>window.__courtLiving?.snapshot().complete===true);
  await ctx.f.locator('[data-arrival-entry]').waitFor();await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
  check(result,'explicit archive has no prototype route or eagerly loaded graphics',!new URL(ctx.frame.url()).searchParams.has('experience')&&result.heavyRequests.length===0&&await ctx.frame.evaluate(()=>!window.__arrivalCourt),[...result.heavyRequests]);
  const entry=await ctx.f.locator('[data-arrival-entry]').evaluate(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth};});
  check(result,'explicit archived castle exposes a bounded 44px optional 3D entry',entry.width>=44&&entry.height>=44&&entry.left>=-.5&&entry.right<=entry.viewport[0]+.5&&entry.bottom<=entry.viewport[1]+.5&&!entry.overflow,entry);
  await capture(ctx,'default-castle');
  if(autoActivate)await ctx.f.locator('[data-arrival-entry]').click();
  return ctx;
 }catch(error){releaseModel();releaseNativeSnapshot();await fail(ctx,error);await context.close();throw error;}
}
async function fail(ctx,error){
 failures++;ctx.result.failure=String(error.stack||error);
 if(ctx.frame)ctx.result.failureState=await snapshot(ctx.frame).catch(()=>null);
 ctx.result.hostTimeline=await ctx.page.evaluate(()=>({timeline:window.__testPassageTimeline,styles:window.__testCanvasStyleHistory,inputs:window.__testPassageInputStyles})).catch(()=>null);
 await capture(ctx,'failure').catch(()=>{});
 console.error(`FAIL ${ctx.result.label}: ${error.stack||error}`);
}
async function unchanged(ctx){
 const render=(await snapshot(ctx.frame).catch(()=>null))?.renderer;
 if(render?.frameCount>0)check(ctx.result,'actual cumulative main-plus-shadow peak draw calls remain bounded through every intermediate frame',Number.isInteger(render.peakDrawCalls)&&render.peakDrawCalls>0&&render.peakDrawCalls<=128,{peakDrawCalls:render.peakDrawCalls,finalDrawCalls:render.drawCalls,frameCount:render.frameCount});
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
async function destinationReady(ctx,key,{copy=true}={}){
 if(key==='sourcing'){
  await ctx.page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
  check(ctx.result,'native sourcing is the existing parent workspace, not a replacement reader',await ctx.page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing'&&await ctx.page.locator('#ccCastleFrame').isHidden()&&await ctx.page.locator('[data-lounge-home]').isVisible());
 }else if(copy)await reader(ctx,key);
 else await ctx.f.locator('#room[data-account='+key+'][data-spatial-desk=ready]').waitFor();
}
async function backFromRoom(ctx,key){if(key==='sourcing'){await ctx.page.locator('[data-lounge-home]').click();await ctx.f.locator('.account-board:not([hidden])').waitFor();}else await back(ctx);}
async function prepareRoomPassage(ctx,key='insurance'){
 await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
 const native=(await snapshot(ctx.frame)).renderer.nativePortals;
 check(ctx.result,key+' has a validated native portal before optional passage installation',native?.find(portal=>portal.key===key)?.available===true,native);
 await ctx.frame.waitForFunction(()=>window.__arrivalCourt?.snapshot().passage?.available===true,null,{timeout:30_000});
 const current=await snapshot(ctx.frame),target=ctx.f.locator('[data-court-room='+key+']');
 if(current.selected!==key||current.overview){
  if(await target.isVisible()){await target.click();await settled(ctx.frame);}
  else{await ctx.f.locator('[data-court-open='+key+']').click();await destinationReady(ctx,key,{copy:false});await backFromRoom(ctx,key);await settled(ctx.frame);}
 }
 await ctx.page.evaluate(()=>{
  const frame=document.getElementById('ccCastleFrame'),source=frame.contentDocument,canvas=source.querySelector('.arrival-court canvas'),r=frame.getBoundingClientRect();
  window.__passageOriginal={canvas,gl:canvas.getContext('webgl2'),parent:canvas.parentNode,next:canvas.nextSibling,style:canvas.getAttribute('style'),frameRect:{left:r.left,top:r.top,width:r.width,height:r.height}};
  window.__testCanvasStyleObserver?.disconnect();window.__testCanvasStyleHistory=[];window.__testPassageInputStyles=[];window.__testPassageTimeline=[];
  const keep=(list,value,limit=64)=>{list.push(value);if(list.length>limit)list.splice(0,list.length-limit);};
  window.__testCanvasStyleObserver=new MutationObserver(records=>{for(const record of records)keep(window.__testCanvasStyleHistory,{time:performance.now(),old:record.oldValue,current:canvas.getAttribute('style'),owner:canvas.ownerDocument===document?'parent':'child',phase:document.querySelector('.court-passage')?.dataset.phase||null});});window.__testCanvasStyleObserver.observe(canvas,{attributes:true,attributeFilter:['style'],attributeOldValue:true});
  if(!window.__testPassageTimelineInstalled){window.__testPassageTimelineInstalled=true;for(const type of ['cc:castle-native','cc:castle-home','court:passage-start','court:passage-end'])document.addEventListener(type,event=>keep(window.__testPassageTimeline,{time:performance.now(),type,action:event.detail?.action,room:event.detail?.room,direction:event.detail?.direction,cancelled:event.detail?.cancelled,frameHidden:frame.hidden,nativeView:document.getElementById('mainWindow')?.dataset.ccView,canvasStyle:window.__passageOriginal.canvas.getAttribute('style')}),true);}

 });
}
async function prepareInsurancePassage(ctx){return prepareRoomPassage(ctx,'insurance');}
async function armPassageClock(ctx){
 // Subscribe BEFORE the real input: software rendering can finish a 900ms trip
 // before Playwright's click promise returns. This is ordinary WAAPI tooling.
 await ctx.page.evaluate(()=>document.addEventListener('court:passage-start',()=>{const clock=document.getAnimations().find(a=>a.id==='court-passage-clock');if(clock){window.__testPassageStartedAt=performance.now();clock.pause();clock.currentTime=0;}},{once:true}));
}
async function beginNativePassage(ctx){
 const box=await ctx.f.locator('.arrival-enter').boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'real visible entrance has a measured tap target');
 ctx.beforePassageRenderer=(await snapshot(ctx.frame)).renderer;
 await ctx.page.evaluate(()=>{const records=window.__testPassageInputStyles;records.push({direction:'in',time:performance.now(),style:window.__passageOriginal.canvas.getAttribute('style')});if(records.length>40)records.shift();});
 await armPassageClock(ctx);const start=Date.now();await ctx.page.mouse.click(box.x+box.width/2,box.y+box.height/2);ctx.lastPassageClickMs=Date.now()-start;
 await ctx.page.waitForFunction(()=>document.getAnimations().some(animation=>animation.id==='court-passage-clock'),null,{timeout:10_000});
}
async function samplePassage(ctx,progress,{seal=false}={}){
 return ctx.page.evaluate(async({progress,seal})=>{
  const animation=document.getAnimations().find(value=>value.id==='court-passage-clock');if(!animation)throw Error('No real passage animation to sample');
  animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*progress;
  // The compositor already queued its tick before this callback. Read in the
  // SAME first RAF as the changed-progress paint: a later RAF may see a cleared
  // non-preserved backbuffer after identical paused-progress draws are skipped.
  return new Promise((resolve,reject)=>requestAnimationFrame(()=>{try{
   const layer=document.querySelector('.court-passage'),canvas=layer?.querySelector('canvas'),original=window.__passageOriginal;
   const frame=document.getElementById('ccCastleFrame'),source=frame.contentDocument,state=frame.contentWindow.__arrivalCourt.snapshot(),gl=canvas?.getContext('webgl2');
   let pixels=null;
   if(seal&&gl){const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);let nonOpaque=0,minAlpha=255,maxAlpha=0;for(let i=3;i<rgba.length;i+=4){const alpha=rgba[i];if(alpha<255)nonOpaque++;minAlpha=Math.min(minAlpha,alpha);maxAlpha=Math.max(maxAlpha,alpha);}pixels={width,height,total:width*height,nonOpaque,minAlpha,maxAlpha,error:gl.getError()};}
   const r=layer?.getBoundingClientRect(),fr=frame.getBoundingClientRect(),copy=source.getElementById('desk-copy'),cr=copy?.getBoundingClientRect();
   resolve({progress,elapsedMs:performance.now()-window.__testPassageStartedAt,clockTime:animation.currentTime,duration:Number(animation.effect.getTiming().duration),direction:layer?.dataset.direction,phase:layer?.dataset.phase,sameCanvas:canvas===original.canvas,sameContext:gl===original.gl,canvasCount:layer?.querySelectorAll('canvas').length,ownerParent:canvas?.ownerDocument===document,contextLost:gl?.isContextLost(),inert:layer?.inert,ariaHidden:layer?.getAttribute('aria-hidden'),pointerEvents:layer&&getComputedStyle(layer).pointerEvents,layerRect:r&&{left:r.left,top:r.top,width:r.width,height:r.height},frameRect:original.frameRect,currentFrameRect:{left:fr.left,top:fr.top,width:fr.width,height:fr.height},frameHidden:frame.hidden,nativeView:document.getElementById('mainWindow')?.dataset.ccView,nativeBackReachable:(()=>{const node=document.querySelector('[data-lounge-home]'),r=node?.getBoundingClientRect();return !!node&&!node.disabled&&r.width>=44&&r.height>=44;})(),room:source.getElementById('room')?.dataset.account,roomHidden:source.getElementById('room')?.hidden,copyReachable:copy&&!copy.disabled&&cr.width>=44&&cr.height>=44,renderer:state.renderer,passage:state.passage,pixels});
  }catch(error){reject(error);}}));
 },{progress,seal});
}
async function finishPassage(ctx){
 await ctx.page.evaluate(()=>{const animation=document.getAnimations().find(value=>value.id==='court-passage-clock');if(!animation)throw Error('Passage clock disappeared before native finish');animation.finish();});
 await ctx.page.locator('.court-passage').waitFor({state:'detached'});
}
async function restoredPassage(ctx,label){
 const state=await ctx.page.evaluate(()=>{const o=window.__passageOriginal,frame=document.getElementById('ccCastleFrame'),r=frame.contentWindow.__arrivalCourt.snapshot();return {sameNode:o.canvas.parentNode===o.parent,sameNext:o.canvas.nextSibling===o.next,sameStyle:o.canvas.getAttribute('style')===o.style,originalStyle:o.style,restoredStyle:o.canvas.getAttribute('style'),perTripStyles:window.__testPassageInputStyles?.slice(-4),styleHistory:window.__testCanvasStyleHistory?.slice(-20),timeline:window.__testPassageTimeline?.slice(-12),sameContext:o.canvas.getContext('webgl2')===o.gl,ownerChild:o.canvas.ownerDocument===frame.contentDocument,layerCount:document.querySelectorAll('.court-passage').length,clockCount:document.getAnimations().filter(a=>a.id==='court-passage-clock').length,presentationActive:r.renderer?.presentation?.active,passageActive:r.passage?.active,selected:r.selected};});
 check(ctx.result,label+' returns the only canvas exactly without a clock or layer lease',state.sameNode&&state.sameNext&&state.sameStyle&&state.sameContext&&state.ownerChild&&state.layerCount===0&&state.clockCount===0&&!state.presentationActive&&!state.passageActive,state);
}
async function capturePassage(ctx,name,progress){
 // Direct owned CDP capture avoids Playwright screenshot preparation consuming
 // a short real lease. This still captures actual compositor pixels, not a DOM
 // reconstruction or a renderer readback hook.
 ctx.captureSession??=await ctx.context.newCDPSession(ctx.page);
 const start=Date.now(),file=`${ctx.result.label}-${name}.png`;
 const {data}=await ctx.captureSession.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true});
 fs.writeFileSync(path.join(out,file),Buffer.from(data,'base64'));ctx.result.frames.push(file);
 const after=await ctx.page.evaluate(()=>{const clock=document.getAnimations().find(a=>a.id==='court-passage-clock'),state=document.getElementById('ccCastleFrame').contentWindow.__arrivalCourt.snapshot();return {clock:!!clock,paused:clock?.playState==='paused',active:state.passage.active,u:state.renderer.passage?.u,elapsedMs:performance.now()-window.__testPassageStartedAt};});
 const expected=name.startsWith('return-')?1-progress:progress;
 check(ctx.result,name+' screenshot remained inside its real paused lease (no watchdog-expired frame)',after.clock&&after.paused&&after.active&&Math.abs(after.u-expected)<.0001,{...after,captureMs:Date.now()-start,clickMs:ctx.lastPassageClickMs});
}
async function armNativeCloneComparison(ctx){
 await ctx.page.evaluate(()=>{
  const properties=('background-color background-image color opacity border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-radius font-family font-size font-weight font-style line-height letter-spacing white-space display box-sizing width height min-width max-width min-height max-height flex-basis flex-grow flex-shrink flex-wrap gap row-gap column-gap padding-top padding-right padding-bottom padding-left margin-top margin-right margin-bottom margin-left').split(' ');
  const measure=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);let opacity=1;for(let n=node;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);return {rect:{left:r.left,top:r.top,width:r.width,height:r.height},style:Object.fromEntries(properties.map(p=>[p,s.getPropertyValue(p)])),effectiveOpacity:opacity,hover:node.matches(':hover')};};
  window.__testNativeCloneMeasure=measure;window.__testNativeCloneSource=null;
  document.addEventListener('cc:castle-home',()=>{
   const surface=window.__passageOriginal.frameRect;
   const records=[...document.querySelectorAll('#sourcingTabs button[data-sourcing-sub]')].filter(node=>{const r=node.getBoundingClientRect();return r.width&&r.height&&r.right>surface.left&&r.bottom>surface.top&&r.left<surface.left+surface.width&&r.top<surface.top+surface.height;}).map(node=>({key:node.dataset.sourcingSub,text:node.textContent.replace(/\s+/g,' ').trim(),button:measure(node),group:measure(node.parentElement)}));
   window.__testNativeCloneSource={surface:{...surface},nativeView:document.getElementById('mainWindow').dataset.ccView,frameHidden:document.getElementById('ccCastleFrame').hidden,records};
  },{once:true,capture:true});
 });
}
async function compareNativeClone(ctx){
 return ctx.page.evaluate(()=>{
  const source=window.__testNativeCloneSource,host=document.querySelector('.court-passage-foreground'),measure=window.__testNativeCloneMeasure;
  if(!source||!host)return {pass:false,reason:'same-event source or actual attached clone missing',source:!!source,clone:!!host};
  const rectDelta=(a,b)=>Math.max(...['left','top','width','height'].map(k=>Math.abs(a[k]-b[k])));
  const records=source.records.map(original=>{
   const matches=[...host.querySelectorAll('button')].filter(node=>node.textContent.replace(/\s+/g,' ').trim()===original.text);
   if(matches.length!==1)return {...original,pass:false,reason:'unique visible button clone required',matches:matches.length};
   const button=measure(matches[0]),group=measure(matches[0].parentElement),diffs=[];
   for(const kind of ['button','group'])for(const [prop,value]of Object.entries(original[kind].style))if(({button,group})[kind].style[prop]!==value)diffs.push({kind,prop,source:value,clone:({button,group})[kind].style[prop]});
   const buttonDelta=rectDelta(original.button.rect,button.rect),groupDelta=rectDelta(original.group.rect,group.rect),opacityDelta=Math.max(Math.abs(original.button.effectiveOpacity-button.effectiveOpacity),Math.abs(original.group.effectiveOpacity-group.effectiveOpacity));
   return {...original,clone:{button,group},buttonDelta,groupDelta,opacityDelta,diffs,pass:diffs.length===0&&buttonDelta<=.1&&groupDelta<=.1&&opacityDelta<.000001};
  });
  const required=innerWidth===800?['hold','purchases','discoveries','suppliers']:['hold','purchases'];
  return {pass:source.nativeView==='sourcing'&&source.frameHidden&&required.every(key=>records.some(r=>r.key===key))&&records.length>0&&records.every(r=>r.pass),source:{surface:source.surface,nativeView:source.nativeView,frameHidden:source.frameHidden},required,records};
 });
}
async function backWithPausedClock(ctx,key='insurance'){
 await ctx.page.evaluate(()=>{const records=window.__testPassageInputStyles;records.push({direction:'out',time:performance.now(),style:window.__passageOriginal.canvas.getAttribute('style')});if(records.length>40)records.shift();});
 await armPassageClock(ctx);await backFromRoom(ctx,key);
 await ctx.page.waitForFunction(()=>document.getAnimations().some(a=>a.id==='court-passage-clock'),null,{timeout:10_000});
}
async function insurancePassageCase(browser,origin,width,height){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{width,height,label:`${width}-${height}-passage`});await prepareInsurancePassage(ctx);await capture(ctx,'source');
  const sourceCamera=(await snapshot(ctx.frame)).renderer.camera;
  const assertSource=async label=>{const current=await snapshot(ctx.frame),pose=current.renderer.camera;check(ctx.result,label+' starts at the identical selected insurance pose',current.selected==='insurance'&&current.renderer.selected==='insurance'&&['position','target'].every(key=>pose[key].every((value,index)=>Math.abs(value-sourceCamera[key][index])<.000001))&&Math.abs(pose.fov-sourceCamera.fov)<.000001,{source:sourceCamera,current:pose});};
  // ONE screenshot per genuine UI trip. Preserve the production watchdog;
  // slow software-GPU readback must never extend a lease or invent a seek API.
  for(const progress of [0,.2,.4,.479,.481,.65,.84]){
   await assertSource('entry '+progress);await beginNativePassage(ctx);
   const state=await samplePassage(ctx,progress,{seal:progress===.481});
   const before=ctx.beforePassageRenderer;check(ctx.result,'entry '+progress+' reuses only the already-painted normal source frame',before.lastPaintMode==='normal'&&before.normalPaintSerial===before.frameCount&&state.renderer.reusedEntryFrames===before.reusedEntryFrames+1&&state.renderer.frameCount===before.frameCount+(progress===0?0:1),{before:{frameCount:before.frameCount,normalPaintSerial:before.normalPaintSerial,lastPaintMode:before.lastPaintMode,reused:before.reusedEntryFrames},after:{frameCount:state.renderer.frameCount,normalPaintSerial:state.renderer.normalPaintSerial,lastPaintMode:state.renderer.lastPaintMode,reused:state.renderer.reusedEntryFrames}});
   check(ctx.result,'entry '+progress+' uses the same real context in the nonblocking parent surface',state.sameCanvas&&state.sameContext&&state.canvasCount===1&&state.ownerParent&&!state.contextLost&&state.inert&&state.ariaHidden==='true'&&state.pointerEvents==='none'&&state.direction==='in'&&state.duration===900&&Math.abs(state.renderer.passage.u-progress)<.0001&&Math.abs(state.layerRect.top-state.frameRect.top)<.5&&Math.abs(state.layerRect.height-state.frameRect.height)<.5,state);
   check(ctx.result,'entry '+progress+' has already committed the real insurance reader and usable copy control',state.room==='insurance'&&!state.roomHidden&&state.copyReachable,{room:state.room,roomHidden:state.roomHidden,copyReachable:state.copyReachable});
   if(progress===.481)check(ctx.result,'closed native portal seals every drawing-buffer pixel without an opaque sky or CSS substitute',state.renderer.transparentBackground===true&&state.renderer.clearAlpha===0&&state.renderer.mainLayerMask===2&&state.renderer.shadowLayerMask===3&&state.renderer.passage.hinges.length===2&&state.renderer.passage.hinges.map(h=>h.node).sort().join(',')==='hinge-insurance-left,hinge-insurance-right'&&state.renderer.passage.hinges.every(h=>h.angle<.00001)&&state.pixels.total>0&&state.pixels.nonOpaque===0&&state.pixels.minAlpha===255&&state.pixels.error===0,state);
   await capturePassage(ctx,'entry-'+String(progress).replace('.',''),progress);
   await finishPassage(ctx);await restoredPassage(ctx,'completed entry '+progress);
   if(progress===.84){await reader(ctx,'insurance');await capture(ctx,'entry-end');}
   await backWithPausedClock(ctx);await finishPassage(ctx);await settled(ctx.frame);
  }
  for(const progress of [0,.2,.5]){
   await assertSource('reverse '+progress);await beginNativePassage(ctx);await finishPassage(ctx);await backWithPausedClock(ctx);
   const state=await samplePassage(ctx,progress);
   check(ctx.result,'reverse '+progress+' follows the same native doorway with the canonical court already restored',state.sameCanvas&&state.sameContext&&!state.contextLost&&state.direction==='out'&&Math.abs(state.renderer.passage.u-(1-progress))<.0001&&state.passage.active===true,state);
   await capturePassage(ctx,'return-'+String(progress).replace('.',''),progress);await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,'completed reverse '+progress);
  }
  const returned=await snapshot(ctx.frame);check(ctx.result,'reverse ends on the actual insurance aperture and original source control',returned.selected==='insurance'&&returned.renderer.selected==='insurance'&&returned.projection.find(point=>point.key==='insurance')?.visible===true&&await ctx.f.locator('.arrival-enter').evaluate(node=>node===document.activeElement),returned);await capture(ctx,'return-end');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function otherRoomPassageCase(browser,origin,width,height,key){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{width,height,label:`${width}-${height}-${key}-passage`});await prepareRoomPassage(ctx,key);await capture(ctx,'source');
  const sourceCamera=(await snapshot(ctx.frame)).renderer.camera;
  const samePose=pose=>['position','target'].every(name=>pose[name].every((value,index)=>Math.abs(value-sourceCamera[name][index])<.000001))&&Math.abs(pose.fov-sourceCamera.fov)<.000001;
  for(const progress of [.479,.481,.65,.84]){
   const start=await snapshot(ctx.frame);check(ctx.result,key+' fresh trip restores exactly its own source pose',start.selected===key&&start.renderer.selected===key&&samePose(start.renderer.camera),start.renderer.camera);
   await beginNativePassage(ctx);if(key==='sourcing')await destinationReady(ctx,key,{copy:false});const state=await samplePassage(ctx,progress,{seal:progress===.481}),before=ctx.beforePassageRenderer;
   check(ctx.result,key+' entry '+progress+' borrows one real context at its original host aperture',state.sameCanvas&&state.sameContext&&state.canvasCount===1&&state.ownerParent&&!state.contextLost&&state.inert&&state.pointerEvents==='none'&&state.direction==='in'&&state.duration===900&&state.renderer.passage.room===key&&Math.abs(state.renderer.passage.u-progress)<.0001&&Math.abs(state.layerRect.top-state.frameRect.top)<.5&&Math.abs(state.layerRect.height-state.frameRect.height)<.5&&state.renderer.reusedEntryFrames===before.reusedEntryFrames+1,state);
   check(ctx.result,key+' canonical work surface is already usable during native travel',key==='sourcing'?state.frameHidden&&state.currentFrameRect.width===0&&state.nativeView==='sourcing'&&state.nativeBackReachable:state.room===key&&!state.roomHidden&&state.copyReachable,state);
   if(progress===.481){const hinges=state.renderer.passage.hinges,names=hinges.map(h=>h.node).sort(),expected=key==='lottery'?1:2;
    check(ctx.result,key+' physical closed leaves seal every pixel with a transparent world',hinges.length===expected&&new Set(names).size===expected&&names.every(name=>new RegExp('^hinge-'+key+'-(left|right)$').test(name))&&(expected===1?names[0]==='hinge-lottery-left':names.join(',')==='hinge-'+key+'-left,hinge-'+key+'-right')&&hinges.every(h=>h.angle<.00001)&&state.renderer.transparentBackground&&state.renderer.clearAlpha===0&&state.renderer.mainLayerMask===2&&state.renderer.shadowLayerMask===3&&state.pixels.total>0&&state.pixels.nonOpaque===0&&state.pixels.minAlpha===255&&state.pixels.error===0,state);
   }
   await capturePassage(ctx,'entry-'+String(progress).replace('.',''),progress);await finishPassage(ctx);await restoredPassage(ctx,key+' entry '+progress);
   if(progress===.84){await destinationReady(ctx,key);await capture(ctx,'destination');}
   await backWithPausedClock(ctx,key);await finishPassage(ctx);await settled(ctx.frame);
  }
  await beginNativePassage(ctx);if(key==='sourcing')await destinationReady(ctx,key,{copy:false});await finishPassage(ctx);if(key==='sourcing')await armNativeCloneComparison(ctx);await backWithPausedClock(ctx,key);const reverse=await samplePassage(ctx,0),nativeClone=key==='sourcing'?await compareNativeClone(ctx):null;
  check(ctx.result,key+' reverse begins from its own completed work surface without a new context',reverse.direction==='out'&&reverse.renderer.passage.room===key&&reverse.renderer.passage.u===1&&reverse.sameCanvas&&reverse.sameContext,reverse);
  await capturePassage(ctx,'return-0',0);if(nativeClone)check(ctx.result,'same-event native source button and parent-group geometry/materials survive attached reverse snapshot',nativeClone.pass,nativeClone);await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,key+' return');
  const end=await snapshot(ctx.frame);check(ctx.result,key+' returns to its exact physical source and original entrance focus',end.selected===key&&end.renderer.selected===key&&samePose(end.renderer.camera)&&end.projection.find(p=>p.key===key)?.visible&&await ctx.f.locator('.arrival-enter').evaluate(node=>node===document.activeElement),end);await capture(ctx,'return-end');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function directRoomsCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-all-direct-rooms'});await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
  await ctx.page.evaluate(()=>{window.__testDirectStarts=[];document.addEventListener('court:passage-start',e=>window.__testDirectStarts.push(e.detail));});
  for(const key of [...keys,'sourcing']){
   await ctx.f.locator('[data-court-open='+key+']').click();await destinationReady(ctx,key);await backFromRoom(ctx,key);await settled(ctx.frame);
   const starts=await ctx.page.evaluate(()=>window.__testDirectStarts);check(ctx.result,key+' すぐ開く and Back never create any native clock',starts.length===0&&await ctx.page.locator('.court-passage').count()===0&&(await snapshot(ctx.frame)).selected===key,starts);
  }
  await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function sourcingReturnPathsCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-sourcing-return-paths'});await prepareRoomPassage(ctx,'sourcing');await beginNativePassage(ctx);const moving=await samplePassage(ctx,.2);
  check(ctx.result,'native sourcing entry continues on parent RAF while its iframe is really hidden',moving.frameHidden&&moving.nativeView==='sourcing'&&moving.renderer.passage.room==='sourcing'&&moving.sameContext,moving);
  await ctx.page.evaluate(()=>{window.__testSourcingStarts=[];document.addEventListener('court:passage-start',e=>window.__testSourcingStarts.push(e.detail));});
  await backFromRoom(ctx,'sourcing');await ctx.page.locator('.court-passage').waitFor({state:'detached'});await settled(ctx.frame);await restoredPassage(ctx,'early native workspace Back');
  const starts=await ctx.page.evaluate(()=>window.__testSourcingStarts);check(ctx.result,'early native Back cancels only the loan and never invents a completed reverse',starts.length===0&&(await snapshot(ctx.frame)).selected==='sourcing',starts);
  await beginNativePassage(ctx);await destinationReady(ctx,'sourcing');await finishPassage(ctx);await destinationReady(ctx,'sourcing');check(ctx.result,'native workspace intentionally hides the legacy duplicate return and exposes its own Home',await ctx.page.locator('#ccCastleReturn').isHidden()&&await ctx.page.locator('[data-lounge-home]').isVisible());await armPassageClock(ctx);await ctx.page.locator('[data-lounge-home]').click();
  await ctx.page.waitForFunction(()=>document.getAnimations().some(a=>a.id==='court-passage-clock'),null,{timeout:10_000});const reverse=await samplePassage(ctx,0);
  check(ctx.result,'visible native Home uses the same completed sourcing history',reverse.direction==='out'&&reverse.renderer.passage.room==='sourcing'&&reverse.sameContext,reverse);await capturePassage(ctx,'return-host-0',0);await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,'host native return');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function sourcingContextLossCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-sourcing-context-loss'});await prepareRoomPassage(ctx,'sourcing');await beginNativePassage(ctx);const moving=await samplePassage(ctx,.2);
  check(ctx.result,'native loss is exercised with its real hidden child and active adopted canvas',moving.frameHidden&&moving.nativeView==='sourcing'&&moving.sameContext&&moving.passage.active&&moving.renderer.passage.room==='sourcing',moving);
  const invoked=await ctx.page.evaluate(()=>{const gl=window.__passageOriginal.gl,ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});check(ctx.result,'hidden-child native case invokes actual WEBGL_lose_context',invoked);
  await ctx.page.locator('.court-passage').waitFor({state:'detached'});await ctx.page.waitForFunction(()=>document.getElementById('ccCastleFrame').contentWindow.__arrivalCourt.snapshot().failed);
  await destinationReady(ctx,'sourcing');await restoredPassage(ctx,'hidden-child context failure');
  check(ctx.result,'context failure preserves canonical native workspace and really loses that same context',await ctx.page.evaluate(()=>document.getElementById('ccCastleFrame').hidden&&document.getElementById('mainWindow').dataset.ccView==='sourcing'&&window.__passageOriginal.gl.isContextLost()));await capture(ctx,'native-work-preserved');
  await backFromRoom(ctx,'sourcing');await ctx.f.locator('.spatial-castle').waitFor({state:'visible'});
  const failed=await snapshot(ctx.frame);check(ctx.result,'native Back after actual context loss reaches original usable castle with its renderer fully disposed',failed.failed===true&&failed.renderer===null&&!failed.passage.active&&await ctx.f.locator('.castle-quick-open[data-room=sourcing]').isVisible()&&await ctx.page.locator('.court-passage').count()===0,failed);await restoredPassage(ctx,'native original-castle return after lost context');
  await capture(ctx,'classic-return');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function nativeSnapshotFailureCase(browser,origin,fault){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-'+fault,fault});await prepareInsurancePassage(ctx);
  check(ctx.result,'optional native snapshot request is genuinely '+fault.split('-').at(-1),ctx.result.expectedFaults.some(file=>file.endsWith('/court-native-snapshot.js')),[...ctx.result.expectedFaults]);
  await beginNativePassage(ctx);const entry=await samplePassage(ctx,.2);
  check(ctx.result,'unavailable native capture never stalls publishing native passage installation',entry.sameContext&&entry.room==='insurance'&&entry.renderer.passage.room==='insurance'&&entry.passage.active,entry);
  await finishPassage(ctx);await backWithPausedClock(ctx);await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,'publishing reverse with unavailable native capture');
  await prepareRoomPassage(ctx,'sourcing');await beginNativePassage(ctx);await destinationReady(ctx,'sourcing');await finishPassage(ctx);await destinationReady(ctx,'sourcing');
  await ctx.page.evaluate(()=>{window.__testUnavailableCaptureStarts=[];document.addEventListener('court:passage-start',event=>window.__testUnavailableCaptureStarts.push(event.detail));});
  await backFromRoom(ctx,'sourcing');await settled(ctx.frame);await restoredPassage(ctx,'native instant Back without capture');
  const starts=await ctx.page.evaluate(()=>window.__testUnavailableCaptureStarts);check(ctx.result,'unsupported native capture uses immediate canonical Back without inventing a reverse snapshot',starts.length===0&&(await snapshot(ctx.frame)).selected==='sourcing'&&(await snapshot(ctx.frame)).active,starts);
  await capture(ctx,'instant-native-return');await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{ctx?.releaseNativeSnapshot();await ctx?.context.close();}
}

async function sourcingSearchCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-sourcing-search'});await prepareRoomPassage(ctx,'sourcing');await beginNativePassage(ctx);await destinationReady(ctx,'sourcing');await finishPassage(ctx);await destinationReady(ctx,'sourcing');
  await ctx.page.evaluate(()=>{window.__testNativeSearchStarts=[];document.addEventListener('court:passage-start',event=>window.__testNativeSearchStarts.push(event.detail));});
  await ctx.page.locator('[data-lounge-search]').click();await ctx.f.locator('#hall-dialog[open]').waitFor();
  const state=await snapshot(ctx.frame),starts=await ctx.page.evaluate(()=>window.__testNativeSearchStarts);
  check(ctx.result,'real native 全体検索 opens its child work dialog without a reverse loan',starts.length===0&&await ctx.page.locator('.court-passage').count()===0&&!state.renderer.presentation.active&&!state.passage.active&&await ctx.page.locator('#ccCastleFrame').isVisible()&&await ctx.f.locator('#hall-query').evaluate(node=>node===document.activeElement),{starts,state});
  await restoredPassage(ctx,'native search handoff');await capture(ctx,'search-dialog');
  await ctx.f.locator('#hall-close').click();await ctx.f.locator('#hall-dialog').waitFor({state:'hidden'});await settled(ctx.frame);
  await ctx.f.locator('[data-court-open=insurance]').click();await reader(ctx,'insurance');await back(ctx);await settled(ctx.frame);
  check(ctx.result,'search close retains usable existing work and Back without stale native history',(await snapshot(ctx.frame)).selected==='insurance'&&await ctx.page.locator('.court-passage').count()===0);await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function passagePaceCase(browser,origin){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-passage-pace'});await prepareInsurancePassage(ctx);
  for(const [pace,duration]of [['quick',480],['slow',1200]]){
   await ctx.f.locator('.arrival-menu summary').click();await ctx.f.locator('.arrival-menu').getByRole('button',{name:'音・演出',exact:true}).click();
   await ctx.f.locator('#settings input[name=pace][value='+pace+']').check();await closeSettings(ctx);
   await beginNativePassage(ctx);const state=await samplePassage(ctx,.2);check(ctx.result,'real '+pace+' setting maps to its declared passage duration',state.duration===duration&&state.room==='insurance',state.duration);
   await finishPassage(ctx);await backWithPausedClock(ctx);await finishPassage(ctx);await settled(ctx.frame);
   await ctx.page.evaluate(()=>{window.__testInstantStarts=[];document.addEventListener('court:passage-start',event=>window.__testInstantStarts.push(event.detail));});
   await ctx.f.locator('[data-court-open=insurance]').click();await reader(ctx,'insurance');
   const starts=await ctx.page.evaluate(()=>window.__testInstantStarts);check(ctx.result,'すぐ開く stays truly instant under '+pace,starts.length===0&&await ctx.page.locator('.court-passage').count()===0,starts);await back(ctx);await settled(ctx.frame);
  }
  await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}
async function interruptedPassageCase(browser,origin,kind){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-passage-'+kind});await prepareInsurancePassage(ctx);const sourceCamera=(await snapshot(ctx.frame)).renderer.camera;await beginNativePassage(ctx);await samplePassage(ctx,.2);
  if(kind==='cancel-return'){
   await finishPassage(ctx);await backWithPausedClock(ctx);const moving=await samplePassage(ctx,.2);
   check(ctx.result,'reverse interruption is exercised on the actual outgoing native lease',moving.direction==='out'&&moving.passage.active&&Math.abs(moving.renderer.passage.u-.8)<.0001,moving.renderer.passage);
   await ctx.page.keyboard.press('Escape');await ctx.page.locator('.court-passage').waitFor({state:'detached'});await restoredPassage(ctx,'mid-return Escape');await settled(ctx.frame);
   const current=await snapshot(ctx.frame),pose=current.renderer.camera;
   check(ctx.result,'cancelled reverse restores the authored court pose and original focus, not the inside camera',current.active&&current.selected==='insurance'&&current.renderer.selected==='insurance'&&['position','target'].every(key=>pose[key].every((value,index)=>Math.abs(value-sourceCamera[key][index])<.000001))&&Math.abs(pose.fov-sourceCamera.fov)<.000001&&await ctx.f.locator('.arrival-enter').evaluate(node=>node===document.activeElement),{source:sourceCamera,current:pose});
   const aperture=current.projection.find(point=>point.key==='insurance');check(ctx.result,'cancelled reverse reprojects a finite visible physical insurance aperture',aperture?.visible&&Number.isFinite(aperture.x)&&Number.isFinite(aperture.y)&&!current.renderer.pendingFrame,aperture);
   await ctx.f.locator('[data-court-open=insurance]').click();await reader(ctx,'insurance');await back(ctx);await settled(ctx.frame);
   check(ctx.result,'copy revisit after cancelled reverse leaves no orphan presentation',await ctx.page.locator('.court-passage').count()===0&&!(await snapshot(ctx.frame)).renderer.presentation.active);
  }else if(['escape','early-back','reduce'].includes(kind)){
   await ctx.page.evaluate(()=>{window.__testPassageStarts=[];document.addEventListener('court:passage-start',event=>window.__testPassageStarts.push(event.detail));});
   if(kind==='escape'){
    await ctx.frame.evaluate(()=>{window.__testEscapeProbe=null;window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const before=window.__arrivalCourt.snapshot(),clock=parent.document.getAnimations().find(a=>a.id==='court-passage-clock');window.__testEscapeProbe={before:{active:before.passage.active,clock:!!clock,time:clock?.currentTime,elapsedMs:parent.performance.now()-parent.__testPassageStartedAt,roomVisible:!document.getElementById('room').hidden}};window.__testEscapeEvent=event;},{capture:true,once:true});});
    await ctx.page.keyboard.press('Escape');
    const probe=await ctx.frame.evaluate(()=>{if(window.__testEscapeProbe)window.__testEscapeProbe.after={prevented:window.__testEscapeEvent.defaultPrevented,active:window.__arrivalCourt.snapshot().passage.active,roomVisible:!document.getElementById('room').hidden};return window.__testEscapeProbe;});check(ctx.result,'Escape reaches the live loan before the production watchdog',probe?.before.active&&probe.before.clock,probe);
   }
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
async function returnForegroundCase(browser,origin,kind){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-return-'+kind});await prepareInsurancePassage(ctx);await beginNativePassage(ctx);await finishPassage(ctx);await reader(ctx,'insurance');
  if(kind==='tools'){await ctx.f.locator('.living-toggle').click();await ctx.f.locator('#living-workbench').waitFor({state:'visible'});}
  const source=await ctx.frame.evaluate(kind=>{
   const frame=window.frameElement.getBoundingClientRect(),paper=document.querySelector(kind==='tools'?'.living-workbench':'#desk'),body=document.getElementById('draft-body'),scroll=document.getElementById('desk-scroll'),actor=document.querySelector('.spatial-desk-actor');
   const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left+frame.left,top:r.top+frame.top,width:r.width,height:r.height};};
   const props=['border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','background-color','transform','translate','rotate','scale'];
   let maxScroll=scroll.scrollHeight-scroll.clientHeight,visible=null;
   if(kind==='scroll'){
    if(maxScroll<=0)throw Error('Actual long manuscript has no scroll range');scroll.scrollTop=Math.min(180,maxScroll);
    const viewport=scroll.getBoundingClientRect(),node=body.firstChild;if(node?.nodeType!==Node.TEXT_NODE)throw Error('Expected actual text manuscript');
    for(let offset=0;offset<node.length;offset++){const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+1);const r=range.getBoundingClientRect();if(r.width>0&&r.top>=viewport.top+2&&r.bottom<=viewport.bottom-2){visible={offset,text:node.textContent.slice(offset,offset+36),rect:{left:r.left+frame.left,top:r.top+frame.top,width:r.width,height:r.height}};break;}}
   }
   const objects=kind==='tools'?[...paper.querySelectorAll('[data-object]')].map(node=>{const front=node.querySelector('.living-art-front'),style=getComputedStyle(front);return {key:node.dataset.object,label:node.querySelector('strong').textContent,rect:rect(node),front:Object.fromEntries(props.map(p=>[p,style.getPropertyValue(p)]))};}):[];
   const snapshot={kind,paper:rect(paper),actor:actor?rect(actor):null,bodyText:body.textContent,bodyRect:rect(body),scrollTop:scroll.scrollTop,maxScroll,visible,objects};
   window.__testForegroundSource={paper,body,scroll,actor,text:body.textContent,snapshot};return snapshot;
  },kind);
  check(ctx.result,kind==='scroll'?'actual long manuscript has a nonzero measured scroll position and visible character':'existing workbench has four real labelled objects',kind==='scroll'?source.maxScroll>0&&source.scrollTop>0&&!!source.visible:source.objects.length===4,source);
  await capture(ctx,kind+'-source');await backWithPausedClock(ctx);await samplePassage(ctx,0);
  const clone=await ctx.page.evaluate(kind=>{
   const source=document.getElementById('ccCastleFrame').contentWindow.__testForegroundSource,paper=document.querySelector('.court-passage-foreground [data-journey-part=paper]'),actor=document.querySelector('.court-passage-foreground [data-journey-part=actor]');
   const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
   if(!paper)throw Error('No actual inert return paper clone');
   const body=[...paper.querySelectorAll('div')].find(node=>node.textContent===source.text&&node.firstChild?.nodeType===Node.TEXT_NODE),scroller=paper.querySelector('[data-journey-scroll-top]');
   let visible=null;if(kind==='scroll'&&body&&source.snapshot.visible){const range=document.createRange(),offset=source.snapshot.visible.offset;range.setStart(body.firstChild,offset);range.setEnd(body.firstChild,offset+1);visible={text:body.firstChild.textContent.slice(offset,offset+36),rect:rect(range)};}
   const objects=kind==='tools'?source.snapshot.objects.map(item=>{const strong=[...paper.querySelectorAll('strong')].find(node=>node.textContent===item.label),button=strong?.closest('button'),front=button?.querySelector('span')?.children[1];return {key:item.key,label:strong?.textContent,rect:button&&rect(button),front:front&&Object.fromEntries(Object.keys(item.front).map(p=>[p,getComputedStyle(front).getPropertyValue(p)]))};}):[];
   return {paper:rect(paper),actor:actor&&rect(actor),bodyRect:body&&rect(body),bodyText:body?.textContent,scrollTop:scroller?.scrollTop,scrollMarker:scroller?.dataset.journeyScrollTop,visible,objects,inert:paper.closest('.court-passage').inert,sourcePlaneConnected:source.paper.isConnected,liveBodyConnected:source.body.isConnected,liveBodySame:source.body===document.getElementById('ccCastleFrame').contentDocument.getElementById('draft-body'),liveTextSame:source.body.textContent===source.text};
  },kind);
  const sameRect=(a,b)=>a&&b&&['left','top','width','height'].every(key=>Math.abs(a[key]-b[key])<1);
  check(ctx.result,'native return keeps original paper and actor geometry in the parent surface',clone.liveBodyConnected&&clone.liveBodySame&&clone.liveTextSame&&(kind==='tools'?!clone.sourcePlaneConnected:clone.sourcePlaneConnected)&&clone.inert&&sameRect(source.paper,clone.paper)&&(!source.actor||sameRect(source.actor,clone.actor)),{source:{paper:source.paper,actor:source.actor},clone});
  if(kind==='scroll')check(ctx.result,'return snapshot preserves the real scroll and the same visible manuscript character',clone.bodyText===source.bodyText&&Math.abs(clone.scrollTop-source.scrollTop)<1&&sameRect(source.bodyRect,clone.bodyRect)&&clone.visible?.text===source.visible.text&&sameRect(source.visible.rect,clone.visible.rect),{source,clone});
  else check(ctx.result,'native tools return preserves all four object bounds and their computed material transforms',clone.objects.length===4&&source.objects.every(item=>{const copied=clone.objects.find(row=>row.key===item.key);return copied&&sameRect(item.rect,copied.rect)&&Object.keys(item.front).every(key=>copied.front?.[key]===item.front[key]);}),{source:source.objects,clone:clone.objects});
  await capturePassage(ctx,'return-'+kind+'-0',0);await finishPassage(ctx);await settled(ctx.frame);await restoredPassage(ctx,'foreground '+kind);
  await ctx.f.locator('[data-court-open=insurance]').click();await ctx.f.locator('#room[data-account=insurance][data-spatial-desk=ready]').waitFor();
  const live=await ctx.frame.evaluate(()=>{const saved=window.__testForegroundSource;return {sameBody:saved.body===document.getElementById('draft-body'),sameText:saved.body.textContent===saved.text,scroll:document.getElementById('desk-scroll').scrollTop};});
  check(ctx.result,'a real revisit retains the same live manuscript nodes and contents',live.sameBody&&live.sameText&&(kind!=='scroll'||Math.abs(live.scroll-source.scrollTop)<1),live);
  if(kind==='tools'){await ctx.f.locator('.living-toggle').click();await ctx.f.locator('#living-workbench').waitFor({state:'visible'});const bench=await ctx.frame.evaluate(()=>{const saved=window.__testForegroundSource;return {sameBench:saved.paper===document.getElementById('living-workbench'),connected:saved.paper.isConnected,sameBody:saved.body===document.getElementById('draft-body'),sameText:saved.body.textContent===saved.text};});check(ctx.result,'canonical revisit reconnects the exact original reusable tools bench without replacing the manuscript',bench.sameBench&&bench.connected&&bench.sameBody&&bench.sameText,bench);}
  await unchanged(ctx);
 }catch(error){if(ctx)await fail(ctx,error);else console.error(error);}finally{await ctx?.context.close();}
}

async function optionalPassageFailure(browser,origin,fault){
 let ctx;
 try{
  ctx=await openHost(browser,origin,{label:'390-900-'+fault,fault});await ctx.f.locator('.arrival-court[data-state=ready]').waitFor();await settled(ctx.frame);
  const deadline=Date.now()+10_000;while(!ctx.result.expectedFaults.length&&Date.now()<deadline)await ctx.page.waitForTimeout(50);
  check(ctx.result,'optional passage dependency failure was actually requested',ctx.result.expectedFaults.length>0,[...ctx.result.expectedFaults]);
  check(ctx.result,'passage failure does not retire the real courtyard renderer',(await snapshot(ctx.frame)).active===true&&(await snapshot(ctx.frame)).failed===false);
  for(const key of [...keys,'sourcing']){
   await ctx.f.locator('[data-court-open='+key+']').click();await destinationReady(ctx,key);await backFromRoom(ctx,key);await settled(ctx.frame);
   check(ctx.result,'optional passage failure preserves direct '+key+' work and matching 3D return',(await snapshot(ctx.frame)).selected===key&&await ctx.page.locator('.court-passage').count()===0);
   await ctx.f.locator('.arrival-enter').click();await destinationReady(ctx,key);await backFromRoom(ctx,key);await settled(ctx.frame);
   check(ctx.result,'ordinary '+key+' doorway falls through to its owner when passage is unavailable',(await snapshot(ctx.frame)).selected===key&&await ctx.page.locator('.court-passage').count()===0);
  }
  await capture(ctx,'retained-court');await unchanged(ctx);
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
  if(mode!=='native'){
   for(const [width,height]of widths)await normalCase(browser,origin,width,height);
   for(const fault of ['model','invalid-model','module','entry-module','context-loss'])await fallbackCase(browser,origin,fault);
   disabled=await chromium.launch({channel:'chromium',headless:true,args:['--disable-webgl']});await fallbackCase(disabled,origin,'no-webgl');
   await lazyCancellationCase(browser,origin);await initialReducedCase(browser,origin);
   // The 17 diagnostic-only A/B checks remain separate from normal evidence.
   await shadowDiagnostic(browser,origin,1440,900);await shadowDiagnostic(browser,origin,390,900);
  }
  if(mode!=='baseline'){
   for(const [width,height]of mode==='native'?[[nativeWidth,nativeHeight]]:widths){await insurancePassageCase(browser,origin,width,height);for(const key of ['otoku','rakuten','lottery','sourcing'])await otherRoomPassageCase(browser,origin,width,height,key);}
   // Shared cross-document interaction/fault contracts run once, on390, not
   // duplicated in every width job. Each width retains its geometry/alpha gate.
   if(mode==='all'||nativeWidth===390){
    await passagePaceCase(browser,origin);await directRoomsCase(browser,origin);await sourcingReturnPathsCase(browser,origin);
    await sourcingContextLossCase(browser,origin);await sourcingSearchCase(browser,origin);
    for(const fault of ['native-snapshot-abort','native-snapshot-stall'])await nativeSnapshotFailureCase(browser,origin,fault);
    for(const kind of ['scroll','tools'])await returnForegroundCase(browser,origin,kind);
    for(const kind of ['copy','quick','resize','context-loss','escape','early-back','reduce','cancel-return'])await interruptedPassageCase(browser,origin,kind);
    for(const fault of ['passage-module','passage-css'])await optionalPassageFailure(browser,origin,fault);
   }
  }
 }finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment,results,failures},null,2));
  await disabled?.close();await browser?.close();server.close();
 }
 assert.equal(failures,0,`${failures} court fixture case(s) failed; screenshots and exact diagnostics retained`);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
