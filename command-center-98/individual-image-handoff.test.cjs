'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const api = require('./v207-individual-image-handoff.js');
const item = (n, category = 'house_living') => ({id:'test', payload:{
  category, draft_status:'blocked', review_status:'needs_current_final_review',
  production_spec:{size:category === 'fp_psychology' ? '1080×1350' : '1080×1440',ratio:category === 'fp_psychology' ? '4:5' : '3:4'},
  draft_slides:Array.from({length:n},(_,i)=>({page:i+1,headline:`見出し${i+1}`,body:`本文${i+1}`}))
}});
test('six pages means six separate images, not six panels',()=>{
  const s=api.build('元の原稿',item(6));
  assert.match(s,/全6枚の独立した画像/);
  assert.match(s,/1回の生成＝1ページ/);
  assert.match(s,/1\/6 → 2\/6 → 3\/6 → 4\/6 → 5\/6 → 6\/6/);
  assert.match(s,/2列×3段/);assert.match(s,/後から切り分ける方法も使わない/);
});
test('actual FP page count and each-image dimensions',()=>{
  const s=api.build('7ページ原稿',item(7,'fp_psychology'));
  assert.match(s,/全7枚/);assert.match(s,/1080×1350／4:5/);assert.match(s,/7\/7/);
  assert.doesNotMatch(s,/6\/6/);
});
test('keeps every character of source, captions and design',()=>{
  const base='【タイトル】\nテスト\n【スクショ素材】\n資料範囲\n【キャプション】\n条件付き100万円\n';
  const data=item(6),before=JSON.stringify(data);
  assert.ok(api.build(base,data).endsWith(base));assert.equal(JSON.stringify(data),before);
});
test('review handoff keeps the gate and never marks a draft ready',()=>{
  const data=item(6),s=api.build('必須の照合未完了なら生成しない。',data,'review');
  assert.match(s,/この原稿は最終確認待ち/);
  assert.match(s,/確認条件を解除しません/);
  assert.ok(s.endsWith('必須の照合未完了なら生成しない。'));
  assert.equal(data.payload.draft_status,'blocked');
});
test('unknown or noncontiguous page data fail closed',()=>{
  assert.throws(()=>api.build('text',{payload:{}}));
  const data=item(6);data.payload.draft_slides[2].page=5;
  assert.throws(()=>api.build('text',data),/ページ順/);
  assert.throws(()=>api.build('',item(6)));
  assert.throws(()=>api.build('text',item(6),'ignore-gates'));
});
test('single page and missing legacy page numbers are unambiguous',()=>{
  const data=item(1);delete data.payload.draft_slides[0].page;
  assert.match(api.build('body',data),/全1枚の独立/);
});
test('contract can be shared by overseas English drafts without translating them',()=>{
  const payload=item(6,'cheaper_japan').payload;
  const base='Same SKU. Same contents. Check with your hotel first.';
  assert.ok(api.build(base,{sourcePayload:{event:{payload}}}).endsWith(base));
  assert.equal(api.spec({source_payload:{event:{payload}}}).count,6);
});
test('no approval, image generation or external-write action exists in this module',()=>{
  const fs=require('node:fs'),source=fs.readFileSync(__dirname+'/v207-individual-image-handoff.js','utf8');
  assert.doesNotMatch(source,/method:\s*['"](?:POST|PATCH|DELETE|PUT)['"]/);
  assert.doesNotMatch(source,/draft_status\s*=\s*['"]ready['"]/);
  assert.doesNotMatch(source,/image_gen\.text2im/);
});
