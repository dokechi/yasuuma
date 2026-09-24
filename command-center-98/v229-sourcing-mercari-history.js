(()=>{
  if(typeof sourcingCostHtml!=='function'||typeof sourcingEvidence!=='function')return;

  const legacySourcingCostHtml=sourcingCostHtml;
  const legacyIsReadySourcing=typeof isReadySourcing==='function'?isReadySourcing:null;

  function isElecomCandidate(x){
    const p=x?.payload||{};
    const text=[x?.title,p.brand,p.brand_name,p.manufacturer,p.maker,p.product_name,p.supplier]
      .filter(Boolean).join(' ').toLowerCase();
    return text.includes('elecom')||text.includes('エレコム');
  }

  function elecomUnitCost(x){
    const p=x?.payload||{};
    const raw=[
      p.unit_effective_cost_yen,
      p.effective_unit_cost_yen,
      p.effective_cost_yen,
      p.sourcing_cost,
      p.purchase_price_yen,
      p.supplier_price_yen
    ].find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
    const n=typeof raw==='string'?Number(raw.replace(/[^0-9.-]/g,'')):Number(raw);
    return Number.isFinite(n)?n:null;
  }

  if(legacyIsReadySourcing){
    isReadySourcing=function(x){
      if(!legacyIsReadySourcing(x))return false;
      if(!isElecomCandidate(x))return true;
      const unit=elecomUnitCost(x);
      return unit!==null&&unit>=1000;
    };
  }

  function asArray(value){
    if(Array.isArray(value))return value;
    if(value&&typeof value==='object')return [value];
    if(typeof value==='string'&&value.trim()){
      try{
        const parsed=JSON.parse(value);
        return Array.isArray(parsed)?parsed:(parsed&&typeof parsed==='object'?[parsed]:[]);
      }catch(_){return []}
    }
    return [];
  }

  function first(row,keys){
    for(const key of keys){
      const value=row?.[key];
      if(value!==undefined&&value!==null&&String(value).trim()!=='')return value;
    }
    return null;
  }

  function saleUrl(row){
    const direct=first(row,['direct_url','url','mercari_url','item_url']);
    const safe=typeof safeHttpUrl==='function'?safeHttpUrl(direct):'';
    if(safe)return safe;
    const id=String(first(row,['mercari_item_id','product_id','item_id','id'])||'').trim();
    return /^m[0-9A-Za-z_-]+$/.test(id)?'https://jp.mercari.com/item/'+encodeURIComponent(id):'';
  }

  function salePrice(row){
    const raw=first(row,['sold_price_yen','price_yen','sold_price','price']);
    const n=typeof raw==='string'?Number(raw.replace(/[^0-9.-]/g,'')):Number(raw);
    return Number.isFinite(n)?n:null;
  }

  function saleTiming(row){
    return first(row,['sold_at','sold_date','sold_datetime','updated_age','age_text','sold_age','age','confirmed_at'])||'—';
  }

  function saleCondition(row){
    return first(row,['condition','condition_name'])||'—';
  }

  function saleMatch(row){
    return first(row,['match_class','match','grade'])||'—';
  }

  function saleVariant(row){
    return first(row,['variant_difference','difference','variant_diff'])||'完全一致';
  }

  function saleTitle(row){
    return first(row,['title','product_title','item_title'])||'Mercari SOLD';
  }

  function normalizedHistory(p){
    const candidates=[
      p?.mercari_sales_history,
      p?.mercari_sold,
      p?.mercari_solds,
      p?.mercariSalesHistory,
      p?.mercari_history,
      p?.mercari_sold_history,
      p?.mercari_transactions
    ];
    const out=[];
    const seen=new Set();
    for(const candidate of candidates){
      for(const row of asArray(candidate)){
        const url=saleUrl(row);
        const id=String(first(row,['mercari_item_id','product_id','item_id','id'])||'');
        const key=id||url||JSON.stringify(row);
        if(seen.has(key))continue;
        seen.add(key);
        out.push({...row,__url:url});
      }
      if(out.length)break;
    }
    return out;
  }

  function historyTable(rows){
    if(!rows.length)return '';
    return '<div class="mercari-history-v229">'+
      '<div class="mercari-history-head"><b>メルカリ売買履歴</b><span>'+rows.length+'件</span></div>'+
      '<div class="mercari-history-scroll"><table class="sourcing-meta mercari-history-table">'+
      '<thead><tr><th>判定</th><th>売価</th><th>時期</th><th>状態</th><th>差分</th><th>取引</th></tr></thead><tbody>'+
      rows.map(row=>{
        const url=row.__url||saleUrl(row);
        const price=salePrice(row);
        const title=saleTitle(row);
        return '<tr>'+
          '<td><b>'+esc(saleMatch(row))+'</b></td>'+
          '<td class="profit">'+(price===null?'—':yen(price))+'</td>'+
          '<td>'+esc(saleTiming(row))+'</td>'+
          '<td>'+esc(saleCondition(row))+'</td>'+
          '<td>'+esc(saleVariant(row))+'</td>'+
          '<td>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(title)+'</a>':esc(title))+'</td>'+
        '</tr>';
      }).join('')+
      '</tbody></table></div></div>';
  }

  sourcingCostHtml=function(x){
    const p=sourcingEvidence(x)||{};
    const rows=normalizedHistory(p);
    if(!rows.length){
      const base=legacySourcingCostHtml(x);
      const status=String(p.mercari_history_status||'').toLowerCase();
      if(status==='unavailable'){
        return base.replace('</details>','<p class="mercari-history-status-v229"><b>メルカリ売買履歴：</b>取得できず。A/B確定不可。</p></details>');
      }
      return base;
    }

    const cost=sourcingValue(p,['total_cost_yen','total_purchase_cost_yen','送料込み仕入総額_1箱換算']);
    const fee=sourcingValue(p,['mercari_fee_yen','selling_fee_yen','販売手数料']);
    const shipping=sourcingValue(p,['outbound_shipping_yen','shipping_to_buyer_yen','発送費']);
    const evidence=sourcingValue(p,['sales_evidence','成約根拠','sell_through_evidence']);
    const legacyRaw=p.mercari_sold_urls||p.mercari_new_sold_urls||p.mercari_new_sold_evidence_urls||p['mercari新品SOLD根拠URL']||[];
    const legacyLinks=(Array.isArray(legacyRaw)?legacyRaw:[legacyRaw]).map(safeHttpUrl).filter(Boolean);
    const historyUrls=new Set(rows.map(row=>row.__url).filter(Boolean));
    const extraLinks=legacyLinks.filter(url=>!historyUrls.has(url));

    return '<details class="sourcing-cost"><summary>利益の内訳・メルカリ売買履歴</summary>'+
      '<p class="purchase-note">1個あたりの保守売価 − 送料込み仕入原価 − 販売手数料 − 発送費。売買履歴はタスクが個別商品ページまで確認した取引です。</p>'+
      '<table class="sourcing-meta"><tr><th>送料込み仕入原価</th><td>'+sourcingMoney(cost)+'</td><th>販売手数料</th><td>'+sourcingMoney(fee)+'</td></tr>'+
      '<tr><th>発送費</th><td>'+sourcingMoney(shipping)+'</td><th>商品確認時点</th><td>'+esc(fmtDate(x.lastSeen))+'</td></tr></table>'+
      (evidence?'<p>'+esc(evidence)+'</p>':'')+
      historyTable(rows)+
      (extraLinks.length?'<div class="result-links">'+extraLinks.map((url,i)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener">旧成約根拠 '+(i+1)+'</a>').join('')+'</div>':'')+
      '</details>';
  };

  const style=document.createElement('style');
  style.textContent=`
    .mercari-history-v229{margin-top:10px}
    .mercari-history-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:6px 0 4px}
    .mercari-history-head span{border:1px solid #777;background:#eee;padding:1px 5px;font-size:12px}
    .mercari-history-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
    .mercari-history-table{min-width:720px;margin-top:0}
    .mercari-history-table th,.mercari-history-table td{vertical-align:top}
    .mercari-history-table td:last-child{min-width:220px}
    .mercari-history-status-v229{margin:8px 0 0;padding:7px;border:1px solid #9b8200;background:#fff6bd}
  `;
  document.head.appendChild(style);

  try{
    if(typeof app==='object'&&app.view==='sourcing'&&typeof renderSourcing==='function')renderSourcing();
  }catch(_){}

  window.CCSourcingMercariHistory={version:'229.3',normalizedHistory};
})();