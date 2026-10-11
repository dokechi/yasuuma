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
  return {readyItems,closeItems,snapshot};
});
