(function () {
  "use strict";

  var Core = window.PigeonRaceCore;
  var form = document.getElementById("race-form");
  var birdSelect = document.getElementById("bird");
  var stakeInput = document.getElementById("stake");
  var seedInput = document.getElementById("seed");
  var errorLine = document.getElementById("error");
  var out = document.getElementById("result");

  // The bird list comes from the engine, not from a hardcoded copy in the markup.
  Core.BIRDS.forEach(function (bird) {
    var opt = document.createElement("option");
    opt.value = bird.tag;
    opt.textContent = bird.tag + " " + bird.name + " * " + bird.club;
    birdSelect.appendChild(opt);
  });

  function row(term, value) {
    var dt = document.createElement("dt");
    var dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    return [dt, dd];
  }

  function printReceipt(slip) {
    out.textContent = "";
    var paper = document.createElement("div");
    paper.className = "receipt";

    var head = document.createElement("div");
    head.className = "receipt-head";
    var strong = document.createElement("strong");
    strong.textContent = "PIGEON RACE 777";
    var small = document.createElement("small");
    small.textContent = "RACE NO " + String(slip.seed).slice(-6).padStart(6, "0") + " * FICTIONAL LOFTS";
    head.appendChild(strong);
    head.appendChild(small);
    paper.appendChild(head);

    var dl = document.createElement("dl");
    [
      ["BIRD", slip.tag + " " + slip.name],
      ["CLUB", slip.club],
      ["FORM", slip.form.join(" ")],
      ["ODDS", slip.odds.toFixed(2)],
      ["STAKE", slip.stake + " baht"],
      ["FINISHED", "POS " + slip.pos + " * " + slip.time.toFixed(2) + "s"]
    ].forEach(function (pair) {
      var cells = row(pair[0], pair[1]);
      dl.appendChild(cells[0]);
      dl.appendChild(cells[1]);
    });
    paper.appendChild(dl);

    var stamp = document.createElement("div");
    stamp.className = "verdict " + (slip.stamp === "NO CAP" ? "pr-stamp-no-cap" : "pr-stamp-cap");
    stamp.textContent = slip.stamp;
    paper.appendChild(stamp);

    var quote = document.createElement("blockquote");
    quote.textContent = slip.won
      ? "The bird flew first and the house pays out. It happens more than the house likes."
      : "The bird flew " + slip.pos + "th and the house keeps the stake. It happens more than you like.";
    paper.appendChild(quote);

    var board = document.createElement("div");
    board.className = "fine-print";
    board.textContent = "HOUSE EDGE 15% * FIELD 8 BIRDS * SEED " + slip.seed + " * FICTIONAL BIRDS, FICTIONAL MONEY";
    paper.appendChild(board);

    var actions = document.createElement("div");
    actions.className = "receipt-actions";
    var replay = document.createElement("a");
    replay.href = "?bird=" + slip.tag + "&stake=" + slip.stake + "&seed=" + slip.seed;
    replay.textContent = "REPLAY THIS RACE";
    replay.className = "ticket-id";
    actions.appendChild(replay);
    paper.appendChild(actions);

    out.appendChild(paper);
  }

  function run() {
    var tag = birdSelect.value;
    var stake = Number(stakeInput.value);
    var seed = Number(seedInput.value);
    errorLine.textContent = "";
    try {
      if (!Number.isInteger(seed) || seed < 0) throw new Error("race number must be a whole number 0 or up");
      var slip = Core.betSlip(seed, tag, stake);
      printReceipt(slip);
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
  if (params.get("bird")) birdSelect.value = params.get("bird");
  if (params.get("stake")) stakeInput.value = params.get("stake");
  if (params.get("seed")) seedInput.value = params.get("seed");
  if (params.get("bird") && params.get("seed")) run();
})();
