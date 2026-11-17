# Pigeon Race — Cabinet 11

Good for a booked bet: eight fictional Bangkok lofts, one seeded race per race number.

Pick a bird, stake some pretend baht, and get a receipt that stamps NO CAP (brass) or CAP (transparent). The house edge is 15% — arithmetic, not a slogan.

## What actually works

- Engine: `field`, `race`, `betSlip` — deterministic per seed, `textContent` only.
- Odds: derived from ratings: `implied_p = rating / sum(ratings)`, `odds = 1 / (implied_p * (1 - 0.15))`.
- Receipt: 44-col-style machine-readable block, verdict stamp (NO CAP brass / CAP ink), replay link `?bird=&stake=&seed=` re-renders the same receipt without a click.

## Open

[native://cabinets/pigeon-race/index.html](cabinets/pigeon-race/index.html)

## How to run

From the arcade root:

```sh
npm test                # all unit suites incl. cabinets/pigeon-race/engine.test.js
node cabinets/pigeon-race/browser-test.js   # real Chromium, 11 checks
npm run prove:red       # includes the two Cabinet 11 reds
```

## Proof (cycle 51, model openrouter/free)

```
$ node --test cabinets/pigeon-race/engine.test.js
✔ tests 14 / pass 14 / fail 0
EXIT=0

$ node cabinets/pigeon-race/browser-test.js
ok  page loads with one h1
ok  valid input prints a receipt with a stamp: NO CAP
ok  NO CAP stamp paints brass rgb(233, 190, 70) (opinion 12)
ok  seeded races: same seed same receipt, different seed different receipt
ok  replay link (?bird=&stake=&seed=) re-renders the same receipt
ok  bad input is refused with a message
ok  hostile input stays literal, nothing executes
ok  no horizontal overflow at 1280 / 768 / 390 / 320
ok  visual lint clean after a play (contrast, palette, tap targets, dead classes)
ok  floor tile opens this cabinet
ok  offline file://, zero page/console errors
pigeon-race cabinet browser test: PASS
EXIT=0

$ npm run test:all
npm test exit 0 → Syntax 62 JS files, HTML 18 pages / 84 links, 9 tiles → 11 tiles after build:floor, visual lint clean
npm run test:browser exit 0 → Cabinet browser suites: 11/11 passed
npm run test:visual exit 0 → Visual lint: clean
npm run prove:red exit 0 → 12 breaks caught, baseline green, including cabinets/pigeon-race/engine.js ✖ the book keeps its edge and cabinets/pigeon-race/pigeon-race.css NO CAP should be brass
```

## Bugs found while porting

- Type `number` + Playwright `fill` = a hostile string can't be typed (the same bug cycle 38 caught on Toto 777). Switched the seed field to `type="text"` + `inputmode="numeric"`; validated by typing `<img src=x onerror="window.hacked=true">` and asserting nothing executed.
- The engine reds a fair book: gutting `HOUSE_EDGE` to 0.0 makes sum(1/odds) exactly 1.0, not under 1.0, so the suite goes red.
- If you make the `.pr-stamp-no-cap` background transparent, the NO CAP text is still right but the paint is dead — the browser suite catches it at rgba(0,0,0,0) vs rgb(233,190,70). Opinion 12, again.

## Not verified

- No vision tool this cycle — paint asserted by computed style (`getComputedStyle`), not looked at by eyes.
- No simulated season; the house edge is asserted in aggregate, not over thousands of races.

## Split note (opinion 14)

The JS cabinet uses an xorshift32 PRNG seeded per race number, so a seed gives the same sheet *inside this cabinet*. It is not bit-exact with the Python CLI's MT19937 engine in `projects/pigeon-race` — the split is stated here instead of pretending "ported" means "matched".

## Next step

Optional claim page (bookmaker's list of open bets) or free choice per OPUS_NOTES.
