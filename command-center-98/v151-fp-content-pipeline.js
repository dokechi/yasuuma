(()=>{
  if(typeof cardHtml!=='function'||typeof renderList!=='function')return;

  const TYPE='fp_content';
  const API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-workflow-api';
  const SIGNAL_API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-retro-api';
  const states=new Map();
  const ensuring=new Set();
  let topItems=[];
  let topLoading=false;
  let topLoadedAt=0;

  const escFp=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const list=value=>Array.isArray(value)?value:[];
  const text=value=>String(value??'').trim();
  const fp=item=>item?.payload?.content_type==='fp_post_candidate'||['fp_psychology','fp_reaction'].includes(item?.payload?.category);
  const officialSources=payload=>{
    const seen=new Set();
    return [...list(payload.draft_sources),...list(payload.official_sources),...list(payload.official_urls)].filter(source=>{
      const key=sourceUrl(source)||text(source);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    });
  };
  const sourceUrl=source=>typeof source==='string'?source:source?.url;
  const sourceLabel=(source,index=0)=>typeof source==='string'?`一次情報 ${index+1}`:(source?.label||source?.title||`一次情報 ${index+1}`);
  const draftTitle=(item,payload=item.payload||{})=>text(payload.post_title||payload.draft_title||payload.draft_cover||item.title);
  const draftCaption=payload=>text(payload.caption||payload.draft_caption||payload.post_caption);
  const hasUnknownPremise=payload=>list(payload.premise_checks).some(row=>text(row?.status).toLowerCase()==='unknown');
  const isGirlsChannel=payload=>payload.discovery_source==='girlschannel'||/girlschannel\.net/i.test(text(payload.source_url));
  const DESIGN_DIRECTIONS={
    friendly:{
      label:'個室入院の実績デザイン',short:'TikTok初速が直近最速',
      description:'白地の広い余白、太い黒文字、落ち着いた青緑、素朴な黒線人物。問いと数字を大きく見せる。',
      referenceLabel:'個室入院投稿・完成見本',
      referenceUrls:Array.from({length:7},(_,index)=>`https://dokechi.github.io/yasuuma/command-center-98/assets/fp-private-room-style/${String(index+1).padStart(2,'0')}.webp`)
    },
    editorial:{label:'静かな編集記事型',short:'サイボウズ寄り',description:'装飾を抑え、余白と小さな観察文で読ませる。写真や資料は必要なページだけ使う。'},
    notebook:{label:'調査ノート型',short:'根拠の実物を見せる',description:'公式資料のスクショ、囲み、短い注釈を活かす。調べた跡が見える設計。'}
  };
  const demand=payload=>payload.demand_evidence&&typeof payload.demand_evidence==='object'?payload.demand_evidence:{};
  const demandVerdict=payload=>text(demand(payload).verdict).toLowerCase();
  const demandReady=payload=>{
    const d=demand(payload);
    return demandVerdict(payload)==='strong'&&text(d.question_demand||d.question_demand_summary||d.reason)&&list(d.evidence_comment_nos||payload.source_anchor_comment_nos).length>0;
  };
  const screenshotDecision=(payload,row)=>text(payload.screenshot_decisions?.[row?.id]);
  const preflightIssues=payload=>{
    const issues=[];
    if(!DESIGN_DIRECTIONS[text(payload.design_direction)])issues.push('デザインを選ぶ');
    list(payload.screenshot_requests).forEach(row=>{
      const value=screenshotDecision(payload,row);
      const allowed=['assistant','user'];
      if(!allowed.includes(value))issues.push(`${row?.label||'スクショ'}の扱いを決める`);
    });
    return issues;
  };
  const preflightReady=payload=>preflightIssues(payload).length===0;

  const packageQuality=item=>{
    const payload=item.payload||{};
    const issues=[];
    if(payload.draft_status!=='ready')issues.push('完成原稿が未確定');
    if(list(payload.draft_slides).length<5)issues.push('ページ別原稿が不足');
    if(!text(payload.source_url||item.url))issues.push('元記事の直リンクが未保存');
    if(!text(payload.source_checked_at))issues.push('元記事の確認日時が未保存');
    if(!officialSources(payload).some(source=>text(sourceUrl(source))))issues.push('一次情報の直リンクが未保存');
    if(!text(payload.question_lineage?.selected_question)||!text(payload.question_lineage?.answer_target))issues.push('中心疑問の追跡が未保存');
    if(isGirlsChannel(payload)&&!list(payload.source_comments).length)issues.push('採用コメントが未保存');
    if(isGirlsChannel(payload)&&!list(payload.source_anchor_comment_nos).length)issues.push('疑問の根拠コメント番号が未保存');
    if(isGirlsChannel(payload)&&!demandReady(payload))issues.push('中心疑問そのものの需要根拠が未保存');
    if(hasUnknownPremise(payload))issues.push('未確認の重要前提が残っている');
    if(!draftTitle(item,payload))issues.push('投稿タイトルが未保存');
    if(!draftCaption(payload))issues.push('キャプションが未保存');
    return {ready:issues.length===0,issues};
  };

  const defaultState=item=>({
    entityId:String(item.id),discovered:'pass',judgment:item.reviewState==='accepted'?'pass':'pending',
    verification:packageQuality(item).ready?'pass':'pending',execution:item.payload?.draft_status==='ready'?'ready':'pending',audit:'pending'
  });
  const state=item=>states.get(String(item.id))||defaultState(item);
  const request=async options=>{
    const response=await fetch(API,{cache:'no-store',...options});
    if(response.status===401){authExpired();throw Error('認証期限切れ')}
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||('HTTP '+response.status));
    return data;
  };
  const signalRequest=async body=>{
    const response=await fetch(SIGNAL_API,{method:'PATCH',cache:'no-store',headers:headers(),body:JSON.stringify(body)});
    if(response.status===401){authExpired();throw Error('認証期限切れ')}
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||('HTTP '+response.status));
    return data;
  };
  const headers=()=>({...authHeaders(),'Content-Type':'application/json'});
  const replaceCachedItem=fresh=>{
    if(!fresh)return;
    const replace=rows=>{const index=rows.findIndex(row=>String(row.id)===String(fresh.id));if(index>=0)rows[index]={...rows[index],...fresh}};
    replace(app.items||[]);replace(topItems);
  };
  const put=rows=>list(rows).forEach(row=>states.set(String(row.entityId),row));
  const ensure=async items=>{
    const fresh=items.filter(item=>fp(item)&&!ensuring.has(String(item.id)));
    if(!fresh.length)return;
    fresh.forEach(item=>ensuring.add(String(item.id)));
    try{
      const data=await request({
        method:'POST',headers:headers(),
        body:JSON.stringify({action:'ensure',entityType:TYPE,items:fresh.map(item=>({
          entityId:String(item.id),judgmentStatus:item.reviewState==='accepted'?'pass':'pending'
        }))})
      });
      put(data.states);
      refreshPanels();
      renderTop();
    }catch(error){console.warn('FP content workflow unavailable',error)}
  };

  const directCommentUrl=(payload,comment)=>text(comment?.direct_url||comment?.url||comment?.anchor_url);
  const sourceLinks=payload=>officialSources(payload).map((source,index)=>{
    const url=sourceUrl(source);
    if(!url)return'';
    return '<a href="'+escFp(url)+'" target="_blank" rel="noopener">'+escFp(sourceLabel(source,index))+'</a>';
  }).filter(Boolean).join('／')||'一次情報の確認待ち';
  const evidenceComments=payload=>list(payload.source_comments).slice(0,4).map(comment=>{
    const label='#'+escFp(comment?.comment_no||'?')+' '+escFp(comment?.summary||'');
    const url=directCommentUrl(payload,comment);
    return url?'<a href="'+escFp(url)+'" target="_blank" rel="noopener">'+label+'</a>':label;
  }).join('<br>')||'採用コメントの保存待ち';
  const demandPanel=payload=>{
    const d=demand(payload),verdict=demandVerdict(payload);
    const label={strong:'強い',medium:'要検証',weak:'弱い'}[verdict]||'未判定';
    const metrics=[
      d.checked_scope?`確認範囲 ${d.checked_scope}`:'',
      d.total_comments!==undefined?`全体 ${Number(d.total_comments).toLocaleString('ja-JP')}件`:'',
      list(d.evidence_comment_nos).length?`直接根拠 ${list(d.evidence_comment_nos).length}件`:''
    ].filter(Boolean).join(' ／ ');
    const signs=list(d.signals).map(row=>typeof row==='string'?row:(row?.label||row?.summary||'')).filter(Boolean);
    return '<section class="fp-demand '+escFp(verdict||'pending')+'"><header><b>この疑問の需要</b><span>'+escFp(label)+'</span></header>'
      +'<p>'+escFp(d.question_demand||d.question_demand_summary||d.reason||'中心疑問への反応を確認待ち')+'</p>'
      +(metrics?'<small>'+escFp(metrics)+'</small>':'')+(signs.length?'<ul>'+signs.map(row=>'<li>'+escFp(row)+'</li>').join('')+'</ul>':'')+'</section>';
  };
  const stageMark=value=>['pass','done'].includes(value)?'✓':value==='ready'?'→':value==='fail'?'×':'待';
  const stage=(label,value)=>'<span class="fp-stage '+escFp(value)+'"><small>'+escFp(label)+'</small><b>'+stageMark(value)+'</b></span>';
  const draftStatus=item=>{
    const quality=packageQuality(item);
    if(!quality.ready&&item.payload?.draft_status==='ready')return{label:'根拠の補完待ち',kind:'blocked'};
    if(quality.ready&&!preflightReady(item.payload||{}))return{label:'制作条件を選ぶ',kind:'ready'};
    if(quality.ready&&item.reviewState==='accepted')return{label:'画像化用コピー待ち',kind:'ready'};
    if(quality.ready)return{label:'完成原稿あり',kind:'ready'};
    return{label:'原稿作成待ち',kind:'draft'};
  };
  const draftControls=item=>{
    const payload=item.payload||{};
    if(!list(payload.draft_slides).length)return'';
    const status=draftStatus(item);
    const quality=packageQuality(item);
    const copyReady=quality.ready&&preflightReady(payload);
    return '<section class="fp-draft-actions" data-fp-draft-actions="'+escFp(item.id)+'">'
      +'<div class="fp-draft-status '+escFp(status.kind)+'"><b>'+escFp(status.label)+'</b><span>'
      +(quality.ready?'原稿・根拠・スクショ指示・投稿文を保存済み':escFp(quality.issues.join('／')))
      +'</span></div><div class="fp-draft-buttons">'
      +'<button class="push-button fp-open-draft" data-fp-open="'+escFp(item.id)+'">原稿・需要・制作条件</button>'
      +'<button class="push-button fp-copy-images" data-fp-copy-package="'+escFp(item.id)+'" '+(copyReady?'':'disabled')+'>画像化用にコピー</button>'
      +'</div></section>';
  };

  const panel=item=>{
    const payload=item.payload||{};
    const workflow=state(item);
    const chosen=workflow.judgment==='pass'||item.reviewState==='accepted';
    const quality=packageQuality(item);
    const verified=quality.ready?'pass':(payload.source_checked_at?'ready':'pending');
    const drafted=list(payload.draft_slides).length?(quality.ready?'pass':'ready'):'pending';
    const steps=stage('発掘','pass')+stage('事実確認',verified)+stage('原稿',drafted)+stage('選択',chosen?'pass':'pending')+stage('画像',payload.image_status==='ready'?'pass':'pending');
    const structure=(list(payload.definitive_structure).length?list(payload.definitive_structure):list(payload.post_structure)).map(row=>'<li>'+escFp(typeof row==='string'?row:(row?.text||row?.title||JSON.stringify(row)))+'</li>').join('');
    const question=payload.reader_question||payload.question_lineage?.selected_question||payload.first_impression||payload.cover_idea||item.title||'';
    const reaction=payload.strong_reaction||payload.reaction_summary||item.reason||'';
    const hot=payload.hot_reason||item.reason||item.summary||'';
    const research=quality.ready?'元記事・該当コメント・一次情報・原稿を確認済み':(payload.research_status||(payload.source_checked_at?'原稿に必要な根拠を確認中':'追加調査待ち'));
    return '<section class="fp-candidate" data-fp-panel="'+escFp(item.id)+'"><div class="fp-head"><b>FP投稿候補</b><span class="fp-signal">'+escFp(payload.engagement_label||'反応確認済み')+'</span><span class="fp-state">'+(quality.ready?'原稿あり':chosen?'調査中':'選択待ち')+'</span></div>'
      +'<div class="fp-question"><small>この投稿が答える疑問</small>'+escFp(question)+'</div>'
      +demandPanel(payload)
      +'<dl class="fp-grid"><dt>反応の核</dt><dd>'+escFp(reaction)+'</dd><dt>根拠コメント</dt><dd>'+evidenceComments(payload)+'</dd><dt>なぜ今か</dt><dd>'+escFp(hot)+'</dd><dt>投稿構成</dt><dd><ol>'+structure+'</ol></dd><dt>一次情報</dt><dd>'+sourceLinks(payload)+'</dd><dt>調査状態</dt><dd>'+escFp(research)+'</dd></dl>'
      +'<div class="fp-stages">'+steps+'</div>'
      +(chosen?'<p class="fp-ready">選択済み。内容を確認して「画像化用にコピー」から制作へ渡せます。</p>':'')
      +draftControls(item)+'</section>';
  };

  const baseCard=cardHtml;
  cardHtml=(item,index)=>{
    const html=baseCard(item,index);
    if(!fp(item))return html;
    return html.replace('<table class="meta">',panel(item)+'<table class="meta">');
  };
  const refreshPanels=()=>{
    document.querySelectorAll('[data-fp-panel]').forEach(old=>{
      const item=(app.items||[]).find(row=>String(row.id)===old.dataset.fpPanel);
      if(item)old.outerHTML=panel(item);
    });
    relabel();
  };

  const topStatus=item=>{
    const status=draftStatus(item);
    if(status.kind==='ready'&&!preflightReady(item.payload||{}))return{label:'制作条件を選ぶ',kind:'action',weight:540};
    if(status.kind==='ready')return{label:status.label,kind:'action',weight:500};
    if(status.kind==='blocked')return{label:status.label,kind:'research',weight:300};
    return{label:'原稿作成待ち',kind:'research',weight:200};
  };
  const topCard=item=>{
    const status=topStatus(item);
    const payload=item.payload||{};
    const quality=packageQuality(item);
    const copyReady=quality.ready&&preflightReady(payload);
    const controls=list(payload.draft_slides).length
      ?'<button class="push-button small fp-open-draft" data-fp-open="'+escFp(item.id)+'">原稿・需要・制作条件</button><button class="push-button small fp-copy-images" data-fp-copy-package="'+escFp(item.id)+'" '+(copyReady?'':'disabled')+'>画像化用にコピー</button>'
      :'<button class="push-button small" data-fp-open-accepted="1">採用済みを開く</button>';
    return'<article class="fp-top-card '+escFp(status.kind)+'"><div class="fp-top-rank"><b>'+escFp(item.score||'—')+'</b><small>点</small></div><div class="fp-top-main"><div><span class="fp-top-status">'+escFp(status.label)+'</span><strong>'+escFp(draftTitle(item,payload)||'FP投稿候補')+'</strong></div><p>'+escFp(payload.reader_question||payload.question_lineage?.selected_question||payload.first_impression||payload.cover_idea||item.summary||'')+'</p><div class="fp-top-actions">'+controls+'</div></div></article>';
  };
  const renderTop=()=>{
    let host=document.getElementById('fpPriorityBoard');
    if(app.view!=='active'){host?.remove();return}
    if(!host){host=document.createElement('section');host.id='fpPriorityBoard';host.className='fp-top-board';document.querySelector('#regularHub .section-title')?.before(host)}
    const ranked=topItems.slice().sort((a,b)=>(topStatus(b).weight+(Number(b.score)||0))-(topStatus(a).weight+(Number(a.score)||0))).slice(0,3);
    host.hidden=!ranked.length;
    host.innerHTML=ranked.length?'<div class="fp-top-title"><div><b>いま確認する重要案件</b><span>完成原稿から画像制作へ</span></div><button class="push-button small" data-fp-open-accepted="1">すべて見る</button></div><div class="fp-top-list">'+ranked.map(topCard).join('')+'</div>':'';
  };
  const loadTop=async(force=false)=>{
    if(topLoading||app.view!=='active')return;
    if(!force&&Date.now()-topLoadedAt<30000){renderTop();return}
    topLoading=true;
    try{
      const response=await fetch(SIGNAL_API+'?view=accepted',{cache:'no-store',headers:authHeaders()});
      if(response.status===401){authExpired();return}
      const data=await response.json();
      if(!response.ok||!data?.ok)throw Error(data?.error||('HTTP '+response.status));
      topItems=list(data.items).filter(fp);
      topLoadedAt=Date.now();
      renderTop();
      await ensure(topItems);
      renderTop();
    }catch(error){console.warn('FP priority board unavailable',error)}
    finally{topLoading=false}
  };
  const findFpItem=id=>[...(app.items||[]),...topItems].find(item=>String(item.id)===String(id));
  const relabel=()=>{
    document.querySelectorAll('.thread').forEach(card=>{
      const button=card.querySelector('.action-accept');
      if(!button)return;
      const item=(app.items||[]).find(row=>String(row.id)===String(button.dataset.id));
      if(fp(item)){button.textContent='これに決定';button.classList.add('fp-select')}
    });
  };
  const baseRender=renderList;
  renderList=()=>{baseRender();relabel();ensure(app.items||[]);renderTop();loadTop()};

  const choose=async(item,button)=>{
    if(button.disabled)return;
    bump(button);button.disabled=true;button.textContent='決定を保存中…';setStatus('FP投稿候補を保存しています...',true);
    try{
      const quality=packageQuality(item);
      const data=await request({method:'PATCH',headers:headers(),body:JSON.stringify({
        entityType:TYPE,entityId:String(item.id),stage:'judgment',status:'pass',judgmentSeed:'pending',
        note:quality.ready?'完成原稿を確認して画像化候補に決定':'投稿候補として決定・原稿補完待ち'
      })});
      states.set(String(item.id),data.state);
      refreshPanels();
      const ok=await review(String(item.id),'accepted',button);
      if(ok)toast(quality.ready?'これに決定。画像化用にコピーできます':'これに決定。原稿の補完待ちです','good');
      else{button.disabled=false;button.textContent='これに決定'}
    }catch(error){button.disabled=false;button.textContent='これに決定';setStatus('保存エラー');toast(error.message||'決定を保存できませんでした','bad')}
  };

  const copyText=async(value,message='コピーしました')=>{
    try{await navigator.clipboard.writeText(value)}
    catch{
      const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
    }
    toast(message,'good');
  };
  const compactSource=source=>{
    if(typeof source==='string')return source;
    return [source?.label||source?.title,source?.url,source?.claim||source?.note,source?.checked_at?`確認: ${source.checked_at}`:''].filter(Boolean).join('｜');
  };
  const slideText=(slide,index,total)=>{
    const page=slide?.page||index+1;
    const teaser=text(slide?.teaser||slide?.kicker||slide?.section_label);
    const lines=[`【${page}/${total}${teaser?'｜付箋: '+teaser:''}】`,text(slide?.headline||slide?.title||slide?.heading),text(slide?.body||slide?.text||slide?.copy)];
    if(text(slide?.emphasis))lines.push(`強調: ${slide.emphasis}`);
    if(text(slide?.visual))lines.push(`画面: ${slide.visual}`);
    if(text(slide?.screenshot_request_id))lines.push(`スクショ: ${slide.screenshot_request_id}`);
    if(list(slide?.source_refs).length)lines.push(`根拠: ${slide.source_refs.join(', ')}`);
    return lines.filter(Boolean).join('\n');
  };
  const designText=payload=>{
    const key=text(payload.design_direction),direction=DESIGN_DIRECTIONS[key];
    const common=[
      '・1080×1350px、4:5、白地、濃いチャコール、落ち着いた青緑のアクセント。',
      '・小さな黒線の人物キャラクターは脇役。問い・数字・余白を主役にする。',
      '・ロゴや「しゃちほこ」の表記は入れない。',
      '・必須：2ページ目以降は、ページ番号と短い話題を大きめの付箋で見せる。',
      '・必須：一次資料・通知・料金表・申込画面など、実物で見せる価値がある箇所には確認済みスクショを使う。装飾目的や関係の薄い画面は使わない。',
      '・事実や数字を載せるページだけ、確認済み一次情報の短い出典名を下端へ小さく置く。'
    ];
    const specific={
      friendly:'・個室入院投稿の完成版を基準にする。白地の広い余白、極太の日本語ゴシック、黒と青緑の二色中心、丸みのある素朴な黒線人物、1ページ1主張、問いと数字の大きな強弱を再現する。',
      editorial:'・静かな編集記事型。サイボウズの記事のように、装飾を抑えた余白、観察から始まる短い言葉、落ち着いた文字組みで読ませる。',
      notebook:'・調査ノート型。公式資料の実物、囲み、短い注釈を活かし、調べた過程が自然に見える紙面にする。'
    }[key];
    const references=list(direction?.referenceUrls).map((url,index)=>`・固定デザイン見本 ${index+1}/${direction.referenceUrls.length}: ${url}`);
    return [`・選択済み: ${direction?.label||'未選択'}`,specific,...common,...references].filter(Boolean);
  };
  const handoffScreenshots=payload=>list(payload.screenshot_requests).map(row=>{
    const decision=screenshotDecision(payload,row);
    return [
      '必須',row?.id||'',row?.label||'',
      decision==='assistant'?'まずAIが取得を試す':decision==='user'?'ユーザーが用意':'扱い未決定',
      row?.url||'',row?.capture_range||row?.capture_area||'',row?.purpose||'',
      row?.acquisition_note?`取得メモ: ${row.acquisition_note}`:'',row?.slide_no?`使用ページ: ${row.slide_no}`:''
    ].filter(Boolean).join('｜');
  });
  const buildHandoff=item=>{
    const payload=item.payload||{};
    const slides=list(payload.draft_slides);
    const screenshots=list(payload.screenshot_requests);
    const sources=officialSources(payload);
    const reference=text(payload.design_reference_url||payload.draft_design?.reference_url);
    return [
      '以下の確定原稿から、Instagramカルーセル画像を作成してください。',
      '',
      '【制作前の必須確認】',
      '・原稿と根拠の内容を変えない。推測で補わない。',
      '・「まずAIが取得を試す」の素材は直URLから取得を試し、取得できない理由が判明した時だけ、場所と切り取り範囲を示してユーザーへ依頼する。',
      '・「ユーザーが用意」のスクショが未添付なら、画像生成を始める前に添付を求める。',
      '・完成画像は各ページを独立した別画像として、1ページ目から順番にチャット内へ直接表示する。結合画像・一覧・コラージュ・ZIPだけの納品は禁止。',
      '',
      '【公開面のルール】',
      '・ガールズちゃんねるの名称、URL、コメント番号、引用元表記は画像に出さない。需要確認のための内部資料としてのみ扱う。',
      '・アフィリエイト、プロフィール誘導、販売文句を画像に入れない。',
      '・1投稿1疑問。制度説明から始めず、人が実際に引っかかった問いから始める。',
      '',
      '【デザイン】',
      ...designText(payload),
      reference?`・デザイン見本: ${reference}`:'',
      '',
      '【タイトル】',draftTitle(item,payload),'',
      '【中心疑問】',text(payload.question_lineage?.selected_question),'',
      '【最後に戻す答え】',text(payload.question_lineage?.answer_target),'',
      '【ページ別の確定原稿】',slides.map((slide,index)=>slideText(slide,index,slides.length)).join('\n\n'),'',
      '【スクショ素材】',screenshots.length?handoffScreenshots(payload).join('\n'):'今回はスクショ素材なし。線画と文字で構成する。','',
      '【公開内容の一次情報】',sources.map(compactSource).join('\n'),'',
      '【キャプション】',draftCaption(payload)
    ].filter((row,index,array)=>row!==''||array[index-1]!=='').join('\n').trim();
  };
  const buildDraftCopy=item=>{
    const payload=item.payload||{};
    const slides=list(payload.draft_slides);
    return ['【タイトル】',draftTitle(item,payload),'','【ページ別原稿】',slides.map((slide,index)=>slideText(slide,index,slides.length)).join('\n\n'),'','【キャプション】',draftCaption(payload)].join('\n').trim();
  };

  const sourceRow=source=>{
    if(typeof source==='string')return'<li><a href="'+escFp(source)+'" target="_blank" rel="noopener">'+escFp(source)+'</a></li>';
    const url=source?.url;
    const label=source?.label||source?.title||url||'一次情報';
    return'<li>'+(url?'<a href="'+escFp(url)+'" target="_blank" rel="noopener">'+escFp(label)+'</a>':escFp(label))
      +(source?.claim?'<p>'+escFp(source.claim)+'</p>':'')+(source?.note?'<small>'+escFp(source.note)+'</small>':'')+(source?.checked_at?'<small>確認 '+escFp(source.checked_at)+'</small>':'')+'</li>';
  };
  const commentRow=(payload,comment)=>{
    const url=directCommentUrl(payload,comment);
    const number='#'+escFp(comment?.comment_no||'?');
    const reactions=[comment?.plus!==undefined?'+'+escFp(comment.plus):'',comment?.minus!==undefined?'-'+escFp(comment.minus):''].filter(Boolean).join(' / ');
    return'<li><b>'+(url?'<a href="'+escFp(url)+'" target="_blank" rel="noopener">'+number+'</a>':number)+'</b> '+escFp(comment?.summary||'')+(reactions?'<small>'+reactions+'</small>':'')+'</li>';
  };
  const premiseRow=row=>{
    const status=text(row?.status).toLowerCase();
    const mark=status==='confirmed'?'確認済み':status==='contradicted'?'前提と異なる':'未確認';
    return'<li class="'+escFp(status||'unknown')+'"><b>'+escFp(mark)+'</b><span>'+escFp(row?.claim||'')+'</span>'+(row?.official_url?'<a href="'+escFp(row.official_url)+'" target="_blank" rel="noopener">根拠を開く</a>':'')+(row?.note?'<small>'+escFp(row.note)+'</small>':'')+'</li>';
  };
  const selected=(a,b)=>a===b?' selected':'';
  const screenshotRow=(payload,row)=>{
    const value=screenshotDecision(payload,row);
    return '<article class="fp-shot required"><div><b>必須</b><strong>'+escFp(row?.label||'スクショ候補')+'</strong></div>'+(row?.url?'<a href="'+escFp(row.url)+'" target="_blank" rel="noopener">撮影元を開く</a>':'')+'<dl><dt>撮る範囲</dt><dd>'+escFp(row?.capture_range||row?.capture_area||'')+'</dd><dt>使う理由</dt><dd>'+escFp(row?.purpose||'')+'</dd>'+(row?.slide_no?'<dt>使用ページ</dt><dd>'+escFp(row.slide_no)+'</dd>':'')+(row?.acquisition_note?'<dt>取得メモ</dt><dd>'+escFp(row.acquisition_note)+'</dd>':'')+'</dl><label>画像の用意<select data-fp-shot-decision="'+escFp(row?.id||'')+'"><option value="">選んでください</option><option value="assistant"'+selected(value,'assistant')+'>まずAIが取得を試す</option><option value="user"'+selected(value,'user')+'>自分でスクショを用意</option></select></label></article>';
  };
  const designReference=payload=>{
    const direction=DESIGN_DIRECTIONS[text(payload.design_direction)]||DESIGN_DIRECTIONS.friendly;
    const urls=list(direction.referenceUrls);
    if(!urls.length)return '';
    return '<aside class="fp-design-reference"><b>'+escFp(direction.referenceLabel||'固定デザイン見本')+'</b><span>'+urls.map((url,index)=>'<a href="'+escFp(url)+'" target="_blank" rel="noopener">'+(index+1)+'枚目</a>').join('')+'</span><small>実績メモ：TikTokの直近投稿中、本人観測で再生初速が最速。題材とデザインの効果は未分離。</small></aside>';
  };
  const preflightSection=(item,payload)=>{
    const screenshots=list(payload.screenshot_requests),issues=preflightIssues(payload);
    return '<section class="fp-preflight"><h4>制作前に決める</h4><p>同じ原稿のまま、見せ方と実物素材の扱いだけを先に固定します。</p><div class="fp-design-options">'
      +Object.entries(DESIGN_DIRECTIONS).map(([key,row])=>'<label class="fp-design-option"><input type="radio" name="fp-design" value="'+key+'" '+(text(payload.design_direction)===key?'checked':'')+'><span><b>'+escFp(row.label)+'</b><small>'+escFp(row.short)+'</small><em>'+escFp(row.description)+'</em></span></label>').join('')+'</div>'
      +designReference(payload)
      +'<div class="fp-shot-list">'+(screenshots.length?screenshots.map(row=>screenshotRow(payload,row)).join(''):'<p class="fp-empty">この回は、理解や信頼を増す適切な実物資料が見つかっていません。スクショを捏造せず、文字と線画で構成します。</p>')+'</div>'
      +'<div class="fp-preflight-save"><span>'+(issues.length?'未決定：'+escFp(issues.join('／')):'制作条件を保存済み')+'</span><button class="push-button" data-fp-save-preflight="'+escFp(item.id)+'">制作条件を保存</button></div></section>';
  };
  const numberValue=value=>value===null||value===undefined||value===''?'':(Number.isFinite(Number(value))?String(Number(value)):'');
  const localDateTime=value=>{if(!value)return'';const d=new Date(value);if(!Number.isFinite(d.getTime()))return'';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)};
  const performanceSection=(item,payload)=>{
    const p=payload.performance||{};
    return '<section class="fp-performance"><h4>投稿後の結果</h4><p>まずは3投稿分の実数をため、バズ判定の基準はその後に決めます。</p><div class="fp-performance-grid">'
      +'<label>投稿先<select name="platform"><option value="instagram"'+selected(text(p.platform),'instagram')+'>Instagram</option><option value="tiktok"'+selected(text(p.platform),'tiktok')+'>TikTok</option></select></label>'
      +'<label>投稿日<input name="posted_at" type="datetime-local" value="'+escFp(localDateTime(p.posted_at))+'"></label>'
      +'<label>リーチ<input name="reach" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.reach))+'"></label>'
      +'<label>非フォロワー割合 %<input name="non_follower_pct" type="number" min="0" max="100" step="0.1" value="'+escFp(numberValue(p.non_follower_pct))+'"></label>'
      +'<label>シェア<input name="shares" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.shares))+'"></label>'
      +'<label>保存<input name="saves" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.saves))+'"></label>'
      +'<label>いいね<input name="likes" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.likes))+'"></label>'
      +'<label>コメント<input name="comments" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.comments))+'"></label>'
      +'<label>プロフィール表示<input name="profile_views" type="number" min="0" inputmode="numeric" value="'+escFp(numberValue(p.profile_views))+'"></label>'
      +'<label class="wide">メモ<input name="note" maxlength="500" value="'+escFp(p.note||'')+'" placeholder="伸びた理由・伸びなかった理由"></label></div>'
      +'<div class="fp-performance-save"><span>'+(p.recorded_at?'記録 '+escFp(p.recorded_at):'未記録')+'</span><button class="push-button" data-fp-save-performance="'+escFp(item.id)+'">投稿結果を保存</button></div></section>';
  };
  const slideRow=(slide,index,total)=>{
    const heading=slide?.headline||slide?.title||slide?.heading||('スライド '+(index+1));
    const body=slide?.body||slide?.text||slide?.copy||'';
    const teaser=text(slide?.teaser||slide?.kicker||slide?.section_label||heading).slice(0,18);
    return'<article class="fp-draft-slide"><div class="fp-page-sticky"><b>'+(slide?.page||index+1)+'/'+total+'</b><small>'+escFp(teaser)+'</small></div><section><h4>'+escFp(heading)+'</h4><p>'+escFp(body).replace(/\n/g,'<br>')+'</p>'+(slide?.visual?'<small class="fp-slide-visual">画面：'+escFp(slide.visual)+'</small>':'')+(list(slide?.source_refs).length?'<small class="fp-slide-source">根拠：'+escFp(slide.source_refs.join('、'))+'</small>':'')+'</section></article>';
  };
  const closeDraft=()=>{document.querySelector('[data-fp-modal]')?.remove();document.body.classList.remove('fp-modal-open')};
  const openDraft=item=>{
    const payload=item.payload||{};
    const slides=list(payload.draft_slides);
    const sources=officialSources(payload);
    const comments=list(payload.source_comments);
    const premises=list(payload.premise_checks);
    const screenshots=list(payload.screenshot_requests);
    const points=list(payload.draft_review_points);
    const quality=packageQuality(item);
    const copyReady=quality.ready&&preflightReady(payload);
    const modal=document.createElement('div');
    modal.className='fp-draft-modal';modal.dataset.fpModal='1';
    const sourcePage=text(payload.source_url||item.url);
    modal.innerHTML='<div class="fp-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-draft-title"><header><div><small>FPカルーセル完成原稿</small><h3 id="fp-draft-title">'+escFp(draftTitle(item,payload)||'原稿案')+'</h3></div><button class="push-button fp-close-draft">閉じる</button></header><main>'
      +'<section class="fp-package-status '+(quality.ready?'ready':'blocked')+'"><b>'+(quality.ready?'原稿と根拠は完成':'根拠の補完が必要')+'</b>'+(quality.ready?'<span>需要の証拠、元記事、一次情報、原稿、投稿文が揃っています。</span>':'<ul>'+quality.issues.map(issue=>'<li>'+escFp(issue)+'</li>').join('')+'</ul>')+'</section>'
      +'<section class="fp-draft-cover"><small>表紙案</small><b>'+escFp(payload.draft_cover||draftTitle(item,payload))+'</b></section>'
      +demandPanel(payload)
      +preflightSection(item,payload)
      +'<div class="fp-draft-slides">'+slides.map((slide,index)=>slideRow(slide,index,slides.length)).join('')+'</div>'
      +'<section class="fp-evidence"><h4>元記事の証拠メモ <small>自分用・画像には出さない</small></h4>'+(sourcePage?'<p><a href="'+escFp(sourcePage)+'" target="_blank" rel="noopener">元記事を直接開く</a>　'+escFp(payload.source_title||'')+'</p>':'')+(payload.source_post_summary?'<p>'+escFp(payload.source_post_summary)+'</p>':'')+(comments.length?'<ol class="fp-comment-list">'+comments.map(comment=>commentRow(payload,comment)).join('')+'</ol>':'<p class="fp-empty">採用コメントは未保存です。</p>')+(payload.source_checked_at?'<small>本文・コメント確認：'+escFp(payload.source_checked_at)+'</small>':'')+'</section>'
      +(premises.length?'<section class="fp-premises"><h4>出発点の前提確認</h4><ul>'+premises.map(premiseRow).join('')+'</ul></section>':'')
      +'<section class="fp-draft-sources"><h4>一次情報と使った根拠</h4>'+(sources.length?'<ol>'+sources.map(sourceRow).join('')+'</ol>':'<p class="fp-empty">一次情報は未保存です。</p>')+'</section>'
      +(points.length?'<section class="fp-draft-notes"><h4>公開前の確認点</h4><ul>'+points.map(point=>'<li>'+escFp(typeof point==='string'?point:(point?.text||point?.note||JSON.stringify(point)))+'</li>').join('')+'</ul></section>':'')
      +'<section class="fp-publish-copy"><h4>投稿時にコピー</h4><label>タイトル</label><div class="fp-copy-box"><pre>'+escFp(draftTitle(item,payload))+'</pre><button class="push-button small" data-fp-copy-title="'+escFp(item.id)+'">タイトルをコピー</button></div><label>キャプション</label><div class="fp-copy-box"><pre>'+escFp(draftCaption(payload))+'</pre><button class="push-button small" data-fp-copy-caption="'+escFp(item.id)+'">キャプションをコピー</button></div></section>'
      +performanceSection(item,payload)
      +'</main><footer><button class="push-button fp-close-draft">戻る</button><button class="push-button" data-fp-copy-draft="'+escFp(item.id)+'">原稿をコピー</button><button class="push-button fp-copy-images" data-fp-copy-package="'+escFp(item.id)+'" '+(copyReady?'':'disabled')+'>画像化用にコピー</button></footer></div>';
    document.body.appendChild(modal);document.body.classList.add('fp-modal-open');modal.querySelector('.fp-close-draft')?.focus();
  };
  const reopenDraft=fresh=>{closeDraft();replaceCachedItem(fresh);refreshPanels();renderTop();openDraft(fresh)};
  const savePreflight=async(item,button)=>{
    const section=button.closest('.fp-preflight');
    const designDirection=section?.querySelector('input[name="fp-design"]:checked')?.value||'';
    const screenshotDecisions={};
    section?.querySelectorAll('[data-fp-shot-decision]').forEach(select=>{if(select.value)screenshotDecisions[select.dataset.fpShotDecision]=select.value});
    const localIssues=[];
    if(!DESIGN_DIRECTIONS[designDirection])localIssues.push('デザイン');
    list(item.payload?.screenshot_requests).forEach(row=>{
      const value=screenshotDecisions[row?.id],allowed=['assistant','user'];
      if(!allowed.includes(value))localIssues.push(row?.label||'スクショ');
    });
    if(localIssues.length){toast('未決定があります：'+localIssues.join('／'),'bad');return}
    bump(button);button.disabled=true;button.textContent='保存中…';setStatus('制作条件を保存しています...',true);
    try{
      const data=await signalRequest({action:'fp_preflight',id:String(item.id),designDirection,screenshotDecisions});
      reopenDraft(data.item);toast('制作条件を保存しました','good');setStatus('準備完了');
    }catch(error){button.disabled=false;button.textContent='制作条件を保存';toast(error.message||'制作条件を保存できませんでした','bad');setStatus('保存エラー')}
  };
  const readMetric=(section,name)=>{const value=section?.querySelector(`[name="${name}"]`)?.value;return value===''||value===undefined?null:Number(value)};
  const savePerformance=async(item,button)=>{
    const section=button.closest('.fp-performance'),postedValue=section?.querySelector('[name="posted_at"]')?.value||'';
    const reach=readMetric(section,'reach');
    if(!postedValue||reach===null||!Number.isFinite(reach)){toast('投稿日とリーチを入力してください','bad');return}
    const performance={
      platform:section.querySelector('[name="platform"]').value,
      posted_at:new Date(postedValue).toISOString(),reach,
      non_follower_pct:readMetric(section,'non_follower_pct'),shares:readMetric(section,'shares'),saves:readMetric(section,'saves'),
      likes:readMetric(section,'likes'),comments:readMetric(section,'comments'),profile_views:readMetric(section,'profile_views'),
      note:text(section.querySelector('[name="note"]')?.value)
    };
    bump(button);button.disabled=true;button.textContent='保存中…';setStatus('投稿結果を保存しています...',true);
    try{
      const data=await signalRequest({action:'fp_performance',id:String(item.id),performance});
      reopenDraft(data.item);toast('投稿結果を保存しました','good');setStatus('準備完了');
    }catch(error){button.disabled=false;button.textContent='投稿結果を保存';toast(error.message||'投稿結果を保存できませんでした','bad');setStatus('保存エラー')}
  };

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.action-accept');
    if(!button)return;
    const item=(app.items||[]).find(row=>String(row.id)===String(button.dataset.id));
    if(!fp(item))return;
    event.preventDefault();event.stopImmediatePropagation();choose(item,button);
  },true);
  document.addEventListener('click',event=>{
    const accepted=event.target.closest?.('[data-fp-open-accepted]');
    if(accepted){event.preventDefault();app.domain='all';setSelected('#domainTabs button[data-domain]','domain','all');load('accepted');return}
    const open=event.target.closest?.('[data-fp-open]');
    if(open){event.preventDefault();const item=findFpItem(open.dataset.fpOpen);if(item)openDraft(item);return}
    if(event.target.closest?.('.fp-close-draft')||event.target.classList?.contains('fp-draft-modal')){event.preventDefault();closeDraft();return}
    const packageButton=event.target.closest?.('[data-fp-copy-package]');
    if(packageButton){event.preventDefault();const item=findFpItem(packageButton.dataset.fpCopyPackage);if(item&&packageQuality(item).ready&&preflightReady(item.payload||{}))copyText(buildHandoff(item),'画像化用の指示をコピーしました');return}
    const preflightButton=event.target.closest?.('[data-fp-save-preflight]');
    if(preflightButton){event.preventDefault();const item=findFpItem(preflightButton.dataset.fpSavePreflight);if(item)savePreflight(item,preflightButton);return}
    const performanceButton=event.target.closest?.('[data-fp-save-performance]');
    if(performanceButton){event.preventDefault();const item=findFpItem(performanceButton.dataset.fpSavePerformance);if(item)savePerformance(item,performanceButton);return}
    const draftButton=event.target.closest?.('[data-fp-copy-draft]');
    if(draftButton){event.preventDefault();const item=findFpItem(draftButton.dataset.fpCopyDraft);if(item)copyText(buildDraftCopy(item),'原稿をコピーしました');return}
    const titleButton=event.target.closest?.('[data-fp-copy-title]');
    if(titleButton){event.preventDefault();const item=findFpItem(titleButton.dataset.fpCopyTitle);if(item)copyText(draftTitle(item),'タイトルをコピーしました');return}
    const captionButton=event.target.closest?.('[data-fp-copy-caption]');
    if(captionButton){event.preventDefault();const item=findFpItem(captionButton.dataset.fpCopyCaption);if(item)copyText(draftCaption(item.payload||{}),'キャプションをコピーしました')}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('[data-fp-modal]'))closeDraft()});

  window.__fpContentPipeline={packageQuality,preflightIssues,buildHandoff,buildDraftCopy};

  const style=document.createElement('style');
  style.textContent=`
    .fp-candidate{margin:0 0 9px;padding:9px;background:#edf7ff;border:2px solid;border-color:#fff #55728a #55728a #fff;box-shadow:inset -1px -1px #9cb2c2;color:#111}.fp-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:7px}.fp-head>b{color:#000080}.fp-signal,.fp-state{padding:1px 5px;border:1px solid #777;background:#fff;font-size:11px}.fp-state{margin-left:auto;background:#fff6b5;font-weight:700}.fp-question{background:#fff;border:1px inset #aaa;padding:7px 8px;line-height:1.45;font-weight:700}.fp-question small{display:block;color:#555;font-weight:400}.fp-demand{margin-top:7px;padding:8px 9px;background:#fff;border:1px solid #777}.fp-demand header{display:flex;align-items:center;justify-content:space-between;gap:8px}.fp-demand header span{padding:2px 7px;border:1px solid #777;background:#eee;font-weight:900}.fp-demand.strong{border-color:#2f6b2f;background:#eef9ee}.fp-demand.strong header span{color:#005b00;background:#d8f5d8;border-color:#2f6b2f}.fp-demand.medium{background:#fff8d1;border-color:#8b6800}.fp-demand p{margin:5px 0;line-height:1.45}.fp-demand small{color:#555}.fp-demand ul{margin:5px 0 0;padding-left:19px}.fp-grid{display:grid;grid-template-columns:92px 1fr;margin:7px 0 0;border:1px solid #9aa}.fp-grid dt,.fp-grid dd{margin:0;padding:5px 6px;border-bottom:1px solid #ccd;line-height:1.45}.fp-grid dt{background:#dce8f0;font-size:11px}.fp-grid dd{background:#fff;font-size:12px}.fp-grid ol{margin:0;padding-left:20px}.fp-grid a{color:#000080}.fp-stages{display:flex;gap:5px;align-items:center;margin-top:7px;overflow-x:auto}.fp-stage{min-width:64px;padding:3px 6px;text-align:center;border:1px solid #777;background:#eee}.fp-stage.pass,.fp-stage.done{background:#d8f5d8}.fp-stage.ready{background:#fff3bf}.fp-stage.fail{background:#ffd7d7}.fp-stage small{display:block;font-size:10px}.fp-stage b{font-size:13px}.fp-ready{margin:7px 0 0;padding:6px;background:#fff6b5;border:1px solid #b8a94b;font-size:12px}.fp-select{font-weight:900;background:#d9ffd9}
    .fp-draft-actions{margin-top:8px;padding:8px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080}.fp-draft-status{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px}.fp-draft-status b{color:#000080}.fp-draft-status.blocked b{color:#8b0000}.fp-draft-status span{font-size:11px;color:#444}.fp-draft-buttons{display:flex;gap:7px;flex-wrap:wrap}.fp-copy-images{font-weight:900;background:#fff3a8}.fp-copy-images:disabled{background:#ddd;color:#555}.fp-modal-open{overflow:hidden}.fp-draft-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:16px}.fp-draft-dialog{width:min(980px,100%);max-height:92vh;display:flex;flex-direction:column;background:#c0c0c0;color:#111;border:3px solid;border-color:#fff #111 #111 #fff;box-shadow:8px 8px 0 rgba(0,0,0,.35)}.fp-draft-dialog>header,.fp-draft-dialog>footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px}.fp-draft-dialog>header{background:#000080;color:#fff}.fp-draft-dialog h3{margin:2px 0 0;font-size:18px}.fp-draft-dialog>main{overflow:auto;padding:12px}.fp-draft-dialog>footer{border-top:1px solid #777;background:#d4d0c8}.fp-package-status{display:flex;gap:10px;align-items:center;margin-bottom:10px;padding:9px 11px;border:2px solid}.fp-package-status.ready{background:#dbf5d8;border-color:#2f6b2f}.fp-package-status.blocked{display:block;background:#fff1b8;border-color:#8b6800}.fp-package-status ul{margin:5px 0 0;padding-left:20px}.fp-draft-cover{padding:18px;background:#f8f0dd;border:2px solid #263d57;text-align:center}.fp-draft-cover small{display:block;color:#555}.fp-draft-cover b{display:block;margin-top:7px;font-size:24px;line-height:1.45}.fp-preflight,.fp-performance{margin-top:10px;padding:10px 12px;background:#fff;border:2px solid #4d6f69}.fp-preflight h4,.fp-performance h4{margin:0 0 4px}.fp-preflight>p,.fp-performance>p{margin:0 0 8px;color:#555}.fp-design-options{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.fp-design-option{display:block}.fp-design-option input{position:absolute;opacity:0}.fp-design-option span{display:block;height:100%;padding:9px;background:#f5f5f5;border:2px solid;border-color:#fff #777 #777 #fff;cursor:pointer}.fp-design-option input:checked+span{background:#dff5ef;border-color:#277267;box-shadow:inset 0 0 0 2px #fff}.fp-design-option b,.fp-design-option small,.fp-design-option em{display:block}.fp-design-option small{margin-top:2px;color:#006b60;font-weight:700}.fp-design-option em{margin-top:5px;color:#555;font-size:11px;font-style:normal;line-height:1.4}.fp-design-reference{display:grid;grid-template-columns:auto 1fr;gap:5px 10px;margin-top:9px;padding:8px;background:#eef8f5;border:1px solid #4d6f69}.fp-design-reference>span{display:flex;gap:5px;flex-wrap:wrap}.fp-design-reference>small{grid-column:1/-1;color:#555}.fp-shot-list{margin-top:8px}.fp-shot{display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:7px;padding:8px;background:#fff;border:1px solid #777}.fp-shot>div{display:flex;gap:7px;align-items:center}.fp-shot>div>b{padding:2px 5px;background:#d7efe9;border:1px solid #3d766f;font-size:10px}.fp-shot.required>div>b{background:#fff0a8;border-color:#877522}.fp-shot dl{grid-column:1/-1;display:grid;grid-template-columns:78px 1fr;margin:0}.fp-shot dt,.fp-shot dd{margin:0;padding:3px}.fp-shot dt{color:#555;font-size:11px}.fp-shot>label{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-weight:700}.fp-shot select,.fp-performance select,.fp-performance input{min-height:30px;padding:4px;border:2px inset #ddd;background:#fff;font:inherit}.fp-preflight-save,.fp-performance-save{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;padding-top:8px;border-top:1px dotted #777}.fp-performance{border-color:#6b5792;background:#faf7ff}.fp-performance-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.fp-performance-grid label{display:grid;gap:3px;font-size:11px;font-weight:700}.fp-performance-grid label.wide{grid-column:1/-1}.fp-draft-slides{display:grid;gap:8px;margin-top:10px}.fp-draft-slide{display:grid;grid-template-columns:112px 1fr;background:#fff;border:1px solid #777}.fp-page-sticky{align-self:start;display:flex;flex-direction:column;gap:2px;margin:9px 0 9px 9px;padding:8px;background:#fff0a8;border:1px solid #877522;box-shadow:3px 3px 0 #c2b46b;transform:rotate(-1deg)}.fp-page-sticky b{font-size:21px}.fp-page-sticky small{font-size:10px;line-height:1.3}.fp-draft-slide section{padding:10px 12px}.fp-draft-slide h4,.fp-draft-slide p{margin:0}.fp-draft-slide p{margin-top:5px;line-height:1.6}.fp-slide-visual,.fp-slide-source{display:block;margin-top:7px;padding-top:5px;border-top:1px dotted #aaa;color:#555}.fp-evidence,.fp-premises,.fp-draft-notes,.fp-draft-sources,.fp-publish-copy{margin-top:10px;padding:10px 12px;background:#fff;border:1px solid #777}.fp-evidence{background:#f5f5f5}.fp-evidence h4,.fp-premises h4,.fp-draft-notes h4,.fp-draft-sources h4,.fp-publish-copy h4{margin:0 0 7px}.fp-evidence h4 small{font-weight:400;color:#666}.fp-evidence p{margin:6px 0}.fp-comment-list{margin:7px 0;padding-left:28px}.fp-comment-list li{margin:5px 0}.fp-comment-list small{display:block;color:#666}.fp-premises{background:#fff6bf;border-color:#9a873a}.fp-premises ul{list-style:none;margin:0;padding:0}.fp-premises li{display:grid;grid-template-columns:90px 1fr auto;gap:8px;margin-top:5px;padding:6px;background:#fff}.fp-premises li>b{color:#006400}.fp-premises li.contradicted>b,.fp-premises li.unknown>b{color:#8b0000}.fp-premises li small{grid-column:2/-1;color:#555}.fp-draft-sources{background:#edf7ff;border-color:#55728a}.fp-draft-sources ol{margin:0;padding-left:24px}.fp-draft-sources li{margin:7px 0}.fp-draft-sources p,.fp-draft-sources small{display:block;margin:2px 0;color:#555}.fp-publish-copy label{display:block;margin:8px 0 3px;font-weight:700}.fp-copy-box{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:start}.fp-copy-box pre{min-width:0;max-height:180px;overflow:auto;margin:0;padding:8px;white-space:pre-wrap;background:#fff;border:1px inset #aaa;font-family:inherit;line-height:1.5}.fp-empty{color:#666}.fp-top-board{margin:0 0 12px;padding:9px;background:#fff6b5;border:3px double #7a6500;color:#111}.fp-top-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.fp-top-title>div{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}.fp-top-title b{color:#8b0000;font-size:15px}.fp-top-title span{font-size:11px;color:#555}.fp-top-list{display:grid;gap:6px}.fp-top-card{display:grid;grid-template-columns:58px 1fr;background:#fff;border:1px solid #777}.fp-top-rank{display:grid;place-content:center;text-align:center;background:#16324f;color:#fff}.fp-top-rank b{font-size:22px}.fp-top-rank small{font-size:10px}.fp-top-main{padding:7px 9px}.fp-top-main>div:first-child{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fp-top-main strong{font-size:13px}.fp-top-status{padding:2px 6px;border:1px solid #8b0000;background:#ffe0c2;color:#8b0000;font-weight:900;font-size:11px}.fp-top-card.action .fp-top-status{border-color:#006400;background:#dff5df;color:#005b00}.fp-top-main p{margin:5px 0;font-size:11px;line-height:1.45}.fp-top-actions{display:flex;gap:6px;flex-wrap:wrap}
    @media(max-width:700px){.fp-grid{grid-template-columns:78px 1fr}.fp-state{margin-left:0}.fp-stage{min-width:56px}.fp-draft-modal{padding:0}.fp-draft-dialog{width:100%;height:100dvh;max-height:none;border:0}.fp-draft-dialog h3{font-size:15px}.fp-draft-cover b{font-size:20px}.fp-draft-dialog>footer{flex-wrap:wrap}.fp-draft-dialog>footer .push-button,.fp-draft-buttons .push-button{flex:1;min-height:40px}.fp-design-options,.fp-performance-grid{grid-template-columns:1fr}.fp-performance-grid label.wide{grid-column:auto}.fp-preflight-save,.fp-performance-save{align-items:stretch;flex-direction:column}.fp-preflight-save .push-button,.fp-performance-save .push-button{min-height:40px}.fp-shot>label{align-items:stretch;flex-direction:column}.fp-shot select{width:100%}.fp-draft-slide{grid-template-columns:82px 1fr}.fp-page-sticky{margin:7px 0 7px 7px;padding:6px}.fp-page-sticky b{font-size:17px}.fp-premises li{grid-template-columns:82px 1fr}.fp-premises li a{grid-column:2}.fp-copy-box{grid-template-columns:1fr}.fp-copy-box .push-button{min-height:38px}.fp-top-card{grid-template-columns:48px 1fr}.fp-top-rank b{font-size:18px}.fp-top-actions .push-button{min-height:38px}.fp-top-title{align-items:flex-start}}
  `;
  document.head.appendChild(style);
  relabel();
  loadTop(true);
})();
