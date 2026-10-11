/* Local integration only: requires the reviewed RPC before deployment. */
(()=>{
  const pending=new Map();
  const version=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  function snapshot(id,button){
    const card=button?.closest?.('article.sourcing-card')||document.getElementById('card-'+cssSafe(id));
    if(!card||card.dataset.sourcingId!==String(id))throw Error('表示情報を確認できません。再読込してください');
    return {id:String(id),updatedAt:card.dataset.sourcingUpdatedAt,judgedAt:JSON.parse(card.dataset.sourcingJudgedAt)};
  }
  let storageKey;
  async function restore(){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(AUTH)));
    const key='cc-sourcing-pending-v1:'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
    if(storageKey===key)return;
    const stored=sessionStorage.getItem(key);
    pending.clear();
    if(stored){
      const entries=JSON.parse(stored);
      if(!Array.isArray(entries))throw Error('pending storage invalid');
      for(const [intent,body] of entries){
        if(typeof intent!=='string'||!body||typeof body.operationId!=='string'||!version(body.expectedUpdatedAt))throw Error('pending storage invalid');
        pending.set(intent,body);
      }
    }
    storageKey=key;
  }
  async function request(url,options){
    const parsed=JSON.parse(options.body);
    const intent=parsed.action==='sourcing_verdict'?{action:parsed.action,id:parsed.id,verdict:parsed.verdict,note:parsed.note?.trim()||null}:{action:parsed.action,id:parsed.id};
    if(!['sourcing_verdict','sourcing_reset'].includes(intent.action))throw Error('invalid sourcing action');
    if(app.busy)throw Error('読込中です。表示の更新を待ってください');
    const row=options.sourcingSnapshot;
    if(!row||!version(row.updatedAt)||!Object.hasOwn(row,'judgedAt')||(row.judgedAt!==null&&!version(row.judgedAt))){
      throw Error('画面を再読込してから保存してください');
    }
    const body={...intent,expectedUpdatedAt:row.updatedAt,expectedJudgedAt:row.judgedAt};
    const key=JSON.stringify(body);
    // Persist before transmission. A storage failure must not send an operation
    // whose identity could be lost on reload. Auth tokens themselves are absent.
    try{await restore()}catch{throw Error('未完了の保存情報を復旧できません。別の操作は送信していません')}
    if(!pending.has(key))pending.set(key,{...body,operationId:crypto.randomUUID()});
    try{sessionStorage.setItem(storageKey,JSON.stringify([...pending]))}catch{throw Error('保存情報を保持できません。送信していません')}
    if(app.busy)throw Error('読込中です。表示の更新を待ってください');
    const {sourcingSnapshot,...transport}=options;
    let response;
    try{response=await fetch(url,{...transport,body:JSON.stringify(pending.get(key))})}
    catch(error){notice(row,'保存結果を確認できません。同じ内容で再送できます',()=>retry(url,options));throw error}
    if(response.ok){const result=await response.clone().json();if(result?.ok)notice(row,'保存済みです。表示の更新に失敗した場合も同じ操作で確認できます',()=>retry(url,options))}
    else if(response.status===409||response.status===428)notice(row,'他の更新があるため保存していません。再読込して確認してください');
    // Keep the receipt intent until a new loaded version changes the key. A
    // successful save followed by a failed refresh still needs safe replay.
    return response;
  }
  function notice(row,message,again){
    if(typeof document==='undefined')return;
    const card=document.getElementById('card-'+cssSafe(row.id));if(!card)return;
    card.querySelector('[data-sourcing-save-notice]')?.remove();
    const panel=document.createElement('div');panel.dataset.sourcingSaveNotice='1';panel.setAttribute('role','status');panel.textContent=message;
    if(again){const button=document.createElement('button');button.type='button';button.className='push-button small';button.dataset.sourcingRetry='1';button.textContent='同じ内容で保存結果を確認';button.onclick=async()=>{button.disabled=true;try{await again()}finally{button.disabled=false}};panel.append(button)}
    card.append(panel);
  }
  async function retry(url,options,resultNode){
    const report=message=>{if(resultNode)resultNode.textContent=message;else toast(message,'bad')};
    report('保存結果を確認中です');
    try{
      const response=await request(url,options);const data=await response.json();
      if(!response.ok||!data?.ok){report(response.status===409?'他の更新と競合しています（409）。再読込して確認してください':response.status===404?'対象が見つかりません（404）。保存結果は未確認です':'保存結果を確認できません（'+response.status+'）。同じ操作情報を保持しています');return}
      report('保存済みです。同じ操作の結果を確認しました');
      if(!await load('sourcing'))report('保存済みです。画面の再読込には失敗しました');
    }catch{report('保存結果を確認できません。入力と操作情報は保持しています')}
  }
  async function recover(){
    if(typeof document==='undefined')return;
    try{await restore()}catch{return}
    const host=document.getElementById('sourcingHub');if(!host||!pending.size)return;
    const panel=document.createElement('section');panel.dataset.sourcingPendingRecovery='1';panel.setAttribute('role','status');
    const title=document.createElement('b');title.textContent='前の保存操作を確認できます（自動送信しません）';panel.append(title);
    for(const body of pending.values()){
      const line=document.createElement('div');line.textContent=(body.action==='sourcing_reset'?'判定解除':body.verdict)+' '+String(body.note||'');
      line.dataset.sourcingOperationId=body.operationId;
      const resultNode=document.createElement('span');resultNode.dataset.sourcingRecoveryResult='1';resultNode.setAttribute('role','status');
      const button=document.createElement('button');button.type='button';button.className='push-button small';button.textContent='同じ内容で保存結果を確認';button.dataset.sourcingRecoveredRetry='1';
      button.onclick=async()=>{button.disabled=true;try{await retry(API,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+AUTH},body:JSON.stringify(body),sourcingSnapshot:{id:body.id,updatedAt:body.expectedUpdatedAt,judgedAt:body.expectedJudgedAt}},resultNode)}finally{button.disabled=false}};
      line.append(button,resultNode);panel.append(line);
    }
    host.prepend(panel);
  }
  function canBackgroundRender(){
    if(app.busy)return false;
    if(typeof document==='undefined')return true;
    const host=document.getElementById('sourcingBody');
    return !host?.querySelector('[data-sourcing-save-notice],[data-sourcing-load-error]')&&![...(host?.querySelectorAll('.price-wait-input')||[])].some(input=>input.value!==input.defaultValue);
  }
  window.CCSourcingSave={request,snapshot,canBackgroundRender};
  recover();
})();
