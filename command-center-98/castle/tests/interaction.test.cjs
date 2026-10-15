const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function boot(hash='',{motion=false,webgl=false}={}){
 const glCalls=[],imageAssets=[];
 class MockImage{constructor(){this.complete=false;this.naturalWidth=0;imageAssets.push(this);}}
 const gl=new Proxy({NO_ERROR:0,getShaderParameter:()=>true,getProgramParameter:()=>true,getError:()=>0,getUniformLocation:(_,key)=>key,getAttribLocation:()=>0},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return 1;return (...args)=>{glCalls.push([key,...args]);return {};};}});
 const nodes=new Map();let active=null,clock=0,timerId=0;const timers=new Map(),animations=[];
 function element(id){
  if(nodes.has(id))return nodes.get(id);
  const classes=new Set(),events={};
  const e={id,events,attrs:{},dataset:{},style:{setProperty(k,v){this[k]=v;}},scrollTop:0,inert:false,textContent:'',tabIndex:0,
   classList:{add(...xs){xs.forEach(x=>classes.add(x));},remove(...xs){xs.forEach(x=>classes.delete(x));},contains(x){return classes.has(x);},toggle(x,v){if(v??!classes.has(x))classes.add(x);else classes.delete(x);}},
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){(events[k]??=[]).push(f);},focus(){active=e;},select(){this.selected=true;},showModal(){this.open=true;},querySelector(s){return element(id+' '+s);},getBoundingClientRect(){return {left:20,top:100,width:160,height:240,bottom:340};},
   emit(k,event={}){return Promise.all((events[k]||[]).map(f=>f({currentTarget:e,...event})));}};
  if(webgl&&(id==='#characterRig'||id==='#characterAction'))e.getContext=()=>gl;
  if(webgl&&id==='#character'){e.complete=true;e.naturalWidth=1024;}
  if(motion)e.animate=(frames,options)=>{let resolve,reject;const a={node:e,frames,options,cancelled:false,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),finish(){resolve();},cancel(){this.cancelled=true;reject(new Error('cancelled'));}};animations.push(a);return a;};
  nodes.set(id,e);return e;
 }
 const keys=['kyun','choi','fp','shiire'];
 const stations=keys.map((key,i)=>{const e=element(i?'#enter-'+key:'#enter');e.dataset.place=key;return e;});
 const tabs=[0,1,2].map(i=>{const e=element('#tab-'+i);e.dataset.draft=String(i);return e;});
 const switches=keys.map(key=>{const e=element('#go-'+key);e.dataset.go=key;return e;});
 const win=element('window');win.innerWidth=900;win.innerHeight=900;win.matchMedia=()=>({matches:false});
 const location={hash,pathname:'/index.html',search:''},stack=[{state:null,hash}];let pendingBack=false;
 const history={state:null,pushState(state,_,url){this.state=state;location.hash=url.startsWith('#')?url:'';stack.push({state,hash:location.hash});},replaceState(state,_,url){this.state=state;location.hash=url.startsWith('#')?url:'';stack[stack.length-1]={state,hash:location.hash};},back(){pendingBack=true;}};
 const document={addEventListener:win.addEventListener,hidden:false,querySelector(s){return s==='dialog[open]'?(element('#copyFallback').open?element('#copyFallback'):null):element(s);},querySelectorAll(s){return s==='button'?[...stations,...tabs,...switches,element('#copy'),element('#back'),element('#return')]:s==='.station'?stations:s==='[data-draft]'?tabs:s==='[data-go]'?switches:[];},body:element('body')};
 let copied='',raf=[];
 const context=vm.createContext({Image:MockImage,document,window:win,location,history,navigator:{clipboard:{writeText:async t=>{copied=t;}}},requestAnimationFrame:fn=>{raf.push(fn);return raf.length;},cancelAnimationFrame:()=>{},setTimeout:(fn,delay=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id),console});
 vm.runInContext('globalThis.CCCastleInitialDrafts='+JSON.stringify(JSON.parse(fs.readFileSync('tests/seeds.json','utf8')))+';function createProductionClient(){return {}};function createCharacterScenes(){return null};'+fs.readFileSync('./notebook.js','utf8').replaceAll('export ','')+'\nfunction createWorkbench(){return {enter(){},leave(){},selected(){},resize(){},finish(){},copied(){},manualCopy(){}}}\n'+fs.readFileSync('./skirt-action.js','utf8').replaceAll('export ','')+'\n'+fs.readFileSync('./character-rig.js','utf8').replaceAll('export function','function')+'\n'+fs.readFileSync('./feedback.js','utf8').replace(/^import .*$/gm,'').replace('export function','function')+'\n'+fs.readFileSync('./app.js','utf8').replace(/^import .*$/gm,''),context);
 return {imageAssets,glCalls,element,stations,tabs,context,document,timers,animations,advance(ms){const target=clock+ms;for(let n=0;n<100;n++){const entry=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;clock=entry[1].at;timers.delete(entry[0]);entry[1].fn();}clock=target;},location,history,win,active:()=>active,read:code=>vm.runInContext(code,context),copied:()=>copied,stack,flush(time=0){raf.splice(0).forEach(fn=>fn(time));},async finishBack(){assert.equal(pendingBack,true);pendingBack=false;stack.pop();const item=stack.at(-1);history.state=item?.state??null;location.hash=item?.hash||'';await win.emit('popstate');await win.emit('hashchange');}};
}
test('all four entrances open their own content immediately and restore focus',async()=>{
 for(const key of ['kyun','choi','fp','shiire']){const b=boot(),station=b.stations.find(n=>n.dataset.place===key);await station.emit('click');assert.equal(b.read('view'),'work');assert.equal(b.read('place'),key);assert.equal(b.element('#home').inert,true);assert.equal(b.element('#workspace').inert,false);assert.equal(b.active().id,'#back');assert.equal(b.element('#workspace-title').textContent,b.read(`PLACES.${key}.title`));await b.element('#back').emit('click');assert.equal(b.read('view'),'home');assert.equal(b.active(),station);await b.finishBack();assert.equal(b.location.hash,'');}
});
test('a different entrance opened during pending back wins the route race',async()=>{const b=boot();await b.stations[0].emit('click');await b.element('#return').emit('click');await b.stations[2].emit('click');await b.finishBack();assert.equal(b.read('place'),'fp');assert.equal(b.read('view'),'work');assert.equal(b.location.hash,'#fp');});
test('each place retains its own draft and scroll across switching and folding',async()=>{const b=boot();await b.stations[0].emit('click');await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=180;await b.element('#go-choi').emit('click');await b.tabs[1].emit('click');b.element('#paperScroll').scrollTop=45;await b.element('#go-kyun').emit('click');assert.equal(b.read('currentDraft'),2);assert.equal(b.element('#paperScroll').scrollTop,180);await b.win.emit('resize');b.flush();assert.equal(b.read('currentDraft'),2);assert.equal(b.element('#paperScroll').scrollTop,180);await b.element('#go-choi').emit('click');assert.equal(b.read('currentDraft'),1);assert.equal(b.element('#paperScroll').scrollTop,45);});
test('closing and reopening keeps the current draft and scroll',async()=>{const b=boot();await b.stations[0].emit('click');await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=120;await b.element('#back').emit('click');await b.finishBack();await b.stations[0].emit('click');assert.equal(b.read('currentDraft'),2);assert.equal(b.element('#paperScroll').scrollTop,120);});
test('switching places replaces the route; one back returns home',async()=>{const b=boot();await b.stations[0].emit('click');await b.element('#go-shiire').emit('click');assert.equal(b.stack.length,2);assert.equal(b.location.hash,'#shiire');await b.element('#back').emit('click');await b.finishBack();assert.equal(b.location.hash,'');assert.equal(b.read('view'),'home');});
test('copy uses selected content for every place',async()=>{for(const key of ['kyun','choi','fp','shiire']){const b=boot('#'+key);await b.tabs[1].emit('click');await b.element('#copy').emit('click');assert.equal(b.copied(),b.read(`PLACES.${key}.drafts[1].body`));assert.ok(b.element('#toast').textContent.includes('コピーしました'));}});
test('clipboard denial offers selected text in a manual-copy dialog',async()=>{const b=boot('#fp');vm.runInContext("navigator.clipboard.writeText=async()=>{throw Error('denied')}",b.context);await b.element('#copy').emit('click');assert.equal(b.element('#copyFallback').open,true);assert.equal(b.element('#copyText').value,b.read('PLACES.fp.drafts[0].body'));assert.equal(b.element('#copyText').selected,true);});
test('cancelled touch clears pressed visuals without navigating',async()=>{const b=boot();await b.stations[1].emit('pointerdown',{isPrimary:true});assert.equal(b.stations[1].classList.contains('is-pressed'),true);await b.win.emit('pointercancel');assert.equal(b.stations[1].classList.contains('is-pressed'),false);assert.equal(b.read('view'),'home');});
test('all direct links can return without leaving the app',async()=>{for(const key of ['kyun','choi','fp','shiire']){const b=boot('#'+key);assert.equal(b.read('place'),key);await b.element('#back').emit('click');assert.equal(b.location.hash,'');assert.equal(b.read('view'),'home');}});
test('keyboard tabs keep a single focus stop and Escape returns home',async()=>{const b=boot('#kyun');await b.tabs[0].emit('keydown',{key:'End',preventDefault(){}});assert.equal(b.read('currentDraft'),2);assert.equal(b.tabs.filter(t=>t.tabIndex===0).length,1);assert.equal(b.active(),b.tabs[2]);await b.win.emit('keydown',{key:'Escape'});assert.equal(b.read('view'),'home');});
test('Escape does not close the workspace while copy dialog is open',async()=>{const b=boot('#choi');b.element('#copyFallback').open=true;await b.win.emit('keydown',{key:'Escape'});assert.equal(b.read('view'),'work');});

