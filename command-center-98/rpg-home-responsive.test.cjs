'use strict';
/* Dependency-free CSS contracts and numeric layout model, NOT browser-rendered QA.
 * The model is bound to the actual CSS declarations and the PNG's IHDR dimensions.
 * Native-browser visual, safe-area, font-rasterization and zoom QA remain separate.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'rpg-home.css'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'rpg-home.js'),'utf8');
const png=fs.readFileSync(path.join(__dirname,'assets/rpg-home/world.png'));
const artwork={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
function rule(selector){
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=css.match(new RegExp(escaped+'\\s*\\{([^}]+)\\}'));
 assert.ok(match,selector+' must exist');
 return Object.fromEntries(match[1].split(';').filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i).trim(),x.slice(i+1).trim()];}));
}
const world=rule('#ccRpgHome .rpg-world');
const page=rule('#ccRpgHome'),scene=rule('#ccRpgHome .rpg-scene');
const compact=value=>value.replace(/\s+/g,'');
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
const cases=[[686,644],[834,900],[360,780],[390,844],[412,915],[320,950],[980,980],[1440,900],[390,700],[390,780]];
function geometry(vw,vh,{top=0,right=0,bottom=0,left=0}={}){
 const innerWidth=vw-left-right,innerHeight=vh-top-bottom;
 const height=Math.min(innerHeight,2.2*vw),wide=vw/vh>=.8&&vh>=600,width=wide?innerWidth:Math.min(innerWidth,height*.84*artwork.width/artwork.height);
 const scale=height*.84/artwork.height,imageWidth=artwork.width*scale;
 return {wide,width,height,scale,imageWidth,left:left+(innerWidth-width)/2,top:top+(innerHeight-height)/2,crop:imageWidth-width};
}
function fontSize(selector,width){
 const value=rule(selector)['font-size'];
 const match=value.match(/^clamp\(([\d.]+)px,\s*([\d.]+)cqw,\s*([\d.]+)px\)$/);
 assert.ok(match,`${selector}: expected frame-container clamp, found ${value}`);
 return Math.min(Number(match[3]),Math.max(Number(match[1]),Number(match[2])*width/100));
}

test('frame CSS is dynamic-height bounded and has no legacy minimum-height/desktop stretch override',()=>{
 assert.deepEqual(artwork,{width:941,height:1672});
 assert.equal(compact(world['--rpg-frame-h']),'min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)),220vw)');
 assert.equal(compact(world.width),'min(100%,calc(var(--rpg-frame-h)*.84*941/1672))');
 assert.equal(world.height,'var(--rpg-frame-h)');
 assert.ok(!world['min-height']||world['min-height']==='0');
 assert.equal(world['container-type'],'inline-size');
 assert.equal(page['align-items'],'center');assert.equal(page['justify-content'],'center');
 assert.ok(['auto','hidden'].includes(page.overflow));
 assert.equal(world.padding,'0');

 assert.equal(page.padding,'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)');
 assert.equal(world['grid-template-rows'],'84% 16%');assert.equal(scene['grid-template-rows'],'20% 72% 8%');
 assert.equal(rule('#ccRpgHome .rpg-portals')['grid-template-rows'],'repeat(4,minmax(0,1fr))');
 for(const override of [...css.matchAll(/#ccRpgHome \.rpg-world\s*\{([^}]+)\}/g)].slice(1)){
  if(/(?:^|;)\s*width:/.test(override[1]))assert.match(override[1],/width:100%/,'wide frame is the only modeled override');
  assert.doesNotMatch(override[1],/(?:^|;)\s*(?:height|max-height|min-height|padding|background-size|background-position|grid-template-rows|--rpg-frame-h)\s*:/,'wide frame preserves height and artwork ratio');
 }
 assert.equal(compact(scene['background-size']),'100%100%,auto100%');
 assert.match(scene['background-position'],/right center/);
 assert.equal(scene['background-repeat'],'no-repeat');
 assert.doesNotMatch(css,/max-width\s*:\s*(?:720px|min\(760px)|min-height\s*:\s*(?:540|620)px/);
});

for(const [vw,vh] of cases){
 test(`geometry model ${vw}x${vh}: fits viewport, no artwork stretch, right characters retained, row fractions fixed`,()=>{
  const g=geometry(vw,vh);
  assert.ok(g.width<=vw&&g.height<=vh,'frame cannot produce page scroll');
  assert.ok(g.left>=0&&g.top>=0,'centered frame stays inside viewport');
  close(g.imageWidth/artwork.width,g.height*.84/artwork.height,'equal artwork X/Y scale');
  assert.ok(g.wide?g.width===vw:g.crop>=-1e-7,'wide frame fills width; narrow frame crops only scenery');
  close(g.imageWidth-g.crop,g.width,'right artwork edge stays aligned with frame');
  const visibleSourceLeft=g.crop/g.scale;
  assert.ok(visibleSourceLeft<=640,'left edge of full character region stays visible');
  assert.ok(885*g.scale-g.crop<=g.width,'right edge of full character region stays visible');
  for(const fraction of [.2,.38,.56,.74,.92]){
   close((g.top+fraction*g.height-g.top)/g.height,fraction,'unchanged normalized row Y');
  }
  close(.2*g.height+4*.18*g.height+.08*g.height,g.height,'all five grid boundaries fit');
  close(.19*g.height,.2*g.height-.01*g.height,'first outline is one frame-percent above first row');
 });
}

test('browser chrome changes recompute height without changing aspect scale or row proportions',()=>{
 const frames=[700,780,844].map(h=>geometry(390,h));
 assert.deepEqual(frames.map(g=>g.height),[700,780,844]);
 frames.forEach(g=>close(g.width,Math.min(390,g.height*.84*941/1672),'scene-proportional width'));
 for(const g of frames){close(g.imageWidth/g.height,941/1672*.84,'artwork ratio across chrome transitions');close((.92*g.height-.2*g.height)/4,.18*g.height,'row height across transitions');}
 const narrow=geometry(320,950);close(narrow.height,704,'extreme tall phone uses bounded frame');close(narrow.top,123,'excess vertical space becomes symmetric letterboxing');
});

test('real text and footer fit the proportional scene without covering the character region',()=>{
 const names=[...js.matchAll(/class="rpg-name">([^<]+)</g)].map(m=>m[1]);
 const lines=[...js.matchAll(/class="rpg-(?:description|detail)">([^<]+)</g)].map(m=>m[1]);assert.equal(names.length,4);
 const em=s=>[...s].reduce((n,c)=>n+(c.codePointAt(0)<128?.5:1),0);
 for(const [vw,vh]of cases){const g=geometry(vw,vh),typeWidth=Math.min(g.width,g.imageWidth),name=g.wide?Math.min(34,Math.max(18,.03*vh)):fontSize('#ccRpgHome .rpg-name',typeWidth),desc=g.wide?Math.min(20,Math.max(11,.0173*vh)):fontSize('#ccRpgHome .rpg-description,#ccRpgHome .rpg-detail',typeWidth),limit=640*g.scale-g.crop-(g.wide?Math.min(80,Math.max(24,.05*vw))+20:20);
  names.forEach(s=>assert.ok(em(s)*name<limit,`${vw}x${vh}: ${s} fits left of characters`));lines.forEach(s=>assert.ok(em(s)*desc<limit,`${vw}x${vh}: ${s} fits`));
  const gap=Math.min(10,Math.max(5,(g.wide?.0095*vh:g.width*.02))),pad=Math.min(12,Math.max(6,(g.wide?.0104*vh:g.width*.022)));assert.ok(name*1.3+2*desc*1.5+2*gap+2*pad<=g.height*.84*.18,'copy fits scene row');assert.ok(g.height*.16>=90,'footer contains two route rows and status');
 }
 assert.match(js,/data-rpg-service="daily"/);assert.match(js,/data-rpg-service="cooney"/);assert.match(js,/data-rpg-service="shiire"/);assert.match(js,/data-rpg-route="watches"/);assert.match(js,/data-rpg-route="cards"/);
});

test('responsive styles remain HOME-scoped and do not alter API or auth behavior',()=>{
 assert.doesNotMatch(css,/(?:^|})\s*(?:html|body|input|dialog|\.auth[^,{]*)\s*\{/,'no global reset or auth styling');
 assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*[.(]/,'presentation adds no API/storage/auth calls');
 assert.match(css,/body\.rpg-home-active\{overflow:hidden!important\}/,'scroll lock remains conditional on visible HOME');
 assert.match(css,/#ccRpgHome\[hidden\],#ccRpgLegacyReturn\[hidden\]\{display:none!important\}/,'hidden HOME cannot cover login/legacy routes');
});


test('safe-area model leaves top, bottom and side insets outside the artwork',()=>{
 for(const [vw,vh] of cases){
  const safe={top:24,right:8,bottom:24,left:8},g=geometry(vw,vh,safe);
  assert.ok(g.top>=safe.top&&g.left>=safe.left);
  assert.ok(g.top+g.height<=vh-safe.bottom+1e-7);
  assert.ok(g.left+g.width<=vw-safe.right+1e-7);
  assert.ok(g.crop/g.scale<640,'safe-area clipping does not remove character region');
  close(g.imageWidth/g.height,941/1672*.84,'safe area does not stretch artwork');
 }
});

 test('wide background is scenery-only, full-width and keeps figure art unstretched',()=>{
 assert.match(css,/@media \(min-aspect-ratio:4\/5\) and \(min-height:600px\)/);
 assert.match(css,/background-size:100% 100%,180% auto/);
 assert.ok(artwork.width/1.8<620,'decorative source crop cannot reach the first character');
 for(const [vw,vh]of [[686,644],[834,900],[1280,900],[1440,900]]){
  const g=geometry(vw,vh);assert.equal(g.width,vw);assert.equal(g.left,0);
  assert.ok(g.imageWidth<g.width);assert.equal(g.imageWidth/artwork.width,g.scale);
 }
 });
