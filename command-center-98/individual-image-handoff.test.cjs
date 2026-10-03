'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('./v207-individual-image-handoff.js');
const review = require('./v206-review-copy-handoff.js');
const provenance = require('./v204-chat-execution-source.js');
const item = (n, category = 'house_living') => ({id:'test', priority:'A', score:90, payload:{
  category, execution_source:'chat', draft_status:'ready',
  post_title:'原稿タイトル', caption:'条件付き100万円\n確認する。',
  source_url:'https://example.com/topic',source_checked_at:'2026-09-23',
  question_lineage:{selected_question:'どう確かめる？',answer_target:'条件を確認する。'},
  design_direction:'editorial', screenshot_requests:[], screenshot_decisions:{},
  production_spec:{size:category === 'fp_psychology' ? '1080×1350' : '1080×1440',ratio:category === 'fp_psychology' ? '4:5' : '3:4'},
  draft_sources:[{id:'S1',label:'一次情報',url:'https://example.com/source',claim:'条件を確認する。',checked_at:'2026-09-23'}],
  draft_slides:Array.from({length:n},(_,i)=>({page:i+1,headline:`見出し${i+1}`,body:`本文${i+1}`,visual_mode:'type',visual:'文字で条件を示す。',source_refs:['S1']}))
}});

// Run the real legacy generator and Chat guard without external I/O. The saved
// view deliberately skips the generator's optional live priority-board request.
function browser(rows=[]) {
  const handlers={},copied=[],notices=[];
  const document={querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,
    addEventListener(){},createElement:()=>({}),head:{appendChild(){},append(){}}};
  const w={document,cardHtml:()=>'',renderList(){},app:{items:rows,view:'saved'},
    CCReviewHandoff:review,CCChatExecution:provenance,console,
    navigator:{clipboard:{writeText:async text=>{copied.push(text);}}},
    toast:(message,kind)=>notices.push({message,kind}),
    addEventListener:(name,handler)=>{(handlers[name]||=[]).push(handler);},
    fetch(){throw Error('External I/O is forbidden in handoff tests');}};
  w.window=w;vm.createContext(w);
  for(const file of ['v151-fp-content-pipeline.js','v207-individual-image-handoff.js','v208-chat-image-contract-guard.js']){
    vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),w,{filename:file});
  }
  return {w,pipe:w.__fpContentPipeline,copied,notices,async click(row){
    const button={dataset:{fpCopyPackage:row.id},focus(){}};
    const event={target:{closest:selector=>selector==='[data-fp-copy-package]'?button:null},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
    for(const handler of handlers.click||[])handler(event);
    await new Promise(resolve=>setImmediate(resolve));
    return event;
  }};
}

