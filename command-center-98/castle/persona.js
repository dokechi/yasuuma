import {PERSONA_LINES} from './persona-lines.js?v=25';
export const PERSONA_MEMORY_KEY='castle-town.persona.v1';
// Labels describe the interaction, not an emotion shared by all four people.
export const PERSONA_MOODS={welcome:'お迎え',returning:'再訪',morning:'朝',night:'夜',touch:'呼びかけ',hair:'髪',hand:'手',cloth:'装い',repeat:'続けて呼びかける',work:'仕事',empty:'原稿を選ぶ',rest:'ひと休み',tea:'お茶の時間',special:'ふたりの話',copied:'コピー完了',completed:'ひと区切り',talk:'会話',resume:'仕事へ戻る',story:'ひとこと',followup:'話の続き'};
// Only bounded dialogue IDs/visit counts are stored. No manuscripts, prices,
// credentials, relationship scores or invented user memories are persisted.
export function createPersona({storage,random=Math.random,now=Date.now}={}){
 const records=Object.create(null),sessions=Object.create(null);
 let saved={};try{const raw=storage?.getItem(PERSONA_MEMORY_KEY);if(raw&&raw.length<32000)saved=JSON.parse(raw)||{};}catch{}
 for(const key of Object.keys(PERSONA_LINES)){
  const old=saved[key];
  records[key]={visits:Number.isSafeInteger(old?.visits)&&old.visits>0?Math.min(old.visits,1000000):0,recent:Array.isArray(old?.recent)?old.recent.filter(s=>typeof s==='string'&&/^[a-z]+:\d+$/.test(s)).slice(-36):[]};
  sessions[key]={lastAt:-Infinity,streak:0,touches:0,pending:null};
 }
 function persist(){try{storage?.setItem(PERSONA_MEMORY_KEY,JSON.stringify(records));}catch{}}
 function pick(key,event){
  const bank=PERSONA_LINES[key][event]||PERSONA_LINES[key].touch,r=records[key];
  let candidates=bank.map((text,i)=>({id:event+':'+i,text})).filter(item=>!r.recent.includes(item.id));
  if(!candidates.length){const oldest=Math.min(...bank.map((_,i)=>r.recent.lastIndexOf(event+':'+i)));candidates=bank.map((text,i)=>({id:event+':'+i,text})).filter(item=>r.recent.lastIndexOf(item.id)===oldest);}
  const value=Number(random()),unit=Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
  const chosen=candidates[Math.floor(unit*candidates.length)];
  r.recent.push(chosen.id);r.recent=r.recent.slice(-36);persist();
  return {...chosen,event,mood:PERSONA_MOODS[event]||PERSONA_MOODS.touch};
 }
 function enter(key){
  if(!records[key])return null;
  const returning=records[key].visits>0;records[key].visits=Math.min(1000000,records[key].visits+1);
  sessions[key]={lastAt:-Infinity,streak:0,touches:0,pending:null};
  const hour=new Date(now()+9*3600000).getUTCHours();
  return pick(key,returning?'returning':hour>=5&&hour<10?'morning':hour>=22||hour<5?'night':'welcome');
 }
 function continuation(key,scene){
  const pending=sessions[key].pending;sessions[key].pending=null;
  if(!pending||pending.expires<now()||(scene!==undefined&&pending.scene!==scene))return null;
  return {id:'followup:'+pending.index,text:PERSONA_LINES[key].stories[pending.index][1],event:'followup',mood:PERSONA_MOODS.followup};
 }
 function event(key,type,{hasDraft=true,scene}={}){
  if(!records[key])return null;
  if(type==='talk'){const reply=continuation(key,scene);if(reply)return reply;}
  sessions[key].pending=null;
  return pick(key,(type==='work'||type==='resume')&&!hasDraft?'empty':type);
 }
 function touch(key,{scene='work',region='head',hasDraft=true}={}){
  if(!records[key])return null;
  const s=sessions[key],time=now(),gap=time-s.lastAt;
  if(gap>=0&&gap<320)return null;
  s.streak=gap>=0&&gap<1800?s.streak+1:1;s.lastAt=time;s.touches++;
  if(s.streak>=3&&s.streak%3===0){s.pending=null;return pick(key,'repeat');}
  if(s.pending&&s.pending.expires>=time&&s.pending.scene===scene&&region==='head'){
   return continuation(key,scene);
  }
  s.pending=null;
  if(['hair','hand','cloth'].includes(region))return pick(key,region);
  if(s.touches%4===0){
   const r=records[key],pairs=PERSONA_LINES[key].stories;
   let indexes=pairs.map((_,i)=>i).filter(i=>!r.recent.includes('story:'+i));
   if(!indexes.length)indexes=pairs.map((_,i)=>i).sort((a,b)=>r.recent.lastIndexOf('story:'+a)-r.recent.lastIndexOf('story:'+b));
   const index=indexes[0];r.recent.push('story:'+index);r.recent=r.recent.slice(-36);persist();
   s.pending={index,scene,expires:time+90000};
   return {id:'story:'+index,text:pairs[index][0],event:'story',mood:PERSONA_MOODS.story};
  }
  const contextual=s.touches%2===0&&['work','rest','tea','special'].includes(scene);
  return pick(key,contextual?(scene==='work'&&!hasDraft?'empty':scene):'touch');
 }
 function leave(key){if(sessions[key])sessions[key].pending=null;}
 return {enter,event,touch,leave};
}
