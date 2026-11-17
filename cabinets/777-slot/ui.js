/* Thin DOM adapter. All scoring/random draws live in slot.js, never here. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = Receipt.escape;
  let busy = false;
  let current = null;
  const rules = { jackpot: "Three sevens", big_win: "Two sevens / non-skull triple", win: "Non-skull pair", meh: "Otherwise: seven, gem or clover", loss: "Everything else (skulls too)" };
  $("paytable").innerHTML = Object.entries(rules).map(([tier, label]) => `<dt>${esc(label)}</dt><dd>${Slot.PAYTABLE[tier]}×</dd>`).join("");

  function showReels(symbols) {
    $("reels").innerHTML = symbols.map(s => `<div class="reel">${esc(s.name === "SEVEN" ? "7" : s.emoji)}<small>${esc(s.name)}</small></div>`).join("");
    $("reels").setAttribute("aria-label", symbols.map(s => s.name).join(", "));
  }

  function render(result, replay) {
    showReels(result.spins);
    $("result").innerHTML = `<article class="receipt">
      <div class="receipt-head"><strong>TRIP 777</strong><small>${replay ? "REPLAY COPY" : "ORIGINAL DRAW"} / NO CASH VALUE</small></div>
      <div class="ticket-id">${esc(result.ticket)}</div>
      <div class="verdict">${esc(result.tier.replace("_", " "))}</div>
      <dl><dt>REELS</dt><dd>${result.spins.map(s => esc(s.name)).join(" / ")}</dd>
      <dt>STAKE</dt><dd>${result.bet} credits</dd><dt>RETURN</dt><dd>${result.payout} credits</dd><dt>STAMP</dt><dd>${esc(result.stamp)}</dd></dl>
      <blockquote>${esc(result.roast)}</blockquote><div class="fine-print">PLAY MONEY ONLY. Return includes stake.<br>Replay is a copy, not another win. Tickets are not signed or tamper-proof.</div>
    </article>`;
    $("ticket").value = result.ticket;
    $("receipt-actions").hidden = false;
    $("manual-copy").hidden = true;
    $("copy-status").textContent = "";
    current = result;
    // moth.js listens (it loads first). Replays are flagged so the session ledger can ignore them.
    document.dispatchEvent(new CustomEvent("slot:result", { detail: { result, replay: Boolean(replay) } }));
  }

  function animate(result) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    return new Promise(resolve => {
      const start = performance.now();
      function frame(now) {
        const elapsed = Math.max(0, now - start); // rAF timestamps can predate performance.now(): a negative index froze the button
        showReels(result.spins.map((s, i) => elapsed > 350 + i * 180 ? s
          : Slot.REEL_SYMBOLS[(Math.floor(elapsed / 85) + i * 2) % Slot.REEL_SYMBOLS.length]));
        if (elapsed < 900) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  async function play(seed, bet, replay) {
    if (busy) return;
    busy = true;
    $("error").textContent = "";
    for (const id of ["spinBtn", "replayBtn", "bet", "ticket"]) $(id).disabled = true;
    $("receipt-actions").hidden = true;
    $("spinBtn").textContent = replay ? "READING RECEIPT…" : "LET IT ROLL…";
    try {
      // Capture stake and result before the animation; edits cannot change payout.
      const result = Slot.spin(seed, bet);
      $("bet").value = bet;
      if (!replay) await animate(result);
      render(result, replay);
    } catch (error) {
      $("error").textContent = error.message;
      $("receipt-actions").hidden = !current;
    } finally {
      busy = false;
      for (const id of ["spinBtn", "replayBtn", "bet", "ticket"]) $(id).disabled = false;
      $("spinBtn").textContent = "PULL THE LEVER ↘";
    }
  }

  $("spin-form").addEventListener("submit", event => {
    event.preventDefault();
    if (busy || !$("spin-form").reportValidity()) return;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    play(seed, Number($("bet").value), false);
  });
  $("replay-form").addEventListener("submit", event => {
    event.preventDefault();
    if (busy) return;
    try {
      const { seed, bet } = Slot.parseTicket($("ticket").value);
      play(seed, bet, true);
    } catch (error) { $("error").textContent = error.message; }
  });
  $("copyBtn").addEventListener("click", () => { if (current) Receipt.copy(Slot.receiptText(current)); });
  $("linkBtn").addEventListener("click", () => {
    if (!current) return;
    const link = new URL(window.location.href);
    link.search = "";
    link.hash = new URLSearchParams({ ticket: current.ticket }).toString();
    Receipt.copy(link.href);
  });
  $("printBtn").addEventListener("click", () => window.print());
  function replayHash() {
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    if (ticket === null || busy) return;
    try {
      const { seed, bet } = Slot.parseTicket(ticket);
      play(seed, bet, true);
    } catch (error) { $("error").textContent = error.message; }
  }
  window.addEventListener("hashchange", replayHash);
  replayHash();
})();
