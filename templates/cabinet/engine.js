/* Rename CabinetCore in this file and ui.js. Keep rules pure, export to Node + browser. */
(function (root) {
  "use strict";
  function play(input) {
    if (typeof input !== "string" || !input.trim() || input.length > 80) {
      throw new Error("Give the moth a plan, up to 80 characters.");
    }
    return { title: "BORROWED LUCK", line: `Your plan: ${input}`, roast: "The moth has a lamp to get back to." };
  }
  const api = { play };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CabinetCore = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
