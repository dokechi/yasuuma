# 仕入れ表示モデル・描画依存の整理

基準main: `b8d33a5c4867b10f479aa2a8d914577aab23e4c8`。今回もコードとテストのDraft PRまで。本番反映は親レビュー後。

## 実コードの上書き順

app-assets.jsonの同期ロード順で、app.htmlのrenderSourcingに次の18ラッパーが積まれる。呼出しは末尾から内側へ進み、後処理は逆順で戻る。

| 順序 | ファイル | 役割・注意 |
| --- | --- | --- |
| 1–3 | v143-ledger-month / v130-ledger-patch / v141-reddit-enhancements | 月・購入バッジ・台帳装飾・遅延カード装飾 |
| 4–5 | v147-sourcing-pipeline / v148-sourcing-last-check | workflow状態・研究検証。ensure完了後に捕捉済み内側rendererを再実行する経路あり |
| 6–10 | v158-store-audit / v159-ledger-sales / v214-ledger-reconciled-sales / v215-yahoo-sales-ledger / v211-ledger-cost-columns | 店舗・販売・照合・コスト列の後処理 |
| 11 | v216-sourcing-status-flow | holdは専用描画してreturnし、それ以前のrendererは通らない。その他は内側renderer→集計・選択・ラベル処理 |
| 12–15 | v217-sourcing-price-wait / v218-sourcing-card-cleanup / v219-sourcing-final-tabs / v220-supplier-ledger-compact | 価格手入力、カード整形、タブ変換、台帳整形。MutationObserverによる別の後処理も存在 |
| 16 | v221-sourcing-hold-first | queue→hold、内側を1回実行、新着カードを保留へ追加 |
| 17–18 | v167-navigation / v231-trade-details | ナビ装飾・同期、取引詳細 |

v222はクリック時の入口、v229はsourcingCostHtmlの上書きと初期再描画であり、renderSourcingラッパーではない。isReadySourcingはapp.htmlの定義をv148とv229が拡張するため、表示モデルは呼出時点の最終関数を使う。

## 今回の最小変更

- DOM/通信/保存を持たないsourcing-display-model.jsをv216直前に同期ロード。新着・保留済みの並び順と調査件数を共通化する。配列はfilter/sliceで新規作成し、入力レコードを変更しない。永続キャッシュなし。
- v216とv221が同じモデルでcaption/バッジ/新着カードを計算。v221の重複集計とバッジ更新を除去し、既に正しいcaption/バッジは再代入しない。明細・根拠URL・手入力・イベントbindingは維持する。
- 18ラッパーの順序、非同期ensure、MutationObserver、認証、保存契約を変更しない。同期rendererを非同期化しない。

元配列を変更する既存v218のnormalizeBoostsなどは今回修正していない。表示モデル導入で既存の保存データ変更や新たな書込みを追加しない。全画面を完全に純粋化したという意味ではない。

## 残る段階

全ラッパーを一括で登録型rendererへ移すと、捕捉済み内側renderer・非同期workflow読み込み・observer・手入力bindingの順序が変わる。今回は行わず、認証済み実画面で各タブ、列、リンク、入力値、操作可能性を確認してから個別に移す。

複数テーブル保存の原子性はDBトランザクション/RPC案と隔離DB試験が必要。auth/RLS変更には全ロールとAPI依存の影響調査・具体的承認が必要で、本PRでは適用しない。全面計画の残りはcommand-center-roadmap-20261011.mdを参照。
