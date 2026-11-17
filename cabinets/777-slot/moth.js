/* Lucky Moth session watch. Listens for "slot:result" from ui.js, keeps the session ledger,
   asks MothEngine for the mood and paints it. All maths lives in moth-engine.js and slot.js. */
(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const root = byId("lucky-moth");
  const machine = Slot.analyze();             // exact enumeration, not a constant
  let ledger = MothEngine.emptyLedger();
  let replays = 0;

  const pct = v => (v * 100).toFixed(2) + "%";
  const set = (id, text) => { byId(id).textContent = text; };

  function paint() {
    const r = MothEngine.read(ledger, machine.rtp);
    root.dataset.mood = r.mood;
    root.dataset.source = r.source;
    byId("moth-stamp").textContent = r.stamp;
    byId("moth-stamp").dataset.stamp = r.stamp;
    set("moth-mood", r.mood.toUpperCase());
    set("moth-source", r.source === "session" ? "READING: YOUR SESSION" : "READING: THE MACHINE");
    set("moth-line", r.line);
    set("moth-spins", String(r.spins));
    set("moth-staked", r.staked + " cr");
    set("moth-returned", r.returned + " cr");
    set("moth-session-rtp", r.source === "session" ? pct(r.rtp) : "no spins yet");
    set("moth-machine-rtp", pct(r.machineRtp));
    set("moth-edge", pct(r.edge));
    set("moth-jackpot", "1 in " + Math.round(1 / machine.odds.jackpot));
    set("moth-replays", String(replays));
    set("moth-thin", r.spins === 0 ? "NO SPINS YET. THE MOTH IS QUOTING THE MACHINE, NOT YOU."
      : r.thin ? `THIN SAMPLE: ${r.spins} SPIN${r.spins === 1 ? "" : "S"}. THE MOTH OVERREACTS. THAT IS ITS JOB.`
      : `${r.spins} SPINS. A BIGGER SAMPLE, STILL NOT A SYSTEM.`);
  }

  document.addEventListener("slot:result", event => {
    const { result, replay } = event.detail;
    if (replay) replays += 1;                  // a replay is a copy, not another spin: it never touches the ledger
    else ledger = MothEngine.record(ledger, result);
    paint();
  });
  byId("mothReset").addEventListener("click", () => { ledger = MothEngine.emptyLedger(); replays = 0; paint(); });
  paint();
})();
