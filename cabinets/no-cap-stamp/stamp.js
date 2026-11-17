/* A user-authored opinion ticket, not an automated fact checker. */
(function (root) {
  "use strict";
  const verdicts = {
    NOT_CHECKED: { label: "NOT CHECKED", tail: "HOLD THE STAMP", roast: "Even the moth knows when to say: I don't know." },
    NO_CAP: { label: "NO CAP", tail: "KEEP IT 100", roast: "Clean as a fresh jar from the grow house. That's your call, not a lab result." },
    CAP: { label: "CAP", tail: "SHOW RECEIPTS", roast: "Big cap energy. Show your work." }
  };
  function build({ claim, verdict, evidence = "" }) {
    if (typeof claim !== "string" || !claim.trim() || claim.length > 240) {
      throw new Error("Write a claim, up to 240 characters.");
    }
    if (!Object.hasOwn(verdicts, verdict)) throw new Error("Choose a listed verdict.");
    if (typeof evidence !== "string" || evidence.length > 600) {
      throw new Error("Keep your evidence note within 600 characters.");
    }
    return { claim, verdict, evidence, ...verdicts[verdict] };
  }
  function receiptText(receipt) {
    return ["DEPARTMENT OF RECEIPTS / USER OPINION", `CLAIM: ${receipt.claim}`,
      `YOUR VERDICT: ${receipt.label}`, `YOUR EVIDENCE: ${receipt.evidence || "None supplied."}`,
      receipt.tail, receipt.roast,
      "NOT INDEPENDENTLY VERIFIED. A stamp is not evidence."].join("\n");
  }
  const api = { build, receiptText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Stamp = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
