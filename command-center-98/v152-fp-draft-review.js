(()=>{
  if(typeof renderList!=='function'||!window.app)return;

  const TYPE='fp_content';
  const API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-workflow-api';
  const states=new Map();
  let loading=false;

  const escDraft=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const isFp=item=>item?.payload?.content_type==='fp_post_candidate';
  const drafts=()=>((app.items||[]).filter(item=>isFp(item)&&item.reviewState==='accepted'&&item.payload?.draft_status==='ready'));
  const request=async options=>{
    const response=await fetch(API,{cache:'no-store',...options});
    if(response.status===401){authExpired();throw new Error('認証期限切れ')}
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error||('HTTP '+response.status));
    return data;
  };
  const headers=()=>({...authHeaders(),'Content-Type':'application/json'});
  const stateFor=item=>states.get(String(item.id))||{
    entityId:String(item.id),discovered:'pass',judgment:'pass',verification:'pass',execution:'ready',audit:'pending'
  };
  const statusFor=item=>{
    const state=stateFor(item);
    if(state.audit==='pass'||item.payload?.image_status==='ready')return {label:'画像確認待ち',kind:'ready'};
    if(state.execution==='done')return {label:'画像制作待ち',kind:'queued'};
    return {label:'原稿確認待ち',kind:'draft'};
  };

  const ensureStates=async()=>{
    const items=drafts();
    if(!items.length||loading){renderActions();return}
    loading=true;
    try{
      const data=await request({
        method:'POST',headers:headers(),
        body:JSON.stringify({
          action:'ensure',entityType:TYPE,
          items:items.map(item=>({entityId:String(item.id),judgmentStatus:'pass'}))
        })
      });
      (data.states||[]).forEach(state=>states.set(String(state.entityId),state));
    }catch(error){console.warn('FP draft workflow unavailable',error)}
    finally{loading=false;renderActions()}
  };

  const actionHtml=item=>{
    const status=statusFor(item);
    const queued=status.kind!=='draft';
    return '<section class="fp-draft-actions" data-fp-draft-actions="'+escDraft(item.id)+'">'
      +'<div class="fp-draft-status"><b>'+escDraft(status.label)+'</b><span>原稿10枚・出典・要確認点を保存済み</span></div>'
      +'<div class="fp-draft-buttons">'
      +'<button class="push-button fp-open-draft" data-fp-open="'+escDraft(item.id)+'">原稿を見る</button>'
      +'<button class="push-button fp-request-images" data-fp-images="'+escDraft(item.id)+'" '+(queued?'disabled':'')+'>'+(queued?'画像化を依頼済み':'この原稿で画像化')+'</button>'
      +'</div></section>';
  };

  const renderActions=()=>{
    drafts().forEach(item=>{
      const panel=document.querySelector('[data-fp-panel="'+CSS.escape(String(item.id))+'"]');
      if(!panel)return;
      const old=panel.querySelector('[data-fp-draft-actions]');
      if(old)old.outerHTML=actionHtml(item);
      else panel.insertAdjacentHTML('beforeend',actionHtml(item));
    });
  };

  const sourceHtml=source=>{
    if(typeof source==='string')return '<li>'+escDraft(source)+'</li>';
    const label=source?.label||source?.title||source?.url||'出典';
    return '<li>'+(source?.url?'<a href="'+escDraft(source.url)+'" target="_blank" rel="noopener">'+escDraft(label)+'</a>':escDraft(label))+(source?.note?'<small>'+escDraft(source.note)+'</small>':'')+'</li>';
  };
  const slideHtml=(slide,index)=>{
    const heading=slide?.headline||slide?.title||slide?.heading||('スライド '+(index+1));
    const body=slide?.body||slide?.text||slide?.copy||'';
    return '<article class="fp-draft-slide"><div>'+(index+1)+'</div><section><h4>'+escDraft(heading)+'</h4><p>'+escDraft(body).replace(/\n/g,'<br>')+'</p></section></article>';
  };
  const itemById=id=>(app.items||[]).find(item=>String(item.id)===String(id));

  const openDraft=id=>{
    const item=itemById(id);
    if(!item)return;
    const payload=item.payload||{};
    const slides=Array.isArray(payload.draft_slides)?payload.draft_slides:[];
    const sources=Array.isArray(payload.draft_sources)?payload.draft_sources:[];
    const reviewPoints=Array.isArray(payload.draft_review_points)?payload.draft_review_points:[];
    const queued=statusFor(item).kind!=='draft';
    const modal=document.createElement('div');
    modal.className='fp-draft-modal';
    modal.dataset.fpModal='1';
    modal.innerHTML='<div class="fp-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-draft-title">'
      +'<header><div><small>FPカルーセル原稿</small><h3 id="fp-draft-title">'+escDraft(payload.draft_cover||item.title||'原稿案')+'</h3></div><button class="push-button fp-close-draft" aria-label="閉じる">閉じる</button></header>'
      +'<main>'
      +'<section class="fp-draft-cover"><small>表紙案</small><b>'+escDraft(payload.draft_cover||item.title||'')+'</b></section>'
      +'<div class="fp-draft-slides">'+slides.map(slideHtml).join('')+'</div>'
      +(reviewPoints.length?'<section class="fp-draft-notes"><h4>公開前の確認点</h4><ul>'+reviewPoints.map(point=>'<li>'+escDraft(typeof point==='string'?point:(point?.text||point?.note||JSON.stringify(point)))+'</li>').join('')+'</ul></section>':'')
      +(sources.length?'<section class="fp-draft-sources"><h4>出典</h4><ol>'+sources.map(sourceHtml).join('')+'</ol></section>':'')
      +'</main><footer><button class="push-button fp-close-draft">原稿一覧へ戻る</button><button class="push-button fp-request-images" data-fp-images="'+escDraft(item.id)+'" '+(queued?'disabled':'')+'>'+(queued?'画像化を依頼済み':'この原稿で画像化')+'</button></footer>'
      +'</div>';
    document.body.appendChild(modal);
    document.body.classList.add('fp-modal-open');
    modal.querySelector('.fp-close-draft')?.focus();
  };

  const closeDraft=()=>{
    document.querySelector('[data-fp-modal]')?.remove();
    document.body.classList.remove('fp-modal-open');
  };

  const requestImages=async(id,button)=>{
    const item=itemById(id);
    if(!item||button.disabled)return;
    button.disabled=true;
    button.textContent='画像化を受付中…';
    setStatus('画像制作キューへ送っています...',true);
    try{
      const data=await request({
        method:'PATCH',headers:headers(),
        body:JSON.stringify({
          entityType:TYPE,entityId:String(item.id),stage:'execution',status:'done',
          judgmentSeed:'pass',note:'画像化待ち（司令塔で原稿承認済み）'
        })
      });
      states.set(String(item.id),data.state);
      renderActions();
      document.querySelectorAll('[data-fp-images="'+CSS.escape(String(item.id))+'"]').forEach(el=>{
        el.disabled=true;el.textContent='画像化を依頼済み';
      });
      setStatus('画像制作待ち');
      toast('画像制作キューへ送りました','good');
    }catch(error){
      button.disabled=false;
      button.textContent='この原稿で画像化';
      setStatus('保存エラー');
      toast(error.message||'画像化を依頼できませんでした','bad');
    }
  };

  document.addEventListener('click',event=>{
    const open=event.target.closest?.('[data-fp-open]');
    if(open){event.preventDefault();openDraft(open.dataset.fpOpen);return}
    const close=event.target.closest?.('.fp-close-draft');
    if(close){event.preventDefault();closeDraft();return}
    if(event.target.classList?.contains('fp-draft-modal')){closeDraft();return}
    const imageButton=event.target.closest?.('[data-fp-images]');
    if(imageButton){event.preventDefault();requestImages(imageButton.dataset.fpImages,imageButton)}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('[data-fp-modal]'))closeDraft()});

  const previousRender=renderList;
  renderList=()=>{previousRender();setTimeout(ensureStates,0)};

  const style=document.createElement('style');
  style.textContent=`
    .fp-draft-actions{margin-top:8px;padding:8px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080}.fp-draft-status{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px}.fp-draft-status b{color:#000080}.fp-draft-status span{font-size:11px;color:#444}.fp-draft-buttons{display:flex;gap:7px;flex-wrap:wrap}.fp-request-images{font-weight:900;background:#fff3a8}.fp-request-images:disabled{background:#ddd;color:#555}
    .fp-modal-open{overflow:hidden}.fp-draft-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:16px}.fp-draft-dialog{width:min(920px,100%);max-height:92vh;display:flex;flex-direction:column;background:#c0c0c0;color:#111;border:3px solid;border-color:#fff #111 #111 #fff;box-shadow:8px 8px 0 rgba(0,0,0,.35)}.fp-draft-dialog>header,.fp-draft-dialog>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px}.fp-draft-dialog>header{background:#000080;color:#fff}.fp-draft-dialog h3{margin:2px 0 0;font-size:18px}.fp-draft-dialog>main{overflow:auto;padding:12px}.fp-draft-dialog>footer{border-top:1px solid #777;background:#d4d0c8}.fp-draft-cover{padding:18px;background:#f8f0dd;border:2px solid #263d57;text-align:center}.fp-draft-cover small{display:block;color:#555}.fp-draft-cover b{display:block;margin-top:7px;font-size:24px;line-height:1.45}.fp-draft-slides{display:grid;gap:8px;margin-top:10px}.fp-draft-slide{display:grid;grid-template-columns:42px 1fr;background:#fff;border:1px solid #777}.fp-draft-slide>div{display:grid;place-items:center;background:#16324f;color:#fff;font-weight:900}.fp-draft-slide section{padding:9px 11px}.fp-draft-slide h4,.fp-draft-slide p{margin:0}.fp-draft-slide p{margin-top:5px;line-height:1.6;white-space:normal}.fp-draft-notes,.fp-draft-sources{margin-top:10px;padding:10px 12px;background:#fff6bf;border:1px solid #9a873a}.fp-draft-sources{background:#edf7ff;border-color:#55728a}.fp-draft-notes h4,.fp-draft-sources h4{margin:0 0 6px}.fp-draft-notes ul,.fp-draft-sources ol{margin:0;padding-left:22px}.fp-draft-sources li{margin:4px 0}.fp-draft-sources small{display:block;color:#555}
    @media(max-width:700px){.fp-draft-modal{padding:0}.fp-draft-dialog{width:100%;height:100dvh;max-height:none;border-width:0}.fp-draft-dialog>header{position:sticky;top:0}.fp-draft-dialog h3{font-size:15px}.fp-draft-cover b{font-size:20px}.fp-draft-dialog>footer{position:sticky;bottom:0;flex-wrap:wrap}.fp-draft-dialog>footer .push-button{flex:1}.fp-draft-buttons .push-button{min-height:38px;flex:1}.fp-draft-slide{grid-template-columns:34px 1fr}}
  `;
  document.head.appendChild(style);
  setTimeout(ensureStates,0);
})();
