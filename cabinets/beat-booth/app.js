// Beat Booth UI glue. All logic that can be tested lives in beat.js; this file only touches the DOM.
(function () {
"use strict";
const B = window.Beat;
const $ = id => document.getElementById(id);
const els = { play: $("play"), preset: $("preset"), bpm: $("bpm"), bpmOut: $("bpmOut"), swing: $("swing"),
  swingOut: $("swingOut"), clear: $("clear"), grid: $("grid"), rows: $("rows"), verdict: $("verdict"),
  line: $("line"), code: $("code"), load: $("load"), copy: $("copy"), bounce: $("bounce"), status: $("status") };

let state = clone(B.PRESETS[0]);
let pads = [];          // pads[track][step] -> button
let headers = [];       // step number cells
let paint = null;       // true/false while dragging, null otherwise
const muted = B.TRACKS.map(() => false);   // UI-only: mutes are not part of the share code
function audible() { return { bpm: state.bpm, swing: state.swing, pattern: state.pattern.map((m, t) => (muted[t] ? 0 : m)) }; }
const engine = B.createEngine(audible);

function clone(p) { return { bpm: p.bpm, swing: p.swing, pattern: p.pattern.slice() }; }
function say(msg) { els.status.textContent = msg; }

function buildGrid() {
  const head = document.createElement("div");
  head.className = "bb-row bb-steps";
  head.innerHTML = '<span class="bb-label"></span>';
  const hp = document.createElement("div"); hp.className = "bb-pads";
  for (let g = 0; g < 4; g++) {
    const grp = document.createElement("div"); grp.className = "bb-group";
    for (let i = 0; i < 4; i++) {
      const s = document.createElement("span"); s.textContent = String(g * 4 + i + 1);
      headers.push(s); grp.appendChild(s);
    }
    hp.appendChild(grp);
  }
  head.appendChild(hp); els.grid.appendChild(head);

  B.TRACKS.forEach((track, t) => {
    const row = document.createElement("div"); row.className = "bb-row"; row.dataset.track = track.id;
    const label = document.createElement("button"); label.type = "button"; label.className = "bb-label";
    label.textContent = track.label; label.title = "Click to mute " + track.label; label.setAttribute("aria-pressed", "false");
    label.setAttribute("aria-label", "Mute " + track.label);
    label.addEventListener("click", () => {
      muted[t] = !muted[t]; label.setAttribute("aria-pressed", String(muted[t]));
      row.classList.toggle("muted", muted[t]); say(track.label + (muted[t] ? " muted. The code keeps its notes." : " back on."));
    });
    const wrap = document.createElement("div"); wrap.className = "bb-pads";
    pads[t] = [];
    for (let g = 0; g < 4; g++) {
      const grp = document.createElement("div"); grp.className = "bb-group";
      for (let i = 0; i < 4; i++) {
        const s = g * 4 + i;
        const b = document.createElement("button");
        b.type = "button"; b.className = "bb-pad"; b.dataset.t = t; b.dataset.s = s;
        b.setAttribute("aria-label", `${track.label} step ${s + 1}`);
        pads[t][s] = b; grp.appendChild(b);
      }
      wrap.appendChild(grp);
    }
    row.append(label, wrap); els.grid.appendChild(row);
  });
}

function setPad(t, s, on) {
  if (B.isOn(state.pattern, t, s) !== on) state.pattern = B.toggle(state.pattern, t, s);
}

els.grid.addEventListener("pointerdown", e => {
  const b = e.target.closest(".bb-pad"); if (!b) return;
  e.preventDefault();
  const t = +b.dataset.t, s = +b.dataset.s;
  paint = !B.isOn(state.pattern, t, s);
  setPad(t, s, paint); sync();
});
els.grid.addEventListener("pointerover", e => {
  const b = e.target.closest(".bb-pad"); if (!b || paint === null) return;
  setPad(+b.dataset.t, +b.dataset.s, paint); sync();
});
window.addEventListener("pointerup", () => { paint = null; });
els.grid.addEventListener("click", e => { // keyboard activation only; mouse is handled on pointerdown
  const b = e.target.closest(".bb-pad");
  if (!b || e.detail !== 0) return;
  state.pattern = B.toggle(state.pattern, +b.dataset.t, +b.dataset.s); sync();
});

function sync(opts) {
  const o = opts || {};
  pads.forEach((row, t) => row.forEach((b, s) => {
    const on = B.isOn(state.pattern, t, s);
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
  }));
  els.bpm.value = state.bpm; els.bpmOut.textContent = state.bpm;
  els.swing.value = state.swing; els.swingOut.textContent = state.swing + "%";
  const code = B.encode(state);
  if (document.activeElement !== els.code || o.force) els.code.value = code;
  els.rows.textContent = B.TRACKS.map((t, i) => `${t.label.padEnd(8)} ${B.rowToString(state.pattern, i)}`).join("\n") +
    `\n${"".padEnd(8)} ${state.bpm} BPM · SWING ${state.swing}`;
  const j = B.judge(state);
  els.verdict.textContent = j.stamp;
  els.verdict.className = "bb-verdict " + (j.stamp === "NO CAP" ? "nocap" : "cap");
  els.line.textContent = j.line;
  const bc = B.barcode(code);
  $("barcode").innerHTML = `<svg viewBox="0 0 ${bc.width} 10" preserveAspectRatio="none" focusable="false">` +
    bc.bars.map(b => `<rect x="${b.x}" y="0" width="${b.w}" height="10"/>`).join("") + "</svg>";
  const match = B.PRESETS.findIndex(p => B.encode(p) === code);
  els.preset.value = match === -1 ? "custom" : String(match);
  try { history.replaceState(null, "", "#" + code); } catch (e) { /* file:// in some browsers */ }
}

function load(next, label) {
  state = clone(next); sync({ force: true }); if (label) say(label);
}

B.PRESETS.forEach((p, i) => {
  const o = document.createElement("option"); o.value = String(i); o.textContent = `${p.name} · ${p.bpm}`;
  els.preset.appendChild(o);
});
const custom = document.createElement("option"); custom.value = "custom"; custom.textContent = "— your beat —"; custom.hidden = true;
els.preset.appendChild(custom);
els.preset.addEventListener("change", () => { const p = B.PRESETS[+els.preset.value]; if (p) load(p, "Loaded " + p.name + "."); });

els.bpm.addEventListener("input", () => { state.bpm = +els.bpm.value; sync(); });
els.swing.addEventListener("input", () => { state.swing = +els.swing.value; sync(); });
els.clear.addEventListener("click", () => { state.pattern = B.emptyPattern(); sync(); say("Cleared. The silence is yours."); });

els.load.addEventListener("click", () => {
  try { load(B.decode(els.code.value), "Code loaded."); els.preset.value = "custom"; }
  catch (e) { say("That code is not a Beat Booth v1 code: it should look like BB1-124-0-8888-0000-0808-2222-0001"); }
});
els.copy.addEventListener("click", async () => {
  const code = B.encode(state);
  try { await navigator.clipboard.writeText(code); say("Copied " + code); }
  catch (e) { els.code.focus(); els.code.select(); say("Press Cmd/Ctrl+C to copy the selected code."); }
});

els.bounce.addEventListener("click", async () => {
  els.bounce.disabled = true; say("Rendering two bars…");
  try {
    const r = await B.bounce(audible(), 2);
    const bytes = B.wavBytes(r.samples, r.sampleRate);
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    const a = document.createElement("a"); a.href = url; a.download = "beat-booth-" + B.encode(state) + ".wav";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    say(`Bounced ${(r.samples.length / r.sampleRate).toFixed(1)} s, ${Math.round(bytes.length / 1024)} KB.`);
  } catch (e) { say("Bounce failed: " + e.message); }
  els.bounce.disabled = false;
});

async function toggle() {
  if (engine.running) { engine.stop(); els.play.textContent = "PLAY"; els.play.setAttribute("aria-pressed", "false"); clearHead(); return; }
  try { await engine.start(); } catch (e) { say("No sound: " + e.message); return; }
  els.play.textContent = "STOP"; els.play.setAttribute("aria-pressed", "true"); say("");
  requestAnimationFrame(frame);
}
els.play.addEventListener("click", toggle);
window.addEventListener("keydown", e => {
  if (e.code !== "Space" || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
  e.preventDefault(); toggle();
});

let lastStep = -1;
function clearHead() {
  document.querySelectorAll(".now").forEach(n => n.classList.remove("now")); lastStep = -1;
}
function frame() {
  if (!engine.running) return;
  const s = engine.currentStep();
  if (s !== -1 && s !== lastStep) {
    clearHead(); lastStep = s;
    headers[s].classList.add("now"); pads.forEach(row => row[s].classList.add("now"));
    els.grid.dataset.step = String(s + 1);
  }
  requestAnimationFrame(frame);
}

buildGrid();
const fromHash = decodeURIComponent((location.hash || "").slice(1));
if (fromHash) { try { state = B.decode(fromHash); els.preset.value = "custom"; } catch (e) { say("Ignored a bad code in the link."); } }
sync({ force: true });
})();
