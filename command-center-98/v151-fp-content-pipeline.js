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
  const stage=(label,value)=>'<span class="fp-stage '+escFp(value)+'"><small>'+escFp(label)+'</small><b>'+(value==='pass'?'✓':'待')+'</b></span>';
  const panel=x=>{
    const p=x.payload||{},s=state(x),chosen=s.judgment==='pass'||x.reviewState==='accepted';
    const steps=stage('発掘','pass')+stage('選択',chosen?'pass':'pending')+stage('追加調査',s.verification||'pending')+stage('原稿',s.execution==='done'?'pass':'pending')+stage('画像',s.audit==='pass'?'pass':'pending');
    const structure=list(p.definitive_structure).map(v=>'<li>'+escFp(v)+'</li>').join('');
    return '<section class="fp-candidate" data-fp-panel="'+escFp(x.id)+'"><div class="fp-head"><b>FP投稿候補</b><span class="fp-signal">'+escFp(p.engagement_label||'反応確認済み')+'</span><span class="fp-state">'+(chosen?'制作待ち':'選択待ち')+'</span></div><div class="fp-question"><small>読者が知りたいこと</small>'+escFp(p.reader_question||'')+'</div><dl class="fp-grid"><dt>反応の核</dt><dd>'+escFp(p.strong_reaction||'')+'</dd><dt>なぜ今か</dt><dd>'+escFp(p.hot_reason||'')+'</dd><dt>決定版の構成</dt><dd><ol>'+structure+'</ol></dd><dt>公式根拠</dt><dd>'+sourceLinks(p)+'</dd><dt>保険導線</dt><dd>'+escFp(p.affiliate_route||'')+'</dd><dt>調査状態</dt><dd>'+escFp(p.research_status||'')+'</dd></dl><div class="fp-stages">'+steps+'</div>'+(chosen?'<p class="fp-ready">選択済み。追加調査→原稿→事実確認→画像の順で制作します。</p>':'')+'</section>';
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
    }catch(err){b.disabled=false;b.textContent='これに決定';setStatus('保存エラー');toast(err.message||'決定を保存できませんでした','bad')}
  };
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.action-accept');
    if(!b)return;
    const x=(app.items||[]).find(v=>String(v.id)===String(b.dataset.id));
    if(!fp(x))return;
    e.preventDefault();e.stopImmediatePropagation();choose(x,b);
  },true);
  const style=document.createElement('style');
  style.textContent=`
    .fp-candidate{margin:0 0 9px;padding:9px;background:#edf7ff;border:2px solid;border-color:#fff #55728a #55728a #fff;box-shadow:inset -1px -1px #9cb2c2;color:#111}
    .fp-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:7px}.fp-head>b{color:#000080}.fp-signal,.fp-state{padding:1px 5px;border:1px solid #777;background:#fff;font-size:11px}.fp-state{margin-left:auto;background:#fff6b5;font-weight:700}
    .fp-question{background:#fff;border:1px inset #aaa;padding:7px 8px;line-height:1.45;font-weight:700}.fp-question small{display:block;color:#555;font-weight:400}
    .fp-grid{display:grid;grid-template-columns:92px 1fr;margin:7px 0 0;border:1px solid #9aa}.fp-grid dt,.fp-grid dd{margin:0;padding:5px 6px;border-bottom:1px solid #ccd;line-height:1.45}.fp-grid dt{background:#dce8f0;font-size:11px}.fp-grid dd{background:#fff;font-size:12px}.fp-grid ol{margin:0;padding-left:20px}.fp-grid a{color:#000080}
    .fp-stages{display:flex;gap:5px;align-items:center;margin-top:7px;overflow-x:auto}.fp-stage{min-width:64px;padding:3px 6px;text-align:center;border:1px solid #777;background:#eee}.fp-stage.pass{background:#d8f5d8}.fp-stage small{display:block;font-size:10px}.fp-stage b{font-size:13px}.fp-ready{margin:7px 0 0;padding:6px;background:#fff6b5;border:1px solid #b8a94b;font-size:12px}.fp-select{font-weight:900;background:#d9ffd9}
    @media(max-width:700px){.fp-grid{grid-template-columns:78px 1fr}.fp-state{margin-left:0}.fp-stage{min-width:56px}}
  `;
  document.head.appendChild(style);
  relabel();
})();

