# Whole-application RPG presentation

## Scope and invariants

A last-loaded, body-scoped CSS layer makes the existing screens consistent with the approved castle-town homepage. Deep navy/ink surfaces, warm text, thin borders, restrained motion and DotGothic16 headings replace the Windows-style chrome. Dense reading and editing retain a system font and low-glare controls.

The homepage artwork, homepage CSS and routing script are unchanged. All executable scripts in the login page, app shell and boot entry are unchanged. No schema, API, credentials, storage keys, permissions or data mutations are introduced. This change does not invent account totals or production records.

## Screen inventory

- Entry: login, boot/progress, error note.
- Shared shell: title bar, desktop/mobile navigation, all-tools disclosure, dropdown menus, filters, status bar, keyboard focus and disabled/selected controls.
- Home and generic records: feeds, launchers, active/history/accepted/rejected/saved/events and domain filters.
- Editorial: FP and housing candidates, draft dialog, copy/source/evidence panels, design options, performance and finished-image controls; X cards/editor; Reddit inbox/candidate/draft/tracking/posted/miss/editor.
- Operations: career tables/dialog; affiliate settings, jobs, production actions, preview/import; shopping-neko cards/copy dialog.
- Sourcing: queue, hold/research, purchases, suppliers, discoveries, success, close, miss; mobile comparisons, ledger cost/sales, last-check, Mercari history and purchase drilldown.
- Cross-cutting: task/request-progress/trade detail, review/help dialogs, account-native dialogs, loading/error/empty states, toast feedback, close/back controls.

Explicit component selectors override legacy hardcoded light surfaces. No universal descendant background reset is used, so image content and palette swatches remain intact. Visibility, routing and event handlers remain owned by the existing app. Screenshot QA exposed the legacy menu (z-index 320/330) covering custom dialogs. The theme narrowly places custom modal backdrops at 400 and the toast root at 450; approved RPG HOME remains at 100, menu-over-navigation order and native-dialog top-layer behavior remain unchanged. No individual child control is raised.

## Verification

`node command-center-98/app-loader.test.cjs` includes theme scope, manifest ordering, contrast and retained responsive-home contracts. Existing data and business-logic suites remain in the regression workflow.

`scripts/rpg-theme-browser.test.mjs` runs the real loader and app scripts in CI Chrome at mobile and desktop sizes. Synthetic fixtures intercept requests; the existing workflow initialization request is synthesized locally and logged separately, every other non-read operation fails closed, and all external requests are blocked. Screenshots and per-route geometry/contrast results are uploaded as `rpg-theme-browser-screenshots`. The test compares the approved homepage's computed layout and paint with the new theme enabled and disabled. No production credentials or data are needed.

Local static checks are not a substitute for the CI browser run. Review screenshots before merging; retain any remaining coverage limitations in the PR.
