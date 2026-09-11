(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const snapshot={
    asOf:'2026/09/11',
    sourcing:[
      {name:'Amazon.co.jp',month:'8・9月',reason:'仕入れ実績あり。私物も混在するため商品内容・数量・過去の調査履歴で判定'},
      {name:'ECJOY',month:'8月',reason:'Birkenstockなど一般商品の仕入れ'},
      {name:'detail-online-store',month:'8・9月',reason:'一般商品の仕入れ'},
      {name:'Outdoor Shop Orange',month:'8・9月',reason:'REEFなどアウトドア・フットウェアの仕入れ'},
      {name:'FirstStage',month:'8・9月',reason:'G/FORE・ゴルフ用品の仕入れ'},
      {name:'マルイウェブチャネル',month:'8月',reason:'ファッション商品の仕入れ'},
      {name:'スポーツジュエン',month:'8・9月',reason:'スポーツ・ゴルフ商品の仕入れ'},
      {name:'ゴルフパートナー annex',month:'8月',reason:'ゴルフ用品の仕入れ'},
      {name:'Mac-House',month:'8月',reason:'アパレル商品の仕入れ'},
      {name:'GILT',month:'8月',reason:'ファッション商品の仕入れ'},
      {name:'Dempsey Sports',month:'8月',reason:'スポーツ商品の仕入れ'},
      {name:'ZOZOTOWN Yahoo!店',month:'8月',reason:'ファッション商品の仕入れ'},
      {name:'END.',month:'8月',reason:'海外ファッション商品の仕入れ'},
      {name:'アエナ公式',month:'8月',reason:'同一商品を複数購入。美容商品の仕入れ'},
      {name:'YOOX',month:'8月',reason:'仕入れ目的の購入実績あり'},
      {name:'INNOCN Japan',month:'9月',reason:'モニターの仕入れ'},
      {name:'ロコンド（販売元：MEGA SPORTS）',month:'9月',reason:'スポーツ・フットウェアの仕入れ'},
      {name:'現場市場',month:'9月',reason:'ミズノなど一般商品の仕入れ'}
    ],
    tcg:[
      {name:'トレカショップLEAD.',month:'8月',reason:'TCG。専用タスクで管理'},
      {name:'トレカドンドン',month:'8月',reason:'TCG。専用タスクで管理'},
      {name:'ポケモンセンターオンライン',month:'8月',reason:'ポケモン・TCG系。専用タスクで管理'},
      {name:'ジャンプキャラクターズストア',month:'8月',reason:'キャラクター商品。専用タスクで管理'},
      {name:'タカラトミーモール',month:'8月',reason:'玩具・キャラクター系。専用タスクで管理'},
      {name:'楽天ブックス',month:'8月',reason:'今回の購入はTCG・キャラクター系'},
      {name:'LIFETUNES MALL',month:'8月',reason:'TCG商品。専用タスクで管理'},
      {name:'ビックカメラ',month:'8月',reason:'今回の注文はROBOT魂・ゴジラ・仮面ライダー系中心'}
    ],
    excluded:[
      {name:'アイリスプラザ',month:'8月',reason:'会社・事務用'},
      {name:'Legare-factory',month:'8月',reason:'個人用のチタン製品'},
      {name:'エレコムダイレクト Yahoo!店',month:'8月',reason:'個人用'},
      {name:'セイコー堂 Yahoo!店',month:'8月',reason:'個人用'},
      {name:'Shop Trade／strade-web',month:'8月',reason:'掃除用品。仕入れ対象外'},
      {name:'newfine',month:'8月',reason:'ミネラルウォーター。仕入れ対象外'},
      {name:'サンプル百貨店',month:'9月',reason:'飲料・食品。一般仕入れ監視の対象外'}
    ]
  };

  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let category='sourcing';
  const labels={sourcing:'一般仕入れ',tcg:'TCG別枠',excluded:'仕入れではない'};
  const classes={sourcing:'accepted',tcg:'separate',excluded:'excluded'};

  function rows(kind){
    return snapshot[kind].map((x,i)=>'<tr class="'+classes[kind]+'"><td class="store-no">'+String(i+1).padStart(2,'0')+'</td><td><b>'+h(x.name)+'</b></td><td>'+h(x.month)+'</td><td><span class="store-status '+classes[kind]+'">'+h(labels[kind])+'</span></td><td>'+h(x.reason)+'</td></tr>').join('');
  }

  function panel(){
    const total=snapshot.sourcing.length+snapshot.tcg.length+snapshot.excluded.length;
    return '<div class="store-audit-head"><div><b>8・9月 購入店舗の判定</b><br><small>'+h(snapshot.asOf)+'時点。Gmailの注文履歴と本人確認を反映。</small></div><div class="store-audit-total">'+total+'店舗を分類済み</div></div>'+
      '<div class="store-audit-summary"><button class="push-button small '+(category==='sourcing'?'selected':'')+'" data-store-kind="sourcing">一般仕入れ <b>'+snapshot.sourcing.length+'</b></button><button class="push-button small '+(category==='tcg'?'selected':'')+'" data-store-kind="tcg">TCG別枠 <b>'+snapshot.tcg.length+'</b></button><button class="push-button small '+(category==='excluded'?'selected':'')+'" data-store-kind="excluded">仕入れではない <b>'+snapshot.excluded.length+'</b></button></div>'+
      (category==='sourcing'?'<p class="store-audit-note"><b>Amazonだけは店舗単位で決めない。</b> 同一商品の複数購入、商品カテゴリ、過去の調査履歴から注文ごとに判定します。</p>':'')+
      '<div class="supplier-table-wrap"><table class="supplier-table store-audit-table"><thead><tr><th>No.</th><th>店舗</th><th>購入月</th><th>判定</th><th>理由</th></tr></thead><tbody>'+rows(category)+'</tbody></table></div>'+
      '<p class="store-audit-foot">誤判定の確認用に、仕入れ対象外の店舗も削除せず残しています。</p>';
  }

  const tabs=document.getElementById('sourcingTabs');
  if(tabs&&!document.getElementById('sourcingStoreAuditCount')){
    const sep=document.createElement('span');
    sep.className='separator';
    const button=document.createElement('button');
    button.className='push-button small';
    button.dataset.sourcingSub='store-audit';
    button.innerHTML='店舗判定 <span class="sourcing-tab-count" id="sourcingStoreAuditCount">'+(snapshot.sourcing.length+snapshot.tcg.length+snapshot.excluded.length)+'</span>';
    tabs.append(sep,button);
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    if(sourcingApp.sub!=='store-audit'){baseRender();return}
    document.querySelectorAll('#sourcingTabs button[data-sourcing-sub]').forEach(b=>b.classList.toggle('selected',b.dataset.sourcingSub==='store-audit'));
    const host=document.getElementById('sourcingBody');
    host.innerHTML=panel();
    host.querySelectorAll('[data-store-kind]').forEach(button=>button.onclick=()=>{
      if(typeof bump==='function')bump(button);
      category=button.dataset.storeKind;
      renderSourcing();
    });
  };

  const style=document.createElement('style');
  style.textContent=`
    .store-audit-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;padding:9px 10px;margin-bottom:7px}
    .store-audit-total{font-family:"MS Gothic",monospace;font-weight:700;color:#000080;white-space:nowrap}
    .store-audit-summary{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
    .store-audit-summary .push-button b{display:inline-block;min-width:20px;margin-left:5px;padding:0 4px;background:#fff;border:1px solid #777;line-height:16px}
    .store-audit-note{margin:0 0 8px;padding:8px 10px;background:#fff6b5;border:1px solid #9b8e51;font-size:12px;line-height:1.55}
    .store-audit-table{min-width:760px}
    .store-audit-table .store-no{width:48px;color:#555;text-align:right}
    .store-audit-table tr.accepted{background:#f1fff1}
    .store-audit-table tr.separate{background:#f3f3ff}
    .store-audit-table tr.excluded{background:#f5f5f5;color:#444}
    .store-status{display:inline-block;padding:2px 6px;border:1px solid #777;background:#fff;font-weight:700;white-space:nowrap}
    .store-status.accepted{color:#006000}
    .store-status.separate{color:#000080}
    .store-status.excluded{color:#7b0000}
    .store-audit-foot{margin:7px 2px 0;font-size:11px;color:#444}
    @media(max-width:700px){.store-audit-head{display:block}.store-audit-total{margin-top:6px}.store-audit-summary .push-button{min-height:44px;flex:1 1 145px}}
  `;
  document.head.appendChild(style);
  window.CCStoreAudit={snapshot};
})();