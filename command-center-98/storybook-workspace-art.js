/* Original cut-paper decoration for the existing native working page.
   No ledger/form/route ownership, data reads, storage, audio or background work. */
(function(w){
 'use strict';const d=w.document,header=d.getElementById('loungeWorkspaceHeader');
 if(!header||!d.body.classList.contains('storybook-host')||header.dataset.storyArtInstalled)return;
 header.dataset.storyArtInstalled='true';
 let disposed=false,loading=null,serial=0,stage=null;
 const active=()=>!disposed&&!header.hidden&&d.body.classList.contains('lounge-workspace');
 function sync(){
  const intent=++serial;if(!active()||stage)return;
  loading||=import('./lounge/storybook-art.js?v=20261101.8-storybook');
  loading.then(module=>{
   if(intent!==serial||!active()||stage)return;
   const art=module.buildStorybookArt({document:d,key:'sourcing',layout:'page',actorURL:new URL('./lounge/assets/storybook-sourcing-actor-v1.webp',d.baseURI).href});
   if(!art)return;
   const fresh=d.createElement('div');fresh.className='story-workspace-art';fresh.inert=true;fresh.setAttribute('aria-hidden','true');fresh.append(art);
   const image=fresh.querySelector('img');image?.addEventListener('error',()=>{image.hidden=true;fresh.dataset.artState='fallback';},{once:true});
   header.append(fresh);stage=fresh;header.dataset.storyArt='ready';
   const eyebrow=header.querySelector('.lounge-workspace-caption>p:first-child');if(eyebrow)eyebrow.textContent='CHAPTER 05 · 旅する仕入れ帳';
  }).catch(()=>{if(!disposed)header.dataset.storyArt='fallback';});
 }
 const observer=new MutationObserver(sync);observer.observe(header,{attributes:true,attributeFilter:['hidden']});observer.observe(d.body,{attributes:true,attributeFilter:['class']});
 w.addEventListener('pagehide',()=>{disposed=true;++serial;observer.disconnect();stage?.remove();},{once:true});sync();
})(window);
