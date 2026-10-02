# 司令塔：半自動アフィリエイト投稿の制作実行

これは一回の制作実行の仕様。最初の検証は既存の家アカウントと住宅サービスへの送客。楽天・金融・上場へ主力を切り替えたり、既存タスクの設定・原稿・レビューを変更しない。投稿素材の仕入れをユーザーへ依頼しない。

## 入出力

- この指示を一回の制作仕様として使う。新しいGitHubファイルの公開・読取は実行の前提にしない。GitHubへ書き込まない。
- Supabase: `yibtmqsbyodhsudenktm`。`public.command_center_task_events` の既存JSONBを使用。DDLなし。
- `task_id='affiliate-campaign-v1'` は商材設定。`payload.campaign.enabled=true` の家の商材のみ実行。
- `task_id='affiliate-production-v1'` は制作した投稿。`payload.result_kind='affiliate_job'`、`payload.job` は下記形式。
- `task_id='affiliate-production-runs-v1'` は実行記録。実行時刻・作成数・再確認数・見送り理由・所要時間を残す。
- `task_id='affiliate-assets-v1'` のPNG・公開署名・予約状態は触らない。既存のsignalsや家タスクにも書き込まない。

## 一回の流れ

1. 商材設定・最新の制作済み投稿・直近の実行記録を読む。ユーザー承認済み、広告主確認済み、GPTへ引き渡し済み（handoff）、完成画像取り込み済み（finished_images）、送信中、予約済み、結果不明の投稿は更新しない。清書中の原稿を定期処理で上書きしない。ユーザーが明示的に再確認へ戻した場合はhandoff・finished_imagesが消去されるので、改めて調査できる。見送りは同じネタを再作成しない。
2. 条件の確認日から7日以上経過した商材は募集条件と消費者向け公式ページを実際に開く。条件の変更、停止、新規受付、成果地点、対象者・地域、SNS掲載の確認範囲を調べる。確認できた内容だけを記録する。不明は不明。広告主へメールしない。ASPへ登録・申込しない。ユーザーの広告URL・媒体承認・配信先は保持する。
3. 清書待ち・確認待ち・承認済み接続待ち・配信待ちの未配信投稿が5件以上あれば新規制作を止める。既存の未承認・再確認待ち原稿の不足箇所を先に補う。一度に最大1件を完成させる。件数のために弱いネタを通さない。
4. 商材を使う前の読者の悩みから候補を探す。家では「住宅会社の比較」「同じ要望で間取り提案を比較」「見積りの範囲をそろえる」。入居後の設備雑学・窓の写真鑑賞・住宅会社との契約済み層だけが対象のネタは送客投稿にしない。
5. ガールズちゃんねる等で実際の元投稿とコメントを確認し、異なる2話題で同じ中心的な悩みを追う。新しい話題を優先し、過去1年の具体的な経験談も補助にできる。トピック全体のコメント数や投票を、個別の悩み・現在の購入意向・申込率に読み替えない。各話題の原投稿日時、確認日時、実際に読んだコメント番号2件以上、範囲・要約・関連する読者の悩みを保存。未確認の数字・日付・URL・原文を生成しない。検索スニペットだけでは確認済みにしない。
6. 制度・性能・商品条件・サービスの提供範囲は最新の一次情報を開いて確認。元投稿の経験談は問題の発見に使い、技術的な事実の根拠にしない。金融商品推奨・住宅ローン計算へ脱線しない。数字を使うなら対象・時点・計算式をそろえ、確認できなければ外す。
7. 5〜10枚（標準9枚）のカルーセルを最後まで書く。各ページは別の役割。前半で具体的な迷い、中盤で比較に必要な条件、最後に読者ができる行動と必要な人だけに合うサービス紹介。タイトル・本文・CTA・キャプションをすべて完成させる。ユーザーの家・経験・感情を捏造しない。公開文へガルちゃん・モデル名・制作指示を入れない。PR表示を含める。成果報酬・収益予測を読者向け投稿へ書かない。
8. `commercial_fit.reader_need` に誰が何で困っているか、`offer_reason` にその人がなぜこの商材へ進むかを書く。一つの悩みが解消された先に比較・申込の必要がないなら見送る。商材の単価だけで採用しない。
9. 自分で原稿を読み直し、主張ごとに一次情報、前提、ページ間の矛盾、文字量、利用条件、体験表現、需要と申込理由を照合する。別モデルの実行を偽って記録しない。確認した内容と残る不明点を具体的に`review.notes`へ残す。確認できない原稿は`review.status='blocked'`で保存する。
10. 保存後にSQLで読み返す。`slides`のページ順、全公開文、根拠、商材ID、既存データの保持を確認。司令塔の固定SVGは各ページの構成確認用であり、完成画像ではない。cover/compare/steps/checklist/diagram/actionの型で原稿と図の役割を用意する。ユーザーは司令塔から制作セットを一括出力し、GPTへ渡して清書画像を作り、全ページPNGをまとめて取り込む。ここで別GPTへの自動送信や画像生成を行ったと報告しない。制作セットには原稿・根拠・商材とのつながり・ページごとの内容・品質確認・個別PNGの指示が含まれるため、ユーザーに一枚ごとの指示作成は求めない。
11. 原稿・構成ができた投稿のタイトル・枚数と「GPTで清書待ち」の司令塔の確認先だけを短く報告。新規なしなら、その理由を実行記録へ保存し、単なる「該当なし」のカードを完成投稿一覧へ追加しない。未確認を「完成」「画像承認済み」「予約済み」と報告しない。

