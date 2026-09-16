/* Chat-only UI compatibility layer for legacy model-verification labels. No DB writes. */
(function(root){
  'use strict';
  if(!root||!root.document||root.CCChatReviewLabels)return;
  const doc=root.document;
  const text=value=>String(value??'').trim();
  const isChat=item=>root.CCChatExecution?.isChat?.(item)||text(item?.payload?.execution_source||item?.payload?.execution_channel||item?.execution_source||item?.execution_channel).toLowerCase()==='chat';
  const modelOnlyLegacy=item=>{
    if(!isChat(item))return false;
    const p=item?.payload||{};
    if(p.blocked_reason!=='model_execution_unverified')return false;
    if(p.research_status!=='verified')return false;
    if(Array.isArray(p.missing_evidence)&&p.missing_evidence.length)return false;
    if(Array.isArray(p.public_leak_issues)&&p.public_leak_issues.length)return false;
    const unresolved=Array.isArray(p.final_review?.unresolved_items)?p.final_review.unresolved_items:[];
    return unresolved.every(value=>/(?:model_execution_unverified|指定モデルの実行証跡を取得できていない)/.test(text(value)));
  };
  function replaceText(rootNode,item){
    if(!rootNode||!modelOnlyLegacy(item))return;
    const walker=doc.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      let value=node.nodeValue||'';
      value=value
        .replace(/Astra再確認待ち/g,'Chat内再確認')
        .replace(/Astra確認待ち/g,'Chat内再確認')
        .replace(/内容照合済み\s*[／/]\s*指定モデルの実行証跡は未確認。?/g,'内容照合済み／画像制作前にChat内で再確認')
        .replace(/指定モデルの実行証跡は未確認。?/g,'画像制作前にChat内で再確認');
      if(value!==node.nodeValue)node.nodeValue=value;
    });
  }
  function items(){
    try{return typeof app!=='undefined'&&Array.isArray(app.items)?app.items:[]}catch(_){return[]}
  }
  function refresh(){
    const rows=items();
    rows.forEach(item=>{
      if(!modelOnlyLegacy(item))return;
      if(typeof cssSafe==='function'){
        const card=doc.getElementById('card-'+cssSafe(item.id));
        if(card)replaceText(card,item);
      }
      doc.querySelectorAll('[data-fp-copy-package]').forEach(button=>{
        if(String(button.dataset.fpCopyPackage)!==String(item.id))return;
        const modal=button.closest('[data-fp-modal]')||button.closest('.fp-draft-modal')||button.closest('.fp-draft-dialog');
        if(modal)replaceText(modal,item);
      });
    });
  }
  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    (root.requestAnimationFrame||(fn=>root.setTimeout(fn,0)))(()=>{queued=false;refresh();});
  };
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.addedNodes?.length||m.type==='characterData'))queue();
  });
  observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
  root.CCChatReviewLabels={version:'209.1',isChat,modelOnlyLegacy,refresh};
  queue();
})(typeof window!=='undefined'?window:null);
