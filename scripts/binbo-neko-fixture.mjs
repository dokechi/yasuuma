export function fixture(){const now=new Date().toISOString();return {
 id:'binbo-neko-test',source_id:'source-test',variant_key:'ABC123|navy',state:'draft_ready',generated_at:now,
 product:{name:'Example Tote',brand:'Example',model:'ABC123',color:'navy',size:'35×39×16cm',condition:'新品',specs:['polyester']},
 offer:{shop:'Example Shop',url:'https://shop.example/item',price_yen:1980,shipping_yen:770,payable_yen:2750,checked_at:now,conditions:['ポイント・限定クーポンを引かない'],stock:{status:'available',variant_confirmed:true,evidence:'navy selected; purchase button enabled',quantity:null}},
 fit:{reader:'Exampleが好きな人',use:'着替えを持ち運ぶ',reason:'寸法が必要な荷物に合う',cautions:['送料を含める'],not_for:['小型バッグが欲しい人']},
 affiliate:{program:'Example Affiliate',guide_url:'https://example.com/guide',availability:'public_program_candidate',link_status:'manual_before_posting'},
 copy:{title:'Exampleの商品1,980円',threads_caption:'PR\n送料込み2,750円',tiktok_caption:'PR\n商品1,980円＋送料770円',pages:[{page:1,headline:'Exampleの商品1,980円',body:'送料込み2,750円',visual_intent:'商品写真を大きく、送料も読める位置'}]},
 evidence:[{claim:'商品仕様・価格・在庫',url:'https://shop.example/item',checked_at:now}],source_judgment:{verdict:'miss',reason:null,purchase_check:'台帳に一致なし。台帳外は未確認'},preflight:['投稿前に価格・在庫を確認']};}
export function review(){return {signal_id:'source-test',verdict:'miss',snapshot:{payload:{result_kind:'candidate',brand:'Example',model_family:'Example Tote'}}};}
