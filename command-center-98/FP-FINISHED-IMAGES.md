# FP完成画像の保存・再読・本人確認

この変更は既存FP候補に画像を添付する機能です。媒体別の原稿を統合・改稿せず、SNS投稿や予約は実行しません。

## 保存契約

- 表は既存の public.command_center_task_events を使います。DDLはありません。
- 画像の task_id は既存の affiliate-assets-v1。result_kind は fp_finished_asset、event_key は fp:<候補IDのSHA256>:<セットSHA256>:<ページ番号>。既存アフィ画像キーとは別領域です。
- PNGは既存契約と同じbase64。署名・IHDR・全チャンクCRC・IEND・4:5寸法を検査します。ブラウザーでもデコードします。
- 全枚・ページ順・重複・24MB合計上限を検査します。
- finished_images は原稿revision、LOCK時刻、掲載全文・caption等のSHA256、セットID、各ページの画像SHA256と保存キーを持ちます。
- 候補のJSONBは読み取った元payloadと一致する場合だけ更新（CAS）。原稿、根拠、媒体設定、旧image_historyは保全します。画像イベントは不変です。CAS失敗で残った未参照セットは再試行時に再利用でき、既存セットは削除しません。
- GET resource=fp-finished-images と PATCH fp_finished_import / fp_finished_confirm_manual は既存認証の後でのみ処理。task-eventsの一般一覧はaffiliate-assets-v1を引き続き除外します。

## 状態と本人操作

原稿完成と画像保存と本人検品は別です。保存直後は saved_pending_review。再読して画像デコード、画像ハッシュ、原稿ハッシュを照合します。原稿が変われば stale とし、旧画像を現行版として表示・確認しません。必須資料画像を見比べた本人のチェックがない場合は確認保存を止めます。confirmed_manual は画像検品の記録で、公開・投稿済みという意味ではありません。媒体設定未確認は別の確認点として残します。

司令塔のFP原稿を開くと、完成画像・掲載全文・確認点、PNG全枚取り込み、全枚保存、再読、各PNGのダウンロード、本人確認保存が表示されます。PNGダウンロードにはAPIの署名や認証情報を入れません。

## 今回の6枚

平均貯蓄の既存6枚原稿だけに無料Canvas組版を用意しています。display_copyの全文を使い、文字が収まらなければ省略せず停止します。白地と墨色と青緑。公式PDFの印刷27ページ（PDF33ページ目）の男女別グラフPNGが3枚目に必須です。資料画像なしでは組版しません。数値は総務省PDFを再照合済みですが、実画像の視認確認は未実施です。生成後はプレビュー→保存→再読→本人検品。画像を保存するだけでreadyや公開済みにはしません。

## 手動確認の予約停止範囲

専用 action=affiliate_confirm_manual が投稿の posting_mode=manual を記録します。その投稿の affiliate_queue だけが403です。既存の別用途の affiliate_approve / affiliate_queue は維持します。旧クライアントが確認済み手動投稿をaffiliate_approveで再承認しても、manualフラグは消えません。元々送信済み・結果不明の履歴は既存のロックを維持します。

## 検証と公開前の残作業

隔離DBで12項目を確認：保存・再読、原稿/LOCK古版、全枚/順番、重複、PNG破損、必須資料確認なしの停止、同じセットの再利用、原稿改訂時の旧画像非表示、画像改変検出、CAS競合、元payload/履歴保全。手動確認テストは専用API一回のみ、manual投稿の403と他用途の旧予約経路保全を確認。Canvasの保守的文字幅で6枚全掲載全文の収まりと必須画像なし停止を確認。実Node/DOM/ブラウザー描画、実DB保存・再読は未確認です。

公開前にローカルAGENTS.md/.agents/skillsを確認し、node scripts/manual-posting.test.cjs、node scripts/fp-finished-images.test.mjs、既存アフィAPI/DOMとFP回帰検証を実施してください。PChelperはsetup refresh had errorsで起動不可ですが、コネクタは使用可能です。既存Edge Functionのindex.ts/affiliate-production-api.ts/sharedがGitHub mainと一致することを読取確認済みです。

バックエンドを先に反映してからフロントを公開します。変更ファイルと検証結果を親へ報告してから公開反映へ進みます。
