(()=>{
 const R=window.CCReddit;if(!R)return;
 const byId=id=>document.getElementById(id),val=id=>byId(id)?.value??'';
 const numberVal=id=>{const raw=String(val(id)).replace(/[^0-9.\-]/g,'');if(!raw)return null;const n=Number(raw);return Number.isFinite(n)?n:null};

 // Add Japanese review + reader reaction fields to the existing editor.
 const grid=document.querySelector('#redditEditorForm .reddit-form-grid');
 if(grid&&!byId('reRedditTitleJa')){
  const ja=document.createElement('fieldset');ja.className='reddit-fieldset reddit-ja-fieldset';ja.innerHTML='<legend>日本語確認用（投稿しない）</legend><div class="reddit-fields"><label for="reRedditTitleJa" class="wide-label">タイトル訳</label><div><textarea id="reRedditTitleJa" style="min-height:58px"></textarea><div class="reddit-copy-row"><button class="push-button small" type="button" data-copy-extra="reRedditTitleJa">日本語タイトルをコピー</button></div></div><label for="reRedditBodyJa" class="wide-label">本文訳</label><div><textarea id="reRedditBodyJa" style="min-height:220px"></textarea><div class="reddit-copy-row"><button class="push-button small" type="button" data-copy-extra="reRedditBodyJa">日本語本文をコピー</button></div></div></div>';
  grid.appendChild(ja);
  const reaction=document.createElement('fieldset');reaction.className='reddit-fieldset reddit-reaction-fieldset';reaction.innerHTML='<legend>投稿後の反応メモ</legend><div class="reddit-fields"><label for="reReactionSummary" class="wide-label">コメント傾向</label><textarea id="reReactionSummary" placeholder="高評価コメント・同じ意味の反応・次回代弁したい意見"></textarea><label for="reReactionUrl">Reddit投稿/コメントURL</label><input id="reReactionUrl" type="url" inputmode="url"></div>';
  grid.appendChild(reaction);
  ja.querySelectorAll('[data-copy-extra]').forEach(b=>b.onclick=()=>R.copy(val(b.dataset.copyExtra),b));
 }
 const oldOpen=R.openEditor;
 R.openEditor=item=>{oldOpen(item);if(byId('reRedditTitleJa'))byId('reRedditTitleJa').value=item?.redditTitleJa||'';if(byId('reRedditBodyJa'))byId('reRedditBodyJa').value=item?.redditBodyJa||'';if(byId('reReactionSummary'))byId('reReactionSummary').value=item?.readerReactionSummary||'';if(byId('reReactionUrl'))byId('reReactionUrl').value=item?.readerReactionUrl||''};
 const updateDerivedPrice=()=>{const overseas=numberVal('reOverseasPrice'),fx=numberVal('reFx');if(overseas!==null&&fx!==null){const jpy=Math.round(overseas*fx);if(byId('reOverseasJpy'))byId('reOverseasJpy').value=String(jpy);return jpy}return numberVal('reOverseasJpy')};
 ['reOverseasPrice','reFx'].forEach(id=>byId(id)?.addEventListener('input',updateDerivedPrice));
 const oldPayload=R.payload;
 R.payload=()=>{const p={...oldPayload(),redditTitleJa:val('reRedditTitleJa'),redditBodyJa:val('reRedditBodyJa'),readerReactionSummary:val('reReactionSummary'),readerReactionUrl:val('reReactionUrl')};const jp=numberVal('reJapanPrice'),overseasJpy=updateDerivedPrice();if(overseasJpy!==null)p.overseasPriceJpy=overseasJpy;if(jp!==null&&overseasJpy!==null){p.priceGapYen=Math.round(overseasJpy-jp);p.discountPct=overseasJpy>0?Math.round(((overseasJpy-jp)/overseasJpy*100)*100)/100:null}return p};

 // Enrich Reddit cards with Japanese review and a one-click research prompt.
 const oldCard=R.card;
 R.card=x=>{
  let html=oldCard(x);
  const ja=(x.redditTitleJa||x.redditBodyJa)?'<details class="reddit-ja-preview"><summary>日本語で原稿確認</summary><strong>'+esc(x.redditTitleJa||'日本語確認用')+'</strong><pre>'+esc((x.redditBodyJa||'').slice(0,1800))+(String(x.redditBodyJa||'').length>1800?'\n…':'')+'</pre></details>':'';
  const reaction=x.readerReactionSummary?'<div class="reddit-reaction-preview"><b>読者の反応</b><br>'+esc(x.readerReactionSummary)+(x.readerReactionUrl?'　'+R.source(x.readerReactionUrl,'コメントを見る'):'')+'</div>':'';
  const research=R.button('🔎 調査依頼をコピー','reddit-research-btn','data-r-research="'+esc(x.id)+'"');
  html=html.replace('<div class="reddit-actions">',ja+reaction+'<div class="reddit-actions">'+research);
  return html;
 };
 const oldBind=R.bind;
 R.bind=host=>{oldBind(host);host.querySelectorAll('[data-r-research]').forEach(b=>b.onclick=()=>R.copyResearchPrompt(b.dataset.rResearch,b))};
 R.copyResearchPrompt=(id,btn)=>{const x=R.state.items.find(v=>v.id===id);if(!x)return;const prompt=`次の商品をReddit海外価格差投稿用に調査してください。\n\n商品: ${x.productName||''}\n型番: ${x.modelNumber||'不明'}\n日本価格: ${x.japanPriceYen?yen(x.japanPriceYen):'未確認'}\n日本側URL: ${x.japanSourceUrl||'未登録'}\n比較市場: ${x.overseasMarket||'US'}\n\n必須:\n1. 同一型番・同一仕様か確認\n2. 海外の公式/小売価格を個別URL付きで確認\n3. eBay等のSOLD/Completedやオークション実売があれば確認\n4. 為替換算し、日本価格との差額・差率を計算\n5. 税・送料・buyer fee・保証など比較上の注意点を明記\n6. Redditや海外コミュニティの需要/反応も確認\n7. 誇張せず、Retail差と実売差を分ける\n8. 最後に司令塔へ入れる値（海外価格、通貨、円換算、比較元種別、URL、需要、注意点、採点案）をまとめる\n\n日本語で調査結果を出してください。`;R.copy(prompt,btn)};

 // Import an existing command-center signal into 海外価格差.exe with one click.
 R.importSignal=async(item,btn)=>{if(!item)return;bump(btn);setStatus('海外価格差候補へ送信中...',true);try{const signal={id:item.id,title:item.title||item.productName,summary:item.summary,reason:item.reason,next:item.next,url:item.url,source:item.source||item.supplierName,priority:item.priority,score:item.score,domain:item.domain||'sourcing',payload:item.payload||{}};const d=await R.request(R.api,{method:'POST',headers:R.headers(),body:JSON.stringify({action:'from_signal',signal})});const i=R.state.items.findIndex(x=>x.id===d.item.id);if(i>=0)R.state.items[i]=d.item;else R.state.items.unshift(d.item);R.recount();if(app.view==='reddit'){R.hero();R.render()}else{const badge=byId('redditTopBadge');if(badge)badge.textContent=Number(R.state.counts.candidate||0)+Number(R.state.counts.draft||0)}toast('海外価格差.exe の未判定へ送りました','good');setStatus('準備完了')}catch(e){toast('海外価格差候補へ送れませんでした','bad');setStatus('保存エラー')}};
 R.decorateSourceCards=()=>{
  const lists=[...(app.items||[]),...(sourcingApp?.items||[])],seen=new Set();
  for(const item of lists){if(!item?.id||seen.has(item.id))continue;seen.add(item.id);const domain=item.domain||'sourcing';if(!['deal','sourcing','sns'].includes(domain))continue;const card=byId('card-'+cssSafe(item.id));if(!card||card.querySelector('[data-r-import]'))continue;let actions=card.querySelector('.sourcing-actions,.actions');if(!actions){actions=document.createElement('div');actions.className=card.classList.contains('sourcing-card')?'sourcing-actions':'actions';card.querySelector('.sourcing-card-body,.thread-body')?.appendChild(actions)}const b=document.createElement('button');b.type='button';b.className='push-button small reddit-import-btn';b.dataset.rImport=item.id;b.textContent='🌎 海外価格差へ';b.onclick=()=>R.importSignal(item,b);actions.appendChild(b)}
 };
 const baseRenderList=renderList;renderList=function(){const r=baseRenderList.apply(this,arguments);setTimeout(R.decorateSourceCards,0);return r};
 const baseRenderSourcing=renderSourcing;renderSourcing=function(){const r=baseRenderSourcing.apply(this,arguments);setTimeout(R.decorateSourceCards,0);return r};
 setTimeout(R.decorateSourceCards,0);

 // Mobile mode: compact top and a floating add button.
 const fab=document.createElement('button');fab.id='redditFab';fab.type='button';fab.className='push-button reddit-fab';fab.textContent='＋ 候補';fab.onclick=e=>{bump(e.currentTarget);R.openEditor(null)};document.body.appendChild(fab);
 const oldShow=R.show;R.show=()=>{oldShow();document.body.classList.add('reddit-mode');fab.hidden=false};
 const oldHide=R.hide;R.hide=()=>{oldHide();document.body.classList.remove('reddit-mode');fab.hidden=true};
 fab.hidden=app.view!=='reddit';
 const intro=document.querySelector('.reddit-intro');if(intro)intro.innerHTML='<b>Reddit向け価格差投稿を半自動化。</b> 監視結果から1クリックで候補化 → 海外価格を調査 → 採点 → 英語＋日本語確認下書き。<b>「海外向け投稿下書き」タスクの結果も自動で未判定へ同期します。</b> Redditへの最終投稿だけは人間が行います。';
 const v=[...document.querySelectorAll('.status-panel')].find(x=>/司令塔 ver/.test(x.textContent||''));if(v)v.textContent='司令塔 ver 1.41';
})();
