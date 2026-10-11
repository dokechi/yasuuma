(()=>{
  const model=window.CCSourcingDisplayModel;
  if(!model?.comparison)return;
  const money=value=>{
    if(value===null||value===undefined||String(value).trim()==='')return '未確認';
    const text=String(value).trim();
    if(!/^(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text))return text;
    return '¥'+Number(text.replace(/,/g,'')).toLocaleString('ja-JP');
  };
  function decorate(article,item){
    if(!item)return;
    const details=article.querySelector(':scope > .cc-item');
    const summary=details?.querySelector(':scope > .cc-item-summary');
    if(!summary)return;
    const fields=typeof sourcingFields==='function'?sourcingFields(item):{};
    const evidence=typeof sourcingEvidence==='function'?sourcingEvidence(item):item.payload;
    const data=model.comparison(item,fields,evidence);
    const signature=JSON.stringify(data);
    const existing=summary.querySelector('.sourcing-mobile-facts');
    if(existing?.dataset.signature===signature)return;
    existing?.remove();
    article.querySelector(':scope > .sourcing-mobile-links')?.remove();
    const facts=document.createElement('span');
    facts.className='sourcing-mobile-facts';facts.dataset.signature=signature;
    const append=(className,text)=>{const node=document.createElement('span');node.className=className;node.textContent=text;facts.appendChild(node)};
    append('sourcing-mobile-grade','総合 '+data.grade);
    facts.lastElementChild.setAttribute('aria-label','総合 '+data.grade+'。4が最優先。1も仕入れ候補内の相対評価です。');
    if(data.grade==='未確認'&&data.legacyGrade)append('sourcing-mobile-legacy-grade','旧評価 '+data.legacyGrade+'（総合へ未換算）');
    append('sourcing-mobile-date','発見 '+data.discoveryDate);
    append('sourcing-mobile-buy','仕入価格 '+money(data.buy));
    append('sourcing-mobile-quantity','推奨数量 '+(data.quantity===null?'未確認':String(data.quantity)));
    append('sourcing-mobile-reason','一言根拠：'+(data.reason.trim()||'未確認'));
    summary.insertBefore(facts,summary.querySelector('.cc-item-cue'));
    const links=document.createElement('div');links.className='sourcing-mobile-links';
    // Links stay outside summary so the legacy capture handler never toggles details.
    for(const link of data.links){
      const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';
      a.textContent=link.label;links.appendChild(a);
    }
    if(!data.links.length){const note=document.createElement('span');note.textContent='商品・相場リンクは未確認';links.appendChild(note)}
    const button=document.createElement('button');button.type='button';button.className='push-button small';
    button.textContent='根拠・数量・保留操作を開く';
    button.addEventListener('click',()=>{
      // Use the existing disclosure route; never render, reload or write here.
      if(!details.open)summary.click();
      summary.focus({preventScroll:true});
    });
    links.appendChild(button);article.appendChild(links);
  }
  window.CCSourcingMobileComparison={decorate};
})();
