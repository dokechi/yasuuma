/* Chat carousel handoff guard. Chat only: one assistant response = one image generation = one saveable page. */
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
    '【Chat版の最優先出力契約：1回答＝1ページ＝保存可能な画像1枚】',
    'この回答では画像生成機能を1回だけ呼び出してください。',
    '「次」と送られるまで2ページ目以降を生成しないでください。',
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
      '【Chat版の最優先出力契約：1回答＝1ページ＝保存可能な画像1枚】',
      'この原稿は全'+count+'ページですが、1回のアシスタント回答で複数ページを生成してはいけません。',
      '完成条件は「全'+count+'ページが、ChatGPT上でそれぞれ個別に開いて保存できる、個別保存可能な通常の生成画像として別々の回答に存在すること」です。',
      size||ratio?'各画像のサイズ・比率：'+[size,ratio].filter(Boolean).join('／')+'。これは1ページ1枚ごとの指定です。':'',
      '',
      '【最初の回答で必ず行うこと】',
      '0. 下記の原稿・一次情報・素材・制作条件をChat内で確認してください。数字・条件・原稿に問題が見つかった場合だけ画像を生成せず、その問題を示してください。別モデルやAstraへの切替・実行証跡は要求しません。',
      mode==='review'?'この原稿は旧保存データ上「再確認待ち」ですが、Chat版ではこの会話内で原稿と根拠を照合して完結します。Astra確認は不要です。問題がなければ1ページ目の生成へ進んでください。':'',
      '1. この回答では画像生成機能を1回だけ呼び出してください。対象は1/'+count+'ページだけ、出力枚数も1枚だけです。n>1、複数回の画像生成呼び出し、複数ページ同時生成は禁止です。',
      '2. 1/'+count+'ページの文章・図・必要素材だけを描画してください。他ページの本文、縮小版、サムネイル、予告画像を入れないでください。',
      '3. 1/'+count+'ページの画像をChatGPTの通常の生成画像として直接表示したら、その回答をそこで終了してください。説明文、まとめ画像、残りページの生成を続けないでください。',
      '4. 「次」と送られるまで2ページ目以降を生成しないでください。',
      '',
      '【ユーザーが「次」と送った後】',
      '5. 会話上で直前に完成したページの次の1ページだけを対象にし、その回答でも画像生成機能を1回だけ呼び、1枚だけ出力して回答を終了してください。',
      '6. 以後も「次」1回につき次ページ1枚だけを生成します。'+count+'/'+count+'まで同じ手順を繰り返してください。',
      '7. どこまで生成したか不明な場合は、勝手にまとめて生成せず、次に作るページ番号だけ確認してください。',
      '',
      '【禁止】',
      'コラージュ、グリッド、2列×3段、分割パネル、コンタクトシート、全ページ一覧、縦長連結画像、PDF風プレビュー、全ページ縮小プレビューは禁止です。',
      '1回の画像生成で複数画像を返すこと、同じアシスタント回答内で画像生成を2回以上呼ぶこと、右側に複数生成結果のサムネイルを並べる前提の一括生成も禁止です。',
      '先にまとめ画像を作って後から切り分ける方法も禁止です。',
      '単一ページ内の説明図・比較図は原稿どおり使用できます。禁止対象は別ページ同士を同じ生成結果へ入れることです。',
      '',
      '【検品】',
      '各回答の画像に2ページ以上が入っていた場合、その画像は不合格です。同じ回答内で別ページを追加せず、対象ページ1枚だけを再生成してください。',
      'ページ番号は現在ページ／全'+count+'ページとして画像内に表示してください。',
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

  root.CCChatImageContractGuard={version:'208.4',isChat,required:REQUIRED.slice(),chatContract};
})(typeof window!=='undefined'?window:null);
