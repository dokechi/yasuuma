// Real production loader and current lounge, with isolated synthetic API responses.
// Retained classic-castle visuals are exercised by their direct-entry fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/unified-castle');
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
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p)),headless:true});
  const results=[];
  try{
    for(const [width,height] of [[320,640],[390,900],[800,900],[1440,900]]){
      const context=await browser.newContext({viewport:{width,height},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block',reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[],blocked=[];page.on('pageerror',error=>errors.push(error.message));
      await context.route('**/*',route=>{
        const request=route.request();
        if(new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();
        blocked.push({url:request.url(),method:request.method()});return route.abort();
      });
      await page.goto(origin+'/command-center-98/app-v130.html');
      await page.waitForFunction(()=>window.CCCastle?.unified&&!document.querySelector('#ccCastleFrame').hidden);
      const lounge=page.frameLocator('#ccCastleFrame');
      assert.equal(new URL(await page.locator('#ccCastleFrame').getAttribute('src'),page.url()).pathname,'/command-center-98/lounge/index.html');
      await lounge.locator('.account-board[data-state=ready]').waitFor();
      await lounge.locator('body.stained-atelier .sg-rail').waitFor();
      const cards=lounge.locator('.sg-card');
      assert.equal(await cards.count(),10);
      assert.equal(await cards.locator(':scope[aria-disabled=true]').count(),0);
      assert.equal(await cards.evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.key)).size),10);
      // Keyboard movement selects a glass without entering a manuscript.
      await cards.first().focus();await page.keyboard.press('End');
      assert.equal(await cards.last().evaluate(n=>n===document.activeElement),true);
      assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      await page.keyboard.press('Home');
      assert.equal(await cards.first().evaluate(n=>n===document.activeElement),true);
      await lounge.locator('.sg-order-trigger').click();
      await lounge.locator('.sg-order-done').waitFor();
      await lounge.locator('.sg-card[data-key=insurance]').click();
      assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      await lounge.locator('.sg-order-done').click();
      await lounge.locator('.sg-card[data-key=insurance]').click();
      await lounge.locator('#room[data-account=insurance]').waitFor();
      await lounge.locator('#draft-body').waitFor();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.equal(await lounge.locator('#desk').count(),1);
      assert.equal(await lounge.locator('#draft-body').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16),true);
      assert.equal(await lounge.locator('html').evaluate(n=>n.scrollWidth<=innerWidth+1),true);
      await lounge.locator('#desk-copy').click();
      await lounge.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
      assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),insuranceBody);
      await lounge.locator('#room .sg-tools').getByRole('button',{name:'設定',exact:true}).click();
      await lounge.locator('#settings[open]').waitFor();
      await lounge.locator('#settings-close').click();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      await lounge.locator('#room .sg-title').click();
      await lounge.locator('.sg-rail').waitFor();
      assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      assert.equal(await page.locator('#commandHome').isVisible(),false);
      const audit=await page.evaluate(()=>({writes:__rpgQA.writes,syntheticWrites:__rpgQA.threads.simulatedWrites,initializations:__rpgQA.simulatedInitializations,requests:__unifiedQA.requests,sourceUnchanged:JSON.stringify(__rpgQA.threads.events.find(x=>x.id===901))===__unifiedQA.original}));
      assert.deepEqual(audit.writes,[]);assert.deepEqual(audit.syntheticWrites,[]);// The pre-existing host renderers have explicit synthetic `ensure` calls,
      // already intercepted and separately recorded by rpg-theme-fixtures. They are
      // not posting/editing writes, and no real API is contacted. Audit the exact
      // existing initializer scope rather than relabeling it as GET-only.
      for(const init of audit.initializations){assert.equal(init.action,'ensure');assert.equal(init.method,'POST');assert.equal(init.url,'https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-workflow-api');assert.equal(init.count,{fp_content:9,house_content:2}[init.entityType]);}
      assert.deepEqual(audit.requests.filter(r=>!['GET','HEAD'].includes(r.method)),audit.initializations);assert.equal(audit.sourceUnchanged,true);
      await page.reload();await page.waitForFunction(()=>window.CCCastle?.unified&&!document.querySelector('#ccCastleFrame').hidden);
      await lounge.locator('.account-board[data-state=ready]').waitFor();
      await lounge.locator('.sg-card[data-key=insurance]').click();
      await lounge.locator('#draft-body').waitFor();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
      assert.equal(await page.evaluate(()=>__rpgQA.writes.length),0);
      await page.screenshot({path:path.join(out,width+'.png')});
      results.push({width,height,currentHost:'lounge/index.html',presentation:'stained-glass',insuranceFixture:true,tenOwnerRoutes:true,keyboardNavigation:true,reorderIsolation:true,copy:true,settingsReturn:true,reload:true,sourceUnchanged:true,errors,writes:0,syntheticInitializations:audit.initializations});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
