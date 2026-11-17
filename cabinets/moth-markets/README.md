# MOTH MARKETS — Cabinet 13

A panic-trading bot run by the Lucky Moth. Thirty days of seeded tape, one
strategy: **the moth's mood**. Every number on the statement — prices, fills,
fees, return, drawdown, the mood counts — is computed by `engine.js`. Nothing on
this page is a typed-in number (opinion 3 and opinion 20).

No real money, no exchange, no network. It is a fictional market with a
fictional 0.5% fee, and the receipt says so.

## The rules (they are constants in `engine.js`)

| State | Rule | Action |
| --- | --- | --- |
| Day 1 | always | all-in (fomo) — the bot always buys the top, that is the joke |
| calm | 3-day change ≥ 0 | hold |
| sweats | −5% > change > −15% | buy with half the cash |
| panics | change ≤ −5% | sell everything |
| dead | change ≤ −15% | sell, then sits in the corner for the rest of the month |

Checks run in that order, so a day that is both "dead" and "panics" is dead:
the first check that fires is the state the statement prints (opinion 21 in the
engine as well as in the refusals).

Fee **0.5% of trade value** (`FEE`), charged on every trade. Stamp **NO CAP**
(brass) only when the end net beats the 1000.00 start bankroll; ties go to the
house. The stamp colour is asserted by `getComputedStyle`, not by reading the
label (opinion 12).

## How to run

Play: open `index.html` from the arcade floor (`../../index.html`, tile 13).
Type a batch code (digits, up to 12). `?seed=8` replays the same statement with
no click. COPY STATEMENT prints the 44-column thermal statement, not just the
screen.

```sh
node --test cabinets/moth-markets/engine.test.js     # 11 unit tests
node cabinets/moth-markets/browser-test.js           # 13 checks in real Chromium
node cabinets/moth-markets/demo.js 777               # the 44-col statement
node cabinets/moth-markets/house-edge.js 3000        # measured house edge, not a slogan
```

## Proof (real output, 2026-11-17, cycle 58)

```
$ node --test cabinets/moth-markets/engine.test.js
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

```
$ node cabinets/moth-markets/browser-test.js
ok  page loads with one h1
ok  statement totals match the engine for batch 1 (END NET 905.71 / RETURN -9.43% / FEES 20.00)
ok  30 statement rows + header, titled with the batch code
ok  CAP paints transparent (rgba(0, 0, 0, 0)) — label and paint agree
ok  NO CAP paints brass (rgb(233, 190, 70)) for batch 8
ok  empty batch code refused with the batch-code message
ok  letters refused with the digits-only message (digits checked before length)
ok  hostile input stays literal, nothing executes
ok  ?seed= replay prints the statement on load
ok  no horizontal overflow at 1280 / 768 / 390 / 320
ok  visual lint clean after a play (contrast, palette, tap targets, dead classes)
ok  floor tile opens this cabinet
ok  offline file://, zero page/console errors
WIN seed 8 / LOSE seed 1
moth-markets cabinet browser test: PASS
```

```
$ node cabinets/moth-markets/house-edge.js 3000
MOTH MARKETS HOUSE EDGE / batch codes 1..3000
NO CAP (bot beats 1000.00): 376 (12.53%)
CAP (house keeps it):       2624 (87.47%)
AVG RETURN: -10.54% per statement
AVG FEES:   26.46 baht per statement
AVG TRADES: 11.64 per statement
STATEMENTS WHERE THE MOTH DIED: 99 (3.30%)
```

One statement, batch 777 (head and tail; the full sheet is 30 day rows):

```
MOTH MARKETS / BATCH 777
START 1000.00  FEE 0.5%  STRATEGY: MOOD
--------------------------------------------
DAY  PRICE   ACTION     NET
D01  104.33  FOMO        995.31
...
D25   72.83  SELL-ALL    720.46
...
D30   70.88  BUY-HALF    713.13
--------------------------------------------
END NET 713.13  RETURN -28.69%
FEES 34.62  TRADES 19  MAX DD -28.84%
MOODS calm 6 sweats 14 panics 10 dead 0
STAMP: CAP
```

Arcade-wide (after this cabinet): `npm test` → **145 unit tests** pass,
`npm run test:all` → 13 tiles / 13 cabinets / **14/14 browser suites** / visual
lint clean (`EXIT=0`), `npm run prove:red` → **exit 0, 19 reds** including
`moth-markets fee`, `moth-markets verdict`, `moth-markets stamp paint`.

## What broke while building it (real bugs, caught by running it)

1. The roast overflowed the 44-column paper (72 chars on the first statement). Fixed with word-wrap at 40 and a width assertion in the unit suite — a receipt that overflows is not a receipt.
2. The statement grid overflowed at 320px (336 vs 320): the action column's min-content width pushed the receipt out. Fixed with `minmax(0, 1fr)` + a narrower grid under 460px.
3. My own `mm-mood-` + mood prefix was a dead class (visual lint: no stylesheet defines it). Replaced with four named classes; a dead day now prints struck through.
4. The fine print was ink on ink (1.00:1, invisible) because I copied `--ink` onto the dark machine panel. Fixed to `--muted`.
5. My prove-red marker named the assertion I *hoped* would fire (`d1 net`); with `FEE = 0` the fee-line assertion fires first. Fixed the marker, not the gate (opinion 22 again).
6. The verdict mutation made the browser suite crash looking for a CAP seed — a crash is not a red. Moved that mutation to the unit test that actually asserts the verdict is a comparison.

## Limits (honest)

- **No vision tool this session.** The statement, the stamp and the floor tile were asserted by `getComputedStyle` and the visual lint, never looked at by eyes.
- Chromium only. No print check; the clipboard fallback exists but was not exercised in headless.
- The market is fictional: the price walk, the 0.5% fee and the mood thresholds are invented rules, printed on the page as rules, not passed off as market data. No expected-return claim beyond what `house-edge.js` measures over the seed range you run.
- A seed grid is not every seed: the house edge above is measured over batch codes 1..3000.
