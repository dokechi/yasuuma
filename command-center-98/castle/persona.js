import {PERSONA_QUOTES} from './persona-lines.js?v=26';
export const PERSONA_MEMORY_KEY='castle-town.persona.v1';
export function createPersona({storage,random=Math.random,now=Date.now}={}){
 const records=Object.create(null),lastTouch=Object.create(null);
 let saved={};try{const raw=storage?.getItem(PERSONA_MEMORY_KEY);if(raw&&raw.length<32000)saved=JSON.parse(raw)||{};}catch{}
 for(const key of Object.keys(PERSONA_QUOTES)){
  const old=saved[key],count=PERSONA_QUOTES[key].quotes.length;
  records[key]={visits:Number.isSafeInteger(old?.visits)&&old.visits>0?Math.min(old.visits,1000000):0,recent:Array.isArray(old?.recent)?old.recent.filter(s=>typeof s==='string'&&/^quote:\d+$/.test(s)&&Number(s.split(':')[1])<count).slice(-36):[]};
  lastTouch[key]=-Infinity;
 }
 function persist(){try{storage?.setItem(PERSONA_MEMORY_KEY,JSON.stringify(records));}catch{}}
 function pick(key){
  const cast=PERSONA_QUOTES[key],record=records[key];if(!record||!cast)return null;
  const pool=cast.quotes.map((quote,i)=>({...quote,id:'quote:'+i,index:i+1}));
  let candidates=pool.filter(q=>!record.recent.includes(q.id));
  if(!candidates.length){const oldest=Math.min(...pool.map(q=>record.recent.lastIndexOf(q.id)));candidates=pool.filter(q=>record.recent.lastIndexOf(q.id)===oldest);}
  const value=Number(random()),unit=Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
  const quote=candidates[Math.floor(unit*candidates.length)];
  record.recent.push(quote.id);record.recent=record.recent.slice(-36);persist();
  return {...quote,character:cast.name,total:pool.length,event:'quote',mood:cast.name+'・'+quote.context};
 }
 function enter(key){if(!records[key])return null;records[key].visits=Math.min(1000000,records[key].visits+1);lastTouch[key]=-Infinity;return pick(key);}
 function touch(key){if(!records[key])return null;const time=now(),gap=time-lastTouch[key];if(gap>=0&&gap<320)return null;lastTouch[key]=time;return pick(key);}
 function event(key,type){return ['talk','touch'].includes(type)?pick(key):null;}
 function leave(key){if(records[key])lastTouch[key]=-Infinity;}
 return {enter,event,touch,leave};
}
