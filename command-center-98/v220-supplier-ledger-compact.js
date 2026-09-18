(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const KEEP=new Set(['仕入先','仕入れ先','実注文','実仕入点数','実仕入額','最終仕入']);

  function compactSupplierLedger(){
    if(typeof app!=='undefined'&&app.view!=='sourcing')return;
    if(sourcingApp.sub!=='suppliers')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;

    const head=host.querySelector('.supplier-ledger-head');
    if(head){
      head.querySelector('.supplier-legend')?.remove();
      const small=head.querySelector('small');
      if(small)small.textContent='Gmailで確認できた実仕入れ履歴を、仕入れ先ごとに確認できます。';
    }

    const table=host.querySelector('.supplier-ledger-head + .supplier-table-wrap .supplier-table')
      || host.querySelector('.supplier-table-wrap .supplier-table');
    if(!table||table.dataset.compactSupplierV220==='1')return;

    const header=[...table.querySelectorAll('thead th')];
    const removeIndexes=[];
    header.forEach((th,i)=>{
      const label=(th.textContent||'').trim();
      if(!KEEP.has(label))removeIndexes.push(i);
      if(label==='仕入れ先')th.textContent='仕入先';
    });

    removeIndexes.sort((a,b)=>b-a).forEach(i=>{
      table.querySelectorAll('tr').forEach(row=>{
        row.children[i]?.remove();
      });
    });

    table.dataset.compactSupplierV220='1';
    table.classList.add('supplier-table-compact-v220');
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    baseRender();
    compactSupplierLedger();
  };

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    (window.requestAnimationFrame||window.setTimeout)(()=>{
      queued=false;
      compactSupplierLedger();
    });
  };
  const observer=new MutationObserver(mutations=>{
    if(sourcingApp.sub!=='suppliers')return;
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes.length))queue();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  const style=document.createElement('style');
  style.textContent=`
    .supplier-table-compact-v220{min-width:720px}
    .supplier-table-compact-v220 th:nth-child(n+2):nth-child(-n+4),
    .supplier-table-compact-v220 td:nth-child(n+2):nth-child(-n+4){text-align:right;white-space:nowrap}
    .supplier-table-compact-v220 th:last-child,
    .supplier-table-compact-v220 td:last-child{white-space:nowrap}
    .supplier-table-compact-v220 td:first-child{min-width:240px}
    @media(max-width:760px){.supplier-table-compact-v220{min-width:640px}}
  `;
  document.head.appendChild(style);

  compactSupplierLedger();
  window.CCSupplierLedgerCompact={version:'220.1',compact:compactSupplierLedger};
})();