// node cabinets/beat-booth/browser-test.js
// Drives the real page in headless Chromium (Playwright). Slower than test.js: run it after UI edits.
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const problems = [];
  page.on("pageerror", e => problems.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") problems.push("console: " + m.text()); });
  await page.goto("file://" + path.join(root, "index.html"));
  await page.locator('a[data-cabinet="beat-booth"]').click();
  await page.waitForURL(/beat-booth\/index\.html/);
  console.log("ok  floor tile opens the cabinet:", page.url().split("/").slice(-3).join("/"));
  await page.goto("file://" + path.join(__dirname, "index.html"));

  const padCount = await page.locator(".bb-pad").count();
  assert.strictEqual(padCount, 80, "5 tracks x 16 steps");
  const onAtStart = await page.locator(".bb-pad.on").count();
  console.log("ok  80 pads rendered, preset 0 shows", onAtStart, "hits");
  assert.strictEqual(onAtStart, 4 + 0 + 2 + 4 + 1, "SUKHUMVIT 3AM = 4 kick + 2 clap + 4 hat + 1 bell");

  const codeBefore = await page.inputValue("#code");
  await page.locator('.bb-pad[data-t="1"][data-s="3"]').click();
  const codeAfter = await page.inputValue("#code");
  assert.notStrictEqual(codeBefore, codeAfter);
  assert.ok(/^BB1-\d+-\d+-[0-9A-F]{4}(-[0-9A-F]{4}){4}$/.test(codeAfter), codeAfter);
  assert.ok((await page.evaluate(() => location.hash)).includes(codeAfter), "hash follows the beat");
  console.log("ok  clicking a pad changes the code:", codeBefore, "->", codeAfter);
  assert.strictEqual(await page.inputValue("#preset"), "custom", "edited beat leaves the preset menu on 'your beat'");

  // drag paint across the hat row
  await page.click("#clear");
  const a = await page.locator('.bb-pad[data-t="3"][data-s="0"]').boundingBox();
  const z = await page.locator('.bb-pad[data-t="3"][data-s="7"]').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 24 }); await page.mouse.up();
  const painted = await page.locator('.bb-pad.on[data-t="3"]').count();
  assert.ok(painted >= 6, "drag should paint most of steps 1-8, got " + painted);
  console.log("ok  drag-painting turned on", painted, "hat pads");

  // load a code from the box
  await page.fill("#code", "BB1-124-0-8888-0000-0808-2222-0001");
  await page.click("#load");
  assert.strictEqual(await page.locator('.bb-pad.on[data-t="0"]').count(), 4);
  assert.strictEqual((await page.textContent("#verdict")).trim(), "NO CAP");
  console.log("ok  load code -> 4 kicks, stamp NO CAP");
  await page.fill("#code", "nonsense"); await page.click("#load");
  assert.match(await page.textContent("#status"), /not a Beat Booth/);
  console.log("ok  nonsense code is refused with a message");

  // play: audio clock drives the playhead
  await page.click("#play");
  await page.waitForTimeout(900);
  const playing = await page.evaluate(() => ({ now: document.querySelectorAll(".bb-pad.now").length, pressed: document.getElementById("play").getAttribute("aria-pressed") }));
  assert.strictEqual(playing.pressed, "true");
  assert.strictEqual(playing.now, 5, "playhead lights one column of 5 pads");
  await page.click("#play");
  assert.strictEqual(await page.locator(".bb-pad.now").count(), 0);
  console.log("ok  PLAY lights a playhead column, STOP clears it");

  // sound exists: render offline in the page and measure it
  const audio = await page.evaluate(async () => {
    const s = { bpm: 124, swing: 0, pattern: Beat.PRESETS[0].pattern };
    const r = await Beat.bounce(s, 2);
    let peak = 0, bad = 0, silentBars = 0;
    for (const v of r.samples) { if (!Number.isFinite(v)) bad++; const x = Math.abs(v); if (x > peak) peak = x; }
    const quarter = Math.floor(r.sampleRate * 0.1);
    let kickPeak = 0; for (let i = 0; i < quarter; i++) kickPeak = Math.max(kickPeak, Math.abs(r.samples[Math.floor(0.02 * r.sampleRate) + i]));
    const emptyR = await Beat.bounce({ bpm: 124, swing: 0, pattern: [0, 0, 0, 0, 0] }, 1);
    let emptyPeak = 0; for (const v of emptyR.samples) emptyPeak = Math.max(emptyPeak, Math.abs(v));
    return { peak, bad, seconds: r.samples.length / r.sampleRate, kickPeak, emptyPeak };
  });
  assert.strictEqual(audio.bad, 0);
  assert.ok(audio.peak > 0.2 && audio.peak <= 1.0001, "peak " + audio.peak);
  assert.ok(audio.kickPeak > 0.2, "the first kick lands at step 1: " + audio.kickPeak);
  assert.strictEqual(audio.emptyPeak, 0, "empty pattern must render silence");
  console.log("ok  offline render: peak", audio.peak.toFixed(3), "first-kick peak", audio.kickPeak.toFixed(3), "empty =", audio.emptyPeak, "len", audio.seconds.toFixed(2) + "s");

  // each voice sounds like what its label says (no ears here, so measure: zero-crossing rate ~ pitch/brightness)
  const voices = await page.evaluate(async () => {
    const out = {};
    for (let t = 0; t < Beat.TRACKS.length; t++) {
      const pattern = [0, 0, 0, 0, 0]; pattern[t] = 0x8000;
      const r = await Beat.bounce({ bpm: 124, swing: 0, pattern }, 1);
      const n = Math.floor(r.sampleRate * 0.25), start = Math.floor(0.02 * r.sampleRate);
      let peak = 0, zc = 0;
      for (let i = 0; i < n; i++) {
        const v = r.samples[start + i]; peak = Math.max(peak, Math.abs(v));
        if (i && (v >= 0) !== (r.samples[start + i - 1] >= 0)) zc++;
      }
      out[Beat.TRACKS[t].id] = { peak, hz: Math.round(zc / 2 / 0.25) };
    }
    return out;
  });
  console.log("    voices (peak, zero-cross Hz):", JSON.stringify(voices));
  for (const id of Object.keys(voices)) assert.ok(voices[id].peak > 0.05, id + " is audible");
  assert.ok(voices.kick.hz < 400, "kick is low: " + voices.kick.hz);
  assert.ok(voices.hat.hz > 3000, "hat is bright: " + voices.hat.hz);
  assert.ok(voices.hat.hz > voices.snare.hz && voices.snare.hz > voices.kick.hz, "kick < snare < hat in brightness");
  console.log("ok  kick is low, snare mid, hat bright");

  // WAV download is a real RIFF file
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#bounce")]);
  const file = path.join(root, ".cache", "bounce-test.wav");
  await dl.saveAs(file);
  const head = fs.readFileSync(file).subarray(0, 12).toString("latin1");
  assert.ok(head.startsWith("RIFF") && head.endsWith("WAVE"), head);
  console.log("ok  BOUNCE WAV downloaded", dl.suggestedFilename(), fs.statSync(file).size, "bytes");

  // mute: kick-only beat, kick muted -> the bounced WAV must be pure silence; unmuted -> not silent
  await page.fill("#code", "BB1-124-0-8888-0000-0000-0000-0000"); await page.click("#load");
  const wavPeak = async () => {
    const [d] = await Promise.all([page.waitForEvent("download"), page.click("#bounce")]);
    await d.saveAs(file);
    const buf = fs.readFileSync(file); let peak = 0;
    for (let i = 44; i + 1 < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    return peak;
  };
  const loud = await wavPeak();
  await page.click('.bb-row[data-track="kick"] .bb-label');
  assert.strictEqual(await page.getAttribute('.bb-row[data-track="kick"] .bb-label', "aria-pressed"), "true");
  const quiet = await wavPeak();
  assert.ok(loud > 3000 && quiet === 0, `unmuted peak ${loud}, muted peak ${quiet}`);
  await page.click('.bb-row[data-track="kick"] .bb-label');
  console.log("ok  mute works: kick-only bounce peak", loud, "-> muted", quiet);
  assert.ok((await page.innerHTML("#barcode")).includes("<rect"), "ticket barcode drawn");
  console.log("ok  ticket barcode drawn");

  // layout: nothing wider than the viewport at desktop and phone
  for (const [w, h] of [[1280, 900], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `horizontal overflow of ${over}px at ${w}px`);
    fs.mkdirSync(path.join(root, ".cache", "shots"), { recursive: true });
    await page.screenshot({ path: path.join(root, ".cache", "shots", `beat-booth-${w}.png`), fullPage: true });
  }
  console.log("ok  no horizontal overflow at 1280 / 768 / 390 px");

  // The paint check: contrast, palette, tap targets, classes no stylesheet defines.
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "cabinet.json"), "utf8"));
  await page.setViewportSize({ width: 1280, height: 900 });
  const found = await lintPage(page, { hookClasses: meta.hookClasses || [] });
  assert.deepEqual(found, [], "visual lint: " + JSON.stringify(found, null, 1));
  console.log("ok  visual lint clean (contrast, palette, tap targets, dead classes)");

  assert.deepStrictEqual(problems, [], "browser reported errors");
  console.log("ok  zero page errors / console errors");
  await browser.close();
  console.log("beat-booth browser test: PASS");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
