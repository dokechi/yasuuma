# 司令塔 — tactile spatial journeys

## Design lineage
The user requested the combined interaction principles of [Unseen](https://unseen.co/) (hold/drag exploration), [Bruno Simon](https://bruno-simon.com/) (continuous spatial navigation and approachable controls), and [Lusion](https://lusion.co/) (layered visual storytelling). Official page descriptions informed the brief; their live WebGL motion was not inspected in the available cloud browser. No third-party artwork, implementation, sounds, or branding was copied.

The existing castle is rendered as layered 2.5D DOM/CSS, not a mandatory driving game or new WebGL application. Original account identities, characters, room illustrations, records and business actions remain canonical.

## Interaction contract
- A physical room target responds immediately; camera coordinates begin at the actual painted castle, even if a previous focus/overview movement is unfinished. Touch targets and the orrery follow the painted architecture throughout that movement, rather than jumping to future positions.
- Camera approaches that room, wood/brass leaves and foreground frame occlude the change, the matching interior appears, then the companion and existing manuscript settle. On compact readers the paper and companion stay paired so their original crop is never exposed. Return retraces the same room.
- Normal pace is 780 ms; the existing quick/normal/slow preference adjusts presentation only. The explicit **すぐ開く** rail skips travel on entry and its matching return.
- Routing and copy/search/shelf/work controls never wait for animation. Pointer work, Escape, newer navigation, hidden pages, viewport changes (including Fold posture changes) and reduced motion cancel presentation safely. Motion owns no focus, route, source record, or network write.
- The central orrery has a keyboard-accessible click alternative to hold/horizontal drag. It changes only local light/material response. Vertical touch panning is not captured; an orrery drag does not also swipe the room browser. Paper text never follows pointer motion or rotates.
- The visible sound toggle reuses `shireito-courtyard-v1` and the established audio controls. Default is OFF; explicit user gestures enable short existing feedback sounds. No new audio service, track or autoplay was added.

## Boundaries and fallback
`castle-journey-host.js` accepts only same-origin messages from the established iframe, validates known room keys and finite bounded geometry, and renders an inert, pointer-transparent parent layer below the request rail. The existing native sourcing route remains immediate. Host lifecycle events contain only presentation action names, never tokens or records.

The optional foreground snapshot is a short-lived DOM copy of already rendered paper and companion. It uses no HTML serialization, strips IDs/handlers/forms/executable nodes, has a 350-element budget, and retains scroll only as ephemeral presentation metadata. It never moves the real manuscript or stores/transmits its text.

An unavailable effect module/stylesheet leaves the existing working interface intact. A late or failed interior image retains the already cached castle crop. Snapshot and animation failure clean up their own nodes; a stale completion cannot remove a newer journey. Offline shell revision72 removes only superseded application caches, not local user data.

## Verification
The release gate includes isolated renderer/snapshot/reader tests, existing account and host contracts, actual Chrome frames and interrupted flows at320/390/Fold800×648/1440, independent UX/art review, full exact-head CI, and public-byte checks after merge. Browser fixtures contain explicit synthetic records. They do not constitute authenticated production-backend actions or physical Galaxy hardware testing.
