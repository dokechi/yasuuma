// Quiet material sounds. Short envelopes leave room for the existing music.
export function createInteractionSound(context,destination=context.destination){
 const voices=new Set(),noise=context.createBuffer(1,Math.ceil(context.sampleRate*.18),context.sampleRate);
 const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
 let last=-Infinity,turn=0;
 function stop(v){try{const t=context.currentTime;if(typeof v.gain.gain.cancelAndHoldAtTime==='function')v.gain.gain.cancelAndHoldAtTime(t);else{v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(t<v.start ? .00001 : v.volume,t);}v.gain.gain.setTargetAtTime(.00001,t,.003);v.source.stop(t+.014);}catch{}voices.delete(v);}
 function voice(source,{delay=0,length=.07,volume=.01,attack=.004,filter}={}){
  while(voices.size>=10)stop(voices.values().next().value);
  const gain=context.createGain(),t=context.currentTime+delay;
  gain.gain.setValueAtTime(.00001,t);gain.gain.exponentialRampToValueAtTime(volume,t+attack);gain.gain.exponentialRampToValueAtTime(.00001,t+length);
  if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);
  gain.connect(destination);const v={source,gain,filter,start:t,volume};voices.add(v);
  source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();filter?.disconnect();};source.start(t);source.stop(t+length+.015);
 }
 function body(freq,end,length,volume,type='sine',delay=0){const o=context.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,context.currentTime+delay);o.frequency.exponentialRampToValueAtTime(end,context.currentTime+delay+length);voice(o,{delay,length,volume});}
 function brush(freq,length,volume,delay=0){const s=context.createBufferSource(),f=context.createBiquadFilter();s.buffer=noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.65;voice(s,{filter:f,length,volume,delay,attack:.006});}
 function play(kind='tap',room='red'){
  const t=context.currentTime,important=['copy','pin','done'].includes(kind);
  if(!important&&t-last<.035)return;last=t;const variation=[.985,1,1.012][turn++%3];
  if(kind==='door'){
   const f=({red:138,purple:180,silver:115,orange:154})[room]||138;
   // Metal latch, a second catch, then a short wooden body; under 200 ms.
   body(920*variation,650,.034,.010,'triangle');brush(2200,.025,.018);
   body(f*1.9,f*1.4,.06,.007,'triangle',.035);brush(room==='silver'?1250:1500,.042,.012,.046);
   body(f*variation,f*.67,.125,.022,'triangle',.068);brush(650,.085,.010,.08);
  }else if(kind==='paper'){
   brush(1550,.095,.016);brush(2700,.055,.005,.016);body(210,166,.055,.005);
  }else if(kind==='latch'){
   body(520*variation,500,.055,.007);brush(1900,.023,.011);body(165,123,.045,.007);
  }else if(kind==='back'||kind==='unpin'){
   body(196,147,.09,.010);brush(700,.065,.008);
  }else if(important){
   const f=kind==='pin'?1046.5:kind==='done'?659.25:783.99;
   body(f,f*.998,.18,.009);body(f*1.5,f*1.498,.22,.005,'sine',.034);brush(2300,.024,.004);
  }else{
   body(215*variation,165,.065,.012);brush(1300,.025,.010);
  }
 }
 return {play,cancel(){for(const v of [...voices])stop(v);},active:()=>voices.size};
}
