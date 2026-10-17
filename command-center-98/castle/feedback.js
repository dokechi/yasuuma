import {createMusicControls} from './music.js?v=33';
import {createCharacterScenes} from './character-scenes.js?v=33';
import {createCharacterRig} from './character-rig.js?v=24';
import {createSkirtAction} from './skirt-action.js?v=24';
// Shared presentation layer. Character-specific assets/copy live in CHARACTERS.
export function createFeedback({app,stations,companion,reduced,onStatus}) {
 const soundButton=document.querySelector('#soundToggle');
 const greeting=document.querySelector('#greetingText');
 const landscape=document.querySelector('.landscape'),townLights=document.querySelector('.town-lights');
 const stage=companion.querySelector('.sprite');
 const expressions=[stage.querySelector('.expression-open'),stage.querySelector('.expression-closed')];
 const readingFace=stage.querySelector('.expression-reading');
 let actionCamera=null,actionPose=null,actionPhase='',actionKind=null;
 const expressionWindow=stage.querySelector('.expression-window');
 const rig=createCharacterRig({stage,canvas:document.querySelector('#characterRig'),image:document.querySelector('#character'),expressionWindow,blinkWindow:stage.querySelector('.blink-window'),reduced});
 const skirtAction=createSkirtAction({stage,canvas:document.querySelector('#characterAction'),reduced,onFrame:presentAction});
 let expressionTimer=null,expressionActive=false;
 let active=null,characters={},blinkTimer,eyeTimer,speechTimer,context=null,soundEnabled=false,audioEpoch=0;
 let reactionTimer=null;
 const touchCounts=new Map();
 const animations=new Map(),activeVoices=new Set(),ready=new Set();
 const nodes=new Map();
 const scenes=createCharacterScenes({app,stations,reduced,onLine:line=>{if(active)say(active,line,{persistent:true});},onStatus,onReact:()=>sound('select')});
 let music=null,effectsVolume=.5;
 const storageKey='castle-town.sound.v1';
 try{soundEnabled=localStorage.getItem(storageKey)==='on';}catch{}
 function updateSound(){soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'効果音をオフにする':'効果音をオンにする');soundButton.title=soundEnabled?'効果音オン':'効果音オフ';soundButton.querySelector('span').textContent=soundEnabled?'効果音 ON':'効果音 OFF';music?.refresh();}
 function stopSound(){audioEpoch++;for(const voice of activeVoices){try{voice.stop();}catch{}}activeVoices.clear();}
 function tone(ctx,t,freq,end,duration,volume,type='sine'){
  volume=Math.max(.000001,volume*effectsVolume);
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
  osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain);gain.connect(ctx.destination);activeVoices.add(osc);
  osc.onended=()=>{activeVoices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+duration+.02);
 }
 async function sound(kind){
  if(!soundEnabled||document.hidden||effectsVolume===0)return;
  const epoch=audioEpoch;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio){soundEnabled=false;updateSound();onStatus('このブラウザでは効果音を利用できません');return;}
   context??=new Audio();
   if(context.state==='suspended')await context.resume();
   if(!soundEnabled||document.hidden||epoch!==audioEpoch||context.state!=='running')return;
   const t=context.currentTime;
   if(kind==='enter'){
    tone(context,t,740,510,.06,.025,'triangle');
    tone(context,t+.025,260,1050,.20,.018);
   }else if(kind==='complete'||kind==='copy'){
    const notes=kind==='complete'?[659.25,830.61,987.77]:[783.99,1046.5];
    notes.forEach((f,i)=>tone(context,t+i*.055,f,f,.20,.028));
   }else if(kind==='back')tone(context,t,480,310,.10,.021,'triangle');
   else {const material={kyun:[440,320,.065,'triangle'],choi:[1174,1046,.09,'sine'],fp:[784,659,.06,'sine'],shiire:[220,165,.055,'triangle']}[active]||[880,660,.055,'triangle'];tone(context,t,material[0],material[1],material[2],.018,material[3]);}
  }catch{soundEnabled=false;updateSound();onStatus('効果音を再生できませんでした。音をオンにして再試行できます');}
 }
 function pulse(node,keyframes,duration=450){
  if(!node||reduced.matches||document.hidden||!node.animate)return;
  animations.get(node)?.cancel();
  const anim=node.animate(keyframes,{duration,easing:'cubic-bezier(.2,.8,.2,1)'});animations.set(node,anim);
  anim.finished.then(()=>{if(animations.get(node)===anim)animations.delete(node);}).catch(()=>{});
 }
 function outline(node,color){pulse(node,[{filter:'drop-shadow(0 0 0 transparent)'},{filter:`drop-shadow(0 0 6px ${color})`,offset:.25},{filter:'drop-shadow(0 0 0 transparent)'}],430);}
 function respondToPress(event){
  if(event.isPrimary===false||event.button>0)return;
  const button=event.currentTarget;
  const bounds=button.getBoundingClientRect();
  button.style.setProperty('--press-x',`${event.clientX-bounds.left}px`);
  button.style.setProperty('--press-y',`${event.clientY-bounds.top}px`);
 }
 function resetEyes(){nodes.forEach(({overlay})=>overlay.classList.remove('eyes-closed'));}
 function stopBlink(){clearTimeout(blinkTimer);clearTimeout(eyeTimer);resetEyes();}
 function layoutEyes(node,key,position){
  const cfg=characters[key];if(!cfg?.eyes)return;
  const bounds=node.getBoundingClientRect(),box={width:node.clientWidth||bounds.width,height:node.clientHeight||bounds.height},[width,height]=cfg.size;
  if(!box.width||!box.height)return;
  const camera=node===stage?actionCamera:null,scale=camera?.scale??Math.max(box.width/width,box.height/height),x=camera?.x??(box.width-width*scale)/2,y=camera?.y??(box.height-height*scale)*position;
  // Coordinates are in the original sprite. Only this small eye area is replaced.
  const points=cfg.eyes.map(([px,py])=>`${x+px*scale}px ${y+py*scale}px`).join(',');
  node.querySelector('.blink-window').style.clipPath=`polygon(${points})`;
  const [a,b,c,d,tx,ty]=cfg.blinkTransform||[1,0,0,1,0,0],[bw,bh]=cfg.blinkSize||cfg.size;
  Object.assign(node.querySelector('.blink-overlay').style,{width:bw*scale+'px',height:bh*scale+'px',left:x+tx*scale+'px',top:y+ty*scale+'px',transform:`matrix(${a},${b},${c},${d},0,0)`});
 }
 function clearExpression(){
  clearTimeout(expressionTimer);expressionTimer=null;expressionActive=false;
  expressions.forEach(image=>image.classList.remove('is-smiling'));
 }
 function loadExpression(key){
  const cfg=characters[key].expression;
  clearExpression();
  expressions.forEach((image,index)=>{
   if(image.dataset.character===key&&image.dataset.ready==='true')return;
   image.dataset.character=key;image.dataset.ready='false';
   // Loading never blocks controls or starts a reaction by itself.
   if(!cfg?.frames[index])return;
   image.onload=()=>{if(image.dataset.character===key)image.dataset.ready='true';};
   image.onerror=()=>{if(image.dataset.character===key){image.dataset.ready='false';clearExpression();scheduleBlink();}};
   image.src=cfg.frames[index].src;
   if(image.complete&&image.naturalWidth>0)image.dataset.ready='true';
  });
 }
 function layoutExpression(){
  const cfg=characters[active]?.expression;if(!cfg)return;
  const bounds=stage.getBoundingClientRect(),w=stage.clientWidth||bounds.width,h=stage.clientHeight||bounds.height;
  const [sw,sh]=characters[active].size,scale=actionCamera?.scale??Math.max(w/sw,h/sh),x=actionCamera?.x??(w-sw*scale)/2,y=actionCamera?.y??0;
  const [left,top,width,height]=cfg.region;
  Object.assign(expressionWindow.style,{left:x+left*scale+'px',top:y+top*scale+'px',width:width*scale+'px',height:height*scale+'px'});
  [...expressions,readingFace].forEach((image,index)=>{
   const frame=index===2?characters[active].action?.reading:cfg.frames[index];if(!frame)return;
   const [a,b,c,d,tx,ty]=frame.transform,[iw,ih]=frame.size;
   Object.assign(image.style,{width:iw*scale+'px',height:ih*scale+'px',left:(tx-left)*scale+'px',top:(ty-top)*scale+'px',transform:`matrix(${a},${b},${c},${d},0,0)`});
  });
 }
 function loadReading(key){
  const frame=characters[key].action?.reading;
  readingFace.classList.remove('is-reading');
  if(readingFace.dataset.character===key&&readingFace.dataset.ready==='true')return;
  readingFace.dataset.character=key;readingFace.dataset.ready='false';
  if(!frame)return;
  readingFace.onload=()=>{if(active===key&&readingFace.dataset.character===key){readingFace.dataset.ready='true';updateReading();}};
  readingFace.onerror=()=>{readingFace.dataset.ready='false';readingFace.classList.remove('is-reading');};
  readingFace.src=frame.src;if(readingFace.complete&&readingFace.naturalWidth){readingFace.dataset.ready='true';}
 }
 function updateReading(){readingFace.classList.toggle('is-reading',Boolean(actionCamera&&readingFace.dataset.character===active&&readingFace.dataset.ready==='true'&&(actionPhase==='rest'||actionPhase==='reading')));}
 function placeActionFace(){
  if(!actionCamera)return;
  layoutExpression();layoutEyes(stage,active,0);
  const [px,py]=characters[active].action.pivot,[left,top]=characters[active].expression.region,{scale,x,y}=actionCamera,angle=actionPose?.head||0;
  expressionWindow.style.transformOrigin=`${(px-left)*scale}px ${(py-top)*scale}px`;
  expressionWindow.style.transform=`rotate(${angle}rad)`;
  const blink=stage.querySelector('.blink-window');blink.style.transformOrigin=`${x+px*scale}px ${y+py*scale}px`;blink.style.transform=`rotate(${angle}rad)`;
 }
 function presentAction(camera,pose,phase='rest',kind=null){
  const changed=phase!==actionPhase||kind!==actionKind;
  actionCamera=camera;actionPose=pose;actionPhase=phase;actionKind=kind;
  if(!camera){readingFace.classList.remove('is-reading');if(changed)clearExpression();expressionWindow.style.transform='';stage.querySelector('.blink-window').style.transform='';layoutExpression();if(active)layoutEyes(stage,active,0);return;}
  placeActionFace();updateReading();
  if(!changed)return;
  clearExpression();stopBlink();
  if(phase==='smile'||phase==='gesture'){
   const image=expressions[0];if(image.dataset.character===active&&image.dataset.ready==='true'){expressionActive=true;image.classList.add('is-smiling');}
  }
  if(phase==='rest')scheduleBlink();
 }
 function smile(index){
  if(!characters[active]?.expression)return;
  const available=image=>image.dataset.character===active&&image.dataset.ready==='true';
  const expression=available(expressions[index%2])?expressions[index%2]:expressions.find(available);
  if(!expression)return;
  stopBlink();clearExpression();layoutExpression();expressionActive=true;
  expression.classList.add('is-smiling');
  expressionTimer=setTimeout(()=>{clearExpression();scheduleBlink();},1450);
 }
 function scheduleBlink(){
  stopBlink();if(reduced.matches||document.hidden||expressionActive||stage.classList.contains('action-running'))return;
  blinkTimer=setTimeout(()=>{
   const candidates=active?[active]:Object.keys(characters).filter(key=>{const b=nodes.get(key).node.getBoundingClientRect();return b.bottom>0&&b.top<window.innerHeight;});
   const key=candidates[Math.floor(Math.random()*candidates.length)];
   if(key&&ready.has(key)){
    const pair=active?nodes.get('companion'):nodes.get(key);
    if(pair?.overlay.dataset.ready==='true'){
     pair.overlay.classList.add('eyes-closed');
     eyeTimer=setTimeout(()=>pair.overlay.classList.remove('eyes-closed'),135);
    }
   }
   blinkTimer=setTimeout(scheduleBlink,190);
  },3800+Math.random()*3000);
 }
 function loadOverlay(overlay,key){
  const cfg=characters[key];
  if(overlay.dataset.character===key&&overlay.dataset.ready==='true')return;overlay.dataset.ready='false';overlay.classList.remove('eyes-closed');
  if(!cfg.blink){overlay.dataset.character=key;return;}
  overlay.onload=()=>{if(overlay.dataset.character!==key)return;overlay.dataset.ready='true';ready.add(key);};
  overlay.onerror=()=>{overlay.dataset.ready='false';};
  overlay.dataset.character=key;overlay.src=cfg.blink;
  if(overlay.complete&&overlay.naturalWidth){overlay.dataset.ready='true';ready.add(key);}
 }
 function resetSpeech(){clearTimeout(speechTimer);if(active)greeting.textContent=characters[active].greeting;}
 function say(key,message,{persistent=false}={}){
  resetSpeech();if(active!==key)return;
  greeting.textContent=message;
  pulse(document.querySelector('.greeting'),[{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],240);
  if(!persistent)speechTimer=setTimeout(()=>{if(active===key)resetSpeech();},2400);
 }
 function stopReaction(){
  clearTimeout(reactionTimer);reactionTimer=null;clearExpression();rig.stop();skirtAction.stop();
  animations.get(stage)?.cancel();animations.delete(stage);
 }
 function react(event){
  if(scenes?.supports(active)){scenes.react(event);return;}
  if(!active||document.hidden||reactionTimer!==null||stage.classList.contains('action-running'))return;
  const key=active,cfg=characters[key],lines=cfg.touchLines;
  if(!lines?.length)return;
  const count=touchCounts.get(key)||0;touchCounts.set(key,count+1);
  reactionTimer=setTimeout(()=>{reactionTimer=null;},900);
  say(key,lines[count%lines.length]);
  rig.stop();
  const choreographed=skirtAction.react(count);
  if(!choreographed)smile(count);
  if(!choreographed&&!rig.react())pulse(stage,[{transform:'translateY(0) rotate(0deg) scale(1)'},{transform:'translateY(3px) rotate(.7deg) scale(1.018)',offset:.3},{transform:'translateY(1px) rotate(-.15deg) scale(1.006)',offset:.7},{transform:'translateY(0) rotate(0deg) scale(1)'}],key==='kyun'?680:420);
  pulse(companion.querySelector('.companion-aura'),[{opacity:.18},{opacity:.48,offset:.3},{opacity:.18}],420);
  sound('select');
 }
 document.querySelector('#characterTouch').addEventListener('click',react);
 function refresh(){
  scenes?.refresh();
  const w=landscape.clientWidth,h=landscape.clientHeight;
  if(w&&h){const scale=Math.max(w/941,h/1672),sw=941*scale,sh=1672*scale;Object.assign(townLights.style,{width:sw+'px',height:sh+'px',left:(w-sw)*.5+'px',top:(h-sh)*.41+'px'});}
  rig.resize();skirtAction.resize();layoutExpression();placeActionFace();
  for(const [key,pair] of nodes){if(key==='companion'){if(active)layoutEyes(pair.node,active,0);}else layoutEyes(pair.node,key,.08);}
 }
 function init(config){
  characters=Object.fromEntries(Object.entries(config).map(([key,cfg])=>[key,scenes?.supports(key)?{...cfg,blink:null,eyes:null,expression:null,rig:null,action:null}:cfg]));
  // Native click still owns every action. No pointer capture, preventDefault,
  // navigation delay, or sound on a touch that may become a scroll gesture.
  document.querySelectorAll('button').forEach(button=>button.addEventListener('pointerdown',respondToPress,{passive:true}));
  for(const station of stations){
   const key=station.dataset.place,cfg=characters[key],node=station.querySelector('.sprite'),overlay=node.querySelector('.blink-overlay');
   if(!scenes?.supports(key))node.querySelector('img').src=cfg.src;station.style.setProperty('--accent',cfg.color);node.style.setProperty('--idle-delay',cfg.delay+'s');
   nodes.set(key,{node,overlay});loadOverlay(overlay,key);
   if(typeof ResizeObserver!=='undefined')new ResizeObserver(refresh).observe(node);
  }
  nodes.set('companion',{node:stage,overlay:stage.querySelector('.blink-overlay')});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(refresh).observe(stage);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(refresh).observe(landscape);
  scenes?.init();refresh();scheduleBlink();updateSound();
 }
 function enter(key,{audible=true}={}){
  stopReaction();const previous=active;
  resetSpeech();active=key;const cfg=characters[key];greeting.textContent=cfg.greeting;
  app.style.setProperty('--accent',cfg.color);stage.style.setProperty('--idle-delay',cfg.delay+'s');
  loadOverlay(nodes.get('companion').overlay,key);loadExpression(key);loadReading(key);rig.prepare(cfg.rig||null);skirtAction.prepare(cfg.action||null);refresh();scheduleBlink();
  outline(stage,cfg.color);
  pulse(companion.querySelector('.companion-aura'),[{opacity:.18},{opacity:.6,offset:.25},{opacity:.18}],480);
  if(audible){
   // Keep the reading surface and all hit targets stationary and fully usable.
   pulse(document.querySelector('.desk-header'),[{boxShadow:`inset 3px 0 ${cfg.color}, 0 0 16px ${cfg.color}44`},{boxShadow:`inset 3px 0 ${cfg.color}, 0 0 0 transparent`}],280);
   if(previous&&previous!==key)pulse(stage,[{transform:`translateX(${Object.keys(characters).indexOf(key)>Object.keys(characters).indexOf(previous)?12:-12}px)`},{transform:'translateX(0)'}],240);
  }
  scenes?.enter(key);
  if(audible)sound('enter');
 }
 function leave({audible=true}={}){scenes?.leave();stopReaction();resetSpeech();active=null;rig.prepare(null);skirtAction.prepare(null);scheduleBlink();if(audible)sound('back');}
 function copied(key){
  if(active!==key)return;
  if(!scenes?.copied())say(key,characters[key].copied);outline(stage,characters[key].color);sound('copy');
  pulse(document.querySelector('#copy'),[{boxShadow:'0 0 0 transparent'},{boxShadow:`0 0 20px ${characters[key].color}`,offset:.25},{boxShadow:'0 0 0 transparent'}],500);
 }
 function complete(key){
  const line=scenes?.complete(key);
  const station=stations.find(node=>node.dataset.place===key),cfg=characters[key];
  pulse(station,[{boxShadow:'0 0 0 transparent'},{boxShadow:`0 0 24px ${cfg.color}99, inset 0 0 18px ${cfg.color}33`,borderColor:cfg.color,offset:.32},{boxShadow:'0 7px 25px #0003'}],850);
  pulse(station.querySelector('.station-light'),[{opacity:.13},{opacity:.75,offset:.28},{opacity:.13}],850);
  pulse(station.querySelector('.reward-stars'),[{opacity:0,transform:'translateY(8px) scale(.7)'},{opacity:1,offset:.3},{opacity:0,transform:'translateY(-28px) scale(1.15)'}],850);
  sound('complete');onStatus(line||cfg.completed);
 }
 soundButton.addEventListener('click',()=>{
  soundEnabled=!soundEnabled;stopSound();updateSound();
  try{localStorage.setItem(storageKey,soundEnabled?'on':'off');}catch{}
  if(soundEnabled)sound('select');
 });
 music=createMusicControls({onStatus,getEffects:()=>({enabled:soundEnabled,volume:effectsVolume}),setEffects:({enabled,volume,preview=false})=>{if(typeof enabled==='boolean'){soundEnabled=enabled;try{localStorage.setItem(storageKey,soundEnabled?'on':'off');}catch{onStatus('効果音の設定を端末に保存できませんでした。');}}if(typeof volume==='number')effectsVolume=volume;stopSound();updateSound();if(preview&&soundEnabled)sound('select');}});
 window.addEventListener('storage',event=>{if(event.key===storageKey){soundEnabled=event.newValue==='on';stopSound();updateSound();}});
 function visibility(){
  app.classList.toggle('is-away',Boolean(document.hidden));stopSound();
  if(document.hidden){stopReaction();stopBlink();resetSpeech();context?.suspend().catch(()=>{});}else scheduleBlink();
 }
 document.addEventListener('visibilitychange',visibility);
 reduced.addEventListener?.('change',()=>{scheduleBlink();if(reduced.matches){stopReaction();animations.forEach(a=>a.cancel());animations.clear();}});
 window.addEventListener('pagehide',()=>{stopReaction();stopBlink();stopSound();resetSpeech();});
 window.addEventListener('pageshow',scheduleBlink);
 return {init,enter,leave,copied,complete,refresh,select:()=>{scenes?.selected();sound('select');}};
}