## job の契約

```json
{
  "id": "house-中心疑問と主な出典から作った固定キー",
  "campaign_id": "house-townlife-test",
  "central_question": "この一投稿で答える疑問",
  "title": "完成タイトル",
  "caption": "完成キャプション。紹介は必要な人へ限定",
  "public_action": "最後のページに同一の文字列で含まれる具体的な行動",
  "commercial_fit": {"status":"direct", "reader_need":"対象者・検討段階・悩み", "offer_reason":"今回の悩みと紹介先がつながる理由"},
  "slides": [
    {"page":1,"layout":"cover","headline":"48文字以内","body":"110文字以内","items":[],"note":"70文字以内"},
    {"page":2,"layout":"compare","headline":"見出し","body":"本文","items":["46文字以内の比較対象","46文字以内の比較対象"],"note":"必要な条件"}
  ],
  "sources": [{"kind":"primary","title":"資料名","url":"確認したHTTPSの公式URL","checked_at":"実際の確認日時","supports":"何枚目の何を裏付けるか"}],
  "demand": [{"url":"実際の話題URL","title":"話題名","published_at":"元投稿の日時","checked_at":"確認日時","comments":null,"comment_numbers":[1,2],"reader_need":"確認した具体的な迷い","role":"main"}],
  "review": {"status":"passed または blocked","checked_at":"確認日時","reviewer":"実行した確認者","notes":"実際に照合した内容。未確認点を隠さない"},
  "handoff": null, "finished_images": null, "approval": null, "dispatch": null,
  "metrics": {"clicks":null,"applications":null,"approved_count":null,"confirmed_revenue_yen":null,"cost_yen":null,"work_minutes":null}
}
```

`slides`は上の2枚で止めず5〜10枚に完成。項目は各ページ最大3つ。compareは2項目。長すぎる文字・改行は再編集し、画像上で切り捨てない。本文110文字以内でも4行を超える改行をしない。URLや内部出典は公開画像へ出さずsourcesに保存。

保存SQLは値を安全に引用する。ユーザー承認・予約を上書きしない条件を必ず含める。

