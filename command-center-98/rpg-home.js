/* RPG HOME presentation only. Existing account review, auth, data and routes stay authoritative. */
(function(root){
 'use strict';
 // Pre-manifest entry documents can keep loading this unchanged public URL.
 // Migrate before creating the retired HOME, without touching saved user data.
 if(root.location&&!root.CCLoadedManifest){
  root.location.replace(new URL('./app-v130.html?v=20261022.10-entry',root.location.href).href);
  return;
 }
 const doc=root.document,H=root.CCHome,main=doc?.getElementById('mainWindow'),home=doc?.getElementById('commandHome');
 if(!H||!main||!home||root.CCRpgHome)return;
 const accountHub=root.CCManualOperationHub;
 if(typeof accountHub?.openAccount!=='function')return; // Legacy HOME remains fully usable if a dependency is unavailable.
 const retainedSourcing=home.querySelector('[data-home-action="sourcing-queue"]');
 if(!retainedSourcing)return;
 const page=doc.createElement('section');page.id='ccRpgHome';page.className='cc-rpg-home';page.hidden=true;
 page.setAttribute('aria-label','司令塔のトップページ');
 page.innerHTML=`<div class="rpg-world"><div class="rpg-scene">
 <header class="rpg-masthead"><button type="button" class="rpg-tools" data-rpg-tools>設定</button><h1 tabindex="-1">司令塔</h1><p>今日の確認</p></header>
 <nav class="rpg-portals" aria-label="四つの入口">
 <button class="rpg-portal" type="button" data-rpg-account="kyun"><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">キュン拾い ›</span></span><span class="rpg-description">今回の原稿を確認</span><span class="rpg-detail">本文・商品リンク</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-account="choi"><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">ちょい上等 ›</span></span><span class="rpg-description">今回の原稿を確認</span><span class="rpg-detail">本文・商品リンク</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-fp><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">FP・TikTok ›</span></span><span class="rpg-description">台本と画像を確認</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 <button class="rpg-portal" type="button" data-rpg-sourcing><span class="rpg-copy"><span class="rpg-heading"><span class="rpg-name">仕入れ ›</span></span><span class="rpg-description">候補・購入・在庫・売却</span></span><span class="rpg-edge" aria-hidden="true"></span></button>
 </nav></div><footer class="rpg-footer">
 <nav class="rpg-shortcuts" aria-label="仕入れとカード"><button type="button" data-rpg-route="sourcing">仕入れ一覧</button><button type="button" data-rpg-route="watches">海外時計</button><button type="button" data-rpg-route="cards">カード ›</button></nav>
 <p class="rpg-service-label">別サービス</p><nav class="rpg-services" aria-label="別サービス"><button type="button" data-rpg-service="daily">作業日報</button><button type="button" data-rpg-service="cooney">クーニー</button><button type="button" data-rpg-service="shiire">仕入れ命</button></nav>
 <button type="button" class="rpg-refresh" data-rpg-refresh aria-label="HOMEの情報を再読み込み"><span id="ccRpgReadStatus" aria-live="polite">情報を確認中</span><span aria-hidden="true"> ↻</span></button></footer></div>`;
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
  if(button.hasAttribute('data-rpg-tools')){if(root.CCRpgWorkspaces)root.CCRpgWorkspaces.openSettings();else showLegacy();return;}
  if(button.hasAttribute('data-rpg-fp')){if(root.CCRpgWorkspaces)root.CCRpgWorkspaces.openFp();else {root.CCHome.leave();if(typeof load==='function')load('fp');}return;}
  if(button.dataset.rpgRoute){const w=root.CCRpgWorkspaces;if(w)({sourcing:()=>w.openSourcing(),watches:()=>w.openWatches(),cards:()=>w.openCards()})[button.dataset.rpgRoute]?.();return;}
  if(button.dataset.rpgService){root.CCRpgWorkspaces?.openService(button.dataset.rpgService);return;}
  if(button.hasAttribute('data-rpg-refresh')){doc.getElementById('refreshBtn')?.click();return;}
  if(button.hasAttribute('data-rpg-sourcing')){root.CCHomeMenuFixV224?.close();if(root.CCRpgWorkspaces)root.CCRpgWorkspaces.openSourcing();else retainedSourcing.click();sync();return;}
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
