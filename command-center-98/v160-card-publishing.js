(()=>{
  const X=window.CCX;
  if(!X)return;
  const labels={inbox:'未判定',candidate:'投稿候補',draft:'下書き',approved:'投稿待ち',expired:'期限切れ',posted:'投稿済み',rejected:'見送り'};
  const types={opening:'受付開始',deadline:'締切前',affiliate:'PR導線'};
  const by=id=>document.getElementById(id);
  const h=value=>esc(value??'');
  const link=(url,text)=>url?'<a href="'+h(url)+'" target="_blank" rel="noopener">'+h(text)+'</a>':'未登録';
  const viewStatus=item=>item.isExpired?'expired':item.status;

  const topButton=by('xViewBtn');
  if(topButton?.firstElementChild)topButton.firstElementChild.textContent='カード投稿';
  const heading=document.querySelector('#xHub .x-head');
  if(heading)heading.innerHTML='<span>カード投稿.exe - X / THREADS DRAFT DESK</span><span>発見 → 公式確認 → 下書き → 人が投稿</span>';
  const intro=document.querySelector('#xHub .x-intro');
  if(intro)intro.innerHTML='<b>カード情報を、投稿できる直前まで整えます。</b> 公式確認を済ませ、必要な時だけ価値の一言を加えて、XとThreadsの文案を同時に作ります。最後の編集・コピー・投稿は人が行います。';
  document.querySelectorAll('.status-panel').forEach(node=>{if(/^ver\s/i.test(node.textContent||''))node.textContent='ver 1.61'});
  const helpNote=document.querySelector('.help-note');
  if(helpNote)helpNote.textContent=(helpNote.textContent||'').replace(/ver\s+[\d.]+/i,'ver 1.61');
  const tabs=by('xTabs');
  if(tabs)tabs.innerHTML=Object.entries(labels).map(([key,label])=>'<button class="push-button small" data-x-tab="'+key+'">'+label+' <span id="xCount'+key+'">0</span></button>').join('')+'<span class="x-spacer"></span><button class="push-button small" id="xAdd">＋ 手入力</button>';

  X.twitterLength=text=>{
    let total=0,last=0;
    const regex=/https?:\/\/[^\s]+/gi;
    for(const match of String(text||'').matchAll(regex)){
      for(const char of Array.from(String(text||'').slice(last,match.index)))total+=char.codePointAt(0)<=0xff?1:2;
      total+=23;
      last=(match.index||0)+match[0].length;
    }
    for(const char of Array.from(String(text||'').slice(last)))total+=char.codePointAt(0)<=0xff?1:2;
    return total;
  };
  X.recount=()=>{
    const counts={total:X.state.items.length,inbox:0,candidate:0,draft:0,approved:0,expired:0,posted:0,rejected:0};
    X.state.items.forEach(item=>{const status=viewStatus(item);counts[status]=(counts[status]||0)+1});
    X.state.counts=counts;
  };
  X.time=value=>{const time=value?new Date(value).getTime():0;return Number.isFinite(time)?time:0};
  X.active=()=>X.state.items.filter(item=>viewStatus(item)===X.state.tab).sort((a,b)=>
    X.time(b.updatedAt||b.detectedAt||b.createdAt)-X.time(a.updatedAt||a.detectedAt||a.createdAt)
    ||X.time(b.detectedAt||b.createdAt)-X.time(a.detectedAt||a.createdAt)
    ||(b.score||0)-(a.score||0)
  );
  X.officialBadge=item=>item.officialVerified
    ?'<span class="x-verify ok">✓ 公式確認済み'+(item.officialCheckedAt?' '+h(fmtDate(item.officialCheckedAt)):'')+'</span>'
    :'<span class="x-verify ng">! 公式未確認</span>';
  X.draftPanel=(item,platform)=>{
    const isX=platform==='x';
    const text=isX?item.xDraft:item.threadsDraft;
    if(!text)return'';
    const count=isX?(item.xWeightedLength??X.twitterLength(text)):(item.threadsLength??Array.from(text).length);
    const limit=isX?280:500;
    return '<section class="x-draft '+platform+'"><div><b>'+h(isX?'X':'Threads')+'・'+h(types[item.draftType]||'投稿案')+'</b><span class="'+(count>limit?'over':'')+'">'+h(count)+' / '+limit+'</span></div><pre>'+h(text)+'</pre><button class="push-button small" type="button" data-xcopy="'+h(item.id)+'" data-platform="'+platform+'">'+h(isX?'X':'Threads')+'をコピー</button></section>';
  };
  X.actions=item=>{
    if(item.isExpired)return '<button class="push-button small" data-xs="rejected" data-id="'+h(item.id)+'">見送りにする</button>';
    if(item.status==='inbox')return '<button class="push-button small" data-xs="candidate" data-id="'+h(item.id)+'">投稿候補へ</button><button class="push-button small" data-xs="rejected" data-id="'+h(item.id)+'">見送り</button>';
    if(['candidate','draft'].includes(item.status))return '<button class="push-button small x-main" data-xg="opening" data-id="'+h(item.id)+'">🔥 受付開始文</button><button class="push-button small x-main" data-xg="deadline" data-id="'+h(item.id)+'">⏰ 締切前文</button><button class="push-button small" data-xg="affiliate" data-id="'+h(item.id)+'">PR導線文</button>'+(item.xDraft&&item.threadsDraft?'<button class="push-button small x-approve" data-xs="approved" data-id="'+h(item.id)+'">内容を承認</button>':'')+'<button class="push-button small" data-xs="rejected" data-id="'+h(item.id)+'">見送り</button>';
    if(item.status==='approved'){
      const xDone=item.postedAt?'<span class="x-posted-mark">✓ X済み</span>':'<button class="push-button small" data-xposted="'+h(item.id)+'" data-platform="x">Xを投稿済みにする</button>';
      const threadsDone=item.threadsPostedAt?'<span class="x-posted-mark">✓ Threads済み</span>':'<button class="push-button small" data-xposted="'+h(item.id)+'" data-platform="threads">Threadsを投稿済みにする</button>';
      return xDone+threadsDone+'<button class="push-button small" data-xs="draft" data-id="'+h(item.id)+'">修正へ</button>';
    }
    if(item.status==='posted')return '<button class="push-button small" data-xcopy="'+h(item.id)+'" data-platform="x">Xを再コピー</button><button class="push-button small" data-xcopy="'+h(item.id)+'" data-platform="threads">Threadsを再コピー</button><button class="push-button small" data-xs="draft" data-id="'+h(item.id)+'">再利用</button>';
    if(item.status==='rejected')return '<button class="push-button small" data-xs="candidate" data-id="'+h(item.id)+'">候補へ戻す</button>';
    return'';
  };
  X.card=item=>{
    const hook=item.valueHook?'<div class="x-value-hook"><b>投稿に使える一言</b><span>'+h(item.valueHook)+'</span>'+(item.valueHookSourceUrl?link(item.valueHookSourceUrl,'根拠を開く'):'')+'</div>':'';
    const drafts=[X.draftPanel(item,'x'),X.draftPanel(item,'threads')].filter(Boolean).join('');
    const posting=(item.postedAt||item.threadsPostedAt)?'<div class="x-posting-state">'+(item.postedAt?'X '+h(fmtDate(item.postedAt)):'X 未投稿')+' ／ '+(item.threadsPostedAt?'Threads '+h(fmtDate(item.threadsPostedAt)):'Threads 未投稿')+'</div>':'';
    const detectedAt=item.detectedAt||item.createdAt;
    const updatedAt=item.updatedAt||detectedAt;
    const freshness=(detectedAt?'<span class="x-freshness">情報取得 '+h(fmtDate(detectedAt))+'</span>':'')+(updatedAt&&X.time(updatedAt)!==X.time(detectedAt)?'<span class="x-freshness updated">最終更新 '+h(fmtDate(updatedAt))+'</span>':'');
    const auto=typeof X.applicationAutomation==='function'?X.applicationAutomation(item):null;
    const autoPanel=auto?'<div class="x-auto-panel '+h(auto.mode)+'"><div><small>自動入力</small><span class="x-auto-badge">'+h(auto.label)+'</span></div><div class="x-auto-note"><b>'+h(auto.note)+'</b><div class="x-auto-legend">応募の自動入力は次の段階で扱います。</div></div></div>':'';
    const workflow=window.CCWorkflow?.panel?window.CCWorkflow.panel(item):'';
    return '<article class="x-card '+h(viewStatus(item))+'"><div class="x-card-head"><span class="priority '+String(item.priority).toLowerCase()+'">['+h(item.priority)+'] '+h(item.score)+'点</span><b>'+h(item.productName)+'</b><span>'+h(labels[viewStatus(item)])+'</span></div><div class="x-card-body"><div class="x-card-flags">'+freshness+X.officialBadge(item)+(item.discoverySource?'<span class="x-source">発見元 '+h(item.discoverySource)+'</span>':'')+'</div><div class="x-facts"><div><small>店舗・主催</small><b>'+h(item.organizer||'未登録')+'</b></div><div><small>締切（JST）</small><b>'+h(item.applicationDeadline?fmtDate(item.applicationDeadline):'未確認')+'</b></div><div><small>対象</small><b>'+h(item.targetRegion||'未確認')+'</b></div><div><small>アフィ導線</small><b>'+h({available:'あり',none:'なし',check:'要確認'}[item.affiliateStatus]||'要確認')+'</b></div></div>'+autoPanel+workflow+'<table class="x-info"><tr><th>条件</th><td>'+h(item.conditions||'未確認')+'</td></tr><tr><th>応募</th><td>'+link(item.applicationUrl,'応募ページ')+'</td></tr><tr><th>確認元</th><td>'+link(item.officialUrl,'公式')+(item.discoveryUrl?' ／ '+link(item.discoveryUrl,'発見元ページ'):'')+'</td></tr></table>'+hook+(drafts?'<div class="x-draft-grid">'+drafts+'</div>':'')+posting+(item.decisionReason?'<div class="x-decision"><b>見送り理由：</b>'+h(item.decisionReason)+'</div>':'')+'<div class="x-actions">'+X.actions(item)+'<button class="push-button small" data-xedit="'+h(item.id)+'">詳細・編集</button></div></div></article>';
  };
  X.render=()=>{
    X.recount();
    const counts=X.state.counts||{};
    Object.keys(labels).forEach(key=>{const node=by('xCount'+key);if(node)node.textContent=counts[key]||0});
    by('xTopBadge').textContent=Number(counts.candidate||0)+Number(counts.draft||0)+Number(counts.approved||0);
    by('xStats').innerHTML='<div><small>候補</small><b>'+h(counts.candidate||0)+'</b></div><div><small>下書き</small><b>'+h(counts.draft||0)+'</b></div><div><small>投稿待ち</small><b>'+h(counts.approved||0)+'</b></div><div><small>期限切れ</small><b>'+h(counts.expired||0)+'</b></div><div><small>投稿済み</small><b>'+h(counts.posted||0)+'</b></div>';
    document.querySelectorAll('[data-x-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.xTab===X.state.tab));
    const rows=X.active();
    by('xList').innerHTML=rows.length?rows.map(X.card).join(''):'<div class="x-empty"><b>'+h(labels[X.state.tab])+'はありません。</b></div>';
    X.bind();
  };
  const loadWithWorkflow=X.load;
  X.load=async()=>{
    await loadWithWorkflow();
    if(!X.state.items.some(item=>viewStatus(item)===X.state.tab)){
      X.state.tab=['candidate','draft','approved','inbox','expired','posted','rejected'].find(key=>X.state.items.some(item=>viewStatus(item)===key))||'candidate';
      X.render();
    }
  };
  X.status=async(id,status,button)=>{
    let decisionReason;
    if(status==='rejected'){
      decisionReason=prompt('見送り理由（次の候補選びに使います）','');
      if(decisionReason===null)return;
    }
    bump(button);
    try{
      const item=await X.patch({action:'status',id,status,decisionReason});
      X.state.tab=viewStatus(item);X.render();toast(labels[X.state.tab]+'へ移動しました','good');
    }catch(error){toast(error.message||'保存できませんでした','bad')}
  };
  X.generate=async(id,type,button)=>{
    bump(button);setStatus('XとThreadsの投稿案を作成中...',true);
    try{
      await X.patch({action:'generate',id,draftType:type});X.state.tab='draft';X.render();toast('XとThreadsの'+types[type]+'文を作成しました','good');setStatus('準備完了');
    }catch(error){toast(error.message||'作成できませんでした','bad');setStatus('入力待ち')}
  };
  X.clip=async(text,message,button)=>{
    if(!text)return;
    bump(button);
    try{await navigator.clipboard.writeText(text)}catch{const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}
    toast(message,'good');
  };
  X.copy=(id,platform,button)=>{
    const item=X.state.items.find(value=>value.id===id);
    const text=platform==='threads'?item?.threadsDraft:item?.xDraft;
    return X.clip(text,(platform==='threads'?'Threads':'X')+'の投稿文をコピーしました',button);
  };
  X.publish=async(id,platform,button)=>{
    const label=platform==='threads'?'Threads':'X';
    const postedUrl=prompt(label+'の投稿URL（空欄でも記録できます）','');
    if(postedUrl===null)return;
    bump(button);
    try{const item=await X.patch({action:'publish',id,platform,postedUrl});X.state.tab=viewStatus(item);X.render();toast(label+'を投稿済みにしました','good')}
    catch(error){toast(error.message||'保存できませんでした','bad')}
  };
  X.bind=()=>{
    document.querySelectorAll('[data-xs]').forEach(button=>button.onclick=()=>X.status(button.dataset.id,button.dataset.xs,button));
    document.querySelectorAll('[data-xg]').forEach(button=>button.onclick=()=>X.generate(button.dataset.id,button.dataset.xg,button));
    document.querySelectorAll('[data-xcopy]').forEach(button=>button.onclick=()=>X.copy(button.dataset.xcopy,button.dataset.platform||'x',button));
    document.querySelectorAll('[data-xedit]').forEach(button=>button.onclick=()=>X.openEditor(X.state.items.find(item=>item.id===button.dataset.xedit)));
    document.querySelectorAll('[data-xposted]').forEach(button=>button.onclick=()=>X.publish(button.dataset.xposted,button.dataset.platform,button));
    document.querySelectorAll('[data-wf-verify]').forEach(button=>button.onclick=()=>{const item=X.state.items.find(value=>String(value.id)===button.dataset.wfVerify);if(item)window.CCWorkflow?.runVerification(item,button)});
    document.querySelectorAll('[data-wf-exec]').forEach(button=>button.onclick=()=>{const item=X.state.items.find(value=>String(value.id)===button.dataset.wfExec);if(item)window.CCWorkflow?.recordExecution(item,button)});
    document.querySelectorAll('[data-wf-audit]').forEach(button=>button.onclick=()=>{const item=X.state.items.find(value=>String(value.id)===button.dataset.wfAudit);if(item)window.CCWorkflow?.audit(item,'pass',button)});
    document.querySelectorAll('[data-wf-audit-ng]').forEach(button=>button.onclick=()=>{const item=X.state.items.find(value=>String(value.id)===button.dataset.wfAuditNg);if(item)window.CCWorkflow?.audit(item,'fail',button)});
    document.querySelectorAll('[data-wf-recheck]').forEach(button=>button.onclick=()=>{const item=X.state.items.find(value=>String(value.id)===button.dataset.wfRecheck);if(item)window.CCWorkflow?.resetVerification(item,button)});
  };

  const modal=by('xEditor');
  if(!modal)return;
  modal.innerHTML='<section class="x-editor"><div class="title-bar"><span>カード投稿 - 詳細・編集</span><button class="win-control" type="button" id="xClose">×</button></div><form id="xForm"><input type="hidden" id="xeId"><div class="x-form"><label>商品名<input id="xeProduct" required></label><label>店舗・主催<input id="xeOrganizer"></label><label>優先度<select id="xePriority"><option>A</option><option>B</option><option>C</option><option>S</option></select></label><label>点数<input id="xeScore" type="number" min="0" max="100"></label><label>カード種別<select id="xeFranchise"><option value="pokemon">ポケモン</option><option value="onepiece">ONE PIECE</option><option value="yugioh">遊戯王</option><option value="duelmasters">デュエル・マスターズ</option><option value="gundam">ガンダム</option><option value="dragonball">ドラゴンボール</option><option value="lorcana">ロルカナ</option><option value="unionarena">UNION ARENA</option><option value="weiss">ヴァイス</option><option value="hololive">hololive</option><option value="digimon">デジモン</option><option value="mtg">MTG</option><option value="fftcg">FFTCG</option><option value="other">その他</option></select></label><label>案件種別<select id="xeCategory"><option value="card_lottery">抽選</option><option value="card_reservation">予約</option><option value="card_stock">在庫</option><option value="card_bonus">特典</option><option value="card_sale">販売</option><option value="card_giveaway">配布</option><option value="card_oripa">オリパ</option><option value="other">その他</option></select></label><label>締切<input id="xeDeadline" type="datetime-local"></label><label>対象地域<input id="xeRegion"></label><label class="wide">応募条件<textarea id="xeConditions"></textarea></label><label class="wide">応募URL<input id="xeApply" type="url"></label><label class="wide">公式URL<input id="xeOfficial" type="url"></label><label>公式確認<select id="xeVerified"><option value="false">未確認</option><option value="true">確認済み</option></select></label><label>公式確認日時<input id="xeOfficialChecked" type="datetime-local"></label><label class="wide">公式確認メモ<input id="xeOfficialNote" placeholder="商品名・締切・条件・対象地域を確認"></label><label>発見元<input id="xeDiscoverySource" placeholder="トレゲト / CARD VALUE など"></label><label>発見元URL<input id="xeDiscovery" type="url"></label><label class="wide">投稿に使える一言<input id="xeValueHook" placeholder="例：これ天野さんのやつやん / スニダンもう2倍超え"></label><label>一言の種類<select id="xeValueKind"><option value="">なし</option><option value="official_feature">公式の特徴</option><option value="listing_price">出品価格</option><option value="sold_price">成約価格</option><option value="scarcity">希少性</option><option value="other">その他</option></select></label><label>一言の確認日時<input id="xeValueChecked" type="datetime-local"></label><label class="wide">一言の根拠URL<input id="xeValueSource" type="url"></label><label>アフィ導線<select id="xeAffiliateStatus"><option value="check">要確認</option><option value="available">あり</option><option value="none">なし</option></select></label><label>アフィURL<input id="xeAffiliate" type="url"></label><label class="wide">X投稿文<textarea id="xeDraft" class="x-draft-edit"></textarea><small id="xeChars">0 / 280</small></label><label class="wide">Threads投稿文<textarea id="xeThreadsDraft" class="x-draft-edit"></textarea><small id="xeThreadsChars">0 / 500</small></label><label class="wide">書き直した理由（任意）<input id="xeEditReason" placeholder="例：語尾を普段の言い方に変更"></label><label class="wide">自分用メモ<textarea id="xeNote"></textarea></label></div><div class="x-editor-actions"><button class="push-button" type="button" id="xeCopyX">Xをコピー</button><button class="push-button" type="button" id="xeCopyThreads">Threadsをコピー</button><span></span><button class="push-button" type="button" id="xeCancel">閉じる</button><button class="push-button x-main" type="submit">保存</button></div></form></section>';

  const value=id=>by(id)?.value||'';
  const set=(id,next)=>{if(by(id))by(id).value=next??''};
  const local=next=>{if(!next)return'';const d=new Date(next),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
  X.chars=()=>{
    const xCount=X.twitterLength(value('xeDraft'));
    const threadsCount=Array.from(value('xeThreadsDraft')).length;
    by('xeChars').textContent=xCount+' / 280（X換算）';by('xeThreadsChars').textContent=threadsCount+' / 500';
    by('xeChars').classList.toggle('over',xCount>280);by('xeThreadsChars').classList.toggle('over',threadsCount>500);
  };
  X.openEditor=item=>{
    set('xeId',item?.id);set('xeProduct',item?.productName);set('xeOrganizer',item?.organizer);set('xePriority',item?.priority||'B');set('xeScore',item?.score||0);set('xeFranchise',item?.franchise||'other');set('xeCategory',item?.category||'card_lottery');set('xeDeadline',local(item?.applicationDeadline));set('xeRegion',item?.targetRegion);set('xeConditions',item?.conditions);set('xeApply',item?.applicationUrl);set('xeOfficial',item?.officialUrl);set('xeVerified',String(!!item?.officialVerified));set('xeOfficialChecked',local(item?.officialCheckedAt));set('xeOfficialNote',item?.officialCheckNote);set('xeDiscoverySource',item?.discoverySource);set('xeDiscovery',item?.discoveryUrl);set('xeValueHook',item?.valueHook);set('xeValueKind',item?.valueHookKind);set('xeValueChecked',local(item?.valueHookCheckedAt));set('xeValueSource',item?.valueHookSourceUrl);set('xeAffiliateStatus',item?.affiliateStatus||'check');set('xeAffiliate',item?.affiliateUrl);set('xeDraft',item?.xDraft);set('xeThreadsDraft',item?.threadsDraft);set('xeEditReason','');set('xeNote',item?.userNote);X.chars();modal.classList.add('open');
  };
  by('xAdd').onclick=()=>X.openEditor(null);
  X.close=()=>modal.classList.remove('open');
  by('xeDraft').oninput=X.chars;by('xeThreadsDraft').oninput=X.chars;by('xClose').onclick=X.close;by('xeCancel').onclick=X.close;
  by('xeCopyX').onclick=()=>X.clip(value('xeDraft'),'Xの投稿文をコピーしました',by('xeCopyX'));
  by('xeCopyThreads').onclick=()=>X.clip(value('xeThreadsDraft'),'Threadsの投稿文をコピーしました',by('xeCopyThreads'));
  by('xForm').onsubmit=async event=>{
    event.preventDefault();
    const id=value('xeId');
    const candidate={productName:value('xeProduct'),organizer:value('xeOrganizer'),priority:value('xePriority'),score:value('xeScore'),franchise:value('xeFranchise'),category:value('xeCategory'),applicationDeadline:value('xeDeadline')?new Date(value('xeDeadline')).toISOString():null,targetRegion:value('xeRegion'),conditions:value('xeConditions'),applicationUrl:value('xeApply'),officialUrl:value('xeOfficial'),officialVerified:value('xeVerified')==='true',officialCheckedAt:value('xeOfficialChecked')?new Date(value('xeOfficialChecked')).toISOString():null,officialCheckNote:value('xeOfficialNote'),discoverySource:value('xeDiscoverySource'),discoveryUrl:value('xeDiscovery'),valueHook:value('xeValueHook'),valueHookKind:value('xeValueKind'),valueHookCheckedAt:value('xeValueChecked')?new Date(value('xeValueChecked')).toISOString():null,valueHookSourceUrl:value('xeValueSource'),affiliateStatus:value('xeAffiliateStatus'),affiliateUrl:value('xeAffiliate'),xDraft:value('xeDraft'),threadsDraft:value('xeThreadsDraft'),userNote:value('xeNote')};
    try{
      const data=id?await X.request({method:'PATCH',headers:X.headers(),body:JSON.stringify({action:'save',id,candidate,editReason:value('xeEditReason')})}):await X.request({method:'POST',headers:X.headers(),body:JSON.stringify({candidate})});
      X.update(data.item);X.close();toast(data.reviewWarning?'保存しました（修正履歴のみ記録エラー）':'保存しました',data.reviewWarning?'bad':'good');
    }catch(error){toast(error.message||'保存できませんでした','bad')}
  };
})();
