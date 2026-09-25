const assert = require('node:assert/strict');
const adaptive = require('../command-center-98/v226-adaptive-carousel.js');
const review = require('../command-center-98/v228-money-full-copy.js');

const payload = {
  execution_source:'chat', source_task_id:review.TASK_ID, adaptive_scope:'money_chat',
  content_type:'fp_post_candidate', category:'fp_psychology',
  generation_version:'adaptive-carousel-v1-20260923-money-chat',
  editorial_workflow_version:review.EDITORIAL_VERSION, editorial_stage:'skeleton',
  structure_contract_version:adaptive.MONEY_STRUCTURE_VERSION,
  entrance_contract_version:adaptive.MONEY_ENTRANCE_VERSION,
  draft_revision:'sample-r1', draft_status:'awaiting_editorial', image_ready:false,
  story_spine:{central_question:'なぜ？',final_answer:'条件で変わる',beats:[{page:1,role:'entrance',phenomenon:'入口の違和感'},{page:2,role:'action',phenomenon:'判断条件'}]},
  draft_slides:[
    {page:1,role:'entrance',page_contract:{phenomenon:'入口の違和感',reader_question:'なぜ？',answer:'条件で変わる',source_refs:['S1']}},
    {page:2,role:'action',page_contract:{phenomenon:'判断条件',reader_question:'何を見る？',answer:'条件',source_refs:['S1']}}
  ],
  entrance_options:['michael','marina','ben'].map(key=>({key,label:key,hook:`${key}の入口`})),
  draft_sources:[{id:'S1',label:'公式',url:'https://example.com',source_type:'official'}]
};
const item = {id:'task:sample',title:'サンプル',payload};
assert.equal(review.applies(item),true);
assert.equal(review.inspect(item,adaptive).imageReady,false);
assert.match(review.buildReviewCopy({...item,payload:{...payload,selected_entrance:'michael',entrance_selection:{source:'command_center_user'}}},adaptive),/司令塔 → 高度AI/);
assert.throws(()=>review.buildEditorialHandoff(item),/入口を1つ選んで/);
assert.ok(adaptive.quality({...item,payload:{...payload,draft_status:'ready'}},null).issues.some(x=>x.includes('高度AIによる原稿完成')));
const legacy={...payload,editorial_workflow_version:undefined,editorial_stage:undefined};
assert.equal(review.inspect({...item,payload:legacy},adaptive).imageReady,false);
assert.match(review.buildReviewCopy({...item,payload:legacy},adaptive),/確認用原稿/);
console.log('money editorial flow: passed');

