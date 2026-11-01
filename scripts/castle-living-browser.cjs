/* Real production host, synthetic same-origin records, no production login or
   writes. Current book routes are real; retained classic motion has separate fixtures. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {openStorybookOverview,closeReaderWork,toggleLivingTools}=require('./storybook-workbench-entry.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-living');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿'};
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'living-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'living-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
const fixtureScript=`(()=>{
 const rows=${JSON.stringify(rows)};__rpgQA.threads.events.push(...rows);
 window.__livingRecords={original:JSON.stringify(rows),ids:rows.map(r=>r.id),requests:[],external:[]};
 window.open=(...args)=>{__livingRecords.external.push(args);return null;};
 const previous=window.fetch;
 window.fetch=async(input,options={})=>{
  const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href),method=(options.method||input?.method||'GET').toUpperCase();
  __livingRecords.requests.push({url:url.href,method});
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
function probe(){
 window.__livingProbe={records:null,clipboard:[],freezeNext:false,held:null};
 try{localStorage.setItem('living-owner-note','untouched');}catch{}
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.channel==='cc-castle-v1'&&event.data.type==='records'&&Array.isArray(event.data.drafts)&&event.data.complete===true)window.__livingProbe.records=structuredClone(event.data);});
 if(navigator.clipboard?.writeText){const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=text=>{__livingProbe.clipboard.push(String(text));return write(text);};}
 new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes){if(node.nodeType!==1||!node.matches('.storybook-journey')||!__livingProbe.freezeNext)continue;__livingProbe.freezeNext=false;queueMicrotask(()=>{__livingProbe.held=node;for(const animation of node.getAnimations({subtree:true}))animation.pause();});}}).observe(document,{childList:true,subtree:true});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(file=>fs.existsSync(file)),headless:true,args:['--no-sandbox']});
 const results=[];let currentPage;
 try{for(const [width,height] of [[390,900],[320,640],[800,648],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=800,reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});await context.addInitScript(probe);
  const page=currentPage=await context.newPage(),errors=[],blocked=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{const r=route.request();if(new URL(r.url()).origin===origin&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({url:r.url(),method:r.method()});return route.abort();});
  const result={width,height,checks:[],frames:[]};results.push(result);
  const check=(name,pass,detail)=>{result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));};
  const screenshot=async name=>{const filename=`${width}-${height}-${name}.png`;await page.screenshot({path:path.join(out,filename)});result.frames.push(filename);};
  await page.goto(origin+'/command-center-98/app-v130.html');
  await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
  const f=page.frameLocator('#ccCastleFrame');await openStorybookOverview(f);await f.locator('[data-story-instant=insurance]').waitFor();
  const cf=page.frames().find(frame=>frame.url().includes('/lounge/'));
  await cf.evaluate(async()=>{await document.fonts.ready;const source=document.querySelector('script[src^="app.js"]').src;window.__livingDesk=(await import(source)).getLivingDesk();});
  await cf.waitForFunction(()=>window.__livingDesk?.snapshot().complete===true&&window.__livingProbe.records?.drafts.length>0);
  const state=()=>cf.evaluate(()=>__livingDesk.snapshot());
  const roomState=async key=>(await state()).rooms.find(room=>room.key===key);
  const originalPayload=await cf.evaluate(()=>structuredClone(__livingProbe.records));
  const send=payload=>page.evaluate(payload=>document.getElementById('ccCastleFrame').contentWindow.postMessage({channel:'cc-castle-v1',...payload},location.origin),payload);
  const settle=()=>cf.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const waitReader=async key=>{await f.locator(`#room[data-account=${key}][data-spatial-desk=ready]`).waitFor();await f.locator('[data-working-tools]').waitFor();await f.locator('#draft-body').waitFor();await f.locator('#room[data-story-scene=ready]').waitFor();await f.locator('.spatial-desk-actor').evaluate(node=>node.decode());assert.equal(await f.locator(`.spatial-study-scene .story-paper-art[data-story-room=${key}]`).count(),1);assert.ok((await f.locator('.spatial-desk-actor').getAttribute('src')).endsWith('/storybook-'+key+'-actor-v1.webp'));await settle();};
  const quick=async key=>{await f.locator(`[data-story-instant=${key}]`).click();await waitReader(key);};
  const showTools=async()=>{await toggleLivingTools(f);await f.locator('#room[data-living-view=tools]').waitFor();await f.locator('#living-workbench').waitFor();await settle();};
  const closeTools=async()=>{await toggleLivingTools(f);await f.locator('#room:not([data-living-view])').waitFor();await settle();};
  const currentIdentity=()=>cf.evaluate(()=>({room:document.getElementById('room').dataset.account,draft:__livingDesk.snapshot().rooms.find(r=>r.current)?.current,body:document.getElementById('draft-body').textContent,scroll:document.getElementById('desk-scroll').scrollTop}));
  await f.locator('.storybook[data-ready=true][data-story-scene=ready]').waitFor();await f.locator('.story-art-host .story-paper-art[data-story-room=insurance] .story-actor-image').evaluate(node=>node.decode());
  check('home marks only loaded source scope and leaves sourcing uncounted',(await roomState('insurance')).loadedCount===2&&(await roomState('sourcing')).loadedCount===null);
  await screenshot('home');
  await quick('insurance');
  const geometry=await f.locator('#desk-scroll').evaluate(node=>({height:node.clientHeight,bodyTop:document.getElementById('draft-body').getBoundingClientRect().top,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
  check('default remains immediately readable with the original work surface',geometry.height>=180&&geometry.bodyTop<geometry.viewport-80&&!geometry.overflow,geometry);
  check('copy and done remain at least 44px',await f.locator('#desk-copy,#desk-done').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)));
  await screenshot('reader-default');
  await cf.evaluate(()=>{window.__paperIdentity=document.getElementById('desk');window.__bodyIdentity=document.getElementById('draft-body');document.getElementById('desk-scroll').scrollTop=150;});
  const before=await currentIdentity();
  await showTools();
  const toolsGeometry=await f.locator('#living-workbench').evaluate(node=>({inert:document.getElementById('desk').inert,hidden:document.getElementById('desk').getAttribute('aria-hidden'),scroll:document.getElementById('desk-scroll').scrollTop,overflow:document.documentElement.scrollWidth>innerWidth,objects:[...node.querySelectorAll('[data-object]')].map(b=>({key:b.dataset.object,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,label:b.getAttribute('aria-label')})),toggle:(()=>{const r=document.querySelector('[data-working-tools]').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};})()}));
  check('room objects keep hidden paper inert and preserve its scroll',toolsGeometry.inert&&toolsGeometry.hidden==='true'&&toolsGeometry.scroll===before.scroll,toolsGeometry);
  check('four useful objects have readable purpose and 44px targets',toolsGeometry.objects.length===4&&toolsGeometry.objects.every(object=>object.width>=44&&object.height>=44&&object.label?.length>5)&&!toolsGeometry.overflow,toolsGeometry.objects);
  check('instant return toggle remains in the actual host viewport',toolsGeometry.toggle.height>=44&&toolsGeometry.toggle.width>=44&&toolsGeometry.toggle.top>=0&&toolsGeometry.toggle.bottom<=height-52,toolsGeometry.toggle);
  check('scope is visible alongside the briefing',await f.locator('.live-scope').isVisible()&&await f.locator('.live-scope').textContent().then(text=>/今回|未確認/.test(text)));
  await screenshot('insurance-tools');
  await f.locator('[data-object=chest]').click();await f.locator('#living-record-dialog[open]').waitFor();
  check('empty favorites tell the truth without inventing records',await f.locator('#living-record-dialog [data-living-draft]').count()===0&&await f.locator('.living-empty').textContent().then(text=>/まだありません/.test(text)));
  await screenshot('favorites-empty');
  await page.keyboard.press('Escape');await f.locator('#living-record-dialog').waitFor({state:'hidden'});
  check('Escape closes record dialog only and returns to its object',await f.locator('#room').getAttribute('data-living-view')==='tools'&&await f.locator('[data-object=chest]').evaluate(node=>node===document.activeElement));
  await page.keyboard.press('Escape');await f.locator('#room:not([data-living-view])').waitFor();
  check('Escape closes tools rather than leaving the room',await f.locator('#room').isVisible()&&await f.locator('.account-board').isHidden());
  const after=await currentIdentity();
  check('return restores the same live DOM, identity, text and scroll',await cf.evaluate(()=>__paperIdentity===document.getElementById('desk')&&__bodyIdentity===document.getElementById('draft-body')&&!document.getElementById('desk').inert)&&after.body===before.body&&after.scroll===before.scroll&&after.draft.id===before.draft.id,{before,after});
  await f.locator('#desk-pin').click();await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').favoriteCount===1);
  await showTools();await f.locator('[data-object=chest]').click();
  check('chest uses the actual existing pin and exact source ID',await f.locator('#living-record-dialog [data-living-draft]').count()===1&&(await roomState('insurance')).favoriteDrafts[0].id===before.draft.id&&(await roomState('insurance')).favoriteDrafts[0].source.account==='insurance');
  await screenshot('favorites-loaded');
  await f.locator('#living-record-dialog [data-living-draft]').click();await f.locator('#room:not([data-living-view])').waitFor();
  check('favorite selection returns to the original manuscript without changing source',(await currentIdentity()).draft.id===before.draft.id&&(await currentIdentity()).body===before.body);
  await showTools();await f.locator('[data-object=shelf]').click();await f.locator('#spatial-shelf-dialog[open]').waitFor();
  await f.locator('#desk-query').fill('保存原稿 二');await f.locator('#desk-list .manuscript-card').filter({hasText:'保存原稿 二'}).waitFor();
  check('bookshelf retains the existing live search',await f.locator('#desk-list .manuscript-card').count()===1);
  await screenshot('shelf-search');
  await f.locator('#spatial-shelf-dialog .spatial-shelf-heading button').click();
  check('closing bookshelf returns focus to its physical object',await f.locator('[data-object=shelf]').evaluate(node=>node===document.activeElement)&&await f.locator('#room').getAttribute('data-living-view')==='tools');
  await f.locator('[data-object=shelf]').click();await f.locator('#desk-list .manuscript-card').click();await f.locator('#room:not([data-living-view])').waitFor();
  const second=await currentIdentity();
  check('shelf selection commits the correct source and returns to readable paper',second.draft.title==='保険の保存原稿 二'&&second.draft.source.account==='insurance'&&second.draft.source.id!==before.draft.source.id&&await f.locator('#desk-scroll').evaluate(node=>node===document.activeElement),second.draft);
  await f.locator('#desk-pin').click();await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').favoriteCount===2);
  // Clear the preserved search through its own control, then choose the first
  // saved draft again. No adapter writes or direct notebook mutation are used.
  await showTools();await f.locator('[data-object=shelf]').click();await f.locator('#desk-query').fill('');
  await f.locator('#desk-list .manuscript-card').filter({hasText:'保存原稿 一'}).click();await f.locator('#room:not([data-living-view])').waitFor();
  await f.locator('#desk-copy').click();await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
  check('copy still contains only the active original text',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===before.body);
  await showTools();await f.locator('.living-copy-history').click();await f.locator('#desk-history-dialog[open]').waitFor();
  check('history is actual copy history, not fake completion',await f.locator('#desk-history-list details').count()===1&&await f.locator('#desk-history-list pre').textContent()===before.body&&(await roomState('insurance')).postedCount===0);
  await screenshot('copy-history');await f.locator('#desk-history-close').click();
  check('closing copy history returns focus to its workbench tool',await f.locator('.living-copy-history').evaluate(node=>node===document.activeElement));
  await f.locator('[data-object=chest]').click();
  await f.locator('#living-record-dialog [data-living-draft]').filter({hasText:'保存原稿 二'}).focus();
  const removed=structuredClone(originalPayload);removed.type='records';removed.drafts=removed.drafts.filter(d=>d.id!==second.draft.id);
  await send(removed);await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').loadedCount===1);
  check('a removed focused record returns focus to the modal close control',await f.locator('#living-record-dialog .living-dialog-heading button').evaluate(node=>node===document.activeElement)&&await f.locator('#living-record-dialog[open]').count()===1);
  await f.locator('#living-record-dialog .living-dialog-heading button').click();
  await send(originalPayload);await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').loadedCount===2);
  // New snapshot data is delivered by the real same-origin parent bridge.
  // These are synthetic fixture records, not production API writes.
  await send({type:'status',loading:true,message:'保存原稿を読み込み中…'});await cf.waitForFunction(()=>__livingDesk.snapshot().loading===true);
  check('loading counts remain explicitly incomplete',!(await state()).complete&&(await roomState('insurance')).totalCount===null&&/未確認/.test(await f.locator('.live-scope').textContent()));
  await send({type:'records',drafts:[],complete:false,loading:false,message:'検証用：保存原稿の読取に失敗しました。'});await cf.waitForFunction(()=>__livingDesk.snapshot().state==='attention');
  check('error retains cached text and does not claim remote zero',(await roomState('insurance')).loadedCount===2&&(await roomState('insurance')).totalCount===null&&(await currentIdentity()).body===before.body&&/未確認/.test(await f.locator('.live-scope').textContent()));
  await screenshot('tools-error');
  await send(originalPayload);await cf.waitForFunction(()=>__livingDesk.snapshot().complete===true);
  const changed=structuredClone(originalPayload);changed.type='records';changed.complete=true;changed.loading=false;changed.message='合成原稿の更新を読み込みました。';
  const activeId=(await currentIdentity()).draft.id,target=changed.drafts.find(d=>d.id===activeId);assert.ok(target,'fixture contains current record');target.body+='\n明示確認後だけ反映する更新原稿です。';
  await send(changed);await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').pendingUpdate===true);
  check('incoming changed revision is held while exploring, not silently applied',(await currentIdentity()).body===before.body&&(await state()).provisional===true&&(await roomState('insurance')).totalCount===null);
  // The error drawer is intentionally disclosed by the existing reader. Close
  // it explicitly before selecting the room notice, as a person would.
  await closeReaderWork(page,f);
  await f.locator('[data-object=notice]').click();await f.locator('.living-apply-update').waitFor();
  check('notice identifies a held update and keeps cache scope explicit',/まだ置き換えていません/.test(await f.locator('.living-dialog-note').textContent())&&/未確認/.test(await f.locator('.living-dialog-note').textContent()));
  await f.locator('.living-apply-update').focus();
  const pendingRefresh=structuredClone(changed),other=pendingRefresh.drafts.find(d=>d.id===second.draft.id);other.title+=' 更新';
  await send(pendingRefresh);await cf.waitForFunction(()=>__livingDesk.snapshot().rooms.find(r=>r.key==='insurance').drafts.some(d=>d.title==='保険の保存原稿 二 更新'));
  check('a refreshed held-update notice restores its focused update action',await f.locator('.living-apply-update').evaluate(node=>node===document.activeElement));
  await screenshot('notice-pending');await f.locator('.living-apply-update').click();await f.locator('#room:not([data-living-view])').waitFor();
  await f.locator('#draft-body').filter({hasText:'明示確認後だけ反映する更新原稿です。'}).waitFor();
  check('only the explicit update action replaces the same source text',(await currentIdentity()).draft.id===activeId&&(await currentIdentity()).body===target.body&&!(await roomState('insurance')).pendingUpdate);
  await screenshot('reader-after-update');
  await f.locator('#desk-copy').click();await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
  check('updated copy belongs to the current source without posting',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===target.body&&(await roomState('insurance')).postedCount===0);
  // Each publishing account uses its own records and material/room identity.
  for(const key of ['otoku','rakuten','lottery']){
   await showTools();await f.locator(`[data-working-chapter=${key}]`).click();await waitReader(key);
   check(key+' direct switch resets tools and preserves account isolation',await f.locator('#living-workbench').isHidden()&&(await currentIdentity()).draft.source.account===key&&(await roomState(key)).favoriteCount===0);
   await showTools();await screenshot(key+'-tools');
   await f.locator('[data-object=desk]').click();await f.locator('#room:not([data-living-view])').waitFor();
   check(key+' desk object returns focus to live text',await f.locator('#desk-scroll').evaluate(node=>node===document.activeElement));
  }
  // Tool-only interactions must not add backend calls or polling. Let already
  // requested image/read callbacks settle before capturing the request count.
  await settle();const requestsBefore=await page.evaluate(()=>__livingRecords.requests.length);
  await showTools();await f.locator('[data-object=chest]').click();await page.keyboard.press('Escape');await closeTools();await showTools();await f.locator('[data-object=notice]').click();await page.keyboard.press('Escape');await closeTools();await settle();
  check('local objects and status summaries add no backend requests',await page.evaluate(()=>__livingRecords.requests.length)===requestsBefore,{requestsBefore,requestsAfter:await page.evaluate(()=>__livingRecords.requests.length)});
  // Same-room close/reopen does not carry a hidden dialog or stale view.
  await showTools();await openStorybookOverview(f);await f.locator('.account-board:not([hidden])').waitFor();await quick('lottery');
  check('leaving tools and reopening the same room starts in the reader',await f.locator('#living-workbench').isHidden()&&await f.locator('#living-record-dialog[open]').count()===0&&!await f.locator('#desk').evaluate(node=>node.inert));
  if(width===390){
   // Capture normal-motion return contact for independent art review. The
   // source is the visible tools plane, not a hidden paper or blank room.
   await openStorybookOverview(f);await f.locator('.account-board:not([hidden])').waitFor();
   await page.emulateMedia({reducedMotion:'no-preference'});
   await f.locator('.story-tool').getByText('設定',{exact:true}).click();await f.locator('#settings[open]').waitFor();
   await f.locator('#reduce-setting').uncheck();await f.locator('#settings-close').click();
   await f.locator('[data-story-chapter=lottery]').click();await f.locator('.story-art-host .story-paper-art[data-story-room=lottery] .story-actor-image').evaluate(node=>node.decode());
   // This remains a normal-motion lottery route, not an insurance-only stand-in.
   // It intentionally requires all-chapter passage support before it can pass.
   await f.locator('[data-story-open=lottery]').click();await waitReader('lottery');
   await page.waitForFunction(()=>!document.querySelector('.storybook-journey'));
   await showTools();
   const materialProperties=['border-top','border-right','border-bottom','border-left','rotate','translate','scale'];
   const departureMaterials=await f.locator('.living-object-art').evaluateAll((nodes,properties)=>nodes.map(node=>properties.map(property=>getComputedStyle(node).getPropertyValue(property))),materialProperties);
   await page.evaluate(()=>__livingProbe.freezeNext=true);await openStorybookOverview(f);
   await page.waitForFunction(()=>__livingProbe.held?.isConnected);
   await page.evaluate(()=>{for(const animation of __livingProbe.held.getAnimations({subtree:true})){animation.pause();animation.currentTime=0;}});
   await screenshot('tools-return-contact');
   check('return capture has the visible tools content',await page.locator('.storybook-journey').textContent().then(text=>/持ち場メモ|原稿の本棚/.test(text)));
   const capturedMaterials=await page.locator('.storybook-journey-flat-source [data-journey-part=paper] button').evaluateAll((nodes,properties)=>nodes.filter(node=>node.querySelector('strong')&&node.querySelector('span')).map(node=>properties.map(property=>getComputedStyle(node.querySelector('span')).getPropertyValue(property))),materialProperties);
   check('return contact keeps every object border and independent material transform',JSON.stringify(capturedMaterials)===JSON.stringify(departureMaterials),{departureMaterials,capturedMaterials});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.storybook-journey'));await f.locator('.account-board:not([hidden])').waitFor();
   check('interrupted tools return leaves no overlay and keeps the selected room',await f.locator('[data-story-chapter=lottery]').getAttribute('aria-pressed')==='true'&&await f.locator('[data-story-instant=lottery]').getAttribute('aria-current')==='location'&&await cf.evaluate(()=>__storybook.snapshot().selected)==='lottery');
  }else{await openStorybookOverview(f);await f.locator('.account-board:not([hidden])').waitFor();}
  await f.locator('[data-story-instant=sourcing]').click();await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
  check('native sourcing remains the existing immediate work surface',await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing'&&await page.locator('#ccCastleFrame').isHidden());
  await page.locator('[data-lounge-home]').click();await f.locator('.account-board:not([hidden])').waitFor();
  check('existing owner local note survives all tool flows',await cf.evaluate(()=>localStorage.getItem('living-owner-note'))==='untouched');
  check('source fixture records remain byte-for-byte untouched',await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(row=>__livingRecords.ids.includes(row.id)))===__livingRecords.original));
  check('no source writes, posts or automatic external actions',await page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0&&__livingRecords.external.length===0));
  check('no browser exceptions',errors.length===0,errors);check('no unexpected external transport',blocked.length===0,blocked);
  if(width===390){
   // Losing only the optional read-only model must not block proven navigation,
   // manuscript copy, or the native source-preserving workshop route.
   await context.route('**/living-room-model.js*',route=>route.abort());
   await page.goto(origin+'/command-center-98/app-v130.html');
   await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
   const fallback=page.frameLocator('#ccCastleFrame');await openStorybookOverview(fallback);await fallback.locator('[data-story-instant=insurance]').waitFor();
   await fallback.locator('[data-story-instant=insurance]').click();
   await fallback.locator('#draft-body').filter({hasText:'insurance の合成原稿です。'}).waitFor();
   check('missing optional model leaves the original reader without living controls',await fallback.locator('.living-toggle').count()===0&&await fallback.locator('#desk-copy').isEnabled());
   await fallback.locator('#desk-copy').click();await fallback.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
   check('missing optional model preserves exact manuscript copy',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===rows[0].payload.draft);
   await screenshot('optional-model-fallback');
   await openStorybookOverview(fallback);await fallback.locator('.account-board:not([hidden])').waitFor();
   await fallback.locator('[data-story-instant=sourcing]').click();await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
   check('missing optional model preserves native sourcing',await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing');
   check('optional model failure has no uncaught exception or unexpected transport',errors.length===0&&blocked.length===0,{errors,blocked});
  }
  result.errors=errors;result.blocked=blocked;console.log(`PASS living room real host ${width}×${height}: ${result.checks.length} checks, ${result.frames.length} captures.`);
  await context.close();currentPage=null;
 }}catch(error){if(currentPage){await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),String(error.stack||error));}throw error;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
