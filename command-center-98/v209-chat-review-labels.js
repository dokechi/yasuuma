/* Chat-only UI compatibility layer for legacy Astra/model-verification labels. No DB writes. */
(function(root){
  'use strict';
  if(!root||!root.document||root.CCChatReviewLabels)return;
  const doc=root.document;
  const text=value=>String(value??'').trim();
  const isChat=item=>root.CCChatExecution?.isChat?.(item)||text(item?.payload?.execution_source||item?.payload?.execution_channel||item?.execution_source||item?.execution_channel).toLowerCase()==='chat';

  function replaceKnownText(rootNode){
    if(!rootNode)return;
    const walker=doc.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      let value=node.nodeValue||'';
      value=value
        .replace(/Astra再確認待ち/g,'Chat内再確認')
        .replace(/Astra確認待ち/g,'Chat内再確認')
        .replace(/内容照合済み\s*[／/]\s*指定モデルの実行証跡は未確認。?/g,'内容照合済み／Chat内確認')
        .replace(/指定モデルの実行証跡は未確認。?/g,'Chat内確認')
        .replace(/指定モデルでの最終照合/g,'Chat内での最終照合')
        .replace(/gpt-6-astra\s*\(reasoning_effort=medium\)/gi,'Chat内確認');
      if(value!==node.nodeValue)node.nodeValue=value;
    });
  }

  function items(){
    try{return typeof app!=='undefined'&&Array.isArray(app.items)?app.items:[]}catch(_){return[]}
  }

  function itemById(id){
    return items().find(item=>String(item?.id)===String(id));
  }

  function cardIsChat(card,item){
    return !!(isChat(item)||card?.querySelector?.('[data-cc-chat-head="chat"], [data-cc-chat-execution="chat"]'));
  }

  function refresh(){
    const rows=items();

    // Primary path: known Chat items.
    rows.forEach(item=>{
      if(!isChat(item))return;
      if(typeof cssSafe==='function'){
        const card=doc.getElementById('card-'+cssSafe(item.id));
        if(card)replaceKnownText(card);
      }
      doc.querySelectorAll('[data-fp-copy-package]').forEach(button=>{
        if(String(button.dataset.fpCopyPackage)!==String(item.id))return;
        const modal=button.closest('[data-fp-modal]')||button.closest('.fp-draft-modal')||button.closest('.fp-draft-dialog');
        if(modal)replaceKnownText(modal);
      });
    });

    // Fail-safe path: if the visible card already has a CHAT badge, it is Chat-origin.
    // This avoids depending on legacy payload status fields such as blocked_reason.
    doc.querySelectorAll('[id^="card-"]').forEach(card=>{
      const badge=card.querySelector('[data-cc-chat-head="chat"], [data-cc-chat-execution="chat"]');
      if(badge)replaceKnownText(card);
    });

    // Modal path: resolve through the copy-package id, then replace only for Chat items.
    doc.querySelectorAll('[data-fp-copy-package]').forEach(button=>{
      const item=itemById(button.dataset.fpCopyPackage);
      const modal=button.closest('[data-fp-modal]')||button.closest('.fp-draft-modal')||button.closest('.fp-draft-dialog');
      if(modal&&cardIsChat(modal,item))replaceKnownText(modal);
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
  root.CCChatReviewLabels={version:'209.2',isChat,replaceKnownText,refresh};
  queue();
})(typeof window!=='undefined'?window:null);
