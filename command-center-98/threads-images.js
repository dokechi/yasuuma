/* Owner-authenticated attachments. Saving an image never publishes a post. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CCThreadsImages=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const API='https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-retro-api',CONTRACT='threads-post-images-v1',controllers=new Set();
 function binding(draft){const s=draft?.source,id=String(s?.recordId||s?.id||'').replace(/^(sns:)+/,'');return ['kyun','choi'].includes(s?.account)&&(/^[1-9]\d*$/.test(id)||/^task:threads-library-import-v1:/.test(id))?{id,accountKey:s.account}:null;}
 function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function styles(doc){
  if(doc.getElementById('cc-threads-images-style'))return;const style=doc.createElement('style');style.id='cc-threads-images-style';
  style.textContent='.cc-threads-images{margin:18px 0;padding:16px;border:1px solid #c7bca9;border-radius:12px;background:#fffdf7;color:#312d27;min-width:0}.cc-threads-images h3{font:inherit;font-weight:700;margin:0 0 8px}.cc-threads-images p{font-size:13px;line-height:1.6;overflow-wrap:anywhere}.cc-threads-image-list{display:flex;flex-direction:column;gap:16px;margin:14px 0}.cc-threads-image{margin:0;padding:12px;border:1px solid #ded5c6;border-radius:8px;background:#fff;min-width:0}.cc-threads-image img{display:block;width:100%;max-height:480px;object-fit:contain;background:#f5f2eb;border-radius:5px}.cc-threads-image figcaption{font-size:13px;overflow-wrap:anywhere;margin:8px 0}.cc-threads-image-actions{display:flex;gap:8px;flex-wrap:wrap}.cc-threads-images button{font:inherit;font-size:13px;min-height:44px;padding:8px 12px;border:1px solid #a79a84;border-radius:7px;background:#f5f0e5;color:#312d27;cursor:pointer}.cc-threads-images button:disabled{opacity:.45;cursor:default}.cc-threads-images .cc-threads-save{background:#325747;color:white;border-color:#325747}.cc-threads-images [hidden]{display:none!important}.cc-threads-images-status{min-height:1.6em;margin:10px 0 0}.cc-threads-images-status[data-error=true]{color:#a03228}.cc-threads-images button:focus-visible{outline:3px solid #cf9d42;outline-offset:2px}';doc.head.append(style);
 }
 async function request(ref,body){const url=new URL(API);if(!body){url.searchParams.set('resource','threads-images');for(const [k,v]of Object.entries(ref))url.searchParams.set(k,v);}const response=await root.fetch(url,{method:body?'PATCH':'GET',cache:'no-store',headers:{...(typeof authHeaders==='function'?authHeaders():{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch{throw Error('画像の保存先から応答を確認できませんでした。');}if(!response.ok||!data.ok){const error=new Error(({threads_content_changed_reload:'別の画面で更新されています。追加した画像はこの画面に残っています。',threads_duplicate_images:'同じ画像が重複しています。',threads_image_too_large:'画像は1枚6MB以内にしてください。',threads_images_total_too_large:'画像の合計は24MB以内にしてください。',threads_invalid_image:'PNG・JPEG・WebPの画像を選んでください。',unauthorized:'ログイン状態を確認してください。'})[data.error]||'画像を保存できませんでした。変更はこの画面に残っています。');error.code=data.error;throw error;}return data;}
 function checked(data,ref){if(String(data?.id)!==String(ref.id)&&!String(ref.id).startsWith('task:'))throw Error('画像の保存先を確認できませんでした。');if(data?.accountKey!==ref.accountKey||data?.manifest?.contract!==CONTRACT||!Number.isSafeInteger(data.manifest.revision)||!Array.isArray(data.assets)||data.assets.length>20)throw Error('画像の応答を確認できませんでした。');return data;}
 function mount(host,ref,{onSaved=()=>{},onCount=()=>{}}={}){
  if(!root||!host||!ref)return null;const doc=host.ownerDocument;styles(doc);
  const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;},button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
  const section=el('section');section.className='cc-threads-images';section.setAttribute('aria-label','下書きの添付画像');
  const heading=el('h3','投稿画像'),note=el('p','本文と一緒に保存します。PNG・JPEG・WebP、1枚6MB・合計24MBまで。'),list=el('div');list.className='cc-threads-image-list';
  const input=el('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.multiple=true;input.hidden=true;input.setAttribute('aria-label','投稿に添付する画像を選択');
  const status=el('p','画像を読み込み中…');status.className='cc-threads-images-status';status.setAttribute('aria-live','polite');
  const actions=el('div');actions.className='cc-threads-image-actions';
  let images=[],revision=0,dirty=false,busy=false,loaded=false,disposed=false,lastSignature='',mutationId='',generation=0;
  const add=button('画像を追加',()=>input.click()),save=button('画像と順番を保存',persist),reset=button('保存済みの状態に戻す',()=>load(true)),retry=button('再読込',()=>load());save.className='cc-threads-save';retry.hidden=true;
  actions.append(add,save,reset,retry);section.append(heading,note,list,input,actions,status);host.append(section);
  function say(text,error=false){if(disposed)return;status.textContent=text;status.dataset.error=String(error);}
  function updateControls(){section.setAttribute('aria-busy',String(busy));section.querySelectorAll('button,input').forEach(b=>b.disabled=busy);add.disabled=busy||!loaded||images.length>=20;save.disabled=busy||!loaded||!dirty;reset.disabled=busy||!loaded||!dirty;}
  function changed(){dirty=true;paint();say('変更はまだ保存されていません。順番を確認して保存してください。');}
  async function download(image,index){
   const src=image.dataUrl||safeUrl(image.url);if(!src)return;
   try{const response=await root.fetch(src,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('download');const blob=await response.blob(),url=root.URL.createObjectURL(blob),a=el('a');a.href=url;const type=blob.type||image.mime||'image/png',ext=type.includes('jpeg')?'jpg':type.includes('webp')?'webp':'png';a.download=String(index+1).padStart(2,'0')+'-'+String(image.name||'post-image').replace(/\.[a-z0-9]+$/i,'').replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,100)+'.'+ext;doc.body.append(a);a.click();a.remove();setTimeout(()=>root.URL.revokeObjectURL(url),60000);say((index+1)+'枚目の保存を開始しました。');}
   catch{say('直接保存できませんでした。「画像を開く」から保存してください。',true);}
  }
  function paint(){
   list.replaceChildren();heading.textContent='投稿画像'+(images.length?'｜'+images.length+'枚':'');
   if(!images.length&&loaded)list.append(el('p','画像はまだありません。本文だけの下書きもそのまま使えます。'));
   for(const [i,image]of images.entries()){
    const card=el('figure');card.className='cc-threads-image';const img=el('img'),src=image.dataUrl||safeUrl(image.url);img.src=src;img.alt=image.label||'投稿画像 '+(i+1);img.referrerPolicy='no-referrer';img.loading='lazy';
    img.onerror=()=>{say((i+1)+'枚目を表示できません。画像を開いて確認するか、画像を選び直してください。',true);};
    const controls=el('div');controls.className='cc-threads-image-actions';
    const before=button('前へ',()=>{[images[i-1],images[i]]=[images[i],images[i-1]];changed();}),after=button('後へ',()=>{[images[i],images[i+1]]=[images[i+1],images[i]];changed();}),remove=button('外す',()=>{images.splice(i,1);changed();});before.dataset.edge=String(i===0);after.dataset.edge=String(i===images.length-1);
    before.setAttribute('aria-label',(i+1)+'枚目を前へ');after.setAttribute('aria-label',(i+1)+'枚目を後へ');remove.setAttribute('aria-label',(i+1)+'枚目を下書きから外す');
    const open=el('a','画像を開く ↗');open.href=src;open.target='_blank';open.rel='noopener noreferrer';
    controls.append(button('この画像を保存',()=>download(image,i)),before,after,remove,open);
    card.append(img,el('figcaption',(i+1)+'枚目 / '+images.length+'｜'+(image.label||image.name||'投稿画像')),controls);list.append(card);
   }
   updateControls();list.querySelectorAll('[data-edge=true]').forEach(b=>b.disabled=true);onCount(images.length);
  }
  async function load(discard=false){
   if(busy||dirty&&!discard)return;const stamp=++generation;busy=true;retry.hidden=true;updateControls();say('画像を読み込み中…');
   try{const data=checked(await request(ref),ref);if(disposed||stamp!==generation)return;revision=data.manifest.revision;images=data.assets;dirty=false;loaded=true;say(images.length?'画像と順番を読込済み。':'画像を追加できます。');}
   catch(error){say(error.message,true);retry.hidden=false;}
   finally{busy=false;if(!disposed)paint();}
  }
  async function persist(){
   if(busy||!dirty||!loaded)return;
   const assets=images.map(x=>({...(x.assetKey?{assetKey:x.assetKey}:x.dataUrl?{dataUrl:x.dataUrl}:{url:x.url}),label:x.label||x.name||'投稿画像',name:x.name||''}));
   const body={action:'threads_images_save',...ref,expectedRevision:revision,images:assets},signature=JSON.stringify(body);if(signature!==lastSignature){lastSignature=signature;mutationId=root.crypto?.randomUUID?.()||'images_'+Date.now()+'_'+Math.random().toString(36).slice(2);}
   busy=true;updateControls();say('画像と順番を保存中…');
   try{const data=checked(await request(ref,{...body,mutationId}),ref);if(data.manifest.revision<=revision)throw Error('画像の保存結果を確認できませんでした。');images=data.assets;revision=data.manifest.revision;dirty=false;say('画像と順番を保存しました。');onSaved(data);for(const c of controllers)if(c!==controller&&c.key===controller.key)c.refresh();try{root.CCCastle?.refresh();}catch{}}
   catch(error){say(error.message,true);}
   finally{busy=false;if(!disposed)paint();}
  }
  input.onchange=async()=>{
   if(busy||!loaded)return;const files=[...input.files];if(!files.length)return;busy=true;updateControls();say('画像を確認中…');
   try{
    if(images.length+files.length>20)throw Error('画像は20枚まで追加できます。');
    if(files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>6*1024*1024))throw Error('PNG・JPEG・WebP、1枚6MB以内の画像を選んでください。');
    if(images.reduce((n,x)=>n+(x.size||0),0)+files.reduce((n,f)=>n+f.size,0)>24*1024*1024)throw Error('画像の合計は24MB以内にしてください。');
    const added=[];for(const file of files){const dataUrl=await new Promise((resolve,reject)=>{const r=new root.FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('画像を読み込めませんでした。'));r.readAsDataURL(file);});const img=new root.Image();img.src=dataUrl;await img.decode();if(img.naturalWidth*img.naturalHeight>100000000)throw Error('画像の画素数が大きすぎます。');if([...images,...added].some(x=>x.dataUrl===dataUrl))throw Error('同じ画像が重複しています。');added.push({dataUrl,label:file.name,name:file.name,size:file.size});}
    if(disposed)return;images.push(...added);dirty=true;say('画像を追加しました。順番を確認して保存してください。');
   }catch(error){say(error.message||'画像を読み込めませんでした。',true);}
   finally{busy=false;input.value='';if(!disposed)paint();}
  };
  const controller={key:JSON.stringify(ref),refresh:()=>{if(!dirty)load();},destroy(){disposed=true;generation++;controllers.delete(controller);section.remove();},dirty:()=>dirty};controllers.add(controller);load();return controller;
 }
 return {binding,mount,safeUrl};
});
