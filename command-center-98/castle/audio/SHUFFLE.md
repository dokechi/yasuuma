# Four approved songs

The single native audio element plays a shuffled bag of four tracks. Each bag contains every track once; its first track cannot repeat the preceding bag's last track. Manual next is debounced. Natural track endings advance the playlist; MP3 tracks are regular editions, not seamless loops.

Initial BGM remains OFF. Reloading saved ON preferences still requires a play gesture. The saved track is resumed on reload; legacy saved ON settings default to Harvest Festival to keep its existing offline cache useful. Audio preload is none. Only the selected song is requested; no full-catalog prefetch, second audio element, crossfade, or background download is added.

The existing persistent music cache is retained across shell updates. MP3s use the same complete-response cache and byte-range handling as Harvest. A failed song exposes retry and next without affecting drafts. A never-played song needs a network connection; offline next can fail until a downloaded song is selected. Browsers may evict caches or refuse storage, so offline availability is not guaranteed.

Added files total 19,974,320 bytes. This increases repository size, and browser storage/transfer only as those songs are played; it does not add those bytes to app startup. Sources, hashes, attribution, archive members and lack of audio edits are documented in ADDITIONAL-PROVENANCE.json and LICENSE.txt.

Button feedback uses a single trusted click listener, including keyboard-generated clicks and dynamically created buttons. Eight-millisecond vibration is limited to one pulse per 120 ms and disabled by reduced motion or the existing haptic preference. Existing explicit OFF is preserved; new users default ON where supported. Unsupported, refused or throwing vibration implementations retain short static visual feedback. No new sound is triggered. Physical vibration strength remains device-dependent and cannot be measured by desktop browser tests.
