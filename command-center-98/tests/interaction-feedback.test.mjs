import test from 'node:test';
import assert from 'node:assert/strict';
import {createInteractionFeedback} from '../lounge/interaction-feedback.js';

function boot({selectors=[],disabled=false,reduced=false}={}){
 const handlers={},windowHandlers={},classes=new Set(),sounds=[];
 const el={disabled,dataset:{room:'silver'},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},getAttribute:()=>null,matches:s=>s.split(',').some(x=>selectors.includes(x.trim())),closest:()=>el,contains:n=>n===el};
 let enabled=true;
 const doc={hidden:false,getElementById:()=>null,addEventListener:(type,fn)=>handlers[type]=fn},win={addEventListener:(type,fn)=>windowHandlers[type]=fn};
 const api=createInteractionFeedback({doc,win,reduced:()=>reduced,active:()=>enabled,play:(...args)=>sounds.push(args)});
 const event=(type,more={})=>handlers[type]({target:el,button:0,pointerId:1,pointerType:'mouse',clientX:10,clientY:10,isTrusted:true,detail:1,...more});
 return {el,classes,sounds,event,api,disable:()=>enabled=false};
}
test('one mouse or keyboard activation produces one material sound, including a forwarded door click',()=>{
 const b=boot({selectors:['.door-touch-target']});
 b.event('pointerdown');b.event('pointerup');b.event('click');b.event('click',{isTrusted:false,detail:0});
 assert.deepEqual(b.sounds,[['door','silver']]);
 b.event('keydown',{key:'Enter',repeat:false});b.event('keydown',{key:'Enter',repeat:true});b.event('click',{detail:0});b.event('keyup');
 assert.deepEqual(b.sounds,[['door','silver'],['door','silver']]);b.api.clear();assert.equal(b.classes.size,0);
});
test('touch scrolling and cancellation never announce a committed tap',()=>{
 const b=boot({selectors:['.manuscript-card']});
 b.event('pointerdown',{pointerType:'touch'});b.event('pointermove',{clientX:40});b.event('pointerup',{pointerType:'touch'});assert.equal(b.sounds.length,0);
 b.event('pointerdown',{pointerType:'touch'});b.event('pointercancel');assert.equal(b.sounds.length,0);assert.equal(b.classes.size,0);
 b.event('pointerdown',{pointerType:'touch'});b.event('pointerup',{pointerType:'touch'});b.event('click');assert.deepEqual(b.sounds,[['paper','silver']]);b.api.clear();
});
test('OFF controls, disabled buttons, and a hidden native surface stay silent; reduced motion keeps no bounce',()=>{
 for(const options of [{selectors:['#sound']},{disabled:true}]){const b=boot(options);b.event('pointerdown');b.event('pointerup');b.event('change');assert.equal(b.sounds.length,0);b.api.clear();}
 const b=boot({reduced:true});b.event('pointerdown');b.event('pointerup');assert.equal(b.classes.has('feedback-release'),false);b.disable();b.event('pointerdown');assert.equal(b.sounds.length,1);b.api.clear();
});
