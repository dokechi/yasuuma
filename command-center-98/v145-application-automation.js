(()=>{
  const X=window.CCX;
  if(!X||typeof X.card!=='function') return;

  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const RULES=[
    {test:(o,u)=>/livepocket/i.test(u)||/GIRAFULL|フルコンプ/i.test(o),mode:'manual',label:'できない',note:'LivePocket系。自動化手段の利用を避け、自分で応募。'},
    {test:(o,u)=>/プレミアムバンダイ/i.test(o)||/p-bandai\.jp/i.test(u),mode:'confirm',label:'途中まで',note:'入力補助は可能。抽選＝注文確定になる場合があるため最終確定は本人操作。'},
    {test:(o,u)=>/スーパーセンターPLANT/i.test(o)||/select-type\.com/i.test(u),mode:'auto',label:'できる',note:'通常のWeb応募フォーム。会員登録不要の案件は代理入力向き。'},
    {test:(o,u)=>/ノジマオンライン/i.test(o)||/online\.nojima\.co\.jp/i.test(u),mode:'auto',label:'できる',note:'ログイン済みならエントリーフォームを代理入力しやすい。'},
    {test:(o,u)=>/福福トレカ/i.test(o)||/fukufukutoreka\.com/i.test(u),mode:'auto',label:'できる',note:'会員・購入履歴条件を満たしていれば代理入力向き。'},
    {test:(o,u)=>/ファミマオンライン/i.test(o)||/famima-online\.family\.co\.jp/i.test(u),mode:'semi',label:'できる※',note:'ログイン済みなら可能性高い。SMS等の本人認証が出た時だけ本人操作。'},
    {test:(o,u)=>/ポケモンセンターオンライン/i.test(o)||/pokemoncenter-online\.com/i.test(u),mode:'semi',label:'できる※',note:'本人認証済みなら代理入力候補。再認証が出た時だけ本人操作。'},
    {test:(o,u)=>/イオンスタイルオンライン/i.test(o)||/aeonretail\.com/i.test(u),mode:'semi',label:'できる※',note:'ログイン済みなら代理入力候補。追加認証が出た時だけ本人操作。'}
  ];

  X.applicationAutomation=x=>{
    const organizer=String(x?.organizer||'');
    const url=String(x?.applicationUrl||x?.officialUrl||'');
    const r=RULES.find(v=>v.test(organizer,url));
    return r||{mode:'check',label:'要確認',note:'未判定のサイト。応募画面を確認してから分類。'};
  };

  const style=document.createElement('style');
  style.textContent=`
    .x-auto-panel{margin:9px 0 10px;border:2px solid #808080;border-color:#fff #808080 #808080 #fff;background:#ece9d8;padding:7px 9px;color:#111;display:flex;align-items:flex-start;gap:10px}
    .x-auto-panel small{display:block;color:#555;margin-bottom:2px}
    .x-auto-panel b{font-size:13px}
    .x-auto-panel .x-auto-badge{display:inline-block;min-width:82px;text-align:center;border:1px solid #555;padding:2px 7px;background:#fff;font-weight:700;white-space:nowrap}
    .x-auto-panel.auto .x-auto-badge{background:#d9ffd9}
    .x-auto-panel.semi .x-auto-badge{background:#fff3bf}
    .x-auto-panel.confirm .x-auto-badge{background:#ffe0b2}
    .x-auto-panel.manual .x-auto-badge{background:#ffd7d7}
    .x-auto-panel.check .x-auto-badge{background:#e9e9e9}
    .x-auto-panel .x-auto-note{line-height:1.45;flex:1;min-width:0}
    .x-auto-legend{font-size:11px;color:#555;margin-top:2px}
    @media(max-width:700px){.x-auto-panel{display:block}.x-auto-panel .x-auto-badge{margin-bottom:6px}}
  `;
  document.head.appendChild(style);

  const baseCard=X.card;
  X.card=x=>{
    const a=X.applicationAutomation(x);
    const panel='<div class="x-auto-panel '+h(a.mode)+'"><div><small>自動入力</small><span class="x-auto-badge">'+h(a.label)+'</span></div><div class="x-auto-note"><b>'+h(a.note)+'</b><div class="x-auto-legend">※これは「代理入力できるか」の判定。自動応募機能そのものはまだ未実装。</div></div></div>';
    return baseCard(x).replace('<table class="x-info">',panel+'<table class="x-info">');
  };

  const intro=document.querySelector('#xHub .x-intro');
  if(intro) intro.insertAdjacentHTML('beforeend',' <b>各候補に「自動入力できるか」も表示します。</b>');

  if(typeof X.render==='function' && X.state?.items?.length) X.render();
})();
