// Lucky Moth session engine. Pure: ledger in, mood out. No DOM, no clock, no Math.random.
// The mood scale is copied from projects/moth-odds/engine.js (house edge 5 / 10 / 15 points);
// moth-engine.test.js compares the two when the sibling folder exists, so the copy cannot drift quietly.
// What is new here: the RTP it reads is YOUR session (returned / staked), not only the machine's theory.
(function (root) {
"use strict";

const EDGE = { calm: 0.05, sweats: 0.10, panics: 0.15 };   // edge <= value -> that mood; above 0.15 -> dead
const THIN_SAMPLE = 10;                                       // under this many spins the reading is a mood, not a statistic

const STAMP = { calm: "NO CAP", sweats: "NO CAP", panics: "CAP", dead: "CAP" };

// Dealt by spin count so two neighbouring spins never show the same line (test enforces it).
const LINES = {
  calm: [
    "Moth folds its wings. You are up. Enjoy it, it does not last.",
    "Moth lands on the lever. The house is kind tonight.",
    "Moth is humming. Moth has no idea why. Neither do you."
  ],
  sweats: [
    "Moth sweats. The math is not your friend.",
    "Moth is checking the exits. Break-even is a rumour.",
    "Moth dabs its forehead with a wing. Small losses, still breathing."
  ],
  panics: [
    "Moth panics. The loss tier is staring back.",
    "Moth is flapping at the lamp. It thinks the lamp is the way out.",
    "Moth wants to speak to the manager. The manager is the slot."
  ],
  dead: [
    "Moth is dead. You fed the slot a bad night.",
    "Moth is on its back. Legs up. Frame the receipts.",
    "Moth has left the building. Its wings stayed behind as a warning."
  ]
};

// rounded to 1e-9: 1 - 0.95 is 0.05000000000000004 in floats, which pushed an exact 5% edge into the wrong mood
function houseEdge(rtp) { return Math.max(0, Math.round((1 - rtp) * 1e9) / 1e9); }

function moodFor(rtp) {
  if (typeof rtp !== "number" || !Number.isFinite(rtp) || rtp < 0) throw new RangeError("rtp must be a finite number >= 0");
  const edge = houseEdge(rtp);
  return edge <= EDGE.calm ? "calm" : edge <= EDGE.sweats ? "sweats" : edge <= EDGE.panics ? "panics" : "dead";
}

function emptyLedger() { return { spins: 0, staked: 0, returned: 0 }; }

// Returns a NEW ledger. Replays are copies, not new spins: the caller must not record them.
function record(ledger, result) {
  if (!result || !Number.isInteger(result.bet) || result.bet < 1 || !Number.isInteger(result.payout) || result.payout < 0) {
    throw new TypeError("record() needs a spin result with an integer bet >= 1 and payout >= 0");
  }
  return { spins: ledger.spins + 1, staked: ledger.staked + result.bet, returned: ledger.returned + result.payout };
}

// machineRtp = Slot.analyze().rtp. With zero spins the moth can only quote the machine; after the
// first spin it reads the session and says so (source), because 1 spin is a mood, not a statistic.
function read(ledger, machineRtp) {
  const live = ledger.spins > 0 && ledger.staked > 0;
  const rtp = live ? ledger.returned / ledger.staked : machineRtp;
  const mood = moodFor(rtp);
  const pool = LINES[mood];
  return {
    mood, stamp: STAMP[mood], source: live ? "session" : "machine",
    rtp, edge: houseEdge(rtp), machineRtp, thin: ledger.spins < THIN_SAMPLE,
    spins: ledger.spins, staked: ledger.staked, returned: ledger.returned,
    line: pool[ledger.spins % pool.length]
  };
}

const api = { EDGE, THIN_SAMPLE, STAMP, LINES, houseEdge, moodFor, emptyLedger, record, read };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.MothEngine = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
