import assert from 'node:assert/strict';
import fs from 'node:fs';
const path = process.argv[2] || new URL('../command-center-98/lounge/storybook-art.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8');
const art = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
class El {
  constructor(tag) { this.tag=tag;this.style={setProperty:(k,v)=>{this.style[k]=v}};this.dataset={};this.children=[];this.attributes={};this.events={};this.classList={add:()=>{}}; }
  setAttribute(k,v) {this.attributes[k]=v;} append(e) {this.children.push(e);} replaceChildren() {this.children=[];}
  addEventListener(type,handler,options) {this.events[type]={handler,options};}
}
const document={createElement:t=>new El(t),createElementNS:(_,t)=>new El(t)};
const report=[];
assert.deepEqual(art.STORYBOOK_ART_ROOMS,['insurance','otoku','rakuten','lottery','sourcing']);
for (const key of art.STORYBOOK_ART_ROOMS) for (const [layout,aspect] of [['legacy',4/3],['spread',2],['page',1/1.05]]) {
  const root=art.buildStorybookArt({document,key,layout,actorURL:`assets/storybook-${key}-actor-v1.webp`});
  const sceneryOnly=art.buildStorybookArt({document,key,layout});
  assert.equal(root.children.length,key==='insurance'?6:5);
  assert.equal(root.dataset.storyRoom,key);assert.equal(root.dataset.storyLayout,layout);assert.equal(Number(root.dataset.storyAspect),aspect);
  assert.equal(root.attributes['aria-hidden'],'true');
  assert.equal(root.children.some(p=>p.dataset.prop==='room-fold'),key==='insurance'&&layout==='legacy');
  for (const axis of ['X','Y','W','H']) assert.equal(root.dataset['storyActor'+axis],sceneryOnly.dataset['storyActor'+axis],'actor:false receives same real position');
  for (const p of root.children) {
    assert.equal(p.style.transformOrigin,'center bottom');assert.equal(p.style.rotate,undefined,'no duplicate rotation');
    for (const node of p.children) if(node.tag==='svg') {
      assert(['xMidYMax meet','xMidYMid meet'].includes(node.attributes.preserveAspectRatio));
      assert(!/\bid\s*=|href\s*=|<filter|<text|<image/i.test(node.innerHTML));
      assert(!/undefined|NaN/.test(node.innerHTML));
    }
  }
  const actor=root.children.find(p=>p.dataset.prop==='adviser-and-desk');
  const img=actor.children.find(p=>p.tag==='img');
  assert.equal(img.dataset.storyActor,key);
  ['X','Y','W','H'].forEach(axis=>assert.equal(parseFloat(actor.style['--'+axis.toLowerCase()]),Number(root.dataset['storyActor'+axis])));
  const bbox=art.STORYBOOK_ACTOR_BOUNDS[key];
  for(const [width,height] of [[1200,460],[712,240],[342,400],[290,320]]) {
    const W=Math.min(width,height*aspect),H=W/aspect,n=k=>parseFloat(actor.style[k])/100;
    const bw=W*n('--w'),bh=H*n('--h'),scale=Math.min(bw/1536,bh/1024);
    const x=W*n('--x')+(bw-1536*scale)/2,y=H*n('--y')+(bh-1024*scale)/2;
    const painted=[x+bbox[0]*scale,y+bbox[1]*scale,x+bbox[2]*scale,y+bbox[3]*scale];
    assert(painted[0]>=0&&painted[1]>=0&&painted[2]<=W&&painted[3]<=H,`${key}/${layout} body crop: ${painted}`);
    report.push({key,layout,host:[width,height],stage:[W,H],visibleActorBounds:painted.map(v=>+v.toFixed(3))});
  }
  assert.equal(img.events.error.options.once,true);
  img.events.error.handler();assert.equal(img.hidden,true);assert.equal(actor.hidden,true);assert.equal(root.dataset.artState,'fallback');
  assert(root.children.filter(p=>p!==actor).every(p=>p.hidden!==true),'image fault must not hide native scenery');
}
assert.equal(art.buildStorybookArt({document,key:'unknown'}),null);
assert.throws(()=>art.buildStorybookArt({document,key:'insurance',layout:'unknown'}),RangeError);
const a=art.buildStorybookArt({document,key:'insurance'}),b=art.buildStorybookArt({document,key:'insurance'});
assert.notEqual(a,b);assert.notEqual(a.children[0],b.children[0]);assert.equal(a.dataset.storyLayout,'legacy');
console.log(JSON.stringify({passed:true,scope:'pure DOM/box/fault contract, not actual browser visual acceptance',rooms:5,layouts:3,actorBoundsChecks:report.length,report},null,2));
