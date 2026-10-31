/* Deterministic UI QA only: local fixture records, no production API or writes. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/enterprise-atelier');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/fixture.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<style>body{margin:0}iframe{width:100vw;height:100dvh;border:0;display:block}</style><iframe src="/command-center-98/lounge/index.html"></iframe>');const file=path.join(root,pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'}).end(data));});
const rows=['insurance','otoku','rakuten','lottery'].flatMap((account,i)=>Array.from({length:8},(_,j)=>({id:account+j,place:account==='insurance'?'kyun':account,title:['保険を見直す前に、確認したいこと','少しでも安く買うための選び方','暮らしに合う楽天のお得情報','参加前に確かめたい抽選の条件'][i]+' '+(j+1),body:('保存された本文です。アカウントを取り違えず、内容を確認してからコピーできます。\n\n').repeat(8),kind:'投稿本文',checkedAt:'2026-10-30',source:{id:account+j,account},posting:{main:account+'本文'},createdAt:1,updatedAt:10-j})));
rows.push({...rows[8],id:'otoku-variant',kind:'B案',body:'別案の本文も、そのまま保持します。'});
rows[8].posting={main:rows[8].body,reply:'条件と出典の補足です。保存した返信も個別にコピーできます。'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),args:['--no-sandbox']});
 const results=[];
 try{for(const [width,height] of [[320,640],[360,740],[390,900],[800,648],[800,700],[800,900],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text;}}});});
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await page.goto(origin+'/fixture.html');const frame=page.frameLocator('iframe'),cf=page.frames().find(f=>f.url().includes('/lounge/'));
  await frame.locator('.castle-room-hotspot').first().waitFor();
  const send=data=>page.evaluate(data=>document.querySelector('iframe').contentWindow.postMessage({channel:'cc-castle-v1',...data},location.origin),data);
  const screenshot=name=>page.screenshot({path:path.join(out,`${width}-${height}-${name}.png`)});
  const openWork=async()=>{if(!await frame.locator('.spatial-work').evaluate(n=>n.open))await frame.locator('.spatial-work > summary').click();};
  const returnToBoard=async()=>{await openWork();await frame.locator('#desk-routes').getByRole('button',{name:'← 司令塔へ',exact:true}).click();await frame.locator('.account-board').waitFor();};
  const waitRoom=async account=>{
   await frame.locator('#room[data-account='+account+'][data-spatial-desk=ready][data-spatial-scene=interior]').waitFor();
   await frame.locator('#draft-body').waitFor();await frame.locator('.spatial-desk-actor').evaluate(n=>n.decode());
  };
  await send({type:'records',drafts:rows,complete:true,loading:false,message:'保存原稿を読込済み'});
  await frame.locator('.account-board[data-state=ready]').waitFor();
  for(const account of ['insurance','otoku','rakuten','lottery'])assert.equal(await frame.locator('.castle-room-hotspot[data-room='+account+'] .castle-room-count').textContent(),'保存原稿 8本','visible per-room counts retain all 32 original groups');
  await frame.locator('.castle-stage img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
  await cf.evaluate(()=>document.fonts.ready);await screenshot('home');
  assert.equal(await frame.locator('#app').getAttribute('inert'),'');
  assert.equal(await frame.locator('.castle-room-hotspot:disabled').count(),3);
  assert.equal(await frame.locator('.castle-room-hotspot').count(),8);
  assert.equal(await frame.locator('.castle-quick-open').count(),5);
  const layout=await cf.evaluate(()=>({viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
   buttons:[...document.querySelectorAll('.account-board-heading button,.castle-quick-open,.castle-step,.castle-overview')].filter(n=>n.checkVisibility()).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,font:parseFloat(getComputedStyle(n).fontSize)})),
   labels:[...document.querySelectorAll('.castle-room-label strong,.castle-room-count')].filter(n=>n.checkVisibility()).map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize)}))}));
  assert.equal(layout.overflow,false);
  assert.ok(layout.buttons.every(b=>b.height>=44&&b.width>=44&&b.font>=12),JSON.stringify(layout.buttons));
  assert.ok(layout.labels.every(label=>label.font>=12),JSON.stringify(layout.labels));
  // The architecture replaces rectangular cards. Eight named, reachable hit zones
  // must fit the overview; task rail and footer may not obscure the castle viewport.
  if(width<=700)await frame.locator('.castle-overview').click();
  const bounds=await frame.locator('.castle-room-hotspot').evaluateAll(nodes=>nodes.map(n=>{
   const r=n.getBoundingClientRect(),v=document.querySelector('.castle-viewport').getBoundingClientRect();
   return {name:n.getAttribute('aria-label'),width:r.width,height:r.height,inside:r.left>=v.left-1&&r.top>=v.top-1&&r.right<=v.right+1&&r.bottom<=v.bottom+1};
  }));
  assert.ok(bounds.every(r=>r.name&&r.width>=44&&r.height>=44&&r.inside),JSON.stringify(bounds));
  assert.equal(await frame.locator('.castle-room-hotspot:visible').count(),8);
  const layers=await cf.evaluate(()=>{
   const box=selector=>document.querySelector(selector).getBoundingClientRect();
   const viewport=box('.castle-viewport'),route=box('.castle-routebar'),quick=box('.castle-quick'),footer=box('.board-footer');
   return {viewportBottom:viewport.bottom,routeTop:route.top,routeBottom:route.bottom,quickTop:quick.top,quickBottom:quick.bottom,footerTop:footer.top,footerBottom:footer.bottom,height:innerHeight};
  });
  assert.ok(layers.viewportBottom<=layers.routeTop+1&&layers.routeBottom<=layers.quickTop+1&&layers.quickBottom<=layers.footerTop+1&&layers.footerBottom<=height+1,JSON.stringify(layers));
  if(width<=700)await frame.locator('.castle-overview').click();
  const insurance=frame.locator('.castle-quick-open[data-room=insurance]');
  await insurance.focus();
  await send({type:'records',drafts:rows,complete:true,loading:false,message:'保存原稿を再確認しました'});
  await frame.locator('.account-board-status').getByText('保存原稿を再確認しました',{exact:true}).waitFor();
  assert.equal(await insurance.evaluate(n=>n===document.activeElement),true,'status refresh preserves the visible quick-route focus');
  await insurance.click();await waitRoom('insurance');
  assert.equal(await frame.locator('#app').getAttribute('inert'),null);
  assert.equal(await frame.locator('#room-title').textContent(),'保険');await screenshot('reader');
  const reader=await frame.locator('#desk-scroll').evaluate(n=>({height:n.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.ok(reader.height>=180,'readable manuscript viewport '+reader.height);assert.equal(reader.overflow,false);
  await openWork();await frame.locator('#desk-read').click();
  assert.equal(await frame.locator('.spatial-work').evaluate(n=>n.open),false,'read jump closes the covering work drawer');
  assert.equal(await frame.locator('#desk-scroll').evaluate(n=>n===document.activeElement),true);
  assert.ok(await frame.locator('#draft-body').evaluate(n=>{const title=document.getElementById('draft-title').getBoundingClientRect(),body=n.getBoundingClientRect();return title.top>=0&&body.top<innerHeight-80;}),'heading and first body line visible without blind page scroll');
  if(width<=700)await screenshot('reading');
  await frame.locator('.spatial-shelf-open').click();await frame.locator('#spatial-shelf-dialog[open]').waitFor();
  await frame.locator('#desk-query').fill('確認したいこと 2');
  assert.equal(await frame.locator('#desk-list .manuscript-card').count(),1);
  await frame.locator('#desk-query').fill('');
  await frame.getByRole('button',{name:'原稿棚を閉じる',exact:true}).click();
  await frame.locator('#spatial-shelf-dialog').waitFor({state:'hidden'});
  assert.equal(await frame.locator('.spatial-shelf-open').evaluate(n=>n===document.activeElement),true);
  await frame.locator('#desk-copy').click();
  assert.equal(await cf.evaluate(()=>window.__copied),rows[0].body);
  await returnToBoard();assert.equal(await insurance.evaluate(n=>n===document.activeElement),true);
  await frame.locator('.board-primary').click();await frame.locator('.account-jump').waitFor();
  await frame.locator('.account-jump').getByRole('button',{name:'楽天犬',exact:true}).click();
  await frame.locator('.account-column[data-account=rakuten] .account-draft').first().click();await waitRoom('rakuten');
  assert.equal(await frame.locator('#room-title').textContent(),'楽天犬');
  assert.equal(await frame.locator('#desk-operation').textContent(),'','copy confirmation never follows a different account/draft');
  await returnToBoard();assert.equal(await cf.evaluate(()=>document.activeElement?.dataset.draftId),'rakuten0');
  assert.ok(await frame.locator('.account-column[data-account=rakuten] .account-draft strong').first().evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.account-drafts').getBoundingClientRect();return a.top>=b.top&&a.top<b.bottom;}),'return exposes selected manuscript title');
  await screenshot('list');
  await frame.locator('.account-column[data-account=insurance] .account-drafts').evaluate(n=>n.scrollTop=100);
  const previousScroll=await frame.locator('.account-column[data-account=insurance] .account-drafts').evaluate(n=>n.scrollTop);
  assert.ok(previousScroll>0,'scroll-preservation regression must start from a nonzero offset');
  await send({type:'records',drafts:rows,complete:true,loading:false,message:'スクロール位置を確認'});
  await frame.locator('.account-board-status').getByText('スクロール位置を確認',{exact:true}).waitFor();
  assert.equal(await frame.locator('.account-column[data-account=insurance] .account-drafts').evaluate(n=>n.scrollTop),previousScroll,'column scroll survives attached render');
  for(const selector of ['.account-jump [data-account=rakuten]','.account-column[data-account=rakuten] .account-handle','.account-column[data-account=rakuten]>button']){
   await frame.locator(selector).focus();await send({type:'records',drafts:rows,complete:true,loading:false,message:'焦点保持を確認'});
   await frame.locator(selector).evaluate(n=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await frame.locator(selector).evaluate(n=>n===document.activeElement),true,'refresh retains '+selector);
  }
  await frame.locator('.account-column[data-account=rakuten]>button').click();await waitRoom('rakuten');await returnToBoard();
  assert.equal(await frame.locator('.account-column[data-account=rakuten]>button').evaluate(n=>n===document.activeElement),true,'footer-route returns to visible footer');
  await send({type:'status',loading:false,message:'保存原稿の読み込みに失敗しました。再試行できます。'});
  await frame.locator('.account-board[data-state=attention]').waitFor();
  assert.equal(await frame.getByRole('button',{name:'↻ 再読み込み',exact:true}).isEnabled(),true);
  assert.equal(await frame.locator('.account-column[data-account=insurance] .account-draft').count(),8,'failure preserves saved records');
  await screenshot('error');await frame.getByRole('button',{name:'↻ 再読み込み',exact:true}).click();
  await frame.locator('.account-board[data-state=loading]').waitFor();
  assert.equal(await frame.getByRole('button',{name:'更新しています…',exact:true}).isDisabled(),true);
  await send({type:'records',drafts:rows,complete:true,loading:false,message:'保存原稿を読込済み'});
  await frame.locator('.account-board[data-state=ready]').waitFor();
  if([390,800,1440].includes(width)){
   await frame.locator('.board-primary').click();
   for(const account of ['otoku','rakuten','lottery']){
    await frame.locator('.castle-quick-open[data-room='+account+']').click();await waitRoom(account);
    assert.equal(await frame.locator('#room').getAttribute('data-account'),account);
    assert.equal(await frame.locator('#desk-operation').textContent(),'','new room has no stale copy claim');
    await screenshot('room-'+account);
    if(account==='otoku'){
     assert.equal(await frame.locator('#desk-variants button').count(),2);
     await frame.locator('#desk-variants').getByRole('button',{name:'B案',exact:true}).click();
     assert.equal(await frame.locator('#draft-body').textContent(),'別案の本文も、そのまま保持します。');
     await frame.locator('#desk-variants').getByRole('button',{name:'投稿本文',exact:true}).click();
     await openWork();await frame.locator('#desk-posting').click();
     assert.equal(await frame.locator('#posting-steps .posting-step').count(),2);
     await screenshot('posting-set');await frame.locator('#posting-close').click();
     await frame.locator('#posting-dialog').waitFor({state:'hidden'});
    }
    await returnToBoard();
   }
  }
  assert.deepEqual(errors,[]);results.push({width,height,layout,bounds,layers,reader,errors});
  if(width===390||width===1440){
   await page.goto(origin+'/command-center-98/index.html');await page.locator('#loginPane:not(.hidden)').waitFor();
   assert.equal(await page.locator('#loginError').isVisible(),false);assert.ok(await page.locator('#loginBtn').isVisible());
   await screenshot('login');
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log('PASS enterprise atelier: 7 complete responsive journeys including compact Fold, eight architectural destinations, keyboard focus/inert, account isolation, original list scroll/focus, shelf search/copy/back, load/error/retry, variants/posting dialog, login, saved-data retention');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
