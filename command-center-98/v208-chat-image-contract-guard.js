/* Chat carousel handoff guard. Fails closed if the one-page-per-image contract is missing. */
(function(root){
  'use strict';
  if(!root||!root.CCIndividualImages||root.CCChatImageContractGuard)return;
  const api=root.CCIndividualImages;
  const originalBuild=api.build;
  if(typeof originalBuild!=='function')return;

  const text=value=>String(value??'').trim();
  const isChat=item=>{
    const p=item?.payload||item?.sourcePayload?.event?.payload||item?.source_payload?.event?.payload||{};
    return text(p.execution_source||p.execution_channel||item?.execution_source||item?.execution_channel).toLowerCase()==='chat';
  };
  const REQUIRED=[
    '【画像出力の必須仕様：1ページ＝1画像／1回の生成＝1ページ】',
    'コラージュ、2列×3段などの複数ページ配置',
    '最初から各ページを個別に描画してください。'
  ];

  api.build=function(base,item,mode){
    const result=originalBuild.call(this,base,item,mode);
    if(isChat(item)){
      const missing=REQUIRED.filter(marker=>!result.includes(marker));
      if(missing.length)throw Error('Chat原稿の画像出力仕様が欠落しています。コピーを中止しました。画面を更新してください。');
    }
    return result;
  };

  root.CCChatImageContractGuard={version:'208.1',isChat,required:REQUIRED.slice()};
})(typeof window!=='undefined'?window:null);
