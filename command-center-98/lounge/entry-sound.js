// Small synthesized cues, scheduled on the audio clock and cancellable together.
export function createEntrySound(context){
 const voices=new Set();
 function voice(source,filter,delay,length,volume){
  const gain=context.createGain(),t=context.currentTime+delay;
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,t+length);
  if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);
  gain.connect(context.destination);const v={source,gain,filter};voices.add(v);
  source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();filter?.disconnect();};
  source.start(t);source.stop(t+length+.015);return t;
 }
 function note(freq,delay,length,volume,type='sine',end){
  const source=context.createOscillator();source.type=type;
  source.frequency.setValueAtTime(freq,context.currentTime+delay);
  if(end)source.frequency.exponentialRampToValueAtTime(end,context.currentTime+delay+length);
  voice(source,null,delay,length,volume);
 }
 function rustle(delay,length,volume,frequency,type='bandpass'){
  const source=context.createBufferSource(),buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  source.buffer=buffer;const filter=context.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
  voice(source,filter,delay,length,volume);
 }
 function cancel(){
  for(const v of [...voices]){try{const t=context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(.0001,t,.004);v.source.stop(t+.016);}catch{} }
 }
 return {
  cancel,
  begin(id,duration){
   cancel();const d=duration/1000;
   if(id==='red'){rustle(d*.12,Math.min(.11,d*.17),.006,1600,'highpass');rustle(d*.32,.065,.004,520);}
   else if(id==='purple'){rustle(d*.12,.15,.005,1900);note(660,d*.13,.14,.005,'sine',990);note(1320,d*.22,.12,.0025);}
   else if(id==='silver'){rustle(d*.06,Math.min(.20,d*.27),.009,260);note(138,d*.07,.18,.003,'triangle',103);note(165,d*.18,.17,.0025,'triangle',121);}
   else{rustle(d*.06,.12,.007,440);note(196,d*.10,.11,.003,'triangle',147);}
  },
  arrive(id){
   if(id==='red'){note(523,0,.11,.005);note(659,.025,.12,.0035);}
   else if(id==='purple'){note(784,0,.10,.005);note(1046,.035,.13,.0035);}
   else if(id==='silver'){note(392,0,.15,.004);note(588,.03,.17,.0025);}
   else{note(1580,0,.075,.0045);note(2360,.006,.065,.0025);note(3190,.003,.045,.0015);}
  }
 };
}
