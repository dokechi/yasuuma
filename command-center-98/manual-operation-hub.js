/* Four manual-operation entrances; preserves original media settings and every legacy desk. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root?.document||root.CCManualOperationHub)return;root.CCManualOperationHub=api;
 const doc=root.document,home=doc.getElementById('commandHome');if(!home)return;
 const e=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 const details=(label,...nodes)=>{const d=e('details');d.append(e('summary',label),...nodes);return d;};
 const section=e('section',undefined,'manual-operation-hub');section.setAttribute('aria-label','四つの主用途');
 section.append(e('h2','主に使う4つの入口'),e('p','保存原稿を確認して、手動投稿へ。'));
 const grid=e('div',undefined,'manual-operation-grid');
 for(const account of api.accounts){
  const card=e('article');card.append(e('h3',account.label),details('媒体の方針',e('p',account.policy)));
  if(account.key==='sourcing'){const b=e('button','仕入れ・在庫管理カードを開く','push-button');b.type='button';b.dataset.homeAction='sourcing-queue';card.append(b);}
  else{
   const b=e('button','この媒体の保存原稿を確認','push-button');b.type='button';b.onclick=()=>open(account);card.append(b);
   if(account.key==='tiktok'){const f=e('button','既存FP原稿を個別に確認','push-button');f.type='button';f.dataset.homeAction='fp-draft';card.append(f,details('既存FP原稿について',e('small','媒体設定のある原稿だけを表示。保険アフィの具体案件・広告リンクは未登録。')));}
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
  dialog.className+=' rpg-account-page';dialog.dataset.account=account.key;dialog.setAttribute('aria-label',account.label+'の保存原稿');
  const back=e('button','← 司令塔','push-button rpg-account-back');back.type='button';back.onclick=()=>dialog.close();
  const header=e('header',undefined,'rpg-account-header'),character=e('div',undefined,'rpg-account-character');character.setAttribute('aria-hidden','true');
  const title=e('h2',account.label.replace(/^Threads /,'')),policy=details('媒体の方針',e('p',account.policy)),status=e('p','保存原稿を確認中…'),coverage=e('p'),list=e('div');
  header.append(e('p','THREADS / 保存原稿','rpg-account-kicker'),title,e('p','原稿を確認して、投稿の準備を。','rpg-account-subtitle'),character);
  if(account.key==='tiktok')header.children[0].textContent='FP / TikTok';
  const tabs=e('nav',undefined,'rpg-account-tabs'),currentTab=e('button','今回','push-button'),historyTab=e('button','履歴','push-button');tabs.setAttribute('aria-label','原稿の表示切替');
  currentTab.type=historyTab.type='button';currentTab.dataset.accountTab='current';historyTab.dataset.accountTab='history';tabs.append(currentTab,historyTab);
  status.className='rpg-account-status';coverage.className='rpg-account-coverage';list.className='rpg-account-list';close.className+=' rpg-account-close';
  const toolbar=e('div',undefined,'rpg-account-toolbar');toolbar.append(back,close);const coverageDetails=details('読取状況',coverage);coverageDetails.className='rpg-account-coverage-details';
  status.setAttribute('aria-live','polite');dialog.append(toolbar,header,tabs,status,coverageDetails,list,policy);doc.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  if(account.key==='tiktok'){const f=e('button','FP原稿を見る（既存FP）','push-button');f.type='button';f.dataset.homeAction='fp-draft';f.onclick=()=>dialog.close();dialog.append(f);}
  let items=localItems(),offset=0,hasMore=true,loading=false,loaded=0,total=null,checked=false,readError='',selectedTab='current';
  currentTab.onclick=()=>{selectedTab='current';render();};historyTab.onclick=()=>{selectedTab='history';render();};
  const more=e('button','保存原稿の続き100件を確認','push-button');more.type='button';dialog.append(more);
  function render(){
   const matches=api.unique(items).filter(i=>!api.isSuppressed(i)&&api.matchesAccount(i,account.key));list.replaceChildren();
   const current=e('div',undefined,'rpg-account-current'),history=details('投稿済み・見送りの履歴'),active=matches.filter(i=>!api.historyState(i,account.key)),archived=matches.filter(i=>api.historyState(i,account.key));
   current.hidden=selectedTab!=='current';history.hidden=selectedTab!=='history';history.className='rpg-account-history';history.open=selectedTab==='history';
   currentTab.textContent='今回（'+active.length+'）';historyTab.textContent='履歴（'+archived.length+'）';currentTab.setAttribute('aria-pressed',String(selectedTab==='current'));historyTab.setAttribute('aria-pressed',String(selectedTab==='history'));
   list.append(current);
   status.textContent=readError?'読取未確認：'+readError:matches.length?'確認用 '+active.length+'件｜履歴 '+archived.length+'件':!checked?'保存原稿を確認中…':'この保存先では原稿を確認できません。別保存先の原稿はまだ連携されていません。';
   coverage.textContent='保存イベント：読込 '+loaded+'件 / 全 '+(total===null?'件数未確認':total+'件')+'｜'+(loading?'読込中':readError?'続きの読取未確認':!checked?'未確認':hasMore?'続きあり':'読込完了')+'｜画面内の読込済み原稿も照合';
   for(const item of [...active,...archived]){const p=api.payload(item),card=e('article',undefined,'rpg-account-card'),state=api.historyState(item,account.key);card.append(e('h3',item.title||p.post_title||'保存原稿'),e('p',state||'投稿状態未確認'));
    const copies=api.savedCopies(p);for(const copy of copies){const block=e('section',undefined,'rpg-account-copy');block.append(e('h4',copy.label),e('pre',copy.text));const b=e('button',copy.label+'をコピー','push-button');b.type='button';b.onclick=async()=>{try{await root.navigator.clipboard.writeText(copy.text);status.textContent='原文をコピーしました。';}catch(_){status.textContent='クリップボード未確認。表示全文を選択してコピーしてください。';}};block.append(b);card.append(block);}
    if(!copies.length)card.append(e('p','本文の保存形式は未確認です。元の原稿画面で確認してください。'));
    const slides=Array.isArray(p.draft_slides)?p.draft_slides:[];if(slides.length)card.append(e('p','画像の掲載全文 '+slides.length+'枚｜画像保存・検品は元の候補画面で確認'));
    const notes=Array.isArray(p.draft_review_points)?p.draft_review_points:[];if(notes.length){const ul=e('ul');for(const note of notes)ul.append(e('li',typeof note==='string'?note:note.text||note.note||'要確認'));card.append(e('h4','要確認点'),ul);}
    const sources=api.savedSources(item);if(sources.length){const sourceDetails=details('比較根拠・出典を見る');sourceDetails.className='rpg-account-sources';for(const source of sources){const a=e('a',source.label);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';sourceDetails.append(a);}card.append(sourceDetails);}
    (state?history:current).append(card);
   }
   if(!active.length&&matches.length)current.append(e('p','今回の確認対象はありません。保存済みの履歴を確認できます。','rpg-account-empty'));
   if(!archived.length)history.append(e('p','読込済みの原稿に、投稿済み・見送りの記録はありません。'));
   list.append(history);
   more.disabled=loading||!hasMore;
  }
  async function fetchMore(){
   if(loading||!hasMore)return;loading=true;readError='';render();
   try{
    if(typeof API!=='string'||typeof authHeaders!=='function')throw new Error('読取APIが未設定');
    const url=new URL(API);url.searchParams.set('resource','task-events');url.searchParams.set('limit','100');url.searchParams.set('offset',String(offset));
    const r=await root.fetch(url,{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw new Error('保存原稿を読み取れませんでした');
    if(!Array.isArray(data.events))throw new Error('保存原稿の応答形式が未確認');
    const next=data.nextOffset;if(next!==null&&(!Number.isInteger(next)||next<=offset))throw new Error('続きの読取位置が未確認');
    items.push(...data.events.map(i=>({...i,id:'task:'+i.taskId+':'+i.eventKey})));
    loaded+=data.events.length;total=Number.isInteger(data.total)&&data.total>=0?data.total:null;checked=true;
    offset=next??offset;hasMore=next!==null;
   }catch(error){readError=error.message;}
   finally{loading=false;render();}
  }
  more.onclick=fetchMore;render();fetchMore();
 }
 // Presentation-only bridge: reuse the existing explicitly matched account review.
 api.openAccount=function(key){
  const account=api.accounts.find(item=>item.key===key&&item.key!=='sourcing');
  if(!account)return false;
  open(account);return true;
 };
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
 // Presentation-only evidence survives read-model refreshes without rewriting raw records.
 const evidence=Symbol('manual-operation-evidence');
 const preferHistory=(a,b)=>a==='投稿済み'||b==='投稿済み'?'投稿済み':a||b||'';
 function unique(items){
  const out=[],positions=new Map(),stamp=i=>{for(const k of ['updatedAt','occurredAt','lastSeen','detectedAt','createdAt','occurred_at']){const v=i?.[k];if(typeof v==='string'&&Number.isFinite(Date.parse(v)))return Date.parse(v);}return -Infinity;};
  for(const item of items){if(!item?.id)continue;const key=String(item.id).replace(/^(sns:)+/,'');
   if(!positions.has(key)){positions.set(key,out.length);out.push(item);}else{
    const index=positions.get(key),previous=out[index],winner=stamp(item)>stamp(previous)||(stamp(item)===stamp(previous)&&isSuppressed(item)&&!isSuppressed(previous))?item:previous;
    const merged={...winner},history={};
    for(const account of ['tiktok','kyun','choi'])history[account]=preferHistory(matchesAccount(previous,account)?historyState(previous,account):previous[evidence]?.history?.[account],matchesAccount(item,account)?historyState(item,account):item[evidence]?.history?.[account]);
    Object.defineProperty(merged,evidence,{value:{suppressed:isSuppressed(previous)||isSuppressed(item),history}});out[index]=merged;
   }
  }return out;
 }
 function isSuppressed(i){return i?.suppressed===true||payload(i).suppressed===true||i?.[evidence]?.suppressed===true;}
 function historyState(i,key){
  const p=payload(i),rows=[i,p],states=rows.flatMap(x=>[x?.status,x?.state,x?.post_status,x?.posting_status,x?.reviewState,x?.review_state]),target=key==='tiktok'?'tiktok':'threads';
  const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v)),norm=v=>typeof v==='string'?v.toLowerCase().trim():'';
  const platforms=rows.flatMap(x=>[x?.platform,x?.posting_platform,x?.media_platform,x?.performance?.platform,x?.posting_configuration?.platform,x?.channel_configuration?.platform,x?.media_configuration?.platform]).map(norm).filter(Boolean);
  // Generic publication evidence with an explicit other platform never marks this account posted.
  const applicable=platforms.every(platform=>platform===target);
  const generic=applicable&&(states.includes('posted')||rows.some(x=>x?.posted===true||x?.is_posted===true||validDate(x?.posted_at)));
  const specific=rows.some(x=>(norm(x?.performance?.platform)===target&&validDate(x?.performance?.posted_at))||(target==='threads'&&(validDate(x?.threadsPostedAt)||validDate(x?.threads_posted_at)))||(target==='tiktok'&&(validDate(x?.tiktokPostedAt)||validDate(x?.tiktok_posted_at))));
  const direct=generic||specific?'投稿済み':states.includes('skipped')||states.includes('rejected')?'見送り':'';
  return preferHistory(direct,i?.[evidence]?.history?.[key]);
 }
 function savedSources(item){
  const p=payload(item),result=[],seen=new Set();
  const add=(value,label)=>{if(typeof value!=='string')return;try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||seen.has(value))return;seen.add(value);result.push({url:value,label});}catch(_){}};
  add(item?.url,'保存された出典');add(item?.source_url,'保存された出典');add(p.source_url,'保存された出典');add(p.comparison_url,'保存された比較根拠');
  for(const source of Array.isArray(p.sources)?p.sources:[])if(typeof source==='string')add(source,'保存された出典');else if(source&&typeof source==='object')add(source.url,typeof source.title==='string'?source.title:'保存された出典');
  return result;
 }
 function savedCopies(p){
  const result=[],variants=Array.isArray(p.body_variants)?p.body_variants:Array.isArray(p.body_options)?p.body_options:[];
  variants.forEach((v,i)=>{const t=typeof v==='string'?v:v.text||v.body;if(t)result.push({label:'保存本文案'+(i+1),text:String(t)});});
  const main=p.main_post||p.threads_main_post||p.post_text||p.caption||p.draft_caption;if(main&&!result.some(r=>r.text===main))result.push({label:'保存主投稿',text:String(main)});
  const recommended=p.recommended_variant||p.recommended_option;if(recommended!==undefined&&recommended!==null)result.push({label:'保存された推奨案',text:typeof recommended==='object'?String(recommended.text||recommended.body||recommended.label||JSON.stringify(recommended)):String(recommended)});
  const reply=p.self_reply||p.reply_text||p.threads_reply;if(reply)result.push({label:'保存自己返信',text:String(reply)});
  const link=p.purchase_link||p.purchase_url;if(typeof link==='string'&&/^https:\/\//.test(link))result.push({label:'保存購入リンク',text:link});
  return result;
 }
 return {accounts,payload,matchesAccount,unique,savedCopies,isSuppressed,historyState,savedSources};
});
