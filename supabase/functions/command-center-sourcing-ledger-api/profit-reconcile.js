/* Read-only cost estimates. Source allocations and inventory are never changed. */
(function(root,factory){const M=typeof module==='object'&&module.exports?require('./ledger-profit-model.js'):root.CCLedgerProfit,api=factory(M);if(typeof module==='object'&&module.exports)module.exports=api;else root.CCLedgerReconcile=api;})(typeof window==='undefined'?globalThis:window,function(M){
 'use strict';
 const round=n=>Math.round(n*100)/100;
 const text=v=>String(v||'').normalize('NFKC').toLowerCase();
 const title=v=>text(v).replace(/定価[\d,]+円|新品|【未使用品】|\[新品\]|[\s　]/g,'');
 const family=p=>JSON.stringify([p.supplier_key,p.sku||title(p.product_name),text(p.variant)]);
 const before=(p,s)=>Number.isFinite(Date.parse(p.ordered_at))&&Number.isFinite(Date.parse(s.sold_at))&&Date.parse(p.ordered_at)<=Date.parse(s.sold_at);
 const active=s=>['completed','in_progress'].includes(s.status);
 const codes=p=>[...new Set((text([p.sku,p.variant,p.product_name].join(' ')).match(/\b[a-z0-9]+(?:-[a-z0-9]+)+\b/g)||[]).filter(c=>c.length>=6&&(/^[a-z][a-z0-9]*-[a-z0-9-]*\d[a-z0-9-]*$/.test(c)||/^\d{3,}-\d{3,}$/.test(c))))];
 const canonical=v=>text(v).replace(/ジーフォア|g\/fore/g,'gfore').replace(/ナイキ/g,'nike').replace(/ティエンポ/g,'tiempo').replace(/レジェンド/g,'legend').replace(/ディズニー|disney/g,'disney').replace(/ミッキーマウス|ミッキー|mickey/g,'mickey').replace(/ゴールデングロウ/g,'goldenglow').replace(/スライド/g,'slide').replace(/アディダス/g,'adidas').replace(/クロシェ/g,'crochet').replace(/tシャツ/g,'t-shirt').replace(/ミズノ/g,'mizuno').replace(/ふくらはぎサポーター|カーフサポート/g,'calf-support').replace(/ディーゼル/g,'diesel').replace(/フラグメントケース|カードケース/g,'cardcase');
 function sizeOf(v){const t=canonical(v).replace(/x-large/g,'xl').replace(/x-small/g,'xs');return t.match(/\b(\d{2}(?:\.\d+)?)\s*cm/)?.[1]?.replace(/\.0$/,'')||t.match(/(?:^|[^a-z0-9])(2xl|xl|xs|s|m|l)(?=$|[^a-z0-9])/)?.[1]||(/gfore/.test(t)?({'34':'xs','36':'s','38':'m','40':'l'}[t.match(/\b(34|36|38|40)\b/)?.[1]]||null):null);}
 const colorsOf=v=>{const t=text(v);return [['black',/ブラック|\bblack\b|黒/],['white',/ホワイト|\bwhite\b|白/],['navy',/ネイビー|\bnavy\b|紺/],['pink',/ピンク|\bpink\b/],['beige',/ベージュ|\bbeige\b/],['red',/レッド|\bred\b|赤/],['green',/グリーン|\bgreen\b|緑/],['blue',/ブルー|\bblue\b|青/],['grey',/グレー|\bgr[ae]y\b/],['purple',/パープル|\bpurple\b|紫/],['yellow',/イエロー|\byellow\b|黄/],['silver',/シルバー|\bsilver\b|銀/],['brown',/ブラウン|\bbrown\b|茶/]].filter(([,r])=>r.test(t)).map(([c])=>c);};
 // Explicit product families only: a shared brand alone is never a candidate.
 function candidateFamily(s){const t=canonical(s.product_name);
  if(/mizuno/.test(t)&&/calf-support/.test(t))return p=>/mizuno/.test(canonical(p.product_name))&&/calf-support/.test(canonical(p.product_name));
  if(/nike/.test(t)&&/sb\s*shane/.test(t))return p=>/nike.*sb\s*shane/.test(canonical(p.product_name));
  if(/nike/.test(t)&&/tiempo.*(?:legend\s*)?10.*pro/.test(t))return p=>/nike.*tiempo.*legend\s*10.*pro/.test(canonical(p.product_name));
  if(/ugg/.test(t)&&/goldenglow/.test(t)&&/slide/.test(t))return p=>/ugg.*goldenglow.*slide/.test(canonical(p.product_name));
  if(/aviot|te-q3-hk/.test(t)&&/ハイキュー/.test(t))return p=>/te-q3-hk/i.test(p.product_name||'')&&/ハイキュー/.test(p.product_name||'');
  if(/adidas/.test(t)&&/crochet/.test(t))return p=>/adidas.*crochet/.test(canonical(p.product_name));
  if(/adidas/.test(t)&&/サイドテープスカート/.test(t))return p=>/adidas/.test(canonical(p.product_name))&&/サイドテープスカート/.test(p.product_name);
  if(/adidas/.test(t)&&/ult365/.test(t)&&/プリーツスカート/.test(t))return p=>/adidas/.test(canonical(p.product_name))&&/ult365/.test(canonical(p.product_name))&&/プリーツスカート/.test(p.product_name);
  if(/adidas/.test(t)&&/中綿|中わた/.test(t)&&/スカート/.test(t))return p=>/adidas/.test(canonical(p.product_name))&&/中わた/.test(p.product_name)&&/スカート/.test(p.product_name);
  if(/disney/.test(t)&&/mickey/.test(t)&&/コスプレ|コスチューム/.test(t))return p=>/disney/.test(canonical(p.product_name))&&/mickey/.test(canonical(p.product_name))&&/コスチューム/.test(p.product_name);
  if(/polo.*ralph.*lauren/.test(t)&&/靴下|ソックス/.test(t)&&/3足/.test(t))return p=>/polo.*ralph.*lauren/i.test(p.product_name||'')&&/ソックス/.test(p.product_name)&&/3足/.test(p.product_name);
  if(/diesel/.test(t)&&/cardcase/.test(t))return p=>/diesel/.test(canonical(p.product_name))&&/cardcase/.test(canonical(p.product_name));
  if(/gfore/.test(t)){const kind=/ハーフジップ/.test(t)?'ハーフジップ':/ポロ/.test(t)?'ポロ':/モックネック/.test(t)?'モックネック':/プリーツスカート/.test(t)?'プリーツスカート':/スカート/.test(t)?'スカート':null;if(kind)return p=>/gfore/.test(canonical(p.product_name))&&String(p.product_name).includes(kind);}
  return null;
 }
 function candidates(s,pool){const name=text(s.product_name),size=sizeOf(s.product_name),colors=colorsOf(s.product_name);return pool.filter(p=>{const variant=String(p.variant||''),other=sizeOf(variant),pc=colorsOf(variant);if(colors.length&&pc.length&&!colors.some(c=>pc.includes(c)))return false;
   if(/disney/.test(canonical(s.product_name))){if(/12-18m/.test(name))return /70[～~〜-]80/.test(text(variant));if(/2t|90cm/.test(name))return /85[～~〜-]95/.test(text(variant));return false;}
   if(size&&other&&size!==other)return false;
   return true;
  });}
 function project(sales,purchases,allocations,components=[],componentAllocations=[],options={}){
  const ps=purchases.filter(p=>p.status==='purchased'),byP=new Map(ps.map(p=>[String(p.id),p])),byS=new Map(sales.map(s=>[String(s.id),s])),byC=new Map(components.map(c=>[String(c.id),c]));
  const direct=new Map(),split=new Map(),reserved=new Map(),componentReserved=new Map(),families=new Map(),seeds=new Map(),output=new Map();
  const add=(map,key,value)=>{key=String(key);if(!map.has(key))map.set(key,[]);map.get(key).push(value);};
  for(const p of ps)add(families,family(p),p);
  for(const a of allocations){add(direct,a.sale_row_id,a);if(active(byS.get(String(a.sale_row_id))||{}))reserved.set(String(a.purchase_id),(reserved.get(String(a.purchase_id))||0)+(M.known(a.quantity)||0));}
  for(const p of ps)reserved.set(String(p.id),(reserved.get(String(p.id))||0)+(M.known(p.adjustment_quantity)||0));
  for(const a of componentAllocations){add(split,a.sale_row_id,a);if(active(byS.get(String(a.sale_row_id))||{}))componentReserved.set(String(a.component_id),(componentReserved.get(String(a.component_id))||0)+(M.known(a.quantity)||0));}
  const fake=ps.map(p=>({id:p.id,quantity:1})),unitRows=ps.map(p=>({...p,metadata:{...p.metadata,bundle_decomposed:false}}));
  const unitProjection=M.costs(fake,ps.map(p=>({sale_row_id:p.id,purchase_id:p.id,quantity:1,confidence:'exact'})),unitRows),unit=p=>p.metadata?.landed_cost_pending_import_duties===true?null:unitProjection.get(String(p.id))?.purchase_cost_yen??null;
  const recipe=matches=>{const result=new Map();for(const a of matches){const p=byP.get(String(a.purchase_id));if(!p||!M.known(a.quantity))return null;const key=family(p);result.set(key,(result.get(key)||0)+Number(a.quantity));}return [...result].sort(([a],[b])=>a.localeCompare(b));};
  for(const s of sales){const matches=direct.get(String(s.id))||[];if(!matches.length||matches.some(a=>a.confidence!=='exact'))continue;const r=recipe(matches);if(r)add(seeds,title(s.product_name),JSON.stringify(r));}
  function directCost(s,matches){if(matches.reduce((n,a)=>n+(M.known(a.quantity)||0),0)!==Number(s.quantity))return null;let cost=0;for(const a of matches){const p=byP.get(String(a.purchase_id)),c=p&&unit(p);if(!p||c===null||!before(p,s)||!['exact','high'].includes(a.confidence)||p.metadata?.bundle_decomposed||!M.known(a.quantity)||(reserved.get(String(p.id))||0)>Number(p.quantity))return null;cost+=c*Number(a.quantity);}return round(cost);}
  function componentCost(s,matches){if(matches.reduce((n,a)=>n+(M.known(a.quantity)||0),0)<Number(s.quantity))return null;let cost=0;for(const a of matches){const c=byC.get(String(a.component_id)),p=c&&byP.get(String(c.purchase_id)),value=p&&unit(p),all=components.filter(x=>String(x.purchase_id)===String(p?.id)),parts=all.reduce((n,x)=>n+(M.known(x.quantity_per_bundle)||0),0);if(!c||!p||value===null||!parts||!before(p,s)||!['exact','high'].includes(a.confidence)||(componentReserved.get(String(c.id))||0)>Number(c.initial_quantity))return null;cost+=value/parts*Number(a.quantity);}return round(cost);}
  function take(s,requirements){const plan=[],spent=new Map();let cost=0;for(const [pool,needed]of requirements){let left=needed;for(const p of [...pool].sort((a,b)=>Date.parse(a.ordered_at)-Date.parse(b.ordered_at)||Number(a.id)-Number(b.id))){const c=unit(p),key=String(p.id),available=Number(p.quantity)-(reserved.get(key)||0)-(spent.get(key)||0);if(c===null||!before(p,s)||available<=0||p.metadata?.bundle_decomposed)continue;const qty=Math.min(left,available);cost+=qty*c;plan.push({id:p.id,quantity:qty});spent.set(key,(spent.get(key)||0)+qty);left-=qty;if(!left)break;}if(left)return null;}for(const [id,qty]of spent)reserved.set(id,(reserved.get(id)||0)+qty);return {cost:round(cost),links:plan};}
  function takeComponents(s,requirements){const plan=[],spent=new Map();let cost=0;for(const [key,needed]of requirements){let left=needed;const pool=components.filter(c=>c.component_key===key).sort((a,b)=>Date.parse(byP.get(String(a.purchase_id))?.ordered_at)-Date.parse(byP.get(String(b.purchase_id))?.ordered_at)||Number(a.id)-Number(b.id));for(const c of pool){const p=byP.get(String(c.purchase_id)),value=p&&unit(p),parts=components.filter(x=>String(x.purchase_id)===String(c.purchase_id)).reduce((n,x)=>n+(M.known(x.quantity_per_bundle)||0),0),id=String(c.id),available=Number(c.initial_quantity)-(componentReserved.get(id)||0)-(spent.get(id)||0);if(!p||value===null||!parts||!before(p,s)||available<=0)continue;const qty=Math.min(left,available);cost+=qty*value/parts;plan.push({component_id:c.id,purchase_id:p.id,quantity:qty});spent.set(id,(spent.get(id)||0)+qty);left-=qty;if(!left)break;}if(left)return null;}for(const [id,qty]of spent)componentReserved.set(id,(componentReserved.get(id)||0)+qty);return {cost:round(cost),links:plan};}
  function honma(s){const t=text(s.product_name);if(!/honma|本間|ホンマ/.test(t))return null;const prefix='HONMA_LUCKY_BAG_';if(/キャップ/.test(t)&&/白黒|ホワイト.*ブラック/.test(t))return [[prefix+'CAP',1]];if(/ソックス/.test(t)&&/白|ホワイト/.test(t)&&/3足/.test(t))return [[prefix+'SOCKS',1]];if(/トート|ランドリー/.test(t))return [[prefix+'TOTE',1]];if(/クールタオル/.test(t))return [[prefix+'COOL_TOWEL',1]];if(/ポロ/.test(t)&&/\bm\b/.test(t)){if(/白紺2枚/.test(t))return [[prefix+'POLO_WHITE_M',1],[prefix+'POLO_NAVY_M',1]];if(/白|ホワイト/.test(t))return [[prefix+'POLO_WHITE_M',1]];if(/紺|ネイビー/.test(t))return [[prefix+'POLO_NAVY_M',1]];}return null;}
  for(const s of [...sales].filter(active).sort((a,b)=>Date.parse(a.sold_at||a.completed_at)-Date.parse(b.sold_at||b.completed_at)||Number(a.id)-Number(b.id))){
   const id=String(s.id),matches=direct.get(id)||[],parts=split.get(id)||[];
   if(matches.length){const cost=directCost(s,matches);if(cost!==null)output.set(id,{estimated_purchase_cost_yen:cost,cost_estimate_note:'保存済みの仕入割当を使用（高確度の照合を含む）'});continue;}
   if(parts.length){const cost=componentCost(s,parts);if(cost!==null)output.set(id,{estimated_purchase_cost_yen:cost,cost_estimate_note:'福袋原価を登録済み6構成品へ均等配分（仮）'});continue;}
   const h=honma(s);if(h){const r=takeComponents(s,h);if(r)output.set(id,{estimated_purchase_cost_yen:r.cost,cost_estimate_note:'商品名・構成品・購入時期・残数で照合。福袋6構成へ均等配分（仮）'});continue;}
   const saleCodes=codes({product_name:s.product_name}),matchedCodes=saleCodes.filter(code=>ps.some(p=>codes(p).includes(code)));
   if(matchedCodes.length===1&&!/セット|まとめ|[2-9][個点枚]/.test(s.product_name||'')){
    const code=matchedCodes[0],pool=ps.filter(p=>codes(p).includes(code)),r=take(s,[[pool,Number(s.quantity)]]);
    if(r){const points=r.links.some(a=>Number(byP.get(String(a.id))?.metadata?.points_used_yen)>0);output.set(id,{estimated_purchase_cost_yen:r.cost,cost_estimate_note:'型番 '+code.toUpperCase()+' が一致。購入時期・残数を確認し、先に購入した同型品から計算'+(points?'（ポイント利用後の保存額を使用）':'')});continue;}
   }
   const keys=[...new Set(seeds.get(title(s.product_name))||[])];
   if(keys.length===1){const r=take(s,JSON.parse(keys[0]).map(([key,qty])=>[families.get(key)||[],qty]));if(r){output.set(id,{estimated_purchase_cost_yen:r.cost,cost_estimate_note:'照合済み販売と同じ商品名・バリエーションから原価を推計'});continue;}}
   const related=candidateFamily(s),pool=related?ps.filter(related):[];
   if(pool.length&&!/リクエスト|まとめ商品|[2-9]個セット/.test(s.product_name||'')){
    const compatible=candidates(s,pool),r=take(s,[[compatible,Number(s.quantity)]]);
    if(r){output.set(id,{estimated_purchase_cost_yen:r.cost,cost_estimate_note:'購入候補から推定：'+[...new Set(r.links.map(a=>{const p=byP.get(String(a.id));return p.product_name+' / '+(p.variant||'仕様未記録');}))].join('、')+'。購入時期・残数を確認。型番・色・サイズ等の省略部分は未確定',estimated_purchase_ids:r.links.map(a=>a.id)});continue;}
   }
   const t=text(s.product_name),size=t.match(/(?:^|[^a-z0-9])(2xl|xl|l|m)(?=$|[^a-z0-9])/i)?.[1]?.toUpperCase();
   if(/mizuno|ミズノ/.test(t)&&/golf|ゴルフ/.test(t)&&/モックネック/.test(t)&&/長袖/.test(t)&&size&&!/リクエスト/.test(t)){
    const colors=[['ブラック','black'],['ホワイト','white'],['ネイビー','navy']].filter(([ja,en])=>t.includes(ja)||t.includes(en)).map(([ja])=>ja);if(colors.length>1)continue;
    const pool=ps.filter(p=>p.sku==='E2JJ050'&&new RegExp('(?:^|[ /])'+size+'(?:$|[ /])').test(String(p.variant))&&(!colors.length||String(p.variant).includes(colors[0]))),values=new Set(pool.filter(p=>before(p,s)).map(unit));
    const count=t.match(/計(\d+)点/)?.[1],qty=count?Number(count):Number(s.quantity);
    if(qty>0&&qty<=10&&!values.has(null)&&values.size===1){const r=take(s,[[pool,qty]]);if(r)output.set(id,{estimated_purchase_cost_yen:r.cost,cost_estimate_note:'ミズノE2JJ050の同型・サイズ・数量で照合'+(!colors.length?'。色不明のため同原価のロットから推計':'')});}
   }
  }
  if(options.legacyUnknownNet40===true){
   const knownKeys=new Set(sales.filter(s=>s.inventory_key&&((direct.get(String(s.id))||[]).length||output.has(String(s.id)))).map(s=>s.inventory_key)),knownTitles=new Set(sales.filter(s=>output.has(String(s.id))).map(s=>title(s.product_name)));
   for(const s of sales.filter(active)){const id=String(s.id);if(output.has(id)||(direct.get(id)||[]).length||(split.get(id)||[]).length||s.matched_purchase_id||knownKeys.has(s.inventory_key)||knownTitles.has(title(s.product_name)))continue;
    const related=candidateFamily(s),code=codes({product_name:s.product_name}),name=text(s.product_name);
    const unresolvedPack=/スクラッチカードダス|アーセナルベース/.test(name)&&ps.some(p=>/スクラッチカードダス|アーセナルベース/.test(text(p.product_name)));
    if(related&&ps.some(related)||code.some(c=>ps.some(p=>codes(p).includes(c)))||honma(s)||unresolvedPack||/mizuno|ミズノ/i.test(s.product_name||'')&&/モックネック/.test(s.product_name||''))continue;
    output.set(id,{profit_estimate_policy:'legacy_or_unknown_net_40',cost_estimate_note:'旧在庫・購入時期未確認の仮ルール：手数料・送料を引いた手取りの40%を儲けとし、60%を仮原価に置く。購入記録が分かれば実額を優先'});
   }
  }
  return output;
 }
 return {project,title};
});
