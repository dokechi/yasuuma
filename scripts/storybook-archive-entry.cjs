'use strict';
/* Compatibility tests reach archived components through the real visible UI.
 * This helper never changes iframe src, application classes, source records,
 * controller imports, request outcomes, or any component acceptance threshold.
 */
const assert=require('node:assert/strict');
const {openStorybookOverview}=require('./storybook-workbench-entry.cjs');
const heavyPath=/\/arrival-(?:entry|atelier|renderer|camera)\.js$|\/vendor\/three-r187\/|\/arrival-court-v1\.glb$/;
async function openStorybookArchive(page,origin,{check}={}){
 const requests=[];
 const observe=request=>{const url=new URL(request.url());if(heavyPath.test(url.pathname))requests.push(url.href);};
 const verify=(name,pass,detail)=>{check?.(name,!!pass,detail);assert.ok(pass,name+(detail===undefined?'':': '+JSON.stringify(detail)));};
 let element=null;
 page.on('request',observe);
 try{
  await page.goto(origin+'/command-center-98/app-v130.html');
  await page.waitForFunction(()=>window.CCCastle?.unified&&!document.getElementById('ccCastleFrame').hidden);
  const f=page.frameLocator('#ccCastleFrame');
  await openStorybookOverview(f);await f.locator('.storybook[data-ready=true]').waitFor({state:'visible'});
  const frame=page.frames().find(value=>new URL(value.url()).pathname==='/command-center-98/lounge/index.html');
  verify('compatibility entry begins at the actual default storybook index',!!frame&&!new URL(frame.url()).searchParams.has('experience'),frame?.url());
  await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const noCourt=await frame.evaluate(()=>!window.__arrivalCourt&&!document.querySelector('.arrival-court'));
  verify('new default loads no archived 3D entry, renderer, model or vendor before explicit archive selection',noCourt&&requests.length===0,[...requests]);
  element=await page.locator('#ccCastleFrame').elementHandle();
  const settings=f.locator('.story-utilities').getByRole('button',{name:'設定',exact:true});
  verify('archive is reached from a visible real settings control',await settings.isVisible());
  await settings.click();await f.locator('#settings[open]').waitFor({state:'visible'});
  const link=f.locator('#settings').getByRole('link',{name:'以前の城の表示を開く',exact:true});
  const href=await link.getAttribute('href'),destination=href&&new URL(href,frame.url());
  verify('visible archive link names the same-origin retained display',await link.isVisible()&&destination?.origin===origin&&destination.pathname==='/command-center-98/lounge/archive.html',destination?.href);
  verify('opening default settings still does not prepare archived 3D graphics',requests.length===0&&await frame.evaluate(()=>!window.__arrivalCourt&&!document.querySelector('.arrival-court')),[...requests]);
  // Stop the default-only observer immediately before the explicit user action.
  // The archived page may now legitimately prepare its own tiny optional entry.
  page.off('request',observe);
  await Promise.all([frame.waitForURL(url=>url.pathname==='/command-center-98/lounge/archive.html'),link.click()]);
  const archived=page.frames().find(value=>new URL(value.url()).pathname==='/command-center-98/lounge/archive.html');
  const sameElement=await element.evaluate(node=>node.isConnected&&node===document.getElementById('ccCastleFrame'));
  verify('explicit archive navigation preserves the one real host iframe',archived===frame&&sameElement&&await page.locator('#ccCastleFrame').count()===1,{url:archived?.url(),sameElement});
  await f.locator('.account-board').waitFor({state:'attached'});
  return {frame:archived,f,defaultURL:new URL('/command-center-98/lounge/index.html',origin).href,archiveURL:archived.url()};
 }finally{page.off('request',observe);await element?.dispose();}
}
module.exports={openStorybookArchive};
