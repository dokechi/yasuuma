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

const career=structuredClone(base);
career.adaptive_scope='career_chat';
career.runner_key='chat-career-v1';
career.source_task_id=A.TASK_IDS.career;
assert.equal(A.lane(career),'career');
assert.equal(A.moneyChatScope(career),false);
assert.equal(A.houseChatScope(career),false);
assert.equal(A.adaptive(career),false);
assert.equal(A.communityRequired(career),false);

const house=structuredClone(base);
house.adaptive_scope='house_chat';
house.runner_key='chat-house-v1';
house.source_task_id=A.HOUSE_CHAT_TASK_ID;
house.origin_task_id=A.TASK_IDS.house;
house.generation_version=A.HOUSE_VERSION;
house.research_version=A.HOUSE_RESEARCH_VERSION;
house.design_version=A.HOUSE_DESIGN_VERSION;
house.category='house_living';
house.content_type='house_post_candidate';
house.editor_contract_version='chat-editorial-v1-20260918';
house.research_threads[0].id='A';
house.research_threads[1].id='B';
house.research_threads.forEach(thread=>thread.comments.forEach(comment=>{comment.reply_to=null;}));
house.question_lineage={selected_question:'どちらを優先する？',answer_target:'図面と生活動線で判断'};
house.final_review.checked_at=now;
house.production_spec={size:'1080×1440',ratio:'3:4'};
house.image_ready=true;
house.asset_status='ready_for_image_generation';
house.synthesis={a_need:'Aの困りごと',b_need:'Bの疑問',connection:'同じ生活動線',derived_question:'どちらを優先する？',derivation_note:'2本を統合して導出'};
house.draft_slides.forEach(slide=>{slide.page_contract.primary_evidence_required=true;});
house.draft_slides[1].page_contract.display_copy='洗面脱衣の有効幅を測る。採用可否を決める。';
house.page_reflections=house.draft_slides.map((slide,index)=>({
 page:slide.page,origin:index===0?'synthesis':'primary_research',
 thread_refs:index===0?[{thread_id:'A',comment_no:10},{thread_id:'B',comment_no:11}]:[],
 extracted:'困りごとまたは一次資料から抽出',
 transformed:'公開用の判断材料へ変換',
 primary_source_refs:['s1'],
 extension:null,
 note:''
}));
house.executable_action={what:'測る',where:'洗面脱衣',check:'有効幅',decision:'採用可否',barrier:'変更不能なら',fallback:'別配置を比較',public_page:2,public_copy:'洗面脱衣の有効幅を測る。採用可否を決める。'};
house.editorial_review={
 version:'chat-editorial-v1-20260918',status:'passed',checked_at:now,unresolved_items:[],
 checks:{two_threads:'passed',source_trace:'passed',public_separation:'passed',primary_alignment:'passed',practical_options:'passed',executable_action:'passed',cross_page_consistency:'passed',voice:'passed'}
};
house.content_lock={locked:true,draft_revision:'r1',locked_at:now,snapshot:A.lockSnapshot(house)};
house.final_review.reviewed_snapshot=structuredClone(house.content_lock.snapshot);

assert.equal(A.lane(house),'house');
assert.equal(A.moneyChatScope(house),false);
assert.equal(A.houseChatScope(house),true);
assert.equal(A.adaptive(house),true);
assert.equal(A.communityRequired(house),true);
assert.deepEqual(A.strictCommunityIssues(house),[]);
assert.deepEqual(A.pageContractIssues(house),[]);
assert.deepEqual(A.sourceIssues(house),[]);
assert.deepEqual(A.publicOutputIssues(house),[]);
assert.deepEqual(A.lockIssues(house),[]);
assert.deepEqual(A.finalReviewIssues(house),[]);
assert.deepEqual(A.designIssues(house),[]);
assert.deepEqual(A.houseSpecificIssues(house),[]);
assert.equal(A.quality({payload:house,title:'house'},()=>({ready:true,issues:[]})).ready,true);
const houseHandoff=A.buildHandoff({payload:house,title:'house'});
assert.match(houseHandoff,/1080×1440/);
assert.match(houseHandoff,/現在ページ／総ページ数/);
assert.match(houseHandoff,/家Chatでは需要調査コメントを公開面へ直接引用しない/);

