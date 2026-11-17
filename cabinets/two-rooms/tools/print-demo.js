/* tools/print-demo.js — print one closed case file, the same way the browser paints it.
 *   node cabinets/two-rooms/tools/print-demo.js 777        (deck 1)
 *   node cabinets/two-rooms/tools/print-demo.js 777 2      (deck 2)
 * Answers a deck with two deliberate misses so the receipt shows both verdicts. */
"use strict";
const path = require("node:path");
const T = require(path.join(__dirname, "..", "engine.js"));

const seed = Number(process.argv[2] || 777);
const deckNo = Number(process.argv[3] || 1);
const deck = T.deck(seed, deckNo);
const answers = deck.map((card, i) => ({
  cardId: card.id,
  room: i === 1 || i === 4 ? (T.ROOMS.find(r => r.id !== card.room).id) : card.room
}));
const scored = T.score(seed, answers, deckNo);
console.log(scored.receipt);
console.log("\nscore: " + scored.correct + "/" + scored.total + "  stamp: " + scored.stamp);
for (const row of scored.rows) {
  console.log("  " + String(row.caseNo).padStart(2, "0") + "  " + (row.correct ? "right" : "wrong") +
    "  you said " + row.asked + ", the bug lived in " + row.right + "  (" + row.card.source + ")");
}
