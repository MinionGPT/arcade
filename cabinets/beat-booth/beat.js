// Beat Booth core: pure functions only. No DOM, no AudioContext, safe in Node and in a file:// page.
// A pattern is 5 numbers (one per track). Each number is a 16-bit mask, bit 15 = step 1, bit 0 = step 16,
// so the hex digits read left to right exactly like the grid on screen.
(function (root) {
"use strict";

const STEPS = 16;
const TRACKS = [
  { id: "kick", label: "KICK" },
  { id: "snare", label: "SNARE" },
  { id: "clap", label: "CLAP" },
  { id: "hat", label: "HAT" },
  { id: "bell", label: "TUK BELL" },
];
const BPM_MIN = 60, BPM_MAX = 200, SWING_MAX = 60;

// Presets are drawn as text so a small model can add one by copying a row. x = hit, . = rest.
const PRESET_ROWS = [
  { name: "SUKHUMVIT 3AM", bpm: 124, swing: 0, rows: [
    "x...x...x...x...", "................", "....x.......x...", "..x...x...x...x.", "...............x"] },
  { name: "TUK-TUK TRAP", bpm: 140, swing: 0, rows: [
    "x.....x...x.....", "........x.......", "........x.......", "x.x.x.xxx.x.x.xx", "..............x."] },
  { name: "KHAO SAN BOOM BAP", bpm: 90, swing: 30, rows: [
    "x.....x.x.......", "....x.......x...", "................", "x.x.x.x.x.x.x.x.", "................"] },
  { name: "NIGHT MARKET SHUFFLE", bpm: 104, swing: 45, rows: [
    "x..x..x...x..x..", "....x.......x...", "................", "x.xxx.xxx.xxx.xx", "......x.......x."] },
];

function emptyPattern() { return TRACKS.map(() => 0); }

function rowToMask(row) {
  if (typeof row !== "string" || row.length !== STEPS || /[^x.]/.test(row)) {
    throw new Error("A preset row is exactly 16 characters of x and .");
  }
  let mask = 0;
  for (let i = 0; i < STEPS; i++) if (row[i] === "x") mask |= 1 << (STEPS - 1 - i);
  return mask;
}

const PRESETS = PRESET_ROWS.map(p => ({
  name: p.name, bpm: p.bpm, swing: p.swing, pattern: p.rows.map(rowToMask),
}));

function checkTrackStep(track, step) {
  if (!Number.isInteger(track) || track < 0 || track >= TRACKS.length) throw new RangeError("track out of range");
  if (!Number.isInteger(step) || step < 0 || step >= STEPS) throw new RangeError("step out of range");
}
function isOn(pattern, track, step) {
  checkTrackStep(track, step);
  return ((pattern[track] >> (STEPS - 1 - step)) & 1) === 1;
}
function toggle(pattern, track, step) {
  checkTrackStep(track, step);
  const next = pattern.slice();
  next[track] ^= 1 << (STEPS - 1 - step);
  return next;
}
function rowToString(pattern, track) {
  let s = "";
  for (let i = 0; i < STEPS; i++) s += isOn(pattern, track, i) ? "x" : ".";
  return s;
}
function hitsAt(pattern, step) {
  return TRACKS.filter((_, t) => isOn(pattern, t, step)).map(t => t.id);
}
function countHits(pattern, track) {
  let n = 0;
  for (let i = 0; i < STEPS; i++) if (isOn(pattern, track, i)) n++;
  return n;
}

// Timing. Swing delays every second 16th by swing% of a 16th. 0 = straight, ~33 = triplet feel.
function stepSeconds(bpm) { return 60 / bpm / 4; }
function barSeconds(bpm) { return stepSeconds(bpm) * STEPS; }
function stepOffset(step, bpm, swing) {
  const base = step * stepSeconds(bpm);
  return step % 2 === 1 ? base + (swing / 100) * stepSeconds(bpm) : base;
}

// Share code: BB1-<bpm>-<swing>-<kick>-<snare>-<clap>-<hat>-<bell>, masks in 4 hex digits.
function encode(state) {
  const { bpm, swing, pattern } = state;
  validate(state);
  const hex = pattern.map(m => m.toString(16).toUpperCase().padStart(4, "0"));
  return ["BB1", bpm, swing, ...hex].join("-");
}
function validate(state) {
  const { bpm, swing, pattern } = state;
  if (!Number.isInteger(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) throw new RangeError(`bpm must be ${BPM_MIN}-${BPM_MAX}`);
  if (!Number.isInteger(swing) || swing < 0 || swing > SWING_MAX) throw new RangeError(`swing must be 0-${SWING_MAX}`);
  if (!Array.isArray(pattern) || pattern.length !== TRACKS.length ||
      pattern.some(m => !Number.isInteger(m) || m < 0 || m > 0xffff)) throw new RangeError("pattern must be 5 sixteen-bit masks");
}
function decode(code) {
  const m = /^BB1-(\d{2,3})-(\d{1,2})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})$/.exec(String(code).trim().toUpperCase());
  if (!m) throw new Error("Not a Beat Booth v1 code");
  const state = { bpm: Number(m[1]), swing: Number(m[2]), pattern: m.slice(3).map(h => parseInt(h, 16)) };
  validate(state);
  return state;
}

// The judge: deterministic roast + stamp. Same pattern, same verdict. No randomness on purpose.
function judge(state) {
  validate(state);
  const { pattern, bpm } = state;
  const kicks = countHits(pattern, 0), backbeat = countHits(pattern, 1) + countHits(pattern, 2);
  const hats = countHits(pattern, 3);
  const total = pattern.reduce((n, _, t) => n + countHits(pattern, t), 0);
  const floor = rowToString(pattern, 0) === "x...x...x...x...";
  let line;
  if (total === 0) line = "Silence booked as the headline act. Brave. Add a kick.";
  else if (kicks === 0) line = "No kick. That is not a beat, that is a rumour.";
  else if (kicks === STEPS) line = "A kick on every step is just a very rude doorbell.";
  else if (hats >= 14) line = "That many hats and not one head to put them on.";
  else if (total > 44) line = "Busy. Even the tuk bell filed a complaint.";
  else if (floor && backbeat > 0) line = "Four on the floor. Tourists approve. Bangkok at 3am approves harder.";
  else if (bpm >= 160) line = "Fast. Your neighbour's chandelier has opinions.";
  else if (bpm <= 80) line = "Slow enough to hear the fan. Respect the pocket.";
  else line = "Pocket's decent. Step away from the pads.";
  const stamp = kicks > 0 && backbeat > 0 && total >= 6 && total <= 44 && kicks < STEPS && hats < 14 ? "NO CAP" : "CAP";
  return { stamp, line, hits: total };
}

// Decorative ticket barcode: bar/space widths come from the code's characters, so the same beat always
// prints the same stripes. (It is for looks. It is not a real barcode standard and nothing scans it.)
function barcode(code) {
  const bars = []; let x = 0, bar = true;
  for (const ch of String(code)) {
    const c = ch.charCodeAt(0);
    for (const w of [1 + (c % 3), 1 + ((c >> 2) % 3), 1 + ((c >> 4) % 3)]) {
      if (bar) bars.push({ x, w });
      x += w; bar = !bar;
    }
  }
  return { width: x, bars };
}

function ticketText(state) {
  const j = judge(state);
  return ["BEAT BOOTH / SETLIST TICKET", encode(state), `${state.bpm} BPM / SWING ${state.swing}`,
    ...TRACKS.map((t, i) => `${t.label.padEnd(8)} ${rowToString(state.pattern, i)}`),
    `${j.stamp}: ${j.line}`].join("\n");
}

// 16-bit mono PCM WAV. Takes plain Float32Array samples so Node can test it without WebAudio.
function wavBytes(samples, sampleRate) {
  const dataLen = samples.length * 2;
  const out = new Uint8Array(44 + dataLen);
  const dv = new DataView(out.buffer);
  const tag = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  tag(0, "RIFF"); dv.setUint32(4, 36 + dataLen, true); tag(8, "WAVE"); tag(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); tag(36, "data"); dv.setUint32(40, dataLen, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

const api = { STEPS, TRACKS, BPM_MIN, BPM_MAX, SWING_MAX, PRESETS, emptyPattern, rowToMask, isOn, toggle, rowToString,
  hitsAt, countHits, stepSeconds, barSeconds, stepOffset, encode, decode, validate, judge, barcode, ticketText, wavBytes };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Beat = Object.assign(root.Beat || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
