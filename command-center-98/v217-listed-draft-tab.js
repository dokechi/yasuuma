(()=>{
  if(typeof API==='undefined'||typeof authHeaders!=='function'||typeof load!=='function'||typeof renderList!=='function')return;
  const TASK_ID='6aaca7d36874819181caec8ba014556e';
  const VIEW='listed';
  const LABEL='上場';
  const by=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const list=value=>Array.isArray(value)?value:[];
  const taskId=item=>{
    if(typeof signalTaskId==='function')return signalTaskId(item);
    const match=String(item?.id||'').match(/^(?:sns:)*task:([a-zA-Z0-9-]+):/);
    return match?match[1]:'';
  };
  const listed=item=>{
    const p=item?.payload||{};
    return taskId(item)===TASK_ID&&(p.category==='career_large'||p.content_type==='career_post_candidate');
  };
  const completed=item=>{
    const p=item?.payload||{};
    return listed(item)&&p.draft_status==='ready'&&Array.isArray(p.draft_slides)&&p.draft_slides.length>=5;
  };
  const timeOf=item=>{
    const values=[item?.lastSeen,item?.occurredAt,item?.detectedAt,item?.createdAt,item?.updatedAt,item?.payload?.updated_at,item?.payload?.created_at];
    for(const v of values){const t=Date.parse(v);if(Number.isFinite(t))return t}
    return 0;
  };
  const sortNewest=items=>items.sort((a,b)=>timeOf(b)-timeOf(a));
  const setText=(id,value)=>{const el=by(id);if(el)el.textContent=value};

  function launcherButton(){
    const button=document.createElement('button');
    button.type='button';
    button.className='home-launcher-card';
    button.dataset.listedDraft='1';
    button.innerHTML='<b>上場</b><span>上場企業の原稿</span>';
    return button;
  }
  function installLaunchers(){
    ['#homeLauncher .home-launcher-grid','#ccMore .home-launcher-grid'].forEach(selector=>{
      const host=document.querySelector(selector);
      if(!host||host.querySelector('[data-listed-draft]'))return;
      const button=launcherButton();
      const ai=host.querySelector('[data-home-domain="ai"]');
      if(ai)host.insertBefore(button,ai);else host.appendChild(button);
    });
  }

  function leaveOtherDesks(){
    window.CCHome?.leave?.();
    window.CCX?.hide?.();
    window.CCReddit?.hide?.();
    by('mainWindow')?.classList.remove('home-active');
    document.body.classList.remove('home-mode','x-mode');
    const home=by('commandHome');if(home)home.hidden=true;
    by('homeViewBtn')?.classList.remove('selected');
    by('homeViewBtn')?.setAttribute('aria-pressed','false');
    by('sourcingHub')?.setAttribute('hidden','');
    const regular=by('regularHub');if(regular)regular.hidden=false;
    const domains=by('domainTabs');if(domains)domains.hidden=true;
    by('viewTabs')?.querySelectorAll('button').forEach(btn=>{btn.classList.remove('selected');btn.setAttribute('aria-pressed','false')});
  }

  function slideHtml(slide,index,total){
    const headline=slide?.headline||slide?.title||slide?.heading||('ページ '+(index+1));
    const body=slide?.body||slide?.text||slide?.copy||'';
    const teaser=slide?.teaser||slide?.role||'';
    const sourceRefs=list(slide?.source_refs).join('、');
    return '<article class="listed-slide"><div class="listed-slide-head"><b>'+(slide?.page||index+1)+'/'+total+'</b>'+(teaser?'<span>'+esc(teaser)+'</span>':'')+'</div><h4>'+esc(headline)+'</h4><p>'+esc(body).replace(/\n/g,'<br>')+'</p>'+(slide?.emphasis?'<strong>'+esc(slide.emphasis)+'</strong>':'')+(slide?.visual_mode?'<small>表現：'+esc(slide.visual_mode)+'</small>':'')+(slide?.visual?'<small>画面：'+esc(slide.visual)+'</small>':'')+(sourceRefs?'<small>根拠：'+esc(sourceRefs)+'</small>':'')+'</article>';
  }
  function sourceHtml(source){
    const label=source?.label||source?.title||source?.url||'一次情報';
    const claim=source?.claim?'<p>'+esc(source.claim)+'</p>':'';
    const checked=source?.checked_at?'<small>確認 '+esc(source.checked_at)+'</small>':'';
    return '<li>'+(source?.url?'<a href="'+esc(source.url)+'" target="_blank" rel="noopener">'+esc(label)+'</a>':esc(label))+claim+checked+'</li>';
  }
  function reflectionHtml(row){
    const refs=list(row?.thread_refs).map(x=>[x.thread_id,x.comment_no?'#'+x.comment_no:''].filter(Boolean).join(' ')).join(' / ');
    return '<tr><td>'+esc(row?.page||'')+'</td><td>'+esc(row?.origin||'')+'</td><td>'+esc(row?.extracted||'')+'</td><td>'+esc(row?.transformed||'')+'</td><td>'+esc(refs)+'</td></tr>';
  }
  function closeModal(){document.querySelector('[data-listed-modal]')?.remove();document.body.classList.remove('listed-modal-open')}
  function openDraft(item){
    const p=item?.payload||{},slides=list(p.draft_slides),sources=list(p.draft_sources),refs=list(p.page_reflections);
    closeModal();
    const modal=document.createElement('div');
    modal.dataset.listedModal='1';
    modal.className='listed-modal';
    modal.innerHTML='<div class="listed-modal-card"><header><div><small>上場｜完成原稿</small><h3>'+esc(p.post_title||p.draft_title||item.title||'原稿')+'</h3></div><button class="push-button" type="button" data-listed-close>閉じる</button></header>'
      +(p.caption?'<section class="listed-caption"><h4>キャプション</h4><p>'+esc(p.caption).replace(/\n/g,'<br>')+'</p></section>':'')
      +'<section><h4>ページ別原稿</h4><div class="listed-slides">'+slides.map((s,i)=>slideHtml(s,i,slides.length)).join('')+'</div></section>'
      +(sources.length?'<section><h4>公開用の根拠</h4><ul>'+sources.map(sourceHtml).join('')+'</ul></section>':'')
      +(refs.length?'<details class="listed-reflections"><summary>内部確認｜需要をどこへ反映したか</summary><table><thead><tr><th>頁</th><th>由来</th><th>抽出</th><th>公開原稿への変換</th><th>内部参照</th></tr></thead><tbody>'+refs.map(reflectionHtml).join('')+'</tbody></table></details>':'')
      +'</div>';
    document.body.appendChild(modal);
    document.body.classList.add('listed-modal-open');
    modal.querySelector('[data-listed-close]').focus();
  }

  function attachDraftButtons(items){
    items.forEach(item=>{
      const article=by('card-'+(typeof cssSafe==='function'?cssSafe(item.id):String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_')));
      if(!article||article.querySelector('[data-listed-open]'))return;
      const button=document.createElement('button');
      button.type='button';button.className='push-button listed-open';button.dataset.listedOpen=String(item.id);button.textContent='原稿を開く';
      article.appendChild(button);
    });
  }

  async function fetchItems(){
    const response=await fetch(API+'?view=history',{cache:'no-store',headers:authHeaders()});
    if(response.status===401){if(typeof authExpired==='function')authExpired();throw new Error('認証の有効期限が切れました')}
    const data=await response.json();
    if(!response.ok||!data?.ok)throw new Error(data?.error||('HTTP '+response.status));
    const items=sortNewest((Array.isArray(data.items)?data.items:[]).filter(listed));
    return {data,items};
  }

  async function loadListed(){
    if(app.busy)return;
    app.busy=true;app.view=VIEW;app.domain='all';app.rank='all';
    leaveOtherDesks();
    setText('listCaption','上場｜原稿');
    setText('visibleCount','読み込み中');
    if(typeof setStatus==='function')setStatus('上場企業の原稿を読み込み中...',true);
    if(typeof showLoading==='function')showLoading();
    try{
      const {data,items}=await fetchItems();
      app.data=data;app.items=items;
      renderList();
      setText('listCaption','上場｜原稿');
      setText('visibleCount',items.length+'件');
      const filter=by('listFilter');
      if(filter){filter.hidden=false;filter.innerHTML='<span><b>上場企業の原稿</b> · Chat専用 · 新しい候補が上</span>'}
      if(!items.length){
        const host=by('list');
        if(host)host.innerHTML='<div class="empty"><b>上場の原稿はまだありません。</b><br><small>次の調査で合格した原稿がここに表示されます。</small></div>';
      }else attachDraftButtons(items);
      setText('kpiLabelCount','上場の原稿');setText('kpiCount',items.length+'件');
      setText('kpiLabelS','完成');setText('kpiS',items.filter(completed).length+'件');
      setText('kpiLabelImpact','選択済み');setText('kpiImpact',items.filter(x=>x.reviewState==='accepted').length+'件');
      setText('kpiLabelStored','確認待ち');setText('kpiStored',items.filter(x=>!completed(x)).length+'件');
      if(typeof setStatus==='function')setStatus('準備完了｜上場の原稿 '+items.length+'件');
      window.CCNavigation?.sync?.();
      setText('ccPageTitle','上場');setText('ccPageDescription','上場企業の投稿原稿を、新しいものから確認できます。');
    }catch(error){
      const host=by('list');
      if(host)host.innerHTML='<div class="empty"><b>上場の原稿を取得できませんでした。</b><br><small>'+esc(error.message||error)+'</small></div>';
      if(typeof setStatus==='function')setStatus('通信エラー');
      if(typeof toast==='function')toast('上場の原稿の読み込みに失敗しました','bad');
    }finally{app.busy=false;by('refreshBtn')&&(by('refreshBtn').disabled=false)}
  }

  const previousLoad=load;
  load=async function(view=app.view){
    if(view===VIEW)return loadListed();
    return previousLoad(view);
  };

  document.addEventListener('click',event=>{
    const launcher=event.target.closest('[data-listed-draft]');
    if(launcher){event.preventDefault();event.stopPropagation();loadListed();return}
    const open=event.target.closest('[data-listed-open]');
    if(open){const item=(app.items||[]).find(x=>String(x.id)===open.dataset.listedOpen);if(item)openDraft(item);return}
    if(event.target.closest('[data-listed-close]')){closeModal();return}
    if(event.target.matches('.listed-modal'))closeModal();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('[data-listed-modal]'))closeModal()});

  const style=document.createElement('style');
  style.textContent=`
    .listed-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:grid;place-items:start center;padding:24px;overflow:auto}
    .listed-modal-card{width:min(940px,100%);background:#c0c0c0;color:#111;border:2px solid;border-color:#fff #000 #000 #fff;box-shadow:3px 3px #000;padding:12px}
    .listed-modal-card>header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:#000080;color:#fff;padding:8px 10px;margin:-8px -8px 14px}
    .listed-modal-card h3{margin:2px 0 0;font-size:20px}.listed-modal-card h4{margin:16px 0 8px}
    .listed-caption,.listed-slide,.listed-reflections{background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:12px}
    .listed-slides{display:grid;gap:10px}.listed-slide-head{display:flex;gap:8px;align-items:center}.listed-slide-head b{background:#efe3cc;padding:3px 8px}.listed-slide h4{margin:8px 0}.listed-slide p{line-height:1.7;margin:0 0 8px}.listed-slide small{display:block;color:#555;margin-top:5px}.listed-slide strong{display:block;margin:8px 0}
    .listed-reflections{margin-top:16px;overflow:auto}.listed-reflections summary{cursor:pointer;font-weight:700}.listed-reflections table{width:100%;border-collapse:collapse;margin-top:10px}.listed-reflections th,.listed-reflections td{border:1px solid #999;padding:6px;vertical-align:top;text-align:left}
    .listed-open{margin:8px}.listed-modal-open{overflow:hidden}
    #homeLauncher [data-listed-draft],#ccMore [data-listed-draft]{background:#e8e6f5}
  `;
  document.head.appendChild(style);
  installLaunchers();
  setTimeout(installLaunchers,400);
  document.querySelectorAll('.status-bar .status-panel').forEach(el=>{if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.68'});
  window.__listedDraftTab={taskId:TASK_ID,load:loadListed,openDraft,installLaunchers};
})();