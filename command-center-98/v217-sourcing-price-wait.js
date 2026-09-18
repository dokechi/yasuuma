(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const PRICE_NOTE_RE=/^価格待ち\s*[：:]\s*¥?([0-9,]+)円?以下$/;

  function h(v){
    return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function parsePriceNote(note){
    const m=String(note||'').trim().match(PRICE_NOTE_RE);
    return m?Number(m[1].replace(/,/g,'')):null;
  }
  function money(v){
    if(v===null||v===undefined||!Number.isFinite(Number(v)))return '未確認';
    return '¥'+Math.round(Number(v)).toLocaleString('ja-JP');
  }
  function currentBuy(x){
    try{
      const f=typeof sourcingFields==='function'?sourcingFields(x):null;
      const n=Number(f?.buy);
      return Number.isFinite(n)&&n>0?n:null;
    }catch{return null}
  }
  function noteFor(target){
    return '価格待ち：¥'+Math.round(Number(target)).toLocaleString('ja-JP')+'以下';
  }
  function buildChatText(x,target){
    const lines=[
      'この商品を価格監視タスクに追加してください。',
      '',
      '商品：'+String(x?.title||'仕入れ候補'),
      '目標価格：'+Math.round(Number(target)).toLocaleString('ja-JP')+'円以下',
      x?.url?'URL：'+String(x.url):''
    ].filter(Boolean);
    return lines.join('\n');
  }
  async function copyText(value,button){
    let copied=false;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      copied=true;
    }catch(_){
      const area=document.createElement('textarea');
      area.value=value;
      area.style.cssText='position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
      document.body.appendChild(area);
      area.focus();area.select();
      try{copied=document.execCommand('copy')===true}catch(_){}
      area.remove();
    }
    if(copied){
      if(typeof toast==='function')toast('価格監視の依頼文をコピーしました','good');
      button?.focus?.({preventScroll:true});
      return true;
    }
    if(typeof toast==='function')toast('コピーできませんでした。入力内容を手動でコピーしてください','bad');
    return false;
  }
  async function savePriceWait(x,target,button){
    const n=Math.round(Number(target));
    if(!Number.isFinite(n)||n<=0){
      if(typeof toast==='function')toast('目標価格を入力してください','bad');
      return;
    }
    if(typeof bump==='function'&&button)bump(button);
    if(button)button.disabled=true;
    if(typeof setStatus==='function')setStatus('価格待ち条件を保存中...',true);
    try{
      const r=await fetch(API,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+AUTH},
        body:JSON.stringify({action:'sourcing_verdict',id:String(x.id),verdict:'close',note:noteFor(n)})
      });
      const d=await r.json();
      if(!r.ok||!d?.ok)throw new Error(d?.error||'保存失敗');
      if(typeof toast==='function')toast('価格待ち '+money(n)+'以下で保存しました','good');
      await load('sourcing');
      if(typeof sourcingApp!=='undefined'){
        sourcingApp.sub='hold';
        renderSourcing();
      }
    }catch(e){
      if(typeof setStatus==='function')setStatus('保存エラー');
      if(typeof toast==='function')toast('価格待ち条件を保存できませんでした','bad');
    }finally{
      if(button)button.disabled=false;
    }
  }

  function panelHtml(x){
    const saved=parsePriceNote(x?.verdictNote);
    const current=currentBuy(x);
    return '<section class="price-wait-box" data-price-wait-id="'+h(x.id)+'">'+
      '<div class="price-wait-head"><b>価格待ち</b>'+(saved?'<span class="price-wait-chip">'+money(saved)+'以下</span>':'')+'</div>'+
      '<div class="price-wait-row"><span class="price-wait-current">現在価格 <b>'+h(money(current))+'</b></span>'+
      '<label>この価格なら買う <span class="price-wait-yen">¥</span><input class="price-wait-input" inputmode="numeric" pattern="[0-9]*" min="1" step="1" value="'+(saved?String(saved):'')+'" placeholder="2500" aria-label="この価格なら買う"></label>'+
      '<button class="push-button small" type="button" data-price-wait-save>価格メモ保存</button>'+
      '<button class="push-button small price-wait-copy" type="button" data-price-wait-copy>Chat監視依頼をコピー</button></div>'+
      '<small>監視条件は価格のみ。保存すると「'+h(saved?noteFor(saved):'価格待ち：¥2,500以下')+'」として保留メモに残ります。</small>'+
      '</section>';
  }

  function enhance(){
    if(typeof app!=='undefined'&&app.view!=='sourcing')return;
    if(sourcingApp.sub!=='hold')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    const items=(sourcingApp.items||[]).filter(x=>x.sourcingVerdict==='close');
    for(const x of items){
      const card=host.querySelector('#card-'+cssSafe(x.id));
      if(!card||card.querySelector('[data-price-wait-id]'))continue;
      const body=card.querySelector('.sourcing-card-body')||card;
      body.insertAdjacentHTML('beforeend',panelHtml(x));
      const box=body.querySelector('[data-price-wait-id="'+CSS.escape(String(x.id))+'"]');
      if(!box)continue;
      const input=box.querySelector('.price-wait-input');
      box.querySelector('[data-price-wait-save]')?.addEventListener('click',e=>savePriceWait(x,input?.value,e.currentTarget));
      box.querySelector('[data-price-wait-copy]')?.addEventListener('click',async e=>{
        const n=Math.round(Number(input?.value));
        if(!Number.isFinite(n)||n<=0){
          if(typeof toast==='function')toast('目標価格を入力してください','bad');
          input?.focus();
          return;
        }
        await copyText(buildChatText(x,n),e.currentTarget);
      });
      input?.addEventListener('keydown',e=>{
        if(e.key==='Enter'){
          e.preventDefault();
          box.querySelector('[data-price-wait-save]')?.click();
        }
      });
    }
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    baseRender();
    enhance();
  };

  const style=document.createElement('style');
  style.textContent=`
    .price-wait-box{margin-top:9px;padding:8px 9px;background:#fff6b5;border:1px solid #9b8e51}
    .price-wait-head{display:flex;align-items:center;gap:7px;margin-bottom:6px}
    .price-wait-head>b{font-size:12px}
    .price-wait-chip{display:inline-block;padding:1px 5px;background:#fff;border:1px solid #777;color:#7a5600;font-weight:800;font-size:11px}
    .price-wait-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .price-wait-current{font-size:11px;white-space:nowrap}
    .price-wait-current b{font-size:13px}
    .price-wait-row label{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700}
    .price-wait-yen{font-weight:700}
    .price-wait-input{width:92px;height:26px;padding:2px 5px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff;font:700 13px Tahoma,"MS UI Gothic",sans-serif;text-align:right}
    .price-wait-copy{font-weight:700}
    .price-wait-box>small{display:block;margin-top:5px;color:#555;line-height:1.4}
    @media(max-width:700px){.price-wait-row{align-items:stretch}.price-wait-row label{width:100%}.price-wait-input{flex:1}.price-wait-row .push-button{min-height:38px}}
  `;
  document.head.appendChild(style);

  window.CCSourcingPriceWait={
    version:'217.1',
    parsePriceNote,
    buildChatText,
    enhance
  };
  enhance();
})();