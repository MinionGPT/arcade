/* Receipt Golf -- Cabinet 10. Rules mirrored from projects/receipt-golf/engine.py:
 * par = clean save = 15% of ask, eagle 30%, birdie 20%, bogey under clean, walk under
 * floor (+2). NO CAP iff save >= clean line, else CAP. The verdict and stamp are pure
 * functions of (hole, save) on both sides; the roast draw is the cabinet's own
 * (hash-based, not Python's random) -- same hole + save + seed always reprints the
 * same roast here, and the README says the two draw different roast lines.
 */
(function (root) {
  "use strict";

  var CLEAN_LINE = 0.15;
  var STAMP_NO_CAP = "NO CAP";
  var STAMP_CAP = "CAP";
  var REL = { eagle: -2, birdie: -1, par: 0, bogey: 1 };
  var WALK = 2;

  var HOLES = [
    { batch: "T777-4417", vendor: "Auntie Noom", item: "gold-leaf dress watch", ask: 900, floor: 100, eagle: 270, birdie: 180,
      roasts: ["Closer. You learn fast.", "The watch was never the price. The price was the story.", "You had me at the gold leaf. The gold leaf had you."] },
    { batch: "S777-0092", vendor: "Leng", item: "croc-slide shades", ask: 500, floor: 60, eagle: 150, birdie: 100,
      roasts: ["Slides off the nose, not the deal.", "The croc was a detail. The 500 was the point."] },
    { batch: "T777-7731", vendor: "Uncle Max", item: "30% off cable", ask: 120, floor: 10, eagle: 36, birdie: 24,
      roasts: ["You had me at thirty percent. Thirty percent had me."] },
    { batch: "T777-1188", vendor: "Auntie Noom", item: "brass amulets x3", ask: 2400, floor: 300, eagle: 720, birdie: 480,
      roasts: ["Three amulets, one story, zero calm.", "The amulets were never the markup. The markup was never the amulets."] },
    { batch: "S777-5560", vendor: "Leng", item: "silk wristband", ask: 180, floor: 15, eagle: 54, birdie: 36,
      roasts: ["The silk was thin. The deal was thin too."] },
    { batch: "T777-3320", vendor: "Uncle Max", item: "travel mug", ask: 300, floor: 20, eagle: 90, birdie: 60,
      roasts: ["The mug kept the coffee. The coffee did not keep the mug."] },
    { batch: "T777-8845", vendor: "Auntie Noom", item: "brass bell", ask: 1500, floor: 200, eagle: 450, birdie: 300,
      roasts: ["The bell rang once. The deal rang zero."] },
    { batch: "S777-2210", vendor: "Leng", item: "lottery scratch card", ask: 250, floor: 20, eagle: 75, birdie: 50,
      roasts: ["The card said lucky. The math said NO CAP."] },
    { batch: "T777-6655", vendor: "Uncle Max", item: "lucky keychain", ask: 90, floor: 8, eagle: 27, birdie: 18,
      roasts: ["The keychain was plastic. The luck was not."] }
  ];

  function r2(x) { return Math.round(x * 100) / 100; }

  function cleanSave(hole) {
    if (!hole || typeof hole.ask !== "number") throw new Error("Hole has no ask.");
    return r2(hole.ask * CLEAN_LINE);
  }

  function verdictFor(hole, save) {
    if (save < hole.floor) return "walk";
    if (save >= hole.eagle) return "eagle";
    if (save >= hole.birdie) return "birdie";
    if (save >= cleanSave(hole)) return "par";
    return "bogey";
  }

  function stampFor(hole, save) {
    return save >= cleanSave(hole) ? STAMP_NO_CAP : STAMP_CAP;
  }

  /* FNV-1a 32-bit. Same batch + save + seed string always picks the same roast. */
  function fnv1a(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function roastFor(hole, save, seed, lastRoast) {
    var pool = hole.roasts;
    if (lastRoast && pool.length > 1) {
      pool = pool.filter(function (line) { return line !== lastRoast; });
    }
    return pool[fnv1a(hole.batch + ":" + save + ":" + seed) % pool.length];
  }

  function holeAt(n) {
    var i = Number(n);
    if (!Number.isInteger(i) || i < 1 || i > HOLES.length) throw new Error("Pick a hole 1 through 9.");
    return HOLES[i - 1];
  }

  /* play(holeIndex, save, seed) -> one receipt's worth of facts. */
  function play(holeIndex, save, seed, lastRoast) {
    var hole = holeAt(holeIndex);
    if (typeof save !== "number" || !Number.isFinite(save)) throw new Error("Give a real number to offer the vendor.");
    var s = r2(save);
    if (s < 0) throw new Error("A negative offer is not a save. It is a gift.");
    var verdict = verdictFor(hole, s);
    if (verdict === "walk") {
      return { ok: false, hole: holeIndex, batch: hole.batch, save: s, verdict: "walk", score: WALK, stamp: null, roast: null };
    }
    var src = cleanSave(hole);
    var score = s >= hole.eagle ? -2 : s >= hole.birdie ? -1 : s >= src ? 0 : 1;
    if (score !== REL[verdict]) throw new Error("verdict/score drifted: " + verdict);
    return {
      ok: true,
      hole: holeIndex,
      batch: hole.batch,
      save: s,
      verdict: verdict,
      score: score,
      stamp: stampFor(hole, s),
      roast: roastFor(hole, s, String(seed), null)
    };
  }

  var api = {
    HOLES: HOLES,
    CLEAN_LINE: CLEAN_LINE,
    WALK: WALK,
    cleanSave: cleanSave,
    verdictFor: verdictFor,
    stampFor: stampFor,
    roastFor: roastFor,
    play: play,
    holeAt: holeAt,
    verdictName: function (verdict) {
      return { eagle: "EAGLE", birdie: "BIRDIE", par: "PAR", bogey: "BOGEY", walk: "WALK" }[verdict];
    },
    roundVerdict: function (total) {
      if (total <= -9) return "CLEAN SWEEP -- every receipt saved the batch.";
      if (total <= -4) return "Locked in. The house is sweating.";
      if (total < 0) return "Solid round. Paper looked clean.";
      if (total === 0) return "Par. Nothing saved, nothing lost.";
      return "The house kept the batch. Again.";
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReceiptGolfCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
