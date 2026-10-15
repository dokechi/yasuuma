// The host owns authentication and original write workflows. Only normalized reading copies cross this bridge.
export function createProductionClient({notebook,getState,refresh,openPlace,home,onStatus,onPause,onResume}){
 const w=window,d=document,embedded=!!w.parent&&w.parent!==w,origin=w.location?.origin;let pending=null,first=true,paused=false;
 const $=s=>d.querySelector(s),button=(text,fn)=>{const b=d.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;};
 if(!$('#productionTools'))return {};
 const send=(type,extra={})=>{if(embedded)w.parent.postMessage({channel:'cc-castle-v1',type,...extra},origin);};
 function native(action){if(embedded)send('native',{action});else w.location.href='../app-v130.html?v=131';}
 const labels={kyun:'投稿結果・価格を確認',choi:'投稿結果・価格を確認',fp:'FPの台本・画像を編集',shiire:'仕入れ・購入・在庫を管理'};
 const direct=button(labels.kyun,()=>native({fp:'fp',shiire:'sourcing'}[getState().place]||getState().place));$('#productionTools').append(direct,button('保存原稿を更新',()=>send('refresh')));
 const status=$('#productionStatus'),notice=$('#productionNotice');
 function current(){const s=getState();direct.textContent=labels[s.place];const draft=s.draft;if(draft?.source)$('#sampleNote').textContent='本番の保存原稿の読取コピー · '+(draft.source.status||draft.source.label)+'。編集すると端末の別原稿を作成します。';$('#return').title='端末の原稿束に記録します。投稿済み・購入済みには変更しません。';}
 function apply(){if(!pending)return;const payload=pending;pending=null;try{notebook.replaceSources(payload.drafts,{complete:payload.complete});}catch{status.textContent='原稿の形式を確認できませんでした。保存済みの原稿は保持しています。';onStatus(status.textContent);return;}refresh();notice.hidden=true;status.textContent=payload.message;current();onStatus('保存原稿を反映しました');}
 function receive(payload){status.textContent=payload.message||'';const before=JSON.stringify(notebook.sources()),after=JSON.stringify(payload.drafts);if(before===after){first=false;return;}pending=payload;
  if(first&&(getState().view==='home'||!getState().draft)){apply();}else{notice.hidden=false;notice.textContent='保存原稿の新着を反映（'+payload.drafts.length+'件）';}first=false;
 }
 notice.addEventListener('click',apply);
 w.addEventListener('message',event=>{const m=event.data;if(!embedded||event.origin!==origin||event.source!==w.parent||m?.channel!=='cc-castle-v1')return;
  if(m.type==='host-update'){let b=d.getElementById('hostUpdate');if(!b){b=button('司令塔を更新',()=>{send('apply-host-update');});b.id='hostUpdate';$('#productionTools').append(b);}}
  if(m.type==='records'&&Array.isArray(m.drafts))receive(m);if(m.type==='status')status.textContent=m.message;
  if(m.type==='pause'){paused=true;$('#app').classList.add('is-away');onPause();}
  if(m.type==='resume'){paused=false;$('#app').classList.remove('is-away');onResume();}
 });
 d.querySelector('.original')?.addEventListener('click',e=>{e.preventDefault();native('classic');});
 for(const [key,label]of [['sourcing','仕入れ一覧'],['watches','海外時計'],['cards','カード'],['daily','作業日報'],['cooney','クーニー'],['shiire','仕入れ命']])$('#productionShortcuts').append(button(label,()=>native(key)));
 d.addEventListener('click',()=>Promise.resolve().then(current));
 const obs=typeof MutationObserver!=='undefined'?new MutationObserver(current):null;obs?.observe($('#draftTitle'),{childList:true});
 if(embedded){send('ready');status.textContent='本番の保存原稿に接続しています…';}else status.textContent='保存済み原稿の読書机。最新情報・投稿結果・仕入れ管理は司令塔で確認できます。';
 current();return {receive,apply,native,get pending(){return pending;},get paused(){return paused;}};
}
