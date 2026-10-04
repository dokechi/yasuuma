# Request progress integration

The authenticated `task-events` API and existing `command_center_task_events` table are reused. No schema, permission, credential, scheduled automation, or API deployment is added. The public repository contains code and synthetic tests only. Never commit actual task reports, private URLs, messages, or access tokens.

## Update a real request

1. Observe actual work or an explicit user decision. Do not infer running from an enabled schedule or completion from a single found candidate.
2. Prepare an input JSON outside the repository with these fields:
   - `request_id`: stable `request-...` ID, reused for all reports for that job
   - `title`, `summary`, `next_action`
   - `status`: `received`, `waiting`, `running`, `needs_review`, `blocked`, `completed`, or `unknown`
   - `priority`: 1 (highest) to 5 (lowest)
   - `observed_at`: when the status was actually checked, ISO timestamp
   - `last_progress_at`: when substantive work last advanced; null when unstarted or unknown. A read, heartbeat, or page refresh must not advance it.
   - `valid_until`: running observation expiry, normally 2 hours after the check, never more than 4 hours. Extend only after checking the actual worker.
   - `recurring`: true for an ongoing search; these cannot be marked completed. Use waiting between runs.
   - `decision_needed` for review, `blocker` for blocked, `unknown_reason` for unknown
   - `artifacts`: an array of `{label,url}` with verified HTTPS result links. A source/homepage is not a finished deliverable.
   - `result_text`: optional full deliverable text shown in a collapsible result panel inside the authenticated UI. A `#request-...` hash opens the matching result panel.
   - For completed work: `verification: {status:"passed",checked_at,url}` with a matching artifact URL that was opened and verified.
3. `node scripts/request-progress-record.cjs /private/work-report.json` validates the report and generates a single atomic upsert SQL statement. Do not put the real input or generated SQL in GitHub.
4. Execute that SQL via the authorized Supabase `execute_sql` connector for the existing project, then read the returned row and/or query the dedicated key again. The generated SQL only targets `task_id = assistant-progress-v1` and the stable request key. An older event cannot overwrite a newer one.
5. Read the authenticated API `?resource=task-events&taskId=assistant-progress-v1&limit=100` and/or refresh the progress view to verify the displayed result. The UI follows pagination.

The page reads every minute while visible, on focus, and when returning from a hidden tab. It does not write to production, store private reports in localStorage, or claim that every execution service has an automatic webhook. The assistant updates the record when actual work starts, advances, blocks, needs a decision, finishes, or pauses. If that reporting step is absent, a running row becomes unknown after expiry. Fetch failures retain prior details but display unknown, not running/completed.

## Verification and rollback

Run `node --test command-center-98/v230-request-progress.test.cjs command-center-98/app-loader.test.cjs` and the existing full regression suite with its scratch jsdom dependency.

Rollback of the UI requires removing only the two `v230-request-progress` entries from `app-assets.json`. Existing monitor markup and logic are untouched in the base HTML; the added integration wraps them at runtime. No existing data is overwritten. Progress rows are isolated under the dedicated task ID, and can simply remain hidden if rolling back. Never remove unrelated records.
