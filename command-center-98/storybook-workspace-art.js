/* Original cut-paper decoration and bounded focus visibility for the native page.
   No ledger/form/route ownership, data reads, storage, audio or background work. */
(function(w){
 'use strict';const d=w.document,header=d.getElementById('loungeWorkspaceHeader');
 if(!header||!d.body.classList.contains('storybook-host')||header.dataset.storyArtInstalled)return;
 header.dataset.storyArtInstalled='true';
 let disposed=false,loading=null,serial=0,stage=null;
 const frame=d.getElementById('ccCastleFrame'),eyebrow=header.querySelector('.lounge-workspace-caption>p:first-child'),originalEyebrow=eyebrow?.textContent;
 // This decoration belongs to the new book, not the explicit retained castle.
 // Its bounded native snapshot deliberately does not clone arbitrary images.
 const book=()=>{if(!frame)return true;try{return !!frame.contentDocument?.body?.classList.contains('storybook-atelier');}catch{return false;}};
 const active=()=>!disposed&&!header.hidden&&d.body.classList.contains('lounge-workspace')&&book();
 // Native phone tabs are horizontal strips. Browser focus may expose only the
 // center of a wide button; reveal its remaining edge without moving the page.
 function revealFocusedControl(event){
  const target=event.target;
  if(!active()||!d.body.classList.contains('storybook-host')||target!==d.activeElement)return;
  const strip=target.closest?.('#rpgSourcingAux,#sourcingTabs .sourcing-tab-group,#sourcingBody .ledger-month-tabs');
  if(!strip||strip.scrollWidth<=strip.clientWidth||!['auto','scroll','overlay'].includes(w.getComputedStyle(strip).overflowX))return;
  const control=target.getBoundingClientRect(),bounds=strip.getBoundingClientRect(),left=bounds.left+strip.clientLeft,right=left+strip.clientWidth;
  if(control.width<=0||control.height<=0||strip.clientWidth<=0)return;
  const delta=control.left<left?control.left-left:control.right>right?control.right-right:0;
  if(delta)strip.scrollLeft=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+delta));
 }
 function sync(){
  const intent=++serial,shown=active();
  if(stage)stage.hidden=!shown;
  if(eyebrow)eyebrow.textContent=shown&&stage?'CHAPTER 05 · 旅する仕入れ帳':originalEyebrow;
  if(!shown||stage)return;
  loading||=import('./lounge/storybook-art.js?v=20261101.8-storybook');
  loading.then(module=>{
   if(intent!==serial||!active()||stage)return;
   const art=module.buildStorybookArt({document:d,key:'sourcing',layout:'page',actorURL:new URL('./lounge/assets/storybook-sourcing-actor-v1.webp',d.baseURI).href});
   if(!art)return;
   const fresh=d.createElement('div');fresh.className='story-workspace-art';fresh.inert=true;fresh.setAttribute('aria-hidden','true');fresh.append(art);
   const image=fresh.querySelector('img');image?.addEventListener('error',()=>{image.hidden=true;fresh.dataset.artState='fallback';},{once:true});
   header.append(fresh);stage=fresh;header.dataset.storyArt='ready';
   if(eyebrow)eyebrow.textContent='CHAPTER 05 · 旅する仕入れ帳';
  }).catch(()=>{if(!disposed)header.dataset.storyArt='fallback';});
 }
 const observer=new MutationObserver(sync);observer.observe(header,{attributes:true,attributeFilter:['hidden']});observer.observe(d.body,{attributes:true,attributeFilter:['class']});
 d.addEventListener('focusin',revealFocusedControl);
 frame?.addEventListener('load',sync);
 w.addEventListener('pagehide',()=>{disposed=true;++serial;observer.disconnect();d.removeEventListener('focusin',revealFocusedControl);frame?.removeEventListener('load',sync);stage?.remove();},{once:true});sync();
})(window);
