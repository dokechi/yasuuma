import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicOrder,createMusicControls} from '../lounge/music.js';
import {createInteractionSound} from '../lounge/interaction-sound.js';
const catalog=['harvest','lively','enchanted','woodland'].map(id=>({id}));
function memory(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};}
test('reopening the page advances through all four songs without repeats, including the cycle boundary',()=>{
 const storage=memory(),heard=[];for(let i=0;i<12;i++)heard.push(createMusicOrder(catalog,{storage,random:()=>.2}).next().id);
 for(let i=0;i<12;i+=4)assert.equal(new Set(heard.slice(i,i+4)).size,4);
 for(let i=1;i<heard.length;i++)assert.notEqual(heard[i],heard[i-1]);
});
test('legacy last-song preferences avoid the same first song; invalid or duplicate saved queue entries are repaired',()=>{
 const storage=memory();assert.notEqual(createMusicOrder(catalog,{storage,previous:'woodland',random:()=>.999}).next().id,'woodland');
 storage.setItem('castle-town.music-order.v1',JSON.stringify({last:'harvest',remaining:['harvest','missing','lively','lively','enchanted']}));
 const order=createMusicOrder(catalog,{storage});assert.equal(order.next().id,'enchanted');assert.equal(order.next().id,'lively');
 assert.ok(catalog.some(t=>t.id===order.next().id));
});
test('blocked or corrupt storage still shuffles within the current visit without crashing',()=>{
 for(const storage of [{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},{getItem:()=>'{broken',setItem(){throw Error('full');}}]){
  const order=createMusicOrder(catalog,{storage}),ids=Array.from({length:4},()=>order.next().id);assert.equal(new Set(ids).size,4);
 }
});
function element(){const events=new Map();return {events,dataset:{},hidden:false,checked:true,value:'',textContent:'',addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},emit(type,event={}){for(const fn of events.get(type)||[])fn(event);},setAttribute(){},getAttribute(){return null;},querySelector(){return this.child;},contains:()=>false,focus(){}};}
function boot({enabled=true,reject=false}={}){
 const storage=memory();storage.setItem('castle-town.audio.v1',JSON.stringify({bgmEnabled:enabled,bgmVolume:.12,effectsVolume:.5,track:'harvest'}));storage.setItem('castle-town.music-order.v1',JSON.stringify({last:'harvest',remaining:['woodland','enchanted','lively']}));
 const nodes=new Map(),doc=element(),win=element();for(const id of ['bgmAudio','audioSettings','audioControls','bgmEnabled','bgmVolume','bgmStart','bgmStatus','effectsEnabled','effectsVolume','bgmVolumeValue','effectsVolumeValue','bgmTrack','bgmNext'])nodes.set('#'+id,element());
 const audio=nodes.get('#bgmAudio');Object.assign(audio,{paused:true,ended:false,children:[],playCalls:0,currentTime:0,pause(){this.paused=true;this.emit('pause');},play(){this.playCalls++;if(reject)return Promise.reject(Object.assign(Error('gesture'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve();},load(){this.ended=false;},replaceChildren(){this.children=[];},append(s){this.children.push(s);}});
 nodes.get('#audioSettings').child=element();nodes.get('#audioSettings').child.child=element();doc.hidden=false;doc.querySelector=s=>nodes.get(s)||null;doc.createElement=()=>element();
 const api=createMusicControls({storage,doc,win,getEffects:()=>({enabled:true}),setEffects(){}});
 return {api,audio,doc,win,nodes,storage,allow(){reject=false;}};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
test('the real music controller selects the saved next track and advances on ended rather than looping the first song',async()=>{
 const b=boot();await settle();assert.equal(b.api.state().track,'lively');assert.equal(b.audio.loop,false);assert.equal(b.audio.children.length,1);assert.match(b.audio.children[0].src,/Lively_Tavern.mp3$/);
 b.audio.paused=true;b.audio.ended=true;b.audio.emit('ended');await settle();assert.equal(b.api.state().track,'enchanted');assert.equal(b.audio.playCalls,2);
 const remaining=JSON.parse(b.storage.getItem('castle-town.music-order.v1'));assert.deepEqual(remaining.remaining,['woodland']);
});
test('muting, backgrounding, resuming and changing volume do not advance or overwrite song order',async()=>{
 const b=boot();await settle();const order=b.storage.getItem('castle-town.music-order.v1');b.win.emit('castle:pause');assert.equal(b.audio.paused,true);b.win.emit('castle:resume');await settle();assert.equal(b.api.state().track,'lively');
 b.nodes.get('#bgmVolume').value='20';b.nodes.get('#bgmVolume').emit('input');await settle();assert.equal(b.storage.getItem('castle-town.music-order.v1'),order);
 const off=boot({enabled:false});assert.equal(off.api.state().track,undefined);assert.equal(off.audio.playCalls,0);assert.deepEqual(JSON.parse(off.storage.getItem('castle-town.music-order.v1')).remaining,['woodland','enchanted','lively']);
});
test('autoplay rejection retries the same selected song after a user gesture without consuming another song',async()=>{
 const b=boot({reject:true});await settle();assert.equal(b.api.state().awaitingGesture,true);const order=b.storage.getItem('castle-town.music-order.v1');b.allow();b.doc.emit('click',{isTrusted:true,target:{closest:()=>null}});await settle();assert.equal(b.api.state().awaitingGesture,false);assert.equal(b.api.state().track,'lively');assert.equal(b.storage.getItem('castle-town.music-order.v1'),order);assert.equal(b.audio.paused,false);
});
function audioContext(){
 const sources=[],gains=[];const parameter=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}}),node=()=>({connect(){},disconnect(){}}),source=()=>{const s={...node(),frequency:parameter(),start(at){this.started=at;},stop(at){this.stopped=at;}};sources.push(s);return s;};
 const context={currentTime:10,sampleRate:48000,destination:node(),createBuffer:(_channels,length)=>({getChannelData:()=>new Float32Array(length)}),createGain(){const g={...node(),gain:parameter()};gains.push(g);return g;},createBufferSource:source,createOscillator:source,createBiquadFilter:()=>({...node(),frequency:{value:0},Q:{value:0}})};
 return {context,sources,gains};
}
test('door sounds finish quickly, limit overlapping sources, and can be stopped immediately by the existing mute lifecycle',()=>{
 const {context,sources}=audioContext(),fx=createInteractionSound(context);fx.play('door','orange');assert.ok(fx.active()>0);assert.ok(sources.every(s=>s.started>=10&&s.stopped<=10.22));
 for(let i=0;i<10;i++){context.currentTime+=.04;fx.play('door','silver');assert.ok(fx.active()<=10);}
 fx.cancel();assert.equal(fx.active(),0);assert.ok(sources.every(s=>s.stopped<=context.currentTime+.22));
});
