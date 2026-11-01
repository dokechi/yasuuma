/* One working book, one application owner. Presentation never fetches records. */
import * as application from './app.js?v=20261101.8-storybook';
import {mountStorybook,storyChapters} from './storybook-scene.js?v=20261101.8-storybook';
const board=application.getAccountBoard();
let scene,desk,passage,artBuilder=null,living=null,destroyed=false;
const actorURL=new URL('./assets/storybook-insurance-actor-v1.webp',import.meta.url).href;
const makeArt=({document:target,key,actor=true})=>artBuilder?.({document:target,key,actorURL:actor&&key==='insurance'?actorURL:null})||null;
const room=document.getElementById('room');
const supplementary=document.createElement('button');supplementary.type='button';supplementary.className='system-action';supplementary.id='storybook-fp';supplementary.textContent='FP・TikTok の保存原稿';supplementary.addEventListener('click',()=>{document.getElementById('settings').close();application.openSupplementaryReader('fp');});document.querySelector('.system-management')?.append(supplementary);
board?.element.addEventListener('click',event=>{if(event.target.closest?.('.board-lounge')){event.preventDefault();event.stopImmediatePropagation();document.getElementById('settings-open').click();}},true);
let decoratedKey=null;
function decorateRoom(){
 if(destroyed||!desk||room.hidden||room.dataset.spatialDesk!=='ready')return;
 const key=room.dataset.account,host=room.querySelector('.spatial-study-scene');
 if(!host)return;
 if(decoratedKey!==key||!host.querySelector('.story-paper-art')){
  decoratedKey=key;const art=makeArt({document,key,actor:false});host.replaceChildren(...(art?[art]:[]));
 }
 room.dataset.storyRoom=key;
 const actor=room.querySelector('.spatial-desk-actor');
 room.dataset.storyScene=artBuilder&&key==='insurance'&&actor?.complete&&actor.naturalWidth?'ready':artBuilder&&key==='insurance'?'loading':'fallback';
}
try{
 if(getComputedStyle(document.body).getPropertyValue('--storybook-ready').trim()!=='1')throw Error('Storybook styles unavailable');
 scene=mountStorybook({board,onCancel:()=>passage?.cancel(),onTravel:spec=>passage?.onTravel(spec)});
 const config=Object.fromEntries(storyChapters.filter(x=>x.key!=='sourcing').map(x=>[x.key,{name:x.place,fallbackColor:'#F7F8F2',...(x.key==='insurance'?{actorURL}: {})}]));
 const {installSpatialDesk}=await import('./spatial-desk.js?v=20261101.8-storybook');
 if(getComputedStyle(document.body).getPropertyValue('--storybook-reader-ready').trim()!=='1')throw Error('Storybook reader styles unavailable');
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
room.addEventListener('load',decorateRoom,true);room.addEventListener('error',()=>{room.dataset.storyScene='fallback';},true);
decorateRoom();
Object.defineProperty(window,'__storybook',{configurable:true,value:Object.freeze({snapshot:()=>Object.freeze({...scene?.snapshot(),journey:passage?.snapshot?.()||null})})});
// Optional page motion is installed after the working book and tools are ready.
// Its failure cannot stop a route, a copy, or the initial first-readable frame.
try{const {installStorybookPassage}=await import('./storybook-passage.js?v=20261101.8-storybook');if(scene&&desk)passage=await installStorybookPassage({document,scene,board,spatialDesk:desk,buildArt:makeArt});}catch(error){console.warn('Page motion unavailable; pages open immediately.',error);}
window.addEventListener('pagehide',()=>{destroyed=true;passage?.destroy();observer.disconnect();},{once:true});
