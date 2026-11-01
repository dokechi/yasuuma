import assert from 'node:assert/strict';
import fs from 'node:fs';
const path = process.argv[2] || new URL('../command-center-98/lounge/storybook-art.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8');
const art = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
class El {
  constructor(tag) { this.tag = tag; this.style = {setProperty: (k,v) => {this.style[k]=v}}; this.dataset={}; this.children=[]; this.attributes={}; }
  setAttribute(k,v) {this.attributes[k]=v;} append(e) {this.children.push(e);} replaceChildren() {this.children=[];}
}
const document={createElement:t=>new El(t),createElementNS:(_,t)=>new El(t)};
const bbox=[611,49,1529,1001];
const report=[];
for (const [layout,aspect,count] of [['legacy',4/3,6],['spread',2,5],['page',1/1.05,5]]) {
  const root=art.buildStorybookArt({document,key:'insurance',layout,actorURL:'assets/storybook-insurance-actor-v1.webp'});
  assert.equal(root.children.length,count); assert.equal(root.dataset.storyLayout,layout); assert.equal(Number(root.dataset.storyAspect),aspect);
  assert.equal(root.attributes['aria-hidden'],'true');
  assert.equal(root.children.some(p=>p.dataset.prop==='room-fold'),layout==='legacy');
  for (const p of root.children) {
    assert.equal(p.style.transformOrigin,'center bottom');
    assert.equal(p.style.rotate,undefined,'no duplicate independent and transform rotation');
    for (const node of p.children) if(node.tag==='svg') {
      assert.equal(node.attributes.preserveAspectRatio,'xMidYMax meet');
      assert(!/\bid\s*=|href\s*=|<filter|<text|<image/i.test(node.innerHTML));
    }
  }
  const actor=root.children.find(p=>p.dataset.prop==='adviser-and-desk');
  for(const [width,height] of [[1200,460],[712,240],[342,400],[290,320]]) {
    const W=Math.min(width,height*aspect),H=W/aspect;
    const n=k=>parseFloat(actor.style[k])/100;
    const bw=W*n('--w'),bh=H*n('--h'); const scale=Math.min(bw/1536,bh/1024);
    const x=W*n('--x')+(bw-1536*scale)/2,y=H*n('--y')+(bh-1024*scale)/2;
    const painted=[x+bbox[0]*scale,y+bbox[1]*scale,x+bbox[2]*scale,y+bbox[3]*scale];
    assert(painted[0]>=0&&painted[1]>=0&&painted[2]<=W&&painted[3]<=H,`${layout} body crop: ${painted}`);
    report.push({layout,host:[width,height],stage:[W,H],visibleActorBounds:painted.map(v=>+v.toFixed(3))});
  }
}
assert.equal(art.buildStorybookArt({document,key:'otoku'}),null);
assert.throws(()=>art.buildStorybookArt({document,key:'insurance',layout:'unknown'}),RangeError);
const a=art.buildStorybookArt({document,key:'insurance'}),b=art.buildStorybookArt({document,key:'insurance'});
assert.notEqual(a,b); assert.notEqual(a.children[0],b.children[0]); assert.equal(a.dataset.storyLayout,'legacy');
console.log(JSON.stringify({passed:true,scope:'pure DOM/box contract, not actual browser visual acceptance',layouts:3,actorBoundsChecks:report.length,report},null,2));
