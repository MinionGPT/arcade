// node cabinets/night-market/browser-test.js
// Drives the real Cabinet 05 page in headless Chromium (Playwright). Slower than
// engine.test.js: run it after UI edits.
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
  await page.locator('a[data-cabinet="night-market"]').click();
  await page.waitForURL(/night-market\/index\.html/);
  console.log("ok  floor tile opens the cabinet:", page.url().split("/").slice(-3).join("/"));
  await page.goto("file://" + path.join(__dirname, "index.html"));
  assert.strictEqual(await page.locator("h1").count(), 1);

  // Empty state before any stall is started.
  assert.match(await page.textContent("#result"), /AWAITING HAGGLE/);
  assert.strictEqual(await page.locator("#receipt-actions").isHidden(), true);
  console.log("ok  empty state shows AWAITING HAGGLE, no actions");

  // Start a stall: Auntie Noom, seed 777.
  await page.selectOption("#vendor", "noom");
  await page.fill("#seed", "777");
  await page.click("#startBtn");
  const opener = await page.textContent("#transcript");
  assert.ok(opener.includes("Auntie Noom"), "opener names the stall");
  assert.ok(await page.locator("#sendBtn").isEnabled());
  assert.match(await page.textContent("#status"), /ASK: 900B/, "opening ask shows");
  console.log("ok  stall opens with the vendor's opener and the opening ask");

  // Haggle: 630 -> counter 765, then 612 -> counter 688.
  await page.fill("#offer", "630");
  await page.click("#sendBtn");
  assert.match(await page.textContent("#status"), /ASK: 765B/);
  await page.fill("#offer", "612");
  await page.click("#sendBtn");
  assert.match(await page.textContent("#status"), /ASK: 688B/);
  console.log("ok  counters halve the gap toward the floor: 900 -> 765 -> 688");

  // Pay the ask -> deal at 688B. Saved 212 of 900 (23.5%) -> NO CAP.
  await page.click("#payBtn");
  assert.strictEqual(await page.locator("#receipt-actions").isHidden(), false, "receipt actions appear");
  const receipt = await page.locator("#result").textContent();
  const flat = receipt.replace(/\s+/g, " ");
  assert.ok(flat.includes("YOU PAID: 688B"), "receipt shows what was paid");
  assert.ok(flat.includes("STAMP: NO CAP"), "23.5% savings stamps NO CAP");
  assert.ok(receipt.includes("Auntie Noom"), "receipt names the stall");
  await page.click("#copyBtn");
  await page.waitForFunction(() => !document.getElementById("manual-copy").hidden);
  const copied = await page.inputValue("#copy-text");
  const flatCopy = copied.replace(/\s+/g, " ");
  assert.ok(flatCopy.includes("YOU PAID: 688B") && flatCopy.includes("STAMP: NO CAP"), "manual copy carries the receipt");
  console.log("ok  pay prints a receipt with the NO CAP stamp and saved amount");

  // Determinism: same seed, same clicks -> byte-identical receipt.
  const firstReceipt = receipt;
  await page.goto("file://" + path.join(__dirname, "index.html"));
  await page.selectOption("#vendor", "noom");
  await page.fill("#seed", "777");
  await page.click("#startBtn");
  await page.fill("#offer", "630");
  await page.click("#sendBtn");
  await page.fill("#offer", "612");
  await page.click("#sendBtn");
  await page.click("#payBtn");
  assert.equal(await page.locator("#result").textContent(), firstReceipt, "same seed replays the identical transcript and receipt");
  console.log("ok  same seed replays the identical transcript and receipt");

  // Hostile input stays literal text: nothing executes, the stall keeps going.
  await page.goto("file://" + path.join(__dirname, "index.html"));
  await page.selectOption("#vendor", "noom");
  await page.fill("#seed", "777");
  await page.click("#startBtn");
  const hostile = '<img src=x onerror="window.hacked=true">';
  await page.fill("#offer", hostile);
  await page.click("#sendBtn");
  const transcript = await page.locator("#transcript").textContent();
  assert.ok(transcript.includes("That is not a number"), "hostile offer is refused, not echoed");
  assert.strictEqual(await page.locator("#transcript img, #transcript script").count(), 0, "no injected elements");
  assert.strictEqual(await page.evaluate(() => window.hacked), undefined, "onerror never ran");
  await page.fill("#offer", "630");
  await page.click("#sendBtn");
  assert.match(await page.locator("#status").textContent(), /ASK: 765B/, "stall still alive after hostile input");
  console.log("ok  hostile offer stays literal text, nothing executes, game continues");

  // Blank offer is refused, never crashes.
  await page.fill("#offer", "   ");
  await page.click("#sendBtn");
  const tc = await page.locator("#transcript").textContent();
  assert.ok(tc.includes("That is not a number"), "blank offer is refused");
  console.log("ok  garbage input is roasted and re-asked");

  // Walkaway ending: Leng, walk immediately -> CAP, paid nothing.
  await page.goto("file://" + path.join(__dirname, "index.html"));
  await page.selectOption("#vendor", "leng");
  await page.fill("#seed", "5");
  await page.click("#startBtn");
  await page.click("#walkBtn");
  const walked = await page.locator("#result").textContent();
  const flatWalked = walked.replace(/\s+/g, " ");
  assert.ok(flatWalked.includes("YOU PAID: 0B"), "walked away with nothing");
  assert.ok(flatWalked.includes("STAMP: CAP"), "walkaway is a CAP");
  assert.ok(flatWalked.includes("OUTCOME: walked"), "outcome recorded");
  console.log("ok  walkaway ending: nothing and a story, stamped CAP");

  // Bot mode: tight budget burns nerve until the vendor storms.
  await page.goto("file://" + path.join(__dirname, "index.html"));
  await page.selectOption("#vendor", "max");
  await page.fill("#seed", "1");
  await page.check("#bot");
  await page.fill("#budget", "0.05");
  await page.click("#startBtn");
  const stormed = await page.locator("#result").textContent();
  const flatStormed = stormed.replace(/\s+/g, " ");
  assert.ok(flatStormed.includes("YOU PAID: 0B"), "stormed stall pays nothing");
  assert.ok(/OUTCOME: (stormed|walked)/.test(flatStormed), "nerve ran out: " + flatStormed);
  assert.ok(flatStormed.includes("STAMP: CAP"), "no deal is a CAP");
  console.log("ok  bot runs the pure engine to a stormed/walked ending");

  // Layout: nothing wider than the viewport at desktop, tablet and phone.
  for (const [w, h] of [[1280, 900], [768, 1024], [390, 844], [320, 700]]) {
    await page.setViewportSize({ width: w, height: h });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `horizontal overflow of ${over}px at ${w}px`);
    fs.mkdirSync(path.join(root, ".cache", "shots"), { recursive: true });
    await page.screenshot({ path: path.join(root, ".cache", "shots", `night-market-${w}.png`), fullPage: true });
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
  console.log("night-market browser test: PASS");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
