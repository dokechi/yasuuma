import {groupDrafts,productLinks,postingAssets} from './notebook.js?v=20261031.1-lottery';

export const placeForRoom={red:'kyun',purple:'choi',silver:'fp',orange:'shiire'};
export const placeNames={kyun:'保険',choi:'以前の原稿',otoku:'まだ安く買えるはず',rakuten:'楽天犬',lottery:'抽選日記',fp:'FP・TikTok',shiire:'仕入れ'};
export const productionURL='https://dokechi.github.io/yasuuma/command-center-98/app-v130.html';

export function visibleGroups(rows,{query='',filter='all',isPinned=()=>false,isDone=()=>false}={}){
 const q=query.trim().toLocaleLowerCase();
 return groupDrafts(rows).filter(group=>(!q||group.some(d=>(d.title+'\n'+d.body).toLocaleLowerCase().includes(q)))&&(filter!=='pin'||group.some(d=>isPinned(d.id)))&&(filter!=='done'||group.some(d=>isDone(d.id))))
  .sort((a,b)=>Number(b.some(d=>isPinned(d.id)))-Number(a.some(d=>isPinned(d.id)))||Math.max(...b.map(d=>d.updatedAt))-Math.max(...a.map(d=>d.updatedAt)));
}
export function holdsActiveText(active,rows,complete){
 if(!active?.source)return false;
 const next=rows.find(d=>d.id===active.id);
 // Compare the same canonical shapes that notebook.normalize stores. The host
 // may omit default images/reply fields or send link keys in another order;
 // those are not edits and must not manufacture a held update on every read.
 if(!next)return complete===true;
 return ['title','body','link','kind','checkedAt'].some(k=>(active[k]||'')!==(next[k]||''))||JSON.stringify(productLinks(active.productLinks))!==JSON.stringify(productLinks(next.productLinks))||JSON.stringify(postingAssets(active.posting))!==JSON.stringify(postingAssets(next.posting))||(active.source.status||'')!==(next.source?.status||'');
}
export function nativeForDraft(place,draft){
 const action=place==='shiire'?'sourcing':place==='fp'?(draft?.source?.account==='tiktok'?'tiktok':'fp'):place;
 return {action,...(draft?.source?.account===action?{recordId:draft.source.id}:{})};
}
export function trustedMessage(event,origin,parent){
 return event.origin===origin&&event.source===parent&&event.data?.channel==='cc-castle-v1';
}
