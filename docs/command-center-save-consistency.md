# Save consistency: first increment

This change protects ordinary signal state/undo and the card detail editor from stale-screen writes. Reads include exact updatedAt; clients capture it before editing and send expectedUpdatedAt. One UPDATE filters by id and timestamp. Missing versions return 428, invalid versions 400, and zero matching rows 409. Undo uses the committed response version and preceding state.

The editor stays open after 409/428, retaining inputs and baseline. It offers a clipboard backup and list refresh that preserves the form. Refresh never silently rebases or resubmits an edit. A cached old tab must refresh before using protected saves.

Copy history uses the existing client_event_id unique index. A pending copy keeps one UUID, timestamp, text and draft/deadline snapshots through same-page retries; concurrent clicks do not create another intent. The server checks receipts before the current deadline. It compares candidate, platform, draft kind, relative stage, text, deadline and copied timestamp. Different content using the same key returns 409, including the uniqueness-race path. No external posting is added.

New card creation has no previous version and uses INSERT. A duplicate candidate_key returns 409 without overwriting the existing candidate. Existing edits use the version guard. Retrying a create after a lost response therefore requires checking the existing candidate, rather than claiming a replayed success.

## Boundaries

- No schema, RPC, ACL, RLS, auth or credential changes. No production deployment.
- Sourcing verdict/reset, workflow, Reddit, task ingestion, image manifests and X generation/status/publication are outside this increment. Their multi-write transactions and stale callers still need separate work.
- Ordinary state retransmission returns 409 after commit; it is not a durable success receipt. Read current state to confirm a lost response.
- Copy retry state lives in page memory. Reload/navigation loses it; there is no cross-reload guarantee.
- Timestamp predicates keep PostgreSQL microseconds. This writer advances past its baseline, but other writers and existing triggers are unchanged; no global ABA guarantee is claimed.
- Review history recording after card edit remains a separate write. A candidate can be saved while the review log fails, as before.

## Validation

Run node --test scripts/command-center-save-safety.test.mjs scripts/save-consistency.test.mjs. Set PGLITE_MODULE to pinned PGlite 0.4.6 dist/index.js for the synthetic PostgreSQL fixture. CI installs that exact package into the runner temporary directory without install scripts. Tests execute actual retro/X handlers with synthetic adapters and actual shared update/receipt functions against PostgreSQL.

Run node --test scripts/save-consistency-browser.test.mjs scripts/sourcing-mobile-browser.test.mjs using headless Chrome and synthetic fixtures. The editor test verifies 409/428 input retention, backup, refresh and unchanged baseline at 320/375/390/700/1024px. Production authentication and live rows are not exercised.

## Release and rollback after approval

Deploy the frontend first, then the two reviewed Edge Functions and their shared module. Verify exact deployed source and authenticated state/undo/editor/copy QA. Before the Edge update, the old API still permits unguarded writes; the frontend alone does not provide protection.

Rollback restores previous reviewed Edge Function versions and reverts this PR's frontend change. Keep existing copy history. No migration or data rollback is required. The old API restores its previous unguarded-save behavior.
