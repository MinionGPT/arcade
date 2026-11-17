# Beat Booth (cabinet 03)

Five drums, sixteen steps, no samples. Click pads, hit PLAY, a stamp judges the groove (NO CAP / CAP),
and the whole beat is one short share code. Open `index.html`. No server, no accounts, no network.

## Files (copy this layout for a cabinet with audio)

| File | Job |
|------|-----|
| `beat.js` | Pure logic: patterns, share code, timing, judge, WAV writer, ticket barcode. No DOM, no audio. Node-testable. |
| `voices.js` | WebAudio: five drum voices, lookahead scheduler, offline bounce. Browser only. |
| `app.js` | DOM glue only. If you want to test it, move it into `beat.js`. |
| `beat.css` / `tile.css` | Cabinet page styles / floor-tile art (the floor page links `tile.css`). |
| `beat.test.js` | Fast Node tests, run by `npm test`. |
| `browser-test.js` | Real Chromium via Playwright: clicks, drag, playhead, audio render, WAV download, overflow. Run by hand. |

## Share code

`BB1-<bpm>-<swing>-<kick>-<snare>-<clap>-<hat>-<bell>`, each track a 4-digit hex mask (bit 15 = step 1).
`BB1-124-0-8888-0000-0808-2222-0001` is four-on-the-floor. The page URL hash follows the beat, so the
address bar is also a share link. Bad codes are rejected, never "fixed".

## Proof (real output, 2026-11-16)

```
$ node cabinets/beat-booth/beat.test.js
ok  every preset round-trips through its share code
ok  known code: 4-on-the-floor kick is 8888
ok  toggle is immutable and symmetrical
ok  hitsAt lists the tracks that fire on a step
ok  bad codes and bad input are rejected, never guessed
ok  timing: straight at swing 0, odd steps late with swing, bar length never drifts
ok  judge is deterministic and reads the pattern
ok  wavBytes writes a valid 16-bit mono RIFF header and clamps samples
ok  barcode is deterministic, differs per beat, and its bars never overlap
beat-booth: 9 tests passed

$ node cabinets/beat-booth/browser-test.js
ok  floor tile opens the cabinet
ok  80 pads rendered, preset 0 shows 11 hits
ok  drag-painting turned on 8 hat pads
ok  PLAY lights a playhead column, STOP clears it
ok  offline render: peak 0.859 ... empty = 0
    voices (peak, zero-cross Hz): kick 66, snare 3508, clap 2420, hat 3976, bell 790
ok  kick is low, snare mid, hat bright
ok  BOUNCE WAV downloaded ... 394384 bytes
ok  mute works: kick-only bounce peak 24818 -> muted 0
ok  no horizontal overflow at 1280 / 768 / 390 px
ok  zero page errors / console errors
```

## What was NOT proven

No human has listened to it. The tests prove the audio is non-silent, finite, in order of brightness
(kick < snare < hat), and that muting silences the render. Whether it sounds *good* is for ears.
Mutes are UI-only and not stored in the share code (by design; the code is the pattern, not the mix).

## Add a preset

Add a row to `PRESET_ROWS` in `beat.js` (16 chars of `x` and `.` per track, order: kick, snare, clap, hat, bell),
then run `npm test`. The round-trip test covers it automatically.
