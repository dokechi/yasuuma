# command-center-98 作業ガイド

## 入口と読み込み
- 対象はこのディレクトリのみ。現在の入口は `app-v130.html`。
- 入口は `app.html?v=195` を取得し、CSS/JSを挿入して `document.write` する。
- `app.html` 内のJS/CSSが基礎。入口の挿入順・実際の参照先を現行仕様とする。
- バージョン番号の大小で現役/旧版を判断しない。下表のパスはこのディレクトリからの相対パス。
- 複数のJSが `load`・`renderList`・`renderSourcing`・`cardHtml` 等を上書き/ラップする。対象機能の後続層まで確認する。

## 機能と見るファイル
| 機能 | 主要JS/HTML | CSS |
| --- | --- | --- |
| 起動・読み込み | `app-v130.html`, `app.html` | 両HTML内 |
| ログイン・ログアウト | `index.html`（認証後に入口へ遷移）, `app.html` | 各HTML内 |
| 共通一覧・確認/採用/却下・タスク/KPI | `app.html`, `v144-review-status.js` | `app.html` 内 |
| HOME | `v155-home.js`, `v223-home-cleanup.js` | `v155-home.css` |
| 画面遷移・メニュー | `v167-navigation.js`, `v224-home-menu-fix.js`, `app.html` | `v167-navigation.css`, `v225-menu-layer-fix.css` |
| 仕入れ候補・調査ワークフロー | `app.html`, `v147-sourcing-pipeline.js`, `v148-sourcing-last-check.js`, `v149-sourcing-last-check-counts.js` | HTML内・各JSが追加 |
| 仕入れ状態・価格待ち・カード | `v216-sourcing-status-flow.js`, `v217-sourcing-price-wait.js`, `v218-sourcing-card-cleanup.js` | 各JSが追加 |
| 仕入れタブ・保留・クリック | `v219-sourcing-final-tabs.js`, `v221-sourcing-hold-first.js`, `v222-sourcing-click-fix.js` | 各JSが追加 |
| 店の監査・仕入先台帳 | `v158-store-audit.js`, `v220-supplier-ledger-compact.js`, `app.html` | HTML内・各JSが追加 |
| 実仕入れ・月別元帳 | `app.html`, `v143-ledger-month.js`, `v130-ledger-patch.js`, `v211-ledger-cost-columns.js` | HTML内・各JSが追加 |
| 売上・利益・Yahoo売上 | `v159-ledger-sales.js`, `v214-ledger-reconciled-sales.js`, `v215-yahoo-sales-ledger.js` | 各JSが追加 |
| メルカリ売買履歴・候補判定 | `v229-sourcing-mercari-history.js`（下記の読み込み注意参照） | JSが追加 |
| Reddit海外価格差・編集 | `v140-reddit-core.js`, `v140-reddit-ui.js`, `v140-reddit-editor.js`, `v141-reddit-enhancements.js` | `v140-reddit.css`, `v141-reddit-mobile.css` |
| X・応募補助・投稿記録 | `v142-x-desk.js`, `v145-application-automation.js`, `v146-agent-pipeline.js`, `v160-card-publishing.js` | `v142-x-desk.css`, `v160-card-publishing.css` |
| FP/家の原稿・下書きタブ | `v151-fp-content-pipeline.js`, `v161-fp-draft-tab.js`, `v162-house-draft-tab.js` | JSが追加 |
| Chat出典・レビュー・画像引渡し | `v204-chat-execution-source.js`, `v206-review-copy-handoff.js`, `v207-individual-image-handoff.js`, `v208-chat-image-contract-guard.js`, `v209-chat-review-labels.js`, `v210-chat-research-handoff.js` | 各JSが追加 |
| Chat編集・キャリア | `chat-editorial-career-20260918.js` | JSが追加 |
| カルーセル・お金原稿の表示/検証 | `v226-adaptive-carousel.js`, `v229-money-double-check.js`, `v228-money-full-copy.js` | 各JSが追加 |
| 日報・Cooneyへのリンク | `v148-daily-report-link.js` | HTML内 |
| Win98の見た目・操作性 | `v156-win98-finish.js`, `v157-accessibility.js` | `v150-hover-cues.css`, `v156-win98-finish.css`, `v157-accessibility.css` |

## 読み込み上の注意
- 日報リンクJSは `app.html` と入口の双方から参照される。指示なしに重複を整理しない。
- 入口末尾のメルカリ履歴JSは生成HTMLの閉じタグが通常と異なる。参照の存在だけで実行済みと断定せず、関連修正時に読み込みを確認する。
- データ通信はSupabase Edge Functions（retro / sourcing-ledger / reddit / x / workflow API）。API側の探索は必要になった場合だけ行う。

## 作業ルール
- 最初に入口の参照を確認し、対象機能の表から必要なファイルと直接の依存先だけ読む。全リポジトリを探索しない。
- 入口および読み込み先から参照されないファイルを安易に編集・削除しない。旧版と決めつけない。
- mainへ直接変更しない。新しい作業ブランチを使う。
- 指示外のリファクタリング、削除、統合、デザイン変更、読み込み順変更をしない。
- 既存データ、localStorage、Supabaseのテーブル・スキーマ・API契約を勝手に変更しない。

## 修正後の確認
- 対象機能に対応する既存 `*.test.cjs` を読み、`node --test command-center-98/<対象テスト>.test.cjs` をリポジトリルートで実行する。
- 既存テストはChat出典、個別画像引渡し、キャリア、カルーセル、お金原稿にある。無関係なテストまで最初から読まない。
- JS変更時は `node --check <変更ファイル>`、画面変更時は入口から対象画面・操作とコンソールエラーを確認する。
- 差分が指示範囲内か確認し、実施した確認と未確認の事項を報告する。