```sql
INSERT INTO public.command_center_task_events
 (task_id,event_key,domain,priority,score,title,summary,occurred_at,payload)
VALUES ('affiliate-production-v1', '<job.id>', 'sns', 'A', 80,
 '<完成タイトル>', '半自動カルーセルの原稿・構成（清書待ち）', now(),
 '<result_kind=affiliate_job, version=affiliate-production-v1-20261001, job=完成したjob のJSON>'::jsonb)
ON CONFLICT (task_id,event_key) DO UPDATE
SET payload=EXCLUDED.payload,title=EXCLUDED.title,summary=EXCLUDED.summary,occurred_at=now()
WHERE command_center_task_events.payload#>>'{job,approval,status}' IS NULL
  AND command_center_task_events.payload#>>'{job,advertiser_review,status}' IS NULL
  AND command_center_task_events.payload#>>'{job,handoff,copy_revision}' IS NULL
  AND command_center_task_events.payload#>>'{job,finished_images,set_id}' IS NULL
  AND COALESCE(command_center_task_events.payload#>>'{job,dispatch,status}','') NOT IN ('sending','scheduled','unknown')
  AND COALESCE(command_center_task_events.payload#>>'{job,decision}','') <> 'skipped';
```

フォームやSNSへ自動で申込・送信しない。ユーザーのOKを生成しない。ユーザーが司令塔で画像と原稿を承認した後、広告条件・実広告URL・プロフィールのリンク・予約先が揃った投稿だけ、司令塔の認証された予約APIへ進む。売上・承認率・本人時間は不明ならnull。一般の閲覧数から収益を推定しない。

## 定期処理の商材確認

募集条件の確認では、既存campaign全体を置き換えない。`payload.campaign.terms_checked_at`・`conditions`等の確認したフィールドだけJSONBで更新し、ユーザーのリンク・承認・配信先・enabledを保持する。条件や利用可否が変わったら実行記録に明示し、募集停止は制作・配信を止める。不明であれば前の確認日を本日に更新しない。

実行記録は`task_id='affiliate-production-runs-v1'`、`event_key='<この実行の日時の固定キー>'`、`payload.result_kind='affiliate_production_run'`。`payload.summary`に実行結果、`jobs_created`と`jobs_rechecked`に実際の件数、`blocking_reasons`に調査で判明した不足、`duration_minutes`に実測した時間（分からなければnull）を残す。個人作業時間やAI利用料とは区別する。


## 自動実行に必要な補足

主力と運用方針は変更しない。読者の本人経験を捏造しない。現在の家のcampaignは候補として準備中で、ユーザーのアフィリエイト契約・掲載許可は未確認。条件未接続でも制作だけ進められるが、申込可能・配信可能・収益発生とは報告しない。投稿ごとの広告主確認が必要な場合はその手間を隠さない。
キャプションの改行は実際の改行とし、文字列のバックスラッシュnを公開文に残さない。完成タイトルとcaptionを必須とし、captionは2100文字以内。最終ページbodyまたはnoteにpublic_actionを同一の文字列で入れる。
画像の文字数条件に加え、見出しを1行17全角相当で3行以内、本文を1行29全角相当で4行以内、注記を1行37全角相当で3行以内に収める。compareの項目は2個、各項目を1行11全角相当で4行以内。diagramは最大3個で1行9全角相当で5行以内。他のitemsは最大3個、各項目を1行26全角相当で2行以内。英数字は幅0.55全角相当、明示改行も行数として数える。入らないときは省略表示せず原稿を短く直す。この文字量確認は構成用SVGの範囲であり、清書した画像の品質確認を代替しない。
review.statusをpassedにするのは、出典原文・需要元コメント・サービスとの関連・全ページの文字量・実体験表現を実際に読み直したときだけ。機械に通っただけではpassedにしない。既存のblockedやneeds_recheckは、承認・送信等を保護したうえで不足項目を再調査する。
使用する外部コネクターは接続済みSupabaseだけ。公開ページの情報収集はWeb検索と原文表示で行う。広告主へ連絡、SNS投稿、外部サービスへユーザー登録、公開コードのpush、課金を伴う申込は行わない。収益・費用・本人時間は未計測ならnullとする。
