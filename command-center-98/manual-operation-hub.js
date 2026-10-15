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
  const dialog=e('dialog',undefined,'manual-operation-review'),close=e('button','閉じる','push-button');close.type='button';close.onclick=()=>{desk?.savePosition();dialog.close();};
  dialog.className+=' rpg-account-page';dialog.dataset.account=account.key;dialog.setAttribute('aria-label',account.label+'の保存原稿');
  const back=e('button','← 司令塔','push-button rpg-account-back');back.type='button';back.onclick=()=>{desk?.savePosition();dialog.close();};
  const header=e('header',undefined,'rpg-account-header'),character=e('div',undefined,'rpg-account-character');character.setAttribute('aria-hidden','true');
  const title=e('h2',account.label.replace(/^Threads /,'')),policy=details('媒体の方針',e('p',account.policy)),status=e('p','保存原稿を確認中…'),coverage=e('p'),list=e('div');
  header.append(e('p','THREADS / 保存原稿','rpg-account-kicker'),title,e('p','原稿を確認して、投稿の準備を。','rpg-account-subtitle'),character);
  if(account.key==='tiktok')header.children[0].textContent='FP / TikTok';
  const tabs=e('nav',undefined,'rpg-account-tabs'),currentTab=e('button','今回','push-button'),historyTab=e('button','履歴','push-button');tabs.setAttribute('aria-label','原稿の表示切替');
  currentTab.type=historyTab.type='button';currentTab.dataset.accountTab='current';historyTab.dataset.accountTab='history';tabs.append(currentTab,historyTab);
  status.className='rpg-account-status';coverage.className='rpg-account-coverage';list.className='rpg-account-list';close.className+=' rpg-account-close';
  const toolbar=e('div',undefined,'rpg-account-toolbar');toolbar.append(back,close);const coverageDetails=details('読取状況',coverage);coverageDetails.className='rpg-account-coverage-details';
  const isThreads=['kyun','choi'].includes(account.key),accountActions=e('div',undefined,'rpg-threads-account-actions'),readSummary=e('div',undefined,'rpg-account-read-summary');readSummary.setAttribute('aria-live','polite');
  status.setAttribute('aria-live','polite');dialog.append(toolbar,header,...(isThreads?[accountActions]:[]),tabs,...(isThreads?[readSummary]:[]),status,coverageDetails,list,policy);doc.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  if(account.key==='tiktok'){const f=e('button','FP原稿を見る（既存FP）','push-button');f.type='button';f.dataset.homeAction='fp-draft';f.onclick=()=>{desk?.savePosition();dialog.close();};dialog.append(f);}
  let accountConfig=null,accountError='',accountLoading=isThreads,childDialog=null;
  const closeParent=dialog.onclose;dialog.onclose=()=>{if(childDialog)childDialog.close();closeParent();};
  let items=localItems(),offset=0,hasMore=true,loading=false,loaded=0,total=null,checked=false,readError='',selectedTab='current';
  const desk=root.CCRpgDailyDesk?.mount({dialog,account,toolbar,list,onStatus:showOperation});
  if(desk?.tab==='history')selectedTab='history';
  dialog.addEventListener?.('cancel',()=>desk?.savePosition());
  currentTab.onclick=()=>{selectedTab='current';render();};historyTab.onclick=()=>{selectedTab='history';render();};
  const more=e('button','保存原稿の続き100件を確認','push-button');more.type='button';dialog.append(more);
  function render(){
   const previousScroll=dialog.scrollTop;
   const matches=api.unique(items).filter(i=>!api.isSuppressed(i)&&api.matchesAccount(i,account.key));list.replaceChildren();
   const current=e('div',undefined,'rpg-account-current'),history=details('投稿済み・見送りの履歴'),active=matches.filter(i=>!api.historyState(i,account.key)),archived=matches.filter(i=>api.historyState(i,account.key));
   current.hidden=selectedTab!=='current';history.hidden=selectedTab!=='history';history.className='rpg-account-history';history.open=selectedTab==='history';
   currentTab.textContent='今回（'+active.length+'）';historyTab.textContent='履歴（'+archived.length+'）';currentTab.setAttribute('aria-pressed',String(selectedTab==='current'));historyTab.setAttribute('aria-pressed',String(selectedTab==='history'));
   list.append(current);
   const readState=loading?'読込中':readError?'続きの読取未確認':!checked?'未確認':hasMore?'続きあり':'読込完了';
   if(isThreads){
    readSummary.dataset.readState=readError?'error':loading?'loading':hasMore?'partial':'complete';
    readSummary.replaceChildren(e('p','この媒体：確認用 '+active.length+'件｜履歴 '+archived.length+'件','rpg-account-counts'),e('p','保存先全体：読込 '+loaded+'件 / 全 '+(total===null?'件数未確認':total+'件')+'｜'+readState,'rpg-account-load-coverage'));
    if(readError)readSummary.append(e('p','読取未確認：'+readError+'。読込済みの原稿は表示しています。','rpg-account-read-warning'));
    showOperation(!matches.length&&checked?'この保存先では原稿を確認できません。別保存先の原稿はまだ連携されていません。':'');
   }else status.textContent=readError?'読取未確認：'+readError:matches.length?'確認用 '+active.length+'件｜履歴 '+archived.length+'件':!checked?'保存原稿を確認中…':'この保存先では原稿を確認できません。別保存先の原稿はまだ連携されていません。';
   coverage.textContent='保存イベント：読込 '+loaded+'件 / 全 '+(total===null?'件数未確認':total+'件')+'｜'+(loading?'読込中':readError?'続きの読取未確認':!checked?'未確認':hasMore?'続きあり':'読込完了')+'｜画面内の読込済み原稿も照合';
   for(const item of [...active,...archived]){const p=api.payload(item),card=e('article',undefined,'rpg-account-card'),state=api.historyState(item,account.key);card.dataset.recordId=String(item.id);card.append(e('h3',item.title||p.post_title||'保存原稿'),e('p',state||'投稿状態未確認'));
    if(isThreads){const checked=api.savedPriceStockCheck(p);const stamp=e('section',undefined,'rpg-account-price-stock-check');stamp.append(e('h4','価格・在庫の確認（保存時点）'),e('p',checked.label,'rpg-account-price-stock-time'),e('p','現在の価格・在庫は、商品ページで確認してください。','rpg-account-price-stock-note'));card.append(stamp);appendResult(card,item);}
    const product=['kyun','choi'].includes(account.key)?api.savedProductLink(p):null;
    const copies=api.savedCopies(p).filter(copy=>!product||copy.label!=='保存購入リンク');for(const copy of copies){const block=e('section',undefined,'rpg-account-copy');block.dataset.copyLabel=copy.label;block.append(e('h4',copy.label),e('pre',copy.text));const b=e('button',copy.label+'をコピー','push-button');b.type='button';b.onclick=async()=>{try{await root.navigator.clipboard.writeText(copy.text);desk?.copied({id:String(item.id),title:item.title||p.post_title||'保存原稿',label:copy.label,text:copy.text});showOperation('原文をコピーしました。');}catch(_){showOperation('クリップボード未確認。表示全文を選択してコピーしてください。');}};block.append(b);card.append(block);}
    if(!copies.length)card.append(e('p','本文の保存形式は未確認です。元の原稿画面で確認してください。'));
    if(product){const block=e('section',undefined,'rpg-account-product');block.append(e('h4','商品ページ'));const link=e(product.url?'a':'button','商品ページを開く','push-button rpg-product-open');if(product.url){link.href=product.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','商品ページを開く（別タブ）');}else{link.type='button';link.disabled=true;}block.append(link,e('p',product.note,'rpg-product-note'));card.append(block);}
    if(['kyun','choi'].includes(account.key)){
     const comparisons=api.savedMercariComparisons(item),block=e('section',undefined,'rpg-account-mercari');block.append(e('h4','メルカリ相場（保存時点）'));
     if(comparisons.length){
      block.append(e('p','保存時点の価格・販売状況です。現在とは異なる場合があります。成約日は未確認です。掲載日・更新日は成約日ではありません。市場全体の最安値を示すものではありません。','rpg-mercari-caution'));
      const rows=e('ul',undefined,'rpg-mercari-list');
      for(const comparison of comparisons){
       const row=e('li'),link=e('a',comparison.label,'push-button rpg-mercari-open'),summary=api.mercariComparisonSummary(comparison);
       link.href=comparison.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',comparison.label+'のメルカリ商品を開く（保存時点・別タブ）');
       const overview=e('div',undefined,'rpg-mercari-overview');overview.append(e('p','状態：'+summary.condition,'rpg-mercari-condition'),e('p','色・サイズ差：'+summary.differences,'rpg-mercari-differences'));
       for(const caution of summary.cautions)overview.append(e('p',caution,'rpg-mercari-warning'));
       const evidence=details('比較の根拠を読む',e('p',comparison.note||'状態・色サイズ差の根拠は未確認です。','rpg-mercari-note'),e('p',comparison.url,'rpg-mercari-source-url'));evidence.className='rpg-mercari-evidence';
       row.append(link,overview,e('p',comparison.checkedAt?'保存時の確認：'+comparison.checkedAt:'保存時の確認日時：未確認','rpg-mercari-checked'),evidence);rows.append(row);
      }
      block.append(rows);
     }else block.append(e('p','個別商品のメルカリ比較リンクは保存されていません。','rpg-mercari-caution'));
     card.append(block);
    }
    const slides=Array.isArray(p.draft_slides)?p.draft_slides:[];if(slides.length)card.append(e('p','画像の掲載全文 '+slides.length+'枚｜画像保存・検品は元の候補画面で確認'));
    const notes=Array.isArray(p.draft_review_points)?p.draft_review_points:[];if(notes.length){const ul=e('ul');for(const note of notes)ul.append(e('li',typeof note==='string'?note:note.text||note.note||'要確認'));card.append(e('h4','要確認点'),ul);}
    const sources=api.savedSources(item);if(sources.length){const sourceDetails=details('比較根拠・出典を見る');sourceDetails.className='rpg-account-sources';for(const source of sources){const a=e('a',source.label);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';sourceDetails.append(a);}card.append(sourceDetails);}
    (state?history:current).append(card);
   }
   if(!active.length&&matches.length)current.append(e('p','今回の確認対象はありません。保存済みの履歴を確認できます。','rpg-account-empty'));
   if(!archived.length)history.append(e('p','読込済みの原稿に、投稿済み・見送りの記録はありません。'));
   list.append(history);
   more.disabled=loading||!hasMore;
   if(Number.isFinite(previousScroll))dialog.scrollTop=previousScroll;desk?.decorate(matches);
  }
  function showOperation(message){status.textContent=message;status.hidden=!message;}
  function externalLink(url,label,cls){const a=e('a',label,'push-button '+cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function renderAccount(){
   accountActions.replaceChildren();const profile=api.threadsUrl(accountConfig?.profile_url,'profile');
   const open=profile?externalLink(profile.url,'自分のThreadsを開く','rpg-threads-profile-open'):e('button','自分のThreadsを開く','push-button rpg-threads-profile-open');
   if(!profile){open.type='button';open.disabled=true;}accountActions.append(open);
   const setup=e('button',profile?'URL設定':'プロフィールURLを登録','push-button rpg-threads-profile-setting');setup.type='button';setup.disabled=accountLoading;setup.onclick=()=>openProfile();
   const note=e('p',accountLoading?'URL設定を確認中…':accountError|| (profile?'登録済みのプロフィールを別タブで開きます。':'プロフィールURLは未登録です。最初に一度登録してください。'),'rpg-threads-account-note');
   accountActions.append(setup,note);
   if(accountError){const retry=e('button','URL設定を再読込','push-button');retry.type='button';retry.onclick=loadAccount;accountActions.append(retry);}
  }
  async function loadAccount(){
   accountLoading=true;accountError='';renderAccount();
   try{const u=new URL(API);u.searchParams.set('resource','threads-manual-accounts');const r=await root.fetch(u,{headers:authHeaders(),cache:'no-store'}),data=await r.json();if(!r.ok||!data.ok||!Array.isArray(data.accounts))throw Error('URL設定を読み取れませんでした。再読込してください。');accountConfig=data.accounts.find(x=>x.accountKey===account.key)||null;if(!accountConfig)throw Error('この媒体のURL設定を確認できませんでした。');}
   catch(error){accountError=error.message;}
   finally{accountLoading=false;renderAccount();}
  }
  function editor(title){
   if(childDialog)return null;const d=e('dialog',undefined,'rpg-thread-editor');d.setAttribute('aria-label',title);const heading=e('h2',title),cancel=e('button','戻る','push-button rpg-thread-cancel'),body=e('div',undefined,'rpg-thread-fields'),message=e('p','', 'rpg-thread-message');
   cancel.type='button';message.setAttribute('role','status');message.setAttribute('aria-live','polite');const bar=e('header',undefined,'rpg-thread-editor-bar');bar.append(heading,cancel);d.append(bar,body,message);doc.body.append(d);childDialog=d;let busy=false;
   cancel.onclick=()=>d.close();d.oncancel=event=>{if(busy)event.preventDefault();};d.onclose=()=>{d.remove();childDialog=null;};d.showModal();
   return {d,body,message,cancel,setBusy(value){busy=value;cancel.disabled=value;d.querySelectorAll?.('input,textarea,button').forEach(input=>{input.disabled=value;});d.setAttribute('aria-busy',String(value));}};
  }
  function field(body,name,label,type='text',value=''){
   const wrapper=e('label',undefined,'rpg-thread-field'),input=e(type==='textarea'?'textarea':'input');input.name=name;input.value=value??'';
   if(type!=='textarea')input.type=type;else input.rows=5;
   if(type==='url'){input.inputMode='url';input.autocomplete='off';input.spellcheck=false;}
   if(type==='number'){input.min='0';input.step='1';input.inputMode='numeric';}
   wrapper.append(e('span',label),input);body.append(wrapper);return input;
  }
  function patchError(data,status){
   if(data?.error==='threads_profile_used_by_other_account')return '別の媒体と同じプロフィールURLは登録できません。URLを確認してください。';
   if(status===409)return '保存できませんでした。別の更新またはURL設定の変更があります。入力は残っています。内容を控え、司令塔へ戻ってこの媒体を開き直してください。';
   if(status===401||status===403)return '保存できませんでした。ログイン状態を確認してください。入力はこの画面に残っています。';
   if(status===400)return '保存できませんでした。投稿先アカウント・URL・入力値を確認してください。';
   return '保存は未確認です。入力は残っています。同じ内容で保存を再試行できます。';
  }
  async function patch(body){
   let r;try{r=await root.fetch(API,{method:'PATCH',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});}catch(_){throw Error('保存結果を確認できませんでした。入力は残っています。同じ内容で保存を再試行できます。');}let data;try{data=await r.json();}catch(_){throw Error('保存結果を確認できませんでした。入力は残っています。');}if(!r.ok||!data.ok)throw Error(patchError(data,r.status));return data;
  }
  function mutation(){return root.crypto?.randomUUID?.()||'threads-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
  function openProfile(){
   const form=editor('Threads URL設定');if(!form)return;form.d.setAttribute('aria-label',account.label+'のプロフィールURL設定');
   const input=field(form.body,'profileUrl','自分のThreadsプロフィールURL','url',accountConfig?.profile_url);input.placeholder='https://www.threads.com/@your_handle';
   form.body.append(e('p','この媒体の本人のプロフィールURLを登録します。ログイン連携や自動投稿は行いません。','rpg-thread-help'));
   const confirm=e('label',undefined,'rpg-thread-confirm'),checkbox=e('input');checkbox.type='checkbox';confirm.append(checkbox,e('span',account.label+'の自分のアカウントです'));form.body.append(confirm);
   const save=e('button','このプロフィールURLを保存','push-button rpg-thread-save');save.type='button';form.body.append(save);let saving=false,lastSignature='',mutationId='';
   save.disabled=!accountConfig?.id; if(save.disabled)form.message.textContent='保存先の原稿を確認できないため、まだ登録できません。';
   save.onclick=async()=>{
    if(saving||!accountConfig?.id)return;const parsed=api.threadsUrl(input.value,'profile');if(!parsed){form.message.textContent='ThreadsのプロフィールURL（https://www.threads.com/@名前）を入力してください。';return;}if(!checkbox.checked){form.message.textContent='この媒体の本人のアカウントか確認してください。';return;}
    const body={action:'threads_account_profile',id:accountConfig.id,accountKey:account.key,expectedRevision:accountConfig.revision,profileUrl:parsed.url,confirmAccount:true},signature=JSON.stringify(body);if(signature!==lastSignature){lastSignature=signature;mutationId=mutation();}
    saving=true;save.disabled=true;form.setBusy(true);form.message.textContent='保存中…';
    try{const data=await patch({...body,mutationId});if(data.account?.accountKey!==account.key||api.threadsUrl(data.account?.profile_url,'profile')?.url!==parsed.url||!Number.isSafeInteger(data.account?.revision)||data.account.revision<=body.expectedRevision)throw Error('保存結果を確認できませんでした。入力は残っています。');accountConfig=data.account;accountError='';renderAccount();form.d.close();showOperation('プロフィールURLを保存しました。投稿後はURLだけで結果を記録できます。');}
    catch(error){form.message.textContent=error.message;}
    finally{saving=false;save.disabled=false;form.setBusy(false);}
   };
  }
  function appendResult(card,item){
   const result=api.manualResult(item,account.key),invalid=api.payload(item).threads_manual_result!=null&&!result,block=e('section',undefined,'rpg-threads-result');
   const record=e('button',result?'投稿結果を更新':'投稿結果を記録','push-button rpg-thread-record');record.type='button';record.disabled=invalid;record.onclick=()=>{if(invalid)return;
    if(accountLoading||accountError){showOperation('URL設定の読込を確認してから記録してください。');return;}
    if(!api.threadsUrl(accountConfig?.profile_url,'profile')){showOperation('最初に、この媒体のプロフィールURLを登録してください。');openProfile();return;}openResult(item);
   };block.append(record);
   if(result){
    block.append(externalLink(result.post_url,'記録した投稿を開く','rpg-thread-post-open'),e('p','本人確認で記録済み｜自動取得なし','rpg-thread-help'));
    const summary=details('投稿結果・原案との比較');summary.className='rpg-thread-comparison';
    summary.append(e('p','投稿日時：'+(result.posted_at?api.displayTime(result.posted_at)+'（本人入力）':'未入力')));
    const metrics=result.metrics;if(metrics){summary.append(e('p','数値確認日時：'+api.displayTime(metrics.observed_at)+'（手入力）'));const values=e('dl',undefined,'rpg-thread-metrics');for(const [key,label] of api.metricLabels){values.append(e('dt',label),e('dd',metrics[key]===null||metrics[key]===undefined?'未確認':String(metrics[key])));}summary.append(values);}else summary.append(e('p','数値：未入力'));
    if(result.actual_text!==null&&result.actual_text!==undefined){
     const comparison=e('div',undefined,'rpg-thread-text-comparison');const original=e('section'),actual=e('section');original.append(e('h4','初回記録時の保存原案'));
     for(const copy of api.originalCopies(result,item)){original.append(e('h5',copy.label),e('pre',copy.text));}actual.append(e('h4','実際の投稿本文（本人入力）'),e('pre',result.actual_text));comparison.append(original,actual);summary.append(comparison);
    }else summary.append(e('p','実際の投稿本文：未入力。URLから本文は取得しません。'));
    block.append(summary);
   }else block.append(e('p',invalid?'保存済みの投稿結果の形式を確認できません。再読込してください。':'投稿後にURLだけで記録できます。','rpg-thread-help'));
   card.append(block);
  }
  function openResult(item){
   const result=api.manualResult(item,account.key),form=editor('投稿結果を記録');if(!form)return;
   const postUrl=field(form.body,'postUrl','投稿URL（必須）','url',result?.post_url);postUrl.placeholder='https://www.threads.com/@your_handle/post/…';if(result)postUrl.readOnly=true;
   form.body.append(e('p','URLだけで保存できます。本文・日時・数値は後から追加できます。','rpg-thread-help'));
   const optional=details('本文・日時・数値を追加（任意）');optional.className='rpg-thread-optional';form.body.append(optional);
   const actual=field(optional,'actualText','実際の投稿本文（任意）','textarea',result?.actual_text),posted=field(optional,'postedAt','投稿日時（任意・端末の時間帯）','datetime-local',api.localDateTime(result?.posted_at));
   optional.append(e('p','空欄では保存済みの本文・投稿日時を変更しません。保存原案はそのまま残ります。','rpg-thread-help'));
   const metricFields={},grid=e('div',undefined,'rpg-thread-metric-inputs');optional.append(e('h3','新しく確認した数値（任意）'),e('p','空欄は未確認、0は0件です。入力した数値を新しい確認記録として保存します。','rpg-thread-help'),grid);
   for(const [key,label] of api.metricLabels)metricFields[key]=field(grid,key,label,'number');
   const observed=field(optional,'observedAt','数値を確認した日時（任意・端末の時間帯）','datetime-local');optional.append(e('p','数値を入力して確認日時を空欄にすると、保存時刻を確認日時として記録します。','rpg-thread-help'));
   const confirm=e('label',undefined,'rpg-thread-confirm'),checkbox=e('input');checkbox.type='checkbox';checkbox.name='confirmPosted';confirm.append(checkbox,e('span',account.label+'で投稿済みです。この原案にURLを紐づけ、履歴に移します。'));form.body.append(confirm);
   const save=e('button','確認して投稿結果を保存','push-button rpg-thread-save');save.type='button';form.body.append(save);let saving=false,lastSignature='',mutationId='';
   save.onclick=async()=>{
    if(saving)return;const parsed=api.threadsUrl(postUrl.value,'post'),profile=api.threadsUrl(accountConfig?.profile_url,'profile');
    if(!parsed){form.message.textContent='Threadsの投稿URL（https://www.threads.com/@名前/post/投稿ID）を入力してください。';return;}
    if(!profile||parsed.handle.toLowerCase()!==profile.handle.toLowerCase()){form.message.textContent='登録したプロフィールと投稿URLのアカウントが一致しません。';return;}
    if(!checkbox.checked){form.message.textContent='投稿済みで、この原案の投稿であることを確認してください。';return;}
    const body={action:'threads_manual_result',id:item.eventRecordId??item.id,accountKey:account.key,expectedRevision:result?.revision||0,postUrl:parsed.url,confirmPosted:true};
    if(actual.value.length>5000){form.message.textContent='実際の投稿本文は5000文字以内で入力してください。';return;}if(actual.value.trim()&&actual.value!==result?.actual_text)body.actualText=actual.value;
    try{
     if(posted.value&&posted.value!==api.localDateTime(result?.posted_at))body.postedAt=api.isoFromLocal(posted.value);
     const metrics={};for(const [key,input] of Object.entries(metricFields)){if(input.value.trim()){const n=api.metricNumber(input.value);if(n===null)throw Error('数値は0以上の整数で入力してください。');metrics[key]=n;}}
     if(Object.keys(metrics).length){body.metrics=metrics;if(observed.value)body.observedAt=api.isoFromLocal(observed.value);}else if(observed.value)throw Error('数値の確認日時と一緒に、確認した数値を入力してください。');
    }catch(error){form.message.textContent=error.message;return;}
    const signature=JSON.stringify(body);if(signature!==lastSignature){lastSignature=signature;mutationId=mutation();}
    saving=true;save.disabled=true;form.setBusy(true);form.message.textContent='保存中…';
    try{const data=await patch({...body,mutationId});const saved=api.manualResult(data.item,account.key);if(!saved||saved.post_url!==parsed.url||saved.revision<=body.expectedRevision||data.result?.post_url!==parsed.url||(item.taskId&&data.item.taskId!==item.taskId)||(item.eventKey&&data.item.eventKey!==item.eventKey))throw Error('保存結果を確認できませんでした。入力は残っています。');
     const updated={...data.item,eventRecordId:data.item.id,id:item.id};items=items.filter(x=>String(x.id).replace(/^(sns:)+/,'')!==String(item.id).replace(/^(sns:)+/,''));items.push(updated);
     selectedTab='history';form.d.close();render();showOperation('投稿結果を保存しました。履歴から確認・追記できます。');
    }catch(error){form.message.textContent=error.message;}
    finally{saving=false;save.disabled=false;form.setBusy(false);}
   };
  }
  async function fetchMore(requested=false){
   if(loading||!hasMore)return;loading=true;render();
   try{
    if(typeof API!=='string'||typeof authHeaders!=='function')throw new Error('読取APIが未設定');
    const url=new URL(API);url.searchParams.set('resource','task-events');url.searchParams.set('limit','100');url.searchParams.set('offset',String(offset));
    const r=await root.fetch(url,{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw new Error('保存原稿を読み取れませんでした');
    if(!Array.isArray(data.events))throw new Error('保存原稿の応答形式が未確認');
    const next=data.nextOffset;if(next!==null&&(!Number.isInteger(next)||next<=offset))throw new Error('続きの読取位置が未確認');
    items.push(...data.events.map(i=>({...i,eventRecordId:i.id,id:'task:'+i.taskId+':'+i.eventKey})));
    loaded+=data.events.length;total=Number.isInteger(data.total)&&data.total>=0?data.total:null;checked=true;
    offset=next??offset;hasMore=next!==null;readError='';
   }catch(error){readError=error.message;}
   finally{loading=false;if(!desk?.queue(render,{force:requested||Boolean(readError)}))render();}
  }
  more.onclick=()=>fetchMore(true);render();fetchMore();if(isThreads)loadAccount();
 }
 // Presentation-only bridge: reuse the existing explicitly matched account review.
 api.openAccount=function(key){
  const account=api.accounts.find(item=>item.key===key&&item.key!=='sourcing');
  if(!account)return false;
  open(account);return true;
 };
 const style=e('style');style.textContent='.manual-operation-hub{margin:12px 0;padding:14px;background:#fff;color:#16324f;border:3px double #0f756d}.manual-operation-hub h2{margin-top:0}.manual-operation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.manual-operation-grid article{padding:12px;border:1px solid #16324f;display:grid;gap:8px}.manual-operation-grid h3,.manual-operation-grid p{margin:0}.manual-operation-grid small{display:block}.manual-operation-review{width:min(880px,90vw);max-height:90vh;overflow:auto;background:#fff;color:#16324f;border:3px solid #0f756d}.manual-operation-review::backdrop{background:rgba(0,0,0,.55)}.manual-operation-review article{border-top:2px solid #0f756d;padding:12px 0}.manual-operation-review pre{white-space:pre-wrap;line-height:1.7}@media(max-width:650px){.manual-operation-grid{grid-template-columns:1fr}}';doc.head.append(style);
})(typeof window==='undefined'?null:window,function(){
 const metricLabels=[['views','閲覧数'],['likes','いいね'],['replies','返信'],['reposts','再投稿'],['quotes','引用'],['clicks','クリック']];
 function threadsUrl(value,kind){
  if(typeof value!=='string'||value.length>300)return null;
  const match=value.trim().match(/^https:\/\/(?:www\.)?(threads\.com|threads\.net)\/@([A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?)(?:\/post\/([A-Za-z0-9_-]{1,100}))?\/?$/);
  if(!match||match[2].includes('..')||(kind==='post')!==Boolean(match[3]))return null;
  return {url:'https://www.threads.com/@'+match[2].toLowerCase()+(match[3]?'/post/'+match[3]:''),handle:match[2].toLowerCase()};
 }
 function manualResult(item,key){
  const raw=payload(item).threads_manual_result,remembered=item?.[evidence]?.results?.[key],r=remembered&&remembered.revision>(raw?.revision||0)?remembered:raw,object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))return false;const [y,m,d]=v.slice(0,10).split('-').map(Number);return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate();};
  if(!object(r)||r.contract!=='threads-manual-result-v1'||r.source!=='manual'||r.status!=='posted_manual'||r.account_key!==key||!Number.isSafeInteger(r.revision)||r.revision<1)return null;
  const post=threadsUrl(r.post_url,'post'),profile=threadsUrl(r.account_profile_url,'profile');
  if(!post||!profile||post.handle!==profile.handle||!date(r.confirmed_at)||!object(r.original_copies))return null;
  if(r.actual_text!==null&&(typeof r.actual_text!=='string'||r.actual_text.length>5000))return null;
  if(r.posted_at!==null&&!date(r.posted_at))return null;
  if(r.metrics!==null&&(!object(r.metrics)||r.metrics.source!=='manual'||!date(r.metrics.observed_at)||metricLabels.some(([key])=>r.metrics[key]!==null&&(typeof r.metrics[key]!=='number'||!Number.isSafeInteger(r.metrics[key])||r.metrics[key]<0||r.metrics[key]>1000000000))))return null;
  return r;
 }
 function metricNumber(value){const s=String(value).trim();if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n<=1000000000?n:null;}
 function isoFromLocal(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))throw Error('日時を確認してください。');return d.toISOString();}
 function localDateTime(value){if(!value)return '';const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 function displayTime(value){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return '未確認';return new Date(value).toLocaleString('ja-JP',{timeZoneName:'short'});}
 function originalCopies(result,item){const p=result.original_copies;return p&&typeof p==='object'?savedCopies(p).filter(c=>c.label!=='保存購入リンク'):[];}
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
    const merged={...winner},history={},results={};
    for(const account of ['kyun','choi']){const a=manualResult(previous,account),b=manualResult(item,account);results[account]=(b?.revision||0)>(a?.revision||0)?b:a;}
    for(const account of ['tiktok','kyun','choi'])history[account]=preferHistory(matchesAccount(previous,account)?historyState(previous,account):previous[evidence]?.history?.[account],matchesAccount(item,account)?historyState(item,account):item[evidence]?.history?.[account]);
    Object.defineProperty(merged,evidence,{value:{suppressed:isSuppressed(previous)||isSuppressed(item),history,results}});out[index]=merged;
   }
  }return out;
 }
 function isSuppressed(i){return i?.suppressed===true||payload(i).suppressed===true||i?.[evidence]?.suppressed===true;}
 function historyState(i,key){
  if(['kyun','choi'].includes(key)&&manualResult(i,key))return '投稿済み';
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
 // Only saved individual Mercari items are eligible; never construct a search result
 // or derive a price from a shop price, price difference, listing age, or update age.
 function savedMercariComparisons(item){
  const p=payload(item),entries=new Map(),text=typeof p.comparison_and_private_evidence==='string'?p.comparison_and_private_evidence:'';
  const safeUrl=value=>typeof value==='string'&&/^https:\/\/jp\.mercari\.com\/item\/m\d+$/.test(value.trim())?value.trim():null;
  const validStamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)&&Number.isFinite(Date.parse(value))?value:null;
  const amount=value=>{if(typeof value!=='string'&&typeof value!=='number')return null;const raw=String(value).trim();if(!/^(?:[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(raw))return null;const n=Number(raw.replace(/,/g,''));return Number.isSafeInteger(n)&&n<=1000000000?n:null;};
  const state=value=>/^(?:sold|sold_out|成約|売り切れ)$/i.test(value||'')?'sold':/^(?:active|on_sale|selling|販売中|出品中)$/i.test(value||'')?'active':'unknown';
  const add=url=>{if(!url)return null;if(!entries.has(url))entries.set(url,{url,price:null,state:'unknown',checkedAt:validStamp(p.checked_at_mercari),note:'',structured:false});return entries.get(url);};
  for(const source of savedSources(item))add(safeUrl(source.url));
  for(const record of Array.isArray(p.mercari_comparisons)?p.mercari_comparisons:[]){
   if(!record||typeof record!=='object')continue;const entry=add(safeUrl(record.url));if(!entry)continue;
   const notes=[['状態',record.condition],['色',record.color],['サイズ',record.size],['比較差',record.differences],['留保',record.caveat]].filter(([,v])=>typeof v==='string'&&v.trim()).map(([label,v])=>label+'：'+v.trim());
   Object.assign(entry,{price:amount(record.price_jpy),state:state(record.status),checkedAt:validStamp(record.checked_at)||entry.checkedAt,note:notes.join('。'),structured:true});
  }
  const urlTokens=value=>Array.from(value.matchAll(/https?:\/\/[^\s<>"「」]+/g),m=>m[0].replace(/[。、）)]+$/,''));
  const ids=value=>Array.from(value.replace(/https?:\/\/[^\s<>"「」]+/g,' ').matchAll(/\bm\d+\b/g),m=>m[0]);
  const excluded=value=>/(?:比較から除外|主比較から除外|比較除外|比較対象外|除外候補)/.test(value);
  function readEvidence(value){
   // Prefer an explicitly adjoining price/status pair. Other prices in the same
   // record may be shop prices or differences, so ambiguity stays unknown.
   const marker='(?:SOLD|成約|販売中|出品中)(?!日|時期|では|でない|か不明|か未確認|未確認|不明|なし|予定)',prices=Array.from(value.matchAll(new RegExp('([\\d,]+)円\\s*('+marker+')|'+marker+'[\\s：:、]*([\\d,]+)円','gi')),m=>({price:amount(m[1]||m[3]),state:/SOLD|成約/i.test(m[0])?'sold':'active'}));
   if(prices.length===1&&prices[0].price)return prices[0];
   if(prices.length)return {price:null,state:'unknown'};
   const active=/(?:販売中|出品中|個人現行)(?!では|でない|か不明|か未確認|未確認|不明|なし|予定)/.test(value),sold=/(?:\bSOLD\b|個人成約)(?!では|でない|か不明|か未確認|未確認|不明|なし|予定)/i.test(value),all=Array.from(value.matchAll(/([\d,]+)円/g),m=>amount(m[1]));
   return {price:active!==sold&&all.length===1?all[0]:null,state:active===sold?'unknown':sold?'sold':'active'};
  }
  function attach(url,note){
   const entry=add(url);if(!entry||entry.structured)return;
   const parsed=readEvidence(note),datePattern='\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:Z|[+-]\\d{2}:\\d{2})',datedCheck=note.match(new RegExp('('+datePattern+')[^。\\n]{0,12}(?:確認|読取)'))||note.match(new RegExp('(?:checked_at|確認日時)[：:\\s]*('+datePattern+')')),localStamp=validStamp(datedCheck?.[1]);
   if(entry.note&&entry.note!==note){entry.price=entry.price===parsed.price?entry.price:null;entry.state=entry.state===parsed.state?entry.state:'unknown';entry.note+='\n'+note;return;}
   Object.assign(entry,parsed,{note,checkedAt:localStamp||entry.checkedAt});
  }
  for(const line of text.split(/\r?\n/).map(v=>v.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean)){
   const urls=urlTokens(line).map(safeUrl).filter(Boolean);
   if(excluded(line)){for(const url of [...urls,...ids(line).map(id=>'https://jp.mercari.com/item/'+id)])if(!entries.get(url)?.structured)entries.delete(url);continue;}
   if(urls.length===1){attach(urls[0],line);continue;}
   if(urls.length)continue;
   // Legacy compact notes save only item IDs. Use one ID per sentence in a
   // Mercari-specific record, and require an explicit price and sale state.
   if(!validStamp(p.checked_at_mercari)&&!text.includes('メルカリ'))continue;
   for(const sentence of line.split(/(?<=。)/)){
    const itemIds=ids(sentence),parsed=readEvidence(sentence);
    if(itemIds.length===1&&parsed.price&&parsed.state!=='unknown')attach('https://jp.mercari.com/item/'+itemIds[0],sentence.trim());
   }
  }
  return [...entries.values()].map(({structured,...entry})=>({...entry,label:(entry.state==='active'?'出品中':entry.state==='sold'?'成約':'販売状況未確認')+' '+(entry.price===null?'価格未確認':entry.price.toLocaleString('ja-JP')+'円')}));
 }
 // A deterministic reading aid only: surface saved wording and explicit unknowns.
 // The full item evidence remains unchanged in the adjacent disclosure. No shop
 // comparison, model match, sale date, or new price calculation is inferred here.
 function mercariComparisonSummary(comparison){
  const note=typeof comparison?.note==='string'?comparison.note:'',unique=values=>[...new Set(values)];
  const clean=note.replace(/https?:\/\/[^\s<>"「」]+/g,'').replace(/\b(?:seller\d+|m\d+)\b/g,'').replace(/^(?:一方|補足)\s*(?:は)?/,'');
  const parts=[],brackets=[],pairs={'「':'」','『':'』','（':'）','(':')'};let part='';
  for(const char of clean){if(pairs[char])brackets.push(pairs[char]);else if(char===brackets[brackets.length-1])brackets.pop();if(/[。、\n]/.test(char)&&!brackets.length){if(part.trim())parts.push(part.trim());part='';}else part+=char;}if(part.trim())parts.push(part.trim());
  const conditionPattern=/(?:新品未使用(?:タグ付き)?|新品タグ付き|未使用に近い|未使用品|室内試着(?:のみ)?|試着程度|(?:数回|\d+回|数分屋外)使用|目立つ傷汚れなし|目立った傷や汚れなし|傷あり|箱なし|中古)/g;
  // Later sentences can discuss a different, cheaper listing. Take condition
  // wording only from the first descriptive sentence, never that other example.
  const conditionText=clean.split(/(?:別途|別の出品|他の出品)/)[0],conditionSentence=conditionText.split(/[。\n]/).find(sentence=>!/(?:店価格|店舗新品|新品店価格)/.test(sentence)&&Array.from(sentence.matchAll(conditionPattern)).length)||'';
  const uncertainCondition=/(?:状態[^。]*(?:不明|未確認)|(?:新品|未使用|中古|試着)[^。]*(?:ではない|ではなく|と(?:は)?断定|か不明|か未確認))/.test(conditionSentence);
  const conditions=uncertainCondition?[]:unique(Array.from(conditionSentence.matchAll(conditionPattern),m=>m[0]));
  if(!/(?:状態[^。]*(?:不明|未確認)|新品[^。]*(?:ではない|ではなく|と(?:は)?断定|か不明|か未確認))/.test(conditionText)&&/個人(?:現行|成約)新品(?!未使用|タグ付き)(?!では|と(?:は)?断定|か不明|か未確認)/.test(conditionText))conditions.unshift('新品');
  const colorParts=parts.filter(part=>/(?:同色|色違い|色・状態違い|別色|色[^。]*(?:異なる|矛盾|不明)|色・規格表記の留保)/.test(part));
  const sizeParts=parts.filter(part=>/(?:同サイズ|サイズ差|サイズ違い|\d+(?:\.\d+)?(?:cm|サイズ)[大小上下]|店[^。]*から|対象[^。]*から)/.test(part));
  const differences=unique([...colorParts,...sizeParts]);
  if(!colorParts.length)differences.push('色差は未確認');if(!sizeParts.length)differences.push('サイズ差は未確認');
  const cautions=parts.filter(part=>/(?:矛盾|不明|未確認|留保|下振れ|(?:より|への)[^。]*安い|擦れ|擦り|欠損|型番なし|みられる|想定|(?:最安|回転)[^。]*(?:断定|しない|ではない|未判定)|タグ[^。]*(?:取って|なし|なく)|完全一致[^。]*しない)/.test(part));
  // Repeated caveats already visible in a difference line do not need a second
  // copy. Sale-date uncertainty is always stated above the entire comparison list.
  if(uncertainCondition&&conditionSentence.trim())cautions.push(conditionSentence.trim());
  const visibleCautions=unique(cautions).filter(part=>!differences.includes(part)&&!/^成約(?:日|時期)(?:は|が)?(?:不明|未確認)(?:で)?$/.test(part));
  return {condition:unique(conditions).join('・')||'未確認',differences:differences.join('。'),cautions:visibleCautions};
 }
 function savedPriceStockCheck(p){
  const value=p?.checked_at_price_stock;
  if(typeof value!=='string'||value.length>100)return {value:null,label:'未確認'};
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  if(!match||!Number.isFinite(Date.parse(value)))return {value:null,label:'未確認'};
  const [year,month,day,hour,minute,second]=match.slice(1).map(Number);
  if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)return {value:null,label:'未確認'};
  const label=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value))+'（日本時間）';
  return {value,label};
 }
 function savedProductLink(p){
  const raw=[p.ordinary_url,p.purchase_url,p.purchase_link].find(v=>typeof v==='string'&&v.trim());
  if(!raw)return {url:null,note:'商品URLが未確認のため、まだ開けません。'};
  let u;try{u=new URL(raw.trim());}catch(_){return {url:null,note:'商品URLの形式が未確認のため、まだ開けません。'};}
  if(u.protocol!=='https:'||u.username||u.password)return {url:null,note:'安全な商品URLを確認できないため、まだ開けません。'};
  const unissued=p.affiliate_url===null||p.affiliate_url==='';
  const isAffiliate=typeof p.affiliate_url==='string'&&p.affiliate_url.trim()===u.href;
  return {url:u.href,note:isAffiliate?'保存されたアフィリエイトURLです。別タブで開きます。':unissued?'通常の商品URLです。アフィリエイトリンクは未発行です。別タブで開きます。':'保存された商品URLです。アフィリエイト発行状況は未確認です。別タブで開きます。'};
 }
 function savedCopies(p){
  const result=[],variants=Array.isArray(p.body_variants)?p.body_variants:Array.isArray(p.body_options)?p.body_options:[];
  variants.forEach((v,i)=>{const t=typeof v==='string'?v:v&&typeof v==='object'?(v.text||v.body):'';if(t)result.push({label:'保存本文案'+(i+1),text:String(t)});});
  const main=p.main_post||p.threads_main_post||p.post_text||p.caption||p.draft_caption||(typeof p.draft==='string'?p.draft:'');if(main&&!result.some(r=>r.text===main))result.push({label:'保存主投稿',text:String(main)});
  const recommended=p.recommended_variant||p.recommended_option;if(recommended!==undefined&&recommended!==null)result.push({label:'保存された推奨案',text:typeof recommended==='object'?String(recommended.text||recommended.body||recommended.label||JSON.stringify(recommended)):String(recommended)});
  const reply=p.self_reply||p.reply_text||p.threads_reply||p.link_reply;if(reply)result.push({label:'保存自己返信',text:String(reply)});
  const link=p.purchase_link||p.purchase_url;if(typeof link==='string'&&/^https:\/\//.test(link))result.push({label:'保存購入リンク',text:link});
  return result;
 }
 return {accounts,payload,matchesAccount,unique,savedCopies,isSuppressed,historyState,savedSources,savedProductLink,savedMercariComparisons,mercariComparisonSummary,savedPriceStockCheck,metricLabels,threadsUrl,manualResult,metricNumber,isoFromLocal,localDateTime,displayTime,originalCopies};
});
