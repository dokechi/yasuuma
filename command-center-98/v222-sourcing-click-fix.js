(()=>{
  if(window.CCSourcingClickFix)return;

  function clickTab(event){
    const button=event.target.closest?.('#sourcingTabs button[data-sourcing-sub]');
    if(!button)return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(typeof bump==='function')bump(button);
    let sub=button.dataset.sourcingSub||'hold';
    if(sub==='queue')sub='hold';
    sourcingApp.sub=sub;
    try{
      renderSourcing();
      document.querySelectorAll('#sourcingTabs button[data-sourcing-sub]').forEach(b=>{
        b.classList.toggle('selected',b.dataset.sourcingSub===sub);
        b.setAttribute('aria-pressed',String(b.dataset.sourcingSub===sub));
      });
      if(typeof setStatus==='function')setStatus('準備完了');
    }catch(err){
      console.error('sourcing tab render failed',err);
      if(typeof toast==='function')toast('仕入れ画面の切替に失敗しました','bad');
    }
    return true;
  }

  function clickSummary(event){
    const summary=event.target.closest?.('#sourcingBody .cc-item-summary');
    if(!summary)return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    const details=summary.closest('.cc-item');
    if(!details)return true;
    details.open=!details.open;
    summary.setAttribute('aria-expanded',String(details.open));
    const cue=summary.querySelector('.cc-item-cue');
    if(cue)cue.textContent=details.open?'詳細を閉じる':'詳細を開く';
    if(details.open){
      const article=details.closest('article');
      const parent=article?.parentElement;
      if(parent){
        parent.querySelectorAll(':scope > article > .cc-item[open]').forEach(other=>{
          if(other!==details){
            other.open=false;
            const otherSummary=other.querySelector(':scope > .cc-item-summary');
            otherSummary?.setAttribute('aria-expanded','false');
            const otherCue=otherSummary?.querySelector('.cc-item-cue');
            if(otherCue)otherCue.textContent='詳細を開く';
          }
        });
      }
    }
    return true;
  }

  document.addEventListener('click',event=>{
    if(clickTab(event))return;
    clickSummary(event);
  },true);

  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const summary=event.target.closest?.('#sourcingBody .cc-item-summary');
    if(!summary)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    summary.click();
  },true);

  window.CCSourcingClickFix={version:'222.1'};
})();