// Real production loader and current DEFAULT storybook, with synthetic API responses.
// Retained classic-castle visuals are exercised by their direct-entry fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {openStorybookOverview,openReaderWork,toggleLivingTools}=require('./storybook-workbench-entry.cjs');
// Keep the established artifact directory for CI upload compatibility only.
// Coverage is the new default book, never archive.html or a substituted frame.
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-spatial-prototype');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const insuranceBody='合成データの保険原稿です。保障内容と条件を確認してから判断します。\n\n'+('コピーは投稿ではありません。保存済みの文章をそのまま読みます。\n\n').repeat(18);
const publishing=['insurance','otoku','rakuten','lottery'];
const handles={insurance:'@sucker0508',otoku:'@thats_a_steal0601',rakuten:'@bonya0914',lottery:'@chusen1101'};
const titles={insurance:'保険を見直す前の確認',otoku:'お得な買い物の確認',rakuten:'楽天の条件を確認',lottery:'抽選の参加条件を確認'};
const bodies=Object.fromEntries(publishing.map(key=>[key,key==='insurance'?insuranceBody:key+'の合成保存原稿です。\n\n'+('この持ち場だけの本文です。保存された条件と出典をそのまま確認します。\n\n').repeat(18)]));
const fixtureScript=`(()=>{
  const keys=${JSON.stringify(publishing)},titles=${JSON.stringify(titles)},bodies=${JSON.stringify(bodies)};
  const rows=keys.map((key,i)=>({id:901+i,taskId:key+'-threads-v1',eventKey:'host-'+key,title:titles[key],occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:bodies[key],date:'2026-10-30',review_status:'確認用下書き',sources_note:'検証専用の出典記録'}}));
  __rpgQA.threads.events.push(...rows);
  window.__unifiedQA={original:JSON.stringify(rows),requests:[],external:[]};
  window.open=(...args)=>{__unifiedQA.external.push(args);return null;};
  const previous=window.fetch;
  window.fetch=async(input,options={})=>{
    const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href);
    const method=(options.method||input?.method||'GET').toUpperCase();
    let body;try{body=JSON.parse(options.body||'null');}catch{}
    __unifiedQA.requests.push({url:url.href,method,...(body?{action:body.action,entityType:body.entityType,count:body.items?.length}:{})});
    const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    if(method==='GET'&&url.searchParams.get('resource')==='task-events'&&rows.some(row=>row.taskId===url.searchParams.get('taskId')))return json({ok:true,events:rows.filter(row=>row.taskId===url.searchParams.get('taskId')),total:1,nextOffset:null});
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
    if(relative==='/command-center-98/app.html')content=bytes.toString().replace('<head>','<head><script>localStorage.setItem("cc-castle-mode","classic");</script><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script><script>'+fixtureScript+'</script>');
    if(relative==='/scripts/ui-fixtures.js')content=bytes.toString().replace(/document\.addEventListener\('DOMContentLoaded',[\s\S]*?\n  \}\);/,'');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(content);
  });
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),headless:true,args:['--no-sandbox']}),results=[];
 try{for(const [width,height] of [[1440,900],[800,648],[390,900],[320,640]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[],blocked=[],requested=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>requested.push(request.url()));await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin&&['GET','HEAD'].includes(r.request().method()))return r.continue();blocked.push(r.request().url());return r.abort();});
  await page.goto(origin+'/command-center-98/app-v130.html');await page.waitForFunction(()=>window.CCCastle?.unified&&!document.querySelector('#ccCastleFrame').hidden);
  const lounge=page.frameLocator('#ccCastleFrame');await openStorybookOverview(lounge);await lounge.locator('.storybook[data-ready=true][data-story-scene=ready]').waitFor();await lounge.locator('[data-story-instant=sourcing]').waitFor();
  // All five authored characters remain required, not just the initially
  // selected insurance illustration. This deliberately fails incomplete art.
  const identities=handles;
  for(const key of ['insurance','otoku','rakuten','lottery','sourcing']){
   await lounge.locator('[data-story-chapter='+key+']').click();
   const art=lounge.locator('.story-art-host .story-paper-art[data-story-room='+key+']');await art.waitFor();
   const actor=art.locator('.story-actor-image');await actor.waitFor();await actor.evaluate(image=>image.decode());
   assert.equal(await actor.evaluate(image=>image.complete&&image.naturalWidth>0),true);assert.match(await actor.getAttribute('src'),new RegExp('storybook-'+key+'-actor-v1\\.webp'));
   if(identities[key])assert.ok((await lounge.locator('.story-account-identity').textContent()).includes(identities[key]));
   assert.equal(await lounge.locator('.account-board').evaluate(board=>board.hidden),false,'chapter selection does not route');
  }
  await lounge.locator('[data-story-chapter=insurance]').click();await lounge.locator('.story-art-host .story-actor-image').evaluate(image=>image.decode());
  await page.frames().find(f=>f.url().includes('/lounge/')).evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  assert.equal(await lounge.locator('[data-story-destination]').count(),8,'all eight original destinations remain represented');assert.equal(await lounge.locator('[data-story-destination]:visible').count(),5,'the main book shows the five active chapters');
  const preparing=lounge.locator('.story-preparing');assert.equal(await preparing.evaluate(node=>node.open),false);await preparing.locator('summary').click();
  const pending=await preparing.locator('[data-story-destination]').evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('aria-label'),disabled:node.disabled,height:node.getBoundingClientRect().height})));assert.deepEqual(pending.map(node=>node.name),['追加アカウント5、未設定','追加アカウント6、未設定','予備、未設定']);assert.ok(pending.every(node=>node.disabled&&node.height>=44));
  const selectedBefore=await lounge.locator('.storybook').getAttribute('data-story-room');await preparing.locator('[data-story-destination]').evaluateAll(nodes=>nodes.forEach(node=>node.click()));
  assert.equal(await lounge.locator('.storybook').getAttribute('data-story-room'),selectedBefore);assert.equal(await lounge.locator('.account-board').evaluate(node=>node.hidden),false);assert.equal(await lounge.locator('#room').evaluate(node=>node.hidden),true);
  await preparing.locator('summary').click();assert.equal(await lounge.locator('[data-story-destination]:visible').count(),5);
  await page.screenshot({path:path.join(out,`${width}-${height}-host-home.png`)});
  const frameRect=await page.locator('#ccCastleFrame').boundingBox(),barRect=await page.locator('#requestProgressShortcut').boundingBox();
  assert.ok(frameRect.y>=barRect.y+barRect.height);assert.ok(Math.abs(frameRect.y-52)<=1,'the actual host reserves its 52px request rail');assert.ok((await page.locator('#requestProgressOpen').boundingBox()).height>=44);
  const publishingResults=[];
  for(const key of publishing){
   await lounge.locator('[data-story-instant='+key+']').click();
   await lounge.locator('#room[data-account='+key+'][data-story-scene=ready]').waitFor();
   await lounge.locator('.spatial-desk-actor').evaluate(image=>image.decode());
   assert.match(await lounge.locator('.spatial-desk-actor').getAttribute('src'),new RegExp('storybook-'+key+'-actor-v1\\.webp'));
   assert.equal(await lounge.locator('.spatial-study-scene .story-paper-art[data-story-room='+key+']').count(),1);
   assert.equal(await lounge.locator('.spatial-account-identity > h3 + p').textContent(),handles[key]);
   await lounge.locator('#draft-body').waitFor();assert.equal(await lounge.locator('#draft-body').textContent(),bodies[key]);
   const reader=await lounge.locator('#desk-scroll').evaluate(n=>({font:parseFloat(getComputedStyle(document.getElementById('draft-body')).fontSize),height:n.clientHeight,bodyTop:document.getElementById('draft-body').getBoundingClientRect().top,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,actions:[...document.querySelectorAll('#desk-copy,#desk-done')].map(button=>{const r=button.getBoundingClientRect();return {height:r.height,width:r.width,top:r.top,bottom:r.bottom};})}));
   assert.ok(reader.font>=16&&reader.height>=180&&reader.bodyTop<reader.viewport-80&&!reader.overflow&&reader.actions.every(r=>r.height>=44&&r.width>=44&&r.top>=0&&r.bottom<=reader.viewport),JSON.stringify({key,...reader}));
   await page.screenshot({path:path.join(out,`${width}-${height}-host-study${key==='insurance'?'':'-'+key}.png`)});
   await openReaderWork(lounge);assert.ok(await lounge.locator('#desk-refresh').isVisible());
   assert.ok((await lounge.locator('#desk-routes strong').textContent()).includes(handles[key]));
   if(key==='insurance')await page.screenshot({path:path.join(out,`${width}-${height}-host-tools.png`)});
   await lounge.locator('#desk-read').click();assert.equal(await lounge.locator('#room').evaluate(n=>n.scrollTop),0);
   await lounge.locator('#desk-copy').click();await lounge.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),bodies[key]);
   assert.equal(await lounge.locator('#desk-pin').getAttribute('aria-pressed'),'false','favorites from the previous account never leak');
   await lounge.locator('#desk-pin').click();assert.equal(await lounge.locator('#desk-pin').getAttribute('aria-pressed'),'true');
   const scroll=await lounge.locator('#desk-scroll').evaluate(node=>{node.scrollTop=150;window.__hostPaper=document.getElementById('desk');window.__hostBody=document.getElementById('draft-body');return node.scrollTop;});
   assert.ok(scroll>0,'the retention test must use a real nonzero reading offset');
   await toggleLivingTools(lounge);await lounge.locator('[data-object=chest]').click();
   await lounge.locator('#living-record-dialog[open]').waitFor();assert.equal(await lounge.locator('#living-record-dialog [data-living-draft]').count(),1);
   assert.equal(await lounge.locator('#living-record-dialog [data-living-draft] strong').textContent(),titles[key]);
   assert.ok((await lounge.locator('#living-record-dialog [data-living-draft] span').textContent()).includes(handles[key]));
   await lounge.getByRole('button',{name:'部屋の記録を閉じる',exact:true}).click();
   await lounge.locator('.living-copy-history').click();await lounge.locator('#desk-history-dialog[open]').waitFor();
   assert.equal(await lounge.locator('#desk-history-list details').count(),1,'copy history is current-account scoped');
   assert.equal(await lounge.locator('#desk-history-list pre').textContent(),bodies[key]);
   await lounge.locator('#desk-history-close').click();assert.equal(await lounge.locator('.living-copy-history').evaluate(n=>n===document.activeElement),true);
   await lounge.locator('.living-reader-return').click();
   assert.equal(await lounge.locator('#desk').evaluate(n=>n===window.__hostPaper&&!n.inert&&document.getElementById('draft-body')===window.__hostBody),true);
   assert.equal(await lounge.locator('#draft-body').textContent(),bodies[key]);assert.equal(await lounge.locator('#desk-scroll').evaluate(n=>n.scrollTop),scroll);
   await openStorybookOverview(lounge);await lounge.locator('.account-board:not([hidden])').waitFor();
   assert.equal(await lounge.locator('[data-story-instant='+key+']').evaluate(n=>n===document.activeElement),true);
   publishingResults.push({key,handle:handles[key],reader,exactCopy:true,accountLocalNotes:true,scrollRetained:scroll});
  }
  await lounge.locator('[data-story-instant=sourcing]').click();await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
  assert.equal(await page.locator('#ccCastleFrame').isVisible(),false);assert.equal(await page.locator('#mainWindow').getAttribute('data-cc-view'),'sourcing');
  await page.waitForFunction(()=>document.querySelector('#sourcingHub'));await page.evaluate(()=>document.fonts.ready);
  // Native and chapter share the original layered SVG scene, not a new bitmap
  // wallpaper. The phone work page deliberately hides this decoration so the
  // real ledger starts in the first fold; its attached source must still decode.
  const nativeArt=page.locator('.story-workspace-art .story-paper-art[data-story-room=sourcing]');await nativeArt.waitFor({state:'attached'});
  const nativeActor=nativeArt.locator('.story-actor-image');await nativeActor.waitFor({state:'attached'});await nativeActor.evaluate(image=>image.decode());
  assert.equal(await nativeArt.getAttribute('aria-hidden'),'true');assert.ok(await nativeArt.locator('svg').count());
  assert.match(await nativeActor.getAttribute('src'),/storybook-sourcing-actor-v1\.webp/);assert.equal(await nativeActor.evaluate(image=>image.complete&&image.naturalWidth>0),true);
  assert.equal(await nativeArt.isVisible(),width>600,'native illustration is visible on Fold/desktop and intentionally hidden on phones');
  assert.equal(await nativeActor.isVisible(),width>600,'actor follows the native illustration visibility contract');
  // The existing native route opens purchases, not the candidate/hold tab.
  // Measure its exact seeded purchase record without forcing a different view.
  await page.locator('#sourcingBody .purchase-product > b').filter({hasText:/^検証用購入商品$/}).waitFor();
  const initialWork=await page.evaluate(()=>{
   const stage=document.querySelector('.story-workspace-art'),tabs=[...document.querySelectorAll('#sourcingTabs button[data-sourcing-sub]')].filter(n=>n.checkVisibility());
   const selected=tabs.filter(n=>n.classList.contains('selected')),tab=selected.find(n=>n.dataset.sourcingSub==='purchases'),rect=tab?.getBoundingClientRect(),hit=rect&&document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   const information=[...document.querySelectorAll('#ledgerProfitSummary .purchase-paid-line > span')].filter(n=>n.checkVisibility()&&n.textContent.trim()==='1注文 · 2点').map(n=>({text:n.textContent.trim(),rect:n.getBoundingClientRect().toJSON()}));
   return {stageVisible:!!stage?.checkVisibility(),decorative:stage?.inert&&stage?.getAttribute('aria-hidden')==='true',selectedTabs:selected.map(n=>n.dataset.sourcingSub),tab:{key:tab?.dataset.sourcingSub,rect:rect?.toJSON(),hit:hit===tab||!!tab?.contains(hit)},information,viewport:innerHeight,scrollY};
  });
  assert.equal(initialWork.decorative,true,'the native illustration remains inert and out of the accessibility tree');
  assert.equal(initialWork.stageVisible,width>600);
  assert.deepEqual(initialWork.selectedTabs,['purchases'],'instant entry keeps the canonical selected native purchase ledger');
  assert.ok(initialWork.tab.key&&initialWork.tab.rect?.width>=44&&initialWork.tab.rect.height>=44,'real native sourcing tab remains a 44px action: '+JSON.stringify(initialWork));
  if(width<=600)assert.ok(initialWork.scrollY===0&&initialWork.tab.rect.top>=0&&initialWork.tab.rect.bottom<=initialWork.viewport&&initialWork.tab.rect.left>=0&&initialWork.tab.rect.right<=width&&initialWork.tab.hit&&initialWork.information.some(n=>n.rect.height>0&&n.rect.top>=0&&n.rect.bottom<=initialWork.viewport&&n.rect.left>=0&&n.rect.right<=width),'phone instant entry must expose the full unobstructed purchase tab and exact record-derived 1-order/2-unit summary before scrolling: '+JSON.stringify(initialWork));
  const geometry=await page.locator('#loungeWorkspaceHeader').evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...n.querySelectorAll('button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height,left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right})),background:getComputedStyle(document.body).backgroundImage,sceneCount:document.querySelectorAll('.story-workspace-art .story-paper-art[data-story-room=sourcing]').length,actor:document.querySelector('.story-workspace-art .story-actor-image')?.src}));
  assert.equal(geometry.overflow,false);
  // All five working chapters remain visible together. Auxiliary controls may
  // occupy their deliberate horizontal strip, but each focused real action
  // must become fully visible/hit-testable without scrolling the document.
  const primary=page.locator('#loungeWorkspaceHeader [data-working-chapter]');assert.equal(await primary.count(),5);
  assert.ok(await primary.evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})));
  const headerScroll=await page.evaluate(()=>({x:scrollX,y:scrollY})),reachable=[];
  for(const action of await page.locator('#loungeWorkspaceHeader button').all()){
   await action.focus();reachable.push(await action.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{text:n.textContent,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:innerHeight,focused:n===document.activeElement,hit:hit===n||n.contains(hit)};}));
   assert.deepEqual(await page.evaluate(()=>({x:scrollX,y:scrollY})),headerScroll,'revealing a native header control scrolls only its own strip');
  }
  assert.ok(reachable.every(b=>b.width>=44&&b.height>=44&&b.left>=0&&b.right<=width+1&&b.top>=0&&b.bottom<=b.viewport&&b.focused&&b.hit),JSON.stringify(reachable));geometry.focusReachable=reachable;
  assert.equal(geometry.sceneCount,1);assert.match(geometry.actor,/storybook-sourcing-actor-v1\.webp/);assert.doesNotMatch(geometry.background,/castle-interior|sourcing-desk-actor/);
  await page.screenshot({path:path.join(out,`${width}-${height}-sourcing.png`)});
  await page.locator('[data-lounge-tools]').click();await page.locator('.rpg-workspace-dialog[open]').waitFor();await page.locator('.rpg-workspace-dialog[open]>button').click();
  await page.locator('[data-lounge-home]').click();await lounge.locator('.account-board:not([hidden])').waitFor();assert.equal(await lounge.locator('[data-story-instant=sourcing]').evaluate(n=>n===document.activeElement),true);
  assert.deepEqual(requested.filter(url=>/castle-interior-sourcing-v1\.webp|\/sourcing-desk-actor\.webp/.test(url)),[],'native notebook must not fetch retired workshop artwork');
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);assert.deepEqual(await page.evaluate(()=>__rpgQA.writes),[]);assert.deepEqual(await page.evaluate(()=>__rpgQA.threads.simulatedWrites),[]);
  const sourceUnchanged=await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(x=>x.id>=901&&x.id<=904))===__unifiedQA.original);assert.equal(sourceUnchanged,true);
  results.push({width,height,presentation:'storybook',publishingResults,geometry,initialWork,sourceUnchanged,errors,writes:0});await context.close();
 }fs.writeFileSync(path.join(out,'native-results.json'),JSON.stringify(results,null,2));console.log('PASS storybook native notebook: real host loader, five home identities, four source/copy/favorite/history/scroll journeys, immediate sourcing route, original ledger/settings/back, responsive controls and zero fixture writes.');}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
