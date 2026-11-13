const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../command-center-98/v160-card-publishing.js'),'utf8');
function setup(responses){let calls=0;const notices=[],panel={dataset:{},hidden:true,innerHTML:'',textContent:''},button={disabled:false,textContent:'履歴を見る',attributes:{},setAttribute(k,v){this.attributes[k]=v}};
 const X={api:'https://synthetic.invalid',state:{items:[]},historyId:()=>'',copyMeta:()=>({}),copyDate:()=> 'synthetic date'};
 const ctx={X,by:()=>panel,fetch:async()=>{const body=responses[calls++];if(body instanceof Error)throw body;return {ok:true,status:200,json:async()=>body}},authHeaders:()=>({}),toast:(message,kind)=>notices.push({message,kind}),h:s=>String(s),stageLabels:{}};
 vm.runInNewContext(source.slice(source.indexOf('  X.history=async'),source.indexOf('  X.eventId=')),ctx);return {X,panel,button,notices,calls:()=>calls,load:()=>X.history('synthetic','x',button)};
}
for(const malformed of [{ok:true},{ok:true,history:null},{ok:true,history:{}},{ok:true,history:'[]'}])test('unconfirmed history is not cached as empty: '+JSON.stringify(malformed),async()=>{
 const h=setup([malformed,{ok:true,history:[]}]);await h.load();assert.notEqual(h.panel.dataset.loaded,'true');assert.equal(h.panel.hidden,false);assert.match(h.panel.textContent,/未確認/);assert.equal(h.button.textContent,'履歴を再読込');assert.equal(h.button.disabled,false);assert.doesNotMatch(h.panel.innerHTML,/履歴はありません/);
 await h.load();assert.equal(h.calls(),2);assert.equal(h.panel.dataset.loaded,'true');assert.match(h.panel.innerHTML,/履歴はありません/);
});
test('valid empty history is cached and may be collapsed without refetch',async()=>{const h=setup([{ok:true,history:[]}]);await h.load();assert.equal(h.panel.dataset.loaded,'true');assert.match(h.panel.innerHTML,/履歴はありません/);await h.load();assert.equal(h.calls(),1);assert.equal(h.panel.hidden,true)});
test('network failure remains visible and retryable, then actual history is shown',async()=>{const h=setup([Error('offline'),{ok:true,history:[{platform:'x',textSnapshot:'saved text'}]}]);await h.load();assert.match(h.panel.textContent,/未確認/);assert.notEqual(h.panel.dataset.loaded,'true');await h.load();assert.match(h.panel.innerHTML,/saved text/);assert.equal(h.panel.dataset.loaded,'true');assert.equal(h.calls(),2)});