test('switching from a direct link does not create an owned history entry',async()=>{const b=boot('#fp');await b.element('#go-shiire').emit('click');assert.equal(b.history.state,null);await b.element('#back').emit('click');assert.equal(b.location.hash,'');assert.equal(b.read('view'),'home');});

test('sound starts off, unavailable audio does not break navigation',async()=>{const b=boot();assert.equal(b.element('#soundToggle').attrs['aria-pressed'],'false');await b.element('#soundToggle').emit('click');assert.equal(b.element('#soundToggle').attrs['aria-pressed'],'false');await b.stations[2].emit('click');assert.equal(b.read('place'),'fp');});
test('copy success changes the active character line and restores it after a short interval',async()=>{const b=boot('#kyun');await b.element('#copy').emit('click');assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.kyun.copied'));b.advance(2500);assert.equal(b.element('#greetingText').textContent,b.read('PLACES.kyun.greeting'));});
test('failed copy never claims a success or rewards the character',async()=>{const b=boot('#choi');b.read("navigator.clipboard.writeText=async()=>{throw Error('denied')}");await b.element('#copy').emit('click');assert.equal(b.element('#greetingText').textContent,b.read('PLACES.choi.greeting'));assert.equal(b.element('#toast').classList.contains('show'),false);});
test('complete returns immediately with the correct line; ordinary back has no completion message',async()=>{const b=boot();await b.stations[3].emit('click');await b.element('#return').emit('click');assert.equal(b.read('view'),'home');assert.equal(b.element('#toast').textContent,b.read('CHARACTERS.shiire.completed'));await b.finishBack();await b.stations[0].emit('click');await b.element('#back').emit('click');assert.equal(b.element('#toast').classList.contains('show'),false);});
test('late clipboard response does not speak through a different character',async()=>{const b=boot('#kyun');b.read('navigator.clipboard.writeText=()=>new Promise(resolve=>window.finishCopy=resolve)');const pending=b.element('#copy').emit('click');await b.element('#go-fp').emit('click');b.read('window.finishCopy()');await pending;assert.equal(b.element('#greetingText').textContent,b.read('PLACES.fp.greeting'));});
test('only a loaded blink patch is shown; it clears after 135ms',async()=>{const b=boot('#kyun'),overlay=b.element('#companion .sprite .blink-overlay');overlay.onload();b.read("Math.random=()=>0;feedback.enter('kyun',{audible:false})");b.advance(3800);assert.equal(overlay.classList.contains('eyes-closed'),true);b.advance(136);assert.equal(overlay.classList.contains('eyes-closed'),false);});
test('hiding the page clears blink timers and closes the eyes overlay immediately',async()=>{const b=boot('#fp'),overlay=b.element('#companion .sprite .blink-overlay');overlay.classList.add('eyes-closed');b.document.hidden=true;await b.win.emit('visibilitychange');assert.equal(overlay.classList.contains('eyes-closed'),false);assert.equal(b.element('#app').classList.contains('is-away'),true);assert.equal(b.timers.size,0);});
test('turning sound off while AudioContext resumes cannot play delayed sounds',async()=>{
 const b=boot();b.read(`window.voiceCount=0;window.AudioContext=class{constructor(){this.state='suspended';this.currentTime=0;}resume(){return new Promise(resolve=>{window.resumeAudio=()=>{this.state='running';resolve();};});}createOscillator(){window.voiceCount++;throw Error('should not create oscillator');}}`);
 await b.element('#soundToggle').emit('click');assert.equal(b.element('#soundToggle').attrs['aria-pressed'],'true');await b.element('#soundToggle').emit('click');b.read('window.resumeAudio()');await Promise.resolve();assert.equal(b.read('window.voiceCount'),0);assert.equal(b.element('#soundToggle').attrs['aria-pressed'],'false');
});

test('pressing the selected draft again preserves the reading position',async()=>{
 const b=boot('#kyun');await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=240;
 await b.tabs[2].emit('click');assert.equal(b.element('#paperScroll').scrollTop,240);
 await b.tabs[1].emit('click');assert.equal(b.element('#paperScroll').scrollTop,0);
 assert.equal(b.element('.draft-tabs').style['--selection'],'1');
});
test('unsettled animations never block reading, copy, back or rapid reopening',async()=>{
 const b=boot('',{motion:true});await b.stations[0].emit('click');
 const travel=b.animations.find(a=>a.node.id==='#companion');assert.ok(travel);
 await b.tabs[2].emit('click');await b.element('#copy').emit('click');
 assert.equal(b.copied(),b.read('PLACES.kyun.drafts[2].body'));
 await b.element('#back').emit('click');assert.equal(travel.cancelled,true);
 await b.stations[3].emit('click');await b.finishBack();
 b.animations.filter(a=>!a.cancelled).forEach(a=>a.finish());await Promise.resolve();
 assert.equal(b.read('place'),'shiire');assert.equal(b.read('view'),'work');
 assert.equal(b.element('#workspace').inert,false);assert.equal(b.element('#companion').style.visibility,'visible');
});

test('a missing or late room background never blocks work or changes the selected place',async()=>{
 const b=boot();await b.stations[0].emit('click');
 await b.element('#studyImage').emit('error');
 await b.tabs[1].emit('click');await b.element('#copy').emit('click');
 assert.equal(b.copied(),b.read('PLACES.kyun.drafts[1].body'));
 assert.equal(b.element('#workspace').inert,false);
 await b.element('#go-choi').emit('click');
 await b.element('#studyImage').emit('load');
 assert.equal(b.read('place'),'choi');assert.equal(b.read('view'),'work');
 await b.element('#back').emit('click');await b.finishBack();assert.equal(b.read('view'),'home');
});

test('character touch responds without changing the draft, reading position or route; repeat taps are bounded',async()=>{
 const b=boot('#kyun',{motion:true});await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=160;
 await b.element('#characterTouch').emit('click');
 assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.kyun.touchLines[0]'));
 const count=b.animations.length;await b.element('#characterTouch').emit('click');assert.equal(b.animations.length,count);
 assert.equal(b.read('currentDraft'),2);assert.equal(b.element('#paperScroll').scrollTop,160);assert.equal(b.location.hash,'#kyun');
 await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[2].body'));
 b.advance(2500);assert.equal(b.element('#greetingText').textContent,b.read('PLACES.kyun.greeting'));
 await b.element('#characterTouch').emit('click');assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.kyun.touchLines[1]'));
});
test('leaving mid-reaction cancels movement and speech; another character responds immediately',async()=>{
 const b=boot('#kyun',{motion:true});await b.element('#characterTouch').emit('click');
 const reaction=b.animations.findLast(a=>a.node.id==='#companion .sprite');
 await b.element('#go-fp').emit('click');assert.equal(reaction.cancelled,true);
 await b.element('#characterTouch').emit('click');assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.fp.touchLines[0]'));
 await b.element('#back').emit('click');assert.equal(b.read('view'),'home');
 const count=b.animations.length;await b.element('#characterTouch').emit('click');assert.equal(b.animations.length,count);
 b.advance(2500);assert.equal(b.read('view'),'home');
});
test('reduced motion keeps the character reply without moving, and background tabs clear reaction timers',async()=>{
 const b=boot('#shiire',{motion:true});b.read('reduced.matches=true');const count=b.animations.length;
 await b.element('#characterTouch').emit('click');assert.equal(b.animations.length,count);
 assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.shiire.touchLines[0]'));
 b.document.hidden=true;await b.win.emit('visibilitychange');assert.equal(b.timers.size,0);
 await b.element('#characterTouch').emit('click');assert.equal(b.timers.size,0);
});

test('smile is gated by asset readiness and never interrupts reading or copy',async()=>{
 const b=boot('#kyun',{motion:true}),face=b.element('#companion .sprite .expression-open');
 await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=180;
 await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),false);
 face.onload();assert.equal(face.classList.contains('is-smiling'),false);
 b.advance(950);await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),true);
 assert.equal(b.element('#paperScroll').scrollTop,180);await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[2].body'));
 b.advance(1500);assert.equal(face.classList.contains('is-smiling'),false);
});
test('expressions clear on switching roles, and a late face load cannot appear on another character',async()=>{
 const b=boot('#kyun'),face=b.element('#companion .sprite .expression-open');const loaded=face.onload;
 face.onload();await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),true);
 await b.element('#go-choi').emit('click');assert.equal(face.classList.contains('is-smiling'),false);
 loaded();await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),false);
 assert.equal(b.element('#greetingText').textContent,b.read('CHARACTERS.choi.touchLines[0]'));
});
test('face failure retains the original character and reduced motion still permits a static smile',async()=>{
 const b=boot('#kyun',{motion:true}),face=b.element('#companion .sprite .expression-open');
 face.onerror();await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),false);
 b.advance(1000);face.onload();b.read('reduced.matches=true');const count=b.animations.length;
 await b.element('#characterTouch').emit('click');assert.equal(face.classList.contains('is-smiling'),true);assert.equal(b.animations.length,count);
 b.document.hidden=true;await b.win.emit('visibilitychange');assert.equal(face.classList.contains('is-smiling'),false);assert.equal(b.timers.size,0);
});

