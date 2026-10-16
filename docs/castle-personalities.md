# Castle quotations v26 — 2026-10-16

The user prefers unchanged lines from the works to the previous 272 invented
utterances. Purple now references **新垣あやせ**, replacing 霞ヶ丘詩羽.
The original adult artwork and four work roles remain unchanged.

| Place / colour | Dialogue character | Bank |
| --- | --- | --- |
| fp / silver | 加藤恵 | 3 |
| kyun / red | 一色いろは | 3 |
| choi / purple | 新垣あやせ | 3 |
| shiire / orange | アスナ | 3 |

`castle/persona-lines.js` is the source of truth for the 12 quotations, context,
source type and source URL. Do not silently rewrite quoted words, substitute
names, fabricate follow-ups or label secondary transcriptions as official.

Megumi uses an original-author short story and official merchandise wording.
Iroha uses one official merchandise line and two explicitly labelled fan
transcriptions of anime dialogue. Those two have not been checked against the
primary recording. Ayase uses quoted dialogue in KADOKAWA's official descriptions
of novels 13 and 14: **あやせif**, an alternate route, not the main ending.
Asuna uses the official SAO AWARD 2014 quotation shortlist. This collection does
not claim all lines were verified against the original novels.

The main view shows character, quote number and a source link. Full view adds
scene context and the source type/title. These are attributed work quotations,
not an invented assertion that the user is the canonical romantic partner.
Tap the character or 「次のセリフ」 to cycle; no repetition until the bank is
exhausted. Old generated line IDs are discarded when loading memory.
Copy and completion use neutral status messages and leave the quotation alone.

## Image rotation

Auto mode cycles each character's existing five scenes approximately every
10 seconds after loading. Full view also rotates. Image changes preserve the
quotation, source and manuscript. Manual scene selection stays fixed and is
remembered per room for the current session. Hidden pages, host pause and focus
mode stop rotation. Returning starts a fresh interval. No external API is added.

## Verification / release

Run `NODE_PATH=<linkedom node_modules> node --test tests/*.test.cjs` from
`command-center-98/castle`, and `scripts/castle-art-browser.cjs` with Chrome and
playwright-core available. Coverage includes source synchronization, cycling,
manual selection, background pause, late image loads, offline updates and
preservation of manuscript data. It does not measure personality fidelity.

The host opens `entry-v26.html` to bypass the prior cache-first HTML route;
modified scripts/styles have v26 URLs. The previous v25 worker is kept as a
cache-transition test fixture. The parent shell is revision 28.
