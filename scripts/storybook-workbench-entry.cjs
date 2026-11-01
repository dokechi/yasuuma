'use strict';
/* Browser-fixture navigation only. The current default is a live working page;
 * overview/archive cases opt in through its ordinary, visible menu. No private
 * owner calls, forced clicks, class changes or alternate application entry. */
const assert=require('node:assert/strict');
async function working(frame){
 await frame.locator('body').waitFor({state:'attached'});
 const active=await frame.locator('body.storybook-workbench').count()>0;
 if(active)await frame.locator('body[data-workbook-ready=true]').waitFor({state:'attached'});
 return active;
}
async function menuAction(frame,name){
 const menu=frame.locator('.workbook-menu');
 await frame.locator('.workbook-header').waitFor({state:'visible'});
 // A disclosed work drawer may overlap the menu. Escape closes only that
 // disclosure before opening the ordinary menu, without touching the reader.
 if(await frame.locator('.spatial-work[open]').count())await menu.locator('summary').press('Escape');
 if(!await menu.evaluate(node=>node.open))await menu.locator('summary').click();
 const action=menu.getByRole('button',{name,exact:true});
 assert.equal(await action.isVisible(),true,'workbench menu action is visibly reachable: '+name);
 await action.click();
}
async function openStorybookOverview(frame){
 if(await working(frame)){
  if(!await frame.locator('#room').evaluate(node=>node.hidden))await menuAction(frame,'本の全景');
 }else if(await frame.locator('#room').isVisible())await frame.locator('#back').click();
 await frame.locator('.account-board:not([hidden])').waitFor();
}
async function openReaderWork(frame){
 if(await frame.locator('.spatial-work').evaluate(node=>node.open))return;
 if(await working(frame))await menuAction(frame,'作業・読取状況');
 else await frame.locator('.spatial-work>summary').click();
 await frame.locator('.spatial-work[open]').waitFor();
}
async function closeReaderWork(page,frame){
 if(await frame.locator('.spatial-work').evaluate(node=>node.open)){
  if(await working(frame))await page.keyboard.press('Escape');
  else await frame.locator('.spatial-work>summary').click();
 }
 assert.equal(await frame.locator('.spatial-work').evaluate(node=>node.open),false);
}
async function toggleLivingTools(frame){
 const selector=await working(frame)?'[data-working-tools]':'.living-toggle';
 await frame.locator(selector).click();
}
module.exports={openStorybookOverview,openReaderWork,closeReaderWork,toggleLivingTools};
