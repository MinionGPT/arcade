/* Cabinet 12 — PLATE 777. A lucky-plate auction oracle: every point comes from a
 * rule in this file, the score is the sum of its rows, the verdict is a threshold.
 * Pure function of the plate string. No DOM, no network, no typed verdicts. */
(function (root) {
  "use strict";

  var ROOT_POINTS = { "1": 0, "2": 0, "3": 1, "4": -3, "5": 0, "6": 2, "7": 0, "8": 3, "9": 2 };
  var PASS_SCORE = 6;      // score >= 6 -> NO CAP (the price is real); below -> CAP (walk)
  var TRIPLE_BONUS = 2;    // any digit appearing 3+ times
  var JACKPOT_BONUS = 7;   // the digits contain 777
  var FOUR_PENALTY = -2;   // per digit 4

  var NO_CAP_ROASTS = [
    "Worth the queue at the auction house. Bring cash and a straight face.",
    "Digits line up, the math agrees, the stamp is brass. Don't sell it cheap.",
    "That root reads like somebody's lucky week. Wrap it and never lend the car.",
    "The house checked twice. Bid like you mean it."
  ];
  var CAP_ROASTS = [
    "The hype is doing numbers. The digits are doing nothing. Walk.",
    "Four in the plate and a root that can't hold it. Cap.",
    "Auction bait — somebody's cousin is about to overpay. Not you.",
    "The number's loud, the math is quiet. Cap and go home."
  ];

  function rootOf(n) {
    while (n > 9) {
      n = String(n).split("").reduce(function (a, d) { return a + Number(d); }, 0);
    }
    return n;
  }

  function hashDigits(digits) {
    var h = 2166136261;
    for (var i = 0; i < digits.length; i++) {
      h ^= digits.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function read(plate) {
    if (typeof plate !== "string") throw new Error("The reader takes text. Give it a plate.");
    var shown = plate.trim().replace(/\s+/g, " ");
    if (!shown) throw new Error("Empty plate. The auction house laughed and hung up.");
    var digits = plate.replace(/\D/g, "");
    if (!digits) throw new Error("No digits on that plate. The house only reads numbers.");
    if (digits.length > 8) throw new Error("Up to 8 digits. This is a car, not a phone number.");
    if (shown.length > 20) throw new Error("That's a bus, not a plate. Up to 20 characters.");

    var sum = 0, counts = {}, maxCount = 0, eights = 0, nines = 0, fours = 0, i, d, c;
    for (i = 0; i < digits.length; i++) {
      d = digits[i];
      sum += Number(d);
      counts[d] = (counts[d] || 0) + 1;
      if (counts[d] > maxCount) maxCount = counts[d];
      if (d === "8") eights++;
      else if (d === "9") nines++;
      else if (d === "4") fours++;
    }
    var root = rootOf(sum);

    var rows = [
      { label: "ROOT " + root, points: ROOT_POINTS[String(root)] },
      { label: "LUCKY 8s/9s", points: eights + nines },
      { label: "FOUR PENALTY", points: FOUR_PENALTY * fours },
      { label: "TRIPLE DIGIT", points: maxCount >= 3 ? TRIPLE_BONUS : 0 },
      { label: "JACKPOT 777", points: digits.indexOf("777") >= 0 ? JACKPOT_BONUS : 0 }
    ];
    var score = rows.reduce(function (a, r) { return a + r.points; }, 0);
    var verdict = score >= PASS_SCORE ? "NO CAP" : "CAP";
    var pool = verdict === "NO CAP" ? NO_CAP_ROASTS : CAP_ROASTS;
    return {
      plate: shown,
      digits: digits,
      root: root,
      rows: rows,
      score: score,
      verdict: verdict,
      roast: pool[hashDigits(digits) % pool.length],
      passScore: PASS_SCORE
    };
  }

  const api = { read: read, rootOf: rootOf, PASS_SCORE: PASS_SCORE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Plate777Core = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
