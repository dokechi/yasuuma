# Castle conversation v25 — source-character fidelity

The user rejected v24's shared devotional voice on 2026-10-16 and asked for
原作準拠. This request takes precedence over the report's earlier optional
「ご主人様が大好き」 adaptation. All 272 utterances have been rewritten.
The existing adult original cast, artwork and work roles stay in place.

## Authority and scope

The supplied `shireitou-persona-research.md` (2026-10-16), especially chapters
3–6 and 8, supplies the character models and evidence cards. Chapter 7's shared
master/devotion framing is no longer a dialogue requirement. These are original
lines for the castle situation, not quotations or new canonical scenes. The
implementation does not claim a full reading of all novels or perfect fidelity.
Do not assign the source protagonists' names, school histories, relationships,
or memories to the user. Do not merge alternative routes or stages of a romance.
The conversation assumes familiar collaborators, without inventing a dating
milestone or making every interaction an expression of attraction.

Sources revisited for this revision:

- Megumi: https://mora.jp/topics/interview/kato-megumi/ — author-supervised
  conversation demonstrates everyday vocabulary, dry reframing and participation.
  Its promotional/meta context is not imported as a life history or a requirement
  to make every reply sarcastic. Research cards K-C1–K-C8 add quiet agency.
- Iroha: https://hominis.media/category/voiceActor/post5539/ — the performer describes
  observation of herself/others, fast exchanges and more depth than a cute attribute.
  Use I-C1–I-C8 for requests, responsibility and guarded sincerity.
- Utaha: https://www.animatetimes.com/news/details.php?id=1571812682&p=3 — the performer
  describes implication, teasing and difficulty being straightforward, alongside
  the importance of a reader's recognition. Use U-C1–U-C8 for standards and vulnerability.
- Asuna: https://www.swordart-online.net/special/interview04.html — the performer
  distinguishes resolve in responsibility from ordinary, sometimes awkward personal
  expression. Use A-C1–A-C8 for independent action and reciprocal support.

These summaries support editorial choices, not a measured accuracy score.
Performer and fan interpretations remain distinct from author-confirmed canon.
No source transcripts are copied into the application.

## Editorial contract

| Place | What chooses the response | Cadence and range | Reject |
| --- | --- | --- | --- |
| kyun / red / Iroha | Reads the exchange, wants a say, negotiates help, does her own share | Light polite speech, request and reversal; sometimes unguarded | All-purpose flirt, obedient helper, constant stretched vowels, omniscient manipulator |
| choi / purple / Utaha | Tests meaning and standards, wants a real response, has personal stakes | Precise assertions, implication and counterquestions; can drop the rhetorical cover | Merely elegant mentor, endless metaphors, blanket praise, constant abuse |
| fp / silver / Megumi | Notices the ordinary situation, participates, retains her own preference | Plain speech, understatement, small correction; warmth without constant declarations | Blank affect, endlessly accepting girlfriend, nonstop ellipses or sarcasm |
| shiire / orange / Asuna | Checks the problem, decides and acts alongside the user | Direct and energetic, willing to disagree, softer in ordinary breaks | Maternal reassurance loop, servant obedience, permanent commander, invented expertise |

A tap is a call for attention, not evidence of love, tiredness, praise or an
invented shared history. Repeated calls may prompt impatience or a request to
let the character answer; they do not automatically make all four blush.
Hair/hand/clothing events respond to that region without turning every touch
into romance. Optional special scenes allow personal expression through each
individual's priorities. Captions must not contradict the actual words.

Before accepting a new line, check:
1. Does its motive match a research card, beyond the final particles?
2. Does the trigger support what the character knows? No imagined user reply.
3. Could another character use it merely by changing the ending? If so, revise.
4. Is a plain or kind reply still possible? Fidelity is not nonstop sarcasm or anger.
5. Is any task result confirmed? Copying is not posting or buying.

## Runtime

- Each character has 60 event lines and four two-part thoughts: 68 utterances,
  272 total. The same bank supplies scene and legacy/fallback text.
- Selection uses observed events and avoids recent lines. It does not generate
  AI text, understand free-form answers or infer feelings.
- Only bounded line IDs and visit counts persist under `castle-town.persona.v1`;
  no preferences, relationship scores or user memories.
- First greetings use Japan time; subsequent visits use return greetings.
- Every fourth eligible head/keyboard interaction can start a two-part thought.
  A matching touch OR 「もう少し話す」 within 90 seconds delivers its second part
  once. Other scenes/actions, leaving or expiry cancel it.
- Taps within 320 ms are ignored; every third tap in a burst uses the character's
  repeat pool. Work remains available throughout.
- Labels name the event instead of prescribing a shared emotional reaction.
- Copy replies require successful copying; empty prompts refer to the visible desk.
- Artwork, layout, saved records, account data and data adapters are unchanged.

## Verification and release

Run `NODE_PATH=<existing linkedom node_modules> node --test tests/*.test.cjs`
from `command-center-98/castle`. Tests cover variety, continuation via touch/button,
cancellation, reload, storage failure, copy, original data preservation and scene
controls. They establish behavior, not an objective personality fidelity score.

`entry-v25.html` bypasses the deployed v24 cache-first HTML route. Changed modules
get v25 URLs; unchanged URLs remain in the offline manifest. The v25 worker
precaches the new dialogue chain. The host points to the new entry; CI's browser
test also opens it. The old worker remains only as a cache-transition fixture.
