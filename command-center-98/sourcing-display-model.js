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
  function comparison(item,fields={},evidence=item?.payload||{}){
    const payload=item?.payload||{};
    const rawGrade=first(payload,['overall_grade','overall_rating','総合'])??item?.priority;
    const grade=String(rawGrade??'').trim().toUpperCase();
    // Keep recorded grades; missing or unsupported values are not inferred from score.
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
    add('メルカリ根拠',first(evidence,['mercari_sales_history','mercari_sold','mercari_solds','mercariSalesHistory','mercari_history','mercari_sold_history','mercari_transactions']));
    add('ヤフーフリマ根拠',first(evidence,['yahoo_sold_urls','yahoo_fleamarket_sold_urls','yahoo_sales_history','yahoo_fleamarket_sales_history']));
    return {grade:['S','A','B','C'].includes(grade)?grade:'未確認',discoveryDate,
      reason:String(first(payload,['one_line_reason','short_reason'])??item?.summary??item?.reason??'根拠は未確認'),
      buy:fields.buy??null,quantity:fields.quantity??null,links};
  }
  return {readyItems,closeItems,snapshot,comparison};
});
