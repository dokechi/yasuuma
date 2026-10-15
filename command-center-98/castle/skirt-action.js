// Layered tap action: stable body/leg, movable front cloth, articulated forearm.
export const SKIRT_ACTION_MS=2600;
const easeLift=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function skirtLiftAt(ms){return easeLift(ms/560)-easeLift((ms-1080)/720);}
// One short choreography, with no idle render loop. All poses return to rest.
export function companionPose(ms,kind){
 const movement=ms-550;
 const wave=kind==='wave'?easeLift(movement/450)-easeLift((movement-1050)/550):0;
 const write=kind==='read'?(easeLift((ms-950)/250)-easeLift((ms-1850)/400))*Math.sin((ms-950)/90):0;
 const head=-.018*(easeLift(ms/200)-easeLift((ms-350)/300))+(kind==='read'?.035*(easeLift((ms-950)/350)-easeLift((ms-1850)/450)):0);
 return {lift:kind==='skirt'?skirtLiftAt(movement):0,wave,waveMix:easeLift(wave/.25),wrist:Math.sin((ms-1000)/110)*.10*(easeLift((ms-950)/200)-easeLift((ms-1550)/250)),write,head};
}
export function companionCamera(w,h,compact){
 const scale=compact?Math.min(w/600,(h-8)/540):Math.min(w/1024,h/1536);
 return {scale,x:compact?w/2-620*scale:(w-1024*scale)/2,y:compact?4:0,compact};
}
export function createSkirtAction({stage,canvas,reduced,onFrame=()=>{}}){
 let config=null,gl=null,program=null,buffer=null,uniforms=null,broken=false,frame=0,epoch=0,started=null,box=null,reaction=null;
 const assets=new Map();
 const vertex=`attribute vec2 point;uniform vec2 viewport,armOffset;uniform vec4 armLinear;uniform vec2 pivot;uniform float scale,offsetX,offsetY,lift,wave,wrist,write,head;uniform mediump float layer;varying mediump vec2 uv;varying mediump float armY;
 void main(){uv=point/vec2(1024.0,1536.0);vec2 p=point;armY=0.0;
 if(layer>0.5&&layer<1.5){
  float depth=clamp((p.y-700.0)/690.0,0.0,1.0);
  float gather=smoothstep(660.0,780.0,p.x);
  float grip=exp(-dot((p-vec2(828.0,705.0))/vec2(100.0,95.0),(p-vec2(828.0,705.0))/vec2(100.0,95.0)));
  p+=vec2(-72.0,48.0)*(1.0-lift)*grip;
  p.y-=lift*440.0*depth*gather;p.x-=lift*28.0*depth*gather;
 }else if(layer>1.5&&layer<2.5){
  p=mat2(armLinear.x,armLinear.y,armLinear.z,armLinear.w)*p+armOffset;armY=p.y;
  float a=(1.0-lift)*0.48;vec2 q=p-vec2(690.0,585.0);
  p=vec2(690.0,585.0)+vec2(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);
 }else if(layer>3.5){
  p=mat2(armLinear.x,armLinear.y,armLinear.z,armLinear.w)*p+armOffset;
  vec2 hand=p-vec2(730.0,465.0);float bend=wrist*(1.0-smoothstep(455.0,500.0,p.y));
  p=vec2(730.0,465.0)+vec2(cos(bend)*hand.x-sin(bend)*hand.y,sin(bend)*hand.x+cos(bend)*hand.y);
  float a=(1.0-wave)*2.15;vec2 q=p-vec2(690.0,585.0);
  p=vec2(690.0,585.0)+vec2(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);
 }
 if(layer<0.5){
  float a=head*(1.0-smoothstep(232.0,325.0,p.y));vec2 q=p-pivot;
  p=pivot+vec2(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);
  float hand=smoothstep(380.0,510.0,p.x)*(1.0-smoothstep(630.0,675.0,p.x))*smoothstep(490.0,545.0,p.y)*(1.0-smoothstep(598.0,625.0,p.y));
  vec2 pa=p-vec2(470.0,412.0),ba=vec2(186.0,205.0);float t=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
  float pen=1.0-smoothstep(8.0,22.0,length(pa-ba*t));
  p+=vec2(3.0,-1.8)*write*max(hand,pen);
 }
 vec2 screen=p*scale+vec2(offsetX,offsetY);gl_Position=vec4(screen.x/viewport.x*2.0-1.0,1.0-screen.y/viewport.y*2.0,0.0,1.0);}`;
 const fragment=`precision mediump float;varying mediump vec2 uv;varying mediump float armY;uniform sampler2D art;uniform float opacity;uniform mediump float layer;uniform vec2 polygon[12];uniform int polygonCount;
 void main(){vec4 color=texture2D(art,uv);if(layer>1.5&&layer<2.5)color*=smoothstep(565.0,580.0,armY);if(layer>0.5&&layer<1.5||layer>2.5&&layer<3.5){
  vec2 p=uv*vec2(1024.0,1536.0);bool inside=false;float nearest=10000.0;
  for(int i=0;i<12;i++){if(i<polygonCount){vec2 a=polygon[i];vec2 b=polygon[0];if(i+1<polygonCount)b=polygon[i+1];
   if((a.y>p.y)!=(b.y>p.y)){float dy=b.y-a.y;if(p.x<(b.x-a.x)*(p.y-a.y)/dy+a.x)inside=!inside;}
   vec2 edge=b-a;float t=clamp(dot(p-a,edge)/max(dot(edge,edge),1.0),0.0,1.0);nearest=min(nearest,length(p-a-edge*t));
  }}if(!inside)discard;color*=smoothstep(0.0,2.0,nearest);
 }gl_FragColor=color*opacity;}`;
 const cloth=[[730,697],[830,680],[886,760],[934,1010],[934,1320],[858,1400],[768,1360],[722,1190],[690,1000],[675,840]];
 const book=[[478,610],[535,575],[717,551],[927,558],[927,599],[819,661],[663,692],[490,670]];
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('shader');return shader;}
 function init(){if(gl)return true;if(broken||!canvas?.getContext)return false;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false,powerPreference:'low-power'});if(!gl)return false;
   const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');
   gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   const mesh=[];for(let y=0;y<64;y++)for(let x=0;x<40;x++){const l=x*25.6,r=(x+1)*25.6,t=y*24,b=(y+1)*24;mesh.push(l,t,r,t,l,b,r,t,r,b,l,b);}
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   uniforms=Object.fromEntries(['viewport','armOffset','armLinear','scale','offsetX','offsetY','lift','wave','wrist','write','head','pivot','opacity','layer','polygon[0]','polygonCount'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1i(gl.getUniformLocation(program,'art'),0);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);return true;
  }catch{broken=true;gl=null;stage.classList.remove('action-ready');return false;}
 }
 function ready(){return config&&config.sources.every(src=>assets.get(src)?.ready);}
 function texture(asset){if(asset.texture)return asset.texture;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,asset.image);if(gl.getError()!==gl.NO_ERROR)throw Error('texture');asset.texture=t;return t;}
 function polygon(points){const flat=points.flat();while(flat.length<24)flat.push(0);gl.uniform2fv(uniforms['polygon[0]'],new Float32Array(flat));gl.uniform1i(uniforms.polygonCount,points.length);}
 function compact(){return !(window.innerWidth>=680&&window.innerWidth/window.innerHeight>=.8);}
 function paint(pose=companionPose(0,null),phase='rest'){
  if(!config||!box||!ready()||reduced.matches||document.hidden||!init()){onFrame(null);return false;}
  try{const {w,h}=box,camera=companionCamera(w,h,compact());gl.useProgram(program);gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(uniforms.viewport,w,h);gl.uniform1f(uniforms.scale,camera.scale);gl.uniform1f(uniforms.offsetX,camera.x);gl.uniform1f(uniforms.offsetY,camera.y);gl.uniform2f(uniforms.pivot,...config.pivot);
   for(const name of ['lift','wave','wrist','write','head'])gl.uniform1f(uniforms[name],pose[name]);
   // The book hides each forearm root. It is drawn last, above both arms.
   for(const layer of [0,1,2,4,3]){
    if(layer===4&&!pose.waveMix)continue;
    gl.uniform1f(uniforms.layer,layer);gl.uniform1f(uniforms.opacity,layer===2?1-pose.waveMix:layer===4?pose.waveMix:1);
    const matrix=layer===4?config.waveTransform:config.armTransform;
    gl.uniform4f(uniforms.armLinear,...matrix.slice(0,4));gl.uniform2f(uniforms.armOffset,...matrix.slice(4));
    if(layer===1)polygon(cloth);if(layer===3)polygon(book);gl.bindTexture(gl.TEXTURE_2D,texture(assets.get(config.sources[layer])));gl.drawArrays(gl.TRIANGLES,0,15360);
   }
   stage.classList.add('action-ready');stage.dataset.reactionPhase=phase;onFrame(camera,pose,phase,reaction);return true;
  }catch{broken=true;stage.classList.remove('action-ready');onFrame(null);return false;}
 }
 function stop(){epoch++;cancelAnimationFrame(frame);frame=0;started=null;reaction=null;stage.classList.remove('action-running');stage.dataset.reaction='';stage.dataset.reactionPhase='rest';if(!paint())stage.classList.remove('action-ready');}
 function resize(){const b=stage.getBoundingClientRect(),w=stage.clientWidth||b.width,h=stage.clientHeight||b.height,small=compact();if(!w||!h)return;if(box?.w===w&&box?.h===h&&box?.compact===small)return;box={w,h,compact:small};const ratio=Math.min(window.devicePixelRatio||1,1.5,1024/Math.max(w,h));canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);stop();}
 function prepare(next){config=next;stop();if(!config)return;resize();
  for(const src of config.sources){if(assets.has(src))continue;const image=new Image(),asset={image,ready:false,texture:null};assets.set(src,asset);image.onload=()=>{asset.ready=true;if(config?.sources.includes(src)&&!frame)paint();};image.onerror=()=>{asset.ready=false;if(config?.sources.includes(src))stop();};image.src=src;if(image.complete&&image.naturalWidth)asset.ready=true;}
  paint();
 }
 function react(index=0){if(frame)return true;if(!config||!ready()||reduced.matches||document.hidden)return false;resize();if(!paint())return false;
  const choices=compact()?config.compactReactions:config.reactions;reaction=choices[index%choices.length];
  const token=++epoch;started=null;stage.dataset.reaction=reaction;stage.classList.add('action-running');
  function tick(time){if(token!==epoch)return;if(document.hidden||reduced.matches){stop();return;}started??=time;const ms=time-started;if(ms>=SKIRT_ACTION_MS){stop();return;}
   const phase=ms<280?'notice':ms<550?'smile':reaction==='read'&&ms>=1150?'reading':ms>=2250?'settle':'gesture';
   if(!paint(companionPose(ms,reaction),phase)){stop();return;}frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);return true;
 }
 canvas?.addEventListener('webglcontextlost',e=>{e.preventDefault();broken=true;gl=null;assets.forEach(a=>a.texture=null);stop();});
 canvas?.addEventListener('webglcontextrestored',()=>{broken=false;if(config)paint();});
 return {prepare,react,stop,resize};
}
