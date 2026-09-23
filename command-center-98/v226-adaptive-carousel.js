/* Adaptive carousel contract v1. Fixed palettes/templates are not required for new adaptive packages. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCAdaptiveCarousel) return;
  root.CCAdaptiveCarousel = api;
  api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const VERSION = 'adaptive-carousel-v1-20260923';
  const RESEARCH_VERSION = 'community-14d-v1';
  const DESIGN_VERSION = 'adaptive-visual-v1';
  const LEGACY_MONEY_VERSION = 'adaptive-carousel-v1-20260923-money-chat';
  const LEGACY_MONEY_RESEARCH_VERSION = 'community-14d-money-chat-v1';
  const LEGACY_MONEY_DESIGN_VERSION = 'adaptive-visual-money-chat-v1';
  const TASK_IDS = {
    money:'6a9e5826d4888191a4d82a643e6d5adf',
    house:'6aa77eb5ce7881919d8dc62554833b60',
    overseas:'6a8d6888e41881919edb9fb44422a622',
    career:'6aaca7d36874819181caec8ba014556e'
  };
  const MONEY_CHAT_TASK_ID = '6aa9ee1043388191a2eac3bb2702092a';
  const COMMUNITY_LANES = new Set(['money','house','career']);
  const WINDOW_DAYS = 14;
  const MIN_TOPICS = 2;
  const MIN_COMMENTS = 200;
  const RETRO_API = 'https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-retro-api';
  const arr = value => Array.isArray(value) ? value : [];
  const str = value => String(value ?? '').trim();
  const esc = value => str(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u = new URL(str(value)); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  const payloadOf = value => value && value.payload && typeof value.payload === 'object' ? value.payload : (value && typeof value === 'object' ? value : {});
  const hasAdaptiveMarkers = value => {
    const p = payloadOf(value);
    return [VERSION,LEGACY_MONEY_VERSION].includes(str(p.generation_version))
      || [DESIGN_VERSION,LEGACY_MONEY_DESIGN_VERSION].includes(str(p.design_version))
      || str(p.adaptive_design?.mode) === 'adaptive';
  };
  const lane = value => {
    const p = payloadOf(value);
    const ids=[p.logical_task_id,p.source_task_id,p.task_id,p.taskId].map(str);
    for(const [name,id] of Object.entries(TASK_IDS)) if(ids.includes(id)) return name;
    const scope=str(p.adaptive_scope).toLowerCase();
    if(['money','money_chat'].includes(scope)) return 'money';
    if(['house','house_chat'].includes(scope)) return 'house';
    if(['overseas','overseas_chat','cheaper_in_japan'].includes(scope)) return 'overseas';
    if(['career','career_large','listed','listed_company'].includes(scope)) return 'career';
    const runner=str(p.runner_key);
    if(runner==='chat-money-v1') return 'money';
    if(runner==='chat-house-v1') return 'house';
    if(runner==='chat-overseas-v1') return 'overseas';
    const type=str(p.content_type);
    if(type==='fp_post_candidate') return 'money';
    if(type==='house_post_candidate') return 'house';
    if(type==='career_post_candidate') return 'career';
    if(['cheaper_in_japan','reddit_price_gap','overseas_price_gap'].includes(type)) return 'overseas';
    const category=str(p.category);
    if(category==='fp_psychology') return 'money';
    if(category==='career_large') return 'career';
    return '';
  };
  const moneyChatScope = value => {
    const p = payloadOf(value);
    const channel=str(p.execution_source || p.execution_channel).toLowerCase();
    if (channel !== 'chat') return false;
    const ids=[p.logical_task_id,p.source_task_id,p.task_id,p.taskId].map(str);
    const scope=str(p.adaptive_scope).toLowerCase();
    const runner=str(p.runner_key);
    return ids.includes(MONEY_CHAT_TASK_ID) || ids.includes(TASK_IDS.money) || ['money','money_chat'].includes(scope) || runner==='chat-money-v1';
  };
  const adaptive = value => hasAdaptiveMarkers(value) && moneyChatScope(value);
  const communityRequired = value => adaptive(value) && lane(value) === 'money';
  const girlsCommentInfo = value => {
    try {
      const u = new URL(str(value));
      if (!/girlschannel\.net$/i.test(u.hostname)) return {topicKey:'',commentNo:''};
      let match=u.pathname.match(/^\/comment\/(\d+)\/(\d+)\/?$/);
      if (match) return {topicKey:'girlschannel:'+match[1],commentNo:match[2]};
      match=u.pathname.match(/^\/topics\/(?:amp\/)?(\d+)/);
      if (!match) return {topicKey:'',commentNo:''};
      const hashMatch=str(u.hash).match(/(?:comment[-_=]?|^#)(\d+)/i);
      const queryMatch=str(u.searchParams?.get?.('comment')).match(/(\d+)/);
      return {topicKey:'girlschannel:'+match[1],commentNo:(hashMatch?.[1]||queryMatch?.[1]||'')};
    } catch (_) { return {topicKey:'',commentNo:''}; }
  };
  const girlsTopicKey = value => girlsCommentInfo(value).topicKey;
  const millis = value => { const n = Date.parse(str(value)); return Number.isFinite(n) ? n : 0; };
  const researchStart = p => p.research_started_at || p.execution_audit?.started_at || p.started_at || p.source_checked_at || '';

  function strictCommunityIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p) || !communityRequired(p)) return issues;
    const research = p.community_research || {};
    if (research.required !== true) issues.push('お金Chatではガルちゃん需要調査が必須');
    if (str(research.status) !== 'strict') issues.push('ガルちゃん需要調査がstrict合格ではない');
    if (Number(research.window_days) !== WINDOW_DAYS) issues.push(`ガルちゃんstrict期間は${WINDOW_DAYS}日で保存する`);
    if (Number(research.min_topics) !== MIN_TOPICS) issues.push(`ガルちゃんstrictは別トピック${MIN_TOPICS}本以上`);
    if (Number(research.min_comments_per_topic) !== MIN_COMMENTS) issues.push(`ガルちゃんstrictは各トピック${MIN_COMMENTS}コメント以上`);
    const start = millis(researchStart(p));
    if (!start) issues.push('需要調査の開始日時が未保存');
    const byKey = new Map();
    for (const thread of arr(p.research_threads)) {
      const key = girlsTopicKey(thread?.url);
      if (key && !byKey.has(key)) byKey.set(key, thread);
    }
    const threads = [...byKey.values()];
    if (threads.length < MIN_TOPICS) issues.push(`ガルちゃんの別トピック${MIN_TOPICS}本が未確認`);
    const evaluated = threads.map(thread => {
      const rowIssues=[], title=str(thread?.title)||str(thread?.url)||'トピック';
      if (thread?.related_to_question !== true) rowIssues.push(`${title}: 中心疑問との関連確認が未保存`);
      const published=millis(thread?.published_at);
      if (!published) rowIssues.push(`${title}: 公開日時が未確認`);
      else if (start && (published > start || start - published > WINDOW_DAYS*86400000)) rowIssues.push(`${title}: 調査開始時点で直近${WINDOW_DAYS}日外`);
      if (!Number.isFinite(Number(thread?.total_comments))) rowIssues.push(`${title}: 総コメント数が未確認`);
      else if (Number(thread.total_comments) < MIN_COMMENTS) rowIssues.push(`${title}: 総コメント数${MIN_COMMENTS}件未満`);
      if (!str(thread?.checked_at) || !str(thread?.checked_scope)) rowIssues.push(`${title}: 実読範囲または確認日時が未保存`);
      const trackable=arr(thread?.comments).filter(c=>c?.comment_no!=null&&str(c?.summary));
      if (!trackable.length) rowIssues.push(`${title}: 追跡可能な実コメントが未保存`);
      if (!trackable.some(c=>safeUrl(c?.direct_url))) rowIssues.push(`${title}: 実コメントの直URLが未保存`);
      const topicKey=girlsTopicKey(thread?.url);
      trackable.forEach(c=>{
        const directInfo=girlsCommentInfo(c?.direct_url), directKey=directInfo.topicKey;
        if (!directKey) rowIssues.push(`${title}: コメント${c.comment_no}の直URLがGirlsChannelコメントURLではない`);
        else if (topicKey && directKey !== topicKey) rowIssues.push(`${title}: コメント${c.comment_no}の直URLが別トピックを指している`);
        if (directInfo.commentNo && String(c.comment_no) !== directInfo.commentNo) rowIssues.push(`${title}: コメント${c.comment_no}の直URLが別コメント番号を指している`);
        if (!Object.prototype.hasOwnProperty.call(c,'plus')) rowIssues.push(`${title}: コメント${c.comment_no}のplusは未取得ならnullで保存する`);
        if (!Object.prototype.hasOwnProperty.call(c,'minus')) rowIssues.push(`${title}: コメント${c.comment_no}のminusは未取得ならnullで保存する`);
      });
      return {thread,issues:rowIssues};
    });
    const valid=evaluated.filter(row=>row.issues.length===0);
    if(valid.length<MIN_TOPICS){
      issues.push(`直近${WINDOW_DAYS}日・各${MIN_COMMENTS}件以上・実読済みの別トピック${MIN_TOPICS}本が揃っていない`);
      evaluated.forEach(row=>issues.push(...row.issues));
    }
    if (research.expanded === true || str(research.expanded_status)) issues.push('拡張調査をstrict合格として完成原稿に使用しない');
    return [...new Set(issues)];
  }

  function pageContractIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const slides = arr(p.draft_slides);
    if (!slides.length) return ['ページ別原稿が未保存'];
    if (!str(p.page_count_reason)) issues.push('ページ数の決定理由が未保存');
    const placeholder = /(TBD|TODO|ここに|仮枠|仮画像|ダミー|placeholder)/i;
    const allowedAssets = new Set(['user_photo','official_photo','primary_source_screenshot','verified_real_photo','generated_illustration','generated_photorealistic_image','simulation','diagram']);
    slides.forEach((slide, index) => {
      const page = Number(slide?.page) || index + 1;
      const c = slide?.page_contract || {};
      const requiredKeys = ['reader_question','answer','visual_subject','visual_type','evidence','calculation','required_assets','display_copy','source_refs','source_type','status'];
      const absent = requiredKeys.filter(key => !Object.prototype.hasOwnProperty.call(c,key) && !(key === 'source_refs' && Object.prototype.hasOwnProperty.call(slide,'source_refs')));
      if (absent.length) issues.push(`${page}ページ目の画面設計キーが不足: ${absent.join(', ')}`);
      const missingText = ['reader_question','answer','visual_subject','visual_type','display_copy','source_type','status'].filter(key => !str(c[key]));
      if (missingText.length) issues.push(`${page}ページ目の画面設計が不足: ${missingText.join(', ')}`);
      if (str(c.status) && str(c.status) !== 'ready') issues.push(`${page}ページ目がreadyではない`);
      const refs = arr(c.source_refs || slide?.source_refs);
      if (!refs.length && !str(c.evidence_note)) issues.push(`${page}ページ目の根拠対応が未保存`);
      if (!Array.isArray(c.required_assets)) issues.push(`${page}ページ目のrequired_assetsは配列で保存する`);
      else c.required_assets.forEach((asset,assetIndex) => {
        if (!asset || typeof asset !== 'object' || !allowedAssets.has(str(asset.asset_type))) {
          issues.push(`${page}ページ目の素材${assetIndex+1}に証拠種別が未保存`);
          return;
        }
        if (asset.is_evidence === true && ['generated_illustration','generated_photorealistic_image','simulation','diagram'].includes(str(asset.asset_type))) {
          issues.push(`${page}ページ目の生成・説明用素材を実物証拠として扱わない`);
        }
      });
      const calc = c.calculation;
      if (calc && typeof calc === 'object' && Object.keys(calc).length) {
        const calcMissing = ['inputs','formula','unit','result','rounding'].filter(key => !Object.prototype.hasOwnProperty.call(calc,key) || calc[key] === '' || calc[key] == null);
        if (calcMissing.length) issues.push(`${page}ページ目の計算条件が不足: ${calcMissing.join(', ')}`);
      }
      if (c.direct_quote === true) {
        const quote = c.quote_source || {};
        if (!str(quote.source_ref) || !str(quote.quote_text) || (!str(quote.identifier) && quote.comment_no == null)) {
          issues.push(`${page}ページ目の直接引用に出典・識別情報が不足`);
        }
        if (!str(quote.public_attribution)) issues.push(`${page}ページ目の直接引用に公開用出典表記が未保存`);
      }
      const visible = [slide?.headline,slide?.body,c.display_copy].map(str).join(' ');
      if (str(p.draft_status) === 'ready' && placeholder.test(visible)) issues.push(`${page}ページ目に仮枠・プレースホルダーが残っている`);
    });
    return [...new Set(issues)];
  }

  function lockIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const lock = p.content_lock || {};
    const currentRevision=str(p.draft_revision), lockedRevision=str(lock.draft_revision);
    if (lock.locked !== true) issues.push('確定原稿がLOCKされていない');
    if (!lockedRevision || !currentRevision) issues.push('LOCK対象の原稿版が未保存');
    else if (lockedRevision !== currentRevision) issues.push('LOCK後に原稿版が変更されている');
    if (!str(lock.locked_at)) issues.push('原稿LOCK日時が未保存');
    if (str(lock.content_hash) && str(p.content_hash) && str(lock.content_hash) !== str(p.content_hash)) issues.push('LOCK後に原稿内容ハッシュが変わっている');
    return [...new Set(issues)];
  }

  function finalReviewIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const review=p.final_review || {};
    if (str(review.status) !== 'passed') issues.push('最終照合がpassedではない');
    if (!str(review.checked_revision)) issues.push('最終照合対象の原稿版が未保存');
    else if (str(p.draft_revision) && str(review.checked_revision) !== str(p.draft_revision)) issues.push('最終照合後に原稿版が変更されている');
    if (arr(review.unresolved_items).length) issues.push('最終照合に未解決事項が残っている');
    if (!Array.isArray(p.missing_evidence)) issues.push('missing_evidenceが配列で保存されていない');
    else if (p.missing_evidence.length) issues.push('未解決の根拠不足が残っている');
    return [...new Set(issues)];
  }

  function designIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const design = p.adaptive_design || {};
    if (str(design.mode) !== 'adaptive') issues.push('適応型デザイン計画が未保存');
    if (!str(design.decision_basis || design.reason)) issues.push('デザイン判断理由が未保存');
    const usage = p.design_system_usage;
    if (usage && /^official_/.test(str(usage.usage_type))) {
      if (!safeUrl(usage.source_url)) issues.push('公式Design Systemの参照URLが未保存');
      const used = [...arr(usage.official_assets_used), ...arr(usage.components_used), ...arr(usage.tokens_used)];
      if (!used.length) issues.push('公式準拠で使用した部品・設定が未記録');
    }
    return issues;
  }

  function sourceIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const sources = arr(p.draft_sources);
    if (!sources.length) return ['一次情報一覧が未保存'];
    const sourceMap = new Map();
    sources.forEach((source,index) => {
      const id = str(source?.id);
      if (!id) issues.push(`出典${index+1}: idが未保存`);
      else sourceMap.set(id, source);
      if (!safeUrl(sourceUrl(source))) issues.push(`出典${index+1}: URLが未保存または不正`);
      if (!str(source?.source_type)) issues.push(`出典${index+1}: source_typeが未保存`);
      if (!str(source?.checked_at)) issues.push(`出典${index+1}: checked_atが未保存`);
    });
    arr(p.draft_slides).forEach((slide,index) => {
      const page = Number(slide?.page) || index + 1;
      const c = slide?.page_contract || {};
      const refs = arr(c.source_refs || slide?.source_refs).map(str).filter(Boolean);
      refs.forEach(ref => { if (!sourceMap.has(ref)) issues.push(`${page}ページ目: 不明なsource_ref ${ref}`); });
      if (c.direct_quote === true) {
        const quoteRef=str(c.quote_source?.source_ref);
        if (!quoteRef || !sourceMap.has(quoteRef)) issues.push(`${page}ページ目: 直接引用のsource_refがdraft_sourcesに存在しない`);
        const quoteText=str(c.quote_source?.quote_text).replace(/\s+/g,' ');
        const display=str(c.display_copy).replace(/\s+/g,' ');
        if (quoteText && !display.includes(quoteText)) issues.push(`${page}ページ目: 直接引用文がdisplay_copyに含まれていない`);
      }
      const used = refs.map(ref => sourceMap.get(ref)).filter(Boolean);
      const communityOnly = used.length && used.every(source => ['community','individual_experience'].includes(str(source?.source_type)));
      if (communityOnly && !['quote','community_voice'].includes(str(c.visual_type))) {
        issues.push(`${page}ページ目: UGC/個人体験だけを事実の根拠にしない`);
      }
    });
    return [...new Set(issues)];
  }

  function screenshotIssues(value) {
    const p = payloadOf(value), issues = [];
    if (!adaptive(p)) return issues;
    const decisions = p.screenshot_decisions || {};
    arr(p.screenshot_requests).forEach(row => {
      const decision = str(decisions[row?.id]);
      const allowed = row?.required ? ['assistant','user'] : ['assistant','user','skip'];
      if (!allowed.includes(decision)) issues.push(`${row?.label || 'スクショ'}の扱いを決める`);
    });
    return issues;
  }

  function quality(value, baseQuality) {
    const p = payloadOf(value);
    if (!adaptive(p)) return typeof baseQuality === 'function' ? baseQuality(value) : {ready:true,issues:[]};
    const base = typeof baseQuality === 'function' ? baseQuality(value) : {ready:true,issues:[]};
    const ignored = new Set(['ページ別原稿が不足']);
    const issues = arr(base?.issues).filter(issue => !ignored.has(str(issue)));
    issues.push(...strictCommunityIssues(p), ...pageContractIssues(p), ...sourceIssues(p), ...lockIssues(p), ...finalReviewIssues(p), ...designIssues(p));
    if (p.draft_status !== 'ready') issues.push('完成原稿が未確定');
    return {ready:[...new Set(issues)].length === 0, issues:[...new Set(issues)]};
  }

  function preflightIssues(value, base) {
    const p = payloadOf(value);
    if (!adaptive(p)) return typeof base === 'function' ? base(p) : [];
    return screenshotIssues(p);
  }

  const sourceUrl = source => typeof source === 'string' ? source : source?.url;
  const sourceLabel = (source, index) => typeof source === 'string' ? `一次情報 ${index+1}` : (source?.label || source?.title || `一次情報 ${index+1}`);
  const compactSource = (source, index) => [sourceLabel(source,index), sourceUrl(source), source?.claim, source?.checked_at].filter(Boolean).join('｜');
  const draftTitle = (item,p) => str(p.post_title || p.draft_title || p.draft_cover || item?.title);
  const draftCaption = p => str(p.caption || p.draft_caption || p.post_caption);

  function pageText(slide, index, total) {
    const c = slide?.page_contract || {}, quote=c.quote_source||{};
    return [
      `【${Number(slide?.page)||index+1}/${total}】`,
      '【画像に表示するLOCK済み文】',
      str(c.display_copy),
      c.direct_quote===true && str(quote.public_attribution) ? `出典表記: ${str(quote.public_attribution)}` : '',
      '【制作内部情報｜画像内に文字として載せない】',
      str(slide?.headline || slide?.title || slide?.heading) ? `legacy_headline: ${str(slide?.headline || slide?.title || slide?.heading)}` : '',
      str(slide?.body || slide?.text || slide?.copy) ? `legacy_body: ${str(slide?.body || slide?.text || slide?.copy)}` : '',
      `読者の疑問: ${str(c.reader_question)}`,
      `このページの答え: ${str(c.answer)}`,
      `見せる対象: ${str(c.visual_subject)}`,
      `表現: ${str(c.visual_type)}`,
      arr(c.required_assets).length ? `必要素材: ${arr(c.required_assets).map(x=>typeof x==='string'?x:(x?.label||x?.asset_type||JSON.stringify(x))).join('／')}` : '',
      str(c.evidence_note) ? `根拠メモ: ${str(c.evidence_note)}` : '',
      arr(c.source_refs || slide?.source_refs).length ? `source_refs: ${arr(c.source_refs || slide?.source_refs).join(', ')}` : '',
      c.direct_quote===true ? `引用source_ref: ${str(quote.source_ref)} / 識別: ${str(quote.identifier || quote.comment_no)}` : ''
    ].filter(Boolean).join('\n');
  }

  function designText(p) {
    const d = p.adaptive_design || {}, usage = p.design_system_usage || {};
    return [
      '・固定された3配色・完成テンプレートから選ばない。題材、数字、写真、一次資料、比較構造から最も自然な視覚設計を決める。',
      '・「きれいにする」より、内容が最も速く理解できることを優先する。意味のないグラデーション、角丸カード、アイコン、影、パステル、均等配置を足さない。',
      '・同一投稿内では文字階層、余白、ページ番号、出典、同じ意味の視覚表現を統一する。',
      str(d.decision_basis || d.reason) ? `・今回の判断理由: ${str(d.decision_basis || d.reason)}` : '',
      str(d.visual_language) ? `・今回の視覚言語: ${str(d.visual_language)}` : '',
      str(usage.usage_type) ? `・Design System利用区分: ${str(usage.usage_type)}` : '',
      safeUrl(usage.source_url) ? `・参照元: ${safeUrl(usage.source_url)}` : ''
    ].filter(Boolean);
  }

  function buildHandoff(item, baseBuilder) {
    const p = payloadOf(item);
    if (!adaptive(p)) return typeof baseBuilder === 'function' ? baseBuilder(item) : '';
    const q = quality(item, null), pf = screenshotIssues(p);
    const issues = [...q.issues, ...pf];
    if (issues.length) throw new Error('画像化保留: ' + [...new Set(issues)].join('／'));
    const slides = arr(p.draft_slides);
    const quoteRefs=new Set(slides.filter(slide=>slide?.page_contract?.direct_quote===true).flatMap(slide=>{
      const c=slide?.page_contract||{}, quote=c.quote_source||{};
      return [...arr(c.source_refs||slide?.source_refs),str(quote.source_ref)].map(str).filter(Boolean);
    }));
    const sources = arr(p.draft_sources).filter(source => {
      const community=['community','individual_experience'].includes(str(source?.source_type)) || /girlschannel|ガルちゃん|ガールズちゃんねる/i.test([sourceUrl(source),source?.label,source?.title].filter(Boolean).join(' '));
      return !community || quoteRefs.has(str(source?.id));
    });
    const lock = p.content_lock || {};
    return [
      '以下のLOCK済み確定原稿からカルーセル画像を作成してください。',
      '',
      '【原稿LOCK｜最優先】',
      `generation_version: ${str(p.generation_version || VERSION)}`,
      `draft_revision: ${str(lock.draft_revision || p.draft_revision)}`,
      `locked_at: ${str(lock.locked_at)}`,
      '・LOCK後の文章、数字、単位、条件、出典、引用文を画像生成側で要約・言い換え・削除・追加・丸め直ししない。',
      '・各ページで画像に文字として載せてよいのは「画像に表示するLOCK済み文」と、直接引用ページの「出典表記」だけ。reader_question / answer / visual_subject / visual_type / source_refs / legacy_headline / legacy_body 等の制作内部情報は描画しない。',
      '・文字が収まらない場合は勝手に原稿を変えず、layout_overflowとして該当ページを示して原稿・画面設計工程へ戻す。',
      '・画像化後、全ページをLOCK済み原稿と照合し、不一致が1つでもあれば完成扱いにしない。',
      '',
      '【適応型デザイン】',
      ...designText(p),
      '・実写写真・公式写真・一次資料スクショと、AI生成の写実画像・説明用再現を区別する。生成画像を証拠として扱わない。',
      '・比較／変化／分解／実演は思考補助であり、無理に型へ押し込まない。1ページ1現象を基本とする。',
      '',
      '【公開面】',
      '・需要調査元の媒体名、元URL、コメント番号、反応数を公開原稿へ勝手に追加しない。原文を直接引用するページだけ、保存済みの出典ルールに従う。',
      '・アフィリエイト、プロフィール誘導、販売文句を勝手に追加しない。',
      '',
      '【タイトル】', draftTitle(item,p), '',
      '【中心疑問】', str(p.question_lineage?.selected_question), '',
      '【ページ数の理由】', str(p.page_count_reason), '',
      '【ページ別のLOCK済み原稿・画面設計】', slides.map((s,i)=>pageText(s,i,slides.length)).join('\n\n'), '',
      '【スクショ素材】', arr(p.screenshot_requests).length ? arr(p.screenshot_requests).map(row=>[
        row?.id,row?.label,row?.url,row?.capture_range||row?.capture_area,row?.purpose,row?.slide_no?`使用ページ:${row.slide_no}`:'',`担当:${str(p.screenshot_decisions?.[row?.id])}`
      ].filter(Boolean).join('｜')).join('\n') : 'スクショ素材なし。各ページの画面設計に従い、証拠性のない実物画面を捏造しない。', '',
      '【公開内容の一次情報】', sources.map(compactSource).join('\n'), '',
      '【キャプション】', draftCaption(p), '',
      '【納品】',
      '・各ページを独立した別画像として1枚目から順番にチャット内へ直接表示する。結合画像・一覧・コラージュ・ZIPだけ・リンクだけは禁止。'
    ].filter((row,index,array)=>row!==''||array[index-1]!=='').join('\n').trim();
  }

  function install(root) {
    const doc = root.document, pipe = root.__fpContentPipeline || root.__carouselContentPipeline;
    const base = pipe ? {
      packageQuality: pipe.packageQuality,
      preflightIssues: pipe.preflightIssues,
      buildHandoff: pipe.buildHandoff
    } : null;
    if (pipe && !pipe.__adaptiveWrapped) {
      pipe.packageQuality = item => quality(item, base.packageQuality);
      pipe.preflightIssues = p => preflightIssues(p, base.preflightIssues);
      pipe.buildHandoff = item => buildHandoff(item, base.buildHandoff);
      pipe.__adaptiveWrapped = true;
      pipe.adaptiveVersion = VERSION;
      root.__fpContentPipeline = pipe; root.__carouselContentPipeline = pipe;
    }
    const lookup = id => {
      let rows=[]; try { if (typeof app !== 'undefined') rows = app.items || []; } catch (_) {}
      return rows.find(row => String(row.id) === String(id));
    };
    let careerId = '';
    const copy = async (value, button) => {
      let ok=false;
      try { if (root.navigator?.clipboard?.writeText) { await root.navigator.clipboard.writeText(value); ok=true; } } catch (_) {}
      if (!ok) {
        const area=doc.createElement('textarea'); area.value=value; area.style.cssText='position:fixed;left:0;top:0;opacity:0;width:1px;height:1px'; doc.body.append(area); area.focus(); area.select();
        try { ok = doc.execCommand('copy') === true; } catch (_) {} area.remove();
      }
      if (!ok) throw new Error('コピーできませんでした');
      button?.focus?.({preventScroll:true});
      if (typeof root.toast === 'function') root.toast('LOCK済み原稿と適応型デザイン指示をコピーしました','good');
    };
    const screenshotRows = p => arr(p.screenshot_requests).map(row => {
      const current=str(p.screenshot_decisions?.[row?.id]);
      return '<article class="fp-shot '+(row?.required?'required':'')+'"><div><b>'+(row?.required?'必須':'任意')+'</b><strong>'+esc(row?.label||'スクショ候補')+'</strong></div>'+(safeUrl(row?.url)?'<a href="'+esc(row.url)+'" target="_blank" rel="noopener">撮影元を開く</a>':'')+'<dl><dt>撮る範囲</dt><dd>'+esc(row?.capture_range||row?.capture_area||'')+'</dd><dt>使う理由</dt><dd>'+esc(row?.purpose||'')+'</dd></dl><label>画像の用意<select data-fp-shot-decision="'+esc(row?.id||'')+'"><option value="">選んでください</option><option value="assistant" '+(current==='assistant'?'selected':'')+'>まずAIが取得を試す</option><option value="user" '+(current==='user'?'selected':'')+'>自分でスクショを用意</option>'+(row?.required?'':'<option value="skip" '+(current==='skip'?'selected':'')+'>今回は使わない</option>')+'</select></label></article>';
    }).join('');
    function refreshFpModal(modal) {
      const button=modal.querySelector('[data-fp-copy-package]'); if(!button) return;
      const item=lookup(button.dataset.fpCopyPackage); if(!item || !adaptive(item)) return;
      const p=payloadOf(item), section=modal.querySelector('.fp-preflight');
      if(section && section.dataset.adaptiveV226!=='1') {
        section.dataset.adaptiveV226='1';
        const d=p.adaptive_design||{},usage=p.design_system_usage||{};
        section.innerHTML='<h4>適応型デザイン</h4><p><b>固定3配色・固定テンプレートは選びません。</b> 題材とページの役割から画面を決めます。</p>'+
          '<div class="fp-performance-context">判断理由：'+esc(d.decision_basis||d.reason||'未保存')+(d.visual_language?'<br>視覚言語：'+esc(d.visual_language):'')+(usage.usage_type?'<br>Design System：'+esc(usage.usage_type)+(safeUrl(usage.source_url)?' / <a href="'+esc(usage.source_url)+'" target="_blank" rel="noopener">参照元</a>':''):'')+'</div>'+
          '<div class="fp-shot-list">'+(arr(p.screenshot_requests).length?screenshotRows(p):'<p class="fp-empty">追加のスクショ判断はありません。</p>')+'</div>'+
          (arr(p.screenshot_requests).length?'<div class="fp-preflight-save"><span>実物素材の担当だけ確定します。</span><button class="push-button" data-fp-save-preflight="'+esc(item.id)+'">素材判断を保存</button></div>':'');
      }
      const q=quality(item,base?.packageQuality), pf=screenshotIssues(p), ready=q.ready&&!pf.length;
      button.disabled=!ready;
      button.title=ready?'LOCK済み原稿を適応型デザイン指示付きでコピーします。':[...q.issues,...pf].join('／');
      const status=modal.querySelector('.fp-package-status');
      if(status && p.draft_status==='ready') {
        status.classList.toggle('ready',ready); status.classList.toggle('blocked',!ready);
        status.innerHTML=ready?'<b>原稿LOCK・適応型デザイン準備完了</b><span>固定配色を選ばず、各ページの現象と根拠から画面を作ります。</span>':'<b>画像化前の確認が必要</b><ul>'+[...q.issues,...pf].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      }
    }
    function refreshCareer(dialog) {
      if (!careerId || !dialog || dialog.dataset.adaptiveV226==='1') return;
      const item=lookup(careerId); if(!item || !adaptive(item)) return;
      dialog.dataset.adaptiveV226='1'; dialog.dataset.adaptiveId=careerId;
      const q=quality(item,null), pf=screenshotIssues(payloadOf(item));
      const editorialIssues = typeof root.CCChatEditorial?.issues === 'function' ? arr(root.CCChatEditorial.issues(item)) : [];
      const issues=[...q.issues,...pf,...editorialIssues];
      const copyButton=dialog.querySelector('[data-copy]'); if(copyButton){copyButton.disabled=issues.length>0;copyButton.title=issues.join('／');copyButton.textContent='LOCK済み原稿を画像化用にコピー';}
      const note=doc.createElement('section'); note.className='cce-internal'; note.dataset.adaptiveNotice='1'; note.innerHTML=issues.length?'<b>適応型仕様：画像化保留</b><p>'+esc(issues.join('／'))+'</p>':'<b>適応型仕様：画像化可能</b><p>お金Chat専用の14日需要ゲート、ページ設計、一次情報、原稿LOCK、適応型デザインを確認済み。</p>';
      dialog.querySelector('h3')?.insertAdjacentElement('beforebegin',note);
    }
    doc.addEventListener('click', async event => {
      const careerOpen=event.target.closest?.('[data-cce-open]'); if(careerOpen) careerId=careerOpen.dataset.cceOpen||'';
      const save=event.target.closest?.('[data-fp-save-preflight]');
      if(save){
        const item=lookup(save.dataset.fpSavePreflight); if(item&&adaptive(item)){
          event.preventDefault(); event.stopImmediatePropagation();
          const section=save.closest('.fp-preflight'), decisions={};
          section?.querySelectorAll('[data-fp-shot-decision]').forEach(el=>{if(el.value)decisions[el.dataset.fpShotDecision]=el.value;});
          const missing=screenshotIssues({...payloadOf(item),screenshot_decisions:decisions});
          if(missing.length){if(typeof root.toast==='function')root.toast(missing.join('／'),'bad');return;}
          save.disabled=true; save.textContent='保存中…';
          try{
            const response=await root.fetch(RETRO_API,{method:'PATCH',cache:'no-store',headers:{...(typeof authHeaders==='function'?authHeaders():{}),'Content-Type':'application/json'},body:JSON.stringify({action:'fp_preflight',id:String(item.id),adaptive:true,screenshotDecisions:decisions})});
            const data=await response.json(); if(!response.ok||!data?.ok)throw new Error(data?.error||('HTTP '+response.status));
            const rows=(typeof app!=='undefined'?app.items:[])||[], idx=rows.findIndex(row=>String(row.id)===String(item.id)); if(idx>=0&&data.item)rows[idx]={...rows[idx],...data.item};
            save.textContent='保存済み'; if(typeof root.toast==='function')root.toast('素材判断を保存しました','good'); refreshFpModal(save.closest('[data-fp-modal]'));
          }catch(e){save.disabled=false;save.textContent='素材判断を保存';if(typeof root.toast==='function')root.toast(e.message||'保存できませんでした','bad');}
          return;
        }
      }
      const fpCopy=event.target.closest?.('[data-fp-copy-package]');
      if(fpCopy){const item=lookup(fpCopy.dataset.fpCopyPackage);if(item&&adaptive(item)){event.preventDefault();event.stopImmediatePropagation();try{await copy(buildHandoff(item,null),fpCopy);}catch(e){if(typeof root.toast==='function')root.toast(e.message,'bad');}return;}}
      const careerCopy=event.target.closest?.('.cce-dialog [data-copy]');
      if(careerCopy){const dialog=careerCopy.closest('.cce-dialog'),item=lookup(dialog?.dataset.adaptiveId||careerId);if(item&&adaptive(item)){event.preventDefault();event.stopImmediatePropagation();try{const editorialIssues=typeof root.CCChatEditorial?.issues==='function'?arr(root.CCChatEditorial.issues(item)):[];if(editorialIssues.length)throw new Error(editorialIssues.join('／'));await copy(buildHandoff(item,null),careerCopy);}catch(e){const feedback=dialog?.querySelector('[data-feedback]');if(feedback)feedback.textContent='コピー保留：'+e.message;}return;}}
    }, true);
    const observer=new root.MutationObserver(mutations=>{
      if(!mutations.some(m=>m.addedNodes?.length))return;
      doc.querySelectorAll('[data-fp-modal]').forEach(refreshFpModal);
      doc.querySelectorAll('dialog.cce-dialog').forEach(refreshCareer);
    });
    observer.observe(doc.body,{childList:true,subtree:true});
    doc.querySelectorAll('[data-fp-modal]').forEach(refreshFpModal);
  }

  return {VERSION,RESEARCH_VERSION,DESIGN_VERSION,LEGACY_MONEY_VERSION,LEGACY_MONEY_RESEARCH_VERSION,LEGACY_MONEY_DESIGN_VERSION,TASK_IDS,MONEY_CHAT_TASK_ID,WINDOW_DAYS,MIN_TOPICS,MIN_COMMENTS,hasAdaptiveMarkers,lane,moneyChatScope,adaptive,communityRequired,girlsCommentInfo,girlsTopicKey,strictCommunityIssues,pageContractIssues,sourceIssues,lockIssues,finalReviewIssues,designIssues,screenshotIssues,quality,preflightIssues,buildHandoff,install};
});
