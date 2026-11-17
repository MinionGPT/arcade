/* Real-Chromium test for Cabinet 08, Toto 777. Run: node cabinets/toto-777/browser-test.js
 * Prove it can fail: break something in engine.js or ui.js, run it, see the red, then revert. */
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

    await page.goto(url);
    assert.equal(await page.locator("h1").count(), 1, "exactly one h1");
    ok("page loads with one h1");

    await page.fill("#seed", "777");
    await page.fill("#ticket", "23");
    await page.click("#draw-btn");
    const r = T.draw(23, 777);
    assert.equal(await page.textContent("#draw-ticket"), "PICK: 23   DRUM SEED: 777");
    assert.equal(await page.textContent("#draw-drum"), "DRUM: " + r.drawn.join("  "));
    assert.equal(await page.textContent("#draw-matches"), "MATCHES: " + r.matches + " of 1");
    assert.equal(await page.textContent("#draw-prize"), "PRIZE:   " + r.prize + "B");
    assert.equal(await page.textContent("#draw-stamp"), "STAMP:   " + r.stamp);
    ok("a seeded draw prints the real drum, matches, prize and stamp");

    // Opinion 12: assert the paint, not the label. The stamp's background is brass only on NO CAP.
    const stampBg = await page.evaluate(() => getComputedStyle(document.getElementById("draw-stamp")).backgroundColor);
    const expected = r.stamp === "NO CAP" ? "rgb(233, 190, 70)" : "rgba(0, 0, 0, 0)";
    assert.equal(stampBg, expected, "stamp paint for " + r.stamp + " got " + stampBg);
    ok("the stamp's computed background follows the verdict (brass on NO CAP, transparent on CAP)");

    // A second draw on a different seed must change the drum line.
    await page.fill("#seed", "778");
    await page.click("#draw-btn");
    const drum2 = await page.textContent("#draw-drum");
    assert.notEqual(drum2, "DRUM: " + r.drawn.join("  "));
    ok("a different seed draws a different drum");

    // Invalid ticket is refused with a message, nothing renders.
    await page.fill("#ticket", "97");
    await page.evaluate(() => document.querySelector("#draw-form").noValidate = true);
    await page.click("#draw-btn");
    assert.match(await page.textContent("#error"), /1 to 96/);
    ok("an out-of-range ticket is refused");

    // Hostile input stays literal text (no innerHTML).
    await page.fill("#ticket", '"><script>window.hacked=1</script>');
    await page.click("#draw-btn");
    assert.equal(await page.evaluate(() => window.hacked), undefined);
    ok("hostile ticket input stays literal, nothing executes");

    // Pick a number button seeds from the drum seed.
    await page.fill("#seed", "777");
    await page.click("#pick-btn");
    assert.equal(await page.locator("#ticket").inputValue(), String(T.pick(777)));
    ok("PICK A NUMBER uses the seeded drum");

    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const w = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(w.content <= w.viewport, `overflow at ${width}: ${JSON.stringify(w)}`);
    }
    ok("no horizontal overflow at 1280 / 768 / 390 / 320");

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("about:blank");
    await page.goto(url);
    await page.fill("#seed", "777");
    await page.fill("#ticket", "23");
    await page.click("#draw-btn");
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    ok("visual lint clean after a draw (contrast, palette, tap targets, dead classes)");

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