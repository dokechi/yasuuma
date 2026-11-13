const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const details=require('./v231-trade-details.js');
const modules=process.env.COMMAND_CENTER_UI_MODULES;
const fixtures=[
 {id:1,product_name:'合成購入A',quantity:1,status:'purchased',supplier_key:'shop',order_id:'synthetic-1',ordered_at:'2026-10-01T00:00:00Z',order_total_yen:1500,unit_price_yen:1500},
 {id:2,product_name:'<img src=x onerror=alert(1)>',quantity:1,status:'unknown',supplier_key:'shop',order_id:'synthetic-2',ordered_at:'2026-10-02T00:00:00Z'}
];
test('zero and losses are known; missing, boolean and malformed amounts stay unknown',()=>{assert.equal(details.money(0),'¥0');assert.equal(details.money(-1),'−¥1');for(const v of [null,undefined,'',false,true,'  ','oops'])assert.equal(details.money(v),'—')});
test('purchase table uses current profit contract and escapes source text',()=>{
 const html=details.html({purchases:fixtures,purchaseProfit:[],salesMonth:'2026-10',purchaseMonth:'2026-10'});
 for(const text of ['仕入れ計','¥1,500','儲け','予約・未納／要確認','合成購入A'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('¥NaN'));
});
test('unavailable and stale purchase responses cannot pretend to be empty or zero spending',()=>{
 for(const state of [{purchases:null},{purchases:[],purchasesAvailable:false},{purchases:fixtures,salesMonth:'2026-09',purchaseMonth:'2026-10'}]){
  const html=details.html(state);assert.match(html,/取得できません/);assert.doesNotMatch(html,/仕入れ計|購入記録はありません|¥0/);
 }
 assert.match(details.html({purchases:[],purchasesAvailable:true,purchaseProfit:[]}),/購入記録はありません/);
 assert.match(details.html({purchases:fixtures,salesTruncated:true}),/販売明細は一部/);
});
async function setup(){
 const {JSDOM,VirtualConsole}=createRequire(modules+'/package.json')('jsdom');
 const manifest=require('./app-assets.json'),dir=__dirname+'/';let html=fs.readFileSync(dir+'app.html','utf8');
 for(const url of manifest.scripts){let source=fs.readFileSync(dir+url.split('?')[0],'utf8');if(url.startsWith('./affiliate-production.js'))source=source.replace(/import\('[^']+'\)/,'Promise.resolve(window.__testAffiliateCore)');const end=html.lastIndexOf('</body>');html=html.slice(0,end)+'<script>'+source.replaceAll('</script','<\\/script')+'</script>'+html.slice(end)}
 const errors=[],calls=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));let fail=false;
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://synthetic-command-center.invalid/',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){
 w.CCLoadedManifest=manifest;w.localStorage.setItem('cc_retro_token','synthetic-test-token');
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
 Object.assign(w,{AbortSignal,structuredClone,TextEncoder,TextDecoder,scrollTo:()=>{}});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(input,options={})=>{const u=new URL(String(input));calls.push([u.pathname,options.method||'GET']);assert.equal(options.method||'GET','GET');if(u.pathname.includes('ledger')){if(fail)throw Error('Synthetic failure');const month=u.searchParams.get('month');return new Response(JSON.stringify({ok:true,month,purchases:month==='2026-10'?fixtures:[],purchaseProfit:[],counts:{},supplierPurchases:[],salesAvailable:true,sales:[]}))}return new Response(JSON.stringify({ok:true,items:[],tasks:[],events:[],purchases:[],suppliers:[],programs:[],accounts:[],jobs:[],campaigns:[],counts:{},readyCount:0,total:0,nextOffset:null,publisher_connected:false}))};
 }});
 await wait(()=>dom.window.CCHome?.loaded.active&&!dom.window.CCHome.loading);
 return{dom,w:dom.window,d:dom.window.document,errors,calls,fail:()=>{fail=true}};
}
async function wait(check){let n=0;while(!check()){if(n++>500)throw Error('DOM did not settle');await new Promise(r=>setTimeout(r,10))}}
test('full DOM purchase loading, refresh, month switch and failure never present missing data as zero',{skip:!modules},async()=>{
 const s=await setup();try{
  s.w.eval("sourcingApp.sub='purchases';sourcingApp.purchaseMonth='2026-10';load('sourcing')");await wait(()=>s.d.querySelector('.purchase-table'));
  assert.equal(s.d.querySelectorAll('.purchase-profit-ledger').length,1);assert.equal(s.d.querySelectorAll('.purchase-table tbody tr').length,2);
  s.w.eval('renderSourcing();renderSourcing()');assert.equal(s.d.querySelectorAll('.purchase-profit-ledger').length,1);
  await wait(()=>!s.w.eval('app.busy'));s.d.querySelector('[data-ledger-month="2026-09"]').click();await wait(()=>!s.w.eval('app.busy'));assert.match(s.d.querySelector('.purchase-profit-ledger').textContent,/購入記録はありません/);assert.ok(!s.d.querySelector('.purchase-table'));
  s.d.querySelector('[data-ledger-month="2026-10"]').click();await wait(()=>!s.w.eval('app.busy'));assert.equal(s.d.querySelectorAll('.purchase-table tbody tr').length,2);
  s.fail();await s.w.eval("load('sourcing')");assert.match(s.d.querySelector('.purchase-profit-ledger').textContent,/取得できません/);assert.ok(!s.d.querySelector('.purchase-table'));assert.equal(s.w.eval('sourcingApp.purchasesAvailable'),false);
  assert.deepEqual(s.errors,[]);
 }finally{await new Promise(r=>setTimeout(r,30));s.dom.window.close()}
});
