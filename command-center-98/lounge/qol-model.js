import {groupDrafts,safeLink,postingAssets} from './notebook.js?v=20261029.4-images';

export const roomForPlace={kyun:'red',choi:'purple',fp:'silver',shiire:'orange'};
export function savedLinks(d){return (Array.isArray(d?.productLinks)?d.productLinks:d?.link?[{key:'saved',label:'保存されたリンク',url:d.link}]:[]).filter(x=>safeLink(x.url));}
// Content, identity and variant all matter. Read times and fetch timestamps do not.
export function revision(d){const parts=[d.place,d.id,d.source?.account,d.source?.id,d.kind,d.title,d.body,savedLinks(d)],assets=postingAssets(d.posting);if(assets.reply||assets.images.length)parts.push(assets);return JSON.stringify(parts);}
const fingerprints=new WeakMap();
// Small notification metadata; source manuscripts stay in the existing store.
export function seenRevision(d){if(fingerprints.has(d))return fingerprints.get(d);const text=revision(d);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;}const value=text.length.toString(36)+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);fingerprints.set(d,value);return value;}
export function unreadGroups(rows,seen={}){return groupDrafts(rows).filter(group=>group.some(d=>seen[d.id]!==seenRevision(d))).length;}
export function postingReadiness(d){const images=postingAssets(d?.posting).images,commercial=['kyun','choi'].includes(d?.place),affiliate=savedLinks(d).find(x=>x.key==='affiliate');return {images,commercial,affiliate:affiliate?.url||'',label:(images.length?'画像 '+images.length+'枚':'画像未保存')+(commercial?' · '+(affiliate?'収益リンクあり':'収益リンク未設定'):'')};}
export function postingSteps(d,copies=[]){
 const assets=postingAssets(d.posting),commercial=['kyun','choi'].includes(d.place),paired=!!assets.main,main=assets.main||d.body;
 const links=savedLinks(d).filter(x=>(!commercial||x.key==='affiliate')&&!(paired&&assets.reply.includes(x.url)));
 const steps=[{key:'body',label:paired?'1通目｜本文':'本文',kind:'body',text:main},...(assets.reply&&assets.reply!==main?[{key:'reply',label:paired?'2通目｜自分への返信':'自己返信',kind:'reply',text:assets.reply}]:[]),...links.map((x,i)=>({key:'link-'+i,label:x.label,kind:'link',text:x.url}))];
 const allText=[...new Set(steps.map(s=>s.text))].join('\n\n'),allCopied=copies.some(c=>c.draftId===d.id&&c.kind==='posting-set'&&c.text===allText);
 return steps.map(step=>({...step,copied:allCopied||copies.some(c=>c.draftId===d.id&&c.kind===step.kind&&c.text===step.text)}));
}
export function postingText(d){return postingSteps(d).map(s=>s.text).filter((text,i,rows)=>rows.indexOf(text)===i).join('\n\n');}
export function currentPosted(d,mark){return !!mark&&mark.revision===revision(d)&&Number.isFinite(mark.time);}
export function resumeView(value){return {query:typeof value?.query==='string'?value.query.slice(0,2000):'',filter:['all','pin','done'].includes(value?.filter)?value.filter:'all'};}
