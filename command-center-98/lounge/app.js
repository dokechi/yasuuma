import {createEntrySound} from './entry-sound.js?v=20261021.3-audio';
import {createMusicControls} from './music.js?v=20261030.8-integrated';
import {createDesk} from './desk.js?v=20261102.1-tanaka';
import {createInteractionSound} from './interaction-sound.js?v=20261022.26-audio';
import {createInteractionFeedback} from './interaction-feedback.js?v=20261101.1-living';
const $ = (id) => document.getElementById(id);
let accountContext=null;
const accountRooms={tanaka:{key:'tanaka',name:'田中卓',artKey:'planned-5'},kyun:{key:'insurance',name:'保険'},otoku:{key:'otoku',name:'まだ安く買えるはず'},rakuten:{key:'rakuten',name:'楽天犬'},lottery:{key:'lottery',name:'抽選日記',artKey:'planned-4'}};
const storybookPresentation=document.body.classList.contains('storybook-atelier');
const workingPresentation=document.body.classList.contains('storybook-workbench');
const app = $('app');
const room = $('room');
const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
let settings = {sound:false, ambient:!reducedMedia.matches, reduce:reducedMedia.matches, pace:'normal'};
try { settings = {...settings, ...JSON.parse(localStorage.getItem('shireito-courtyard-v1') || '{}')}; } catch {}
if (!['quick','normal','slow'].includes(settings.pace)) settings.pace='normal';
const rooms = [
  {id:'red', name:'保険', en:'THE LETTER ROOM', sub:'手紙の書斎', color:0x9e4c4c, roof:0x744746, x:-5.3,z:-3.8,rot:.10, welcome:'おかえり。',line:'気になっていたこと、一緒に見ていこう。',focus:'47% 34%'},
  {id:'purple', name:'過去原稿',en:'THE PROMENADE',sub:'散歩の支度',color:0x79648c,roof:0x625c75,x:5.3,z:-4.2,rot:-.10,welcome:'ちょうど、よかった。',line:'今日はどんなものを見つけに行こうか。',focus:'57% 34%'},
  {id:'silver',name:'FP・TikTok',en:'THE ROYAL LIBRARY',sub:'王都の図書室',color:0x527e8f,roof:0x526f77,x:-6.2,z:3.0,rot:.28,welcome:'お待ちしていました。',line:'読みかけの続き、ここから始めましょう。',focus:'50% 33%'},
  {id:'orange',name:'仕入れ',en:"THE MERCHANT'S TAVERN",sub:'商人の酒場',color:0xb67b3e,roof:0x8b6247,x:6.2,z:3.0,rot:-.28,welcome:'おかえりなさい。',line:'今日も、いいものが見つかるといいね。',focus:'52% 30%'}
];
let phase='town', current=null, world=null, audio=null, desk=null;
let entrySound=null,entryAnimated=false,effectsGain=null,effectsVolume=.5,music=null,interactionSound=null,feedback=null;
let nextContextRoom=null, replayAfterBack=null, historyBackPending=false;
let navigationIntent=0, routeOptions=null, entryFromHistory=false, entryResumeDraft,entryInitial=false;
let workingStarted=false;
const accountRoomIds={insurance:'red',otoku:'purple',rakuten:'purple',lottery:'purple',tanaka:'purple',fp:'silver',sourcing:'orange'};
const workingKeys=['insurance','otoku','rakuten','lottery','tanaka','sourcing'];
const roomAccounts={red:'insurance',purple:'otoku',silver:'fp',orange:'sourcing'};
const accountPlaces={insurance:'kyun',otoku:'otoku',rakuten:'rakuten',lottery:'lottery',tanaka:'tanaka',fp:'fp',sourcing:'shiire'};
const validDraftId=value=>typeof value==='string'&&value.length>0&&value.length<=1000&&!/[\u0000-\u001f\u007f]/.test(value);
function historyRoute(state){
 if(!state||typeof state!=='object')return null;
 const account=state.shireitoAccount??roomAccounts[state.shireitoRoom];
 if(typeof account!=='string'||typeof state.shireitoRoom!=='string'||!Object.hasOwn(accountRoomIds,account)||accountRoomIds[account]!==state.shireitoRoom)return null;
 let draft=validDraftId(state.shireitoDraft)?state.shireitoDraft:undefined;
 const saved=draft&&desk?.notebook.get(draft);
 if(saved&&(saved.place!==accountPlaces[account]||accountRooms[accountPlaces[account]]&&saved.source?.account!==account))draft=undefined;
 return {shireitoRoom:state.shireitoRoom,shireitoAccount:account,...(draft?{shireitoDraft:draft}:{})};
}
function currentHistoryRoute(){
 const state={shireitoRoom:current?.id,shireitoAccount:room.dataset.account};
 const selected=!$('desk-article').hidden&&$('desk-list').querySelector('.manuscript-card[aria-pressed="true"]')?.dataset.draftId;
 if(validDraftId(selected))state.shireitoDraft=selected;
 return historyRoute(state);
}
function rememberHistory(){
 if(phase!=='room')return;
 const next=currentHistoryRoute(),saved=historyRoute(history.state);
 if(!next||!saved||next.shireitoAccount!==saved.shireitoAccount||next.shireitoRoom!==saved.shireitoRoom)return;
 const value={...history.state,...next};if(!next.shireitoDraft)delete value.shireitoDraft;
 if(JSON.stringify(value)!==JSON.stringify(history.state))history.replaceState(value,'');
}
function restoreHistoryRoute(state,{fromHistory=true,instant=true}={}){
 const target=historyRoute(state);if(!target)return false;
 const previous=routeOptions;routeOptions={fromHistory,instant,...(target.shireitoAccount==='fp'?{resumeDraft:target.shireitoDraft}:{})};
 try{
  if(target.shireitoAccount==='fp'){desk?.accountBoard.hide();accountContext=null;enterRoom('silver',instant);}
  else desk?.accountBoard.open(target.shireitoAccount,target.shireitoDraft,{resume:true});
 }finally{routeOptions=previous;}
 return true;
}
function openContext(place){
 const context=accountRooms[place]||null,id=({kyun:'red',choi:'purple',otoku:'purple',rakuten:'purple',lottery:'purple',tanaka:'purple',fp:'silver',shiire:'orange'})[place];if(!id)return;
 const instant=routeOptions?.instant??true;
 if((workingPresentation||routeOptions?.working)&&phase==='room'){rememberHistory();goBack(false,true,true);}
 if(phase==='entering')goBack(false,true,true);
 if(phase==='town'){accountContext=context;enterRoom(id,instant);}
 else if(phase==='room'){nextContextRoom={id,context,instant};goBack(false,false,true);}
}
let entryStart=0, roomTimer=0;
const labels=new Map();
for(const r of rooms){
  const b=document.createElement('button');
  b.className='place-label'; b.dataset.room=r.id; b.setAttribute('aria-label',r.name+'に入る');
  b.innerHTML=`${storybookPresentation?'':`<img src="assets/${r.id}-face.webp" alt="">`}<span><small>${r.sub}</small><strong>${r.name}</strong></span><span class="arrow" aria-hidden="true">›</span>`;
  b.addEventListener('pointerenter',()=>world?.highlight(r.id));
  b.addEventListener('pointerleave',()=>world?.highlight(null));
  b.addEventListener('focus',()=>world?.highlight(r.id));
  b.addEventListener('blur',()=>world?.highlight(null));
  b.addEventListener('pointerdown',()=>b.classList.add('pressed'));
  b.addEventListener('pointerup',()=>b.classList.remove('pressed'));
  b.addEventListener('pointercancel',()=>b.classList.remove('pressed'));
  b.addEventListener('click',()=>{accountContext=null;enterRoom(r.id);});
  $('labels').append(b); labels.set(r.id,b);

}
function saveSettings(){try{localStorage.setItem('shireito-courtyard-v1',JSON.stringify(settings))}catch{}}
function syncSettings(){
  $('sound').setAttribute('aria-pressed',String(settings.sound));
  $('sound').setAttribute('aria-label',settings.sound?'効果音をオフにする':'効果音をオンにする');
  $('sound').textContent=settings.sound?'効果音 ON':'効果音 OFF';
  if(music)music.refresh();
  $('sound-setting').checked=settings.sound;
  app.dataset.feedbackMotion=settings.reduce?'reduced':'normal';
  document.querySelectorAll('[data-feedback-preview]').forEach(b=>b.disabled=!settings.sound);
  $('ambient-setting').checked=settings.ambient;
  $('reduce-setting').checked=settings.reduce;
  document.querySelector(`input[name=pace][value=${settings.pace}]`).checked=true;
}
function audioReady(){
  if(!settings.sound)return;
  try{audio ||= new (window.AudioContext || window.webkitAudioContext)();if(!effectsGain){effectsGain=audio.createGain();effectsGain.gain.value=effectsVolume/.5;effectsGain.connect(audio.destination);}entrySound ||= createEntrySound(audio,effectsGain);interactionSound ||= createInteractionSound(audio,effectsGain); if(audio.state==='suspended') audio.resume().catch(()=>{});}catch{}
}
function playFeedback(kind='tap',roomId=current?.id){if(!settings.sound||document.hidden)return;try{audioReady();interactionSound?.play(kind,roomId);}catch{}}
function silenceEffects(){entrySound?.cancel();interactionSound?.cancel();feedback?.clear();}
function arrivalSound(){if(settings.sound&&!document.hidden){audioReady();entrySound?.arrive(current.id)}}
function enterRoom(id,instant=false){
  if(phase!=='town')return;
  current=rooms.find(r=>r.id===id);if(!current)return;if(accountContext)current={...current,name:accountContext.name,sub:accountContext.name+'の作業部屋',en:'YOUR ACCOUNT ROOM',focus:'50% 35%'};
  desk?.accountBoard.hide();
  const token=++navigationIntent;nextContextRoom=null;replayAfterBack=null;entryFromHistory=routeOptions?.fromHistory===true;entryResumeDraft=routeOptions?.resumeDraft;entryInitial=routeOptions?.initial===true;
  const r=current; phase='entering';entryStart=performance.now();
  app.dataset.phase=phase;app.dataset.entering=id;app.classList.add('leaving');app.style.removeProperty('--entry-light');
  room.dataset.account=accountContext?.key||({orange:'sourcing',silver:'fp',red:'insurance',purple:'otoku'})[id];
  if(storybookPresentation)$('room-art').removeAttribute('src');else $('room-art').src=accountContext?`assets/panel-${accountContext.artKey||accountContext.key}.webp`:`assets/${id}.webp`;$('room-art').alt=r.sub+'にいる'+r.name+'の案内役';$('room-art').style.objectPosition=r.focus;
  $('room-title').textContent=r.name;$('room-location').textContent=r.en;
  $('announcer').textContent=r.name+'へ移動しています';
  const duration=instant||settings.reduce?0:({quick:650,normal:1000,slow:1400}[settings.pace]);
  entryAnimated=duration>0;app.style.setProperty('--entry-duration',duration+'ms');
  if(duration===0){showRoom(token);return}
  if(settings.sound){audioReady();entrySound?.begin(id,duration);}
  world?.enter(id,duration);
  roomTimer=setTimeout(()=>showRoom(token),duration);
}
function showRoom(token){
  if(phase!=='entering'||token!==navigationIntent)return;
  phase='room';app.dataset.phase=phase;
  room.hidden=false;app.classList.remove('leaving');app.classList.add('room-mode');app.classList.remove('town-mode');
  app.style.removeProperty('--entry-light');
  if(entryAnimated&&!settings.reduce)room.classList.add('entered');
  if(!entryInitial){arrivalSound();$('back').focus({preventScroll:true});$('announcer').textContent=current.name+'に入りました';}else $('announcer').textContent='';
  world?.pause();
  desk?.enter(current.id,entryResumeDraft||entryInitial?{resumeDraft:entryResumeDraft,passive:entryInitial}:undefined);
  const target=currentHistoryRoute(),saved=historyRoute(history.state);
  if(entryInitial&&target)history.replaceState({...history.state,...target,shireitoInitial:true},'');
  else if(!entryFromHistory&&target&&(saved?.shireitoRoom!==target.shireitoRoom||saved?.shireitoAccount!==target.shireitoAccount))history.pushState(target,'','#'+current.id);
  else rememberHistory();
}
function goBack(replay=false,fromHistory=false,preservePending=false){
  ++navigationIntent;
  if(!preservePending){nextContextRoom=null;replayAfterBack=null;}
  if(phase==='town')return;
  entrySound?.cancel();if(!fromHistory)rememberHistory();
  const replayRoute=currentHistoryRoute();
  if(!fromHistory&&workingPresentation){if(!replay)history.replaceState(null,'',location.pathname+location.search);}
  else if(!fromHistory&&history.state?.shireitoRoom){
    if(replay)replayAfterBack=replayRoute;
    if(!historyBackPending){historyBackPending=true;history.back();}
    return;
  }
  desk?.leave();
  // Supplementary FP can be the first room opened, before any account visit.
  if(storybookPresentation&&desk?.accountBoard.element.hidden)desk.accountBoard.show();
  clearTimeout(roomTimer);phase='town';app.dataset.phase=phase;room.hidden=true;room.classList.remove('entered');app.classList.remove('room-mode','leaving');app.classList.add('town-mode');
  world?.reset();labels.get(current?.id)?.focus({preventScroll:true});$('announcer').textContent='司令塔に戻りました';
  if(replay&&replayRoute){const token=navigationIntent;requestAnimationFrame(()=>{if(token===navigationIntent&&phase==='town')restoreHistoryRoute(replayRoute,{fromHistory:workingPresentation,instant:false});});}
}
window.addEventListener('popstate',ev=>{
 const queued=nextContextRoom,replay=replayAfterBack;nextContextRoom=null;replayAfterBack=null;historyBackPending=false;
 ++navigationIntent;if(phase!=='town')goBack(false,true,true);
 const token=navigationIntent;
 if(queued||replay)requestAnimationFrame(()=>{
  if(token!==navigationIntent||phase!=='town')return;
  if(queued){accountContext=queued.context;enterRoom(queued.id,queued.instant);}
  else restoreHistoryRoute(replay,{fromHistory:false,instant:false});
 });
 else restoreHistoryRoute(ev.state);
});
$('back').addEventListener('click',()=>goBack());$('again').addEventListener('click',()=>goBack(true));
document.querySelectorAll('.quick').forEach(b=>b.addEventListener('click',()=>{accountContext=null;enterRoom(b.dataset.room,true);}));
$('sound').addEventListener('click',()=>{settings.sound=!settings.sound;if(!settings.sound)silenceEffects();saveSettings();syncSettings();if(settings.sound)playFeedback('latch')});
$('settings-open').addEventListener('click',()=>{$('settings').showModal();world?.pause()});
$('settings-close').addEventListener('click',()=>$('settings').close());
$('settings').addEventListener('close',()=>{if(phase==='town')world?.resume()});
$('settings').addEventListener('click',e=>{if(e.target===$('settings')){const r=$('settings').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('settings').close()}});
for(const [id,key] of [['sound-setting','sound'],['ambient-setting','ambient'],['reduce-setting','reduce']])$(id).addEventListener('change',e=>{settings[key]=e.target.checked;if(key==='sound'&&!settings.sound)silenceEffects();saveSettings();syncSettings()});
document.querySelectorAll('[name=pace]').forEach(i=>i.addEventListener('change',e=>{settings.pace=e.target.value;saveSettings()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))goBack()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){world?.pause();silenceEffects();audio?.suspend().catch(()=>{})}else if(phase==='town'&&!$('settings').open)world?.resume()});
desk=createDesk({onLounge:()=>{if(storybookPresentation){desk.accountBoard.show();$('settings-open').click();return;}initializeWorld();},onOpenRoom:openContext,onWorkingChapter:key=>openWorkingChapter(key),onHome:()=>goBack(),onPause:()=>{world?.pause();silenceEffects();audio?.suspend().catch(()=>{});app.classList.add('is-away');},onResume:()=>{app.classList.remove('is-away');if(phase==='town'&&!$('settings').open)world?.resume();},onSettings:()=>$('settings-open').click(),onFeedback:playFeedback});
// The existing owner renders the selected card (including variants). Store only
// its ID in the current browser entry, never manuscript text or another model.
const selectionHistory=new MutationObserver(rememberHistory);
selectionHistory.observe($('desk-list'),{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','data-draft-id']});
window.addEventListener('pagehide',event=>{if(!event.persisted)selectionHistory.disconnect();});
music=createMusicControls({autoplay:false,getEffects:()=>({enabled:settings.sound}),setEffects:change=>{if(typeof change.volume==='number'){effectsVolume=change.volume;if(effectsGain)effectsGain.gain.value=effectsVolume/.5;}if(typeof change.enabled==='boolean'){settings.sound=change.enabled;if(!settings.sound)silenceEffects();saveSettings();syncSettings();}if(change.preview&&settings.sound)playFeedback('latch');},onStatus:text=>$('bgmStatus').textContent=text});
feedback=createInteractionFeedback({play:playFeedback,active:()=>!app.classList.contains('is-away'),reduced:()=>settings.reduce||reducedMedia.matches,room:()=>current?.id||'red'});
document.querySelectorAll('[data-feedback-preview]').forEach(b=>b.addEventListener('click',()=>playFeedback(b.dataset.feedbackPreview)));
syncSettings();app.dataset.phase='town';
if(!workingPresentation&&history.state?.shireitoRoom)history.replaceState(null,'',location.pathname+location.search);

let worldLoading=null;
function initializeWorld(){if(worldLoading)return worldLoading;worldLoading=(async()=>{
try{
 const {createHybridWorld}=await import('./hybrid-world.js?v=20261102.1-tanaka');
 world=await createHybridWorld({app,host:$('world'),rooms,labels,getPhase:()=>phase,getSettings:()=>settings,getWorkMarks:()=>desk?.workMarks()||[],onEnter:id=>{accountContext=null;enterRoom(id);}});
 $('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');
}catch(error){console.error('司令塔の描画を開始できませんでした',error);app.classList.add('fallback-town');$('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');$('town-hint').textContent='看板を選んで、部屋へ'}
})();return worldLoading;}
$('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');
desk.ready();
if(workingPresentation)startWorkingChapter();

// The spatial presentation consumes the same account controller, not copied data.
export const getAccountBoard=()=>desk?.accountBoard;

// Read-only room summaries and existing owner actions for optional living tools.
export const getLivingDesk=()=>desk?.living;

// Existing supplementary reader remains reachable from the book's settings.
// It does not add an account or a second reader/controller.
export function openSupplementaryReader(key){
 if(key!=='fp')return false;
 if(phase!=='town'){
  if(!workingPresentation)return false;
  if(phase==='room'&&room.dataset.account==='fp')return true;
  rememberHistory();goBack(false,true,true);
 }
 desk?.accountBoard?.hide();accountContext=null;enterRoom('silver',true);return true;
}

// A work-first opening reuses the one account/desk controller. These helpers
// expose identity only; no source text, alternate cache or background reads.
export function resolveWorkingChapter(){
 const route=phase==='room'?currentHistoryRoute():historyRoute(history.state);
 if(route&&(workingKeys.includes(route.shireitoAccount)||route.shireitoAccount==='fp'))return {key:route.shireitoAccount,...(route.shireitoDraft?{draftId:route.shireitoDraft}:{})};
 const last=desk?.notebook.pref('lastWork',null),keyForPlace=place=>workingKeys.find(key=>accountPlaces[key]===place);
 const from=(place,id)=>{const key=keyForPlace(place);if(!key)return null;const saved=validDraftId(id)&&desk?.notebook.get(id);if(saved&&(saved.place!==place||key!=='sourcing'&&saved.source?.account!==key))return null;return {key,...(validDraftId(id)?{draftId:id}:{})};};
 const remembered=last&&typeof last==='object'&&from(last.place,last.id);if(remembered)return remembered;
 const place=desk?.notebook.lastPlace();return from(place,desk?.notebook.selected(place))||{key:'insurance'};
}
export function openWorkingChapter(key,{initial=false,draftId}={}){
 if(!workingKeys.includes(key)||!desk)return false;
 if(initial){
  if(!workingPresentation||workingStarted||navigationIntent!==0||phase!=='town')return false;
  workingStarted=true;
  // A valid existing deep-link/browser entry has priority over a generic start.
  const saved=historyRoute(history.state);if(saved&&workingKeys.includes(saved.shireitoAccount)){key=saved.shireitoAccount;draftId=saved.shireitoDraft;}
 }else if(phase==='room'&&room.dataset.account===key&&(!draftId||currentHistoryRoute()?.shireitoDraft===draftId))return true;
 const target=historyRoute({shireitoRoom:accountRoomIds[key],shireitoAccount:key,...(draftId?{shireitoDraft:draftId}:{})});
 const previous=routeOptions;routeOptions={instant:true,working:true,initial};
 try{return desk.requestWorkingChapter(key,{draftId:target?.shireitoDraft,initial});}finally{routeOptions=previous;}
}
export function startWorkingChapter(){
 if(!workingPresentation||workingStarted||navigationIntent!==0||phase!=='town')return false;
 const target=resolveWorkingChapter();
 if(target.key==='fp'){workingStarted=true;const previous=routeOptions;routeOptions={initial:true,fromHistory:true,resumeDraft:target.draftId};try{accountContext=null;enterRoom('silver',true);return true;}finally{routeOptions=previous;}}
 return openWorkingChapter(target.key,{initial:true,draftId:target.draftId});
}

