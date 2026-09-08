(()=>{
  if(typeof cardHtml!=='function'||typeof renderList!=='function')return;
  const TYPE='fp_content';
  const API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-workflow-api';
  const states=new Map();
  const ensuring=new Set();
  const escFp=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fp=x=>x?.payload?.content_type==='fp_post_candidate';
  const list=v=>Array.isArray(v)?v:[];
  const defaultState=x=>({entityId:String(x.id),discovered:'pass',judgment:(x.reviewState==='accepted'?'pass':'pending'),verification:'pending',execution:'pending',audit:'pending'});
  const state=x=>states.get(String(x.id))||defaultState(x);
  const request=async options=>{
    const r=await fetch(API,{cache:'no-store',...options});
    if(r.status===401){authExpired();throw Error('認証期限切れ')}
    const d=await r.json();
    if(!r.ok||!d.ok)throw Error(d.error||('HTTP '+r.status));
    return d;
  };
  const headers=()=>({...authHeaders(),'Content-Type':'application/json'});
  const put=rows=>list(rows).forEach(s=>states.set(String(s.entityId),s));
  const ensure=async items=>{
    const fresh=items.filter(x=>fp(x)&&!ensuring.has(String(x.id)));
    if(!fresh.length)return;
    fresh.forEach(x=>ensuring.add(String(x.id)));
    try{
      const d=await request({method:'POST',headers:headers(),body:JSON.stringify({action:'ensure',entityType:TYPE,items:fresh.map(x=>({entityId:String(x.id),judgmentStatus:x.reviewState==='accepted'?'pass':'pending'}))})});
      put(d.states);
      refreshPanels();
    }catch(err){console.warn('FP content workflow unavailable',err)}
  };
  const sourceLinks=p=>list(p.official_sources).map((s,i)=>'<a href="'+escFp(s.url)+'" target="_blank" rel="noopener">'+escFp(s.label||('公式根拠 '+(i+1)))+'</a>').join('／')||'採用後に確認';
  const stageMark=value=>value==='pass'||value==='done'?'✓':value==='ready'?'→':value==='fail'?'×':'待';
  const stage=(label,value)=>'<span class="fp-stage '+escFp(value)+'"><small>'+escFp(label)+'</small><b>'+stageMark(value)+'</b></span>';
  const draftStatus=x=>{const s=state(x);if(s.audit==='pass'||x.payload?.image_status==='ready')return{label:'画像確認待ち',queued:true};if(s.execution==='done')return{label:'画像制作待ち',queued:true};return{label:'原稿確認待ち',queued:false}};
  const draftControls=x=>{const p=x.payload||{};if(x.reviewState!=='accepted'||p.draft_status!=='ready')return'';const d=draftStatus(x);return '<section class="fp-draft-actions" data-fp-draft-actions="'+escFp(x.id)+'"><div class="fp-draft-status"><b>'+escFp(d.label)+'</b><span>原稿・出典・要確認点を保存済み</span></div><div class="fp-draft-buttons"><button class="push-button fp-open-draft" data-fp-open="'+escFp(x.id)+'">原稿を見る</button><button class="push-button fp-request-images" data-fp-images="'+escFp(x.id)+'" '+(d.queued?'disabled':'')+'>'+(d.queued?'画像化を依頼済み':'この原稿で画像化')+'</button></div></section>'};
  const panel=x=>{
    const p=x.payload||{},s=state(x),chosen=s.judgment==='pass'||x.reviewState==='accepted';
    const steps=stage('発掘','pass')+stage('選択',chosen?'pass':'pending')+stage('追加調査',s.verification||'pending')+stage('原稿',s.execution||'pending')+stage('画像',s.audit||'pending');
    const structure=list(p.definitive_structure).map(v=>'<li>'+escFp(v)+'</li>').join('');
    return '<section class="fp-candidate" data-fp-panel="'+escFp(x.id)+'"><div class="fp-head"><b>FP投稿候補</b><span class="fp-signal">'+escFp(p.engagement_label||'反応確認済み')+'</span><span class="fp-state">'+(chosen?'制作待ち':'選択待ち')+'</span></div><div class="fp-question"><small>読者が知りたいこと</small>'+escFp(p.reader_question||'')+'</div><dl class="fp-grid"><dt>反応の核</dt><dd>'+escFp(p.strong_reaction||'')+'</dd><dt>なぜ今か</dt><dd>'+escFp(p.hot_reason||'')+'</dd><dt>決定版の構成</dt><dd><ol>'+structure+'</ol></dd><dt>公式根拠</dt><dd>'+sourceLinks(p)+'</dd><dt>保険導線</dt><dd>'+escFp(p.affiliate_route||'')+'</dd><dt>調査状態</dt><dd>'+escFp(p.research_status||'')+'</dd></dl><div class="fp-stages">'+steps+'</div>'+(chosen?'<p class="fp-ready">選択済み。追加調査→原稿→事実確認→画像の順で制作します。</p>':'')+draftControls(x)+'</section>';
  };
  const baseCard=cardHtml;
  cardHtml=(x,i)=>{
    const html=baseCard(x,i);
    if(!fp(x))return html;
    return html.replace('<table class="meta">',panel(x)+'<table class="meta">');
  };
  const refreshPanels=()=>{
    document.querySelectorAll('[data-fp-panel]').forEach(old=>{
      const x=(app.items||[]).find(v=>String(v.id)===old.dataset.fpPanel);
      if(x)old.outerHTML=panel(x);
    });
    relabel();
  };
  const relabel=()=>{
    document.querySelectorAll('.thread').forEach(card=>{
      const b=card.querySelector('.action-accept');
      if(!b)return;
      const x=(app.items||[]).find(v=>String(v.id)===String(b.dataset.id));
      if(fp(x)){b.textContent='これに決定';b.classList.add('fp-select')}
    });
  };
  const baseRender=renderList;
  renderList=()=>{baseRender();relabel();ensure(app.items||[])};
  const choose=async(x,b)=>{
    if(b.disabled)return;
    bump(b);b.disabled=true;b.textContent='決定を保存中…';setStatus('FP投稿候補を制作待ちに移しています...',true);
    try{
      const d=await request({method:'PATCH',headers:headers(),body:JSON.stringify({entityType:TYPE,entityId:String(x.id),stage:'judgment',status:'pass',judgmentSeed:'pending',note:'投稿候補として決定・追加調査待ち'})});
      states.set(String(x.id),d.state);
      refreshPanels();
      const ok=await review(String(x.id),'accepted',b);
      if(ok)toast('これに決定。追加調査待ちへ移しました','good');
      else{b.disabled=false;b.textContent='これに決定'}
    }catch(err){b.disabled=false;b.textContent='これに決定';setStatus('保存エラー');toast(err.message||'決定を保存できませんでした','bad')}
  };
  const sourceRow=s=>{if(typeof s==='string')return'<li>'+escFp(s)+'</li>';const label=s?.label||s?.title||s?.url||'出典';return'<li>'+(s?.url?'<a href="'+escFp(s.url)+'" target="_blank" rel="noopener">'+escFp(label)+'</a>':escFp(label))+(s?.note?'<small>'+escFp(s.note)+'</small>':'')+'</li>'};
  const slideRow=(s,i)=>{const title=s?.headline||s?.title||s?.heading||('スライド '+(i+1)),body=s?.body||s?.text||s?.copy||'';return'<article class="fp-draft-slide"><div>'+(i+1)+'</div><section><h4>'+escFp(title)+'</h4><p>'+escFp(body).replace(/\n/g,'<br>')+'</p></section></article>'};
  const closeDraft=()=>{document.querySelector('[data-fp-modal]')?.remove();document.body.classList.remove('fp-modal-open')};
  const openDraft=x=>{const p=x.payload||{},slides=list(p.draft_slides),sources=list(p.draft_sources),points=list(p.draft_review_points),d=draftStatus(x),modal=document.createElement('div');modal.className='fp-draft-modal';modal.dataset.fpModal='1';modal.innerHTML='<div class="fp-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-draft-title"><header><div><small>FPカルーセル原稿</small><h3 id="fp-draft-title">'+escFp(p.draft_cover||x.title||'原稿案')+'</h3></div><button class="push-button fp-close-draft">閉じる</button></header><main><section class="fp-draft-cover"><small>表紙案</small><b>'+escFp(p.draft_cover||x.title||'')+'</b></section><div class="fp-draft-slides">'+slides.map(slideRow).join('')+'</div>'+(points.length?'<section class="fp-draft-notes"><h4>公開前の確認点</h4><ul>'+points.map(v=>'<li>'+escFp(typeof v==='string'?v:(v?.text||v?.note||JSON.stringify(v)))+'</li>').join('')+'</ul></section>':'')+(sources.length?'<section class="fp-draft-sources"><h4>出典</h4><ol>'+sources.map(sourceRow).join('')+'</ol></section>':'')+'</main><footer><button class="push-button fp-close-draft">原稿一覧へ戻る</button><button class="push-button fp-request-images" data-fp-images="'+escFp(x.id)+'" '+(d.queued?'disabled':'')+'>'+(d.queued?'画像化を依頼済み':'この原稿で画像化')+'</button></footer></div>';document.body.appendChild(modal);document.body.classList.add('fp-modal-open');modal.querySelector('.fp-close-draft')?.focus()};
  const requestImages=async(x,b)=>{if(b.disabled)return;b.disabled=true;b.textContent='画像化を受付中…';setStatus('画像制作キューへ送っています...',true);try{const d=await request({method:'PATCH',headers:headers(),body:JSON.stringify({entityType:TYPE,entityId:String(x.id),stage:'execution',status:'done',judgmentSeed:'pass',note:'画像化待ち（司令塔で原稿承認済み）'})});states.set(String(x.id),d.state);refreshPanels();document.querySelectorAll('[data-fp-images="'+CSS.escape(String(x.id))+'"]').forEach(el=>{el.disabled=true;el.textContent='画像化を依頼済み'});setStatus('画像制作待ち');toast('画像制作キューへ送りました','good')}catch(err){b.disabled=false;b.textContent='この原稿で画像化';setStatus('保存エラー');toast(err.message||'画像化を依頼できませんでした','bad')}};
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.action-accept');
    if(!b)return;
    const x=(app.items||[]).find(v=>String(v.id)===String(b.dataset.id));
    if(!fp(x))return;
    e.preventDefault();e.stopImmediatePropagation();choose(x,b);
  },true);
  document.addEventListener('click',e=>{const open=e.target.closest?.('[data-fp-open]');if(open){e.preventDefault();const x=(app.items||[]).find(v=>String(v.id)===String(open.dataset.fpOpen));if(x)openDraft(x);return}if(e.target.closest?.('.fp-close-draft')||e.target.classList?.contains('fp-draft-modal')){e.preventDefault();closeDraft();return}const b=e.target.closest?.('[data-fp-images]');if(b){e.preventDefault();const x=(app.items||[]).find(v=>String(v.id)===String(b.dataset.fpImages));if(x)requestImages(x,b)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('[data-fp-modal]'))closeDraft()});
  const style=document.createElement('style');
  style.textContent=`
    .fp-candidate{margin:0 0 9px;padding:9px;background:#edf7ff;border:2px solid;border-color:#fff #55728a #55728a #fff;box-shadow:inset -1px -1px #9cb2c2;color:#111}
    .fp-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:7px}.fp-head>b{color:#000080}.fp-signal,.fp-state{padding:1px 5px;border:1px solid #777;background:#fff;font-size:11px}.fp-state{margin-left:auto;background:#fff6b5;font-weight:700}
    .fp-question{background:#fff;border:1px inset #aaa;padding:7px 8px;line-height:1.45;font-weight:700}.fp-question small{display:block;color:#555;font-weight:400}
    .fp-grid{display:grid;grid-template-columns:92px 1fr;margin:7px 0 0;border:1px solid #9aa}.fp-grid dt,.fp-grid dd{margin:0;padding:5px 6px;border-bottom:1px solid #ccd;line-height:1.45}.fp-grid dt{background:#dce8f0;font-size:11px}.fp-grid dd{background:#fff;font-size:12px}.fp-grid ol{margin:0;padding-left:20px}.fp-grid a{color:#000080}
    .fp-stages{display:flex;gap:5px;align-items:center;margin-top:7px;overflow-x:auto}.fp-stage{min-width:64px;padding:3px 6px;text-align:center;border:1px solid #777;background:#eee}.fp-stage.pass,.fp-stage.done{background:#d8f5d8}.fp-stage.ready{background:#fff3bf}.fp-stage.fail{background:#ffd7d7}.fp-stage small{display:block;font-size:10px}.fp-stage b{font-size:13px}.fp-ready{margin:7px 0 0;padding:6px;background:#fff6b5;border:1px solid #b8a94b;font-size:12px}.fp-select{font-weight:900;background:#d9ffd9}
    .fp-draft-actions{margin-top:8px;padding:8px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080}.fp-draft-status{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px}.fp-draft-status b{color:#000080}.fp-draft-status span{font-size:11px;color:#444}.fp-draft-buttons{display:flex;gap:7px;flex-wrap:wrap}.fp-request-images{font-weight:900;background:#fff3a8}.fp-request-images:disabled{background:#ddd;color:#555}.fp-modal-open{overflow:hidden}.fp-draft-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:16px}.fp-draft-dialog{width:min(920px,100%);max-height:92vh;display:flex;flex-direction:column;background:#c0c0c0;color:#111;border:3px solid;border-color:#fff #111 #111 #fff;box-shadow:8px 8px 0 rgba(0,0,0,.35)}.fp-draft-dialog>header,.fp-draft-dialog>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px}.fp-draft-dialog>header{background:#000080;color:#fff}.fp-draft-dialog h3{margin:2px 0 0;font-size:18px}.fp-draft-dialog>main{overflow:auto;padding:12px}.fp-draft-dialog>footer{border-top:1px solid #777;background:#d4d0c8}.fp-draft-cover{padding:18px;background:#f8f0dd;border:2px solid #263d57;text-align:center}.fp-draft-cover small{display:block;color:#555}.fp-draft-cover b{display:block;margin-top:7px;font-size:24px;line-height:1.45}.fp-draft-slides{display:grid;gap:8px;margin-top:10px}.fp-draft-slide{display:grid;grid-template-columns:42px 1fr;background:#fff;border:1px solid #777}.fp-draft-slide>div{display:grid;place-items:center;background:#16324f;color:#fff;font-weight:900}.fp-draft-slide section{padding:9px 11px}.fp-draft-slide h4,.fp-draft-slide p{margin:0}.fp-draft-slide p{margin-top:5px;line-height:1.6}.fp-draft-notes,.fp-draft-sources{margin-top:10px;padding:10px 12px;background:#fff6bf;border:1px solid #9a873a}.fp-draft-sources{background:#edf7ff;border-color:#55728a}.fp-draft-notes h4,.fp-draft-sources h4{margin:0 0 6px}.fp-draft-notes ul,.fp-draft-sources ol{margin:0;padding-left:22px}.fp-draft-sources li{margin:4px 0}.fp-draft-sources small{display:block;color:#555}
    @media(max-width:700px){.fp-grid{grid-template-columns:78px 1fr}.fp-state{margin-left:0}.fp-stage{min-width:56px}.fp-draft-modal{padding:0}.fp-draft-dialog{width:100%;height:100dvh;max-height:none;border:0}.fp-draft-dialog h3{font-size:15px}.fp-draft-cover b{font-size:20px}.fp-draft-dialog>footer{flex-wrap:wrap}.fp-draft-dialog>footer .push-button,.fp-draft-buttons .push-button{flex:1;min-height:38px}.fp-draft-slide{grid-template-columns:34px 1fr}}
  `;
  document.head.appendChild(style);
  relabel();
})();
