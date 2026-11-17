/* Cabinet 13 — MOTH MARKETS. A panic-trading bot run by a moth.
 * The whole strategy is the moth's mood, and the mood is a threshold on the
 * 3-day change. Every number on the statement (prices, trades, fees, return,
 * drawdown) is computed here — opinion 20: the house edge is arithmetic, not a
 * slogan. Pure functions of the batch code; same seed, same statement. */
(function (root) {
  "use strict";

  var START_CASH = 1000;   // fictional baht, no real money anywhere near this
  var START_PRICE = 100;
  var DAYS = 30;
  var FEE = 0.005;         // 0.5% of trade value, charged on every trade
  var SWEAT_FLOOR = -0.05; // 3-day change at or below this -> moth panics
  var DEAD_FLOOR = -0.15;  // at or below this -> moth dies, bot stops trading
  var MOODS = ["calm", "sweats", "panics", "dead"];

  var NO_CAP_ROASTS = [
    "The moth beat the tape. Do not tell the lamp; it will get ideas.",
    "Paper wings, brass hands. The statement is real and so is the smug.",
    "The bot made money by feeling things. The market is a joke, apparently.",
    "Signed, sealed, moth-delivered. Cash out before the lamp finds you."
  ];
  var CAP_ROASTS = [
    "You paid fees to lose money on schedule. The broker sends its regards.",
    "The moth sold at the bottom. Twice. The bottom filed a complaint.",
    "Strategy: panic. Result: also panic. The 0.5% fee is the only winner.",
    "The lamp was a better investment. It at least stayed still."
  ];

  function round2(n) { return Math.round(n * 100) / 100; }

  function hashSeed(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function validate(seed) {
    if (typeof seed !== "string" || !seed.trim()) {
      throw new Error("The bot needs a batch code. Any digits.");
    }
    var s = seed.trim();
    // Digits before length (opinion 21): the first refusal IS the message read.
    if (!/^\d+$/.test(s)) {
      throw new Error("Batch codes are digits only. The moth cannot read letters.");
    }
    if (s.length > 12) {
      throw new Error("Up to 12 digits. That's a phone number, not a batch code.");
    }
    return s;
  }

  function series(seed) {
    var s = validate(seed);
    var rng = mulberry32(hashSeed(s));
    var prices = [START_PRICE];
    for (var i = 1; i <= DAYS; i++) {
      var ch = rng() * 0.11 - 0.06; // daily move, mean +0.5%, loud variance
      var next = round2(Math.max(1, prices[i - 1] * (1 + ch)));
      prices.push(next);
    }
    return prices;
  }

  function moodAt(prices, i) {
    if (i < 3) return "calm"; // not enough tape to feel anything yet
    var ch = (prices[i] - prices[i - 3]) / prices[i - 3];
    if (ch >= 0) return "calm";
    if (ch > SWEAT_FLOOR) return "sweats";
    if (ch > DEAD_FLOOR) return "panics";
    return "dead";
  }

  /* The bot. Pure over a price series so tests can feed it any tape. */
  function runSeries(seed, prices) {
    var s = validate(seed);
    var cash = START_CASH, shares = 0, dead = false;
    var feesPaid = 0, trades = 0;
    var moodCounts = { calm: 0, sweats: 0, panics: 0, dead: 0 };
    var rows = [];
    var peakNet = START_CASH, maxDD = 0;

    for (var i = 1; i <= DAYS; i++) {
      var price = prices[i];
      var mood = dead ? "dead" : moodAt(prices, i);
      moodCounts[mood]++;
      var action = "hold";

      if (i === 1) {
        // Day one: FOMO. The bot always goes all-in. That is the joke.
        shares = round2((cash * (1 - FEE)) / price);
        feesPaid = round2(feesPaid + cash * FEE);
        cash = 0;
        trades++;
        action = "all-in (fomo)";
      } else if (mood === "dead") {
        if (shares > 0) {
          var gross = shares * price;
          cash = round2(cash + gross * (1 - FEE));
          feesPaid = round2(feesPaid + gross * FEE);
          shares = 0;
          trades++;
          action = "panic-sell, then corner";
          dead = true;
        } else {
          action = "sits in the corner";
          dead = true;
        }
      } else if (mood === "panics" && shares > 0) {
        var pg = shares * price;
        cash = round2(cash + pg * (1 - FEE));
        feesPaid = round2(feesPaid + pg * FEE);
        shares = 0;
        trades++;
        action = "sell everything";
      } else if (mood === "sweats" && cash >= 1) {
        var spend = round2(cash / 2);
        shares = round2(shares + (spend * (1 - FEE)) / price);
        feesPaid = round2(feesPaid + spend * FEE);
        cash = round2(cash - spend);
        trades++;
        action = "buy half the cash";
      }

      var net = round2(cash + shares * price);
      if (net > peakNet) peakNet = net;
      var dd = round2(((net - peakNet) / peakNet) * 100);
      if (dd < maxDD) maxDD = dd;

      rows.push({
        day: i, price: price, mood: mood, action: action,
        shares: shares, cash: cash, net: net
      });
    }

    var last = rows[rows.length - 1];
    var endNet = last.net;
    var returnPct = round2(((endNet - START_CASH) / START_CASH) * 100);
    var verdict = endNet > START_CASH ? "NO CAP" : "CAP"; // ties go to the house
    var pool = verdict === "NO CAP" ? NO_CAP_ROASTS : CAP_ROASTS;
    var roast = pool[hashSeed(s + "|roast") % pool.length];

    return {
      seed: s,
      rows: rows,
      moodCounts: moodCounts,
      final: {
        startCash: START_CASH,
        endNet: endNet,
        returnPct: returnPct,
        feesPaid: feesPaid,
        trades: trades,
        maxDrawdownPct: maxDD
      },
      verdict: verdict,
      roast: roast
    };
  }

  function run(seed) {
    var s = validate(seed);
    return runSeries(s, series(s));
  }

  /* 44-column thermal statement. Action codes are short so the paper fits;
   * rows[].action keeps the full sentence for the screen. */
  var ACTION_CODE = {
    "all-in (fomo)": "FOMO",
    "sell everything": "SELL-ALL",
    "buy half the cash": "BUY-HALF",
    "panic-sell, then corner": "PANIC-SELL",
    "sits in the corner": "CORNER",
    "hold": "HOLD"
  };

  function money(n) { return n.toFixed(2); }

  function statement(r) {
    var lines = [];
    var rule = "--------------------------------------------";
    lines.push("MOTH MARKETS / BATCH " + r.seed);
    lines.push("START " + money(START_CASH) + "  FEE " + (FEE * 100) + "%  STRATEGY: MOOD");
    lines.push(rule);
    lines.push("DAY  PRICE   ACTION     NET");
    for (var i = 0; i < r.rows.length; i++) {
      var row = r.rows[i];
      var day = "D" + (row.day < 10 ? "0" + row.day : row.day);
      lines.push(day + "  " + money(row.price).padStart(6) + "  " +
        (ACTION_CODE[row.action] || "HOLD").padEnd(9) + " " + money(row.net).padStart(8));
    }
    lines.push(rule);
    var f = r.final;
    var sign = f.returnPct >= 0 ? "+" : "";
    lines.push("END NET " + money(f.endNet) + "  RETURN " + sign + money(f.returnPct) + "%");
    lines.push("FEES " + money(f.feesPaid) + "  TRADES " + f.trades + "  MAX DD " + money(f.maxDrawdownPct) + "%");
    lines.push("MOODS calm " + r.moodCounts.calm + " sweats " + r.moodCounts.sweats +
      " panics " + r.moodCounts.panics + " dead " + r.moodCounts.dead);
    var roastLine = "ROAST: " + r.roast;
    while (roastLine.length > 40) {
      var cut = roastLine.lastIndexOf(" ", 40);
      if (cut < 0) cut = 40;
      lines.push(roastLine.slice(0, cut));
      roastLine = "       " + roastLine.slice(cut + 1);
    }
    lines.push(roastLine);
    lines.push("STAMP: " + r.verdict);
    return lines;
  }

  var api = {
    run: run, runSeries: runSeries, series: series, moodAt: moodAt, validate: validate,
    statement: statement, ACTION_CODE: ACTION_CODE,
    START_CASH: START_CASH, START_PRICE: START_PRICE, DAYS: DAYS, FEE: FEE,
    SWEAT_FLOOR: SWEAT_FLOOR, DEAD_FLOOR: DEAD_FLOOR, MOODS: MOODS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MothMarketsCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