test('Kyun alternates loaded smile expressions and an old blink cannot cover the smile',async()=>{
 const b=boot('#kyun'),open=b.element('#companion .sprite .expression-open'),closed=b.element('#companion .sprite .expression-closed'),blink=b.element('#companion .sprite .blink-overlay');
 open.onload();closed.onload();blink.onload();blink.classList.add('eyes-closed');
 await b.element('#characterTouch').emit('click');assert.equal(open.classList.contains('is-smiling'),true);assert.equal(closed.classList.contains('is-smiling'),false);assert.equal(blink.classList.contains('eyes-closed'),false);
 b.advance(950);await b.element('#characterTouch').emit('click');assert.equal(open.classList.contains('is-smiling'),false);assert.equal(closed.classList.contains('is-smiling'),true);
 await b.win.emit('resize');b.flush();assert.equal(closed.classList.contains('is-smiling'),true);
 b.advance(1500);assert.equal(closed.classList.contains('is-smiling'),false);
 await b.element('#back').emit('click');assert.equal(b.read('view'),'home');
});

test('the mesh follows a tap, carries the face, stops at rest and does not stop copy',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite');
 const face=b.element('#companion .sprite .expression-open');face.onload();
 await b.element('#characterTouch').emit('click');b.flush(0);b.flush(400);
 assert.equal(stage.classList.contains('rig-running'),true);
 assert.ok(b.glCalls.some(c=>c[0]==='drawArrays'));
 const turn=b.glCalls.filter(c=>c[0]==='uniform1f'&&c[1]==='angle').at(-1)[2];assert.ok(turn>0);
 assert.equal(b.element('#companion .sprite .expression-window').style.transform,`rotate(${turn}rad)`);
 assert.equal(b.element('#companion .sprite .blink-window').style.transform,`rotate(${turn}rad)`);
 await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[0].body'));
 b.flush(2300);assert.equal(stage.classList.contains('rig-running'),false);
 assert.equal(b.element('#companion .sprite .expression-window').style.transform,'');
 const count=b.glCalls.filter(c=>c[0]==='drawArrays').length;b.flush(2500);
 assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,count);
});
test('writing hand leads the turn, skirt settles later, and all regions return to rest',async()=>{
 const b=boot('#kyun',{webgl:true});
 const early=b.read('rigPose(80)'),settling=b.read('rigPose(1200)');
 assert.ok(early.hand>0);assert.equal(early.angle,0);assert.equal(early.knee,0);assert.equal(early.hem,0);
 assert.equal(settling.hand,0);assert.equal(settling.angle,0);assert.ok(settling.hemTrail>0);
 const returnSwing=b.read('rigPose(1600)');
 assert.ok(returnSwing.hem<0&&returnSwing.hemTrail<0);
 assert.equal(returnSwing.hand,0);assert.equal(returnSwing.angle,0);
 assert.ok(Math.abs(returnSwing.hemTrail)<b.read('rigPose(700)').hemTrail);
 for(const value of Object.values(b.read('rigPose(2200)')))assert.equal(value,0);
 await b.element('#characterTouch').emit('click');b.flush(0);b.flush(400);
 for(const key of ['hand','knee','hem','hemTrail']){
  const call=b.glCalls.filter(c=>c[0]==='uniform1f'&&c[1]===key).at(-1);
  assert.ok(call&&call[2]>0&&call[2]<=1,key);
 }
 for(const key of ['handX','handY','penLine','kneeArea','hemX','hemY','legLine']){
  const call=b.glCalls.filter(c=>c[0]==='uniform4f'&&c[1]===key).at(-1);
  assert.ok(call&&call.slice(2).length===4&&call.slice(2).every(Number.isFinite),key);
 }
});
test('role changes and lost graphics context cancel queued mesh frames and retain working controls',async()=>{
 const b=boot('#kyun',{webgl:true,motion:true}),stage=b.element('#companion .sprite');
 await b.element('#characterTouch').emit('click');b.flush(0);b.flush(200);
 await b.element('#go-fp').emit('click');assert.equal(stage.classList.contains('rig-running'),false);
 const count=b.glCalls.filter(c=>c[0]==='drawArrays').length;b.flush(300);assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,count);
 await b.element('#go-kyun').emit('click');await b.element('#characterTouch').emit('click');b.flush(500);
 await b.element('#characterRig').emit('webglcontextlost',{preventDefault(){}});assert.equal(stage.classList.contains('rig-running'),false);
 b.flush(700);await b.element('#copy').emit('click');assert.ok(b.copied());
 await b.element('#back').emit('click');assert.equal(b.read('view'),'home');
});
test('mesh animation stops in a hidden tab and reduced motion never draws it',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite');
 await b.element('#characterTouch').emit('click');b.flush(0);
 b.document.hidden=true;await b.win.emit('visibilitychange');b.flush(500);assert.equal(stage.classList.contains('rig-running'),false);
 const count=b.glCalls.filter(c=>c[0]==='drawArrays').length;
 b.document.hidden=false;b.read('reduced.matches=true');await b.element('#characterTouch').emit('click');b.flush(900);
 assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,count);
});

