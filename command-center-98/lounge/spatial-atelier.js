/* The established application boots independently. Spatial presentation is an
   optional enhancement: a failed asset/module never strands saved manuscripts. */
import {getAccountBoard} from './app.js?v=20261031.10-spatial';
const board=getAccountBoard();let scene,desk;
try{
 const styles=getComputedStyle(document.body);
 if(styles.getPropertyValue('--spatial-castle-ready').trim()!=='1'||styles.getPropertyValue('--spatial-reader-ready').trim()!=='1')throw new Error('Spatial styles unavailable');
 const [{mountCastleScene},{installSpatialDesk}]=await Promise.all([import('./castle-scene.js?v=20261031.10-spatial'),import('./spatial-desk.js?v=20261031.10-spatial')]);
 scene=mountCastleScene({accountBoard:board,castleImage:'assets/castle-silhouette-v1.webp',skyImage:'assets/castle-sky-v1.webp'});
 const roomScenes=Object.fromEntries(['insurance','otoku','rakuten','lottery'].map(key=>[key,{url:`./assets/castle-interior-${key}-v1.webp`,position:'center'}]));
 desk=installSpatialDesk({openRoom:key=>scene.open(key),roomScenes});
 document.body.dataset.spatial='ready';
}catch(error){
 desk?.destroy();scene?.destroy();document.body.classList.remove('spatial-atelier');document.body.dataset.spatial='fallback';
 board?.render({...board.state,message:'城の表示を読み込めませんでした。通常の持ち場一覧で続けられます。'});
 console.warn('Spatial presentation unavailable; original account view retained.',error);
}
