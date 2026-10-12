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
const page=rule('#ccRpgHome');
const compact=value=>value.replace(/\s+/g,'');
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
const cases=[[360,780],[390,844],[412,915],[320,950],[980,980],[1440,900],[390,700],[390,780]];
function geometry(vw,vh,{top=0,right=0,bottom=0,left=0}={}){
 const innerWidth=vw-left-right,innerHeight=vh-top-bottom;
 const height=Math.min(innerHeight,2.2*vw),width=Math.min(innerWidth,height*artwork.width/artwork.height);
 const scale=height/artwork.height,imageWidth=artwork.width*scale;
 return {width,height,scale,imageWidth,left:left+(innerWidth-width)/2,top:top+(innerHeight-height)/2,crop:imageWidth-width};
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
 assert.equal(compact(world.width),'min(100%,calc(var(--rpg-frame-h)*941/1672))');
 assert.equal(world.height,'var(--rpg-frame-h)');
 assert.ok(!world['min-height']||world['min-height']==='0');
 assert.equal(world['container-type'],'inline-size');
 assert.equal(page['align-items'],'center');assert.equal(page['justify-content'],'center');
 assert.ok(['auto','hidden'].includes(page.overflow));
 assert.equal(world.padding,'0');
 assert.equal(compact(rule('#ccRpgHome .rpg-portal:first-child:after').top),'calc(var(--rpg-frame-h)*-.01)');
 assert.equal(page.padding,'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)');
 assert.equal(world['grid-template-rows'],'20% 72% 8%');
 assert.equal(rule('#ccRpgHome .rpg-portals')['grid-template-rows'],'repeat(4,minmax(0,1fr))');
 for(const override of [...css.matchAll(/#ccRpgHome \.rpg-world\s*\{([^}]+)\}/g)].slice(1)){
  assert.doesNotMatch(override[1],/(?:^|;)\s*(?:width|height|max-width|max-height|min-width|min-height|padding|background-size|background-position|grid-template-rows|--rpg-frame-h)\s*:/,'media rules cannot silently override modeled geometry');
 }
 assert.equal(compact(world['background-size']),'100%100%,auto100%');
 assert.match(world['background-position'],/right center/);
 assert.equal(world['background-repeat'],'no-repeat');
 assert.doesNotMatch(css,/max-width\s*:\s*(?:720px|min\(760px)|min-height\s*:\s*(?:540|620)px/);
});

for(const [vw,vh] of cases){
 test(`geometry model ${vw}x${vh}: fits viewport, no artwork stretch, right characters retained, row fractions fixed`,()=>{
  const g=geometry(vw,vh);
  assert.ok(g.width<=vw&&g.height<=vh,'frame cannot produce page scroll');
  assert.ok(g.left>=0&&g.top>=0,'centered frame stays inside viewport');
  close(g.imageWidth/artwork.width,g.height/artwork.height,'equal artwork X/Y scale');
  assert.ok(g.crop>=-1e-7,'artwork is never narrower than the frame');
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
 assert.deepEqual(frames.map(g=>g.width),[390,390,390]);
 for(const g of frames){close(g.imageWidth/g.height,941/1672,'artwork ratio across chrome transitions');close((.92*g.height-.2*g.height)/4,.18*g.height,'row height across transitions');}
 const narrow=geometry(320,950);close(narrow.height,704,'extreme tall phone uses bounded frame');close(narrow.top,123,'excess vertical space becomes symmetric letterboxing');
});

test('copy scales with frame width rather than desktop viewport; conservative text widths fit',()=>{
 const names=[...js.matchAll(/class="rpg-name">([^<]+)</g)].map(m=>m[1]);
 const states=[...js.matchAll(/class="rpg-state">([^<]+)</g)].map(m=>m[1]);
 const lines=[...js.matchAll(/class="rpg-(?:description|detail)">([^<]*(?:<br>[^<]*)?)</g)].flatMap(m=>m[1].split('<br>'));
 assert.equal(names.length,4);assert.equal(states.length,4);assert.ok(lines.length>=6);
 for(const [vw,vh] of cases){
  const g=geometry(vw,vh),{width}=g;
  const name=fontSize('#ccRpgHome .rpg-name',width),state=fontSize('#ccRpgHome .rpg-state',width);
  const desc=fontSize('#ccRpgHome .rpg-description,#ccRpgHome .rpg-detail',width);
  assert.ok(name>=18&&name<=36&&desc>=13&&desc<=25&&state>=10&&state<=17,'readable bounded type sizes');
  // Conservative: reserve 72px for combined horizontal gutters; count Latin as
  // full em too, although bundled DotGothic16 uses half-em ASCII advances.
  const available=width-72;
  names.forEach((s,i)=>assert.ok([...s].length*name*1.035+[...states[i]].length*state+9<=available,`${vw}x${vh}: heading ${s} fits conservative full-em width`));
  lines.forEach(s=>assert.ok([...s].length*desc<=available,`${vw}x${vh}: line ${s} fits`));
  // DotGothic16's bundled hmtx gives ASCII 0.5em and Japanese 1em.
  // The explicit region is source x=640..885, not an inferred opaque-pixel mask.
  const textLimit=640*g.scale-g.crop-20;
  const em=s=>[...s].reduce((sum,c)=>sum+(c.codePointAt(0)<128?.5:1),0);
  names.forEach((s,i)=>assert.ok(em(s)*name+[...s].length*name*.035+em(states[i])*state+9<textLimit,`${vw}x${vh}: heading does not overlap specified character region`));
  lines.forEach(s=>assert.ok(em(s)*desc<textLimit,`${vw}x${vh}: description does not overlap specified character region`));
  const gap=Math.min(10,Math.max(5,width*.02)),pad=Math.min(12,Math.max(6,width*.022));
  assert.ok(name*1.3+2*desc*1.5+2*gap+2*pad<=g.height*.18,'three-line copy plus padding fits row height');
 }
 const shortDesktop=geometry(1440,900),square=geometry(980,980);
 assert.ok(fontSize('#ccRpgHome .rpg-name',shortDesktop.width)<=fontSize('#ccRpgHome .rpg-name',square.width),'wider desktop must not inflate text on a shorter frame');
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
  close(g.imageWidth/g.height,941/1672,'safe area does not stretch artwork');
 }
});
