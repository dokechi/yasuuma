/* Isolated design study. Production index.html never imports this entry. */
import {mountCastleScene} from './castle-scene.js';
import {installSpatialDesk} from './spatial-desk.js';
await import('./app.js?v=20261031.9-world');
mountCastleScene();
installSpatialDesk();
