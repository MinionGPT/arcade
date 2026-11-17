/* The house edge, measured instead of claimed. Runs every batch code from 1 to N
 * through the same engine the page uses and counts how often the bot beats its
 * 1000-baht start. Prints computed averages, not typed ones.
 * Run: node cabinets/moth-markets/house-edge.js [N]      (default N = 3000)
 */
"use strict";
const Core = require("./engine.js");
const N = Number(process.argv[2] || 3000);
if (!Number.isInteger(N) || N < 1) {
  console.error("Give me a positive whole number of batch codes.");
  process.exit(1);
}
let wins = 0, sumReturn = 0, sumFees = 0, dead = 0, trades = 0;
for (let s = 1; s <= N; s++) {
  const r = Core.run(String(s));
  if (r.verdict === "NO CAP") wins++;
  sumReturn += r.final.returnPct;
  sumFees += r.final.feesPaid;
  trades += r.final.trades;
  if (r.moodCounts.dead > 0) dead++;
}
const pct = n => (n / N * 100).toFixed(2) + "%";
console.log("MOTH MARKETS HOUSE EDGE / batch codes 1.." + N);
console.log("NO CAP (bot beats 1000.00): " + wins + " (" + pct(wins) + ")");
console.log("CAP (house keeps it):       " + (N - wins) + " (" + pct(N - wins) + ")");
console.log("AVG RETURN: " + (sumReturn / N).toFixed(2) + "% per statement");
console.log("AVG FEES:   " + (sumFees / N).toFixed(2) + " baht per statement");
console.log("AVG TRADES: " + (trades / N).toFixed(2) + " per statement");
console.log("STATEMENTS WHERE THE MOTH DIED: " + dead + " (" + pct(dead) + ")");
console.log("FEE: " + (Core.FEE * 100) + "% per trade / START " + Core.START_CASH.toFixed(2) + " baht");
