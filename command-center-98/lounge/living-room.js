/* Optional room objects. All records and actions remain owned by the reader.
   No fetch, persistence, source writes, timers, or generated character dialogue. */
export function installLivingRoom({document:doc=globalThis.document,controller,spatialDesk,scene}={}) {
 const win=doc.defaultView,room=doc.getElementById('room'),paper=doc.getElementById('desk');
 if(!controller?.subscribe||!spatialDesk?.openShelf||!room||!paper)throw Error('Living tools need the existing reader.');
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(cls,text,action)=>{const n=make('button',cls,text);n.type='button';n.addEventListener('click',action);return n;};
 let snapshot=controller.snapshot(),key=null,view='reader',destroyed=false,previousInert=false,previousAria=null,readerFocus=null,dialogKind=null,dialogOrigin=null,dialogGeneration=0;
 const toggle=button('living-toggle','道具',()=>showTools(view!=='tools'));
 toggle.setAttribute('aria-controls','living-workbench');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','部屋の道具を開く');
 const bench=make('section','living-workbench');bench.id='living-workbench';bench.hidden=true;bench.setAttribute('aria-label','部屋の道具');
 const header=make('header','living-briefing'),eyebrow=make('small','','持ち場メモ'),heading=make('h3'),brief=make('p','live-summary'),scope=make('p','live-scope');
 const returnButton=button('living-reader-return','本文へ戻る',()=>showTools(false,{focusReader:true}));
 header.append(eyebrow,heading,brief,scope,returnButton);
 const objects=make('div','living-objects');
 const objectMap=new Map();
 for(const [id,title,action] of [
  ['shelf','原稿の本棚',()=>spatialDesk.openShelf()],
  ['notice','伝言板',()=>showRecords('notice')],
  ['desk','机の原稿',()=>showTools(false,{focusReader:true})],
  ['chest','お気に入りの箱',()=>showRecords('chest')]
 ]){const b=button('living-object','',action);b.dataset.object=id;b.dataset.feedback=id==='chest'?'latch':'paper';const art=make('span','living-object-art');art.setAttribute('aria-hidden','true');for(const cls of ['living-art-back','living-art-front','living-art-detail'])art.append(make('i',cls));const label=make('strong','',title),detail=make('span','living-object-detail');b.append(art,label,detail);if(id!=='desk'){b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls',id==='shelf'?'spatial-shelf-dialog':'living-record-dialog');}objects.append(b);objectMap.set(id,{button:b,detail});}
 const footer=make('footer','living-bench-footer'),history=button('living-copy-history','コピー履歴',()=>controller.history()),local=make('p','','読了・投稿済みは、この端末のメモです。');footer.append(history,local);bench.append(header,objects,footer);
 const dialog=make('dialog','living-dialog');dialog.id='living-record-dialog';dialog.setAttribute('aria-labelledby','living-record-title');
 const dh=make('header','living-dialog-heading'),dt=make('h2');dt.id='living-record-title';const close=button('','閉じる',()=>closeRecords());close.setAttribute('aria-label','部屋の記録を閉じる');dh.append(dt,close);
 const note=make('p','living-dialog-note'),records=make('div','living-records'),actions=make('div','living-dialog-actions');dialog.append(dh,note,records,actions);
 const current=()=>snapshot.rooms.find(r=>r.key===key);
 const factualText=(node,text)=>{node.replaceChildren(...String(text).split(/(\d+本)/).filter(Boolean).map(part=>/^\d+本$/.test(part)?make('span','living-count-unit',part):doc.createTextNode(part)));};
 function restorePaper(){paper.inert=previousInert;if(previousAria===null)paper.removeAttribute('aria-hidden');else paper.setAttribute('aria-hidden',previousAria);}
 function showTools(show,{focusReader=false,focus=true}={}){
  if(destroyed||!key||room.hidden)return false;
  spatialDesk.closeShelf();spatialDesk.closeRoomPicker({restoreFocus:false});
  room.querySelector('.spatial-work')?.removeAttribute('open');
  if(show&&view!=='tools'){
   readerFocus=doc.activeElement;previousInert=paper.inert;previousAria=paper.getAttribute('aria-hidden');paper.inert=true;paper.setAttribute('aria-hidden','true');
   view='tools';room.dataset.livingView='tools';bench.hidden=false;bench.scrollTop=0;toggle.textContent='本文';toggle.setAttribute('aria-label','本文へ戻る');toggle.setAttribute('aria-expanded','true');
   if(focus)returnButton.focus({preventScroll:true});
  }else if(!show&&view==='tools'){
   closeRecords({focus:false});view='reader';bench.hidden=true;delete room.dataset.livingView;restorePaper();toggle.textContent='道具';toggle.setAttribute('aria-label','部屋の道具を開く');toggle.setAttribute('aria-expanded','false');
   if(focus)(focusReader?doc.getElementById('desk-scroll'):readerFocus?.isConnected&&!readerFocus.closest('.living-workbench')?readerFocus:toggle)?.focus({preventScroll:true});
  }
  return true;
 }
 function closeRecords({focus=true}={}){
  const origin=dialogOrigin;dialogOrigin=null;dialogKind=null;++dialogGeneration;
  if(dialog.open)dialog.close();
  if(focus&&key&&view==='tools'&&origin?.isConnected)origin.focus({preventScroll:true});
 }
 function showRecords(kind){
  if(!key||!current())return;
  closeRecords({focus:false});dialogKind=kind;dialogOrigin=objectMap.get(kind).button;renderRecords();dialog.showModal();close.focus({preventScroll:true});
 }
 function renderRecords(){
  const data=current();if(!data||!dialogKind)return;
  const focusNode=doc.activeElement,focused=focusNode?.dataset?.livingDraft,focusedAction=focusNode?.classList?.contains('living-apply-update'),restoreFocus=records.contains(focusNode)||actions.contains(focusNode),scroll=records.scrollTop;
  dt.textContent=dialogKind==='chest'?'お気に入りの箱':'持ち場の伝言板';
  note.textContent=(dialogKind==='chest'?'星を付けた、このアカウントの保存原稿です。':data.notice)+' '+data.scopeNote;
  records.replaceChildren();actions.replaceChildren();
  const rows=dialogKind==='chest'?data.favoriteDrafts:data.unreadDrafts;
  if(!rows.length)records.append(make('p','living-empty',dialogKind==='chest'?'この端末のお気に入りはまだありません。本文の「☆」から残せます。':data.pendingUpdate?'届いた更新は、下のボタンで確認できます。':'いま開ける未読・更新の原稿はありません。保存先の確認状況は上に表示しています。'));
  for(const row of rows){const b=button('living-record','',()=>{if(controller.openDraft(row.id)){closeRecords({focus:false});showTools(false,{focusReader:true});}else{note.textContent='この保存原稿は現在の持ち場に見つかりません。原稿棚で確認してください。';}});b.dataset.livingDraft=row.id;b.append(make('strong','',row.title),make('span','',row.kind+' · '+data.name+' '+data.handle));records.append(b);}
  if(dialogKind==='notice'){
   if(data.pendingUpdate)actions.append(button('living-apply-update','届いた更新を読む',()=>{if(controller.applyPending()){closeRecords({focus:false});showTools(false,{focusReader:true});}}));
   actions.append(make('p','living-local-marks',data.labels.read+' / '+data.labels.posted+'。コピーしただけでは投稿済みになりません。'));
  }
  records.scrollTop=scroll;
  if(restoreFocus){const target=focused?[...records.querySelectorAll('[data-living-draft]')].find(b=>b.dataset.livingDraft===focused):focusedAction?actions.querySelector('.living-apply-update'):null;(target||close).focus({preventScroll:true});}
 }
 function render(){
  scene?.setLivingStatus?.(snapshot);
  const data=current();if(!data)return;
  heading.textContent=data.name;factualText(brief,data.briefing);scope.textContent=data.scopeNote;bench.dataset.state=data.state;bench.dataset.light=data.light;
  objectMap.get('desk').detail.textContent=data.current?.title||'原稿棚から、読む原稿を選べます';
  factualText(objectMap.get('shelf').detail,data.labels.shelf);factualText(objectMap.get('chest').detail,data.labels.favorites);factualText(objectMap.get('notice').detail,data.labels.notice);
  for(const [id,value]of objectMap)value.button.setAttribute('aria-label',value.button.querySelector('strong').textContent+'。'+value.detail.textContent);
  if(dialog.open)renderRecords();
 }
 function cleanupRoom(){
  closeRecords({focus:false});
  if(view==='tools'){restorePaper();view='reader';}
  delete room.dataset.livingView;bench.hidden=true;toggle.textContent='道具';toggle.setAttribute('aria-label','部屋の道具を開く');toggle.setAttribute('aria-expanded','false');
  // Existing history is owned by the reader; dismiss its old-room context too.
  const h=doc.getElementById('desk-history-dialog');if(h?.open)h.close();
  key=null;readerFocus=null;bench.scrollTop=0;toggle.remove();bench.remove();dialog.remove();
 }
 function sync(){
  const next=!room.hidden&&room.dataset.spatialDesk==='ready'&&snapshot.rooms.some(r=>r.key===room.dataset.account&&r.key!=='sourcing')?room.dataset.account:null;
  if(next!==key){cleanupRoom();key=next;if(next){room.querySelector('.room-caption')?.append(toggle);room.append(bench,dialog);}}
  render();
 }
 const unsub=controller.subscribe(value=>{snapshot=value;sync();});
 const observer=new win.MutationObserver(sync);observer.observe(room,{attributes:true,attributeFilter:['hidden','data-account','data-spatial-desk']});
 const onClose=()=>{if(dialog.open)return;const generation=dialogGeneration;win.queueMicrotask(()=>{if(!dialog.open&&generation===dialogGeneration)closeRecords();});};dialog.addEventListener('close',onClose);
 const onKey=event=>{if(event.key==='Escape'&&view==='tools'&&!doc.querySelector('dialog[open]')){event.preventDefault();event.stopImmediatePropagation();showTools(false);}};
 doc.addEventListener('keydown',onKey,true);
 // Existing shelf selection commits through its owner, then returns to paper.
 const shelfSelect=event=>{if(view==='tools'&&event.target.closest?.('#spatial-shelf-dialog .manuscript-card'))win.queueMicrotask(()=>showTools(false,{focusReader:true}));};doc.addEventListener('click',shelfSelect,true);
 const explicitRead=event=>{if(view==='tools'&&event.target.closest?.('#desk-read'))showTools(false,{focusReader:true});};doc.addEventListener('click',explicitRead);
 sync();return {showTools,closeRecords,destroy(){if(destroyed)return;destroyed=true;unsub();observer.disconnect();doc.removeEventListener('keydown',onKey,true);doc.removeEventListener('click',shelfSelect,true);doc.removeEventListener('click',explicitRead);cleanupRoom();}};
}
