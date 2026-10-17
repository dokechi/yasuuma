export function createWorld({app,notebook,reduced}){
 const rooms={choi:'assets/room-choi-v1.webp',fp:'assets/room-fp-v1.webp',shiire:'assets/room-shiire-v1.webp'};
 const scene=document.querySelector('#otherRoom'),stations=document.querySelector('.stations'),loaded=new Set();let current=null,clock=null,arrival=null,mapFlight=null;
 function loadRoom(key){if(!rooms[key]||loaded.has(key))return;const image=new Image();image.onload=()=>{loaded.add(key);if(current===key){scene.style.backgroundImage=`url("${rooms[key]}")`;app.dataset.roomReady=key;}};image.src=rooms[key];}
 function environment(){app.dataset.mapMotion=document.hidden?'paused':'on';const date=new Date(),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date)),month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',month:'numeric'}).format(date));
  const mode=notebook.pref('light','auto');app.dataset.light=mode==='auto'?(hour>=6&&hour<16?'day':hour>=16&&hour<19?'evening':'night'):mode;
  const season=month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';app.dataset.season=season;
  document.querySelector('#seasonDetail').textContent={spring:'❧',summer:'❦',autumn:'❧',winter:'✧'}[season];
  const homeMode=notebook.pref('homeMode','cards');app.dataset.homeMode=homeMode;stations.style.setProperty('--map-art',homeMode==='map'?'url("assets/town-map-v1.webp")':'none');
  document.querySelector('#homeMode').textContent=homeMode==='map'?'カード表示':'街マップ';document.querySelector('#homeMode').setAttribute('aria-pressed',String(homeMode==='map'));
  app.dataset.motion=notebook.pref('quiet',false)?'quiet':'standard';
 }
 function schedule(){clearTimeout(clock);if(document.hidden)return;environment();clock=setTimeout(schedule,60000);}
 function enter(key,first){mapFlight?.cancel();if(notebook.pref('homeMode','cards')==='map'&&!reduced.matches&&stations.animate){mapFlight=stations.animate([{transform:'scale(1)'},{transform:'scale(1.025)'}],{duration:160,easing:'ease-out'});mapFlight.finished?.catch(()=>{});}current=key;app.dataset.roomReady=loaded.has(key)?key:'';if(loaded.has(key))scene.style.backgroundImage=`url("${rooms[key]}")`;loadRoom(key);clearTimeout(arrival);app.classList.remove('first-visit');if(first&&!reduced.matches){app.classList.add('first-visit');arrival=setTimeout(()=>app.classList.remove('first-visit'),420);}}
 function leave(){mapFlight?.cancel();mapFlight=null;current=null;clearTimeout(arrival);app.classList.remove('first-visit');}
 document.querySelector('#homeMode').addEventListener('click',()=>{notebook.setPref('homeMode',notebook.pref('homeMode','cards')==='cards'?'map':'cards');environment();});
 const entries=[...document.querySelectorAll('.station')];entries.forEach((node,index)=>node.addEventListener('keydown',event=>{if(notebook.pref('homeMode','cards')!=='map')return;const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:2,ArrowUp:-2}[event.key];if(delta===undefined)return;event.preventDefault();entries[(index+delta+entries.length)%entries.length].focus();}));
 for(const node of entries){node.addEventListener('pointerenter',()=>loadRoom(node.dataset.place),{once:true});node.addEventListener('focus',()=>loadRoom(node.dataset.place),{once:true});}
 document.addEventListener('visibilitychange',()=>{app.dataset.mapMotion=document.hidden?'paused':'on';if(document.hidden){mapFlight?.cancel();mapFlight=null;}clearTimeout(clock);clearTimeout(arrival);if(document.hidden)app.classList.remove('first-visit');else schedule();});
 window.addEventListener('castle:pause',()=>{clearTimeout(clock);leave();});window.addEventListener('castle:resume',schedule);
 window.addEventListener('pagehide',()=>{clearTimeout(clock);leave();});window.addEventListener('pageshow',schedule);schedule();return {enter,leave,refresh:environment};
}
