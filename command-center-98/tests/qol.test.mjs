import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebook} from '../lounge/notebook.js';
import {revision,seenRevision,unreadGroups,postingSteps,currentPosted,resumeView} from '../lounge/qol-model.js';
const draft={id:'one',place:'kyun',title:'同じ題名',body:'本文\n「そのまま」',kind:'本文',link:'https://example.com/a',source:{account:'kyun',id:'original'}};
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('unread counts original records, preserves variants and ignores fetch timestamps',()=>{
 const variant={...draft,id:'variant',kind:'短文',body:'別の本文'},other={...draft,id:'two',source:{...draft.source,id:'other'}};
 assert.equal(unreadGroups([draft,variant,other]),2);
 const seen={[draft.id]:seenRevision(draft),[variant.id]:seenRevision(variant)};
 assert.equal(unreadGroups([draft,variant,other],seen),1);
 assert.equal(unreadGroups([{...draft,updatedAt:99}],seen),0);
 assert.equal(unreadGroups([{...draft,body:'新しい本文'}],seen),1);
 assert.equal(unreadGroups([{...draft,source:{...draft.source,id:'different'}}],seen),1);
});
test('copy steps require the exact variant and literal text; copying never marks posted',()=>{
 const copies=[{draftId:'other',kind:'body',text:draft.body},{draftId:draft.id,kind:'body',text:'別の本文'}];
 assert.deepEqual(postingSteps(draft,copies).map(s=>s.copied),[false,false]);
 copies.push({draftId:draft.id,kind:'body',text:draft.body},{draftId:draft.id,kind:'link',text:draft.link});
 assert.deepEqual(postingSteps(draft,copies).map(s=>s.copied),[true,true]);assert.equal(currentPosted(draft,null),false);
 const posted={revision:revision(draft),time:1};assert.equal(currentPosted(draft,posted),true);
 assert.equal(currentPosted({...draft,body:draft.body+'更新'},posted),false);
 assert.equal(currentPosted({...draft,link:'https://example.com/new'},posted),false);
});
test('resume filters, exact reading position, tray snapshots and manual completion survive reload',()=>{
 const disk=storage(),options={seeds:{kyun:[],choi:[],fp:[],shiire:[]},storage:disk};let n=createNotebook(options);n.replaceSources([draft]);
 n.remember('kyun',draft.id,321);n.setPref('view:kyun',{query:'そのまま',filter:'pin'});
 n.changePref('laterItems',{one:{draft,memo:'夜に価格を確認',time:1}});n.changePref('posted:one',{revision:revision(draft),time:2});n=createNotebook(options);
 assert.equal(n.position('one'),321);assert.equal(n.selected('kyun'),'one');assert.deepEqual(resumeView(n.pref('view:kyun')), {query:'そのまま',filter:'pin'});
 n.replaceSources([],{complete:true});assert.equal(n.pref('laterItems').one.draft.body,draft.body);assert.equal(n.pref('laterItems').one.memo,'夜に価格を確認');
 assert.equal(currentPosted(draft,n.pref('posted:one')),true);
 n.changePref('laterItems',{});n.undo();assert.equal(n.pref('laterItems').one.memo,'夜に価格を確認');
});
