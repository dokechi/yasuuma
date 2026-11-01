/* Only the original already-rendered sourcing illustration may accompany its
   bounded native workspace snapshot. No source moves, record reads or writes. */
import {captureNativeWorkspace} from './court-native-snapshot.js?v=20261101.9-workbook';
export function createStorybookNativeSnapshot({document:doc=globalThis.document,capture=captureNativeWorkspace,onReady=()=>{}}={}){
 const win=doc?.defaultView,header=doc?.getElementById('loungeWorkspaceHeader');if(!win||!header)return null;
 const expected=new URL('./lounge/assets/storybook-sourcing-actor-v1.webp',doc.baseURI).href;
 let disposed=false,current=null;
 const visible=node=>{const s=win.getComputedStyle(node),r=node.getBoundingClientRect();return !node.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
 function source({includeHidden=false}={}){
  const stages=header.querySelectorAll('.story-workspace-art');if(stages.length!==1)return null;
  const stage=stages[0],art=stage.querySelector('.story-paper-art'),images=stage.querySelectorAll('img'),image=images[0];
  if(!includeHidden&&!visible(stage)||!stage.inert||stage.getAttribute('aria-hidden')!=='true'||art?.dataset.storyRoom!=='sourcing'||images.length!==1||image?.dataset.storyActor!=='sourcing'||image.src!==expected||image.currentSrc&&image.currentSrc!==expected||image.srcset||!image.complete||!image.naturalWidth||!image.naturalHeight||image.naturalWidth>4096||image.naturalHeight>4096)return null;
  return image;
 }
 function discard(record){if(!record)return;record.stale=true;for(const item of record.copies){item.image.onload=null;item.image.onerror=null;}record.copies.length=0;}
 function fill(record){
  if(disposed||current!==record||record.stale||record.failed||source()!==record.source)return;
  while(record.copies.length<2){
   const image=new win.Image(),item={image,ready:false,decoding:false};record.copies.push(item);image.decoding='sync';image.alt='';image.draggable=false;
   const done=async()=>{
    if(item.decoding)return;item.decoding=true;
    try{if(typeof image.decode==='function')await image.decode();if(!image.complete||!image.naturalWidth||image.naturalWidth!==record.source.naturalWidth||image.naturalHeight!==record.source.naturalHeight)throw Error('decode');if(disposed||current!==record||record.stale||source({includeHidden:true})!==record.source)return;image.onload=null;image.onerror=null;item.ready=true;try{onReady();}catch{}}
    catch{if(current===record&&!record.stale)record.failed=true;}
    finally{image.onload=null;image.onerror=null;}
   };
   image.onload=done;image.onerror=()=>{if(current===record&&!record.stale)record.failed=true;image.onload=null;image.onerror=null;};
   // This exact resource is already painted in this same parent document. The
   // copies are prepared on readiness, never fetched or awaited by Back.
   image.src=expected;if(image.complete&&image.naturalWidth)win.queueMicrotask(done);
  }
 }
 function scan(){
  if(disposed)return;const image=source();if(!image)return;
  if(current?.source!==image){discard(current);current={source:image,copies:[],stale:false,failed:false};}
  fill(current);
 }
 const observer=new win.MutationObserver(()=>{if(current&&(!current.source.isConnected||current.source.src!==expected||current.source.srcset)){discard(current);current=null;}scan();});
 observer.observe(header,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','src','srcset','data-story-room','data-story-actor']});
 const loaded=event=>{if(event.target?.tagName==='IMG')scan();};header.addEventListener('load',loaded,true);win.addEventListener('resize',scan);scan();
 function take(surface){
  if(disposed||!['ready','fallback'].includes(header.dataset.storyArt))return null;const live=source(),record=current;
  // A hidden phone illustration is intentionally absent from the actual page;
  // the ordinary strict snapshot sees the same CSS-hidden subtree and omits it.
  if(!live)return capture(doc,{document:doc,surface});
  if(!record||record.source!==live||record.failed)return null;
  const item=record.copies.find(value=>value.ready&&!value.image.parentNode&&!value.image.isConnected);if(!item)return null;
  const result=capture(doc,{document:doc,surface,presentationImage:{sourceNode:live,preparedImage:item.image}});
  if(result||item.image.parentNode){record.copies.splice(record.copies.indexOf(item),1);win.queueMicrotask(()=>fill(record));}
  return result;
 }
 function destroy(){if(disposed)return;disposed=true;observer.disconnect();header.removeEventListener('load',loaded,true);win.removeEventListener('resize',scan);discard(current);current=null;}
 return {capture:take,destroy,state:()=>({ready:!!current&&!current.failed&&current.copies.some(item=>item.ready),prepared:current?.copies.filter(item=>item.ready).length||0,failed:!!current?.failed})};
}
