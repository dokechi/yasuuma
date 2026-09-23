const assert=require('node:assert/strict');
const A=require('./v226-adaptive-carousel.js');
const now='2026-09-23T00:00:00Z';
const base={
 adaptive_scope:'money_chat',
 execution_source:'chat',
 runner_key:'chat-money-v1',
 logical_task_id:A.MONEY_TASK_ID,
 generation_version:A.VERSION,design_version:A.DESIGN_VERSION,research_version:A.RESEARCH_VERSION,research_started_at:now,
 community_research:{required:true,status:'strict',window_days:14},
 research_threads:[
  {url:'https://girlschannel.net/topics/1001/',title:'A',related_to_question:true,published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'1-250',total_comments:250,comments:[{comment_no:10,summary:'疑問',plus:null,minus:null}]},
  {url:'https://girlschannel.net/topics/1002/',title:'B',related_to_question:true,published_at:'2026-09-15T00:00:00Z',checked_at:now,checked_scope:'1-220',total_comments:220,comments:[{comment_no:11,summary:'反論',plus:null,minus:null}]}
 ],
 draft_status:'ready',draft_revision:'r1',content_lock:{locked:true,draft_revision:'r1',locked_at:now},page_count_reason:'内容上2ページ',
 adaptive_design:{mode:'adaptive',decision_basis:'数字比較を主役にする',visual_language:'white/neutral/data-first'},
 draft_slides:[1,2].map(page=>({
  page,headline:'H'+page,body:'B'+page,source_refs:['s1'],
  page_contract:{
   reader_question:'Q'+page,answer:'A'+page,visual_subject:'V'+page,visual_type:'comparison',
   evidence:'公式一次情報',calculation:null,required_assets:[],display_copy:'C'+page,
   source_refs:['s1'],source_type:'official_company',status:'ready'
  }
 })),
 draft_sources:[{id:'s1',label:'公式',url:'https://example.com',claim:'claim',checked_at:now,source_type:'official_company'}],
 post_title:'title',caption:'cap',screenshot_requests:[],screenshot_decisions:{}
};

assert.equal(A.moneyChatScope(base),true);
assert.equal(A.adaptive(base),true);
assert.deepEqual(A.strictCommunityIssues(base),[]);
assert.deepEqual(A.pageContractIssues(base),[]);
assert.deepEqual(A.sourceIssues(base),[]);
assert.deepEqual(A.lockIssues(base),[]);
assert.deepEqual(A.designIssues(base),[]);
const q=A.quality({payload:base,title:'title'},()=>({ready:false,issues:['ページ別原稿が不足']}));
assert.equal(q.ready,true);

const old={draft_status:'ready'};
assert.equal(A.adaptive(old),false);
assert.deepEqual(A.preflightIssues(old,()=>['デザインを選ぶ']),['デザインを選ぶ']);

const stale=structuredClone(base);
stale.research_threads[0].published_at='2026-09-01T00:00:00Z';
assert.match(A.strictCommunityIssues(stale).join(' '),/直近14日外/);

const low=structuredClone(base);
low.research_threads[1].total_comments=199;
assert.match(A.strictCommunityIssues(low).join(' '),/200件未満/);

const one=structuredClone(base);
one.research_threads=one.research_threads.slice(0,1);
assert.match(A.strictCommunityIssues(one).join(' '),/別トピック2本/);

const expanded=structuredClone(base);
expanded.community_research.status='expanded';
expanded.community_research.expanded=true;
assert.match(A.strictCommunityIssues(expanded).join(' '),/strict合格ではない|拡張調査/);

const missingReaction=structuredClone(base);
delete missingReaction.research_threads[0].comments[0].plus;
assert.match(A.strictCommunityIssues(missingReaction).join(' '),/plusは未取得ならnull/);

const generatedEvidence=structuredClone(base);
generatedEvidence.draft_slides[0].page_contract.required_assets=[{asset_type:'generated_photorealistic_image',is_evidence:true}];
assert.match(A.pageContractIssues(generatedEvidence).join(' '),/生成・説明用素材を実物証拠/);

const badCalc=structuredClone(base);
badCalc.draft_slides[0].page_contract.calculation={inputs:{loan:40000000},result:123};
assert.match(A.pageContractIssues(badCalc).join(' '),/計算条件が不足/);

const ugcOnly=structuredClone(base);
ugcOnly.draft_sources=[{id:'ugc1',label:'投稿',url:'https://girlschannel.net/topics/1001/',checked_at:now,source_type:'community'}];
ugcOnly.draft_slides.forEach(s=>{s.source_refs=['ugc1'];s.page_contract.source_refs=['ugc1'];});
assert.match(A.sourceIssues(ugcOnly).join(' '),/UGC\/個人体験だけを事実の根拠/);

const work=structuredClone(base);
work.adaptive_scope='';
work.execution_source='work';
work.runner_key='work-money-v1';
assert.equal(A.moneyChatScope(work),false);
assert.equal(A.adaptive(work),false);
assert.deepEqual(A.preflightIssues(work,()=>['work-base-rule']),['work-base-rule']);

const homeChat=structuredClone(base);
homeChat.adaptive_scope='home_chat';
homeChat.runner_key='chat-house-v1';
homeChat.logical_task_id='6aa77eb5ce7881919d8dc62554833b60';
assert.equal(A.moneyChatScope(homeChat),false);
assert.equal(A.adaptive(homeChat),false);

const handoff=A.buildHandoff({payload:base,title:'title'});
assert.match(handoff,/LOCK済み/);
assert.match(handoff,/固定された3配色/);
assert.match(handoff,/layout_overflow/);
assert.doesNotMatch(handoff,/girlschannel/);

console.log('v226 money Chat adaptive carousel tests passed');
