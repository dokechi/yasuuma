import {createEntrySound} from './entry-sound.js?v=20261021.3-audio';
import {createMusicControls} from './music.js?v=20261022.26-audio';
import {createDesk} from './desk.js?v=20261030.1-otoku';
import {createInteractionSound} from './interaction-sound.js?v=20261022.26-audio';
import {createInteractionFeedback} from './interaction-feedback.js?v=20261021.4-touch';
const $ = (id) => document.getElementById(id);
const app = $('app');
const room = $('room');
const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
let settings = {sound:true, ambient:!reducedMedia.matches, reduce:reducedMedia.matches, pace:'normal'};
try { settings = {...settings, ...JSON.parse(localStorage.getItem('shireito-courtyard-v1') || '{}')}; } catch {}
if (!['quick','normal','slow'].includes(settings.pace)) settings.pace='normal';
const rooms = [
  {id:'red', name:'経理', en:'THE LETTER ROOM', sub:'手紙の書斎', color:0x9e4c4c, roof:0x744746, x:-5.3,z:-3.8,rot:.10, welcome:'おかえり。',line:'気になっていたこと、一緒に見ていこう。',focus:'47% 34%'},
  {id:'purple', name:'過去原稿',en:'THE PROMENADE',sub:'散歩の支度',color:0x79648c,roof:0x625c75,x:5.3,z:-4.2,rot:-.10,welcome:'ちょうど、よかった。',line:'今日はどんなものを見つけに行こうか。',focus:'57% 34%'},
  {id:'silver',name:'FP・TikTok',en:'THE ROYAL LIBRARY',sub:'王都の図書室',color:0x527e8f,roof:0x526f77,x:-6.2,z:3.0,rot:.28,welcome:'お待ちしていました。',line:'読みかけの続き、ここから始めましょう。',focus:'50% 33%'},
  {id:'orange',name:'仕入れ',en:"THE MERCHANT'S TAVERN",sub:'商人の酒場',color:0xb67b3e,roof:0x8b6247,x:6.2,z:3.0,rot:-.28,welcome:'おかえりなさい。',line:'今日も、いいものが見つかるといいね。',focus:'52% 30%'}
];
let phase='town', current=null, world=null, audio=null, desk=null;
let entrySound=null,entryAnimated=false,effectsGain=null,effectsVolume=.5,music=null,interactionSound=null,feedback=null;
let nextContextRoom=null;
function openContext(place){const id=({kyun:'red',choi:'purple',otoku:'purple',fp:'silver',shiire:'orange'})[place];if(!id)return;if(phase==='town')enterRoom(id);else if(phase==='room'){nextContextRoom=id;goBack();}}
let entryStart=0, roomTimer=0, replayAfterBack=null;
const labels=new Map();
for(const r of rooms){
  const b=document.createElement('button');
  b.className='place-label'; b.dataset.room=r.id; b.setAttribute('aria-label',r.name+'に入る');
  b.innerHTML=`<img src="assets/${r.id}-face.webp" alt=""><span><small>${r.sub}</small><strong>${r.name}</strong></span><span class="arrow" aria-hidden="true">›</span>`;
  b.addEventListener('pointerenter',()=>world?.highlight(r.id));
  b.addEventListener('pointerleave',()=>world?.highlight(null));
  b.addEventListener('focus',()=>world?.highlight(r.id));
  b.addEventListener('blur',()=>world?.highlight(null));
  b.addEventListener('pointerdown',()=>b.classList.add('pressed'));
  b.addEventListener('pointerup',()=>b.classList.remove('pressed'));
  b.addEventListener('pointercancel',()=>b.classList.remove('pressed'));
  b.addEventListener('click',()=>enterRoom(r.id));
  $('labels').append(b); labels.set(r.id,b);
  const im=new Image(); im.src=`assets/${r.id}.webp`;
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
  current=rooms.find(r=>r.id===id);if(!current)return;
  const r=current; phase='entering';entryStart=performance.now();
  app.dataset.phase=phase;app.dataset.entering=id;app.classList.add('leaving');app.style.removeProperty('--entry-light');
  $('room-art').src=`assets/${id}.webp`;$('room-art').alt=r.sub+'にいる'+r.name+'の案内役';$('room-art').style.objectPosition=r.focus;
  $('room-title').textContent=r.name;$('room-location').textContent=r.en;
  $('announcer').textContent=r.name+'へ移動しています';
  const duration=instant||settings.reduce?0:({quick:650,normal:1000,slow:1400}[settings.pace]);
  entryAnimated=duration>0;app.style.setProperty('--entry-duration',duration+'ms');
  if(duration===0){showRoom();return}
  if(settings.sound){audioReady();entrySound?.begin(id,duration);}
  world?.enter(id,duration);
  roomTimer=setTimeout(showRoom,duration);
}
function showRoom(){
  if(phase!=='entering')return;
  phase='room';app.dataset.phase=phase;
  room.hidden=false;app.classList.remove('leaving');app.classList.add('room-mode');app.classList.remove('town-mode');
  app.style.removeProperty('--entry-light');
  if(entryAnimated&&!settings.reduce)room.classList.add('entered');
  if(history.state?.shireitoRoom!==current.id)history.pushState({shireitoRoom:current.id},'', '#'+current.id);
  arrivalSound(); $('back').focus({preventScroll:true});$('announcer').textContent=current.name+'に入りました';
  world?.pause();
  desk?.enter(current.id);
}
function goBack(replay=false,fromHistory=false){
  if(phase==='town')return;
  entrySound?.cancel();
  if(!fromHistory&&history.state?.shireitoRoom){if(replay)replayAfterBack=current.id;history.back();return;}
  desk?.leave();
  clearTimeout(roomTimer);phase='town';app.dataset.phase=phase;room.hidden=true;room.classList.remove('entered');app.classList.remove('room-mode','leaving');app.classList.add('town-mode');
  world?.reset();labels.get(current?.id)?.focus({preventScroll:true});$('announcer').textContent='司令塔に戻りました';
  if(replay){const id=current.id;requestAnimationFrame(()=>requestAnimationFrame(()=>enterRoom(id)))}
}
window.addEventListener('popstate',ev=>{if(phase!=='town')goBack(false,true);if(nextContextRoom){const id=nextContextRoom;nextContextRoom=null;requestAnimationFrame(()=>enterRoom(id));}else if(replayAfterBack){const id=replayAfterBack;replayAfterBack=null;requestAnimationFrame(()=>enterRoom(id))}else if(ev.state?.shireitoRoom){enterRoom(ev.state.shireitoRoom,true)}});
$('back').addEventListener('click',()=>goBack());$('again').addEventListener('click',()=>goBack(true));
document.querySelectorAll('.quick').forEach(b=>b.addEventListener('click',()=>enterRoom(b.dataset.room,true)));
$('sound').addEventListener('click',()=>{settings.sound=!settings.sound;if(!settings.sound)silenceEffects();saveSettings();syncSettings();if(settings.sound)playFeedback('latch')});
$('settings-open').addEventListener('click',()=>{$('settings').showModal();world?.pause()});
$('settings-close').addEventListener('click',()=>$('settings').close());
$('settings').addEventListener('close',()=>{if(phase==='town')world?.resume()});
$('settings').addEventListener('click',e=>{if(e.target===$('settings')){const r=$('settings').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('settings').close()}});
for(const [id,key] of [['sound-setting','sound'],['ambient-setting','ambient'],['reduce-setting','reduce']])$(id).addEventListener('change',e=>{settings[key]=e.target.checked;if(key==='sound'&&!settings.sound)silenceEffects();saveSettings();syncSettings()});
document.querySelectorAll('[name=pace]').forEach(i=>i.addEventListener('change',e=>{settings.pace=e.target.value;saveSettings()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))goBack()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){world?.pause();silenceEffects();audio?.suspend().catch(()=>{})}else if(phase==='town'&&!$('settings').open)world?.resume()});
desk=createDesk({onOpenRoom:openContext,onHome:()=>goBack(),onPause:()=>{world?.pause();silenceEffects();audio?.suspend().catch(()=>{});app.classList.add('is-away');},onResume:()=>{app.classList.remove('is-away');if(phase==='town'&&!$('settings').open)world?.resume();},onSettings:()=>$('settings-open').click(),onFeedback:playFeedback});
music=createMusicControls({getEffects:()=>({enabled:settings.sound}),setEffects:change=>{if(typeof change.volume==='number'){effectsVolume=change.volume;if(effectsGain)effectsGain.gain.value=effectsVolume/.5;}if(typeof change.enabled==='boolean'){settings.sound=change.enabled;if(!settings.sound)silenceEffects();saveSettings();syncSettings();}if(change.preview&&settings.sound)playFeedback('latch');},onStatus:text=>$('bgmStatus').textContent=text});
feedback=createInteractionFeedback({play:playFeedback,active:()=>!app.classList.contains('is-away'),reduced:()=>settings.reduce||reducedMedia.matches,room:()=>current?.id||'red'});
document.querySelectorAll('[data-feedback-preview]').forEach(b=>b.addEventListener('click',()=>playFeedback(b.dataset.feedbackPreview)));
syncSettings();app.dataset.phase='town';
if(history.state?.shireitoRoom)history.replaceState(null,'',location.pathname+location.search);

try{
 const {createHybridWorld}=await import('./hybrid-world.js?v=20261030.1-otoku');
 world=await createHybridWorld({app,host:$('world'),rooms,labels,getPhase:()=>phase,getSettings:()=>settings,getWorkMarks:()=>desk?.workMarks()||[],onEnter:enterRoom});
 $('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');
}catch(error){console.error('司令塔の描画を開始できませんでした',error);app.classList.add('fallback-town');$('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');$('town-hint').textContent='看板を選んで、部屋へ'}
desk.ready();

