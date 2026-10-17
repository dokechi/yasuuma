/* Narrow, reversible workspace presentation. No source records, auth, API or persistence changes. */
(function(root,factory){
 'use strict';
 const model=factory();
 if(typeof module==='object'&&module.exports)module.exports=model;
 else{root.CCRpgWorkspaceModel=model;mount(root,model);}
 function mount(w,M){
  const d=w.document,H=w.CCHome;if(!d||!H||w.CCRpgWorkspaces)return;
  const by=id=>d.getElementById(id),make=(tag,text)=>{const el=d.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const button=(text,fn)=>{const el=make('button',text);el.type='button';el.className='push-button';el.addEventListener('click',fn);return el;};
  let mode='daily',dialog=null,opener=null;
  function setMode(value){mode=value==='archive'?'archive':'daily';d.body.dataset.rpgScope=mode;sync();return mode;}
  function close(){dialog?.close();}
  function home(){close();setMode('daily');w.CCRpgHome?.showRpg();}
  function activate(selector,{archive=false}={}){const el=d.querySelector(selector);if(!el)return false;close();setMode(archive?'archive':'daily');el.click();return true;}
  function openView(view,archive=false){if(typeof load!=='function')return false;close();if(H.active)H.leave?.();setMode(archive?'archive':'daily');load(view);return true;}
  function openSourcing(){return activate('#commandHome [data-home-action="sourcing-queue"]');}
  function openWatches(){return activate('#redditViewBtn');}
  function openCards(){return activate('#xViewBtn');}
  function openFp(){return activate('#fpDraftViewBtn');}
  function openService(key){const id={daily:'menuDaily',cooney:'menuCooney',shiire:'menuShiireInochi'}[key];return id?activate('#'+id):false;}
  function original(){close();w.CCCastle?.show();}
  const regular=new Set(['active','history','accepted','rejected','saved','events']);
  if(typeof scopedItems==='function'){
   const previous=scopedItems;
   scopedItems=function(){const rows=previous.apply(this,arguments);return mode==='daily'&&regular.has(app.view)?M.dailyItems(rows):rows;};
  }
  if(typeof renderStats==='function'){
   const previous=renderStats;
   renderStats=function(){const result=previous.apply(this,arguments);if(mode==='daily'&&regular.has(app.view)){
    const rows=scopedItems();by('kpiLabelCount').textContent='読込済みの日常対象';by('kpiLabelStored').textContent='読取範囲内（全件数ではありません）';by('kpiStored').textContent=rows.length+'件';
   }return result;};
  }
  if(typeof renderListFilter==='function'){
   const previous=renderListFilter;
   renderListFilter=function(){const result=previous.apply(this,arguments);if(mode==='daily'&&regular.has(app.view)){
    const el=by('listFilter'),note=make('span','読込範囲内の件数（signals 最大100件）。家・上場原稿は保管庫。');note.className='rpg-scope-note';el.querySelector('.rpg-scope-note')?.remove();
    // Existing storedCount refers to the full source, so never present it as a filtered daily count.
    el.querySelectorAll('.purchase-note').forEach(n=>n.remove());el.append(note);el.hidden=false;
   }return result;};
  }
  if(typeof renderTaskResults==='function'){
   const previous=renderTaskResults;
   renderTaskResults=function(){if(mode==='archive')return previous.apply(this,arguments);
    const rows=scopedItems();by('listCaption').textContent='保存結果（家・上場原稿は保管庫）';by('visibleCount').textContent=rows.length+'件（読取範囲内）';
    by('list').innerHTML=resultTaskIndexHtml()+'<p class="purchase-note">読込範囲内の保存結果。家・上場原稿は保管庫。</p>'+(rows.length?'<div class="thread-list">'+rows.map(eventCardHtml).join('')+'</div>':'<div class="empty">この読取範囲に対象の結果はありません。</div>')+(resultPage.nextOffset!==null?'<button type="button" class="push-button result-more" data-more-results '+(resultPage.busy?'disabled':'')+'>続き100件を読む</button>':'');renderStats();
   };
  }
  const shell=by('ccDestination');
  if(shell){const back=shell.querySelector('[data-home-action="home"]');if(back)back.textContent='← 司令塔';shell.classList.add('rpg-workspace-heading');const settings=button('設定・補助',openSettings);settings.classList.add('rpg-workspace-settings');shell.querySelector('.cc-heading')?.append(settings);}
  const auxiliary=make('nav');auxiliary.id='rpgSourcingAux';auxiliary.setAttribute('aria-label','仕入れの補助');
  auxiliary.append(button('仕入れ一覧',openSourcing),button('海外時計・海外差の調査',openWatches),button('カード',openCards),button('紹介用原稿・旧ねこ',()=>openView('binbo-neko')),button('投稿制作',()=>openView('affiliate')));
  const auxiliaryViews=['sourcing','reddit','x','binbo-neko','affiliate'];
  for(let index=0;index<auxiliary.children.length;index++)auxiliary.children[index].dataset.rpgAuxView=auxiliaryViews[index];
  shell?.after(auxiliary);
  // Hide its independent navigation only after the replacement route is mounted.
  if(shell&&typeof load==='function')d.body.classList.add('rpg-neko-aux-ready');
  const banner=make('div');banner.id='rpgArchiveBanner';banner.append(make('span','保管庫・元の画面を表示しています'),button('日常へ戻る',home));shell?.before(banner);
  function sync(){const view=typeof app==='undefined'?'':app.view;auxiliary.hidden=!!H.active||!['sourcing','reddit','x','binbo-neko','affiliate'].includes(view);banner.hidden=mode!=='archive';
   if(shell){shell.dataset.rpgWorkspace=view;shell.dataset.rpgDesk=view;}
   for(const el of auxiliary.children){if(!H.active&&el.dataset.rpgAuxView===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}
   const titles={fp:'FP・TikTok',sourcing:'仕入れ一覧',reddit:'海外時計',x:'カード'};if(!H.active&&titles[view]&&by('ccPageTitle'))by('ccPageTitle').textContent=titles[view];
   // The home render owns its arrays; remove only archived display rows after it runs.
   const source=[...(H.activeItems||[]),...(H.raw?.active?.items||[])];
   if(mode==='daily')by('homeOtherList')?.querySelectorAll('[data-home-item]').forEach(el=>{const row=source.find(x=>String(x.id)===el.dataset.homeItem);if(row&&M.isArchived(row))el.remove();});
  }
  d.addEventListener('cc:home-render',sync);
  d.addEventListener('keydown',event=>{if(w.CCCastle?.unified)return;if(event.altKey&&['f','v'].includes(String(event.key).toLowerCase())&&!event.target?.matches?.('input,textarea,select,[contenteditable="true"]'))setMode('archive');},true);
  if(by('mainWindow'))new w.MutationObserver(sync).observe(by('mainWindow'),{attributes:true,attributeFilter:['data-cc-view']});
  // Restore daily filtering when leaving an explicitly opened old screen for a current workspace.
  d.addEventListener('click',event=>{const el=event.target.closest?.('button');if(!el)return;
   if(el.matches('[data-rpg-tools]')){event.preventDefault();event.stopImmediatePropagation();openSettings();return;}
   if(el.matches('#homeViewBtn,#ccRpgLegacyReturn,[data-home-action="home"],[data-rpg-account],[data-rpg-sourcing]'))setMode('daily');
  },true);
  function beginDialog(title){if(dialog)close();opener=d.activeElement;const current=make('dialog');current.className='rpg-workspace-dialog';const heading=make('h2',title);heading.id='rpgWorkspaceDialogTitle';current.setAttribute('aria-labelledby',heading.id);current.append(heading,button('閉じる',()=>current.close()));d.body.append(current);dialog=current;current.addEventListener('close',()=>{current.remove();if(dialog===current)dialog=null;opener?.focus?.();});current.showModal();return current;}
  function group(host,title,buttons){const section=make('section'),heading=make('h3',title),grid=make('div');grid.className='rpg-workspace-links';section.append(heading,grid);for(const [label,fn] of buttons)grid.append(button(label,fn));host.append(section);}
  function openSettings(){const host=beginDialog('設定・補助');host.append(make('p','仕入れに関係する情報・履歴は、日常の画面から引き続き開けます。'));
   group(host,'仕入れと制作',[['仕入れ一覧',openSourcing],['海外時計・海外差の調査',openWatches],['カード',openCards],['紹介用原稿・旧ねこ',()=>openView('binbo-neko')],['投稿制作',()=>openView('affiliate')],['既存FP原稿',()=>activate('#fpDraftViewBtn')]]);
   group(host,'別サービス',[['作業日報',()=>openService('daily')],['クーニー',()=>openService('cooney')],['仕入れ命',()=>openService('shiire')]]);
   group(host,'情報・保管庫',[['すべての情報（日常）',()=>{if(typeof app!=='undefined')app.domain='all';openView('active');}],['保存結果・調査履歴',()=>{if(typeof app!=='undefined')app.domain='all';openView('events');}],['家・上場の保管庫',openArchive],['依頼の進捗・定期監視',()=>activate('#menuTasks')],['ログアウト',()=>activate('#fileLogout')]]);
  }
  function records(){let current=[];try{current=app.items||[];}catch(_){}return M.unique([...(H.raw?.active?.items||[]),...(H.activeItems||[]),...(H.houseItems||[]),...current]);}
  function openArchive(){const host=beginDialog('家・上場原稿の保管庫');host.append(make('p','明示的な分類・タスクIDで家・上場原稿と分かる記録だけを、日常表示から分離しています。削除や保存状態の変更はしません。仕入れと分類未確認の情報は日常に残します。'));
   group(host,'元の原稿画面',[['家の原稿',()=>activate('#houseDraftViewBtn',{archive:true})],['上場の原稿',()=>openView('career',true)],['全保存結果を元の画面で読む',()=>{if(typeof app!=='undefined')app.domain='all';openView('events',true);}]]);
   host.append(make('p','ここで検索できるのは読込済みの記録だけです。signals は既存APIの最大100件で、全件を網羅しません。保存結果の元画面では「さらに読む」で task-events の続きも取得できます。'));
   const label=make('label','読込済みの保管記録を検索'),query=make('input');query.type='search';label.append(query);host.append(label);const status=make('p');status.setAttribute('role','status');const list=make('div');host.append(status,list);
   function render(){const rows=M.archiveItems(records()).filter(x=>JSON.stringify(x).toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()));status.textContent='この読取範囲の該当 '+rows.length+'件';list.replaceChildren();for(const row of rows){const details=make('details');details.append(make('summary',row.title||row.id||'保存記録'),make('pre',JSON.stringify(row,null,2)));list.append(details);}if(!rows.length)list.append(make('p','この読取範囲には該当する記録がありません。元の原稿画面からも確認できます。'));}query.addEventListener('input',render);render();
  }
  w.CCRpgWorkspaces={openSettings,openSourcing,openWatches,openCards,openFp,openService,openArchive,close,home,showOriginal:original,setMode,get mode(){return mode;},model:M};setMode('daily');sync();
 }
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const HOUSE_TASK_IDS=new Set(['6aa77eb5ce7881919d8dc62554833b60','6aa9edd177fc8191a1e4b665930ee071']);
 const CAREER_TASK_IDS=new Set(['6aaca7d36874819181caec8ba014556e']);
 function payload(item){const p=item?.payload??item?.sourcePayload?.event?.payload??item?.source_payload?.event?.payload;try{return typeof p==='string'?JSON.parse(p):p&&typeof p==='object'?p:{};}catch(_){return {};}}
 function taskIds(item){const p=payload(item);return [item?.taskId,item?.task_id,item?.sourceTaskId,item?.source_task_id,p.taskId,p.task_id,p.logical_task_id,p.source_task_id,String(item?.id||'').match(/^(?:sns:)*task:([a-zA-Z0-9-]+):/)?.[1]].filter(x=>typeof x==='string');}
 function classify(item){const p=payload(item);if(item?.domain==='sourcing'||p.domain==='sourcing'||['sourcing_candidate','sourcing_purchase','sourcing_inventory','sourcing_sale'].includes(p.content_type))return 'sourcing';
  const ids=taskIds(item);if(p.content_type==='house_post_candidate'||p.category==='house_living'||ids.some(id=>HOUSE_TASK_IDS.has(id)))return 'house';
  if(p.content_type==='career_post_candidate'||p.category==='career_large'||ids.some(id=>CAREER_TASK_IDS.has(id)))return 'career';return 'daily';
 }
 const isArchived=item=>['house','career'].includes(classify(item)),isDaily=item=>!isArchived(item);
 const dailyItems=items=>(Array.isArray(items)?items:[]).filter(isDaily),archiveItems=items=>(Array.isArray(items)?items:[]).filter(isArchived);
 function unique(items){const seen=new Set();return items.filter(x=>{if(!x||typeof x!=='object')return false;const id=x.id?String(x.id).replace(/^(sns:)+/,''):null;if(id&&seen.has(id))return false;if(id)seen.add(id);return true;});}
 return Object.freeze({payload,taskIds,classify,isArchived,isDaily,dailyItems,archiveItems,unique});
});
