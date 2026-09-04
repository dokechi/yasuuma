(()=>{
  function currentJstMonth(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const y=parts.find(x=>x.type==='year')?.value;
    const m=parts.find(x=>x.type==='month')?.value;
    return y&&m?`${y}-${m}`:'';
  }
  function monthRange(){
    const start='2026-08';
    const end=currentJstMonth()||start;
    const [sy,sm]=start.split('-').map(Number),[ey,em]=end.split('-').map(Number);
    const out=[];
    for(let y=sy,m=sm;y<ey||(y===ey&&m<=em);){
      out.push(`${y}-${String(m).padStart(2,'0')}`);
      m++;if(m===13){m=1;y++}
    }
    return out;
  }
  function injectStyle(){
    if(document.getElementById('ledgerMonthStyle'))return;
    const s=document.createElement('style');
    s.id='ledgerMonthStyle';
    s.textContent='.ledger-month-tabs{display:flex;align-items:flex-end;gap:2px;margin:0 0 8px;padding:0 3px;border-bottom:2px solid #808080}.ledger-month-tab{min-width:58px;height:29px;padding:3px 12px 4px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #808080 #fff;box-shadow:inset 1px 1px #dfdfdf;font:700 12px Tahoma,"MS UI Gothic","MS Gothic",sans-serif;cursor:pointer;position:relative;top:2px}.ledger-month-tab:hover{background:#d2d2d2}.ledger-month-tab.selected{height:31px;top:2px;background:#fff;border-color:#fff #000 #fff #fff;box-shadow:none;z-index:1}.ledger-month-tab:disabled{cursor:default;color:#555}.ledger-month-loading{font-size:11px;color:#555;margin-left:6px;padding-bottom:5px}@media(max-width:620px){.ledger-month-tabs{overflow-x:auto}.ledger-month-tab{min-width:52px;padding-left:9px;padding-right:9px;flex:0 0 auto}}';
    document.head.appendChild(s);
  }
  function monthTabsHtml(){
    const months=monthRange();
    const active=String(sourcingApp.purchaseMonth||currentJstMonth());
    return '<div class="ledger-month-tabs" role="tablist" aria-label="仕入れ月">'+months.map(m=>'<button type="button" class="ledger-month-tab'+(m===active?' selected':'')+'" data-ledger-month="'+m+'" role="tab" aria-selected="'+(m===active?'true':'false')+'">'+Number(m.slice(5))+'月</button>').join('')+'</div>';
  }
  function bindMonthTabs(host){
    host.querySelectorAll('[data-ledger-month]').forEach(btn=>btn.onclick=async()=>{
      const month=btn.dataset.ledgerMonth;
      if(!month||month===sourcingApp.purchaseMonth||app.busy)return;
      if(typeof bump==='function')bump(btn);
      host.querySelectorAll('[data-ledger-month]').forEach(b=>b.disabled=true);
      sourcingApp.purchaseMonth=month;
      sourcingApp.sub='purchases';
      if(typeof setStatus==='function')setStatus(Number(month.slice(5))+'月を再集計中...',true);
      await load('sourcing');
    });
  }
  try{
    injectStyle();
    if(typeof sourcingApp!=='undefined'){
      const month=currentJstMonth();
      if(month)sourcingApp.purchaseMonth=month;
    }
    if(typeof renderSourcing==='function'){
      const baseRenderSourcing=renderSourcing;
      renderSourcing=function(){
        baseRenderSourcing();
        if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
        const host=document.getElementById('sourcingBody');
        if(!host)return;
        host.insertAdjacentHTML('afterbegin',monthTabsHtml());
        bindMonthTabs(host);
      };
    }
  }catch(e){console.warn('ledger month patch unavailable',e)}
})();
