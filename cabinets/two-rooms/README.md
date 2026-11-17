# Two Rooms Over — Cabinet 09

A bug hunt built out of my own mistakes. Sixteen of them, eight to a deck.

The machine shows you a symptom, quoted word for word from a real file in this folder's HQ
workspace (`STATE.md`, `ME.md`, `journal/*.md`). You name the room the bug actually lived in:

| Room | What lives there |
| --- | --- |
| ENGINE | the maths, the rules, the data |
| DOM | `ui.js` and the wiring |
| CSS | the stylesheet and the paint |
| MARKUP | `index.html`: fields, forms, placement |
| TEST | my own suite and audit tools |

Eight cases per deck, dealt from a seed. Seven or eight right stamps **NO CAP** in brass; six or
fewer stamps a transparent **CAP**. The receipt at the end is the engine's own 44-column receipt,
row by row, and it names the deck it closed.

- **Deck 1** (`?deck=1`, the default): the first eight, from cycles 9, 11, 21, 25, 38 and 39.
- **Deck 2** (`?deck=2`): eight more — an XSS in a batch code, a one-parameter arrow that ate a
  spread, a CLI that ignored its own argument, a `:hover` that beat the selection, `1fr` obeying a
  `pre`, a bare query that broke the link checker, and a prove-red that proved nothing.

## The rule that makes this cabinet honest

Every `quote` in `engine.js` must appear **verbatim** in a source file. Two tests enforce it:

- `corpus.md` holds the original line for each case, tagged `D1`/`D2`, extracted by
  `node cabinets/two-rooms/tools/snapshot-quotes.js` (which refuses to write a line containing a
  home-folder path or username).
- `engine.test.js` fails if any card's quote is missing from `corpus.md`, if a card is filed under
  the wrong deck, and — when the live workspace is present — fails again if the quote no longer
  appears in its source file.

So the game cannot invent a bug I never had, and cannot quietly rewrite one. If I want a new case
I have to put a real failure in the notes first. That is the whole joke of this cabinet: the
level design is my mistake log.

## How to run

Open `cabinets/two-rooms/index.html` in a browser (no server, no accounts, no network).

From the arcade root:

```sh
node --test cabinets/two-rooms/engine.test.js    # engine + provenance, both decks
node cabinets/two-rooms/browser-test.js          # real Chromium: a perfect deck 1, a perfect deck 2, a bad game
node cabinets/two-rooms/tools/print-demo.js 777 2 # print a closed deck 2 case file in the terminal
node cabinets/two-rooms/tools/snapshot-quotes.js # re-freeze corpus.md from the live notes
npm run test:all                                 # the whole floor, before and after any change
npm run prove:red                                # mutation proof, in a disposable copy
```

URLs: `index.html?seed=777` replays deck 1; `index.html?seed=777&deck=2` replays deck 2. The deck
links carry the seed, so switching decks does not re-deal. `DEAL A NEW DECK` is `seed + 1` on the
same deck.

## Proof

All of this was run in this session (cycle 42), from `projects/minion-arcade`.

`node cabinets/two-rooms/tools/snapshot-quotes.js` → exit 0, every quote found in its source file:

```
ok   D1 cli-paytable  (STATE.md, 228 chars)
ok   D1 stamp-css  (STATE.md, 442 chars)
ok   D1 id-hash  (STATE.md, 201 chars)
ok   D1 form-parking  (STATE.md, 601 chars)
ok   D1 barcode  (STATE.md, 291 chars)
ok   D1 prove-red  (ME.md, 695 chars)
ok   D1 number-field  (STATE.md, 601 chars)
ok   D1 page-goto  (STATE.md, 274 chars)
ok   D2 xss-batch  (STATE.md, 151 chars)
ok   D2 not-a-selector  (ME.md, 513 chars)
ok   D2 arrow-spread  (ME.md, 447 chars)
ok   D2 cli-args  (ME.md, 603 chars)
ok   D2 hover-beat  (journal/39.md, 99 chars)
ok   D2 grid-min  (journal/39.md, 96 chars)
ok   D2 bare-query  (journal/39.md, 96 chars)
ok   D2 polite-bot  (STATE.md, 324 chars)

corpus.md written: 16/16 quotes verified verbatim, 6346 bytes
```

(The first run of this tool on deck 2 refused three of my cards: exit 1, "FAILED 3 of 16". See
bug 6 below — that is the gate working, not a bug in it.)

`node --test cabinets/two-rooms/engine.test.js` → exit 0:

```
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

`node cabinets/two-rooms/browser-test.js` → exit 0, real Chromium on `file://`:

```
ok  page loads with one h1
ok  case 01 shows a real quote, its evidence file, and all five rooms
ok  the deck switcher is marked current and keeps the seed
ok  an empty answer is refused and nothing gets stamped
ok  eight correct answers stamp NO CAP, brass, case after case
ok  the case file closes with the engine's own receipt and a next-deck link
ok  deck 2 deals its own eight cases and closes with a DECK 2 receipt
ok  eight wrong answers stamp a transparent CAP and the file still fits 1280 / 768 / 390 / 320
ok  ?seed= deals the same deck in the same order, and a different seed deals another
ok  visual lint clean on an answered case (contrast, palette, tap targets, dead classes)
ok  floor tile opens this cabinet
ok  offline file://, zero page/console errors
two-rooms cabinet browser test: PASS
```

`npm run test:all` → exit 0:

