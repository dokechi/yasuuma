/* Automatic display only; never patch or rewrite saved candidate facts. */
(function(w){
 'use strict';const M=w.CCSourcingEconomics;if(!M||typeof sourcingCardHtml!=='function')return;
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v===null?'未確認':'¥'+v.toLocaleString('ja-JP');
 const check=x=>{const p=typeof sourcingEvidence==='function'?sourcingEvidence(x):x.payload;return M.assess(x,sourcingFields({...x,payload:p}),p);};
 const original=sourcingCardHtml;
 sourcingCardHtml=function(x,i){const r=check(x),label=r.status==='pass'?'保存条件で採算整合':r.status==='fail'?'採算NG':'採算保留';
  const summary='<section class="sourcing-profit-check '+r.status+'" aria-label="採算の自動確認"><b>'+label+(r.profit!==null?' · 再計算 '+money(r.profit):'')+'</b><span>'+h(r.ok?'保存時点の条件です。現在の価格・在庫は商品ページで確認できます。':r.note)+'</span><details><summary>計算の内訳</summary><p>売価 '+money(r.sell)+' − 送料込み原価 '+money(r.cost)+' − 手数料 '+money(r.fee)+' − 発送費 '+money(r.shipping)+' − その他 '+money(r.other)+'</p><p>同条件の保存競合：'+money(r.competitorPrice)+'（7日以内の確認記録）。空欄を0円として計算しません。</p></details></section>';
  return original(x,i).replace('1個の想定純利益','保存された想定利益').replace(/(<article\b[^>]*>)/,'$1'+summary);
 };
 if(typeof sourcingJudge==='function'){const judge=sourcingJudge;sourcingJudge=function(id,verdict,button){const x=sourcingApp.items.find(x=>String(x.id)===String(id));if(verdict==='success'&&x){const r=w.CCSourcingWorkflow.verifyChecks(x);if(!r.ok){toast(r.note,'bad');return;}}return judge.apply(this,arguments);};}
 const style=document.createElement('style');style.textContent='.sourcing-profit-check{margin:8px;padding:10px 12px;border:1px solid #a29679;border-radius:5px;background:#fff7df;color:#594524;font-size:12px;line-height:1.6}.sourcing-profit-check b,.sourcing-profit-check>span{display:block}.sourcing-profit-check.pass{background:#edf5ed;color:#31543d}.sourcing-profit-check.fail{background:#fff0ec;color:#802f25}.sourcing-profit-check details{margin-top:4px}.sourcing-profit-check summary{cursor:pointer}.sourcing-profit-check p{margin:6px 0;overflow-wrap:anywhere}';document.head.append(style);
 w.CCSourcingProfitGuard={check};
})(window);
