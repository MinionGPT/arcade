(function () {
  "use strict";
  var Core = window.GrowSheetCore;
  var q = function (id) { return document.getElementById(id); };

  function row(dl, label, value) {
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function terpRow(host, name, pct, isTop) {
    var li = document.createElement("li");
    li.className = "gs-terp" + (isTop ? " gs-top" : "");
    var nm = document.createElement("span");
    nm.className = "gs-terp-name";
    nm.textContent = name;
    var bar = document.createElement("span");
    bar.className = "gs-bar";
    var fill = document.createElement("i");
    fill.className = "gs-bar-fill";
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    var pc = document.createElement("span");
    pc.className = "gs-pct";
    pc.textContent = pct.toFixed(1) + "%";
    li.appendChild(nm);
    li.appendChild(bar);
    li.appendChild(pc);
    host.appendChild(li);
  }

  var current = null;

  function render(seed) {
    var ticket = Core.ticketFor(seed);
    var b = Core.replay(ticket);
    current = b;
    q("sheet").hidden = false;
    q("copyBtn").disabled = false;
    q("printBtn").disabled = false;
    q("seed").value = seed;
    q("ticket").value = ticket;
    q("sheet-replay").textContent = ticket;
    q("manual-copy").hidden = true;
    q("copy-status").textContent = "";
    q("sheet-code").textContent = b.batch;
    var rows = q("sheet-rows");
    rows.textContent = "";
    row(rows, "Strain", b.strain);
    row(rows, "Lineage", b.lineage);
    row(rows, "Harvested", b.harvested);
    row(rows, "Cured", b.cure + " days");

    var terps = q("sheet-terps");
    terps.textContent = "";
    b.terps.forEach(function (t, i) { terpRow(terps, t[0], t[1], i === 0); });

    var tail = q("sheet-tail");
    tail.textContent = "";
    row(tail, "THC window", b.thc_low + "\u2013" + b.thc_high + "%");
    row(tail, "CBD", "<1% \u00b7 fictional lab numbers");

    q("sheet-roast").textContent = b.roast;
    var stamp = q("sheet-stamp");
    stamp.textContent = b.stamp;
    stamp.className = "gs-stamp " + (b.stamp === "NO CAP" ? "gs-nocap" : "gs-cap");
    q("sheet-fine").textContent = "Seed: " + b.seed + " \u00b7 Fictional product \u2014 not a real strain, not a real lab, no prices.";
    q("error").textContent = "";
  }

  function loadTicket(ticket) {
    render(Core.parseTicket(ticket));
    // replaceState is forbidden by some file:// browsers. The copyable ticket
    // remains usable even then; no navigation or network is required.
    try { history.replaceState(null, "", "#ticket=" + ticket); } catch (_) { /* local file origin */ }
  }

  q("certify-form").addEventListener("submit", function (event) {
    event.preventDefault();
    try { loadTicket(Core.ticketFor(q("seed").value)); }
    catch (err) { q("error").textContent = err.message; }
  });

  q("replay-form").addEventListener("submit", function (event) {
    event.preventDefault();
    try { loadTicket(q("ticket").value); }
    catch (err) { q("error").textContent = err.message; }
  });

  q("copyBtn").addEventListener("click", function () {
    if (!current) return;
    var ticket = Core.ticketFor(current.seed);
    var link = location.href.split("#")[0] + "#ticket=" + ticket;
    window.Receipt.copy(Core.receiptText(current) + "\nREPLAY: " + ticket +
      "\nEditable fictional certificate. Not lab evidence.\n" + link);
  });
  q("printBtn").addEventListener("click", function () { window.print(); });

  function readHash() {
    if (!location.hash) { render("777"); return; }
    try {
      // Do not decode/normalize malformed source tokens, or silently default.
      if (!location.hash.startsWith("#ticket=")) throw new Error("Invalid replay link. Expected #ticket=GS1-…");
      render(Core.parseTicket(location.hash.slice(8)));
    } catch (err) {
      current = null;
      q("sheet").hidden = true;
      q("copyBtn").disabled = true;
      q("printBtn").disabled = true;
      q("manual-copy").hidden = true;
      q("copy-status").textContent = "";
      q("error").textContent = err.message;
    }
  }
  window.addEventListener("hashchange", readHash);
  readHash();
})();
