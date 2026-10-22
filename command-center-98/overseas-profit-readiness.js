/* Revenue evidence for the existing overseas desk. No new forms or writes. */
(function(root,factory){
 'use strict';
 const M=factory();
 if(typeof module==='object'&&module.exports)module.exports=M;
 else{root.CCOverseasProfit=M;mount(root,M);}
 function mount(w,M){
  const R=w.CCReddit,d=w.document;if(!R||!d)return;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v===null?'未確認':Math.floor(v).toLocaleString('ja-JP')+'円';
  const card=R.card;
  R.card=x=>{
   const p=M.assess(x),story=M.story(x),original=card(x);
   const panel='<section class="overseas-profit-evidence" aria-label="自分に入る報酬"><div class="overseas-profit-numbers"><div><small>紹介料の目安・1件</small><b>'+money(p.estimatedCommissionYen)+'</b><span>費用差引前・確定報酬とは別</span></div><div><small>記録済みの確定報酬</small><b>'+money(p.confirmedCommissionYen)+'</b><span>未記録は0円にしません</span></div></div><p class="overseas-profit-state"><b>'+escape(p.label)+'</b> '+escape(p.next)+'</p><details><summary>収益の接続を確認</summary><ul>'+p.checks.map(c=>'<li>'+escape(c.label)+'：'+(c.ok?'確認済み':'未確認')+'</li>').join('')+'</ul><p>商品価格の差は読者の比較材料です。自分の紹介料には含めません。</p></details></section>';
   const storyPanel=story?'<details class="overseas-story-draft"><summary>出品と一緒に使うX原稿｜'+escape(story.title)+'</summary><p>'+escape(story.note)+'</p><pre>'+escape(story.text)+'</pre><button class="push-button" type="button" data-profit-story="'+escape(x.id)+'">X原稿をコピー</button><p class="sub">コピーだけです。Xへの投稿は行いません。</p></details>':'';
   const held=x.sourcePayload?.comparison_rejected===true||x.source_payload?.comparison_rejected===true;
   const actions=held?original.replace(/(<button\b[^>]*\bdata-r-generate=[^>]*>)[\s\S]*?<\/button>/,'$1調査保留</button>').replace(/(<button\b[^>]*\bdata-r-generate=[^>]*)(>)/,'$1 disabled title="比較の問題を解消してから再制作します"$2'):original;
   return actions.replace('<small>価格差</small>','<small>読者の価格差</small>').replace('<div class="reddit-card-body">','<div class="reddit-card-body">'+panel+storyPanel);
  };
  const bind=R.bind;
  R.bind=host=>{bind(host);host.querySelectorAll('[data-profit-story]').forEach(b=>b.onclick=()=>{const x=R.state.items.find(v=>v.id===b.dataset.profitStory),story=M.story(x);if(story)R.copy(story.text,b);});};
  const render=R.render;
  R.render=()=>{
   render();const host=d.getElementById('redditSummary');if(!host)return;
   d.getElementById('overseasProfitSummary')?.remove();const s=M.summarize(R.state.items||[]),panel=d.createElement('section');panel.id='overseasProfitSummary';panel.className='overseas-profit-summary';panel.setAttribute('aria-label','収益化の進み具合');
   panel.innerHTML='<b>公開まで接続済み '+s.ready+'件</b><span>記録済み確定報酬 '+(s.confirmedCount?money(s.confirmedCommissionYen):'未集計')+'</span><p>調査・収益リンク・購入経路をそろえた原稿をここへ戻します。価格差だけで投稿を勧めません。'+(s.unrecordedCount?' 報酬未記録 '+s.unrecordedCount+'件。':'')+'</p>';
   const storyItem=(R.state.items||[]).find(x=>M.story(x));if(storyItem){const b=d.createElement('button');b.type='button';b.className='push-button';b.textContent='親子のX原稿を確認';b.onclick=()=>{R.state.tab=storyItem.status;R.render();const target=[...d.querySelectorAll('[data-profit-story]')].find(b=>b.dataset.profitStory===storyItem.id)?.closest('details');if(target){target.open=true;target.scrollIntoView({block:'center',behavior:'smooth'});}};panel.append(b);}
   host.querySelectorAll('small').forEach(el=>{if(el.textContent==='最大価格差')el.textContent='読者側の最大価格差';});host.after(panel);
  };
  const intro=d.querySelector('.reddit-intro');if(intro)intro.textContent='海外向け紹介の作業場所。商品の比較と、自分に入る紹介料を確認できます。調査と原稿の仕上げはAI側、本人は完成した内容を確認して投稿します。';
 }
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const amount=v=>{if(!['number','string'].includes(typeof v)||typeof v==='string'&&!v.trim())return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;};
 const payload=x=>x?.sourcePayload&&typeof x.sourcePayload==='object'?x.sourcePayload:x?.source_payload&&typeof x.source_payload==='object'?x.source_payload:{};
 function https(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function affiliateUrl(v,provider){
  const safe=https(v);if(!safe)return '';const u=new URL(safe),host=u.hostname.toLowerCase();
  if(provider==='Amazon.co.jp')return (host==='amzn.to'||((host==='amazon.co.jp'||host==='www.amazon.co.jp')&&!!u.searchParams.get('tag')))?safe:'';
  if(provider==='Yahoo!ショッピング')return host==='ck.jp.ap.valuecommerce.com'?safe:'';
  return '';
 }
 function assess(x){
  const p=payload(x),c=p.commission&&typeof p.commission==='object'?p.commission:{},provider=String(c.provider||p.affiliate_provider||'');
  const link=affiliateUrl(p.affiliate_url,provider),linkOk=!!link&&p.affiliate_link_verified===true;
  const rate=amount(c.rate_pct),basis=amount(c.eligible_revenue_yen),feeEvidence=rate!==null&&rate<=100&&!!https(c.terms_url)&&Number.isFinite(Date.parse(c.checked_at));
  const estimate=linkOk&&feeEvidence&&basis!==null&&c.basis_verified===true?Math.floor(basis*rate/100):null;
  const confirmed=p.commission_report_verified===true?amount(p.confirmed_commission_yen):null;
  const checks=[{label:'価格・型番・在庫の比較',ok:p.comparison_verified===true},{label:'本人の収益リンク',ok:linkOk},{label:'外国人本人の決済と受取',ok:p.buyer_route_verified===true},{label:'掲載先と広告条件',ok:p.media_approval_verified===true},{label:'紹介料の条件',ok:feeEvidence}];
  const rejected=p.comparison_rejected===true;
  const ready=!rejected&&checks.every(c=>c.ok)&&p.publication_ready===true;
  const label=ready?'公開前の最終確認へ':rejected?'この商品の紹介は保留':'収益の接続を確認中';
  const next=ready?'本文・紹介料の条件を確認して投稿できます。':rejected?String(p.hold_summary||'価格差や購入条件が弱いため、次の候補をAI側で調べます。'):!linkOk?'最初の収益リンクが未接続です。調査と原稿はAI側でまとめます。':!p.buyer_route_verified?'購入と受取の経路をAI側で確認します。':'比較と掲載条件をAI側で確認します。';
  return {estimatedCommissionYen:estimate,confirmedCommissionYen:confirmed,ready,label,next,checks,affiliateUrl:linkOk?link:''};
 }
 function story(x){const s=payload(x).parallel_story;if(!s||s.fact_reviewed!==true||s.anonymized!==true||typeof s.text!=='string'||!s.text.trim()||s.text.length>5000)return null;return {title:String(s.title||'親子の出品メモ'),text:s.text.trim(),note:String(s.note||'実際に話してくれた内容をもとにした下書きです。')};}
 function summarize(items){const rows=(Array.isArray(items)?items:[]).map(assess),confirmed=rows.filter(x=>x.confirmedCommissionYen!==null);return {ready:rows.filter(x=>x.ready).length,confirmedCount:confirmed.length,unrecordedCount:rows.length-confirmed.length,confirmedCommissionYen:confirmed.reduce((s,x)=>s+x.confirmedCommissionYen,0)};}
 return Object.freeze({assess,summarize,story,affiliateUrl});
});
