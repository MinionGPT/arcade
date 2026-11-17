/* Real-Chromium test for Cabinet 09, Two Rooms Over. Run: node cabinets/two-rooms/browser-test.js
 * Two full games: one played perfectly (must stamp brass NO CAP), one played badly (must stamp
 * an unstyled CAP). The paint check is deliberate: opinion 12, a class that matches nothing in
 * the stylesheet is a stamp nobody sees.
 * Prove it can fail: break something in ui.js or two-rooms.css, run it, see the red, revert. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..", "..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".cache", "browsers");
const { chromium } = require(path.join(root, "node_modules", "playwright"));
const { lintPage } = require(path.join(root, "scripts", "visual-lint.js"));
const T = require("./engine.js");

const ok = message => console.log("ok  " + message);

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], requests = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("request", r => { if (!r.url().startsWith("file:")) requests.push(r.url()); });
    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
    const url = pathToFileURL(path.join(__dirname, "index.html")).href;
    const deck = T.deck(777);
    const deck2 = T.deck(777, 2);

    // ---- a perfect game -------------------------------------------------
    await page.goto(url);
    assert.equal(await page.locator("h1").count(), 1, "exactly one h1");
    ok("page loads with one h1");

    assert.equal(await page.textContent("#case-plate"), "SEED 777 · DECK 1 · CASE 01 / 08 — FIVE ROOMS, ONE BUG");
    assert.equal(await page.textContent("#case-symptom"), "“" + deck[0].quote + "”");
    assert.equal(await page.textContent("#case-source"), "EVIDENCE: " + deck[0].source + " · LOG " + deck[0].id);
    assert.equal(await page.locator("#room-buttons button").count(), T.ROOMS.length);
    ok("case 01 shows a real quote, its evidence file, and all five rooms");

    // Deck 1 is marked current, and both deck links carry the seed so switching does not re-deal.
    assert.equal(await page.getAttribute("#deck-1", "aria-current"), "page");
    assert.equal(await page.getAttribute("#deck-2", "aria-current"), null);
    assert.equal(await page.getAttribute("#deck-1", "href"), "index.html?seed=777&deck=1");
    assert.equal(await page.getAttribute("#deck-2", "href"), "index.html?seed=777&deck=2");
    ok("the deck switcher is marked current and keeps the seed");

    // The symptom is text, not markup: my quotes are full of backticks and `<` characters.
    assert.equal(await page.locator("#case-symptom > *").count(), 0, "symptom must render as text only");

    // Submitting with nothing picked is refused, not guessed.
    await page.click("#answer-btn");
    assert.match(await page.textContent("#error"), /Pick a room first/);
    assert.equal(await page.locator("#verdict-stamp").isVisible(), false);
    ok("an empty answer is refused and nothing gets stamped");

    let lastStamp = "";
    for (let i = 0; i < deck.length; i++) {
      const card = deck[i];
      const caseNo = String(i + 1).padStart(2, "0");
      assert.equal(await page.textContent("#verdict-title"), "CASE " + caseNo + " OPEN");
      await page.click(`[data-room="${card.room}"]`);
      const pressed = await page.getAttribute(`[data-room="${card.room}"]`, "aria-pressed");
      assert.equal(pressed, "true", "chosen room is pressed");
      const roomBg = await page.evaluate(id => {
        const el = document.querySelector(`[data-room="${id}"]`);
        return getComputedStyle(el).backgroundColor;
      }, card.room);
      assert.equal(roomBg, "rgb(233, 190, 70)", "the chosen room is painted brass, not just aria-pressed");
      await page.click("#answer-btn");
      assert.equal(await page.textContent("#verdict-title"), "CASE " + caseNo + " — FOUND IT");
      assert.match(await page.textContent("#verdict-room"), new RegExp("YOU SAID: " + T.ROOMS.find(r => r.id === card.room).label));
      assert.ok((await page.textContent("#verdict-tell")).includes(card.tell.slice(0, 40)), "the tell explains the fix");
      const stamp = await page.textContent("#verdict-stamp");
      assert.equal(stamp, "STAMP: NO CAP");
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("verdict-stamp")).backgroundColor), "rgb(233, 190, 70)", "NO CAP must be brass");
      lastStamp = i === deck.length - 1 ? "" : lastStamp;
      await page.click("#next-btn");
    }
    ok("eight correct answers stamp NO CAP, brass, case after case");

    assert.equal(await page.textContent("#verdict-title"), "CASE FILE CLOSED");
    assert.equal(await page.textContent("#verdict-stamp"), "STAMP: NO CAP");
    const receipt = await page.textContent("#final-receipt");
    const expected = T.score(777, deck.map(c => ({ cardId: c.id, room: c.room }))).receipt;
    assert.equal(receipt, expected, "the printed receipt is the engine's receipt, character for character");
    assert.match(receipt, /FOUND 8/);
    assert.equal(await page.getAttribute("#new-deck", "href"), "index.html?seed=778&deck=1");
    ok("the case file closes with the engine's own receipt and a next-deck link");

    // ---- deck 2: eight more bugs, same machine -------------------------
    await page.click("#deck-2");
    assert.equal(await page.textContent("#case-plate"), "SEED 777 · DECK 2 · CASE 01 / 08 — FIVE ROOMS, ONE BUG");
    assert.equal(await page.textContent("#case-symptom"), "“" + deck2[0].quote + "”");
    assert.equal(await page.getAttribute("#deck-1", "aria-current"), null);
    assert.equal(await page.getAttribute("#deck-2", "aria-current"), "page");
    for (let i = 0; i < deck2.length; i++) {
      const card = deck2[i];
      assert.equal(await page.textContent("#verdict-title"), "CASE " + String(i + 1).padStart(2, "0") + " OPEN");
      await page.click(`[data-room="${card.room}"]`);
      await page.click("#answer-btn");
      const stamp = await page.textContent("#verdict-stamp");
      assert.equal(stamp, "STAMP: NO CAP", "deck 2 case " + (i + 1) + " (" + card.id + ")");
      await page.click("#next-btn");
    }
    const receipt2 = await page.textContent("#final-receipt");
    assert.equal(receipt2, T.score(777, deck2.map(c => ({ cardId: c.id, room: c.room })), 2).receipt, "deck 2 closes on the engine's own receipt");
    assert.match(receipt2, /^DECK 2 {3}SEED 777/m);
    assert.match(receipt2, /FOUND 8/);
    assert.equal(await page.getAttribute("#new-deck", "href"), "index.html?seed=778&deck=2", "a new deck keeps you on deck 2");
    ok("deck 2 deals its own eight cases and closes with a DECK 2 receipt");

    // ---- a bad game -----------------------------------------------------
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("about:blank");
      await page.goto(url);
      for (const card of deck) {
        const wrongRoom = T.ROOMS.find(r => r.id !== card.room).id;
        await page.click(`[data-room="${wrongRoom}"]`);
        await page.click("#answer-btn");
        await page.click("#next-btn");
      }
      const bad = await page.evaluate(() => ({
        stamp: document.getElementById("verdict-stamp").textContent,
        bg: getComputedStyle(document.getElementById("verdict-stamp")).backgroundColor,
        content: document.documentElement.scrollWidth,
        viewport: innerWidth,
        receipt: document.getElementById("final-receipt").textContent
      }));
      assert.equal(bad.stamp, "STAMP: CAP", "all wrong closes with CAP");
      assert.equal(bad.bg, "rgba(0, 0, 0, 0)", "CAP must stay unstamped, got " + bad.bg);
      assert.match(bad.receipt, /FOUND 0/);
      assert.match(bad.receipt, /^01 {2}WRONG/m);
      assert.ok(bad.content <= bad.viewport, `overflow at ${width}: ${bad.content} > ${bad.viewport}`);
    }
    ok("eight wrong answers stamp a transparent CAP and the file still fits 1280 / 768 / 390 / 320");

    // ---- seeded replay --------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("about:blank");
    await page.goto(url + "?seed=778");
    assert.equal(await page.textContent("#case-symptom"), "“" + T.deck(778)[0].quote + "”");
    assert.equal(await page.textContent("#case-plate"), "SEED 778 · DECK 1 · CASE 01 / 08 — FIVE ROOMS, ONE BUG");
    await page.goto("about:blank");
    await page.goto(url + "?seed=778&deck=2");
    assert.equal(await page.textContent("#case-symptom"), "“" + T.deck(778, 2)[0].quote + "”", "?deck=2 is a different deck, not a decoration");
    await page.goto("about:blank");
    await page.goto(url + "?seed=777");
    assert.equal(await page.textContent("#case-symptom"), "“" + deck[0].quote + "”");
    ok("?seed= deals the same deck in the same order, and a different seed deals another");

    // ---- paint lint on the played state --------------------------------
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("about:blank");
    await page.goto(url);
    await page.click(`[data-room="${deck[0].room}"]`);
    await page.click("#answer-btn");
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    ok("visual lint clean on an answered case (contrast, palette, tap targets, dead classes)");

    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    const href = await page.locator(`[data-cabinet="${meta.id}"]`).getAttribute("href");
    assert.equal(href, `cabinets/${meta.id}/index.html`);
    await page.click(`[data-cabinet="${meta.id}"]`);
    assert.equal(await page.locator("h1").count(), 1);
    ok("floor tile opens this cabinet");

    assert.deepEqual(requests, [], "unexpected external requests");
    assert.deepEqual(errors, [], "page/console errors");
    ok("offline file://, zero page/console errors");
    console.log(path.basename(__dirname) + " cabinet browser test: PASS");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
