import {CHARACTER_SCENES,CHARACTER_LABELS,SCENE_IDS,sceneCamera,sceneHit} from './scene-manifest.js?v=24';
import {createSceneMotion} from './scene-motion.js?v=24';
import {createPersona} from './persona.js?v=26';
export function createCharacterScenes({app,stations,reduced,onLine,onStatus,onReact}){
 const $=s=>document.querySelector(s),panel=$('#characterScenes');
 if(!panel)return null;
 const image=$('#sceneImage'),frame=$('#sceneFrame'),select=$('#sceneSelect'),dialog=$('#sceneDialog'),full=$('#sceneFullImage'),fullFrame=$('#sceneFullFrame'),fullSelect=$('#sceneFullSelect'),open=$('#sceneExpand');
 const motions=[createSceneMotion({canvas:$('#sceneCanvas'),image,box:frame,reduced}),createSceneMotion({canvas:$('#sceneFullCanvas'),image:full,box:fullFrame,reduced,contain:true})];
 let key=null,current=null,epoch=0,timer=null,paused=false,selection='auto',lastReply=null,cursor='welcome',failureNotice=false;
 let storage;try{storage=globalThis.localStorage;}catch{}
 const persona=createPersona({storage});
 function present(reply){
  if(!reply||!key)return false;lastReply=reply;
  $('#sceneCaption').textContent=reply.text;
  if($('#sceneMood'))$('#sceneMood').textContent=reply.mood;
  panel.dataset.feeling=dialog.dataset.feeling=reply.event;
  const greeting=$('#greetingText');greeting.dataset.reply=reply.id;
  if($('.greeting'))$('.greeting').dataset.feeling=reply.event;
  for(const id of ['#quoteSource','#sceneSource']){const link=$(id);if(!link)continue;link.hidden=false;link.href=reply.url;link.title=reply.source;link.textContent=id==='#quoteSource'?`${reply.character} · ${reply.index}/${reply.total} · 出典 ↗`:`${reply.kind} · ${reply.source} ↗`;}
  onLine(reply.text);return true;
 }
 const choices=new Map(),images=new Map();
 const update=$('#freshNotice'),updateParent=update.parentNode;
 function placeUpdate(inDesk){update.classList.toggle('scene-update',inDesk);if(inDesk)document.querySelector('.desk').insertBefore(update,document.querySelector('.paper'));else updateParent.append(update);}
 function load(src){
  if(images.has(src))return images.get(src);
  const promise=new Promise((resolve,reject)=>{
   const img=new Image();let settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(deadline);if(error){images.delete(src);reject(error);}else resolve(img);};
   const deadline=setTimeout(()=>finish(Error('art timed out')),12000);
   img.onload=()=>finish();img.onerror=()=>finish(Error('art unavailable'));img.src=src;
  });images.set(src,promise);return promise;
 }
 function clearTimers(){clearTimeout(timer);timer=null;}
 function syncSelect(){select.value=fullSelect.value=selection;}
 function refresh(){motions[0].visible(Boolean(key)&&!current?.static&&!paused&&!dialog.open&&app.dataset.focus!=='on');motions[1].visible(Boolean(key)&&!current?.static&&!paused&&dialog.open);if(rotationAllowed())activity();else clearTimers();}
 async function show(id){
  if(!key||!CHARACTER_SCENES[key]?.[id])return false;
  const cfg=CHARACTER_SCENES[key][id],token=++epoch;cursor=id;panel.dataset.loading='true';
  try{
   await load(cfg.src);if(token!==epoch||!key)return false;
   motions.forEach(m=>m.stop());current=cfg;failureNotice=false;
   image.src=full.src=cfg.src;image.alt=full.alt=`${CHARACTER_LABELS[key]}・${cfg.label}`;
   image.style.objectPosition=`${cfg.focus[0]*100}% ${cfg.focus[1]*100}%`;
   panel.dataset.static=dialog.dataset.static=String(Boolean(cfg.static));
   panel.dataset.scene=dialog.dataset.scene=id;panel.dataset.loading='false';panel.dataset.ready='true';
   $('#sceneTitle').textContent=`${CHARACTER_LABELS[key]} — ${cfg.label}`;
   if(lastReply)$('#sceneCaption').textContent=lastReply.text;
   $('#sceneCurrent').textContent=cfg.label;
   if(!cfg.static)motions.forEach(m=>m.set(cfg));refresh();
   if(!reduced.matches&&!paused&&image.animate)image.animate([{opacity:.35},{opacity:1}],{duration:260});
   return true;
  }catch{
   if(token!==epoch)return false;panel.dataset.loading='false';activity();
   if(!failureNotice){onStatus(selection==='auto'?'画像を読み込めませんでした。次の場面へ進みます。':'場面を読み込めませんでした。オンラインで、もう一度場面を選んでください。');failureNotice=true;}return false;
  }
 }
 function rotationAllowed(){return Boolean(key)&&!paused&&!document.hidden&&selection==='auto'&&app.dataset.focus!=='on';}
 function activity(){
  if(!rotationAllowed()||panel.dataset.loading==='true'||timer!==null)return;
  timer=setTimeout(async()=>{
   timer=null;if(!rotationAllowed())return;
   const active=key,next=SCENE_IDS[(SCENE_IDS.indexOf(cursor)+1)%SCENE_IDS.length];
   await show(next);if(key===active)activity();
  },10000);
 }
 function choose(event){
  const value=event.currentTarget.value;if(value!=='auto'&&!SCENE_IDS.includes(value))return;
  if(!key)return;failureNotice=false;selection=value;choices.set(key,value);syncSelect();clearTimers();show(value==='auto'?(current?.id||'welcome'):value);
 }
 select.addEventListener('change',choose);fullSelect.addEventListener('change',choose);
 function react(event,expanded=false){
  if(!key||paused||document.hidden)return false;
  const box=expanded?fullFrame:frame,bounds=box.getBoundingClientRect();
  const camera=current?sceneCamera(current,bounds.width,bounds.height,expanded):null;
  const region=event?.detail&&camera?sceneHit(current,camera,event.clientX-bounds.left,event.clientY-bounds.top):'head';
  const reply=persona.touch(key);
  if(!present(reply))return false;
  if(current&&!current.static)motions[expanded?1:0].react(region);onReact();activity();return true;
 }
 $('#sceneTouch').addEventListener('click',e=>react(e));$('#sceneFullTouch').addEventListener('click',e=>react(e,true));
 open.addEventListener('click',()=>{if(!key)return;dialog.showModal();refresh();});
 $('#sceneClose').addEventListener('click',()=>dialog.close());
 function replyTo(type){
  if(!key||paused||document.hidden)return;
  if(type==='rest'||type==='resume'){
   clearTimers();failureNotice=false;
   selection=type==='rest'?'rest':'auto';choices.set(key,selection);syncSelect();
   show(type==='rest'?'rest':'work');
  }
  present(persona.event(key,type));onReact();activity();
 }
 $('#sceneTalk')?.addEventListener('click',()=>replyTo('talk'));
 $('#sceneRest')?.addEventListener('click',()=>replyTo('rest'));
 $('#sceneContinue')?.addEventListener('click',()=>replyTo('resume'));
 dialog.addEventListener('close',()=>{refresh();activity();open.focus();});
 function enter(next){
  clearTimers();epoch++;persona.leave(key);motions.forEach(m=>m.stop());key=CHARACTER_SCENES[next]?next:null;current=null;lastReply=null;cursor='welcome';failureNotice=false;
  panel.hidden=!key;app.dataset.sceneCharacter=key||'';panel.dataset.ready='false';placeUpdate(Boolean(key));
  if(dialog.open)dialog.close();if(!key)return;
  selection=choices.get(key)||'auto';syncSelect();
  const target=selection==='auto'?'welcome':selection;
  present(persona.enter(key));
  show(target);
 }
 function leave(){clearTimers();epoch++;persona.leave(key);key=null;current=null;lastReply=null;motions.forEach(m=>m.stop());panel.hidden=true;app.dataset.sceneCharacter='';placeUpdate(false);if(dialog.open)dialog.close();}
 function copied(){if(!key)return false;if(selection==='auto'){clearTimers();show('special');}else if(!current?.static)motions[0].react('hand');onStatus('コピーしました');return true;}
 function selected(){if(!key)return;activity();}
 function complete(place){
  const cfg=CHARACTER_SCENES[place]?.tea,station=stations.find(s=>s.dataset.place===place);if(!cfg||!station)return;
  const img=station.querySelector('.sprite > img');load(cfg.src).then(()=>{img.src=cfg.src;img.style.objectPosition=`${cfg.focus[0]*100}% ${cfg.focus[1]*100}%`;}).catch(()=>{});
  return '作業を完了しました';
 }
 function init(){
  for(const station of stations){const cfg=CHARACTER_SCENES[station.dataset.place]?.welcome;if(!cfg)continue;
   station.classList.add('has-scenes');const img=station.querySelector('.sprite > img');img.src=cfg.src;img.style.objectPosition=`${cfg.focus[0]*100}% ${cfg.focus[1]*100}%`;
  }
 }
 function pause(){paused=true;epoch++;panel.dataset.loading='false';clearTimers();motions.forEach(m=>m.stop());}
 function resume(){paused=false;if(key&&(!current||(selection!=='auto'&&current.id!==selection)))show(selection==='auto'?'welcome':selection);refresh();if(key&&lastReply)onLine(lastReply.text);}
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 window.addEventListener('castle:pause',pause);window.addEventListener('castle:resume',resume);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);
 reduced.addEventListener?.('change',refresh);
 // Workbench changes focus via data attributes; stop GPU work while hidden.
 if(typeof MutationObserver!=='undefined')new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['data-focus']});
 $('#paperScroll').addEventListener('scroll',activity,{passive:true});
 return {init,enter,leave,copied,selected,complete,refresh,react,supports:place=>Boolean(CHARACTER_SCENES[place])};
}
