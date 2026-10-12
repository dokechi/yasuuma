/* RPG HOME presentation only. Existing account review, auth, data and routes stay authoritative. */
(function(root){
 'use strict';
 const doc=root.document,H=root.CCHome,main=doc?.getElementById('mainWindow'),home=doc?.getElementById('commandHome');
 if(!H||!main||!home||root.CCRpgHome)return;
 const accountHub=root.CCManualOperationHub;
 if(typeof accountHub?.openAccount!=='function')return; // Legacy HOME remains fully usable if a dependency is unavailable.
 const retainedSourcing=home.querySelector('[data-home-action="sourcing-queue"]');
 if(!retainedSourcing)return;
 const page=doc.createElement('section');page.id='ccRpgHome';page.className='cc-rpg-home';page.hidden=true;
 page.setAttribute('aria-label','司令塔のトップページ');
 page.innerHTML=`<div class="rpg-world">
 <header class="rpg-masthead"><button type="button" class="rpg-tools" data-rpg-tools>すべての画面</button><h1 tabindex="-1">司令塔</h1><span class="rpg-title-rule" aria-hidden="true"></span><p>今日の確認</p></header>
 <nav class="rpg-portals" aria-label="四つの入口">
 <button class="rpg-portal" type="button" data-rpg-account="kyun"><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">キュン拾い</span><span class="rpg-state">原稿を確認</span></span><span class="rpg-description">好きな一着を、お得に。</span><span class="rpg-detail">保存した原稿を見る</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-account="choi"><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">ちょい上等</span><span class="rpg-state">原稿を確認</span></span><span class="rpg-description">いつもより、少し上等。</span><span class="rpg-detail">保存した原稿を見る</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-account="tiktok"><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">FP・TikTok</span><span class="rpg-state">台本を確認</span></span><span class="rpg-description">暮らしのお金を、<br>わかりやすく。</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-sourcing><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">仕入れ</span><span class="rpg-state">候補を確認</span></span><span class="rpg-description">商品・相場・根拠を見る。</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 </nav><footer class="rpg-footer"><p>保存済みの情報を確認</p><button type="button" class="rpg-refresh" data-rpg-refresh aria-label="HOMEの情報を再読み込み"><span id="ccRpgReadStatus" aria-live="polite">最新の情報を確認中</span><span aria-hidden="true"> ↻</span></button></footer></div>`;
 doc.body.append(page);
 const back=doc.createElement('button');back.id='ccRpgLegacyReturn';back.className='push-button';back.type='button';back.textContent='← RPGトップに戻る';back.hidden=true;home.prepend(back);
 let legacy=false;
 function readStatus(){
  if(H.loading)return '情報を読み込み中';
  if(Object.values(H.errors||{}).some(Boolean))return '一部の情報は更新未確認';
  if(Object.values(H.loaded||{}).some(Boolean))return '保存原稿・候補を開けます';
  return '情報の取得状況は未確認';
 }
 function sync(){
  if(!H.active)legacy=false;
  const visible=!!H.active&&!legacy;
  page.hidden=!visible;back.hidden=!H.active||!legacy;
  doc.body.classList.toggle('rpg-home-active',visible);
  const status=doc.getElementById('ccRpgReadStatus');if(status)status.textContent=readStatus();
 }
 function showLegacy(){legacy=true;sync();root.scrollTo?.({top:0,behavior:'instant'});back.focus?.({preventScroll:true});}
 function showRpg(){legacy=false;if(!H.active)H.show();sync();page.querySelector('h1')?.focus?.({preventScroll:true});}
 function openAccount(key){
  if(!['kyun','choi','tiktok'].includes(key))return false;
  root.CCHomeMenuFixV224?.close();return accountHub.openAccount(key);
 }
 page.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-rpg-tools')){showLegacy();return;}
  if(button.hasAttribute('data-rpg-refresh')){doc.getElementById('refreshBtn')?.click();return;}
  if(button.hasAttribute('data-rpg-sourcing')){root.CCHomeMenuFixV224?.close();retainedSourcing.click();sync();return;}
  if(button.dataset.rpgAccount)openAccount(button.dataset.rpgAccount);
 });
 back.addEventListener('click',showRpg);
 doc.addEventListener('cc:home-render',sync);
 // Reveal the retained UI before its existing bubbling keyboard shortcuts run.
 doc.addEventListener('keydown',event=>{
  if(page.hidden)return;
  const target=event.target;
  if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))return;
  if(event.key==='F1'||(event.altKey&&['f','v','a','j','h'].includes(String(event.key).toLowerCase())))showLegacy();
 },true);
 // Existing routes sometimes leave HOME without another data render.
 const observer=new root.MutationObserver(sync);observer.observe(main,{attributes:true,attributeFilter:['class']});
 root.CCRpgHome={sync,showLegacy,showRpg,openAccount,readStatus};sync();
})(typeof window==='undefined'?globalThis:window);
