/* Synthetic UI data. Served only by ui-preview.mjs. Never loaded in production. */
(()=>{
  const nativeFetch=window.fetch.bind(window);
  document.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('div');banner.textContent='確認用データのプレビューです。本番には保存されません。';
    banner.style.cssText='padding:6px;background:#fff6b5;color:#111;font:12px sans-serif;text-align:center';document.body.prepend(banner);
  });
  const params=new URLSearchParams(location.search), empty=params.has('empty'), failure=params.get('fail');
  const iso=n=>new Date(Date.UTC(2026,8,14,12-n)).toISOString();
  const domains=['ai','subsidy','company','deal','money','sns'];
  const items=domains.flatMap(domain=>Array.from({length:3},(_,i)=>({id:domain+i,domain,title:domain+'の確認用候補 '+(i+1),summary:'新しい情報の概要をここで確認します。必要な根拠と条件は、詳細を開くと読めます。',reason:'選んだ内容について根拠を確認できます。',next:'内容を確認する',source:'確認用データ',url:'https://example.com/',lastSeen:iso(i),score:80+i,priority:'A',reviewState:i===2?'accepted':'new'})));
  for(const [type,task,count] of [['fp','6a9e5826d4888191a4d82a643e6d5adf',9],['house','6aa77eb5ce7881919d8dc62554833b60',2]]){
    for(let i=0;i<count;i++)items.push({id:'task:'+task+':preview-'+i,domain:'money',title:type+'原稿 '+i,summary:'生活の中の疑問から始める投稿。原稿を読んでから使うものを選べます。',reviewState:'new',lastSeen:iso(i),priority:'A',score:90,payload:{content_type:type+'_post_candidate',task_id:task,draft_status:'ready',post_title:(type==='house'?'大きな窓とカーテンのある家':'高い物ほど使えない。「もったいない」を考える')+' '+(i+1),draft_cover:'日常の疑問から考える',draft_caption:'確認用キャプションです。',source_url:'https://example.com/article',source_checked_at:iso(1),official_sources:[{url:'https://example.com/source',title:'確認用一次情報'}],question_lineage:{selected_question:'なぜ使えないのか',answer_target:'判断の仕方'},draft_slides:Array.from({length:5},(_,j)=>({headline:'原稿 '+(j+1),body:'確認用の原稿本文です。日常の疑問を整理して、必要な判断材料を示します。'}))}});
  }
  const cards=Array.from({length:8},(_,i)=>({id:'x'+i,productName:'カードゲーム ブースターパック '+(i+1),organizer:'公式ストア',status:'inbox',priority:'A',score:80,isExpired:false,updatedAt:iso(i),conditions:'応募条件と公式情報を確認してください。',officialVerified:true,officialUrl:'https://example.com/official',applicationUrl:'https://example.com/apply',xDraft:'確認用のX投稿原稿です。',threadsDraft:'確認用のThreads投稿原稿です。'}));
  const overseas=Array.from({length:5},(_,i)=>({id:'r'+i,productName:'海外価格差候補 '+(i+1),status:'candidate',priority:'A',score:85,updatedAt:iso(i),japanPriceYen:9000,overseasPrice:100,overseasPriceJpy:15000,overseasCurrency:'USD',priceGapYen:6000,discountPct:40,demandSummary:'海外需要を示す確認用の要約です。',demandSourceUrl:'https://example.com/',japanSourceUrl:'https://example.com/jp',overseasSourceUrl:'https://example.com/us',overseasSourceType:'retail'}));
  const sourcing=Array.from({length:3},(_,i)=>({id:'s'+i,domain:'sourcing',title:'仕入れ候補 '+(i+1),summary:'仕入れ価格・販売根拠を確認する商品です。',source:'確認用ストア',supplierName:'確認用ストア',lastSeen:iso(i),priority:'A',score:90,impact:1200,reviewState:'new',url:'https://example.com/product',payload:{buy_price:1000,sell_price:3000}}));
  const tasks=domains.map((domain,i)=>({id:'t'+i,title:domain+'の監視',name:domain+'の監視',domain,enabled:true,schedule:'BEGIN:VEVENT\nRRULE:FREQ=DAILY;BYHOUR=19;BYMINUTE=0\nEND:VEVENT',lastRun:iso(i)}));
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.origin===location.origin)return nativeFetch(input,options);
    if(!url.hostname.endsWith('.supabase.co'))throw Error('External fetch blocked in fixture preview');
    const json=data=>Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}}));
    if(failure&&url.pathname.includes(failure))return new Response(JSON.stringify({ok:false,error:'確認用の通信エラー'}),{status:503});
    const base={ok:true,generatedAt:iso(0),agents:{connected:7,total:7}};
    const rows=empty?[]:items;
    if(url.pathname.includes('workflow'))return json({...base,states:[]});
    if(url.pathname.includes('reddit'))return json({...base,items:empty?[]:overseas,counts:{candidate:empty?0:5}});
    if(url.pathname.includes('x-api'))return json({...base,items:empty?[]:cards,counts:{inbox:empty?0:8}});
    if(url.pathname.includes('ledger'))return json({...base,purchases:[],counts:{},supplierPurchases:[]});
    const resource=url.searchParams.get('resource');
    if(resource==='tasks')return json({...base,tasks:empty?[]:tasks,counts:{total:tasks.length}});
    if(resource==='sourcing')return json({...base,items:empty?[]:sourcing,suppliers:[],counts:{}});
    if(resource==='sourcing-overview')return json({...base,readyCount:empty?0:3});
    if(resource==='task-events')return json({...base,events:[],total:0,nextOffset:null});
    const view=url.searchParams.get('view')||'active';
    return json({...base,items:rows.filter(item=>view==='active'?item.reviewState==='new':view==='accepted'?item.reviewState==='accepted':view==='rejected'?item.reviewState==='rejected':true),storedCount:rows.length});
  };
})();
