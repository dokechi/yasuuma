/* New DEFAULT storybook in the real production host. Synthetic data only.
   No iframe URL substitution, production login, remote request or source write. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/paper');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery','tanaka'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿',tanaka:'田中卓の保存原稿'};
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
for(let i=0;i<26;i++)rows.push({...rows[0],id:1100+i,eventKey:'extra-'+i,title:'検証原稿 '+i,occurredAt:'2026-10-29T08:00:00Z'});
if(process.env.PAPER_EIGHT)for(const [i,key]of ['qa-a','qa-b'].entries())rows.push({...rows[0],id:2100+i,taskId:key+'-threads-v1',eventKey:'shared-source',title:'検証カテゴリ '+key,payload:{draft:key+' 固有本文',review_status:'検証用'}});
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
  if(process.env.PAPER_EIGHT&&relative==='/command-center-98/lounge/accounts.js')content=bytes.toString().replace('...[6].map',"{key:'qa-category-a',place:'qa-a',name:'検証カテゴリA',taskId:'qa-a-threads-v1'}, {key:'qa-category-b',place:'qa-b',name:'検証カテゴリB',taskId:'qa-b-threads-v1'}, ...[6].map");
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(content);
 });
});
// Test only synthetic records in a fresh isolated browser. No production data.
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.PAPER_BROWSER?{executablePath:process.env.PAPER_BROWSER}:{channel:'chromium'}),headless:true,args:['--no-sandbox']});
 const results=[];
 try{for(const [width,height] of (process.env.PAPER_WIDTH?[[Number(process.env.PAPER_WIDTH),Number(process.env.PAPER_HEIGHT||900)]]:[[320,640],[390,900],[800,648],[1440,900]])){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=800,reducedMotion:process.env.PAPER_MOTION==='normal'?'no-preference':'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const r=route.request();if(process.env.PAPER_NO_ART&&new URL(r.url()).pathname.endsWith('/storybook-art.js'))return route.abort();if(new URL(r.url()).origin===origin&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({url:r.url(),method:r.method()});return route.abort();});
  const result={width,height,checks:[],errors,blocked};results.push(result);
  function check(name,ok,detail){result.checks.push({name,pass:!!ok,detail});assert.ok(ok,name+': '+JSON.stringify(detail));}
  try{
   await page.goto(origin+'/command-center-98/app-v130.html');
   await page.waitForFunction(()=>window.CCCastle?.unified);
   const f=page.frameLocator('#ccCastleFrame');await f.locator('.paper-card').first().waitFor();
   const cf=page.frames().find(f=>new URL(f.url()).pathname.endsWith('/lounge/index.html'));
   await cf.waitForFunction(()=>document.querySelectorAll('.paper-card').length===20&&document.querySelector('.paper-state').textContent.includes('件'));
   await cf.evaluate(async()=>{window.__paperOwner=await import('./app.js?v=20261102.2-paper');});
   const original=await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events));
   check('correct initial category and no automatic open',await cf.evaluate(()=>document.getElementById('room').dataset.account==='insurance'&&!__paperStage.snapshot().opened));
   check('initial actual title and excerpt visible',await f.locator('.paper-title').first().isVisible()&&await f.locator('.paper-excerpt').first().isVisible());
   check('no initial semantic records',await cf.evaluate(()=>Object.keys(localStorage).filter(k=>/^castle-production\.v1\.(?:visited:|visit:|copy:|seen:|done:|future:)/.test(k)).length===0));
   const geometry=await cf.evaluate(()=>({width:document.documentElement.scrollWidth,client:innerWidth,tabs:[...document.querySelectorAll('.paper-tab')].map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height})),body:parseFloat(getComputedStyle(document.querySelector('.paper-excerpt')).fontSize)}));
   check('no page horizontal overflow; readable text and tap areas',geometry.width<=geometry.client+1&&geometry.tabs.every(t=>t.font>=16&&t.height>=44)&&geometry.body>=16,geometry);
   if(process.env.PAPER_EIGHT)check('8 categories remain accessible in the same scrollable header',geometry.tabs.length===8&&await cf.evaluate(()=>{const nav=document.querySelector('.paper-tabs');return nav.scrollWidth<=nav.clientWidth+1||getComputedStyle(nav).overflowX==='auto';}));
   await page.screenshot({path:path.join(out,width+'-'+height+'-closed.png')});
   await f.locator('.paper-tab').first().focus();const tabHits=[];for(let i=0;i<geometry.tabs.length;i++){if(i)await page.keyboard.press('ArrowRight');tabHits.push(await cf.evaluate(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),b=n.closest('.paper-tabs').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=44&&r.width>=44&&r.left>=b.left-1&&r.right<=b.right+1&&r.top>=-1&&r.bottom<=innerHeight+1&&(hit===n||n.contains(hit));}));}
   check('every category is keyboard reachable with an in-viewport unobstructed hit target',tabHits.every(Boolean),tabHits);
   const paperHits=[];for(let i=0;i<5;i++)for(const selector of ['.paper-pin','.paper-open']){const target=f.locator('.paper-card').nth(i).locator(selector);await target.scrollIntoViewIfNeeded();paperHits.push(await target.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {ok:r.height>=44&&r.width>=44&&r.top>=-1&&r.bottom<=innerHeight+1&&(hit===n||n.contains(hit)),rect:r.toJSON(),hit:hit?.outerHTML.slice(0,200),selector:n.className};}));}
   check('five paper pins and openers retain real unobstructed 44px targets',paperHits.every(x=>x.ok),paperHits);
   const first=f.locator('.paper-card').first(),id=await first.getAttribute('data-paper-id'),pin=first.locator('.paper-pin');
   await pin.click();await pin.waitFor({state:'visible'});check('future pin persists separately',await cf.evaluate(id=>{const keys=Object.keys(localStorage);return keys.some(k=>k.startsWith('castle-production.v1.future:')&&k.includes(id))&&!keys.some(k=>k==='castle-production.v1.pin:'+id||k==='castle-production.v1.done:'+id);},id));
   await first.locator('.paper-open').scrollIntoViewIfNeeded();const before=await first.boundingBox();await first.locator('.paper-open').click();
   await f.locator('.paper-reader #draft-body').waitFor({state:'visible'});
   const live=await cf.evaluate(()=>({id:document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId,body:document.getElementById('draft-body').textContent,count:document.querySelectorAll('#desk').length}));
   check('opens exact live reader on clicked paper',live.id===id&&live.body.includes('insurance')&&live.count===1,live);
   await page.screenshot({path:path.join(out,width+'-'+height+'-open.png')});
   await f.locator('#desk-copy').click();await cf.waitForFunction(()=>document.getElementById('desk-operation').textContent.includes('コピー'));
   check('existing copy action still works',await cf.evaluate(()=>document.getElementById('desk-operation').textContent.includes('コピー')));
   await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
   const after=await f.locator('[data-paper-id="'+id+'"]').boundingBox();check('close restores paper geometry',Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2,{before,after});
   await f.locator('.paper-future').click();check('future filter isolates this manuscript',await f.locator('.paper-card').count()===1);await f.locator('.paper-future').click();
   await f.locator('.paper-more').click();check('all manuscripts remain accessible',await f.locator('.paper-card').count()>=27);
   await f.locator('[data-paper-chapter=tanaka]').click();await cf.waitForFunction(()=>document.getElementById('room').dataset.account==='tanaka');await f.locator('.paper-title').first().waitFor();
   check('exact Tanaka category maintained',await f.locator('.paper-title').first().textContent()==='田中卓の保存原稿');
   if(process.env.PAPER_EIGHT)for(const suffix of ['a','b']){
    await f.locator('[data-paper-chapter=qa-category-'+suffix+']').click();await cf.waitForFunction(s=>document.getElementById('room').dataset.account==='qa-category-'+s,suffix);
    const pin=f.locator('.paper-pin').first();check('new category '+suffix+' has independent future mark',await pin.getAttribute('aria-pressed')==='false');await pin.click();await f.locator('.paper-open').first().click();
    check('new category '+suffix+' activates and reads its exact source',await f.locator('.paper-reader #draft-body').textContent()==='qa-'+suffix+' 固有本文');await f.locator('.paper-close').click();
    check('new category '+suffix+' closes to its own pinned paper',await pin.getAttribute('aria-pressed')==='true'&&!await f.locator('.paper-reader').count());
   }
   await f.locator('[data-paper-chapter=insurance]').click();await f.locator('.paper-card').first().waitFor();
   await f.locator('.paper-card').first().locator('.paper-open').click();await page.keyboard.press('Escape');check('Escape closes only the opened manuscript',!await f.locator('.paper-reader').count());
   await f.locator('.paper-search').click();await f.locator('#hall-dialog').waitFor({state:'visible'});await f.locator('#hall-close').click();
   await f.locator('.paper-tools summary').click();await f.locator('.paper-tools-menu button').filter({hasText:'設定'}).click();await f.locator('#settings').waitFor({state:'visible'});await f.locator('#settings-close').click();
   await f.locator('[data-paper-chapter=sourcing]').click();await page.locator('#ccCastleFrame').waitFor({state:'hidden'});
   check('sourcing opens its retained native ledger',await page.evaluate(()=>sourcingApp.sub==='purchases'&&!document.getElementById('ccCastleReturn').hidden));
   await page.locator('[data-lounge-home]').click();await f.locator('.paper-header').waitFor({state:'visible'});
   await f.locator('[data-paper-chapter=insurance]').click();await f.locator('.paper-card').first().waitFor();
   check('real source records unchanged and zero source writes',await page.evaluate(original=>JSON.stringify(__rpgQA.threads.events)===original&&__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0,original));
   check('no browser errors or unexpected external transport',errors.length===0&&blocked.length===0,{errors,blocked});
   result.status='passed';
  }catch(e){result.status='failed';result.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,width+'-'+height+'-failure.png')});}
  finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();}
 }}finally{await browser.close();server.close();}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
