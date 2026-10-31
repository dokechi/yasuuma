import {mountCastleScene} from './castle-scene.js';
import {installSpatialDesk} from './spatial-desk.js';
const app=await import('./app.js?v=20261031.9-world');
const scene=mountCastleScene({accountBoard:app.getAccountBoard(),castleImage:'assets/castle-silhouette-v1.webp',skyImage:'assets/castle-sky-v1.webp'});
const roomScenes=Object.fromEntries(['insurance','otoku','rakuten','lottery'].map(key=>[key,{url:`./assets/castle-interior-${key}-v1.webp`,position:'center'}]));
installSpatialDesk({openRoom:key=>scene.open(key),roomScenes});
