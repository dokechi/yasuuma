// Real production loader and current lounge, with isolated synthetic API responses.
// Retained classic-castle visuals are exercised by their direct-entry fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-spatial-prototype');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const insuranceBody='合成データの保険原稿です。保障内容と条件を確認してから判断します。\n\nコピーは投稿ではありません。保存済みの文章をそのまま読みます。';
const fixtureScript=`(()=>{
  const row={id:901,taskId:'insurance-threads-v1',eventKey:'unified-insurance',title:'保険を見直す前の確認',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:${JSON.stringify(insuranceBody)},date:'2026-10-30',review_status:'確認用下書き',sources_note:'検証専用の出典記録'}};
  __rpgQA.threads.events.push(row);
  window.__unifiedQA={original:JSON.stringify(row),requests:[],external:[]};
  window.open=(...args)=>{__unifiedQA.external.push(args);return null;};
  const previous=window.fetch;
  window.fetch=async(input,options={})=>{
    const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href);
    const method=(options.method||input?.method||'GET').toUpperCase();
    let body;try{body=JSON.parse(options.body||'null');}catch{}
    __unifiedQA.requests.push({url:url.href,method,...(body?{action:body.action,entityType:body.entityType,count:body.items?.length}:{})});
    const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    if(method==='GET'&&url.searchParams.get('resource')==='task-events'&&url.searchParams.get('taskId')==='insurance-threads-v1')return json({ok:true,events:[row],total:1,nextOffset:null});
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
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],blocked=[];
  page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin&&['GET','HEAD'].includes(r.request().method()))return r.continue();blocked.push(r.request().url());return r.abort();});
  await page.goto(origin+'/command-center-98/app-v130.html');await page.waitForFunction(()=>window.CCCastle?.unified&&!document.querySelector('#ccCastleFrame').hidden);
  const lounge=page.frameLocator('#ccCastleFrame');await lounge.locator('.castle-quick-open[data-room=sourcing]').waitFor();
  await lounge.locator('.castle-quick-open[data-room=sourcing]').click();await page.locator('body.lounge-workspace #loungeWorkspaceHeader:not([hidden])').waitFor();
  assert.equal(await page.locator('#ccCastleFrame').isVisible(),false);assert.equal(await page.locator('#mainWindow').getAttribute('data-cc-view'),'sourcing');
  await page.waitForFunction(()=>document.querySelector('#sourcingHub'));await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{for(const src of ['castle-interior-sourcing-v1.webp','sourcing-desk-actor.webp']){const i=new Image();i.src='./lounge/assets/'+src;await i.decode();}});
  const geometry=await page.locator('#loungeWorkspaceHeader').evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...n.querySelectorAll('button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height,left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right})),background:getComputedStyle(document.body).backgroundImage,actor:getComputedStyle(n,'::before').backgroundImage}));
  assert.equal(geometry.overflow,false);assert.ok(geometry.buttons.every(b=>b.height>=44&&b.left>=0&&b.right<=width+1),JSON.stringify(geometry));assert.match(geometry.background,/castle-interior-sourcing/);assert.match(geometry.actor,/sourcing-desk-actor/);
  await page.screenshot({path:path.join(out,`${width}-${height}-sourcing.png`)});
  await page.locator('[data-lounge-tools]').click();await page.locator('.rpg-workspace-dialog[open]').waitFor();await page.locator('.rpg-workspace-dialog[open]>button').click();
  await page.locator('[data-lounge-home]').click();await lounge.locator('.account-board:not([hidden])').waitFor();assert.equal(await lounge.locator('.castle-quick-open[data-room=sourcing]').evaluate(n=>n===document.activeElement),true);
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);assert.deepEqual(await page.evaluate(()=>__rpgQA.writes),[]);assert.deepEqual(await page.evaluate(()=>__rpgQA.threads.simulatedWrites),[]);
  results.push({width,height,geometry,sourceUnchanged:await page.evaluate(()=>JSON.stringify(__rpgQA.threads.events.find(x=>x.id===901))===__unifiedQA.original),errors,writes:0});await context.close();
 }fs.writeFileSync(path.join(out,'native-results.json'),JSON.stringify(results,null,2));console.log('PASS spatial native workshop: real host loader, immediate sourcing route, original ledger/settings/back, responsive controls and zero fixture writes.');}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
