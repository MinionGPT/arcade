/* Real-Chromium test for this cabinet. Run: node cabinets/<id>/browser-test.js
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
const INPUT = "#input", SUBMIT = "#play-form button", OUTPUT = "#output-line";
const TYPED = "98", EXPECT = "Digits 98 / score 5 / CAP";
// EDIT 2 of 3: a value your engine must refuse, and the error text you expect.
const BAD = "LUCKY", BAD_ERROR = /digits/;
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
    assert.equal(await page.textContent(OUTPUT), EXPECT);
    ok("valid input prints the expected output");

    // The paint checks (opinion 12): assert what the eye would see, not the label.
    await page.fill(INPUT, "777");
    await page.click(SUBMIT);
    assert.match(await page.textContent("#output-stamp"), /NO CAP/);
    assert.equal(await page.locator("#output-rows li").count(), 5, "five scoring rows on the receipt");
    const brass = await page.evaluate(() => getComputedStyle(document.getElementById("output-stamp")).backgroundColor);
    assert.equal(brass, "rgb(233, 190, 70)", `NO CAP stamp should be brass, got ${brass}`);
    ok("NO CAP stamp is painted brass (computed style), five rows printed");

    await page.fill(INPUT, "1234");
    await page.click(SUBMIT);
    const clear = await page.evaluate(() => getComputedStyle(document.getElementById("output-stamp")).backgroundColor);
    assert.equal(clear, "rgba(0, 0, 0, 0)", `CAP stamp should stay transparent, got ${clear}`);
    ok("CAP stamp stays transparent (computed style)");

    // URL replay: ?plate=777 reads that plate on load, no click needed.
    await page.goto(url + "?plate=777");
    assert.equal(await page.textContent("#output-line"), "Digits 777 / score 10 / NO CAP",
      "URL replay: ?plate=777 should print the same receipt without a click");
    ok("URL replay ?plate=777 prints the same receipt without a click");

    await page.fill(INPUT, BAD);
    await page.evaluate(sel => document.querySelector(sel).closest("form").noValidate = true, SUBMIT);
    await page.click(SUBMIT);
    assert.match(await page.textContent("#error"), BAD_ERROR);
    ok("bad input is refused with a message");

    // EDIT 3 of 3: a hostile string must stay literal text (never innerHTML).
    const hostile = '<img src=x onerror="window.hacked=true">';
    await page.fill(INPUT, hostile);
    await page.click(SUBMIT);
    assert.equal(await page.evaluate(() => window.hacked), undefined);
    assert.equal(await page.locator("#output-line img").count(), 0);
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
