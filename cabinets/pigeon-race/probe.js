const e = require("./engine.js");
for (const s of [777, 4242, 1, 0]) {
  const slip = e.betSlip(s, "P-01", 100);
  console.log(`seed ${s}: P-01 pos ${slip.pos} time ${slip.time} odds ${slip.odds} gross ${slip.gross} net ${slip.net} ${slip.stamp} form ${slip.form.join(" ")}`);
}
