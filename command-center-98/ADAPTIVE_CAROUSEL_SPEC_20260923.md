# 司令塔：お金Chat 適応型カルーセル仕様 v1

更新: 2026-09-23

## 対象

- **お金｜チャットから実行** の新規候補のみ
- source task_id: `6aa9ee1043388191a2eac3bb2702092a`

今回の改修では以下を変更しない。

- Work版 `6a9e5826d4888191a4d82a643e6d5adf`
- 家Chat
- 海外Chat
- 上場Chat

Work版は参照元仕様として読み取り専用。Workのtask_prompt、スケジュール、有効無効、保存済み候補は変更しない。

## バージョン

- generation_version: `adaptive-carousel-v1-20260923-money-chat`
- research_version: `community-14d-money-chat-v1`
- design_version: `adaptive-visual-money-chat-v1`

## 生成順

1. 題材
2. ガルちゃん需要調査
3. 一次情報・公式根拠
4. 再計算
5. 見せる現象の特定
6. ページ単位の画面設計
7. 表示文の調整
8. 原稿確定
9. content_lock
10. 最終照合
11. 画像化
12. LOCK済み原稿との照合

「文章をデザインする」のではなく「現象をデザインする」。

## ガールズちゃんねる strict gate

Work版の72時間条件はお金Chatでは使用しない。

- 調査開始日時 `research_started_at` を保存。
- 調査開始時点から直近14日以内。
- 関連する別トピック2本以上。
- **各トピック**総コメント200件以上。
- 本文・コメントを実読し、`checked_scope` と `checked_at` を保存。
- コメントは `comment_no / summary / direct_url / plus / minus` を保持。
- plus/minusを取得できない場合は null。推測禁止。
- `direct_url` は元トピックと同じtopic IDの実コメントURL。可能なら `https://girlschannel.net/comment/<topic_id>/<comment_no>/` を保存。
- strict条件不足は `strict_insufficient`。完成原稿へ進めない。
- 14日より広げた調査は `expanded=true` とし、strict合格扱いにしない。

ガルちゃんは需要・疑問・反論・当事者申告の観測用。制度・数字・条件の事実根拠にはしない。

## 実行識別

新規候補のpayloadに以下を保存する。

```js
execution_source = "chat"
execution_channel = "chat"
adaptive_scope = "money_chat"
runner_key = "chat-money-v1"
source_task_id = "6aa9ee1043388191a2eac3bb2702092a"
origin_task_id = "6a9e5826d4888191a4d82a643e6d5adf"
category = "fp_psychology"
content_type = "fp_post_candidate"
```

## ページ契約

ページ数は内容で決める。6〜8枚へ固定しない。

各 `draft_slides[].page_contract` に以下を保存する。

```js
{
  reader_question,
  answer,
  visual_subject,
  visual_type,
  evidence,
  calculation,
  required_assets,
  display_copy,
  source_refs,
  source_type,
  status
}
```

- `display_copy` が画像内に表示するLOCK済み本文の正本。
- `headline/body` は既存UI互換用の補助情報で、画像化時の正本ではない。
- 計算不要なら `calculation:null`。
- 素材不要なら `required_assets:[]`。
- 投稿全体に `page_count_reason` を保存。
- 比較/変化/分解/実演は思考補助であり固定テンプレートではない。

## 一次情報と計算

`draft_sources[]` は最低限以下を保持する。

- id
- label または title
- url
- claim
- checked_at
- source_type

数値ページは `calculation` に以下を保持する。

- inputs
- formula
- unit
- result
- rounding

検索結果の数字だけを転載しない。

## 画像の証拠性

`required_assets[].asset_type` は次から選ぶ。

- user_photo
- official_photo
- primary_source_screenshot
- verified_real_photo
- generated_illustration
- generated_photorealistic_image
- simulation
- diagram

生成画像、説明用再現、simulation、diagramを実物仕様や施工結果の証拠として扱わない。

## 直接引用

当事者コメントの原文を公開するページだけ `direct_quote=true`。

`quote_source` に以下を保存する。

