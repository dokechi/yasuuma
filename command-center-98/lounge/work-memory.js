import {isLegacyPublishingDraft} from './notebook.js?v=20261031.1-lottery';
import {currentPosted} from './qol-model.js?v=20261031.1-lottery';
const places=['kyun','choi','otoku','rakuten','lottery','fp','shiire'];
const dayFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
export function japanDay(time){return dayFormatter.format(new Date(time));}
export function workMarks(notebook,now=Date.now()){
 const day=japanDay(now),marks=[];for(const place of places)for(const done of notebook.completed(place))if(!isLegacyPublishingDraft(notebook.get?.(done.id)||done)&&Number.isFinite(done.time)&&japanDay(done.time)===day)marks.push({id:'read:'+done.id,place,time:done.time,kind:'read',title:done.title});
 for(const d of notebook.all().filter(d=>!isLegacyPublishingDraft(d))){const p=notebook.pref('posted:'+d.id,null);if(p&&Number.isFinite(p.time)&&japanDay(p.time)===day&&currentPosted(d,p))marks.push({id:'posted:'+d.id,place:d.place,time:p.time,kind:'posted',title:d.title});}
 return marks.sort((a,b)=>b.time-a.time);
}
export function createKeepsakes({stage,getMarks=()=>[],doc=document}){
 const holder=doc.createElement('div');holder.className='work-keepsakes';holder.setAttribute('aria-hidden','true');stage.append(holder);let signature='';
 function refresh(){const marks=getMarks(),next=JSON.stringify(marks.slice(0,4).map(x=>x.id+':'+x.time));if(signature===next)return;signature=next;if(holder.replaceChildren)holder.replaceChildren();holder.hidden=!marks.length;
  const colors={kyun:'#a95f59',choi:'#8c7394',otoku:'#8c7394',rakuten:'#a95f59',lottery:'#759875',fp:'#718d95',shiire:'#b58a53'};for(const [i,mark]of marks.slice(0,4).reverse().entries()){const paper=doc.createElement('span');paper.className=mark.kind==='posted'?'work-letter sealed':'work-letter';paper.style.cssText=`--paper-order:${i};--wax:${colors[mark.place]||colors.kyun}`;holder.append(paper);}
 }
 refresh();return {refresh,position:offset=>holder.style.top=(770+offset)+'px'};
}
