# 次の原稿に使う本人の手直し

目的は、本人の手直しと体感の反応を次の制作で参照し、直す手間を減らすこと。数値の入力やSNS API連携は不要。

- 元文は保存元からサーバーが取得し、本人の最終稿と別々に保持する。
- 手直し・バズ・取り消しは追記し、以前の組み合わせを上書きしない。
- バズは本人の体感。未押下は未評価であり、失敗やゼロではない。
- 最終稿が変わると、その文の反応は未評価になる。以前の反応は以前の文とともに履歴に残る。
- 同時編集と元文の更新は409で止める。未保存の文は端末に保持する。

## 制作前の読み取り

既存認証つきの `command-center-retro-api?resource=post-learning-examples&accountKey=fp` で最新の組を取得できる。通常の投稿候補一覧には出さない。

DBから読む場合は `command_center_task_events` の `task_id = 'manual-post-learning-v1'`、`payload.contract = 'post-learning-v1'` を新しい順で読み、`payload.source_key` ごとの最新revisionを採用する。元文は `payload.original.text`、最終稿は `payload.final.text`、体感の反応は `payload.subjective_result.status`。変更箇所の範囲は `payload.changes`。参照したidとrevisionを新規候補の `editorial_learning_refs` に残す。

同じ媒体・近い迷いの事例から、口調、冒頭、説明量、順番の違いを読み取る。バズから利益や修正の因果効果を断定しない。制度・金額・条件は新しい一次情報で確認する。事例がなければ通常どおり進め、本人に記録作業を求めない。これは保存資料の参照であり、基盤モデルの自動学習ではない。

FPの既存制作タスク「お金｜チャットから実行」には、2026-10-23にこの参照手順を追記済み。
