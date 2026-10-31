# Living room tools — 20261101.1-living

## Intent and design

The original castle stays the application, not a game that must be completed.
PR93's continuous door/camera/occlusion journey, original characters, account
identities, immediate work rail and current reader remain the baseline.

The optional **道具** view is an asymmetric physical workbench: bound books,
pinned note, manuscript stack and brass/wood keepsake box. Penderecki’s Garden
informs the clear relationship between distinct places and useful content;
Igloo informs coherent material and typography. No reference art/code is used.
No WebGL, new image downloads, audio permission or background service is added.

## Real actions and data

- **机の原稿** returns to the same live reader and scroll. Copy still uses the
  established final-draft/clipboard controller, not an ornamental duplicate.
- **原稿の本棚** opens the existing shelf DOM and its search/filter handlers.
- **お気に入りの箱** lists only this account's existing local pins. Looking in
  the box does not modify pins, filters or selected draft; selection is explicit.
- **伝言板** presents revision-aware unread/updated saved drafts and a held
  update only when the current reader is genuinely protecting old text.
- **コピー履歴** opens the existing account-isolated copy history.
- **持ち場メモ** is factual UI, not new character dialogue or a claimed live
  agent activity. Read/posted marks are explicitly local notes. Copy is not post.

The model reads the existing notebook only. Variants are grouped by explicit
place/account/source ID. Unknown or incomplete reads never imply an empty
server total. Held or rejected source reads remain provisional. Missing dates
are not inferred from notebook normalization timestamps. Native sourcing stays
on its established direct ledger route and is explicitly not aggregated here.

No new fetch, polling, Supabase operation, external posting, source mutation,
account migration or automation is introduced. Preferences and source records
remain owned by existing controllers. The optional UI uses no separate store.

## Interaction and failure contracts

Reader DOM is never moved/cloned for the tools view; it is temporarily inert and
visually covered. Scroll, final-draft editor, source IDs and controls survive.
Native dialogs return focus to the originating object. Escape from tools returns
to paper before leaving the room. New rooms reset tools context. A visible
workbench is captured by the existing sanitized, inert, bounded departure
foreground so PR93 reverse travel remains continuous.

Object labels/counts do not bounce; only small local material feedback responds.
Motion preference is respected. Missing tool CSS/module leaves the proven
reader available. Cache revision 73 replaces only superseded app-shell caches.

## Verification

Focused model, DOM, foreground, journey, reader and loader tests accompany the
change. CI uses the actual production host with synthetic records at 320×640,
390×900, Fold 800×648 and desktop 1440×900. It covers tools, source identity,
unknown/error/held updates, focus/scroll, interruptions and existing motion.
Full operation regression and independent actual-image review are release gates.
Authenticated production records are not used for tests; a physical Fold's GPU
performance is outside the synthetic-browser verification.
