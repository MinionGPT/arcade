// node cabinets/777-slot/browser-test.js   (real Chromium; needs `npm install` once)
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
  page.on("pageerror", e => problems.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") problems.push("console: " + m.text()); });
  await page.goto("file://" + path.join(__dirname, "index.html"));

  // regression: a negative rAF delta once threw inside the animation and froze the lever for good
  const stamps = new Set();
  for (let i = 0; i < 10; i++) {
    await page.click("#spinBtn", { timeout: 8000 });
    await page.waitForFunction(() => !document.getElementById("spinBtn").disabled, null, { timeout: 5000 });
    const text = flat(await page.textContent("#result"));
    assert.match(text, /777-v1-\d+-10/, "receipt shows a ticket");
    stamps.add(/STAMP\s*(NO CAP|CAP)/.exec(text)[1]);
  }
  console.log("ok  10 spins in a row, lever re-enabled every time; stamps seen:", [...stamps].join(" + "));

  // paytable on the page is the paytable in the engine
  const table = flat(await page.textContent("#paytable"));
  const pay = await page.evaluate(() => Slot.PAYTABLE);
  for (const mult of Object.values(pay)) assert.ok(table.includes(mult + "×"), `paytable shows ${mult}×`);
  console.log("ok  paytable on screen matches Slot.PAYTABLE", JSON.stringify(pay));

  // replay: same ticket, same receipt body
  const ticket = await page.inputValue("#ticket");
  const original = flat(await page.textContent("#result")).replace("ORIGINAL DRAW", "REPLAY COPY");
  await page.click("#replay-details summary");
  await page.click("#replayBtn");
  await page.waitForFunction(() => /REPLAY COPY/.test(document.getElementById("result").textContent));
  assert.strictEqual(flat(await page.textContent("#result")), original);
  console.log("ok  replaying", ticket, "reproduces the receipt exactly");

  await page.goto("file://" + path.join(__dirname, "index.html") + "#ticket=777-v1-777-10");
  await page.waitForFunction(() => /777-v1-777-10/.test(document.getElementById("result").textContent));
  assert.match(flat(await page.textContent("#result")), /REEL.*FIRE \/ SKULL \/ SKULL/);
  console.log("ok  #ticket=777-v1-777-10 link replays FIRE / SKULL / SKULL");

  await page.fill("#ticket", "777-v1-0-999"); await page.click("#replayBtn");
  assert.ok((await page.textContent("#error")).length > 0, "bad ticket shows an error");
  console.log("ok  bad ticket is refused with a message");

  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal overflow at " + w);
  }
  console.log("ok  no horizontal overflow at 1280 / 390 px");

  // ---- Lucky Moth session watch (Cabinet 01 priority): the mood must change the PAINT, not just the label ----
  const Slot = require("./slot.js");
  const seedWhere = pred => { for (let s = 1; s < 5000; s++) if (pred(Slot.spin(s, 10))) return s; throw new Error("no seed"); };
  const seedLoss = seedWhere(r => r.payout === 0), seedWin = seedWhere(r => r.tier === "win");
  const spinWith = async (seed, bet) => {                     // a REAL click on the lever; only the dice are pinned
    await page.evaluate(s => { crypto.getRandomValues = a => { a[0] = s; return a; }; }, seed);
    await page.fill("#bet", String(bet));
    await page.click("#spinBtn");
    await page.waitForFunction(() => !document.getElementById("spinBtn").disabled, null, { timeout: 5000 });
  };
  const paint = () => page.evaluate(() => {
    const cs = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
    const t = id => document.getElementById(id).textContent;
    return {
      dataMood: document.getElementById("lucky-moth").dataset.mood, wing: cs(".moth-wing-l", "fill"), wingR: cs(".moth-wing-r", "fill"),
      flap: cs(".moth-wing-l", "animationDuration"), flapName: cs(".moth-wing-l", "animationName"), stampBg: cs("#moth-stamp", "backgroundColor"), stampInk: cs("#moth-stamp", "color"),
      sweat: cs(".moth-sweat", "display"), alarm: cs(".moth-alarm", "display"), x: cs(".moth-x", "display"), eye: cs(".moth-eye", "display"),
      fig: cs(".moth-fig", "transform"), lineInk: cs("#moth-line", "color"), stamp: t("moth-stamp"), mood: t("moth-mood"), source: t("moth-source"),
      spins: t("moth-spins"), staked: t("moth-staked"), returned: t("moth-returned"), rtp: t("moth-session-rtp"), edge: t("moth-edge"),
      machine: t("moth-machine-rtp"), replays: t("moth-replays"), line: t("moth-line"), thin: t("moth-thin")
    };
  });
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
  const shot = async () => require("crypto").createHash("sha1").update(await page.locator("#lucky-moth").screenshot({ animations: "disabled" })).digest("hex");
  const sessions = {};
  const readMood = async (name, steps) => {
    await page.click("#mothReset");
    for (const [seed, bet] of steps) await spinWith(seed, bet);
    const p = await paint();
    assert.equal(p.dataMood, name, name + ": data-mood");
    assert.equal(p.mood, name.toUpperCase(), name + ": mood label");
    const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });   // legibility in every mood
    assert.deepEqual(found, [], name + " visual lint: " + JSON.stringify(found));
    sessions[name] = { ...p, shot: await shot() };
    return p;
  };
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.click("#mothReset");
  const machineRtp = await page.evaluate(() => Slot.analyze().rtp);
  const idle = await paint();
  assert.equal(idle.source, "READING: THE MACHINE");
  assert.equal(idle.machine, (machineRtp * 100).toFixed(2) + "%", "machine RTP on screen = Slot.analyze()");
  assert.equal(idle.dataMood, "sweats", "no spins: the moth quotes the machine edge (8.1%) -> sweats");
  assert.equal(idle.spins, "0");
  console.log("ok  moth before any spin quotes the machine:", idle.machine, "->", idle.mood, "/", idle.stamp);

  await readMood("dead", [[seedLoss, 10]]);
  await readMood("calm", [[seedWin, 10]]);
  await readMood("sweats", [[seedWin, 9], [seedLoss, 11]]);   // returned 18 / staked 20 = 90.00% exactly
  await readMood("panics", [[seedWin, 9], [seedLoss, 12]]);   // returned 18 / staked 21 = 85.71%
  const S = sessions;
  assert.equal(S.sweats.rtp, "90.00%"); assert.equal(S.panics.rtp, "85.71%"); assert.equal(S.dead.rtp, "0.00%"); assert.equal(S.calm.rtp, "200.00%");
  assert.equal(S.sweats.source, "READING: YOUR SESSION");
  assert.deepEqual([S.calm.stamp, S.sweats.stamp, S.panics.stamp, S.dead.stamp], ["NO CAP", "NO CAP", "CAP", "CAP"]);
  assert.ok(/THIN SAMPLE: 2 SPINS/.test(S.panics.thin), "tiny sample is called thin: " + S.panics.thin);
  console.log("ok  all four moods reached by real lever pulls: calm 200.00% / sweats 90.00% / panics 85.71% / dead 0.00%");

  // paint, not label: the wings tarnish, the stamp inverts, the face parts swap
  const wings = ["calm", "sweats", "panics", "dead"].map(m => S[m].wing);
  assert.equal(new Set(wings).size, 4, "four moods, four wing colours: " + wings.join(" | "));
  assert.equal(S.calm.wing, "rgb(233, 190, 70)", "calm wings are house brass");
  assert.equal(S.calm.wing, S.calm.wingR, "both wings agree");
  assert.equal(S.calm.stampBg, "rgba(0, 0, 0, 0)", "NO CAP stamp is outline-only"); assert.equal(S.sweats.stampBg, "rgba(0, 0, 0, 0)");
  assert.equal(S.panics.stampBg, "rgb(233, 190, 70)", "CAP stamp is a solid brass block"); assert.equal(S.dead.stampBg, "rgb(233, 190, 70)");
  assert.equal(S.panics.stampInk, "rgb(23, 23, 20)", "CAP stamp is ink on brass");
  assert.equal(S.calm.sweat, "none"); assert.notEqual(S.sweats.sweat, "none", "sweat drop appears when it sweats"); assert.notEqual(S.panics.sweat, "none");
  assert.equal(S.sweats.alarm, "none"); assert.notEqual(S.panics.alarm, "none", "alarm strokes only when panicking");
  assert.notEqual(S.dead.x, "none"); assert.equal(S.dead.eye, "none", "dead moth has X eyes, not round ones"); assert.equal(S.calm.x, "none");
  assert.equal(S.calm.fig, "none"); assert.notEqual(S.dead.fig, "none", "dead moth is flipped on its back");
  assert.ok(parseFloat(S.calm.flap) > parseFloat(S.sweats.flap) && parseFloat(S.sweats.flap) > parseFloat(S.panics.flap), "wing flap speeds up as the odds sink");
  assert.equal(S.dead.flapName, "none", "dead wings do not flap");
  assert.equal(new Set(Object.values(S).map(s => s.shot)).size, 4, "four moods, four different screenshots of the panel");
  console.log("ok  paint changes with mood: wings", wings.join(" > "), "| stamp fill | face parts | flap speed | 4 distinct pixel hashes");

  // replays are copies, not spins
  await page.click("#mothReset");
  await spinWith(seedLoss, 10);
  const ticket2 = await page.inputValue("#ticket");
  await page.click("#replayBtn");
  await page.waitForFunction(() => /REPLAY COPY/.test(document.getElementById("result").textContent));
  const afterReplay = await paint();
  assert.equal(afterReplay.spins, "1", "replay must not add a spin"); assert.equal(afterReplay.staked, "10 cr"); assert.equal(afterReplay.replays, "1");
  console.log("ok  replaying", ticket2, "leaves the ledger alone (spins 1, replays counted separately: 1)");
  await page.goto("about:blank");
  await page.goto("file://" + path.join(__dirname, "index.html") + "#ticket=" + ticket2);
  await page.waitForFunction(() => /REPLAY COPY/.test(document.getElementById("result").textContent));
  const fresh = await paint();
  assert.equal(fresh.spins, "0"); assert.equal(fresh.source, "READING: THE MACHINE"); assert.equal(fresh.replays, "1");
  console.log("ok  a shared replay link opens on a fresh moth: 0 spins, still quoting the machine");

  // hostile / odd: no page may overflow with the moth panel, any mood, any width
  await page.click("#mothReset");
  await spinWith(seedLoss, 100);
  for (const w of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "moth panel overflows at " + w);
  }
  console.log("ok  moth panel fits at 1280 / 768 / 390 / 320 px");

  // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
  await page.setViewportSize({ width: 1280, height: 900 });
  const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
  assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
  console.log("ok  visual lint clean (contrast, palette, tap targets, dead classes)");

  assert.deepStrictEqual(problems, [], "browser reported errors");
  console.log("ok  zero page errors / console errors");
  await browser.close();
  console.log("777-slot browser test: PASS");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
