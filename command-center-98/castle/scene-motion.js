import {sceneCamera} from './scene-manifest.js?v=19';
// One bounded mesh per view. The background outside calibrated ellipses stays
// fixed. Static <img> is always underneath for low-power / WebGL fallbacks.
export function createSceneMotion({canvas,image,box,reduced,contain=false}){
 let gl,program,texture,buffer,uniforms,vertices,scene=null,frame=0,epoch=0,last=-Infinity,start=0,hit='head',hitAt=-Infinity,visible=true,failed=false;
 const vertex=`attribute vec2 p;uniform vec4 head,hair,hand,cloth;uniform vec2 imageSize,viewport,offset;uniform float scale,t,react,region;varying mediump vec2 uv;
 float weight(vec2 v,vec4 area){float r=length((v-area.xy)/area.zw);return 1.-smoothstep(.25,1.,r);}
 void main(){uv=p;vec2 q=p*imageSize;float h=weight(p,head),a=(sin(t*.9)*.003+react*.012*(1.-step(.5,region)))*h;vec2 d=q-head.xy*imageSize;
 q+=vec2(cos(a)*d.x-sin(a)*d.y-d.x,sin(a)*d.x+cos(a)*d.y-d.y);
 float breeze=sin(t*1.2)*1.7+react*(region==1.?9.:2.);
 q+=vec2(breeze,breeze*.12)*weight(p,hair);
 q+=vec2(1.1,-2.8)*(sin(t*.8)*.22+react*(region==2.?2.:.25))*weight(p,hand);
 q+=vec2(sin(t*.7)*1.3+react*(region==3.?9.:1.5),react*.3)*weight(p,cloth);
 vec2 s=q*scale+offset;gl_Position=vec4(s.x/viewport.x*2.-1.,1.-s.y/viewport.y*2.,0.,1.);}`;
 const fragment='precision mediump float;uniform sampler2D art;varying mediump vec2 uv;void main(){gl_FragColor=texture2D(art,uv);}';
 function stop(){epoch++;cancelAnimationFrame(frame);frame=0;canvas.classList.remove('is-live');}
 function init(){
  if(gl)return true;if(failed)return false;
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});if(!gl)throw Error('no WebGL');
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;};
   const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');gl.useProgram(program);
   const mesh=[];for(let y=0;y<64;y++)for(let x=0;x<64;x++){const l=x/64,r=(x+1)/64,t=y/64,b=(y+1)/64;mesh.push(l,t,r,t,l,b,r,t,r,b,l,b);}vertices=mesh.length/2;
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);const point=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);for(const axis of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,axis,gl.LINEAR);
   uniforms=Object.fromEntries(['head','hair','hand','cloth','imageSize','viewport','offset','scale','t','react','region'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1i(gl.getUniformLocation(program,'art'),0);gl.clearColor(0,0,0,0);return true;
  }catch{failed=true;gl=null;stop();return false;}
 }
 function draw(now){
  const {width:w,height:h}=box.getBoundingClientRect();if(!w||!h)return;
  const dpr=Math.min(window.devicePixelRatio||1,1.5,1400/Math.max(w,h));
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));}
  const c=sceneCamera(scene,w,h,contain),dt=(now-hitAt)/1500,r=dt>0&&dt<1?Math.sin(dt*Math.PI*2)*Math.sin(dt*Math.PI):0;
  gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
  for(const k of ['head','hair','hand','cloth'])gl.uniform4f(uniforms[k],...scene.zones[k]);
  gl.uniform2f(uniforms.imageSize,...scene.size);gl.uniform2f(uniforms.viewport,w,h);gl.uniform2f(uniforms.offset,c.x,c.y);gl.uniform1f(uniforms.scale,c.scale);gl.uniform1f(uniforms.t,(now-start)/1000);gl.uniform1f(uniforms.react,r);gl.uniform1f(uniforms.region,['head','hair','hand','cloth'].indexOf(hit));gl.drawArrays(gl.TRIANGLES,0,vertices);canvas.classList.add('is-live');
 }
 function resume(){
  stop();if(!scene||!visible||document.hidden||reduced.matches||failed||!image.complete||!image.naturalWidth||!init())return;
  try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);if(gl.getError()!==gl.NO_ERROR)throw Error('texture');}catch{failed=true;stop();return;}
  const token=epoch;last=-Infinity;start=0;
  const tick=now=>{if(epoch!==token)return;if(!visible||document.hidden||reduced.matches){stop();return;}start||=now;if(now-last>=32){last=now;try{draw(now);}catch{failed=true;stop();return;}}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 }
 function set(next){stop();scene=next;resume();}
 image.addEventListener('load',resume);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();failed=true;gl=null;});
 canvas.addEventListener('webglcontextrestored',()=>{failed=false;resume();});
 return {set,stop,resume,react(region='head'){hit=region;hitAt=performance.now();},visible(value){visible=value;value?resume():stop();}};
}
