/* Real-Chromium test for Cabinet 13 — MOTH MARKETS.
 * The node engine is the oracle: the page must print what the engine computed,
 * and the stamp must PAINT (getComputedStyle), not just say the right word.
 * Run: node cabinets/moth-markets/browser-test.js
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

const ok = message => console.log("ok  " + message);

// Find a winning and a losing batch code from the engine itself — no typed verdicts.
function seedWith(want) {
  for (let s = 1; s <= 4000; s++) if (Core.run(String(s)).verdict === want) return String(s);
  throw new Error("no seed with verdict " + want);
}
const WIN = seedWith("NO CAP"), LOSE = seedWith("CAP");

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

    async function run(seed) {
      await page.goto("about:blank");
      await page.goto(url);
      await page.fill("#input", seed);
      await page.click("#play-form button");
    }

    async function paint() {
      return page.evaluate(() => {
        const el = document.getElementById("output-stamp");
        const cs = getComputedStyle(el);
        return { text: el.textContent, bg: cs.backgroundColor, cls: el.className };
      });
    }

    await page.goto(url);
    assert.equal(await page.locator("h1").count(), 1, "exactly one h1");
    ok("page loads with one h1");

    // The page prints exactly what the engine computed for the losing seed.
    await run(LOSE);
    const r = Core.run(LOSE);
    const sign = r.final.returnPct >= 0 ? "+" : "";
    const expected = `END NET ${r.final.endNet.toFixed(2)} / RETURN ${sign}${r.final.returnPct.toFixed(2)}% / FEES ${r.final.feesPaid.toFixed(2)}`;
    assert.equal(await page.textContent("#output-line"), expected);
    ok(`statement totals match the engine for batch ${LOSE} (${expected})`);

    // 30 days of tape + one header row.
    assert.equal(await page.locator("#output-rows li").count(), Core.DAYS + 1);
    assert.match(await page.textContent("#output-title"), new RegExp(`BATCH ${LOSE}$`));
    ok("30 statement rows + header, titled with the batch code");

    // The stamp says CAP and is NOT brass.
    const cap = await paint();
    assert.equal(cap.text, "STAMP: CAP");
    assert.match(cap.cls, /mm-stamp-cap/);
    assert.equal(cap.bg, "rgba(0, 0, 0, 0)", "CAP must stay unpainted");
    ok(`CAP paints transparent (${cap.bg}) — label and paint agree`);

    // The winner: same statement shape, NO CAP, and the brass is REAL.
    await run(WIN);
    const win = await paint();
    assert.equal(win.text, "STAMP: NO CAP");
    assert.match(win.cls, /mm-stamp-ok/);
    assert.equal(win.bg, "rgb(233, 190, 70)", `NO CAP must paint brass, got ${win.bg}`);
    assert.equal(Core.run(WIN).verdict, "NO CAP", "engine and page agree on the verdict");
    ok(`NO CAP paints brass (${win.bg}) for batch ${WIN}`);

    // Refusals: the empty box and letters get different, correct messages.
    await page.fill("#input", "");
    await page.evaluate(() => document.getElementById("play-form").noValidate = true);
    await page.click("#play-form button");
    assert.match(await page.textContent("#error"), /batch code/i);
    ok("empty batch code refused with the batch-code message");
    await page.fill("#input", "abc123");
    await page.click("#play-form button");
    assert.match(await page.textContent("#error"), /digits only/i);
    ok("letters refused with the digits-only message (digits checked before length)");

    // Hostile input stays literal text: nothing executes, no img node.
    const hostile = '<img src=x onerror="window.hacked=true">abc';
    await page.fill("#input", hostile);
    await page.click("#play-form button");
    assert.equal(await page.evaluate(() => window.hacked), undefined);
    assert.equal(await page.locator("#output-rows img").count(), 0);
    assert.match(await page.textContent("#error"), /digits only/i, "hostile paste is refused as letters");
    ok("hostile input stays literal, nothing executes");

    // Replay: ?seed= prints the same statement with no click.
    await page.goto("about:blank");
    await page.goto(url + "?seed=" + LOSE);
    assert.equal(await page.textContent("#output-stamp"), "STAMP: CAP");
    assert.match(await page.textContent("#output-title"), new RegExp(`BATCH ${LOSE}$`));
    ok("?seed= replay prints the statement on load");

    // Overflow at four widths.
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const w = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(w.content <= w.viewport, `overflow at ${width}: ${JSON.stringify(w)}`);
    }
    ok("no horizontal overflow at 1280 / 768 / 390 / 320");

    // Paint lint: contrast, palette, tap targets, classes no stylesheet defines.
    await page.setViewportSize({ width: 390, height: 900 });
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
    assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
    ok("visual lint clean after a play (contrast, palette, tap targets, dead classes)");

    // The floor tile opens this cabinet.
    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    const href = await page.locator('[data-cabinet="moth-markets"]').getAttribute("href");
    assert.equal(href, "cabinets/moth-markets/index.html");
    await page.click('[data-cabinet="moth-markets"]');
    assert.equal(await page.locator("h1").count(), 1);
    ok("floor tile opens this cabinet");

    assert.deepEqual(requests, [], "unexpected external requests");
    assert.deepEqual(errors, [], "page/console errors");
    ok("offline file://, zero page/console errors");
    console.log(`WIN seed ${WIN} / LOSE seed ${LOSE}`);
    console.log("moth-markets cabinet browser test: PASS");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
