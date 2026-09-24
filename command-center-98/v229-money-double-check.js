/* Money Chat production double-check: logic coherence + institutional accuracy.
 * New Money Chat candidates after cutover must pass this review against the exact LOCK snapshot.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCMoneyLogicReview) return;
  root.CCMoneyLogicReview = api;
  api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const VERSION = '229.1';
  const TASK_ID = '6aa9ee1043388191a2eac3bb2702092a';
  const CONTRACT_VERSION = 'money-logic-institution-review-v1-20260925';
  const CUTOVER_MS = Date.parse('2026-09-24T21:34:00Z');
  const PRIMARY = new Set(['primary','official','government','law','regulator','ministry','municipality','official_company','official_organization','official_institution','public_statistics','issuer_official','manufacturer_official','financial_institution_official','institution_official']);
  const list = v => Array.isArray(v) ? v : [];
  const text = v => String(v ?? '').trim();
  const unique = xs => [...new Set(xs.filter(Boolean))];
  const escape = v => text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
  }
  function payload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const p = Object.prototype.hasOwnProperty.call(value,'payload') ? value.payload : value;
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  }
  function applies(value) {
    const p=payload(value);
    if (p.execution_source === 'work' || p.execution_channel === 'work') return false;
    if ((p.execution_source || p.execution_channel) !== 'chat') return false;
    if (p.source_task_id && p.source_task_id !== TASK_ID) return false;
    return p.content_type === 'fp_post_candidate' && (p.source_task_id===TASK_ID || p.adaptive_scope==='money_chat');
  }
  function required(value) {
    const p=payload(value);
    if (!applies(p)) return false;
    if (text(p.logic_review_contract_version)===CONTRACT_VERSION) return true;
    const started=Date.parse(text(p.research_started_at));
    return Number.isFinite(started) && started>=CUTOVER_MS;
  }
  function reviewIssues(value) {
    const p=payload(value),issues=[];
    if(!required(p)) return issues;
    if(text(p.logic_review_contract_version)!==CONTRACT_VERSION){
      return ['お金Chatの制度・理屈ダブルチェック契約が未保存'];
    }
    const r=p.logic_institution_review;
    if(!r || typeof r!=='object' || Array.isArray(r)) return ['制度・理屈ダブルチェック結果が未保存'];
    if(text(r.status)!=='passed') issues.push('制度・理屈ダブルチェックがpassedではない');
    if(!text(r.checked_at)) issues.push('制度・理屈ダブルチェック日時が未保存');
    if(!text(r.checked_revision)) issues.push('制度・理屈ダブルチェック対象の原稿版が未保存');
    else if(text(p.draft_revision) && text(r.checked_revision)!==text(p.draft_revision)) issues.push('制度・理屈ダブルチェック後に原稿版が変更されている');
    if(text(r.logic_verdict)!=='passed') issues.push('論理整合性チェックがpassedではない');
    const institution=text(r.institution_verdict);
    if(!['passed','not_applicable'].includes(institution)) issues.push('制度確認の判定が未保存');
    if(!text(r.conclusion)) issues.push('制度・理屈ダブルチェックの結論が未保存');
    if(list(r.unresolved_items).length) issues.push('制度・理屈ダブルチェックに未解決事項が残っている');
    const checks=r.checks||{};
    if(text(checks.logic_consistency)!=='passed') issues.push('論理のつながり確認がpassedではない');
    if(text(checks.source_freshness)!=='passed') issues.push('一次情報の鮮度確認がpassedではない');
    if(institution==='passed'){
      for(const key of ['institution_accuracy','dates_thresholds','conditions_exceptions']){
        if(text(checks[key])!=='passed') issues.push('制度確認 '+key+' がpassedではない');
      }
      const refs=list(r.official_source_refs).map(text).filter(Boolean);
      if(!refs.length) issues.push('制度確認に使った一次情報source_refが未保存');
      const sourceMap=new Map(list(p.draft_sources).map(source=>[text(source?.id),source]));
      for(const ref of refs){
        const source=sourceMap.get(ref);
        if(!source) issues.push('制度確認source_ref '+ref+' がdraft_sourcesに存在しない');
        else if(!PRIMARY.has(text(source?.source_type).toLowerCase())) issues.push('制度確認source_ref '+ref+' が一次情報ではない');
      }
    }
    if(text(p.entrance_contract_version)==='money-entrance-v1-20260924'){
      const reviewed=new Set(list(r.reviewed_entrances).map(v=>text(v).toLowerCase()));
      for(const key of ['michael','marina','ben']) if(!reviewed.has(key)) issues.push('制度・理屈ダブルチェックで入口案'+key+'が未確認');
    }
    if(!r.reviewed_snapshot || typeof r.reviewed_snapshot!=='object' || Array.isArray(r.reviewed_snapshot)){
      issues.push('制度・理屈ダブルチェックのreviewed_snapshotが未保存');
    }else if(!p.content_lock?.snapshot || stable(r.reviewed_snapshot)!==stable(p.content_lock.snapshot)){
      issues.push('制度・理屈ダブルチェックが現在のLOCK snapshotを照合していない');
    }
    return unique(issues);
  }
  function reviewLines(value) {
    const p=payload(value),r=p.logic_institution_review||{};
    if(!required(p)) return [];
    return [
      '【制度・理屈ダブルチェック】',
      '状態: '+(text(r.status)||'未確認'),
      '論理: '+(text(r.logic_verdict)||'未確認'),
      '制度: '+(text(r.institution_verdict)==='not_applicable'?'対象外':(text(r.institution_verdict)||'未確認')),
      '一次情報鮮度: '+(text(r.checks?.source_freshness)||'未確認'),
      '確認日時: '+(text(r.checked_at)||'未保存'),
      '確認原稿版: '+(text(r.checked_revision)||'未保存'),
      '結論: '+(text(r.conclusion)||'未保存'),
      ...(list(r.corrections).length?['修正: '+list(r.corrections).join('／')]:[]),
      ...(list(r.unresolved_items).length?['未解決: '+list(r.unresolved_items).join('／')]:[])
    ];
  }
  function install(root) {
    const adaptive=root.CCAdaptiveCarousel,pipe=root.__fpContentPipeline||root.__carouselContentPipeline,doc=root.document;
    if(adaptive && !adaptive.__moneyLogicReview229){
      const baseQuality=adaptive.quality;
      adaptive.quality=function(value,base){
        const q=typeof baseQuality==='function'?baseQuality(value,base):{ready:true,issues:[]};
        const issues=unique([...(Array.isArray(q?.issues)?q.issues:[]),...reviewIssues(value)]);
        return {ready:issues.length===0,issues};
      };
      adaptive.__moneyLogicReview229=true;
    }
    if(pipe && !pipe.__moneyLogicReview229){
      const baseQuality=pipe.packageQuality;
      const baseCopy=pipe.buildDraftCopy;
      if(typeof baseQuality==='function') pipe.packageQuality=function(value){
        const q=baseQuality.apply(this,arguments)||{ready:true,issues:[]};
        const issues=unique([...(Array.isArray(q.issues)?q.issues:[]),...reviewIssues(value)]);
        return {...q,ready:issues.length===0,issues};
      };
      if(typeof baseCopy==='function') pipe.buildDraftCopy=function(value){
        const base=baseCopy.apply(this,arguments),lines=reviewLines(value);
        return lines.length?base+'\n\n'+lines.join('\n'):base;
      };
      pipe.__moneyLogicReview229=true;
    }
    if(doc.__moneyLogicReview229) return;
    doc.__moneyLogicReview229=true;
    const lookup=id=>{
      let rows=[];try{rows=typeof app!=='undefined'?(app.items||[]):(root.app?.items||[])}catch(_){}
      return rows.find(row=>String(row.id)===String(id));
    };
    const render=modal=>{
      const id=modal.querySelector('[data-fp-copy-draft]')?.dataset.fpCopyDraft||modal.querySelector('[data-fp-copy-package]')?.dataset.fpCopyPackage;
      const item=lookup(id);if(!item||!required(item))return;
      const r=payload(item).logic_institution_review||{},issues=reviewIssues(item);
      let panel=modal.querySelector('[data-money-logic-review]');
      if(!panel){panel=doc.createElement('section');panel.dataset.moneyLogicReview='1';panel.className='fp-money-logic-review';const target=modal.querySelector('[data-money-structure]')||modal.querySelector('.fp-preflight');target?.insertAdjacentElement(target?.matches?.('[data-money-structure]')?'afterend':'beforebegin',panel);}
      if(!panel)return;
      panel.classList.toggle('passed',issues.length===0);panel.classList.toggle('blocked',issues.length>0);
      panel.innerHTML='<h4>制度・理屈ダブルチェック</h4><div class="fp-logic-grid"><b>論理</b><span>'+escape(text(r.logic_verdict)||'未確認')+'</span><b>制度</b><span>'+escape(text(r.institution_verdict)==='not_applicable'?'対象外':(text(r.institution_verdict)||'未確認'))+'</span><b>一次情報</b><span>'+escape(text(r.checks?.source_freshness)||'未確認')+'</span></div><p>'+escape(text(r.conclusion)||'確認結果が未保存です。')+'</p>'+(issues.length?'<ul>'+issues.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>':'<small>LOCK済みの同一原稿版を別工程で再確認済み。</small>');
    };
    const scan=node=>{if(node?.nodeType!==1)return;if(node.matches?.('[data-fp-modal]'))setTimeout(()=>render(node),0);node.querySelectorAll?.('[data-fp-modal]').forEach(m=>setTimeout(()=>render(m),0));};
    const observer=new root.MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(scan)));
    observer.observe(doc.body,{childList:true,subtree:false});
    doc.querySelectorAll('[data-fp-modal]').forEach(render);
    const style=doc.createElement('style');style.textContent='.fp-money-logic-review{margin-top:10px;padding:10px 12px;background:#fff8df;border:2px solid #8b6f25}.fp-money-logic-review.passed{background:#eef8ee;border-color:#3d743d}.fp-money-logic-review h4{margin:0 0 7px}.fp-money-logic-review p{margin:8px 0 0;line-height:1.5}.fp-money-logic-review ul{margin:7px 0 0;padding-left:20px}.fp-logic-grid{display:grid;grid-template-columns:90px 1fr;gap:4px 8px}.fp-logic-grid b{font-size:12px}.fp-money-logic-review small{display:block;margin-top:7px;color:#555}';doc.head.append(style);
  }
  return {VERSION,TASK_ID,CONTRACT_VERSION,CUTOVER_MS,applies,required,reviewIssues,reviewLines,install};
});
