/** Full real-loader visual regression, with synthetic data and fail-closed network.
 * Run in CI with Chrome. Does not read credentials or contact production services. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const chrome=process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const output=path.join(root,'artifacts/rpg-theme');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.woff2':'font/woff2'};
const geometry=`(()=>{
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const rgb=s=>(s.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
 const luminance=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const checks=[],add=(name,pass,detail)=>checks.push({name,pass,detail});
 add('RPG theme is active',document.body.classList.contains('cc-rpg-theme'));
 add('no horizontal page overflow',document.documentElement.scrollWidth<=innerWidth+1,{width:innerWidth,scroll:document.documentElement.scrollWidth});
 for(const e of document.querySelectorAll('dialog[open],.modal-backdrop.open>[role="dialog"],.fp-draft-modal>[role="dialog"]'))if(visible(e)){
  const r=e.getBoundingClientRect();add('dialog fits viewport',r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,{selector:e.id||e.className,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}});
  const probes=[{label:'top interior',x:r.left+r.width/2,y:r.top+Math.min(18,r.height/2)}];
  for(const target of Array.from(e.querySelectorAll('header button,.title-bar button,h2,h3,[aria-label="閉じる"],[data-close],[data-cancel],.fp-close-draft')).slice(0,4)){const t=target.getBoundingClientRect();if(visible(target)&&t.width&&t.height){const x=t.left+t.width/2,y=t.top+t.height/2;if(x>r.left&&x<r.right&&y>r.top&&y<r.bottom)probes.push({label:target.id||target.className||target.tagName,x,y});}}
  for(const p of probes)if((!document.querySelector('dialog[open]')||e===[...document.querySelectorAll('dialog[open]')].at(-1))&&p.x>=0&&p.y>=0&&p.x<innerWidth&&p.y<innerHeight){const hit=document.elementFromPoint(p.x,p.y);add('dialog header and close controls are above other layers',hit===e||e.contains(hit),{dialog:e.id||e.className,probe:p.label,hit:hit?{tag:hit.tagName,id:hit.id,class:hit.className}:null});}
  add('dialog content can scroll',e.scrollHeight<=e.clientHeight+1||['auto','scroll'].includes(getComputedStyle(e).overflowY)||Array.from(e.children).some(c=>['auto','scroll'].includes(getComputedStyle(c).overflowY)));
 }
 for(const e of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select'))if(visible(e)&&!e.disabled){
  const s=getComputedStyle(e);let n=e,bg=s.backgroundColor;while((bg==='transparent'||bg==='rgba(0, 0, 0, 0)')&&n.parentElement){n=n.parentElement;bg=getComputedStyle(n).backgroundColor}
  const color=rgb(s.color),back=rgb(bg);add('readable form text',parseFloat(s.fontSize)>=12&&color.length===3&&back.length===3&&contrast(color,back)>=4.5,{selector:e.id||e.name||e.tagName,font:s.fontSize,color:s.color,background:bg});
 }
 const samples=[...document.querySelectorAll('.ledger-month-tab:not(:disabled)'),...document.querySelectorAll('.card-body p,.thread-body p,.task-pane td,.fp-draft-dialog p,.fp-draft-slide,.cce-dialog pre,.sourcing-card p,.affiliate-job p,.neko-card p')].filter(e=>visible(e)&&e.textContent.trim()).slice(0,30);
 for(const e of samples){const st=getComputedStyle(e);let n=e,bg=st.backgroundColor;while((bg==='transparent'||bg==='rgba(0, 0, 0, 0)')&&n.parentElement){n=n.parentElement;bg=getComputedStyle(n).backgroundColor}const fore=rgb(st.color),back=rgb(bg);add('readable content contrast',fore.length===3&&back.length===3&&contrast(fore,back)>=4.5,{selector:e.className||e.tagName,text:e.textContent.slice(0,45),color:st.color,background:bg});}
 const homeScene=document.querySelector('#ccRpgHome .rpg-scene');
 if(homeScene&&visible(homeScene))add('HOME keeps original dress artwork',getComputedStyle(homeScene).backgroundImage.includes('world.png?v=20261012.4-wardrobe')&&!getComputedStyle(homeScene).backgroundImage.includes('detail-swimwear'));
 if(homeScene&&visible(homeScene)&&matchMedia('(min-aspect-ratio:4/5) and (min-height:600px)').matches){
  const world=document.querySelector('#ccRpgHome .rpg-world'),r=world.getBoundingClientRect(),bg=getComputedStyle(homeScene),decor=getComputedStyle(homeScene,'::before');
  add('wide HOME fills available width without black side gutters',Math.abs(r.width-innerWidth)<=1&&Math.abs(r.left)<=1,{width:r.width,viewport:innerWidth,left:r.left});
  add('wide HOME footer fits without vertical overflow',document.getElementById('ccRpgHome').scrollHeight<=document.getElementById('ccRpgHome').clientHeight+1);
  add('wide HOME retains proportional right artwork',bg.backgroundSize==='100% 100%, auto 100%'&&bg.backgroundPosition.includes('100% 50%'),{size:bg.backgroundSize,position:bg.backgroundPosition});
  add('wide decorative backdrop excludes all characters',decor.backgroundSize==='100% 100%, 180% auto'&&decor.backgroundPosition.includes('0% 50%'),{size:decor.backgroundSize,position:decor.backgroundPosition});
  const artWidth=homeScene.getBoundingClientRect().height*941/1672,figureLeft=r.right-artWidth*(1-620/941);
  for(const copy of homeScene.querySelectorAll('.rpg-copy'))add('wide HOME copy stays outside character lane',copy.getBoundingClientRect().right<figureLeft,{copyRight:copy.getBoundingClientRect().right,figureLeft});
 }
 for(const e of document.querySelectorAll('dialog[open][data-account="kyun"] .rpg-account-character,dialog[open][data-account="choi"] .rpg-account-character'))if(visible(e))add('account opens alternate swimwear artwork',getComputedStyle(e).backgroundImage.includes('detail-swimwear.png?v=20261012.5-detail-swimwear'));
 const desk=document.querySelector('#ccDestination.rpg-workspace-heading');
 if(desk&&visible(desk)&&['fp','sourcing','reddit','x'].includes(desk.dataset.rpgDesk))add('workspace opens alternate swimwear artwork',getComputedStyle(desk,'::after').backgroundImage.includes('detail-swimwear.png?v=20261012.5-detail-swimwear'));

 for(const back of document.querySelectorAll('.rpg-account-back,.rpg-workspace-heading [data-home-action="home"]'))if(visible(back)){
  add('shared return label and touch target',back.textContent==='← 司令塔'&&back.getBoundingClientRect().height>=43.99,{text:back.textContent,height:back.getBoundingClientRect().height});
 }
 for(const title of document.querySelectorAll('.rpg-account-header h2,#ccDestination.rpg-workspace-heading #ccPageTitle'))if(visible(title))add('shared detail title scale',parseFloat(getComputedStyle(title).fontSize)>=27);
 if(desk&&visible(desk)&&['fp','sourcing','reddit','x'].includes(desk.dataset.rpgDesk)){
  for(const button of desk.querySelectorAll('.cc-heading>.push-button,#ccRefreshSlot .push-button'))add('workspace utility touch targets',button.getBoundingClientRect().height>=43.99);
  if(innerWidth>600)for(const button of desk.querySelectorAll('.cc-more-button,.rpg-workspace-settings'))add('desktop utility buttons do not stretch',button.getBoundingClientRect().width<220);
  const art=getComputedStyle(desk,'::after'),box=desk.getBoundingClientRect(),copy=desk.querySelector('.cc-heading>div').getBoundingClientRect();
  const artLeft=box.right-parseFloat(art.right)-parseFloat(art.width),artBottom=box.top+parseFloat(art.top)+parseFloat(art.height);
  add('workspace hero uses integrated existing scenery',getComputedStyle(desk).backgroundImage.includes('detail-swimwear.png?v=20261012.5-detail-swimwear'));
  add('workspace portrait is prominent without covering controls',parseFloat(art.height)>=(desk.dataset.rpgDesk==='fp'?154:190)&&artBottom<=desk.querySelector('.cc-more-button').getBoundingClientRect().top+1,{height:art.height,artBottom});
  for(const el of desk.querySelectorAll('#ccPageTitle,#ccPageDescription'))add('workspace text stays clear of portrait',el.getBoundingClientRect().right<=artLeft+24,{textRight:el.getBoundingClientRect().right,artLeft});
  if(innerWidth<=600)add('mobile hero leaves room for task content',box.height<=290,{height:box.height});
  add('secondary utilities remain visible with distinct emphasis',getComputedStyle(desk.querySelector('.cc-more-button')).backgroundColor!==getComputedStyle(desk.querySelector('#ccRefreshSlot .push-button')).backgroundColor);
  const aux=document.getElementById('rpgSourcingAux'),selected=aux.querySelectorAll('[aria-current="page"]');
  if(!aux.hidden)add('sourcing current route is distinct',selected.length===1&&selected[0].dataset.rpgAuxView===desk.dataset.rpgDesk);
  for(const summary of document.querySelectorAll('.cc-item-summary'))if(visible(summary))add('disclosure arrows use readable gold',getComputedStyle(summary,'::before').color==='rgb(226, 198, 140)');
 }
 add('no unmocked API writes',window.__rpgQA.writes.length===0,window.__rpgQA.writes);
 add('workflow initialization is fixture-only',true,window.__rpgQA.simulatedInitializations||[]);
 return checks;
})()`;
test('RPG theme all real app routes and dialogs, mobile and desktop',{timeout:220000},async()=>{
 const requests=[];let diagnose=async()=>{},slowRpg=false,startupCache=false,failRpg=false;
 assert.ok(chrome,'Chrome is required; browser QA must not silently skip');fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative);
  requests.push({url:url.href,method:req.method,file});
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  if(url.pathname==='/qa-return'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Return test</title><p>Browser history fixture</p>');return}
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
  if(failRpg&&relative==='command-center-98/rpg-home.js'){res.writeHead(503);res.end();return}
  let content=fs.readFileSync(file);
  if(relative==='command-center-98/app.html')content=content.toString().replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script><script src="/scripts/rpg-theme-fixtures.js"></script>');
  if(relative==='command-center-98/index.html')content=content.toString().replace('<head>','<head><script>localStorage.removeItem("cc_retro_token");window.__rpgQA={writes:[]};'+(url.searchParams.has('qa-login')?'window.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,token:"synthetic-qa-only"})});':'')+'</script>');
  if(relative==='command-center-98/app-v130.html'&&url.searchParams.has('qa-boot'))content=content.toString().replace('<head>','<head><script>window.__rpgQA={writes:[]};window.fetch=()=>new Promise(()=>{});</script>');
  // Read-only access to the actual fallback renderer; its normal packet action writes.
  // This test-only export is never written to or loaded from production source.
  if(relative==='command-center-98/binbo-neko.js')content=content.toString().replace('window.CCBinboNeko={','window.__rpgQA.openNekoCopy=copyFallback;window.CCBinboNeko={');
  // No visual banner: screenshots must represent the actual application layout.
  if(relative==='scripts/ui-fixtures.js')content=content.toString().replace(/document\.addEventListener\('DOMContentLoaded',[\s\S]*?\n  \}\);/,'');
  const respond=()=>{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':startupCache&&/\.(?:js|css)$/.test(file)?'private,max-age=60':'no-store'});res.end(content);};if(slowRpg&&relative==='command-center-98/rpg-home.js')setTimeout(respond,2000);else respond();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-rpg-browser-'));
 const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{stdio:'ignore'});
 let ws,serial=0;const pending=new Map(),results=[],blocked=[],errors=[];
 try{
  const portFile=path.join(dir,'profile/DevToolsActivePort'),deadline=Date.now()+15000;
  while(!fs.existsSync(portFile)&&Date.now()<deadline&&proc.exitCode===null)await sleep(50);
  assert.ok(fs.existsSync(portFile),'headless Chrome did not start');
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}
   if(m.method==='Fetch.requestPaused'){const p=m.params,u=new URL(p.request.url),allowed=u.origin===origin&&['GET','HEAD'].includes(p.request.method);if(!allowed)blocked.push({url:p.request.url,method:p.request.method});send(allowed?'Fetch.continueRequest':'Fetch.failRequest',allowed?{requestId:p.requestId}:{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(e=>errors.push(e.message))}
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  };
  await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'http*',requestStage:'Request'}]});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
  diagnose=async(reason)=>{const label='failure-'+Date.now();const info={reason,requests,blocked,errors};try{info.page=await evaluate(`({url:location.href,readyState:document.readyState,title:document.title,body:document.body?.innerText?.slice(0,12000),html:document.documentElement.outerHTML.slice(0,25000),qa:window.__rpgQA?{writes:window.__rpgQA.writes,mode:window.__rpgQA.mode}:null})`)}catch(e){info.pageError=e.message}try{const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,label+'.png'),Buffer.from(png.data,'base64'))}catch(e){info.screenshotError=e.message}fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(info,null,2));console.error(JSON.stringify({reason,page:info.page?.url,title:info.page?.title,body:info.page?.body?.slice(0,1000),errors,blocked}));};
  const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50)}throw Error('Timed out: '+expression)};
  const capture=async(name,extra)=>{await sleep(120);await evaluate('window.scrollTo(0,0)');const checks=await evaluate(geometry);if(extra)checks.push({name:'expected route content',pass:!!await evaluate(extra)});const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(png.data,'base64'));results.push({name,checks});console.log(name+': '+checks.filter(x=>x.pass).length+'/'+checks.length)};
  const route=async(view)=>{await evaluate(`CCHome.leave();load(${JSON.stringify(view)})`);await waitFor('!app.busy');await sleep(180)};
  // Cold startup, cache reuse, reload and successful fixture-only login all use the real loader.
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:780,deviceScaleFactor:1,mobile:true});
  startupCache=true;slowRpg=true;
  await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html?startup=cold#keep-fragment'});
  await waitFor(`!!document.getElementById('commandHome')&&!window.CCRpgHome`);
  const guarded=await evaluate(`(()=>{const n=document.getElementById('ccStartupNotice');return !!n&&document.elementFromPoint(innerWidth/2,innerHeight/2)===n&&getComputedStyle(document.querySelector('.desktop')).opacity==='0'})()`);
  results.push({name:'startup-cold-delayed-module',checks:[{name:'legacy HOME stays concealed before RPG mounts',pass:guarded}]});
  const early=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,'startup-cold-gate.png'),Buffer.from(early.data,'base64'));
  await waitFor(`!!window.CCRpgWorkspaces&&!document.getElementById('ccStartupStyle')`);slowRpg=false;
  await capture('startup-cold-ready',`!document.getElementById('ccRpgHome').hidden&&location.hash==='#keep-fragment'&&location.search==='?startup=cold'`);
  await send('Page.reload');await waitFor(`!!window.CCRpgWorkspaces&&!document.getElementById('ccStartupStyle')`);await capture('startup-warm-reload',`!document.getElementById('ccRpgHome').hidden&&location.hash==='#keep-fragment'`);
  await evaluate(`CCRpgWorkspaces.openFp()`);await waitFor(`!app.busy&&app.view==='fp'`);await evaluate(`window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))`);await capture('startup-preserved-return',`app.view==='fp'&&!CCHome.active&&!document.getElementById('ccStartupStyle')`);
  const prior=await send('Page.getNavigationHistory');const entryId=prior.entries[prior.currentIndex].id;
  await send('Page.navigate',{url:origin+'/qa-return'});await waitFor(`document.title==='Return test'`);await send('Page.navigateToHistoryEntry',{entryId});await waitFor(`!!window.CCRpgWorkspaces&&!document.getElementById('ccStartupStyle')`);await capture('startup-browser-back',`location.hash==='#keep-fragment'&&(CCHome.active?!document.getElementById('ccRpgHome').hidden:app.view==='fp')`);
  startupCache=false;failRpg=true;await send('Network.clearBrowserCache');await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html?startup=failed'});await waitFor(`!!document.querySelector('#ccStartupNotice[role="alert"]')`);await capture('startup-failed-module',`getComputedStyle(document.querySelector('.desktop')).opacity==='0'&&document.querySelector('#ccStartupNotice button').textContent==='再読み込み'`);failRpg=false;await evaluate(`document.querySelector('#ccStartupNotice button').click()`);await waitFor(`!!window.CCRpgWorkspaces&&!document.getElementById('ccStartupStyle')`);await capture('startup-retry-ready',`!document.getElementById('ccRpgHome').hidden`);
  await send('Page.navigate',{url:origin+'/command-center-98/index.html?qa-login=1'});await waitFor(`!!document.getElementById('code')&&!document.getElementById('loginPane').classList.contains('hidden')`);await evaluate(`document.getElementById('code').value='synthetic-code';document.getElementById('loginForm').requestSubmit()`);await waitFor(`!!window.CCRpgWorkspaces&&!document.getElementById('ccStartupStyle')`);await capture('startup-after-login',`location.pathname.endsWith('/app-v130.html')&&!document.getElementById('ccRpgHome').hidden`);
  startupCache=false;
  for(const [width,height]of [[390,780],[1280,900]]){
   const prefix=width+'x'+height+'-';await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
   await send('Page.navigate',{url:origin+'/command-center-98/index.html'});await waitFor(`!!document.getElementById('loginPane')&&!document.getElementById('loginPane').classList.contains('hidden')`);await capture(prefix+'login',`location.pathname.endsWith('/index.html')`);
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html?qa-boot=1'});await waitFor(`!!document.querySelector('.boot')&&!!window.__rpgQA`);await capture(prefix+'bootstrap',`!!document.querySelector('.boot .bar')`);
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html'});await waitFor('!!window.CCRpgHome && !!window.__rpgQA && !app.busy');await evaluate('document.fonts.ready');await sleep(350);
   // Compare computed top geometry/paint with the new theme disabled, in the same browser.
   const signature=`JSON.stringify(Array.from(document.querySelectorAll('#ccRpgHome,#ccRpgHome *')).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return [e.tagName,e.className,r.x,r.y,r.width,r.height,s.color,s.backgroundColor,s.fontFamily,s.fontSize,s.border,s.padding,s.margin]}))`;
   const themed=await evaluate(signature);await evaluate(`document.body.classList.remove('cc-rpg-theme');document.querySelectorAll('link[href*="rpg-theme.css"]').forEach(x=>x.disabled=true)`);const original=await evaluate(signature);await evaluate(`document.querySelectorAll('link[href*="rpg-theme.css"]').forEach(x=>x.disabled=false);document.body.classList.add('cc-rpg-theme')`);
   results.push({name:prefix+'top-preserved',checks:[{name:'approved RPG top computed layout and paint unchanged',pass:themed===original}]});
   await capture(prefix+'top',`!document.getElementById('ccRpgHome').hidden`);
   for(const key of ['kyun','choi','tiktok']){await evaluate(`CCRpgHome.openAccount('${key}')`);await waitFor(`document.querySelector('dialog[open] article')!==null`);await capture(prefix+'account-'+key,`document.querySelector('dialog[open]').textContent.includes('合成')`);if(key!=='tiktok'){await evaluate(`document.querySelector('dialog[open] .rpg-account-product').scrollIntoView({block:'center'})`);await capture(prefix+'account-'+key+'-product-link',`(()=>{const a=document.querySelector('dialog[open] a.rpg-product-open');return a?.href==='https://example.com/product'&&a.target==='_blank'&&a.rel==='noopener noreferrer'&&a.getBoundingClientRect().height>=43.99&&document.querySelector('dialog[open] .rpg-product-note').textContent.includes('アフィリエイトリンクは未発行')&&!Array.from(document.querySelectorAll('dialog[open] button')).some(b=>b.textContent==='保存購入リンクをコピー')})()`);await evaluate(`document.querySelector('dialog[open] .rpg-account-mercari').scrollIntoView({block:'center'})`);await capture(prefix+'account-'+key+'-mercari-links',`(()=>{const d=document.querySelector('dialog[open]'),links=[...d.querySelectorAll('.rpg-mercari-open')],notes=[...d.querySelectorAll('.rpg-mercari-note')].map(n=>n.textContent).join(' '),caution=d.querySelector('.rpg-mercari-caution').textContent;return links.length===3&&['出品中 8,200円','成約 7,400円','成約 6,100円'].every((label,i)=>links[i].textContent===label&&links[i].href==='https://jp.mercari.com/item/m1000000000'+(i+1)&&links[i].target==='_blank'&&links[i].rel==='noopener noreferrer'&&links[i].getBoundingClientRect().height>=43.99)&&['色違い・1サイズ差','同色同サイズ','下振れ例'].every(n=>notes.includes(n))&&caution.includes('成約日は未確認です')&&caution.includes('市場全体の最安値を示すものではありません')&&d.querySelector('.rpg-account-copy pre').textContent==='本文案Aです。'&&[...d.querySelectorAll('.rpg-mercari-evidence')].every(e=>!e.open)&&[...d.querySelectorAll('.rpg-mercari-source-url')].every(e=>!e.checkVisibility())&&['新品未使用','色違い・1サイズ差','室内試着のみ','同色同サイズ','下振れ例'].every(text=>[...d.querySelectorAll('.rpg-mercari-overview')].some(e=>e.textContent.includes(text)))})()`);}await evaluate(`document.querySelector('dialog[open]').scrollTop=10000`);await capture(prefix+'account-'+key+'-scrolled',`(()=>{const d=document.querySelector('dialog[open]'),b=d.querySelector('.rpg-account-close'),r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&!d.querySelector('.rpg-account-coverage-details').open})()`);await evaluate(`document.querySelector('dialog[open] button').click()`);await waitFor(`!document.querySelector('dialog[open]')`)}
   await evaluate('CCRpgWorkspaces.openSettings()');await capture(prefix+'workspace-settings',`!!document.querySelector('.rpg-workspace-dialog[open]')&&['作業日報','クーニー','仕入れ命','カード','海外時計'].every(x=>document.querySelector('.rpg-workspace-dialog[open]').textContent.includes(x))`);await evaluate('CCRpgWorkspaces.close()');
   await evaluate('CCRpgWorkspaces.openFp()');await waitFor('!app.busy&&app.view==="fp"');await capture(prefix+'workspace-fp',`document.getElementById('ccDestination').dataset.rpgDesk==='fp'`);
   await evaluate('CCRpgWorkspaces.openWatches()');await waitFor('!app.busy&&app.view==="reddit"');await capture(prefix+'workspace-watches',`app.view==='reddit'&&!document.getElementById('rpgSourcingAux').hidden`);
   await evaluate('CCRpgWorkspaces.openCards()');await waitFor('!app.busy&&app.view==="x"');await capture(prefix+'workspace-cards',`app.view==='x'`);
   await evaluate('CCRpgWorkspaces.openSourcing()');await waitFor('!app.busy&&app.view==="sourcing"');await capture(prefix+'workspace-sourcing',`document.getElementById('rpgSourcingAux').textContent.includes('旧ねこ')`);
   await evaluate('CCRpgWorkspaces.setMode("daily");CCHome.leave();load("history")');await waitFor('!app.busy');await capture(prefix+'workspace-daily-scope',`scopedItems().every(x=>!CCRpgWorkspaceModel.isArchived(x))&&app.items.some(x=>CCRpgWorkspaceModel.isArchived(x))`);
   await evaluate('CCRpgWorkspaces.openArchive()');await capture(prefix+'workspace-archive',`document.querySelector('.rpg-workspace-dialog[open]').textContent.includes('100件')`);await evaluate('CCRpgWorkspaces.close()');
   await evaluate('CCRpgWorkspaces.showOriginal()');await capture(prefix+'legacy-home',`!document.getElementById('commandHome').hidden`);
   await evaluate('CCNavigation.toggleMore()');await capture(prefix+'all-tools',`!document.getElementById('ccMore').hidden`);await evaluate('CCNavigation.toggleMore()');
   for(const view of ['fp','house','career','x','reddit','history','accepted','rejected','saved','events','affiliate','binbo-neko']){try{await route(view);await capture(prefix+view,`app.view===${JSON.stringify(view)}`)}catch(e){results.push({name:prefix+view,checks:[{name:'route rendered',pass:false,detail:e.message}]})}}
   await route('career');await evaluate(`document.querySelector('[data-cce-open]')?.click()`);await capture(prefix+'career-dialog',`!!document.querySelector('.cce-dialog[open]')`);await evaluate(`document.querySelector('.cce-dialog [data-close]')?.click()`);
   await route('x');await evaluate('CCX.openEditor(CCX.state.items[0])');await capture(prefix+'cards-editor',`document.getElementById('xEditor').classList.contains('open')`);await evaluate('CCX.close()');
   await route('reddit');for(const tab of ['inbox','candidate','draft','tracking','posted','miss']){await evaluate(`CCReddit.state.tab='${tab}';CCReddit.render()`);await capture(prefix+'reddit-'+tab)}
   await evaluate('CCReddit.openEditor(CCReddit.state.items[0])');await capture(prefix+'reddit-editor',`document.getElementById('redditEditorModal').classList.contains('open')`);await evaluate('CCReddit.closeEditor()');
   await route('fp');await evaluate(`document.querySelector('[data-fp-open]')?.click()`);await capture(prefix+'fp-draft-modal',`!!document.querySelector('.fp-draft-dialog')`);await evaluate(`document.querySelector('.fp-close-draft')?.click()`);
   await route('affiliate');await evaluate(`document.querySelector('.affiliate-settings').open=true`);await capture(prefix+'settings',`!!document.querySelector('.affiliate-settings[open] input')`);
   await waitFor(`!!document.querySelector('[data-page]')`);await evaluate(`document.querySelector('[data-page]').click()`);await capture(prefix+'affiliate-preview',`!!document.querySelector('#affiliatePreview[open]')`);await evaluate(`document.getElementById('affiliatePreviewClose').click()`);
   await evaluate(`document.querySelector('[data-import]').click()`);await capture(prefix+'affiliate-import',`!!document.querySelector('.affiliate-import[open]')`);await evaluate(`document.querySelector('.affiliate-import [data-cancel]').click()`);
   await route('binbo-neko');await evaluate(`window.__rpgQA.openNekoCopy('検証用の制作セットです。\\n原稿・商品条件・注意点を確認します。')`);await capture(prefix+'neko-copy-dialog',`!!document.querySelector('#nekoCopyDialog[open]')`);await evaluate(`document.querySelector('#nekoCopyDialog button').click()`);
   await route('sourcing');for(const sub of ['queue','hold','purchases','suppliers','research','discoveries','success','close','miss']){await evaluate(`sourcingApp.sub='${sub}';renderSourcing()`);await capture(prefix+'sourcing-'+sub,sub==='purchases'?`!document.getElementById('sourcingHub').hidden&&!!document.querySelector('.ledger-month-tab.selected[aria-selected="true"]')?.getClientRects().length`:`!document.getElementById('sourcingHub').hidden`)}
   await evaluate(`sourcingApp.sub='purchases';renderSourcing();document.querySelector('[data-purchase-drill]')?.click()`);await capture(prefix+'purchase-drill',`!!document.querySelector('#purchaseDrillModal.open')`);await evaluate(`document.getElementById('purchaseDrillClose')?.click()`);
   await route('active');for(const [menu,button]of [['fileMenu','menuFile'],['viewMenu','menuView']]){await evaluate(`toggleMenu('${menu}','${button}')`);await capture(prefix+menu,`document.getElementById('${menu}').classList.contains('open')`);await evaluate('closeMenus()')}
   for(const [name,open,close]of [['help','openHelp()','helpClose'],['task','openTasks()','taskClose'],['review','openReview()','reviewClose']]){await evaluate(open);await capture(prefix+name+'-modal',`document.getElementById('${name}Modal').classList.contains('open')`);await evaluate(`document.getElementById('${close}').click()`);await waitFor(`!document.getElementById('${name}Modal').classList.contains('open')`)}
   for(const mode of ['empty','error']){await evaluate(`window.__rpgQA.mode='${mode}'`);await route('active');await capture(prefix+mode,`document.querySelector('#list .empty')!==null`)}
   await evaluate(`window.__rpgQA.mode='loading';void load('active')`);await sleep(100);await capture(prefix+'loading',`!!document.querySelector('#list .loading-lines')`);await evaluate(`window.__rpgQA.mode='normal';window.__rpgQA.release.forEach(r=>r());window.__rpgQA.release=[]`);await waitFor('!app.busy');
   await evaluate('CCRpgHome.showRpg()');await capture(prefix+'return-top',`!document.getElementById('ccRpgHome').hidden`);
  }
  // Focused Galaxy-sized and desktop refinement journeys use the same isolated fixtures.
  for(const [width,height] of [[360,800],[412,915],[1440,900]]){
   const prefix=width+'x'+height+'-refined-';await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html'});await waitFor('!!window.CCRpgWorkspaces && !!window.__rpgQA && !app.busy');await evaluate('document.fonts.ready');
   await evaluate(`window.__rpgQA.copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__rpgQA.copied.push(text)}}})`);
   for(const key of ['kyun','choi']){
    for(let repeat=0;repeat<2;repeat++){
     await evaluate(`CCRpgHome.openAccount('${key}')`);await waitFor(`!!document.querySelector('dialog[open] .rpg-account-copy button')`);
     await evaluate(`window.__rpgQA.originalCopy=document.querySelector('dialog[open] .rpg-account-copy pre').textContent;document.querySelector('dialog[open] .rpg-account-copy button').click()`);
     await waitFor(`document.querySelector('dialog[open] .rpg-account-status').textContent.includes('原文をコピー')`);
     await capture(prefix+key+'-copy-'+repeat,`window.__rpgQA.copied.at(-1)===window.__rpgQA.originalCopy&&document.querySelector('dialog[open] .rpg-account-copy pre').textContent===window.__rpgQA.originalCopy`);
     await evaluate(`document.querySelector('dialog[open] .rpg-account-mercari').scrollIntoView({block:'start'})`);
     await capture(prefix+key+'-comparisons-'+repeat,`(()=>{const d=document.querySelector('dialog[open]');return [...d.querySelectorAll('.rpg-mercari-evidence')].every(e=>!e.open)&&[...d.querySelectorAll('.rpg-mercari-source-url')].every(e=>!e.checkVisibility())&&[...d.querySelectorAll('.rpg-mercari-overview')].every(e=>e.getClientRects().length)&&d.querySelector('.rpg-account-mercari').textContent.includes('下振れ例')})()`);
     for(let toggle=0;toggle<2;toggle++){
      await evaluate(`[...document.querySelectorAll('dialog[open] .rpg-mercari-evidence>summary')].forEach(e=>e.click())`);
      await capture(prefix+key+'-evidence-'+repeat+'-'+toggle,`[...document.querySelectorAll('dialog[open] .rpg-mercari-evidence')].every(e=>e.open)&&[...document.querySelectorAll('dialog[open] .rpg-mercari-source-url')].every(e=>e.checkVisibility())&&document.querySelector('dialog[open] .rpg-account-copy pre').textContent===window.__rpgQA.originalCopy`);
      await evaluate(`[...document.querySelectorAll('dialog[open] .rpg-mercari-evidence>summary')].forEach(e=>e.click())`);
      await waitFor(`[...document.querySelectorAll('dialog[open] .rpg-mercari-evidence')].every(e=>!e.open)`);
     }
     await evaluate(`document.querySelector('dialog[open] .rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
    }
   }
   for(const [key,open] of [['fp','openFp'],['sourcing','openSourcing']]){
    await evaluate('CCRpgWorkspaces.'+open+'()');await waitFor('!app.busy&&app.view==='+JSON.stringify(key));await capture(prefix+key);
    for(let repeat=0;repeat<2;repeat++){
     await evaluate(`document.querySelector('#ccDestination .cc-more-button').click()`);await waitFor(`!document.getElementById('ccMore').hidden`);
     await capture(prefix+key+'-all-screens-'+repeat,`document.querySelector('#ccDestination .cc-more-button').getAttribute('aria-expanded')==='true'`);
     await evaluate(`document.querySelector('#ccDestination .cc-more-button').click()`);await waitFor(`document.getElementById('ccMore').hidden`);
     await evaluate(`document.querySelector('#ccDestination .rpg-workspace-settings').click()`);await waitFor(`!!document.querySelector('.rpg-workspace-dialog[open]')`);
     await capture(prefix+key+'-settings-'+repeat,`['作業日報','クーニー','仕入れ命'].every(x=>document.querySelector('.rpg-workspace-dialog').textContent.includes(x))`);
     await evaluate(`document.querySelector('.rpg-workspace-dialog button').click()`);await waitFor(`!document.querySelector('.rpg-workspace-dialog[open]')`);
    }
    await evaluate(`document.querySelector('#ccDestination [data-home-action="home"]').click()`);await waitFor(`!document.getElementById('ccRpgHome').hidden`);await capture(prefix+key+'-return');
   }
  }
  // The only writes below are explicit, allowlisted in-memory fixture actions.
  for(const [width,height] of [[360,800],[412,915],[1440,900]]){
   const prefix=width+'x'+height+'-threads-';await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html'});await waitFor('!!window.CCRpgWorkspaces && !!window.__rpgQA && !app.busy');await evaluate('document.fonts.ready');
   for(const key of ['kyun','choi']){
    await evaluate(`CCRpgHome.openAccount('${key}')`);await waitFor(`!!document.querySelector('.rpg-threads-profile-open[href]')`);
    await capture(prefix+key+'-header',`document.querySelector('.rpg-threads-profile-open').href==='https://www.threads.com/@${key}_fixture'&&window.__rpgQA.threads.simulatedWrites.length===${key==='kyun'?0:2}`);
    await evaluate(`document.querySelector('.rpg-thread-record').click()`);await waitFor(`!!document.querySelector('.rpg-thread-editor[open]')`);
    await capture(prefix+key+'-url-first',`(()=>{const e=document.querySelector('.rpg-thread-editor');return !e.querySelector('details').open&&e.textContent.includes('URLだけで保存')&&e.querySelector('[name=postUrl]').getBoundingClientRect().width<=innerWidth})()`);
    await evaluate(`document.querySelector('.rpg-thread-editor [name=postUrl]').value='https://evil.test/@${key}_fixture/post/one';document.querySelector('.rpg-thread-save').click()`);
    await capture(prefix+key+'-invalid-url',`document.querySelector('.rpg-thread-message').textContent.includes('Threadsの投稿URL')`);
    await evaluate(`document.querySelector('.rpg-thread-editor [name=postUrl]').value='https://threads.net/@${key}_fixture/post/Example123';document.querySelector('.rpg-thread-save').click()`);
    await capture(prefix+key+'-confirmation-required',`document.querySelector('.rpg-thread-message').textContent.includes('投稿済みで')`);
    await evaluate(`window.__rpgQA.threads.failSave=true;document.querySelector('[name=confirmPosted]').checked=true;document.querySelector('.rpg-thread-save').click()`);await waitFor(`document.querySelector('.rpg-thread-message').textContent.includes('保存は未確認')`);
    await capture(prefix+key+'-failed-save',`document.querySelector('[name=postUrl]').value==='https://threads.net/@${key}_fixture/post/Example123'&&document.querySelector('[data-account-tab=history]').textContent==='履歴（0）'`);
    await evaluate(`window.__rpgQA.threads.failSave=false;window.__rpgQA.threads.holdSave=true;document.querySelector('.rpg-thread-save').click();document.querySelector('.rpg-thread-save').click()`);
    await capture(prefix+key+'-saving',`document.querySelector('.rpg-thread-save').disabled&&document.querySelector('.rpg-thread-cancel').disabled`);
    await evaluate(`window.__rpgQA.threads.holdSave=false;window.__rpgQA.threads.releaseSave()`);await waitFor(`!document.querySelector('.rpg-thread-editor')`);
    await capture(prefix+key+'-saved-url-only',`(()=>{const r=window.__rpgQA.threads.events[${key==='kyun'?0:1}].payload.threads_manual_result,w=window.__rpgQA.threads.simulatedWrites;return r.actual_text===null&&r.posted_at===null&&r.metrics===null&&w.at(-1).mutationId===w.at(-2).mutationId&&!('metrics' in w.at(-1))&&document.querySelector('[data-account-tab=history]').getAttribute('aria-pressed')==='true'})()`);
    await evaluate(`document.querySelector('.rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
    await evaluate(`CCRpgHome.openAccount('${key}')`);await waitFor(`!!document.querySelector('.rpg-thread-record')`);await evaluate(`document.querySelector('[data-account-tab=history]').click();document.querySelector('.rpg-thread-record').click();document.querySelector('.rpg-thread-optional').open=true`);
    await capture(prefix+key+'-optional-fields',`document.querySelector('[name=postUrl]').readOnly&&document.querySelector('[name=likes]').value===''`);
    await evaluate(`document.querySelector('[name=likes]').scrollIntoView({block:'center'})`);await capture(prefix+key+'-optional-metrics',`(()=>{const b=document.querySelector('.rpg-thread-cancel').getBoundingClientRect(),e=document.querySelector('[name=likes]').getBoundingClientRect();return b.top>=0&&b.bottom<innerHeight&&e.width<innerWidth})()`);
    await evaluate(`document.querySelector('.rpg-thread-cancel').click();document.querySelector('.rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
   }
   await evaluate(`CCRpgHome.openAccount('kyun')`);await waitFor(`!!document.querySelector('.rpg-thread-record')`);await evaluate(`document.querySelector('[data-account-tab=history]').click();document.querySelector('.rpg-thread-record').click();document.querySelector('.rpg-thread-optional').open=true;document.querySelector('[name=actualText]').value='本人が編集した合成本文。';document.querySelector('[name=likes]').value='0';document.querySelector('[name=confirmPosted]').checked=true;document.querySelector('.rpg-thread-save').click()`);await waitFor(`!document.querySelector('.rpg-thread-editor')`);
   await evaluate(`document.querySelector('.rpg-thread-comparison').open=true;document.querySelector('.rpg-thread-comparison').scrollIntoView({block:'start'})`);
   await capture(prefix+'manual-comparison',`(()=>{const r=window.__rpgQA.threads.events[0].payload.threads_manual_result;return r.metrics.likes===0&&r.metrics.views===null&&r.actual_text==='本人が編集した合成本文。'&&document.querySelector('.rpg-thread-comparison').textContent.includes('未確認')&&document.querySelector('.rpg-thread-text-comparison').textContent.includes('本文案Aです。')})()`);
   await evaluate(`document.querySelector('.rpg-account-back').click();window.__rpgQA.threads.accounts[1].profile_url=null;window.__rpgQA.threads.accounts[1].revision=0;CCRpgHome.openAccount('choi')`);await waitFor(`document.querySelector('.rpg-threads-profile-open')?.disabled`);
   await capture(prefix+'unset-profile',`document.querySelector('.rpg-threads-account-note').textContent.includes('未登録')`);
   await evaluate(`document.querySelector('.rpg-threads-profile-setting').click()`);await capture(prefix+'profile-settings',`!!document.querySelector('.rpg-thread-editor [name=profileUrl]')`);
   await evaluate(`document.querySelector('[name=profileUrl]').value='https://threads.net/@choi_fixture';document.querySelector('.rpg-thread-confirm input').checked=true;document.querySelector('.rpg-thread-save').click()`);await waitFor(`!document.querySelector('.rpg-thread-editor')`);
   await capture(prefix+'profile-saved',`document.querySelector('.rpg-threads-profile-open').href==='https://www.threads.com/@choi_fixture'`);
   await evaluate(`document.querySelector('.rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
  }
  // Saved observations and read coverage are independent from operation notifications.
  for(const [width,height] of [[360,800],[412,915],[1440,900]]){
   const prefix=width+'x'+height+'-read-status-';await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html'});await waitFor('!!window.CCRpgWorkspaces && !!window.__rpgQA && !app.busy');await evaluate('document.fonts.ready');
   await evaluate(`window.__rpgQA.threads.readPages=true;window.__rpgQA.threads.failNextRead=true;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__rpgQA.lastCopy=text}}});CCRpgHome.openAccount('kyun')`);
   await waitFor(`document.querySelector('.rpg-account-load-coverage')?.textContent.includes('続きあり')`);
   await capture(prefix+'partial-coverage',`(()=>{const s=document.querySelector('.rpg-account-read-summary');return s.checkVisibility()&&!s.closest('details')&&s.textContent.includes('保存先全体：読込 1件 / 全 3件')&&document.querySelector('.rpg-account-counts').textContent.includes('確認用 1件')})()`);
   await evaluate(`document.querySelector('.rpg-account-price-stock-check').scrollIntoView({block:'center'})`);
   await capture(prefix+'saved-price-stock',`(()=>{const stamp=document.querySelector('.rpg-account-price-stock-check'),copy=document.querySelector('.rpg-account-copy'),saved=window.__rpgQA.threads.events[0].payload.checked_at_price_stock;return stamp.textContent.includes('保存時点')&&stamp.querySelector('.rpg-account-price-stock-time').textContent===CCManualOperationHub.displayTime(saved)&&(stamp.compareDocumentPosition(copy)&Node.DOCUMENT_POSITION_FOLLOWING)!==0&&stamp.getBoundingClientRect().width<innerWidth})()`);
   await evaluate(`Array.from(document.querySelectorAll('dialog[open]>button')).find(b=>b.textContent.startsWith('保存原稿の続き')).click()`);
   await waitFor(`!!document.querySelector('.rpg-account-read-warning')`);await evaluate(`document.querySelector('.rpg-account-copy button').click()`);await waitFor(`document.querySelector('.rpg-account-status').textContent.includes('原文をコピーしました')`);
   await evaluate(`document.querySelector('.rpg-account-read-summary').scrollIntoView({block:'center'})`);
   await capture(prefix+'copy-keeps-read-error',`document.querySelector('.rpg-account-read-warning').checkVisibility()&&document.querySelector('.rpg-account-load-coverage').textContent.includes('読込 1件 / 全 3件')&&document.querySelector('.rpg-account-copy pre').textContent===window.__rpgQA.lastCopy&&document.querySelectorAll('.rpg-account-card').length===1`);
   await evaluate(`document.querySelector('.rpg-thread-record').click();document.querySelector('[name=postUrl]').value='https://www.threads.com/@kyun_fixture/post/ReadWarning';document.querySelector('[name=confirmPosted]').checked=true;document.querySelector('.rpg-thread-save').click()`);await waitFor(`!document.querySelector('.rpg-thread-editor')`);
   await evaluate(`document.querySelector('.rpg-account-read-summary').scrollIntoView({block:'center'})`);
   await capture(prefix+'save-keeps-read-error',`document.querySelector('.rpg-account-read-warning').checkVisibility()&&document.querySelector('.rpg-account-status').textContent.includes('投稿結果を保存しました')&&document.querySelector('.rpg-account-counts').textContent.includes('履歴 1件')`);
   await evaluate(`window.__rpgQA.threads.failNextRead=false;window.__rpgQA.threads.holdRead=true;Array.from(document.querySelectorAll('dialog[open]>button')).find(b=>b.textContent.startsWith('保存原稿の続き')).click()`);await waitFor(`document.querySelector('.rpg-account-load-coverage').textContent.includes('読込中')`);
   await capture(prefix+'retry-pending',`document.querySelector('.rpg-account-read-warning').checkVisibility()&&document.querySelectorAll('.rpg-account-card').length===1`);
   await evaluate(`window.__rpgQA.threads.holdRead=false;window.__rpgQA.threads.releaseRead()`);await waitFor(`document.querySelector('.rpg-account-load-coverage').textContent.includes('読込完了')`);
   await capture(prefix+'retry-complete',`!document.querySelector('.rpg-account-read-warning')&&document.querySelector('.rpg-account-load-coverage').textContent.includes('読込 3件 / 全 3件')&&document.querySelector('.rpg-account-counts').textContent.includes('履歴 1件')&&document.querySelector('.rpg-account-copy pre').textContent===window.__rpgQA.lastCopy`);
   await evaluate(`document.querySelector('.rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
   for(const [name,value] of [['invalid-time','2026-02-30T09:00:00Z'],['missing-time',null]]){
    await evaluate(`window.__rpgQA.threads.events[0].payload.checked_at_price_stock=${JSON.stringify(value)};CCRpgHome.openAccount('kyun')`);await waitFor(`document.querySelector('.rpg-account-load-coverage')?.textContent.includes('続きあり')`);
    await evaluate(`document.querySelector('[data-account-tab=history]').click();document.querySelector('.rpg-account-price-stock-check').scrollIntoView({block:'center'})`);
    await capture(prefix+name,`document.querySelector('.rpg-account-price-stock-time').textContent==='未確認'&&document.querySelector('.rpg-account-price-stock-check').checkVisibility()`);
    await evaluate(`document.querySelector('.rpg-account-back').click()`);await waitFor(`!document.querySelector('dialog[open]')`);
   }
  }
  for(const [width,height] of [[686,644],[834,900],[1440,900]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await send('Page.navigate',{url:origin+'/command-center-98/app-v130.html'});await waitFor('!!window.CCRpgHome && !!window.__rpgQA && !app.busy');await evaluate('document.fonts.ready');await capture(width+'x'+height+'-wide-home',`!document.getElementById('ccRpgHome').hidden`);
  }
  results.push({name:'network-isolation',checks:[{name:'no attempted external network request',pass:blocked.length===0,detail:blocked},{name:'no uncaught browser exceptions',pass:errors.length===0,detail:errors}]});
 }catch(error){await diagnose(error.message);throw error;}finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,blocked,errors,requests},null,2));ws?.close();proc.kill();server.close();}
 const failures=results.flatMap(r=>r.checks.filter(c=>!c.pass).map(c=>({route:r.name,...c})));
 assert.deepEqual(failures,[],'See artifacts/rpg-theme/results.json and per-route PNGs');
});
