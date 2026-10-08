/* FP assets stay attached to their original candidate. No SNS delivery or media remapping. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root?.document||root.CCFPFinishedImages)return;
 root.CCFPFinishedImages=api;
 const doc=root.document;
 const CAN_COMPOSE_ID='task:6aa9ee1043388191a2eac3bb2702092a:money-chat:6281805:average-savings-not-passline';
 function endpoint(){return typeof API==='string'?API:null;}
 async function request(id,body){
  const base=endpoint();if(!base)throw new Error('画像保存APIが未設定です');
  const url=new URL(base);if(!body){url.searchParams.set('resource','fp-finished-images');url.searchParams.set('id',id);}
  const r=await root.fetch(url,{method:body?'PATCH':'GET',cache:'no-store',headers:{...(typeof authHeaders==='function'?authHeaders():{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(r.status===401)throw new Error('ログインを確認してください');
  const d=await r.json();if(!r.ok||!d.ok)throw new Error(api.error(d.error));return d;
 }
 function element(tag,text,className){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
 function button(label,fn){const b=element('button',label,'push-button');b.type='button';b.onclick=fn;return b;}
 function download(png,name){const a=element('a');a.href=png;a.download=name;doc.body.append(a);a.click();a.remove();}
 async function decode(png){const img=new root.Image();img.src=png;await img.decode();return img;}
 async function filePng(file){
  if(file.size>6000000)throw new Error('1枚6MB以内のPNGを選んでください');
  const png=await new Promise((resolve,reject)=>{const r=new root.FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('画像を読み直してください'));r.readAsDataURL(file);});
  if(!String(png).startsWith('data:image/png;base64,'))throw new Error('PNGを選んでください');
  const img=await decode(png);return {png,img,name:file.name};
 }
 function paint(panel,id){
  const state={data:null,pending:[],busy:false,evidence:new Map(),sourceImages:new Map(),confirm:false};
  const heading=element('h4','完成画像・掲載全文・確認点');
  const status=element('p','保存済み画像を読み込んでいます');status.setAttribute('aria-live','polite');
  const issues=element('ul'),copy=element('details'),summary=element('summary','現在の掲載全文を確認');copy.append(summary);
  const controls=element('div',undefined,'fp-finished-controls'),gallery=element('div',undefined,'fp-finished-gallery'),requirements=element('div');
  panel.append(heading,status,issues,copy,requirements,controls,gallery);
  const input=element('input');input.type='file';input.multiple=true;input.accept='image/png,.png';input.setAttribute('aria-label','完成PNGをページ番号順で全枚選択');
  const importLabel=element('label','完成PNGを全枚選択 ');importLabel.append(input);
  const reload=button('保存済み画像を再読込',()=>refresh());
  const save=button('この順番で画像を保存',()=>operate(async()=>{
   if(!state.pending.length)throw new Error('完成画像を全枚選択してください');
   const p=state.data.copy,evidence={};
   for(const req of state.data.requirements||[])if(state.evidence.get(req.id)===true)evidence[req.id]={checked:true,url:req.url};
   await request(id,{action:'fp_finished_import',id,draftRevision:p.draft_revision,lockedAt:p.locked_at,copyHash:state.data.copy_hash,
    assets:state.pending.map((s,i)=>({page:i+1,png:s.png})),evidence});
   state.pending=[];state.confirm=false;input.value='';await refresh();
  }));
  const confirm=element('input');confirm.type='checkbox';
  const confirmLabel=element('label','完成画像の全文・順番・数字を原稿と見比べて確認しました ');confirmLabel.prepend(confirm);
  confirm.onchange=()=>{state.confirm=confirm.checked;updateControls();};
  const confirmSave=button('本人確認を保存（手動投稿）',()=>operate(async()=>{
   const p=state.data.copy;
   await request(id,{action:'fp_finished_confirm_manual',id,draftRevision:p.draft_revision,lockedAt:p.locked_at,
    copyHash:state.data.copy_hash,confirmed:confirm.checked,unchangedCopy:confirm.checked});
   state.confirm=false;confirm.checked=false;await refresh();
  }));
  const compose=button('この6枚を無料で組版',()=>operate(async()=>{
   if(id!==CAN_COMPOSE_ID)throw new Error('この原稿用の組版設計は未登録です');
   await doc.fonts?.ready;
   const rendered=[];
   for(const [i,page]of state.data.copy.pages.entries()){
    const required=(state.data.requirements||[]).find(s=>Number(s.slide_no)===i+1);
    const source=required?state.sourceImages.get(required.id)?.img:null;
    if(required&&!source)throw new Error('3枚目に使う公式PDFの該当グラフPNGが必要です');
    const canvas=doc.createElement('canvas');canvas.width=1080;canvas.height=1350;
    api.drawSavingsPage(canvas.getContext('2d'),page,i,source);
    rendered.push({page:i+1,png:canvas.toDataURL('image/png')});
   }
   state.pending=rendered;state.confirm=false;confirm.checked=false;renderGallery();updateControls();
   status.textContent='6枚を組版しました。画面を検品してから保存してください。保存・本人確認はまだです。';
  }));
  controls.append(importLabel,reload,save,confirmLabel,confirmSave);
  if(id===CAN_COMPOSE_ID)controls.prepend(compose);
  const notice=element('p','画像保存・本人確認は投稿を実行しません。投稿先の設定と掲載条件を本人が確認し、手動で投稿してください。');
  panel.append(notice);
  function updateControls(){
   const ok=!!state.data&&!state.busy;
   const productionReady=ok&&!(state.data.production_issues||[]).length;
   input.disabled=!ok;reload.disabled=state.busy;save.disabled=!productionReady||state.pending.length!==state.data.copy.pages.length;
   const valid=['saved_pending_review','confirmed_manual'].includes(state.data?.status)&&!state.pending.length;
   confirm.disabled=!ok||!valid;confirmSave.disabled=!productionReady||!valid||!state.confirm||(state.data.issues||[]).some(s=>s.startsWith('必須資料'));
   compose.disabled=!productionReady||state.data.copy.pages.length!==6||state.data.draft_status!=='ready'||(state.data.requirements||[]).some(s=>!state.sourceImages.has(s.id));
  }
  function renderGallery(){
   gallery.replaceChildren();const pages=state.pending.length?state.pending:state.data?.assets||[];
   for(const [i,a]of pages.entries()){
    const fig=element('figure'),img=element('img');img.src=a.png;img.alt=(i+1)+'枚目の'+(state.pending.length?'保存前プレビュー':'保存済み完成画像');img.loading='lazy';
    const caption=element('figcaption',(i+1)+'枚目｜'+(state.pending.length?'保存前・未検品':'DBから再読済み'));
    const link=element('a','PNGをダウンロード','push-button');link.href=a.png;link.download='fp-'+state.data.copy.draft_revision+'-'+String(i+1).padStart(2,'0')+'.png';
    fig.append(img,caption,link);gallery.append(fig);
   }
  }
  function renderRequirements(){
   requirements.replaceChildren();state.evidence.clear();state.sourceImages.clear();
   for(const req of state.data.requirements||[]){
    const group=element('div',undefined,'fp-finished-evidence');
    const title=element('b','必須資料：'+req.label),link=element('a','公式資料を開く');
    if(/^https:\/\//.test(req.url)){link.href=req.url;link.target='_blank';link.rel='noopener noreferrer';}
    const range=element('p',req.capture_range||'該当箇所を確認してください');
    const check=element('input');check.type='checkbox';
    const checkLabel=element('label','全ページの完成画像を保存する前に、この資料の該当画像と数値を見比べました ');checkLabel.prepend(check);
    check.onchange=()=>state.evidence.set(req.id,check.checked);
    const source=element('input');source.type='file';source.accept='image/png,.png';source.setAttribute('aria-label',req.label+'の公式グラフPNG');
    source.onchange=()=>operate(async()=>{if(!source.files?.[0])return;state.sourceImages.set(req.id,await filePng(source.files[0]));updateControls();status.textContent='資料PNGを読み込みました。公式資料との一致を確認してください。';});
    group.append(title,link,range,checkLabel);if(id===CAN_COMPOSE_ID)group.append(element('p','無料組版用：公式PDFの該当グラフPNG'),source);
    requirements.append(group);
   }
  }
  async function refresh(){
   state.pending=[];input.value='';state.confirm=false;confirm.checked=false;
   try{
    state.data=await request(id);
    await Promise.all((state.data.assets||[]).map(async a=>{const img=await decode(a.png);if(!api.validSize(img.naturalWidth,img.naturalHeight))throw new Error('保存画像の寸法を確認してください');}));
    status.textContent=api.status(state.data.status);
    issues.replaceChildren(...(state.data.issues||[]).map(s=>element('li',s)));
    copy.replaceChildren(summary,...state.data.copy.pages.map(p=>{const box=element('pre',(p.page)+'枚目\n'+api.copyText(p.copy));return box;}));
    confirm.checked=false;state.confirm=false;renderRequirements();renderGallery();updateControls();
   }catch(e){state.data=null;status.textContent='読込未確認：'+e.message;gallery.replaceChildren();updateControls();}
  }
  async function operate(fn){
   if(state.busy)return;state.busy=true;updateControls();
   try{await fn();}catch(e){status.textContent='未完了：'+e.message;}
   finally{state.busy=false;updateControls();}
  }
  input.onchange=()=>operate(async()=>{
   const files=[...input.files].sort((a,b)=>a.name.localeCompare(b.name,'ja',{numeric:true}));
   state.pending=[];state.confirm=false;confirm.checked=false;
   if(files.length!==state.data.copy.pages.length)throw new Error(state.data.copy.pages.length+'枚すべてを選んでください');
   if(files.reduce((n,f)=>n+f.size,0)>24000000)throw new Error('合計24MB以内にしてください');
   const pending=[];
   for(const f of files){const a=await filePng(f);if(!api.validSize(a.img.naturalWidth,a.img.naturalHeight))throw new Error(f.name+'：縦4:5、幅800〜2160pxにしてください');pending.push(a);}
   state.pending=pending;renderGallery();status.textContent='保存前の'+pending.length+'枚です。ページ順と全文を確認してください。';
  });
  refresh();
 }
 function attach(modal){
  if(modal.querySelector('[data-fp-finished]'))return;
  const id=modal.querySelector('[data-fp-copy-draft]')?.dataset.fpCopyDraft;
  if(!id||!/^task:(6aa9ee1043388191a2eac3bb2702092a|6a9e5826d4888191a4d82a643e6d5adf):/.test(id.replace(/^(sns:)+/,'')))return;
  const panel=element('section',undefined,'fp-finished-panel');panel.dataset.fpFinished='1';
  modal.querySelector('main')?.prepend(panel);paint(panel,id);
 }
 const observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches('[data-fp-modal]'))attach(n);else n.querySelectorAll('[data-fp-modal]').forEach(attach);}});
 observer.observe(doc.body,{childList:true,subtree:true});doc.querySelectorAll('[data-fp-modal]').forEach(attach);
 const style=element('style');style.textContent='.fp-finished-panel{background:#fff;color:#16324f;padding:14px;border:2px solid #0f756d;margin-bottom:12px}.fp-finished-panel pre{white-space:pre-wrap;line-height:1.6}.fp-finished-controls{display:grid;gap:10px}.fp-finished-controls input[type=file]{max-width:100%}.fp-finished-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.fp-finished-gallery figure{margin:0}.fp-finished-gallery img{width:100%;height:auto;border:1px solid #16324f}.fp-finished-gallery figcaption{margin:8px 0}.fp-finished-gallery a{display:inline-block}.fp-finished-evidence{display:grid;gap:7px;padding:10px;border:1px solid #16324f;margin:10px 0}@media(max-width:650px){.fp-finished-gallery{grid-template-columns:1fr}}';doc.head.append(style);
})(typeof window==='undefined'?null:window,function(){
 const copyText=s=>String(s??'').replace(/\\n/g,'\n');
 const validSize=(w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&w>=800&&w<=2160&&h===w*5/4;
 const status=s=>({blocked:'原稿審査または画像化前確認が未完了です。画像保存・本人確認は保留中です。',missing:'完成画像は未保存です。原稿完成と画像完成は別です。',stale:'旧画像はありますが原稿の版が変わっています。再制作・検品待ちです。',
 saved_pending_review:'全ページを保存して再読しました。本人による画像・全文の検品は未完了です。',
 confirmed_manual:'画像・全文の本人確認を保存済みです。投稿先と掲載条件を確認して手動で投稿してください。'})[s]||'画像状態は未確認です';
 const error=s=>({fp_copy_changed_retry:'原稿が更新されました。最新の内容を再読してください',fp_copy_stale_or_unlocked:'原稿の版またはLOCKが変わっています',
 required_source_image_unchecked:'必須の公式資料画像の確認が未完了です',fp_finished_images_required:'最新原稿の全画像を保存・再読してください',
 fp_image_bytes_missing_or_changed:'保存画像の不足またはハッシュ不一致があります',fp_copy_unresolved:'原稿に未解決の確認点があります',
 fp_copy_incomplete:'掲載全文または原稿の完成状態を確認してください'})[s]||String(s||'処理を確認してください');
 function lines(ctx,text,width){
  const out=[];for(const paragraph of copyText(text).split('\n')){let line='';for(const char of [...paragraph]){if(line&&ctx.measureText(line+char).width>width){out.push(line);line=char;}else line+=char;}out.push(line);}
  return out;
 }
 function drawSavingsPage(ctx,page,index,source){
  if(!ctx||index<0||index>5)throw new Error('未対応のページです');
  const ink='#16324f',teal='#0f756d';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1080,1350);
  ctx.textBaseline='top';ctx.fillStyle=ink;
  const paragraphs=copyText(page.copy).split('\n'),first=paragraphs.shift(),body=paragraphs.join('\n');
  let y=92;ctx.font='700 54px sans-serif';
  for(const s of lines(ctx,first,920)){ctx.fillText(s,80,y);y+=76;}
  y+=40;ctx.fillStyle=teal;ctx.fillRect(80,y,160,8);y+=44;ctx.fillStyle=ink;
  const size=index===0?42: index===5?40:34;ctx.font='500 '+size+'px sans-serif';
  const reserve=index===2?390:index===3?420:index===1||index===4?230:0;
  for(const s of lines(ctx,body,920)){if(y+size*1.5>1240-reserve)throw new Error((index+1)+'枚目が文字数上限を超えます。全文を削らずレイアウトを調整してください');ctx.fillText(s,80,y);y+=size*1.55;}
  if(index===2){
   if(!source)throw new Error('公式資料画像が必要です');const w=920,h=350,scale=Math.min(w/source.naturalWidth,h/source.naturalHeight);
   ctx.drawImage(source,80,865,source.naturalWidth*scale,source.naturalHeight*scale);
  }
  if(index===3){
   const values=[691.0,2321.3,572.7,2114.0],labels=['男性 30代','男性 60代','女性 30代','女性 60代'];
   // This renderer is scoped to the verified six-page savings candidate.
   if(!values.every(v=>copyText(page.copy).includes(v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}))))throw new Error('原稿の数値が変わっています。グラフ設計を再確認してください');
   ctx.font='500 27px sans-serif';
   for(let i=0;i<4;i++){const row=810+i*92;ctx.fillStyle=ink;ctx.fillText(labels[i],80,row);ctx.fillStyle=teal;ctx.fillRect(300,row+4,values[i]/2321.3*600,34);}
  }
  if(index===1||index===4){
   const labels=index===1?['協力世帯','単純平均','利用に注意']:['いつ','何に','いくら'];
   ctx.font='700 38px sans-serif';for(let i=0;i<3;i++){const x=80+i*330;ctx.fillStyle=teal;ctx.fillRect(x,1030,250,5);ctx.fillStyle=ink;ctx.fillText(labels[i],x,1065);if(i<2)ctx.fillText('→',x+265,1065);}
  }
  ctx.fillStyle=ink;ctx.font='400 24px sans-serif';ctx.fillText(String(index+1)+' / 6',930,1280);
 }
 return {copyText,validSize,status,error,lines,drawSavingsPage};
});
