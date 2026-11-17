// One engine for both Node tests and file:// browser play. No DOM, no side effects.
(function (root) {
"use strict";
// Symbols with weights (rarer = better)
const REEL_SYMBOLS = [
  { emoji: "💀", weight: 25, name: "SKULL", tier: "common" },
  { emoji: "🌿", weight: 20, name: "BUD", tier: "common" },
  { emoji: "👟", weight: 18, name: "KICKS", tier: "common" },
  { emoji: "🔥", weight: 15, name: "FIRE", tier: "uncommon" },
  { emoji: "💎", weight: 12, name: "GEM", tier: "rare" },
  { emoji: "🍀", weight: 7, name: "CLOVER", tier: "rare" },
  { emoji: "7️⃣", weight: 3, name: "SEVEN", tier: "legendary" },
];

// Flatten for weighted random choice
const WEIGHTED_REEL = [];
for (const sym of REEL_SYMBOLS) {
  for (let i = 0; i < sym.weight; i++) {
    WEIGHTED_REEL.push(sym);
  }
}

// Thai grower roasts by tier
const ROASTS = {
  jackpot: [
    "JACKPOT! Triple seven! You just hit the motherlode — Trip 777 blessed you. 🎰💀",
    "777! The slot gods smiled. That's Vegas luck in Bangkok soil. NO CAP.",
    "TRIPLE SEVEN! You're not a grower, you're a LEGEND. Frame this spin.",
  ],
  big_win: [
    "That's a harvest worth bragging about. Frame the receipt.",
    "Your stash just got an upgrade. Don't let it go to your head.",
    "You're cooking with gas now. The house wants a rematch.",
  ],
  win: [
    "Not bad. Two matching. Your plants would approve. 🌿",
    "Fresh drop energy. A pair is a pair.",
    "A little heat. Don't quit your day grow.",
  ],
  meh: [
    "Close but no cigar. The reels remember.",
    "So close the machine flinched. Zero returned.",
    "Luck's testing you. Call this one a soundcheck.",
  ],
  loss: [
    "The reaper came for your pretend bankroll. 💀",
    "A salad, not a win. Toss it back. 🌿👟🔥",
    "The slot machine laughed at your strategy.",
    "Chaos energy. The reels are messy today.",
  ],
};

// Returns per 1 credit staked (stake included). Tuned so analyze().rtp lands near 92%.
// Change a number here and `npm test` re-checks the house edge. Never hand-write odds in the README.
const PAYTABLE = { jackpot: 777, big_win: 15, win: 2, meh: 0, loss: 0 };

// Precedence is explicit; the matching symbol, never the first reel, decides a pair.
function evaluate(spins, random = Math.random) {
  if (!Array.isArray(spins) || spins.length !== 3 ||
      spins.some(s => !REEL_SYMBOLS.includes(s))) {
    throw new TypeError("Expected three symbols from REEL_SYMBOLS");
  }
  const counts = new Map();
  for (const s of spins) counts.set(s.name, (counts.get(s.name) || 0) + 1);
  const sevens = counts.get("SEVEN") || 0;
  const triple = [...counts].some(([name, count]) => name !== "SKULL" && count === 3);
  const pair = [...counts].some(([name, count]) => name !== "SKULL" && count === 2);
  const tier = sevens === 3 ? "jackpot"
    : sevens === 2 || triple ? "big_win"
    : pair ? "win"
    : sevens === 1 || counts.has("GEM") || counts.has("CLOVER") ? "meh" : "loss";
  const multiplier = PAYTABLE[tier];
  const pool = ROASTS[tier];
  return { tier, multiplier, stamp: multiplier >= 1 ? "NO CAP" : "CAP",
    roast: pool[Math.floor(random() * pool.length)] };
}

// Versioned tickets pin the PRNG and draw order. No hidden global random calls.
function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTicket(seed, bet) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff ||
      !Number.isInteger(bet) || bet < 1 || bet > 100) {
    throw new RangeError("Seed must be uint32; stake must be 1–100 whole play credits");
  }
  return `777-v1-${seed}-${bet}`;
}

function parseTicket(ticket) {
  const match = /^777-v1-(0|[1-9]\d{0,9})-([1-9]\d{0,2})$/.exec(ticket);
  if (!match || match[0] !== ticket) throw new Error("Not a valid v1 spin ticket");
  const seed = Number(match[1]), bet = Number(match[2]);
  makeTicket(seed, bet);
  return { seed, bet };
}

function spin(seed, bet) {
  const ticket = makeTicket(seed, bet);
  const random = seededRandom(seed);
  const spins = Array.from({ length: 3 }, () => WEIGHTED_REEL[Math.floor(random() * WEIGHTED_REEL.length)]);
  const result = evaluate(spins, random);
  return { ticket, spins, ...result, bet, payout: bet * result.multiplier };
}

function receiptText(result) {
  return ["TRIP 777 / PLAY MONEY ONLY", result.ticket,
    result.spins.map(s => s.name).join(" / "),
    `${result.tier.toUpperCase()} · ${result.stamp}`,
    `STAKE ${result.bet} / RETURN ${result.payout} CREDITS`, result.roast,
    "Replay is a copy, not another win. No cash value."].join("\n");
}

// Exact odds by enumerating every reel combination (no sampling, no invented stats).
function analyze() {
  const total = REEL_SYMBOLS.reduce((a, s) => a + s.weight, 0);
  const odds = { jackpot: 0, big_win: 0, win: 0, meh: 0, loss: 0 };
  let rtp = 0;
  for (const a of REEL_SYMBOLS) for (const b of REEL_SYMBOLS) for (const c of REEL_SYMBOLS) {
    const p = (a.weight * b.weight * c.weight) / total ** 3;
    const r = evaluate([a, b, c], () => 0);
    odds[r.tier] += p;
    rtp += p * r.multiplier;
  }
  return { odds, rtp };
}

const api = { REEL_SYMBOLS, WEIGHTED_REEL, ROASTS, PAYTABLE, analyze, evaluate, spin, seededRandom, parseTicket, makeTicket, receiptText };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Slot = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
