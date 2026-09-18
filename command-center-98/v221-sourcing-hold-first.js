(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const tabs=document.getElementById('sourcingTabs');

  function readyItems(){
    return (sourcingApp.items||[])
      .filter(x=>typeof isReadySourcing==='function'&&isReadySourcing(x))
      .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
  }

  function closeItems(){
    return (sourcingApp.items||[])
      .filter(x=>x.sourcingVerdict==='close')
      .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
  }

  function researchCount(){
    if(typeof sourcingResults==='undefined'||!sourcingResults.loaded||typeof sourcingResearchRecords!=='function')return 0;
    try{return sourcingResearchRecords('research').length}catch{return 0}
  }

  function removeQueueTab(){
    const queue=tabs?.querySelector('button[data-sourcing-sub="queue"]');
    queue?.remove();
    const product=tabs?.querySelector('.sourcing-tab-group.product');
    if(product){
      ['hold','purchases','miss'].forEach(sub=>{
        const b=tabs.querySelector('button[data-sourcing-sub="'+sub+'"]');
        if(b)product.appendChild(b);
      });
    }
  }

  function updateIntro(){
    const intro=document.querySelector('#sourcingHub .sourcing-intro');
    if(intro)intro.innerHTML='<b>仕入れ専用。</b> 商品はすべて最初から<b>保留</b>へ集約し、実際に購入したものだけGmail正本の<b>実仕入れ</b>へ残します。もう追わない商品は追跡終了へ。仕入れ先は候補と台帳の2段階です。';
  }

  function bindNewCards(host,items){
    for(const x of items){
      const card=host.querySelector('#card-'+cssSafe(x.id));
      if(!card)continue;

      card.querySelectorAll('.sourcing-success,.sourcing-close').forEach(b=>b.remove());
      card.querySelectorAll('.sourcing-verdict').forEach(el=>el.textContent='保留');
      card.querySelectorAll('.sourcing-miss').forEach(b=>{
        b.textContent='追跡終了';
        b.onclick=()=>sourcingJudge(b.dataset.id,'miss',b);
      });
      card.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>hardDelete(b.dataset.delete,b));
    }
  }

  function injectReadyIntoHold(){
    if(sourcingApp.sub!=='hold')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;

    const ready=readyItems();
    const closed=closeItems();
    const researchN=researchCount();

    const caption=host.querySelector('.sourcing-caption');
    if(caption){
      const count=caption.querySelector('span');
      if(count)count.textContent=(ready.length+closed.length+researchN)+'件';
    }

    const holdCount=document.getElementById('sourcingHoldCount');
    if(holdCount)holdCount.textContent=String(ready.length+closed.length+researchN);

    const queueCount=document.getElementById('sourcingQueueCount');
    if(queueCount)queueCount.textContent='0';

    host.querySelector('.sourcing-hold-ready-v221')?.remove();

    if(ready.length){
      const section=document.createElement('div');
      section.className='sourcing-hold-section sourcing-hold-ready-v221';
      section.innerHTML='<div class="sourcing-hold-section-title">新着 <b>'+ready.length+'</b></div>'+
        '<div class="sourcing-grid">'+ready.map((x,i)=>sourcingCardHtml(x,i)).join('')+'</div>';

      const firstSection=host.querySelector('.sourcing-hold-section');
      if(firstSection)host.insertBefore(section,firstSection);
      else{
        const research=host.querySelector('.sourcing-hold-research');
        if(research)host.insertBefore(section,research);
        else host.appendChild(section);
      }

      bindNewCards(host,ready);

      try{window.CCSourcingCardCleanup?.polish?.()}catch(_){}
      try{window.CCSourcingPriceWait?.enhance?.()}catch(_){}

      // Cleanup can rebuild labels; enforce the hold-first wording once more.
      bindNewCards(host,ready);
    }

    const existingTitle=[...host.querySelectorAll('.sourcing-hold-section-title')]
      .find(x=>!x.closest('.sourcing-hold-ready-v221'));
    if(existingTitle&&/判定済みの保留/.test(existingTitle.textContent||'')){
      existingTitle.childNodes[0].nodeValue='保留中 ';
    }

    const note=host.querySelector('.sourcing-caption + .purchase-note');
    if(note)note.textContent='新しく見つかった商品も、価格待ち・条件待ちの商品も、ここにまとめます。実際に買ったものは実仕入れで確認します。';
  }

  const previousOpen=typeof openSourcingSection==='function'?openSourcingSection:null;
  if(previousOpen){
    openSourcingSection=async function(sub){
      return previousOpen(sub==='queue'?'hold':sub);
    };
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    if(sourcingApp.sub==='queue')sourcingApp.sub='hold';
    removeQueueTab();
    updateIntro();
    baseRender();
    removeQueueTab();
    injectReadyIntoHold();
  };

  // Price-wait v217 originally targeted only persisted "close" rows.
  // Make its public enhancer see newly surfaced ready items by temporarily
  // exposing them through the visible hold cards; no DB verdict is written
  // until the user actually saves a target price.
  const price=window.CCSourcingPriceWait;
  if(price&&typeof price.enhance==='function'){
    const oldEnhance=price.enhance;
    price.enhance=function(){
      oldEnhance();
      if(sourcingApp.sub!=='hold')return;
      const host=document.getElementById('sourcingBody');
      if(!host)return;

      for(const x of readyItems()){
        const card=host.querySelector('#card-'+cssSafe(x.id));
        if(!card||card.querySelector('[data-price-wait-id]'))continue;

        const body=card.querySelector('.sourcing-card-body')||card;
        const fields=typeof sourcingFields==='function'?sourcingFields(x):{};
        const current=Number(fields?.buy);
        const currentText=Number.isFinite(current)&&current>0?'¥'+Math.round(current).toLocaleString('ja-JP'):'未確認';

        const box=document.createElement('section');
        box.className='price-wait-box';
        box.dataset.priceWaitId=String(x.id);
        box.innerHTML='<div class="price-wait-head"><b>価格待ち</b></div>'+
          '<div class="price-wait-row"><span class="price-wait-current">現在価格 <b>'+currentText+'</b></span>'+
          '<label>この価格なら買う <span class="price-wait-yen">¥</span><input class="price-wait-input" inputmode="numeric" pattern="[0-9]*" min="1" step="1" placeholder="2500" aria-label="この価格なら買う"></label>'+
          '<button class="push-button small" type="button" data-v221-price-save>価格メモ保存</button>'+
          '<button class="push-button small price-wait-copy" type="button" data-v221-price-copy>Chat監視依頼をコピー</button></div>'+
          '<small>監視条件は価格のみ。価格メモを保存した時点で正式な保留メモとして残ります。</small>';
        body.appendChild(box);

        const input=box.querySelector('.price-wait-input');
        box.querySelector('[data-v221-price-save]')?.addEventListener('click',async e=>{
          const n=Math.round(Number(input?.value));
          if(!Number.isFinite(n)||n<=0){toast('目標価格を入力してください','bad');input?.focus();return}
          const button=e.currentTarget;
          bump(button);button.disabled=true;setStatus('価格待ち条件を保存中...',true);
          try{
            const note='価格待ち：¥'+n.toLocaleString('ja-JP')+'以下';
            const r=await fetch(API,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AUTH},body:JSON.stringify({action:'sourcing_verdict',id:String(x.id),verdict:'close',note})});
            const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||'保存失敗');
            toast('価格待ち ¥'+n.toLocaleString('ja-JP')+'以下で保存しました','good');
            await load('sourcing');sourcingApp.sub='hold';renderSourcing();
          }catch(err){setStatus('保存エラー');toast('価格待ち条件を保存できませんでした','bad')}
          finally{button.disabled=false}
        });
        box.querySelector('[data-v221-price-copy]')?.addEventListener('click',async e=>{
          const n=Math.round(Number(input?.value));
          if(!Number.isFinite(n)||n<=0){toast('目標価格を入力してください','bad');input?.focus();return}
          const text=[
            'この商品を価格監視タスクに追加してください。',
            '',
            '商品：'+String(x.title||'商品'),
            '目標価格：'+n.toLocaleString('ja-JP')+'円以下',
            x.url?'URL：'+String(x.url):''
          ].filter(Boolean).join('\n');
          try{await navigator.clipboard.writeText(text);toast('価格監視の依頼文をコピーしました','good');}
          catch(_){toast('コピーできませんでした','bad')}
        });
      }
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .sourcing-hold-ready-v221 .sourcing-verdict{color:#7a5600}
    .sourcing-hold-ready-v221 .sourcing-card{background:#fffef0}
    .sourcing-hold-ready-v221 .sourcing-hold-section-title{margin-top:0}
  `;
  document.head.appendChild(style);

  sourcingApp.sub=sourcingApp.sub==='queue'?'hold':sourcingApp.sub;
  removeQueueTab();
  updateIntro();
  window.CCSourcingHoldFirst={version:'221.1',inject:injectReadyIntoHold};
})();