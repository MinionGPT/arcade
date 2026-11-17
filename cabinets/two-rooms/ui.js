/* Two Rooms Over — Cabinet 09 UI. DOM only, textContent/createElement only, no innerHTML.
 * The engine owns every quote, room and number; this file just paints them. */
(function () {
  "use strict";
  const q = id => document.getElementById(id);
  const C = window.TwoRoomsCore;
  const pad = n => String(n).padStart(2, "0");

  let seed = 777, deckNo = 1, cases = [], index = 0, answers = [], selection = null, locked = false;

  function seedFromUrl() {
    const value = parseInt(new URLSearchParams(location.search).get("seed"), 10);
    return Number.isInteger(value) ? value : 777;
  }

  // Deck 1 came first; anything that is not deck 2 is deck 1. The engine refuses a fake deck,
  // the URL just has to be forgiving.
  function deckFromUrl() {
    const value = parseInt(new URLSearchParams(location.search).get("deck"), 10);
    return value === 2 ? 2 : 1;
  }

  function buildDecks() {
    for (const n of [1, 2]) {
      const link = q("deck-" + n);
      const on = n === deckNo;
      link.href = "index.html?seed=" + seed + "&deck=" + n;
      link.classList.toggle("tr-deck-on", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }

  function roomLabel(id) { return C.ROOMS.find(r => r.id === id).label; }

  function buildRooms() {
    const box = q("room-buttons");
    for (const room of C.ROOMS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tr-room";
      button.dataset.room = room.id;
      button.setAttribute("aria-pressed", "false");
      const name = document.createElement("b");
      name.textContent = room.label;
      const blurb = document.createElement("small");
      blurb.textContent = room.blurb;
      button.append(name, blurb);
      button.addEventListener("click", () => select(room.id));
      box.append(button);
    }
  }

  function select(id) {
    if (locked) return;
    selection = id;
    for (const button of document.querySelectorAll(".tr-room")) {
      const on = button.dataset.room === id;
      button.setAttribute("aria-pressed", String(on));
      button.classList.toggle("tr-room-on", on);
    }
    q("error").textContent = "";
  }

  function renderCase() {
    const card = cases[index];
    q("case-plate").textContent = "SEED " + seed + " · DECK " + deckNo + " · CASE " + pad(index + 1) + " / " + pad(cases.length) + " — FIVE ROOMS, ONE BUG";
    q("case-symptom").textContent = "“" + card.quote + "”";
    q("case-source").textContent = "EVIDENCE: " + card.source + " · LOG " + card.id;
    locked = false;
    selection = null;
    for (const button of document.querySelectorAll(".tr-room")) {
      button.disabled = false;
      button.setAttribute("aria-pressed", "false");
      button.classList.remove("tr-room-on");
    }
    q("verdict-title").textContent = "CASE " + pad(index + 1) + " OPEN";
    q("verdict-line").textContent = "Read the symptom. Pick the room.";
    q("verdict-room").textContent = "";
    q("verdict-tell").textContent = "";
    q("verdict-evidence").textContent = "";
    q("verdict-stamp").hidden = true;
    q("next-btn").textContent = index === cases.length - 1 ? "CLOSE THE FILE" : "NEXT CASE →";
    q("next-btn").disabled = true;
    q("final-receipt").hidden = true;
    q("final-actions").hidden = true;
    q("error").textContent = "";
  }

  function answer() {
    if (locked) return;
    if (!selection) { q("error").textContent = "Pick a room first. Five options, one bug."; return; }
    const card = cases[index];
    const verdict = C.judge(card.id, selection);
    answers.push({ cardId: card.id, room: selection });
    locked = true;
    for (const button of document.querySelectorAll(".tr-room")) button.disabled = true;
    q("verdict-title").textContent = verdict.correct ? "CASE " + pad(index + 1) + " — FOUND IT" : "CASE " + pad(index + 1) + " — WRONG ROOM";
    q("verdict-line").textContent = C.line(seed, index, verdict.correct);
    q("verdict-room").textContent = "YOU SAID: " + verdict.answer.label + "   BUG WAS: " + roomLabel(card.room);
    q("verdict-tell").textContent = card.tell;
    q("verdict-evidence").textContent = "STAMPED FROM: " + card.source + " · LOG " + card.id;
    const stamp = q("verdict-stamp");
    stamp.hidden = false;
    stamp.textContent = "STAMP: " + (verdict.correct ? "NO CAP" : "CAP");
    stamp.className = "tr-stamp " + (verdict.correct ? "tr-stamp-ok" : "tr-stamp-cap");
    q("next-btn").disabled = false;
    q("error").textContent = "";
  }

  function next() {
    if (!locked) return;
    if (index < cases.length - 1) { index += 1; renderCase(); return; }
    const scored = C.score(seed, answers, deckNo);
    q("verdict-title").textContent = "CASE FILE CLOSED";
    q("verdict-line").textContent = "FOUND " + scored.correct + " OF " + scored.total + ". THE REST ARE STILL IN THE CODE.";
    q("verdict-room").textContent = "";
    q("verdict-tell").textContent = "";
    q("verdict-evidence").textContent = "";
    const stamp = q("verdict-stamp");
    stamp.hidden = false;
    stamp.textContent = "STAMP: " + scored.stamp;
    stamp.className = "tr-stamp " + (scored.stamp === "NO CAP" ? "tr-stamp-ok" : "tr-stamp-cap");
    q("final-receipt").textContent = scored.receipt;
    q("final-receipt").hidden = false;
    q("next-btn").disabled = true;
    q("new-deck").href = "index.html?seed=" + (seed + 1) + "&deck=" + deckNo;
    q("final-actions").hidden = false;
  }

  function init() {
    seed = seedFromUrl();
    deckNo = deckFromUrl();
    cases = C.deck(seed, deckNo);
    buildDecks();
    buildRooms();
    q("answer-form").addEventListener("submit", event => { event.preventDefault(); answer(); });
    q("next-btn").addEventListener("click", next);
    q("new-deck").href = "index.html?seed=" + (seed + 1) + "&deck=" + deckNo;
    renderCase();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
