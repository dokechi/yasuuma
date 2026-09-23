const assert=require('node:assert/strict');
const A=require('./v226-adaptive-carousel.js');
const now='2026-09-23T00:00:00Z';
const base={
 generation_version:A.VERSION,design_version:A.DESIGN_VERSION,research_version:A.RESEARCH_VERSION,research_started_at:now,
 logical_task_id:A.TASK_IDS.money,
 community_research:{required:true,status:'strict',window_days:14,min_topics:2,min_comments_per_topic:200},
 research_threads:[
  {url:'https://girlschannel.net/topics/1001/',title:'A',published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'1-250',total_comments:250,related_to_question:true,comments:[{comment_no:10,summary:'疑問',direct_url:'https://girlschannel.net/topics/1001/#comment-10',plus:null,minus:null}]},
  {url:'https://girlschannel.net/topics/1002/',title:'B',published_at:'2026-09-15T00:00:00Z',checked_at:now,checked_scope:'1-220',total_comments:220,related_to_question:true,comments:[{comment_no:11,summary:'反論',direct_url:'https://girlschannel.net/topics/1002/#comment-11',plus:null,minus:null}]}
 ],
 draft_status:'ready',draft_revision:'r1',content_lock:{locked:true,draft_revision:'r1',locked_at:now},page_count_reason:'内容上2ページ',
 adaptive_design:{mode:'adaptive',decision_basis:'数字比較を主役にする',visual_language:'white/neutral/data-first'},
 draft_slides:[1,2].map(page=>({page,headline:'H'+page,body:'B'+page,source_refs:['s1'],page_contract:{reader_question:'Q'+page,answer:'A'+page,visual_subject:'V'+page,visual_type:'comparison',evidence:{kind:'primary'},calculation:null,required_assets:[],display_copy:'C'+page,source_refs:['s1'],source_type:'primary',status:'ready'}})),
 draft_sources:[{id:'s1',label:'公式',url:'https://example.com',claim:'claim',checked_at:now,source_type:'primary'}],post_title:'title',caption:'cap',screenshot_requests:[],screenshot_decisions:{}
};
assert.equal(A.lane(base),'money');
assert.deepEqual(A.strictCommunityIssues(base),[]);
assert.deepEqual(A.pageContractIssues(base),[]);
assert.deepEqual(A.sourceIssues(base),[]);
assert.deepEqual(A.lockIssues(base),[]);
assert.deepEqual(A.designIssues(base),[]);
const q=A.quality({payload:base,title:'title'},()=>({ready:false,issues:['ページ別原稿が不足']}));
assert.equal(q.ready,true);

for(const name of ['house','career']){
 const p=structuredClone(base);p.logical_task_id=A.TASK_IDS[name];
 assert.equal(A.lane(p),name);
 assert.deepEqual(A.strictCommunityIssues(p),[]);
}
const overseas=structuredClone(base);overseas.logical_task_id=A.TASK_IDS.overseas;overseas.community_research={required:false};overseas.research_threads=[];
assert.equal(A.lane(overseas),'overseas');
assert.deepEqual(A.strictCommunityIssues(overseas),[]);

const old={draft_status:'ready'};
assert.equal(A.adaptive(old),false);
assert.deepEqual(A.preflightIssues(old,()=>['デザインを選ぶ']),['デザインを選ぶ']);

const stale=structuredClone(base);stale.research_threads[0].published_at='2026-09-01T00:00:00Z';
assert.match(A.strictCommunityIssues(stale).join(' '),/直近14日外/);
const low=structuredClone(base);low.research_threads[1].total_comments=199;
assert.match(A.strictCommunityIssues(low).join(' '),/200件未満/);
const missingReaction=structuredClone(base);delete missingReaction.research_threads[0].comments[0].plus;
assert.match(A.strictCommunityIssues(missingReaction).join(' '),/plusは未取得ならnull/);

const handoff=A.buildHandoff({payload:base,title:'title'});
assert.match(handoff,/LOCK済み/);assert.match(handoff,/固定された3配色/);assert.match(handoff,/layout_overflow/);
console.log('v226 adaptive carousel tests passed');
