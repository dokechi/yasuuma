/* Browser-local reading aids. Never changes a server record or posted state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CCRpgDailyStore=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const PREFIX='cc-rpg-daily.v1.';
 function create(storage,{now=()=>Date.now(),onError=()=>{}}={}){
  const memory=new Map(),undo=[];let failed=false,sequence=0;
  const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
  function read(key,fallback){if(memory.has(key))return clone(memory.get(key));try{const raw=storage?.getItem(PREFIX+key);if(raw!=null){const value=JSON.parse(raw);memory.set(key,value);return clone(value);}}catch{}return fallback;}
  function write(key,value,remember=false){const before=read(key,undefined);memory.set(key,clone(value));let saved=true;try{if(!storage)throw Error('storage unavailable');storage.setItem(PREFIX+key,JSON.stringify(value));}catch{failed=true;saved=false;onError();}if(remember){undo.push({key,before,after:clone(value)});if(undo.length>20)undo.shift();}return saved;}
  function remove(key){memory.delete(key);try{storage?.removeItem(PREFIX+key);return true;}catch{failed=true;onError();return false;}}
  function rows(){let keys=[];try{for(let i=0;i<(storage?.length||0);i++){const key=storage.key(i);if(key?.startsWith(PREFIX+'copy:'))keys.push(key.slice(PREFIX.length));}}catch{}keys=[...new Set([...keys,...[...memory.keys()].filter(k=>k.startsWith('copy:'))])];return keys.map(k=>read(k,null)).filter(x=>x&&typeof x.text==='string'&&typeof x.account==='string'&&Number.isFinite(x.time)).sort((a,b)=>b.time-a.time);}
  function copied(record){const event={account:String(record.account),id:String(record.id),title:String(record.title||''),label:String(record.label||'本文'),text:String(record.text),time:now(),eventId:now().toString(36)+'-'+sequence+++'-'+Math.random().toString(36).slice(2,8)};write('copy:'+event.eventId,event);for(const old of rows().slice(100))remove('copy:'+old.eventId);return event;}
  function rollback(){const op=undo.pop();if(!op)return false;let current=read(op.key,undefined);if(storage&&!failed){try{const raw=storage.getItem(PREFIX+op.key);current=raw===null?undefined:JSON.parse(raw);}catch{}}if(JSON.stringify(current)!==JSON.stringify(op.after))throw Error('別の画面で変更されたため、元に戻せません。');return op.before===undefined?remove(op.key):write(op.key,op.before);}
  function flag(type,account,id){return read(type+':'+account+':'+id,false)===true;}
  function toggle(type,account,id){if(!['pin','tray','done'].includes(type))throw Error('Unknown local flag');const value=!flag(type,account,id);write(type+':'+account+':'+id,value,true);return value;}
  function day(value){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';}
  return {read,write,copied,history:rows,flag,toggle,undo:rollback,copyMark:r=>rows().find(x=>x.account===r.account&&x.id===r.id&&x.label===r.label&&x.text===r.text),
   visit:account=>write('visit:'+account,now()),usedToday:account=>day(read('visit:'+account,0))===day(now()),persistent:()=>!failed,
   sync:()=>memory.clear(),prefix:PREFIX};
 }
 return {create,PREFIX};
});
