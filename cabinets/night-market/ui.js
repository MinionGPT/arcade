(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const {
    VENDORS,
    mulberry32,
    openState,
    step,
    play,
    makeBot,
    stampFor,
    receiptText,
    parseOffer,
  } = NightMarket;

  const vendorInput = $("vendor");
  const seedInput = $("seed");
  const budgetInput = $("budget");
  const botInput = $("bot");
  const startBtn = $("startBtn");
  const offerInput = $("offer");
  const sendBtn = $("sendBtn");
  const payBtn = $("payBtn");
  const walkBtn = $("walkBtn");
  const transcript = $("transcript");
  const status = $("status");
  const result = $("result");
  const receiptActions = $("receipt-actions");
  const copyBtn = $("copyBtn");
  const printBtn = $("printBtn");
  const copyStatus = $("copy-status");
  const manualCopy = $("manual-copy");

  let state = null;

  function renderLine(text, klass) {
    const div = document.createElement("div");
    div.textContent = text;
    if (klass) div.className = klass;
    transcript.appendChild(div);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function resetEmptyReceipt() {
    result.hidden = true;
    result.className = "receipt receipt-empty";
    while (result.firstChild) result.removeChild(result.firstChild);
    const ghost = document.createElement("div");
    ghost.className = "ghost"; ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = "?";
    const p1 = document.createElement("p");
    p1.textContent = "AWAITING HAGGLE";
    const p2 = document.createElement("p");
    p2.textContent = "Start a stall and watch the receipt print.";
    result.appendChild(ghost);
    result.appendChild(p1);
    result.appendChild(p2);
  }

  function renderStatus() {
    if (!state) return;
    status.textContent = `ASK: ${state.ask}B  |  nerve left ${state.patience}  |  round ${state.rnd}`;
  }

  function setInput(enabled) {
    offerInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    payBtn.disabled = !enabled;
    walkBtn.disabled = !enabled;
  }

  function endGame(outcome) {
    setInput(false);
    startBtn.disabled = false;

    result.hidden = false;
    result.className = "receipt";
    while (result.firstChild) result.removeChild(result.firstChild);

    const head = document.createElement("div");
    head.className = "receipt-head";
    const title = document.createElement("strong");
    title.textContent = "NIGHT MARKET RECEIPT";
    const stall = document.createElement("small");
    stall.textContent = `${outcome.vendor.name} • ${outcome.vendor.stall}`;
    head.appendChild(title);
    head.appendChild(stall);
    result.appendChild(head);

    const dl = document.createElement("dl");
    dl.className = "receipt-dl";
    const stamp = stampFor(outcome);
    const rows = [
      ["ITEM:", outcome.vendor.item],
      ["ASKED:", `${outcome.ask0}B`],
      ["YOU PAID:", outcome.deal ? `${outcome.paid}B` : "0B"],
      ["YOU SAVED:", outcome.deal ? `${outcome.ask0 - outcome.paid}B` : "0B"],
      ["ROUNDS:", String(outcome.rounds)],
      ["OUTCOME:", outcome.why],
      ["STAMP:", stamp],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      if (label === "STAMP:") {
        dd.className = `nm-stamp ${stamp === "NO CAP" ? "nm-stamp-ok" : "nm-stamp-cap"}`;
      }
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    result.appendChild(dl);

    const story = document.createElement("blockquote");
    story.className = "fine-print";
    story.textContent = NightMarket.storyFor(outcome);
    result.appendChild(story);

    const preWrap = document.createElement("div");
    preWrap.className = "nm-receipt";
    const pre = document.createElement("pre");
    pre.id = "receipt-text";
    pre.textContent = receiptText(outcome);
    preWrap.appendChild(pre);
    result.appendChild(preWrap);

    receiptActions.hidden = false;
    copyStatus.textContent = "";
    manualCopy.hidden = true;
  }

  $("start-form").addEventListener("submit", event => {
    event.preventDefault();
    const vendor = VENDORS[vendorInput.value];
    const seed = Number.parseInt(seedInput.value, 10) || 777;
    const budget = Number(budgetInput.value) || 0.70;

    transcript.textContent = "";
    resetEmptyReceipt();
    receiptActions.hidden = true;
    copyStatus.textContent = "";
    manualCopy.hidden = true;

    if (botInput.checked) {
      const outcome = play(vendor, makeBot(budget, 0.80), seed);
      outcome.transcript.forEach((line, i) => {
        const klass =
          i === 0 ? "nm-opener" : line.startsWith("You:") ? "nm-you" : "nm-vendor";
        renderLine(line, klass);
      });
      status.textContent = `Bot played ${outcome.rounds} rounds — ${outcome.why}.`;
      endGame(outcome);
      offerInput.focus();
      return;
    }

    state = openState(vendor, seed);
    state.transcript.forEach((line, i) => {
      renderLine(line, i === 0 ? "nm-opener" : "");
    });
    renderStatus();
    setInput(true);
    startBtn.disabled = true;
    offerInput.focus();
  });

  function handleAction(action) {
    if (!state || state.done) return;
    const out = step(state, action);
    out.lines.forEach(line => {
      renderLine(line, line.startsWith("You:") ? "nm-you" : "nm-vendor");
    });
    renderStatus();
    offerInput.value = "";
    if (out.done) endGame(out.result);
  }

  $("send-form").addEventListener("submit", event => {
    event.preventDefault();
    const action = parseOffer(offerInput.value);
    if (!action) {
      renderLine("That is not a number, friend. The vendor is waiting.", "nm-error");
      offerInput.focus();
      return;
    }
    handleAction(action);
  });

  payBtn.addEventListener("click", () => handleAction(["pay"]));
  walkBtn.addEventListener("click", () => handleAction(["walk"]));

  copyBtn.addEventListener("click", async () => {
    try {
      await Receipt.copy(document.getElementById("receipt-text").textContent);
    } catch {
      // Receipt.copy already renders the manual-copy fallback.
    }
  });

  printBtn.addEventListener("click", () => window.print());
})();
