/*
 * night-market — pure haggle engine (Cabinet 05, Minion Arcade 777).
 * Ported from projects/night-market/market.py. Same vendors, same counter math,
 * same LineBook, same stamp rule. One engine, testable in Node and the browser.
 *
 * Exports: module.exports in Node, window.NightMarket in the browser.
 */

(function (root) {
  "use strict";

  const W = 44; // thermal-paper columns
  const MAX_ROUNDS = 12; // engine hard stop, so no stall holds you forever
  const STAMP_SAVINGS_FRAC = 0.15; // save >= 15% of the opening ask -> NO CAP

  // ---------------------------------------------------------------------------
  // Vendors. All fictional. Personality is the product; the goods are adjacent.
  // floor = lowest the vendor will actually go. patience = rounds of your nerve.
  // ---------------------------------------------------------------------------
  const VENDORS = {
    noom: {
      key: "noom",
      name: "Auntie Noom",
      stall: "watches that tell a better time than yours",
      item: "TimeMaster 777 (Rolex-adjacent)",
      ask: 900,
      floor: 380,
      patience: 6,
      wave: [
        "I bring the number down to you. Slowly. Like a sunset over the river.",
        "The river does the waving. I just sign for it.",
      ],
      opener: [
        "Farang! This watch? Swiss soul, Thai heart. 900 baht, and I include luck.",
        "This one? My best. The moon checks its time on the moon. 900.",
        "You have the face of a man who needs a better watch. 900 baht fixes it.",
      ],
      insult: [
        "That number is so low my moth flew away from it. Try again or go home.",
        "900 for the watch, that offer for the insult. Higher.",
        "Aiya. Even the stray dogs here negotiate better than that.",
      ],
      near: [
        "You almost make it worth my while. Almost.",
        "Closer. You learn fast, like my grandson's cousin.",
        "Eh. That number has potential. It has no manners, but potential.",
      ],
      last: [
        "This is last price. After this, I close stall and drink.",
        "Last price. The next one is my nephew's problem.",
      ],
      deal: [
        "Take it. Don't wind it too tight, it tells lies on Tuesdays.",
        "Done. You will be two minutes famous at work with this watch.",
      ],
      sucker: [
        "You pay full? No haggle? I respect the confidence and will remember it fondly.",
        "Full price? My stall is blessed today. Come back when you have more money, less sense.",
      ],
      storm: [
        "Get out of my stall. My nephew will sell it to a tourist at double.",
        "Finished. I give the watch to the crab. The crab has better manners.",
      ],
      walk: [
        "She watches you go and already forgets your face.",
        "You walk. She haggles with the air and wins.",
      ],
    },
    leng: {
      key: "leng",
      name: "Leng",
      stall: "slippers from a farm Kanchanaburi has never confirmed",
      item: "croc-look slides, size 44 (probably)",
      ask: 500,
      floor: 220,
      patience: 5,
      wave: [
        "I move the slider down, bro. One click at a time, like my patience.",
        "Then I move it back up, because bro is a problem.",
      ],
      opener: [
        "Real texture, bro. Not real croc. Real REAL texture. 500.",
        "These? The croc gave them up willingly. Allegedly. 500.",
        "Bro, size 44. The croc was a big croc. 500, no refunds, no evidence.",
      ],
      insult: [
        "Bro, at that price the croc sues YOU.",
        "That offer? Even the lizards have dignity, bro.",
        "Bro bro bro. Stop. Higher before the market police hear you.",
      ],
      near: [
        "You got taste, bro. Stupid taste, but taste. Closer.",
        "Okay okay, that's a human number. Almost a Thai number.",
        "Bro, you're talking like someone who's been here a week. Good.",
      ],
      last: [
        "Last price, bro. The croc is getting impatient.",
        "Last. After this I have to sell them to my own mother.",
      ],
      deal: [
        "Wear them proud. Nobody can prove anything.",
        "Done, bro. If they bite you, that's between you and the river.",
      ],
      sucker: [
        "Full price? Bro, I was going to throw in a keychain. Now I don't have to.",
        "No haggle? Respect. Suspicious respect, but respect.",
      ],
      storm: [
        "Alright bro, walk. The next tourist has bigger hands and smaller numbers.",
        "You're done, bro. I'm selling these to a croc farmer. Oh wait.",
      ],
      walk: [
        "Leng already turned to the next guy. That is business.",
        "He calls you back once, out of habit, then lets you go.",
      ],
    },
    max: {
      key: "max",
      name: "Uncle Max",
      stall: "cables that work thirty percent of the time, every time",
      item: "USB-C cable, 'genuine, definitely'",
      ask: 120,
      floor: 45,
      patience: 7,
      wave: [
        "I shave the price down like I shave my conscience. Barely.",
        "Then I buy back my conscience and raise the price again.",
      ],
      opener: [
        "Genuine cable, I have the paperwork somewhere. 120 baht, quality you can feel.",
        "This cable? It charged my phone, my power bank, and once my heart. 120.",
        "Son, that charger of yours is begging for this cable. 120 baht answers the prayer.",
      ],
      insult: [
        "Son, even my cables have more self-respect than that offer.",
        "That price is why your phone is at 4 percent right now.",
        "I've seen better offers from monks. And monks don't carry cash.",
      ],
      near: [
        "Eh, you're getting it. Come on, one more push.",
        "That's nearly a family number. Nearly.",
        "Closer, closer. The cable believes in you more than you do.",
      ],
      last: [
        "Last price. This cable outlives your phone.",
        "Last. I'm too old to negotiate with a man who shops at 7-Eleven.",
      ],
      deal: [
        "Here. If it stops working, come back and stand near me. It charges by proximity.",
        "Take it. Thirty percent reliability, one hundred percent memories.",
      ],
      sucker: [
        "Full price, no haggle? Take the cable and my pity, both free.",
        "You pay full ask? Son, the cable doesn't deserve this kind of commitment.",
      ],
      storm: [
        "Go, go. I'm too old for this. Twelve baht profit and a heart attack.",
        "Out. The cable and I need to talk about our future together.",
      ],
      walk: [
        "Uncle Max pockets the cable and mutters about inflation and teenagers.",
        "He sighs at the voltage of youth. The cable survives.",
      ],
    },
  };

  // ---------- HELPERS ----------

  // mulberry32 PRNG (deterministic replays: same seed, same night)
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleInPlace(arr, rng) {
    // Mirrors Python's random.shuffle: walk backwards, swap with a draw.
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function wrap(text, width) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (candidate.length > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // ---------- LINE BOOK ----------

  // Per-game line dealer: shuffles each pool once with the game's rng, then
  // deals in order. Kills the cycle-3 sin (random.choice repeating the same
  // roast three rounds running). Same seed replays the exact transcript.
  class LineBook {
    constructor(vendor, rng) {
      this.pools = {};
      for (const [key, val] of Object.entries(vendor)) {
        if (Array.isArray(val)) {
          const order = Array.from({ length: val.length }, (_, i) => i);
          shuffleInPlace(order, rng);
          this.pools[key] = [val, order, 0];
        }
      }
    }

    get(key) {
      const [lines, order, i] = this.pools[key];
      const line = lines[order[i % order.length]];
      this.pools[key][2] = i + 1;
      return line;
    }
  }

  // ---------- INPUT ----------

  function parseOffer(text) {
    // Human input -> action tuple. Returns None on garbage (caller re-asks).
    const t = (text || "").trim().toLowerCase();
    if (t === "walk" || t === "w" || t === "leave") return ["walk"];
    if (t === "pay" || t === "p") return ["pay"];
    const v = Number.parseFloat(t);
    if (!Number.isFinite(v) || v <= 0) return null;
    return ["offer", Math.trunc(v)];
  }

  // ---------- ENGINE ----------

  function openState(vendor, seed) {
    const rng = typeof seed === "number" ? mulberry32(seed) : seed;
    const book = new LineBook(vendor, rng);
    return {
      vendor,
      ask: vendor.ask,
      floor: vendor.floor,
      patience: vendor.patience,
      ask0: vendor.ask,
      book,
      rng,
      rnd: 0,
      transcript: [`${vendor.name}: ${book.get("opener")}`, ""],
      done: false,
      result: null,
    };
  }

  function finish(state, deal, paid, why) {
    state.done = true;
    const result = {
      deal,
      paid,
      ask0: state.ask0,
      floor: state.floor,
      rounds: state.rnd,
      why,
      transcript: state.transcript,
      vendor: state.vendor,
    };
    state.result = result;
    return { state, done: true, result, lines: [] };
  }

  // Advance exactly one round. The UI drives this action by action; play()
  // loops it. Either way the same state machine runs.
  function step(state, action) {
    const lines = [];
    const push = line => {
      state.transcript.push(line);
      lines.push(line);
    };
    const vendor = state.vendor;
    const name = vendor.name;
    state.rnd += 1;

    const kind = action[0];

    if (kind === "walk") {
      push("You: walk away.");
      push(`${name}: ${state.book.get("walk")}`);
      return finish(state, false, null, "walked");
    }

    if (kind === "pay") {
      push(`You: pay the full ${state.ask}B and stop negotiating like a tourist.`);
      push(`${name}: ${state.book.get("sucker")}`);
      return finish(state, true, state.ask, "paid-ask");
    }

    const offer = action[1];
    push(`You: offer ${offer}B.`);

    if (offer >= state.ask) {
      push(`${name}: ${state.ask} baht, done. ${state.book.get("deal")}`);
      return finish(state, true, state.ask, "over-offer");
    }

    if (offer < state.floor) {
      const burn = offer < state.floor * 0.6 ? 2 : 1;
      state.patience -= burn;
      push(`${name}: ${state.book.get("insult")}`);
      if (state.patience <= 0) {
        push(`${name}: ${state.book.get("storm")}`);
        return finish(state, false, null, "stormed");
      }
    } else {
      state.patience -= 1;
    }

    // Vendor counters: gap to the player's offer halves, clamped at floor.
    const newAsk = Math.max(state.floor, Math.floor((state.ask + Math.max(offer, state.floor)) / 2));
    if (newAsk === state.floor) {
      push(`${name}: ${state.book.get("last")} ${newAsk}B.`);
    } else if (offer >= state.floor * 0.85) {
      push(`${name}: ${state.book.get("near")} ${newAsk}B.`);
    } else {
      push(`${name}: ${state.book.get("wave")} ${newAsk}B.`);
    }
    state.ask = newAsk;

    if (state.patience <= 0) {
      push(`${name}: ${state.book.get("storm")}`);
      return finish(state, false, null, "stormed");
    }

    return { state, done: false, lines };
  }

  function play(vendor, strategy, seed) {
    // strategy(vendor, ask, patience, rnd) -> action tuple.
    // Returns result dict: deal, paid, ask0, floor, rounds, why, transcript.
    // Invariant: a deal's paid is >= floor.
    const state = openState(vendor, seed);
    while (!state.done && state.rnd < MAX_ROUNDS) {
      step(state, strategy(vendor, state.ask, state.patience, state.rnd + 1));
    }
    if (!state.done) {
      state.transcript.push(`${vendor.name}: We been here twelve rounds. Sun's coming up. No deal.`);
      return finish(state, false, null, "timeout").result;
    }
    return state.result;
  }

  // ---------- STRATEGIES ----------

  function makeBot(budgetFrac = 0.70, bidFrac = 0.80) {
    // Deterministic haggle bot: bid bid_frac of the current ask, capped at
    // budget (budget_frac of opening ask). Pay when ask <= budget. Walk when
    // budget is below the vendor's counter forever.
    return function bot(vendor, ask, patience, rnd) {
      const budget = Math.trunc(vendor.ask * budgetFrac);
      if (ask <= budget) return ["pay"];
      if (budget < ask && patience <= 1 && budget < vendor.floor) return ["walk"];
      return ["offer", Math.max(1, Math.min(budget, Math.trunc(ask * bidFrac)))];
    };
  }

  // ---------- STAMP / STORY / RECEIPT ----------

  function stampFor(result) {
    // NO CAP if you saved >= 15% of the opening ask. CAP otherwise,
    // including walking away with nothing.
    if (!result.deal) return "CAP";
    const saved = result.ask0 - result.paid;
    return saved >= result.ask0 * STAMP_SAVINGS_FRAC ? "NO CAP" : "CAP";
  }

  function storyFor(result) {
    const v = result.vendor;
    if (result.deal) {
      const saved = result.ask0 - result.paid;
      return (
        `You danced ${result.rounds} rounds with ${v.name} and left ` +
        `with ${v.item} for ${result.paid}B. Saved ${saved}B. ` +
        "It is worth about a third of that. Perfect trade."
      );
    }
    if (result.why === "stormed") {
      return `${v.name} stormed off after ${result.rounds} rounds. You got nothing and a story. That was always the deal.`;
    }
    if (result.why === "walked") {
      return `You walked after ${result.rounds} rounds. The market keeps the item, you keep the grudge. Even trade.`;
    }
    return "Twelve rounds, no deal. The sun came up and neither of you blinked. Legendary waste of a night.";
  }

  function receiptText(result) {
    const v = result.vendor;
    const stamp = stampFor(result);
    const lines = [];
    const push = (...texts) => {
      for (const text of texts) lines.push(text);
    };
    const rule = "=".repeat(W);
    push(rule);
    push("BANGKOK NIGHT MARKET — SOI 777");
    push(...wrap(`${v.name} • ${v.stall}`, W));
    push("-".repeat(W));
    push(...wrap(`ITEM: ${v.item}`, W));
    push(`ASKED:       ${result.ask0}B`);
    if (result.deal) {
      push(`YOU PAID:    ${result.paid}B`);
      push(`YOU SAVED:   ${result.ask0 - result.paid}B`);
    } else {
      push(`YOU PAID:    0B`);
      push(`YOU SAVED:   0B`);
    }
    push(`ROUNDS:      ${result.rounds}`);
    push(`OUTCOME:     ${result.why}`);
    push(`STAMP:       ${stamp}`);
    push("-".repeat(W));
    push(...wrap(storyFor(result), W - 4));
    push(rule);
    return lines.join("\n");
  }

  const api = {
    VENDORS,
    MAX_ROUNDS,
    STAMP_SAVINGS_FRAC,
    W,
    LineBook,
    parseOffer,
    makeBot,
    openState,
    step,
    play,
    stampFor,
    storyFor,
    receiptText,
    wrap,
    mulberry32,
    shuffleInPlace,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NightMarket = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
