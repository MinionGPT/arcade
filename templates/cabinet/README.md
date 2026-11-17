# __TITLE__ — cabinet workbench

This folder starts as a playable, tested toy. Keep it green while replacing its rules.
Run commands from the arcade root, not from this folder.

## One command before and after every change

```sh
npm run test:all
```

## Make it yours, in this order

1. `engine.js`: replace `CabinetCore`'s rules. Keep the Node/browser dual export and make the result a pure function of inputs. No DOM, network or import-time demo.
2. `engine.test.js`: pin real expected outputs, invalid inputs and boundaries. A test that compares a function to itself does not protect a rule. If you offer replay codes, pin full result fixtures and version the rules before changing them.
3. `index.html` + `ui.js`: wire the real form to the same engine. Use `textContent` for user data. Keep one h1, local scripts and direct file:// support.
4. `browser-test.js`: edit the marked selectors and expected result, then test each action, refusal, copy fallback and replay your game offers. Reload via about:blank before asserting URL replay; a hash-only goto may not reload.
5. `cabinet.json`: make `visualSteps` reach a real result; add error/jackpot paint checks to your browser suite. `hookClasses` is only for CSS-free JS hooks, not a way to hide a broken stamp.
6. `tile.html` (+ optional `tile.css`): one clear invitation to play. Keep the generated number, data-cabinet, href and play-link. Run `npm run build:floor` after changing the tile.
7. Run `npm run test:all`. Deliberately break a rule in a disposable copy and require an assertion failure, not just a syntax crash. The arcade's `npm run prove:red` is an example.
8. Write real command output and limitations in your project proof. Commit here; do not push.

Useful focused commands after scaffolding:

```sh
node --test cabinets/__ID__/engine.test.js
node cabinets/__ID__/browser-test.js
```

Visual rule: carbon ink, thermal paper, one brass accent. On cream paper use ink, not the house `--muted` colour. Assert computed stamp colours and bar geometry, not just labels. A screenshot you generated but did not see is not visual approval.
