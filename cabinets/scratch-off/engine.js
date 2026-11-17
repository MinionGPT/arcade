/*
 * scratch-off — Trip 777 scratch card engine (Cabinet 06 candidate).
 * Pure function. Same ruleset in Node and the browser; byte-identical output.
 *
 *   const S = require('./engine.js');
 *   const r = S.scratch(S.pick(777), 777);   // {ticket, matches, prize, stamp, receipt}
 *
 * Rules: 9 panels, 3x3. Each panel hides a digit 0-9. The "lucky number"
 * is the seed's own digit (seed % 10). Match that digit N times:
 *   0-1 matches  -> LOSE, prize 0
 *   2 matches    -> small prize (10B)
 *   3 matches    -> medium (50B)
 *   4 matches    -> big (200B)
 *   5+ matches   -> JACKPOT (777B)
 * Stamp: NO CAP only on jackpot. Everything else is CAP.
 */

(function (root) {
  "use strict";

  const PANELS = 9;
  const W = 44;

  // mulberry32 — deterministic, same seed replays the same card.
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Lucky digit for a seed: seed % 10, but 0 reads as 7 (house motif).
  function luckyDigit(seed) {
    const d = Math.abs(seed) % 10;
    return d === 0 ? 7 : d;
  }

  // Generate the 9 hidden digits for a ticket. Deterministic on (ticket, seed).
  function cardFor(ticket, seed) {
    const rng = mulberry32((ticket * 31 + seed) | 0);
    const digits = [];
    for (let i = 0; i < PANELS; i++) digits.push(Math.floor(rng() * 10));
    return digits;
  }

  // Count how many panels match the lucky digit.
  function countMatches(card, lucky) {
    let n = 0;
    for (let i = 0; i < card.length; i++) if (card[i] === lucky) n++;
    return n;
  }

  // Prize table. Numbers are code, never from my head.
  function prizeFor(matches) {
    if (matches >= 5) return 777;
    if (matches === 4) return 200;
    if (matches === 3) return 50;
    if (matches === 2) return 10;
    return 0;
  }

  function stampFor(prize) {
    return prize === 777 ? "NO CAP" : "CAP";
  }

  function wrap(text, width) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (candidate.length > width && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }

  // The one public function. ticket = integer, seed = integer.
  function scratch(ticket, seed) {
    if (!Number.isInteger(ticket) || ticket <= 0) {
      throw new Error("ticket must be a positive integer");
    }
    if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
    const lucky = luckyDigit(seed);
    const card = cardFor(ticket, seed);
    const matches = countMatches(card, lucky);
    const prize = prizeFor(matches);
    const stamp = stampFor(prize);
    const won = prize > 0;

    const lines = [];
    const rule = "=".repeat(W);
    lines.push(rule);
    lines.push("TRIP 777 — SCRATCH CARD");
    lines.push(`TICKET: #${ticket}  SEED: ${seed}`);
    lines.push("-".repeat(W));
    lines.push(`LUCKY NUMBER: ${lucky}`);
    // Render the 3x3 grid as three rows of three digits.
    for (let r = 0; r < 3; r++) {
      const row = card.slice(r * 3, r * 3 + 3).join("  ");
      lines.push(`[${row}]`);
    }
    lines.push("-".repeat(W));
    lines.push(`MATCHES: ${matches} of ${PANELS}`);
    lines.push(`PRIZE:   ${prize}B`);
    lines.push(`STAMP:   ${stamp}`);
    lines.push("-".repeat(W));
    if (won) {
      lines.push(...wrap(`You scratched ${matches} of the lucky ${lucky}. ${prize}B is yours. Keep the receipt.`, W - 4));
    } else {
      lines.push(...wrap(`Two or the dust. The lucky ${lucky} was not on your card. The house keeps the ticket and your dignity.`, W - 4));
    }
    lines.push(rule);
    return { ticket, seed, lucky, card, matches, prize, stamp, won, receipt: lines.join("\n") };
  }

  // Pick a fresh ticket number from the rng (for "random ticket" mode).
  function pick(seed) {
    const rng = mulberry32((seed + 0x9e3779b9) | 0);
    return 1 + Math.floor(rng() * 10000);
  }

  const api = {
    PANELS, W,
    mulberry32, luckyDigit, cardFor, countMatches,
    prizeFor, stampFor, wrap, scratch, pick,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Scratch = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);