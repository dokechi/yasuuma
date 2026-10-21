/* Keep existing business controls in their document, inside the new room. */
(function(w){
 'use strict';const d=w.document,main=d.getElementById('mainWindow');if(!main||d.getElementById('loungeWorkspaceHeader'))return;
 const header=d.createElement('header');header.id='loungeWorkspaceHeader';header.hidden=true;
 header.innerHTML='<nav aria-label="仕入れの部屋"><button type="button" data-lounge-home>← 司令塔へ</button><div><button type="button" data-lounge-refresh>↻ 更新</button><button type="button" data-lounge-later>この画面をあとで</button><button type="button" data-lounge-tools>設定・補助</button></div></nav><div class="lounge-workspace-caption"><p>THE MERCHANT’S TAVERN</p><h1 id="loungeWorkspaceTitle">仕入れ帳</h1><p id="loungeWorkspaceDescription">候補を見つけて、購入・在庫・売却まで。</p></div>';
 main.prepend(header);
 header.querySelector('[data-lounge-home]').addEventListener('click',()=>w.CCCastle?.show());
 header.querySelector('[data-lounge-refresh]').addEventListener('click',()=>d.getElementById('refreshBtn')?.click());
 header.querySelector('[data-lounge-later]')?.addEventListener('click',()=>w.CCCastle?.later({place:'shiire',title:d.getElementById('loungeWorkspaceTitle').textContent,native:({sourcing:'sourcing',reddit:'watches',x:'cards'})[main.dataset.ccView],body:'この画面の続きを確認する。気になった商品名や確認したいことをメモできます。'}));
 header.querySelector('[data-lounge-tools]').addEventListener('click',()=>w.CCRpgWorkspaces?.openSettings());
 const titles={sourcing:['仕入れ帳','候補を見つけて、購入・在庫・売却まで。'],reddit:['海外時計・価格差','海外の相場と、気になる商品を調べる。'],x:['カード','抽選・入荷と、保存した情報を確認する。']};
 let activeView=null;
 function sync(){
  const view=main.dataset.ccView,active=!!titles[view]&&!w.CCHome?.active&&!d.body.classList.contains('castle-visible');
  header.hidden=!active;if(d.body.classList.contains('lounge-workspace')!==active)d.body.classList.toggle('lounge-workspace',active);
  if(active&&view!==activeView){d.getElementById('loungeWorkspaceTitle').textContent=titles[view][0];d.getElementById('loungeWorkspaceDescription').textContent=titles[view][1];activeView=view;}
 }
 new MutationObserver(sync).observe(main,{attributes:true,attributeFilter:['data-cc-view','class']});
 new MutationObserver(sync).observe(d.body,{attributes:true,attributeFilter:['class']});
 d.addEventListener('cc:home-render',sync);sync();
 // The original ledger stays in this document; its quiet sounds play through
 // the same audio context and volume control as the lounge.
 import('./lounge/interaction-feedback.js?v=20261021.4-touch').then(({createInteractionFeedback})=>{
  const reduced=()=>{try{return JSON.parse(w.localStorage.getItem('shireito-courtyard-v1')||'{}').reduce===true||w.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return true;}};
  createInteractionFeedback({doc:d,win:w,active:()=>d.body.classList.contains('lounge-workspace'),reduced,room:()=> 'orange',play:kind=>{
   d.body.dataset.feedbackMotion=reduced()?'reduced':'normal';
   d.getElementById('ccCastleFrame')?.contentWindow.postMessage({channel:'cc-castle-v1',type:'interaction',kind},w.location.origin);
  }});
 }).catch(()=>{});
})(window);
