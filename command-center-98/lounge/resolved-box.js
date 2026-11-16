/* Private records are requested through the existing authenticated host. */
export function createResolvedBox(){
 const d=document,el=(tag,text)=>{const n=d.createElement(tag);if(text!=null)n.textContent=String(text);return n;};
 const dialog=el('dialog');dialog.id='resolved-box';dialog.className='resolved-box';dialog.setAttribute('aria-labelledby','resolved-box-title');
 const style=el('style');style.textContent=`
 .resolved-box{box-sizing:border-box;width:min(1000px,calc(100vw - 24px));max-height:90dvh;margin:auto;padding:0;border:1px solid #998969;border-radius:12px;color:#302b23;background:#faf6ed;font:15px/1.8 system-ui,sans-serif}
 .resolved-box::backdrop{background:#0009}.resolved-box header{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#faf6ed;border-bottom:1px solid #d3c8b4}.resolved-box h2{margin:0;font-size:23px}
 .resolved-box button{font:inherit;cursor:pointer;border:1px solid #aa9671;border-radius:6px;background:#fffaf0;color:#302b23;padding:8px 16px;min-height:44px}.resolved-box button:focus-visible,.resolved-box summary:focus-visible{outline:3px solid #85704c;outline-offset:2px}
 .resolved-tabs{display:flex;gap:8px;padding:12px 20px}.resolved-tabs [aria-selected=true]{background:#3c5447;color:#fff;border-color:#3c5447}
 .resolved-content{padding:0 20px 24px;overflow-wrap:anywhere}.resolved-content h3{font-size:20px;margin:18px 0 10px}.resolved-content p{margin:10px 0}.resolved-content ul{padding-left:24px}
 .resolved-content details{border-top:1px solid #d5c9b5;padding:14px 0}.resolved-content summary{cursor:pointer;font-weight:650}.resolved-content details p{padding-left:12px;border-left:3px solid #a68c5f}
 .resolved-table-wrap{overflow-x:auto;margin:12px 0 24px}.resolved-content table{border-collapse:collapse;min-width:100%;font-size:14px;white-space:nowrap}.resolved-content th,.resolved-content td{text-align:left;padding:9px 12px;border:1px solid #d5c9b5}.resolved-content th{background:#eae2d3}.resolved-content tr:nth-child(even){background:#f1ecdf}
 .resolved-note{font-size:13px;color:#675f51}.resolved-status{padding:0 20px}.resolved-content a{color:#275e65}.resolved-links{display:flex;gap:10px;flex-wrap:wrap}
 @media(max-width:600px){.resolved-box{width:calc(100vw - 16px);max-height:94dvh}.resolved-content{padding:0 14px 20px}.resolved-box header,.resolved-tabs{padding:10px 14px}.resolved-content h3{font-size:18px}}
 `;d.head.append(style);
 const header=el('header'),title=el('h2','解決');title.id='resolved-box-title';
 const close=el('button','閉じる');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const nav=el('nav');nav.className='resolved-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','解決したテーマ');
 const status=el('p');status.className='resolved-status';status.setAttribute('role','status');
 const content=el('section');content.className='resolved-content';content.id='resolved-panel';content.setAttribute('role','tabpanel');content.tabIndex=0;
 const retry=el('button','再読み込み');retry.hidden=true;retry.onclick=load;
 dialog.append(header,nav,status,retry,content);d.body.append(dialog);
 let guide=null,loading=false,timer=null,selected='insurance',opener=null;
 function render(){
  const tabs=guide?.tabs||[],tab=tabs.find(t=>t.key===selected)||tabs[0];if(!tab)return;selected=tab.key;
  nav.replaceChildren(...tabs.map(t=>{const b=el('button',t.label);b.type='button';b.id='resolved-tab-'+t.key;b.setAttribute('role','tab');b.setAttribute('aria-controls',content.id);b.setAttribute('aria-selected',String(t.key===selected));b.tabIndex=t.key===selected?0:-1;b.onclick=()=>{selected=t.key;render();d.getElementById(b.id)?.focus();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=tabs.findIndex(x=>x.key===selected);selected=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length].key;render();d.getElementById('resolved-tab-'+selected)?.focus();};return b;}));
  content.setAttribute('aria-labelledby','resolved-tab-'+selected);
  content.replaceChildren(el('h3',tab.title),el('p',tab.summary));
  const date=el('p','更新：'+guide.updated);date.className='resolved-note';content.append(date);
  const conditions=el('details');conditions.append(el('summary','今回の確定条件・試算の前提'));const list=el('ul');for(const s of tab.assumptions||[])list.append(el('li',s));conditions.append(list);content.append(conditions);
  content.append(el('h3','苦戦した疑問と結果'));
  for(const [i,q]of (tab.questions||[]).entries()){const item=el('details');item.append(el('summary',(i+1)+'. '+q.q),el('p',q.a));if(i===0)item.open=true;content.append(item);}
  for(const t of tab.tables||[]){
   content.append(el('h3',t.title));const note=el('p',t.note);note.className='resolved-note';content.append(note);
   const wrap=el('div');wrap.className='resolved-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',t.title+'の表。横にスクロールできます');
   const table=el('table'),head=el('thead'),hr=el('tr');for(const v of t.headers){const th=el('th',v);th.scope='col';hr.append(th);}head.append(hr);table.append(head);
   const body=el('tbody');for(const r of t.rows){const tr=el('tr');for(const v of r)tr.append(el('td',v));body.append(tr);}table.append(body);wrap.append(table);content.append(wrap);
  }
  const refs=el('div');refs.className='resolved-links';
  for(const s of tab.sources||[]){try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)continue;const a=el('a',s.label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';refs.append(a);}catch{}}
  content.append(refs);const foot=el('p',tab.source_note);foot.className='resolved-note';content.append(foot);
  status.textContent=(tab.questions||[]).length+'件の疑問・結果を保存済み';
 }
 function fail(message){loading=false;clearTimeout(timer);status.textContent=message;retry.hidden=false;}
 function load(){
  if(loading)return;retry.hidden=true;
  if(window.parent===window){fail('司令塔の本体から開いてください。');return;}
  loading=true;status.textContent='解決した内容を読み込んでいます…';
  timer=setTimeout(()=>fail('読み込みに時間がかかっています。再読み込みしてください。'),35000);
  window.parent.postMessage({channel:'cc-castle-v1',type:'resolved-knowledge'},location.origin);
 }
 window.addEventListener('message',e=>{
  const m=e.data;if(e.source!==window.parent||e.origin!==location.origin||m?.channel!=='cc-castle-v1'||m.type!=='resolved-knowledge')return;
  clearTimeout(timer);loading=false;
  if(m.error){fail(m.error);return;}if(!Array.isArray(m.guide?.tabs)||!m.guide.tabs.length){fail('保存内容を確認できませんでした。');return;}
  guide=m.guide;retry.hidden=true;render();
 });
 dialog.addEventListener('close',()=>opener?.focus());
 return {open(){opener=d.activeElement;if(!dialog.open)dialog.showModal();load();}};
}
