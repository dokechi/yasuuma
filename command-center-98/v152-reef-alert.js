(()=>{
  if(typeof renderList!=='function'||typeof esc!=='function')return;

  const ALERT_ID='reefOver80Board';
  const number=value=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()){
      const parsed=Number(value.replace(/[^0-9.-]/g,''));
      return Number.isFinite(parsed)?parsed:null;
    }
    return null;
  };
  const first=(payload,keys)=>{
    for(const key of keys){
      const value=payload?.[key];
      if(value!==undefined&&value!==null&&value!=='')return value;
    }
    return null;
  };
  const discountOf=item=>number(first(item.payload||{},[
    'discount_pct','discount_percent','discount_rate','sale_discount_pct'
  ]));
  const isReefOver80=item=>{
    const payload=item.payload||{};
    const discount=discountOf(item);
    if(!(discount>80))return false;
    if(payload.alert_type==='reef_over_80')return true;
    const haystack=[
      payload.brand,payload.vendor,payload.supplier,payload.supplier_name,
      item.source,item.supplierName,item.title,item.url
    ].filter(Boolean).join(' ').toLowerCase();
    return /reef/.test(haystack)&&/(shop[- ]?orange|orange)/.test(haystack);
  };
  const formatPrice=value=>{
    const parsed=number(value);
    return parsed===null?'未確認':'¥'+parsed.toLocaleString('ja-JP');
  };
  const availabilityOf=payload=>{
    const raw=first(payload,['available_variants','available_sizes','in_stock_variants','stock_variants']);
    if(Array.isArray(raw))return raw.join(' / ');
    return raw?String(raw):'購入可能な色・サイズあり';
  };
  const alertItems=()=>[
    ...(app.items||[])
  ].filter(item=>(item.reviewState||'new')==='new'&&isReefOver80(item))
    .sort((a,b)=>(discountOf(b)||0)-(discountOf(a)||0)||(Number(b.score)||0)-(Number(a.score)||0));
  const card=item=>{
    const payload=item.payload||{};
    const discount=discountOf(item);
    const sale=first(payload,['sale_price_yen','current_price_yen','purchase_price_yen','buy_price','price']);
    const regular=first(payload,['regular_price_yen','compare_at_price_yen','list_price_yen','reference_price_yen']);
    const title=item.title||payload.product_name||'REEF 値下げ商品';
    const url=item.url||item.sourceUrl||payload.product_url||payload.source_url||'';
    return '<article class="reef-alert-card">'
      +'<div class="reef-alert-rate"><b>'+esc(Math.round(discount*10)/10)+'</b><span>% OFF</span></div>'
      +'<div class="reef-alert-main"><strong>'+esc(title)+'</strong>'
      +'<p><b>'+formatPrice(sale)+'</b><span>通常 '+formatPrice(regular)+'</span></p>'
      +'<small>在庫：'+esc(availabilityOf(payload))+'　／　検知 '+esc(fmtDate(item.lastSeen||payload.checked_at_jst||payload.checked_at))+'</small>'
      +'<div class="reef-alert-actions">'
      +(url?'<a class="push-button reef-product-link" href="'+esc(url)+'" target="_blank" rel="noopener">商品をすぐ確認</a>':'')
      +'<button class="push-button" type="button" data-open-sourcing="queue">仕入れ判断を開く</button>'
      +'</div></div></article>';
  };
  const renderReefAlert=()=>{
    let host=document.getElementById(ALERT_ID);
    if(app.view!=='active'){
      host?.remove();
      return;
    }
    const items=alertItems();
    if(!items.length){
      host?.remove();
      return;
    }
    if(!host){
      host=document.createElement('section');
      host.id=ALERT_ID;
      host.className='reef-alert-board';
      const anchor=document.getElementById('fpPriorityBoard')||document.querySelector('#regularHub .section-title');
      anchor?.before(host);
    }
    const shown=items.slice(0,5);
    host.innerHTML='<div class="reef-alert-title"><div><span>緊急価格</span><b>REEFが80％超値下げ</b></div><strong>'+items.length+'件</strong></div>'
      +'<p class="reef-alert-note">80％ちょうどは除外。購入できる在庫を確認した81％以上だけ表示しています。</p>'
      +'<div class="reef-alert-list">'+shown.map(card).join('')+'</div>'
      +(items.length>shown.length?'<div class="reef-alert-more">ほか '+(items.length-shown.length)+'件。仕入れ判断で確認できます。</div>':'');
  };

  const baseRenderList=renderList;
  renderList=function(){
    baseRenderList();
    renderReefAlert();
  };

  const style=document.createElement('style');
  style.textContent=`
    .reef-alert-board{margin:0 0 14px;background:#fff3a8;border:4px double #7d0000;box-shadow:5px 5px 0 #6b0000;color:#111}
    .reef-alert-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:#a40000;color:#fff}
    .reef-alert-title>div{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.reef-alert-title span{padding:3px 7px;background:#ffe100;color:#700;font-weight:900;border:2px solid #fff}
    .reef-alert-title b{font-size:22px;line-height:1.2}.reef-alert-title>strong{font-size:24px;white-space:nowrap}
    .reef-alert-note{margin:0;padding:8px 12px;background:#fff8c9;border-bottom:1px solid #8b7300;font-weight:700}
    .reef-alert-list{display:grid;gap:8px;padding:10px}.reef-alert-card{display:grid;grid-template-columns:132px 1fr;background:#fff;border:2px solid #650000}
    .reef-alert-rate{display:grid;place-content:center;text-align:center;background:#d40000;color:#fff;min-height:132px;text-shadow:2px 2px #5b0000}
    .reef-alert-rate b{font-size:46px;line-height:.95}.reef-alert-rate span{margin-top:5px;font-size:18px;font-weight:900}
    .reef-alert-main{padding:12px 14px}.reef-alert-main>strong{display:block;font-size:18px;line-height:1.35}.reef-alert-main p{display:flex;align-items:baseline;gap:12px;margin:10px 0 6px}.reef-alert-main p b{font-size:30px;color:#a40000}.reef-alert-main p span{font-size:12px;color:#555;text-decoration:line-through}
    .reef-alert-main small{display:block;line-height:1.5}.reef-alert-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.reef-alert-actions .push-button{font-weight:900}.reef-product-link{display:inline-flex;align-items:center;color:#000;text-decoration:none;background:#ffe36a}
    .reef-alert-more{padding:0 12px 10px;font-weight:700}.window.compact-cards .reef-alert-board{display:block}
    @media(max-width:700px){.reef-alert-board{box-shadow:3px 3px 0 #6b0000}.reef-alert-title{align-items:flex-start}.reef-alert-title b{font-size:18px}.reef-alert-title>strong{font-size:20px}.reef-alert-card{grid-template-columns:92px 1fr}.reef-alert-rate{min-height:116px}.reef-alert-rate b{font-size:34px}.reef-alert-rate span{font-size:14px}.reef-alert-main{padding:10px}.reef-alert-main>strong{font-size:15px}.reef-alert-main p{display:block;margin:7px 0}.reef-alert-main p b{display:block;font-size:25px}.reef-alert-actions .push-button{flex:1;justify-content:center;min-height:42px}.reef-alert-note{font-size:12px}}
  `;
  document.head.appendChild(style);
  renderReefAlert();
})();
