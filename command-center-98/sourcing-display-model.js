(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CCSourcingDisplayModel=api;
})(typeof window==='undefined'?globalThis:window,function(){
  const compare=(a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0);
  const readyItems=(items,predicate)=>(items||[]).filter(x=>typeof predicate==='function'&&predicate(x)).sort(compare);
  const closeItems=items=>(items||[]).filter(x=>x.sourcingVerdict==='close').sort(compare);
  function snapshot(items,predicate,research){
    const ready=readyItems(items,predicate),closed=closeItems(items);
    // Projection arrays are new; source records and their order are untouched.
    const rows=Array.isArray(research)?research.slice():[];
    return {ready,closed,research:rows,researchCount:rows.length,total:ready.length+closed.length+rows.length};
  }
  const first=(source,keys)=>keys.map(key=>source?.[key]).find(value=>value!==undefined&&value!==null&&String(value).trim()!=='');
  const safeUrl=value=>{
    try{const url=new URL(String(value));return ['http:','https:'].includes(url.protocol)?url.href:''}catch(_){return ''}
  };
  const historyKeys=['mercari_sales_history','mercari_sold','mercari_solds','mercariSalesHistory','mercari_history','mercari_sold_history','mercari_transactions'];
  function historyRows(value){
    if(Array.isArray(value))return value;
    if(value&&typeof value==='object')return [value];
    if(typeof value==='string'&&value.trim()){
      try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:(parsed&&typeof parsed==='object'?[parsed]:[])}catch(_){return []}
    }
    return [];
  }
  function normalizedMercariHistory(payload){
    const out=[],seen=new Set();
    for(const name of historyKeys){
      for(const row of historyRows(payload?.[name])){
        const id=String(first(row,['mercari_item_id','product_id','item_id','id'])||'');
        const urlId=id.trim();
        const direct=safeUrl(first(row,['direct_url','url','mercari_url','item_url']));
        const url=direct||(/^m[0-9A-Za-z_-]+$/.test(urlId)?'https://jp.mercari.com/item/'+encodeURIComponent(urlId):'');
        const key=id||url||JSON.stringify(row);
        if(seen.has(key))continue;
        seen.add(key);out.push({...row,__url:url});
      }
      // Keep the existing detail view's first nonempty history source rule.
      if(out.length)break;
    }
    return out;
  }
  function comparison(item,fields={},evidence=item?.payload||{}){
    const payload=item?.payload||{};
    const gradeKeys=['overall_grade','overall_rating','総合'];
    const rawGrade=first(payload,gradeKeys)??first(item,gradeKeys);
    const grade=typeof rawGrade==='number'||typeof rawGrade==='string'?String(rawGrade).trim():'';
    const oldGrade=String(rawGrade??'').trim().toUpperCase();
    const priority=String(item?.priority??'').trim().toUpperCase();
    const legacyGrade=['S','A','B','C'].includes(oldGrade)?oldGrade:(['S','A','B','C'].includes(priority)?priority:'');
    // 4 is the highest relative candidate rating; 1 is still a candidate.
    // Never translate the old score/letter ranking into the recorded 1-4 scale.
    const discovered=first(item,['firstSeen','detectedAt','createdAt'])??first(payload,['discovered_at','detected_at','first_seen_at']);
    const date=discovered&&new Date(discovered);
    const discoveryDate=date&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(date):'未確認';
    const links=[];
    const add=(label,value)=>{
      for(const raw of Array.isArray(value)?value:[value]){
        const url=safeUrl(typeof raw==='object'&&raw!==null?(raw.direct_url||raw.url||raw.item_url):raw);
        if(url&&!links.some(link=>link.url===url))links.push({label,url});
      }
    };
    add('商品',item?.url);
    add('メルカリ根拠',first(evidence,['mercari_sold_urls','mercari_new_sold_urls','mercari_new_sold_evidence_urls','mercari新品SOLD根拠URL']));
    add('メルカリ根拠',normalizedMercariHistory(evidence).map(row=>row.__url));
    add('ヤフーフリマ根拠',first(evidence,['yahoo_sold_urls','yahoo_fleamarket_sold_urls','yahoo_sales_history','yahoo_fleamarket_sales_history']));
    return {grade:/^[1-4]$/.test(grade)?grade:'未確認',legacyGrade,discoveryDate,
      reason:String(first(payload,['one_line_reason','short_reason'])??item?.summary??item?.reason??'根拠は未確認'),
      buy:fields.buy??null,quantity:fields.quantity??null,links};
  }
  return {readyItems,closeItems,snapshot,comparison,normalizedMercariHistory};
});
