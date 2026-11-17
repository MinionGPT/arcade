// node cabinets/no-cap-stamp/browser-test.js   (real Chromium; needs `npm install` once)
const fs = require("fs");
const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "..", "..");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".cache", "browsers");
const { chromium } = require(path.join(root, "node_modules", "playwright"));
const { lintPage } = require(path.join(root, "scripts", "visual-lint.js"));
const flat = s => s.replace(/\s+/g, " ").trim();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const problems = [];
  let dialogs = 0;
  page.on("dialog", d => { dialogs++; d.dismiss(); });
  page.on("pageerror", e => problems.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") problems.push("console: " + m.text()); });
  await page.goto("file://" + path.join(__dirname, "index.html"));

  for (const [value, label] of [["NO_CAP", "NO CAP"], ["CAP", "CAP"], ["NOT_CHECKED", "NOT CHECKED"]]) {
    await page.fill("#claim", "Weekend project, two days tops.");
    await page.selectOption("#verdict", value);
    await page.click("button[type=submit]");
    assert.strictEqual(flat(await page.textContent("#result .verdict")), label);
    assert.match(flat(await page.textContent("#result")), /NOT INDEPENDENTLY VERIFIED/);
  }
  console.log("ok  all three verdicts print a receipt that says it is not verified");

  await page.fill("#claim", '<img src=x onerror="alert(1)"><script>alert(2)</script> **bold**');
  await page.fill("#evidence", "<b>my evidence</b>");
  await page.click("button[type=submit]");
  assert.strictEqual(await page.locator("#result img, #result script, #result b").count(), 0, "no injected elements");
  assert.ok(flat(await page.textContent("#result")).includes("<img src=x"), "hostile text shown literally");
  assert.strictEqual(dialogs, 0, "no alert fired");
  console.log("ok  hostile claim and evidence are shown as plain text, nothing executed");

  await page.fill("#claim", "   ");
  await page.click("button[type=submit]");
  // `required` blocks the empty submit in the browser; the claim box must still hold the whitespace
  assert.strictEqual(await page.inputValue("#claim"), "   ");
  console.log("ok  blank claim does not print a receipt");

  await page.fill("#claim", "Copy me");
  await page.click("button[type=submit]");
  await page.click("#copyBtn");
  await page.waitForFunction(() => document.getElementById("copy-status").textContent.length > 0 || !document.getElementById("manual-copy").hidden, null, { timeout: 4000 });
  console.log("ok  COPY RECEIPT answers (clipboard or manual fallback)");

  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal overflow at " + w);
  }
  console.log("ok  no horizontal overflow at 1280 / 390 px");

  // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
  await page.setViewportSize({ width: 1280, height: 900 });
  const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
  assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
  console.log("ok  visual lint clean (contrast, palette, tap targets, dead classes)");

  assert.deepStrictEqual(problems, [], "browser reported errors");
  console.log("ok  zero page errors / console errors");
  await browser.close();
  console.log("no-cap-stamp browser test: PASS");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
