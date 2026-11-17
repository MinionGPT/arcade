// node cabinets/strain-gen/browser-test.js
// Drives the real Cabinet 04 page in headless Chromium (Playwright). Slower than engine.test.js: run it after UI edits.
// Needs `npm install` once (devDependency playwright). Browsers live in ./.cache/browsers.
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const root = path.resolve(__dirname, "..", "..");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".cache", "browsers");
const { chromium } = require(path.join(root, "node_modules", "playwright"));
const { lintPage } = require(path.join(root, "scripts", "visual-lint.js"));

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
  // Denied clipboard: exercises the file:// fallback without touching the OS clipboard.
  await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async () => { throw new Error("Denied by integration test"); } }
  }));
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", e => problems.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") problems.push("console: " + m.text()); });
  page.on("request", req => { if (!req.url().startsWith("file:")) problems.push("external request: " + req.url()); });

  await page.goto("file://" + path.join(root, "index.html"));
  await page.locator('a[data-cabinet="strain-gen"]').click();
  await page.waitForURL(/strain-gen\/index\.html/);
  console.log("ok  floor tile opens the cabinet:", page.url().split("/").slice(-3).join("/"));
  await page.goto("file://" + path.join(__dirname, "index.html"));
  assert.strictEqual(await page.locator("h1").count(), 1);

  // Empty state before any request.
  assert.match(await page.textContent("#result"), /AWAITING DROP REQUEST/);
  assert.strictEqual(await page.locator("#receipt-actions").isHidden(), true);
  console.log("ok  empty state shows AWAITING DROP REQUEST, no actions");

  // A real drop: 5 strains, full receipt rows, actions appear, no error.
  const batch = "THB-2026-11-16-777";
  await page.fill("#batch", batch);
  await page.fill("#count", "5");
  await page.click('#strain-form button[type="submit"]');
  assert.strictEqual((await page.textContent("#error")).trim(), "", "no error on a valid drop");
  const strains = page.locator("#result .strain");
  assert.strictEqual(await strains.count(), 5, "5 strain blocks");
  for (let i = 0; i < 5; i++) {
    const text = await strains.nth(i).textContent();
    assert.match(text, new RegExp(`STRAIN 00${i + 1}`));
    for (const label of ["NAME:", "LINEAGE:", "CULTURE:", "ROAST:"]) assert.ok(text.includes(label), `strain ${i} missing ${label}`);
  }
  const receipt = await page.textContent("#result");
  assert.ok(receipt.includes(batch), "receipt carries the batch code");
  assert.ok(/5 strains/i.test(receipt), "receipt carries the count");
  assert.strictEqual(await page.locator("#receipt-actions").isVisible(), true);
  console.log("ok  valid drop prints 5 strains with NAME/LINEAGE/CULTURE/ROAST and the batch code");

  // Determinism: the same batch + count must print the identical receipt.
  const first = (await page.textContent("#result")).replace(/\s+/g, " ").trim();
  await page.click('#strain-form button[type="submit"]');
  const second = (await page.textContent("#result")).replace(/\s+/g, " ").trim();
  assert.strictEqual(second, first, "same batch must reproduce the same drop");
  console.log("ok  same batch reproduces the identical receipt");

  // Different batch -> different drop (deterministic, so this is stable).
  await page.fill("#batch", "THB-OTHER-PLOT-042");
  await page.click('#strain-form button[type="submit"]');
  const other = (await page.textContent("#result")).replace(/\s+/g, " ").trim();
  assert.notStrictEqual(other, first, "a different batch must print a different drop");
  assert.ok(other.includes("THB-OTHER-PLOT-042"));
  console.log("ok  a different batch prints a different drop");

  // Hostile input stays text: no element injection, nothing executes.
  const hostile = '<img src=x onerror="window.hacked=true">';
  assert.ok(hostile.length <= 40, "fits the maxlength");
  await page.fill("#batch", hostile);
  await page.click('#strain-form button[type="submit"]');
  assert.strictEqual(await page.locator("#result img, #result script").count(), 0, "no injected elements");
  assert.strictEqual(await page.evaluate(() => window.hacked), undefined, "onerror never ran");
  assert.ok((await page.textContent("#result")).includes(hostile), "hostile input shown literally");
  console.log("ok  hostile batch code stays literal text, nothing executes");

  // The error path: blank batch must be refused with a message (dispatch submit so
  // native `required` validation does not pre-empt the engine's own check).
  await page.fill("#batch", "   ");
  await page.evaluate(() => document.getElementById("strain-form").dispatchEvent(new Event("submit", { cancelable: true })));
  assert.match(await page.textContent("#error"), /batch code/i, "blank batch is refused");
  console.log("ok  blank batch refused with a message");

  // Clipboard denied -> the manual-copy textarea shows the full receipt text.
  await page.fill("#batch", batch);
  await page.click('#strain-form button[type="submit"]');
  await page.click("#copyBtn");
  await page.waitForFunction(() => !document.getElementById("manual-copy").hidden);
  const copied = await page.inputValue("#copy-text");
  assert.ok(copied.includes("STRAIN DROP") && copied.includes(batch), "manual copy carries the receipt");
  assert.ok(copied.includes("5 STRAINS IN THE DROP"), "copied text is the full receiptText");
  console.log("ok  denied clipboard falls back to a selectable receipt textarea");

  // Layout: nothing wider than the viewport at desktop, tablet and phone.
  for (const [w, h] of [[1280, 900], [768, 1024], [390, 844], [320, 700]]) {
    await page.setViewportSize({ width: w, height: h });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `horizontal overflow of ${over}px at ${w}px`);
    fs.mkdirSync(path.join(root, ".cache", "shots"), { recursive: true });
    await page.screenshot({ path: path.join(root, ".cache", "shots", `strain-gen-${w}.png`), fullPage: true });
  }
  console.log("ok  no horizontal overflow at 1280 / 768 / 390 / 320 px");

  // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
  await page.setViewportSize({ width: 1280, height: 900 });
  const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
  assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
  console.log("ok  visual lint clean (contrast, palette, tap targets, dead classes)");

  assert.deepStrictEqual(problems, [], "browser reported errors");
  console.log("ok  zero page errors / console errors / external requests");
  await browser.close();
  console.log("strain-gen browser test: PASS");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
