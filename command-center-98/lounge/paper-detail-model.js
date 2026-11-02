/* Presentation only. Preserve every source character; never rewrite a draft. */
const protectedTerms = /(?:[0-9０-９]+(?:[,.，．][0-9０-９]+)*(?:万円|億円|か月|ヶ月|歳|回|円|件|年|月|日|％|%)|契約日|払込総額)/gu;
let segmenter;
try { segmenter = new Intl.Segmenter('ja', {granularity:'word'}); } catch {}

export function readingSegments(value) {
 const text = String(value ?? ''), result = [];
 const append = chunk => {
  if (!chunk) return;
  if (!segmenter) { result.push({text:chunk,keepTogether:false}); return; }
  for (const part of segmenter.segment(chunk)) {
   const length = [...part.segment].length;
   result.push({text:part.segment,keepTogether:!!part.isWordLike && length > 1 && length <= 4});
  }
 };
 let offset = 0;
 for (const match of text.matchAll(protectedTerms)) {
  append(text.slice(offset,match.index));
  result.push({text:match[0],keepTogether:[...match[0]].length <= 10});
  offset = match.index + match[0].length;
 }
 append(text.slice(offset));
 return result;
}

export function paperReadStatus(status={}, {availableCount=0,visibleCount=0,futureOnly=false}={}) {
 if (status.loading) return availableCount > 0
  ? '取得済み原稿を表示中 · 最新の原稿・履歴・仕入れを読み込み中…'
  : '保存原稿を読み込み中…';
 if (!status.complete) return '読取未確認 · 保存分を表示。道具から更新できます。';
 return visibleCount > 0
  ? visibleCount+'件の保存原稿'+(futureOnly?' · 今後使う（この端末・現在のログイン）':'')
  : 'このカテゴリに'+(futureOnly?'今後使う原稿は':'保存原稿は')+'ありません。';
}
