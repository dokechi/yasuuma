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
const rows=[...accounts.map((key,i)=>({id:951+i,taskId:key+'-threads-v1',eventKey:'storybook-'+key,title:key==='insurance'?previewTitles[0]:titles[key],occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{draft:key+' の合成原稿です。保存条件と出典を確認します。\n\n'+'コピーだけで投稿済みにはしません。この原稿は同じ部屋の机から読み、履歴とお気に入りは既存の記録を使います。\n\n'.repeat(12),date:'2026-10-31',review_status:'検証専用の下書き',sources_note:'合成データ・送信不可'}})),{id:956,taskId:'insurance-threads-v1',eventKey:'storybook-insurance-two',title:'保険の保存原稿 二',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:'insurance 二つ目の合成原稿です。\n\n'+'別の原稿を選んでも出典IDとアカウントを保ちます。\n\n'.repeat(12),date:'2026-10-30',review_status:'検証専用の下書き'}}];
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
  if(method==='GET'&&url.searchParams.get('resource')==='threads-images'){if(${!!process.env.PAPER_IMAGES})return window.__paperTransport(input,options);return json({ok:true,id:url.searchParams.get('id'),accountKey:url.searchParams.get('accountKey'),manifest:{contract:'threads-post-images-v1',revision:0,images:[]},assets:[]});}
  if(${!!process.env.PAPER_IMAGES}&&method==='PATCH'&&JSON.parse(options.body||'{}').action==='threads_images_save')return window.__paperTransport(input,options);
  return previous(input,options);
 };
})();`;
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
 const relative=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,bytes)=>{
  if(error)return res.writeHead(404).end();let content=bytes;
  if(relative==='/command-center-98/app.html')content=bytes.toString().replace('<head>','<head><script>window.__paperTransport ||= window.fetch.bind(window)</script><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script><script>'+fixtureScript+'</script>');
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
  await context.addInitScript(()=>{window.__paperTransport=window.fetch.bind(window);window.__paperClipboardWrites=[];const nativeWrite=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=value=>{window.__paperClipboardWrites.push(value);return nativeWrite(value);};window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.channel==='cc-castle-v1'&&event.data.type==='records')window.__paperDetailRecords=structuredClone(event.data);});});
  const imageService=process.env.PAPER_IMAGES?await require('./paper-image-fixture.cjs').createImageFixture(rows):null;const page=await context.newPage(),errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(imageService&&u.pathname.endsWith('/functions/v1/command-center-retro-api')&&(r.method()==='OPTIONS'||u.searchParams.get('resource')==='threads-images'||r.method()==='PATCH'&&r.postDataJSON()?.action==='threads_images_save')){const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,PATCH,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});const response=await imageService.request(r.method(),r.url(),r.method()==='PATCH'?r.postDataJSON():undefined,r.headers());return route.fulfill({status:response.status,headers:{...cors,'Content-Type':'application/json'},body:JSON.stringify(response.body)});}if(process.env.PAPER_NO_ART&&u.pathname.endsWith('/storybook-art.js'))return route.abort();if(u.origin===origin&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({url:r.url(),method:r.method()});return route.abort();});
  const result={width,height,scenario:process.env.PAPER_SHORT?'short':'long',checks:[],errors,blocked};results.push(result);
  function check(name,ok,detail){result.checks.push({name,pass:!!ok,detail});assert.ok(ok,name+': '+JSON.stringify(detail));}
  try{
   let themePng;if(imageService){themePng=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=480;c.height=250;const x=c.getContext('2d');x.fillStyle='#e0eccb';x.fillRect(0,0,480,250);x.fillStyle='#bfd68d';x.beginPath();x.ellipse(240,270,300,100,0,0,Math.PI*2);x.fill();x.strokeStyle='#47796b';x.lineWidth=5;x.fillStyle='#fffdf4';x.beginPath();x.ellipse(240,110,86,50,0,0,Math.PI*2);x.fill();x.stroke();x.fillStyle='#07b2cb';x.beginPath();x.arc(240,110,32,0,Math.PI*2);x.fill();x.fillStyle='#234f46';x.beginPath();x.arc(240,110,15,0,Math.PI*2);x.fill();return c.toDataURL('image/png')});imageService.seed(951,'insurance',themePng);}
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
   await page.screenshot({path:path.join(out,width+'-'+height+'-loading-available.png')});
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
   const previewFlow=await f.locator('.paper-card').evaluateAll(nodes=>nodes.slice(0,5).map(n=>{const title=n.querySelector('.paper-title').getBoundingClientRect(),excerpt=n.querySelector('.paper-excerpt').getBoundingClientRect(),actions=n.querySelector('.paper-action-row').getBoundingClientRect();return {titleBeforeExcerpt:title.bottom<=excerpt.top+.5,excerptBeforeActions:excerpt.bottom<=actions.top+.5};}));
   check('one continuous notebook keeps every preview and action readable',previewFlow.every(x=>x.titleBeforeExcerpt&&x.excerptBeforeActions),previewFlow);
   check('article images are per manuscript with a readable absent/error fallback',await f.locator('.paper-card .paper-visual').count()===20&&await f.locator('.paper-card .paper-image-set').count()===20);
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
   const anchors=[];for(let i=0;i<5;i++){const card=f.locator('.paper-card').nth(i),opener=card.locator('.paper-open');await opener.scrollIntoViewIfNeeded();const before=await card.boundingBox(),title=await card.locator('.paper-title').textContent();await opener.click();await cf.waitForFunction(()=>__paperStage.snapshot().phase==='open');await pinClear('opened paper pin stays clear of heading body and close '+i);const after=await card.boundingBox();anchors.push({index:i,before,after,kept:Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2});check('same preview title remains visible once open '+i,await card.locator('.paper-title').isVisible()&&await card.locator('.paper-title').textContent()===title);await card.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);await pinClear('closed paper pin returns to reserved space '+i);}
   check('all first five articles open at their original anchors',anchors.every(x=>x.kept),anchors);
   const first=f.locator('.paper-card').first(),id=await first.getAttribute('data-paper-id'),pin=first.locator('.paper-pin');
   await pin.click();await pin.waitFor({state:'visible'});check('future pin persists separately',await cf.evaluate(id=>{const keys=Object.keys(localStorage);return keys.some(k=>k.startsWith('castle-production.v1.future:')&&k.includes(id))&&!keys.some(k=>k==='castle-production.v1.pin:'+id||k==='castle-production.v1.done:'+id);},id));
   await first.locator('.paper-open').scrollIntoViewIfNeeded();const before=await first.boundingBox();await first.locator('.paper-open').click();
   await f.locator('.paper-reader #draft-body').waitFor({state:'visible'});await cf.waitForFunction(()=>__paperStage.snapshot().phase==='open');await f.locator('.paper-reader').evaluate(async n=>{await Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const openAnchor=await first.boundingBox();check('opened manuscript keeps its original paper anchor',Math.abs(before.x-openAnchor.x)<2&&Math.abs(before.y-openAnchor.y)<2,{before,openAnchor});
   const live=await cf.evaluate(()=>({source:__paperOwner.getPaperDesk().rows('insurance').find(d=>d.id===document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId)?.body,id:document.querySelector('#desk-list .manuscript-card[aria-pressed=true]')?.dataset.draftId,body:document.getElementById('draft-body').textContent,count:document.querySelectorAll('#desk').length}));
   check('one visible manuscript heading and one close action',await cf.evaluate(()=>{const card=document.querySelector('[data-paper-open=true]'),visible=n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0;return [card.querySelector('.paper-title'),card.querySelector('#draft-title')].filter(visible).length===1&&[...new Set([card.querySelector('.paper-open'),card.querySelector('.paper-close')])].filter(visible).length===1;}));
   check('opens exact live reader on clicked paper',live.id===id&&live.body===live.source&&live.body.includes('insurance')&&live.count===1,live);
   check('open screenshot is settled and fully opaque',await f.locator('.paper-reader').evaluate(n=>getComputedStyle(n).opacity==='1'&&n.getAnimations().every(a=>a.playState!=='running')));await page.screenshot({path:path.join(out,width+'-'+height+'-open.png')});
   await f.locator('#desk-copy').click();await cf.waitForFunction(()=>document.getElementById('desk-operation').textContent.includes('コピー'));
   // Windows native clipboard reads LF as CRLF. Check the API payload exactly,
   // then allow only native newline conversion in the real clipboard readback.
   const copied=await cf.evaluate(async()=>({actual:await navigator.clipboard.readText(),written:window.__paperClipboardWrites.at(-1)}));
   check('clipboard write receives byte-for-byte source text without line-break helper characters',copied.written===live.source,{expectedLength:live.source.length,writtenLength:copied.written?.length});
   check('native clipboard preserves complete manuscript apart from OS newline conversion',copied.actual.replace(/\r\n/g,'\n')===live.source.replace(/\r\n/g,'\n'),{expectedLength:live.source.length,actualLength:copied.actual.length});
   check('existing copy action still works',await cf.evaluate(()=>document.getElementById('desk-operation').textContent.includes('コピー')));
   await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
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
    check('new category '+suffix+' activates and reads its exact source',await f.locator('.paper-reader #draft-body').textContent()==='qa-'+suffix+' 固有本文');await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
    const expected='qa-'+suffix+' 固有本文';
    await f.locator('.paper-open').first().click();await cf.waitForFunction(()=>__paperStage.snapshot().phase==='open');
    await f.locator('#desk-copy').click();await cf.waitForFunction(expected=>window.__paperClipboardWrites.at(-1)===expected&&document.getElementById('desk-operation').textContent.includes('コピー'),expected);
    check('new category '+suffix+' copies its complete independent source',await cf.evaluate(async expected=>await navigator.clipboard.readText()===expected,expected));
    await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
    await f.locator('.paper-search').click();await f.locator('#hall-query').fill('検証カテゴリ qa-'+suffix);await f.locator('#hall-results button').first().click();await f.locator('#hall-detail').getByRole('button',{name:'この原稿を開く',exact:true}).click();await cf.waitForFunction(()=>__paperStage.snapshot().phase==='open');
    check('new category '+suffix+' search reopens the matching paper title and source',await cf.evaluate(expected=>{const card=document.querySelector('.paper-reader').closest('.paper-card');return document.getElementById('draft-body').textContent===expected&&card.querySelector('.paper-title').textContent===document.getElementById('draft-title').textContent;},expected));
    await f.locator('.paper-close').click();await cf.waitForFunction(()=>!__paperStage.snapshot().opened);
    await f.locator('.paper-tools summary').click();await f.locator('.paper-tools-menu').getByRole('button',{name:'コピー履歴',exact:true}).click();await f.locator('#desk-history-dialog').waitFor({state:'visible'});
    const historyTexts=await f.locator('#desk-history-list pre').allTextContents();check('new category '+suffix+' history contains only its own exact copied source',historyTexts.length===1&&historyTexts[0]===expected,historyTexts);
    await f.locator('#desk-history-close').click();
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
   if(imageService){
    const d=await f.locator('.paper-card').nth(1).getAttribute('data-paper-id'),card=f.locator('.paper-card[data-paper-id="'+d+'"]');await card.locator('.paper-image-set').click();const editor=f.locator('.paper-image-dialog');await editor.locator('.cc-threads-image-list').waitFor();await editor.getByRole('button',{name:'画像を追加',exact:true}).waitFor();
    async function choose(payload){const waiting=page.waitForEvent('filechooser');await editor.getByRole('button',{name:'画像を追加',exact:true}).click();await(await waiting).setFiles(payload);}
    await choose({name:'not-allowed.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});await cf.waitForFunction(()=>document.querySelector('.paper-image-dialog[open] .cc-threads-images-status').dataset.error==='true');check('unsupported image type leaves the saved image set untouched',imageService.writes.length===0&&await editor.locator('.cc-threads-image img').count()===0);
    await choose({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024+1)});await cf.waitForFunction(()=>document.querySelector('.paper-image-dialog[open] .cc-threads-images-status').textContent.includes('6MB'));check('6MB limit fails before any image save',imageService.writes.length===0);
    await choose({name:'theme-fixture.png',mimeType:'image/png',buffer:Buffer.from(themePng.split(',')[1],'base64')});await editor.locator('.cc-threads-image img').waitFor();imageService.failNext=true;await editor.locator('.cc-threads-save').click();await cf.waitForFunction(()=>document.querySelector('.paper-image-dialog[open] .cc-threads-images-status').dataset.error==='true');check('failed save retains exact selected bytes and permits retry',await editor.locator('.cc-threads-image img').getAttribute('src')===themePng&&await editor.locator('.cc-threads-save').isEnabled()&&imageService.writes.length===0);
    await editor.locator('header>button').click();check('closing a dirty editor retains unsaved work until explicit discard or save',await editor.isVisible()&&await editor.getByRole('button',{name:'変更を破棄して閉じる',exact:true}).isVisible());
    await editor.locator('.cc-threads-save').click();await cf.waitForFunction(()=>document.querySelector('.paper-image-dialog[open] .cc-threads-images-status').textContent.includes('保存しました'));const attempts=imageService.calls.filter(x=>x.method==='PATCH');check('retry reuses one mutation identity and saves exactly once',attempts.length===2&&attempts[0].mutationId===attempts[1].mutationId&&imageService.writes.length===1,attempts);
    await editor.locator('header>button').click();await editor.waitFor({state:'hidden'});await cf.waitForFunction(id=>{const n=[...document.querySelectorAll('.paper-card')].find(n=>n.dataset.paperId===id)?.querySelector('.paper-image');return n&&!n.hidden&&n.complete&&n.naturalWidth>0},d);check('saved theme image appears on its exact manuscript',await card.locator('.paper-image').getAttribute('src')===themePng);
    await page.screenshot({path:path.join(out,width+'-'+height+'-image-saved.png')});const model=imageService.rows.find(x=>x.id===956);check('image persistence changes only the image manifest, not source text or posted state',model.payload.draft===rows.find(x=>x.id===956).payload.draft&&!model.payload.posted&&model.payload.threads_images_v1.revision===1&&imageService.rows.find(x=>x.id===955).payload.threads_images_v1===undefined);
    await page.reload();await page.waitForFunction(()=>window.CCCastle?.unified);await f.locator('.paper-card').first().waitFor();const reloaded=page.frames().find(f=>new URL(f.url()).pathname.endsWith('/lounge/index.html'));await reloaded.waitForFunction(id=>{const n=[...document.querySelectorAll('.paper-card')].find(n=>n.dataset.paperId===id)?.querySelector('.paper-image');return n&&!n.hidden&&n.complete&&n.naturalWidth>0},d);check('reload reads the persisted image from the authenticated API without replaying the write',await f.locator('.paper-card[data-paper-id="'+d+'"] .paper-image').getAttribute('src')===themePng&&imageService.writes.length===1&&imageService.calls.every(x=>x.authorized));
   }

   check('real source records unchanged and zero source writes',await page.evaluate(original=>JSON.stringify(__rpgQA.threads.events)===original&&__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0,original));
   check('no browser errors or unexpected external transport',errors.length===0&&blocked.length===0,{errors,blocked});
   result.status='passed';
  }catch(e){result.status='failed';result.failure=e.stack;if(process.env.PAPER_IMAGES){const current=page.frames().find(f=>f.url().includes('/lounge/index.html'));result.rootImageDebug=await page.evaluate(()=>({writes:window.__rpgQA?.writes,requests:window.__storybookRecords?.requests?.slice(-8),fetch:String(window.fetch).slice(0,600)})).catch(e=>({error:e.message}));result.imageCalls=imageService?.calls;result.imageDebug=await current?.evaluate(()=>[...document.querySelectorAll('.cc-threads-images-status')].map(n=>({text:n.textContent,error:n.dataset.error,open:!!n.closest('dialog[open]')}))).catch(()=>null);}process.exitCode=1;await page.screenshot({path:path.join(out,width+'-'+height+'-failure.png')});}
  finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();}
 }}finally{await browser.close();server.close();}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