test('three touch reactions have distinct gestures; notice and smile precede the hand',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite'),smile=b.element('#companion .sprite .expression-open'),reading=b.element('#companion .sprite .expression-reading');
 assert.equal(stage.classList.contains('action-ready'),false);
 smile.onload();reading.onload();
 for(const im of b.imageAssets){im.complete=true;im.naturalWidth=1024;im.onload();}
 assert.equal(stage.classList.contains('action-ready'),true);assert.equal(stage.classList.contains('action-running'),false);
 assert.equal(reading.classList.contains('is-reading'),true);
 const last=name=>b.glCalls.filter(c=>c[0]==='uniform1f'&&c[1]===name).at(-1)[2];
 for(const [index,kind] of ['wave','read','skirt'].entries()){
  const start=index*3000;await b.element('#characterTouch').emit('click');b.flush(start);
  assert.equal(stage.dataset.reaction,kind);assert.equal(stage.dataset.reactionPhase,'notice');
  assert.equal(reading.classList.contains('is-reading'),false);assert.equal(smile.classList.contains('is-smiling'),false);
  b.flush(start+300);assert.equal(stage.dataset.reactionPhase,'smile');assert.equal(smile.classList.contains('is-smiling'),true);
  assert.equal(last('wave'),0);assert.equal(last('lift'),0);assert.equal(Math.abs(last('write')),0);
  b.flush(start+1150);
  if(kind==='wave'){assert.equal(last('wave'),1);assert.equal(last('lift'),0);}
  if(kind==='read'){assert.ok(Math.abs(last('write'))>.1);assert.equal(reading.classList.contains('is-reading'),true);assert.equal(smile.classList.contains('is-smiling'),false);}
  if(kind==='skirt'){assert.equal(last('lift'),1);assert.equal(last('wave'),0);}
  await b.element('#copy').emit('click');assert.ok(b.copied());
  b.advance(1000);await b.element('#characterTouch').emit('click');assert.equal(stage.dataset.reaction,kind);
  b.flush(start+2050);
  if(kind==='skirt')assert.ok(last('lift')>0&&last('lift')<1);
  b.flush(start+2600);assert.equal(stage.classList.contains('action-running'),false);assert.equal(reading.classList.contains('is-reading'),true);
  for(const name of ['wave','lift','write','head'])assert.equal(Math.abs(last(name)),0);
  const n=b.glCalls.filter(c=>c[0]==='drawArrays').length;b.flush(start+2700);assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,n);
  b.advance(2000);
 }
});
test('closed Fold frames crown and waving hand, cycles two visible gestures; unfolding preserves work',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite');
 b.win.innerWidth=400;b.win.innerHeight=850;stage.clientWidth=224;stage.clientHeight=116;b.read('feedback.refresh()');
 for(const im of b.imageAssets){im.complete=true;im.naturalWidth=1024;im.onload();}
 const last=name=>b.glCalls.filter(c=>c[0]==='uniform1f'&&c[1]===name).at(-1)[2];
 const scale=last('scale'),x=last('offsetX'),y=last('offsetY');
 for(const [px,py] of [[510,20],[510,165],[725,350],[730,465]]){
  assert.ok(x+px*scale>=0&&x+px*scale<=224);assert.ok(y+py*scale>=0&&y+py*scale<=116);
 }
 await b.tabs[2].emit('click');b.element('#paperScroll').scrollTop=140;
 for(const [index,kind] of ['wave','read','wave'].entries()){
  await b.element('#characterTouch').emit('click');assert.equal(stage.dataset.reaction,kind);b.flush(index*3000);b.flush(index*3000+2600);b.advance(3000);
 }
 await b.element('#characterTouch').emit('click');b.flush(9000);b.flush(9300);
 b.win.innerWidth=860;b.win.innerHeight=900;stage.clientWidth=380;stage.clientHeight=640;b.read('feedback.refresh()');
 assert.equal(stage.classList.contains('action-running'),false);assert.equal(stage.dataset.reactionPhase,'rest');
 assert.equal(b.read('currentDraft'),2);assert.equal(b.element('#paperScroll').scrollTop,140);
 assert.ok(last('scale')*1536<=640);assert.ok(last('scale')*1024<=380);
 const n=b.glCalls.filter(c=>c[0]==='drawArrays').length;b.flush(9600);assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,n);
 await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[2].body'));
});
test('late action assets do not autoplay or appear on a different character',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite');
 await b.element('#go-fp').emit('click');
 for(const im of b.imageAssets){im.complete=true;im.naturalWidth=1024;im.onload();}
 assert.equal(stage.classList.contains('action-ready'),false);
 await b.element('#go-kyun').emit('click');assert.equal(stage.classList.contains('action-ready'),true);
 await b.element('#characterTouch').emit('click');b.flush(0);b.flush(300);
 await b.element('#go-choi').emit('click');assert.equal(stage.classList.contains('action-ready'),false);assert.equal(stage.classList.contains('action-running'),false);
 const n=b.glCalls.filter(c=>c[0]==='drawArrays').length;b.flush(700);assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,n);
});
test('layered action cancels on hiding/context loss and keeps reduced-motion fallback',async()=>{
 const b=boot('#kyun',{webgl:true}),stage=b.element('#companion .sprite');
 for(const im of b.imageAssets){im.complete=true;im.naturalWidth=1024;im.onload();}
 await b.element('#characterTouch').emit('click');b.flush(0);b.flush(300);
 b.document.hidden=true;await b.win.emit('visibilitychange');b.flush(800);assert.equal(stage.classList.contains('action-running'),false);
 b.document.hidden=false;b.advance(1000);await b.element('#characterTouch').emit('click');b.flush(1000);
 await b.element('#characterAction').emit('webglcontextlost',{preventDefault(){}});b.flush(1300);
 assert.equal(stage.classList.contains('action-ready'),false);await b.element('#copy').emit('click');assert.ok(b.copied());
 b.read('reduced.matches=true');b.advance(2000);const n=b.glCalls.filter(c=>c[0]==='drawArrays').length;
 await b.element('#characterTouch').emit('click');b.flush(4000);assert.equal(b.glCalls.filter(c=>c[0]==='drawArrays').length,n);
});

