(()=>{
  const X=window.CCX;
  if(!X||typeof X.card!=='function') return;

  const W=window.CCWorkflow={
    api:'https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-workflow-api',
    type:'card_lottery',
    states:new Map(),
    loading:false
  };
  const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusText={pending:'待',pass:'✓',fail:'×',blocked:'止',skipped:'—',ready:'→',done:'✓'};
  const stageLabels=[['discovered','発見'],['judgment','判定'],['verification','独立検証'],['execution','実行'],['audit','監査']];
  const now=()=>Date.now();
  const seedJudgment=x=>{
    if(x.status==='rejected')return'fail';
    if(!x.productName||!x.organizer||!x.applicationUrl)return'pending';
    return'pass';
  };
  W.headers=()=>({...authHeaders(),'Content-Type':'application/json'});
  W.request=async(options={})=>{const r=await fetch(W.api,{cache:'no-store',...options});if(r.status===401){authExpired();throw Error('認証期限切れ')}const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||('HTTP '+r.status));return d};
  W.putStates=states=>{(states||[]).forEach(s=>W.states.set(String(s.entityId),s))};
  W.ensure=async items=>{
    if(!items?.length)return;
    const d=await W.request({method:'POST',headers:W.headers(),body:JSON.stringify({action:'ensure',entityType:W.type,items:items.map(x=>({entityId:String(x.id),judgmentStatus:seedJudgment(x)}))})});
    W.putStates(d.states);
  };
  W.get=x=>W.states.get(String(x.id))||{entityType:W.type,entityId:String(x.id),discovered:'pass',judgment:seedJudgment(x),verification:'pending',execution:'pending',audit:'pending'};
  W.patch=async(x,stage,status,extra={})=>{
    const d=await W.request({method:'PATCH',headers:W.headers(),body:JSON.stringify({entityType:W.type,entityId:String(x.id),stage,status,judgmentSeed:seedJudgment(x),...extra})});
    W.states.set(String(x.id),d.state);return d.state;
  };
  W.verifyChecks=x=>{
    const checks=[];
    checks.push([!!x.productName,'商品名']);
    checks.push([!!x.organizer,'主催']);
    checks.push([/^https?:\/\//i.test(String(x.applicationUrl||'')),'応募URL']);
    checks.push([/^https?:\/\//i.test(String(x.officialUrl||'')),'公式URL']);
    const cond=String(x.conditions||'').trim();
    checks.push([!!cond&&!/(未確認|最終確認)/.test(cond),'応募条件']);
    if(x.applicationDeadline){const t=new Date(x.applicationDeadline).getTime();checks.push([Number.isFinite(t)&&t>now(),'締切']);}
    const bad=checks.filter(v=>!v[0]).map(v=>v[1]);
    const a=typeof X.applicationAutomation==='function'?X.applicationAutomation(x):null;
    const note=(bad.length?'NG: '+bad.join('・'):'PASS: 商品/主催/URL/条件/締切を独立確認')+(a?` / 自動入力:${a.label}`:'');
    return {ok:bad.length===0,note};
  };
  W.runVerification=async(x,b)=>{bump(b);setStatus('独立検証中...',true);try{const r=W.verifyChecks(x);await W.patch(x,'verification',r.ok?'pass':'fail',{note:r.note});X.render();toast(r.ok?'独立検証 PASS':'独立検証 NG',r.ok?'good':'bad');setStatus('準備完了')}catch(err){toast(err.message||'検証できませんでした','bad');setStatus('入力待ち')}};
  W.recordExecution=async(x,b)=>{const s=W.get(x);if(s.verification!=='pass'){toast('先に独立検証をPASSしてください','bad');return}const evidence=prompt('実行の証拠を入力\n例：応募完了画面を確認／応募完了メールを受信','応募完了画面を確認');if(evidence===null)return;bump(b);try{await W.patch(x,'execution','done',{note:'実行済みとして記録',evidenceNote:String(evidence).trim()||null});X.render();toast('実行済みにしました','good')}catch(err){toast(err.message||'保存できませんでした','bad')}};
  W.audit=async(x,status,b)=>{bump(b);try{const s=W.get(x);const note=status==='pass'?'実行証拠を別工程で確認':'監査で不一致を検出';await W.patch(x,'audit',status,{note,evidenceNote:s.evidenceNote||null,evidenceUrl:s.evidenceUrl||null});X.render();toast(status==='pass'?'監査 PASS':'監査 NG',status==='pass'?'good':'bad')}catch(err){toast(err.message==='evidence_required_for_audit'?'証拠がないため監査PASSにできません':(err.message||'監査できませんでした'),'bad')}};
  W.resetVerification=async(x,b)=>{bump(b);try{await W.patch(x,'verification','pending',{note:'再検証待ち'});X.render();toast('再検証待ちに戻しました','good')}catch(err){toast(err.message||'戻せませんでした','bad')}};
  W.panel=x=>{
    const s=W.get(x),steps=stageLabels.map(([k,label])=>{const st=s[k]||'pending';return '<div class="wf-step '+esc2(st)+'"><small>'+esc2(label)+'</small><b>'+esc2(statusText[st]||st)+'</b></div>'}).join('<span class="wf-arrow">›</span>');
    let actions='';
    if(s.judgment==='pass'&&s.verification!=='pass')actions+='<button class="push-button small wf-verify" data-wf-verify="'+esc2(x.id)+'">独立検証</button>';
    if(s.verification==='pass'&&s.execution!=='done')actions+='<button class="push-button small" data-wf-exec="'+esc2(x.id)+'">実行済みを記録</button>';
    if(s.execution==='done'&&s.audit!=='pass')actions+='<button class="push-button small wf-audit" data-wf-audit="'+esc2(x.id)+'">監査PASS</button><button class="push-button small" data-wf-audit-ng="'+esc2(x.id)+'">監査NG</button>';
    if(s.verification==='pass'&&s.execution==='done'&&s.audit==='pass')actions+='<span class="wf-complete">完了：実行＋証拠確認済み</span>';
    if(s.verification==='fail')actions+='<button class="push-button small" data-wf-recheck="'+esc2(x.id)+'">再検証</button>';
    const notes=[s.verificationNote?('検証: '+s.verificationNote):'',s.evidenceNote?('証拠: '+s.evidenceNote):'',s.auditNote?('監査: '+s.auditNote):''].filter(Boolean).join(' ／ ');
    return '<section class="wf-panel"><div class="wf-title"><b>AI工程</b><span>作る役と検品する役を分離</span></div><div class="wf-steps">'+steps+'</div>'+(notes?'<div class="wf-note">'+esc2(notes)+'</div>':'')+(actions?'<div class="wf-actions">'+actions+'</div>':'')+'<div class="wf-foot">「完了」は監査PASSまで付かない。実行役の自己申告だけでは完了扱いにしません。</div></section>';
  };

  const style=document.createElement('style');
  style.textContent=`
    .wf-panel{margin:9px 0 10px;padding:8px;background:#d4d0c8;color:#111;border:2px solid;border-color:#fff #808080 #808080 #fff;box-shadow:inset -1px -1px #000}
    .wf-title{display:flex;gap:10px;align-items:baseline;margin-bottom:6px}.wf-title b{font-size:13px}.wf-title span,.wf-foot,.wf-note{font-size:11px;color:#555}
    .wf-steps{display:flex;align-items:center;gap:4px;overflow-x:auto;padding-bottom:2px}.wf-step{min-width:58px;padding:4px 6px;text-align:center;background:#f4f4f4;border:1px solid #808080}.wf-step small{display:block;font-size:10px}.wf-step b{font-size:14px}.wf-step.pass,.wf-step.done{background:#d9ffd9}.wf-step.ready{background:#fff3bf}.wf-step.fail{background:#ffd7d7}.wf-step.blocked{background:#e5e5e5;color:#777}.wf-arrow{font-weight:700;color:#555}
    .wf-note{margin-top:6px;padding:5px;background:#fff;border:1px inset #aaa;line-height:1.4}.wf-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.wf-actions .wf-verify,.wf-actions .wf-audit{font-weight:700}.wf-complete{font-size:11px;font-weight:700;padding:4px 7px;background:#d9ffd9;border:1px solid #808080}.wf-foot{margin-top:6px}
    @media(max-width:700px){.wf-title{display:block}.wf-step{min-width:52px}.wf-foot{line-height:1.35}}
  `;
  document.head.appendChild(style);

  const baseCard=X.card;
  X.card=x=>baseCard(x).replace('<table class="x-info">',W.panel(x)+'<table class="x-info">');
  const baseBind=X.bind;
  X.bind=()=>{baseBind();document.querySelectorAll('[data-wf-verify]').forEach(b=>b.onclick=()=>{const x=X.state.items.find(v=>String(v.id)===b.dataset.wfVerify);if(x)W.runVerification(x,b)});document.querySelectorAll('[data-wf-exec]').forEach(b=>b.onclick=()=>{const x=X.state.items.find(v=>String(v.id)===b.dataset.wfExec);if(x)W.recordExecution(x,b)});document.querySelectorAll('[data-wf-audit]').forEach(b=>b.onclick=()=>{const x=X.state.items.find(v=>String(v.id)===b.dataset.wfAudit);if(x)W.audit(x,'pass',b)});document.querySelectorAll('[data-wf-audit-ng]').forEach(b=>b.onclick=()=>{const x=X.state.items.find(v=>String(v.id)===b.dataset.wfAuditNg);if(x)W.audit(x,'fail',b)});document.querySelectorAll('[data-wf-recheck]').forEach(b=>b.onclick=()=>{const x=X.state.items.find(v=>String(v.id)===b.dataset.wfRecheck);if(x)W.resetVerification(x,b)})};
  const baseLoad=X.load;
  X.load=async()=>{await baseLoad();if(W.loading)return;W.loading=true;try{await W.ensure(X.state.items);X.render()}catch(err){console.warn('workflow load failed',err);toast('AI工程を読み込めませんでした','bad')}finally{W.loading=false}};
  const intro=document.querySelector('#xHub .x-intro');if(intro)intro.insertAdjacentHTML('beforeend',' <b>発見→判定→独立検証→実行→監査の5工程で管理します。</b>');
})();