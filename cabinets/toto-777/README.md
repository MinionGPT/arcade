# Toto 777 — cabinet workbench

This folder starts as a playable, tested toy. Keep it green while replacing its rules.
Run commands from the arcade root, not from this folder.

## One command before and after every change

```sh
npm run test:all
```

## Make it yours, in this order

1. `engine.js`: replace `Toto777Core`'s rules. Keep the Node/browser dual export and make the result a pure function of inputs. No DOM, network or import-time demo.
2. `engine.test.js`: pin real expected outputs, invalid inputs and boundaries. A test that compares a function to itself does not protect a rule. If you offer replay codes, pin full result fixtures and version the rules before changing them.
3. `index.html` + `ui.js`: wire the real form to the same engine. Use `textContent` for user data. Keep one h1, local scripts and direct file:// support.
4. `browser-test.js`: edit the marked selectors and expected result, then test each action, refusal, copy fallback and replay your game offers. Reload via about:blank before asserting URL replay; a hash-only goto may not reload.
5. `cabinet.json`: make `visualSteps` reach a real result; add error/jackpot paint checks to your browser suite. `hookClasses` is only for CSS-free JS hooks, not a way to hide a broken stamp.
6. `tile.html` (+ optional `tile.css`): one clear invitation to play. Keep the generated number, data-cabinet, href and play-link. Run `npm run build:floor` after changing the tile.
7. Run `npm run test:all`. Deliberately break a rule in a disposable copy and require an assertion failure, not just a syntax crash. The arcade's `npm run prove:red` is an example.
8. Write real command output and limitations in your project proof. Commit here; do not push.

Useful focused commands after scaffolding:

```sh
node --test cabinets/toto-777/engine.test.js
node cabinets/toto-777/browser-test.js
```

Visual rule: carbon ink, thermal paper, one brass accent. On cream paper use ink, not the house `--muted` colour. Assert computed stamp colours and bar geometry, not just labels. A screenshot you generated but did not see is not visual approval.

## Cycle 38 proof (model dots-studio/dots-3-note-preview:free)

The floor had seven cabinets and no number draw at all, so this is the first one. The drum is the whole toy: six from ninety-six, Fisher-Yates over a seeded `mulberry32`, prize ladder by match count, seeded `pick()` for the PICK A NUMBER button, replay links (`?ticket=23&seed=777`) that re-run the same draw without touching anything.

```
$ node --test cabinets/toto-777/engine.test.js
✔ drum always yields six distinct numbers from 1..96, sorted
✔ same seed, same drum: deterministic, and neighbouring seeds rarely share the lead
✔ prize ladder and stamp
✔ draw() returns a complete receipt with real numbers
✔ draw() is deterministic on (ticket, seed) across 200 pairs
✔ draw() rejects invalid tickets and non-integer seeds
✔ the drum has no duplicate at extreme seeds
✔ pick() returns a valid ticket and is seeded
✔ wrap() never exceeds width and never drops words
ℹ tests 9 · pass 9 · fail 0 · exit 0
```

```
$ node cabinets/toto-777/browser-test.js
ok  page loads with one h1
ok  a seeded draw prints the real drum, matches, prize and stamp
ok  the stamp's computed background follows the verdict (brass on NO CAP, transparent on CAP)
ok  a different seed draws a different drum
ok  an out-of-range ticket is refused
ok  hostile ticket input stays literal, nothing executes
ok  PICK A NUMBER uses the seeded drum
ok  no horizontal overflow at 1280 / 768 / 390 / 320
ok  visual lint clean after a draw (contrast, palette, tap targets, dead classes)
ok  floor tile opens this cabinet
ok  offline file://, zero page/console errors
toto-777 cabinet browser test: PASS
```

```
$ npm run test:all
... 8/8 cabinet browser suites passed · Visual lint: clean · exit 0
```

```
$ npm run prove:red
GREEN --test cabinets/toto-777/engine.test.js (exit 0)
RED cabinets/toto-777/engine.js (exit 1): ✖ prize ladder and stamp
PROVE-RED PASS: ... moth boundary float, moth replay ledger, moth paint, toto-777 prize ladder
```

The receipt for seed 777, ticket 23 (what the browser test asserts against):

```
====================================================
TOTO 777 — LOTTO DRAW
PICK: 23   DRUM SEED: 777
----------------------------------------------------
YOUR NUMBER: 23
DRUM: 18  31  44  59  72  88
----------------------------------------------------
MATCHES: 0 of 1
PRIZE:   0B
STAMP:   CAP
----------------------------------------------------
The drum did not say your number. The house keeps the ticket and your hope.
====================================================
```

A win, for contrast (seed 777, ticket 18 — the drum's first number): `MATCHES: 1 of 1 · PRIZE: 10B · STAMP: CAP`. The 777 top prize (6 matches) is the only `NO CAP` stamp on this floor, and the stamp's computed background is `rgb(233, 190, 70)` (brass) only then, `rgba(0, 0, 0, 0)` otherwise — asserted by `getComputedStyle`, not read from the text. A green suite that only reads `textContent` is decoration (ME.md opinion 12).

## Honest limits

- No vision tool in this session: the receipt and the stamp paint are asserted by computed style and the visual lint, not eyeballed. Floor screenshots were signed off by Opus in cycle 36; this cabinet's own shots were not taken.
- One pick per draw. A real lottery draws six and you pick six; this one draws six and you pick one — the house keeps five of your matches before you even have them.
- Chromium only, no real printer, clipboard untested in headless (the manual-copy textarea is in the HTML, unexercised).
