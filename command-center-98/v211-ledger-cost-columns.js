(()=>{
  const STYLE_ID='ledger-cost-columns-v211-style';

  function compactPurchaseTable(table){
    if(!table||table.dataset.costColumnsV211==='1')return;
    const headers=[...table.querySelectorAll('thead th')];
    const displayIndex=headers.findIndex(th=>th.textContent.trim()==='表示単価');
    const unitIndex=headers.findIndex(th=>th.textContent.trim()==='実質単価');
    const totalIndex=headers.findIndex(th=>th.textContent.trim()==='実質原価');
    if(displayIndex<0||unitIndex<0||totalIndex<0)return;

    headers[unitIndex].textContent='1個原価';
    headers[totalIndex].textContent='仕入総額';

    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=[...tr.children];
      const displayCell=cells[displayIndex];
      const unitCell=cells[unitIndex];
      const totalCell=cells[totalIndex];
      if(!displayCell||!unitCell||!totalCell)return;

      const orderUnit=displayCell.textContent.trim();
      const effectiveUnit=unitCell.textContent.trim();
      const totalCost=totalCell.textContent.trim();

      unitCell.classList.add('ledger-one-unit-cost');
      totalCell.classList.add('ledger-total-cost');
      unitCell.innerHTML='<span class="ledger-cost-main">@ '+effectiveUnit+'</span><small class="ledger-cost-order">注文時 '+orderUnit+'</small>';
      totalCell.innerHTML='<span class="ledger-total-main">計 '+totalCost+'</span>';
      displayCell.remove();
    });

    headers[displayIndex].remove();
    table.classList.add('purchase-cost-columns-v211');
    table.dataset.costColumnsV211='1';
  }

  function enhanceLedgerCostColumns(){
    if(typeof sourcingApp!=='undefined'&&sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    host.querySelectorAll('.purchase-table').forEach(compactPurchaseTable);
  }

  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .purchase-table.purchase-cost-columns-v211{min-width:1020px}
      .purchase-cost-columns-v211 .ledger-one-unit-cost{min-width:108px;white-space:nowrap}
      .purchase-cost-columns-v211 .ledger-cost-main{display:block;color:#005500;font-weight:900;font-size:12px;line-height:1.15}
      .purchase-cost-columns-v211 .ledger-cost-order{display:block;margin-top:2px;color:#666;font-size:10px;font-weight:400;line-height:1.15;white-space:nowrap}
      .purchase-cost-columns-v211 .ledger-total-cost{min-width:104px;color:#111!important;font-weight:900!important;white-space:nowrap}
      .purchase-cost-columns-v211 .ledger-total-main{display:block;color:#111;font-weight:900}
      @media(max-width:760px){.purchase-table.purchase-cost-columns-v211{min-width:960px}}
    `;
    document.head.appendChild(style);
  }

  if(typeof renderSourcing==='function'){
    const previousRenderSourcing=renderSourcing;
    renderSourcing=function(){
      previousRenderSourcing();
      enhanceLedgerCostColumns();
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceLedgerCostColumns);
  else enhanceLedgerCostColumns();

  window.CCLedgerCostColumns={enhance:enhanceLedgerCostColumns};
})();
