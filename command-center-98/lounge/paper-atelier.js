import * as application from './app.js?v=20261113.1-owners';
import {publishingAccounts} from './accounts.js?v=20261112.2-skun';
import {mountPaperStage} from './paper-stage.js?v=20261113.1-focus';
// Mount independently of optional illustrations or the old book animation.
try{
 if(getComputedStyle(document.body).getPropertyValue('--paper-ready').trim()!=='1')throw Error('Paper styles unavailable');
 const stage=new URLSearchParams(location.search).get('presentation')==='book'?null:mountPaperStage({application,accounts:publishingAccounts});
 if(stage){
 window.addEventListener('pagehide',event=>{if(!event.persisted)stage.destroy();});
 Object.defineProperty(window,'__paperStage',{configurable:true,value:{snapshot:stage.snapshot}});
 }
}catch(error){console.warn('Paper stage unavailable; existing reader retained.',error);}
