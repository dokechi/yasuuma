(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const snapshot={
    asOf:'2026/09/11',
    sourcing:[
      {name:'Amazon.co.jp',month:'8・9月',products:"クロックス サンダル、ミズノ LD40、UGG W Goldenglow Slide、Converse Hot Wheelsほか",reason:'仕入れ実績あり。私物も混在するため商品内容・数量・過去の調査履歴で判定'},
      {name:'ECJOY',month:'8月',products:"BIRKENSTOCK Gizeh EVA Khaki（43・44）",reason:'Birkenstockなど一般商品の仕入れ'},
      {name:'detail-online-store',month:'8・9月',products:"VANS HALF CAB 33 DX、NIKE SB FORCE58、PEARLY GATES CROCS JIBBITZ、RAMIDUS NECK POUCHほか",reason:'一般商品の仕入れ'},
      {name:'Outdoor Shop Orange',month:'8・9月',products:"REEF OASIS DOUBLE UP、REEF MULLIGAN II Links",reason:'REEFなどアウトドア・フットウェアの仕入れ'},
      {name:'FirstStage',month:'8・9月',products:"G/FORE 半袖ポロシャツ、HONMA アイアンカバーほか",reason:'G/FORE・ゴルフ用品の仕入れ'},
      {name:'マルイウェブチャネル',month:'8月',products:"ファッション商品（Gmail本文では商品名を確認できず）",reason:'ファッション商品の仕入れ'},
      {name:'スポーツジュエン',month:'8・9月',products:"DIADORA サンバイザー、adidas ゴルフスカート",reason:'スポーツ・ゴルフ商品の仕入れ'},
      {name:'ゴルフパートナー annex',month:'8月',products:"Callaway アクティブ ラウンド トートバッグほか",reason:'ゴルフ用品の仕入れ'},
      {name:'Mac-House',month:'8月',products:"POLO RALPH LAUREN商品（複数点）",reason:'アパレル商品の仕入れ'},
      {name:'GILT',month:'8月',products:"Clarks Cologne Arlo サイドゴア ショートブーツ",reason:'ファッション商品の仕入れ'},
      {name:'Dempsey Sports',month:'8月',products:"HUMMEL HANDBALL PERFEKT HM226303",reason:'スポーツ商品の仕入れ'},
      {name:'ZOZOTOWN Yahoo!店',month:'8月',products:"ファッション商品（Gmail本文では商品名を確認できず）",reason:'ファッション商品の仕入れ'},
      {name:'END.',month:'8月',products:"海外ファッション商品（Gmail本文では商品名を確認できず）",reason:'海外ファッション商品の仕入れ'},
      {name:'アエナ公式',month:'8月',products:"Cleo's Beaute リペアトリートメント エキゾチックウッディ 380ml ×7",reason:'同一商品を複数購入。美容商品の仕入れ'},
      {name:'YOOX',month:'8月',products:"ファッション商品（Gmail本文では商品名を確認できず）",reason:'仕入れ目的の購入実績あり'},
      {name:'INNOCN Japan',month:'9月',products:"INNOCN WF26-PRO モニター",reason:'モニターの仕入れ'},
      {name:'ロコンド（販売元：MEGA SPORTS）',month:'9月',products:"NIKE Tiempo Legend 10 Pro HOT LAVA／WHITE（複数サイズ）",reason:'スポーツ・フットウェアの仕入れ'},
      {name:'現場市場',month:'9月',products:"MIZUNO KUGEKI 長袖・半袖、ナビドライTシャツほか",reason:'ミズノなど一般商品の仕入れ'}
    ],
    tcg:[
      {name:'トレカショップLEAD.',month:'8月',products:"機動戦士ガンダム アーセナルベース スペシャルスターターデッキセット",reason:'TCG。専用タスクで管理'},
      {name:'トレカドンドン',month:'8月',products:"ガンダムカードゲーム商品",reason:'TCG。専用タスクで管理'},
      {name:'ポケモンセンターオンライン',month:'8月',products:"ポケモンカードゲーム MEGAシリーズ抽選商品",reason:'ポケモン・TCG系。専用タスクで管理'},
      {name:'ジャンプキャラクターズストア',month:'8月',products:"ジャンプ作品キャラクター商品（Gmail本文では商品名を確認できず）",reason:'キャラクター商品。専用タスクで管理'},
      {name:'タカラトミーモール',month:'8月',products:"デュエル・マスターズ／キャラクター商品",reason:'玩具・キャラクター系。専用タスクで管理'},
      {name:'楽天ブックス',month:'8月',products:"Magic: The Gathering Secret Lair Commander Deck: Hatsune Miku",reason:'今回の購入はTCG・キャラクター系'},
      {name:'LIFETUNES MALL',month:'8月',products:"TCG商品［02］Highway in 2026",reason:'TCG商品。専用タスクで管理'},
      {name:'ビックカメラ',month:'8月',products:"ROBOT魂、加湿王 バーニングゴジラ【改】、仮面ライダーギーツ商品ほか",reason:'今回の注文はROBOT魂・ゴジラ・仮面ライダー系中心'}
    ],
    excluded:[
      {name:'アイリスプラザ',month:'8月',products:"FASHIONABLE MASK、STR-1200ほか",reason:'会社・事務用'},
      {name:'Legare-factory',month:'8月',products:"TITAN MANIA チタン製品 Ver.7",reason:'個人用のチタン製品'},
      {name:'エレコムダイレクト Yahoo!店',month:'8月',products:"エレコム ノートPC用クーラー SX-CL23LBK",reason:'個人用'},
      {name:'セイコー堂 Yahoo!店',month:'8月',products:"SEIKO NATOタイプ バンド 20mm RS18C20NY",reason:'個人用'},
      {name:'Shop Trade／strade-web',month:'8月',products:"アズマ工業 高所外回り お掃除3点セット",reason:'掃除用品。仕入れ対象外'},
      {name:'newfine',month:'8月',products:"国産天然水 500ml 45本（シリカ42mg/L・ラベルレス）",reason:'ミネラルウォーター。仕入れ対象外'},
      {name:'サンプル百貨店',month:'9月',products:"ドトール カフェ・オ・レ／ブラック飲料、むぎスティック・むぎまぐブレンド",reason:'飲料・食品。一般仕入れ監視の対象外'}
    ],
    sales:{
      matched:[
        {store:'ゴルフパートナー annex',confidence:'確定',count:'39件',amount:'売価確認37件 ¥52,985',status:'取引完了34件・支払受付5件',items:'HONMA福袋構成品、SRIXONスコアカウンター、MIZUNO BGサポーター、Callawayカートバッグ',note:'注文メールの商品名・型番・サイズまたは福袋構成品と一致。売上確定のみ2件は売価合計外'},
        {store:'detail-online-store',confidence:'確定',count:'5件',amount:'¥11,995',status:'5件とも取引完了／売上確定',items:'crocs Echo Clog BLACK 26cm×1／PEARLY GATES JIBBITZ 5個×4',note:'注文#12622のM8（26cm）と注文#12606・#12700のJIBBITZに一致'},
        {store:'スポーツジュエン',confidence:'確定',count:'2件',amount:'¥5,198',status:'取引完了1件・支払受付1件',items:'DIADORA サンバイザー ¥1,199／adidas GOLF プリーツスカートL緑 ¥3,999',note:'8/28注文のD103172935とIS9686 J/Lに一致'},
        {store:'FirstStage',confidence:'確定＋高確度',count:'7件',amount:'¥36,194',status:'7件とも取引完了／売上確定',items:'G/FORE ピンク半袖ポロ×2、白プリーツスカートL×4、黒ハーフジップ×1',note:'確定5件。白スカート1件は捕捉注文数超過、黒ハーフジップは売却タイトルに型番・サイズなしのため高確度'},
        {store:'Mac-House',confidence:'高確度',count:'5件',amount:'売価確認4件 ¥6,296',status:'5件とも取引完了／売上確定',items:'POLO RALPH LAUREN 靴下3足 白 25–27cm',note:'購入記録のブランド・商品種別と一致。売上確定のみ1件は売価合計外'},
        {store:'アエナ公式',confidence:'高確度',count:'4件',amount:'¥16,496',status:'4件とも取引完了',items:"Cleo's Beauté リペアトリートメント 2本×3／4本×1",note:'商品は完全一致。ただし販売数量10本に対し今回捕捉した購入記録は7本のため高確度'}
      ],
      unmatched:[
        {items:'TOM WOOD Frame Ring Slim 56',count:'2件',amount:'¥50,000'},
        {items:'Tom Wood Kim Ring Kambaba',count:'1件',amount:'¥41,000'},
        {items:'TOM WOOD Kay Ring Leopard 60',count:'1件',amount:'¥40,000'},
        {items:'ReFa ドライヤースマート RE-AN-02A',count:'1件',amount:'¥29,000'},
        {items:'LAURA MERCIER ブラシセット',count:'8件',amount:'¥24,000'},
        {items:'THOM BROWNE TB-507-BT メガネ',count:'2件',amount:'¥17,998'},
        {items:'MARIA BLACK Mambo パールピアス',count:'1件',amount:'¥14,999'},
        {items:'加湿王ゴジラ改 バーニングゴジラ改 2個',count:'2件',amount:'¥13,200'},
        {items:'DIESEL チェーン付き長袖カットソー',count:'1件',amount:'¥11,000'},
        {items:'DIESEL PLAY-D フラグメントケース',count:'1件',amount:'¥9,999'},
        {items:'Thom Browne メガネ（Yahoo!フリマ）',count:'1件',amount:'¥9,000'},
        {items:'まとめ商品（u様／2点）',count:'1件',amount:'¥9,000'},
        {items:'アートクラスバイロダン シェーディング02',count:'8件',amount:'¥8,580'},
        {items:'ELECOM NESTOUT SPEAKER-1',count:'3件',amount:'¥8,200'},
        {items:'Fitbit エアロバイク',count:'1件',amount:'¥8,000'},
        {items:'ポールスミス ドレスシューズ',count:'1件',amount:'¥8,000'},
        {items:'The Fallen & The Virtuous 4枚',count:'1件',amount:'¥7,500'},
        {items:'VANS LX Old Skool Y2Kフレイム 26.5cm',count:'1件',amount:'¥7,000'},
        {items:'REEF THE LAYBACK 黒 27.2cm',count:'3件',amount:'¥5,397'},
        {items:'ミズノ LDアラウンド2 黒 22cm 4E',count:'2件',amount:'¥5,500'},
        {items:'電動回転モップクリーナー',count:'1件',amount:'¥5,000'},
        {items:'CABaN SOLBIATI リネンパンツL',count:'1件',amount:'¥5,000'},
        {items:'G/FORE 総柄ポロシャツ36 S 黒白',count:'1件',amount:'¥4,999'},
        {items:'Reebok Club C 85 AXB 26.5cm',count:'1件',amount:'¥3,500'},
        {items:'For fam 全身保湿ケアホイップ5本',count:'1件',amount:'¥3,500'},
        {items:'LAURA MERCIER ボディオイル ネロリ',count:'1件',amount:'¥3,000'},
        {items:'専用出品（kirara様）',count:'1件',amount:'¥3,000'},
        {items:'高品質オーディオ用スパイク4pcs',count:'2件',amount:'¥3,000'},
        {items:'マーベルレジェンド メリージェーン',count:'1件',amount:'¥3,000'},
        {items:'まとめ商品（K様／3点）',count:'1件',amount:'¥2,700'},
        {items:'サンリオ いちご新聞50周年トレカ8パック',count:'1件',amount:'¥2,500'},
        {items:'REEF OASIS TWO-BAR 黒 27.2cm',count:'1件',amount:'¥2,400'},
        {items:'Vネック ホワイトTシャツM 日本製',count:'1件',amount:'¥2,000'},
        {items:'第五人格 血の女王 TシャツL 3枚',count:'1件',amount:'¥1,999'},
        {items:'仮面ライダー BLACK SUN ソフビセット',count:'1件',amount:'¥1,500'},
        {items:'VALLY シリコンリング',count:'2件',amount:'¥1,400'},
        {items:'MIZUNO GOLF ペイント総柄キャップ',count:'1件',amount:'¥999'},
        {items:'GUNDAM ARSENAL BASE PARALLEL 2 CARD SET',count:'1件',amount:'¥999'},
        {items:'DAD Automotive Fragrance Tablet 5個',count:'1件',amount:'¥900'},
        {items:'仮面ライダー カードダス',count:'1件',amount:'¥800'},
        {items:'foil 嵐の鎚、ミョルニル',count:'1件',amount:'¥600'},
        {items:'文豪ストレイドッグス 中原中也 アクスタ',count:'1件',amount:'¥600'}
      ]
    }
  };

  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let category='sourcing';
  const labels={sourcing:'一般仕入れ',tcg:'TCG別枠',excluded:'仕入れではない'};
  const classes={sourcing:'accepted',tcg:'separate',excluded:'excluded'};

  function rows(kind){
    return snapshot[kind].map((x,i)=>'<tr class="'+classes[kind]+'"><td class="store-no">'+String(i+1).padStart(2,'0')+'</td><td><b>'+h(x.name)+'</b></td><td>'+h(x.month)+'</td><td class="store-products">'+h(x.products||'—')+'</td><td><span class="store-status '+classes[kind]+'">'+h(labels[kind])+'</span></td><td>'+h(x.reason)+'</td></tr>').join('');
  }

  function salesRows(){
    return snapshot.sales.matched.map((x,i)=>'<tr class="accepted"><td class="store-no">'+String(i+1).padStart(2,'0')+'</td><td><b>'+h(x.store)+'</b><br><span class="sale-confidence '+(x.confidence==='確定'?'accepted':'separate')+'">'+h(x.confidence)+'</span></td><td class="store-products">'+h(x.items)+'</td><td>'+h(x.count)+'</td><td class="sale-amount">'+h(x.amount)+'</td><td>'+h(x.status)+'</td><td>'+h(x.note)+'</td></tr>').join('');
  }

  function unmatchedRows(){
    return snapshot.sales.unmatched.map((x,i)=>'<tr><td class="store-no">'+String(i+1).padStart(2,'0')+'</td><td class="store-products">'+h(x.items)+'</td><td>'+h(x.count)+'</td><td class="sale-amount">'+h(x.amount)+'</td><td>購入メールと店舗を一意に確定できず</td></tr>').join('');
  }

  function salesPanel(){
    return '<div class="store-audit-head"><div><b>メルカリ＋Yahoo!フリマ 売却照合</b><br><small>2026/08/01〜09/11。2つのGmailからメルカリ取引完了85件＋Yahoo!フリマ支払い受付40件を商品IDで重複排除。</small></div><div class="store-audit-total">照合62件</div></div>'+
      '<div class="store-audit-summary"><button class="push-button small" data-store-kind="sourcing">一般仕入れ <b>'+snapshot.sourcing.length+'</b></button><button class="push-button small" data-store-kind="tcg">TCG別枠 <b>'+snapshot.tcg.length+'</b></button><button class="push-button small" data-store-kind="excluded">仕入れではない <b>'+snapshot.excluded.length+'</b></button><button class="push-button small selected" data-store-kind="sales">売却照合 <b>62</b></button></div>'+
      '<div class="sale-kpis"><div><b>売価確認</b><strong>59件／¥129,164</strong></div><div><b>照合内訳</b><strong>確定51・高確度11</strong></div><div><b>未照合</b><strong>66件／¥380,769</strong></div></div>'+
      '<p class="store-audit-note"><b>売価と受取額は別です。</b> メルカリは取引完了メールの商品価格、Yahoo!フリマは支払い受付メールの購入者支払金額を売価として集計。売上確定メールしか残っていない3件は売価合計に入れていません。</p>'+
      '<h3 class="sale-section-title">仕入れ店舗まで照合できたもの</h3><div class="supplier-table-wrap"><table class="supplier-table store-audit-table sale-match-table"><thead><tr><th>No.</th><th>仕入れ店舗</th><th>売れた商品</th><th>件数</th><th>売価</th><th>状態</th><th>照合根拠</th></tr></thead><tbody>'+salesRows()+'</tbody></table></div>'+
      '<h3 class="sale-section-title">未照合（確認用に残す）</h3><p class="store-audit-foot">未照合は「仕入れではない」という意味ではありません。購入メールの店・型番・サイズまで一致したら上へ移します。</p><div class="supplier-table-wrap"><table class="supplier-table store-audit-table"><thead><tr><th>No.</th><th>売れた商品</th><th>件数</th><th>売価合計</th><th>未照合理由</th></tr></thead><tbody>'+unmatchedRows()+'</tbody></table></div>';
  }

  function panel(){
    if(category==='sales')return salesPanel();
    const total=snapshot.sourcing.length+snapshot.tcg.length+snapshot.excluded.length;
    return '<div class="store-audit-head"><div><b>8・9月 購入店舗の判定</b><br><small>'+h(snapshot.asOf)+'時点。Gmailの注文履歴と本人確認を反映。</small></div><div class="store-audit-total">'+total+'店舗を分類済み</div></div>'+
      '<div class="store-audit-summary"><button class="push-button small '+(category==='sourcing'?'selected':'')+'" data-store-kind="sourcing">一般仕入れ <b>'+snapshot.sourcing.length+'</b></button><button class="push-button small '+(category==='tcg'?'selected':'')+'" data-store-kind="tcg">TCG別枠 <b>'+snapshot.tcg.length+'</b></button><button class="push-button small '+(category==='excluded'?'selected':'')+'" data-store-kind="excluded">仕入れではない <b>'+snapshot.excluded.length+'</b></button><button class="push-button small '+(category==='sales'?'selected':'')+'" data-store-kind="sales">売却照合 <b>62</b></button></div>'+
      (category==='sourcing'?'<p class="store-audit-note"><b>Amazonだけは店舗単位で決めない。</b> 同一商品の複数購入、商品カテゴリ、過去の調査履歴から注文ごとに判定します。</p>':'')+
      '<div class="supplier-table-wrap"><table class="supplier-table store-audit-table"><thead><tr><th>No.</th><th>店舗</th><th>購入月</th><th>購入商品</th><th>判定</th><th>理由</th></tr></thead><tbody>'+rows(category)+'</tbody></table></div>'+
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
    .store-audit-table{min-width:1040px}
    .store-audit-table .store-products{min-width:310px;line-height:1.45}.store-audit-table .store-no{width:48px;color:#555;text-align:right}
    .store-audit-table tr.accepted{background:#f1fff1}
    .store-audit-table tr.separate{background:#f3f3ff}
    .store-audit-table tr.excluded{background:#f5f5f5;color:#444}
    .store-status{display:inline-block;padding:2px 6px;border:1px solid #777;background:#fff;font-weight:700;white-space:nowrap}
    .store-status.accepted{color:#006000}
    .store-status.separate{color:#000080}
    .store-status.excluded{color:#7b0000}
    .store-audit-foot{margin:7px 2px 0;font-size:11px;color:#444}
    .sale-kpis{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:7px;margin-bottom:8px}.sale-kpis>div{background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;padding:8px 10px}.sale-kpis b{display:block;font-size:11px;color:#555}.sale-kpis strong{display:block;margin-top:3px;font-size:16px;color:#000080}.sale-section-title{margin:10px 2px 5px;font-size:14px}.sale-amount{font-weight:700;white-space:nowrap}.sale-confidence{display:inline-block;margin-top:4px;padding:1px 5px;border:1px solid #777;background:#fff;font-size:11px;font-weight:700}.sale-confidence.accepted{color:#006000}.sale-confidence.separate{color:#000080}
    @media(max-width:700px){.sale-kpis{grid-template-columns:1fr}.store-audit-head{display:block}.store-audit-total{margin-top:6px}.store-audit-summary .push-button{min-height:44px;flex:1 1 145px}}
  `;
  document.head.appendChild(style);
  window.CCStoreAudit={snapshot};
})();