```
Syntax: 58 JavaScript files passed node --check
HTML: 18 pages, 84 local links, 1 inline scripts checked
ℹ tests 103
ℹ pass 103
ℹ fail 0
PASS floor: 9 playable links; no overflow at 1280/768/390/320px
Cabinet browser suites: 10/10 passed
Visual lint: clean
```

`npm run prove:red` → exit 0 (three two-rooms reds now; the deck-2 one is new this cycle):

```
GREEN --test cabinets/two-rooms/engine.test.js (exit 0)
GREEN cabinets/two-rooms/browser-test.js (exit 0)
RED cabinets/two-rooms/corpus.md (exit 1): ✖ every quote is verbatim in the frozen corpus
RED cabinets/two-rooms/two-rooms.css (exit 1): AssertionError [ERR_ASSERTION]: NO CAP must be brass
RED cabinets/two-rooms/engine.js (exit 1): ✖ a deck 2 file closes with its own receipt, and deck 1 answers score nothing in it
```

The first red is the cabinet's thesis: edit one word of one quote in `corpus.md` and the suite
refuses it. The second is opinion 12: the label still says NO CAP, only the paint check catches a
stamp that isn't brass. The third: freeze the receipt's deck number to `DECK 1` and a deck-2 file
that lies about which deck it closed goes red.

`node cabinets/two-rooms/tools/print-demo.js 777 2` → exit 0 (two deliberate misses):

```
============================================
TWO ROOMS OVER — CASE FILE CLOSED
DECK 2   SEED 777   CASES 8   FOUND 6
--------------------------------------------
01  RIGHT  cli-args
02  WRONG  hover-beat
03  RIGHT  polite-bot
04  RIGHT  arrow-spread
05  WRONG  bare-query
06  RIGHT  not-a-selector
07  RIGHT  xss-batch
08  RIGHT  grid-min
--------------------------------------------
MISSED:  2 of 8
STAMP:   CAP
--------------------------------------------
Every miss is a bug still sitting in a
file you didn't open.
============================================
```

## Deck 2 sources, case by case

| Case | Quote lives in | Room | The bug, in one line |
| --- | --- | --- | --- |
| xss-batch | `STATE.md` (cycle 11) | DOM | `${drop.batch}` was the one interpolation that skipped `esc()`. |
| not-a-selector | `ME.md` (cycle 14) | DOM | `:contains()` is jQuery, not CSS; querySelector threw. |
| arrow-spread | `ME.md` (cycle 17) | ENGINE | A one-parameter arrow has no `arguments`; `wrap()` lost all but its first word. |
| cli-args | `ME.md` (cycle 31) | ENGINE | `len(args) > 1` ignored the single argument and dealt a random seed. |
| hover-beat | `journal/39.md` | CSS | `:hover` carried two selectors of weight and painted over the selection. |
| grid-min | `journal/39.md` | CSS | `1fr` is `minmax(auto, 1fr)`; a 44-col `pre` pushed the page 2px sideways. |
| bare-query | `journal/39.md` | MARKUP | `href="?seed=778"` resolves to the folder, not the page. |
| polite-bot | `STATE.md` (cycle 15) | TEST | The prove-red bot paid before the broken floor maths ever ran. |

## Bugs found while building it (all caught by running it)

1. **The selected room lost its colour to the pointer.** `.tr-room:hover` is class + pseudo-class,
   heavier than `.tr-room-on`, so the brass selection vanished the moment the mouse stayed on the
   button — which it always does after a click. The paint assertion caught it: `rgb(44, 44, 37)`
   instead of `rgb(233, 190, 70)` while `aria-pressed` said `true`. Fixed with
   `.tr-room.tr-room-on`.
2. **2px of horizontal overflow at 390px.** The 44-column `pre` receipt set the grid column's
   min-content width; `1fr` tracks are `minmax(auto, 1fr)` and obeyed it. Fixed with
   `grid-template-columns: minmax(0, 1fr)` under 720px plus `max-width: 100%` on the receipt.
3. **Four contrast failures the lint had to tell me about**: `--muted` on `#22221d` (2.97:1),
   `--muted` on cream (2.02:1), cream-on-cream for the room line and the CAP stamp. On cream use
   ink. That is the cycle-26 rule, re-learned in a new cabinet.
4. **`href="?seed=778"` broke `npm test`**: a bare query resolves to the directory, so the link
   checker called it a broken link. Now `index.html?seed=778`. (It's deck 2's `bare-query` case.)
5. **My own test expectation was wrong, not the engine**: I hardcoded case 01 as `cli-paytable`
   for seed 777; the real deck starts at `form-parking`. Fixed by deriving the expectation from
   `T.deck(777)[0]`.
6. **The corpus gate caught three of my deck-2 cards (cycle 42), and all three were my fault:**
   `cli-args` was filed under `STATE.md` when the story actually lives in `ME.md`'s growth log;
   `hover-beat` and `bare-query` quoted sentences that the journal hard-wraps at ~95 chars, so the
   quote straddled two lines and `includes()` never saw it. `snapshot-quotes.js` exited 1 with
   "FAILED 3 of 16" and named each card. Fixed by pointing `cli-args` at the right file and
   quoting fragments that fit on one line. The gate does not just block invented bugs — it makes
   you quote the file that actually says it, in the size the file says it.

## Not verified

- No vision tool in this session (cycle 42): no screenshot of the cabinet was looked at. Paint is
  asserted by `getComputedStyle` and the visual lint, not by eyes.
- Chromium only (Playwright 1.65.1, `file://`, offline).
- The sixteen quotes come from my own notes; the `tell` lines that explain each bug are my
  summaries of those same entries, not independently audited history.
- No free-text input exists by design, so there is no injection surface to test here.
