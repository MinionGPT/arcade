/* 777 Minion Farms batch-certificate engine (JS port of projects/grow-sheet/engine.py).
 * Pure and deterministic: same seed -> same sheet. Rules live here, never in ui.js.
 * Ported for the arcade; this engine has its own small seeded RNG (mulberry32), so a
 * given seed is stable inside this cabinet but is NOT byte-identical to the Python CLI.
 * Pools, batch-code alphabet, terpene split and stamp rule are copied exactly.
 */
(function (root) {
  "use strict";

  var ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0, 1, I, O: readable at 2am
  var WIDTH = 44;

  var STRAINS = [
    ["Bangkok Haze", "Thai Stick \u00d7 NL5"],
    ["Temple OG", "OG Kush \u00d7 landrace Thai"],
    ["Night Market", "Gelato \u00d7 Cookie"],
    ["Lucky Moth", "Skunk \u00d7 Purple Thai"],
    ["Sukhumvit Silver", "Haze \u00d7 Thai Stick"],
    ["Khao San Kush", "Kush \u00d7 Northern Lights"],
    ["Triple Seven", "OG \u00d7 Skunk"],
    ["Moth Wing", "Thai Stick \u00d7 Gelato"]
  ];

  var TERPENES = ["myrcene", "limonene", "caryophyllene", "linalool", "pinene", "humulene"];

  var ROASTS = [
    "Smells like a grower who forgot to flush.",
    "Tastes like Bangkok traffic at 8am \u2014 harsh, slow, unavoidable.",
    "Cured in a shoe box. You can taste the cardboard.",
    "Looks like a nug, smokes like hay.",
    "The trimmer had opinions and none of them were kind.",
    "Lab results came back and asked for a lawyer."
  ];

  var HARVEST_BASE_MS = Date.UTC(2026, 7, 1); // 2026-08-01, same base as engine.py

  // FNV-1a over the seed string -> 32-bit int.
  function hashSeed(seed) {
    var s = String(seed), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // mulberry32: 32-bit state, deterministic, no Math.random anywhere.
  function makeRng(seed) {
    var a = hashSeed(seed) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, lo, hi) { // inclusive both ends, like Python's randint
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function pick(rng, pool) { return pool[randInt(rng, 0, pool.length - 1)]; }

  function sample(rng, pool, n) { // without replacement, like Python's random.sample
    var copy = pool.slice(), out = [];
    for (var i = 0; i < n; i++) out.push(copy.splice(randInt(rng, 0, copy.length - 1), 1)[0]);
    return out;
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

  /* NO CAP when the cure is patient and the nose leads. Otherwise CAP. */
  function stampFor(cure, topTerp) {
    return cure >= 14 && topTerp >= 15.0 ? "NO CAP" : "CAP";
  }

  /* Return a fully determined batch certificate for any seed (string or number). */
  function batch(seed) {
    var rng = makeRng(seed);
    var strainPick = pick(rng, STRAINS);
    var code = "777-";
    for (var i = 0; i < 4; i++) code += ALPHABET[randInt(rng, 0, ALPHABET.length - 1)];

    var picks = sample(rng, TERPENES, 3);
    var cuts = [randInt(rng, 0, 100), randInt(rng, 0, 100)].sort(function (a, b) { return a - b; });
    var levels = [cuts[0], cuts[1] - cuts[0], 100 - cuts[1]].map(function (l) { return Math.max(1, l); });
    var total = levels[0] + levels[1] + levels[2];
    var terps = picks.map(function (t, idx) { return [t, round1(levels[idx] * 100 / total)]; });

    var thcLow = randInt(rng, 14, 22);
    var thcHigh = thcLow + randInt(rng, 2, 6);
    var cure = randInt(rng, 10, 35);
    var harvested = isoDate(HARVEST_BASE_MS + randInt(rng, 0, 60) * 86400000);

    return {
      seed: String(seed),
      strain: strainPick[0],
      lineage: strainPick[1],
      batch: code,
      harvested: harvested,
      cure: cure,
      terps: terps,
      thc_low: thcLow,
      thc_high: thcHigh,
      roast: pick(rng, ROASTS),
      stamp: stampFor(cure, terps[0][1])
    };
  }

  // GS1 pins the existing FNV-1a / mulberry32 rules. Keep leading zeros: they
  // are part of the seed, not a number to normalize. Reject, never repair.
  function ticketFor(seed) {
    if (typeof seed !== "string" || !/^[0-9]{1,32}(?![\s\S])/.test(seed)) {
      throw new Error("Give the farm a seed number: 1–32 digits, no spaces.");
    }
    return "GS1-" + seed;
  }

  function parseTicket(ticket) {
    if (typeof ticket !== "string" || !/^GS1-[0-9]{1,32}(?![\s\S])/.test(ticket)) {
      throw new Error("Invalid replay ticket. Expected GS1- followed by 1–32 digits.");
    }
    return ticket.slice(4);
  }

  function replay(ticket) { return batch(parseTicket(ticket)); }

  function spaces(n) { return new Array(n + 1).join(" "); }

  function wrap(text, width) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      if (!cur) cur = words[i];
      else if (cur.length + 1 + words[i].length <= width) cur += " " + words[i];
      else { lines.push(cur); cur = words[i]; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  function field(lines, label, value) {
    var chunks = wrap(value, WIDTH - 16);
    for (var i = 0; i < chunks.length; i++) {
      if (i === 0) lines.push(label + spaces(Math.max(1, 14 - label.length)) + ": " + chunks[i]);
      else lines.push(spaces(16) + chunks[i]);
    }
  }

  function center(s) {
    var room = WIDTH - s.length;
    if (room <= 0) return s;
    var left = Math.floor(room / 2);
    return spaces(left) + s + spaces(room - left);
  }

  /* The 44-col thermal receipt, ported from render.py so tests can read it headless. */
  function receiptText(b) {
    var HR = spaces(WIDTH).replace(/ /g, "="), LR = spaces(WIDTH).replace(/ /g, "-");
    var lines = [HR, center("777 MINION FARMS \u2014 BATCH CERTIFICATE"), center("Bangkok, Thailand \u00b7 Trip 777 / 420"), LR];
    field(lines, "STRAIN", b.strain);
    field(lines, "LINEAGE", b.lineage);
    field(lines, "BATCH CODE", b.batch);
    field(lines, "HARVESTED", b.harvested);
    field(lines, "CURED", b.cure + " days");
    lines.push(LR);
    var terp = b.terps.map(function (t) { return t[0] + " " + t[1].toFixed(1) + "%"; }).join(" \u00b7 ");
    var chunks = wrap(terp, WIDTH - 16);
    for (var i = 0; i < chunks.length; i++) {
      if (i === 0) lines.push("TERPENES" + spaces(6) + ": " + chunks[i]);
      else lines.push(spaces(16) + chunks[i]);
    }
    field(lines, "THC WINDOW", b.thc_low + "\u2013" + b.thc_high + "%");
    field(lines, "CBD", "<1%   (fictional lab numbers)");
    lines.push(LR);
    field(lines, "GROWER ROAST", b.roast);
    lines.push(LR);
    field(lines, "STAMP", b.stamp);
    lines.push(HR);
    return lines.join("\n");
  }

  var api = {
    ALPHABET: ALPHABET, WIDTH: WIDTH, STRAINS: STRAINS, TERPENES: TERPENES, ROASTS: ROASTS,
    stampFor: stampFor, batch: batch, receiptText: receiptText, hashSeed: hashSeed,
    ticketFor: ticketFor, parseTicket: parseTicket, replay: replay
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GrowSheetCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
