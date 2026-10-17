// Portable, browser-local records. No credentials and no production writes.
export const NOTEBOOK_PREFIX='castle-production.v1.';
// Presentation only: explicit source identity, never titles or guessed URLs.
export function groupDrafts(rows){
 const groups=new Map();
 for(const draft of rows){const source=draft.source,known=source&&source.id&&source.account&&!['undefined','null'].includes(source.id)&&!['undefined','null'].includes(source.account);
  const key=JSON.stringify(known?[draft.place,source.account,source.id]:['draft',draft.id]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(draft);
 }
 return [...groups.values()];
}
export function safeLink(value){const s=String(value||'').trim();if(!s)return '';try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function dayInJapan(time=Date.now()){if(!Number.isFinite(Number(time))||!Number.isFinite(new Date(Number(time)).getTime()))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
export function createNotebook({seeds={},storage,now=()=>Date.now(),onError=()=>{}}={}){
 const records=new Map(),undoStack=[];let serial=0,persistent=true;
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const id=()=>`n-${now().toString(36)}-${Math.random().toString(36).slice(2,9)}-${serial++}`;
 function sync(){if(!storage)return;try{records.clear();for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(NOTEBOOK_PREFIX)){try{records.set(k.slice(NOTEBOOK_PREFIX.length),JSON.parse(storage.getItem(k)));}catch{}}}}catch{persistent=false;onError();}}
 sync();
 function put(key,value){records.set(key,clone(value));try{if(!storage)throw Error('storage');storage.setItem(NOTEBOOK_PREFIX+key,JSON.stringify(value));return true;}catch{persistent=false;onError();return false;}}
 function remove(key){records.delete(key);try{if(!storage)throw Error('storage');storage.removeItem(NOTEBOOK_PREFIX+key);return true;}catch{persistent=false;onError();return false;}}
 function change(key,value){const before=clone(records.get(key));const ok=put(key,value);undoStack.push({key,before,after:clone(value)});if(undoStack.length>20)undoStack.shift();return ok;}
 function normalize(d,{generated=false}={}){
  if(!d||!Object.hasOwn(seeds,d.place)||typeof d.title!=='string'||typeof d.body!=='string'||!d.title.trim()||!d.body.trim())throw Error('持ち場・見出し・本文を確認してください');
  if(d.title.length>200||d.body.length>100000)throw Error('見出しは200文字、本文は10万文字以内です');
  const time=value=>Number.isFinite(new Date(Number(value)).getTime())&&Number(value)>0?Number(value):now();
  const link=safeLink(d.link);if(d.link&&!link)throw Error('リンクは http または https のURLにしてください');
  return {id:generated?id():String(d.id||id()).slice(0,500),place:d.place,title:d.title.trim(),body:d.body,link,kind:String(d.kind||'原稿').slice(0,30),sample:Boolean(d.sample),createdAt:time(d.createdAt),updatedAt:time(d.updatedAt),checkedAt:String(d.checkedAt||'').slice(0,80),...(d.source&&typeof d.source==='object'?{source:{id:String(d.source.id),account:String(d.source.account),label:String(d.source.label),status:String(d.source.status||'')}}:{})};
 }
 const samples=Object.entries(seeds).flatMap(([place,rows])=>rows.map((d,i)=>normalize({...d,place,id:`sample-${place}-${i}`,sample:true,createdAt:1,updatedAt:1})));
 function isHidden(draftId){const value=records.get('hidden:'+draftId);return value===true||Boolean(value&&value.hidden!==false)||Boolean(records.get('draft:'+draftId)?.deleted);}
 function all({includeHidden=false}={}){const map=new Map(samples.map(d=>[d.id,d]));for(const [k,v]of records)if(k.startsWith('source:')){try{const d=normalize(v);map.set(d.id,d);}catch{}}for(const [k,v] of records){if(k.startsWith('draft:')&&v?.id&&!v.deleted){try{const d=normalize(v);map.set(d.id,d);}catch{}}}for(const [k,v]of records)if(k.startsWith('hidden:')&&v?.draft&&!map.has(v.draft.id)){try{const d=normalize(v.draft);if(d.source)d.source.status='保存時点の端末コピー・現在状態未確認';map.set(d.id,d);}catch{}}return [...map.values()].filter(d=>includeHidden||!isHidden(d.id));}
 function get(draftId){return all().find(d=>d.id===draftId)||null;}
 function flag(type,draftId){return Boolean(records.get(`${type}:${draftId}`));}
 function list(place){return all().filter(d=>d.place===place).sort((a,b)=>Number(flag('pin',b.id))-Number(flag('pin',a.id))||a.createdAt-b.createdAt||a.id.localeCompare(b.id));}
 function save(draft){const old=get(draft.id),d=normalize({...draft,...(old?.source?{id:id(),source:undefined}:{}),createdAt:old?.createdAt||now(),updatedAt:now(),sample:false});const saved=change('draft:'+d.id,d);return {draft:d,saved};}
 function erase(draftId){const d=get(draftId);if(!d)return false;return change('hidden:'+draftId,{draft:d,hidden:true,time:now()});}
 function hiddenDrafts(){return all({includeHidden:true}).filter(d=>isHidden(d.id));}
 function restore(draftId){const d=hiddenDrafts().find(d=>d.id===draftId);if(!d)return false;const legacyKey='draft:'+draftId,hiddenKey='hidden:'+draftId,marker=records.get(hiddenKey),changes=[];let saved=true;if(records.get(legacyKey)?.deleted){changes.push({key:legacyKey,before:clone(records.get(legacyKey)),after:undefined});saved=remove(legacyKey)&&saved;}if(marker){const next={...(typeof marker==='object'?marker:{}),draft:d,hidden:false};changes.push({key:hiddenKey,before:clone(marker),after:next});saved=put(hiddenKey,next)&&saved;}undoStack.push({batch:changes});return saved;}
 function toggle(type,draftId){if(!['pin','tray'].includes(type)||!get(draftId))return false;change(`${type}:${draftId}`,!flag(type,draftId));return flag(type,draftId);}
 function remember(place,draftId,scroll){put('read:'+draftId,Math.max(0,Math.min(Number(scroll)||0,1e7)));put('selected:'+place,draftId);}
 function visit(place){put('lastPlace',place);put('visit:'+place,now());const first=!records.get('visited:'+place);put('visited:'+place,true);return first;}
 function copied(draft,kind,text){const event={id:id(),draftId:draft.id,place:draft.place,title:draft.title,kind,text,time:now()};put('copy:'+event.id,event);const history=copies();for(const old of history.slice(100))remove('copy:'+old.id);return event;}
 function copies(){return [...records].filter(([k,v])=>k.startsWith('copy:')&&v&&typeof v.text==='string'&&Object.hasOwn(seeds,v.place)&&Number.isFinite(new Date(v.time).getTime())).map(([,v])=>clone(v)).sort((a,b)=>b.time-a.time);}
 function copyMark(d){return copies().find(c=>c.draftId===d.id&&c.kind==='body'&&c.text===d.body)||null;}
 function finish(d){return change('done:'+d.id,{id:d.id,place:d.place,title:d.title,body:d.body,time:now()});}
 function completed(place){return [...records].filter(([k,v])=>k.startsWith('done:')&&v?.place===place&&typeof v.title==='string'&&typeof v.body==='string'&&Number.isFinite(new Date(v.time).getTime())).map(([,v])=>clone(v)).sort((a,b)=>b.time-a.time);}
 function unchanged(op){let value=records.get(op.key);if(storage&&persistent){try{const raw=storage.getItem(NOTEBOOK_PREFIX+op.key);value=raw===null?undefined:JSON.parse(raw);}catch{}}return JSON.stringify(value)===JSON.stringify(op.after);}
 function undo(){const op=undoStack.pop();if(!op)return false;if(!unchanged(op))throw Error('別の画面で更新されたため、元に戻せません');return op.before===undefined?remove(op.key):put(op.key,op.before);}
 function parseImport(text){if(text.length>5000000)throw Error('読み込めるファイルは5MBまでです');let data;try{data=JSON.parse(text);}catch{throw Error('JSONファイルを確認してください');}const rows=Array.isArray(data)?data:data?.drafts;if(!Array.isArray(rows)||rows.length>500)throw Error('原稿は一度に500件まで読み込めます');const seen=new Set();return rows.map(raw=>{const d=normalize({...raw,source:undefined,...(String(raw.id||'').startsWith('live-')?{id:id()}:{} )});if(seen.has(d.id))throw Error('同じIDの原稿が重複しています');seen.add(d.id);return d;});}
 function applyImport(rows){const changes=[];let saved=true;for(const row of rows){const d=normalize(row),key='draft:'+d.id;changes.push({key,before:clone(records.get(key)),after:d});saved=put(key,d)&&saved;}undoStack.push({batch:changes});return saved;}
 function undoAny(){const op=undoStack.at(-1);if(!op?.batch)return undo();undoStack.pop();for(const x of op.batch)if(!unchanged(x))throw Error('別の画面の更新があるため、取り込みを元に戻せません');let ok=true;for(const x of op.batch)ok=(x.before===undefined?remove(x.key):put(x.key,x.before))&&ok;return ok;}
 function sources(){return [...records].filter(([k])=>k.startsWith('source:')).map(([,v])=>clone(v));}
 function replaceSources(rows,{complete=false}={}){const normalized=rows.map(d=>normalize(d));const ids=new Set(normalized.map(d=>d.id));if(complete)for(const [k,v]of [...records])if(k.startsWith('source:')&&!ids.has(v.id))remove(k);for(const d of normalized)put('source:'+d.id,d);}
 return {sources,replaceSources,list,all,get,save,erase,hiddenDrafts,restore,toggle,flag,remember,visit,copied,copies,copyMark,finish,completed,sync,parseImport,applyImport,undo:undoAny,
  position:draftId=>Number(records.get('read:'+draftId))||0,selected:place=>records.get('selected:'+place),lastPlace:()=>records.get('lastPlace'),usedToday:place=>dayInJapan(records.get('visit:'+place)||1)===dayInJapan(now()),
  pref:(key,fallback)=>records.has('pref:'+key)?clone(records.get('pref:'+key)):fallback,setPref:(key,v)=>put('pref:'+key,v),
  export:()=>JSON.stringify({format:'command-center-v1',exportedAt:new Date(now()).toISOString(),drafts:all({includeHidden:true})},null,2),persistent:()=>persistent,canUndo:()=>undoStack.length>0};
}
