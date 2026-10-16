# Castle dialogue v28 — 2026-10-17

## User intent and approved scope

The goal is to feel that the character is here, speaking to this user in this
scene. The user explicitly allows original writing, canonical dialogue,
official spin-offs and fan analysis as reference material. The earlier
"original quotations only" requirement was a response to poor character writing,
not a lasting source restriction. Source labels, quote counters, canonical scene
summaries and unrelated named characters in the conversation were rejected.

The user approved the eight authored lines shown in the immediately preceding
conversation: one arrival and one repeated-touch response for each character.
`castle/persona-lines.js` contains those exact lines in `PERSONA_DIALOGUE`.
They are creative dialogue, not claimed quotations from the original works.
No new lines were added during implementation.

| Place / colour | Personality reference | Lines |
| --- | --- | --- |
| fp / silver | 加藤恵 | arrival + repeated touch |
| kyun / red | 一色いろは | arrival + repeated touch |
| choi / purple | 新垣あやせ | arrival + repeated touch |
| shiire / orange | アスナ | arrival + repeated touch |

The existing adult original illustrations and four work roles remain in use.
The conversational premise is that the user and character already know one
another and share the current space. Do not import canonical romantic partners,
secrets, promises or off-screen events. Do not add explanations of a character's
personality to the speech bubble.

## Situation handling

- Entering a room shows its approved arrival line, never a random quote.
- A first character touch retains the existing speech and triggers the existing
  visual/sound reaction where available. No extra dialogue is invented for it.
- A second accepted touch within eight seconds shows the repeated-touch line.
  Accidental duplicates under 320 ms are ignored. Further touches in the same
  burst do not repeatedly announce the same sentence.
- An eight-second gap, leaving a room, or background pause resets the burst.
  Returning to a room starts with the arrival line. Counts do not leak across
  characters or persist over reload.
- Full-view image touch, its accessible "タッチする" button, and the main image
  share touch state. There is no "next quotation" control.
- Source links, quote counters, canonical character/context labels and mood
  narration are absent from both conversation views. Reference names remain in
  developer data only; the work role and selected art scene still label controls.
- Copy, completion, rest/work selection and automatic image rotation preserve the
  current dialogue. Task outcomes use ordinary interface notices.
- Retain bounded visit counts under the existing persona storage key; discard old
  quotation order. Never change the manuscript/business storage during migration.

## Editorial reference trail (development only)

These sources inform the approach; they are not the source of the eight authored
sentences and are not user-facing dialogue annotations.

- NTT / Dwango / Gatebox's Ayase project: question/answer pairs were evaluated by
  fans for character fit. https://dwango.co.jp/news/6859613059098013252/
- Sony's Megumi app: original-author-supervised scenarios for living alongside
  the character. https://www.sme.co.jp/pressrelease/news/detail/NEWS000953.html
- Sony's Asuna app: character interaction in everyday situations.
  https://www.sme.co.jp/pressrelease/news/detail/NEWS000860.html
- Gatebox's account of evolving familiarity and remembering prior interactions.
  https://note.com/gatebox_recruit/n/nbb2083632a64
- Mitsuda et al. (2023), character-chatbot errors involving identity and
  relationships. https://www.jstage.jst.go.jp/article/jnlp/30/4/30_1172/_pdf

Evaluate future writing against three questions: Does this character say it?
Does it fit what just happened? Does it address this user rather than an imported
canonical character? Automated tests do not establish personality fidelity.

## Image rotation and release

Auto mode continues through the existing five scenes roughly every ten seconds
after loading, including full view. Manual selection stays fixed. Hidden pages,
host pause and focus mode stop rotation. Images have a twelve-second deadline;
failed scenes are skipped and retried on the next cycle. The last successful image
and current speech survive failures. No external AI service is added.

The host opens `entry-v28.html`; changed modules and conversation CSS use v28.
The parent shell is revision 30. The exact v27 worker is retained as a cache
transition fixture. Older entry files are retained for existing sessions.

Run `NODE_PATH=<linkedom node_modules> node --test tests/*.test.cjs` from
`command-center-98/castle`, then `scripts/castle-art-browser.cjs` with Chrome and
playwright-core. The browser check covers all four rooms at 390 and 1440 pixels,
all twenty scenes, main/full-view dialogue, keyboard touch, text bounds, copying,
focus and unchanged drafts. The existing full-host/offline CI gates also apply.
