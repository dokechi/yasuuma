# 司令塔 — spatial castle release

## User-facing architecture
- One connected cutaway castle replaces the eight-card entry. Five lit destinations retain their canonical account identities; three sealed wings remain unconfigured and disabled.
- Phone: readable room focus, visible neighbouring room targets, full-castle overview, previous/next/swipe, and an always-available five-destination rail. No forced travel sequence.
- Four publishing rooms use matching high-resolution interiors, original-character foregrounds, and the existing manuscript DOM as the foreground paper. Shelf and work tools are secondary disclosures; current account/handle and direct room switching remain available.
- Sourcing opens the original native ledger immediately, in the matching workshop. No copy of ledger state or new business workflow was introduced.

## Ownership and fallback
`accounts.js` remains the canonical account/record/routing controller. Its presentation subscription does not persist or mutate records. `castle-scene.js` consumes it; `spatial-desk.js` temporarily relocates existing DOM nodes, preserving their original handlers and restoring them on exit.

The application boots independently of the enhancement. `spatial-atelier.js` checks stylesheet readiness and catches enhancement failure, restoring the original account/reader view. Interior artwork loads only for the selected room; failure keeps a usable master-image fallback. Late image results cannot overwrite another account.

## Interaction and accessibility
The 220 ms camera follows actual room coordinates, never captures input or delays routing, cancels on return/reduced motion, and is absent under reduced motion. All primary controls remain at least44 CSS pixels. Manuscript body stays16 pixels; first-fold body and180-pixel minimum reader viewport are checked down to320×640 and Fold800×648. Native dialogs, restored focus, inert covered controls, original list scroll/focus, and explicit loading/error states remain tested.

## Assets and provenance
Seven initial world assets total1,503,712 bytes. Five dedicated interiors total1,664,874 bytes, each below350 KB and loaded on demand. WebP assets retain generated PNG originals and generation prompts outside the deployed repository; repository prompt/provenance JSON files record their lineage. Referenced edits preserve existing character identity by visual inspection, not a claim of pixel-identical extraction. No third-party rendering engine, paid runtime, external image request, or WebGL dependency was added.

## Validation boundary
Chrome CI uses the real application modules and loader with explicit synthetic records/API fixtures. It exercises desktop, phone, and unfolded-Fold dimensions, artwork, routes, copy/variants/search, native review/ledger, focus, errors, read-only source retention, and reduced motion. This is not physical Galaxy device testing or an authenticated live-backend verification. Public deployment verification separately checks HTTP status and exact deployed asset hashes after merge.

No authentication, sharing, API permissions, integrations, account identities, archive contents, or local user data are changed. Offline shell revision71 removes only superseded application caches, not local user records.
