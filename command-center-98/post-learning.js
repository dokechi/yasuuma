/* Private before/after examples for the next manuscript. Saving never posts to SNS. */
(function(root,factory){
 const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CCPostLearning=api;
})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-retro-api';
 const CONTRACT='post-learning-v1',drafts=new Map(),controllers=new Set();
 function descriptor(item,accountKey,copyKey){
  const event=item?.eventRecordId??item?.recordId;
  const raw=String(event??item?.id??'').replace(/^(sns:)+/,'');
  const sourceKind=event!=null||/^[1-9]\d*$/.test(raw)?'event':'signal';
  if(!raw||!accountKey||!copyKey)return null;
  return {sourceKind,sourceId:raw,accountKey,copyKey};
 }
 function draftBinding(draft){
  const s=draft?.source;if(!s||!['kyun','choi','tiktok','fp','house'].includes(s.account))return null;
  const sourceId=String(s.recordId||s.id||'').replace(/^(sns:)+/,'');
  const sourceKind=s.kind||(/^[1-9]\d*$/.test(sourceId)?'event':'signal');
  const copyKey=s.copyKey||(s.label==='ページ別台本'?'fp_script':s.label);
  return sourceId&&copyKey?{sourceKind,sourceId,accountKey:s.account,copyKey}:null;
 }
 function sameSource(source,ref){
  return source&&source.kind===ref.sourceKind&&source.id===ref.sourceId&&source.account===ref.accountKey&&source.copy===ref.copyKey;
 }
 function checkedEntry(entry,ref,fingerprint){
  if(!entry)return null;
  if(entry.contract!==CONTRACT||!sameSource(entry.source,ref)||entry.source.fingerprint!==fingerprint||
    !Number.isSafeInteger(entry.revision)||entry.revision<1||typeof entry.final?.text!=='string'||
    entry.subjective_result?.source!=='user_subjective'||![null,'buzz'].includes(entry.subjective_result.status))throw Error('post_learning_response_invalid');
  return entry;
 }
 const messages={
  post_learning_source_changed:'元文が更新されています。手直しはこの画面に残しています。開き直して元文を確認してください。',
  post_learning_changed_reload:'別の画面で更新されています。手直しはこの画面に残しています。',
  post_learning_invalid_request:'最終稿は空欄にせず、10万文字以内で入力してください。',
  post_learning_source_not_found:'対応する元文を確認できません。手直しはこの画面に残しています。',
  post_learning_copy_not_found:'この本文の保存元を確認できません。',
  unauthorized:'ログインを確認してください。手直しはこの画面に残しています。'
 };
 async function request(ref,body){
  const url=new URL(API);if(!body){url.searchParams.set('resource','post-learning');for(const [k,v]of Object.entries(ref))url.searchParams.set(k,v);}
  const response=await root.fetch(url,{method:body?'PATCH':'GET',cache:'no-store',
   headers:{...(typeof authHeaders==='function'?authHeaders():{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'post_learning_request_failed');return data;
 }
 function styles(doc){
  if(doc.getElementById('cc-post-learning-style'))return;
  const style=doc.createElement('style');style.id='cc-post-learning-style';
  style.textContent='.cc-post-learning{margin:12px 0;padding:12px;background:#fffdf5;color:#213e3b;border:1px solid #a9b7ae;border-radius:8px;min-width:0}.cc-post-learning h4{margin:0 0 7px;font-size:15px}.cc-post-learning details{margin:7px 0}.cc-post-learning summary{cursor:pointer;font-size:12px}.cc-post-learning pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:40vh;overflow:auto;font:inherit;font-size:13px}.cc-post-learning label{display:block;font-size:12px;margin:9px 0 4px;font-weight:700}.cc-post-learning textarea{box-sizing:border-box;width:100%;min-height:180px;max-height:55vh;resize:vertical;padding:10px;border:1px solid #899a90;border-radius:5px;background:white;color:#172a26;font:inherit;font-size:16px;line-height:1.7}.cc-post-learning-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.cc-post-learning button{font:inherit;min-height:44px;padding:8px 13px;border:1px solid #638277;border-radius:6px;background:#f1f6f2;color:#173e30;cursor:pointer}.cc-post-learning button[aria-pressed=true]{background:#ffe5b3;border-color:#a85d12;color:#6c3800}.cc-post-learning button:disabled{opacity:.55;cursor:default}.cc-post-learning-status{font-size:12px;margin:7px 0 0;min-height:1.5em;overflow-wrap:anywhere}.cc-post-learning-note{font-size:11px;margin:5px 0;color:#5d6e65}.cc-post-learning [hidden]{display:none!important}.cc-post-learning-status[data-error=true]{color:#a52c27}';
  doc.head.append(style);
 }
 function mount(host,ref,{onChange=()=>{},onCopied=()=>{},onReady=()=>{},showCopy=true}={}){
  if(!root||!host||!ref)return null;
  const doc=host.ownerDocument;styles(doc);
  const e=(tag,value)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
  const section=e('section');section.className='cc-post-learning';
  const originalDetails=e('details'),originalText=e('pre');originalDetails.append(e('summary','AIの元文を確認'),originalText);
  const label=e('label','最終稿｜軽く手直しすると自動保存'),area=e('textarea');label.append(area);area.rows=7;area.maxLength=100000;area.disabled=true;
  const actions=e('div');actions.className='cc-post-learning-actions';
  const copy=e('button','最終稿をコピー'),buzz=e('button','🔥 バズった'),status=e('p','元文と手直しを読み込み中…'),retry=e('button','再読込');
  for(const b of [copy,buzz,retry])b.type='button';copy.disabled=buzz.disabled=true;copy.hidden=!showCopy;retry.hidden=true;
  buzz.setAttribute('aria-pressed','false');status.className='cc-post-learning-status';status.setAttribute('aria-live','polite');
  actions.append(copy,buzz,retry);section.append(e('h4','手直しと投稿後の反応'),originalDetails,label,actions,status,
   Object.assign(e('p','元文・手直し・体感の反応を、次の原稿作りに使います。未評価はそのままでOK。'),{className:'cc-post-learning-note'}));host.append(section);
  const key=JSON.stringify(ref),storageKey='cc-post-learning-draft.v1.'+key;
  let entry=null,fingerprint='',original='',savedText='',timer=null,pending=null,disposed=false,loading=true,conflict=false;
  const note=(value,error=false)=>{if(disposed)return;status.textContent=value;status.dataset.error=String(error);};
  function cache(){
   const draft={fingerprint,text:area.value,expectedRevision:entry?.revision||0};drafts.set(key,draft);
   try{root.localStorage.setItem(storageKey,JSON.stringify(draft));}catch{}
  }
  function cached(){if(drafts.has(key))return drafts.get(key);try{return JSON.parse(root.localStorage.getItem(storageKey)||'null');}catch{return null;}}
  function clearCache(sent){if(area.value!==sent)return;drafts.delete(key);try{root.localStorage.removeItem(storageKey);}catch{}}
  function isBuzz(){return entry?.final.text===area.value&&entry?.subjective_result.status==='buzz';}
  function paint(){if(disposed)return;buzz.setAttribute('aria-pressed',String(isBuzz()));buzz.textContent=isBuzz()?'🔥 バズった ✓':'🔥 バズった';}
  function idle(){note(isBuzz()?'バズったを記録済み（もう一度押すと取り消し）':entry?'手直しを保存済み｜反応は未評価':'元文のまま｜手直しすると自動保存');paint();}
  const mutationId=()=>root.crypto?.randomUUID?.()||('edit_'+Date.now()+'_'+Math.random().toString(36).slice(2));
  async function persist(operation='save'){
   clearTimeout(timer);
   if(loading)throw Error('post_learning_loading');
   if(conflict)throw Error('post_learning_changed_reload');
   if(pending)return pending.then(()=>persist(operation));
   if(disposed)return area.value;
   if(operation==='save'&&area.value===savedText)return area.value;
   if(!area.value.trim())throw Error('post_learning_invalid_request');
   const sent=area.value,revision=entry?.revision||0;let failed=false;
   const body={action:'post_learning',...ref,operation,finalText:sent,fingerprint,expectedRevision:revision,mutationId:mutationId()};
   note('保存中…');section.setAttribute('aria-busy','true');
   pending=(async()=>{
    const data=await request(ref,body),fresh=checkedEntry(data.entry,ref,fingerprint);
    if(!fresh||fresh.final.text!==sent||fresh.revision!==revision+1)throw Error('post_learning_response_invalid');
    entry=fresh;savedText=sent;clearCache(sent);if(!disposed){idle();onChange(area.value,fresh);}
    return sent;
   })();
   try{return await pending;}
   catch(error){failed=true;cache();if(['post_learning_changed_reload','post_learning_source_changed'].includes(error.message))conflict=true;note(messages[error.message]||'保存を確認できませんでした。手直しは残っています。',true);throw error;}
   finally{pending=null;if(!disposed){section.removeAttribute('aria-busy');if(!failed&&!conflict&&area.value!==savedText)timer=setTimeout(()=>persist().catch(()=>{}),900);}}
  }
  async function flush(){if(disposed)throw Error('post_learning_closed');await persist();if(area.value!==savedText)return flush();return area.value;}
  async function copyFinal(){
   if(loading)return;
   try{const value=await flush();await root.navigator.clipboard.writeText(value);note('最終稿をコピーしました。');onCopied(value);}
   catch(error){note(messages[error.message]||'コピー・保存を確認できません。手直しは残っています。',true);}
  }
  async function load(){
   loading=true;copy.disabled=buzz.disabled=area.disabled=true;retry.hidden=true;
   try{
    const data=await request(ref);if(disposed)return;
    if(typeof data.original?.text!=='string'||typeof data.fingerprint!=='string')throw Error('post_learning_response_invalid');
    fingerprint=data.fingerprint;original=data.original.text;entry=checkedEntry(data.entry,ref,fingerprint);savedText=entry?.final.text??original;
    area.value=savedText;originalText.textContent=original;const draft=cached();
    if(draft&&draft.fingerprint===fingerprint&&draft.expectedRevision===(entry?.revision||0)&&typeof draft.text==='string')area.value=draft.text;
    else if(draft?.text){
     const recovery=e('details');recovery.append(e('summary','以前の元文への未保存の手直し'),e('pre',draft.text));section.append(recovery);
    }
    loading=false;conflict=false;copy.disabled=buzz.disabled=area.disabled=false;idle();onChange(area.value,entry);onReady(true);
    if(area.value!==savedText){note('未保存の手直しを復元しました。');timer=setTimeout(()=>persist().catch(()=>{}),900);}
   }catch(error){note(messages[error.message]||'元文を読み取れませんでした。「再読込」で試せます。',true);retry.hidden=false;onReady(false);}
  }
  area.addEventListener('input',()=>{cache();paint();note('手直し中…');onChange(area.value,entry);clearTimeout(timer);timer=setTimeout(()=>persist().catch(()=>{}),900);});
  area.addEventListener('blur',()=>{if(!loading&&area.value!==savedText)persist().catch(()=>{});});
  copy.addEventListener('click',copyFinal);
  buzz.addEventListener('click',async()=>{
   if(loading)return;buzz.disabled=true;
   try{if(pending)await pending;await persist(isBuzz()?'unbuzz':'buzz');}catch{}finally{if(!disposed)buzz.disabled=false;}
  });
  retry.addEventListener('click',load);
  const controller={section,ready:load(),text:()=>area.value,flush,copy:copyFinal,
   destroy(){if(!loading&&area.value!==savedText){cache();persist().catch(()=>{});}disposed=true;clearTimeout(timer);controllers.delete(controller);}};
  controllers.add(controller);return controller;
 }
 if(root)root.addEventListener('pagehide',()=>{for(const c of controllers)c.destroy();});
 return {descriptor,draftBinding,checkedEntry,mount};
});
