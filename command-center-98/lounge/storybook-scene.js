/* Original paper-world presentation. Existing board owns routes and records.
   No data transport, source writes, storage, or duplicated reader controllers. */
export const storyChapters=Object.freeze([
 {key:'insurance',short:'保険',title:'手紙がひらく、朝の頁。',place:'手紙のアトリエ',number:'01'},
 {key:'otoku',short:'お得',title:'見つけたものから、物語に。',place:'発見の温室',number:'02'},
 {key:'rakuten',short:'楽天',title:'うれしいを、包んで届ける。',place:'贈りものの食卓',number:'03'},
 {key:'lottery',short:'抽選',title:'小さな期待に、しおりを。',place:'星の編集室',number:'04'},
 {key:'sourcing',short:'仕入れ',title:'見つける。選ぶ。次へつなぐ。',place:'旅する仕入れ帳',number:'05'}
]);
export function mountStorybook({document:doc=globalThis.document,board,buildArt=null,onTravel=()=>{},onCancel=()=>{}}={}){
 const win=doc.defaultView;if(!win||!board?.element||!board?.subscribe)throw Error('Storybook needs the existing account owner.');
 const safe=(fn,...args)=>{try{return fn(...args);}catch{return undefined;}};
 const host=board.element,make=(tag,cls,text)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const button=(cls,text,fn)=>{const node=make('button',cls,text);node.type='button';node.addEventListener('click',fn);return node;};
 let selected=storyChapters[0].key,disposed=false,queued=null,returning=false,intent=0,lastFocus=null,lastVisit=-1,previousHidden=host.hidden,living=null,artBuilder=buildArt,artState='fallback';
 const root=make('section','storybook');root.setAttribute('aria-label','司令塔の絵本');root.dataset.ready='true';
 const cover=make('header','story-cover'),wordmark=make('div','story-wordmark'),kicker=make('span','story-kicker','YOUR WORKING STORYBOOK'),heading=make('h1','','司令塔');wordmark.append(kicker,heading);
 const utilities=make('nav','story-utilities');utilities.setAttribute('aria-label','司令塔の道具');
 const invoke=id=>{const focus=doc.activeElement;doc.getElementById(id)?.click();const dialog=doc.querySelector('dialog[open]');dialog?.addEventListener('close',()=>{if(!disposed&&!host.hidden&&focus?.isConnected)focus.focus({preventScroll:true});},{once:true});};
 utilities.append(button('story-tool','全体検索',()=>invoke('town-search')),button('story-tool','あとで',()=>invoke('town-later')),button('story-tool','設定',()=>invoke('settings-open')));cover.append(wordmark,utilities);
 const spread=make('div','story-spread'),left=make('section','story-index-page'),chapter=make('section','story-chapter-page');
 const welcome=make('h2','story-welcome','今日を、ひらく。'),intro=make('p','story-intro','読む。残す。見つける。\nあなたの仕事を、一冊に。');
 const binding=make('div','story-binding');binding.setAttribute('aria-hidden','true');
 const tabs=make('nav','story-chapters');tabs.setAttribute('aria-label','五つの章を見る');const chapterButtons=new Map();
 for(const item of storyChapters){const b=button('story-chapter-tab','',()=>select(item.key));b.dataset.storyChapter=item.key;b.dataset.storyDestination=item.key;const n=make('small','',item.number),name=make('span','',item.short);b.append(n,name);tabs.append(b);chapterButtons.set(item.key,b);}
 const memo=make('div','story-memo'),memoLabel=make('small','','この端末の持ち場メモ'),memoText=make('p','','保存原稿を確認しています。');memo.append(memoLabel,memoText);
 const unused=make('div','story-unwritten');unused.append(make('span','','これからの頁'));
 for(const key of ['planned-5','planned-6','reserve']){const b=button('story-unwritten-tab','未設定',()=>{});b.dataset.storyDestination=key;b.disabled=true;b.setAttribute('aria-label',(key==='reserve'?'予備':key==='planned-5'?'追加アカウント5':'追加アカウント6')+'、未設定');unused.append(b);}
 left.append(welcome,intro,tabs,memo,unused);
 const folio=make('div','story-folio'),number=make('span','story-page-number'),place=make('span','story-place');folio.append(number,place);
 const title=make('h2','story-chapter-title'),identity=make('p','story-account-identity');
 const sceneButton=button('story-open-scene','',()=>open(selected,sceneButton)),artHost=make('div','story-art-host');
 const openLabel=make('span','story-open-label'),openText=make('span'),arrow=make('span','','↗');arrow.setAttribute('aria-hidden','true');openLabel.append(openText,arrow);sceneButton.append(artHost,openLabel);
 const caption=make('p','story-scene-note','絵の頁を押すと、この持ち場を開きます。');
 chapter.append(folio,title,identity,sceneButton,caption);spread.append(left,binding,chapter);
 const fast=make('nav','story-fast');fast.setAttribute('aria-label','演出なしで持ち場を開く');fast.append(make('span','story-fast-label','すぐ開く'));
 const quickButtons=new Map();for(const item of storyChapters){const b=button('story-instant',item.short,()=>open(item.key,b,{instant:true}));b.dataset.storyInstant=item.key;fast.append(b);quickButtons.set(item.key,b);}
 const footer=make('footer','story-footer'),list=button('story-list','原稿一覧',()=>host.querySelector('.board-primary')?.click()),refresh=button('story-refresh','保存原稿を更新',()=>host.querySelector('.board-refresh')?.click());
 const status=make('p','story-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 footer.append(list,refresh,status);root.append(cover,spread,fast,footer);host.prepend(root);host.classList.add('storybook-mounted');
 const source=key=>board.state.destinations.find(item=>item.key===key);
 function fallbackArt(target,key){const art=target.createElement('div');art.className='story-paper-art story-paper-fallback';art.dataset.storyRoom=key;art.setAttribute('aria-hidden','true');for(const shape of ['window','shelf','plant','letters']){const layer=target.createElement('span');layer.className='story-fallback-'+shape;art.append(layer);}return art;}
 function makeArt(target=doc,key=selected){let result;try{result=artBuilder?.({document:target,key});}catch{}return result?.nodeType===1&&result.ownerDocument===target&&!result.isConnected?result:fallbackArt(target,key);}
 function paintArt(){const art=makeArt();artHost.replaceChildren(art);artState=art.classList.contains('story-paper-fallback')?'fallback':'ready';root.dataset.storyScene=artState;}
 function select(key,{announce=false}={}){if(disposed||!storyChapters.some(item=>item.key===key))return false;safe(onCancel);selected=key;paintArt();update();if(announce)status.textContent=source(key)?.name+'の頁を開きました。';return true;}
 function open(key,trigger,options={}){
  const account=source(key);if(disposed||!account||account.pending)return false;
  const token=++intent;safe(onCancel);lastFocus=trigger?.isConnected?trigger:quickButtons.get(key);selected=key;
  if(host.hidden){queued={key,trigger:lastFocus,options,token};if(!returning){returning=true;doc.getElementById('back')?.click();}return true;}
  queued=null;returning=false;const origin=sceneButton.getBoundingClientRect();safe(onTravel,{room:key,instant:options.instant===true,origin,makeScene:target=>makeArt(target,key)});
  root.dataset.opening=key;doc.body.dataset.storyRoom=key;board.open(key);return true;
 }
 function update(){if(disposed)return;const state=board.state,config=storyChapters.find(item=>item.key===selected),account=source(selected),summary=living?.rooms?.find(item=>item.key===selected);
  root.dataset.storyRoom=selected;root.dataset.storyScene=artState;root.hidden=host.dataset.view==='list';
  number.textContent=config.number+' / 05';place.textContent=config.place;title.textContent=config.title;identity.textContent=[account?.name,account?.handle].filter(Boolean).join('  ');
  sceneButton.dataset.storyOpen=selected;sceneButton.setAttribute('aria-label',(account?.name||config.short)+'の持ち場を開く');openText.textContent=selected==='sourcing'?'仕入れ帳を開く':'原稿を読む';
  for(const [key,b]of chapterButtons){const original=source(key);b.setAttribute('aria-pressed',String(key===selected));b.setAttribute('aria-label',(original?.name||key)+'の章を見る');quickButtons.get(key)?.setAttribute('aria-label',(original?.name||key)+'を演出なしですぐ開く');}
  const text=summary?summary.key==='sourcing'?'仕入れの状態は、仕入れ帳で確認できます。':summary.totalCount===null?'利用できる保存原稿 '+summary.loadedCount+'本。全体は未確認です。':'保存原稿 '+summary.loadedCount+'本。未読・更新 '+summary.unreadCount+'本。':state.loading?'保存原稿を確認しています。':state.complete?account?.status||'保存原稿を読込済み。':'保存原稿の読取状況は未確認です。';memoText.textContent=text;
  status.textContent=state.message||'保存原稿の状態を確認しています。';refresh.disabled=state.loading;refresh.textContent=state.loading?'確認しています…':'保存原稿を更新';
 }
 const unsub=board.subscribe(state=>{if(state.visitVersion!==lastVisit){lastVisit=state.visitVersion;if(storyChapters.some(x=>x.key===state.lastVisited)){selected=state.lastVisited;paintArt();}}update();});
 const observer=new win.MutationObserver(()=>{const hidden=host.hidden;update();if(previousHidden&&!hidden){returning=false;delete root.dataset.opening;if(queued){const next=queued;queued=null;win.queueMicrotask(()=>{if(!disposed&&intent===next.token)open(next.key,next.trigger,next.options);});}else (lastFocus?.isConnected?lastFocus:quickButtons.get(selected))?.focus({preventScroll:true});}previousHidden=hidden;});observer.observe(host,{attributes:true,attributeFilter:['hidden','data-view']});
 paintArt();update();
 return {element:root,open,select,makeScene:makeArt,setArtBuilder(builder){if(typeof builder!=='function')return;artBuilder=builder;paintArt();update();},setLivingStatus(value){living=value;update();},snapshot:()=>({selected,view:host.dataset.view==='list'?'list':'book',active:!host.hidden,chapterReady:artState,queued:queued?.key||null}),destroy(){if(disposed)return;disposed=true;++intent;safe(onCancel);unsub();observer.disconnect();queued=null;returning=false;root.remove();host.classList.remove('storybook-mounted');}};
}
