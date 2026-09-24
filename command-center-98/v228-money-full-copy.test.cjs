'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('./v226-adaptive-carousel.js');
const C = require('./v228-money-full-copy.js');
// Reuse the real validator's existing valid fixtures; run its regression suite too.
const originalTests = fs.readFileSync(path.join(__dirname,'v226-adaptive-carousel.test.cjs'),'utf8');
const seeds = new Function('require','structuredClone',originalTests + '\nreturn {base,moneyEntrance,house};')(require,structuredClone);
const copies = [
  '残クレは、車を安くする仕組みじゃない。\n軽くなるのは、最終回を除く月々の支払い。\n見るべきは「月いくら？」だけじゃない。',
  '月々が軽く見える理由は、残価を最後に残すから。\n車両価格の一部を「残価」として最終回へ据え置く。\nそのぶん、最終回を除く月々の支払いは軽くなる。',
  '据え置いた残価にも、分割払手数料はかかる。\nTS CUBICは、手数料は「残価を含めた元金」に発生すると案内。\n出典：TS CUBIC',
  '最後は3択。\n乗り換え／返却／買い上げ。\n返却条件を外れれば、精算金が出る場合がある。\n買い上げるなら、残価の支払いが必要。',
  '残クレが合いやすい人もいる。\n数年後に乗り換える前提で、月々の支出を抑えたい人。\n同じ車を長く持ちたいなら、買い上げまで含めて比べる。',
  '比べるなら、同じ年数・同じ終わり方。\n頭金／月々／ボーナス／残価／手数料／返却時の精算条件。\n「月いくら？」だけでは決めない。'
];
function relock(p) {
  p.content_lock = {locked:true,draft_revision:p.draft_revision,locked_at:'2026-09-23T00:00:00Z',snapshot:structuredClone(A.lockSnapshot(p))};
}
function makeFixture() {
  const p = structuredClone(seeds.moneyEntrance);
  p.post_title = '残クレなら、高い車も安く乗れるん？';
  p.draft_status = 'blocked'; p.blocked_reason = 'community_strict_insufficient';
  p.image_ready = false; p.asset_status = 'blocked_by_demand_gate';
  p.community_research.status = 'strict_insufficient';
  p.research_threads[1].published_at = '2026-09-04T19:06:25+09:00';
  p.demand_evidence.decision_reason = '14日内・各200件以上の第2関連トピックが不足。';
  p.page_count_reason = '6現象の表示・コピーを検証するテストフィクスチャ。';
  const roles = ['entrance','mechanism','fee','end_options','fit','action'];
  const phenomena = ['月額と総額は別','残価を最終回へ据え置く','残価も手数料の対象','終わり方で支払いが分かれる','利用予定との一致','条件を揃えた比較'];
  const template = structuredClone(p.draft_slides[0]);
  p.draft_slides = copies.map((copy,i) => ({...structuredClone(template),page:i+1,role:roles[i],
    headline:'旧見出し'+(i+1),body:'旧補足文'+(i+1),page_contract:{...structuredClone(template.page_contract),
    calculation_required:false,calculation:null,phenomenon:phenomena[i],display_copy:copy}}));
  p.story_spine.beats = roles.map((role,i)=>({page:i+1,role,phenomenon:phenomena[i]}));
  p.entrance_options.forEach((option,i)=>{option.display_copy=i===0?copies[0]:['','Marinaの全文\n別の入口。','Benの全文\n事実から入る。'][i];option.headline=i===0?'旧見出し1':option.label+'見出し';});
  p.caption = 'キャプションの改行も\nそのまま残す。';
  relock(p);
  return {id:'task:'+C.TASK_ID+':fixture:zankure',title:p.post_title,payload:p};
}
const fixture = makeFixture();
const before = JSON.stringify(fixture);
assert.equal(A.adaptive(fixture),true);
assert.equal(A.quality(fixture,null).ready,false);
assert.deepEqual(A.structureIssues(fixture),[]);
assert.equal(C.applies(fixture),true);
assert.equal(C.inspect(fixture,A).imageReady,false);
const review = C.buildReviewCopy(fixture,A);
assert.match(review,/確認用原稿.*画像生成指示ではありません/);
assert.match(review,/原稿状態: blocked/);
assert.match(review,/community_strict_insufficient/);
assert.match(review,/Marina/); assert.match(review,/Ben/);
assert.match(review,/投稿の骨格/); assert.match(review,/根拠ID:/);
assert.doesNotMatch(review,/旧見出し[1-6]|旧補足文[1-6]/);
for (let i=0;i<copies.length;i++) {
  const marker='【'+(i+1)+'/6】\n【画像に表示する全文】\n';
  const got=review.split(marker)[1].split('\n【制作内部情報')[0];
  assert.equal(got,copies[i]);
}
assert.ok(review.endsWith(fixture.payload.caption));
assert.equal(JSON.stringify(fixture),before,'Inspection/export must not mutate stored data');
const valid = structuredClone(fixture);
valid.payload.draft_status='ready'; valid.payload.blocked_reason=null;
valid.payload.community_research.status='strict';
valid.payload.research_threads[1].published_at='2026-09-15T00:00:00Z';
valid.payload.image_ready=true; valid.payload.asset_status='ready_for_image_generation';
relock(valid.payload);
assert.equal(A.quality(valid,null).ready,true);
assert.equal(C.inspect(valid,A).imageReady,true);
for (const key of ['marina','ben','michael']) {
  const p=valid.payload,o=p.entrance_options.find(x=>x.key===key);
  p.selected_entrance=key;p.entrance_selection.selected_key=key;
  p.draft_slides[0].headline=o.headline;p.draft_slides[0].body=o.body;p.draft_slides[0].page_contract.display_copy=o.display_copy;
  relock(p);
  assert.equal(C.inspect(valid,A).imageReady,true);
  assert.ok(C.buildReviewCopy(valid,A).includes('選択中: '+key));
  assert.equal(C.canonicalPages(valid)[0].copy,o.display_copy);
  assert.ok(A.buildHandoff(valid).includes(o.display_copy));
}
const absent=structuredClone(valid);delete absent.payload.draft_slides[2].page_contract.display_copy;
assert.equal(C.inspect(absent,A).imageReady,false);
assert.match(C.buildReviewCopy(absent,A),/display_copy未保存・旧本文で代用しません/);
assert.doesNotMatch(C.buildReviewCopy(absent,A),/旧補足文3/);
const changed=structuredClone(valid);changed.payload.draft_slides[2].page_contract.display_copy+='改変';
assert.equal(C.inspect(changed,A).imageReady,false);
assert.throws(()=>C.inspect({payload:{}},A),/空/);
assert.throws(()=>C.buildReviewCopy({},A),/空/);
assert.equal(C.inspect(valid,null).imageReady,false);
assert.equal(C.inspect(valid,{adaptive:()=>true,quality:()=>({}),preflightIssues:()=>[]}).imageReady,false);
const work=structuredClone(fixture);work.payload.execution_source='work';work.payload.execution_channel='work';
assert.equal(C.applies(work),false);
assert.equal(C.applies({payload:seeds.house}),false);
const special=structuredClone(fixture);special.payload.draft_slides[2].page_contract.display_copy='\n  <img src=x onerror="alert(1)"> & ㎡ ≒ ÷  \n';
assert.equal(C.canonicalPages(special)[2].copy,special.payload.draft_slides[2].page_contract.display_copy);
console.log('v228 canonical full-copy tests passed; six pages, three entrances, blocked/ready, LOCK, missing data and Work scope verified');
module.exports={makeFixture};
