// Normalized progress keeps each entrance's rhythm at every selected pace.
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const settle=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)};
const interval=(p,start,end)=>clamp((p-start)/(end-start));
const arc=(p,start,end)=>Math.sin(Math.PI*interval(p,start,end));
export function sampleEntry(id,progress){
 const p=clamp(progress);
 let open,travel,aim,x=0,y=0,angle=104,brightness,light;
 if(id==='red'){
  // Crack the door, allow a brief invitation, then quietly move inside.
  open=p<.30?.20*smooth(p/.16):.20+.80*smooth((p-.30)/.38);
  travel=settle(interval(p,.26,1));aim=smooth(interval(p,.25,.90));angle=98;
  x=-8*arc(p,.26,.76);brightness=.69+.31*smooth(p/.78);
  light=.035*smooth(interval(p,.40,.76));
 }else if(id==='purple'){
  // A short rising curve follows the stair before crossing the threshold.
  open=smooth(p/.43);travel=settle(interval(p,.10,1));aim=smooth(interval(p,.04,.88));angle=110;
  const lift=arc(p,.02,.73);x=-15*lift;y=-43*lift+3*Math.sin(p*Math.PI*6)*lift;
  brightness=.62+.43*smooth(p/.69);light=.075*smooth(interval(p,.18,.60));
 }else if(id==='silver'){
  // First reveal both leaves; let the room's width register before moving.
  open=smooth(p/.40);travel=settle(interval(p,.37,1));aim=smooth(interval(p,.34,.91));angle=101;
  brightness=.73+.34*smooth(p/.67);light=.09*smooth(interval(p,.22,.62));
 }else{
  // A warmer, brisk approach arrives early enough for a soft final settle.
  open=smooth(p/.35);const t=smooth(interval(p,.08,1));travel=1-Math.pow(1-t,3);
  aim=smooth(interval(p,.05,.75));angle=105;x=20*arc(p,.03,.65);y=10*arc(p,.03,.65);
  brightness=.72+.40*smooth(p/.57);light=.18*smooth(interval(p,.10,.50));
 }
 return {open,travel,aim,x,y,angle,brightness,light:light*(1-smooth(interval(p,.83,1)))};
}
