# Daily purchase and sale import

This is the operating contract for the existing private ledger. It uses the connected Gmail and Supabase tools. It does not create credentials, change login or permissions, add a schema, purchase anything, or send messages to merchants/buyers.

## Destinations

- Project: `yibtmqsbyodhsudenktm`.
- Purchases: `public.command_center_sourcing_purchases`.
- Sales: `public.command_center_sourcing_sales`.
- Run audit and deferred records: `public.command_center_agent_runs`, with `agent_domain='sourcing'` and `metadata.run_type='daily_trade_import_v1'`.
- User-visible progress: existing `command_center_task_events`, `task_id='assistant-progress-v1'`, `event_key='request-daily-trade-import'`. Follow `REQUEST-PROGRESS.md` and validate with `scripts/request-progress-record.cjs`. This recurring request waits between runs; it is not permanently completed.
- Display: existing authenticated `command-center-sourcing-ledger-api` GET endpoint and the purchase-ledger UI. The GET endpoint is not a write API. Use the authorized Supabase SQL connector for bounded DML.

Never put real orders, source email IDs, mailbox addresses, audit rows, financial records, tokens, or generated private SQL into this public repository. Store only code, this contract, and synthetic tests here.

## Run and cursor contract

1. Read both authorized Gmail account profiles and the current ledger/run schema. Stop the affected source if access is unavailable; do not switch to another identity or change permissions.
2. Freeze `scan_cutoff_at` at the start. Read the most recent successfully verified run's per-account `verified_through_at`, then search from that time minus 72 hours through the cutoff. Use exact epoch `after:`/`before:` values to avoid Gmail timezone ambiguity. A first-run start must be explicitly supplied by the task; do not infer complete historical coverage from the newest ledger row.
3. Search transactional order/payment/shipment/completion/cancellation/refund messages in both mailboxes. Do not require unread or inbox labels. Exclude spam/trash. Search variants and trusted sender domains, rather than relying on only one subject pattern. Paginate until no token remains. Promotions, safety notices, shipment forecasts, and recommendations are not purchases.
4. Fetch each relevant message in full and also search the exact order/item/payment ID for newer corrections, cancellations, returns, and settlement messages. Gmail thread IDs are not business IDs: one thread may contain many unrelated sales. For malformed ISO-2022-JP bodies, request `raw`, MIME-decode with the declared charset in memory, and retain only the minimum extracted facts. Never parse replacement characters as reliable labels.
5. Revisit unresolved records from earlier runs, and recent known in-progress transactions, for later completion/refund evidence. A new completion email can concern a much older sale. Keep scanning the message interval; never filter solely by sale date.
6. Record a run as `running`, then `success`, `partial`, or `error`. Required run metadata: `run_type`, `schema_version`, `scan_started_at`, `scan_cutoff_at`, `scan_from_at`, `accounts`, `counts`, `pending_records`, and `verification`. `accounts` records read completion/page exhaustion and verified coverage per account. `pending_records` contains only minimal order/item/source references and an explicit reason, never email bodies, addresses, or payment secrets.
7. Advance a successful cursor only after every page/source in the intended interval is read, candidate disposition is recorded, all writes are reread and reconciled, and repeat-import checks pass. If any candidate still requires source rereading/verification, keep the run partial. A reviewed purpose-unknown purchase may be deliberately deferred and counted as such; it is not an imported inventory item. If processing remains at the morning target, show partial/blocked status, verified counts, the remaining work, and a continuation plan. Do not silently mark complete or jump the cursor over unfinished work.

## Purchase mapping

Required: `ordered_at`, `supplier_key`, `supplier_name`, canonical `order_id` if available, `source_type='gmail'`, canonical `source_message_id`, `line_no`, `product_name`, known positive `quantity`, known `unit_price_yen`, known `line_total_yen`, and a supported `status`.

Optional accounting fields: `order_subtotal_yen`, `order_shipping_yen`, `order_discount_yen`, `order_total_yen`, `allocated_net_line_yen`, `allocated_net_unit_yen`. They remain null if unknown. Never satisfy a required amount by inventing zero. Explicit zero in the source, including a genuine zero cash payment, is valid.

- `line_total_yen` is the source's pre-allocation line amount; do not assume tax/discount semantics from its name alone.
- Keep order-level totals on each row only for compatibility. Sum one total per `(account, supplier_key, order_id)`; never sum repeated order totals across lines. For an order without an ID, use the canonical source identity and report the limitation.
- Preserve actual cash payment, coupon discount, used points, instant benefits, earned future points, and shipping separately. Future rewards do not lower cash cost. Do not retroactively change the existing ledger's costing policy.
- For new verified simple orders, `allocated_net_line_yen` is allocated cash merchandise cost excluding separately recorded order shipping; `allocated_net_unit_yen` is that amount divided by quantity. Distribute integer rounding remainders deterministically so allocated line sums equal the stated allocation pool. Mark `metadata.cost_basis`. Do not calculate allocations when the source components do not reconcile.
- Metadata: `gmail_account`, `source_version=1`, `import_batch`, `order_line_id` when given, `source_events`, `status_observed_at`, `verification`, `inventory_stage`, `cost_basis`, and separate coupon/points/benefit values when actually known. Do not collect card data, full addresses, buyer names, or unneeded tracking data.
- Status values: `purchased`, `returned`, `cancelled`, `partial`, `unknown`. Shipment is an update to the original order, never an extra purchase. Preserve the original order time, not the email's completion time.
- Purpose-unknown/personal purchases must not be asserted to be sourcing inventory. Record a minimal `pending_records` entry with `reason='purpose_unconfirmed'` and purchase facts; report it for review. The current inventory view does not honor `metadata.count_in_inventory=false`, so that flag alone is not a safe exclusion. Do not insert purpose-unknown records into the sourcing purchase table until their treatment is verified.

