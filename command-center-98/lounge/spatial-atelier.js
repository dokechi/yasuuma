/* The established application boots independently. Spatial presentation is an
   optional enhancement: a failed asset/module never strands saved manuscripts. */
import * as application from './app.js?v=20261101.8-storybook';
const board=application.getAccountBoard();let scene,desk;
try{
 const styles=getComputedStyle(document.body);
 if(styles.getPropertyValue('--spatial-castle-ready').trim()!=='1'||styles.getPropertyValue('--spatial-reader-ready').trim()!=='1')throw new Error('Spatial styles unavailable');
 const [{mountCastleScene},{installSpatialDesk}]=await Promise.all([import('./castle-scene.js?v=20261101.1-living'),import('./spatial-desk.js?v=20261101.8-storybook')]);
 scene=mountCastleScene({accountBoard:board,castleImage:'assets/castle-silhouette-v1.webp',skyImage:'assets/castle-sky-v1.webp'});
 const roomScenes=Object.fromEntries(['insurance','otoku','rakuten','lottery'].map(key=>[key,{url:`./assets/castle-interior-${key}-v1.webp`,position:'center'}]));
 desk=installSpatialDesk({openRoom:key=>scene.open(key),roomScenes});
 document.body.dataset.spatial='ready';
 // Living objects are independently optional. Their failure cannot remove the
 // proven castle or reader, and they never own data requests.
 try{if(getComputedStyle(document.body).getPropertyValue('--living-room-ready').trim()!=='1')throw Error('Room tool styles unavailable');const [{installLivingRoom},{summarizeLivingRooms}]=await Promise.all([import('./living-room.js?v=20261101.1-living'),import('./living-room-model.js?v=20261101.8-storybook')]);const controller=application.getLivingDesk?.();if(!controller?.setSummarizer)throw Error('Living reader adapter unavailable');controller.setSummarizer(summarizeLivingRooms);installLivingRoom({controller,spatialDesk:desk,scene});}catch(error){console.warn('Room tools unavailable; the original reader remains ready.',error);}

}catch(error){
 desk?.destroy();scene?.destroy();document.body.classList.remove('spatial-atelier');document.body.dataset.spatial='fallback';
 board?.render({...board.state,message:'城の表示を読み込めませんでした。通常の持ち場一覧で続けられます。'});
 console.warn('Spatial presentation unavailable; original account view retained.',error);
}

// Optional, isolated presentation experiments may reuse the established owners.
// This does not change the default castle, reader, or their routing contracts.
export const getSpatialPresentation=()=>({board,scene,desk});
