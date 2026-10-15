import {createProductionClient} from './production.js?v=22';
import {createNotebook} from './notebook.js?v=22';
import {createWorkbench} from './workbench.js?v=22';
import {createFeedback} from './feedback.js?v=22';
// Assets, copy and workflow content are independent of the shared motion.
// Character-specific layered poses also require matching assets and alignment.
const PLACES = {"kyun": {"title": "キュン拾い", "eyebrow": "THREADS / 書斎", "type": "城下町の書斎", "greeting": "おかえり。いま、原稿を書いていたところ。", "paper": "原稿を選ぶ", "label": "投稿本文", "copy": "本文をコピー", "tabs": ["ひとこと", "紹介文", "長めの文"], "drafts": []}, "choi": {"title": "ちょい上等", "eyebrow": "SELECTION", "type": "紹介文の持ち場", "greeting": "いつもより、少しだけ上等に。", "paper": "紹介文を選ぶ", "label": "紹介文", "copy": "紹介文をコピー", "tabs": ["暮らし", "持ち物", "贈りもの"], "drafts": []}, "fp": {"title": "FP・TikTok", "eyebrow": "STUDIO", "type": "台本の持ち場", "greeting": "伝えたいことを、ひとつずつ。", "paper": "台本の流れを確認", "label": "保存台本", "copy": "台本をコピー", "tabs": ["つかみ", "本編", "締め"], "drafts": []}, "shiire": {"title": "仕入れ", "eyebrow": "MARKET", "type": "候補確認の持ち場", "greeting": "いい仕入れは、確かめるところから。", "paper": "確認メモを選ぶ", "label": "仕入れ確認メモ", "copy": "メモをコピー", "tabs": ["候補", "比較", "購入前"], "drafts": []}};
// Character replacement: update this manifest; movement, sound and completion stay shared.
const CHARACTERS=Object.freeze({
 kyun:{"action":{"sources":["assets/kyun-action-base-v1.webp","assets/kyun-action-cloth-v1.webp","assets/kyun-action-arm-v1.webp","assets/kyun-writer-v2.webp","assets/kyun-wave-arm-v1.webp"],"armTransform":[0.539695231,0.009763927,-0.009763927,0.539695231,374.128344,194.222174],"waveTransform":[0.46,0,0,0.46,381.8,182.5],"reactions":["wave","read","skirt"],"compactReactions":["wave","read"],"pivot":[503.462717,243.268681],"reading":{"src":"assets/kyun-reading-v1.webp","size":[1024,1536],"transform":[0.999383239,0.00038364,-0.00038364,0.999383239,0.972238956,0.059281986]}},"rig":{"size":[1024,1536],"pivot":[503.462717,243.268681],"headBand":[232,325],"hairX":[85,135,220,275],"hairY":[240,380,900,1080],"handX":[380,510,630,670],"handY":[500,550,595,620],"penLine":[470,412,656,617],"kneeArea":[650,850,110,125],"hemX":[350,460,920,1015],"hemY":[740,880,1450,1536],"legLine":[808,875,835,1295]},"expression":{"region":[453.727298,101.128489,129.66347699999994,127.43554499999999],"frames":[{"src":"assets/kyun-smile-v1.webp","size":[1312,1199],"transform":[0.253684694,0.000962269,-0.000962269,0.253684694,313.525143,5.419053]},{"src":"assets/kyun-smile-closed-v1.webp","size":[1312,1199],"transform":[0.253665328,0.00086809,-0.00086809,0.253665328,313.473717,5.482089]}]},"touchLines":["あ、来てくれたんだ。","ふふ。あと少しだけ、書かせてね。","ひと息ついてから、続きを書こう。"],"src":"assets/kyun-writer-v1.webp","blinkSize":[1024,1536],"blinkTransform":[1.129750862,0.013930504,-0.013930504,1.129750862,-83.702799,-5.929189],"blink":"assets/kyun-blink.webp","size":[1024,1536],"eyes":[[457.334553,130.732523],[553.817468,102.504729],[571.358512,147.960482],[470.310674,179.525594]],"color":"#ebbaaa","delay":-1.2,"copied":"準備できたね。いい一言になりそう。","completed":"ひと仕事、おつかれさま。"},
 choi:{touchLines:['どうしたの？ 見せて。','そのこだわり、いいね。','ゆっくり選んでいこう。'],src:'assets/choi.webp',blinkSize:[941, 1672],blinkTransform:[0.33901359, -0.00077762, 0.00077762, 0.33901359, 264.81067, -61.16029],blink:'assets/choi-blink.webp',size:[941,1672],eyes:[[349,155],[454,113],[474,150],[366,193]],color:'#a8e6d0',delay:-3.1,copied:'いいね。紹介の準備ができたよ。',completed:'今日のひと工夫、おつかれさま。'},
 fp:{touchLines:['うん、聞いているよ。','伝えたいことから始めよう。','ひとつずつ整えていこう。'],src:'assets/fp.webp',blinkSize:[941, 1670],blinkTransform:[0.99962476, -0.00164807, 0.00164807, 0.99962476, -0.27859, 0.53],blink:'assets/fp-blink.webp',size:[941,1671],eyes:[[495,120],[605,167],[587,203],[479,151]],color:'#bdcaff',delay:-4.5,copied:'台本、手元に用意できたね。',completed:'ここまで整ったね。おつかれさま。'},
 shiire:{touchLines:['おっ、何か見つけた？','気になる候補、一緒に見よう。','ひと息入れてからでも大丈夫。'],src:'assets/shiire.webp',blinkSize:[941, 1672],blinkTransform:[0.4156153, 0.00104695, -0.00104695, 0.4156153, 302.99659, -33.40013],blink:'assets/shiire-blink.webp',size:[941,1672],eyes:[[484,137],[602,175],[584,214],[469,173]],color:'#ffd38b',delay:-2.3,copied:'確認メモ、持っていってね。',completed:'確認おつかれさま。またここで。'}
});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const app=$('#app'),home=$('#home'),workspace=$('#workspace'),companion=$('#companion'),character=$('#character'),dock=$('#dock'),scroll=$('#paperScroll');
// Room art never gates navigation or reading; the town remains underneath if
// the optional background is still loading or unavailable.
const studyImage=$('#studyImage');
function revealStudy(){app.dataset.studyReady='true';}
studyImage.addEventListener('load',revealStudy);
if(studyImage.complete&&studyImage.naturalWidth>0)revealStudy();
const stations=$$('.station');let tabs=$$('[data-draft]'),desk=null,activeDraft=null;
let browserStorage;try{browserStorage=globalThis.localStorage;}catch{}
const notebook=createNotebook({seeds:globalThis.CCCastleInitialDrafts||Object.fromEntries(Object.keys(PLACES).map(key=>[key,[]])),storage:browserStorage,onError:()=>{$('#storageWarning').hidden=false;}});
const memory=Object.fromEntries(Object.keys(PLACES).map(key=>[key,{draft:0,scroll:0}]));
let view='home',place='kyun',currentDraft=0,returnPending=false,animation=null,motionId=0,toastTimer,resizeFrame,pageTurnAnimation=null;
const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)'),motionListeners=new Set();let forcedReduction=false,hostPaused=false;
const reduced={get matches(){return hostPaused||forcedReduction||systemMotion.matches||notebook.pref('quiet',false);},set matches(v){forcedReduction=Boolean(v);},addEventListener(type,fn){if(type==='change')motionListeners.add(fn);}};
function motionChanged(){for(const fn of motionListeners)fn();}
systemMotion.addEventListener?.('change',motionChanged);
const stationFor=key=>stations.find(node=>node.dataset.place===key);
const portraitFor=key=>app.dataset.homeMode==='map'?stationFor(key):stationFor(key).querySelector('.portrait');
const feedback=createFeedback({app,stations,companion,reduced,onStatus:showToast});
feedback.init(Object.fromEntries(Object.entries(CHARACTERS).map(([key,cfg])=>[key,{...cfg,greeting:PLACES[key].greeting}])));
function showToast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),1900);}
function clearPress(){stations.forEach(node=>node.classList.remove('is-pressed'));}
function rectStyle(rect){return {transform:`translate(${rect.left}px, ${rect.top}px)`,width:`${rect.width}px`,height:`${rect.height}px`};}
function moveCompanion(target,{from,hideAfter=false,instant=false}={}){
 const start=from??companion.getBoundingClientRect();
 const id=++motionId;
 if(animation){animation.cancel();animation=null;}
 const endStyle=rectStyle(target);
 Object.assign(companion.style,endStyle,{visibility:'visible'});
 const finish=()=>{if(id!==motionId)return;animation=null;if(hideAfter){companion.style.visibility='hidden';stations.forEach(node=>node.classList.remove('travelling'));}};
 if(reduced.matches||instant||!companion.animate){finish();return;}
 animation=companion.animate([rectStyle(start),endStyle],{duration:280,easing:'cubic-bezier(.19,.82,.22,1)'});
 animation.finished.then(finish).catch(()=>{});
}
function remember(){if(view!=='home'){memory[place].draft=currentDraft;memory[place].scroll=scroll.scrollTop;if(activeDraft)notebook.remember(place,activeDraft.id,scroll.scrollTop);}}
function wideDesk(){return window.innerWidth>=680&&window.innerWidth/window.innerHeight>=.8&&window.innerHeight>520;}
function syncDeskLayout(){
 $('.draft-tabs').setAttribute('aria-orientation',wideDesk()?'vertical':'horizontal');
}
function stopPageTurn(){pageTurnAnimation?.cancel();pageTurnAnimation=null;}
function turnPage(direction){
 stopPageTurn();const edge=$('#pageTurn');
 if(place!=='kyun'||reduced.matches||document.hidden||!edge.animate)return;
 Object.assign(edge.style,{left:direction<0?'0':'auto',right:direction<0?'auto':'0',transformOrigin:direction<0?'left center':'right center'});
 const sign=direction<0?-1:1;
 const anim=edge.animate([
  {opacity:0,transform:`perspective(360px) rotateY(${sign*8}deg) scaleX(.3)`},
  {opacity:.75,transform:`perspective(360px) rotateY(${sign*-58}deg) scaleX(1)`,offset:.32},
  {opacity:0,transform:`perspective(360px) rotateY(${sign*-88}deg) scaleX(.2)`}
 ],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'});
 pageTurnAnimation=anim;
 anim.finished.then(()=>{if(pageTurnAnimation===anim)pageTurnAnimation=null;}).catch(()=>{});
}
function wireTab(node){if(node.dataset.bound)return;node.dataset.bound='true';
 node.addEventListener('click',()=>{selectDraft(Number(node.dataset.draft));feedback.select();});
 node.addEventListener('keydown',event=>{const arrows=wideDesk()?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];if(![...arrows,'Home','End'].includes(event.key))return;event.preventDefault();feedback.select();selectDraft(event.key==='Home'?0:event.key==='End'?PLACES[place].drafts.length-1:currentDraft+(event.key===arrows[1]?1:-1),{focus:true});});
}
function fillTabs(){const rows=PLACES[place].drafts,container=$('.draft-tabs');
 while(tabs.length>rows.length)tabs.pop().remove();
 while(tabs.length<rows.length){const node=document.createElement('button');node.type='button';node.setAttribute('role','tab');node.setAttribute('aria-controls','draft');node.innerHTML='<span class="draft-number" aria-hidden="true"></span> <span class="draft-kind"></span><strong class="draft-preview-title" aria-hidden="true"></strong><span class="draft-preview-text" aria-hidden="true"></span>';container.append(node);tabs.push(node);}
 container.style.setProperty('--draft-count',String(Math.max(1,rows.length)));container.classList.toggle('many-drafts',rows.length>3);
 tabs.forEach((node,i)=>{const draft=rows[i];node.id=`tab-${i}`;node.dataset.draft=String(i);node.querySelector('.draft-number').textContent=String(i+1).padStart(2,'0');node.querySelector('.draft-kind').textContent=draft.kind||'原稿';node.querySelector('.draft-preview-title').textContent=draft.title;node.querySelector('.draft-preview-text').textContent=draft.body.replace(/\s+/g,' ').slice(0,70);node.setAttribute('aria-label',`${draft.kind||'原稿'}：${draft.title}`);wireTab(node);});
}
function selectDraft(index,{focus=false,restore=false}={}){
 const config=PLACES[place];if(!config.drafts.length){currentDraft=0;activeDraft=null;$('#draftTitle').textContent='机に原稿を置こう';$('#draftBody').textContent='「引き出し」から原稿を追加、または読み込めます。';$('#copy').disabled=true;$('#draft').setAttribute('aria-labelledby','draftTitle');desk?.selected();return;}
 const next=((index%config.drafts.length)+config.drafts.length)%config.drafts.length;
 if(!restore&&next===currentDraft&&activeDraft?.id===config.drafts[next].id){if(focus)tabs[next].focus();return;}
 if(!restore)remember();const previous=currentDraft;currentDraft=next;activeDraft={...config.drafts[next]};const draft=activeDraft;$('#copy').disabled=false;
 $('#draftTitle').textContent=draft.title;$('#draftBody').textContent=draft.body;$('#draft').setAttribute('aria-labelledby',`tab-${currentDraft}`);
 tabs.forEach((node,i)=>{const selected=i===currentDraft;node.setAttribute('aria-selected',String(selected));node.tabIndex=selected?0:-1;if(selected&&focus)node.focus();});$('.draft-tabs').style.setProperty('--selection',String(currentDraft));
 scroll.scrollTop=notebook.position(draft.id);memory[place].draft=currentDraft;memory[place].scroll=scroll.scrollTop;
 notebook.remember(place,draft.id,scroll.scrollTop);if(!restore)turnPage(next-previous);desk?.selected();
}
function refreshDrafts(preferred=activeDraft?.id){remember();PLACES[place].drafts=notebook.list(place);fillTabs();const index=PLACES[place].drafts.findIndex(d=>d.id===preferred);selectDraft(index<0?0:index,{restore:true});}
function selectId(id){const index=PLACES[place].drafts.findIndex(d=>d.id===id);if(index>=0)selectDraft(index);}
function renderPlace(key){
 stopPageTurn();place=key;const config=PLACES[key];app.dataset.place=key;config.drafts=notebook.list(key);activeDraft=null;
 character.src=CHARACTERS[key].src;$('#characterTouch').setAttribute('aria-label',`${config.title}のキャラに話しかける`);
 $('#workspace-title').textContent=config.title;$('#placeEyebrow').textContent=config.eyebrow;$('#placeType').textContent=config.type;$('#greetingText').textContent=config.greeting;$('#paperTitle').textContent=config.paper;$('#draftLabel').textContent=config.label;$('#copyLabel').textContent=config.copy;
 $('.draft-tabs').setAttribute('aria-label',config.paper);fillTabs();syncDeskLayout();
 $$('[data-go]').forEach(node=>node.setAttribute('aria-current',String(node.dataset.go===key)));$('.place-switcher').style.setProperty('--selection',String(Object.keys(PLACES).indexOf(key)));
 const chosen=config.drafts.findIndex(d=>d.id===notebook.selected(key));selectDraft(chosen>=0?chosen:Math.min(memory[key].draft,Math.max(0,config.drafts.length-1)),{restore:true});document.title=`${config.title}｜司令塔`;
}
function setView(key,{focus=true,instant=false,audible=false}={}){
 clearPress();const opened=key!=='home';
 if((!opened&&view==='home')||(opened&&view==='work'&&place===key))return;
 const previous=place;
 remember();
 let start;
 if(opened){
  start=companion.style.visibility==='visible'?companion.getBoundingClientRect():portraitFor(key).getBoundingClientRect();
  renderPlace(key);
  stations.forEach(node=>node.classList.toggle('travelling',node.dataset.place===key));
 }
 view=opened?'work':'home';app.dataset.view=view;
 home.inert=opened;home.setAttribute('aria-hidden',String(opened));workspace.inert=!opened;workspace.setAttribute('aria-hidden',String(!opened));
 document.body.style.overflow=opened?'hidden':'';
 $('#toast').classList.remove('show');
 if(opened){
  moveCompanion(dock.getBoundingClientRect(),{from:start,instant});
  feedback.enter(key,{audible});desk?.enter(key);
  if(focus)$('#back').focus({preventScroll:true});
 }else{
  stopPageTurn();document.title='司令塔｜城下町';
  feedback.leave({audible});desk?.leave();
  moveCompanion(portraitFor(previous).getBoundingClientRect(),{hideAfter:true,instant});
  if(focus)stationFor(previous).focus({preventScroll:true});
 }
}
function openWorkspace(key='kyun'){
 if(!Object.hasOwn(PLACES,key))return;
 if(view==='work'&&place===key)return;
 if(!returnPending){
  if(view==='work')history.replaceState(history.state,'',`#${key}`);
  else history.pushState({motionTrial:true},'',`#${key}`);
 }
 setView(key,{audible:true});
}
function closeWorkspace({completed=false}={}){
 if(view==='home')return;
 const finishedPlace=place;
 if(completed)desk?.finish(activeDraft);
 setView('home',{audible:!completed});
 if(completed)feedback.complete(finishedPlace);
 if(history.state?.motionTrial&&!returnPending){returnPending=true;history.back();}
 else if(!returnPending)history.replaceState(null,'',location.pathname+location.search);
}
function route(){const key=location.hash.slice(1);return Object.hasOwn(PLACES,key)?key:'home';}
stations.forEach(node=>{
 node.addEventListener('pointerdown',event=>{if(event.isPrimary)node.classList.add('is-pressed');});
 node.addEventListener('click',()=>openWorkspace(node.dataset.place));
});
for(const event of ['pointerup','pointercancel','blur'])window.addEventListener(event,clearPress);
$('#back').addEventListener('click',closeWorkspace);$('#return').addEventListener('click',()=>closeWorkspace({completed:true}));$('#switch').addEventListener('click',closeWorkspace);
$('#brand').addEventListener('click',event=>{event.preventDefault();closeWorkspace();});
$$('[data-go]').forEach(node=>node.addEventListener('click',()=>openWorkspace(node.dataset.go)));
window.addEventListener('popstate',()=>{
 if(returnPending){returnPending=false;if(view==='work'){history.pushState({motionTrial:true},'',`#${place}`);return;}}
 setView(route());
});
window.addEventListener('hashchange',()=>{if(!returnPending)setView(route());});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&view==='work'&&!$('dialog[open]'))closeWorkspace();});
async function copyDraft(draft,kind='body'){
 if(!draft)return;const origin=draft.place||place,snapshot={...draft},text=kind==='link'?draft.link:draft.body;if(!text)return;
 try{await navigator.clipboard.writeText(text);notebook.copied(snapshot,kind,text);showToast(`${PLACES[origin].title}：${kind==='link'?'リンクを':''}コピーしました`);feedback.copied(origin);desk?.copied(snapshot);}
 catch{$('#copyText').value=text;desk?.manualCopy(snapshot,kind,text);$('#copyFallback').showModal();$('#copyText').select();}
}
$('#copy').addEventListener('click',()=>copyDraft(activeDraft));
function reposition(){
 stopPageTurn();syncDeskLayout();desk?.resize();
 cancelAnimationFrame(resizeFrame);
 resizeFrame=requestAnimationFrame(()=>{
  if(view==='work')moveCompanion(dock.getBoundingClientRect(),{instant:true});
  else if(companion.style.visibility==='visible')moveCompanion(portraitFor(place).getBoundingClientRect(),{hideAfter:true,instant:true});
  feedback.refresh();
 });
}
window.addEventListener('resize',reposition);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPageTurn();});
window.addEventListener('pagehide',stopPageTurn);
reduced.addEventListener?.('change',reposition);
window.visualViewport?.addEventListener('resize',reposition);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(reposition).observe(dock);
$('#townTime').textContent=new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date());
desk=createWorkbench({app,places:PLACES,notebook,reduced,getState:()=>({view,place,currentDraft,draft:activeDraft}),selectId,refresh:refreshDrafts,onStatus:showToast,onReposition:reposition,onMotionChange:motionChanged,onCopy:copyDraft,openPlace:openWorkspace});
renderPlace('kyun');document.title='司令塔｜城下町';
if(route()!=='home')setView(route(),{focus:false,instant:true});

const production=createProductionClient({notebook,getState:()=>({view,place,draft:activeDraft}),refresh:refreshDrafts,openPlace:openWorkspace,home:()=>closeWorkspace(),onStatus:showToast,onPause:()=>{hostPaused=true;motionChanged();window.dispatchEvent(new Event('castle:pause'));feedback.leave({audible:false});stopPageTurn();},onResume:()=>{hostPaused=false;motionChanged();window.dispatchEvent(new Event('castle:resume'));if(view==='work')feedback.enter(place,{audible:false});reposition();}});
window.CCCastleApp={open:openWorkspace,home:()=>closeWorkspace(),getState:()=>({view,place,draft:activeDraft}),notebook,production};
