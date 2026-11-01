/* A bounded visual copy of the native workspace already on screen. No source
   mutation, data lookup, HTML serialization, event handlers, or network calls.
   Any unsupported visible state returns null: canonical Back stays instant. */
const properties = ('display position box-sizing flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self align-content justify-content gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row width height min-width min-height max-width max-height margin padding border border-top border-right border-bottom border-left border-radius border-color border-collapse border-spacing table-layout caption-side vertical-align background-color background-image background-position background-size background-repeat background-origin background-clip background-attachment color opacity font-family font-size font-weight font-style font-variant line-height letter-spacing word-spacing text-align text-indent text-transform text-decoration white-space overflow overflow-x overflow-y overflow-wrap word-break box-shadow text-shadow object-fit object-position filter clip-path mask-image transform translate rotate scale transform-origin top right bottom left z-index isolation list-style-type list-style-position appearance accent-color').split(' ');
const sizedBoxes = new Set(['block','flex','grid','inline-block','inline-flex','inline-grid','flow-root','list-item']);
const svgTags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc']);
const svgAttrs = new Set(['viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','fill','fill-rule','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','opacity','transform','preserveAspectRatio']);
const never = new Set(['SCRIPT','STYLE','LINK','META','TEMPLATE','NOSCRIPT']);
const unsupported = new Set(['IFRAME','CANVAS','VIDEO','AUDIO','OBJECT','EMBED','IMG']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const box = rect => rect && ['left','top','width','height'].every(key => finite(rect[key])) && rect.width >= 0 && rect.height >= 0;
const intersects = (a,b) => a.left+a.width>b.left && a.left<b.left+b.width && a.top+a.height>b.top && a.top<b.top+b.height;

export function captureNativeWorkspace(source, {document: target = source, surface, maxElements = 350, maxText = 24000, maxMilliseconds = 40, presentationImage = null} = {}) {
 const win = source?.defaultView, main = source?.getElementById('mainWindow'), header = source?.getElementById('loungeWorkspaceHeader');
 if (!win || target !== source || !box(surface) || !surface.width || !surface.height || source.hidden || !source.body.classList.contains('lounge-workspace') || main?.dataset.ccView !== 'sourcing' || !main?.isConnected || !header?.isConnected || !main.contains(header) || header.hidden) return null;
 const limit = Math.min(350, Math.max(1, Math.floor(maxElements) || 350)), textLimit = Math.min(24000, Math.max(1, Math.floor(maxText) || 24000)), timeLimit = Math.min(80, Math.max(1, Number(maxMilliseconds) || 40));
 let count = 0, textCount = 0, visited = 0; const started = win.performance.now();
 const budget = text => { if (++visited > 1400 || win.performance.now()-started > timeLimit) throw Error('snapshot-budget'); if (text !== undefined && (textCount += text.length) > textLimit) throw Error('snapshot-text'); };
 const elementBudget = () => { budget(); if (++count > limit) throw Error('snapshot-elements'); };
 const styles = new WeakMap(), styleOf = node => { if (!styles.has(node)) styles.set(node, win.getComputedStyle(node)); return styles.get(node); };
 const activeEditor = node => node && (node.isContentEditable || node.closest?.('[contenteditable]:not([contenteditable="false"])') || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName));
 if (activeEditor(source.activeElement)) return null;
 function visible(node) { const style = styleOf(node); return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'; }
 function assetsOnly(value) {
  for (const match of String(value).matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
   const url = new URL(match[2], source.baseURI), assets = new URL('./lounge/assets/', source.baseURI);
   if (url.origin !== win.location.origin || !url.pathname.startsWith(assets.pathname) || !/\.(webp|png|jpe?g|avif)$/i.test(url.pathname) || !win.performance.getEntriesByName?.(url.href)?.some(entry => entry.responseEnd > 0)) throw Error('snapshot-unloaded-art');
  }
  return value;
 }
 function copyStyle(style, clone) {
  for (const property of properties) { const value = style.getPropertyValue(property); if (value) clone.style.setProperty(property, assetsOnly(value)); }
  clone.style.pointerEvents = 'none'; clone.style.animation = 'none'; clone.style.transition = 'none';
 }
 function transformed(style) {
  return ['transform','translate','rotate','scale'].some(key => { const value=style.getPropertyValue(key); return value && value !== 'none'; }) || !['','normal','1'].includes(style.getPropertyValue('zoom'));
 }
 function exactUsedBox(style, rect, clone) {
  // Computed CSS serializes 276.28125 as 276.281px. Parsing that back can
  // lose one 1/64px layout unit and wrap an otherwise exactly fitting flex row.
  // Keep its measured used box, not an invented nowrap rule or rounded width.
  if (!sizedBoxes.has(style.display)) return;
  const edge = key => { const value=style.getPropertyValue(key); if (!value) return 0; if (!/^-?(?:\d+\.?\d*|\.\d+)px$/.test(value)) throw Error('snapshot-used-box'); return Number.parseFloat(value); };
  for (const [dimension,sides] of [['width',['left','right']],['height',['top','bottom']]]) {
   const inset=style.boxSizing === 'border-box' ? 0 : sides.reduce((sum,side)=>sum+edge('padding-'+side)+edge('border-'+side+'-width'),0);
   const size=rect[dimension]-inset;
   if (!finite(size) || size < 0) throw Error('snapshot-used-box');
   clone.style.setProperty(dimension,size+'px');
  }
 }
 function pseudo(node, which) {
  const style = win.getComputedStyle(node, which), content = style.content;
  if (!content || content === 'none' || content === 'normal' || style.display === 'none' || style.visibility === 'hidden') return null;
  elementBudget(); const clone = target.createElement('span'); copyStyle(style, clone);
  if (content !== '""' && content !== "''") { let text; try { text = JSON.parse(content); } catch { throw Error('snapshot-generated-content'); } if (typeof text !== 'string') throw Error('snapshot-generated-content'); budget(text); clone.textContent = text; }
  return clone;
 }
 function sensitive(node) {
  return /^(password|file|hidden|image)$/i.test(node.type||'') || /password|token|secret|credential|authorization/i.test([node.id,node.name,node.autocomplete].join(' ')) || /(?:^|\s)(?:cc-|one-time-code)/i.test(node.autocomplete||'');
 }
 function staticFilter(node) {
  // These are the existing read-only navigation filters. Native month selection
  // is a button tablist, not an editable date field. Unknown controls may be an
  // unsaved editor even after Back's pointerdown has moved focus elsewhere.
  return node.tagName === 'SELECT' && ['ccStateFilter','ccDomainFilter'].includes(node.id) && node.closest('#ccFilters') && source.getElementById(node.id) === node && !node.multiple;
 }
 function cloneControl(node, clone) {
  if (sensitive(node) || !staticFilter(node)) throw Error('snapshot-editor');
  const selected = node.selectedOptions?.[0]; if (!selected) throw Error('snapshot-selection');
  elementBudget(); const option = target.createElement('option'); budget(selected.textContent); option.textContent = selected.textContent; option.selected = true; clone.append(option);
  clone.disabled = node.disabled; clone.tabIndex = -1;
 }
 function preparedPresentationImage(node) {
  // Explicit opt-in for one already-decoded authored decoration. The ordinary
  // native/archive contract still rejects every IMG. Never clone ledger/media
  // images or discover an arbitrary URL from source content.
  if (!presentationImage || presentationImage.sourceNode !== node || node.tagName !== 'IMG') return null;
  const prepared=presentationImage.preparedImage, stage=node.closest('.story-workspace-art'), art=node.closest('.story-paper-art');
  const expected=new URL('./lounge/assets/storybook-sourcing-actor-v1.webp',source.baseURI).href;
  if (!stage || !header.contains(stage) || !stage.inert || stage.getAttribute('aria-hidden')!=='true' || art?.dataset.storyRoom!=='sourcing' || node.dataset.storyActor!=='sourcing' || stage.querySelectorAll('img').length!==1 || stage.querySelector('img')!==node) return null;
  if (!node.complete || !node.naturalWidth || node.naturalWidth>4096 || !node.naturalHeight || node.naturalHeight>4096 || node.srcset || node.currentSrc&&node.currentSrc!==expected || node.src!==expected) return null;
  if (!prepared || prepared===node || prepared.ownerDocument!==target || prepared.tagName!=='IMG' || prepared.onload || prepared.onerror || prepared.isConnected || prepared.parentNode || !prepared.complete || prepared.naturalWidth!==node.naturalWidth || prepared.naturalHeight!==node.naturalHeight || prepared.srcset || prepared.src!==expected || prepared.currentSrc&&prepared.currentSrc!==expected) return null;
  for(const attr of [...prepared.attributes])if(!['src','decoding'].includes(attr.name))prepared.removeAttribute(attr.name);
  prepared.alt='';prepared.draggable=false;prepared.decoding='sync';return prepared;
 }
 function copy(node, root = false, transformedAncestor = false, atomicButton = false) {
  if (node.nodeType === 3) { budget(node.textContent); return target.createTextNode(node.textContent); }
  if (node.nodeType !== 1) return null;
  const isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
  if (isSvg && !svgTags.has(node.localName)) throw Error('snapshot-svg');
  if (never.has(node.tagName)) return null;
  budget(); const style = styleOf(node); if (node.hidden || style.display === 'none') return null;
  if (!['','normal','1'].includes(style.getPropertyValue('zoom'))) throw Error('snapshot-zoom');
  const rect = node.getBoundingClientRect(); if (!box(rect)) throw Error('snapshot-geometry');
  const transformedBox = transformedAncestor || transformed(style);
  const inView = root || atomicButton || !rect.width || !rect.height || intersects(rect, surface);
  // Invisible subtrees retain their exact layout box, not their unseen records.
  if (!inView || style.visibility === 'hidden' || style.visibility === 'collapse') { elementBudget(); const spacer = target.createElement('div'); copyStyle(style, spacer); spacer.style.visibility = 'hidden'; if (!transformedBox) { spacer.style.boxSizing = 'border-box'; spacer.style.width = rect.width+'px'; spacer.style.height = rect.height+'px'; } if (style.display === 'inline') throw Error('snapshot-inline-layout'); return spacer; }
  const presentationCopy=node.tagName==='IMG'?preparedPresentationImage(node):null;
  if (unsupported.has(node.tagName) && !presentationCopy || node.shadowRoot || node.hasAttribute('contenteditable') && node.getAttribute('contenteditable') !== 'false' || !root && ['fixed','sticky'].includes(style.position)) throw Error('snapshot-unsupported');
  elementBudget(); const clone = presentationCopy || (isSvg ? target.createElementNS(node.namespaceURI,node.localName) : target.createElement(node.tagName === 'FORM' ? 'div' : node.localName));
  copyStyle(style,clone);
  // A transformed rect is a visual bound, not its CSS layout size. Preserve
  // that subtree's original transforms/used CSS instead of scaling it twice.
  if (!isSvg && !transformedBox) exactUsedBox(style,rect,clone);
  if (isSvg) for (const attr of node.attributes) {
   if (/^(on|href|xlink:href)/i.test(attr.name) || /url\(|javascript:|data:/i.test(attr.value) || ['filter','mask','clip-path'].includes(attr.name)) throw Error('snapshot-svg-reference');
   if (svgAttrs.has(attr.name)) clone.setAttribute(attr.name,attr.value);
  }
  if (['INPUT','SELECT','TEXTAREA'].includes(node.tagName)) { cloneControl(node,clone); return clone; }
  if (node.tagName === 'DETAILS') clone.open = node.open;
  if (node.tagName === 'TH' || node.tagName === 'TD') { clone.colSpan = node.colSpan; clone.rowSpan = node.rowSpan; }
  if (node.tagName === 'BUTTON' || node.tagName === 'A' || node.tagName === 'SUMMARY') clone.tabIndex = -1;
  if (node.scrollTop) clone.dataset.journeyScrollTop = String(node.scrollTop);
  if (node.scrollLeft) clone.dataset.courtScrollLeft = String(node.scrollLeft);
  if (!isSvg) { const before = pseudo(node,'::before'); if (before) clone.append(before); }
  const children = node.tagName === 'DETAILS' && !node.open ? [...node.children].filter(child => child.tagName === 'SUMMARY').slice(0,1) : node.childNodes;
  // A partly clipped button is one visible control. Keep its complete label
  // and badge layout; independently pruning a badge beyond the viewport can
  // change the control's intrinsic flex geometry. The overlay clips it at the
  // original surface. Hidden content, unsupported nodes and all budgets still
  // take the same strict path; entirely offscreen buttons never reach here.
  const wholeButton = atomicButton || node.tagName === 'BUTTON' && intersects(rect,surface);
  for (const child of children) { const next = copy(child,false,transformedBox,wholeButton); if (next) clone.append(next); }
  if (!isSvg) { const after = pseudo(node,'::after'); if (after) clone.append(after); }
  return clone;
 }
 try {
  for (const dialog of source.querySelectorAll('dialog[open],[role="dialog"],[role="alertdialog"],[popover]')) if (visible(dialog) && box(dialog.getBoundingClientRect()) && dialog.getBoundingClientRect().width) return null;
  if (!visible(main) || !visible(header)) return null;
  // The root is positioned in parent viewport coordinates; transformed outer
  // ancestry cannot be normalized from an axis-aligned bound faithfully.
  for (let node=main;node;node=node.parentElement) if (transformed(styleOf(node))) return null;
  for (const editor of main.querySelectorAll('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-editor],[data-editing="true"],[data-dirty="true"],.editor,.editing,.dirty,[data-price-wait-id]')) {
   budget(); const area = editor.getBoundingClientRect();
   if (visible(editor) && box(area) && area.width && area.height && !staticFilter(editor)) return null;
  }
  const rect = main.getBoundingClientRect(); if (!box(rect) || !rect.width || !rect.height || !intersects(rect,surface)) return null;
  const foreground = target.createElement('div'), roomBackdrop = target.createElement('div');
  for (const node of [foreground,roomBackdrop]) { node.inert = true; node.setAttribute('aria-hidden','true'); Object.assign(node.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none'}); }
  // The workspace stylesheet uses a viewport-fixed, already-loaded background.
  // Reproduce its viewport sizing even when the passage begins below the rail.
  const bodyStyle = styleOf(source.body), backdrop = target.createElement('div');
  Object.assign(backdrop.style,{position:'absolute',left:-surface.left+'px',top:-surface.top+'px',width:win.innerWidth+'px',height:win.innerHeight+'px'});
  for (const property of ['background-color','background-image','background-position','background-size','background-repeat','background-origin','background-clip']) backdrop.style.setProperty(property,assetsOnly(bodyStyle.getPropertyValue(property)));
  roomBackdrop.append(backdrop);
  const content = copy(main,true); Object.assign(content.style,{position:'absolute',left:rect.left-surface.left+'px',top:rect.top-surface.top+'px',right:'auto',bottom:'auto',margin:'0',transform:'none'}); foreground.append(content);
  budget(); return {foreground,roomBackdrop};
 } catch { return null; }
}
