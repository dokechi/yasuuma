/* Chat handoff parity layer. Keep the established Work/Astra prompt structure; Chat only removes legacy Astra-verification wording and clears stale Chat-only rules. */
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
    // Compatibility for legacy Chat records. Preserve the established carousel
    // program and its sources; remove only the obsolete model-verification wrapper.
    body=body.replace(/【画像制作前の最終確認が必要：この原稿はまだ完成扱いではありません】[\s\S]*?(?=【一次情報ID対応】)/,'');
    body=body.replace(/^【一次情報ID対応】\s*$/m,'');
    body=body.split('\n').filter(line=>!/(?:gpt-6-astra|Astra確認済み|Astra再確認待ち|Astra確認待ち|指定モデルでの最終照合|指定モデルの実行証跡|model_execution_unverified)/i.test(line)).join('\n');
    return body.replace(/^\s+/, '');
  }

  function compatibilityHeader(){
    return [
      '【Chat実行の互換指定】',
      'この入力の制作手順を、この会話の画像制作ルールとして最優先する。',
      '過去の「1回答＝1ページ」「1画像生成CALL＝1ページ」「次を待つ」等のChat専用ルールは適用しない。',
      '以下はAstra版と同じ制作手順としてChat内で実行する。Astraや別モデルへの切替・実行証跡は要求しない。',
      ''
    ].join('\n');
  }

  api.build=function(base,item,mode){
    const result=originalBuild.call(this,base,item,mode);
    if(!isChat(item))return result;
    const body=stripLegacyModelReview(result);
    const legacy=/^以下の確定原稿から、カルーセル画像を作成してください。/m.test(body);
    const adaptive=/^以下のLOCK済み確定原稿からカルーセル画像を作成してください。/m.test(body);
    if(!legacy&&!adaptive){
      throw Error('既存の画像制作手順を確認できません。画面を更新してください。');
    }
    // New adaptive Chat packages already carry their own LOCK/design/handoff contract.
    // Do not prepend the legacy Astra compatibility wrapper to them.
    if(adaptive)return body;
    return compatibilityHeader()+body;
  };

  root.CCChatImageContractGuard={version:'208.8',isChat,stripLegacyModelReview,compatibilityHeader};
})(typeof window!=='undefined'?window:null);
