// Uses installed Chrome and synthetic drafts; no production API or credentials.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/castle-art');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
(async()=>{fs.mkdirSync(out,{recursive:true});const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CC_TEST_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p)),headless:true,args:['--no-sandbox']});
 try{for(const width of [1440,390]){const ctx=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.addInitScript(seeds=>{globalThis.CCCastleInitialDrafts=seeds;},JSON.parse(fs.readFileSync(path.join(root,'command-center-98/castle/tests/seeds.json'),'utf8')));
 await page.goto(`http://127.0.0.1:${server.address().port}/command-center-98/castle/entry-v24.html`);await page.waitForFunction(()=>window.CCCastleApp);
 for(const key of ['kyun','choi','fp','shiire']){await page.locator(`.station[data-place=${key}]`).click();await page.waitForFunction(key=>document.querySelector('#app').dataset.sceneCharacter===key&&document.querySelector('#characterScenes').dataset.ready==='true',key);
 const snapshot=await page.evaluate(()=>({body:CCCastleApp.getState().draft.body,storage:JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='castle-town.persona.v1')))}));
 for(const id of ['welcome','work','rest','tea','special']){await page.locator('#sceneSelect').selectOption(id);await page.waitForFunction(id=>document.querySelector('#characterScenes').dataset.scene===id&&document.querySelector('#characterScenes').dataset.loading==='false',id);
 assert.equal(await page.locator('#sceneImage').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 if(key==='shiire'||key==='fp'&&id==='tea'){assert.equal(await page.locator('#characterScenes').getAttribute('data-static'),'true');assert.equal(await page.locator('.companion').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await page.locator('#sceneCanvas').evaluate(e=>getComputedStyle(e).display),'none');}
 assert.equal(await page.evaluate(()=>CCCastleApp.getState().draft.body),snapshot.body);
 if(key==='shiire'||key==='fp'&&id==='tea')await page.screenshot({path:path.join(out,`${width}-${key}-${id}.png`)});
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='castle-town.persona.v1')))),snapshot.storage);
 await page.locator('#sceneExpand').click();assert.equal(await page.locator('#sceneDialog').evaluate(e=>e.open),true);await page.locator('#sceneTalk').click();const talk=await page.locator('#sceneCaption').textContent();assert.ok(talk.length>5);await page.locator('#sceneTalk').click();assert.notEqual(await page.locator('#sceneCaption').textContent(),talk);
 await page.locator('#sceneRest').click();await page.waitForFunction(()=>document.querySelector('#characterScenes').dataset.scene==='rest');await page.locator('#sceneContinue').click();await page.waitForFunction(()=>document.querySelector('#characterScenes').dataset.scene==='work');
 await page.screenshot({path:path.join(out,`${width}-${key}-conversation.png`)});await page.locator('#sceneClose').click();await page.locator('#sceneTouch').click();const reply=await page.locator('#greetingText').textContent();await page.waitForTimeout(450);await page.locator('#sceneTouch').click();assert.notEqual(await page.locator('#greetingText').textContent(),reply);
 await page.locator('#focusMode').click();assert.equal(await page.locator('#sceneTouch').isVisible(),false);assert.ok((await page.locator('.desk').boundingBox()).y<180);await page.locator('#focusMode').click();await page.locator('#copy').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),snapshot.body);
 await page.locator('#back').click();assert.equal(await page.locator('#app').getAttribute('data-view'),'home');}
 assert.deepEqual(errors,[]);console.log(`Chrome ${width}px: four rooms, 20 scenes, copy, touch, full view, back, original drafts and console passed`);await ctx.close();}
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
