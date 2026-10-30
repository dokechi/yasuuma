import {createHallTools} from './hall-tools.js?v=20261030.2-otoku';
import {placeNames} from './desk-model.js?v=20261030.2-otoku';
import {roomForPlace,revision,seenRevision,unreadGroups,postingSteps,postingReadiness,postingText,currentPosted,savedLinks} from './qol-model.js?v=20261030.2-otoku';
import {postingAssets} from './notebook.js?v=20261030.2-otoku';

export function createConveniences({notebook,open,copy,native,onFeedback=()=>{},send=()=>{}}){
 const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 let current=null,selectedLater='',postDraft=null,latest=[],readState='unknown',install={state:'instructions'};
 let imageController=null,imageKey='';
 const tools=el('div',undefined,'lounge-conveniences'),resume=button('',()=>{const c=notebook.pref('lastWork',null);if(c)open({...c,resume:true});}),tray=button('あとで箱',()=>showTray());resume.id='lounge-resume';tray.id='lounge-later';tools.append(resume,tray);document.querySelector('.town-footer').prepend(tools);
 const hall=createHallTools({notebook,open,copy,showTray,onFeedback});const search=button('全体検索',()=>hall.showSearch());search.id='lounge-search';tools.append(search);
 const deskSearch=button('全体検索',()=>hall.showSearch());$('desk-footer-tools').append(deskSearch);
 const trayInDesk=button('あとで箱',()=>showTray());$('desk-footer-tools').append(trayInDesk);
 const later=button('あとで考える',()=>{if(!current)return;add(current);showTray(current.id);}),post=button('投稿セット',()=>{if(!current)return;postDraft={...current};renderPost();$('posting-dialog').showModal();});
 later.id='desk-later';post.id='desk-posting';$('reader-qol').append(post,later);
 function items(){const saved=notebook.pref('laterItems',{});for(const d of notebook.all())if(notebook.flag('tray',d.id)&&!saved[d.id])saved[d.id]={draft:d,memo:'',time:1};return Object.values(saved).filter(x=>x?.draft&&roomForPlace[x.draft.place]).sort((a,b)=>b.time-a.time);}
 function changeItems(fn){const rows=Object.fromEntries(items().map(x=>[x.draft.id,x]));fn(rows);notebook.changePref('laterItems',rows);refresh();}
 function add(d,memo=''){changeItems(rows=>{rows[d.id]={draft:JSON.parse(JSON.stringify(d)),memo:rows[d.id]?.memo||memo,time:Date.now()};});onFeedback('pin');}
 function markSeen(d){const seen=notebook.pref('seenRevisions',{});if(seen[d.id]!==seenRevision(d)){seen[d.id]=seenRevision(d);notebook.setPref('seenRevisions',seen);}}
 function status(payload){hall.receive(payload);if(Array.isArray(payload.drafts)){const map=new Map((payload.complete===true&&payload.loading!==true?[]:latest).map(d=>[d.id,d]));for(const d of payload.drafts)map.set(d.id,d);latest=[...map.values()];}readState=payload.loading?'loading':payload.complete?'complete':'unknown';refresh();}
 function refresh(){
  const last=notebook.pref('lastWork',null);resume.hidden=!last||!roomForPlace[last.place];resume.replaceChildren(el('small','前回の続き'),el('span',last?placeNames[last.place]+' · '+(last.title||'持ち場'):''));resume.title=last?.title||'';
  const count=items().length;tray.textContent='あとで箱'+(count?' · '+count:'');trayInDesk.textContent=tray.textContent;
  const seen=notebook.pref('seenRevisions',{});
  for(const [place,room]of Object.entries(roomForPlace).filter(([key])=>key!=='otoku')){const b=document.querySelector('.place-label[data-room="'+room+'"]');if(!b)continue;let badge=b.querySelector('.door-letter');if(!badge){badge=el('span',undefined,'door-letter');badge.setAttribute('aria-hidden','true');b.append(badge);}const n=unreadGroups(latest.filter(d=>d.place===place||(place==='choi'&&d.place==='otoku')),seen),unknown=readState!=='complete';badge.textContent=n?'✉':unknown?'·':'';badge.hidden=!n&&!unknown;b.dataset.unread=String(n);const message=n?'未読・更新 '+n+'件'+(unknown?'（残りの読取は確認中）':''):unknown?'原稿の読取を確認中':'未読の保存原稿なし';b.title=message;b.setAttribute('aria-label',(place==='choi'?'過去原稿':placeNames[place])+'に入る。'+message);}
  post.disabled=!current;later.disabled=!current;later.textContent=current&&items().some(x=>x.draft.id===current.id)?'あとで箱に保存済み':'あとで考える';post.hidden=!!current&&current.place==='shiire';
  if($('posting-dialog').open)renderPost();hall.refresh();
 }
 function update(d){current=d;hall.update(d);if(d){markSeen(d);}refresh();}
 function renderTray(){
  const rows=items(),list=$('later-list'),detail=$('later-detail');list.replaceChildren();detail.replaceChildren();$('later-empty').hidden=!!rows.length;$('later-undo').disabled=!notebook.canUndo();
  if(!rows.some(x=>x.draft.id===selectedLater))selectedLater=rows[0]?.draft.id||'';
  for(const row of rows){const b=button('',()=>{selectedLater=row.draft.id;renderTray();});b.dataset.laterId=row.draft.id;b.setAttribute('aria-pressed',String(selectedLater===row.draft.id));b.append(el('small',placeNames[row.draft.place]),el('strong',row.draft.title),el('span',row.memo||'理由を添えて、あとで'));list.append(b);}
  const row=rows.find(x=>x.draft.id===selectedLater);if(!row)return;const d=row.draft,live=notebook.get(d.id),label=el('label','あとで確認したいこと'),memo=el('textarea');memo.value=row.memo;memo.maxLength=500;memo.rows=3;memo.placeholder='価格を見直したい、今夜投稿する…';memo.setAttribute('aria-label','あとで確認したいこと');label.append(memo);
  memo.addEventListener('input',()=>{changeItems(rows=>{rows[d.id]={...rows[d.id],memo:memo.value.slice(0,500)};});const card=[...list.children].find(b=>b.dataset.laterId===d.id);if(card)card.lastElementChild.textContent=memo.value||'理由を添えて、あとで';});
  const summary=el('p',live?'持ち場で最新の保存内容を開けます。':'保存時点のメモです。元の項目が見つからない場合も残ります。','qol-note');
  detail.append(el('small',placeNames[d.place]),el('h3',d.title),label,summary,el('pre',d.body.slice(0,3000),'later-preview'));
  const actions=el('div',undefined,'qol-actions');actions.append(button(d.native?'この持ち場を開く':live?'この原稿を開く':'持ち場を開く',()=>{$('later-dialog').close();open({place:d.place,id:live?.id,title:d.title,native:d.native,section:d.section});}));
  actions.append(button('あとで箱から外す',()=>{if(notebook.flag('tray',d.id))notebook.toggle('tray',d.id);changeItems(rows=>delete rows[d.id]);renderTray();onFeedback('unpin');}));detail.append(actions);
 }
 function showTray(id){selectedLater=id||selectedLater;renderTray();$('later-dialog').showModal();}
 function renderPost(){
  const d=postDraft;if(!d)return;const scroll=$('posting-dialog').scrollTop;const host=$('posting-steps');host.replaceChildren();$('posting-title').textContent=d.title;
  const changed=notebook.get(d.id)&&revision(notebook.get(d.id))!==revision(d);$('posting-changed').hidden=!changed;
  const readiness=postingReadiness(d);$('posting-readiness').textContent=readiness.label;$('posting-copy-all').disabled=!!changed;
  $('posting-native').textContent=d.place==='otoku'?'出典・確認記録へ':'本体の投稿結果へ';
  $('posting-dialog').querySelector('p.qol-note:last-child').textContent=d.place==='otoku'?'完了はこの端末のメモです。コピーだけでは投稿済みになりません。':'完了はこの端末のメモです。本体の投稿結果は「本体の投稿結果へ」で記録できます。コピーだけでは投稿済みになりません。';
  const steps=postingSteps(d,notebook.copies());for(const [i,step]of steps.entries()){const row=el('div',undefined,'posting-step');row.append(el('span',step.copied?'✓':String(i+1),'step-number'),el('strong',step.label),button(step.copied?'もう一度コピー':'コピー',()=>copy(d,step.kind,step.text)));row.append(el(step.kind==='link'?'small':'pre',step.text));host.append(row);}
  if(!savedLinks(d).length&&!/https:\/\//.test(d.posting?.reply||''))host.append(el('p','この原稿には保存された商品リンクがありません。','qol-note'));
  if(readiness.commercial&&!readiness.affiliate)host.append(el('p','収益リンクは未設定です。通常の商品URLは投稿用リンクへ置き換えません。','qol-note'));
  const references=savedLinks(d).filter(x=>readiness.commercial&&x.key!=='affiliate');if(references.length){const refs=el('details'),summary=el('summary','価格・在庫の確認用リンク');refs.append(summary);for(const link of references){const a=el('a',link.label+' ↗');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';refs.append(a);}host.append(refs);}
  const images=$('posting-images');let imageApi;try{imageApi=window.parent.CCThreadsImages||window.CCThreadsImages;}catch{}
  const ref=imageApi?.binding(d),key=ref?JSON.stringify(ref):'';
  if(ref){
   if(key!==imageKey){imageController?.destroy();images.replaceChildren();imageKey=key;imageController=imageApi.mount(images,ref,{onSaved:data=>{postDraft={...postDraft,posting:{...postDraft.posting,images:postingAssets({images:data.manifest.images}).images}};},onCount:count=>{$('posting-readiness').textContent=readiness.label.replace(/画像 \d+枚|画像未保存/,count?'画像 '+count+'枚':'画像未保存');}});}
  }else{imageController?.destroy();imageController=null;imageKey='';images.replaceChildren();if(readiness.images.length){images.append(el('h3','保存画像'));for(const [i,asset]of readiness.images.entries()){const line=el('section'),a=el('a',(i+1)+'枚目を開く ↗'),img=el('img');a.href=asset.url;a.target='_blank';a.rel='noopener noreferrer';img.src=asset.url;img.alt=asset.label;img.loading='lazy';img.referrerPolicy='no-referrer';line.append(a,img);images.append(line);}}else if(d.place!=='otoku')images.append(el('p','この投稿にひもづく画像は未保存です。','qol-note'));}
  const posted=currentPosted(d,notebook.pref('posted:'+d.id,null)),mark=$('posting-complete');mark.textContent=posted?'投稿済みメモを取り消す':'投稿したので完了';mark.disabled=!!changed;
  $('posting-progress').textContent=posted?'✓ この本文を投稿済みとして端末に記録しました。':steps.filter(s=>s.copied).length+' / '+steps.length+' コピー済み。投稿後、下のボタンで完了を記録できます。';$('posting-dialog').scrollTop=scroll;
 }
 $('posting-copy-all').addEventListener('click',()=>{if(postDraft)copy(postDraft,'posting-set',postingText(postDraft));});
 $('posting-complete').addEventListener('click',()=>{if(!postDraft)return;const key='posted:'+postDraft.id,posted=currentPosted(postDraft,notebook.pref(key,null));notebook.changePref(key,posted?null:{revision:revision(postDraft),time:Date.now()});renderPost();onFeedback(posted?'unpin':'done');});
 $('posting-native').addEventListener('click',()=>{if(!postDraft)return;$('posting-dialog').close();const d=postDraft;native(d.place==='fp'?(d.source?.account==='tiktok'?'tiktok':'fp'):d.place,d.source?.id);});
 $('later-undo').addEventListener('click',()=>{try{notebook.undo();$('later-status').textContent='直前の端末メモを元に戻しました。';}catch(e){$('later-status').textContent=e.message;}refresh();renderTray();});
 for(const name of ['later','posting'])$(name+'-close').addEventListener('click',()=>$(name+'-dialog').close());
 const installButton=button('ホーム画面に追加',()=>{if(install.state==='available')send('install-request');else $('install-dialog').showModal();});installButton.id='lounge-install';$('service-links').before(installButton);
 $('install-close').addEventListener('click',()=>$('install-dialog').close());
 function installState(value){install=value||{};installButton.hidden=install.state==='standalone';installButton.textContent=install.state==='available'?'アプリとして追加':'ホーム画面に追加';if(install.state==='dismissed'){$('install-dialog').showModal();}if(install.state==='installed')installButton.hidden=true;}
 function nativeLater(value){if(!value||!roomForPlace[value.place]||typeof value.title!=='string')return;const d={id:'native-'+value.place+'-'+(['sourcing','watches','cards'].includes(value.native)?value.native:'sourcing'),place:value.place,title:value.title.slice(0,200),body:String(value.body||'この持ち場をあとで確認する。').slice(0,3000),kind:'持ち場のメモ',native:['sourcing','watches','cards'].includes(value.native)?value.native:'sourcing'};add(d);showTray(d.id);}
 refresh();return {update,status,refresh,showTray,installState,nativeLater,showSearch:hall.showSearch,workMarks:hall.marks};
}
