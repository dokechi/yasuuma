'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const css=read('rpg-theme.css'),manifest=JSON.parse(read('app-assets.json'));
test('shared theme loads once after legacy cascade and entry pages only add presentation',()=>{
 assert.equal(manifest.styles.filter(x=>x.startsWith('./rpg-theme.css?')).length,1);
 assert.ok(manifest.styles.indexOf(manifest.styles.find(x=>x.startsWith('./rpg-theme.css?')))>manifest.styles.indexOf(manifest.styles.find(x=>x.startsWith('./rpg-home.css?'))));
 for(const page of ['app.html','index.html','app-v130.html']){
  const html=read(page);assert.match(html,/<body class="cc-rpg-theme">/);
  if(page!=='app.html')assert.match(html,/href="\.\/rpg-theme\.css\?v=/);
 }
 assert(!manifest.scripts.some(x=>x.includes('rpg-theme')),'Theme introduces no new runtime behavior');
});
test('dark theme is scoped away from approved RPG illustration and does not override functional visibility',()=>{
 assert(!/#ccRpgHome\s*\{/.test(css));assert(!/\.rpg-world\s*\{/.test(css));
 assert(!/display\s*:\s*(?:none|block|flex|grid)/.test(css));
 assert(!/visibility\s*:\s*(?:hidden|visible)/.test(css));
 assert(!/url\([^)]*world\.png/.test(css),'Do not tile background artwork in every dialog');
 assert(css.includes('prefers-reduced-motion:reduce'));
 assert(css.includes('background-image:none!important'),'Remove legacy checkerboard button texture');
});
test('only modal backdrops and toast root gain stacking above the legacy menu',()=>{
 const stacking=[...css.matchAll(/([^{}]+)\{([^{}]*z-index\s*:[^{}]*)\}/g)].map(m=>[m[1].trim(),m[2].trim()]);
 assert.deepEqual(stacking,[
  ['body.cc-rpg-theme :is(.modal-backdrop,.fp-draft-modal)','z-index:400!important'],
  ['body.cc-rpg-theme .toast-wrap','z-index:450!important']
 ]);
 assert.match(read('v225-menu-layer-fix.css'),/z-index:330!important/);
 assert.match(read('rpg-home.css'),/#ccRpgHome\{[^}]*z-index:100/);
});
test('all dialog families, controls, feedback, and ledger wrappers are covered',()=>{
 for(const selector of ['.manual-operation-review','.task-window','.dialog-window','.purchase-drill-window','.reddit-editor-window','.x-editor','.fp-draft-dialog','.affiliate-preview','.cce-dialog','#nekoCopyDialog','.retro-menu','.toast','.home-empty-row','.reddit-editor-error','.loading-line','.supplier-table-wrap','.trade-table-wrap','.mercari-history-scroll','.fp-finished-panel','.request-result'])assert(css.includes(selector),selector);
 assert(css.includes('dialog::backdrop'));assert(css.includes(':focus-visible'));assert(css.includes(':disabled'));assert(css.includes('input[type=checkbox]'));assert(css.includes('appearance:auto'));
});
function lum(hex){const a=hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
function contrast(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('declared reading, input, muted, selected, and feedback colors have readable contrast',()=>{
 for(const [fg,bg,label]of [['eee8da','202633','body'],['b6b8bc','202633','muted'],['e2c68c','293141','heading'],['f4eddc','151c28','input'],['171c26','d6bd88','selected'],['ffb8ac','3a252a','error'],['f1d293','383027','warning'],['a9ddba','23392f','success']])assert(contrast(fg,bg)>=4.5,label+' '+contrast(fg,bg));
});
