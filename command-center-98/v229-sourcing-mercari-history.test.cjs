const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'v229-sourcing-mercari-history.js'),'utf8');
function harness(){
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const c={sourcingCostHtml:()=>'<details>legacy</details>',sourcingEvidence:x=>x.payload,
    isReadySourcing:x=>!!x.ready,safeHttpUrl:x=>/^https?:\/\//.test(String(x))?String(x):'',
    esc,yen:n=>n+'円',sourcingValue:()=>null,sourcingMoney:()=> '未確認',fmtDate:()=>'',
    document:{createElement:()=>({}),head:{appendChild(){}}},window:{}};
  vm.createContext(c);vm.runInContext(source,c);return c;
}
const render=(c,row)=>c.sourcingCostHtml({payload:{mercari_sales_history:[row]}});
test('missing and malformed prices are unconfirmed; explicit zero and currency strings remain prices',()=>{
  const c=harness();
  for(const price of [undefined,null,'','   ','未確認','unknown','価格未確認',false,{},'約1000円','1,000～2,000円']){
    assert.match(render(c,{price}),/<td class="profit">未確認<\/td>/,String(price));
  }
  for(const [price,expected] of [[0,'0円'],['0','0円'],['¥1,234','1234円'],['1,234円','1234円'],[1200,'1200円']]){
    assert.ok(render(c,{price}).includes('<td class="profit">'+expected+'</td>'));
  }
});
test('absence of match or differences cannot assert an exact match; explicit evidence survives',()=>{
  const c=harness();assert.match(render(c,{}),/<b>未判定<\/b>/);
  assert.ok(!render(c,{}).includes('完全一致'));
  assert.match(render(c,{match_class:'A',variant_difference:'完全一致'}),/完全一致/);
});
test('only a single amount with valid thousands grouping is accepted, without joining digits or prices',()=>{
  const c=harness();
  for(const price of ['1,000 2,000円','1,2','1,00','1,000,','1,,000','1234,567','1 000','1\t000','1\n000','1, 000','1,000\u00a02,000円','1，000,000','¥1,000 ¥2,000','1,000円 2,000円']){
    assert.ok(render(c,{price}).includes('<td class="profit">未確認</td>'),JSON.stringify(price));
  }
  for(const [price,expected] of [['  ¥ 1,234 円  ',1234],['￥1，234円',1234],['1,000,000円',1000000],['1，000，000',1000000],['1234',1234],['1,234.50円',1234.5],['0 円',0],[' 1200 ',1200]]){
    assert.ok(render(c,{price}).includes('<td class="profit">'+expected+'円</td>'),JSON.stringify(price));
  }
});
test('sold, confirmed, updated and untyped dates remain distinct and missing sold dates stay unknown',()=>{
  const c=harness();
  const html=render(c,{confirmed_at:'2026-10-11',updated_age:'2日前',age_text:'昨日'});
  assert.ok(html.includes('成約日: 未確認'));
  for(const text of ['確認日: 2026-10-11','更新時期: 2日前','日付種別不明: 昨日'])assert.ok(html.includes(text));
  assert.ok(render(c,{sold_date:'2026-09-01',confirmed_at:'2026-10-11',updated_at:'2026-10-10',sold_age:'先月'}).includes('成約日: 2026-09-01 / 成約時期: 先月 / 確認日: 2026-10-11 / 更新日: 2026-10-10'));
  for(const sold_at of [null,'不明','?','—','unknown'])assert.ok(render(c,{sold_at}).includes('成約日: 未確認'));
});
test('duplicate history keeps existing deduplication and never alters original values or URLs',()=>{
  const c=harness(),row={id:'m123',price:null,confirmed_at:'2026-10-11',url:'https://jp.mercari.com/item/m123'};
  const p={mercari_sales_history:[row,{...row}]},before=JSON.stringify(p);
  const rows=c.window.CCSourcingMercariHistory.normalizedHistory(p);
  assert.equal(rows.length,1);assert.equal(rows[0].price,null);assert.equal(rows[0].url,row.url);
  assert.equal(JSON.stringify(p),before);
  assert.ok(c.sourcingCostHtml({payload:p}).includes('href="'+row.url+'"'));
});
test('HTML remains escaped and existing readiness and fallback behavior do not change',()=>{
  const c=harness();
  assert.ok(!render(c,{confirmed_at:'<script>x</script>'}).includes('<script>'));
  assert.equal(c.isReadySourcing({ready:true,title:'other'}),true);
  assert.equal(c.isReadySourcing({ready:true,title:'ELECOM',payload:{unit_effective_cost_yen:999}}),false);
  assert.equal(c.sourcingCostHtml({payload:{}}),'<details>legacy</details>');
});
