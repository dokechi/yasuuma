# 完成画像と手動確認

完成画像を全ページ保存し、再読して掲載全文・順番・数字を本人が確認します。保存と本人確認は別状態です。SNS投稿・予約は実行しません。4用途の入口と既存資料を保全します。特定記事専用の組版操作は表示しません。

## FP採用基準

既存のreadyや旧審査結果から、新基準への合格を推定しません。次の5点を同じ原稿版の本文で審査します。

1. 読む前の誤解と、読後に分かる具体的事実。
2. その理由となる制度・計算・契約条件。
3. 読者に当てはまる条件・例外・比較。
4. 核心の一次根拠、適用条件、確認日。
5. 読後に確認できる具体項目や手順。

「自分に合わせよう」「見直そう」だけで終わる原稿は採用しません。単語や欄の有無だけでは内容の価値を判定できません。審査者が各項目の説明と本文の該当箇所を確認して記録します。

既存JSONBのeditorial_review.fp_learning_valueへ、status、checked_revision、reviewed_snapshot、reviewed_by、checked_at、mechanism、primary_evidence_url、evidence_checked_at、applicable_conditions、reader_decision_before、reader_decision_after、specific_knowledge、general_advice_only、criteriaを保存します。criteriaはbefore_after / mechanism / conditions_exceptions / primary_evidence / reader_actionの5件で、各件にstatus、finding、body_evidence（page・掲載文のexcerpt）を記録します。

システムは審査済み版・本文一致・記録不足を検証します。審査者による意味内容の評価を置き換えません。本人不採用の原稿は画像化前確認・画像保存・完成確認へ進めません。原稿と過去審査は保存します。

## 検証と公開

Node 24の回帰検証はGitHub Actionsで実行します。本番の実画面と画像保存・再読は別途確認が必要です。本番公開は未実施です。
