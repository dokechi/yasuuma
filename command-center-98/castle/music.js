// Approved catalog: metadata only. No audio is requested until manual playback.
const TRACKS=[
 {id:'harvest',title:'Harvest Festival',sources:[['Harvest_Festival_loop.m4a','audio/mp4'],['Harvest_Festival_loop.ogg','audio/ogg']]},
 {id:'lively',title:'Lively Tavern',sources:[['Lively_Tavern.mp3','audio/mpeg']]},
 {id:'enchanted',title:'Enchanted Festival',sources:[['Enchanted_Festival.mp3','audio/mpeg']]},
 {id:'woodland',title:'Woodland Fantasy',sources:[['Woodland_Fantasy.mp3','audio/mpeg']]}
];
// Optional music only. Existing effects retain their own toggle and audio context.
export function createMusicControls({onStatus=()=>{},getEffects,setEffects,storage,doc=document,win=window}={}){
 const audio=doc.querySelector('#bgmAudio');if(!audio||typeof audio.play!=='function')return null;
 if(audio.__castleMusic)return audio.__castleMusic;
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 const key='castle-town.audio.v1',clamp=(v,f)=>typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v)):f;
 let prefs={};try{prefs=JSON.parse(storage?.getItem(key)||'{}')||{};}catch{}
 let enabled=prefs.bgmEnabled===true,volume=clamp(prefs.bgmVolume,.12),effectsVolume=clamp(prefs.effectsVolume,.5),armed=false,hostActive=true,departed=false,pending=null,epoch=0,failed=false,recoverTime=0,notified=false;
 const $=s=>doc.querySelector(s),menu=$('#audioSettings'),group=$('#audioControls'),toggle=$('#bgmEnabled'),slider=$('#bgmVolume'),start=$('#bgmStart'),status=$('#bgmStatus'),effects=$('#effectsEnabled'),effectsSlider=$('#effectsVolume');
 let sources=[],track=TRACKS.find(t=>t.id===prefs.track)||(prefs.bgmEnabled===true?TRACKS[0]:null),loaded=false,bag=[],nextAt=-Infinity;const sourceErrors=new Set();
 function choose(){if(!bag.length){bag=TRACKS.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)?.id===track?.id){[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}}return bag.pop();}
 function loadTrack(next){epoch++;pending=null;audio.pause();track=next;loaded=true;recoverTime=0;failed=false;sourceErrors.clear();audio.replaceChildren();sources=track.sources.map(([file,type])=>{const source=doc.createElement('source');source.src='audio/'+file;source.type=type;source.addEventListener('error',()=>{if(!sources.includes(source))return;sourceErrors.add(source);if(sourceErrors.size===sources.length&&wanted())failure();});audio.append(source);return source;});audio.load();save();}
 function advance(manual=false){if(!enabled||(!manual&&(!wanted()||!audio.ended||pending)))return;const time=Date.now();if(time-nextAt<350)return;nextAt=time;loadTrack(choose());armed=true;notified=false;claim();reconcile();}
 $('#bgmNext')?.addEventListener('click',()=>advance(true));
 audio.addEventListener('ended',()=>advance());
 audio.loop=false;audio.preload='none';audio.volume=volume;
 function save(){try{if(!storage)throw Error('storage');storage.setItem(key,JSON.stringify({bgmEnabled:enabled,bgmVolume:volume,effectsVolume,track:track?.id}));}catch{onStatus('音設定を端末に保存できませんでした。ほかの保存記録はそのままです。');}}
 function wanted(){return enabled&&armed&&volume>0&&!doc.hidden&&hostActive&&!departed;}
 function refresh(){const fx=getEffects();toggle.checked=enabled;slider.value=String(Math.round(volume*100));$('#bgmVolumeValue').textContent=slider.value+'%';effects.checked=fx.enabled;effectsSlider.value=String(Math.round(effectsVolume*100));$('#effectsVolumeValue').textContent=effectsSlider.value+'%';
  const state=!enabled?'off':volume===0?'muted':failed?'retry':pending?'loading':!audio.paused?'playing':!armed?'waiting':'paused';audio.dataset.state=state;start.hidden=!enabled||volume===0||!!pending||!audio.paused;
  const stateName={off:'切',muted:'消音',retry:'再試行',loading:'読込中',playing:'再生中',waiting:'待機',paused:'停止'}[state],summary=menu.querySelector('summary'),badge=summary.querySelector('.music-state');if(badge)badge.textContent='BGM '+stateName;summary.dataset.musicState=state;summary.setAttribute('aria-label',`音設定。BGM${state==='off'?'オフ':stateName}、音量${Math.round(volume*100)}%。効果音${!fx.enabled?'オフ':effectsVolume===0?'消音':'オン'}。`);summary.title=summary.getAttribute('aria-label');
  if($('#bgmTrack'))$('#bgmTrack').textContent=track?.title||'4曲からランダムに再生';if($('#bgmNext'))$('#bgmNext').disabled=!enabled;
  start.textContent=failed?'BGMを再試行':'BGMを再生';status.textContent={off:'BGMはオフです',muted:'音量0・一時停止',retry:'音源を読み込めませんでした。オンラインで再試行できます',loading:'BGMを読み込み中…',playing:(track?.title||'BGM')+' を再生中',waiting:'保存設定はオンです。再生ボタンで開始します',paused:'BGMは一時停止中です'}[state];
 }
 function pause(){epoch++;try{audio.pause();}catch{}refresh();}
 function failure(){recoverTime=Number.isFinite(audio.currentTime)?audio.currentTime:0;armed=false;failed=true;pending=null;pause();if(!notified){notified=true;onStatus('BGMを再生できませんでした。ほかの操作は続けられます。音設定から再試行できます。');}}
 function reconcile(){audio.volume=volume;if(!wanted()){pause();return;}if(pending||!audio.paused){refresh();return;}
  const attempt=++epoch;try{const task=Promise.resolve(audio.play());pending=task;refresh();task.then(()=>{if(pending!==task)return;pending=null;if(!wanted())audio.pause();refresh();if(wanted()&&audio.paused)reconcile();},()=>{if(pending!==task)return;pending=null;if(attempt!==epoch||!wanted()){refresh();if(wanted())reconcile();return;}failure();});}catch{pending=null;failure();}
 }
 function claim(){try{channel?.postMessage({type:'claim'});}catch{}}
 function begin(){if(!loaded)loadTrack(track||choose());const reload=failed||audio.error;armed=true;failed=false;notified=false;sourceErrors.clear();if(reload){if(!recoverTime)recoverTime=Number.isFinite(audio.currentTime)?audio.currentTime:0;try{audio.load();}catch{}}claim();reconcile();}
 toggle.addEventListener('change',()=>{enabled=toggle.checked;save();if(enabled)begin();else{armed=false;failed=false;pause();}});
 start.addEventListener('click',begin);
 slider.addEventListener('input',()=>{volume=clamp(Number(slider.value)/100,.12);save();reconcile();});
 effects.addEventListener('change',()=>{setEffects({enabled:effects.checked,preview:effects.checked});refresh();});
 effectsSlider.addEventListener('input',()=>{effectsVolume=clamp(Number(effectsSlider.value)/100,.5);setEffects({volume:effectsVolume});save();refresh();});
 audio.addEventListener('playing',()=>{if(!wanted())audio.pause();refresh();});audio.addEventListener('pause',refresh);audio.addEventListener('error',()=>{if(wanted())failure();});
 // Chromium can leave play() pending when every <source> fails, without a
 // media-element error. Keep that state retryable without blocking the app.

 audio.addEventListener('loadedmetadata',()=>{if(recoverTime>0&&Number.isFinite(audio.duration)){try{audio.currentTime=Math.min(recoverTime,Math.max(0,audio.duration-.05));}catch{}recoverTime=0;}});
 doc.addEventListener('visibilitychange',reconcile);
 win.addEventListener('castle:pause',()=>{hostActive=false;menu.open=false;pause();});win.addEventListener('castle:resume',()=>{hostActive=true;reconcile();});
 win.addEventListener('pagehide',()=>{departed=true;pause();});win.addEventListener('pageshow',()=>{departed=false;reconcile();});
 win.addEventListener('storage',event=>{if(event.key==='castle-town.sound.v1'){refresh();return;}if(event.key!==key)return;try{const next=JSON.parse(event.newValue||'{}');enabled=next.bgmEnabled===true;volume=clamp(next.bgmVolume,.12);effectsVolume=clamp(next.effectsVolume,.5);setEffects({volume:effectsVolume});reconcile();}catch{}});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;event.preventDefault();event.stopPropagation();menu.querySelector('summary').focus();}});
 doc.addEventListener('click',event=>{if(menu.open&&!group.contains(event.target))menu.open=false;});
 let channel=null;try{if(typeof win.BroadcastChannel==='function'){channel=new win.BroadcastChannel('castle-town-music-v1');channel.onmessage=event=>{if(event.data?.type==='claim'){armed=false;pause();}};}}catch{}
 setEffects({volume:effectsVolume});refresh();
 const api={refresh,pause,state:()=>({enabled,volume,armed,hostActive,departed,pending:!!pending,track:track?.id})};audio.__castleMusic=api;return api;
}
