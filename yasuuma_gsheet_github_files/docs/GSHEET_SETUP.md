# yasuuma：Google Sheets連動セットアップ

## 1. 追加するファイル

このフォルダの中身を、`dokechi/yasuuma` リポジトリ直下に置きます。

```text
.github/workflows/sync_gsheet.yml
scripts/sync_from_gsheet.py
requirements-gsheet.txt
docs/GSHEET_SETUP.md
```

既存の `scripts/update_prices.py` はそのまま使います。

## 2. スプシURLを入れる場所

GitHubリポジトリの画面で、以下に入れます。

```text
dokechi/yasuuma
→ Settings
→ Secrets and variables
→ Actions
→ Secrets
→ New repository secret
```

作るSecretはこれです。

| Secret名 | 入れる値 |
|---|---|
| `GSHEET_URL` | GoogleスプレッドシートのURL全体 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google CloudのサービスアカウントJSON全体 |

`GSHEET_URL` は、例として以下のようなURLです。

```text
https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/edit#gid=0
```

コード内には直書きしません。`.github/workflows/sync_gsheet.yml` が `${{ secrets.GSHEET_URL }}` として読みます。

## 3. Google Sheetsを非公開のまま使う方法（推奨）

1. Google Cloudでサービスアカウントを作る
2. JSONキーを作成してダウンロードする
3. JSON内の `client_email` をコピーする
4. Googleスプレッドシートを、その `client_email` に閲覧者として共有する
5. GitHub Secretsに以下を入れる
   - `GSHEET_URL`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`

`GOOGLE_SERVICE_ACCOUNT_JSON` は、JSONファイルの中身を丸ごと貼り付けます。

## 4. Google Sheetsを公開して使う方法（簡易）

`GOOGLE_SERVICE_ACCOUNT_JSON` を入れずに、`GSHEET_URL` だけで動かすこともできます。

この場合は、Googleスプレッドシートが「リンクを知っている全員が閲覧可」または公開状態になっている必要があります。

内部メモを入れるなら、この方法はおすすめしません。

## 5. 実行方法

GitHubで以下を開きます。

```text
Actions
→ Sync Google Sheets to JSON
→ Run workflow
```

成功すると以下が更新されます。

```text
data.json
money.json
site_config.json
```

## 6. 株価更新について

このワークフローは、スプシ同期後に既存の `scripts/update_prices.py` を実行します。

止めたい場合は、GitHubのVariablesに以下を作ります。

```text
UPDATE_PRICES_AFTER_SYNC=false
```

場所：

```text
Settings
→ Secrets and variables
→ Actions
→ Variables
→ New repository variable
```

## 7. 注意

`memo_internal` や内部メモ列は、`data.json` には出力しません。
ただし、スプシ自体を公開している場合、スプシを見られたら内部メモも見える可能性があります。

安全に運用するなら、サービスアカウント方式を使って、スプシは非公開のままにしてください。
