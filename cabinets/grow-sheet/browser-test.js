/* Real-Chromium test for Cabinet 07 — 777 Minion Farms.
 * Run: node cabinets/grow-sheet/browser-test.js
 * It asserts the paint, not the label: the stamp's computed background must be brass for a
 * NO CAP batch and transparent for a CAP batch, and the terpene bars must have real width.
 * Prove it can fail: break the stamp class in ui.js, run it, see the red, revert.
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
const Core = require("./engine.js");

const SEED = "#seed", SUBMIT = "#certify-form button";
const NO_CAP_SEED = "0", CAP_SEED = "4"; // found by scanning seeds 0-400 against the engine
const ok = message => console.log("ok  " + message);
const stampPaint = page => page.$eval("#sheet-stamp", el => {
  const cs = getComputedStyle(el);
  return { text: el.textContent.trim(), bg: cs.backgroundColor, cls: el.className };
});

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

    // Renders on load: the default sheet must be the engine's sheet for seed 777.
    assert.equal(await page.textContent("#sheet-code"), Core.batch("777").batch);
    assert.equal(await page.textContent("#sheet-roast"), Core.batch("777").roast);
    ok("loads with the engine's own batch for seed 777");

    // NO CAP: text says it AND the paint says it.
    await page.fill(SEED, NO_CAP_SEED);
    await page.click(SUBMIT);
    const noCap = await stampPaint(page);
    assert.equal(noCap.text, "NO CAP");
    assert.equal(noCap.bg, "rgb(233, 190, 70)", `NO CAP stamp must be brass, got ${noCap.bg}`);
    ok("NO CAP batch prints the brass stamp (computed background, not the label)");

    // CAP: the same element must NOT be brass.
    await page.fill(SEED, CAP_SEED);
    await page.click(SUBMIT);
    const cap = await stampPaint(page);
    assert.equal(cap.text, "CAP");
    assert.equal(cap.bg, "rgba(0, 0, 0, 0)", `CAP stamp must not be brass, got ${cap.bg}`);
    ok("CAP batch drops the brass (transparent background)");

    // The stamp text always equals the engine's rule for that seed.
    for (const seed of ["0", "4", "777", "42", "1234"]) {
      await page.fill(SEED, seed);
      await page.click(SUBMIT);
      assert.equal(await page.textContent("#sheet-code"), Core.batch(seed).batch, "seed " + seed);
      assert.equal((await stampPaint(page)).text, Core.batch(seed).stamp, "seed " + seed);
    }
    ok("five seeds: code and stamp match the engine exactly");

    // Terpene bars have real width and the printed split sums to ~100.
    await page.fill(SEED, "777");
    await page.click(SUBMIT);
    const terps = await page.$$eval(".gs-terp", els => els.map(el => ({
      name: el.querySelector(".gs-terp-name").textContent,
      pct: parseFloat(el.querySelector(".gs-pct").textContent),
      width: el.querySelector(".gs-bar-fill").getBoundingClientRect().width
    })));
    assert.equal(terps.length, 3);
    assert.ok(terps.every(t => t.width > 0), JSON.stringify(terps));
    const total = terps.reduce((sum, t) => sum + t.pct, 0);
    assert.ok(Math.abs(total - 100) < 0.2, total);
    ok(`three terpene bars with real width, split sums to ${total.toFixed(1)}%`);

    // Determinism: same seed, same sheet, twice.
    await page.fill(SEED, "999");
    await page.click(SUBMIT);
    const first = await page.textContent("#sheet-code");
    await page.fill(SEED, "777");
    await page.click(SUBMIT);
    await page.fill(SEED, "999");
    await page.click(SUBMIT);
    assert.equal(await page.textContent("#sheet-code"), first);
    ok("same seed reprints the same batch code");

    // Bad input: an empty seed is refused with a message.
    await page.fill(SEED, "");
    await page.evaluate(sel => document.querySelector(sel).closest("form").noValidate = true, SUBMIT);
    await page.click(SUBMIT);
    assert.match(await page.textContent("#error"), /seed number/);
    ok("empty seed is refused with a message");

    // Replay a complete certificate on a fresh document, not a hash-only no-op.
    await page.fill(SEED, "0007");
    await page.click(SUBMIT);
    const sheet = await page.textContent("#sheet");
    assert.equal(await page.inputValue("#ticket"), "GS1-0007");
    await page.goto("about:blank");
    await page.goto(url + "#ticket=GS1-0007");
    assert.equal(await page.textContent("#sheet"), sheet);
    assert.equal(await page.inputValue(SEED), "0007");
    await page.fill("#ticket", "GS1-0");
    await page.click("#replay-form button");
    assert.equal(await page.textContent("#sheet-code"), Core.batch("0").batch);
    ok("fresh-page URL replay and pasted tickets reproduce the full sheet, leading zeros intact");

    // Broken source tokens must not silently certify the default seed.
    for (const hash of ["#ticket=GS2-7", "#ticket=GS1-%37", "#ticket=GS1-7&extra=1", "#seed=7"]) {
      await page.goto("about:blank");
      await page.goto(url + hash);
      assert.equal(await page.locator("#sheet").isVisible(), false, hash);
      assert.ok(await page.locator("#copyBtn").isDisabled(), hash);
      assert.match(await page.textContent("#error"), /Invalid replay/);
    }
    // Recovery from an invalid URL must restore both receipt and actions.
    await page.fill("#ticket", "GS1-777");
    await page.click("#replay-form button");
    assert.ok(await page.locator("#sheet").isVisible());
    assert.ok(await page.locator("#copyBtn").isEnabled());
    await page.fill("#ticket", "GS1-<img src=x onerror=alert(1)>");
    await page.click("#replay-form button");
    assert.match(await page.textContent("#error"), /Invalid replay/);
    assert.equal(await page.textContent("#sheet-code"), Core.batch("777").batch);
    ok("malformed URLs refuse certification; pasted hostile tickets stay inert; valid replay recovers");

    // Assert clipboard fallback contents, including the actual portable ticket.
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: async () => { throw new Error("test denial"); } }
    }));
    await page.click("#copyBtn");
    assert.ok(await page.locator("#manual-copy").isVisible());
    const copied = await page.inputValue("#copy-text");
    assert.ok(copied.startsWith(Core.receiptText(Core.batch("777"))));
    assert.ok(copied.includes("REPLAY: GS1-777"));
    assert.ok(copied.endsWith(url + "#ticket=GS1-777"));
    await page.evaluate(() => { location.hash = "#ticket=GS2-7"; });
    await page.waitForFunction(() => document.getElementById("sheet").hidden);
    assert.equal(await page.locator("#manual-copy").isVisible(), false);
    assert.ok(await page.locator("#printBtn").isDisabled());
    await page.fill(SEED, "0");
    await page.click(SUBMIT);
    assert.equal(await page.locator("#manual-copy").isVisible(), false, "no stale fallback after new batch");
    ok("denied clipboard exposes exact receipt + replay link and clears stale copies on a new batch");

    // Small percentages must be drawn honestly, not clamped up to 2%.
    const tinySeed = Array.from({ length: 500 }, (_, i) => String(i)).find(s => Core.batch(s).terps.some(t => t[1] < 2));
    assert.ok(tinySeed, "fixture with a small terpene");
    await page.fill(SEED, tinySeed);
    await page.click(SUBMIT);
    const bars = await page.$$eval(".gs-terp", els => els.map(el => ({
      pct: parseFloat(el.querySelector(".gs-pct").textContent),
      inline: parseFloat(el.querySelector(".gs-bar-fill").style.width),
      ratio: el.querySelector(".gs-bar-fill").getBoundingClientRect().width /
        el.querySelector(".gs-bar").getBoundingClientRect().width * 100
    })));
    for (const bar of bars) {
      assert.equal(bar.inline, bar.pct);
      assert.ok(Math.abs(bar.ratio - bar.pct) < 0.2, JSON.stringify(bar));
    }
    ok("terpene bar geometry matches the printed percent, including values below 2%");

    await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
    await page.click("#printBtn");
    assert.equal(await page.evaluate(() => window.printCalled), true);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".machine").isVisible(), false);
    assert.ok(await page.locator("#sheet-replay").isVisible());
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    fs.mkdirSync(path.join(root, ".cache", "shots"), { recursive: true });
    fs.writeFileSync(path.join(root, ".cache", "shots", "grow-sheet.pdf"), pdf);
    await page.emulateMedia({ media: "screen" });
    ok("PRINT invokes the handler; print CSS keeps replay ID and hides controls; Chromium emits a PDF");

    await page.fill(SEED, "9".repeat(32));
    await page.click(SUBMIT);

    // Nothing is ever interpolated as HTML: no injected nodes in the sheet.
    assert.equal(await page.locator("#sheet img, #sheet script, #sheet iframe").count(), 0);
    ok("receipt builds no elements from input (textContent only)");

    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const w = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(w.content <= w.viewport, `overflow at ${width}: ${JSON.stringify(w)}`);
      await page.screenshot({ path: path.join(root, ".cache", "shots", `grow-sheet-${width}.png`), fullPage: true });
    }
    ok("no horizontal overflow at 1280 / 768 / 390 / 320");

    // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("about:blank");
    await page.goto(url);
    await page.fill(SEED, "777");
    await page.click(SUBMIT);
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    ok("visual lint clean after a certify (contrast, palette, tap targets, dead classes)");

    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    const href = await page.locator(`[data-cabinet="${meta.id}"]`).getAttribute("href");
    assert.equal(href, `cabinets/${meta.id}/index.html`);
    await page.click(`[data-cabinet="${meta.id}"]`);
    assert.equal(await page.locator("h1").count(), 1);
    ok("floor tile opens this cabinet");

    assert.deepEqual(requests, [], "unexpected external requests");
    assert.deepEqual(errors, [], "page/console errors");
    ok("offline file://, zero page/console errors");
    console.log("grow-sheet cabinet browser test: PASS");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
