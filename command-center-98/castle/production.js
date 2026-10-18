// The host owns authentication and original write workflows. Only normalized reading copies cross this bridge.
export function createProductionClient({notebook,getState,refresh,openPlace,home,onStatus,onPause,onResume}){
 const w=window,d=document,embedded=!!w.parent&&w.parent!==w,origin=w.location?.origin;let pending=null,paused=false,reading=false,received=false,heldId=null;
 const $=s=>d.querySelector(s),button=(text,fn)=>{const b=d.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;};
 if(!$('#productionTools'))return {};
 const send=(type,extra={})=>{if(embedded)w.parent.postMessage({channel:'cc-castle-v1',type,...extra},origin);};
 function native(action,recordId){if(embedded)send('native',{action,...(typeof recordId==='string'&&recordId&&recordId.length<=500?{recordId}:{})});else w.location.href='../app-v130.html?v=131';}
 const labels={kyun:'投稿結果・価格を確認',choi:'投稿結果・価格を確認',fp:'FPの台本・画像を編集',shiire:'購入・在庫'};
 const candidates=button('候補',()=>{openPlace('shiire');$('#draft').focus();});candidates.hidden=true;
 const direct=button(labels.kyun,()=>{const state=getState(),action={fp:'fp',shiire:'sourcing'}[state.place]||state.place,source=state.draft?.source;native(action,source?.account===action?source.id:undefined);});direct.id='productionNative';const refreshButton=button('原稿を更新',()=>{if(embedded){setStatus('原稿を読み込み中…',{loading:true});current();}send('refresh');});refreshButton.id='productionRefresh';$('#productionTools').append(candidates,direct,refreshButton);
 const status=$('#productionStatus'),notice=$('#productionNotice');let statusLevel='idle',statusTimer=null,statusEpoch=0,pendingEpoch=0;
 function setStatus(message,{loading=false,complete=false}={}){
  statusEpoch++;clearTimeout(statusTimer);reading=loading===true;status.textContent=message||'';
  statusLevel=/失敗|未確認|未保存|できません|エラー/.test(status.textContent)?'warning':reading?'loading':complete===true?'success':'idle';
  if(statusLevel==='success'&&notebook.persistent?.()===false)statusLevel='idle';
  if(statusLevel==='success'){const detail=status.closest?.('details');if(detail)detail.open=false;statusTimer=setTimeout(()=>{statusLevel='idle';current();},1900);}
 }
 function current(){const s=getState();candidates.hidden=s.place!=='shiire';candidates.setAttribute('aria-current',String(s.place==='shiire'));if(pending&&(s.view==='home'||!s.draft||s.draft.id!==heldId)){apply();return;}direct.textContent=labels[s.place];const draft=s.draft;if(!draft&&(embedded||received)){const title=reading?'司令塔の情報を読み込み中…':pending?'取得した情報を反映できます':'この持ち場の情報を確認';if($('#draftTitle').textContent!==title)$('#draftTitle').textContent=title;const message=status.textContent||'「原稿を更新」で保存先の情報を確認できます。';if($('#draftBody').textContent!==message)$('#draftBody').textContent=message;}const warning=statusLevel==='warning';const detail=status.closest?.('details');if(detail){detail.dataset.level=warning?'warning':pending&&!reading?'pending':statusLevel;if(warning)detail.open=true;}$('#productionSummary').textContent=warning?'原稿の状態を要確認':reading?'原稿を読込中…':pending?'原稿の更新待ち':statusLevel==='success'?'保存原稿を反映しました':'保存原稿の状態';$('#productionSummary').setAttribute('aria-label',$('#productionSummary').textContent);$('#productionSummary').title=$('#productionSummary').textContent;if(draft?.source)$('#sampleNote').textContent='本番の保存原稿の読取コピー · '+(draft.source.status||draft.source.label)+'。編集すると端末の別原稿を作成します。';$('#return').title='端末の読了履歴に記録します。投稿済み・購入済みには変更しません。';}
 function apply(){if(!pending)return;const payload=pending,latest=pendingEpoch===statusEpoch;pending=null;heldId=null;try{notebook.replaceSources(payload.drafts,{complete:payload.complete});}catch{setStatus('原稿の形式を確認できませんでした。保存済みの原稿は保持しています。');current();return;}refresh();notice.hidden=true;if(latest)setStatus(payload.message,payload);current();}
 function receive(payload){received=true;setStatus(payload.message,payload);const before=JSON.stringify(notebook.sources()),after=JSON.stringify(payload.drafts);if(before===after){pending=null;heldId=null;notice.hidden=true;current();return;}pending=payload;pendingEpoch=statusEpoch;
  const active=getState().draft,incoming=payload.drafts.find(row=>row.id===active?.id);
  const unchanged=active&&incoming&&['title','body','link','kind'].every(key=>(active[key]||'')===(incoming[key]||''))&&(active.source?.status||'')===(incoming.source?.status||'');
  if(getState().view==='home'||!active||!active.source||unchanged){apply();}else{heldId=active.id;
   // New records in other rooms are immediately available; only the text being
   // read is held for explicit acceptance, including a complete-snapshot removal.
   try{notebook.replaceSources(payload.drafts.filter(row=>row.id!==active.id),{complete:false});}catch{}
   clearTimeout(statusTimer);if(statusLevel!=='warning'&&!reading)statusLevel='pending';notice.hidden=false;notice.textContent='読んでいる原稿の更新を反映';current();}

 }
 notice.addEventListener('click',apply);
 w.addEventListener('keydown',event=>{const target=event.target;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))return;const key=String(event.key).toLowerCase();if(key!=='f1'&&!(event.altKey&&['f','v','a','j','h','r','c'].includes(key)))return;event.preventDefault();event.stopImmediatePropagation();if(key==='h')home();else native(({r:'daily',c:'cooney'})[key]||'settings');},true);
 w.addEventListener('message',event=>{const m=event.data;if(!embedded||event.origin!==origin||event.source!==w.parent||m?.channel!=='cc-castle-v1')return;
  if(m.type==='host-update'){let b=d.getElementById('hostUpdate');if(!b){b=button('管理画面アプリ更新',()=>{send('apply-host-update');});b.id='hostUpdate';$('#productionTools').append(b);}}
  if(m.type==='records'&&Array.isArray(m.drafts))receive(m);if(m.type==='status'){setStatus(m.message,{loading:m.loading!==false});current();}
  if(m.type==='reading-settings'){document.getElementById('settingsOpen')?.click();}
  if(m.type==='reading-copy'&&m.event){notebook.inheritCopy(m.event,m.event.eventId);refresh();}
  if(m.type==='pause'){paused=true;$('#app').classList.add('is-away');onPause();}
  if(m.type==='resume'){paused=false;$('#app').classList.remove('is-away');onResume();}
 });
 d.querySelector('.original')?.addEventListener('click',e=>{e.preventDefault();native('classic');});
 for(const [key,label]of [['watches','海外時計'],['cards','カード'],['daily','作業日報'],['cooney','クーニー'],['shiire','仕入れ命']])$('#productionShortcuts').append(button(label,()=>native(key)));
 d.addEventListener('click',()=>Promise.resolve().then(current));
 const obs=typeof MutationObserver!=='undefined'?new MutationObserver(current):null;obs?.observe($('#draftTitle'),{childList:true});
 if(embedded){setStatus('本番の保存原稿に接続しています…',{loading:true});send('ready');}else status.textContent='保存済み原稿の読書机。最新情報・投稿結果・仕入れ管理は司令塔で確認できます。';
 current();return {receive,apply,native,get pending(){return pending;},get paused(){return paused;}};
}
