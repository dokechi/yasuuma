// Real production loader and current lounge, with isolated synthetic API responses.
// Retained classic-castle visuals are exercised by their direct-entry fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/unified-castle');
const staleLoungeEntry='/command-center-98/lounge/index.html?v=20261112.3-skun';
const currentLoungeQuery='?v=20261113.'+createHash('sha256').update(fs.readFileSync(path.join(root,'command-center-98/lounge/index.html'))).digest('hex').slice(0,16)+'-entry';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const insuranceBody='合成データの保険原稿です。保障内容と条件を確認してから判断します。\n\nコピーは投稿ではありません。保存済みの文章をそのまま読みます。';
const girlsChannelBody='家事の場面をひとつ拾った検証用の原稿です。';
const girlsChannelComment='https://girlschannel.net/comment/12345/6/';
const girlsChannelProduct='https://example.com/fixture-product';
const girlsChannelOriginal='https://example.com/fixture-original';
const fixtureScript=`(()=>{
  const row={id:901,taskId:'insurance-threads-v1',eventKey:'unified-insurance',title:'保険を見直す前の確認',occurredAt:'2026-10-30T08:00:00Z',domain:'money',payload:{draft:${JSON.stringify(insuranceBody)},date:'2026-10-30',review_status:'確認用下書き',sources_note:'検証専用の出典記録'}};
  const girlsChannel={id:902,taskId:'girls-channel-threads-v1',eventKey:'unified-girls-channel',title:'家事の原稿',occurredAt:'2026-11-13T06:00:00Z',domain:'sns',payload:{content_type:'threads_draft',draft:${JSON.stringify(girlsChannelBody)},review_status:'未投稿・下書き',publication_status:'unpublished',ordinary_url:${JSON.stringify(girlsChannelProduct)},girls_channel_source:{url:${JSON.stringify(girlsChannelComment)},upvotes:512,checkedAt:'2026-11-13'},sources:[{url:${JSON.stringify(girlsChannelOriginal)},title:'検証用の元投稿'}]}};
  const guide={id:903,taskId:'writing-references-v1',eventKey:'current',domain:'reference',payload:{content_type:'writing_reference_guide',guide:{groups:[{key:'overview',label:'共通',answer:'検証用の共通方針',sources:[]},{key:'girls-channel',label:'ガルちゃん',answer:'元投稿で反応が出た場面から書く。',sources:[{name:'元投稿',note:'検証用の出典',links:[{url:${JSON.stringify(girlsChannelOriginal)},label:'元投稿を開く'}]}]}]}}};
  __rpgQA.threads.events.push(row,girlsChannel,guide);
  window.__unifiedQA={original:JSON.stringify(row),requests:[],external:[]};
  window.open=(...args)=>{__unifiedQA.external.push(args);return null;};
  const previous=window.fetch;
  window.fetch=async(input,options={})=>{
    const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,location.href);
    const method=(options.method||input?.method||'GET').toUpperCase();
    let body;try{body=JSON.parse(options.body||'null');}catch{}
    __unifiedQA.requests.push({url:url.href,method,...(body?{action:body.action,entityType:body.entityType,count:body.items?.length}:{})});
    const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    if(method==='GET'&&url.searchParams.get('resource')==='task-events'){
      const taskId=url.searchParams.get('taskId'),record=[row,girlsChannel,guide].find(event=>event.taskId===taskId);
      if(record)return json({ok:true,events:[record],total:1,nextOffset:null});
    }
    if(method==='GET'&&url.searchParams.get('resource')==='threads-images')return json({ok:true,id:url.searchParams.get('id'),accountKey:url.searchParams.get('accountKey'),manifest:{contract:'threads-post-images-v1',revision:0,images:[]},assets:[]});
    return previous(input,options);
  };
})();`;
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
  // Deterministic stale-cache response at the old production URL. Playwright
  // routing disables native HTTP caching, so this models stale bytes by URL.
  // It intentionally contains no executable owner: reaching it is the regression.
  if(req.url===staleLoungeEntry)return res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'public, max-age=31536000'}).end('<!doctype html><html data-stale-lounge-entry><body>以前の司令塔 HTML</body></html>');
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
        // Deterministic local CSS response: no Google request leaves the fixture.
        if(new URL(request.url()).hostname==='fonts.googleapis.com'&&request.method()==='GET')return route.fulfill({status:200,contentType:'text/css',body:'/* offline system font fixture */'});
        if(new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();
        blocked.push({url:request.url(),method:request.method()});return route.abort();
      });
      await page.goto(origin+staleLoungeEntry);
      assert.equal(await page.locator('html[data-stale-lounge-entry]').count(),1);
      await page.goto(origin+'/command-center-98/app-v130.html');
      await page.waitForFunction(()=>window.CCCastle?.unified&&!document.querySelector('#ccCastleFrame').hidden);
      const lounge=page.frameLocator('#ccCastleFrame');
      assert.equal(new URL(await page.locator('#ccCastleFrame').getAttribute('src'),page.url()).search,currentLoungeQuery,'ordinary entry bypasses the previously cached child HTML');
      assert.equal(new URL(await page.locator('#ccCastleFrame').getAttribute('src'),page.url()).pathname,'/command-center-98/lounge/index.html');
      await lounge.locator('.account-board[data-state=ready]').waitFor();
      assert.equal(await lounge.locator('html[data-stale-lounge-entry]').count(),0);
      assert.equal(new URL(await page.locator('#ccCastleFrame').getAttribute('src'),page.url()).search,currentLoungeQuery);
      await lounge.locator('body.stained-atelier .sg-rail').waitFor();
      const cards=lounge.locator('.sg-card');
      assert.equal(await cards.count(),11);
      assert.equal(await cards.locator(':scope[aria-disabled=true]').count(),0);
      assert.equal(await cards.evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.key)).size),11);
      // Keyboard movement selects a glass without entering a manuscript.
      await cards.first().focus();await page.keyboard.press('End');
      assert.equal(await cards.last().evaluate(n=>n===document.activeElement),true);
      assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      const girlsChannelCard=cards.last();
      assert.equal(await girlsChannelCard.getAttribute('data-key'),'girls-channel');
      if(width===390)await page.screenshot({path:path.join(out,'girls-channel-gallery.png')});
      await girlsChannelCard.click();
      const girlsChannelRoom=lounge.locator('#room[data-account=girls-channel]');
      await girlsChannelRoom.waitFor();
      await girlsChannelRoom.getByRole('heading',{name:'ガルちゃんの原稿'}).waitFor();
      const girlsChannelManuscript=girlsChannelRoom.locator('#draft-body');
      await girlsChannelManuscript.waitFor();
      assert.equal(await girlsChannelManuscript.textContent(),girlsChannelBody);
      assert.match(await girlsChannelRoom.locator('#draft-meta').textContent(),/未投稿・下書き/);
      assert.equal(await girlsChannelRoom.getByRole('link',{name:'ガルちゃん元コメント ＋512票 ↗'}).getAttribute('href'),girlsChannelComment);
      assert.equal(await girlsChannelRoom.getByRole('link',{name:'保存されたリンク ↗'}).getAttribute('href'),girlsChannelProduct);
      await girlsChannelRoom.locator('#draft-links summary').click();
      assert.equal(await girlsChannelRoom.getByRole('link',{name:'検証用の元投稿 ↗'}).getAttribute('href'),girlsChannelOriginal);
      await girlsChannelRoom.getByRole('button',{name:'原稿の参考元',exact:true}).click();
      const references=lounge.locator('#writing-references[open]');
      await references.getByText('元投稿で反応が出た場面から書く。',{exact:true}).waitFor();
      assert.equal(await references.locator('select').inputValue(),'girls-channel');
      assert.equal(await references.getByRole('link',{name:'元投稿を開く'}).getAttribute('href'),girlsChannelOriginal);
      await references.getByRole('button',{name:'閉じる',exact:true}).click();
      await girlsChannelRoom.locator('.sg-title').click();
      await lounge.locator('.sg-rail').waitFor();
      assert.equal(await girlsChannelCard.evaluate(n=>n===document.activeElement),true);
      await page.keyboard.press('Home');
      assert.equal(await cards.first().evaluate(n=>n===document.activeElement),true);
      await lounge.locator('.sg-order-trigger').click();
      await lounge.locator('.sg-order-done').waitFor();
      await lounge.locator('.sg-card[data-key=insurance]').click();
      assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      await lounge.locator('.sg-order-done').click();
      await lounge.locator('.sg-card[data-key=insurance]').focus();await page.keyboard.press('Enter');
      await lounge.locator('#room[data-account=insurance]').waitFor();
      await lounge.locator('#draft-body').waitFor();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.equal(await lounge.locator('#desk').count(),1);
      assert.equal(await lounge.locator('#room .sg-title').evaluate(n=>n===document.activeElement&&n.checkVisibility()),true,'keyboard entry must focus the visible reader return control');
      assert.equal(await lounge.locator('#draft-body').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16),true);
      assert.equal(await lounge.locator('html').evaluate(n=>n.scrollWidth<=innerWidth+1),true);
      for(const filter of await lounge.locator('[data-desk-filter]').all())assert.equal(await filter.evaluate(n=>{const r=n.getBoundingClientRect();return n.checkVisibility()&&r.width>=44&&r.height>=44;}),true,'all manuscript filters are at least 44px');
      const filterGeometry=await lounge.locator('.desk-filters').evaluate(nav=>{
        const nr=nav.getBoundingClientRect(),shelf=nav.closest('.manuscript-shelf').getBoundingClientRect(),search=nav.parentNode.querySelector('.desk-search').getBoundingClientRect();
        return {nav:{left:nr.left,right:nr.right},shelf:{left:shelf.left,right:shelf.right},search:{left:search.left,right:search.right},buttons:[...nav.children].map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect(),style=getComputedStyle(n);return {label:n.textContent,width:r.width,height:r.height,scroll:n.scrollWidth,client:n.clientWidth,left:r.left,right:r.right,textLeft:text.left,textRight:text.right,paddingLeft:parseFloat(style.paddingLeft),paddingRight:parseFloat(style.paddingRight)};})};
      });
      assert.ok(filterGeometry.buttons.every(b=>b.scroll<=b.client&&b.textLeft>=b.left+b.paddingLeft-1&&b.textRight<=b.right-b.paddingRight+1&&b.left>=filterGeometry.shelf.left&&b.right<=filterGeometry.shelf.right),JSON.stringify(filterGeometry));
      if(width<=560)assert.ok(filterGeometry.search.right<=filterGeometry.nav.left+1,JSON.stringify(filterGeometry));
      // Isolated link geometry samples use the exact S-kun production classes in
      // both owner locations, without adding external requests or source records.
      await lounge.locator('#desk').evaluate(d=>{
        for(const id of ['desk-routes','draft-meta']){const a=document.createElement('a');a.className='desk-skun-link';a.dataset.targetSizeFixture='true';a.href='#';a.textContent=id==='desk-routes'?'過去投稿スプシ ↗':'ガルちゃん元コメント ＋12345票 ↗';d.querySelector('#'+id).append(a);}
      });
      for(const link of await lounge.locator('[data-target-size-fixture]').all())assert.equal(await link.evaluate(n=>{const r=n.getBoundingClientRect();return n.checkVisibility()&&r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1;}),true,'S-kun route and reference link samples fit and are at least 44px');
      assert.equal(await lounge.locator('html').evaluate(n=>n.scrollWidth<=innerWidth+1),true,'reference links do not overflow narrow readers');
      await lounge.locator('[data-target-size-fixture]').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));
      // Reader-owned favorite data must remain operable, not just filterable.
      const pin=lounge.locator('#desk-pin'),refresh=lounge.locator('#desk-refresh');
      for(const control of [pin,refresh])assert.equal(await control.evaluate(n=>{const r=n.getBoundingClientRect();return n.checkVisibility()&&r.width>=44&&r.height>=44;}),true,'reader action is visible and at least 44px');
      assert.equal(await lounge.locator('[data-desk-filter=pin]').textContent(),'お気に入り');
      assert.equal(await pin.getAttribute('aria-pressed'),'false');
      assert.equal(await pin.getAttribute('aria-label'),'お気に入りに保存');
      await pin.click();assert.equal(await pin.getAttribute('aria-pressed'),'true');
      assert.equal(await pin.getAttribute('aria-label'),'お気に入りを解除');
      await lounge.locator('[data-desk-filter=pin]').click();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      await lounge.locator('[data-desk-filter=all]').click();await pin.click();
      assert.equal(await pin.getAttribute('aria-pressed'),'false');
      // Direct refresh remains available even when the narrow header hides its shortcut.
      await refresh.click();await refresh.waitFor({state:'visible'});
      await page.waitForFunction(()=>{const d=document.querySelector('#ccCastleFrame')?.contentDocument;return d&&!d.querySelector('#desk-refresh').disabled;});
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.equal(await lounge.locator('html').evaluate(n=>n.scrollWidth<=innerWidth+1),true,'favorite and refresh controls do not overflow narrow readers');
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
      assert.equal(await lounge.locator('.sg-card[data-key=insurance]').evaluate(n=>n===document.activeElement&&n.checkVisibility()),true,'return must restore focus to the visible account glass');
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
      assert.equal(await lounge.locator('html[data-stale-lounge-entry]').count(),0);
      assert.equal(new URL(await page.locator('#ccCastleFrame').getAttribute('src'),page.url()).search,currentLoungeQuery);
      await lounge.locator('.sg-card[data-key=insurance]').click();
      await lounge.locator('#draft-body').waitFor();
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
      assert.equal(await page.evaluate(()=>__rpgQA.writes.length),0);
      await page.screenshot({path:path.join(out,width+'.png')});
      results.push({width,height,currentHost:'lounge/index.html',presentation:'stained-glass',insuranceFixture:true,girlsChannelFixture:true,elevenOwnerRoutes:true,keyboardNavigation:true,reorderIsolation:true,copy:true,settingsReturn:true,reload:true,sourceUnchanged:true,errors,writes:0,syntheticInitializations:audit.initializations});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
