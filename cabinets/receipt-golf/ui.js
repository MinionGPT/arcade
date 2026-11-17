(function () {
  "use strict";

  var RG = window.ReceiptGolfCore;
  var form = document.getElementById("golf-form");
  var holeSelect = document.getElementById("hole");
  var saveInput = document.getElementById("save");
  var seedInput = document.getElementById("seed");
  var errorLine = document.getElementById("error");
  var out = document.getElementById("result");

  RG.HOLES.forEach(function (hole, i) {
    var opt = document.createElement("option");
    opt.value = String(i + 1);
    opt.textContent = (i + 1) + "/9 " + hole.batch + " " + hole.vendor + " * " + hole.item;
    holeSelect.appendChild(opt);
  });

  function money(n) {
    return n.toFixed(2);
  }

  function row(term, value) {
    var dt = document.createElement("dt");
    var dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    return [dt, dd];
  }

  function printReceipt(hole, result, seed) {
    out.textContent = "";
    var paper = document.createElement("div");
    paper.className = "receipt";

    var head = document.createElement("div");
    head.className = "receipt-head";
    var strong = document.createElement("strong");
    strong.textContent = "RECEIPT GOLF 777";
    var small = document.createElement("small");
    small.textContent = "HOLE " + result.hole + "/9 * " + hole.batch + " * " + hole.vendor;
    head.appendChild(strong);
    head.appendChild(small);
    paper.appendChild(head);

    var dl = document.createElement("dl");
    var wanted = result.ok
      ? [["ASK", money(hole.ask)], ["FLOOR", money(hole.floor)], ["EAGLE AT", money(hole.eagle)], ["BIRDIE AT", money(hole.birdie)], ["CLEAN LINE", money(RG.cleanSave(hole))], ["YOUR SAVE", money(result.save)]]
      : [["ASK", money(hole.ask)], ["FLOOR", money(hole.floor)], ["YOUR SAVE", money(result.save)]];
    wanted.forEach(function (pair) {
      var cells = row(pair[0], pair[1]);
      dl.appendChild(cells[0]);
      dl.appendChild(cells[1]);
    });
    paper.appendChild(dl);

    if (result.ok) {
      var stamp = document.createElement("div");
      stamp.className = "verdict " + (result.stamp === "NO CAP" ? "rg-stamp-no-cap" : "rg-stamp-cap");
      stamp.textContent = RG.verdictName(result.verdict) + " * " + result.stamp;
      paper.appendChild(stamp);

      var quote = document.createElement("blockquote");
      quote.textContent = "\u201C" + result.roast + "\u201D";
      paper.appendChild(quote);
    } else {
      var walkStamp = document.createElement("div");
      walkStamp.className = "verdict rg-stamp-walk";
      walkStamp.textContent = "WALK * NO RECEIPT";
      paper.appendChild(walkStamp);
      var walkQuote = document.createElement("blockquote");
      walkQuote.textContent = "The vendor called it. No stamp. No receipt. Score +2.";
      paper.appendChild(walkQuote);
    }

    var fine = document.createElement("div");
    fine.className = "fine-print";
    fine.textContent = "FICTIONAL BATCH * SEED " + seed + " * PAR = 15% OF ASK * THE RECEIPT IS THE SCOREBOARD";
    paper.appendChild(fine);

    var actions = document.createElement("div");
    actions.className = "receipt-actions";
    var replay = document.createElement("a");
    replay.href = "?hole=" + result.hole + "&save=" + result.save + "&seed=" + seed;
    replay.textContent = "REPLAY THIS HOLE";
    replay.className = "ticket-id";
    actions.appendChild(replay);
    paper.appendChild(actions);

    out.appendChild(paper);
  }

  function run() {
    var holeNumber = Number(holeSelect.value);
    var save = Number(saveInput.value.replace(",", "."));
    var seed = (seedInput.value || "777").trim() || "777";
    errorLine.textContent = "";
    try {
      var hole = RG.holeAt(holeNumber);
      var result = RG.play(holeNumber, save, seed);
      printReceipt(hole, result, seed);
    } catch (err) {
      out.textContent = "";
      errorLine.textContent = err.message;
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    run();
  });

  var params = new URLSearchParams(location.search);
  if (params.get("hole")) holeSelect.value = params.get("hole");
  if (params.get("save")) saveInput.value = params.get("save");
  if (params.get("seed")) seedInput.value = params.get("seed");
  if (params.get("save") && params.get("hole")) run();
})();
