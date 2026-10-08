'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function run(){
 const source=fs.readFileSync(path.join(__dirname,'../command-center-98/fp-finished-images.js'),'utf8');
 const start=source.indexOf(' const cardStates='),end=source.indexOf(' function attachCards',start);assert.ok(start>=0&&end>start);
 const block=source.slice(start,end),id='task:6aa9ee1043388191a2eac3bb2702092a:test';
 async function scenario(fail,changeCopy){
  let release,reject;const pending=new Promise((res,rej)=>{release=res;reject=rej;});
  const label={textContent:''},detail={textContent:''},card={dataset:{fpDraftActions:id},querySelector:s=>s.endsWith(' b')?label:detail,closest:()=>null};
  const doc={querySelectorAll:()=>[card]},app={items:[{id,payload:{rev:1}}]},api={shortStatus:s=>s,status:s=>s};
  const f=new Function('doc','app','api','request',block+';return {readCard,recordCardState};')(doc,app,api,()=>pending);
  const reading=f.readCard(card);
  if(changeCopy){app.items[0].payload.rev=2;label.textContent='new copy';}
  else f.recordCardState(id,{status:'confirmed_manual'});
  if(fail)reject(new Error('old failure'));else release({status:'missing'});await reading;
  assert.equal(label.textContent,changeCopy?'new copy':'confirmed_manual');
 }
 await scenario(false,false);await scenario(true,false);await scenario(false,true);
 const media={exports:{}};new Function('module',fs.readFileSync(path.join(__dirname,'../command-center-98/manual-operation-hub.js'),'utf8'))(media);
 assert.equal(media.exports.accounts.length,4);
 assert.equal(media.exports.matchesAccount({payload:{caption:'FP原稿'}},'tiktok'),false);
 assert.equal(media.exports.matchesAccount({payload:{account_name:'キュン拾い',caption:'品質がよい'}},'kyun'),true);
 assert.equal(media.exports.matchesAccount({payload:{account_name:'ちょい上等',caption:'かわいい'}},'choi'),true);
 assert.equal(media.exports.matchesAccount({payload:{caption:'ユニセックス'}},'kyun'),false);
 console.log('PASS: stale success/failure/copy responses and explicit media matching');
}
run().catch(e=>{console.error(e);process.exitCode=1});
