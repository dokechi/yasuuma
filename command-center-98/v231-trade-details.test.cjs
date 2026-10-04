const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const details=require('./v231-trade-details.js');
const modules=process.env.COMMAND_CENTER_UI_MODULES;
const fixtures=[
 {sale_id:'synthetic-gross',product_name:'合成売却A',quantity:1,status:'in_progress',marketplace:'mercari',gross_sale_yen:2000,sold_at:'2026-09-30T15:00:00Z',cost_match_status:'unmatched'},
 {sale_id:'synthetic-net',product_name:'合成売却B',quantity:1,status:'completed',marketplace:'yahoo',gross_sale_yen:null,gross_payment_yen:1500,net_received_yen:1200,aggregate_deductions_yen:300,fee_yen:null,shipping_yen:null,completed_at:'2026-10-04T01:00:00Z'},
 {sale_id:'synthetic-cancel',product_name:'<img src=x onerror=alert(1)>',quantity:1,status:'cancelled',marketplace:'mercari',gross_sale_yen:0,fee_yen:0,shipping_yen:null},
 {sale_id:'synthetic-old',product_name:'合成旧記録',status:'completed',marketplace:'mercari',unverified_recorded_yen:900}
];
test('zero is known, missing or malformed amounts stay unknown',()=>{assert.equal(details.money(0),'¥0');for(const v of [null,undefined,'',false,'oops',-1])assert.equal(details.money(v),'未確認')});
test('amount meaning, status, pending cost and safe product text are explicit',()=>{
 const html=details.html({sales:fixtures,salesMonth:'2026-10',purchaseMonth:'2026-10'});
 for(const text of ['販売総額','支払受付額','純受取','原価未照合','利益未確定','進行中','取消前の記録','金額基準未確認','控除合計 ¥300','#request-daily-trade-import'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('¥NaN'));
 const net=details.row(fixtures[1]);assert.ok(net.includes('<td class="num">未確認</td><td class="num">¥1,500</td><td class="num">¥1,200</td>'));assert.ok(net.includes('手数料 未確認'));assert.ok(net.includes('送料 未確認'));
});
test('old API, stale month, empty and truncated states are distinguished',()=>{
 assert.match(details.html({sales:null,purchaseMonth:'2026-10'}),/取得できません/);
 assert.match(details.html({sales:fixtures,salesMonth:'2026-09',purchaseMonth:'2026-10'}),/取得できません/);
 assert.match(details.html({sales:[],salesMonth:'2026-10',purchaseMonth:'2026-10'}),/明細はありません/);
 assert.match(details.html({sales:fixtures,salesMonth:'2026-10',purchaseMonth:'2026-10',salesTruncated:true}),/明細は一部/);
});
async function setup(){
 const {JSDOM,VirtualConsole}=createRequire(modules+'/package.json')('jsdom');
 const manifest=require('./app-assets.json'),dir=__dirname+'/';let html=fs.readFileSync(dir+'app.html','utf8');
 for(const url of manifest.scripts){let source=fs.readFileSync(dir+url.split('?')[0],'utf8');if(url.startsWith('./affiliate-production.js'))source=source.replace(/import\('[^']+'\)/,'Promise.resolve(window.__testAffiliateCore)');const end=html.lastIndexOf('</body>');html=html.slice(0,end)+'<script>'+source.replaceAll('</script','<\\/script')+'</script>'+html.slice(end)}
 const errors=[],calls=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));let fail=false;
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://synthetic-command-center.invalid/',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){
 Object.assign(w,{AbortSignal,structuredClone,TextEncoder,TextDecoder,scrollTo:()=>{}});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(input,options={})=>{const u=new URL(String(input));calls.push([u.pathname,options.method||'GET']);assert.equal(options.method||'GET','GET');if(u.pathname.includes('ledger')){if(fail)throw Error('Synthetic failure');const month=u.searchParams.get('month');return new Response(JSON.stringify({ok:true,month,purchases:[],counts:{},supplierPurchases:[],salesAvailable:true,sales:month==='2026-10'?fixtures:[]}))}return new Response(JSON.stringify({ok:true,items:[],tasks:[],events:[],purchases:[],suppliers:[],programs:[],accounts:[],jobs:[],campaigns:[],counts:{},readyCount:0,total:0,nextOffset:null,publisher_connected:false}))};
 }});
 await wait(()=>dom.window.CCHome?.loaded.active&&!dom.window.CCHome.loading);
 return{dom,w:dom.window,d:dom.window.document,errors,calls,fail:()=>{fail=true}};
}
async function wait(check){let n=0;while(!check()){if(n++>500)throw Error('DOM did not settle');await new Promise(r=>setTimeout(r,10))}}
test('full DOM loads classified sales once, refreshes, switches months and never leaves stale sales after failure',{skip:!modules},async()=>{
 const s=await setup();try{
  s.w.eval("sourcingApp.sub='purchases';sourcingApp.purchaseMonth='2026-10';load('sourcing')");await wait(()=>s.d.querySelector('.trade-table'));
  assert.equal(s.d.querySelectorAll('#tradeDetails').length,1);assert.equal(s.d.querySelectorAll('.trade-table tbody tr').length,4);
  s.w.eval('renderSourcing();renderSourcing()');assert.equal(s.d.querySelectorAll('#tradeDetails').length,1);
  await wait(()=>!s.w.eval('app.busy'));s.d.querySelector('[data-ledger-month="2026-09"]').click();await wait(()=>!s.w.eval('app.busy'));assert.match(s.d.querySelector('#tradeDetails').textContent,/明細はありません/);assert.ok(!s.d.querySelector('.trade-table'));
  s.d.querySelector('[data-ledger-month="2026-10"]').click();await wait(()=>!s.w.eval('app.busy'));assert.equal(s.d.querySelectorAll('.trade-table tbody tr').length,4);
  s.fail();await s.w.eval("load('sourcing')");assert.match(s.d.querySelector('#tradeDetails').textContent,/取得できません/);assert.ok(!s.d.querySelector('.trade-table'));
  assert.deepEqual(s.errors,[]);
 }finally{await new Promise(r=>setTimeout(r,30));s.dom.window.close()}
});
