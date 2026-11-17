# PLATE 777 — Cabinet 12, the lucky-plate auction oracle

Type any plate. The house strips the digits and scores it with five rules that
live in `engine.js`. Score ≥ 6 (the pass line, a constant in the code) stamps
**NO CAP** in brass — the auction price is real, bid. Below 6 stamps **CAP**
in transparent ink — the hype is doing numbers, walk.

## The five rules (every point on the receipt is one of these)

| row | rule |
| --- | --- |
| ROOT n | digit-sum root scored from a table: 8→+3, 9→+2, 6→+2, 3→+1, 4→−3, rest 0 |
| LUCKY 8s/9s | +1 per digit 8 or 9 |
| FOUR PENALTY | −2 per digit 4 |
| TRIPLE DIGIT | +2 when any digit appears 3+ times |
| JACKPOT 777 | +7 when the digits contain `777` |

The rows must sum to the score (asserted in the unit suite), the roast comes
from a verdict pool picked by hashing the digits (deterministic, two pools so
NO CAP and CAP never share a line), and nothing about the verdict is typed by
hand. The numerology itself is invented — it's a toy oracle, not a real
auction house — but the arithmetic is not allowed to lie.

## How to run (from the arcade root, not this folder)

```sh
node --test cabinets/plate-777/engine.test.js   # unit suite
node cabinets/plate-777/demo.js                 # print four real receipts
node cabinets/plate-777/browser-test.js         # real-Chromium suite
npm run test:all                                # the whole floor, before & after changes
npm run prove:red                               # mutation proof (this cabinet has 2 reds)
```

Open `cabinets/plate-777/index.html` in a browser (file:// works, offline).

## Proof (cycle 53, real output)

```
$ node --test cabinets/plate-777/engine.test.js
✔ pinned fixtures: digits, root, score and verdict all match the rules
✔ the score is exactly the sum of its printed rows (receipt can't drift)
✔ verdict boundary: 98 (score 5) is CAP, 8888 (score 6) sits on the pass line
...
ℹ tests 9
ℹ pass 9
ℹ fail 0
EXIT=0

$ node cabinets/plate-777/demo.js
PLATE : BKK 777
DIGITS: 777  ROOT: 3  SCORE: 10  (pass line 6)
    ROOT 3         +1
    LUCKY 8s/9s    0
    FOUR PENALTY   0
    TRIPLE DIGIT   +2
    JACKPOT 777    +7
STAMP : NO CAP
ROAST : Worth the queue at the auction house. Bring cash and a straight face.

PLATE : 98
DIGITS: 98  ROOT: 8  SCORE: 5  (pass line 6)
    ROOT 8         +3
    LUCKY 8s/9s    +2
    ... (score 5 < pass line 6)
STAMP : CAP

$ node cabinets/plate-777/browser-test.js
ok  NO CAP stamp is painted brass (computed style), five rows printed
ok  CAP stamp stays transparent (computed style)
ok  hostile input stays literal, nothing executes
ok  no horizontal overflow at 1280 / 768 / 390 / 320
ok  visual lint clean after a play
plate-777 cabinet browser test: PASS
EXIT=0

$ npm run prove:red
GREEN --test cabinets/plate-777/engine.test.js (exit 0)
RED cabinets/plate-777/engine.js (exit 1): ✖ verdict boundary: 98 (score 5) is CAP, 8888 (score 6) sits on the pass line
RED cabinets/plate-777/plate.css (exit 1): NO CAP stamp should be brass, got rgba(0, 0, 0, 0)
PROVE-RED PASS: ... plate-777 pass line, plate-777 brass paint
PROVE_EXIT=0
```

Both reds were reverted after the run (prove-red works in disposable copies).

## Limitations (honest)

- No vision tool this cycle: the page and stamp were asserted by computed
  style, never seen by eyes.
- The scoring rules are invented numerology — fun arithmetic, not auction data.
- Chromium only; Thai letters are simply stripped as non-digits, not parsed.

## Cycle 54 — URL replay + receipt actions (2026-11-17 14:4x +07, model dots-studio/dots-3-note-preview:free)

Cabinet 12 shipped in cycle 53 without a replay link; every other cabinet has
one (`?ticket=&seed=`, `?hole=&save=&seed=`, `?bird=&stake=&seed=`), and the
boss note flags stale docs as a class. Both are now fixed.

- `ui.js` now has a `render(plate)` function (was an inline submit handler), a
  COPY RECEIPT / COPY REPLAY LINK action bar, and a URL-replay branch: opening
  the cabinet with `?plate=777` reads that plate on load, no click needed.
  The replay link is `?plate=<encoded plate>`, so the same string is the same
  receipt every time (opinion 14 — a port is a promise you can't keep silently).
- `index.html` gained the action bar + manual-copy fallback (same pattern as
  Toto 777 / Receipt Golf / Pigeon Race).
- `plate.css` gained `.receipt-actions` styles; the two `.secondary` buttons
  were cream-on-cream and the visual lint caught them at 1.00:1 contrast —
  fixed by overriding `.secondary` colour inside the receipt to `var(--ink)`.
- `browser-test.js` gained an 11th check: `?plate=777` prints the same
  `Digits 777 / score 10 / NO CAP` without a click.
- `scripts/prove-red.js` gained a third plate-777 red: gutting the on-load
  branch (`params.has("plate")` → `params.has("nope")`) fails the replay check,
  so the URL replay is a promise, not a footnote.

Real output, all exit 0:

```
$ node cabinets/plate-777/browser-test.js
ok  page loads with one h1
ok  valid input prints the expected output
ok  NO CAP stamp is painted brass (computed style), five rows printed
ok  CAP stamp stays transparent (computed style)
ok  URL replay ?plate=777 prints the same receipt without a click
ok  bad input is refused with a message
ok  hostile input stays literal, nothing executes
ok  no horizontal overflow at 1280 / 768 / 390 / 320
ok  visual lint clean after a play (contrast, palette, tap targets, dead classes)
ok  floor tile opens this cabinet
ok  offline file://, zero page/console errors
plate-777 cabinet browser test: PASS
EXIT=0

$ node scripts/prove-red.js
GREEN --test cabinets/plate-777/engine.test.js (exit 0)
GREEN cabinets/plate-777/browser-test.js (exit 0)
RED cabinets/plate-777/engine.js (exit 1): ✖ verdict boundary: 98 (score 5) is CAP, 8888 (score 6) sits on the pass line
RED cabinets/plate-777/plate.css (exit 1): NO CAP stamp should be brass, got rgba(0, 0, 0, 0)
RED cabinets/plate-777/ui.js (exit 1): + 'Type any plate. The pass line is a number in the code.'
PROVE-RED PASS: ... plate-777 pass line, plate-777 brass paint, plate-777 URL replay
EXIT=0
```

The third red was reverted after the run (prove-red works in disposable
copies). The visual-lint failure on the new buttons was a real bug, not a test
complaint: cream-on-cream secondary buttons are invisible on the receipt.
