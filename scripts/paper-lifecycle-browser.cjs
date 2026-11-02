/* New DEFAULT storybook in the real production host. Synthetic data only.
   No iframe URL substitution, production login, remote request or source write. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/paper-lifecycle');
let emptyFixture=false,authFixture='isolated-rpg-fixture',oldCacheFixture=false,oldCacheHits=0;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery','tanaka'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿',tanaka:'田中卓の保存原稿'};
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
for(let i=0;i<26;i++)rows.push({...rows[0],id:1100+i,eventKey:'extra-'+i,title:'検証原稿 '+i,occurredAt:'2026-10-29T08:00:00Z'});
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
 const parsed=new URL(req.url,'http://localhost'),relative=parsed.pathname,file=path.resolve(root,'.'+relative);
 if(oldCacheFixture&&/\/(?:storybook-atelier|spatial-atelier|arrival-atelier|arrival-entry)\.js$/.test(relative)&&parsed.search!=='?v=20261102.3-paper'){oldCacheHits++;return res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'public,max-age=86400,immutable'}).end("import './app.js?v=20261102.1-tanaka';");}
 if(oldCacheFixture&&/\/(?:paper-atelier\.js|paper-stage\.js|paper-stage\.css)$/.test(relative)&&['?v=20261102.2-paper','?v=20261102.3-depth'].includes(parsed.search)){oldCacheHits++;return res.writeHead(200,{'Content-Type':relative.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'public,max-age=86400,immutable'}).end(relative.endsWith('.css')?'body{--stale-paper:1}':"throw Error('Stale paper presentation executed');");}
 if(oldCacheFixture&&relative.endsWith('/app.js')&&parsed.search!=='?v=20261102.2-paper')return res.writeHead(200,{'Content-Type':'text/javascript'}).end("throw Error('Stale application owner executed');");
 if(relative==='/cache-seed.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Cache fixture</title>');
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,bytes)=>{
  if(error)return res.writeHead(404).end();let content=bytes;
  if(relative==='/command-center-98/app.html')content=bytes.toString().replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script><script>'+(emptyFixture?fixtureScript.replace('const rows='+JSON.stringify(rows)+';__rpgQA.threads.events.push(...rows);','const rows=[];__rpgQA.threads.events=[];'):fixtureScript)+'</script>');
  if(relative==='/scripts/ui-fixtures.js')content=bytes.toString().replace(/document\.addEventListener\('DOMContentLoaded',[\s\S]*?\n  \}\);/,'');
  if(relative==='/scripts/rpg-theme-fixtures.js')content=bytes.toString().replace('isolated-rpg-fixture',authFixture);
  if(process.env.PAPER_EIGHT&&relative==='/command-center-98/lounge/accounts.js')content=bytes.toString().replace('...[6].map',"{key:'qa-category-a',place:'qa-a',name:'検証カテゴリA',taskId:'qa-a-threads-v1'}, {key:'qa-category-b',place:'qa-b',name:'検証カテゴリB',taskId:'qa-b-threads-v1'}, ...[6].map");
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(content);
 });
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.PAPER_BROWSER?{executablePath:process.env.PAPER_BROWSER}:{channel:'chromium'}),headless:true,args:['--no-sandbox']});const results=[];
 const width=Number(process.env.PAPER_WIDTH||800),height=Number(process.env.PAPER_HEIGHT||648);
 async function setup(mode='normal'){
  emptyFixture=mode==='empty';authFixture='isolated-rpg-fixture';oldCacheFixture=mode==='cache';oldCacheHits=0;const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference',serviceWorkers:'block'}),page=await context.newPage(),appRequests=[],paperRequests=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.endsWith('/app.js'))appRequests.push(r.url());if(/\/paper-(?:atelier\.js|stage\.js|stage\.css|detail-model\.js)$/.test(u.pathname))paperRequests.push(r.url());});
  await context.addInitScript(()=>{window.__paperProbe={audio:0,motion:0,records:null};const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){__paperProbe.audio++;return play.apply(this,arguments);};for(const cls of ['OscillatorNode','AudioBufferSourceNode']){const proto=window[cls]?.prototype;if(proto?.start){const start=proto.start;proto.start=function(){__paperProbe.audio++;return start.apply(this,arguments);};}}const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.classList.contains('paper-reader'))__paperProbe.motion++;return animate.apply(this,args);};window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.channel==='cc-castle-v1'&&e.data.type==='records')__paperProbe.records=structuredClone(e.data);});});
  // Routing disables Chromium's HTTP cache. Cache coverage deliberately uses
  // real local HTTP responses, with all API traffic still fixture-intercepted.
  if(mode!=='cache')await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(mode==='css'&&u.pathname.endsWith('/paper-stage.css')||mode==='module'&&u.pathname.endsWith('/paper-atelier.js'))return route.abort();return u.origin===origin&&['GET','HEAD'].includes(r.method())?route.continue():route.abort();});
  if(mode==='cache'){await page.goto(origin+'/cache-seed.html');const seed=async()=>page.evaluate(async()=>{for(const file of ['storybook-atelier.js?v=20261102.1-tanaka','spatial-atelier.js?v=20261101.9-workbook','arrival-atelier.js?v=20261101.9-workbook','arrival-entry.js?v=20261101.9-workbook','paper-atelier.js?v=20261102.2-paper','paper-stage.js?v=20261102.2-paper','paper-stage.css?v=20261102.2-paper','paper-atelier.js?v=20261102.3-depth','paper-stage.js?v=20261102.3-depth','paper-stage.css?v=20261102.3-depth'])await(await fetch('/command-center-98/lounge/'+file)).text();});await seed();const fetched=oldCacheHits;await seed();assert.equal(oldCacheHits,fetched,'second bootstrap read must use actual HTTP cache');assert.equal(fetched,10,'four old bootstraps, three baseline paper assets and three prior production depth assets are genuinely cached before navigation');paperRequests.length=0;}
  await page.goto(origin+'/command-center-98/app-v130.html');await page.waitForFunction(()=>window.CCCastle?.unified);const f=page.frameLocator('#ccCastleFrame');await f.locator('body').waitFor({state:'attached'});const cf=page.frames().find(f=>new URL(f.url()).pathname.endsWith('/lounge/index.html'));await cf.waitForFunction(()=>__paperProbe.records?.complete===true);
  return {context,page,f,cf,appRequests,paperRequests};
 }
 const check=(name,ok,detail)=>{results.push({name,pass:!!ok,...(detail===undefined?{}:{detail})});assert.ok(ok,name);};
 try{
  const {context,page,f,cf}=await setup();
  await f.locator('.paper-card').first().waitFor();check('initial audio is silent',await page.evaluate(()=>__paperProbe.audio===0)&&await cf.evaluate(()=>__paperProbe.audio===0));
  const settings=async()=>{await f.locator('.paper-tools summary').click();await f.locator('.paper-tools-menu').getByRole('button',{name:'設定',exact:true}).click();await f.locator('#settings[open]').waitFor();};
  await settings();await f.locator('#reduce-setting').check();await f.locator('#settings-close').click();
  check('OS normal, application reduce ON suppresses paper WAAPI',await cf.evaluate(()=>!matchMedia('(prefers-reduced-motion:reduce)').matches&&document.getElementById('app').dataset.feedbackMotion==='reduced'));
  await f.locator('.paper-open').first().click();check('app reduction performs no opening animation',await cf.evaluate(()=>__paperProbe.motion===0));await f.locator('.paper-close').click();
  await settings();await f.locator('#reduce-setting').uncheck();await f.locator('#settings-close').click();
  await f.locator('.paper-open').first().focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  check('rapid Enter/Escape interrupts motion without a delayed reopen',await cf.evaluate(()=>!__paperStage.snapshot().opened&&document.querySelectorAll('#desk').length===1));
  await f.locator('.paper-open').first().click();check('normal application preference permits optional paper motion',await cf.evaluate(()=>__paperProbe.motion>0));
  const normalFont=await f.locator('#draft-body').evaluate(n=>parseFloat(getComputedStyle(n).fontSize));await settings();await f.locator('#desk-font').selectOption('large');await f.locator('#settings-close').click();
  check('large body setting overrides paper typography at this viewport',await f.locator('#draft-body').evaluate((n,before)=>parseFloat(getComputedStyle(n).fontSize)>before,normalFont));
  check('settings close restores visible menu summary focus',await f.locator('.paper-tools summary').evaluate(n=>{const r=n.getBoundingClientRect();return n===document.activeElement&&r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n;}));
  await f.locator('#desk-scroll').evaluate(n=>n.scrollTop=200);await f.locator('.paper-close').click();await f.locator('.paper-open').first().click();check('closing and reopening preserves the existing notebook reading position',await f.locator('#desk-scroll').evaluate(n=>n.scrollTop>=180));
  const oldBody=await f.locator('#draft-body').textContent(),payload=await cf.evaluate(()=>structuredClone(__paperProbe.records)),id=await cf.evaluate(()=>document.querySelector('#desk-list .manuscript-card[aria-pressed=true]').dataset.draftId);
  payload.drafts=payload.drafts.map(d=>d.id===id?{...d,body:d.body+'\n検証用の更新差分'}:d);
  const send=p=>page.evaluate(p=>document.getElementById('ccCastleFrame').contentWindow.postMessage(p,location.origin),p);
  await send({...payload,channel:'cc-castle-v1',type:'records'});await f.locator('#desk-pending').waitFor({state:'visible'});check('pending source receipt keeps currently open text',await f.locator('#draft-body').textContent()===oldBody);
  await f.locator('#desk-pending').click();check('explicit update alone applies pending source',await f.locator('#draft-body').textContent()===oldBody+'\n検証用の更新差分');await f.locator('.paper-close').click();
  await f.locator('.paper-open').first().click();await f.locator('.paper-search').click();await f.locator('#hall-query').fill('保険の保存原稿 二');await f.locator('#hall-results button').first().click();await f.locator('#hall-detail').getByRole('button',{name:'この原稿を開く',exact:true}).click();
  await cf.waitForFunction(()=>document.querySelector('.paper-reader')?.closest('[data-paper-id]')?.dataset.paperId===document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId);
  check('searching another same-category manuscript aligns paper title/body/exact ID',await cf.evaluate(()=>{const card=document.querySelector('.paper-reader').closest('.paper-card');return card.querySelector('.paper-title').textContent===document.getElementById('draft-title').textContent&&document.getElementById('draft-body').textContent.includes('insurance 二つ目');}));await f.locator('.paper-close').click();
  await send({channel:'cc-castle-v1',type:'status',loading:false,message:'保存原稿の読み込みに失敗しました。'});await cf.waitForFunction(()=>document.querySelector('.paper-state').textContent.includes('読取未確認'));check('failed read discloses uncertainty and preserves cached papers',await f.locator('.paper-card').count()>0);
  await cf.evaluate(()=>history.replaceState(null,''));const cdp=await context.newCDPSession(page),rootIndex=(await cdp.send('Page.getNavigationHistory')).currentIndex;
  await f.locator('[data-paper-chapter=tanaka]').click();await cf.waitForFunction(()=>document.getElementById('room').dataset.account==='tanaka');const forwardIndex=(await cdp.send('Page.getNavigationHistory')).currentIndex;
  await cf.evaluate(()=>history.back());await cf.waitForFunction(()=>document.getElementById('room').dataset.account==='tanaka'&&!history.state);await cf.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  check('real Back to null history does not push a replacement entry',(await cdp.send('Page.getNavigationHistory')).currentIndex===rootIndex&&await cf.evaluate(()=>history.state===null&&!__paperStage.snapshot().opened));
  await cf.evaluate(()=>history.forward());await cf.waitForFunction(()=>history.state?.shireitoAccount==='tanaka');check('real browser Forward restores Tanaka at its exact index',(await cdp.send('Page.getNavigationHistory')).currentIndex===forwardIndex&&await f.locator('[data-paper-chapter=tanaka]').getAttribute('aria-current')==='page');await cdp.detach();
  await settings();await f.locator('#storybook-fp').click();await f.locator('#room[data-account=fp] #draft-body').waitFor({state:'visible'});check('settings FP/TikTok entry retains readable real saved manuscript',!!(await f.locator('#draft-body').textContent()).trim()&&await f.locator('#desk-copy').isVisible());await page.screenshot({path:path.join(out,width+'-fp.png')});
  await f.locator('[data-paper-chapter=insurance]').click();await f.locator('.paper-card').first().waitFor();check('publishing category returns after FP',await f.locator('.paper-title').first().isVisible());
  await f.locator('.paper-pin').first().click();await f.locator('.paper-future').click();await f.locator('.paper-pin').first().click();await cf.waitForFunction(()=>document.querySelectorAll('.paper-card').length===0);
  check('unpinning final filtered paper restores a visible focus target',await f.locator('.paper-future').evaluate(n=>{const r=n.getBoundingClientRect();return document.activeElement===n&&r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n;}));await f.locator('.paper-future').click();await f.locator('.paper-pin').first().click();
  // Cached source cards may precede the new host's authenticated-scope receipt.
  // Assert persistence only after that real receipt and its live enabled control,
  // never by sleeping, retrying the expected aria value, or exposing the scope.
  const settledFutureScope=async()=>{
   const frame=page.frames().find(frame=>new URL(frame.url()).pathname.endsWith('/lounge/index.html'));
   const observe=()=>frame.evaluate(()=>{const pin=document.querySelector('.paper-pin'),records=window.__paperProbe.records;return {complete:records?.complete===true,scopeReady:typeof records?.pinScope==='string'&&/^[a-f0-9]{64}$/.test(records.pinScope),pinEnabled:!!pin&&!pin.disabled,pressed:pin?.getAttribute('aria-pressed')??null};});
   const before=await observe();
   if(!before.complete||!before.scopeReady||!before.pinEnabled)try{await frame.waitForFunction(()=>{const pin=document.querySelector('.paper-pin'),records=window.__paperProbe.records;return records?.complete===true&&typeof records.pinScope==='string'&&/^[a-f0-9]{64}$/.test(records.pinScope)&&!!pin&&!pin.disabled;});}catch(error){error.message+=' (initial scope observation: '+JSON.stringify(before)+')';throw error;}
   return {before,settled:await observe()};
  };
  await page.reload();await f.locator('.paper-card').first().waitFor();const sameScope=await settledFutureScope();check('reload restores the future mark in the same authenticated scope',await f.locator('.paper-pin').first().getAttribute('aria-pressed')==='true',sameScope);
  authFixture='isolated-other-fixture-session';await page.reload();await f.locator('.paper-card').first().waitFor();const otherScope=await settledFutureScope();check('different authenticated scope does not inherit future marks',await f.locator('.paper-pin').first().getAttribute('aria-pressed')==='false',otherScope);
  await context.close();
  for(const mode of ['empty','css','module','cache']){
   const {context,page,f,cf,appRequests,paperRequests}=await setup(mode);
   if(mode==='empty'){await cf.waitForFunction(()=>document.querySelector('.paper-state')?.textContent.includes('ありません'));check('complete empty read stays empty without sample manuscripts',await f.locator('.paper-card').count()===0);}
   else if(mode==='cache'){await f.locator('.paper-card').first().waitFor();check('every fresh paper dependency bypasses genuinely cached baseline and depth revisions',paperRequests.length>=4&&paperRequests.every(url=>new URL(url).search==='?v=20261102.4-detail')&&['paper-atelier.js','paper-stage.js','paper-stage.css','paper-detail-model.js'].every(file=>paperRequests.some(url=>new URL(url).pathname.endsWith('/'+file))));check('new paper cache revisions ignore prior cached paper code and styles',await cf.evaluate(()=>!getComputedStyle(document.body).getPropertyValue('--stale-paper').trim()&&document.querySelector('.paper-action-row')));check('stale cached bootstraps cannot start a second application owner',appRequests.length>0&&appRequests.every(url=>new URL(url).search==='?v=20261102.2-paper'));await f.locator('.paper-tools summary').click();await f.locator('.paper-tools-menu').getByRole('button',{name:'設定',exact:true}).click();await f.locator('#settings').getByRole('link',{name:'以前の城の表示を開く',exact:true}).click();await f.locator('.account-board').waitFor({state:'attached'});check('retained archive also avoids old cached application owners',appRequests.every(url=>new URL(url).search==='?v=20261102.2-paper'));}
   else{await f.locator('#draft-body').waitFor({state:'visible'});check('missing new '+mode+' retains existing readable source and copy control',(await f.locator('#draft-body').textContent()).includes('insurance')&&await f.locator('#desk-copy').isVisible());}
   await page.screenshot({path:path.join(out,width+'-'+mode+'.png')});check(mode+' source fixture has zero production writes',await page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0));await context.close();
  }
 }catch(error){results.push({name:'lifecycle failure',pass:false,detail:error.stack});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();server.close();console.log(JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
