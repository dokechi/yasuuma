/* New DEFAULT storybook in the real production host. Synthetic data only.
   No iframe URL substitution, production login, remote request or source write. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/storybook');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿'};
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
const fixtureScript=`(()=>{
 const rows=${JSON.stringify(rows)};__rpgQA.threads.events.push(...rows);
 window.__storybookRecords={original:JSON.stringify(rows),ids:rows.map(r=>r.id),requests:[],external:[]};
 window.open=(...args)=>{__storybookRecords.external.push(args);return null;};
 const previous=window.fetch;
 window.fetch=async(input,options={})=>{
  const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href),method=(options.method||input?.method||'GET').toUpperCase();
  __storybookRecords.requests.push({url:url.href,method});
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
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(content);
 });
});
const version='20261101.8-storybook';
const matrix=[[320,640],[390,900],[800,648],[1440,900]];
const requestedWidth=Number(process.env.STORY_WIDTH||0),requestedHeight=Number(process.env.STORY_HEIGHT||0);
const sizes=requestedWidth?matrix.filter(([w,h])=>w===requestedWidth&&h===requestedHeight):matrix;
assert.ok(sizes.length,'only declared actual-host viewport pairs may run');
const artifact=path.join(out,requestedWidth?`${requestedWidth}-${requestedHeight}`:'all');
function probe(){
 window.__storyProbe={clipboard:[],messages:[],records:null,audio:[]};
 try{localStorage.setItem('storybook-owner-note','untouched');}catch{}
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.data?.channel!=='cc-castle-v1')return;
  const frame=document.getElementById('ccCastleFrame');
  if(frame&&event.source===frame.contentWindow)__storyProbe.messages.push({type:event.data.type,active:event.data.active,action:event.data.action});
  if(window!==parent&&event.source===parent&&event.data.type==='records'&&event.data.complete===true&&Array.isArray(event.data.drafts))__storyProbe.records=structuredClone(event.data);
 });
 if(navigator.clipboard?.writeText){const original=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=text=>{__storyProbe.clipboard.push(String(text));return original(text);};}
 const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){__storyProbe.audio.push({kind:'media',src:this.currentSrc||this.src});return play.apply(this,arguments);};
 for(const name of ['OscillatorNode','AudioBufferSourceNode']){const proto=window[name]?.prototype;if(typeof proto?.start==='function'){const start=proto.start;proto.start=function(){__storyProbe.audio.push({kind:name,when:arguments[0]??0});return start.apply(this,arguments);};}}
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
(async()=>{
 fs.mkdirSync(artifact,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 const save=()=>fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify({scope:'actual-default insurance vertical slice; full five-room motion pending',results},null,2));
 try{for(const [width,height]of sizes){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=800,reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});await context.addInitScript(probe);
  const page=await context.newPage(),errors=[],blocked=[],moduleRequests=[];
  const result={width,height,checks:[],frames:[],errors,blocked,moduleRequests};results.push(result);
  const check=(name,pass,detail)=>{result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});save();assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));};
  const capture=async name=>{const file=`${width}-${height}-${name}.png`;await page.screenshot({path:path.join(artifact,file)});result.frames.push(file);save();};
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{const u=new URL(request.url());if(u.pathname.startsWith('/command-center-98/lounge/')&&/\.(?:js|glb)$/.test(u.pathname))moduleRequests.push(u.pathname+u.search);});
  await context.route('**/*',route=>{const r=route.request();if(new URL(r.url()).origin===origin&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({url:r.url(),method:r.method()});return route.abort();});
  try{
   await page.goto(origin+'/command-center-98/app-v130.html');
   await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
   const f=page.frameLocator('#ccCastleFrame');await f.locator('.storybook[data-ready=true]').waitFor();
   const cf=page.frames().find(frame=>new URL(frame.url()).pathname==='/command-center-98/lounge/index.html');assert.ok(cf,'real default lounge index, not archive/prototype');
   await cf.evaluate(async version=>{await document.fonts.ready;const owner=await import('./app.js?v='+version);window.__storyOwner=owner;window.__storyDesk=owner.getLivingDesk();window.__storyBoard=owner.getAccountBoard();},version);
   await cf.waitForFunction(()=>__storyDesk?.snapshot().complete===true&&__storyProbe.records?.drafts.length>0);
   const state=()=>cf.evaluate(()=>__storyDesk.snapshot());
   const roomState=async key=>(await state()).rooms.find(room=>room.key===key);
   const send=payload=>page.evaluate(payload=>document.getElementById('ccCastleFrame').contentWindow.postMessage({channel:'cc-castle-v1',...payload},location.origin),payload);
   const original=await cf.evaluate(()=>structuredClone(__storyProbe.records));
   await cf.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.storybook img')].filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height).map(n=>n.decode()));});
   await capture('default-home');
   const home=await cf.evaluate(()=>({body:document.body.classList.contains('storybook-atelier'),roots:document.querySelectorAll('.storybook').length,boards:document.querySelectorAll('.account-board').length,desk:document.querySelectorAll('#desk').length,owner:__storyBoard.element===document.querySelector('.account-board'),destinations:[...document.querySelectorAll('[data-story-destination]')].map(n=>({key:n.dataset.storyDestination,disabled:n.disabled===true})),instant:[...document.querySelectorAll('[data-story-instant]')].map(n=>n.dataset.storyInstant),overflow:document.documentElement.scrollWidth>innerWidth,state:window.__storybook.snapshot()}));
   check('new storybook is the real default with one board, reader and application owner',home.body&&home.roots===1&&home.boards===1&&home.desk===1&&home.owner,home);
   check('eight real destinations retain five active and three sealed slots',home.destinations.length===8&&home.destinations.filter(n=>n.disabled).length===3&&same(home.destinations.filter(n=>!n.disabled).map(n=>n.key).sort(),['insurance','otoku','rakuten','lottery','sourcing'].sort()),home.destinations);
   check('five explicit instant paths preserve exact account routing',same([...new Set(home.instant)].sort(),['insurance','otoku','rakuten','lottery','sourcing'].sort())&&home.instant.length===5,home.instant);
   check('default neither overflows nor eagerly imports archived presentation',!home.overflow&&!moduleRequests.some(url=>/\/(?:spatial-atelier|castle-scene|arrival-entry|arrival-atelier|arrival-renderer)\.js|three-r187|\.glb(?:\?|$)/.test(url)),[...moduleRequests]);
   const appRequests=moduleRequests.filter(url=>url.startsWith('/command-center-98/lounge/app.js'));
   check('one exact app URL and one ready handshake initialize the current host',same(appRequests,['/command-center-98/lounge/app.js?v='+version])&&await page.evaluate(()=>__storyProbe.messages.filter(m=>m.type==='ready').length===1),{appRequests,ready:await page.evaluate(()=>__storyProbe.messages.filter(m=>m.type==='ready'))});
   check('lottery current identity remains @chusen1101',(await roomState('lottery')).handle==='@chusen1101');
   check('saved counts are local source-scoped and native inventory stays unknown',(await roomState('insurance')).loadedCount===2&&(await roomState('sourcing')).loadedCount===null);
   const frameRect=await page.locator('#ccCastleFrame').boundingBox(),rail=await page.locator('#requestProgressShortcut').boundingBox();
   check('actual host request rail never covers the storybook',frameRect.y>=rail.y+rail.height&&await page.locator('#requestProgressOpen').evaluate(n=>n.getBoundingClientRect().height)>=44,{frameRect,rail});
   const targets=await f.locator('[data-story-instant]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {key:n.dataset.storyInstant,w:r.width,h:r.height,visible:!!n.checkVisibility(),name:n.getAttribute('aria-label')||n.textContent};}));
   check('instant actions have visible names and at least 44px targets',targets.every(n=>n.visible&&n.w>=44&&n.h>=44&&n.name.trim()),targets);
   const before=await cf.evaluate(()=>({visit:__storyBoard.state.visitVersion,copies:__storyProbe.clipboard.length})),beforeMessages=await page.evaluate(()=>__storyProbe.messages.filter(m=>m.type==='reading-room'&&m.active).length);
   await f.locator('[data-story-instant=insurance]').click();await f.locator('#room[data-account=insurance][data-spatial-desk=ready]').waitFor();await f.locator('#room[data-story-scene=ready]').waitFor();await f.locator('.living-toggle').waitFor();
   check('one instant gesture commits exactly one canonical insurance route',(await cf.evaluate(()=>__storyBoard.state.visitVersion))===before.visit+1&&(await page.evaluate(()=>__storyProbe.messages.filter(m=>m.type==='reading-room'&&m.active).length))===beforeMessages+1);
   const body=await f.locator('#draft-body').textContent();check('the visible manuscript is the original account source text',body===rows[0].payload.draft&&(await roomState('insurance')).current.source.account==='insurance');
   const geometry=await f.locator('#desk-scroll').evaluate(n=>({height:n.clientHeight,top:document.getElementById('draft-body').getBoundingClientRect().top,viewport:innerHeight,font:parseFloat(getComputedStyle(document.getElementById('draft-body')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth,actions:[...document.querySelectorAll('#desk-copy,#desk-done')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};})}));
   check('paper remains first-fold readable, unshrunk and usable at actual host size',geometry.height>=180&&geometry.top<geometry.viewport-80&&geometry.font>=16&&!geometry.overflow&&geometry.actions.every(r=>r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=geometry.viewport+1),geometry);await capture('insurance-reader');
   await f.locator('#desk-copy').click();await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
   check('one copy gesture writes the exact manuscript once',await cf.evaluate(before=>__storyProbe.clipboard.length===before+1,before.copies)&&(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===body);
   const scroll=await cf.evaluate(()=>{window.__storyPaper=document.getElementById('desk');window.__storyBody=document.getElementById('draft-body');const s=document.getElementById('desk-scroll');s.scrollTop=150;return {top:s.scrollTop,max:s.scrollHeight-s.clientHeight};});check('long fixture has a real nonzero reading position',scroll.max>0&&scroll.top>0,scroll);
   const showTools=async()=>{await f.locator('.living-toggle').click();await f.locator('#room[data-living-view=tools]').waitFor();};
   await showTools();const objects=await f.locator('#living-workbench [data-object]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {key:n.dataset.object,w:r.width,h:r.height,label:n.getAttribute('aria-label')};}));check('four real room tools retain readable labels and 44px targets',same(objects.map(n=>n.key).sort(),['desk','shelf','chest','notice'].sort())&&objects.every(n=>n.w>=44&&n.h>=44&&n.label),objects);await capture('insurance-tools');
   await f.locator('[data-object=chest]').click();await f.locator('#living-record-dialog[open]').waitFor();check('empty favorites are truthful',await f.locator('#living-record-dialog [data-living-draft]').count()===0&&/まだありません/.test(await f.locator('.living-empty').textContent()));await capture('favorites-empty');
   await page.keyboard.press('Escape');check('record dialog Escape keeps workbench and restores the chest',await f.locator('#room').getAttribute('data-living-view')==='tools'&&await f.locator('[data-object=chest]').evaluate(n=>n===document.activeElement));await page.keyboard.press('Escape');await f.locator('#room:not([data-living-view])').waitFor();
   check('tools return keeps exact live paper, source and reading scroll',await cf.evaluate(top=>__storyPaper===document.getElementById('desk')&&__storyBody===document.getElementById('draft-body')&&!__storyPaper.inert&&Math.abs(document.getElementById('desk-scroll').scrollTop-top)<1,scroll.top)&&await f.locator('#draft-body').textContent()===body);
   await f.locator('#desk-pin').click();await cf.waitForFunction(()=>__storyDesk.snapshot().rooms.find(r=>r.key==='insurance').favoriteCount===1);await showTools();await f.locator('[data-object=chest]').click();await f.locator('#living-record-dialog [data-living-draft]').waitFor();check('favorites use the real current source and never another account',(await roomState('insurance')).favoriteDrafts[0].source.account==='insurance'&&(await roomState('insurance')).favoriteDrafts[0].id===(await roomState('insurance')).current.id);await capture('favorites-loaded');await page.keyboard.press('Escape');
   await f.locator('.living-copy-history').click();await f.locator('#desk-history-dialog[open]').waitFor();check('one copy adds one actual history record, not a publication',await f.locator('#desk-history-list details').count()===1&&await f.locator('#desk-history-list pre').textContent()===body&&(await roomState('insurance')).postedCount===0);await capture('copy-history');await f.locator('#desk-history-close').click();
   check('copy-history close returns focus to the existing owner tool',await f.locator('.living-copy-history').evaluate(n=>n===document.activeElement));
   await send({type:'status',loading:true,message:'保存原稿を読み込み中…'});await cf.waitForFunction(()=>__storyDesk.snapshot().loading===true);check('loading never presents incomplete cache as a confirmed total',(await roomState('insurance')).totalCount===null&&/未確認/.test(await f.locator('.live-scope').textContent()));
   await send({type:'records',drafts:[],complete:false,loading:false,message:'検証用：保存原稿の読取に失敗しました。'});await cf.waitForFunction(()=>__storyDesk.snapshot().state==='attention');check('read failure preserves text and clearly marks uncertainty',(await roomState('insurance')).loadedCount===2&&(await roomState('insurance')).totalCount===null&&await f.locator('#draft-body').textContent()===body);await capture('tools-read-error');
   await send(original);await cf.waitForFunction(()=>__storyDesk.snapshot().complete===true);if(await f.locator('.spatial-work[open]').count())await f.locator('.spatial-work>summary').click();
   const update=structuredClone(original),current=(await roomState('insurance')).current;update.type='records';update.drafts.find(d=>d.id===current.id).body+='\n明示操作でだけ反映する新しい本文です。';await send(update);await cf.waitForFunction(()=>__storyDesk.snapshot().rooms.find(r=>r.key==='insurance').pendingUpdate===true);check('arriving revision does not replace a reading manuscript silently',await f.locator('#draft-body').textContent()===body&&(await state()).provisional&&(await roomState('insurance')).totalCount===null);
   await f.locator('[data-object=notice]').click();await f.locator('.living-apply-update').waitFor();await capture('notice-pending');await f.locator('.living-apply-update').click();await f.locator('#room:not([data-living-view])').waitFor();check('explicit notice action alone applies the same exact source revision',await f.locator('#draft-body').textContent()===update.drafts.find(d=>d.id===current.id).body&&(await roomState('insurance')).current.id===current.id&&!(await roomState('insurance')).pendingUpdate);
   await f.locator('#back').click();await f.locator('.storybook[data-ready=true]').waitFor({state:'visible'});check('Back preserves selected insurance and leaves no inert work overlay',(await cf.evaluate(()=>__storybook.snapshot())).selected==='insurance'&&await f.locator('#room').isHidden());await capture('default-return');
   check('local owner note and source records survive without mutation',await cf.evaluate(()=>localStorage.getItem('storybook-owner-note'))==='untouched'&&await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(r=>__storybookRecords.ids.includes(r.id)))===__storybookRecords.original));
   check('no external actions, source writes, unexpected transport or browser errors',await page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0&&__storybookRecords.external.length===0)&&blocked.length===0&&errors.length===0,{blocked,errors});
   check('default sound is silent without an explicit gesture',await page.evaluate(()=>__storyProbe.audio.length===0)&&await cf.evaluate(()=>__storyProbe.audio.length===0));
   result.status='passed';
  }catch(error){result.status='failed';result.failure={message:error.message,stack:error.stack};try{await capture('failure');}catch(captureError){result.captureError=captureError.message;}process.exitCode=1;}
  finally{save();await context.close();}
 }}finally{await browser.close();server.close();save();}
 console.log(JSON.stringify(results.map(r=>({width:r.width,height:r.height,status:r.status,checks:r.checks.length,failed:r.checks.filter(c=>!c.pass).length})),null,2));
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
