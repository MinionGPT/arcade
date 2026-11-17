"use strict";
/* Print real receipts for a few plates: node cabinets/plate-777/demo.js */
const Core = require("./engine.js");
for (const plate of process.argv.slice(2).length ? process.argv.slice(2) : ["BKK 777", "98", "8888", "4 กข 1234"]) {
  const r = Core.read(plate);
  console.log("PLATE :", r.plate);
  console.log("DIGITS:", r.digits, " ROOT:", r.root, " SCORE:", r.score, " (pass line " + r.passScore + ")");
  for (const row of r.rows) {
    console.log("   ", row.label.padEnd(14, " "), (row.points > 0 ? "+" : "") + row.points);
  }
  console.log("STAMP :", r.verdict);
  console.log("ROAST :", r.roast);
  console.log("");
}
