'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const loader=require('../app-loader.js'),root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'app-assets.json'),'utf8'));
test('the actual production manifest is accepted by the public entry loader',()=>{
 assert.equal(loader.validateManifest(manifest),manifest);
 assert.ok(manifest.styles.some(x=>x.startsWith('./lounge-feedback.css?')));
 assert.equal(fs.readFileSync(path.join(root,'lounge-feedback.css'),'utf8'),fs.readFileSync(path.join(root,'lounge/interaction-feedback.css'),'utf8'));
 assert.throws(()=>loader.validateManifest({...manifest,styles:[...manifest.styles,'./lounge/interaction-feedback.css?v=broken']}),/Invalid css asset/);
});
test('the public boot path composes all production assets before opening the app',async()=>{
 const calls=[],document={open(){calls.push('open');},write(html){calls.push('write');this.html=html;},close(){calls.push('close');}};
 const fetch=async url=>url===loader.MANIFEST_URL?{ok:true,json:async()=>manifest}:{ok:true,text:async()=>'<head></head><body></body>'};
 assert.equal(await loader.boot({document,fetch}),true);
 assert.deepEqual(calls,['open','write','close']);
 assert.ok(document.html.includes('href="./lounge-feedback.css?v=20261021.5-boot"'));
 assert.ok(document.html.includes('src="./castle-parent.js?v=20261021.4-touch"'));
});
