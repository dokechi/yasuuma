'use strict';
const assert = require('node:assert/strict');
const A = require('./v226-adaptive-carousel.js');
const C = require('./v228-money-full-copy.js');
// Public copy comes from the residual-credit draft. Other values are synthetic
// fixtures, not claims of live research. Use detached snapshots as stored JSON
// does: structuredClone alone preserves aliases in the legacy test fixtures.
// The actual v226 validator below is not mocked or replaced.
const now='2026-09-23T00:00:00Z';
const copies = [
  '残クレは、車を安くする仕組みじゃない。\n軽くなるのは、最終回を除く月々の支払い。\n見るべきは「月いくら？」だけじゃない。',
  '月々が軽く見える理由は、残価を最後に残すから。\n車両価格の一部を「残価」として最終回へ据え置く。\nそのぶん、最終回を除く月々の支払いは軽くなる。',
  '据え置いた残価にも、分割払手数料はかかる。\nTS CUBICは、手数料は「残価を含めた元金」に発生すると案内。\n出典：TS CUBIC',
  '最後は3択。\n乗り換え／返却／買い上げ。\n返却条件を外れれば、精算金が出る場合がある。\n買い上げるなら、残価の支払いが必要。',
  '残クレが合いやすい人もいる。\n数年後に乗り換える前提で、月々の支出を抑えたい人。\n同じ車を長く持ちたいなら、買い上げまで含めて比べる。',
  '比べるなら、同じ年数・同じ終わり方。\n頭金／月々／ボーナス／残価／手数料／返却時の精算条件。\n「月いくら？」だけでは決めない。'
];
function relock(p) {
  p.content_lock={locked:true,draft_revision:p.draft_revision,locked_at:now,snapshot:structuredClone(A.lockSnapshot(p))};
}
function makeFixture() {
  const roles=['entrance','mechanism','fee','end_options','fit','action'];
  const phenomena=['月額と総額は別','残価を最終回へ据え置く','残価も手数料の対象','終わり方で支払いが分かれる','利用予定との一致','条件を揃えた比較'];
  const p={
    execution_source:'chat',execution_channel:'chat',adaptive_scope:'money_chat',runner_key:'chat-money-v1',
    source_task_id:A.MONEY_CHAT_TASK_ID,origin_task_id:A.TASK_IDS.money,
    generation_version:A.LEGACY_MONEY_VERSION,design_version:A.LEGACY_MONEY_DESIGN_VERSION,research_version:A.LEGACY_MONEY_RESEARCH_VERSION,
    category:'fp_psychology',content_type:'fp_post_candidate',research_started_at:now,
    community_research:{required:true,status:'strict_insufficient',window_days:14,min_topics:2,min_comments_per_topic:200},
    research_threads:[
      {url:'https://girlschannel.net/topics/1001/',title:'TEST A',published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'synthetic fixture',total_comments:250,related_to_question:true,comments:[{comment_no:10,summary:'テスト用',direct_url:'https://girlschannel.net/comment/1001/10/',plus:null,minus:null}]},
      {url:'https://girlschannel.net/topics/1002/',title:'TEST B',published_at:'2026-09-04T00:00:00Z',checked_at:now,checked_scope:'synthetic fixture',total_comments:220,related_to_question:true,comments:[{comment_no:11,summary:'テスト用',direct_url:'https://girlschannel.net/comment/1002/11/',plus:null,minus:null}]}
    ],
    draft_status:'blocked',blocked_reason:'community_strict_insufficient',draft_revision:'fixture-r1-michael',
    final_review:{status:'passed',checked_revision:'fixture-r1-michael',unresolved_items:[],reviewed_entrances:['michael','marina','ben']},
    missing_evidence:[],premise_checks:[],image_ready:false,asset_status:'blocked_by_demand_gate',
    page_count_reason:'6現象の表示・コピーを検証するテストフィクスチャ。',
    adaptive_design:{mode:'adaptive',decision_basis:'表示検証',visual_language:'type'},
    question_lineage:{selected_question:'残クレなら、高い車も安く乗れるん？',answer_target:'月額と総額を分ける。'},
    source_comments:[],source_anchor_comment_nos:[],demand_evidence:{verdict:'strict_insufficient',decision_reason:'14日内・各200件以上の第2関連トピックが不足。'},
    post_title:'残クレなら、高い車も安く乗れるん？',caption:'キャプションの改行も\nそのまま残す。',
    draft_sources:[{id:'s1',label:'テスト一次資料',url:'https://www.fsa.go.jp/',claim:'fixture; not a verified publication claim',checked_at:now,source_type:'primary'}],
    screenshot_requests:[],screenshot_decisions:{},
    structure_contract_version:A.MONEY_STRUCTURE_VERSION,
    story_spine:{central_question:'残クレなら、高い車も安く乗れるん？',final_answer:'月額と総額を分ける。',beats:roles.map((role,i)=>({page:i+1,role,phenomenon:phenomena[i]}))},
    entrance_contract_version:A.MONEY_ENTRANCE_VERSION,selected_entrance:'michael',entrance_selection:{selected_key:'michael',selected_at:now,source:'test'},
    entrance_options:['michael','marina','ben'].map((key,i)=>({key,label:['Michael','Marina','Ben'][i],approach:'test',hook:'test',headline:i===0?'旧見出し1':key+'見出し',body:'旧補足文1',display_copy:i===0?copies[0]:key+'の全文\n別の入口。'})),
    draft_slides:copies.map((copy,i)=>({page:i+1,role:roles[i],headline:'旧見出し'+(i+1),body:'旧補足文'+(i+1),source_refs:['s1'],
      page_contract:{reader_question:'Q'+i,answer:'A'+i,phenomenon:phenomena[i],visual_subject:'対象'+i,visual_type:'type_only',
        evidence:{kind:'primary'},calculation_required:false,calculation:null,required_assets:[],display_copy:copy,source_refs:['s1'],source_type:'primary',status:'ready'}}))
  };
  relock(p);
  return JSON.parse(JSON.stringify({id:'task:'+C.TASK_ID+':fixture:zankure',title:p.post_title,payload:p}));
}
const fixture=makeFixture();
const before=JSON.stringify(fixture);
assert.equal(A.adaptive(fixture),true);
assert.equal(A.quality(fixture,null).ready,false);
assert.deepEqual(A.structureIssues(fixture),[]);
assert.equal(C.applies(fixture),true);
assert.equal(C.inspect(fixture,A).imageReady,false);
const review=C.buildReviewCopy(fixture,A);
assert.match(review,/確認用原稿.*画像生成指示ではありません/);
assert.match(review,/原稿状態: blocked/);
assert.match(review,/community_strict_insufficient/);
assert.match(review,/Marina/);assert.match(review,/Ben/);
assert.match(review,/投稿の骨格/);assert.match(review,/根拠ID:/);
assert.doesNotMatch(review,/旧見出し[1-6]|旧補足文[1-6]/);
for(let i=0;i<copies.length;i++){
  const marker='【'+(i+1)+'/6】\n【画像に表示する全文】\n';
  const got=review.split(marker)[1].split('\n【制作内部情報')[0];
  assert.equal(got,copies[i]);
}
assert.ok(review.endsWith(fixture.payload.caption));
assert.equal(JSON.stringify(fixture),before,'Inspection/export must not mutate stored data');
const valid=structuredClone(fixture);
valid.payload.draft_status='ready';valid.payload.blocked_reason=null;
valid.payload.community_research.status='strict';valid.payload.research_threads[1].published_at='2026-09-15T00:00:00Z';
valid.payload.image_ready=true;valid.payload.asset_status='ready_for_image_generation';
relock(valid.payload);
assert.deepEqual(A.quality(valid,null),{ready:true,issues:[]});
assert.equal(C.inspect(valid,A).imageReady,true);
for(const key of ['marina','ben','michael']){
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
const house=structuredClone(fixture);house.payload.source_task_id=A.HOUSE_CHAT_TASK_ID;house.payload.content_type='house_post_candidate';house.payload.adaptive_scope='house_chat';
assert.equal(C.applies(house),false);
const special=structuredClone(fixture);special.payload.draft_slides[2].page_contract.display_copy='\n  <img src=x onerror="alert(1)"> & ㎡ ≒ ÷  \n';
assert.equal(C.canonicalPages(special)[2].copy,special.payload.draft_slides[2].page_contract.display_copy);
console.log('v228 canonical full-copy tests passed; actual v226 validator, six pages, three entrances, blocked/ready, LOCK, missing data and Work scope verified');
module.exports={makeFixture};
