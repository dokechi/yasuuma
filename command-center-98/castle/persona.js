import {PERSONA_DIALOGUE} from './persona-lines.js?v=28';
export const PERSONA_MEMORY_KEY='castle-town.persona.v1';
export function createPersona({storage,now=Date.now}={}){
 const records=Object.create(null),touches=Object.create(null);
 let saved={};try{const raw=storage?.getItem(PERSONA_MEMORY_KEY);if(raw&&raw.length<32000)saved=JSON.parse(raw)||{};}catch{}
 for(const key of Object.keys(PERSONA_DIALOGUE)){
  const old=saved[key];
  // Keep visit counts, but discard quotation history and never persist touch bursts.
  records[key]={visits:Number.isSafeInteger(old?.visits)&&old.visits>0?Math.min(old.visits,1000000):0};
  touches[key]={last:-Infinity,replied:false};
 }
 function persist(){try{storage?.setItem(PERSONA_MEMORY_KEY,JSON.stringify(records));}catch{}}
 function reply(key,event){return {id:key+':'+event,text:PERSONA_DIALOGUE[key][event],event};}
 function leave(key){if(records[key])touches[key]={last:-Infinity,replied:false};}
 function enter(key){if(!records[key])return null;records[key].visits=Math.min(1000000,records[key].visits+1);leave(key);persist();return reply(key,'welcome');}
 function touch(key){
  if(!records[key])return null;
  const state=touches[key],time=now(),gap=time-state.last;
  if(gap>=0&&gap<320)return null;
  const repeated=gap>=0&&gap<=8000;state.last=time;
  if(!repeated)state.replied=false;
  if(repeated&&!state.replied){state.replied=true;return reply(key,'repeatTouch');}
  // A first tap (or a further tap in the same burst) gets a visual reaction only.
  return {id:key+':touch',event:'touch'};
 }
 function event(key,type){return type==='touch'?touch(key):null;}
 return {enter,event,touch,leave};
}
