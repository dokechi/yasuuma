/* Chat handoff parity layer. Keep the established Work/Astra prompt structure; Chat only removes legacy Astra-verification wording. */
(function(root){
  'use strict';
  if(!root||!root.CCIndividualImages||root.CCChatImageContractGuard)return;
  const api=root.CCIndividualImages;
  const originalBuild=api.build;
  if(typeof originalBuild!=='function')return;

  const text=value=>String(value??'').trim();
  const isChat=item=>{
    if(root.CCChatExecution?.isChat?.(item))return true;
    const p=item?.payload||item?.sourcePayload?.event?.payload||item?.source_payload?.event?.payload||{};
    return text(p.execution_source||p.execution_channel||item?.execution_source||item?.execution_channel).toLowerCase()==='chat';
  };

  function stripLegacyModelReview(result){
    let body=String(result||'');
    // Compatibility for copies built from legacy Chat records that were once
    // blocked only by Astra/model-execution evidence. The underlying carousel
    // program is preserved; only the obsolete model-verification wrapper is removed.
    body=body.replace(/【画像制作前の最終確認が必要：この原稿はまだ完成扱いではありません】[\s\S]*?(?=【一次情報ID対応】)/,'');
    body=body.replace(/【一次情報ID対応】\s*(?:[^\n]*\n)*/,'');
    body=body.split('\n').filter(line=>!/(?:gpt-6-astra|Astra確認済み|Astra再確認待ち|Astra確認待ち|指定モデルでの最終照合|指定モデルの実行証跡|model_execution_unverified)/i.test(line)).join('\n');
    return body.replace(/^\s+/, '');
  }

  api.build=function(base,item,mode){
    const result=originalBuild.call(this,base,item,mode);
    if(!isChat(item))return result;
    const finalText=stripLegacyModelReview(result);
    if(!/^以下の確定原稿から、カルーセル画像を作成してください。/m.test(finalText)){
      throw Error('既存の画像制作手順を確認できません。画面を更新してください。');
    }
    return finalText;
  };

  root.CCChatImageContractGuard={version:'208.6',isChat,stripLegacyModelReview};
})(typeof window!=='undefined'?window:null);
