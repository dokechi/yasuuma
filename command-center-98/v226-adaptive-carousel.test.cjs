const assert=require('node:assert/strict');
const A=require('./v226-adaptive-carousel.js');
const now='2026-09-23T00:00:00Z';

const base={
 execution_source:'chat',
 execution_channel:'chat',
 adaptive_scope:'money_chat',
 runner_key:'chat-money-v1',
 source_task_id:A.MONEY_CHAT_TASK_ID,
 origin_task_id:A.TASK_IDS.money,
 generation_version:A.LEGACY_MONEY_VERSION,
 design_version:A.LEGACY_MONEY_DESIGN_VERSION,
 research_version:A.LEGACY_MONEY_RESEARCH_VERSION,
 research_started_at:now,
 category:'fp_psychology',
 content_type:'fp_post_candidate',
 community_research:{required:true,status:'strict',window_days:14,min_topics:2,min_comments_per_topic:200},
 research_threads:[
  {url:'https://girlschannel.net/topics/1001/',title:'A',published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'1-250',total_comments:250,related_to_question:true,comments:[{comment_no:10,summary:'疑問',direct_url:'https://girlschannel.net/comment/1001/10/',plus:null,minus:null}]},
  {url:'https://girlschannel.net/topics/1002/',title:'B',published_at:'2026-09-15T00:00:00Z',checked_at:now,checked_scope:'1-220',total_comments:220,related_to_question:true,comments:[{comment_no:11,summary:'反論',direct_url:'https://girlschannel.net/comment/1002/11/',plus:null,minus:null}]}
 ],
 draft_status:'ready',
 draft_revision:'r1',
 final_review:{status:'passed',checked_revision:'r1',unresolved_items:[]},
 missing_evidence:[],
 page_count_reason:'内容上2ページ',
 adaptive_design:{mode:'adaptive',decision_basis:'数字比較を主役にする',visual_language:'white/neutral/data-first'},
 question_lineage:{selected_question:'Q',answer_target:'A'},
 premise_checks:[],
 source_url:'https://girlschannel.net/topics/1001/',
 source_checked_at:now,
 source_comments:[{comment_no:10,summary:'疑問',direct_url:'https://girlschannel.net/comment/1001/10/',plus:null,minus:null}],
 source_anchor_comment_nos:[10],
 demand_evidence:{verdict:'strong',question_demand:'需要あり',evidence_comment_nos:[10]},
 draft_slides:[1,2].map(page=>({
  page,headline:'H'+page,body:'B'+page,source_refs:['s1'],
  page_contract:{
   reader_question:'Q'+page,answer:'A'+page,visual_subject:'V'+page,visual_type:'comparison',
   evidence:{kind:'primary'},calculation_required:page===1,
   calculation:page===1?{inputs:{loan:40000000},formula:'example',unit:'円',result:123,rounding:'四捨五入'}:null,
   required_assets:[],display_copy:'C'+page,
   source_refs:['s1'],source_type:'primary',status:'ready'
  }
 })),
 draft_sources:[{id:'s1',label:'金融庁',url:'https://www.fsa.go.jp/',claim:'claim',checked_at:now,source_type:'primary'}],
 post_title:'title',caption:'cap',screenshot_requests:[],screenshot_decisions:{}
};
base.content_lock={locked:true,draft_revision:'r1',locked_at:now,snapshot:A.lockSnapshot(base)};

assert.equal(A.lane(base),'money');
assert.equal(A.moneyChatScope(base),true);
assert.equal(A.adaptive(base),true);
assert.equal(A.communityRequired(base),true);
assert.deepEqual(A.strictCommunityIssues(base),[]);
assert.deepEqual(A.pageContractIssues(base),[]);
assert.deepEqual(A.sourceIssues(base),[]);
assert.deepEqual(A.publicOutputIssues(base),[]);
assert.deepEqual(A.lockIssues(base),[]);
assert.deepEqual(A.finalReviewIssues(base),[]);
assert.deepEqual(A.designIssues(base),[]);
const q=A.quality({payload:base,title:'title'},()=>({ready:false,issues:['ページ別原稿が不足']}));
assert.equal(q.ready,true);

const noResearchStarted=structuredClone(base);
delete noResearchStarted.research_started_at;
noResearchStarted.content_lock.snapshot=A.lockSnapshot(noResearchStarted);
assert.match(A.strictCommunityIssues(noResearchStarted).join(' '),/research_started_at/);

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

const missingEvidenceFlag=structuredClone(base);
missingEvidenceFlag.draft_slides[0].page_contract.required_assets=[
 {asset_type:'official_photo'}
];
assert.match(A.pageContractIssues(missingEvidenceFlag).join(' '),/is_evidence=true\/false/);

