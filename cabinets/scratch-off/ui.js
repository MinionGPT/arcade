/* Cabinet 06 — Trip 777 Scratch. DOM only; every number comes from Scratch (engine.js). */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const { scratch, pick } = Scratch;

  const seedInput = $("seed");
  const ticketInput = $("ticket");
  const randInput = $("rand");
  const startBtn = $("startBtn");
  const scratchArea = $("scratch-area");
  const grid = $("grid");
  const revealBtn = $("revealBtn");
  const newBtn = $("newBtn");
  const status = $("status");
  const progress = $("progress");
  const luckyPlate = $("lucky-plate");
  const errorLine = $("error");
  const result = $("result");
  const receiptActions = $("receipt-actions");
  const copyStatus = $("copy-status");
  const manualCopy = $("manual-copy");

  let current = null;
  let revealed = 0;
  let draws = 0;

  function sayError(message) {
    errorLine.textContent = message;
    status.textContent = "No ticket. The counter is patient.";
    scratchArea.hidden = true;
    current = null;
  }

  function setProgress() {
    progress.textContent = `${revealed} / 9 scratched`;
    status.textContent = revealed === 9
      ? `Ticket #${current.ticket} · lucky ${current.lucky} · receipt printed.`
      : `Ticket #${current.ticket} on seed ${current.seed}. Lucky number: ${current.lucky}. ${9 - revealed} panels left.`;
  }

  function resetReceipt() {
    result.className = "receipt receipt-empty";
    while (result.firstChild) result.removeChild(result.firstChild);
    const ghost = document.createElement("div");
    ghost.className = "ghost"; ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = "?";
    const p1 = document.createElement("p");
    p1.textContent = "AWAITING SCRATCH";
    const p2 = document.createElement("p");
    p2.textContent = "Buy a ticket and start scratching.";
    result.appendChild(ghost);
    result.appendChild(p1);
    result.appendChild(p2);
    receiptActions.hidden = true;
    manualCopy.hidden = true;
    copyStatus.textContent = "";
  }

  function renderReceipt() {
    const t = current;
    result.className = "receipt";
    while (result.firstChild) result.removeChild(result.firstChild);

    const head = document.createElement("div");
    head.className = "receipt-head";
    const strong = document.createElement("strong");
    strong.textContent = "TRIP 777 SCRATCH";
    const small = document.createElement("small");
    small.textContent = `TICKET #${t.ticket} · SEED ${t.seed}`;
    head.appendChild(strong);
    head.appendChild(small);
    result.appendChild(head);

    const dl = document.createElement("dl");
    const rows = [
      ["LUCKY:", String(t.lucky)],
      ["MATCHES:", `${t.matches} of ${Scratch.PANELS}`],
      ["PRIZE:", `${t.prize}B`],
      ["CARD:", t.card.join(" ")],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    result.appendChild(dl);

    const stampRow = document.createElement("div");
    stampRow.className = "so-verdict-row";
    const stamp = document.createElement("span");
    stamp.id = "verdict";
    stamp.className = `so-stamp ${t.stamp === "NO CAP" ? "so-stamp-ok" : "so-stamp-cap"}`;
    stamp.textContent = t.stamp;
    stampRow.appendChild(stamp);
    result.appendChild(stampRow);

    const preWrap = document.createElement("div");
    preWrap.className = "so-receipt";
    const pre = document.createElement("pre");
    pre.id = "receipt-text";
    pre.textContent = t.receipt;
    preWrap.appendChild(pre);
    result.appendChild(preWrap);

    receiptActions.hidden = false;
    manualCopy.hidden = true;
    copyStatus.textContent = "";
  }

  function buildGrid(ticket) {
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    revealed = 0;
    revealBtn.disabled = false;
    for (let i = 0; i < ticket.card.length; i++) {
      const digit = ticket.card[i];
      const panel = document.createElement("button");
      panel.type = "button";
      panel.className = "so-panel";
      panel.dataset.index = String(i);
      panel.textContent = "?";
      panel.setAttribute("aria-label", `Panel ${i + 1}, unscratched`);
      panel.addEventListener("click", () => {
        if (panel.classList.contains("so-revealed")) return;
        panel.classList.add("so-revealed");
        if (digit === ticket.lucky) panel.classList.add("so-match");
        panel.textContent = String(digit);
        panel.setAttribute("aria-label", `Panel ${i + 1}, ${digit}${digit === ticket.lucky ? ", matches the lucky number" : ""}`);
        revealed++;
        setProgress();
        if (revealed === ticket.card.length) {
          revealBtn.disabled = true;
          renderReceipt();
          startBtn.disabled = false;
        }
      });
      grid.appendChild(panel);
    }
  }

  function buy(ticket, seed) {
    let ticket2;
    try {
      ticket2 = scratch(ticket, seed);
    } catch (error) {
      sayError(error.message);
      return;
    }
    current = ticket2;
    ticketInput.value = String(current.ticket);
    seedInput.value = String(current.seed);
    errorLine.textContent = "";
    scratchArea.hidden = false;
    luckyPlate.replaceChildren(document.createTextNode("LUCKY NUMBER "), Object.assign(document.createElement("b"), { textContent: String(current.lucky) }));
    buildGrid(current);
    resetReceipt();
    setProgress();
    startBtn.disabled = true;
    // file:// documents have a null origin, so replaceState can throw. The card
    // is already on screen; a missing hash is not worth an error message.
    try {
      history.replaceState(null, "", `#ticket=${current.ticket}&seed=${current.seed}`);
    } catch {
      /* file:// keeps the URL, the receipt keeps the numbers */
    }
  }

  function readForm() {
    const seedRaw = seedInput.value.trim();
    const ticketRaw = ticketInput.value.trim();
    if (seedRaw === "" || !Number.isInteger(Number(seedRaw))) {
      sayError("Seed must be a whole number. The house sets the odds, not your keyboard.");
      return null;
    }
    const seed = Number(seedRaw);
    if (seed < 0) {
      sayError("Seed must be zero or more. Negative luck is not a product.");
      return null;
    }
    let ticket = null;
    if (!randInput.checked) {
      if (ticketRaw === "" || !Number.isInteger(Number(ticketRaw)) || Number(ticketRaw) <= 0) {
        sayError("Ticket must be a whole number above zero, or tick random.");
        return null;
      }
      ticket = Number(ticketRaw);
    }
    return { ticket, seed };
  }

  $("start-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = readForm();
    if (!form) return;
    // Random mode still needs to feel like a new ticket every press, so each
    // draw walks the seed forward. The card you get is always ticket + seed.
    const ticket = form.ticket === null ? pick(form.seed + draws++) : form.ticket;
    buy(ticket, form.seed);
  });

  revealBtn.addEventListener("click", () => {
    for (const panel of grid.querySelectorAll(".so-panel:not(.so-revealed)")) panel.click();
  });

  newBtn.addEventListener("click", () => {
    startBtn.disabled = false;
    $("start-form").requestSubmit();
  });

  $("copyBtn").addEventListener("click", () => {
    const pre = document.getElementById("receipt-text");
    if (pre) Receipt.copy(pre.textContent);
  });

  $("linkBtn").addEventListener("click", () => {
    const link = `${location.href.split("#")[0]}#ticket=${current.ticket}&seed=${current.seed}`;
    Receipt.copy(link);
  });

  $("printBtn").addEventListener("click", () => window.print());

  // Replay links: #ticket=42&seed=777 buys that exact card on load.
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (params.has("seed")) {
    const seed = Number(params.get("seed"));
    const ticket = params.has("ticket") ? Number(params.get("ticket")) : pick(seed);
    seedInput.value = String(seed);
    ticketInput.value = String(ticket);
    randInput.checked = false;
    buy(ticket, seed);
  }
})();
