import {isLegacyPublishingDraft} from './notebook.js?v=20261030.4-accounts';
import {searchRows,mergeIndex,rememberResearch,relatedRecords,priceChange,safeURL} from './hall-model.js?v=20261021.8-hall';
import {workMarks} from './work-memory.js?v=20261030.4-accounts';
import {placeNames} from './desk-model.js?v=20261030.4-accounts';

export function createHallTools({notebook,open,copy,showTray,onFeedback=()=>{}}){
 const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;},button=(label,fn)=>{const b=el('button',label);b.type='button';b.addEventListener('click',fn);return b;};
 let remote=[],message='仕入れ履歴・過去の調査は、本体との接続を確認中です。',active=null,selected='',filter='all',productFocus=null,limit=100;
 const date=t=>t?new Date(t).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'日時未確認',labels={draft:'保存原稿',purchase:'仕入れ履歴',research:'調査履歴',copy:'コピー履歴',later:'あとで箱'};
 function historyRows(){const value=notebook.pref('researchMemory',[]),saved=Array.isArray(value)?value:[],keys=new Set(rememberResearch([],remote).map(r=>r.snapshotKey));return saved.filter(r=>!keys.has(r.snapshotKey)).map(r=>({...r,id:'memory:'+r.snapshotKey,stored:true}));}
 function rows(){return [...notebook.all().map(d=>({id:'draft:'+d.id,draftId:d.id,place:d.place,type:'draft',title:d.title,body:d.body,url:d.link,productLinks:d.productLinks,time:d.updatedAt,source:d.source,draft:d})),...remote,...historyRows(),...notebook.copies().map(c=>({id:'copy:'+c.id,draftId:c.draftId,place:c.place,type:'copy',title:c.title||'以前のコピー',body:c.text,time:c.time,copy:c})),...Object.values(notebook.pref('laterItems',{})).filter(x=>x?.draft&&placeNames[x.draft.place]).map(x=>({id:'later:'+x.draft.id,draftId:x.draft.id,place:x.draft.place,type:'later',title:x.draft.title,body:[x.memo,x.draft.body].filter(Boolean).join('\n\n'),time:x.time,draft:x.draft,memo:x.memo}))].filter(row=>!isLegacyPublishingDraft(row.draft||notebook.get(row.draftId)||row));}
 function receive(payload){if(Array.isArray(payload.searchRecords)){remote=mergeIndex(remote,payload.searchRecords,{complete:payload.indexComplete===true&&!payload.indexLoading});const previous=notebook.pref('researchMemory',[]),next=rememberResearch(previous,remote);if(JSON.stringify(previous)!==JSON.stringify(next))notebook.setPref('researchMemory',next);}message=payload.searchMessage||message;refresh();}
 function selection(row){selected=row.id;renderResults();}
 function related(row){const current=row.draft||row;return relatedRecords(current,[...remote,...historyRows()]);}
 function showDetail(row){const host=$('hall-detail');host.replaceChildren();if(!row){host.append(el('p','検索結果を選ぶと、ここで内容を確認できます。','qol-note'));return;}
  host.append(el('small',placeNames[row.place]+' / '+labels[row.type]),el('h3',row.title),el('p',date(row.time)+(row.stored?' · この端末に残した保存時点の記録':''),'qol-note'),el('pre',row.body,'hall-preview'));
  const actions=el('div',undefined,'qol-actions');
  if(row.type==='draft'||row.type==='copy'||row.type==='later'){const live=notebook.get(row.draftId),d=row.draft;actions.append(button(live?'この原稿を開く':d?.native?'この持ち場を開く':'この部屋を開く',()=>{$('hall-dialog').close();open({place:row.place,id:live?.id,title:row.title,native:d?.native,section:d?.section});}));if(row.type==='later')actions.append(button('あとで箱で見る',()=>{$('hall-dialog').close();showTray(row.draftId);}));}
  else actions.append(button(row.type==='purchase'?'仕入れ帳を開く':'調査の持ち場を開く',()=>{$('hall-dialog').close();open({place:'shiire',native:'sourcing',section:row.section||'research',title:row.title});}));
  if(row.copy)actions.append(button('この内容をもう一度コピー',()=>copy({id:row.draftId,place:row.place,title:row.title,body:row.body},row.copy.kind,row.body)));
  if(safeURL(row.url)){const a=el('a','保存された商品ページ ↗');a.href=safeURL(row.url);a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}host.append(actions);
  const matches=related(row),previous=matches.find(x=>row.time&&x.row.time&&x.row.time<row.time),change=previous?priceChange(row,previous.row):null;
  if(change!==null)host.append(el('p',change<0?'前回の保存価格より '+(-change).toLocaleString('ja-JP')+'円下がっています。':change>0?'前回の保存価格より '+change.toLocaleString('ja-JP')+'円上がっています。':'前回と同じ保存価格です。','hall-price-change'));
  if(matches.length){const section=el('section',undefined,'hall-related');section.append(el('h4','同じ商品に結びつく調査記録'));for(const {row:past,match}of matches.slice(0,12)){const card=el('div');card.append(el('strong',past.price===null||past.price===undefined?'価格未確認':'保存価格 '+past.price.toLocaleString('ja-JP')+'円'),el('small',date(past.time)+' · '+match.basis+' / '+match.note),el('p',past.judgment||'判断理由は保存されていません。'));section.append(card);}host.append(section);}
 }
 function renderResults(){const all=rows(),matches=searchRows(productFocus?relatedRecords(productFocus,[...remote,...historyRows()]).map(x=>x.row):all,$('hall-query').value,{filter}),shown=matches.slice(0,limit),list=$('hall-results');list.replaceChildren();$('hall-result-count').textContent=matches.length+'件'+(matches.length>limit?'（先頭'+limit+'件を表示）':'');$('hall-source-status').textContent=message+' 原稿・コピー履歴・あとで箱は、この端末で利用できる保存分を検索します。';$('hall-more').hidden=matches.length<=limit;
  if(!matches.length)list.append(el('p','一致する保存情報はありません。読取が未確認の持ち場は、更新後に再検索できます。','qol-note'));
  if(!shown.some(r=>r.id===selected))selected=shown[0]?.id||'';
  for(const row of shown){const b=button('',()=>selection(row));b.setAttribute('aria-pressed',String(row.id===selected));b.append(el('small',labels[row.type]+' · '+placeNames[row.place]),el('strong',row.title),el('span',row.body.slice(0,90)));list.append(b);}
  document.querySelectorAll('[data-hall-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hallFilter===filter)));showDetail(matches.find(x=>x.id===selected));
 }
 function showSearch(){productFocus=null;filter='all';limit=100;renderResults();$('hall-dialog').showModal();$('hall-query').focus();}
 function showRelated(d){productFocus=d;filter='research';limit=100;$('hall-query').value='';renderResults();$('hall-dialog').showModal();}
 function refresh(){
  const marks=workMarks(notebook),work=$('town-work');work.hidden=!marks.length;work.textContent='今日の読了 '+marks.filter(x=>x.kind==='read').length+' · 投稿メモ '+marks.filter(x=>x.kind==='posted').length;work.title='今日の作業を見る';
  const prior=$('desk-prior');prior.replaceChildren();const matches=active?related(active):[];prior.hidden=!matches.length;if(matches.length)prior.append(button('同じ商品に結びつく調査 '+matches.length+'件を見る',()=>showRelated(active)));
  if($('hall-dialog').open)renderResults();
 }
 $('hall-query').addEventListener('input',()=>{limit=100;renderResults();});document.querySelectorAll('[data-hall-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.hallFilter;productFocus=null;limit=100;renderResults();}));$('hall-more').addEventListener('click',()=>{limit+=100;renderResults();});$('hall-close').addEventListener('click',()=>$('hall-dialog').close());
 $('hall-refresh').addEventListener('click',()=>$('desk-refresh').click());
 $('town-work').addEventListener('click',()=>{const host=$('work-list');host.replaceChildren();for(const mark of workMarks(notebook)){const item=el('li');item.append(el('small',date(mark.time)+' · '+placeNames[mark.place]),el('strong',(mark.kind==='read'?'読了：':'投稿メモ：')+mark.title));host.append(item);}$('work-dialog').showModal();});$('work-close').addEventListener('click',()=>$('work-dialog').close());
 refresh();return {receive,refresh,showSearch,update:d=>{active=d;refresh();},marks:()=>workMarks(notebook)};
}
