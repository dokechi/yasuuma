/* Live paper scenery. No fetches, credentials, copies of stored manuscripts or
   replacement reader: the exact existing #desk moves into the chosen paper. */
import {groupDrafts} from './notebook.js?v=20261102.2-paper';
export function mountPaperStage({document:doc=globalThis.document,application,accounts}={}){
 const win=doc.defaultView,room=doc.getElementById('room'),reader=doc.getElementById('desk'),owner=application.getPaperDesk(),board=application.getAccountBoard();
 if(!room||!reader||!owner||!board)throw Error('Paper stage needs the existing manuscript owner');
 const chapters=[...accounts.filter(a=>!a.pending).map(a=>({...a,label:({insurance:'保険',otoku:'お得',rakuten:'楽天',lottery:'抽選'})[a.key]||a.name})),{key:'sourcing',label:'仕入れ',name:'仕入れ'}];
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(cls,text,fn)=>{const n=make('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
 const anchor=doc.createComment('paper: original live reader');reader.before(anchor);
 let key=room.dataset.account||'insurance',opened=null,returnFocus=null,onlyFuture=false,limit=20,queued=false,disposed=false,signature='',scrollOrigin=null;
 const header=make('header','paper-header'),brand=make('h1','paper-brand','司令塔'),tabs=make('nav','paper-tabs');tabs.setAttribute('aria-label','カテゴリ');
 const tabButtons=new Map();
 for(const c of chapters){const b=button('paper-tab',c.label,()=>switchChapter(c.key));b.dataset.paperChapter=c.key;tabs.append(b);tabButtons.set(c.key,b);}
 tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...tabButtons.values()],index=buttons.indexOf(doc.activeElement);if(index<0)return;e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length].focus();});
 const search=button('paper-search','検索',()=>doc.getElementById('lounge-search')?.click()),future=button('paper-future','今後使う',()=>{close();onlyFuture=!onlyFuture;limit=20;signature='';paint();});future.setAttribute('aria-pressed','false');future.title='このカテゴリの今後使う原稿（この端末）';
 const tools=make('details','paper-tools'),summary=make('summary','','道具'),menu=make('nav','paper-tools-menu');summary.setAttribute('aria-label','設定・原稿の操作');
 for(const [label,id] of [['設定','settings-open'],['原稿を更新','desk-refresh'],['コピー履歴','desk-history'],['あとで箱','lounge-later']])menu.append(button('',label,()=>{tools.open=false;doc.getElementById(id)?.click();}));
 menu.append(button('','出典・確認記録',()=>{tools.open=false;[...doc.querySelectorAll('#desk-routes button')].find(n=>/出典・確認記録|過去原稿を開く/.test(n.textContent))?.click();}));
 tools.append(summary,menu);header.append(brand,tabs,search,future,tools);
 const stage=make('section','paper-stage');stage.setAttribute('aria-label','保存原稿のポップアップ舞台');
 const state=make('p','paper-state'),papers=make('div','paper-papers'),more=button('paper-more','次の20件',()=>{limit+=20;signature='';paint();});state.setAttribute('role','status');more.hidden=true;stage.append(state,papers,more);room.append(stage);doc.body.append(header);
 function restore(){if(reader.parentNode!==anchor.parentNode)anchor.after(reader);}
 function close({focus=true}={}){if(!opened)return;const card=papers.querySelector('[data-paper-open="true"]');card?.removeAttribute('data-paper-open');const opener=card?.querySelector('.paper-open');opener?.setAttribute('aria-expanded','false');restore();card?.querySelector('.paper-reader')?.remove();opened=null;delete room.dataset.paperReading;if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});if(focus&&scrollOrigin){for(const [node,top,left]of scrollOrigin.elements){node.scrollTop=top;node.scrollLeft=left;}if(typeof win.scrollTo==='function'&&win.scrollY!==scrollOrigin.y)win.scrollTo({top:scrollOrigin.y,left:scrollOrigin.x,behavior:'instant'});}scrollOrigin=null;returnFocus=null;schedule();}
 function switchChapter(next){if(next===key&&!room.hidden)return;close({focus:false});onlyFuture=false;limit=20;signature='';application.openWorkingChapter(next);schedule();}
 function open(d,card,opener){if(opened===d.id){close();return;}close({focus:false});if(!owner.open(d.id))return;scrollOrigin={x:win.scrollX,y:win.scrollY,elements:[]};for(let n=card.parentElement;n;n=n.parentElement)scrollOrigin.elements.push([n,n.scrollTop,n.scrollLeft]);opened=d.id;returnFocus=opener;card.dataset.paperOpen='true';opener.setAttribute('aria-expanded','true');room.dataset.paperReading='true';
  const host=make('div','paper-reader'),shut=button('paper-close','原稿を閉じる −',()=>close());host.append(shut,reader);card.append(host);reader.querySelector('#desk-scroll')?.focus({preventScroll:true});
  if(!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)host.animate?.([{opacity:0,transform:'translateY(18px) rotateX(-7deg)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});
 }
 function paint(){if(disposed)return;queued=false;if(room.hidden&&key!=='sourcing')application.openWorkingChapter(key);const next=room.dataset.account||key;if(next!==key){close({focus:false});key=next;onlyFuture=false;limit=20;signature='';tabButtons.get(key)?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
  header.hidden=room.hidden;stage.hidden=room.hidden||key==='sourcing'||key==='fp';
  for(const [k,b]of tabButtons)b.setAttribute('aria-current',k===key?'page':'false');future.setAttribute('aria-pressed',String(onlyFuture));
  const current=chapters.find(c=>c.key===key);stage.setAttribute('aria-label',(current?.label||'保存')+'の原稿舞台');
  const rows=groupDrafts(owner.rows(key)).map(g=>g[0]).filter(d=>!onlyFuture||owner.isFuture(d.id));
  const status=board.state;state.textContent=status.loading?'保存原稿を読み込み中…':!status.complete?'読取未確認 · 保存分を表示。道具から更新できます。':rows.length?rows.length+'件の保存原稿'+(onlyFuture?' · 今後使う（この端末・現在のログイン）':''):'このカテゴリに'+(onlyFuture?'今後使う原稿は':'保存原稿は')+'ありません。';
  if(!owner.persistent())state.textContent+=' 端末保存は利用できないため、この画面内で保持します。';
  const sig=JSON.stringify([key,onlyFuture,limit,rows.map(d=>[d.id,d.title,d.body,owner.isFuture(d.id)])]);if(sig===signature)return;
  // Source receipts must never replace an open reader or move the focused paper.
  if(opened){for(const pin of papers.querySelectorAll('[data-paper-pin]'))pin.setAttribute('aria-pressed',String(owner.isFuture(pin.dataset.paperPin)));return;}
  signature=sig;const active=doc.activeElement,focusId=active?.closest?.('[data-paper-id]')?.dataset.paperId,focusPin=active?.hasAttribute?.('data-paper-pin');papers.replaceChildren();
  for(const [i,d]of rows.slice(0,limit).entries()){
   const card=make('article','paper-card paper-form-'+(i%5));card.dataset.paperId=d.id;
   const platform=make('div','paper-platform');platform.setAttribute('aria-hidden','true');
   const backing=make('div','paper-backing');backing.setAttribute('aria-hidden','true');
   const leaf=make('div','paper-leaf'),category=make('small','paper-category',current?.label||'原稿'),title=make('h2','paper-title',d.title),excerpt=make('p','paper-excerpt',d.body.slice(0,i===0?240:105));
   const pin=button('paper-pin','',()=>{owner.toggleFuture(d.id);pin.setAttribute('aria-pressed',String(owner.isFuture(d.id)));schedule();});pin.dataset.paperPin=d.id;pin.setAttribute('aria-pressed',String(owner.isFuture(d.id)));pin.setAttribute('aria-label',d.title+'を今後使う');pin.disabled=owner.canPin?.()===false;pin.title=pin.disabled?'ログイン中の本体から利用できます':'今後使う（この端末・現在のログイン）';const icon=make('span','paper-pin-icon');icon.setAttribute('aria-hidden','true');pin.append(icon);
   const opener=button('paper-open','ここで開く ＋',()=>open(d,card,opener));opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-label',d.title+'をここで開く');leaf.append(category,pin,title,excerpt);card.append(platform,backing,leaf);if([1,2,4].includes(i%5))card.append(opener);else leaf.append(opener);papers.append(card);
  }
  more.hidden=rows.length<=limit;more.textContent='次の20件（残り '+Math.max(0,rows.length-limit)+'件）';
  if(focusId){const card=[...papers.children].find(n=>n.dataset.paperId===focusId);card?.querySelector(focusPin?'.paper-pin':'.paper-open')?.focus({preventScroll:true});}
 }
 function schedule(){if(!queued&&!disposed){queued=true;win.queueMicrotask(paint);}}
 const off=board.subscribe(schedule),observer=new win.MutationObserver(schedule);observer.observe(room,{attributes:true,attributeFilter:['hidden','data-account']});doc.addEventListener('cc:paper-render',schedule);
 const onKey=e=>{if(e.key==='Escape'&&!doc.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();if(opened)close();else tools.open=false;}};doc.addEventListener('keydown',onKey,true);
 const onPop=()=>{close({focus:false});schedule();};win.addEventListener('popstate',onPop);
 doc.body.classList.add('paper-popup');paint();tabButtons.get(key)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
 return {close,paint,snapshot:()=>({key,opened,onlyFuture,count:papers.children.length}),destroy(){disposed=true;close({focus:false});restore();anchor.remove();off();observer.disconnect();doc.removeEventListener('cc:paper-render',schedule);doc.removeEventListener('keydown',onKey,true);win.removeEventListener('popstate',onPop);header.remove();stage.remove();doc.body.classList.remove('paper-popup');}};
}
