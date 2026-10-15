// Small, continuous 2D mesh deformation. No extra textures or animation library.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// One outward sway and a smaller return, with zero speed at both ends.
const clothSwing=(ms,delay,end)=>{
 if(ms<=delay||ms>=end)return 0;
 const t=(ms-delay)/(end-delay);
 return Math.sin(Math.PI*2*t)*Math.pow(1-t,1.4)*smooth(0,.13,t);
};
export function rigPose(ms){
 return {angle:(smooth(90,350,ms)-smooth(660,1150,ms))*Math.PI/180*3.2,
  hair:ms<=200||ms>=1420?0:Math.sin(Math.PI*(ms-200)/1220)*8,
  hand:smooth(0,180,ms)-smooth(480,1010,ms),
  knee:smooth(130,450,ms)-smooth(700,1250,ms),
  hem:clothSwing(ms,160,2020),hemTrail:clothSwing(ms,320,2200)};
}
export function createCharacterRig({stage,canvas,image,expressionWindow,blinkWindow,reduced}){
 let gl=null,program=null,texture=null,buffer=null,uniforms=null,vertexCount=0;
 let config=null,uploadedSrc='',frame=0,epoch=0,start=null,box=null,unavailable=false;
 const vertex=`
 attribute vec2 point;
 uniform vec2 imageSize, viewportSize, pivot, headBand;
 uniform vec4 hairX, hairY, handX, handY, penLine, kneeArea, hemX, hemY, legLine;
 uniform float coverScale, offsetX, angle, hair, hand, knee, hem, hemTrail;
 varying mediump vec2 uv;
 float band(float p,vec4 bounds){return smoothstep(bounds.x,bounds.y,p)*(1.0-smoothstep(bounds.z,bounds.w,p));}
 void main(){
  uv=point/imageSize;
  vec2 p=point;
  float head=1.0-smoothstep(headBand.x,headBand.y,p.y);
  float a=angle*head;
  vec2 q=p-pivot;
  p=pivot+vec2(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);
  // Hair follows the head; each lower region has its own delayed envelope.
  float lockX=smoothstep(hairX.x,hairX.y,point.x)*(1.0-smoothstep(hairX.z,hairX.w,point.x));
  float lockY=smoothstep(hairY.x,hairY.y,point.y)*(1.0-smoothstep(hairY.z,hairY.w,point.y));
  p.x+=hair*lockX*lockY;
  p.y+=hair*.14*lockX*lockY;
  float armWeight=band(point.x,handX)*band(point.y,handY);
  vec2 penStart=penLine.xy,penVector=penLine.zw-penStart;
  float along=clamp(dot(point-penStart,penVector)/max(dot(penVector,penVector),1.0),0.0,1.0);
  float penDistance=length(point-(penStart+along*penVector));
  float penWeight=1.0-smoothstep(10.0,mix(40.0,18.0,along),penDistance);
  // Move hand and quill together. Small displacement avoids exposing unpainted areas.
  p+=vec2(3.0,-7.0)*hand*max(armWeight,penWeight);
  // Keep the exposed shin and shoe stable while adjacent cloth sways.
  vec2 legVector=legLine.zw-legLine.xy;
  float legAlong=clamp(dot(point-legLine.xy,legVector)/max(dot(legVector,legVector),1.0),0.0,1.0);
  float clothOnly=smoothstep(55.0,90.0,length(point-(legLine.xy+legAlong*legVector)));
  float kneeWeight=(1.0-smoothstep(0.15,1.0,length((point-kneeArea.xy)/kneeArea.zw)))*clothOnly;
  p+=vec2(4.0,2.0)*knee*kneeWeight;
  float hemWeight=band(point.x,hemX)*band(point.y,hemY)*clothOnly;
  // Upper folds move first; the heavier lower folds lag, reverse and settle.
  float skirtDepth=smoothstep(840.0,1380.0,point.y);
  float cloth=mix(hem*30.0,hemTrail*42.0,skirtDepth);
  float fold=0.85+0.15*sin(point.x/110.0);
  p+=vec2(-cloth*fold,cloth*0.09)*hemWeight;
  vec2 screen=p*coverScale+vec2(offsetX,0.0);
  gl_Position=vec4(screen.x/viewportSize.x*2.0-1.0,1.0-screen.y/viewportSize.y*2.0,0.0,1.0);
 }`;
 const fragment=`precision mediump float;uniform sampler2D portrait;varying mediump vec2 uv;void main(){gl_FragColor=texture2D(portrait,uv);}`;
 function stop(){
  epoch++;cancelAnimationFrame(frame);frame=0;start=null;
  stage.classList.remove('rig-running');
  expressionWindow.style.transform='';blinkWindow.style.transform='';
 }
 function compile(type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('shader');}
  return shader;
 }
 function initialize(){
  if(gl)return true;
  if(unavailable||!canvas?.getContext)return false;
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
   if(!gl){unavailable=true;return false;}
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
   program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');
   gl.useProgram(program);buffer=gl.createBuffer();texture=gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
   uniforms=Object.fromEntries(['imageSize','viewportSize','pivot','headBand','hairX','hairY','handX','handY','penLine','kneeArea','hemX','hemY','legLine','coverScale','offsetX','angle','hair','hand','knee','hem','hemTrail'].map(key=>[key,gl.getUniformLocation(program,key)]));
   gl.uniform1i(gl.getUniformLocation(program,'portrait'),0);gl.clearColor(0,0,0,0);
   return true;
  }catch{unavailable=true;gl=null;stop();return false;}
 }
 function prepare(next){
  stop();config=next;
  if(!config||reduced.matches||document.hidden||!image.complete||!image.naturalWidth)return false;
  if(!initialize())return false;
  try{
   if(uploadedSrc!==image.src){
    const [w,h]=config.size,vertices=[];
    for(let y=0;y<64;y++)for(let x=0;x<40;x++){
     const l=x*w/40,r=(x+1)*w/40,t=y*h/64,b=(y+1)*h/64;
     vertices.push(l,t,r,t,l,b,r,t,r,b,l,b);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    vertexCount=vertices.length/2;
    const point=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    if(gl.getError()!==gl.NO_ERROR)throw Error('texture');
    uploadedSrc=image.src;
   }
   return true;
  }catch{unavailable=true;stop();return false;}
 }
 function resize(){
  const bounds=stage.getBoundingClientRect(),w=stage.clientWidth||bounds.width,h=stage.clientHeight||bounds.height;
  if(!w||!h)return false;
  if(box&&box.w===w&&box.h===h)return true;
  stop();box={w,h};
  const ratio=Math.min(window.devicePixelRatio||1,1.5,1024/Math.max(w,h));
  canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
  return true;
 }
 function draw(pose){
  const [iw,ih]=config.size,{w,h}=box,scale=Math.max(w/iw,h/ih),x=(w-iw*scale)/2,[px,py]=config.pivot;
  gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
  gl.uniform2f(uniforms.imageSize,iw,ih);gl.uniform2f(uniforms.viewportSize,w,h);gl.uniform2f(uniforms.pivot,px,py);
  gl.uniform2f(uniforms.headBand,...config.headBand);gl.uniform4f(uniforms.hairX,...config.hairX);gl.uniform4f(uniforms.hairY,...config.hairY);
  for(const key of ['handX','handY','penLine','kneeArea','hemX','hemY','legLine'])gl.uniform4f(uniforms[key],...config[key]);
  gl.uniform1f(uniforms.coverScale,scale);gl.uniform1f(uniforms.offsetX,x);gl.uniform1f(uniforms.angle,pose.angle);gl.uniform1f(uniforms.hair,pose.hair);
  for(const key of ['hand','knee','hem','hemTrail'])gl.uniform1f(uniforms[key],pose[key]);
  gl.drawArrays(gl.TRIANGLES,0,vertexCount);
  const originX=x+px*scale,originY=py*scale;
  expressionWindow.style.transformOrigin=`${originX-parseFloat(expressionWindow.style.left||0)}px ${originY-parseFloat(expressionWindow.style.top||0)}px`;
  blinkWindow.style.transformOrigin=`${originX}px ${originY}px`;
  expressionWindow.style.transform=blinkWindow.style.transform=`rotate(${pose.angle}rad)`;
 }
 function react(){
  if(!config||reduced.matches||document.hidden||unavailable)return false;
  if(!prepare(config)||!resize())return false;
  const token=++epoch;
  function tick(time){
   if(token!==epoch)return;
   if(document.hidden||reduced.matches){stop();return;}
   start??=time;const elapsed=time-start;
   if(elapsed>=2200){stop();return;}
   try{draw(rigPose(elapsed));stage.classList.add('rig-running');}
   catch{unavailable=true;stop();return;}
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);return true;
 }
 image.addEventListener('load',()=>{if(config)prepare(config);});
 canvas?.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();uploadedSrc='';gl=null;unavailable=true;});
 canvas?.addEventListener('webglcontextrestored',()=>{unavailable=false;if(config)prepare(config);});
 return {prepare,react,stop,resize};
}
