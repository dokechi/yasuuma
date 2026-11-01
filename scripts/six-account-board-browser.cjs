/* Current storybook home and original six-account manuscript board, synthetic records only. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/six-accounts');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
async function capture(page,file){await page.frames()[1].evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:path.join(out,file)});}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),args:['--no-sandbox']});
 const measurements=[];
 try{for(const [width,height] of [[390,900],[800,700],[800,900],[1440,900]]){
  const shot=width+'-'+height,page=await browser.newPage({viewport:{width,height},reducedMotion:height===700?'no-preference':'reduce'}),errors=[];
  await page.addInitScript(()=>{
   window.__audioPlays=0;window.__roomInteractions=[];
   const route='.account-draft,[data-story-open],[data-story-instant]';
   document.addEventListener('click',event=>{if(event.target.closest?.(route))window.__roomClickStarted=performance.now();},true);
   document.addEventListener('click',event=>{if(!event.target.closest?.(route))return;window.__roomInteractions.push({milliseconds:performance.now()-window.__roomClickStarted,roomReady:document.querySelector('#room')?.hidden===false,boardHidden:document.querySelector('.account-board')?.hidden===true});});
   if(!localStorage.getItem('qa-seeded')){localStorage.setItem('qa-seeded','1');localStorage.setItem('castle-production.v1.source:legacy-browser',JSON.stringify({id:'legacy-browser',place:'kyun',title:'昔のキュン',body:'OLD ACCOUNT BODY',source:{id:'old-browser',account:'kyun'},createdAt:1,updatedAt:1}));localStorage.setItem('castle-production.v1.selected:kyun',JSON.stringify('legacy-browser'));}
   HTMLMediaElement.prototype.play=function(){window.__audioPlays++;return Promise.resolve();};
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await page.route('**/qa.html',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}iframe{display:block;width:100vw;height:100dvh;border:0}</style><iframe src="/command-center-98/lounge/index.html"></iframe>'}));
  await page.goto(origin+'/qa.html');const frame=page.frameLocator('iframe');
  await frame.locator('[data-story-destination]').first().waitFor();
  assert.equal(await frame.locator('[data-story-destination]').count(),8);
  assert.equal(await frame.locator('[data-story-destination]:disabled').count(),3);
  assert.equal(await frame.locator('[data-story-instant]').count(),5);
  const rows=['insurance','otoku','rakuten'].flatMap((account,i)=>Array.from({length:7},(_,j)=>({id:account+j,place:account==='insurance'?'kyun':account,title:['保険の確認ポイント','安く買う前のチェック','楽天のお得情報'][i]+' '+(j+1),body:account+'だけの本文。ほかのアカウントと混ぜない。',kind:'本文',checkedAt:'2026-10-30',source:{id:account+j,account},posting:{main:account+'本文',reply:account==='insurance'?'':account+'返信'},createdAt:1,updatedAt:10-j})));
  rows.push({id:'legacy',place:'kyun',title:'旧キュン原稿',body:'旧原稿は保険と混ぜない',source:{id:'old',account:'kyun'},createdAt:1,updatedAt:1});
  await page.evaluate(rows=>document.querySelector('iframe').contentWindow.postMessage({channel:'cc-castle-v1',type:'records',drafts:rows,complete:true,loading:false,message:'保存原稿を読込済み'},location.origin),rows);
  await frame.locator('.story-status').getByText('保存原稿を読込済み',{exact:true}).waitFor({state:'attached'});
  await frame.locator('.story-read-state summary').click();await frame.locator('.story-status').waitFor();await frame.locator('.story-read-state summary').click();
  await frame.locator('.story-art-host img').evaluateAll(nodes=>Promise.all(nodes.map(image=>image.decode())));
  await capture(page,shot+'-castle.png');
  if(width===800)for(const time of ['day','dusk','night']){await frame.locator('.account-board').evaluate((node,t)=>node.dataset.time=t,time);await capture(page,shot+'-'+time+'.png');}
  const perf=await page.frames()[1].evaluate(()=>({audioPlays:window.__audioPlays,resources:performance.getEntriesByType('resource').map(x=>({url:x.name.split('/').at(-1),bytes:x.transferSize}))}));
  assert.equal(perf.audioPlays,0);console.log('INITIAL ASSETS',width,JSON.stringify(perf));
  const measurement={viewport:{width,height},environment:'GitHub Actions headless Chrome; not Galaxy device FPS',resources:perf.resources.length,transferBytes:perf.resources.reduce((sum,r)=>sum+r.bytes,0),audioPlays:perf.audioPlays};
  if(width===800&&height===700){measurement.frameSample=await page.frames()[1].evaluate(()=>new Promise(resolve=>{const intervals=[];let first,last;function sample(now){if(first===undefined){first=last=now;}else{intervals.push(now-last);last=now;}if(now-first<1000){requestAnimationFrame(sample);return;}const ordered=[...intervals].sort((a,b)=>a-b);resolve({durationMs:now-first,frames:intervals.length,medianIntervalMs:ordered[Math.floor(ordered.length*.5)],p95IntervalMs:ordered[Math.min(ordered.length-1,Math.floor(ordered.length*.95))],maxIntervalMs:Math.max(...intervals)});}requestAnimationFrame(sample);}));}
  else{const running=await page.frames()[1].evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.target?.closest?.('.account-board,.castle-travel-view')).length);assert.equal(running,0,'reduced-motion disables room animations');measurement.reducedMotionAnimations=running;}
  measurements.push(measurement);
  // The open book replaces the old architectural overview. All eight named
  // bookmarks remain reachable inside the spread; phone pages may scroll, never shrink.

  await frame.locator('.story-preparing summary').click();
  const targets=[];
  for(const target of await frame.locator('[data-story-destination]').all()){
   // A selected bookmark intentionally extends onto the page, beyond the nav's
   // layout box. Prove its real painted target, not that obsolete container box.
   await target.scrollIntoViewIfNeeded();
   targets.push(await target.evaluate(n=>{const r=n.getBoundingClientRect(),points=[[.1,.1],[.9,.1],[.5,.5],[.1,.9],[.9,.9]];return {name:n.getAttribute('aria-label'),width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:points.every(([x,y])=>{const hit=document.elementFromPoint(r.left+r.width*x,r.top+r.height*y);return hit===n||n.contains(hit);})};}));
  }
  assert.ok(targets.every(r=>r.name&&r.width>=44&&r.height>=44&&r.inside&&r.hit),JSON.stringify(targets));
  assert.equal(await frame.locator('[data-story-destination]:visible').count(),8);
  await frame.locator('.story-preparing summary').click();
  const quick=await frame.locator('[data-story-instant]').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
  assert.ok(quick.every(r=>r.width>=44&&r.height>=44));
  await frame.locator('.story-list').click();
  await frame.locator('.account-column[data-account=insurance] .account-draft').first().waitFor();
  assert.equal(await frame.locator('.account-column').count(),6);
  assert.equal(await frame.locator('[data-tone=empty] .account-draft').count(),0);
  assert.equal(await frame.locator('.account-column[data-account=insurance] .account-draft').count(),7);
  assert.equal(await frame.locator('.account-board').getByText('旧キュン原稿').count(),0);
  await capture(page,shot+'-board.png');
  for(const key of ['insurance','otoku','rakuten']){
   await frame.locator('.account-column[data-account='+key+'] .account-draft').first().click();
   await frame.locator('#room[data-account='+key+'][data-spatial-desk=ready]').waitFor();
   await frame.locator('#draft-body').waitFor();
   assert.equal(await frame.locator('#room-title').textContent(),({insurance:'保険',otoku:'まだ安く買えるはず',rakuten:'楽天犬'})[key]);
   assert.ok((await frame.locator('.spatial-desk-actor').getAttribute('src')).endsWith('/storybook-'+key+'-actor-v1.webp'));
   assert.ok((await frame.locator('#draft-body').textContent()).startsWith(key));
   await frame.locator('.spatial-work > summary').click();
   assert.equal(await frame.locator('#desk-routes strong').textContent(),({insurance:'保険 @sucker0508',otoku:'まだ安く買えるはず @thats_a_steal0601',rakuten:'楽天犬 @bonya0914'})[key]);
   await frame.locator('#desk-routes').getByText('← 司令塔へ').click();
   await frame.locator('.account-board').waitFor();
   assert.equal(await frame.locator('.storybook').getAttribute('data-story-room'),key,'list routing updates the visible remembered room');
   assert.equal(await frame.locator('[data-story-instant][aria-current=location]').getAttribute('data-story-instant'),key);
   assert.equal(await frame.locator('.account-column[data-account='+key+'] .account-draft').first().evaluate(n=>n===document.activeElement),true);
  }
  measurement.interactions=await page.frames()[1].evaluate(()=>window.__roomInteractions);
  assert.equal(measurement.interactions.length,3);
  assert.ok(measurement.interactions.every(x=>x.roomReady&&x.boardHidden),'route updates during the click, not after the visual transition');
  if(width===800){await frame.locator('.board-primary').click();await capture(page,shot+'-returned-room.png');}
  if(await frame.locator('.storybook').isVisible())await frame.locator('.story-tool').getByText('設定',{exact:true}).click();else await frame.getByRole('button',{name:'ラウンジ・管理へ'}).click();
  await frame.locator('#settings[open]').waitFor();await frame.locator('#settings-close').click();
  if(await frame.locator('.storybook').isVisible())await frame.locator('.story-list').click();
  await frame.getByRole('button',{name:'旧データの保管庫'}).click();await frame.locator('.legacy-account-archive').waitFor();
  assert.ok((await frame.locator('.legacy-account-archive').textContent()).includes('OLD ACCOUNT BODY'));
  await frame.locator('.legacy-account-archive button').click();
  await page.reload();await frame.locator('[data-story-destination]').first().waitFor();
  assert.equal(await frame.locator('.storybook').getAttribute('data-story-room'),'insurance','room emphasis is memory-only and resets on reload');
  assert.equal(await frame.locator('.account-board').getAttribute('data-destination'),null,'last visit is not persisted');
  await frame.locator('.story-list').click();
  assert.equal(await frame.locator('.account-column[data-account=insurance] .account-draft').count(),7);
  assert.equal(await frame.locator('.account-board').getByText('昔のキュン').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 fs.writeFileSync(path.join(out,'living-room-performance.json'),JSON.stringify(measurements,null,2));console.log('LIVING ROOM MEASUREMENTS',JSON.stringify(measurements));
 console.log('PASS: eight named spatial destinations and five fast routes, six original account columns, 3 sealed slots, explicit identity isolation, all 3 record routes/back, memory-only room emphasis, legacy archive, lounge access, reload, no JS errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
