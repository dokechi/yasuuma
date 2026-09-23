/* Chat-only editorial review and career lane. Existing Work/FP workflows are not rewritten. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CCChatEditorial = api; api.install(root); }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const VERSION = 'chat-editorial-v1-20260918';
  const CAREER = '6aaca7d36874819181caec8ba014556e';
  const HOME = '6aa9edd177fc8191a1e4b665930ee071';
  const arr = v => Array.isArray(v) ? v : [];
  const str = v => v == null ? '' : String(v);
  const esc = v => str(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function payload(row) { try { return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload || {}; } catch (_) { return {}; } }
  function taskId(row) { const p = payload(row); return row.taskId || row.task_id || p.logical_task_id || p.source_task_id || (str(row.id).match(/(?:^|:)task:([^:]+):/) || [])[1] || ''; }
  function isChat(row) { const p = payload(row); if (p.execution_source === 'work' || p.execution_channel === 'work') return false; return p.execution_source === 'chat' || p.execution_channel === 'chat' || [HOME,CAREER].includes(taskId(row)); }
  function lane(row) { const p = payload(row); if (!isChat(row) || p.result_kind === 'run_summary') return ''; if ((p.category === 'career_large' || p.content_type === 'career_post_candidate') && taskId(row) === CAREER) return 'career'; if (p.category === 'house_living' || p.content_type === 'house_post_candidate') return 'house'; return ''; }
  function applies(row) { return Boolean(lane(row)) && payload(row).editor_contract_version === VERSION; }
  function safeUrl(v) { try { const u = new URL(str(v)); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
  function threadKey(v) { try { const u=new URL(str(v)); const m=u.hostname==='girlschannel.net' && u.pathname.match(/^\/topics\/(?:amp\/)?(\d+)/); return m ? 'girlschannel:'+m[1] : ''; } catch (_) { return ''; } }
  const link = (v, label) => safeUrl(v) ? '<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(v))+'">'+esc(label)+'</a>' : esc(label);
  const LEAK = /ガ[ー]?ルズ[ちチ]ゃんねる|ガールズチャンネル|ガルちゃん|がるちゃん|girlschannel|掲示板|コメント(?:では|欄|番号|[ 　]*[0-9０-９])/i;
  function publicPackage(row) {
    const p = payload(row);
    const pick = (v, keys) => Object.fromEntries(keys.filter(k => v && v[k] != null).map(k => [k,v[k]]));
    const out = {
      post_title:p.post_title || p.draft_cover || row.title || '', caption:p.caption || '',
      draft_slides:arr(p.draft_slides).map(s => pick(s,['page','role','teaser','headline','body','emphasis','visual_mode','visual','source_refs','screenshot_request_id'])),
      draft_sources:arr(p.draft_sources).map(s => pick(s,['id','label','title','url','claim','note','checked_at'])),
      screenshot_requests:arr(p.screenshot_requests).map(s => pick(s,['id','url','label','capture_range','purpose','slide_no','required'])),
      production_spec:pick(p.production_spec,['size','ratio','page_numbers','next_page_cue','individual_images']),
      design:pick(p,['design_direction','color_palette','cover_mode']),
      screenshot_decisions:Object.fromEntries(Object.entries(p.screenshot_decisions||{}).filter(([,v])=>['assistant','user'].includes(v)))
    };
    if (LEAK.test(JSON.stringify(out))) throw new Error('公開用データに内部調査情報が残っています。原稿側で分離してください。');
    for (const s of out.draft_sources) if (!safeUrl(s.url)) throw new Error('一次情報URLを確認してください。');
    for (const s of out.screenshot_requests) if (!safeUrl(s.url)) throw new Error('素材URLを確認してください。');
    return out;
  }
  function issues(row) {
    const p = payload(row), result = [], add = (ok,text) => { if (!ok) result.push(text); };
    add(applies(row),'Chat編集契約の版を確認');
    const threads = arr(p.research_threads);
    add(new Set(threads.map(t => threadKey(t.url)).filter(Boolean)).size >= 2,'別トピック2本の需要根拠');
    add(threads.length >= 2 && threads.every(t => t.checked_at && t.checked_scope && arr(t.comments).some(c => c.comment_no != null && c.summary && safeUrl(c.direct_url))),'実読範囲とコメントへの追跡');
    add(p.demand_evidence && p.demand_evidence.verdict === 'strong','中心疑問の需要strong');
    add(Number(row.score) >= 80,'S/A評価80点以上');
    const slides = arr(p.draft_slides), reflections = arr(p.page_reflections);
    const adaptive = p.generation_version === 'adaptive-carousel-v1-20260923' || p.design_version === 'adaptive-visual-v1' || p.adaptive_design?.mode === 'adaptive';
    add((adaptive ? slides.length >= 1 : (slides.length >= 6 && slides.length <= 8)) && slides.every((s,i)=>s.page===i+1 && s.headline && s.body), adaptive ? '完成原稿・ページ順' : '完成原稿6〜8枚・ページ順');
    const sourceIds=new Set(arr(p.draft_sources).map(s=>s.id));
    add(slides.every(s=>arr(s.source_refs).every(id=>sourceIds.has(id))),'各ページの一次情報参照');
    add(slides.every(s => reflections.some(r => r.page === s.page && r.origin && r.extracted && r.transformed)),'全ページの反映表');
    add(p.synthesis && p.synthesis.derived_question && p.synthesis.connection,'2本をつなぐ一つの問い');
    add(['what','where','check','decision'].every(k => p.executable_action && str(p.executable_action[k]).trim()),'場所・項目・判断が分かる小さな一手');
    const er = p.editorial_review || {}, fr = p.final_review || {};
    add(er.version === VERSION && er.status === 'passed' && Array.isArray(er.unresolved_items) && er.unresolved_items.length === 0 && ['two_threads','source_trace','public_separation','primary_alignment','practical_options','executable_action','cross_page_consistency','voice'].every(k => er.checks && er.checks[k] === 'passed'),'編集基準の最終照合');
    add(fr.status === 'passed' && fr.draft_revision && fr.reviewed_revision === fr.draft_revision && (!p.draft_revision || p.draft_revision===fr.draft_revision) && Array.isArray(fr.unresolved_items) && !fr.unresolved_items.length,'現行版の原稿・根拠照合');
    add(p.draft_status === 'ready','原稿ready');
    add(arr(p.draft_sources).length > 0,'主張を支える一次情報');
    try { publicPackage(row); } catch (e) { result.push(e.message); }
    return result;
  }
  function assetIssues(row) {
    const p = payload(row), result = [];
    if (p.image_ready === false || p.asset_status === 'awaiting_screenshot') result.push('画像素材の準備待ち');
    if (arr(p.screenshot_requests).some(s => s.required && !['fetched','provided','uploaded','verified'].includes(s.acquisition_status))) result.push('必須スクショの取得確認');
    return result;
  }
  function bundle(row) {
    const missing = issues(row).concat(assetIssues(row));
    if (missing.length) throw new Error(missing.join('／'));
    const p = publicPackage(row);
    return '以下の確定原稿・一次情報・素材で画像を作成してください。\n各ページは独立した別画像として、1枚目から順番にチャット内へ直接表示してください。コラージュ・一覧画像・リンクだけの納品は不可。指定された原稿・条件・デザインを変えず、実物スクショを捏造しない。\n\n'+
      '【タイトル】\n'+p.post_title+'\n\n'+p.draft_slides.map(s => '【'+s.page+'/'+p.draft_slides.length+'｜'+(s.teaser||'')+'】\n'+s.headline+'\n'+s.body+'\n強調：'+arr(s.emphasis).join('／')+'\n表現：'+(s.visual_mode||'')+'\n制作メモ：'+(s.visual||'')+'\n根拠：'+arr(s.source_refs).join(', ')).join('\n\n')+
      '\n\n【一次情報】\n'+p.draft_sources.map(s => [s.id,s.label||s.title,s.url,s.claim,s.note,s.checked_at].filter(Boolean).join('｜')).join('\n')+
      '\n\n【実物素材】\n'+p.screenshot_requests.map(s => [s.id,s.url,s.capture_range,'使用ページ '+s.slide_no,s.purpose].join('｜')).join('\n')+
      '\n\n【制作条件】\n'+JSON.stringify(p.production_spec)+'\n選択デザイン：'+JSON.stringify(p.design)+'\n素材取得担当：'+JSON.stringify(p.screenshot_decisions)+'\n\n【キャプション】\n'+p.caption;
  }
  function internalHtml(row) {
    const p = payload(row), missing = issues(row);
    return '<details class="cce-internal"><summary>内部確認：2本の需要・ページ別反映・次の一手</summary><p><b>'+ (missing.length ? '要確認：'+esc(missing.join('／')) : '保存された編集チェック：合格') +'</b></p><p>この欄は公開原稿・画像化コピーに含めません。反応数の未確認値は「未確認」と表示します。</p>'+arr(p.research_threads).map(t => '<section><h4>'+link(t.url,t.id+'：'+t.title)+'</h4><p>公開 '+esc(t.published_at||'未確認')+'／確認 '+esc(t.checked_at||'未確認')+'／総コメント '+esc(t.total_comments==null?'未確認':t.total_comments)+'</p><p>確認範囲：'+esc(t.checked_scope)+'</p>'+arr(t.comments).map(c=>'<p>'+link(c.direct_url,'#'+c.comment_no)+' '+esc(c.summary)+'（＋'+esc(c.plus==null?'未確認':c.plus)+'／−'+esc(c.minus==null?'未確認':c.minus)+'）</p>').join('')+'</section>').join('')+
      '<h4>2本から作った問い</h4><p>'+esc(p.synthesis && p.synthesis.derived_question)+'</p><p>'+esc(p.synthesis && p.synthesis.connection)+'</p><div class="cce-scroll"><table><thead><tr><th>頁</th><th>起点</th><th>何を拾ったか</th><th>公開文への変換</th><th>一次情報・追加調査</th></tr></thead><tbody>'+arr(p.page_reflections).map(r=>'<tr><td>'+esc(r.page)+'</td><td>'+esc(r.origin)+'<br>'+esc(arr(r.thread_refs).map(t=>t.thread_id+' #'+t.comment_no).join('、'))+'</td><td>'+esc(r.extracted)+'</td><td>'+esc(r.transformed)+'</td><td>'+esc(arr(r.primary_source_refs).join('、'))+'<br>'+esc(r.extension||r.note||'')+'</td></tr>').join('')+'</tbody></table></div><h4>読後の小さな一手</h4><dl>'+Object.entries({what:'すること',where:'見る場所',check:'確認項目',decision:'結果で決めること',barrier:'実行条件',fallback:'難しい場合'}).map(([k,label])=>'<dt>'+label+'</dt><dd>'+esc(p.executable_action && p.executable_action[k] || '未記録')+'</dd>').join('')+'</dl></details>';
  }
  function unwrap(data) { for (const v of [data,data && data.items,data && data.rows,data && data.signals,data && data.data]) if (Array.isArray(v)) return v; return []; }
  function install(w) {
    // This file is appended to the existing document-write boot loader, after the house pipeline.
    if (!w.document || w.__ccChatEditorialInstalled || typeof app === 'undefined' || typeof API === 'undefined' || typeof authHeaders !== 'function' || typeof load !== 'function' || typeof cardHtml !== 'function') return false;
    const d = w.document, tabs = d.getElementById('viewTabs');
    if (!tabs) return false;
    w.__ccChatEditorialInstalled = true;
    const rows = new Map();
    const button = d.createElement('button');
    button.id='careerDraftViewBtn';button.type='button';button.className='push-button small';button.dataset.view='career';button.textContent='上場';button.setAttribute('aria-label','上場企業のChat原稿');
    const saved=tabs.querySelector('[data-view="saved"]');
    if(saved)tabs.insertBefore(button,saved);else tabs.appendChild(button);
    const addLauncher=selector=>{
      const host=d.querySelector(selector);
      if(!host||host.querySelector('[data-cce-career]'))return;
      const launch=d.createElement('button');
      launch.type='button';launch.className='home-launcher-card';launch.dataset.cceCareer='1';
      launch.innerHTML='<b>上場</b><span>上場企業の原稿</span>';
      const ai=host.querySelector('[data-home-domain="ai"]');
      if(ai)host.insertBefore(launch,ai);else host.appendChild(launch);
    };
    addLauncher('#homeLauncher .home-launcher-grid');
    addLauncher('#ccMore .home-launcher-grid');
    const style=d.createElement('style');style.textContent='.cce-tools{margin:12px 0}.cce-internal{margin:12px 0;padding:12px;border:1px solid #9ca3af;background:#f8fafc}.cce-internal p{white-space:pre-wrap}.cce-scroll{overflow:auto}.cce-internal table{border-collapse:collapse;min-width:680px;width:100%}.cce-internal th,.cce-internal td{padding:8px;border:1px solid #cbd5e1;text-align:left;vertical-align:top;white-space:pre-wrap}.cce-internal dd{white-space:pre-wrap}.cce-dialog{width:min(960px,92vw);max-height:90vh;overflow:auto;background:#fff;color:#111;padding:20px}.cce-dialog pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.cce-dialog textarea{width:98%;height:55vh}.cce-dialog::backdrop{background:#0008}#careerDraftViewBtn{min-width:70px;background:#e6ebf5}#homeLauncher [data-cce-career],#ccMore [data-cce-career]{background:#e8e6f5}';d.head.appendChild(style);
    const oldCard=cardHtml;
    cardHtml=function(row,index){
      let html=oldCard.apply(this,arguments);
      if(!applies(row) && lane(row)!=='career')return html;
      rows.set(str(row.id),row);
      const count=issues(row).length;
      const extra='<div class="cce-tools"><b>Chat編集契約：'+(count?'確認 '+count+'項目':'照合済み')+'</b> <button class="push-button small" type="button" data-cce-open="'+esc(row.id)+'">原稿・内部確認</button></div>'+internalHtml(row)+(lane(row)==='career' && (!row.reviewState || row.reviewState==='new')?'<div class="actions"><button class="push-button" data-id="'+esc(row.id)+'" data-action="read">既読</button><button class="push-button" data-id="'+esc(row.id)+'" data-action="accepted">採用</button><button class="push-button" data-id="'+esc(row.id)+'" data-action="rejected">却下</button></div>':'');
      return html.replace(/<\/article>\s*$/,extra+'</article>');
    };
    function dialog(row){
      const p=payload(row),el=d.createElement('dialog');el.className='cce-dialog';
      el.innerHTML='<button class="push-button" data-close>閉じる</button><h2>'+esc(p.post_title||row.title)+'</h2><h3>公開用原稿</h3>'+arr(p.draft_slides).map(s=>'<section><h4>'+esc(s.page)+'／'+arr(p.draft_slides).length+' '+esc(s.teaser)+'</h4><pre>'+esc(s.headline)+'\n\n'+esc(s.body)+'</pre></section>').join('')+'<h3>キャプション</h3><pre>'+esc(p.caption)+'</pre><h3>一次情報</h3>'+arr(p.draft_sources).map(s=>'<p>'+link(s.url,s.label||s.title)+' '+esc(s.claim)+'</p>').join('')+'<button class="push-button" data-copy>公開原稿だけを画像化用にコピー</button><p data-feedback role="status"></p>'+internalHtml(row);
      d.body.appendChild(el);el.querySelector('[data-close]').onclick=()=>{el.close();el.remove();};el.addEventListener('cancel',()=>el.remove());
      el.querySelector('[data-copy]').onclick=async()=>{const feedback=el.querySelector('[data-feedback]');try{const text=bundle(row);try{await w.navigator.clipboard.writeText(text);feedback.textContent='公開用コピーを作成しました。内部調査情報は含めていません。';}catch(_){feedback.textContent='クリップボードを使えないため、下の公開用テキストを選択してコピーしてください。';const area=d.createElement('textarea');area.readOnly=true;area.value=text;el.appendChild(area);area.focus();area.select();}}catch(e){feedback.textContent='コピー保留：'+e.message;}};
      el.showModal();
    }
    d.addEventListener('click',e=>{const launch=e.target.closest&&e.target.closest('[data-cce-career]');if(launch){e.preventDefault();load('career');return;}const b=e.target.closest && e.target.closest('[data-cce-open]');if(b){const row=rows.get(b.dataset.cceOpen);if(row)dialog(row);}});
    const setText=(id,value)=>{const el=d.getElementById(id);if(el)el.textContent=value;};
    async function loadCareer(){
      if(app.busy)return;app.busy=true;app.view='career';app.domain='all';app.rank='all';
      w.CCX?.hide?.();w.CCReddit?.hide?.();if(w.CCHome)w.CCHome.active=false;
      d.getElementById('mainWindow')?.classList.remove('home-active');d.body.classList.remove('home-mode','x-mode');
      for(const id of ['commandHome','sourcingHub','domainTabs']){const el=d.getElementById(id);if(el)el.hidden=true;}
      const regular=d.getElementById('regularHub');if(regular)regular.hidden=false;
      d.getElementById('homeViewBtn')?.classList.remove('selected');
      d.getElementById('homeViewBtn')?.setAttribute('aria-pressed','false');
      setSelected('#viewTabs button[data-view]','view','career');const refresh=d.getElementById('refreshBtn');if(refresh)refresh.disabled=true;
      setStatus('上場企業のChat原稿を読み込み中...',true);showLoading();
      try{
        const response=await w.fetch(API+'?view=history',{cache:'no-store',headers:authHeaders()});
        if(response.status===401){if(typeof authExpired==='function')authExpired();throw new Error('認証の有効期限が切れました');}
        const data=await response.json();
        if(!response.ok || data.ok===false)throw new Error(data.error||('HTTP '+response.status));
        if(app.view!=='career')return;
        const all=unwrap(data);app.data=data;app.items=all.filter(r=>lane(r)==='career' && arr(payload(r).draft_slides).length).sort((a,b)=>Date.parse(b.updatedAt||b.lastSeen||0)-Date.parse(a.updatedAt||a.lastSeen||0));
        renderList();setText('listCaption','上場｜Chat原稿');setText('visibleCount',app.items.length+'件');
        const filter=d.getElementById('listFilter');if(filter){filter.hidden=false;filter.textContent='2本の需要 → 公式根拠 → 今日できる1件・1問。'+(Number(data.storedCount)>all.length?'一覧はAPI取得範囲内です。古い原稿は「タスク結果」でも確認してください。':'');}
        if(!app.items.length)d.getElementById('list').innerHTML='<div class="empty"><b>上場の保存済みChat原稿はまだありません。</b><p>新規レーンです。実際の調査で合格した原稿が保存されると、ここに表示されます。</p></div>';
        setText('kpiLabelCount','上場の原稿');setText('kpiCount',app.items.length+'件');setText('kpiLabelS','編集照合済み');setText('kpiS',app.items.filter(r=>!issues(r).length).length+'件');setText('kpiLabelImpact','採用済み');setText('kpiImpact',app.items.filter(r=>r.reviewState==='accepted').length+'件');setText('kpiLabelStored','要確認');setText('kpiStored',app.items.filter(r=>issues(r).length).length+'件');setStatus('準備完了｜上場の原稿');
      }catch(e){d.getElementById('list').innerHTML='<div class="empty">取得失敗：'+esc(e.message)+'<br>更新ボタンから再試行してください。</div>';setStatus('通信エラー');}finally{app.busy=false;if(refresh)refresh.disabled=false;}
    }
    const previousLoad=load;
    load=function(view=app.view){button.setAttribute('aria-pressed',view==='career'?'true':'false');if(view==='career')return loadCareer();return previousLoad.apply(this,arguments);};
    // Existing delegated view-tab handler calls the new load branch; do not add a duplicate handler.
    return true;
  }
  return {VERSION,CAREER,HOME,payload,taskId,isChat,lane,applies,safeUrl,threadKey,esc,publicPackage,issues,assetIssues,bundle,internalHtml,unwrap,install};
});