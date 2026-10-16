# Castle conversation v24

The adult original cast uses the personality research report
`shireitou-persona-research.md` (2026-10-16) as its design basis. The report is
retained separately; no manuscripts, account data, or original source transcripts
are copied into this public codebase.

| Place | Research axis | Expression of affection |
| --- | --- | --- |
| kyun / red | Iroha: observant, playful, capable of unguarded sincerity | Wants the user's attention and a meaningful role |
| choi / purple | Utaha: verbal confidence and vulnerability about recognition | Seeks a personal response beyond praise for work |
| fp / silver | Megumi: everyday language, quiet agency, shared decisions | Wants ordinary time and inclusion in decisions |
| shiire / orange | Asuna: independent judgment, partnership, care | Works alongside the user and encourages rest |

All dialogue is newly written. `ご主人様` is an adaptation for the castle, not a
claim about the source characters' canonical relationships. No source character
names or school histories are presented as the castle characters' identities.

## Runtime

- `persona-lines.js` contains distinct pools for arrivals, touches, scene context,
  repeated taps, successful copy, completion, and optional conversational replies.
- `persona.js` selects without immediate repetition. Per-character bounded recent
  line IDs and visit counts use only `castle-town.persona.v1`. Storage denial and
  malformed memory fall back to a working in-memory conversation.
- First greetings use Japan time; subsequent visits get return greetings.
- Every fourth ordinary head/keyboard interaction can begin a two-part thought.
  The next matching interaction within 90 seconds continues it. Changing place,
  selecting another scene, choosing a response, or starting another action clears it.
- Taps inside 320 ms are ignored to prevent accidental double activation. A burst
  of three taps produces a character-specific acknowledgement, without penalizing
  the user or blocking work. Click remains native so scrolling is not a touch action.
- The current line stays until the next interaction; loading art and timed scene
  changes cannot overwrite it. Full-view conversation has three optional replies.
- No AI API, new subscription, audio generation, network request for dialogue,
  or fabricated memory of user behavior is involved.
- Copy dialogue runs only after the existing successful-copy callback. Empty
  workspaces get appropriate prompts and never assert saved records are absent.
- New user PNGs remain static and unchanged; existing scene motion is retained.

## Verification

Run `node --test tests/*.test.cjs` from `command-center-98/castle` with the existing
`linkedom` test dependency. Persona tests cover each role, variation, return visits,
JST boundaries, short-burst taps, dialogue continuity, missing records, bad storage,
scene loading races, full-view replies, pause, and clipboard result integration.
The versioned `entry-v24.html` bypasses the old cache-first v23 navigation shell;
both new modules are included in the offline shell. Existing original artwork and
production data adapters are retained.