test('six-page shared generator and Chat guard require six separate images, not panels',()=>{
  const data=item(6),{w,pipe}=browser(),base=pipe.buildHandoff(data);
  assert.equal(api.build(base,data),base,'The shared Work/Astra prompt stays byte-identical');
  const s=w.CCIndividualImages.build(base,data);
  assert.match(s,/各ページを独立した別画像/);
  assert.match(s,/結合画像・一覧・コラージュ・ZIPだけの納品は禁止/);
  for(let page=1;page<=6;page++)assert.ok(s.includes('【'+page+'/6】'));
  assert.match(s,/1080×1440、3:4/);
  assert.ok(s.endsWith(base));
  assert.doesNotMatch(s,/1回の生成＝1ページ/,'Obsolete Chat-only call limits are not restored');
});
test('actual FP page count and each-image dimensions come from the shared generator',()=>{
  const data=item(7,'fp_psychology'),{w,pipe}=browser();
  const s=w.CCIndividualImages.build(pipe.buildHandoff(data),data);
  assert.equal(api.spec(data).count,7);
  assert.match(s,/1080×1350、4:5/);assert.match(s,/【7\/7】/);
  assert.doesNotMatch(s,/【6\/6】/);
});
test('keeps every character of source, captions and design',()=>{
  const base='【タイトル】\nテスト\n【スクショ素材】\n資料範囲\n【キャプション】\n条件付き100万円\n';
  const data=item(6),before=JSON.stringify(data);
  assert.equal(api.build(base,data),base);assert.equal(JSON.stringify(data),before);
});
test('ready Chat clicks copy the real guarded generator output without changing records',async()=>{
  const data=item(6),before=JSON.stringify(data),b=browser([data]);
  assert.equal(b.pipe.packageQuality(data).ready,true);
  const expected=b.w.CCIndividualImages.build(b.pipe.buildHandoff(data),data);
  const event=await b.click(data);
  assert.equal(event.prevented,true);assert.equal(event.stopped,true);
  assert.deepEqual(b.copied,[expected]);assert.equal(JSON.stringify(data),before);
});
test('model-evidence-only compatibility does not approve or modify the stored draft',async()=>{
  const data=item(6);Object.assign(data.payload,{draft_status:'blocked',review_status:'needs_current_final_review',
    blocked_reason:'model_execution_unverified',research_status:'verified',missing_evidence:[],public_leak_issues:[],
    final_review:{unresolved_items:['model_execution_unverified']}});
  const before=JSON.stringify(data),b=browser([data]);
  assert.equal(review.policy(data,b.pipe).allowed,true);
  await b.click(data);
  assert.equal(b.copied.length,1);
  assert.match(b.copied[0],/不足や矛盾があり.*画像を作らず/);
  assert.match(b.copied[0],/未確認のまま完成扱いにしない/);
  assert.equal(JSON.stringify(data),before);
});
test('real evidence, final-review, source and preflight problems still block review copies',async()=>{
  for(const mutate of [
    p=>{p.missing_evidence=['根拠不足'];},
    p=>{p.final_review.unresolved_items=['金額不一致'];},
    p=>{p.draft_sources=[];},
    p=>{p.design_direction='';}
  ]){
    const data=item(6);Object.assign(data.payload,{draft_status:'blocked',review_status:'needs_current_final_review',
      blocked_reason:'model_execution_unverified',research_status:'verified',missing_evidence:[],
      final_review:{unresolved_items:['model_execution_unverified']}});
    mutate(data.payload);const before=JSON.stringify(data),b=browser([data]);
    assert.equal(review.policy(data,b.pipe).allowed,false);
    await b.click(data);assert.deepEqual(b.copied,[]);
    assert.ok(b.notices.some(n=>n.kind==='bad'));assert.equal(JSON.stringify(data),before);
  }
});
test('unknown or noncontiguous page data fail closed',()=>{
  assert.throws(()=>api.build('text',{payload:{}}),/ページ別原稿/);
  assert.throws(()=>api.build('text',item(0)),/ページ別原稿/);
  const data=item(6);data.payload.draft_slides[2].page=5;
  assert.throws(()=>api.build('text',data),/ページ順/);
  data.payload.draft_slides[2]=null;
  assert.throws(()=>api.build('text',data),/ページ順/);
  assert.throws(()=>api.build('',item(6)),/本文/);
  assert.throws(()=>api.build('text',item(6),'ignore-gates'),/種別/);
});
test('malformed ready rows cannot reach the clipboard even when legacy quality passes',async()=>{
  const data=item(6);data.payload.draft_slides[2].page=5;
  const b=browser([data]);assert.equal(b.pipe.packageQuality(data).ready,true);
  await b.click(data);assert.deepEqual(b.copied,[]);
  assert.match(b.notices[0].message,/ページ順/);
});
test('single page and missing legacy page numbers remain unambiguous',()=>{
  const data=item(1);delete data.payload.draft_slides[0].page;
  const {w,pipe}=browser(),base=pipe.buildHandoff(data);
  assert.equal(api.spec(data).count,1);
  assert.match(w.CCIndividualImages.build(base,data),/【1\/1】/);
});
test('contract can be shared by overseas English drafts without translating them',()=>{
  const payload=item(6,'cheaper_japan').payload;
  const base='Same SKU. Same contents. Check with your hotel first.';
  assert.equal(api.build(base,{sourcePayload:{event:{payload}}}),base);
  assert.equal(api.spec({source_payload:{event:{payload}}}).count,6);
});
test('guard rejects unknown Chat prompts and leaves valid Work prompts and clicks unchanged',async()=>{
  const data=item(6),b=browser([data]);
  assert.throws(()=>b.w.CCIndividualImages.build('unrecognized',data),/既存の画像制作手順/);
  data.payload.execution_source='work';
  assert.equal(b.w.CCIndividualImages.build('original Work prompt',data),'original Work prompt');
  const event=await b.click(data);
  assert.equal(event.prevented,undefined);assert.equal(event.stopped,undefined);assert.deepEqual(b.copied,[]);
});
test('no approval, image generation or external-write action exists in this module',()=>{
  const source=fs.readFileSync(__dirname+'/v207-individual-image-handoff.js','utf8');
  assert.doesNotMatch(source,/method:\s*['"](?:POST|PATCH|DELETE|PUT)['"]/);
  assert.doesNotMatch(source,/draft_status\s*=\s*['"]ready['"]/);
  assert.doesNotMatch(source,/image_gen\.text2im/);
});
