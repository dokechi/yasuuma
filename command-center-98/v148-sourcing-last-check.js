(()=>{
  if(typeof sourcingResultPanel!=='function'||typeof renderSourcing!=='function'||typeof sourcingResearchRecords!=='function'||typeof isReadySourcing!=='function')return;

  const W=window.CCSourcingWorkflow;
  if(!W||typeof W.verifyChecks!=='function')return;

  const R=window.CCSourcingLastCheck={
    api:W.api,
    type:'sourcing_research_check',
    states:new Map(),
    loading:false,
    lastSig:'',
    syncing:false
  };

  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const numeric=v=>{const n=typeof v==='string'?Number(v.replace(/[,￥¥円\s]/g,'')):Number(v);return Number.isFinite(n)?n:null};
  const pget=(p,keys)=>{for(const k of keys){const v=p?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return null};
  const safeLinks=v=>(Array.isArray(v)?v:[v]).map(x=>typeof safeHttpUrl==='function'?safeHttpUrl(x):null).filter(Boolean);

  R.entityId=x=>{
    const p=x?.payload||{};
    const raw=String(x?.id||x?.eventKey||p.candidate_key||((x?.taskId||signalTaskId?.(x)||'task')+':'+(x?.title||'item')));
    const cleaned=raw.replace(/[^a-zA-Z0-9_.:-]+/g,'_').slice(0,145);
    return 'research:'+(cleaned||'unknown');
  };
  R.state=x=>R.states.get(R.entityId(x))||null;
  R.payload=x=>{
    try{return typeof sourcingEvidence==='function'?sourcingEvidence(x):(x?.payload||{})}
    catch{return x?.payload||{}}
  };
  R.profit=x=>{
    const p=R.payload(x);
    return numeric(x?.impact??pget(p,['net_profit_yen','profit_yen','estimated_profit_yen','expected_profit_yen','想定純利益','利益']));
  };
  R.sold=x=>{
    const p=R.payload(x);
    const raw=p.mercari_sold_urls||p.mercari_new_sold_urls||p.mercari_new_sold_evidence_urls||p['mercari新品SOLD根拠URL']||[];
    const links=safeLinks(raw);
    const evidence=String(p.sales_evidence||p['成約根拠']||p.sell_through_evidence||'').trim();
    return {links,evidence,ok:links.length>0||!!evidence};
  };
  R.missingText=x=>{
    const p=R.payload(x);
    return String(p.missing_checks||p['未確認の条件']||p.next_action||x?.next||x?.summary||'').trim();
  };
  R.classify=x=>{
    const p=R.payload(x),fields=sourcingFields(x),sold=R.sold(x),profit=R.profit(x),text=R.missingText(x);
    const human=[];
    if(/在庫|即納|購入可能|買える|売り切れ|売切|取寄|取り寄せ|stock|availability|現(?:在|時点).{0,10}価格|価格.{0,10}現(?:在|時点)/i.test(text))human.push('stock');
    if(/同一商品|商品一致|同じ商品|型番|品番|sku|モデル.{0,8}(?:一致|同一)|サイズ.{0,8}(?:一致|同一)|(?:色|カラー).{0,8}(?:一致|同一)/i.test(text))human.push('match');
    if(/新品として|新品・未使用|未使用|展示品|タグ.{0,5}(?:欠|無)|状態|付属品|開封|箱.{0,6}(?:欠|傷)/i.test(text))human.push('condition');
    if(/sold|成約根拠|売れ行き|売れた|売却実績|販売実績/i.test(text))human.push('sold');
    const issues=uniq(human);
    const blockers=[];
    const url=typeof safeHttpUrl==='function'?safeHttpUrl(x?.url):null;
    const buy=numeric(fields.buy),sell=numeric(fields.sell);
    if(!url)blockers.push('商品URL');
    if(!(buy>0))blockers.push('仕入値');
    if(!(sell>0))blockers.push('メルカリ保守売価');
    if(!(profit>0))blockers.push('想定純利益');
    if(!sold.ok&&!issues.includes('sold'))blockers.push('新品SOLD根拠');
    if(/仕入送料|送料込み原価|発送費|送料.{0,8}(?:未|別途|確認|再計算)|shipping|手数料|原価.{0,8}(?:未|再計算)|利益.{0,8}(?:再計算|未確認|未確定)|roi.{0,8}(?:未|再計算)|保守売価.{0,8}(?:未|確認)/i.test(text))blockers.push('送料・利益計算');
    if(!text)blockers.push('確認内容');
    if(issues.length===0)blockers.push('人間確認を1点に特定');
    if(issues.length>1)blockers.push('人間確認が'+issues.length+'点');
    const ready=issues.length===1&&blockers.length===0;
    return {ready,type:issues[0]||null,issues,blockers:uniq(blockers),text,fields,sold,profit,p};
  };
  R.question=(x,c)=>{
    const buy=numeric(c.fields.buy);
    const price=buy>0?' '+sourcingMoney(buy):'';
    if(c.type==='stock')return '現在、表示価格'+price+'で実際に購入できますか？';
    if(c.type==='match')return '参照先は、成約根拠と同じ商品・サイズ・色ですか？';
    if(c.type==='condition')return '新品・未使用としてメルカリで販売できる状態ですか？';
    if(c.type==='sold')return '同条件の「新品SOLD」を実際に確認できますか？';
    return 'この1条件を確認できますか？';
  };
  R.buttons=c=>{
    if(c.type==='match')return ['同じ商品','確認できない','商品が違う'];
    if(c.type==='condition')return ['新品で売れる','新品ではない','商品が違う'];
    if(c.type==='sold')return ['SOLD確認できた','SOLD確認できない','商品が違う'];
    return ['今も買える','買えない','商品が違う'];
  };
  R.matchCandidate=x=>{
    const direct=sourcingApp.items.find(v=>String(v.id)===String(x.id));
    if(direct)return direct;
    const task=signalTaskId(x),url=normalizedProductUrl(x.url);
    return sourcingApp.items.find(v=>task&&signalTaskId(v)===task&&url&&normalizedProductUrl(v.url)===url)||null;
  };
  R.promoted=x=>{
    const s=R.state(x);
    return !!s&&s.verification==='pass'&&s.execution==='done';
  };

  const baseReady=isReadySourcing;
  isReadySourcing=function(x){
    if(baseReady(x))return true;
    if(x?.sourcingVerdict||(x?.reviewState||'new')!=='new')return false;
    return R.promoted(x);
  };

  R.request=async(url,options={})=>{
    const r=await fetch(url,{cache:'no-store',...options,headers:{...authHeaders(),...(options.headers||{})}});
    if(r.status===401){authExpired();throw Error('認証期限切れ')}
    const d=await r.json();
    if(!r.ok||!d?.ok)throw Error(d?.error||('HTTP '+r.status));
    return d;
  };
  R.patch=async(x,stage,status,extra={})=>{
    const d=await R.request(R.api,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityType:R.type,entityId:R.entityId(x),stage,status,judgmentSeed:R.classify(x).ready?'pass':'pending',...extra})});
    R.states.set(R.entityId(x),d.state);return d.state;
  };
  R.ensure=async records=>{
    if(!records.length)return;
    const d=await R.request(R.api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ensure',entityType:R.type,items:records.slice(0,400).map(x=>({entityId:R.entityId(x),judgmentStatus:R.classify(x).ready?'pass':'pending'}))})});
    (d.states||[]).forEach(s=>R.states.set(String(s.entityId),s));
  };

  R.audit=x=>{
    const c=R.classify(x);
    const clone={...x,impact:c.profit,payload:{...(x.payload||{}),missing_checks:'なし','未確認の条件':'なし'}};
    const r=W.verifyChecks(clone);
    return {ok:r.ok,note:r.note};
  };
  R.syncCandidate=async(x,audit)=>{
    if(!x||!audit?.ok)return;
    await W.ensure([x]);
    let s=W.get(x);
    if(s.judgment!=='pass'){await W.patch(x,'judgment','pass',{note:'追加調査：人間の最終1条件を確認済み'});s=W.get(x)}
    if(s.verification!=='pass')await W.patch(x,'verification','pass',{note:'追加調査PASS / '+audit.note});
  };
  R.finish=async(x,choice,btn)=>{
    if(app.busy)return;
    bump(btn);btn.disabled=true;
    const c=R.classify(x),candidate=R.matchCandidate(x);
    setStatus('追加調査の確認を保存中...',true);
    try{
      let s=R.state(x);
      if(!s||s.judgment!=='pass')s=await R.patch(x,'judgment','pass',{note:'AIが人間確認を1点まで絞り込み'});
      if(choice!=='ok'){
        const note=choice==='mismatch'?'human: 商品が違う':'human: 条件NG / '+R.question(x,c);
        await R.patch(x,'verification','fail',{note});
        toast(choice==='mismatch'?'商品違いとして処理しました':'条件NGとして処理しました','good');
        renderSourcing();renderStats();setStatus('準備完了');return;
      }
      await R.patch(x,'verification','pass',{note:'human: '+R.question(x,c)+' → OK'});
      const audit=R.audit(x);
      if(!audit.ok){
        await R.patch(x,'execution','fail',{note:'AI最終監査 NG: '+audit.note,evidenceNote:'人間確認済み'});
        toast('人間確認はOK。残りはAI側へ戻しました','good');
        renderSourcing();renderStats();setStatus('準備完了');return;
      }
      if(!candidate){
        await R.patch(x,'execution','ready',{note:'AI最終監査PASS。仕入れ候補本体の生成待ち',evidenceNote:'人間確認済み'});
        toast('確認完了。候補本体の生成待ちです','good');
        renderSourcing();renderStats();setStatus('準備完了');return;
      }
      await R.syncCandidate(candidate,audit);
      await R.patch(x,'execution','done',{note:'AI最終監査 PASS: '+audit.note,evidenceNote:'人間確認済み / 仕入れ判断へ移送'});
      sourcingApp.sub='queue';
      renderSourcing();renderStats();
      toast('最終監査PASS。仕入れ判断へ移動しました','good');
      setStatus('準備完了');
      setTimeout(()=>document.getElementById('sourcingBody')?.scrollIntoView({block:'start',behavior:'smooth'}),50);
    }catch(err){
      console.warn('sourcing last check failed',err);
      toast(err.message||'確認を保存できませんでした','bad');setStatus('保存エラー');
    }finally{btn.disabled=false}
  };

  R.evidenceHtml=(x,c)=>{
    const roi=c.fields.roi!==null?sourcingRoi(c.fields):(numeric(c.fields.buy)>0&&c.profit>0?(c.profit/numeric(c.fields.buy)*100).toLocaleString('ja-JP',{maximumFractionDigits:1})+'%':'未確認');
    const soldCount=c.sold.links.length;
    const soldText=c.sold.evidence||((soldCount?('根拠URL '+soldCount+'件'):'未確認'));
    return '<table class="last-check-meta"><tr><th>仕入値</th><td>'+sourcingMoney(c.fields.buy)+'</td><th>保守売価</th><td>'+sourcingMoney(c.fields.sell)+'</td></tr><tr><th>想定利益</th><td class="profit">'+(c.profit>0?yen(c.profit):'未確認')+'</td><th>ROI</th><td>'+h(roi)+'</td></tr><tr><th>新品SOLD</th><td colspan="3">'+h(soldText)+'</td></tr></table>';
  };
  R.card=x=>{
    const c=R.classify(x),labels=R.buttons(c),url=safeHttpUrl(x.url),soldLinks=c.sold.links;
    return '<article class="last-check-card" data-last-check-id="'+h(R.entityId(x))+'"><div class="last-check-head"><span class="last-check-badge">確認 1点</span><b>'+h(x.title||'商品')+'</b><span>'+h(fmtDate(x.occurredAt||x.lastSeen))+'</span></div><div class="last-check-body">'+taskOriginHtml(x)+'<div class="last-check-status"><b>AI判定：あと1点確認</b><span>ここだけ見ればOK</span></div><p class="last-check-question">'+h(R.question(x,c))+'</p>'+R.evidenceHtml(x,c)+'<div class="last-check-links">'+(url?'<a href="'+h(url)+'" target="_blank" rel="noopener">商品ページを開く</a>':'')+soldLinks.slice(0,3).map((u,i)=>'<a href="'+h(u)+'" target="_blank" rel="noopener">SOLD根拠 '+(i+1)+'</a>').join('')+'</div><div class="last-check-actions"><button class="push-button last-check-ok" data-last-choice="ok" data-record="'+h(R.entityId(x))+'">'+h(labels[0])+'</button><button class="push-button" data-last-choice="ng" data-record="'+h(R.entityId(x))+'">'+h(labels[1])+'</button><button class="push-button" data-last-choice="mismatch" data-record="'+h(R.entityId(x))+'">'+h(labels[2])+'</button></div></div></article>';
  };
  R.pendingReason=(x,c,s)=>{
    if(s?.verification==='pass'&&s.execution==='fail')return '人間確認済み。AI最終監査で不足：'+(s.executionNote||'追加根拠が必要');
    if(s?.verification==='pass'&&s.execution==='ready')return '人間確認済み。仕入れ候補本体の生成待ち';
    return c.blockers.length?c.blockers.join('・'):(c.text||'条件の再整理が必要');
  };
  R.panel=()=>{
    const records=sourcingResearchRecords('research');
    const ready=[],pending=[],done=[];
    for(const x of records){
      const c=R.classify(x),s=R.state(x);
      if(R.promoted(x))continue;
      if(c.ready&&(!s||s.verification==='pending'))ready.push(x);
      else if(s?.verification==='fail')done.push(x);
      else pending.push({x,c,s});
    }
    const intro='<div class="last-check-intro"><b>ここで判断するのは1つだけ。</b> 「この商品を最終仕入れ監査へ進めていいか」。AIが調べ切れない最後の1条件だけ確認してください。<br><small>複数条件・送料・利益計算・SOLD根拠などが残る商品は、下の「AI側で未完了」に置き、あなたの判断対象から外します。</small></div>';
    const human=ready.length?'<div class="last-check-caption"><b>あなたの確認待ち</b><span>'+ready.length+'件</span></div><div class="last-check-grid">'+ready.map(R.card).join('')+'</div>':'<div class="last-check-empty"><b>いま、あなたが確認する商品はありません。</b><br><small>AI側で1条件まで絞れた商品だけ、ここへ上がります。</small></div>';
    const ai='<details class="last-check-ai" '+(!ready.length&&pending.length?'open':'')+'><summary><b>AI側でまだ未完了 '+pending.length+'件</b> <span>ここは操作不要</span></summary>'+(pending.length?'<div class="last-check-ai-list">'+pending.map(({x,c,s})=>'<div class="last-check-ai-row"><b>'+h(x.title||'商品')+'</b><span>'+h(R.pendingReason(x,c,s))+'</span></div>').join('')+'</div>':'<p>なし</p>')+'</details>';
    const processed=done.length?'<details class="last-check-ai processed"><summary>確認済み・NG '+done.length+'件</summary><div class="last-check-ai-list">'+done.map(x=>'<div class="last-check-ai-row"><b>'+h(x.title||'商品')+'</b><span>'+h(R.state(x)?.verificationNote||'条件NG')+'</span></div>').join('')+'</div></details>':'';
    return '<div class="last-check-summary"><span><b>人間確認 '+ready.length+'</b></span><span>AI側未完了 '+pending.length+'</span></div>'+intro+human+ai+processed;
  };

  const basePanel=sourcingResultPanel;
  sourcingResultPanel=function(kind){return kind==='research'?R.panel():basePanel(kind)};

  R.bind=()=>{
    if(app.view!=='sourcing'||sourcingApp.sub!=='research')return;
    const byId=new Map(sourcingResearchRecords('research').map(x=>[R.entityId(x),x]));
    document.querySelectorAll('[data-last-choice]').forEach(btn=>btn.onclick=()=>{const x=byId.get(btn.dataset.record);if(x)R.finish(x,btn.dataset.lastChoice,btn)});
  };
  R.counts=()=>{
    if(!sourcingResults.loaded)return {human:null,ai:null};
    let human=0,ai=0;
    for(const x of sourcingResearchRecords('research')){
      const c=R.classify(x),s=R.state(x);
      if(R.promoted(x)||s?.verification==='fail')continue;
      if(c.ready&&(!s||s.verification==='pending'))human++;else ai++;
    }
    return {human,ai};
  };
  R.paintCounts=()=>{
    const c=R.counts();if(c.human===null)return;
    const tab=document.getElementById('sourcingResearchCount');if(tab)tab.textContent=c.human;
    if(app.view==='sourcing'){
      const k=document.getElementById('kpiCount');
      if(k&&document.getElementById('kpiLabelCount')?.textContent==='追加調査')k.innerHTML='<button class="kpi-sourcing-link" type="button" data-open-sourcing="research">'+c.human+'件</button>';
    }
  };
  R.loadStates=async()=>{
    if(R.loading||!sourcingResults.loaded)return;
    const records=sourcingResearchRecords('research');
    const sig=records.map(x=>R.entityId(x)).sort().join('|');
    if(sig===R.lastSig)return;
    R.loading=true;
    try{
      await R.ensure(records);
      R.lastSig=sig;
      const promoted=[];
      for(const x of records){
        const c=R.classify(x),s=R.state(x);
        if(c.ready&&s&&s.verification==='pending'&&s.judgment!=='pass')await R.patch(x,'judgment','pass',{note:'AIが人間確認を1点まで絞り込み'});
        if(s?.verification==='pass'&&s.execution==='done')promoted.push(x);
      }
      for(const x of promoted){const candidate=R.matchCandidate(x);if(candidate){const audit=R.audit(x);if(audit.ok)await R.syncCandidate(candidate,audit)}}
      renderSourcing();renderStats();
    }catch(err){console.warn('research check state load failed',err)}finally{R.loading=false}
  };

  const style=document.createElement('style');
  style.textContent=`
    .last-check-summary{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 7px;font-family:"MS Gothic",monospace}.last-check-summary span{padding:5px 8px;background:#fff;border:1px solid #808080}.last-check-summary b{color:#000080}
    .last-check-intro{background:#fff6b5;border:1px solid #9b8e51;padding:9px 10px;margin-bottom:9px;font-size:12px;line-height:1.55}.last-check-intro b{font-size:14px}.last-check-intro small{color:#555}
    .last-check-caption{display:flex;justify-content:space-between;align-items:center;margin:7px 1px;font-family:"MS Gothic",monospace}.last-check-grid{display:grid;gap:9px}.last-check-card{background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;box-shadow:inset -1px -1px #808080,inset 1px 1px #dfdfdf}.last-check-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:6px 8px;background:#e7e7e7;border-bottom:1px solid #808080;font-family:"MS Gothic",monospace}.last-check-head b{flex:1;min-width:260px}.last-check-badge{background:#000080;color:#fff;padding:2px 6px;font-weight:700}.last-check-body{background:#fff;padding:11px 12px}.last-check-status{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:7px}.last-check-status b{font-size:16px}.last-check-status span{font-size:11px;color:#006000;font-weight:700}.last-check-question{font-size:18px;font-weight:800;margin:8px 0 10px}.last-check-meta{width:100%;border-collapse:collapse;font-size:12px}.last-check-meta th,.last-check-meta td{border:1px solid #aaa;padding:5px 7px}.last-check-meta th{width:90px;background:#eee;text-align:left;font-weight:400}.last-check-meta .profit{color:#a40000;font-weight:900}.last-check-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:12px}.last-check-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.last-check-actions .last-check-ok{font-weight:800}.last-check-actions .last-check-ok:active{background:#b8d8b8}.last-check-empty{padding:26px 18px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;text-align:center;line-height:1.6}.last-check-ai{margin-top:10px;background:#fff;border:1px solid #808080}.last-check-ai>summary{cursor:pointer;padding:8px;background:#e7e7e7}.last-check-ai>summary span{font-size:11px;color:#555;margin-left:8px}.last-check-ai-list{display:grid}.last-check-ai-row{display:grid;grid-template-columns:minmax(240px,.8fr) 1.2fr;gap:10px;padding:7px 9px;border-top:1px solid #ddd;font-size:12px}.last-check-ai-row span{color:#555}.last-check-ai.processed{opacity:.8}
    @media(max-width:700px){.last-check-question{font-size:16px}.last-check-head b{min-width:180px}.last-check-ai-row{grid-template-columns:1fr}.last-check-actions .push-button{min-height:44px;flex:1 1 120px}.last-check-meta th{width:76px}}
  `;
  document.head.appendChild(style);

  const baseRender=renderSourcing;
  renderSourcing=function(){
    baseRender();
    R.bind();R.paintCounts();
    if(app.view==='sourcing'&&sourcingResults.loaded)R.loadStates();
  };
})();