/* Real-Chromium test for this cabinet. Run: node cabinets/pigeon-race/browser-test.js
 * Copy-paste friendly: it finds its own folder and the arcade root, so a new cabinet only
 * edits the three marked lines. Add more `ok()` checks for your own game below them.
 * Prove it can fail: break something in ui.js, run it, see the red, then revert.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..", "..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".cache", "browsers");
const { chromium } = require(path.join(root, "node_modules", "playwright"));
const { lintPage } = require(path.join(root, "scripts", "visual-lint.js"));

// EDIT 1 of 3: the input you type into, the button you press, what the output should say.
const INPUT = "#stake", SUBMIT = "#race-form button", OUTPUT = "#result .verdict";
const TYPED = "100", EXPECT = /NO CAP|CAP/;
// EDIT 2 of 3: a value your engine must refuse, and the error text you expect.
const BAD = "", BAD_ERROR = /positive integer/;
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
    const manifest = path.join(__dirname, "cabinet.json");
    const meta = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const isTemplate = meta.id === "__" + "ID__"; // the untouched template is not on the floor
    const url = pathToFileURL(path.join(__dirname, "index.html")).href;

    await page.goto(url);
    assert.equal(await page.locator("h1").count(), 1, "exactly one h1");
    ok("page loads with one h1");

    await page.fill(INPUT, TYPED);
    await page.click(SUBMIT);
    const stampText = await page.textContent(OUTPUT);
    assert.match(stampText, EXPECT);
    ok("valid input prints a receipt with a stamp: " + stampText.trim());

    // The stamp must be painted, not just labelled (opinion 12: assert the paint).
    const paint = await page.evaluate(() => {
      const el = document.querySelector(".verdict");
      const style = getComputedStyle(el);
      return { cls: el.className, bg: style.backgroundColor, color: style.color, transform: style.transform };
    });
    assert.ok(/pr-stamp-no-cap|pr-stamp-cap/.test(paint.cls), "stamp carries a paint class: " + paint.cls);
    if (paint.cls.includes("pr-stamp-no-cap")) {
      assert.equal(paint.bg, "rgb(233, 190, 70)", "NO CAP should be brass bg, got " + paint.bg);
      assert.equal(paint.color, "rgb(16, 16, 14)", "NO CAP text should be ink on brass, got " + paint.color);
      ok("NO CAP stamp paints brass rgb(233, 190, 70) (opinion 12)");
    } else {
      assert.equal(paint.bg, "rgba(0, 0, 0, 0)", "CAP should be transparent bg, got " + paint.bg);
      ok("CAP stamp paints transparent (ink on paper)");
    }

    // A different seed changes the finish order; same seed reproduces the receipt.
    const firstReceipt = await page.textContent("#result");
    await page.fill("#seed", "4242");
    await page.click(SUBMIT);
    const secondReceipt = await page.textContent("#result");
    assert.notEqual(firstReceipt, secondReceipt, "seed 4242 should print a different race than 777");
    await page.fill("#seed", "777");
    await page.click(SUBMIT);
    assert.equal(await page.textContent("#result"), firstReceipt, "seed 777 reproduces the same receipt");
    ok("seeded races: same seed same receipt, different seed different receipt");

    // Replay link keeps the seed in the URL and re-renders the same receipt.
    const replayHref = await page.getAttribute("#result .ticket-id", "href");
    assert.ok(replayHref.includes("seed=777"), "replay link carries the seed: " + replayHref);
    await page.goto("about:blank");
    await page.goto(url + replayHref);
    assert.equal(await page.textContent("#result"), firstReceipt, "replay link re-renders the same receipt");
    ok("replay link (?bird=&stake=&seed=) re-renders the same receipt");

    await page.fill(INPUT, BAD);
    await page.evaluate(sel => document.querySelector(sel).closest("form").noValidate = true, SUBMIT);
    await page.click(SUBMIT);
    assert.match(await page.textContent("#error"), BAD_ERROR);
    ok("bad input is refused with a message");

    // EDIT 3 of 3: a hostile string must stay literal text (never innerHTML).
        await page.fill("#stake", "");
        await page.fill("#seed", "<img src=x onerror=\"window.hacked=true\">");
        await page.fill(INPUT, "50");
        await page.click(SUBMIT);
    assert.equal(await page.evaluate(() => window.hacked), undefined);
    assert.equal(await page.locator("#result img").count(), 0);
    ok("hostile input stays literal, nothing executes");

    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const w = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(w.content <= w.viewport, `overflow at ${width}: ${JSON.stringify(w)}`);
    }
    ok("no horizontal overflow at 1280 / 768 / 390 / 320");

    // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("about:blank");
    await page.goto(url);
    await page.fill(INPUT, TYPED);
    await page.click(SUBMIT);
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    ok("visual lint clean after a play (contrast, palette, tap targets, dead classes)");

    if (!isTemplate) {
      await page.goto(pathToFileURL(path.join(root, "index.html")).href);
      const href = await page.locator(`[data-cabinet="${meta.id}"]`).getAttribute("href");
      assert.equal(href, `cabinets/${meta.id}/index.html`);
      await page.click(`[data-cabinet="${meta.id}"]`);
      assert.equal(await page.locator("h1").count(), 1);
      ok("floor tile opens this cabinet");
    }

    assert.deepEqual(requests, [], "unexpected external requests");
    assert.deepEqual(errors, [], "page/console errors");
    ok("offline file://, zero page/console errors");
    console.log(`${isTemplate ? "template" : path.basename(__dirname)} cabinet browser test: PASS`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });