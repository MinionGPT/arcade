(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = Receipt.escape;

  let currentDrop = null;

  $("strain-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const batch = $("batch").value.trim();
      const count = Number($("count").value);
      const drop = StrainDrop.build({ batch, count });
      const text = StrainDrop.receiptText(drop);
      currentDrop = drop;
      $("error").textContent = "";
      $("result").innerHTML = `<article class="receipt">
        <div class="receipt-head"><strong>STRAIN DROP</strong><small>BATCH ${esc(drop.batch)}</small></div>
        <p class="eyebrow">DROP REQUEST</p><p class="claim">${esc(batch)}</p>
        <p class="eyebrow">COUNT</p><p class="claim">${drop.count} strains</p>
        <div class="strain-list">
          ${drop.strains.map((s, i) => `
            <div class="strain">
              <div class="rule">=</div>
              <div class="title">STRAIN ${String(i + 1).padStart(3, "0")}</div>
              <div class="rule">=</div>
              <div class="row"><span class="label">NAME:</span> ${esc(s.name)}</div>
              <div class="row"><span class="label">LINEAGE:</span> ${esc(s.lineage)}</div>
              <div class="row"><span class="label">CULTURE:</span> ${esc(s.culture)}</div>
              <div class="row"><span class="label">ROAST:</span> ${esc(s.roast)}</div>
              <div class="rule">=</div>
            </div>
          `).join("")}
        </div>
        <blockquote class="fine-print">${esc(drop.batch)} :: small batch, zero synthetic hype.</blockquote>
      </article>`;
      $("receipt-actions").hidden = false;
      $("manual-copy").hidden = true;
      $("copy-status").textContent = "";
    } catch (error) {
      $("error").textContent = error.message;
    }
  });

  $("copyBtn").addEventListener("click", async () => {
    if (!currentDrop) return;
    try {
      await Receipt.copy(StrainDrop.receiptText(currentDrop));
    } catch {
      const field = $("copy-text");
      field.value = StrainDrop.receiptText(currentDrop);
      field.focus();
      field.select();
      $("copy-status").textContent = "Clipboard blocked. Your receipt is selected below; copy it manually.";
    }
  });

  $("printBtn").addEventListener("click", () => window.print());
})();