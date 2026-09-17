(()=>{
  function patchSalesBasis(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');if(!host)return;
    const note=host.querySelector('.ledger-sales-note');
    if(note&&!note.dataset.yahooBasis){
      note.dataset.yahooBasis='1';
      note.innerHTML='<b>残数：</b> メルカリの「購入・支払完了（発送依頼）」＋Yahoo!オークション／フリマの「売上確定」で減算。同一商品はFIFOで割当し、キャンセル成立分は除外。<span>「照合0件」は両販売チャネルとの一致がまだない行。セット仕入れは構成品まで分解できたものから実残数へ切替えます。</span>';
    }
    host.querySelectorAll('.ledger-sale-tip').forEach(t=>{
      if(t.dataset.yahooBasis)return;
      t.dataset.yahooBasis='1';
      t.textContent=t.textContent
        .replace('Gmailのメルカリ購入・支払完了を基準に在庫を減算。','メルカリの購入・支払完了＋Yahoo!の売上確定を基準に在庫を減算。')
        .replace('売却メールとの一致がまだない','メルカリ・Yahoo!売却との一致がまだない');
    });
  }
  if(typeof renderSourcing==='function'){
    const previous=renderSourcing;
    renderSourcing=function(){previous();patchSalesBasis()};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchSalesBasis);else patchSalesBasis();
  window.CCYahooSalesLedger={enhance:patchSalesBasis};
})();
