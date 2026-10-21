import {groupDrafts,safeLink} from './notebook.js?v=20261021.8-hall';

export const roomForPlace={kyun:'red',choi:'purple',fp:'silver',shiire:'orange'};
export function savedLinks(d){return (Array.isArray(d?.productLinks)?d.productLinks:d?.link?[{key:'saved',label:'保存されたリンク',url:d.link}]:[]).filter(x=>safeLink(x.url));}
// Content, identity and variant all matter. Read times and fetch timestamps do not.
export function revision(d){return JSON.stringify([d.place,d.id,d.source?.account,d.source?.id,d.kind,d.title,d.body,savedLinks(d)]);}
const fingerprints=new WeakMap();
// Small notification metadata; source manuscripts stay in the existing store.
export function seenRevision(d){if(fingerprints.has(d))return fingerprints.get(d);const text=revision(d);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;}const value=text.length.toString(36)+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);fingerprints.set(d,value);return value;}
export function unreadGroups(rows,seen={}){return groupDrafts(rows).filter(group=>group.some(d=>seen[d.id]!==seenRevision(d))).length;}
export function postingSteps(d,copies=[]){return [{key:'body',label:'本文',kind:'body',text:d.body},...savedLinks(d).map((x,i)=>({key:'link-'+i,label:x.label,kind:'link',text:x.url}))].map(step=>({...step,copied:copies.some(c=>c.draftId===d.id&&c.kind===step.kind&&c.text===step.text)}));}
export function currentPosted(d,mark){return !!mark&&mark.revision===revision(d)&&Number.isFinite(mark.time);}
export function resumeView(value){return {query:typeof value?.query==='string'?value.query.slice(0,2000):'',filter:['all','pin','done'].includes(value?.filter)?value.filter:'all'};}
