import {publishingAccounts,draftsForAccount,copiesForAccount,createAccountBoard} from './accounts.js?v=20261101.9-workbook';
import {createConveniences} from './qol.js?v=20261101.9-workbook';
import {resumeView,postingReadiness} from './qol-model.js?v=20261031.1-lottery';
import {createNotebook,safeLink} from './notebook.js?v=20261031.1-lottery';
import {placeForRoom,placeNames,productionURL,visibleGroups,holdsActiveText,nativeForDraft,trustedMessage} from './desk-model.js?v=20261101.9-workbook';

export function createDesk({onHome,onPause,onResume,onSettings,onFeedback=()=>{},onOpenRoom=()=>{},onLounge=()=>{},onWorkingChapter=()=>{}}){
 const $=id=>document.getElementById(id),embedded=window.parent!==window,origin=location.origin;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls)=>{const n=el('button',text,cls);n.type='button';n.addEventListener('click',fn);return n;};
 let storage;try{storage=window.localStorage;}catch{}
 let storageError=false,lastRenderedOperationContext=null;
 const notebook=createNotebook({seeds:{kyun:[],choi:[],otoku:[],rakuten:[],lottery:[],fp:[],shiire:[]},storage,onError:()=>{storageError=true;}});
 let place=null,active=null,query='',filter='all',pending=null,loading=false,complete=false,connected=false,autoReturn=false,manual=null,scrollTimer=0,externalNotes=false,nativeWork=null;
 const selections=new Map(),views=new Map();let requested=null;let returnToAccounts=false,passiveEntry=false,initialDraftId=null;
 const livingSubscribers=new Set();let livingQueued=false,livingSignature='',statusMessage='',sourceIssue='',recordsAccepted=false,summarizeLivingRooms=null;
 const livingSnapshot=()=>summarizeLivingRooms?summarizeLivingRooms({notebook,loading,complete:complete&&recordsAccepted,connected,message:sourceIssue||statusMessage,active,place,pending,externalNotes}):{rooms:[],complete:false};
 // Coalesce only synchronous UI changes, never poll or fetch. Emission follows
 // the owner render so held revisions and seen marks describe the shown paper.
 function emitLiving(){if(!summarizeLivingRooms||livingQueued)return;livingQueued=true;queueMicrotask(()=>{livingQueued=false;const value=livingSnapshot(),signature=JSON.stringify(value);if(signature===livingSignature)return;livingSignature=signature;for(const listener of livingSubscribers)listener(value);});}

 const board=createAccountBoard({host:document.body,rows:()=>notebook.all(),open:requestAccount,onLounge:()=>{returnToAccounts=false;onLounge();},onLegacy:showLegacy,onRefresh:()=>{if(embedded){setStatus('保存原稿を読み込み中…',{loading:true});send('refresh');}else window.top.location.href=productionURL;}});
 $('account-board-open').addEventListener('click',()=>board.show());
 function requestAccount(account,id,options){returnToAccounts=true;requested={place:account.place,id,...(options?.resume===true?{resume:true}:{}),...(options?.passive===true?{passive:true}:{})};if(id)selections.set(account.place,id);onOpenRoom(account.place);}
 function requestWorkingChapter(key,{draftId,initial=false}={}){
  const account=publishingAccounts.find(a=>a.key===key&&!a.pending)||(key==='sourcing'?{key,place:'shiire'}:null);if(!account)return false;
  let id=typeof draftId==='string'&&draftId.length>0&&draftId.length<=1000&&!/[\u0000-\u001f\u007f]/.test(draftId)?draftId:undefined;
  const saved=id&&notebook.get(id);if(saved&&(saved.place!==account.place||key!=='sourcing'&&saved.source?.account!==key))id=undefined;
  autoReturn=false;
  if(initial)requestAccount(account,id,{resume:true,passive:true});else board.open(key,id,{resume:true});
  return true;
 }
 function activateReading(){if(!passiveEntry||!place)return;passiveEntry=false;initialDraftId=null;notebook.visit(place);conveniences.acknowledge();}
 // Only explicit interaction acknowledges a passive first page. Rendering,
 // source receipts, restored scroll, blur, and focus alone do not mark it read.
 for(const type of ['click','input','change','pointerdown','wheel'])$('desk').addEventListener(type,activateReading,{capture:true,passive:true});
 $('desk').addEventListener('keydown',event=>{if(['Enter',' ','ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key))activateReading();},true);

 function showLegacy(){
  const dialog=el('dialog',undefined,'legacy-account-archive'),header=el('header');header.append(el('h2','旧データの保管庫'),button('閉じる',()=>dialog.close()));dialog.append(header,el('p','過去のアカウント・投稿先未確定の保存記録です。現在のアカウントには混ぜず、閲覧用として保持しています。'));
  const records=notebook.legacySources();if(!records.length)dialog.append(el('p','この端末に保管された旧原稿はありません。'));
  for(const d of records){const entry=el('details'),summary=el('summary',d.title||'名称未確認');entry.append(summary,el('p','元の区分: '+(d.source?.account||'未確定')+' / '+(d.checkedAt||'日付未確認')),el('pre',d.body||''));dialog.append(entry);}
  const oldCopies=notebook.copies().filter(c=>['kyun','choi','otoku','rakuten','lottery'].includes(c.place)&&!publishingAccounts.some(a=>copiesForAccount([c],a,id=>notebook.get(id)).length));if(oldCopies.length)dialog.append(el('h3','旧・投稿先未確定のコピー履歴'));for(const c of oldCopies){const item=el('details');item.append(el('summary',c.title||'以前のコピー'),el('pre',c.text));dialog.append(item);}
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }
 const conveniences=createConveniences({notebook,open:context=>{requested=context;if(context.id)selections.set(context.place,context.id);onOpenRoom(context.place);},copy:(...args)=>copy(...args),native,onFeedback,onChange:emitLiving,send:(...args)=>send(...args)});
 const learningHost=el('div');$('draft-body').after(learningHost);let learningController=null,learningKey='',learningReady=false;
 const imageHost=el('div');learningHost.after(imageHost);let imageController=null,imageKey='';
 function attachments(d){
  let api;try{api=embedded?window.parent.CCThreadsImages:window.CCThreadsImages;}catch{}
  const ref=api?.binding(d),key=ref?JSON.stringify(ref):'';
  if(key===imageKey)return;imageController?.destroy();imageController=null;imageHost.replaceChildren();imageKey=key;
  if(ref)imageController=api.mount(imageHost,ref,{onSaved:()=>operation('画像と順番を保存しました。')});
 }
 function editable(d){
  let api;try{api=embedded?window.parent.CCPostLearning:window.CCPostLearning;}catch{}
  const ref=d?.source?.label?.startsWith('日本語｜')?null:api?.draftBinding(d),key=ref?JSON.stringify([ref,d.body]):'';
  if(key!==learningKey){learningController?.destroy();learningController=null;learningReady=false;learningKey=key;learningHost.replaceChildren();
   if(ref){const id=d.id;learningController=api.mount(learningHost,ref,{showCopy:false,
    onChange:value=>{if(active?.id===id){operation('');conveniences.update({...active,body:value},{markSeen:!passiveEntry});$('desk-copy').textContent='最終稿をコピー';}},
    onCopied:value=>{notebook.copied({...d,body:value},'body',value);operation('最終稿をコピーしました。');onFeedback('copy');},
    onReady:ready=>{if(active?.id===id){learningReady=ready;$('draft-body').hidden=ready;}}
   });}
  }
  $('draft-body').hidden=learningReady;
  if(learningController)conveniences.update({...d,body:learningController.text()||d.body},{markSeen:!passiveEntry});
 }
 const send=(type,extra={})=>{if(embedded)window.parent.postMessage({channel:'cc-castle-v1',type,...extra},origin);};
 function operation(text){$('desk-operation').textContent=text+(storageError?'（端末に保存できないため、この画面内で保持）':'');}
 function native(action,recordId,returnHome=false,section){
  if(!embedded){window.top.location.href=productionURL;return;}
  savePosition();autoReturn=returnHome;if(place==='shiire'&&['sourcing','watches','cards'].includes(action))nativeWork=action;if(!passiveEntry&&['sourcing','watches','cards','fp','tiktok'].includes(action)){const p=['fp','tiktok'].includes(action)?'fp':'shiire';notebook.setPref('lastWork',{place:p,title:({sourcing:'仕入れ帳',watches:'海外時計・価格差',cards:'カード',fp:'FP 台本・画像',tiktok:'TikTok 投稿結果'})[action],native:action,recordId,section});conveniences.refresh();}send('native',{action,...(['purchases','research','queue'].includes(section)?{section}:{}),...(typeof recordId==='string'&&recordId.length<=500?{recordId}:{})});
 }
 function setStatus(message,{loading:busy=false,complete:done=false}={}){
  loading=busy;complete=done&&!busy;if(busy)recordsAccepted=false;statusMessage=message||'';emitLiving();
  $('desk-status').textContent=message||'';
  $('desk-status-label').textContent=busy?'保存原稿を読み込み中…':complete?'保存原稿を読込済み':connected?'保存原稿の状態':'本体との接続';
  $('desk-refresh').disabled=busy;
  board.render({message,loading:busy,complete});
  if(/失敗|未確認|できません|エラー/.test(message||''))$('desk-status').closest('details').open=true;
 }
 function doneIds(){return new Set(notebook.completed(place).map(d=>d.id));}
 function groups(){const done=doneIds(),account=publishingAccounts.find(a=>a.place===place);return visibleGroups(account?draftsForAccount(notebook.list(place),account):notebook.list(place),{query,filter,isPinned:id=>notebook.flag('pin',id),isDone:id=>done.has(id)});}
 function savePosition(){clearTimeout(scrollTimer);if(passiveEntry)return;if(place&&active){const scroll=$('desk-scroll');notebook.remember(place,active.id,scroll.clientHeight>0?scroll.scrollTop:notebook.position(active.id));if(!nativeWork)notebook.setPref('lastWork',{place,id:active.id,title:active.title});}rememberView();conveniences.refresh();}
 function rememberView(){if(passiveEntry)return;if(place){views.set(place,{query,filter});notebook.setPref('view:'+place,{query,filter});}}
 function routes(){
  const host=$('desk-routes');host.replaceChildren();
  const account=publishingAccounts.find(a=>a.place===place);
  if(account){host.append(button('← 司令塔へ',()=>{returnToAccounts=true;onHome();}),el('strong',account.name+(account.handle?' '+account.handle:'')));if(account.handle){const profile=el('a','投稿先を開く ↗');profile.href='https://www.threads.com/'+account.handle;profile.target='_blank';profile.rel='noopener noreferrer';host.append(profile);}else host.append(el('span','投稿先未登録'));host.append(button('出典・確認記録',()=>native(place)));}
  else if(place==='choi')host.append(button('過去原稿を開く',()=>native('choi')));
  else if(place==='fp')host.append(button('FP 台本・画像',()=>native('fp')),button('TikTok 投稿結果',()=>native('tiktok',active?.source?.account==='tiktok'?active.source.id:undefined)));
  else if(place==='shiire')host.append(button('購入・在庫・売却を開く',()=>native('sourcing')));
  else host.append(button(place==='kyun'?'出典・画像構成を確認':'過去原稿を開く',()=>{const dest=nativeForDraft(place,active);native(dest.action,dest.recordId);}));
 }
 function renderList(){
  const rows=groups(),list=$('desk-list');list.replaceChildren();
  $('desk-count').textContent=rows.length+'件の'+(place==='shiire'?'保存候補':'原稿');
  for(const group of rows){const d=group.find(x=>x.id===active?.id)||group[0],b=button('',()=>select(d.id),'manuscript-card');
   b.dataset.draftId=d.id;b.setAttribute('aria-pressed',String(group.some(x=>x.id===active?.id)));
   b.append(el('small',(group.some(x=>notebook.flag('pin',x.id))?'★ ':'')+d.kind),el('strong',d.title),el('span',d.body.slice(0,75)));
   if(group.length>1)b.append(el('small',group.length+'種類の本文'));
   if(['kyun','choi'].includes(d.place))b.append(el('small',d.source?.account==='insurance'?'画像 '+(d.source.imageCount||0)+'枚':postingReadiness(d).label,'posting-readiness'));
   list.append(b);
  }
  document.querySelectorAll('[data-desk-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deskFilter===filter)));
  return rows;
 }
 function emptyText(){
  if(!embedded&&!connected)return '本体から開くと、保存原稿と仕入れ管理につながります。';
  if(query||filter!=='all')return 'この条件に合う原稿はありません。';
  if(loading)return '保存先から原稿を読み込んでいます。先に本体の機能を開くこともできます。';
  if(place==='shiire')return '購入・在庫・売却は、上のボタンから管理できます。';
  return complete?'この持ち場に表示できる保存原稿はありません。上のボタンから本体も確認できます。':'保存原稿の読取状況を確認してください。「更新」で再試行できます。';
 }
 function renderReader({restore=false}={}){
  emitLiving();
  const context=JSON.stringify([place,active?.id,active?.body]);if(context!==lastRenderedOperationContext){operation('');lastRenderedOperationContext=context;}
  $('desk-article').hidden=!active;$('desk-empty').hidden=!!active;$('desk-empty').textContent=emptyText();
  for(const id of ['desk-copy','desk-pin','desk-done'])$(id).disabled=!active;
  $('desk-variants').replaceChildren();$('draft-links').replaceChildren();
  conveniences.update(active,{markSeen:!passiveEntry});
  attachments(active);
  if(!active){editable(null);return;}
  const d=active,group=groups().find(g=>g.some(x=>x.id===d.id))||[d];
  if(group.length>1)for(const variant of group){const b=button(variant.kind,()=>select(variant.id));b.setAttribute('aria-pressed',String(variant.id===d.id));$('desk-variants').append(b);}
  $('draft-kind').textContent=d.kind;$('draft-title').textContent=d.title;$('draft-body').textContent=d.body;
  $('draft-meta').textContent=[d.source?.status,d.source?.account==='insurance'?'':(['kyun','choi'].includes(d.place)?postingReadiness(d).label:''),d.checkedAt?(d.source?.account==='insurance'?'資料確認日：':'価格・在庫の保存時確認：')+d.checkedAt:''].filter(Boolean).join(' · ');
  const links=Array.isArray(d.productLinks)?d.productLinks.filter(x=>safeLink(x.url)):d.link?[{label:'保存されたリンク',url:d.link}]:[];
  if(links.length){$('draft-links').append(el('p','保存された商品リンク','draft-kind'));for(const row of links){const line=el('div',undefined,'product-link'),a=el('a',row.label+' ↗');a.href=safeLink(row.url);a.target='_blank';a.rel='noopener noreferrer';line.append(a,button('URLをコピー',()=>copy(d,'link',row.url)));$('draft-links').append(line);}if(['kyun','choi'].includes(place))$('draft-links').append(el('small','現在の価格・在庫は商品ページで確認してください。'));}
  $('desk-copy').textContent=notebook.copyMark(d)?'✓ 本文をコピー済み':'本文をコピー';
  editable(d);if(learningController)$('desk-copy').textContent='最終稿をコピー';
  const pin=notebook.flag('pin',d.id);$('desk-pin').setAttribute('aria-pressed',String(pin));$('desk-pin').setAttribute('aria-label',pin?'お気に入りを解除':'お気に入りに保存');$('desk-pin').textContent=pin?'★':'☆';
  $('desk-done').textContent=place==='shiire'?'確認して戻る':'読了にして戻る';
  if(restore)$('desk-scroll').scrollTop=notebook.position(d.id);
 }
 function render({restore=false}={}){
  if(!place)return;
  const rows=groups();
  if(passiveEntry&&initialDraftId){const resumed=rows.flat().find(d=>d.id===initialDraftId);if(resumed){active=resumed;initialDraftId=null;restore=true;}else if(complete)initialDraftId=null;}
  if(!active||!rows.some(g=>g.some(d=>d.id===active.id))){const remembered=selections.get(place)||notebook.selected(place);active=rows.flat().find(d=>d.id===remembered)||rows[0]?.[0]||null;restore=true;}
  renderList();renderReader({restore});$('desk-undo').hidden=!notebook.canUndo();
 }
 function select(id){
  const next=notebook.get(id);if(!next||next.place!==place)return;
  activateReading();savePosition();active=next;selections.set(place,id);render({restore:true});
  if(pending&&!holdsActiveText(active,pending.drafts,pending.complete))applyPending();
 }
 function enter(roomId,{resumeDraft,passive=false}={}){
  // History may resume a supplementary FP manuscript without creating a new
  // account route. Resolve its ID through this owner, never foreign-account DOM.
  if(typeof resumeDraft==='string'){
   const saved=notebook.get(resumeDraft);
   if(saved&&saved.place===placeForRoom[roomId]){requested={place:saved.place,id:saved.id,resume:true};selections.set(saved.place,saved.id);}
  }
  send('reading-room',{active:true});
  savePosition();rememberView();passiveEntry=passive||requested?.passive===true;initialDraftId=passiveEntry?requested?.id||(typeof resumeDraft==='string'?resumeDraft:null):null;if(externalNotes&&notebook.persistent()){notebook.sync();externalNotes=false;}place=roomId==='purple'?(['choi','otoku','rakuten','lottery'].includes(requested?.place)?requested.place:'otoku'):placeForRoom[roomId];active=null;const view=requested?.id&&!requested.resume?{query:'',filter:'all'}:resumeView(views.get(place)||notebook.pref('view:'+place,null));query=view.query;filter=view.filter;$('desk-query').value=query;
  if(!passiveEntry)notebook.visit(place);$('desk-title').textContent=place==='shiire'?'仕入れの持ち場':['kyun','otoku','rakuten','lottery'].includes(place)?placeNames[place]:'保存原稿';$('desk-kicker').textContent=place==='fp'?'SCRIPTS & CONTENT':place==='shiire'?'THE MERCHANT’S DESK':'YOUR MANUSCRIPTS';
  $('desk').dataset.place=place;routes();render({restore:true});
  if(pending)applyPending();
  if(requested?.native&&embedded&&(['sourcing','watches','cards'].includes(requested.native)&&place==='shiire'||['fp','tiktok'].includes(requested.native)&&place==='fp'))native(requested.native,requested.recordId,true,requested.section);else if(place==='shiire'&&embedded)native('sourcing',undefined,true);requested=null;
 }
 function receive(payload){
  recordsAccepted=false;sourceIssue='';connected=true;$('desk-connect').hidden=true;
  setStatus(payload.message,payload);
  if(!Array.isArray(payload.drafts))return;
  const rows=payload.drafts.filter(d=>(!window.CCThreadsArchive?.enabled||window.CCThreadsArchive.acceptsSource(d))&&!window.CCSourcingArchive?.isArchivedDraft(d));
  const next={...payload,drafts:rows};conveniences.status(next);
  if(place&&holdsActiveText(active,rows,next.complete)){
   pending=next;$('desk-pending').hidden=false;
   try{notebook.replaceSources(rows.filter(d=>d.id!==active.id),{complete:false});recordsAccepted=true;renderList();}catch{sourceIssue='取得した原稿の形式を確認できませんでした。';operation(sourceIssue);}
  }else{
   pending=null;$('desk-pending').hidden=true;
   const oldId=active?.id,scroll=$('desk-scroll').scrollTop;
   try{notebook.replaceSources(rows,{complete:next.complete===true});recordsAccepted=true;if(oldId)active=notebook.get(oldId);render();if(active?.id===oldId)$('desk-scroll').scrollTop=scroll;}catch{sourceIssue='取得した原稿の形式を確認できませんでした。保存済みの本文を保持しています。';operation(sourceIssue);}
  }
  board.render({message:payload.message,loading:payload.loading,complete:payload.complete});emitLiving();
 }
 function applyPending(){
  if(!pending)return;const next=pending;pending=null;$('desk-pending').hidden=true;const id=active?.id;
  try{notebook.replaceSources(next.drafts,{complete:next.complete===true});recordsAccepted=true;sourceIssue='';active=id?notebook.get(id):null;render({restore:true});operation('届いた原稿を反映しました。');}catch{recordsAccepted=false;sourceIssue='更新を反映できませんでした。保存済みの原稿を確認できます。';operation(sourceIssue);}emitLiving();
 }
 async function copy(d,kind='body',text=d.body){
  activateReading();const snapshot={...d};
  try{await navigator.clipboard.writeText(text);notebook.copied(snapshot,kind,text);const current=active?.id===snapshot.id&&active?.body===snapshot.body;if(current)renderReader();operation((current?'':'「'+snapshot.title+'」の')+(kind==='body'?'本文をコピーしました。':kind==='posting-set'?'本文・返信・投稿用リンクをまとめてコピーしました。':kind==='reply'?'自己返信をコピーしました。':'URLをコピーしました。'));onFeedback('copy');}
  catch{manual={draft:snapshot,kind,text};$('desk-copy-text').value=text;$('desk-copy-dialog').showModal();$('desk-copy-text').focus();$('desk-copy-text').select();}
 }
 function history(){
  const list=$('desk-history-list');list.replaceChildren();const account=publishingAccounts.find(a=>a.place===place),allCopies=notebook.copies();const rows=(account?copiesForAccount(allCopies,account,id=>notebook.get(id)):allCopies.filter(c=>c.place===place)).slice(0,100);
  if(!rows.length)list.append(el('p','この持ち場のコピー履歴はまだありません。'));
  for(const row of rows){const card=el('details'),summary=el('summary',row.title),body=el('pre',row.text);card.append(summary,el('small',new Date(row.time).toLocaleString('ja-JP')),body,button('もう一度コピー',()=>copy({id:row.draftId,place:row.place,title:row.title,body:row.text,source:row.source||notebook.get(row.draftId)?.source},row.kind,row.text)));list.append(card);}
  $('desk-history-dialog').showModal();
 }
 $('desk-query').addEventListener('input',e=>{savePosition();query=e.target.value;rememberView();render();});
 document.querySelectorAll('[data-desk-filter]').forEach(b=>b.addEventListener('click',()=>{savePosition();filter=b.dataset.deskFilter;rememberView();render();}));
 $('desk-copy').addEventListener('click',()=>{if(learningController)learningController.copy();else if(active)copy(active);});
 $('desk-pin').addEventListener('click',()=>{if(!active)return;notebook.toggle('pin',active.id);operation(notebook.flag('pin',active.id)?'お気に入りに保存しました。':'お気に入りを解除しました。');onFeedback(notebook.flag('pin',active.id)?'pin':'unpin');render();});
 $('desk-done').addEventListener('click',()=>{if(!active)return;savePosition();notebook.finish(active);operation('端末の読了履歴に記録しました。');onFeedback('done');onHome();});
 $('desk-undo').addEventListener('click',()=>{try{notebook.undo();render();operation('直前の操作を元に戻しました。');}catch(error){operation(error.message);}});
 $('desk-history').addEventListener('click',history);$('desk-history-close').addEventListener('click',()=>$('desk-history-dialog').close());
 $('desk-copy-close').addEventListener('click',()=>$('desk-copy-dialog').close());
 $('desk-copy-manual').addEventListener('click',()=>{if(manual){notebook.copied(manual.draft,manual.kind,manual.text);manual=null;renderReader();operation('コピー履歴に記録しました。');onFeedback('copy');}$('desk-copy-dialog').close();});
 $('desk-copy-dialog').addEventListener('close',()=>manual=null);
 $('desk-pending').addEventListener('click',applyPending);
 $('desk-refresh').addEventListener('click',()=>{if(!embedded){window.top.location.href=productionURL;return;}setStatus('保存原稿を読み込み中…',{loading:true});send('refresh');});
 $('desk-read')?.addEventListener('click',()=>{const scroll=$('desk-scroll'),room=$('room');room.scrollTo({top:room.scrollTop+scroll.getBoundingClientRect().top-room.getBoundingClientRect().top-16,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'instant':'smooth'});scroll.focus({preventScroll:true});});
 $('desk-focus').addEventListener('click',()=>{const focused=$('room').classList.toggle('desk-focused');$('desk-focus').setAttribute('aria-pressed',String(focused));notebook.setPref('loungeFocus',focused);});
 $('room').classList.toggle('desk-focused',notebook.pref('loungeFocus',false));$('desk-focus').setAttribute('aria-pressed',String(notebook.pref('loungeFocus',false)));
 $('desk-font').value=notebook.pref('font','standard')==='large'?'large':'standard';document.body.dataset.readingFont=$('desk-font').value;
 $('desk-font').addEventListener('change',()=>{document.body.dataset.readingFont=$('desk-font').value;notebook.setPref('font',$('desk-font').value);});
 $('desk-scroll').addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(savePosition,180);},{passive:true});
 // Preserve the host's established shortcuts when focus is inside this iframe.
 // Text fields keep their own editing keys; native() uses the existing trusted bridge.
 window.addEventListener('keydown',event=>{
  const target=event.target;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))return;
  const key=String(event.key).toLowerCase();if(key!=='f1'&&!(event.altKey&&['f','v','a','j','h','r','c'].includes(key)))return;
  event.preventDefault();event.stopImmediatePropagation();if(key==='h')onHome();else native(({r:'daily',c:'cooney'})[key]||'settings');
 },true);
 $('manage').addEventListener('click',()=>{$('settings').close();native('settings');});
 for(const [action,label] of [['daily','作業日報'],['cooney','クーニー'],['shiire','仕入れ命'],['watches','海外時計'],['cards','カード']])$('service-links').append(button(label,()=>{$('settings').close();native(action);}));
 window.addEventListener('message',event=>{
  if(!embedded||!trustedMessage(event,origin,window.parent))return;const m=event.data;
  if(m.type==='records')receive(m);
  if(m.type==='status'){connected=true;setStatus(m.message,{loading:m.loading!==false});conveniences.status({loading:m.loading!==false,complete:false});if(!active)render();}
  if(m.type==='pause'){savePosition();onPause();}
  if(m.type==='resume'){if(autoReturn){autoReturn=false;onHome();}onResume();}
  if(m.type==='install-state')conveniences.installState(m);
  if(m.type==='later-context')conveniences.nativeLater(m.context);
  if(m.type==='search-open')conveniences.showSearch();
  if(m.type==='reading-settings')onSettings();
  if(m.type==='working-chapter'&&document.body.classList.contains('storybook-workbench')&&['insurance','otoku','rakuten','lottery','sourcing'].includes(m.key)){autoReturn=false;onWorkingChapter(m.key);}
  if(m.type==='interaction'&&['tap','paper','latch','back','door'].includes(m.kind))onFeedback(m.kind,'orange');
  if(m.type==='reading-copy'&&m.event){notebook.inheritCopy(m.event,m.event.eventId);render();}
  if(m.type==='host-update'){operation('管理画面の更新があります。');}
 });
 window.addEventListener('pagehide',savePosition);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
 window.addEventListener('storage',e=>{if(e.key?.startsWith('castle-production.v1.')){externalNotes=true;emitLiving();operation('別の画面で読書メモが更新されました。部屋に入り直すと反映します。');}});
 if(!embedded){$('desk-connect').hidden=false;setStatus('本体から開くと、ログイン中の保存原稿・履歴・仕入れ管理を使えます。');}
 const living={setSummarizer(fn){if(typeof fn!=='function')throw TypeError('A room summarizer is required');summarizeLivingRooms=fn;emitLiving();},snapshot:livingSnapshot,subscribe(listener){livingSubscribers.add(listener);listener(livingSnapshot());return()=>livingSubscribers.delete(listener);},
  openDraft(id){const account=publishingAccounts.find(a=>a.place===place),row=account&&draftsForAccount(notebook.all(),account).find(d=>d.id===id);if(!row)return false;if(active?.id===id)return true;query='';filter='all';$('desk-query').value='';rememberView();select(id);return true;},
  history,read:()=>$('desk-read').click(),applyPending:()=>{if(!pending)return false;activateReading();applyPending();return true;},hasPending:()=>!!pending
 };
 return {living,accountBoard:board,requestWorkingChapter,enter,leave:()=>{send('reading-room',{active:false});savePosition();rememberView();place=null;active=null;nativeWork=null;passiveEntry=false;initialDraftId=null;conveniences.update(null);emitLiving();if(pending)applyPending();if(returnToAccounts)board.show();},native,ready:()=>{if(embedded){setStatus('本体の保存原稿に接続しています…',{loading:true});send('ready');}},receive,notebook,workMarks:conveniences.workMarks};
}