### Purchase identity and idempotency

The database unique key is only `(source_message_id, line_no)`. It does not prevent the same order being inserted from a later shipment email. Before inserting, read existing rows using `(gmail_account, supplier_key, order_id)` and match the stable line ID, or a proven combination of SKU/variant/line identity. If line ordering changed or duplicate identical lines make the match ambiguous, defer rather than guess.

Retain a canonical source message and line identity. Add newly seen messages to `metadata.source_events` once, keyed by account/message/event type. Update the matched row by ID; do not manufacture a new line merely because the email ID changed. Guard concurrent imports with a single transaction-level advisory lock, `pg_advisory_xact_lock(hashtext('command_center_daily_trade_import_v1'))`, and preserve the existing unique constraint with `ON CONFLICT`. Serial execution alone does not replace business-key checks.

## Sale mapping

Table columns: `sold_at` (nullable), `marketplace`, `gmail_account`, canonical `source_message_id`, `source_thread_id`, `source_subject`, `sale_id`, `product_name`, known positive `quantity`, `sale_price_yen`, `status`, `inventory_key`, `matched_purchase_id`, `metadata`.

`sale_id` is unique. Validate marketplace/account identity before updating. Keep the canonical original source; put subsequent evidence in `source_events`. Do not insert one sale per email. A completion-only email may have `sold_at=null`; never replace an unknown sale time with the completion time. When only the original payment-notice time is available, record it with `sold_at_basis='payment_notice_sent_at'` or `'purchase_notice_sent_at'`.

### Amount metadata, schema version 1

- `amount_basis`: `gross_sale_yen`, `gross_payment_yen`, or `net_received_yen` according to the actual source represented by the legacy `sale_price_yen` field.
- `gross_sale_yen`: the known merchandise sale price, otherwise null.
- `gross_payment_yen`: buyer payment from a payment-acceptance notice, otherwise null. Do not assume it equals the merchandise sale price.
- `net_received_yen`: explicitly settled net receipt, otherwise null.
- `fee_yen`, `shipping_yen`: separately evidenced actual amounts, otherwise null. Never infer a platform percentage or standard shipping tariff as actual cost.
- `aggregate_deductions_yen`: known total difference between comparable payment/sale and net receipt; preserve `aggregate_deductions_basis`. This does not prove the fee/shipping split.
- `completed_at`, `status_observed_at`, `sold_at_basis`, `quantity_basis`, `match_status`, `profit_status='unconfirmed'`, `source_version=1`, `import_batch`, `source_events`.
- Event entries have `{message_id,event_type,event_at}` only, plus the minimal non-personal fact needed to resolve an actual correction. Do not save full email content.

Legacy records may only have `amount_basis`, or no basis at all. Do not bulk repair them, relabel them, or reinterpret their totals without source evidence. Display unknown basis as a legacy unverified amount, separate from gross/net columns. Sum only like-for-like explicit amounts and never mix progress/completed/cancelled rows into a single revenue figure.

### State and later evidence

- Typical states: `in_progress`, `completed`, `cancelled`; partial refunds/returns require an explicit descriptive state and review reason.
- Process events by their source timestamp, not import arrival order. A delayed old email must not downgrade a newer state.
- Some platforms reuse the same item ID after cancellation and republication. Retain the cancelled attempt as an event and use the later verified sale/payment and completion as the current state. If the attempts cannot be distinguished, defer. Do not use a simplistic irreversible status ranking.
- Upsert current source-proven fields only. Merge events uniquely and preserve known newer amounts when the new event omits them. Null is not permission to erase an existing verified value. Update `updated_at` only for a substantive change.
- Require `IS DISTINCT FROM` checks for updates and ensure an identical retry changes zero rows. Do not overwrite an entire metadata object with a partial message extraction.
- Keep the original `import_batch` for unchanged records. Re-observation in a later run belongs in the run audit, not in a forced row update; duplicate source events must not grow on every retry.

## Inventory and profit boundaries

Do not create `sale_allocations`, `component_sale_allocations`, automatic FIFO matches, or finalized profit merely because the product names resemble each other. A SKU/variant match is not proof of a specific cost lot. Sets and bundle decomposition need explicit quantity/component evidence.

The current inventory view sums existing allocation rows without filtering current sale state. If a previously allocated sale is later cancelled/refunded, save its source-proven sale state and report `inventory_reconciliation_required`; do not silently claim inventory is restored. Do not delete or rebuild allocations during this import. Escalate the narrowly scoped correction separately.

## Verification and reporting

- Capture baseline row counts and relevant keys. Validate parsed money arithmetic and source chronology before writing.
- After each bounded write, reread the exact purchase/order and sale/item keys. Verify quantity, status, amount basis, nullable money fields, source events, and absence of duplicate business rows.
- Replay the identical normalized batch. Expect zero inserted/updated rows; total row counts and amounts must remain unchanged. Sequence IDs may have gaps after an ignored conflict; gaps are not duplicate records.
- Verify the authenticated ledger API and UI show the new purchases and distinct sale/payment/net/status fields. The monthly sales display must include records whose sale date or completion date is in the month, with these dates labeled separately.
- Update progress with actual imported purchases/lines/sales, status updates, duplicates skipped, deferred/review counts, verification result, and historical-coverage gaps. An enabled schedule alone is not evidence of a completed import.
- The morning target is a deadline for a visible status/result, not a guarantee that every ambiguous source will be resolved. Continue a partial run from its saved unresolved work without skipping the interval.
- Check the current time between bounded batches. If the run is still active shortly before the morning target, publish a truthful interim status before continuing, rather than waiting for the entire backlog to finish.