const houseBackgroundSynthesis=structuredClone(house);
houseBackgroundSynthesis.research_threads.push(
 {id:'oldA',url:'https://girlschannel.net/topics/2001/',title:'oldA',published_at:'2026-08-01T00:00:00Z',checked_at:now,checked_scope:'1-300',total_comments:300,related_to_question:true,comments:[{comment_no:21,summary:'古い補助A',direct_url:'https://girlschannel.net/comment/2001/21/',plus:null,minus:null,reply_to:null}]},
 {id:'oldB',url:'https://girlschannel.net/topics/2002/',title:'oldB',published_at:'2026-08-02T00:00:00Z',checked_at:now,checked_scope:'1-300',total_comments:300,related_to_question:true,comments:[{comment_no:22,summary:'古い補助B',direct_url:'https://girlschannel.net/comment/2002/22/',plus:null,minus:null,reply_to:null}]}
);
houseBackgroundSynthesis.page_reflections[0].thread_refs=[{thread_id:'oldA',comment_no:21},{thread_id:'oldB',comment_no:22}];
assert.match(A.houseSpecificIssues(houseBackgroundSynthesis).join(' '),/strict14日適格の別トピック2本/);

const houseDuplicateTopicSynthesis=structuredClone(house);
houseDuplicateTopicSynthesis.research_threads.push({
 id:'A2',url:'https://girlschannel.net/topics/1001/',title:'A duplicate',published_at:'2026-09-20T00:00:00Z',checked_at:now,checked_scope:'1-250',total_comments:250,related_to_question:true,
 comments:[{comment_no:12,summary:'同じトピックの別コメント',direct_url:'https://girlschannel.net/comment/1001/12/',plus:null,minus:null,reply_to:null}]
});
houseDuplicateTopicSynthesis.page_reflections[0].thread_refs=[{thread_id:'A',comment_no:10},{thread_id:'A2',comment_no:12}];
assert.match(A.houseSpecificIssues(houseDuplicateTopicSynthesis).join(' '),/strict14日適格の別トピック2本/);

const houseStrictThreadBadComment=structuredClone(house);
houseStrictThreadBadComment.research_threads[0].comments.push({comment_no:13,summary:'URL不整合',direct_url:'https://girlschannel.net/comment/9999/13/',plus:null,minus:null,reply_to:null});
assert.equal(A.strictThreadEligible(houseStrictThreadBadComment,houseStrictThreadBadComment.research_threads[0]),false);

const houseReviewSnapshotMissing=structuredClone(house);
delete houseReviewSnapshotMissing.final_review.reviewed_snapshot;
assert.match(A.finalReviewIssues(houseReviewSnapshotMissing).join(' '),/reviewed_snapshotが未保存/);

const houseRelockedWithoutReview=structuredClone(house);
houseRelockedWithoutReview.draft_slides[0].page_contract.display_copy='LOCK後に書き換えて再LOCK';
houseRelockedWithoutReview.content_lock.snapshot=A.lockSnapshot(houseRelockedWithoutReview);
assert.match(A.finalReviewIssues(houseRelockedWithoutReview).join(' '),/現在のLOCK snapshotを照合していない/);

const houseReviewBeforeLock=structuredClone(house);
houseReviewBeforeLock.content_lock.locked_at='2026-09-23T00:30:00Z';
houseReviewBeforeLock.final_review.checked_at='2026-09-23T00:00:00Z';
assert.match(A.finalReviewIssues(houseReviewBeforeLock).join(' '),/原稿LOCKより前/);

const houseTinyAction=structuredClone(house);
houseTinyAction.executable_action.public_copy='測る';
houseTinyAction.draft_slides[1].page_contract.display_copy='測る';
assert.match(A.houseSpecificIssues(houseTinyAction).join(' '),/短すぎて具体行動になっていない|whereの内容が反映されていない/);

const houseNoThreadId=structuredClone(house);
delete houseNoThreadId.research_threads[0].id;
assert.match(A.houseSpecificIssues(houseNoThreadId).join(' '),/research_threads\[1\]\.idが未保存/);

