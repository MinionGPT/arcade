(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let last = null;
  function render(result) {
    last = result;
    $("error").textContent = "";
    $("draw-title").textContent = "TOTO 777 — LOTTO DRAW";
    $("draw-ticket").textContent = "PICK: " + result.ticket + "   DRUM SEED: " + result.seed;
    $("draw-drum").textContent = "DRUM: " + result.drawn.join("  ");
    $("draw-matches").textContent = "MATCHES: " + result.matches + " of 1";
    $("draw-prize").textContent = "PRIZE:   " + result.prize + "B";
    $("draw-stamp").textContent = "STAMP:   " + result.stamp;
    $("draw-stamp").className = "tt-stamp " + (result.stamp === "NO CAP" ? "tt-stamp-ok" : "tt-stamp-cap");
    $("draw-roast").textContent = result.receipt.split("\n").slice(-2).join(" ");
    $("draw-receipt").textContent = result.receipt;
    $("draw-receipt-actions").hidden = false;
    $("copy-receipt").value = result.receipt;
    $("copy-receipt-link").value = location.href.split("?")[0] + "?ticket=" + result.ticket + "&seed=" + result.seed;
  }
  $("draw-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const ticket = parseInt($("ticket").value, 10);
      const seed = parseInt($("seed").value, 10);
      render(Toto777.draw(ticket, seed));
    } catch (error) { $("error").textContent = error.message; }
  });
  $("pick-btn").addEventListener("click", () => {
    const seed = parseInt($("seed").value, 10) || 0;
    $("ticket").value = Toto777.pick(seed);
  });
  $("copy-btn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("copy-receipt").value); $("copy-status").textContent = "Receipt copied."; }
    catch (e) { $("copy-status").textContent = "Clipboard blocked — select the text in the box below."; $("manual-copy").hidden = false; }
  });
  $("copy-receipt-link").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("copy-receipt-link").value); $("copy-status").textContent = "Replay link copied."; }
    catch (e) { $("copy-status").textContent = "Clipboard blocked — copy the link manually."; }
  });
  const params = new URLSearchParams(location.search);
  if (params.has("ticket") && params.has("seed")) {
    const t = parseInt(params.get("ticket"), 10), s = parseInt(params.get("seed"), 10);
    if (Number.isInteger(t) && Number.isInteger(s)) render(Toto777.draw(t, s));
  }
})();