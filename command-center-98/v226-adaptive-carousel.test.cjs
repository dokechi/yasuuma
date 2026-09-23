const assert=require('node:assert/strict');
const A=require('./v226-adaptive-carousel.js');
const now='2026-09-23T00:00:00Z';

const base={
 adaptive_scope:'money_chat',
 execution_channel:'chat',
 runner_key:'chat-money-v1',
 generation_version:A.LEGACY_MONEY_VERSION,
 design_version:A.LEGACY_MONEY_DESIGN_VERSION,
 research_version:A.LEGACY_MONEY_RESEARCH_VERSION,
 research_started_at:now,
 source_task_id:A.MONEY_CHAT_TASK_ID,
 category:'fp_psychology',
 content_type:'fp_post_candidate',
 community_research:{required:true,status:'strict',window_days:14,min_topics:2,min_comments_per_topic:200},
 research_threads:[
  {url:'https://girlschannel.net/topics/1001/',title:'A',published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'1-250',total_comments:250,related_to_question:true,comments:[{comment_no:10,summary:'疑問',direct_url:'https://girlschannel.net/comment/1001/10/',plus:null,minus:null}]},
  {url:'https://girlschannel.net/topics/1002/',title:'B',published_at:'2026-09-15T00:00:00Z',checked_at:now,checked_scope:'1-220',total_comments:220,related_to_question:true,comments:[{comment_no:11,summary:'反論',direct_url:'https://girlschannel.net/comment/1002/11/',plus:null,minus:null}]}
 ],
 draft_status:'ready',
 draft_revision:'r1',
 content_lock:{locked:true,draft_revision:'r1',locked_at:now},
 final_review:{status:'passed',checked_revision:'r1',unresolved_items:[]},
 missing_evidence:[],
 page_count_reason:'内容上2ページ',
 adaptive_design:{mode:'adaptive',decision_basis:'数字比較を主役にする',visual_language:'white/neutral/data-first'},
 draft_slides:[1,2].map(page=>({
  page,headline:'H'+page,body:'B'+page,source_refs:['s1'],
  page_contract:{
   reader_question:'Q'+page,answer:'A'+page,visual_subject:'V'+page,visual_type:'comparison',
   evidence:{kind:'primary'},calculation:null,required_assets:[],display_copy:'C'+page,
   source_refs:['s1'],source_type:'primary',status:'ready'
  }
 })),
 draft_sources:[{id:'s1',label:'公式',url:'https://example.com',claim:'claim',checked_at:now,source_type:'primary'}],
 post_title:'title',caption:'cap',screenshot_requests:[],screenshot_decisions:{}
};

assert.equal(A.lane(base),'money');
assert.equal(A.moneyChatScope(base),true);
assert.equal(A.adaptive(base),true);
assert.equal(A.communityRequired(base),true);
assert.deepEqual(A.strictCommunityIssues(base),[]);
assert.deepEqual(A.pageContractIssues(base),[]);
assert.deepEqual(A.sourceIssues(base),[]);
assert.deepEqual(A.lockIssues(base),[]);
assert.deepEqual(A.finalReviewIssues(base),[]);
assert.deepEqual(A.designIssues(base),[]);
const q=A.quality({payload:base,title:'title'},()=>({ready:false,issues:['ページ別原稿が不足']}));
assert.equal(q.ready,true);

const channelOnly=structuredClone(base);
delete channelOnly.execution_source;
assert.equal(A.moneyChatScope(channelOnly),true);

const stale=structuredClone(base);
stale.research_threads[0].published_at='2026-09-01T00:00:00Z';
assert.match(A.strictCommunityIssues(stale).join(' '),/直近14日外/);

const low=structuredClone(base);
low.research_threads[1].total_comments=199;
assert.match(A.strictCommunityIssues(low).join(' '),/200件未満/);

const one=structuredClone(base);
one.research_threads=one.research_threads.slice(0,1);
assert.match(A.strictCommunityIssues(one).join(' '),/別トピック2本/);

const badCommentUrl=structuredClone(base);
badCommentUrl.research_threads[0].comments[0].direct_url='https://girlschannel.net/comment/9999/10/';
assert.match(A.strictCommunityIssues(badCommentUrl).join(' '),/別トピックを指している/);

const wrongCommentNo=structuredClone(base);
wrongCommentNo.research_threads[0].comments[0].direct_url='https://girlschannel.net/comment/1001/99/';
assert.match(A.strictCommunityIssues(wrongCommentNo).join(' '),/別コメント番号を指している/);

const missingReaction=structuredClone(base);
delete missingReaction.research_threads[0].comments[0].plus;
assert.match(A.strictCommunityIssues(missingReaction).join(' '),/plusは未取得ならnull/);

