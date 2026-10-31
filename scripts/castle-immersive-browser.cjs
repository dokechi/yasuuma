/* Actual production host + isolated synthetic APIs. This fixture does not use
   live credentials, approve posts, or write records. Normal-motion coverage is
   deliberately separate from the existing reduced-motion spatial regression. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright-core');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/castle-immersive');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const roomKeys = ['insurance', 'otoku', 'rakuten', 'lottery'];
const roomRects = {insurance:[.085,.33,.35,.28],otoku:[.17,.06,.27,.25],rakuten:[.58,.34,.34,.27],lottery:[.62,.05,.25,.27],sourcing:[.325,.66,.43,.27]};
const rows = roomKeys.map((key, i) => ({id:901+i, taskId:key+'-threads-v1',eventKey:'immersive-'+key,
  title:({insurance:'保険を見直す前の確認',otoku:'お得な価格の条件',rakuten:'楽天犬と贈りもの',lottery:'抽選の締切を確かめる'})[key],
  occurredAt:'2026-10-31T08:00:00Z',domain:'money',payload:{
    draft:`${key} の合成データです。保存原稿の条件と出典を確認します。\n\n`+
      'コピーは投稿ではありません。原稿の本文を変えずに読み、必要な仕事へすぐ戻れます。\n\n'.repeat(10),
    date:'2026-10-31',review_status:'確認用下書き',sources_note:'検証専用の出典記録'}}));
const fixtureScript = `(()=>{
  const rows=${JSON.stringify(rows)};
  __rpgQA.threads.events.push(...rows);
  window.__immersiveRecords={original:JSON.stringify(rows),ids:rows.map(r=>r.id),external:[]};
  window.open=(...args)=>{__immersiveRecords.external.push(args);return null;};
  const previous=window.fetch;
  window.fetch=async(input,options={})=>{
    const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href);
    const method=(options.method||input?.method||'GET').toUpperCase();
    const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    if(method==='GET'&&url.searchParams.get('resource')==='task-events'&&rows.some(r=>r.taskId===url.searchParams.get('taskId')))
      return json({ok:true,events:rows.filter(r=>r.taskId===url.searchParams.get('taskId')),nextOffset:null});
    if(method==='GET'&&url.searchParams.get('resource')==='threads-images')return json({ok:true,id:url.searchParams.get('id'),accountKey:url.searchParams.get('accountKey'),manifest:{contract:'threads-post-images-v1',revision:0,images:[]},assets:[]});
    return previous(input,options);
  };
})();`;
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) return res.writeHead(405).end();
  const relative = new URL(req.url,'http://localhost').pathname;
  const file = path.resolve(root,'.'+relative);
  if (!file.startsWith(root+path.sep)) return res.writeHead(403).end();
  fs.readFile(file,(error,bytes) => {
    if (error) return res.writeHead(404).end();
    let content=bytes;
    if (relative==='/command-center-98/app.html') content=bytes.toString().replace('<head>',
      '<head><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script><script>'+fixtureScript+'</script>');
    if (relative==='/scripts/ui-fixtures.js') content=bytes.toString().replace(/document\.addEventListener\('DOMContentLoaded',[\s\S]*?\n  \}\);/,'');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(content);
  });
});

// Inspect real WebAudio calls, without creating/replacing an audio engine or
// manufacturing user activation. Every frame gets an independent audit log.
function installProbe() {
  const qa=window.__immersiveQA={contexts:0,audio:[],resumes:0,freezeNext:false,held:null,journeys:[],messages:[],clipboard:[]};
  if(navigator.clipboard?.writeText){const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=text=>{qa.clipboard.push(String(text));return write(text);};}
  const Native=window.AudioContext||window.webkitAudioContext;
  if (Native) {
    class AuditedContext extends Native {
      constructor(...args){super(...args);qa.contexts++;}
      resume(...args){qa.resumes++;return super.resume(...args);}
      createOscillator(){return auditSource(super.createOscillator(),'oscillator');}
      createBufferSource(){return auditSource(super.createBufferSource(),'buffer');}
    }
    function auditSource(source,kind){const start=source.start;source.start=function(...args){qa.audio.push({kind,hidden:document.hidden,active:navigator.userActivation?.isActive,time:performance.now()});return start.apply(this,args);};return source;}
    window.AudioContext=AuditedContext;if(window.webkitAudioContext)window.webkitAudioContext=AuditedContext;
  }
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.channel==='cc-castle-v1')qa.messages.push({type:event.data.type,action:event.data.action,room:event.data.room});});
  new MutationObserver(records=>{
    for(const record of records)for(const n of record.addedNodes){
      if(n.nodeType!==1||!n.matches('.castle-journey'))continue;
      qa.journeys.push({room:n.dataset.room,direction:n.dataset.direction,time:performance.now()});
      if(qa.freezeNext){qa.freezeNext=false;queueMicrotask(()=>{qa.held=n;for(const a of n.getAnimations({subtree:true}))a.pause();});}
    }
  }).observe(document,{childList:true,subtree:true});
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),headless:true,args:['--no-sandbox']});
  const results=[];
  let currentPage;
  try {
    for(const [width,height] of [[1440,900],[800,648],[390,900],[320,640]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference',hasTouch:width<=800,
        serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
      await context.addInitScript(installProbe);
      const page=currentPage=await context.newPage(),errors=[],blocked=[];
      page.on('pageerror',e=>errors.push(e.message));
      await context.route('**/*',route=>{
        const request=route.request();
        if(new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();
        blocked.push({url:request.url(),method:request.method()});return route.abort();
      });
      const result={width,height,checks:[],frames:[]};results.push(result);
      const check=(name,pass,detail)=>{result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));};
      const screenshot=name=>page.screenshot({path:path.join(out,`${width}-${height}-${name}.png`)});
      await page.goto(origin+'/command-center-98/app-v130.html');
      await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
      const f=page.frameLocator('#ccCastleFrame');
      await f.locator('.castle-room-hotspot[data-room=insurance]').waitFor();
      const cf=page.frames().find(frame=>frame.url().includes('/lounge/'));
      await f.locator('.castle-stage img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
      await cf.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      await f.locator('.castle-sound-toggle').waitFor();
      await f.locator('.account-board[data-state=ready]').waitFor();
      await page.waitForFunction(()=>document.body.dataset.castleJourneyHost==='ready');
      await cf.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const waitRoom=async key=>{
        await f.locator(`#room[data-account=${key}][data-spatial-desk=ready]`).waitFor();
        await f.locator('#draft-body').waitFor();
        await f.locator('#draft-body').filter({hasText:key+' の合成データです。'}).waitFor();
      };
      const noJourney=()=>page.waitForFunction(()=>!document.querySelector('.castle-journey'));
      const home=async()=>{await f.locator('.account-board:not([hidden])').waitFor();};
      const quick=async key=>{await f.locator(`.castle-quick-open[data-room=${key}]`).click();if(key!=='sourcing')await waitRoom(key);};
      const returnHome=async()=>{await f.locator('#back').click();await home();};
      const setOverview=async()=>{
        if(await f.locator('.spatial-castle').getAttribute('data-overview')!=='true')await f.locator('.castle-overview').click();
        // Layout observers may start a second CSS transition after the first
        // promise settles. Observe the actual centered overview, not a timer or
        // a stale animation list; real early-entry remains separately tested.
        await cf.waitForFunction(()=>{
          const world=document.querySelector('.spatial-castle'),viewport=world?.querySelector('.castle-viewport'),stage=world?.querySelector('.castle-stage');
          if(!stage||world.dataset.overview!=='true'||stage.getAnimations().some(a=>a.pending||a.playState==='running'))return false;
          const v=viewport.getBoundingClientRect(),s=stage.getBoundingClientRect(),scale=Math.min(viewport.clientWidth/1536,viewport.clientHeight/1024);
          return Math.abs(s.width-1536*scale)<1&&Math.abs(s.height-1024*scale)<1&&Math.abs(s.left-(v.left+(viewport.clientWidth-1536*scale)/2))<1&&Math.abs(s.top-(v.top+(viewport.clientHeight-1024*scale)/2))<1;
        },null,{polling:'raf'});
      };
      const pressRoom=async(key,{hold=false}={})=>{
        if(hold)await page.evaluate(()=>window.__immersiveQA.freezeNext=true);
        await f.locator(`.castle-room-hotspot[data-room=${key}]`).click();
      };
      const readerGeometry=async()=>f.locator('#desk-scroll').evaluate(n=>({height:n.clientHeight,bodyTop:document.getElementById('draft-body').getBoundingClientRect().top,viewport:innerHeight,
        overflow:document.documentElement.scrollWidth>innerWidth,
        actions:[...document.querySelectorAll('.reader-actions button')].map(b=>{const r=b.getBoundingClientRect();return{id:b.id,width:r.width,height:r.height,top:r.top,bottom:r.bottom};})}));
      const liveForeground=async()=>({actor:await f.locator('.spatial-desk-actor').boundingBox(),paper:await f.locator('#desk').boundingBox()});
      const assertPhoneForeground=(name,shot,live)=>{
        if(width>700||!shot.actor)return;
        check(name+' keeps paper opaque with its companion',!!shot.paper&&Math.abs(shot.paper.effectiveOpacity-1)<.005,shot.paper);
        const difference={
          x:(shot.actor.left-shot.paper.left)-(live.actor.x-live.paper.x),
          y:(shot.actor.top-shot.paper.top)-(live.actor.y-live.paper.y),
          actorWidth:shot.actor.width-live.actor.width,actorHeight:shot.actor.height-live.actor.height,
          paperWidth:shot.paper.width-live.paper.width,paperHeight:shot.paper.height-live.paper.height};
        check(name+' preserves the landed paper/actor crop coverage',Object.values(difference).every(n=>Math.abs(n)<2),difference);
      };
      const assertReader=async key=>{
        await waitRoom(key);const g=await readerGeometry();check('reader geometry '+key,g.height>=180&&g.bodyTop<g.viewport-80&&!g.overflow&&g.actions.every(b=>b.width>=44&&b.height>=44&&b.top>=0&&b.bottom<=g.viewport+1),g);
      };
      async function seekJourney(fraction,label){
        const geometry=await page.evaluate(async({fraction})=>{
          const layer=document.querySelector('.castle-journey');if(!layer)throw Error('Journey disappeared before frame capture');
          const animations=layer.getAnimations({subtree:true});if(!animations.length)throw Error('Journey has no inspectable animations');
          for(const a of animations){a.pause();a.currentTime=Number(a.effect.getTiming().duration)*fraction;}
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const inspect=selector=>{const n=layer.querySelector(selector);if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);let effectiveOpacity=1,p=n;while(p&&p!==layer.parentElement){effectiveOpacity*=Number(getComputedStyle(p).opacity);p=p.parentElement;}return{left:r.left,top:r.top,width:r.width,height:r.height,opacity:s.opacity,effectiveOpacity,transform:s.transform,background:s.backgroundImage,backgroundColor:s.backgroundColor};};
          return{room:layer.dataset.room,direction:layer.dataset.direction,phase:layer.dataset.phase,pointerEvents:getComputedStyle(layer).pointerEvents,ariaHidden:layer.getAttribute('aria-hidden'),
            bounds:(()=>{const r=layer.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};})(),camera:inspect('.castle-journey-camera'),world:inspect('.castle-journey-world'),sky:inspect('.castle-journey-sky'),threshold:inspect('.castle-journey-threshold'),interior:inspect('.castle-journey-interior'),actor:inspect('[data-journey-part=actor]'),paper:inspect('[data-journey-part=paper]'),
            leaves:[...layer.querySelectorAll('.castle-journey-leaf')].map(n=>{const s=getComputedStyle(n),rgba=(s.backgroundColor.match(/[\d.]+/g)||[]).map(Number),m=new DOMMatrixReadOnly(s.transform==='none'?undefined:s.transform);return{side:n.dataset.side,opacity:Number(s.opacity),baseAlpha:rgba.length===4?rgba[3]:rgba.length===3?1:0,rotation:{m11:m.m11,m13:m.m13,m31:m.m31,m33:m.m33}};}),
            images:[...layer.querySelectorAll('img')].map(n=>({src:n.currentSrc||n.src,width:n.naturalWidth})),animations:animations.length,
            focusCaptured:layer.contains(document.activeElement),activeFrames:document.querySelectorAll('.castle-journey').length};
        },{fraction});
        result.frames.push({label,fraction,...geometry});await screenshot(label);return geometry;
      }
      async function finishJourney(){await page.evaluate(()=>{const n=document.querySelector('.castle-journey');for(const a of n?.getAnimations({subtree:true})||[]){a.finish();}});await noJourney();}
      const initialAudio=await cf.evaluate(()=>({contexts:__immersiveQA.contexts,starts:__immersiveQA.audio.length}));
      check('sound is explicitly off with no startup audio',await f.locator('.castle-sound-toggle').getAttribute('aria-pressed')==='false'&&initialAudio.contexts===0&&initialAudio.starts===0,initialAudio);
      check('eight destinations and five immediate routes remain',await f.locator('.castle-room-hotspot').count()===8&&await f.locator('.castle-room-hotspot:disabled').count()===3&&await f.locator('.castle-quick-open').count()===5);
      const rail=await page.locator('#requestProgressShortcut').boundingBox(),frame=await page.locator('#ccCastleFrame').boundingBox();
      check('parent request rail never overlaps the room',frame.y>=rail.y+rail.height&&await page.locator('#requestProgressOpen').evaluate(n=>n.getBoundingClientRect().height)>=44,{frame,rail});
      await screenshot('home');
      const foreignCount=await page.evaluate(()=>__immersiveQA.journeys.length);
      await page.evaluate(()=>window.postMessage({channel:'cc-castle-v1',type:'journey',spec:{room:'insurance',direction:'in',origin:{left:0,top:0,width:300,height:300,stageLeft:0,stageTop:0,scale:1}}},location.origin));
      await page.waitForTimeout(60);
      check('host ignores presentation requests from the wrong window',await page.evaluate(n=>__immersiveQA.journeys.length===n,foreignCount));
      await setOverview();
      const originalViewport=await f.locator('.castle-viewport').boundingBox();
      const originalCastle=await f.locator('.castle-cutaway').boundingBox();
      const originalDoor=await f.locator('.castle-room-hotspot[data-room=insurance]').boundingBox();
      result.origin={viewport:originalViewport,castle:originalCastle,door:originalDoor};
      await pressRoom('insurance',{hold:true});
      await page.locator('.castle-journey[data-room=insurance][data-direction=in]').waitFor();
      await waitRoom('insurance');
      check('route commits while the camera is still active',await page.locator('.castle-journey').count()===1);
      await page.locator('.castle-journey img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
      const contact=await seekJourney(0,'00-contact');
      check('camera starts at the same live castle coordinates',Math.abs(contact.camera.left-originalCastle.x)<2&&Math.abs(contact.camera.top-originalCastle.y)<2&&Math.abs(contact.camera.width-originalCastle.width)<2,{contact:contact.camera,originalCastle});
      const press=await seekJourney(.10,'01-press');
      check('journey is non-blocking and does not capture focus',press.pointerEvents==='none'&&press.ariaHidden==='true'&&!press.focusCaptured&&press.activeFrames===1,press);
      const approach=await seekJourney(.30,'02-approach');
      const swap=await seekJourney(.50,'03-closed-swap');
      const threshold=await seekJourney(.56,'03-threshold');
      const reveal=await seekJourney(.84,'04-reveal');
      check('approach and threshold use opaque physical wood',[approach,threshold].every(frame=>Math.abs(Number(frame.threshold.opacity)-1)<.005&&frame.leaves.length===2&&frame.leaves.every(leaf=>leaf.baseAlpha===1&&leaf.opacity===1)),{approach:{threshold:approach.threshold,leaves:approach.leaves},threshold:{threshold:threshold.threshold,leaves:threshold.leaves}});
      check('both leaves remain closed during the room swap',swap.leaves.length===2&&swap.leaves.every(leaf=>Math.abs(leaf.rotation.m11-1)<.001&&Math.abs(leaf.rotation.m33-1)<.001&&Math.abs(leaf.rotation.m13)<.001&&Math.abs(leaf.rotation.m31)<.001),swap.leaves);
      if(reveal.actor)check('revealed companion stays opaque rather than ghosting',Math.abs(reveal.actor.effectiveOpacity-1)<.005,reveal.actor);
      assertPhoneForeground('phone arrival',reveal,await liveForeground());
      check('camera has real relative movement before threshold',press.camera?.transform!==approach.camera?.transform&&!!approach.world, {press:press.camera,approach:approach.camera});
      const [rx,ry,rw,rh]=roomRects.insurance;
      const approachedCenter={x:threshold.camera.left+threshold.camera.width*(rx+rw/2),y:threshold.camera.top+threshold.camera.height*(ry+rh/2)};
      const surfaceCenter={x:threshold.bounds.left+threshold.bounds.width/2,y:threshold.bounds.top+threshold.bounds.height/2};
      check('camera approaches the chosen architectural room, not an unrelated center',Math.abs(approachedCenter.x-surfaceCenter.x)<3&&Math.abs(approachedCenter.y-surfaceCenter.y)<3,{approachedCenter,surfaceCenter});
      check('sky and architecture have different depth travel',!!approach.sky&&approach.sky.transform!==approach.camera.transform,{sky:approach.sky,camera:approach.camera});
      check('physical threshold occludes before matching interior reveal',!!threshold.threshold&&Number(threshold.threshold.opacity)>.7&&!!reveal.interior&&reveal.room==='insurance'&&reveal.images.some(i=>i.src.includes('castle-interior-insurance-v1.webp')&&i.width>0),{threshold:threshold.threshold,interior:reveal.interior});
      // Actual reader/copy remains usable while the visual presentation is held.
      const copiesBefore=await cf.evaluate(()=>__immersiveQA.clipboard.length);
      await f.locator('#desk-copy').click();
      await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
      check('copy works exactly once before journey completion',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===rows[0].payload.draft&&await cf.evaluate(n=>__immersiveQA.clipboard.length===n+1,copiesBefore));
      await finishJourney();await assertReader('insurance');await screenshot('05-landed');
      await f.locator('#desk-scroll').evaluate(n=>n.scrollTop=120);
      const scrollBefore=await f.locator('#desk-scroll').evaluate(n=>n.scrollTop);
      await f.locator('.spatial-work>summary').click();await f.locator('#desk-read').click();
      check('work drawer preserves reader scroll',Math.abs(await f.locator('#desk-scroll').evaluate(n=>n.scrollTop)-scrollBefore)<2&&scrollBefore>0,{scrollBefore,scrollAfter:await f.locator('#desk-scroll').evaluate(n=>n.scrollTop)});
      await f.locator('.spatial-shelf-open').click();await f.locator('#spatial-shelf-dialog[open]').waitFor();await page.keyboard.press('Escape');
      check('shelf Escape restores opener without leaving room',await f.locator('#room').isVisible()&&await f.locator('.spatial-shelf-open').evaluate(n=>n===document.activeElement));
      await f.locator('.spatial-room-name').click();await f.locator('#spatial-room-dialog[open]').waitFor();await page.keyboard.press('Escape');
      check('destination Escape restores identity control',await f.locator('#room').isVisible()&&await f.locator('.spatial-room-name').evaluate(n=>n===document.activeElement));
      const departureForeground=await liveForeground();
      await page.evaluate(()=>window.__immersiveQA.freezeNext=true);await returnHome();
      await page.locator('.castle-journey[data-room=insurance][data-direction=out]').waitFor();
      await seekJourney(0,'06-return-contact');await seekJourney(.03,'06-return-first-frame');const returnRoom=await seekJourney(.2,'06-return-room');if(returnRoom.actor)check('departing companion stays opaque until door occlusion',Math.abs(returnRoom.actor.effectiveOpacity-1)<.005,returnRoom.actor);assertPhoneForeground('phone departure',returnRoom,departureForeground);await seekJourney(.55,'07-return-threshold');await seekJourney(.94,'08-return-castle');await finishJourney();
      check('reverse returns focus to the exact physical door',await f.locator('.castle-room-hotspot[data-room=insurance]').evaluate(n=>n===document.activeElement));
      const afterCastle=await f.locator('.castle-cutaway').boundingBox();
      check('reverse preserves castle camera coordinates',Math.abs(afterCastle.x-originalCastle.x)<2&&Math.abs(afterCastle.y-originalCastle.y)<2&&Math.abs(afterCastle.width-originalCastle.width)<2,{before:originalCastle,after:afterCastle});

      // Every publishing destination shares the spatial route, not just insurance.
      for(const key of roomKeys.slice(1)){
        await setOverview();await pressRoom(key,{hold:true});await page.locator(`.castle-journey[data-room=${key}]`).waitFor();await waitRoom(key);
        await seekJourney(.84,key+'-reveal');await finishJourney();await assertReader(key);
        await returnHome();await noJourney();
      }

      // A user may enter before a browse camera settles. The travel must start
      // at the painted intermediate transform, not the pending CSS target.
      await setOverview();await f.locator('.castle-overview').click();
      await f.locator('.castle-stage').evaluate(async n=>{
        const animations=n.getAnimations().filter(a=>a.effect?.target===n);
        if(!animations.length)throw Error('No browse transform available to interrupt');
        for(const a of animations){a.pause();a.currentTime=Number(a.effect.getTiming().duration)*.48;}
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      });
      const paintedBrowse=await f.locator('.castle-cutaway').boundingBox();
      const browseViewport=await f.locator('.castle-viewport').boundingBox(),[lx,ly,lw,lh]=roomRects.lottery;
      const visibleRoom={x:Math.max(browseViewport.x,paintedBrowse.x+paintedBrowse.width*lx),y:Math.max(browseViewport.y,paintedBrowse.y+paintedBrowse.height*ly)};
      visibleRoom.width=Math.max(44,Math.min(browseViewport.x+browseViewport.width,paintedBrowse.x+paintedBrowse.width*(lx+lw))-visibleRoom.x);
      visibleRoom.height=Math.max(44,Math.min(browseViewport.y+browseViewport.height,paintedBrowse.y+paintedBrowse.height*(ly+lh))-visibleRoom.y);
      const paintedHitbox=await f.locator('.castle-room-hotspot[data-room=lottery]').boundingBox();
      check('browse hit targets follow painted room geometry',!!paintedHitbox&&['x','y','width','height'].every(k=>Math.abs(paintedHitbox[k]-visibleRoom[k])<3),{paintedHitbox,visibleRoom});
      const hitPoint={x:visibleRoom.x+visibleRoom.width/2,y:visibleRoom.y+visibleRoom.height/2};
      const currentFrame=await page.locator('#ccCastleFrame').boundingBox();
      const hitRoom=await cf.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.castle-room-hotspot')?.dataset.room,{x:hitPoint.x-currentFrame.x,y:hitPoint.y-currentFrame.y});
      check('visible room under a mid-browse tap is the intended destination',hitRoom==='lottery',{hitPoint,hitRoom});
      await page.evaluate(()=>window.__immersiveQA.freezeNext=true);
      if(width<=800)await page.touchscreen.tap(hitPoint.x,hitPoint.y);else await page.mouse.click(hitPoint.x,hitPoint.y);
      await waitRoom('lottery');
      // The canonical reader commits before the same-origin presentation message
      // reaches its parent. Observe that real handshake, not a timing sleep.
      await page.locator('.castle-journey[data-room=lottery][data-direction=in]').waitFor({state:'attached'});
      const interrupted=await seekJourney(0,'interrupted-overview-contact');
      check('entry during browse starts at painted camera, not pending target',Math.abs(interrupted.camera.left-paintedBrowse.x)<2&&Math.abs(interrupted.camera.top-paintedBrowse.y)<2&&Math.abs(interrupted.camera.width-paintedBrowse.width)<2,{paintedBrowse,journey:interrupted.camera});
      await finishJourney();await returnHome();await noJourney();
      await f.locator('.castle-stage').evaluate(n=>{for(const a of n.getAnimations())a.finish();});
      await setOverview();

      // Natural playback is checked separately from deterministic frame seeking.
      await setOverview();const naturalBefore=await page.evaluate(()=>__immersiveQA.journeys.length);
      await pressRoom('insurance');await waitRoom('insurance');await noJourney();
      check('unpaused travel finishes once and keeps the committed destination',await page.evaluate(n=>__immersiveQA.journeys.length===n+1,naturalBefore)&&await f.locator('#room').getAttribute('data-account')==='insurance');
      await returnHome();await noJourney();

      // Instant entry and its return are genuinely free of camera layers.
      const beforeQuick=await page.evaluate(()=>__immersiveQA.journeys.length);
      await quick('insurance');await returnHome();
      check('quick rail and matching back skip all travel layers',await page.evaluate(n=>__immersiveQA.journeys.length===n,beforeQuick)&&await page.locator('.castle-journey').count()===0);

      // Interrupted motion cannot undo a newer destination, focus, or text.
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
      await f.locator('.spatial-room-name').click();await f.locator('.spatial-destination[data-destination=otoku]').click();await waitRoom('otoku');
      await noJourney();await page.waitForTimeout(850);
      check('newer room switch owns final state',await f.locator('#room').getAttribute('data-account')==='otoku'&&await f.locator('#draft-body').textContent()===rows[1].payload.draft);
      await returnHome();await noJourney();
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
      await f.locator('#desk-copy').focus();await page.keyboard.press('Escape');await noJourney();
      check('first Escape cancels presentation without leaving the work',await f.locator('#room').isVisible()&&await f.locator('#room').getAttribute('data-account')==='insurance');
      await page.keyboard.press('Escape');await home();await noJourney();
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');await returnHome();
      await quick('rakuten');await noJourney();await page.waitForTimeout(850);
      check('back then instant destination is not reverted by old finish',await f.locator('#room').getAttribute('data-account')==='rakuten'&&await f.locator('#draft-body').textContent()===rows[2].payload.draft);
      await returnHome();await noJourney();

      // Native sourcing is outside the iframe but must retain the same camera path.
      await setOverview();await pressRoom('sourcing',{hold:true});
      await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
      await page.locator('.castle-journey[data-room=sourcing][data-direction=in]').waitFor();
      check('sourcing uses original native management immediately',await page.locator('#ccCastleFrame').isVisible()===false&&await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing');
      await seekJourney(.56,'sourcing-threshold');await finishJourney();await screenshot('sourcing-landed');
      await page.evaluate(()=>window.__immersiveQA.freezeNext=true);await page.locator('[data-lounge-home]').click();await home();
      await page.locator('.castle-journey[data-room=sourcing][data-direction=out]').waitFor();await seekJourney(.88,'sourcing-return');await finishJourney();
      check('native return restores source door focus',await f.locator('.castle-room-hotspot[data-room=sourcing]').evaluate(n=>n===document.activeElement));

      // A hidden page abandons only the visual layer, never the committed work.
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await noJourney();
      await cf.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await cf.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      check('hide/resume cancels visuals without changing destination',await f.locator('#room').getAttribute('data-account')==='insurance'&&await page.locator('.castle-journey').count()===0);
      await returnHome();await noJourney();

      if(width===800){
        // Folding/resizing aborts obsolete camera geometry, not the open work.
        await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
        await page.locator('.castle-journey[data-room=insurance]').waitFor({state:'attached'});
        await page.setViewportSize({width:390,height:900});await noJourney();await cf.waitForFunction(()=>innerWidth===390);
        await assertReader('insurance');
        await page.evaluate(()=>navigator.clipboard.writeText('isolated-resize-copy-sentinel'));
        await f.locator('#desk-copy').click();await f.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
        await page.waitForFunction(async body=>(await navigator.clipboard.readText()).replace(/\r\n/g,'\n')===body,rows[0].payload.draft);
        check('folding mid-travel keeps the current draft usable',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===rows[0].payload.draft&&await f.locator('#room').getAttribute('data-account')==='insurance');
        await page.setViewportSize({width,height});await cf.waitForFunction(()=>innerWidth===800);await assertReader('insurance');
        check('unfolding does not resurrect the cancelled camera',await page.locator('.castle-journey').count()===0);
        await returnHome();await noJourney();
      }

      // OS and saved accessibility controls can cancel a journey already in flight.
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
      await page.emulateMedia({reducedMotion:'reduce'});await noJourney();
      check('mid-travel OS reduced motion keeps destination',await f.locator('#room').getAttribute('data-account')==='insurance');
      await returnHome();await noJourney();const quietStart=await page.evaluate(()=>__immersiveQA.journeys.length);
      await setOverview();await pressRoom('insurance');await waitRoom('insurance');await returnHome();
      check('reduced motion creates no journey in either direction',await page.evaluate(n=>__immersiveQA.journeys.length===n,quietStart));
      const quietAnimations=await cf.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.target?.closest?.('.spatial-castle')).length);
      check('reduced world has no idle or parallax animations',quietAnimations===0,quietAnimations);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await setOverview();await pressRoom('insurance',{hold:true});await waitRoom('insurance');
      await cf.evaluate(()=>{const n=document.getElementById('reduce-setting');n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}));});await noJourney();
      check('saved reduced-motion control cancels in-flight presentation',await f.locator('#room').getAttribute('data-account')==='insurance');
      await returnHome();await cf.evaluate(()=>{const n=document.getElementById('reduce-setting');n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));});

      // Audio must be opt-in; restoration and cosmetic updates must not trigger it.
      const beforeEnable=await cf.evaluate(()=>__immersiveQA.audio.length);
      await f.locator('.castle-sound-toggle').click();
      await f.locator('.castle-sound-toggle[aria-pressed=true]').waitFor();
      await quick('insurance');await returnHome();await noJourney();
      const enabled=await cf.evaluate(()=>({starts:__immersiveQA.audio.length,contexts:__immersiveQA.contexts,settings:JSON.parse(localStorage.getItem('shireito-courtyard-v1'))}));
      check('explicit sound control reuses existing preference and engine',enabled.starts>beforeEnable&&enabled.contexts===1&&enabled.settings.sound===true,enabled);
      await cf.evaluate(()=>{window.__qaOriginalHidden=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      const hiddenAudio=await cf.evaluate(()=>__immersiveQA.audio.length);await page.waitForTimeout(150);
      await cf.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(150);
      check('hidden and resume never replay effects',await cf.evaluate(()=>__immersiveQA.audio.length)===hiddenAudio);
      await f.locator('.castle-sound-toggle').click();const muted=await cf.evaluate(()=>__immersiveQA.audio.length);
      await quick('insurance');await returnHome();await noJourney();
      check('turning effects off remains silent',await cf.evaluate(()=>__immersiveQA.audio.length)===muted);

      // New visible settings control must expose the real, accessible modal and
      // restore focus, rather than only changing the hidden legacy inputs.
      await f.locator('.castle-experience-settings').click();
      await f.getByRole('dialog',{name:'システム',exact:true}).waitFor();
      const settingsTargets=await f.locator('#settings button, #settings select, #settings summary, #settings .segmented label, #settings .setting-line').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{text:n.textContent,width:r.width,height:r.height,visible:getComputedStyle(n).visibility!=='hidden'};}).filter(n=>n.visible&&n.width>0&&n.height>0));
      check('experience settings have real touch-sized controls',settingsTargets.every(n=>n.width>=44&&n.height>=44),settingsTargets);
      await f.locator('#settings .setting-line:has(#reduce-setting)').click();
      await f.locator('#settings .segmented label:has(input[value=quick])').click();
      check('settings UI updates the existing preferences',await cf.evaluate(()=>{const s=JSON.parse(localStorage.getItem('shireito-courtyard-v1'));return s.reduce===true&&s.pace==='quick';}));
      await screenshot('experience-settings');await page.keyboard.press('Escape');
      await f.locator('#settings:not([open])').waitFor({state:'attached'});
      check('settings Escape restores its new visible opener',await f.locator('.castle-experience-settings').evaluate(n=>n===document.activeElement));
      await f.locator('.castle-experience-settings').click();await f.getByRole('dialog',{name:'システム',exact:true}).waitFor();
      await f.locator('#settings .setting-line:has(#reduce-setting)').click();
      await f.locator('#settings .segmented label:has(input[value=normal])').click();await f.locator('#settings-close').click();
      check('settings close restores opener and normal mode',await f.locator('.castle-experience-settings').evaluate(n=>n===document.activeElement)&&await cf.evaluate(()=>!document.getElementById('reduce-setting').checked));
      await setOverview();
      const orrery=f.locator('.castle-orrery');await orrery.waitFor();
      const o=await orrery.evaluate(n=>({tag:n.tagName,name:n.getAttribute('aria-label')||n.textContent,disabled:n.disabled,rect:{width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height},touchAction:getComputedStyle(n).touchAction}));
      check('orrery is optional, labelled and touch-sized',o.tag==='BUTTON'&&!!o.name&&!o.disabled&&o.rect.width>=44&&o.rect.height>=44,o);
      const selectedBefore=await f.locator('.spatial-castle').getAttribute('data-selected');
      await orrery.focus();await page.keyboard.press('Enter');await screenshot('orrery-response');
      check('playful details visibly respond to keyboard activation',['turning','lit'].includes(await orrery.getAttribute('data-energy')));
      const ob=await orrery.boundingBox();await page.mouse.move(ob.x+ob.width/2,ob.y+ob.height/2);await page.mouse.down();await page.mouse.move(ob.x+ob.width/2+30,ob.y+ob.height/2,{steps:4});await page.mouse.up();
      check('playful details never navigate away from work',await f.locator('.account-board').isVisible()&&await f.locator('.spatial-castle').getAttribute('data-selected')===selectedBefore);
      check('touch exploration does not disable vertical page scrolling',o.touchAction!=='none',o.touchAction);
      if(width<=800){
        const session=await context.newCDPSession(page),rect=await orrery.boundingBox();
        const touch={x:rect.x+rect.width/2,y:rect.y+rect.height/2,id:1,radiusX:2,radiusY:2,force:1};
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
        for(const dx of [24,48,72,96])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+dx}]});
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
        check('long coarse-pointer orrery drag never browses to another room',await f.locator('.spatial-castle').getAttribute('data-selected')===selectedBefore&&await f.locator('.account-board').isVisible());
        const rotationAfterDrag=await f.locator('.spatial-castle').evaluate(n=>getComputedStyle(n).getPropertyValue('--orrery-turn').trim());
        await orrery.click();
        const rotationAfterClick=await f.locator('.spatial-castle').evaluate(n=>getComputedStyle(n).getPropertyValue('--orrery-turn').trim());
        check('the next orrery activation is not swallowed after a drag',rotationAfterClick!==rotationAfterDrag&&await orrery.getAttribute('data-energy')==='lit',{rotationAfterDrag,rotationAfterClick});
      }
      await f.locator('.castle-room-hotspot[data-room=insurance]').focus();await page.keyboard.press('ArrowRight');
      check('keyboard follows a real next destination',await f.locator('.castle-room-hotspot[data-room=otoku]').evaluate(n=>n===document.activeElement));
      check('no unexpected horizontal overflow',await cf.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      check('synthetic source records stay byte-for-byte unchanged',await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.filter(r=>__immersiveRecords.ids.includes(r.id)))===__immersiveRecords.original));
      check('no record writes or automatic external actions',await page.evaluate(()=>__rpgQA.writes.length===0&&__rpgQA.threads.simulatedWrites.length===0&&__immersiveRecords.external.length===0));
      check('no uncaught browser errors',errors.length===0,errors);check('no unexpected external network requests',blocked.length===0,blocked);
      if(width===390){
        // Losing the optional host renderer must not strand the old data/workflow.
        await context.route('**/castle-journey-host.js*',route=>route.abort());
        await page.goto(origin+'/command-center-98/app-v130.html');
        await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
        const fallback=page.frameLocator('#ccCastleFrame');await fallback.locator('.castle-quick-open[data-room=insurance]').waitFor();
        await fallback.locator('.castle-quick-open[data-room=insurance]').click();await fallback.locator('#draft-body').filter({hasText:'insurance の合成データです。'}).waitFor();
        await fallback.locator('#desk-copy').click();await fallback.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
        check('missing optional host renderer leaves original work usable',(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===rows[0].payload.draft&&await page.locator('.castle-journey').count()===0);
        await screenshot('host-renderer-fallback');
        await fallback.locator('#back').click();await fallback.locator('.castle-quick-open[data-room=sourcing]').click();
        await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
        check('fallback still opens native sourcing immediately',await page.locator('#mainWindow').getAttribute('data-cc-view')==='sourcing');
        check('optional renderer failure has no uncaught application exception',errors.length===0,errors);
      }
      result.audio=enabled;result.errors=errors;result.blocked=blocked;
      console.log(`PASS immersive real host ${width}×${height}: ${result.checks.length} checks, ${result.frames.length} rendered motion frames.`);
      await context.close();currentPage=null;
    }
  }catch(error){
    if(currentPage){await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),String(error.stack||error));}
    throw error;
  }finally{
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
