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


## 品質ゲート補強 v2

お金Chatのready判定では、追加で以下を必須とする。

### research_started_at

strict14日の基準時刻は `payload.research_started_at` のみ。
`execution_audit.started_at`、`started_at`、`source_checked_at` などで代替しない。

### 一次情報

`draft_sources` に最低1件、一次情報系 `source_type` を持つ出典を必須とする。

主な許可値:

- primary
- official
- government
- law
- regulator
- ministry
- municipality
- official_company
- official_organization
- official_institution
- public_statistics
- issuer_official
- manufacturer_official
- financial_institution_official
- institution_official

direct quote / community voice を除く各ページも、`source_refs` から最低1件の一次情報へ辿れること。

### required_assets

各素材は `asset_type` に加えて `is_evidence:true/false` を必須とする。
生成画像、simulation、diagramは実物証拠として `is_evidence=true` にしない。

### calculation_required

各ページに `calculation_required:true/false` を必須とする。

独自計算・比較・シミュレーションで得た数値を表示するページは true。
trueの場合は `calculation={inputs,formula,unit,result,rounding}` が必須。

### display_copy公開漏れ

画像表示の正本は `page_contract.display_copy`。
直接引用ページを除き、需要調査元の名称/URL、コメント番号、プラス・マイナス等の内部反応数を含めない。

### LOCK snapshot

revision一致だけではLOCK済みと扱わない。

`content_lock.snapshot` に次のLOCK時点のdeep copyを保存し、現在値と完全一致させる。

- post_title
- draft_title
- draft_cover
- caption
- page_count_reason
- question_lineage
- premise_checks
- draft_slides
- draft_sources

本文、数字、計算、source_refs、引用、出典等がLOCK後に変わった場合はrevision更新、snapshot再作成、final_review再実行が必要。


## 家Chat 適応型カルーセル追加

対象は `家｜チャットから実行` の新規候補のみ。

- Chat task_id: `6aa9edd177fc8191a1e4b665930ee071`
- 参照元Work task_id: `6aa77eb5ce7881919d8dc62554833b60`
- generation_version: `adaptive-carousel-v1-20260923-house-chat`
- research_version: `community-14d-house-chat-v1`
- design_version: `adaptive-visual-house-chat-v1`

Work版は読み取り専用。Workのtask_prompt、スケジュール、有効無効、保存済み結果を変更しない。

### strict需要ゲート

- research_started_atを基準に14日以内
- 関連する別トピック2本以上
- 各トピック200コメント以上
- 本文・コメント実読
- topic ID / comment No. が一致する実コメントURL
- 取得不能値はnull、推測禁止

14日外の過去トピックはexpanded/backgroundとしてstrict結果と分離する。

### 家固有契約

既存のHouse editorial contractを維持し、次をready条件に含める。

- `editor_contract_version=chat-editorial-v1-20260918`
- `synthesis={a_need,b_need,connection,derived_question,derivation_note}`
- 全ページの `page_reflections`
- `executable_action={what,where,check,decision,barrier,fallback}`
- `editorial_review.status=passed`
- editorial_review checks:
  - two_threads
  - source_trace
  - public_separation
  - primary_alignment
  - practical_options
  - executable_action
  - cross_page_consistency
  - voice

### ページ・デザイン

ページ数は6〜8枚へ固定しない。題材に必要な枚数で決め、`page_count_reason` を保存する。

固定3配色、固定デザイン3択、`design_direction=house`、`color_palette=blue` を新規adaptive候補の完成条件にしない。

一方で家の制作寸法は維持する。

- `production_spec.size=1080×1440`
- `production_spec.ratio=3:4`
- 全ページに現在ページ/総ページ数
- スワイプ誘導

adaptive handoffにもこの制作仕様を明示する。

### 公開分離

家Chatは従来どおり、需要調査コメントを公開原稿へ直接引用しない。

- `direct_quote=true` は禁止
- display_copyへGirlsChannel名、元URL、コメント番号、反応数を混入させない
- research_threads / synthesis / page_reflections 等は内部専用

### 一次情報・計算・証拠性

お金Chatのhard quality gateと同様に、

- 一次情報source_type必須
- 非引用の各ページに一次情報source_ref
- `calculation_required:true/false`
- trueなら `calculation={inputs,formula,unit,result,rounding}`
- `required_assets[].is_evidence` 必須
- 生成画像やdiagramを実物証拠として扱わない

### LOCK

家Chatの `content_lock.snapshot` は共通項目に加え、

- synthesis
- page_reflections
- executable_action
- production_spec

もLOCK対象に含める。

LOCK後に変更があればrevision更新・snapshot再作成・final_review再実行が必要。

### 完了条件

`editorial_review` と `final_review` が両方passed、missing_evidence=[]、strict14日、一次情報、page_contract、adaptive_design、LOCK snapshot、家固有契約がすべて揃った場合だけready。


## 家Chat 品質ゲート補強 v2

家Chatのsource traceと画像素材準備を追加で厳格化する。

### research_threadsのID

- 各threadに一意の `id`
- 各commentに `reply_to` キー（返信元なしはnull）
- `page_reflections.thread_refs` は実在thread/commentのみ
- synthesisページは別トピック2本以上の実コメント参照
- comment_structureページは最低1件の実コメント参照

### synthesisと中心疑問

`synthesis.derived_question` と `question_lineage.selected_question` は、空白・句読点を除いて一致させる。
途中で別テーマへ切り替わった候補はreadyにしない。

### primary_evidence_required

家Chatの各page_contractに `primary_evidence_required:true/false` を必須とする。

true:
- page_reflection.primary_source_refsを最低1件
- draft_sourcesに実在
- 一次情報source_type
- 同ページのpage_contract.source_refsにも存在

false:
- synthesis/comment_structure/editorial_extension等で事実主張や数値を示さないページに使用可能
- primary_source_refsが空の場合はpage_reflection.noteへ一次情報不要理由を保存
- 無関係な一次情報を埋め合わせで紐付けない

`origin="primary_research"` は必ず `primary_evidence_required=true`。

### executable_actionの公開反映

既存の `what/where/check/decision/barrier/fallback` に加え、

- `public_page`
- `public_copy`

を必須とする。

`public_page` は最終ページ。
`public_copy` はそのページの `display_copy` に実際に含まれる文。

### final_review

家Chatでは `final_review.checked_at` も必須。

### required screenshot

required=trueのscreenshot_requestは担当決定だけでは画像化可能にしない。

- assistant取得: `acquisition_status="acquired"`
- user提供: `acquisition_status="user_provided"`
- `acquisition_ref` 必須

pending / failed / 未取得 / refなしの場合は画像化handoffを停止する。
