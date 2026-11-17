/* Toto 777 — Cabinet 08. Seeded Thai-style lottery draw.
 * Pure function. Same ruleset in Node and the browser; same seed, same draw.
 *   const T = require('./engine.js');
 *   const r = T.draw(T.pick(777), 777);   // { ticket, drawn, matches, prize, stamp, receipt }
 * Drum: 6 from 96. Prize ladder by match count. Stamp NO CAP only on the top prize. */
(function (root) {
  "use strict";
  const DRUM = 96, PICK = 6;
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Draw PICK distinct numbers from 1..DRUM, seeded. Fisher-Yates over an array.
  function drawNumbers(seed) {
    const rng = mulberry32(seed);
    const pool = [];
    for (let i = 1; i <= DRUM; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, PICK).sort((a, b) => a - b);
  }
  // Prize ladder. Numbers are code, never from my head.
  function prizeFor(matches) {
    if (matches >= 6) return 777;
    if (matches === 5) return 500;
    if (matches === 4) return 50;
    if (matches === 3) return 10;
    return 0;
  }
  function stampFor(prize) { return prize === 777 ? "NO CAP" : "CAP"; }
  function wrap(text, width) {
    const words = String(text).split(/\s+/), lines = []; let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (candidate.length > width && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }
  function countMatches(picked, drawn) { let n = 0; for (let i = 0; i < picked.length; i++) if (drawn.includes(picked[i])) n++; return n; }
  // The one public function. ticket = integer (your pick), seed = integer (the drum).
  function draw(ticket, seed) {
    if (!Number.isInteger(ticket) || ticket < 1 || ticket > DRUM) throw new Error("ticket must be an integer from 1 to " + DRUM);
    if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
    const picked = [ticket];
    const drawn = drawNumbers(seed);
    const matches = countMatches(picked, drawn);
    const prize = prizeFor(matches);
    const stamp = stampFor(prize);
    const won = prize > 0;
    const W = 44, rule = "=".repeat(W);
    const lines = [rule, "TOTO 777 — LOTTO DRAW", "PICK: " + ticket + "   DRUM SEED: " + seed, "-".repeat(W)];
    lines.push("YOUR NUMBER: " + ticket);
    lines.push("DRUM: " + drawn.join("  "));
    lines.push("-".repeat(W));
    lines.push("MATCHES: " + matches + " of 1");
    lines.push("PRIZE:   " + prize + "B");
    lines.push("STAMP:   " + stamp);
    lines.push("-".repeat(W));
    if (won) lines.push(...wrap("You called " + ticket + " and the drum said " + drawn.join("-") + ". " + prize + "B is yours. Keep the receipt.", W - 4));
    else lines.push(...wrap("The drum did not say your number. The house keeps the ticket and your hope.", W - 4));
    lines.push(rule);
    return { ticket, seed, picked, drawn, matches, prize, stamp, won, receipt: lines.join("\n") };
  }
  function pick(seed) { const rng = mulberry32((seed + 0x9e3779b9) | 0); return 1 + Math.floor(rng() * DRUM); }
  const api = { DRUM, PICK, mulberry32, drawNumbers, prizeFor, stampFor, wrap, countMatches, draw, pick };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Toto777 = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);