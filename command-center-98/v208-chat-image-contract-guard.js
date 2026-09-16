/* Chat carousel handoff guard. Chat only: one image-generation call = one page = one saveable image. */
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
    '【Chat版の最優先出力契約：1画像生成CALL＝1ページ＝保存可能な画像1枚】',
    '各ページごとに画像生成機能を別々に1回ずつ呼び出してください。',
    '各CALLの出力枚数は必ず1枚（n=1）',
    'ユーザーの追加返信を待たず、全ページを順番に処理してください。',
    '個別保存可能な通常の生成画像'
  ];
  const OLD_END='【画像出力仕様ここまで】';

  function stripSharedContract(result){
    const index=result.indexOf(OLD_END);
    if(index<0)return result;
    return result.slice(index+OLD_END.length).replace(/^\s+/,'');
  }

  function stripLegacyModelReview(result){
    let body=String(result||'');
    body=body.replace(/【画像制作前の最終確認が必要：この原稿はまだ完成扱いではありません】[\s\S]*?(?=【一次情報ID対応】)/,'');
    body=body.split('\n').filter(line=>!/(?:gpt-6-astra|Astra確認済み|指定モデルでの最終照合|指定モデルの実行証跡|model_execution_unverified)/i.test(line)).join('\n');
    return body.replace(/^\s+/,'');
  }

  function chatContract(item,mode){
    const spec=api.spec(item);
    const count=spec.count;
    const size=spec.size;
    const ratio=spec.ratio;
    return [
      '【Chat版の最優先出力契約：1画像生成CALL＝1ページ＝保存可能な画像1枚】',
      'この原稿は全'+count+'ページです。1回のユーザー依頼の中で全ページを作成して構いません。',
      'ただし、複数ページを1回の画像生成CALLへ渡してはいけません。各ページごとに画像生成機能を別々に1回ずつ呼び出してください。',
      '完成条件は「全'+count+'ページが、ChatGPT上でそれぞれ個別に開いて保存できる、個別保存可能な通常の生成画像として存在すること」です。',
      size||ratio?'各画像のサイズ・比率：'+[size,ratio].filter(Boolean).join('／')+'。これは1ページ1枚ごとの指定です。':'',
      '',
      '【最初に行うこと】',
      '0. 下記の原稿・一次情報・素材・制作条件をChat内で確認してください。数字・条件・原稿に問題が見つかった場合だけ画像生成を開始せず、その問題を示してください。別モデルやAstraへの切替・実行証跡は要求しません。',
      mode==='review'?'この原稿は旧保存データ上「再確認待ち」ですが、Chat版ではこの会話内で原稿と根拠を照合して完結します。Astra確認は不要です。問題がなければ全ページの画像生成へ進んでください。':'',
      '',
      '【生成の手順】',
      '1. 1/'+count+'ページだけを対象に画像生成機能を1回呼び出してください。各CALLの出力枚数は必ず1枚（n=1）です。1つのCALLに2ページ以上を含めないでください。',
      '2. 1/'+count+'の生成結果が返ったら、その画像を他ページと結合・再配置せず、そのまま独立した通常の生成画像として保持してください。',
      '3. 次に2/'+count+'ページだけを対象に、新しい画像生成CALLを1回実行してください。以後も同様に、'+count+'/'+count+'までページごとに別CALLを順番に実行してください。',
      '4. ユーザーの追加返信を待たず、全ページを順番に処理してください。全'+count+'ページなら画像生成CALLも原則'+count+'回です。',
      '5. 各CALLでは、そのページの文章・図・必要素材だけを描画してください。他ページの本文、縮小版、サムネイル、予告画像を入れないでください。',
      '6. 各画像には現在ページ／全'+count+'ページのページ番号を記載してください。',
      '',
      '【禁止】',
      'コラージュ、グリッド、2列×3段、分割パネル、コンタクトシート、全ページ一覧、縦長連結画像、PDF風プレビュー、全ページ縮小プレビューは禁止です。',
      '1回の画像生成CALLで複数画像を返すこと、n>1、一括で全ページを画像生成へ渡すことは禁止です。',
      '生成済みの別ページを新しい画像の中へサムネイルとして入れたり、複数ページをあとから1枚へ結合したりしないでください。',
      '先にまとめ画像を作って後から切り分ける方法も禁止です。',
      '単一ページ内の説明図・比較図は原稿どおり使用できます。禁止対象は別ページ同士を同じ生成結果へ入れることです。',
      '',
      '【検品】',
      '各CALLの画像に2ページ以上が入っていた場合、そのCALLだけ不合格です。そのページだけをn=1で再生成し、正常な他ページは変更しないでください。',
      '全ページ生成後、独立画像が全'+count+'枚あること、各画像が1ページ分だけであること、ページ番号と原稿が一致することを確認してください。',
      'この手順文自体を画像・タイトル・キャプションへ印字しないでください。',
      '【Chat版個別保存仕様ここまで】'
    ].filter(Boolean).join('\n');
  }

  api.build=function(base,item,mode){
    const result=originalBuild.call(this,base,item,mode);
    if(!isChat(item))return result;
    const body=stripLegacyModelReview(stripSharedContract(result));
    const strict=chatContract(item,mode);
    const finalText=strict+'\n\n'+body;
    const missing=REQUIRED.filter(marker=>!finalText.includes(marker));
    if(missing.length)throw Error('Chat原稿の個別保存仕様が欠落しています。コピーを中止しました。画面を更新してください。');
    if(/(?:gpt-6-astra|Astra確認済み|指定モデルでの最終照合|指定モデルの実行証跡)/i.test(finalText))throw Error('Chat原稿に旧Astra確認指示が残っています。コピーを中止しました。画面を更新してください。');
    return finalText;
  };

  root.CCChatImageContractGuard={version:'208.5',isChat,required:REQUIRED.slice(),chatContract};
})(typeof window!=='undefined'?window:null);
