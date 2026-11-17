(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const clear = node => { while (node.firstChild) node.removeChild(node.firstChild); };

  function render(seed) {
    const r = MothMarketsCore.run(seed);
    $("error").textContent = "";
    const f = r.final;
    const sign = f.returnPct >= 0 ? "+" : "";
    $("output-title").textContent = `MOTH MARKETS / BATCH ${r.seed}`;
    $("output-line").textContent =
      `END NET ${f.endNet.toFixed(2)} / RETURN ${sign}${f.returnPct.toFixed(2)}% / FEES ${f.feesPaid.toFixed(2)}`;

    const rows = $("output-rows");
    clear(rows);
    const head = document.createElement("li");
    head.className = "mm-head";
    for (const text of ["DAY", "PRICE", "MOOD", "ACTION", "NET"]) {
      const cell = document.createElement("span");
      cell.textContent = text;
      head.append(cell);
    }
    rows.append(head);
    for (const row of r.rows) {
      const li = document.createElement("li");
      const day = document.createElement("span");
      day.textContent = "D" + String(row.day).padStart(2, "0");
      const price = document.createElement("span");
      price.textContent = row.price.toFixed(2);
      const mood = document.createElement("span");
      mood.textContent = row.mood;
      mood.className = "mm-mood " + ({ calm: "mm-calm", sweats: "mm-sweats", panics: "mm-panics", dead: "mm-dead" }[row.mood]);
      const action = document.createElement("span");
      action.textContent = row.action;
      const net = document.createElement("span");
      net.textContent = row.net.toFixed(2);
      li.append(day, price, mood, action, net);
      rows.append(li);
    }

    const sums = $("output-summary");
    clear(sums);
    const stats = [
      ["TRADES", String(f.trades)],
      ["MAX DRAWDOWN", f.maxDrawdownPct.toFixed(2) + "%"],
      ["START BANKROLL", f.startCash.toFixed(2)],
      ["MOODS", `calm ${r.moodCounts.calm} / sweats ${r.moodCounts.sweats} / panics ${r.moodCounts.panics} / dead ${r.moodCounts.dead}`]
    ];
    for (const [label, value] of stats) {
      const li = document.createElement("li");
      const l = document.createElement("span");
      const v = document.createElement("span");
      l.textContent = label;
      v.textContent = value;
      li.append(l, v);
      sums.append(li);
    }

    const stamp = $("output-stamp");
    stamp.textContent = "STAMP: " + r.verdict;
    stamp.className = "mm-stamp " + (r.verdict === "NO CAP" ? "mm-stamp-ok" : "mm-stamp-cap");
    $("output-roast").textContent = r.roast;

    // Statement + replay link: the copy buttons.
    $("copy-statement").value = MothMarketsCore.statement(r).join("\n");
    $("copy-replay-link").value = location.href.split("?")[0] + "?seed=" + encodeURIComponent(r.seed);
    $("mm-receipt-actions").hidden = false;
  }

  $("play-form").addEventListener("submit", event => {
    event.preventDefault();
    try { render($("input").value); } catch (error) { $("error").textContent = error.message; }
  });

  $("copy-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("copy-statement").value);
      $("copy-status").textContent = "Statement copied.";
    } catch (e) {
      $("copy-status").textContent = "Clipboard blocked — select the text in the box below.";
      $("manual-copy").hidden = false;
    }
  });
  $("copy-link-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("copy-replay-link").value);
      $("copy-status").textContent = "Replay link copied.";
    } catch (e) {
      $("copy-status").textContent = "Clipboard blocked — copy the link manually.";
    }
  });

  // URL replay: ?seed=8 prints the same statement on load, no click needed.
  const params = new URLSearchParams(location.search);
  if (params.has("seed")) {
    $("input").value = params.get("seed");
    try { render($("input").value); } catch (error) { $("error").textContent = error.message; }
  }
})();
