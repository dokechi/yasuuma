// Original user artwork, unchanged JPEG bytes. Coordinates are normalized to
// each complete artwork, never reused from the old transparent character rig.
const scene=(key,id,label,size,focus,zones,line)=>({id,label,size,focus,zones,line,src:`assets/scene-${key}-${id}-v1.jpg`});
// Ellipses: center x/y, radius x/y. Only these painted regions deform.
export const CHARACTER_SCENES={
 kyun:{
  welcome:scene('kyun','welcome','お迎え',[1536,1024],[.46,.2],{head:[.46,.17,.12,.17],hair:[.36,.37,.07,.19],hand:[.21,.44,.045,.1],cloth:[.45,.82,.16,.16]},'おかえり。今日の原稿、用意してあるよ。'),
  work:scene('kyun','work','仕事',[1536,1024],[.43,.24],{head:[.43,.19,.1,.16],hair:[.265,.37,.055,.25],hand:[.64,.46,.065,.09],cloth:[.29,.79,.08,.13]},'この一言、どうかな。一緒に読もう。'),
  rest:scene('kyun','rest','休憩',[1536,1024],[.43,.24],{head:[.42,.18,.11,.16],hair:[.36,.46,.065,.24],hand:[.61,.68,.055,.065],cloth:[.48,.79,.1,.12]},'ひと息つこう。続きはここに置いておくね。'),
  tea:scene('kyun','tea','お茶',[1536,1024],[.46,.22],{head:[.43,.17,.105,.15],hair:[.4,.46,.045,.2],hand:[.28,.8,.04,.07],cloth:[.57,.77,.16,.08]},'おつかれさま。お茶、淹れてきたよ。'),
  special:scene('kyun','special','特別',[1024,1536],[.45,0],{head:[.45,.13,.15,.105],hair:[.34,.15,.055,.08],hand:[.82,.52,.08,.027],cloth:[.52,.78,.12,.2]},'今日も来てくれて、うれしい。少しだけ、ここで。')
 },
 choi:{
  welcome:scene('choi','welcome','お迎え',[1024,1536],[.48,0],{head:[.48,.105,.15,.085],hair:[.66,.31,.075,.18],hand:[.25,.22,.06,.035],cloth:[.5,.46,.095,.07]},'来てくれたのね。気になるもの、一緒に見よう。'),
  work:scene('choi','work','仕事',[1536,1024],[.52,.23],{head:[.48,.2,.115,.16],hair:[.76,.46,.06,.24],hand:[.31,.73,.055,.07],cloth:[.68,.83,.095,.08]},'もう少し確かめてから、言葉にしてみよう。'),
  rest:scene('choi','rest','休憩',[1024,1536],[.54,0],{head:[.53,.18,.13,.105],hair:[.76,.42,.06,.17],hand:[.69,.5,.06,.055],cloth:[.39,.63,.12,.1]},'ここ、風が気持ちいいの。少し休んでいく？'),
  tea:scene('choi','tea','お茶',[1536,1024],[.49,.2],{head:[.48,.16,.11,.16],hair:[.45,.43,.04,.18],hand:[.57,.61,.065,.05],cloth:[.51,.86,.15,.08]},'準備できたよ。ゆっくりしていってね。'),
  special:scene('choi','special','特別',[1536,1024],[.49,.24],{head:[.49,.19,.13,.18],hair:[.74,.56,.07,.22],hand:[.29,.41,.08,.045],cloth:[.67,.86,.12,.09]},'ふふ。この子も、あなたを待っていたみたい。')
 }
};
export const SCENE_IDS=['welcome','work','rest','tea','special'];
export function sceneCamera(scene,width,height,contain=false){
 const [iw,ih]=scene.size,scale=(contain?Math.min:Math.max)(width/iw,height/ih);
 return {scale,x:(width-iw*scale)*(contain?.5:scene.focus[0]),y:(height-ih*scale)*(contain?.5:scene.focus[1]),width,height};
}
export function sceneHit(scene,camera,x,y){
 const px=(x-camera.x)/camera.scale/scene.size[0],py=(y-camera.y)/camera.scale/scene.size[1];
 let closest='head',distance=Infinity;
 for(const [key,[cx,cy,rx,ry]] of Object.entries(scene.zones)){
  const d=((px-cx)/rx)**2+((py-cy)/ry)**2;if(d<distance){distance=d;closest=key;}
 }
 return distance<2.5?closest:'head';
}
