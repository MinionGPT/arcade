/* Cabinet 06 browser suite: real Chromium, file://, offline, denied clipboard.
 *   node cabinets/scratch-off/browser-test.js
 * Also runs from `npm run test:browser` (SENIOR_SYNC convention).
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..", "..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".cache", "browsers");
const { chromium } = require("playwright");
const { lintPage } = require(path.join(root, "scripts", "visual-lint.js"));
const S = require("./engine.js");
const pageURL = file => pathToFileURL(path.join(root, file)).href;
const shots = path.join(root, ".cache", "shots");
fs.mkdirSync(shots, { recursive: true });

// Find a real jackpot and a real loss in the engine so the UI is tested against
// both stamps — no invented tickets.
function findTicket(seed, want) {
  for (let ticket = 1; ticket <= 20000; ticket++) if (want(S.scratch(ticket, seed))) return ticket;
  throw new Error(`no ticket matching predicate on seed ${seed}`);
}
const jackpotTicket = findTicket(777, t => t.stamp === "NO CAP");
const lossTicket = findTicket(777, t => t.prize === 0 && t.matches <= 1);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const external = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => { throw new Error("Denied by integration test"); } }
    }));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", e => errors.push("pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("request", r => { if (!r.url().startsWith("file:")) external.push(r.url()); });

    const cabinet = "cabinets/scratch-off/index.html";
    // A hash-only goto does not reload a file:// document, so every replay-link
    // check starts from a blank page. Otherwise the old DOM proves nothing.
    async function open(hash = "") {
      await page.goto("about:blank");
      await page.goto(pageURL(cabinet) + hash);
    }
    await page.goto(pageURL(cabinet));
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.textContent("#result"), /AWAITING SCRATCH/);
    assert.equal(await page.locator("#scratch-area").isVisible(), false);
    console.log("ok  empty state: one heading, no panels, receipt awaits");

    // Buy a random ticket on seed 777.
    await page.fill("#seed", "777");
    await page.check("#rand");
    await page.click("#startBtn");
    assert.equal(await page.locator("#scratch-area").isVisible(), true);
    assert.equal(await page.locator(".so-panel").count(), 9);
    assert.equal(await page.inputValue("#ticket"), String(S.pick(777)), "random ticket comes from Scratch.pick");
    const lucky = await page.textContent("#lucky-plate");
    assert.match(lucky, new RegExp(`LUCKY NUMBER\\s*${S.luckyDigit(777)}`));
    console.log("ok  ticket bought on seed 777: 9 panels,", lucky.replace(/\s+/g, " ").trim());

    // One scratch reveals one digit and moves the counter.
    const first = page.locator(".so-panel").first();
    await first.click();
    assert.equal(await first.evaluate(el => el.classList.contains("so-revealed")), true);
    assert.match(await first.textContent(), /^[0-9]$/);
    assert.match(await page.textContent("#progress"), /^1 \/ 9 scratched$/);
    assert.equal(await page.locator("#receipt-actions").isVisible(), false, "no receipt before the card is gone");
    console.log("ok  one panel reveals a single digit and the counter says 1 / 9");

    // Reveal all: receipt prints from the engine and matches its own numbers.
    await page.click("#revealBtn");
    assert.equal(await page.locator(".so-panel:not(.so-revealed)").count(), 0);
    assert.equal(await page.isDisabled("#revealBtn"), true, "reveal button retires when the card is gone");
    const expected = S.scratch(Number(await page.inputValue("#ticket")), 777);
    const dds = await page.locator("#result dl dd").allTextContents();
    assert.deepEqual(dds, [
      String(expected.lucky),
      `${expected.matches} of 9`,
      `${expected.prize}B`,
      expected.card.join(" "),
    ], "receipt rows are the engine's own numbers, in order");
    assert.equal(await page.textContent("#receipt-text"), expected.receipt, "receipt text is the engine's string, verbatim");
    assert.equal(await page.textContent("#verdict"), expected.stamp);
    const matchingPanels = await page.locator(".so-panel.so-match").count();
    assert.equal(matchingPanels, expected.matches, "gold panels equal the match count");
    console.log(`ok  receipt printed: ${expected.matches} matches, ${expected.prize}B, stamp ${expected.stamp}`);

    // Stamp styling is actually wired: jackpot is brass, a loser is not.
    await open(`#ticket=${jackpotTicket}&seed=777`);
    await page.click("#revealBtn");
    assert.equal(await page.textContent("#verdict"), "NO CAP");
    const gold = await page.locator("#verdict").evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(gold, "rgb(233, 190, 70)", `jackpot stamp should be brass, got ${gold}`);
    await open(`#ticket=${lossTicket}&seed=777`);
    await page.click("#revealBtn");
    assert.equal(await page.textContent("#verdict"), "CAP");
    const dusty = await page.locator("#verdict").evaluate(el => getComputedStyle(el).backgroundColor);
    assert.notEqual(dusty, "rgb(233, 190, 70)", "a loser never wears the jackpot brass");
    console.log(`ok  stamp classes wired: ticket #${jackpotTicket} brass, ticket #${lossTicket} plain`);

    // Determinism through a replay link: the URL alone rebuilds the card.
    await open("#ticket=42&seed=777");
    assert.equal(await page.inputValue("#ticket"), "42");
    assert.equal(await page.inputValue("#seed"), "777");
    assert.equal(await page.isChecked("#rand"), false);
    await page.click("#revealBtn");
    const firstRun = await page.textContent("#receipt-text");
    await open("#ticket=42&seed=777");
    await page.click("#revealBtn");
    assert.equal(await page.textContent("#receipt-text"), firstRun, "same link, same card");
    assert.equal(firstRun, S.scratch(42, 777).receipt);
    console.log("ok  #ticket=42&seed=777 replays the identical card and receipt");

    // Denied clipboard: the copy falls back to a selectable field, no OS clipboard.
    await page.click("#copyBtn");
    await page.waitForFunction(() => !document.getElementById("manual-copy").hidden);
    assert.equal(await page.inputValue("#copy-text"), firstRun);
    await page.click("#linkBtn");
    await page.waitForFunction(() => document.getElementById("copy-text").value.includes("#ticket=42&seed=777"));
    console.log("ok  clipboard denial falls back to a manual copy field, replay link included");

    // Invalid input: native validation blocks submit, and the JS guard catches a
    // forced submit. Both paths must leave the counter untouched.
    await open();
    await page.fill("#seed", "-1");
    assert.equal(await page.locator("#seed").evaluate(el => el.validity.valid), false, "min=0 rejects negatives");
    await page.click("#startBtn");
    assert.equal(await page.locator("#scratch-area").isVisible(), false, "nothing opens on an invalid seed");
    await page.locator("#start-form").dispatchEvent("submit");
    assert.match(await page.textContent("#error"), /Seed must be zero or more/);
    assert.equal(await page.locator("#scratch-area").isVisible(), false);
    await page.fill("#seed", "777");
    await page.uncheck("#rand");
    await page.fill("#ticket", "");
    await page.locator("#start-form").dispatchEvent("submit");
    assert.match(await page.textContent("#error"), /Ticket must be a whole number above zero/);
    console.log("ok  negative seed and empty ticket are refused, no card opens");

    // New ticket button: a fresh covered card, and a different ticket in random mode.
    await page.fill("#seed", "777");
    await page.check("#rand");
    await page.click("#startBtn");
    const firstTicket = await page.inputValue("#ticket");
    await page.click("#newBtn");
    assert.equal(await page.locator(".so-panel:not(.so-revealed)").count(), 9, "a new ticket starts covered");
    assert.notEqual(await page.inputValue("#ticket"), firstTicket, "random mode deals a different ticket");
    await page.click("#revealBtn");
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".machine").isVisible(), false);
    assert.equal(await page.locator("#result").isVisible(), true);
    await page.pdf({ path: path.join(shots, "scratch-receipt.pdf"), format: "A5", printBackground: true });
    await page.emulateMedia({ media: "screen" });
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await open("#ticket=42&seed=777");
      await page.click("#revealBtn");
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `overflow ${over}px at ${width}px`);
      await page.screenshot({ path: path.join(shots, `scratch-${width}.png`), fullPage: true });
    }
    console.log("ok  new ticket, print layout, no overflow at 1280 / 768 / 390 / 320");

    // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
    await page.setViewportSize({ width: 1280, height: 900 });
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    console.log("ok  visual lint clean (contrast, palette, tap targets, dead classes)");

    // The floor tile points at this cabinet and opens it.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pageURL("index.html"));
    const tile = page.locator('[data-cabinet="scratch-off"]');
    assert.equal(await tile.count(), 1, "floor has one scratch-off tile");
    await tile.click();
    assert.equal(await page.locator("h1").innerText(), "TRIP 777 SCRATCH");
    console.log("ok  floor tile opens Cabinet 06");

    assert.deepEqual(external, [], "unexpected external requests");
    assert.deepEqual(errors, [], "browser errors");
    console.log("ok  offline file://, zero page/console errors");
    console.log("scratch-off cabinet browser test: PASS");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error("FAIL:", error.message); process.exit(1); });