const houseNoReplyTo=structuredClone(house);
delete houseNoReplyTo.research_threads[0].comments[0].reply_to;
assert.match(A.houseSpecificIssues(houseNoReplyTo).join(' '),/reply_toキーが未保存/);

const houseBadThreadRef=structuredClone(house);
houseBadThreadRef.page_reflections[0].thread_refs=[{thread_id:'ghost',comment_no:999}];
assert.match(A.houseSpecificIssues(houseBadThreadRef).join(' '),/実在research_threadを指していない/);

const houseBadCommentRef=structuredClone(house);
houseBadCommentRef.page_reflections[0].thread_refs=[{thread_id:'A',comment_no:999},{thread_id:'B',comment_no:11}];
assert.match(A.houseSpecificIssues(houseBadCommentRef).join(' '),/実在コメントを指していない/);

const houseBadPrimaryRef=structuredClone(house);
houseBadPrimaryRef.page_reflections[0].primary_source_refs=['ghost-source'];
assert.match(A.houseSpecificIssues(houseBadPrimaryRef).join(' '),/draft_sourcesに存在しない/);

const houseQuestionMismatch=structuredClone(house);
houseQuestionMismatch.question_lineage.selected_question='コンセントは何個必要？';
assert.match(A.houseSpecificIssues(houseQuestionMismatch).join(' '),/derived_questionとquestion_lineage\.selected_questionが一致しない/);

const houseActionNotPublic=structuredClone(house);
houseActionNotPublic.executable_action.public_copy='玄関幅を測る';
assert.match(A.houseSpecificIssues(houseActionNotPublic).join(' '),/public_copyが指定ページのdisplay_copyに含まれていない/);

const houseActionNotFinal=structuredClone(house);
houseActionNotFinal.executable_action.public_page=1;
houseActionNotFinal.executable_action.public_copy='C1に書いた行動';
assert.match(A.houseSpecificIssues(houseActionNotFinal).join(' '),/public_pageは最終ページ/);

const houseNoFinalCheckedAt=structuredClone(house);
delete houseNoFinalCheckedAt.final_review.checked_at;
assert.match(A.finalReviewIssues(houseNoFinalCheckedAt).join(' '),/final_review\.checked_atが未保存/);

const houseSynthesisWithoutPrimary=structuredClone(house);
houseSynthesisWithoutPrimary.draft_slides[0].source_refs=[];
houseSynthesisWithoutPrimary.draft_slides[0].page_contract.source_refs=[];
houseSynthesisWithoutPrimary.draft_slides[0].page_contract.primary_evidence_required=false;
houseSynthesisWithoutPrimary.page_reflections[0].primary_source_refs=[];
houseSynthesisWithoutPrimary.page_reflections[0].note='このページは需要の統合だけで一次情報を要しない';
houseSynthesisWithoutPrimary.content_lock.snapshot=A.lockSnapshot(houseSynthesisWithoutPrimary);
houseSynthesisWithoutPrimary.final_review.reviewed_snapshot=structuredClone(houseSynthesisWithoutPrimary.content_lock.snapshot);
assert.deepEqual(A.sourceIssues(houseSynthesisWithoutPrimary),[]);
assert.deepEqual(A.houseSpecificIssues(houseSynthesisWithoutPrimary),[]);
assert.deepEqual(A.finalReviewIssues(houseSynthesisWithoutPrimary),[]);
assert.equal(A.quality({payload:houseSynthesisWithoutPrimary,title:'house'},()=>({ready:true,issues:[]})).ready,true);

const housePrimaryResearchWithoutPrimary=structuredClone(house);
housePrimaryResearchWithoutPrimary.draft_slides[1].page_contract.primary_evidence_required=false;
housePrimaryResearchWithoutPrimary.page_reflections[1].primary_source_refs=[];
housePrimaryResearchWithoutPrimary.page_reflections[1].note='誤設定';
assert.match(A.houseSpecificIssues(housePrimaryResearchWithoutPrimary).join(' '),/primary_researchなのでprimary_evidence_required=true/);