const expanded=structuredClone(base);
expanded.community_research.status='expanded';
expanded.community_research.expanded=true;
assert.match(A.strictCommunityIssues(expanded).join(' '),/strict合格ではない|拡張調査/);

const generatedEvidence=structuredClone(base);
generatedEvidence.draft_slides[0].page_contract.required_assets=[
 {asset_type:'generated_photorealistic_image',is_evidence:true}
];
assert.match(A.pageContractIssues(generatedEvidence).join(' '),/生成・説明用素材を実物証拠/);

const badCalc=structuredClone(base);
badCalc.draft_slides[0].page_contract.calculation={inputs:{loan:40000000},result:123};
assert.match(A.pageContractIssues(badCalc).join(' '),/計算条件が不足/);

const lockMismatch=structuredClone(base);
lockMismatch.draft_revision='r2';
assert.match(A.lockIssues(lockMismatch).join(' '),/LOCK後に原稿版が変更/);

const reviewMismatch=structuredClone(base);
reviewMismatch.final_review.checked_revision='r0';
assert.match(A.finalReviewIssues(reviewMismatch).join(' '),/最終照合後に原稿版が変更/);

const unresolved=structuredClone(base);
unresolved.final_review.unresolved_items=['check'];
assert.match(A.finalReviewIssues(unresolved).join(' '),/未解決事項/);

const quote=structuredClone(base);
quote.draft_sources.push({id:'ugc1',label:'GirlsChannel comment',url:'https://girlschannel.net/comment/1001/10/',claim:'体験談',checked_at:now,source_type:'community'});
quote.draft_slides[0].page_contract.direct_quote=true;
quote.draft_slides[0].page_contract.source_refs=['s1','ugc1'];
quote.draft_slides[0].source_refs=['s1','ugc1'];
quote.draft_slides[0].page_contract.quote_source={source_ref:'ugc1',quote_text:'実際の引用',comment_no:10,public_attribution:'GirlsChannel コメントNo.10'};
quote.draft_slides[0].page_contract.display_copy='「実際の引用」';
assert.deepEqual(A.pageContractIssues(quote),[]);
assert.deepEqual(A.sourceIssues(quote),[]);
const quoteMissingSource=structuredClone(quote);
quoteMissingSource.draft_slides[0].page_contract.quote_source.source_ref='missing';
assert.match(A.sourceIssues(quoteMissingSource).join(' '),/直接引用のsource_refがdraft_sourcesに存在しない/);
const quoteMissingCopy=structuredClone(quote);
quoteMissingCopy.draft_slides[0].page_contract.display_copy='引用ではない文';
assert.match(A.sourceIssues(quoteMissingCopy).join(' '),/直接引用文がdisplay_copyに含まれていない/);
const quoteHandoff=A.buildHandoff({payload:quote,title:'title'});
assert.match(quoteHandoff,/GirlsChannel コメントNo\.10/);
assert.match(quoteHandoff,/girlschannel\.net\/topics\/1001/);

const old={draft_status:'ready'};
assert.equal(A.adaptive(old),false);
assert.deepEqual(A.preflightIssues(old,()=>['デザインを選ぶ']),['デザインを選ぶ']);

const work=structuredClone(base);
work.adaptive_scope='';
work.execution_channel='work';
work.runner_key='work-money-v1';
assert.equal(A.moneyChatScope(work),false);
assert.equal(A.adaptive(work),false);
assert.equal(A.communityRequired(work),false);
assert.deepEqual(A.preflightIssues(work,()=>['work-base-rule']),['work-base-rule']);

for(const name of ['house','career']){
 const p=structuredClone(base);
 p.adaptive_scope=name+'_chat';
 p.runner_key=name==='house'?'chat-house-v1':'chat-career-v1';
 p.source_task_id=A.TASK_IDS[name];
 assert.equal(A.lane(p),name);
 assert.equal(A.moneyChatScope(p),false);
 assert.equal(A.adaptive(p),false);
 assert.equal(A.communityRequired(p),false);
}

const overseas=structuredClone(base);
overseas.adaptive_scope='overseas_chat';
overseas.runner_key='chat-overseas-v1';
overseas.source_task_id=A.TASK_IDS.overseas;
overseas.community_research={required:false};
overseas.research_threads=[];
assert.equal(A.lane(overseas),'overseas');
assert.equal(A.moneyChatScope(overseas),false);
assert.equal(A.adaptive(overseas),false);
assert.deepEqual(A.strictCommunityIssues(overseas),[]);

const handoff=A.buildHandoff({payload:base,title:'title'});
assert.match(handoff,/LOCK済み/);
assert.match(handoff,/固定された3配色/);
assert.match(handoff,/layout_overflow/);
assert.match(handoff,/制作内部情報｜画像内に文字として載せない/);
assert.doesNotMatch(handoff,/girlschannel/);

console.log('v226 money Chat adaptive carousel tests passed');
