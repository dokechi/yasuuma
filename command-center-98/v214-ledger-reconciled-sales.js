(()=>{
  function enhanceReconciledSales(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');if(!host)return;
    const groups=new Map();
    for(const p of sourcingApp.purchases||[]){
      const key=(p.supplier_key||'')+'|'+(p.order_id||p.source_message_id||p.id);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(p);
    }
    const grouped=[...groups.values()];
    host.querySelectorAll('.purchase-order').forEach((section,sectionIndex)=>{
      const rows=grouped[sectionIndex]||[];
      section.querySelectorAll('.purchase-table tbody tr').forEach((tr,rowIndex)=>{
        const p=rows[rowIndex];
        const adjusted=Number(p?.adjustment_quantity||0);
        if(!p||adjusted<=0)return;
        const sold=Number(p.sold_quantity||0);
        const cells=[...tr.children];
        if(cells.length<3)return;
        const saleCell=cells[cells.length-3];
        const remCell=cells[cells.length-1];
        if(saleCell){
          saleCell.innerHTML='<span class="ledger-sale-tag reconciled">実数確認 '+sold+'点</span>';
        }
        if(remCell){
          const sub=remCell.querySelector('.ledger-sale-sub');
          const label='実数補正 +'+adjusted+'点';
          if(sub){sub.className='ledger-sale-sub reconciled';sub.textContent=label}
          else{
            const tip=remCell.querySelector('.ledger-sale-tip');
            const span=document.createElement('span');span.className='ledger-sale-sub reconciled';span.textContent=label;
            remCell.insertBefore(span,tip||null);
          }
          const tip=remCell.querySelector('.ledger-sale-tip');
          if(tip&&!tip.dataset.reconciled){
            tip.dataset.reconciled='1';
            tip.textContent+=' うち'+adjusted+'点はユーザー実数確認による最低販売数補正。Gmail照合数が追いつけば補正は自動的に吸収され、二重減算しません。';
          }
        }
        tr.classList.add('sale-linked-reconciled');
      });
    });
  }
  const style=document.createElement('style');
  style.textContent='.ledger-sale-tag.reconciled{color:#5a2500;background:#fff0d8;border-color:#a56b26}.ledger-sale-sub.reconciled{color:#8a3b00;font-weight:700}.purchase-sales-table tr.sale-linked-reconciled{background:#fff8ee}';
  document.head.appendChild(style);
  if(typeof renderSourcing==='function'){
    const previous=renderSourcing;
    renderSourcing=function(){previous();enhanceReconciledSales()};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceReconciledSales);else enhanceReconciledSales();
  window.CCLedgerReconciledSales={enhance:enhanceReconciledSales};
})();
