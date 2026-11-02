/* New DEFAULT storybook in the real production host. Synthetic data only.
   No iframe URL substitution, production login, remote request or source write. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.PAPER_OUT||'artifacts/paper');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const accounts=['insurance','otoku','rakuten','lottery','tanaka'];
const titles={insurance:'保険の保存原稿 一',otoku:'お得の保存原稿',rakuten:'楽天犬の保存原稿',lottery:'抽選の保存原稿',tanaka:'田中卓の保存原稿'};
// Synthetic versions of the line-break patterns in the user screenshot.
const previewTitles=['左右の目でも手術給付は1回の例','年払いの残りは契約日で返金が違う','80歳と90歳で払込総額が逆転'];
const previewBody='暮らしに合った選び方を考えるときは、毎月の金額だけでなく、必要な条件と続けやすさを一緒に確認します。気になった項目を残しておき、元の資料と照らし合わせながら読み返せる原稿です。';
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:key==='insurance'?previewTitles[0]:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:955,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
for(let i=0;i<26;i++)rows.push({...rows[0],id:1100+i,eventKey:'extra-'+i,title:previewTitles[(i+1)%previewTitles.length]+'（検証'+i+'）',occurredAt:'2026-10-29T08:00:00Z'});
for(const row of rows)row.payload={...row.payload,draft:previewBody+'\n\n対象になる条件を読むときは、使い始める時期や手続きの流れにも目を向けます。見出しで分かりにくかった部分は、本文の説明と元の資料を行き来しながら確かめます。\n\n確認した内容は、あとで比べられる形で残しておくと便利です。すぐに結論を出さず、いまの暮らしに必要かどうかを考えるための原稿です。\n\n'+row.taskId+' の合成検証用本文です。'};

if(process.env.PAPER_EIGHT)for(const [i,key]of ['qa-a','qa-b'].entries())rows.push({...rows[0],id:2100+i,taskId:key+'-threads-v1',eventKey:'shared-source',title:'検証カテゴリ '+key,payload:{draft:key+' 固有本文',review_status:'検証用'}});
if(process.env.PAPER_SHORT)for(const row of rows.filter(r=>r.id<2100)){row.title=row.taskId.startsWith('tanaka')?titles.tanaka:'短い原稿 '+row.id;row.payload={...row.payload,draft:'短い原稿の確認です。\n\n'+row.taskId+' の検証用本文'};}
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
 try{for(const [width,height] of (process.env.PAPER_WIDTH?[[Number(process.env.PAPER_WIDTH),Number(process.env.PAPER_HEIGHT||900)]]:[[800,900],[320,640],[390,900],[800,648],[800,800],[1440,900]])){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=800,reducedMotion:process.env.PAPER_MOTION==='normal'?'no-preference':'reduce',serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(()=>{window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.channel==='cc-castle-v1'&&event.data.type==='records')window.__paperDetailRecords=structuredClone(event.data);});});
  const page=await context.newPage(),errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const r=route.request();if(process.env.PAPER_NO_ART&&new URL(r.url()).pathname.endsWith('/storybook-art.js'))return route.abort();if(new URL(r.url()).origin===origin&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({url:r.url(),method:r.method()});return route.abort();});
  const result={width,height,scenario:process.env.PAPER_SHORT?'short':'long',checks:[],errors,blocked};results.push(result);
  function check(name,ok,detail){result.checks.push({name,pass:!!ok,detail});assert.ok(ok,name+': '+JSON.stringify(detail));}
  try{
   await page.goto(origin+'/command-center-98/app-v130.html');
   await page.waitForFunction(()=>window.CCCastle?.unified);
   const f=page.frameLocator('#ccCastleFrame');await f.locator('.paper-card').first().waitFor();
   const cf=page.frames().find(f=>new URL(f.url()).pathname.endsWith('/lounge/index.html'));
   await cf.waitForFunction(()=>document.querySelectorAll('.paper-card').length===20&&document.querySelector('.paper-state').textContent.includes('件'));
   await cf.evaluate(async()=>{window.__paperOwner=await import('./app.js?v=20261102.2-paper');});
   const pinClear=async label=>{
    const report=await f.locator('.paper-card').evaluateAll(nodes=>{
     const collisions=[],categories=[],overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5;
     for(const [index,card] of nodes.slice(0,5).entries()){
      const pin=card.querySelector('.paper-pin').getBoundingClientRect();
      for(const n of card.querySelectorAll('.paper-category,.paper-title,.paper-excerpt,.paper-open,.paper-close,#draft-title,#draft-body')){
       const box=n.getBoundingClientRect();if(!box.width||!box.height)continue;
       // Category is a full-width block with reserved right padding. Probe its
       // actual text Range, not the deliberately empty pin reservation.
       const range=document.createRange();range.selectNodeContents(n);const glyphs=[...range.getClientRects()].filter(r=>r.width&&r.height);
       if(n.classList.contains('paper-category'))categories.push({index,block:box.toJSON(),glyphs:glyphs.map(r=>r.toJSON()),pin:pin.toJSON()});
       const tested=n.classList.contains('paper-category')?glyphs:[box];
       if(tested.some(rect=>overlaps(pin,rect)))collisions.push({index,element:n.id||n.className,pin:pin.toJSON(),text:box.toJSON(),glyphs:glyphs.map(r=>r.toJSON())});
      }
     }
     return {collisions,categories};
    });
    check(label,report.collisions.length===0,report);
   };
   const original=await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events));
   check('correct initial category and no automatic open',await cf.evaluate(()=>document.getElementById('room').dataset.account==='insurance'&&!__paperStage.snapshot().opened));
   check('initial actual title and excerpt visible',await f.locator('.paper-title').first().isVisible()&&await f.locator('.paper-excerpt').first().isVisible());
   check('no initial semantic records',await cf.evaluate(()=>Object.keys(localStorage).filter(k=>/^castle-production\.v1\.(?:visited:|visit:|copy:|seen:|done:|future:)/.test(k)).length===0));
   const geometry=await cf.evaluate(()=>({width:document.documentElement.scrollWidth,client:innerWidth,tabs:[...document.querySelectorAll('.paper-tab')].map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height})),body:parseFloat(getComputedStyle(document.querySelector('.paper-excerpt')).fontSize)}));
   check('no page horizontal overflow; readable text and tap areas',geometry.width<=geometry.client+1&&geometry.tabs.every(t=>t.font>=16&&t.height>=44)&&geometry.body>=16,geometry);
   if(process.env.PAPER_EIGHT)check('8 categories remain accessible in the same scrollable header',geometry.tabs.length===8&&await cf.evaluate(()=>{const nav=document.querySelector('.paper-tabs');return nav.scrollWidth<=nav.clientWidth+1||getComputedStyle(nav).overflowX==='auto';}));
   const previewFidelity=await cf.evaluate(()=>{const rows=__paperOwner.getPaperDesk().rows('insurance');return [...document.querySelectorAll('.paper-card')].map((card,index)=>{const row=rows.find(d=>d.id===card.dataset.paperId);return {id:card.dataset.paperId,title:card.querySelector('.paper-title').textContent===row?.title,excerpt:card.querySelector('.paper-excerpt').textContent===row?.body.slice(0,index===0?240:105)};});});
   check('preview formatting preserves exact source title and excerpt textContent',previewFidelity.every(x=>x.title&&x.excerpt),previewFidelity);
   if(!process.env.PAPER_SHORT){
    const safeWords=await f.locator('.paper-title .paper-word').evaluateAll(nodes=>nodes.filter(n=>['1回','契約日','払込総額'].includes(n.textContent)).map(n=>{const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()].filter(r=>r.width&&r.height),lineTops=[...new Set(rects.map(r=>Math.round(r.top)))];return {cardIndex:[...document.querySelectorAll('.paper-card')].indexOf(n.closest('.paper-card')),text:n.textContent,lines:lineTops.length,nowrap:getComputedStyle(n).whiteSpace==='nowrap',width:n.getBoundingClientRect().width,available:n.parentElement.clientWidth};}));
    check('1回, 契約日 and 払込総額 never split across rendered title lines',safeWords.length>0&&['1回','契約日','払込総額'].every(text=>safeWords.some(word=>word.text===text))&&safeWords.every(word=>word.lines===1&&word.nowrap&&word.width<=word.available),safeWords);
   }
   const completedRecords=await cf.evaluate(()=>structuredClone(window.__paperDetailRecords));
   await page.evaluate(()=>document.getElementById('ccCastleFrame').contentWindow.postMessage({channel:'cc-castle-v1',type:'status',loading:true,message:'検証用の更新を読み込み中'},location.origin));
   await cf.waitForFunction(()=>document.querySelector('.paper-state').textContent==='取得済み原稿を表示中 · 最新の原稿・履歴・仕入れを読み込み中…');
   check('available source papers remain shown while status explains pending updates without a completed total',await f.locator('.paper-card').count()===20&&!/\d+件|完了|ありません/.test(await f.locator('.paper-state').textContent()));
   await f.locator('.paper-future').click();
   check('empty future filter during refresh does not misreport an empty source set',await f.locator('.paper-card').count()===0&&(await f.locator('.paper-state').textContent()).startsWith('取得済み原稿を表示中'));
   await f.locator('.paper-future').click();
   await page.evaluate(records=>document.getElementById('ccCastleFrame').contentWindow.postMessage(records,location.origin),completedRecords);
   await cf.waitForFunction(()=>document.querySelector('.paper-state').textContent.includes('件'));

   const mainBalance=await f.locator('.paper-card').first().evaluate(n=>{const excerpt=n.querySelector('.paper-excerpt').getBoundingClientRect(),opener=n.querySelector('.paper-open').getBoundingClientRect();return {gap:opener.top-excerpt.bottom,height:n.getBoundingClientRect().height,excerptHeight:excerpt.height,openerHeight:opener.height};});
   check('main opening action follows actual excerpt by 24–40px at every viewport',mainBalance.gap>=24&&mainBalance.gap<=40,{...mainBalance,short:!!process.env.PAPER_SHORT});
   if(width<=600){const gap=await f.locator('.paper-card').first().evaluate(n=>n.querySelector('.paper-open').getBoundingClientRect().top-n.querySelector('.paper-excerpt').getBoundingClientRect().bottom);check('phone opening action follows excerpt without dead space',gap>=23&&gap<=33,{gap,short:!!process.env.PAPER_SHORT});}
   await page.screenshot({path:path.join(out,width+'-'+height+'-closed.png')});
   await pinClear('every 44px pin target has reserved space before selection');
   for(let i=0;i<5;i++){const pin=f.locator('.paper-card').nth(i).locator('.paper-pin');await pin.click();await pinClear('pin selected without covering text '+i);await pin.click();await pinClear('pin cleared without covering text '+i);}
   const foreground=await f.locator('.paper-card').evaluateAll(nodes=>[3,4].map(i=>{const card=nodes[i],button=card.querySelector('.paper-open'),rect=button.getBoundingClientRect(),svg=card.querySelector(i===3?'.paper-sculpture:not(.paper-sculpture-front)':'.paper-sculpture-front'),paths=[...svg.querySelectorAll('path')].filter(p=>i===3?(p.getAttribute('fill')||'').endsWith('-paper)'):getComputedStyle(p).fill!=='none'),point=new DOMPoint(rect.x+rect.width/2,rect.y+rect.height/2).matrixTransform(svg.getScreenCTM().inverse());return {index:i,onSurface:paths.some(p=>p.isPointInFill(point)),horizontal:getComputedStyle(button).transform==='none'&&getComputedStyle(card.querySelector('.paper-leaf')).transform==='none',transparent:getComputedStyle(button).backgroundColor==='rgba(0, 0, 0, 0)'};}));
   check('foreground controls are horizontal transparent actions on their own paper surfaces',foreground.every(x=>x.onSurface&&x.horizontal&&x.transparent),foreground);
   const excerptClearance=await f.locator('.paper-card').evaluateAll(nodes=>[1,2,4].map(i=>{const card=nodes[i],svg=card.querySelector('.paper-sculpture-front'),rect=card.querySelector('.paper-excerpt').getBoundingClientRect(),matrix=svg.getScreenCTM().inverse(),paths=[...svg.querySelectorAll('path')].filter(p=>getComputedStyle(p).fill!=='none');const points=[[rect.left+2,rect.top+2],[rect.right-2,rect.top+2],[rect.left+2,rect.bottom-2],[rect.right-2,rect.bottom-2]];return {index:i,clear:points.every(([x,y])=>!paths.some(p=>p.isPointInFill(new DOMPoint(x,y).matrixTransform(matrix)))),rect:rect.toJSON()};}));
   check('SVG pocket fronts do not obscure any preview excerpt',excerptClearance.every(x=>x.clear),excerptClearance);
   const previewFrontClearance=await f.locator('.paper-card').evaluateAll(nodes=>nodes.slice(0,5).flatMap((card,index)=>{const svg=card.querySelector('.paper-sculpture-front'),matrix=svg.getScreenCTM().inverse(),paths=[...svg.querySelectorAll('path')].filter(p=>getComputedStyle(p).fill!=='none');return [...card.querySelectorAll('.paper-title,.paper-excerpt')].map(n=>{const rect=n.getBoundingClientRect(),points=[];for(let y=rect.top+1;y<rect.bottom;y+=3)for(let x=rect.left+1;x<rect.right;x+=3)points.push(new DOMPoint(x,y).matrixTransform(matrix));return {index,element:n.className,clear:points.every(point=>!paths.some(p=>p.isPointInFill(point))),rect:rect.toJSON()};});}));
   check('no filled front SVG intersects a preview title or excerpt safe rectangle',previewFrontClearance.every(x=>x.clear),previewFrontClearance);
   await f.locator('.paper-tab').first().focus();const tabHits=[];for(let i=0;i<geometry.tabs.length;i++){if(i)await page.keyboard.press('ArrowRight');tabHits.push(await cf.evaluate(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),b=n.closest('.paper-tabs').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=44&&r.width>=44&&r.left>=b.left-1&&r.right<=b.right+1&&r.top>=-1&&r.bottom<=innerHeight+1&&(hit===n||n.contains(hit));}));}
   check('every category is keyboard reachable with an in-viewport unobstructed hit target',tabHits.every(Boolean),tabHits);
   await cf.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
   const initialScroll=await cf.evaluate(()=>window.scrollY),paperHits=[];
   for(let i=0;i<5;i++)for(const selector of ['.paper-pin','.paper-open']){
    const target=f.locator('.paper-card').nth(i).locator(selector);
    // Exercise genuine scrolling to the lower papers, not a bounding-box-only claim.
    await target.evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
    paperHits.push(await target.evaluate((n,index)=>{const r=n.getBoundingClientRect(),points=[];for(const x of [r.left+.5,r.left+r.width/2,r.right-.5])for(const y of [r.top+.5,r.top+r.height/2,r.bottom-.5]){const hit=document.elementFromPoint(x,y);points.push({x,y,clear:hit===n||n.contains(hit),hit:hit?.outerHTML.slice(0,140)});}return {index,ok:r.height>=44&&r.width>=44&&r.top>=0&&r.bottom<=innerHeight&&points.every(p=>p.clear),rect:r.toJSON(),scrollY:window.scrollY,points,selector:n.className};},i));
   }
   check('five paper pins and openers retain real unobstructed 44px targets',paperHits.every(x=>x.ok),paperHits);
   check('lower actions are reached by real page scrolling with their entire targets exposed',paperHits.filter(x=>x.index>=3).every(x=>x.ok)&&paperHits.filter(x=>x.index>=3).some(x=>x.scrollY>initialScroll),{initialScroll,lower:paperHits.filter(x=>x.index>=3)});
   const anchors=[];for(let i=0;i<5;i++){const card=f.locator('.paper-card').nth(i),opener=card.locator('.paper-open');await card.scrollIntoViewIfNeeded();await opener.scrollIntoViewIfNeeded();const before=await card.boundingBox(),frontBefore=await card.locator('.paper-sculpture-front').boundingBox();await opener.click();const frontDuring=await card.locator('.paper-sculpture-front').boundingBox();check('pocket front stays fixed during open '+i,Math.abs(frontBefore.x-frontDuring.x)<2&&Math.abs(frontBefore.y-frontDuring.y)<2&&Math.abs(frontBefore.height-frontDuring.height)<2);await pinClear('opened paper pin stays clear of heading body and close '+i);await f.locator('.paper-reader').evaluate(n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));const after=await card.boundingBox();anchors.push({index:i,before,after,kept:Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2});await f.locator('.paper-close').click();await pinClear('closed paper pin returns to reserved space '+i);}
   check('all five paper forms open at their original anchors',anchors.every(x=>x.kept),anchors);
   const first=f.locator('.paper-card').first(),id=await first.getAttribute('data-paper-id'),pin=first.locator('.paper-pin');
   await pin.click();await pin.waitFor({state:'visible'});check('future pin persists separately',await cf.evaluate(id=>{const keys=Object.keys(localStorage);return keys.some(k=>k.startsWith('castle-production.v1.future:')&&k.includes(id))&&!keys.some(k=>k==='castle-production.v1.pin:'+id||k==='castle-production.v1.done:'+id);},id));
   await first.locator('.paper-open').scrollIntoViewIfNeeded();const before=await first.boundingBox();await first.locator('.paper-open').click();
   await f.locator('.paper-reader #draft-body').waitFor({state:'visible'});await f.locator('.paper-reader').evaluate(async n=>{await Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const openAnchor=await first.boundingBox();check('opened manuscript keeps its original paper anchor',Math.abs(before.x-openAnchor.x)<2&&Math.abs(before.y-openAnchor.y)<2,{before,openAnchor});
   const live=await cf.evaluate(()=>({source:__paperOwner.getPaperDesk().rows('insurance').find(d=>d.id===document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId)?.body,id:document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId,body:document.getElementById('draft-body').textContent,count:document.querySelectorAll('#desk').length}));
   check('one visible manuscript heading and one close action',await cf.evaluate(()=>{const card=document.querySelector('[data-paper-open=true]'),visible=n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0;return [card.querySelector('.paper-title'),card.querySelector('#draft-title')].filter(visible).length===1&&[card.querySelector('.paper-open'),card.querySelector('.paper-close')].filter(visible).length===1;}));
   check('opens exact live reader on clicked paper',live.id===id&&live.body===live.source&&live.body.includes('insurance')&&live.count===1,live);
   check('open screenshot is settled and fully opaque',await f.locator('.paper-reader').evaluate(n=>getComputedStyle(n).opacity==='1'&&n.getAnimations().every(a=>a.playState!=='running')));await page.screenshot({path:path.join(out,width+'-'+height+'-open.png')});
   await f.locator('#desk-copy').click();await cf.waitForFunction(()=>document.getElementById('desk-operation').textContent.includes('コピー'));
   check('copied manuscript is byte-for-byte source text, without line-break helper characters',await cf.evaluate(async expected=>await navigator.clipboard.readText()===expected,live.source));
   check('existing copy action still works',await cf.evaluate(()=>document.getElementById('desk-operation').textContent.includes('コピー')));
   await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
   const after=await f.locator('[data-paper-id="'+id+'"]').boundingBox();check('close restores paper geometry',Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2,{before,after});
   await f.locator('.paper-future').click();check('future filter isolates this manuscript',await f.locator('.paper-card').count()===1);await f.locator('.paper-future').click();
   await f.locator('.paper-more').click();check('all manuscripts remain accessible',await f.locator('.paper-card').count()>=27);
   const continuationGeometry=await f.locator('.paper-card').evaluateAll(nodes=>nodes.slice(5).map((n,i)=>({index:i+5,rect:n.getBoundingClientRect().toJSON()})));
   const continuationOverlaps=continuationGeometry.flatMap((a,i)=>continuationGeometry.slice(i+1).filter(b=>Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>1&&Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>1).map(b=>[a.index,b.index]));
   check('continued source papers occupy separate readable grid cells, not inherited stage offsets',continuationOverlaps.length===0,{cards:continuationGeometry,overlaps:continuationOverlaps});
   const continuationHits=[];
   for(let i=5;i<await f.locator('.paper-card').count();i++)for(const selector of ['.paper-pin','.paper-open']){
    const target=f.locator('.paper-card').nth(i).locator(selector);await target.evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
    continuationHits.push(await target.evaluate((n,index)=>{const r=n.getBoundingClientRect(),points=[];for(const x of [r.left+.5,r.left+r.width/2,r.right-.5])for(const y of [r.top+.5,r.top+r.height/2,r.bottom-.5]){const hit=document.elementFromPoint(x,y);points.push(hit===n||n.contains(hit));}return {index,selector:n.className,rect:r.toJSON(),ok:r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&points.every(Boolean)};},i));
    if(i===5&&selector==='.paper-open')await page.screenshot({path:path.join(out,width+'-'+height+'-continued.png')});
   }
   check('every continued manuscript pin and opener is fully reachable after real scrolling',continuationHits.every(x=>x.ok),continuationHits);

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
   if(process.env.PAPER_EIGHT){await page.locator('#loungeWorkspaceHeader [data-working-chapter=qa-category-a]').click();await f.locator('[data-paper-chapter=qa-category-a][aria-current=page]').waitFor();check('native ledger header activates the added canonical category',await f.locator('.paper-title').first().textContent()==='検証カテゴリ qa-a');}
   else await page.locator('[data-lounge-home]').click();await f.locator('.paper-header').waitFor({state:'visible'});
   await f.locator('[data-paper-chapter=insurance]').click();await f.locator('.paper-card').first().waitFor();
   check('real source records unchanged and zero source writes',await page.evaluate(original=>JSON.stringify(__rpgQA.threads.events)===original&&__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0,original));
   check('no browser errors or unexpected external transport',errors.length===0&&blocked.length===0,{errors,blocked});
   result.status='passed';
  }catch(e){result.status='failed';result.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,width+'-'+height+'-failure.png')});}
  finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();}
 }}finally{await browser.close();server.close();}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
