# Five original paper chapters — frozen integration candidate v3

## Exact runtime handoff
- `storybook-art.js` (26,842 bytes), SHA256 `27a82ffa09232baf2cc98c7a6a18310f91b8de596093b1e357b1180bda2f77df`.
- `insurance-actor-v1.webp`, `otoku-actor-v1.webp`, `rakuten-actor-v1.webp`, `lottery-actor-v1.webp`, `sourcing-actor-v1.webp`. Each original transparent 1536 × 1024 actor + working-prop cluster, each below 200 KB. Exact hashes/bytes in `layout-v3-provenance.json`.
- Maintainable sources: module, `storybook-art.test.mjs`, `layout-v3-proof.json`, `layout-v3-provenance.json`, `palette-v2.json`, `actor-alpha-proof-v1.json`, each actor's prompt/provenance. Original PNGs are retained outside repo; not needed as runtime payload.
- This supersedes the insurance-only module; does not change any controller, real manuscript, data or route.

## API / layout
`buildStorybookArt({document,key,actorURL?,layout:'spread'|'page'|'legacy'})` returns fresh decorative DOM; null for unknown key.
- spread aspect 2, page aspect 1/1.05, legacy aspect 4/3. Root numeric `data-story-aspect` plus `data-story-layout`.
- Root `data-story-actor-x/y/w/h` always supplied, even without actorURL. Reader must use these same percentages rather than generic actor position. Sourcing and lottery need different page positions because their working props extend farther left.
- `--x/--y/--w/--h` percentages and `--tilt` degrees on every native object. Bottom hinge origin. SVG `meet` and image `contain`, never stretch or crop into a portrait.
- Modern insurance has 5 native props + actor. Other chapters have 4 distinct native props + actor. No chapter silently reuses another character or identical recoloured window structure.
- No SVG IDs/hrefs/filters/external resources/text, and no interactive controls. The host owns actual text, controls and broad vivid paper colors.
- Actor error hides image AND its contact-mark wrapper once, sets root `artState=fallback`; native props remain. This does not change data state or stop reading.

## Spatial language
Insurance: letter correspondence and stepped library. Otoku: greenhouse and catalogue. Rakuten: wrapping counter and pantry. Lottery: map/chart editor. Sourcing: ledger and inventory stand.
Native shapes have small folded paper feet and local contact shadows; actor shadows stay in the same contain coordinate space. Large chapter color pairs are host pages, not a painted wallpaper: gold/lime, blue/mint, coral/pink, royal/lilac, orange/sky.

## Evidence / limits
60 pure actor-fit checks pass (5 rooms × 3 layouts × 4 host boxes), with shared actor metadata, distinct props, fresh DOM, SVG safety and image-error fallback checks. These are not browser visual acceptance.
All PNG→WebP alpha channels are exactly identical. Colored RGB under alpha0 is not a visible haze. All5 have no alpha≥13 pixels farther than16px from their solid silhouette. Actual broad-page rendering remains the decisive alpha check.

Next acceptance shots: all five home/reader/tools scenes at 1440×900, 800×648, 390×900, 320×640; valid entry0/.2/.4/.5/.65/.9/end and reverse. Judge page structure and density, not only intact characters. No detached sticker rectangles, dark castle leakage, miniature phone body, clipping or distorted manuscript. The prior insurance whole-book color direction was conditionally accepted; full-five visual and motion gates remain pending.
