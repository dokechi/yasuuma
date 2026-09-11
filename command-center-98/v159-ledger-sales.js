(()=>{
  const n=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/\s+/g,' ');
  const money=v=>'¥'+Number(v||0).toLocaleString('ja-JP');

  function ruleFor(ctx){
    const t=n(ctx.text),order=n(ctx.order),qty=Number(ctx.qty||0);
    const exact=(sold,total,detail,extra={})=>({kind:'exact',sold,total,detail,remaining:Math.max(0,qty-sold),...extra});
    const high=(sold,total,detail,extra={})=>({kind:'high',sold,total,detail,remaining:Math.max(0,qty-sold),...extra});
    const candidate=(sold,total,detail)=>({kind:'candidate',sold,total,detail,remaining:null});

    if(t.includes('073213053')) return exact(2,9898,'¥4,999・¥4,899');
    if(t.includes('073213354')&&(t.includes('40(L)')||t.includes('40（L）')||t.includes('/ 40')))
      return exact(Math.min(qty,3),21297,'白プリーツLは4件確認（¥5,499・¥5,000・¥5,299・¥5,499）', {overflow:Math.max(0,4-qty), observed:4});
    if(t.includes('073212056')&&order.includes('10152832')) return high(1,4999,'黒ハーフジップ ¥4,999（同一商品としてFIFO仮割当）');

    if(t.includes('D103172935')) return exact(1,1199,'DIADORA サンバイザー ¥1,199',{baseQty:7,remaining:6});
    if(t.includes('IS9686')&&(t.includes('J/L')||t.includes(' L'))) return exact(1,3999,'adidas GOLF プリーツスカートL ¥3,999');

    if(t.includes('ECHO CLOG')&&(t.includes('M8')||t.includes('26CM'))) return exact(1,5999,'crocs Echo Clog BLACK 26cm ¥5,999');
    if(t.includes('PEARLY GATES')&&t.includes('JIBBITZ')&&(order.includes('12606')||order.includes('12700'))){
      const sold=order.includes('12606')?Math.min(qty,2):Math.min(qty,2);
      return exact(sold,sold*1499,'PEARLY GATES JIBBITZ 5個 '+money(1499)+'×'+sold+'（FIFO仮割当）');
    }

    if((t.includes('HONMA')||t.includes('本間ゴルフ'))&&(t.includes('福袋')||qty>=50))
      return {kind:'component',sold:30,total:44892,detail:'福袋の構成品を販売：売価確認30件 ¥44,892／売上確定のみ2件',remaining:null};
    if(t.includes('SRIXON')&&(t.includes('スコア')||t.includes('COUNTER')))
      return exact(Math.min(qty,4),3196,'赤＋青セット 4件 ¥799×4（売上は注文内で1回だけ集計）',{shared:true});
    if((t.includes('MIZUNO')||t.includes('ミズノ'))&&t.includes('BG')&&(t.includes(' M')||t.includes('/M')||t.includes('Mサイズ')))
      return exact(2,2998,'BG サポーターM ¥1,499×2');
    if((t.includes('CALLAWAY')||t.includes('キャロウェイ'))&&(t.includes('カート')||t.includes('BAG')))
      return exact(1,1899,'Callaway カートバッグ ¥1,899');

    if((t.includes('POLO RALPH LAUREN')||t.includes('ポロ ラルフ'))&&(t.includes('靴下')||t.includes('ソックス')))
      return high(Math.min(qty,5),6296,'白ソックス3足：売価確認4件 ¥6,296／売上確定のみ1件',{confirmedOnly:1});
    if((t.includes("CLEO'S BEAUTÉ")||t.includes('CLEO')||t.includes('クレオ'))&&(t.includes('トリートメント')||t.includes('BEAUTÉ')))
      return high(Math.min(qty,10),16496,'2本×3件・4本×1件＝10本／¥16,496',{overflow:Math.max(0,10-qty), observed:10});

    if(t.includes('REEF THE LAYBACK')) return candidate(3,5397,'黒27.2cmが3件／¥5,397。仕入行はGreyBlue US9のため未確定');
    if(t.includes('REEF OASIS TWO-BAR')) return candidate(1,2400,'黒27.2cmが1件／¥2,400。仕入行はBEG 26cmのため未確定');
    return null;
  }

  function badge(r){
    if(r.kind==='candidate')return '<span class="ledger-sale-tag candidate">△ 候補'+r.sold+'件</span>';
    if(r.kind==='component')return '<span class="ledger-sale-tag component">構成品 '+r.sold+'件</span>';
    const label=r.kind==='high'?'高確度':'照合済';
    return '<span class="ledger-sale-tag '+r.kind+'">'+label+' '+r.sold+(r.observed?'／確認'+r.observed:'')+'</span>'+(r.overflow?'<span class="ledger-sale-over">超過'+r.overflow+'</span>':'');
  }

  function enhanceLedgerSales(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');if(!host)return;
    host.querySelectorAll('.purchase-order').forEach(section=>{
      const head=section.querySelector('.purchase-order-head')?.textContent||'';
      const table=section.querySelector('.purchase-table');if(!table||table.dataset.salesEnhanced)return;
      table.dataset.salesEnhanced='1';table.classList.add('purchase-sales-table');
      const hr=table.querySelector('thead tr');
      if(hr)hr.insertAdjacentHTML('beforeend','<th class="sale-col">販売確認</th><th class="sale-col">売れた金額</th><th class="sale-col">残数</th>');
      let sharedShown=false;
      table.querySelectorAll('tbody tr').forEach(tr=>{
        const cells=[...tr.children],qty=Number((cells[3]?.textContent||'').replace(/[^0-9.-]/g,''));
        const r=ruleFor({text:cells.slice(0,3).map(x=>x.textContent).join(' '),order:head,qty});
        if(!r){tr.insertAdjacentHTML('beforeend','<td class="sale-empty">未照合</td><td class="sale-empty">—</td><td class="sale-empty">未確定</td>');return}
        let total=r.total;
        if(r.shared&&sharedShown)total=0;
        if(r.shared)sharedShown=true;
        const amount=r.kind==='candidate'?money(r.total)+'<small>参考</small>':r.kind==='component'?money(r.total)+'<small>確認分</small>':total?money(total):'<small>上段に集計</small>';
        const rem=r.remaining===null?'要確認':r.remaining+'点';
        tr.classList.add('sale-linked-'+r.kind);
        tr.insertAdjacentHTML('beforeend','<td>'+badge(r)+'</td><td class="num ledger-sale-money">'+amount+'</td><td class="num ledger-sale-rem">'+rem+'<span class="ledger-sale-tip">'+String(r.detail).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</span></td>');
      });
    });
    if(!host.querySelector('.ledger-sales-note')){
      const tabs=host.querySelector('.ledger-month-tabs');
      (tabs||host.firstElementChild)?.insertAdjacentHTML(tabs?'afterend':'beforebegin','<div class="ledger-sales-note"><b>売却メール照合：</b> 商品行の右端に販売確認・売れた金額・残数を表示。<span>△候補は色／サイズ違い等のため在庫を減らしていません。</span></div>');
    }
  }

  const style=document.createElement('style');style.textContent=`
    .ledger-sales-note{margin:0 0 8px;padding:7px 9px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;font-size:11px;line-height:1.45}.ledger-sales-note span{color:#725300}
    .purchase-sales-table{min-width:1120px}.purchase-sales-table th.sale-col{background:#d9e8d2;min-width:95px}.purchase-sales-table tr.sale-linked-exact{background:#f1fff1}.purchase-sales-table tr.sale-linked-high{background:#f4f7ff}.purchase-sales-table tr.sale-linked-candidate{background:#fff8cf}.purchase-sales-table tr.sale-linked-component{background:#effbff}
    .ledger-sale-tag{display:inline-block;padding:1px 4px;border:1px solid #777;background:#fff;font-weight:700;white-space:nowrap}.ledger-sale-tag.exact{color:#006000}.ledger-sale-tag.high{color:#000080}.ledger-sale-tag.candidate{color:#7a5600}.ledger-sale-tag.component{color:#005a70}.ledger-sale-over{display:inline-block;margin-left:3px;padding:1px 4px;border:1px solid #9b0000;background:#fff;color:#9b0000;font-weight:700;white-space:nowrap}
    .ledger-sale-money{font-weight:700;color:#005000}.ledger-sale-money small{display:block;color:#666;font-weight:400}.ledger-sale-rem{position:relative;font-weight:700}.ledger-sale-tip{display:none;position:absolute;right:0;top:100%;z-index:20;width:270px;padding:6px 8px;background:#ffffdf;border:1px solid #000;box-shadow:2px 2px #777;text-align:left;white-space:normal;font-weight:400;line-height:1.4}.ledger-sale-rem:hover .ledger-sale-tip,.ledger-sale-rem:focus-within .ledger-sale-tip{display:block}.sale-empty{color:#777;text-align:center}
    @media(max-width:760px){.purchase-sales-table{min-width:1050px}.ledger-sales-note{font-size:12px}}
  `;document.head.appendChild(style);

  const previous=renderSourcing;
  renderSourcing=function(){previous();enhanceLedgerSales()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceLedgerSales);else enhanceLedgerSales();
  window.CCLedgerSales={enhance:enhanceLedgerSales};
})();