test('page edges turn without waiting to read or copy; another tab cancels the old turn',async()=>{
 const b=boot('#kyun',{motion:true});
 await b.tabs[1].emit('click');
 const first=b.animations.findLast(a=>a.node.id==='#pageTurn');assert.ok(first);
 assert.equal(b.element('#draftBody').textContent,b.read('PLACES.kyun.drafts[1].body'));
 assert.equal(b.element('.draft-tabs').style['--selection'],'1');
 await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[1].body'));
 await b.tabs[2].emit('click');assert.equal(first.cancelled,true);
 const second=b.animations.findLast(a=>a.node.id==='#pageTurn');assert.notEqual(first,second);
 b.element('#paperScroll').scrollTop=110;await b.tabs[2].emit('click');
 assert.equal(b.animations.findLast(a=>a.node.id==='#pageTurn'),second);assert.equal(b.element('#paperScroll').scrollTop,110);
 await b.element('#back').emit('click');assert.equal(second.cancelled,true);assert.equal(b.read('view'),'home');
});
test('Fold changes tab orientation and keyboard direction while retaining content, focus and reading position',async()=>{
 const b=boot('#kyun',{motion:true});b.win.innerWidth=400;b.win.innerHeight=850;await b.win.emit('resize');b.flush();
 assert.equal(b.element('.draft-tabs').attrs['aria-orientation'],'horizontal');
 await b.tabs[0].emit('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(b.read('currentDraft'),1);
 b.element('#paperScroll').scrollTop=90;const focus=b.active();
 b.win.innerWidth=720;b.win.innerHeight=840;await b.win.emit('resize');b.flush();
 assert.equal(b.element('.draft-tabs').attrs['aria-orientation'],'vertical');assert.equal(b.read('currentDraft'),1);
 assert.equal(b.element('#paperScroll').scrollTop,90);assert.equal(b.active(),focus);
 await b.tabs[1].emit('keydown',{key:'ArrowDown',preventDefault(){}});assert.equal(b.read('currentDraft'),2);assert.equal(b.active(),b.tabs[2]);
 assert.equal(b.tabs.filter(t=>t.tabIndex===0).length,1);
 await b.tabs[2].emit('keydown',{key:'ArrowRight',preventDefault(){throw Error('vertical tabs must not capture horizontal keys');}});assert.equal(b.read('currentDraft'),2);
 b.win.innerWidth=400;await b.win.emit('resize');b.flush();
 assert.equal(b.element('.draft-tabs').attrs['aria-orientation'],'horizontal');assert.equal(b.read('currentDraft'),2);
 await b.element('#copy').emit('click');assert.equal(b.copied(),b.read('PLACES.kyun.drafts[2].body'));
});
test('draft list previews follow the selected place without creating another copy of the controls',async()=>{
 const b=boot('#kyun');
 for(const key of ['kyun','choi','fp','shiire']){
  if(key!=='kyun')await b.element('#go-'+key).emit('click');
  for(let i=0;i<3;i++){
   assert.equal(b.tabs[i].querySelector('.draft-kind').textContent,b.read(`PLACES.${key}.tabs[${i}]`));
   assert.equal(b.tabs[i].querySelector('.draft-preview-title').textContent,b.read(`PLACES.${key}.drafts[${i}].title`));
   assert.ok(b.tabs[i].querySelector('.draft-preview-text').textContent.length>0);
  }
 }
});
test('page-turn decoration stops on role change, hide and reduced motion',async()=>{
 const b=boot('#kyun',{motion:true});await b.tabs[1].emit('click');const first=b.animations.findLast(a=>a.node.id==='#pageTurn');
 await b.element('#go-fp').emit('click');assert.equal(first.cancelled,true);
 await b.tabs[1].emit('click');assert.equal(b.animations.findLast(a=>a.node.id==='#pageTurn'),first);
 await b.element('#go-kyun').emit('click');await b.tabs[2].emit('click');const second=b.animations.findLast(a=>a.node.id==='#pageTurn');
 b.document.hidden=true;await b.win.emit('visibilitychange');assert.equal(second.cancelled,true);
 b.document.hidden=false;b.read('reduced.matches=true');await b.tabs[0].emit('click');
 assert.equal(b.animations.findLast(a=>a.node.id==='#pageTurn'),second);assert.equal(b.read('currentDraft'),0);
});
