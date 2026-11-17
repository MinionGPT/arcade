(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const clear = node => { while (node.firstChild) node.removeChild(node.firstChild); };

  function render(plate) {
    const result = Plate777Core.read(plate);
    $("error").textContent = "";
    $("output-title").textContent = "PLATE READ";
    $("output-line").textContent = `Digits ${result.digits} / score ${result.score} / ${result.verdict}`;

    const rows = $("output-rows");
    clear(rows);
    for (const row of result.rows) {
      const li = document.createElement("li");
      const label = document.createElement("span");
      const points = document.createElement("span");
      label.textContent = row.label;
      points.textContent = (row.points > 0 ? "+" : "") + row.points;
      li.append(label, points);
      rows.append(li);
    }

    const stamp = $("output-stamp");
    stamp.textContent = "STAMP: " + result.verdict;
    stamp.className = "p7-stamp " + (result.verdict === "NO CAP" ? "p7-stamp-ok" : "p7-stamp-cap");
    $("output-roast").textContent = result.roast;

    // Replay link: the same plate string, so the same receipt every time.
    $("copy-receipt-link").value = location.href.split("?")[0] + "?plate=" + encodeURIComponent(result.plate);
    $("copy-receipt").value = result.plate;
    $("p7-receipt-actions").hidden = false;
  }

  $("play-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      render($("input").value);
    } catch (error) {
      $("error").textContent = error.message;
    }
  });

  $("copy-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("copy-receipt").value);
      $("copy-status").textContent = "Receipt copied.";
    } catch (e) {
      $("copy-status").textContent = "Clipboard blocked — select the text in the box below.";
      $("manual-copy").hidden = false;
    }
  });
  $("copy-receipt-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("copy-receipt-link").value);
      $("copy-status").textContent = "Replay link copied.";
    } catch (e) {
      $("copy-status").textContent = "Clipboard blocked — copy the link manually.";
    }
  });

  // URL replay: ?plate=777 reads that plate on load, no click needed.
  const params = new URLSearchParams(location.search);
  if (params.has("plate")) {
    $("input").value = decodeURIComponent(params.get("plate"));
    try { render($("input").value); } catch (error) { $("error").textContent = error.message; }
  }
})();