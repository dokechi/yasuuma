/* Presentation only. Reuse the gallery's exact frame, plinth and foot plane. */
(()=>{const d=document;if(d.getElementById('nativeSourcingGlass'))return;
const aside=d.createElement('aside');aside.id='nativeSourcingGlass';aside.setAttribute('aria-hidden','true');aside.inert=true;d.body.append(aside);
Promise.all([import('./lounge/stained-art.js?v=20261110.3-silver-architecture'),import('./lounge/stained-model.js?v=20261110.2-everyday-glass')]).then(([{createGlassArt},{glassFor}])=>{
 const label=d.createElement('span');label.textContent='仕入';aside.replaceChildren(createGlassArt(glassFor('sourcing'),'./lounge/'),label);
}).catch(()=>{aside.hidden=true;});})();
