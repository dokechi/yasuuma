import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebook} from '../lounge/notebook.js';
import {postingSteps,postingReadiness,roomForPlace} from '../lounge/qol-model.js';
import {nativeForDraft,placeNames} from '../lounge/desk-model.js';

test('savings drafts keep exact main/reply across reload and remain separate from insurance',()=>{
 const rows=new Map(),storage={get length(){return rows.size},key:i=>[...rows.keys()][i],getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
 const opts={storage,seeds:{kyun:[],choi:[],otoku:[]}};
 const savings={id:'otoku-task:1',place:'otoku',title:'お得な買い方',body:'送料込みの支払額。',posting:{main:'送料込みの支払額。',reply:'買えるのはここ👇\nhttps://example.com/item\n11/10まで・1人1台'},source:{id:'task:1',recordId:'1356',account:'otoku',label:'本文＋返信'}};
 const insurance={id:'insurance-task:2',place:'kyun',title:'経理の原稿',body:'元の原稿',source:{id:'task:2',account:'insurance',label:'本文'}};
 createNotebook(opts).replaceSources([insurance,savings],{complete:true});
 const restored=createNotebook(opts);
 assert.deepEqual(restored.list('otoku').map(d=>d.id),[savings.id]);
 assert.equal(restored.list('kyun')[0].body,insurance.body);
 const draft=restored.get(savings.id),steps=postingSteps(draft);
 assert.deepEqual(steps.map(s=>[s.kind,s.text]),[['body',savings.body],['reply',savings.posting.reply]]);
 restored.copied(draft,'reply',steps[1].text);
 assert.deepEqual(postingSteps(draft,restored.copies()).map(s=>s.copied),[false,true]);
 assert.equal(postingReadiness(draft).label,'本文＋返信（画像なし）');
 assert.equal(roomForPlace.otoku,'purple');
 assert.equal(placeNames.otoku,'まだ安く買えるはず');
 assert.equal(nativeForDraft('otoku',draft).action,'otoku');
});
