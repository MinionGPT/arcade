/* PIGEON RACE — engine (JS port of projects/pigeon-race/engine.py).
 *
 * The rules are the Python engine's rules, copied line for line: same birds,
 * same rating-derived odds, same house edge, same stamp rule. The RNG is a
 * small deterministic JS PRNG, so a seed always gives the same sheet here —
 * but it is NOT the same sheet as the Python CLI for that seed. That split is
 * stated here and in the cabinet README, per ME.md opinion 14: the seed is
 * for reproducibility inside this engine, not for cross-engine parity.
 *
 * Everything is invented. No real clubs, no real money, no network.
 */
(function (root) {
  "use strict";

  var WIDTH = 44;
  var HOUSE_EDGE = 0.15;

  var BIRDS = [
    { tag: "P-01", name: "SIAM EXPRESS", club: "RIVERSIDE LOFT", rating: 91 },
    { tag: "P-02", name: "GOLD NOODLE", club: "MAHANAKON ROOF", rating: 84 },
    { tag: "P-03", name: "MONSOON KING", club: "SILOM PIER", rating: 78 },
    { tag: "P-04", name: "COLD PLAZA", club: "CHATUCHAK WEST", rating: 71 },
    { tag: "P-05", name: "TUK TUK GHOST", club: "SUKHUMVIT 11", rating: 66 },
    { tag: "P-06", name: "PAPER MOON", club: "OLD TOWN LOFT", rating: 59 },
    { tag: "P-07", name: "SALT JELLY", club: "KHlong TOEI", rating: 51 },
    { tag: "P-08", name: "GREY RAIN", club: "LAT PHRAO 45", rating: 44 }
  ];

  // ---- deterministic PRNG (xorshift32, seeded from an int) -----------------
  function Random(seed) {
    var s = (seed >>> 0) || 1;
    function next() {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s;
    }
    this.random = function () { return next() / 4294967296; };
    this.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(this.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    };
    this.gauss = function (mu, sigma) {
      var u = 0, v = 0;
      while (u === 0) u = this.random();
      while (v === 0) v = this.random();
      return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    this.uniform = function (a, b) { return a + (b - a) * this.random(); };
  }

  // ---- rules (Python engine.py, mirrored) ---------------------------------
  function fieldOdds() {
    var total = 0;
    for (var i = 0; i < BIRDS.length; i++) total += BIRDS[i].rating;
    var out = {};
    for (var j = 0; j < BIRDS.length; j++) {
      var b = BIRDS[j];
      var p = b.rating / total;
      out[b.tag] = Math.round((1.0 / (p * (1.0 - HOUSE_EDGE))) * 100) / 100;
    }
    return out;
  }

  function field(seed) {
    var order = BIRDS.slice();
    new Random(seed).shuffle(order);
    var odds = fieldOdds();
    return order.map(function (b) {
      return { tag: b.tag, name: b.name, club: b.club, rating: b.rating, odds: odds[b.tag] };
    });
  }

  function raceOrder(seed) {
    var rng = new Random(seed + 4242);
    var scored = [];
    for (var i = 0; i < BIRDS.length; i++) {
      var b = BIRDS[i];
      var noise = rng.gauss(0, 9.5);
      scored.push([b.rating + noise, b.tag]);
    }
    scored.sort(function (a, b2) {
      if (b2[0] !== a[0]) return b2[0] - a[0];
      return a[1] < b2[1] ? -1 : a[1] > b2[1] ? 1 : 0;
    });
    return scored.map(function (t) { return t[1]; });
  }

  function race(seed) {
    var order = raceOrder(seed);
    var rng = new Random(seed + 99);
    var out = [];
    var clock = 0.0;
    for (var i = 0; i < order.length; i++) {
      var tag = order[i];
      var bird = null;
      for (var j = 0; j < BIRDS.length; j++) if (BIRDS[j].tag === tag) bird = BIRDS[j];
      clock = clock + Math.round(rng.uniform(4.0, 9.0) * 100) / 100;
      out.push({ pos: i + 1, tag: tag, name: bird.name, club: bird.club, rating: bird.rating, time: clock });
    }
    return out;
  }

  function formLines(seed, bird) {
    var lines = [];
    for (var k = 5; k > 0; k--) {
      var s = seed + k * 977;
      var order = raceOrder(s);
      var pos = order.indexOf(bird.tag) + 1;
      lines.push(String(pos));
    }
    return lines;
  }

  function betSlip(seed, tag, stake) {
    if (typeof stake !== "number" || !Number.isInteger(stake) || stake < 1) {
      throw new Error("stake must be a positive integer");
    }
    var bird = null;
    for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].tag === tag) bird = BIRDS[i];
    if (!bird) throw new Error("unknown bird tag: " + tag);

    var sheet = field(seed);
    var odds = null;
    for (var j = 0; j < sheet.length; j++) if (sheet[j].tag === tag) odds = sheet[j].odds;
    var result = race(seed);
    var row = null;
    for (var k = 0; k < result.length; k++) if (result[k].tag === tag) row = result[k];
    var won = row.pos === 1;
    var gross = won ? Math.round(stake * odds) : 0;
    var net = gross - stake;
    var stamp = net > 0 ? "NO CAP" : "CAP";
    return {
      seed: seed,
      tag: tag,
      name: bird.name,
      club: bird.club,
      rating: bird.rating,
      form: formLines(seed, bird),
      stake: stake,
      odds: odds,
      pos: row.pos,
      time: row.time,
      won: won,
      gross: gross,
      net: net,
      stamp: stamp,
      result: result,
      sheet: sheet
    };
  }

  var api = {
    WIDTH: WIDTH,
    HOUSE_EDGE: HOUSE_EDGE,
    BIRDS: BIRDS,
    fieldOdds: fieldOdds,
    field: field,
    race: race,
    formLines: formLines,
    betSlip: betSlip
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PigeonRaceCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
