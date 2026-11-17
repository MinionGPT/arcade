/* Prints the real 44-col statement for a batch code. Run: node demo.js [seed] */
"use strict";
const Core = require("./engine.js");
const seed = process.argv[2] || "777";
for (const line of Core.statement(Core.run(seed))) console.log(line);
