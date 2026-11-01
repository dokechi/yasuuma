/* One working book, one application owner. Presentation never fetches records. */
import * as application from './app.js?v=20261101.8-storybook';
const board=application.getAccountBoard();
let scene,desk,passage,artBuilder=null,living=null,destroyed=false;
const actorURLs=Object.freeze(Object.fromEntries(['insurance','otoku','rakuten','lottery','sourcing'].map(key=>[key,new URL('./assets/storybook-'+key+'-actor-v1.webp',import.meta.url).href])));
const makeArt=({document:target,key,actor=true,layout=actor?(window.innerWidth>600?'spread':'page'):undefined})=>artBuilder?.({document:target,key,layout,actorURL:actor?actorURLs[key]||null:null})||null;
const room=document.getElementById('room');
const supplementary=document.createElement('button');supplementary.type='button';supplementary.className='system-action';supplementary.id='storybook-fp';supplementary.textContent='FP・TikTok の保存原稿';supplementary.addEventListener('click',()=>{document.getElementById('settings').close();application.openSupplementaryReader('fp');});document.querySelector('.system-management')?.append(supplementary);
let decoratedKey=null;
function decorateRoom(){
 if(destroyed||!desk||room.hidden||room.dataset.spatialDesk!=='ready')return;
 const key=room.dataset.account,host=room.querySelector('.spatial-study-scene');
 if(!host)return;
 try{
  if(decoratedKey!==key||!host.querySelector('.story-paper-art')){
   const stage=room.querySelector('.spatial-illustration-stage');for(const name of ['x','y','w','h'])stage?.style.removeProperty('--story-actor-'+name);
   const art=makeArt({document,key,actor:false,layout:'page'});host.replaceChildren(...(art?[art]:[]));decoratedKey=key;
   const coords=['X','Y','W','H'].map(name=>Number(art?.dataset['storyActor'+name]));
   if(coords.every(Number.isFinite)&&coords.every(n=>n>=-100&&n<=200)&&coords[2]>0&&coords[3]>0)for(const [i,name]of ['x','y','w','h'].entries())stage?.style.setProperty('--story-actor-'+name,coords[i]+'%');
  }
  room.dataset.storyRoom=key;
  const actor=room.querySelector('.spatial-desk-actor'),failed=!!actor?.complete&&!actor.naturalWidth;
  if(actor)actor.hidden=failed;
  const illustrated=!!artBuilder&&!!actorURLs[key]&&!!host.querySelector('.story-paper-art');
  room.dataset.storyScene=illustrated&&actor?.complete&&actor.naturalWidth?'ready':!failed&&illustrated?'loading':'fallback';
 }catch{host.replaceChildren();room.dataset.storyScene='fallback';}
}

try{
 if(getComputedStyle(document.body).getPropertyValue('--storybook-ready').trim()!=='1'||getComputedStyle(document.body).getPropertyValue('--storybook-palette-ready').trim()!=='1')throw Error('Storybook styles unavailable');
 const {mountStorybook,storyChapters}=await import('./storybook-scene.js?v=20261101.8-storybook');
 scene=mountStorybook({board,onCancel:()=>passage?.cancel(),onTravel:spec=>passage?.onTravel(spec)});
 const config=Object.fromEntries(storyChapters.filter(x=>x.key!=='sourcing').map(x=>[x.key,{name:x.place,fallbackColor:'#F7F8F2',actorURL:actorURLs[x.key]}]));
 const {installSpatialDesk}=await import('./spatial-desk.js?v=20261101.8-storybook');
 if(getComputedStyle(document.body).getPropertyValue('--storybook-reader-ready').trim()!=='1'||getComputedStyle(document.body).getPropertyValue('--spatial-reader-ready').trim()!=='1')throw Error('Storybook reader styles unavailable');
 desk=installSpatialDesk({openRoom:key=>scene.open(key,null,{instant:true}),roomPresentation:config});
 document.body.dataset.spatial='ready';
 try{
  const art=await import('./storybook-art.js?v=20261101.8-storybook');artBuilder=art.buildStorybookArt;
  scene.setArtBuilder(({document,key})=>makeArt({document,key}));decorateRoom();
 }catch(error){console.warn('Illustration unavailable; the paper book remains usable.',error);}
 try{
  const [{installLivingRoom},{summarizeLivingRooms}]=await Promise.all([import('./living-room.js?v=20261101.1-living'),import('./living-room-model.js?v=20261101.8-storybook')]);
  const controller=application.getLivingDesk?.();if(!controller?.setSummarizer)throw Error('Room summaries unavailable');
  controller.setSummarizer(summarizeLivingRooms);living=installLivingRoom({controller,spatialDesk:desk,scene});
 }catch(error){console.warn('Room tools unavailable; the reading page remains ready.',error);}
}catch(error){document.body.dataset.spatial='fallback';console.warn('Paper presentation unavailable; the existing manuscript owner remains ready.',error);}
const observer=new MutationObserver(decorateRoom);observer.observe(room,{attributes:true,attributeFilter:['hidden','data-account','data-spatial-desk'],childList:true});
room.addEventListener('load',decorateRoom,true);room.addEventListener('error',event=>{if(event.target?.matches?.('.spatial-desk-actor'))event.target.hidden=true;room.dataset.storyScene='fallback';},true);
decorateRoom();
Object.defineProperty(window,'__storybook',{configurable:true,value:Object.freeze({snapshot:()=>Object.freeze({...scene?.snapshot(),journey:passage?.snapshot?.()||null})})});
// Optional page motion is installed after the working book and tools are ready.
// Its failure cannot stop a route, a copy, or the initial first-readable frame.
try{const {installStorybookPassage}=await import('./storybook-passage.js?v=20261101.8-storybook');if(scene&&desk)passage=await installStorybookPassage({document,scene,board,spatialDesk:desk,buildArt:makeArt});}catch(error){console.warn('Page motion unavailable; pages open immediately.',error);}
window.addEventListener('pagehide',()=>{destroyed=true;passage?.destroy();observer.disconnect();},{once:true});
