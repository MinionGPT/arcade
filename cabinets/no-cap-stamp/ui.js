(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = Receipt.escape;
  let current = null;
  $("stamp-form").addEventListener("submit", event => {
    event.preventDefault();
    $("error").textContent = "";
    try {
      const result = Stamp.build({ claim: $("claim").value, verdict: $("verdict").value, evidence: $("evidence").value });
      $("result").innerHTML = `<article class="receipt">
        <div class="receipt-head"><strong>CAP DEPT.</strong><small>USER OPINION / NOT INDEPENDENTLY VERIFIED</small></div>
        <p class="eyebrow">The claim</p><p class="claim">${esc(result.claim)}</p>
        <p class="eyebrow">Your verdict</p><div class="verdict">${esc(result.label)}</div>
        <p class="eyebrow">Your evidence note (unverified)</p><p class="evidence">${esc(result.evidence || "None supplied.")}</p>
        <blockquote>${esc(result.roast)}</blockquote><strong>${esc(result.tail)}</strong>
        <div class="fine-print">A stamp is not evidence. This receipt records its author's opinion, not an independent fact-check.</div>
      </article>`;
      current = result;
      $("receipt-actions").hidden = false;
      $("manual-copy").hidden = true;
      $("copy-status").textContent = "";
    } catch (error) { $("error").textContent = error.message; }
  });
  $("copyBtn").addEventListener("click", () => { if (current) Receipt.copy(Stamp.receiptText(current)); });
  $("printBtn").addEventListener("click", () => window.print());
})();
