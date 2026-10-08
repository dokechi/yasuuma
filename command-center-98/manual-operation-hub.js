/* Four manual-operation entrances; preserves original media settings and every legacy desk. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root?.document||root.CCManualOperationHub)return;root.CCManualOperationHub=api;
 const doc=root.document,home=doc.getElementById('commandHome');if(!home)return;
 const e=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 const section=e('section',undefined,'manual-operation-hub');section.setAttribute('aria-label','四つの主用途');
 section.append(e('h2','主に使う4つの入口'),e('p','原稿・完成画像・要確認点を確認し、本人が手動投稿。保存済みの媒体設定を優先します。'));
 const grid=e('div',undefined,'manual-operation-grid');
 for(const account of api.accounts){
  const card=e('article');card.append(e('h3',account.label),e('p',account.policy));
  if(account.key==='sourcing'){const b=e('button','仕入れ・在庫管理カードを開く','push-button');b.type='button';b.dataset.homeAction='sourcing-queue';card.append(b);}
  else{
   const b=e('button','この媒体の保存原稿を確認','push-button');b.type='button';b.onclick=()=>open(account);card.append(b);
   if(account.key==='tiktok'){const f=e('button','既存FP原稿を個別に確認','push-button');f.type='button';f.dataset.homeAction='fp-draft';card.append(f,e('small','既存FP全ジャンルをこのアカウントへ自動統合しません。保険アフィは目的欄のみ：具体案件・広告リンク未登録。'));}
  }
  grid.append(card);
 }
 section.append(grid);home.prepend(section);
 function localItems(){let items=[];try{if(typeof app!=='undefined')items.push(...(app.items||[]));}catch(_){}
  for(const key of ['activeItems','galItems','houseItems'])items.push(...(root.CCHome?.[key]||[]));
  items.push(...(root.CCReddit?.state?.items||[]));
  return api.unique(items);
 }
 async function open(account){
  const dialog=e('dialog',undefined,'manual-operation-review'),close=e('button','閉じる','push-button');close.type='button';close.onclick=()=>dialog.close();
  const title=e('h2',account.label),policy=e('p',account.policy),status=e('p','媒体の明示設定がある保存原稿を確認しています'),list=e('div');
  status.setAttribute('aria-live','polite');dialog.append(title,close,policy,status,list);doc.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  let items=localItems(),offset=0,hasMore=true,loading=false;
  const more=e('button','保存原稿の続き100件を確認','push-button');more.type='button';dialog.append(more);
  function render(){
   const matches=api.unique(items).filter(i=>api.matchesAccount(i,account.key));list.replaceChildren();
   status.textContent=matches.length?matches.length+'件｜保存された媒体設定で照合。投稿・予約は実行しません。':'この読取範囲に媒体を明示した原稿はありません。元資料は保全しています。名前やジャンルから自動分類しません。';
   for(const item of matches){const p=api.payload(item),card=e('article');card.append(e('h3',item.title||p.post_title||'保存原稿'));
    const copies=api.savedCopies(p);for(const copy of copies){card.append(e('h4',copy.label),e('pre',copy.text));const b=e('button',copy.label+'をコピー','push-button');b.type='button';b.onclick=async()=>{try{await root.navigator.clipboard.writeText(copy.text);status.textContent='原文をコピーしました。本人が確認して手動投稿してください。';}catch(_){status.textContent='クリップボード未確認。表示全文を選択してコピーしてください。';}};card.append(b);}
    if(!copies.length)card.append(e('p','本文の保存形式は未確認です。元の原稿画面で確認してください。'));
    const slides=Array.isArray(p.draft_slides)?p.draft_slides:[];if(slides.length)card.append(e('p','画像の掲載全文 '+slides.length+'枚｜画像保存・検品は元の候補画面で確認'));
    const notes=Array.isArray(p.draft_review_points)?p.draft_review_points:[];if(notes.length){const ul=e('ul');for(const note of notes)ul.append(e('li',typeof note==='string'?note:note.text||note.note||'要確認'));card.append(e('h4','要確認点'),ul);}
    card.append(e('p','主投稿・自己返信の購入リンク、本文2案と推奨案、完成画像の保存状態を確認してください。未保存の項目を作成済みとは扱いません。'));list.append(card);
   }
   more.disabled=loading||!hasMore;
  }
  async function fetchMore(){
   if(loading||!hasMore)return;loading=true;render();
   try{
    if(typeof API!=='string'||typeof authHeaders!=='function')throw new Error('読取APIが未設定');
    const url=new URL(API);url.searchParams.set('resource','task-events');url.searchParams.set('limit','100');url.searchParams.set('offset',String(offset));
    const r=await root.fetch(url,{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw new Error('保存原稿を読み取れませんでした');
    items.push(...(data.events||[]).map(i=>({...i,id:'task:'+i.taskId+':'+i.eventKey})));
    offset=data.nextOffset??offset;hasMore=data.nextOffset!==null;render();
   }catch(error){status.textContent='読取未確認：'+error.message;}
   finally{loading=false;more.disabled=!hasMore;}
  }
  more.onclick=fetchMore;render();fetchMore();
 }
 const style=e('style');style.textContent='.manual-operation-hub{margin:12px 0;padding:14px;background:#fff;color:#16324f;border:3px double #0f756d}.manual-operation-hub h2{margin-top:0}.manual-operation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.manual-operation-grid article{padding:12px;border:1px solid #16324f;display:grid;gap:8px}.manual-operation-grid h3,.manual-operation-grid p{margin:0}.manual-operation-grid small{display:block}.manual-operation-review{width:min(880px,90vw);max-height:90vh;overflow:auto;background:#fff;color:#16324f;border:3px solid #0f756d}.manual-operation-review::backdrop{background:rgba(0,0,0,.55)}.manual-operation-review article{border-top:2px solid #0f756d;padding:12px 0}.manual-operation-review pre{white-space:pre-wrap;line-height:1.7}@media(max-width:650px){.manual-operation-grid{grid-template-columns:1fr}}';doc.head.append(style);
})(typeof window==='undefined'?null:window,function(){
 const accounts=[
  {key:'tiktok',label:'TikTok @sucker0508',policy:'働く人のお金判断。1投稿1疑問。答え・数字・条件を先に示し、次に確認することへ。既存の個別構成を優先。'},
  {key:'kyun',label:'Threads キュン拾い',policy:'レディースの服・靴・バッグ・小物。友達に好きな具体的部分を見せる口調。見た目・用途・仕様・安さを使い分ける。'},
  {key:'choi',label:'Threads ちょい上等',policy:'メンズの服・靴・バッグ・小物。落ち着いた友達口調で用途→具体仕様→価格条件。かわいさ対品質の二分法に固定しない。'},
  {key:'sourcing',label:'仕入れ・在庫管理',policy:'既存の仕入れ・在庫カードで価格・仕様・確認状態を管理。社内Excel日報・行動予定表には書き込まない。'}
 ];
 function payload(i){return i?.payload||i?.sourcePayload?.event?.payload||i?.source_payload?.event?.payload||{};}
 function matchesAccount(i,key){
  const p=payload(i),configs=[i,p,p.channel_configuration,p.media_configuration,p.posting_configuration].filter(x=>x&&typeof x==='object');
  const keys=['account_name','account','channel_name','channel','brand','platform_account','posting_account','target_account','handle'];
  const values=configs.flatMap(x=>keys.map(k=>typeof x[k]==='string'?x[k].replace(/\s/g,'').toLowerCase():''));
  const targets=key==='tiktok'?['@sucker0508','sucker0508','tiktok@sucker0508']:key==='kyun'?['キュン拾い','threadsキュン拾い']:key==='choi'?['ちょい上等','threadsちょい上等']:[];
  return values.some(v=>targets.includes(v));
 }
 function unique(items){const seen=new Set();return items.filter(i=>{if(!i?.id||seen.has(String(i.id)))return false;seen.add(String(i.id));return true;});}
 function savedCopies(p){
  const result=[],variants=Array.isArray(p.body_variants)?p.body_variants:Array.isArray(p.body_options)?p.body_options:[];
  variants.forEach((v,i)=>{const t=typeof v==='string'?v:v.text||v.body;if(t)result.push({label:'保存本文案'+(i+1),text:String(t)});});
  const main=p.main_post||p.threads_main_post||p.post_text||p.caption||p.draft_caption;if(main&&!result.some(r=>r.text===main))result.push({label:'保存主投稿',text:String(main)});
  const recommended=p.recommended_variant||p.recommended_option;if(recommended!==undefined&&recommended!==null)result.push({label:'保存された推奨案',text:String(recommended)});
  const reply=p.self_reply||p.reply_text||p.threads_reply;if(reply)result.push({label:'保存自己返信',text:String(reply)});
  const link=p.purchase_link||p.purchase_url;if(typeof link==='string'&&/^https:\/\//.test(link))result.push({label:'保存購入リンク',text:link});
  return result;
 }
 return {accounts,payload,matchesAccount,unique,savedCopies};
});
