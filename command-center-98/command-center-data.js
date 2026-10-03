/* Read-only presentation helpers. Never rewrite source records or persistent data. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CCData=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  function timestamp(value){
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Date.parse(value);
    return Number.isFinite(n)?n:null;
  }
  function itemTime(item){
    for(const key of ['updatedAt','lastSeen','detectedAt','createdAt','occurredAt']){
      if(timestamp(item?.[key])!==null)return item[key];
    }
    return null;
  }
  function newest(items){return [...items].sort((a,b)=>(timestamp(itemTime(b))??-Infinity)-(timestamp(itemTime(a))??-Infinity))}
  function rows(source){
    if(!Array.isArray(source))throw new TypeError('一覧データの形式を確認できませんでした');
    const result=[],positions=new Map();
    for(const item of source){
      // Invalid records remain in the original response. They cannot be displayed safely.
      if(!isRecord(item))continue;
      const id=item.id;
      if(id===null||id===undefined||String(id).trim()===''){result.push(item);continue}
      const key=String(id);
      if(!positions.has(key)){positions.set(key,result.length);result.push(item);continue}
      const index=positions.get(key),previous=result[index];
      if((timestamp(itemTime(item))??-Infinity)>(timestamp(itemTime(previous))??-Infinity))result[index]=item;
    }
    return result;
  }
  function count(value){
    if(value===null||value===undefined||String(value).trim()===''||typeof value==='boolean')return '未取得';
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?n.toLocaleString('ja-JP')+'件':'不明';
  }
  function sourceState(loaded,error,loading){return error?(loaded?'stale':'error'):loaded?'ready':loading?'loading':'pending'}
  function isSalesSync(item){
    return item?.payload?.result_kind==='sales_sync'||/^gmail-sales:|^sns:gmail-sales:/.test(String(item?.id||''))||/メルカリ売上同期/.test(String(item?.title||''));
  }
  function isPostFlow(item){
    const p=item?.payload||{};
    const explicit=[item?.taskId,item?.task_id,item?.sourceTaskId,item?.source_task_id,p.task_id,p.taskId,p.source_task_id];
    const taskId=explicit.find(v=>typeof v==='string'&&/^[a-zA-Z0-9-]+$/.test(v))||String(item?.id||'').match(/^(?:sns:)*task:([a-zA-Z0-9-]+):/)?.[1];
    return ['fp_post_candidate','house_post_candidate'].includes(String(p.content_type||''))||['fp_psychology','fp_reaction','house_living'].includes(String(p.category||''))||['6a9e5826d4888191a4d82a643e6d5adf','6aa77eb5ce7881919d8dc62554833b60'].includes(taskId);
  }
  return Object.freeze({timestamp,itemTime,newest,rows,count,sourceState,isSalesSync,isPostFlow});
});