- source_ref
- quote_text
- identifier または comment_no
- public_attribution

需要調査として要約するだけのコメントは公開原稿へ媒体名・コメント番号を出さない。直接引用した場合は公開用出典表記を消さない。

## 適応型デザイン

```js
adaptive_design = {
  mode: "adaptive",
  decision_basis,
  visual_language
}
```

新規お金Chat候補では固定3配色・固定デザイン3択・固定完成テンプレートの選択を完成条件にしない。

- 写真自体が情報 → 写真主体
- 数字比較 → 数字/表/グラフ主体
- 一次資料 → 原典スクリーンショット主体
- 当事者判断 → コメント/具体場面主体

意味のないグラデーション、角丸カード、アイコン、影、パステル、均等配置、何でもカード化を目的なく追加しない。

## Design System

Apple / Carbon / Fluent / Primer等を利用する場合は `design_system_usage` に以下を保存する。

- usage_type
- source_url
- official_assets_used
- components_used
- tokens_used
- implementation_method

公式資産や公式コードを使っていない場合「公式準拠」と表現しない。

## 原稿LOCK

```js
draft_revision = "..."
content_lock = {
  locked: true,
  draft_revision: "...",
  locked_at: "..."
}
```

- `content_lock.draft_revision === payload.draft_revision` を必須。
- content_hashを使う場合はLOCK側とpayload側を一致させる。
- LOCK後、画像化側は文章・数字・単位・条件・出典・引用を変更しない。
- 文字が収まらない場合は `layout_overflow` として原稿/画面設計工程へ戻す。

## 最終照合

```js
missing_evidence = []
final_review = {
  status: "passed",
  checked_revision: "<現在のdraft_revision>",
  unresolved_items: []
}
```

最終照合後にdraft_revisionが変わった場合は再照合する。

## 画像化

画像へ文字として載せてよいのは原則として各ページの `display_copy` と、直接引用ページの `public_attribution` のみ。

以下は制作内部情報であり画像内へ描画しない。

- reader_question
- answer
- visual_subject
- visual_type
- source_refs
- legacy headline/body
- evidence内部メモ

TBD、仮コメント、仮画像、ダミー出典、仮数字、空欄を残した画像は完成扱いにしない。

## 互換性

- 過去のお金候補は旧形式のまま表示可能にする。
- `generation_version/design_version/adaptive_design.mode` 等のadaptive markerを持つ新規お金Chat候補だけ新ゲートを適用する。
- 既存の `design_direction/color_palette/cover_mode` は削除しない。
- Work候補には新ゲートを適用しない。
- Supabase Edge Function `command-center-retro-api` の旧 `fp_preflight` 経路は維持し、`adaptive:true` の場合だけ固定design/color/coverを不要にする。

## 実装箇所

- `v226-adaptive-carousel.js`
  - お金Chatスコープ判定
  - 14日/2トピック/各200件 strict gate
  - canonical GirlsChannel comment URL検証
  - page_contract
  - 一次情報
  - LOCK整合性
  - final_review
  - adaptive handoff
- `v226-adaptive-carousel.test.cjs`
  - 14日、各200件、別2トピック
  - execution_channel対応
  - Work非適用
  - コメントURLのtopic/comment整合
  - LOCK revision mismatch
  - final_review mismatch
  - 直接引用出典
- `app-v130.html`
  - v226読込
- Supabase `public.command_center_tasks`
  - **お金Chat task_promptだけ**に最優先上書きを追加
- Supabase Edge Function `command-center-retro-api`
  - adaptive preflight経路あり

## 完了条件

新規お金Chat候補をreadyにできるのは、最低でも以下が揃った場合だけ。

- strict 14日・別2トピック・各200件
- 取得不能値を推測していない
- 一次情報あり
- 数値使用時の再計算条件あり
- 全ページpage_contractあり
- adaptive_designあり
- content_lockあり、revision一致
- final_review passed、revision一致
- missing_evidence=[]
- 仮枠なし

不足が1つでもあれば `draft_status="blocked"` とする。
