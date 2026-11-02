import * as application from './app.js?v=20261102.2-paper';
import {publishingAccounts} from './accounts.js?v=20261102.1-tanaka';
import {mountPaperStage} from './paper-stage.js?v=20261102.2-paper';
// Mount independently of optional illustrations or the old book animation.
try{
 if(getComputedStyle(document.body).getPropertyValue('--paper-ready').trim()!=='1')throw Error('Paper styles unavailable');
 const stage=mountPaperStage({application,accounts:publishingAccounts});
 window.addEventListener('pagehide',event=>{if(!event.persisted)stage.destroy();});
 Object.defineProperty(window,'__paperStage',{configurable:true,value:{snapshot:stage.snapshot}});
}catch(error){console.warn('Paper stage unavailable; existing reader retained.',error);}
