/* Two Rooms Over — Cabinet 09. A bug hunt built out of my own mistakes.
 *
 * Every CARD is a symptom quoted VERBATIM from a real file in the HQ workspace
 * (STATE.md, ME.md, journal/*.md). The quote and the room are facts, not flavour:
 * tools/snapshot-quotes.js extracts the original line into corpus.md, and
 * engine.test.js fails if any quote fails to appear in it. Nothing here is invented.
 *
 *   const T = require('./engine.js');
 *   const cases = T.deck(777);            // 8 shuffled cases, same seed = same deck
 *   const v = T.judge("stamp-css", "css"); // { correct, card, answer }
 *   const s = T.score(777, [{ cardId, room }, ...]);  // { correct, total, stamp, rows, receipt }
 */
(function (root) {
  "use strict";

  // The five rooms a bug can live in. Fixed order.
  const ROOMS = [
    { id: "engine", label: "ENGINE", blurb: "the maths, the rules, the data" },
    { id: "dom", label: "DOM", blurb: "ui.js and the wiring" },
    { id: "css", label: "CSS", blurb: "the stylesheet and the paint" },
    { id: "markup", label: "MARKUP", blurb: "index.html: fields, forms, placement" },
    { id: "test", label: "TEST", blurb: "my own suite and audit tools" }
  ];

  const CARDS = [
    {
      id: "cli-paytable",
      title: "cli-paytable",
      quote: "The 777/77/7/1/0 table was in the standalone Python CLI, paying 410% RTP",
      source: "STATE.md",
      room: "engine",
      tell: "The page was telling the truth: ui.js already rendered from Slot.PAYTABLE. The money printer was two rooms over, in the CLI nobody opened, printing its own receipt from a second copy of the table. Two copies, no parity test."
    },
    {
      id: "stamp-css",
      title: "stamp-css",
      quote: "stamp classes never matched the CSS (`so-stamp-ok` in JS vs `.so-stamp.ok` in CSS) so the jackpot never turned brass",
      source: "STATE.md",
      room: "css",
      tell: "The words were right and the paint was wrong. ui.js wrote so-stamp-ok, the stylesheet only knew .so-stamp.ok, so the stamp stayed transparent and every test that read textContent said PASS. Assert the paint."
    },
    {
      id: "id-hash",
      title: "id-hash",
      quote: '`ui.js` used `$("#result")` — literal `#` passed to getElementById',
      source: "STATE.md",
      room: "dom",
      tell: "`$` was getElementById, so the literal `#` asked for an element named `#result`, got null, and the catch block ate it. Cabinet 04 had never printed a receipt in a browser and 22 Node tests could not see it."
    },
    {
      id: "form-parking",
      title: "form-parking",
      quote: "the DRAW button sat outside the `<form>` so clicking it never fired the submit handler",
      source: "STATE.md",
      room: "markup",
      tell: "A submit button parked in a div next to its form is decoration. Nothing wired it to the submit event, so the click fired nothing and the browser test sat waiting for a receipt that was never coming."
    },
    {
      id: "barcode",
      title: "barcode",
      quote: "solid black barcode (hashing rendered glyphs instead of bytes), 32 bars instead of 34",
      source: "STATE.md",
      room: "engine",
      tell: "I hashed the drawn glyphs instead of the bytes, so every bar came out identical, and sha256 hands you 32 bytes when I had asked for 34 bars. Both numbers came out of code and both were wrong in the same function."
    },
    {
      id: "prove-red",
      title: "prove-red",
      quote: 'my first version gutted one line of a three-line call, made a SyntaxError, and almost called that "red"',
      source: "ME.md",
      room: "test",
      tell: "A gutted line of a three-line call does not assert-fail, it fails to parse. My prove-it tool read the non-zero exit and called it a red. Red is the assertion failing, not the file refusing to compile. The auditor needed an auditor."
    },
    {
      id: "number-field",
      title: "number-field",
      quote: "`type=number` rejected Playwright's `fill()` with a hostile string",
      source: "STATE.md",
      room: "markup",
      tell: "A field typed as a number is a browser promise the engine cannot keep: the hostile string could not even be entered, so the test could not test it. type=text with inputmode=numeric says what is true, and the engine validates the string."
    },
    {
      id: "page-goto",
      title: "page-goto",
      quote: "hash-only `page.goto` on file:// does not reload, so the first determinism check compared a DOM to itself",
      source: "STATE.md",
      room: "test",
      tell: "Same document, new hash, no reload — so my replay check compared a page to itself and of course it matched. Every replay check now starts at about:blank. A green test on a page that never reloaded proves the page is a page."
    }
  ];

  // DECK 2. Same rule as deck 1: no invented bugs. Each quote is a verbatim substring of the
  // live file named in `source`; tools/snapshot-quotes.js proves it and engine.test.js re-checks.
  const CARDS2 = [
    {
      id: "xss-batch",
      title: "xss-batch",
      quote: "Receipt head interpolated `${drop.batch}` unescaped → `<img onerror>` batch code executed (XSS)",
      source: "STATE.md",
      room: "dom",
      tell: "Every other field went through esc() before it hit the receipt. The batch code did not, so an `<img onerror>` tag executed instead of printing. The fix is boring and it is the whole fix: one more escape on the last unescaped interpolation."
    },
    {
      id: "not-a-selector",
      title: "not-a-selector",
      quote: "`:contains()` isn't a real selector",
      source: "ME.md",
      room: "dom",
      tell: "I wrote a selector the browser has never heard of. `:contains()` is a jQuery idea, not a CSS one, so querySelector threw and the code under it never ran. Every DOM query in that file is now a loop or a real selector."
    },
    {
      id: "arrow-spread",
      title: "arrow-spread",
      quote: "`push(...wrap(...))` truncated every receipt until real output caught it",
      source: "ME.md",
      room: "engine",
      tell: "A one-parameter arrow has no `arguments` to spread, so every wrapped line got replaced by its first word. The receipt printed one word per row and every engine test was green. I only saw it by printing one. Real output is the oracle."
    },
    {
      id: "cli-args",
      title: "cli-args",
      quote: "printed a random seed because `len(args) > 1` should have been `if args`",
      source: "ME.md",
      room: "engine",
      tell: "Type the one argument you care about and `len(args) > 1` is false, so the CLI picks a random seed and prints a sheet nobody asked for. `if args` was the whole fix. The suite never ran the command, and the command was where the test was."
    },
    {
      id: "hover-beat",
      title: "hover-beat",
      quote: "The selected room lost its colour to the mouse.",
      source: "journal/39.md",
      room: "css",
      tell: "A class plus a pseudo-class carries two selectors of weight, so `:hover` painted over the selected state and the pointer erased your choice the instant it rested on the button — which is exactly when it rests on the button. `.tr-room.tr-room-on:hover` matches that weight. Assert the paint."
    },
    {
      id: "grid-min",
      title: "grid-min",
      quote: "`minmax(auto, 1fr)`, so it obeyed the 44-column `pre`'s min-content width and pushed both panels",
      source: "journal/39.md",
      room: "css",
      tell: "`1fr` is `minmax(auto, 1fr)`, and `auto` will not go smaller than its content — and the content was a 44-column `pre`. So one column shoved the page past the viewport by pixels. `minmax(0, 1fr)` under 720px lets the receipt scroll inside itself."
    },
    {
      id: "bare-query",
      title: "bare-query",
      quote: '`href="?seed=778"` broke `npm test`',
      source: "journal/39.md",
      room: "markup",
      tell: "`href=?seed=778` with no path points at the folder, not the page. The checker was right and I was wrong. `index.html?seed=778` names the file. A link is markup, and markup has rules."
    },
    {
      id: "polite-bot",
      title: "polite-bot",
      quote: "the counter test only exercised the polite bot, which pays before the broken math sinks below floor",
      source: "STATE.md",
      room: "test",
      tell: "I gutted the floor clamp and all 16 tests still passed: the only bot in the counter test paid before the broken maths ever ran. A red that never takes the path through the bug is decoration. The fix went in the test, not the engine."
    }
  ];

  const WRONG_LINES = [
    "Wrong room. The bug was two rooms over, same as always.",
    "That room was clean. It usually is. That is the problem.",
    "You checked where the note pointed. Notes point at symptoms.",
    "Close is a room next door, and the bug was in the other one.",
    "Green in there. The receipt you wanted was in the file behind you."
  ];
  const RIGHT_LINES = [
    "Right room. That one has a journal entry and a scar.",
    "Found it. Two rooms over, exactly where the note wasn't.",
    "Right. The stamp is yours; the lesson was already mine.",
    "Correct. That bug is in the family album now."
  ];

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = copy[i]; copy[i] = copy[j]; copy[j] = t;
    }
    return copy;
  }

  function checkSeed(seed) {
    if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
  }

  function roomById(id) {
    const room = ROOMS.find(r => r.id === id);
    if (!room) throw new Error("unknown room: " + id);
    return room;
  }

  // Two decks, eight cases each. Deck 1 keeps the name CARDS because every caller that existed
  // before the second deck means deck 1.
  const DECKS = { 1: CARDS, 2: CARDS2 };
  const ALL_CARDS = CARDS.concat(CARDS2);

  function checkDeck(deckNo) {
    if (!Object.prototype.hasOwnProperty.call(DECKS, String(deckNo))) throw new Error("unknown deck: " + deckNo);
    return Number(deckNo);
  }

  function cardsOf(deckNo) {
    return DECKS[checkDeck(deckNo)];
  }

  function cardById(id) {
    const card = ALL_CARDS.find(c => c.id === id);
    if (!card) throw new Error("unknown case: " + id);
    return card;
  }

  // Same seed, same deck. The floor's rule, kept here for a game about bugs.
  // deck(seed) and deck(seed, 1) are the same deck: deck 1 came first.
  function deck(seed, deckNo) {
    checkSeed(seed);
    const cards = cardsOf(deckNo === undefined ? 1 : deckNo);
    return shuffle(cards.map((c, i) => i), mulberry32(seed)).map(i => cards[i]);
  }

  function judge(cardId, roomId) {
    const card = cardById(cardId);
    const answer = roomById(roomId);
    return { correct: card.room === roomId, card, answer };
  }

  // Wrong/right flavour is seeded and positional: replaying a seed replays the story.
  function line(seed, index, correct) {
    checkSeed(seed);
    const rng = mulberry32((seed * 131 + index * 17 + 7) | 0);
    const pool = correct ? RIGHT_LINES : WRONG_LINES;
    return pool[Math.floor(rng() * pool.length)];
  }

  // NO CAP only if you missed at most one of eight. Real bugs are allowed to be brutal.
  function stampFor(correct, total) {
    if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0) throw new Error("score needs integers");
    if (correct < 0 || correct > total) throw new Error("score out of range");
    return correct >= total - 1 ? "NO CAP" : "CAP";
  }

  function wrap(text, width) {
    const words = String(text).split(/\s+/), lines = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (candidate.length > width && current) { lines.push(current); current = word; }
      else current = candidate;
    }
    if (current) lines.push(current);
    return lines;
  }

  function score(seed, answers, deckNo) {
    checkSeed(seed);
    if (!Array.isArray(answers)) throw new Error("answers must be an array");
    const number = checkDeck(deckNo === undefined ? 1 : deckNo);
    const order = deck(seed, number);
    const seen = new Map();
    for (const answer of answers) {
      if (!answer || typeof answer !== "object") throw new Error("each answer needs a cardId and a room");
      const card = cardById(answer.cardId);
      if (!ROOMS.some(r => r.id === answer.room)) throw new Error("unknown room: " + answer.room);
      if (seen.has(card.id)) throw new Error("answer given twice for " + card.id);
      seen.set(card.id, answer.room);
    }
    const rows = order.map((card, i) => {
      const given = seen.get(card.id);
      return {
        caseNo: i + 1,
        card,
        given: given || null,
        asked: given ? roomById(given).label : "—",
        right: roomById(card.room).label,
        correct: given ? given === card.room : false,
        answered: Boolean(given)
      };
    });
    const correct = rows.filter(r => r.correct).length;
    const total = order.length;
    const stamp = stampFor(correct, total);
    const W = 44, rule = "=".repeat(W), dash = "-".repeat(W);
    const lines = [rule, "TWO ROOMS OVER — CASE FILE CLOSED", "DECK " + number + "   SEED " + seed + "   CASES " + total + "   FOUND " + correct, dash];
    for (const row of rows) {
      const no = String(row.caseNo).padStart(2, "0");
      lines.push(no + "  " + (row.correct ? "RIGHT" : "WRONG") + "  " + row.card.title);
    }
    lines.push(dash);
    lines.push("MISSED:  " + (total - correct) + " of " + total);
    lines.push("STAMP:   " + stamp);
    lines.push(dash);
    const closer = correct === total
      ? "All eight. Every bug was in the room the note did not point at."
      : correct >= total - 1
        ? "One left on the bench. That is how the last one shipped."
        : "Every miss is a bug still sitting in a file you didn't open.";
    lines.push(...wrap(closer, W - 4));
    lines.push(rule);
    return { seed, correct, total, missed: total - correct, stamp, rows, receipt: lines.join("\n") };
  }

  const api = { ROOMS, CARDS, CARDS2, DECKS, ALL_CARDS, WRONG_LINES, RIGHT_LINES, mulberry32, shuffle, deck, judge, line, stampFor, wrap, score };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TwoRoomsCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
