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
      await lounge.locator('.storybook[data-ready=true]').waitFor();
      assert.equal(await lounge.locator('[data-story-destination]').count(),8);
      assert.equal(await lounge.locator('[data-story-destination]:disabled').count(),3);
      assert.equal(await lounge.locator('[data-story-destination]:not(:disabled)').count(),5);
      assert.equal(await lounge.locator('[data-story-destination]:visible').count(),5);
      const preparing=lounge.locator('.story-preparing');await preparing.locator('summary').click();
      const pending=await preparing.locator('[data-story-destination]').evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('aria-label'),disabled:node.disabled,height:node.getBoundingClientRect().height})));assert.deepEqual(pending.map(node=>node.name),['追加アカウント5、未設定','追加アカウント6、未設定','予備、未設定']);assert.ok(pending.every(node=>node.disabled&&node.height>=44));
      const selectedBefore=await lounge.locator('.storybook').getAttribute('data-story-room');await preparing.locator('[data-story-destination]').evaluateAll(nodes=>nodes.forEach(node=>node.click()));
      assert.equal(await lounge.locator('.storybook').getAttribute('data-story-room'),selectedBefore);assert.equal(await lounge.locator('.account-board').evaluate(node=>node.hidden),false);assert.equal(await lounge.locator('#room').evaluate(node=>node.hidden),true);
      await preparing.locator('summary').click();assert.equal(await lounge.locator('[data-story-destination]:visible').count(),5);
      // Every chapter uses its own actual decorative source, not insurance art
      // reused under another label. Selection alone never enters a route.
      const handles={insurance:'@sucker0508',otoku:'@thats_a_steal0601',rakuten:'@bonya0914',lottery:'@chusen1101'};
      for(const key of ['insurance','otoku','rakuten','lottery','sourcing']){
        await lounge.locator('[data-story-chapter='+key+']').click();
        const art=lounge.locator('.story-art-host .story-paper-art[data-story-room='+key+']');await art.waitFor();
        const actor=art.locator('.story-actor-image');await actor.waitFor();await actor.evaluate(image=>image.decode());
        assert.ok(await art.locator('svg').count());assert.equal(await actor.evaluate(image=>image.complete&&image.naturalWidth>0),true);
        assert.match(await actor.getAttribute('src'),new RegExp('storybook-'+key+'-actor-v1\\.webp'));
        if(handles[key])assert.ok((await lounge.locator('.story-account-identity').textContent()).includes(handles[key]));
        assert.equal(await lounge.locator('.account-board').evaluate(n=>n.hidden),false);
        assert.equal(await lounge.locator('#room').evaluate(n=>n.hidden),true);
      }
      // Chapter selection only changes the illustrated page. Its live memo is
      // the new presentation of the same owner count, not a fabricated tile count.
      await lounge.locator('[data-story-chapter=insurance]').click();
      await lounge.locator('.story-read-state > summary').click();
      await lounge.locator('.story-memo p').filter({hasText:/保存原稿 1本/}).waitFor();
      assert.match(await lounge.locator('.story-account-identity').textContent(),/@sucker0508/);
      assert.match(await lounge.locator('.story-memo p').textContent(),/保存原稿 1本/);
      await lounge.locator('.story-read-state > summary').click();
      await lounge.locator('[data-story-instant=insurance]').click();
      await lounge.locator('#room[data-account=insurance][data-spatial-desk=ready]').waitFor();
      await lounge.locator('#draft-body').waitFor();
      await lounge.locator('#room[data-story-scene=ready]').waitFor();
      await lounge.locator('.spatial-desk-actor').evaluate(image=>image.decode());
      const reading=await lounge.locator('#room').evaluate(room=>({font:parseFloat(getComputedStyle(room.querySelector('#draft-body')).fontSize),bodyHeight:room.querySelector('#desk-scroll').clientHeight,copyHeight:room.querySelector('#desk-copy').getBoundingClientRect().height,actorReady:room.querySelector('.spatial-desk-actor').naturalWidth>0,actorURL:room.querySelector('.spatial-desk-actor').src,illustrated:!!room.querySelector('.spatial-study-scene .story-paper-art'),overflow:document.documentElement.scrollWidth>innerWidth+1}));
      assert.ok(reading.font>=16);assert.ok(reading.bodyHeight>=180);assert.ok(reading.copyHeight>=44);assert.equal(reading.actorReady,true);assert.match(reading.actorURL,/storybook-insurance-actor/);assert.equal(reading.illustrated,true);assert.equal(reading.overflow,false);
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      assert.equal(await lounge.locator('#room-title').textContent(),'保険');
      await lounge.locator('.spatial-work > summary').click();
      assert.equal(await lounge.locator('#desk-routes strong').textContent(),'保険 @sucker0508');
      await lounge.locator('.spatial-work > summary').click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('cc-castle-mode')),'castle');
      assert.equal(await page.locator('#ccRpgHome').textContent(),'');
      assert.equal(await page.locator('#commandHome').isVisible(),false);
      await lounge.locator('#desk-copy').click();await lounge.locator('#desk-operation').getByText('本文をコピーしました。',{exact:true}).waitFor();
      assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),insuranceBody);
      // Open the supported native insurance review, not the retired kyun reader.
      await lounge.locator('.spatial-work > summary').click();
      await lounge.locator('#desk-routes').getByRole('button',{name:'出典・確認記録',exact:true}).click();
      const review=page.locator('.manual-operation-review[open]');await review.waitFor();
      assert.equal(await review.locator('h2').textContent(),'保険｜@sucker0508');
      await review.locator('article').waitFor();
      assert.equal(await review.locator('article>pre').first().textContent(),insuranceBody);
      assert.equal(await page.locator('.daily-tools,.daily-card-tools').count(),0);
      assert.equal(await page.locator('#ccCastleFrame').isVisible(),false);
      await review.getByRole('button',{name:'閉じる',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('#ccCastleFrame').hidden);
      assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      // Keyboard routes originate inside the current iframe, just as user input does.
      for(const key of ['F1','Alt+f','Alt+v','Alt+a','Alt+j']){
        await lounge.locator('#back').focus();await page.keyboard.press(key);
        const management=page.locator('.rpg-workspace-dialog[open]');await management.waitFor();
        assert.equal(await page.locator('#commandHome').isVisible(),false);
        assert.doesNotMatch(await management.textContent(),/以前の画面・すべての入口/);
        await management.locator(':scope > button').click();
        await page.waitForFunction(()=>!document.querySelector('#ccCastleFrame').hidden);
        assert.equal(await lounge.locator('#draft-body').textContent(),insuranceBody);
      }
      // Use the lounge's actual service button. Record window.open without visiting
      // an external service, and verify the original tab stays on the command center.
      const beforeURL=page.url();await page.evaluate(()=>CCCastle.settings());
      await lounge.locator('#settings[open]').waitFor();
      await lounge.locator('#service-links').getByRole('button',{name:'仕入れ命',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('#ccCastleFrame').hidden&&__unifiedQA.external.length===1);
      assert.equal(page.url(),beforeURL);
      assert.deepEqual(await page.evaluate(()=>__unifiedQA.external[0]),['https://shiireinochi.vercel.app/','_blank','noopener,noreferrer']);
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
      assert.equal(await page.locator('#commandHome').isVisible(),false);
      await lounge.locator('.storybook[data-ready=true]').waitFor();
      await lounge.locator('[data-story-chapter=insurance]').click();
      await lounge.locator('.story-read-state > summary').click();
      await lounge.locator('.story-memo p').filter({hasText:/保存原稿 1本/}).waitFor();
      assert.match(await lounge.locator('.story-memo p').textContent(),/保存原稿 1本/);
      await lounge.locator('.story-read-state > summary').click();
      assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
      assert.equal(await page.evaluate(()=>__rpgQA.writes.length),0);
      await page.screenshot({path:path.join(out,width+'.png')});
      results.push({width,height,currentHost:'lounge/index.html',presentation:'storybook',insuranceFixture:true,fiveChapterIdentities:true,classicRetired:true,managementPreserved:true,oneReadingDesk:true,keyboardRoutes:true,externalReturn:true,reload:true,sourceUnchanged:true,errors,writes:0,syntheticInitializations:audit.initializations});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
