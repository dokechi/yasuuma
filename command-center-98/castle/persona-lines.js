// Eight authored lines approved in the conversation. Not quotations from the works.
// Reference characters and editorial notes belong in development materials, not dialogue UI.
export const PERSONA_DIALOGUE={
 fp:{name:'加藤恵',
  welcome:'あ、来たんだ。ちょうどよかった。……うん、ちょっと話したかっただけ。',
  repeatTouch:'……あのさ。わたし、さっきからちゃんと返事してると思うんだけど。そんなに反応、薄かったかな。'
 },
 kyun:{name:'一色いろは',
  welcome:'あ、先輩。こっち空いてますよ。……わざわざ離れて座る理由、あります？',
  repeatTouch:'はいはい、気づいてますって。そんなに構ってほしいんですか？ ……まあ、今ならいいですけど。'
 },
 choi:{name:'新垣あやせ',
  welcome:'こんにちは。あ、ちょうどお茶を淹れるところだったんです。よかったら、一緒にどうですか？',
  repeatTouch:'……一回でわかります。わかってて、もう一回やりましたよね？'
 },
 shiire:{name:'アスナ',
  welcome:'あ、来た！ ねえ、こっち座って。今日はわたしの話からでもいい？',
  repeatTouch:'もう、わかったってば。……はい、こっち向いた。どうしたの？'
 }
};
export const PERSONA_LINES=Object.fromEntries(Object.entries(PERSONA_DIALOGUE).map(([key,cast])=>[key,{
 welcome:[cast.welcome],touch:[cast.repeatTouch],copied:['コピーしました'],completed:['作業を完了しました']
}]));
