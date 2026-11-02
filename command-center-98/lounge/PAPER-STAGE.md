# Live sage paper stage

`paper-atelier.js` mounts the default presentation after the one `app.js` owner.
`paper-stage.js` builds paper, backings, envelope fronts and support surfaces as
independent DOM/CSS layers. The reference image is not served as application UI.
Titles and excerpts come from the existing notebook through the narrow
`getPaperDesk()` adapter. Selecting a paper moves the exact existing `#desk`
inside that paper. Closing restores its DOM position, focus and viewport scroll.
Existing copy, variants, editing, images, posting preparation and read actions
remain owned by the original reader. No API or source records are rewritten.

The category band takes active publishing identities from `publishingAccounts`
and adds the existing sourcing route. It currently includes `tanaka` / 田中卓.
The band can scroll horizontally and is tested with eight category entries.
Future category names are not invented in production. Arrow keys/Home/End move
focus; Enter/Space activate the chosen category. Every tab stays at least 44px
high, with 16px labels. Long lists continue in batches of 20 grouped manuscripts;
the source collection is never truncated.

## Future-use marks

The existing browser notebook stores the new independent `future:` mark. It
does not reuse favorite `pin:`, later `tray:`, read `done:` or posted metadata.
Current authentication is a single shared access-code session and does not
provide a stable per-user subject. The host therefore supplies only an opaque
SHA-256 session digest; no access token enters the iframe message or mark key.
The full key contains that digest, place, source account, source ID and draft ID.
Missing identity disables marking. Another login session cannot inherit marks.
Reloading within the same login restores marks; logging in again or changing
devices does not synchronize them. UI titles and the filtered-state label make
the current-device/current-login scope explicit. No schema, credentials or
permissions are added. Existing notebook storage-error handling is retained.

## Safety and fallback

Initial presentation only reads existing manuscripts and flags. It does not
open a paper, copy, acknowledge a visit or mark a manuscript as read. There is no
idle paper animation. Optional illustration failures do not stop the new stage.
If the new stylesheet or module is missing, the retained book/reader remains the
fallback. Removing the `paper-stage.css` and `paper-atelier.js` entries from
`index.html` restores the previous presentation; no source data needs rollback.

## Verification

`scripts/paper-stage.test.mjs` verifies eight tabs, exact live reader identity,
source updates while reading, rapid opens, Escape, category interruption, empty
and failed reads, long manuscripts, pagination and mark isolation.

`scripts/paper-browser.cjs` serves the real default host and source controllers
with synthetic API fixtures. It blocks external requests and asserts zero source
writes. It captures phone, Fold and desktop views; normal/reduced motion;
eight-category fixture; missing optional illustration; actual copy; exact-source
opening; future marks; close geometry; search and settings. It never logs into
production or modifies user data. CI uploads screenshots and result JSON.