const missingCalcFlag=structuredClone(base);
delete missingCalcFlag.draft_slides[0].page_contract.calculation_required;
assert.match(A.pageContractIssues(missingCalcFlag).join(' '),/calculation_required=true\/false/);

const requiredCalcMissing=structuredClone(base);
requiredCalcMissing.draft_slides[0].page_contract.calculation_required=true;
requiredCalcMissing.draft_slides[0].page_contract.calculation=null;
assert.match(A.pageContractIssues(requiredCalcMissing).join(' '),/計算必須なのにcalculationが未保存/);

const secondaryOnly=structuredClone(base);
secondaryOnly.draft_sources=[{id:'s1',label:'ニュース',url:'https://example.com/news',claim:'claim',checked_at:now,source_type:'news'}];
assert.match(A.sourceIssues(secondaryOnly).join(' '),/一次情報source_typeの出典が1件もない/);

const pageWithoutPrimary=structuredClone(base);
pageWithoutPrimary.draft_sources.push({id:'news1',label:'ニュース',url:'https://example.com/news',claim:'claim',checked_at:now,source_type:'news'});
pageWithoutPrimary.draft_slides[0].source_refs=['news1'];
pageWithoutPrimary.draft_slides[0].page_contract.source_refs=['news1'];
assert.match(A.sourceIssues(pageWithoutPrimary).join(' '),/1ページ目: 一次情報のsource_refがない/);

const lockMismatch=structuredClone(base);
lockMismatch.draft_revision='r2';
assert.match(A.lockIssues(lockMismatch).join(' '),/LOCK後に原稿版が変更/);

const silentChange=structuredClone(base);
silentChange.draft_slides[0].page_contract.display_copy='LOCK後に書き換え';
assert.match(A.lockIssues(silentChange).join(' '),/LOCK後に原稿内容が変更/);

const noSnapshot=structuredClone(base);
delete noSnapshot.content_lock.snapshot;
assert.match(A.lockIssues(noSnapshot).join(' '),/content snapshotが未保存/);

const reviewMismatch=structuredClone(base);
reviewMismatch.final_review.checked_revision='r0';
assert.match(A.finalReviewIssues(reviewMismatch).join(' '),/最終照合後に原稿版が変更/);

const unresolved=structuredClone(base);
unresolved.final_review.unresolved_items=['check'];
assert.match(A.finalReviewIssues(unresolved).join(' '),/未解決事項/);

const publicLeak=structuredClone(base);
publicLeak.draft_slides[0].page_contract.display_copy='ガルちゃんで見た話です';
assert.match(A.publicOutputIssues(publicLeak).join(' '),/内部需要調査元が混入/);

const quote=structuredClone(base);
quote.draft_sources.push({id:'ugc1',label:'GirlsChannel comment',url:'https://girlschannel.net/comment/1001/10/',claim:'体験談',checked_at:now,source_type:'community'});
quote.draft_slides[0].page_contract.direct_quote=true;
quote.draft_slides[0].page_contract.visual_type='quote';
quote.draft_slides[0].page_contract.source_refs=['ugc1'];
quote.draft_slides[0].source_refs=['ugc1'];
quote.draft_slides[0].page_contract.quote_source={source_ref:'ugc1',quote_text:'実際の引用',comment_no:10,public_attribution:'GirlsChannel コメントNo.10'};
quote.draft_slides[0].page_contract.display_copy='「実際の引用」';
quote.content_lock.snapshot=A.lockSnapshot(quote);
assert.deepEqual(A.pageContractIssues(quote),[]);
assert.deepEqual(A.sourceIssues(quote),[]);
assert.deepEqual(A.publicOutputIssues(quote),[]);
assert.deepEqual(A.lockIssues(quote),[]);
const quoteHandoff=A.buildHandoff({payload:quote,title:'title'});
assert.match(quoteHandoff,/GirlsChannel コメントNo\.10/);
assert.match(quoteHandoff,/girlschannel\.net\/comment\/1001\/10/);

const quoteMissingSource=structuredClone(quote);
quoteMissingSource.draft_slides[0].page_contract.quote_source.source_ref='missing';
assert.match(A.sourceIssues(quoteMissingSource).join(' '),/直接引用のsource_refがdraft_sourcesに存在しない/);

const quoteMissingCopy=structuredClone(quote);
quoteMissingCopy.draft_slides[0].page_contract.display_copy='引用ではない文';
assert.match(A.sourceIssues(quoteMissingCopy).join(' '),/直接引用文がdisplay_copyに含まれていない/);

const old={draft_status:'ready'};
assert.equal(A.adaptive(old),false);
assert.deepEqual(A.preflightIssues(old,()=>['デザインを選ぶ']),['デザインを選ぶ']);

const work=structuredClone(base);
work.adaptive_scope='';
work.execution_source='work';
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

console.log('v226 money Chat hardened quality-gate tests passed');
