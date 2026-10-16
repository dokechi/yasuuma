// Short, unchanged quotations. Source types remain explicit; no generated dialogue.
export const PERSONA_QUOTES={
 fp:{name:'加藤恵',quotes:[
  {text:'なんだかなぁ',context:'おなじみのひとこと',source:'冴えカノ Fine・公式グッズ表記',kind:'公式グッズ',url:'https://www.cospa.com/cospa/detail/id/00000099153'},
  {text:'わ～この人がそういうこと言うんだ～',context:'フラットなツッコミ',source:'丸戸史明「冴えないアニメ化の祝いかた」',kind:'原作者SS',url:'https://kakuyomu.jp/works/1177354054881386875/episodes/1177354054881386902'},
  {text:'あ、うん',context:'何気ない返事',source:'丸戸史明「冴えないアニメ化の祝いかた」',kind:'原作者SS',url:'https://kakuyomu.jp/works/1177354054881386875/episodes/1177354054881386902'}
 ]},
 kyun:{name:'一色いろは',quotes:[
  {text:'責任、とってくださいね',context:'距離が近づくひとこと',source:'俺ガイル 続・公式グッズ表記',kind:'公式グッズ',url:'https://www.cospa.com/nijigencospa/detail/id/00000086989'},
  {text:'先輩、こういう甘いのは嫌いですか？',context:'続 第12話・チョコの味見',source:'俺ガイル 続 第12話・有志の台詞採録',kind:'有志採録',url:'https://animemanga33.com/archives/23418'},
  {text:'手伝ってくれませんか？',context:'完 第3話・お願い',source:'俺ガイル 完 第3話・有志の台詞採録',kind:'有志採録',url:'https://animemanga33.com/archives/23418'}
 ]},
 choi:{name:'新垣あやせ',quotes:[
  {text:'つ、通報しますよ！',context:'あやせif 上・抗議（抜粋）',source:'伏見つかさ「俺の妹がこんなに可愛いわけがない(13)」公式紹介文',kind:'原作公式紹介',url:'https://www.kadokawa.co.jp/product/321705000133/'},
  {text:'……桐乃には、内緒ですよ？',context:'あやせif 下・秘密の交際',source:'伏見つかさ「俺の妹がこんなに可愛いわけがない(14)」公式紹介文',kind:'原作公式紹介',url:'https://www.kadokawa.co.jp/product/321907000708/'},
  {text:'……わたしも……恋人と海とか……行きたいです',context:'あやせif 下・夏の願い',source:'伏見つかさ「俺の妹がこんなに可愛いわけがない(14)」公式紹介文',kind:'原作公式紹介',url:'https://www.kadokawa.co.jp/product/321907000708/'}
 ]},
 shiire:{name:'アスナ',quotes:[
  {text:'ハイ　まかされました',context:'第9話・引き受ける返事',source:'SAO AWARD 2014・録音賞／第9話',kind:'アニメ公式',url:'https://www.swordart-online.net/SAOA/'},
  {text:'はい。',context:'第10話・プロポーズへの返事',source:'SAO AWARD 2014・録音賞／第10話',kind:'アニメ公式',url:'https://www.swordart-online.net/SAOA/'},
  {text:'わたしは死なないよ。だって、わたしは……君を守るほうだもん',context:'第10話・守る決意',source:'SAO AWARD 2014・録音賞／第10話',kind:'アニメ公式',url:'https://www.swordart-online.net/SAOA/'}
 ]}
};
// Legacy feedback uses the same bank; task outcomes stay neutral UI messages.
export const PERSONA_LINES=Object.fromEntries(Object.entries(PERSONA_QUOTES).map(([key,cast])=>[key,{
 welcome:cast.quotes.map(q=>q.text),touch:cast.quotes.map(q=>q.text),copied:['コピーしました'],completed:['作業を完了しました']
}]));
