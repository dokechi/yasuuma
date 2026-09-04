(()=>{
  function currentJstMonth(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const y=parts.find(x=>x.type==='year')?.value;
    const m=parts.find(x=>x.type==='month')?.value;
    return y&&m?`${y}-${m}`:'';
  }
  try{
    if(typeof sourcingApp!=='undefined'){
      const month=currentJstMonth();
      if(month)sourcingApp.purchaseMonth=month;
    }
  }catch(e){console.warn('ledger month patch unavailable',e)}
})();
