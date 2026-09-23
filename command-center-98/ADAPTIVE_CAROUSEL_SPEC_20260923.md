# 司令塔：適応型カルーセル仕様 v1

更新: 2026-09-23

## 対象

- お金
- 家
- 海外
- 上場

## バージョン

- generation_version: `adaptive-carousel-v1-20260923`
- research_version: `community-14d-v1`
- design_version: `adaptive-visual-v1`

## 既存実装の確認結果

- お金・家のカルーセル管理は `v151-fp-content-pipeline.js` が中心。
- 旧方式では `DESIGN_DIRECTIONS`、`COLOR_PALETTES`、`COVER_MODES` を制作前に選択し、`fp_preflight` で保存していた。
- `command-center-retro-api` の旧 `fp_preflight` は design/color/cover を必須としていた。
- 上場は `chat-editorial-career-20260918.js` に独立した編集ゲートがあり、旧方式では6〜8枚を固定条件としていた。
- 実行ルールの正本は Supabase `public.command_center_tasks.task_prompt`。Chat並行実行はここを読み出して既存ルールを継承する。
- 海外には同一型番・価格・送料・税・為替・在庫・配送等の固有ルールがあるため、ガールズちゃんねる条件を強制しない。

## 新規adaptive候補の生成順

1. 題材
2. 需要調査
3. 一次情報・公式根拠
4. 再計算
5. 見せる現象の特定
6. ページ単位の画面設計
7. 表示文の調整
8. 原稿確定
9. content_lock
10. 画像化
11. LOCK済み原稿との照合

「文章をデザインする」のではなく「現象をデザインする」。

## ガールズちゃんねる strict gate

適用: お金・家・上場。

- 調査開始日時を保存する。
- 調査開始時点から直近14日以内。
- 別トピック2本以上。
- **各トピック**総コメント200件以上。
- 本文・コメントを実読し、確認範囲と確認日時を保存。
- コメント番号、反応数等を取得できない場合は null。推測禁止。
- strict条件不足の場合は完成原稿にしない。
- 期間拡張を行う場合はstrict結果と分離し、strict合格として扱わない。

ガールズちゃんねるは需要・疑問・反論・当事者申告の観測用。制度・数字・条件の根拠にはしない。

海外は `community_research.required=false` とし、既存の海外需要調査を維持する。

## ページ契約

各 `draft_slides[]` に以下を保存する。

```js
page_contract = {
  reader_question,
  answer,
  visual_subject,
  visual_type,
  evidence,
  evidence_note,
  calculation,
  required_assets,
  display_copy,
  source_refs,
  source_type,
  status
}
```

投稿全体に `page_count_reason` を保存する。ページ数は内容で決め、枚数合わせをしない。`status` は完成ページのみ `ready`。`required_assets` は配列で、各素材に `asset_type` と `is_evidence` を持たせる。計算不要のページでも `calculation:null` としてキーを保持する。

## 適応型デザイン

```js
adaptive_design = {
  mode: "adaptive",
  decision_basis,
  visual_language,
  same_post_consistency: true
}
```

新規adaptive候補では固定3配色・固定完成テンプレートの選択を完成条件にしない。

- 写真が証拠 → 実物/公式/確認済み素材
- 数字比較 → 数字・表・グラフ
- 制度 → 情報階層
- 一次資料 → スクリーンショット
- 生活場面 → 写真等

意味のない装飾を足さない。同一投稿内の文字階層・余白・ページ番号・出典・同じ意味の視覚表現は統一する。

## 画像の証拠性

実物と生成物を区別する。

例:
- user_photo
- official_photo
- primary_source_screenshot
- verified_real_photo
- generated_illustration
- generated_photorealistic_image
- simulation
- diagram

生成画像を実物仕様・施工結果・事故/災害の証拠にしない。

## Design System

```js
design_system_usage = {
  design_system,
  usage_type,
  source_url,
  official_assets_used,
  components_used,
  tokens_used,
  implementation_method
}
```

`usage_type`:
- official_assets
- official_code
- official_tokens
- reference_only
- inspired

公式資産を実際に使っていない場合、「公式準拠」と表現しない。

## 原稿 LOCK

```js
content_lock = {
  locked: true,
  draft_revision,
  locked_at,
  fields: [
    "post_title",
    "caption",
    "draft_slides",
    "numbers",
    "conditions",
    "sources",
    "quotes"
  ]
}
```

LOCK後、画像化側は文言・数字・単位・条件・出典・引用を変更しない。文字が収まらない場合は `layout_overflow` とし、原稿/画面設計工程へ戻す。

TBD、仮コメント、仮画像、ダミー出典、仮数字、空欄を残した画像は完成扱いにしない。

## 互換性

- 旧候補・旧投稿の design_direction / color_palette / cover_mode は削除しない。
- 旧候補は旧ルールで再表示可能にする。
- adaptive候補だけ新ゲートを適用する。
- APIの旧 `fp_preflight` 経路は残し、`adaptive:true` の場合のみ固定design/color/coverを不要にする。

## 実装

- `v226-adaptive-carousel.js`: adaptive品質ゲート、14日需要ゲート、LOCK、page_contract、adaptive handoff、UI互換パッチ。
- `v226-adaptive-carousel.test.cjs`: strict14日/200件/2本、旧方式互換、LOCK、handoffの回帰テスト。
- `command-center-retro-api` v12: adaptive preflight経路。
- `chat-editorial-career-20260918.js`: adaptive候補では固定6〜8枚条件を解除。
- `app-v130.html`: v226を読込。
- `public.command_center_tasks`: 4領域のtask_promptへ本仕様を追加。


## 2026-09-23 実装後の補足

- v226 は4レーン（お金・家・海外・上場）を task_id / content_type / category から識別する。
- strict 14日ゲートはお金・家・上場だけに適用し、海外は適用外。
- `draft_sources` は最低限 id / label または title / url / claim / checked_at / source_type を保持し、各ページの source_refs と照合する。
- 上場の既存 editorial_review / final_review 等の固有ゲートは維持し、adaptive handoff でも迂回しない。
