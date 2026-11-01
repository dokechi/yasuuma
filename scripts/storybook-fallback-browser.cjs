/* Optional presentation failure matrix in the REAL default host.
   Each case aborts exactly one same-origin asset; owners/data/routing are real.
   Synthetic records only, no production auth, remote requests or source writes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/storybook-fallback');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿'};
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
const fixtureScript=`(()=>{
 const rows=${JSON.stringify(rows)};__rpgQA.threads.events.push(...rows);
 window.__storybookRecords={original:JSON.stringify(rows),ids:rows.map(r=>r.id),requests:[],external:[],messages:[]};
 // Parser-installed after the real loader's document.open(), which erases
 // earlier Window listeners. Observe the real bridge; never synthesize a ready.
 window.addEventListener('message',event=>{const frame=document.getElementById('ccCastleFrame');if(event.origin===location.origin&&frame&&event.source===frame.contentWindow&&event.data?.channel==='cc-castle-v1')__storybookRecords.messages.push({type:event.data.type,active:event.data.active,action:event.data.action});});
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
const version='20261101.9-workbook';
const matrix=[[320,640],[800,648]];
const requestedWidth=Number(process.env.STORY_WIDTH||0),requestedHeight=Number(process.env.STORY_HEIGHT||0);
const sizes=requestedWidth?matrix.filter(([w,h])=>w===requestedWidth&&h===requestedHeight):matrix;
assert.ok(sizes.length,'only declared actual-host viewport pairs may run');
const artifact=path.join(out,requestedWidth?`${requestedWidth}-${requestedHeight}`:'all');
function probe(){
 window.__storyProbe={clipboard:[],messages:[],records:null,audio:[]};
 try{localStorage.setItem('storybook-owner-note','untouched');}catch{}
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.data?.channel!=='cc-castle-v1')return;
  if(window!==parent&&event.source===parent&&event.data.type==='records'&&event.data.complete===true&&Array.isArray(event.data.drafts))__storyProbe.records=structuredClone(event.data);
 });
 if(navigator.clipboard?.writeText){const original=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=text=>{__storyProbe.clipboard.push(String(text));return original(text);};}
 const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){__storyProbe.audio.push({kind:'media',src:this.currentSrc||this.src});return play.apply(this,arguments);};
 for(const name of ['OscillatorNode','AudioBufferSourceNode']){const proto=window[name]?.prototype;if(typeof proto?.start==='function'){const start=proto.start;proto.start=function(){__storyProbe.audio.push({kind:name,when:arguments[0]??0});return start.apply(this,arguments);};}}
}
const cases=[
 ['work-css','storybook-workbench.css'],['work-module','storybook-workbench.js'],['home-css','storybook-home.css'],['reader-css','storybook-reader.css'],['palette-css','storybook-tokens.css'],
 ['spatial-css','spatial-desk.css'],['entry-module','storybook-atelier.js'],['scene-module','storybook-scene.js'],
 ['reader-module','spatial-desk.js'],['art-module','storybook-art.js'],['actor-image','assets/storybook-insurance-actor-v1.webp']
];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function visibleHealth(){
 const visible=n=>{const r=n.getBoundingClientRect();return n.checkVisibility({opacityProperty:true,visibilityProperty:true})&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;};
 const broken=[...document.images].filter(n=>n.getAttribute('src')&&n.complete&&!n.naturalWidth&&visible(n)).map(n=>({src:n.getAttribute('src'),className:n.className}));
 const board=document.querySelector('.account-board'),room=document.getElementById('room'),surface=room.hidden?board:document.getElementById('desk');
 return {broken,background:getComputedStyle(surface).backgroundColor,bodyBackground:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,boardHidden:board.hidden,roomHidden:room.hidden,activeInert:!!document.activeElement?.closest('[inert]'),oldWorldVisible:[...document.querySelectorAll('#world,#town,#entry-wash,#labels,.door-threshold')].some(visible),journeys:document.querySelectorAll('.storybook-journey,.court-passage,.castle-journey').length};
}
const bright=color=>{const n=color.match(/[\d.]+/g)?.map(Number)||[];return n.length>=3&&n.slice(0,3).every(v=>v>=200)&&(n.length<4||n[3]>=.95);};
// Explicit secondary UI, never a forced click on the hidden original Back.
async function overview(frame){const menu=frame.locator('.workbook-menu>summary');if(await menu.isVisible()){await menu.click();await frame.locator('.workbook-menu-body').getByRole('button',{name:'本の全景',exact:true}).click();}else await frame.locator('#back').click();}
(async()=>{
 fs.mkdirSync(artifact,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chromium',headless:true,args:['--no-sandbox']});
 const results=[],save=()=>fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify({scope:'real default optional-asset fallback; no rich-layout or motion pass implied',results},null,2));
 try{for(const [width,height]of sizes)for(const [name,resource]of cases){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});await context.addInitScript(probe);
  const page=await context.newPage(),errors=[],blocked=[],moduleRequests=[],aborts=[],warnings=[];
  const result={width,height,name,resource,checks:[],frames:[],errors,blocked,moduleRequests,aborts,warnings};results.push(result);
  const check=(label,pass,detail)=>{result.checks.push({name:label,pass:!!pass,...(detail===undefined?{}:{detail})});save();assert.ok(pass,label+(detail===undefined?'':': '+JSON.stringify(detail)));};
  const capture=async suffix=>{const file=`${width}-${height}-${name}-${suffix}.png`;await page.screenshot({path:path.join(artifact,file)});result.frames.push(file);save();};
  let didAbort;const aborted=new Promise(resolve=>{didAbort=resolve;});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
  page.on('request',request=>{const u=new URL(request.url());if(u.pathname.startsWith('/command-center-98/lounge/')&&/\.(?:js|glb)$/.test(u.pathname))moduleRequests.push(u.pathname+u.search);});
  await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin===origin&&['GET','HEAD'].includes(req.method())){if(u.pathname==='/command-center-98/lounge/'+resource){aborts.push(u.pathname+u.search);didAbort();return route.abort('failed');}return route.continue();}blocked.push({url:req.url(),method:req.method()});return route.abort();});
  try{
   await page.goto(origin+'/command-center-98/app-v130.html');await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
   const f=page.frameLocator('#ccCastleFrame');await f.locator('#room[data-account=insurance]').waitFor();
   const cf=page.frames().find(frame=>new URL(frame.url()).pathname==='/command-center-98/lounge/index.html');assert.ok(cf,'real current default iframe is required');
   await cf.evaluate(async version=>{await document.fonts.ready;const owner=await import('./app.js?v='+version);window.__storyOwner=owner;window.__storyBoard=owner.getAccountBoard();},version);
   await cf.waitForFunction(()=>__storyBoard.state.complete===true&&__storyProbe.records?.drafts.length>0);
   check('optional asset failure still starts the real current manuscript, without a cover click',await f.locator('#draft-body').textContent()===rows[0].payload.draft&&await f.locator('.account-board').isHidden());await capture('initial-work');
   await overview(f);await f.locator('.account-board:not([hidden])').waitFor();
   if(name!=='actor-image'){let timer;try{await Promise.race([aborted,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Declared optional asset was never requested: '+resource)),10000);})]);}finally{clearTimeout(timer);}}
   // Wait for the actual optional installer outcome, not arbitrary rendering time.
   // Failed top-level import has no installer; its canonical owner is already ready.
   if(name!=='entry-module')await cf.waitForFunction(()=>['ready','fallback'].includes(document.body.dataset.spatial));
   const home=await cf.evaluate(()=>({root:document.body.classList.contains('storybook-atelier'),boards:document.querySelectorAll('.account-board').length,desks:document.querySelectorAll('#desk').length,owner:__storyBoard.element===document.querySelector('.account-board'),tiles:[...document.querySelectorAll('.account-tile')].map(n=>({key:n.dataset.destination,disabled:n.disabled})),enhanced:!!document.querySelector('.storybook[data-ready=true]'),spatial:document.body.dataset.spatial}));
   check('optional failure retains exactly one canonical owner and eight real destinations',home.root&&home.boards===1&&home.desks===1&&home.owner&&home.tiles.length===8&&home.tiles.filter(n=>n.disabled).length===3,home);
   const appURLs=moduleRequests.filter(url=>url.startsWith('/command-center-98/lounge/app.js'));
   check('fallback does not duplicate the application or ready handshake',same(appURLs,['/command-center-98/lounge/app.js?v='+version])&&await page.evaluate(()=>__storybookRecords.messages.filter(m=>m.type==='ready').length===1),[...appURLs]);
   let health=await cf.evaluate(visibleHealth);check('home fallback stays bright without the former world or blocked focus',bright(health.bodyBackground)&&bright(health.background)&&!health.overflow&&!health.oldWorldVisible&&!health.activeInert&&health.journeys===0,health);await capture('home');
   const open=async key=>{const story=f.locator(`[data-story-instant=${key}]`),tile=f.locator(`.account-tile[data-destination=${key}]`);const target=await story.isVisible()?story:tile;await target.scrollIntoViewIfNeeded();await target.click();};
   // The fallback's existing system button must stay a settings action, never
   // silently initialize the archived 3D world.
   const settings=home.enhanced?f.locator('.story-tool').filter({hasText:'設定'}):f.locator('.board-lounge');await settings.click();await f.locator('#settings[open]').waitFor();await f.locator('#settings-close').click();
   check('existing settings remain usable and leave the board active',await f.locator('.account-board:not([hidden])').isVisible());
   const before=await cf.evaluate(()=>({visit:__storyBoard.state.visitVersion,copies:__storyProbe.clipboard.length}));
   await open('insurance');await f.locator('#room[data-account=insurance]:not([hidden])').waitFor();await f.locator('#draft-body').filter({hasText:'insurance の合成原稿です。'}).waitFor();
   if(name==='actor-image'){let timer;try{await Promise.race([aborted,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Declared actor image was never requested')),10000);})]);}finally{clearTimeout(timer);}await cf.waitForFunction(()=>[...document.images].filter(n=>n.getAttribute('src')?.includes('storybook-insurance-actor-v1')).every(n=>n.complete));}
   check('the declared missing resource really failed in this independent case',aborts.length>0,[...aborts]);
   const body=await f.locator('#draft-body').textContent();const draft=await cf.evaluate(()=>({selected:document.querySelector('#desk-list [aria-pressed=true]')?.dataset.draftId,place:document.getElementById('desk').dataset.place,source:__storyProbe.records.drafts.find(d=>d.body===document.getElementById('draft-body').textContent)?.source,visit:__storyBoard.state.visitVersion}));
   check('one real insurance gesture reads the exact saved source and account',body===rows[0].payload.draft&&draft.place==='kyun'&&draft.source?.account==='insurance'&&draft.visit===before.visit+1,draft);
   const read=f.locator('#desk-read');if(await read.isVisible())await read.click();await f.locator('#draft-body').scrollIntoViewIfNeeded();
   health=await cf.evaluate(visibleHealth);const paper=await f.locator('#draft-body').evaluate(n=>({font:parseFloat(getComputedStyle(n).fontSize),text:n.textContent,rect:n.getBoundingClientRect().toJSON()}));
   check('ordinary reading jump or scrolling exposes real readable paper with no visible broken images',paper.font>=16&&paper.rect.width>=150&&paper.rect.bottom>0&&paper.rect.top<height&&!health.overflow&&health.broken.length===0&&!health.activeInert&&!health.oldWorldVisible&&bright(health.background),{paper:{...paper,text:undefined},health});
   const copy=f.locator('#desk-copy');await copy.scrollIntoViewIfNeeded();const copyGeometry=await copy.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {rect:r.toJSON(),reachable:hit===n||n.contains(hit),inert:!!n.closest('[inert]')};});
   check('the real copy button remains at least 44px and genuinely hittable',copyGeometry.rect.width>=44&&copyGeometry.rect.height>=44&&copyGeometry.reachable&&!copyGeometry.inert,copyGeometry);await copy.click();await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
   check('one copy gesture copies the exact source once',await cf.evaluate(count=>__storyProbe.clipboard.length===count+1,before.copies)&&(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===body);await capture('reader');
   await overview(f);await f.locator('.account-board:not([hidden])').waitFor();check('canonical Back clears the reader and leaves no stuck inert overlay',await f.locator('#room').isHidden()&&await cf.evaluate(()=>!document.activeElement?.closest('[inert]')&&!document.querySelector('.storybook-journey,.court-passage,.castle-journey')));
   await open('sourcing');await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();check('fallback still opens the original native sourcing workspace',await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing'&&await page.locator('#ccCastleFrame').isHidden()&&await page.locator('[data-lounge-home]').isVisible());await capture('native');
   await page.locator('[data-lounge-home]').click();await f.locator('.account-board:not([hidden])').waitFor();await open('insurance');await f.locator('#draft-body').filter({hasText:'insurance の合成原稿です。'}).waitFor();check('native return and repeat entry retain the same original manuscript',await f.locator('#draft-body').textContent()===body);await overview(f);await f.locator('.account-board:not([hidden])').waitFor();
   health=await cf.evaluate(visibleHealth);check('return remains bright and free of broken images or hidden interaction traps',bright(health.background)&&health.broken.length===0&&!health.activeInert&&health.journeys===0,health);await capture('return');
   check('missing presentation never imports an archived castle or graphics engine',!moduleRequests.some(url=>/\/(?:hybrid-world|spatial-atelier|castle-scene|arrival-entry|arrival-atelier|arrival-renderer)\.js|three-r187|\.glb(?:\?|$)/.test(url)),[...moduleRequests]);
   check('fallback preserves source data and the unrelated saved local note',await cf.evaluate(()=>localStorage.getItem('storybook-owner-note'))==='untouched'&&await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(r=>__storybookRecords.ids.includes(r.id)))===__storybookRecords.original));
   check('fallback has no source writes, automatic external actions or unexpected network',blocked.length===0&&await page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0&&__storybookRecords.external.length===0),{blocked});
   check('default sound remains silent including WebAudio',await page.evaluate(()=>__storyProbe.audio.length===0)&&await cf.evaluate(()=>__storyProbe.audio.length===0));
   check('optional failures are caught without an uncaught browser exception',errors.length===0,errors);result.status='passed';
  }catch(error){result.status='failed';result.failure={message:error.message,stack:error.stack};try{await capture('failure');}catch(captureError){result.captureError=captureError.message;}process.exitCode=1;}
  finally{save();await context.close();}
 }}finally{await browser.close();server.close();save();}
 console.log(JSON.stringify(results.map(r=>({width:r.width,height:r.height,name:r.name,status:r.status,checks:r.checks.length,failed:r.checks.filter(c=>!c.pass).length})),null,2));
})().catch(error=>{fs.mkdirSync(artifact,{recursive:true});fs.writeFileSync(path.join(artifact,'fatal.json'),JSON.stringify({scope:'fallback fixture bootstrap or teardown failure; no UI pass claimed',message:error.message,stack:error.stack},null,2));console.error(error);server.close();process.exitCode=1;});