const houseRequiredShotPending=structuredClone(house);
houseRequiredShotPending.screenshot_requests=[{id:'shot1',required:true,label:'メーカー寸法表',url:'https://example.com/official',capture_range:'寸法表',purpose:'寸法根拠',slide_no:2,acquisition_status:'pending',acquisition_ref:null}];
houseRequiredShotPending.screenshot_decisions={shot1:'assistant'};
houseRequiredShotPending.image_ready=false;
houseRequiredShotPending.asset_status='awaiting_screenshot';
assert.match(A.screenshotIssues(houseRequiredShotPending).join(' '),/未取得/);
assert.throws(()=>A.buildHandoff({payload:houseRequiredShotPending,title:'house'}),/画像化保留/);

const houseRequiredShotAcquired=structuredClone(house);
houseRequiredShotAcquired.screenshot_requests=[{id:'shot1',required:true,label:'メーカー寸法表',url:'https://example.com/official',capture_range:'寸法表',purpose:'寸法根拠',slide_no:2,acquisition_status:'acquired',acquisition_ref:'asset:shot1'}];
houseRequiredShotAcquired.screenshot_decisions={shot1:'assistant'};
houseRequiredShotAcquired.image_ready=true;
houseRequiredShotAcquired.asset_status='ready_for_image_generation';
assert.deepEqual(A.screenshotIssues(houseRequiredShotAcquired),[]);
assert.doesNotThrow(()=>A.buildHandoff({payload:houseRequiredShotAcquired,title:'house'}));

const housePendingWrongState=structuredClone(houseRequiredShotPending);
housePendingWrongState.image_ready=true;
housePendingWrongState.asset_status='ready_for_image_generation';
assert.match(A.screenshotIssues(housePendingWrongState).join(' '),/image_ready=false|asset_status=awaiting_screenshot/);

const houseReadyWrongState=structuredClone(houseRequiredShotAcquired);
houseReadyWrongState.image_ready=false;
houseReadyWrongState.asset_status='awaiting_screenshot';
assert.match(A.screenshotIssues(houseReadyWrongState).join(' '),/image_ready=true|asset_status=ready_for_image_generation/);

const houseNoSynthesis=structuredClone(house);
delete houseNoSynthesis.synthesis;
assert.match(A.houseSpecificIssues(houseNoSynthesis).join(' '),/synthesis\.a_need/);

const houseMissingReflection=structuredClone(house);
houseMissingReflection.page_reflections=houseMissingReflection.page_reflections.slice(0,1);
assert.match(A.houseSpecificIssues(houseMissingReflection).join(' '),/page_reflectionsが全ページ分/);

const houseNoAction=structuredClone(house);
delete houseNoAction.executable_action.fallback;
assert.match(A.houseSpecificIssues(houseNoAction).join(' '),/executable_action\.fallback/);

const houseReviewFail=structuredClone(house);
houseReviewFail.editorial_review.checks.cross_page_consistency='pending';
assert.match(A.houseSpecificIssues(houseReviewFail).join(' '),/cross_page_consistencyがpassedではない/);

const houseWrongSize=structuredClone(house);
houseWrongSize.production_spec.size='1080×1350';
assert.match(A.houseSpecificIssues(houseWrongSize).join(' '),/1080×1440/);

const houseQuote=structuredClone(house);
houseQuote.draft_slides[0].page_contract.direct_quote=true;
assert.match(A.houseSpecificIssues(houseQuote).join(' '),/直接引用しない/);

const houseWork=structuredClone(house);
houseWork.execution_source='work';
houseWork.execution_channel='work';
houseWork.adaptive_scope='';
houseWork.runner_key='work-house-v1';
houseWork.source_task_id=A.TASK_IDS.house;
assert.equal(A.houseChatScope(houseWork),false);
assert.equal(A.adaptive(houseWork),false);

const oldHouse={
 execution_channel:'chat',execution_source:'chat',source_task_id:A.HOUSE_CHAT_TASK_ID,
 category:'house_living',content_type:'house_post_candidate',draft_status:'ready'
};
assert.equal(A.adaptive(oldHouse),false);

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

console.log('v226 money + house Chat hardened quality-gate tests passed');
