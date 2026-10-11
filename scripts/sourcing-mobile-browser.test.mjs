import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CC_TEST_CHROME||[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'
].find(p=>fs.existsSync(p));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('real Chrome mobile comparison, disclosure, retained controls and desktop tables', {timeout:60000}, async()=>{
  assert.ok(chrome,'Chrome is required: set CC_TEST_CHROME; this test must not silently skip');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-sourcing-mobile-'));
  const fixture=path.join(dir,'fixture.html');
  fs.writeFileSync(fixture,`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;padding:5px;font-family:sans-serif;box-sizing:border-box}*{box-sizing:border-box}.sourcing-grid{display:grid;grid-template-columns:minmax(0,1fr)}
  ${read('command-center-98/v167-navigation.css')}
  ${read('command-center-98/sourcing-mobile-comparison.css')}
  </style><body class="cc-navigation"><div id="sourcingBody"><div class="sourcing-grid"></div></div>
  <script>${read('command-center-98/sourcing-display-model.js')}</script>
  <script>var sourcingApp={items:[],sub:'hold'};var sourcingFields=x=>x.payload;var sourcingEvidence=x=>x.payload;</script>
  <script>${read('command-center-98/sourcing-mobile-comparison.js')}</script>
  <script>${read('command-center-98/v222-sourcing-click-fix.js')}</script></body></html>`);
  const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws;let serial=0;const pending=new Map();
  try{
    const portFile=path.join(dir,'profile','DevToolsActivePort');
    const deadline=Date.now()+15000;
    while(!fs.existsSync(portFile)&&Date.now()<deadline&&proc.exitCode===null)await sleep(50);
    assert.ok(fs.existsSync(portFile),'headless Chrome did not start');
    const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
    ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
    await send('Page.enable');await send('Runtime.enable');
    for(const width of [320,375,390,700,1024]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=700});
      await send('Page.navigate',{url:pathToFileURL(fixture).href});
      let ready=false;
      for(let n=0;n<100;n++){
        const r=await send('Runtime.evaluate',{expression:'!!window.CCSourcingMobileComparison',returnByValue:true});
        if(r.result.value){ready=true;break}await sleep(30);
      }
      assert.ok(ready,'production comparison module loaded');
      const result=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
        const checks=[];const ok=(name,value)=>{checks.push({name,pass:!!value})};
        const grid=document.querySelector('.sourcing-grid');
        const items=[1,2,3,4].map((grade,i)=>Object.freeze({id:'fixture-'+i,priority:'S',title:'合成テスト商品'+i,firstSeen:'2026-10-01T16:00:00Z',lastSeen:'2026-10-11',summary:'長い型番と条件を確認した合成テストの一言根拠です。実データは使いません。',url:'https://example.com/product/'+i,payload:Object.freeze({overall_grade:i%2?String(grade):grade,buy:i?2500:0,quantity:i?2:0,mercari_sold_urls:['https://example.com/market/'+i],yahoo_sold_urls:['https://example.com/yahoo/'+i]})}));
        const before=JSON.stringify(items);let saves=0;
        const controls=[];
        for(const item of items){
          const article=document.createElement('article');article.className='sourcing-card';
          article.innerHTML='<details class="cc-item"><summary class="cc-item-summary" role="button" tabindex="0" aria-expanded="false"><strong>'+item.title+'</strong><span class="cc-item-meta">想定純利益 ¥1,000 · 合成仕入れ先</span><span class="cc-item-excerpt">元の全文概要</span><span class="cc-item-cue">詳細を開く</span></summary><div class="cc-item-content"><table class="sourcing-meta"><tr><th>仕入価格</th><td>¥2,500</td><th>推奨数</th><td>2</td></tr></table><p class="sourcing-summary">'+item.summary+'</p><section class="price-wait-box"><input class="price-wait-input" value="1234"><button data-existing-save>既存保留保存</button></section><div class="mercari-history-scroll" style="overflow-x:auto"><table class="sourcing-meta mercari-history-table"><tr><td>既存の相場履歴・注記</td></tr></table></div></div></details>';
          const input=article.querySelector('input'),save=article.querySelector('[data-existing-save]');save.onclick=()=>saves++;
          controls.push({input,save});grid.appendChild(article);
          CCSourcingMobileComparison.decorate(article,item);CCSourcingMobileComparison.decorate(article,item);
          ok('one comparison per card',article.querySelectorAll('.sourcing-mobile-facts').length===1);
          ok('four recorded numeric/string grades',article.querySelector('.sourcing-mobile-grade').textContent==='総合 '+item.payload.overall_grade);
          ok('discovery is not update time',article.querySelector('.sourcing-mobile-date').textContent==='発見 10/2');
          ok('all source links retained',article.querySelectorAll('.sourcing-mobile-links a').length===3);
        }
        const article=grid.firstElementChild,details=article.querySelector('details'),summary=article.querySelector('summary');
        const unknown=article.cloneNode(true);grid.appendChild(unknown);
        CCSourcingMobileComparison.decorate(unknown,{id:'unknown',priority:'B',score:100,payload:{}});
        ok('missing numeric rating is unconfirmed',unknown.querySelector('.sourcing-mobile-grade').textContent==='総合 未確認');
        ok('legacy rating is separate supplement',unknown.querySelector('.sourcing-mobile-legacy-grade').textContent==='旧評価 B（総合へ未換算）');
        ok('rating meaning never excludes grade 1',article.querySelector('.sourcing-mobile-grade').getAttribute('aria-label').includes('1も仕入れ候補内'));
        ok('zero price visible',article.querySelector('.sourcing-mobile-buy').textContent==='仕入価格 ¥0');
        ok('zero quantity visible',article.querySelector('.sourcing-mobile-quantity').textContent==='推奨数量 0');
        const anchor=article.querySelector('.sourcing-mobile-links a');anchor.addEventListener('click',e=>e.preventDefault());anchor.click();
        ok('link does not toggle disclosure',!details.open);
        article.querySelector('.sourcing-mobile-links button').click();
        ok('detail button uses existing route',details.open&&summary.getAttribute('aria-expanded')==='true');
        summary.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        ok('keyboard closes detail',!details.open&&summary.getAttribute('aria-expanded')==='false');
        summary.click();
        ok('existing input node and value preserved',article.querySelector('input')===controls[0].input&&controls[0].input.value==='1234');
        ok('opening makes no save',saves===0);controls[0].save.click();ok('existing save binding preserved',saves===1);
        ok('no source mutation',JSON.stringify(items)===before);
        const mobile=innerWidth<=700;
        ok('responsive comparison visibility',getComputedStyle(article.querySelector('.sourcing-mobile-facts')).display===(mobile?'grid':'none'));
        ok('desktop retains original excerpt',mobile||getComputedStyle(article.querySelector('.cc-item-excerpt')).display!=='none');
        ok('existing detailed table remains',article.querySelector('.cc-item-content>.sourcing-meta')!==null);
        ok('no page horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
        return {width:innerWidth,checks};
      })()`});
      assert.equal(result.exceptionDetails,undefined,'browser evaluation succeeded');
      assert.equal(result.result.value.width,width);
      for(const check of result.result.value.checks)assert.ok(check.pass,width+'px: '+check.name);
      console.log(width+'px: '+result.result.value.checks.length+' browser checks passed');
    }
  }finally{ws?.close();proc.kill();}
});
