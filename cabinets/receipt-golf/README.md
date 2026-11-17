# Receipt Golf — Cabinet 10

The CLI toy (`projects/receipt-golf`) put on the floor. Nine fictional batches,
one clean save each. Par keeps the batch clean: 15% of ask. Eagle 30%, birdie
20%, bogey under the clean line, walk under the floor (+2). NO CAP iff the save
is at or over the clean line — and the stamp actually paints brass for it.

## How to run (from the arcade root)

    node --test cabinets/receipt-golf/engine.test.js
    node cabinets/receipt-golf/browser-test.js
    npm run test:all        # before AND after every change
    npm run prove:red       # includes this cabinet's two reds

## What is mirrored and what is not

The verdict rules are mirrored by hand from the Python original:
`verdictFor`/`stampFor` are pure functions of (hole, save), so a save of 135 on
hole 1 is PAR + NO CAP on both sides by construction (every hole's floor sits
under its clean line — guarded by a test in both repos). The roast draw is
NOT mirrored: the Python CLI uses `random.Random(seed)` and the cabinet uses a
hash pick (FNV-1a over batch:save:seed). Same seed + same offer always reprint
the same roast in the cabinet, but that roast can differ from the Python CLI's.
That is the cycle-33 grow-sheet lesson again: say the split on the paper
instead of claiming "engine ported".

## Proof (real output, arcade root, exit 0)

    $ node --test cabinets/receipt-golf/engine.test.js
    (tests run: 8, pass: 8, fail: 0, cancelled: 0, skipped: 0, todo: 0)
    ℹ fail 0
    EXIT=0

    $ node cabinets/receipt-golf/browser-test.js
    ok  page loads with one h1
    ok  valid input prints the expected output
    ok  bad input is refused with a message
    ok  hostile input stays literal, nothing executes
    ok  NO CAP stamp paints brass: rgb(233, 190, 70) / text rgb(16, 16, 14)
    ok  URL replay?hole=5&save=30&seed=777 prints PAR * NO CAP without a click
    ok  no horizontal overflow at 1280 / 768 / 390 / 320
    ok  visual lint clean after a play (contrast, palette, tap targets, dead classes)
    ok  floor tile opens this cabinet
    ok  offline file://, zero page/console errors
    receipt-golf cabinet browser test: PASS
    EXIT=0

    $ npm run test:all          # floor grew to 10 cabinets
    Syntax: 62 JavaScript files passed node --check
    Cabinets: 10 with manifest, tile, unit tests and browser test
    Visual lint: clean
    EXIT=0

    $ npm run prove:red         # two new reds for this cabinet
    RED cabinets/receipt-golf/engine.js (exit 1): ✖ save exactly at the clean line is par and gets NO CAP (boundary)
    RED cabinets/receipt-golf/receipt-golf.css (exit 1): AssertionError [ERR_ASSERTION]: NO CAP stamp must be painted, not transparent
    PROVE-RED PASS: ... receipt-golf clean line, receipt-golf brass paint
    EXIT=0

## Honest limits

- No vision tool in this session: the page, tile and receipts were never seen
  by eyes; paint is asserted by `getComputedStyle` and the visual lint only
  (the standing limitation of every cabinet before this one).
- Parity is machine-run since cycle 55: from `projects/receipt-golf`,
  `python3 tools/parity.py` diffs this engine against the Python original over
  378 saves (every edge from both sides by 0.01, plus a 24-step sweep of the
  ask), the whole hole table including each roast pool, and the clean line per
  hole. Last run: 0 mismatches, `STAMP NO CAP`. `python3 tools/parity-red.py`
  breaks five things and requires each red to name the field it broke.
  Still not compared: the roast *draw* (below), and only the tested grid — a
  divergence on an untested cent is Unknown.
- Chromium only. No entry list persisted: the cabinet holds no state.
