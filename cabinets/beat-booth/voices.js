// Beat Booth sound: five drum voices, a lookahead scheduler, and an offline bounce to WAV.
// Browser only (needs AudioContext). Load AFTER beat.js. Voices take (ctx, out, noise, t) so the same
// code plays live and renders offline.
(function (root) {
"use strict";
const B = root.Beat;

function makeNoise(ctx) {
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let x = 12345; // fixed xorshift so every bounce is identical
  for (let i = 0; i < len; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = ((x >>> 0) / 4294967296) * 2 - 1; }
  return buf;
}
function env(ctx, g, t, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}
function noiseHit(ctx, out, noise, t, type, freq, peak, decay, q) {
  const src = ctx.createBufferSource(); src.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  const g = ctx.createGain(); env(ctx, g, t, peak, decay);
  src.connect(f); f.connect(g); g.connect(out); src.start(t, 0.1); src.stop(t + decay + 0.02);
}
const VOICES = {
  kick(ctx, out, noise, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    env(ctx, g, t, 1.0, 0.42); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.45);
  },
  snare(ctx, out, noise, t) {
    noiseHit(ctx, out, noise, t, "bandpass", 1900, 0.7, 0.2, 0.8);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(190, t);
    env(ctx, g, t, 0.5, 0.12); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.15);
  },
  clap(ctx, out, noise, t) {
    [0, 0.011, 0.023].forEach(dt => noiseHit(ctx, out, noise, t + dt, "bandpass", 1250, 0.8, 0.03, 1.2));
    noiseHit(ctx, out, noise, t + 0.034, "bandpass", 1250, 0.9, 0.18, 1.2);
  },
  hat(ctx, out, noise, t) { noiseHit(ctx, out, noise, t, "highpass", 7500, 0.32, 0.055); },
  bell(ctx, out, noise, t) { // two detuned squares through a bandpass: cheap tuk-tuk cowbell
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 800; f.Q.value = 1.4;
    const g = ctx.createGain(); env(ctx, g, t, 0.35, 0.28);
    [540, 810].forEach(hz => { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz;
      o.connect(f); o.start(t); o.stop(t + 0.3); });
    f.connect(g); g.connect(out);
  },
};

function scheduleStep(ctx, out, noise, pattern, step, t) {
  B.hitsAt(pattern, step).forEach(id => VOICES[id](ctx, out, noise, t));
}

// Live engine. Lookahead scheduling: a 25 ms timer queues notes up to 120 ms early on the audio clock,
// so timing is the audio clock's, not setInterval's.
function createEngine(getState) {
  let ctx = null, out = null, noise = null, timer = null, step = 0, barStart = 0;
  const queue = [];
  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) throw new Error("This browser has no WebAudio");
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
      out = ctx.createGain(); out.gain.value = 0.85; out.connect(comp);
      noise = makeNoise(ctx);
    }
    return ctx.resume ? ctx.resume() : Promise.resolve();
  }
  function tick() {
    const s = getState();
    while (true) {
      const t = Math.max(barStart + B.stepOffset(step, s.bpm, s.swing), ctx.currentTime);
      if (t > ctx.currentTime + 0.12) break;
      scheduleStep(ctx, out, noise, s.pattern, step, t);
      queue.push({ step, t });
      step++;
      if (step === B.STEPS) { step = 0; barStart += B.barSeconds(s.bpm); }
    }
  }
  return {
    async start() {
      await ensure();
      step = 0; barStart = ctx.currentTime + 0.06; queue.length = 0;
      tick(); timer = setInterval(tick, 25);
    },
    stop() { clearInterval(timer); timer = null; queue.length = 0; },
    get running() { return timer !== null; },
    // The step whose time has passed on the audio clock; -1 when stopped.
    currentStep() {
      if (!timer) return -1;
      let cur = -1;
      while (queue.length && queue[0].t <= ctx.currentTime) cur = queue.shift().step;
      return cur;
    },
    get contextState() { return ctx ? ctx.state : "none"; },
  };
}

// Offline bounce: `bars` bars (default 2) rendered faster than realtime. Returns {samples, sampleRate}.
async function bounce(state, bars) {
  const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
  const sampleRate = 44100, n = bars || 2;
  const seconds = B.barSeconds(state.bpm) * n + 0.6;
  const ctx = new OAC(1, Math.ceil(seconds * sampleRate), sampleRate);
  const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
  const out = ctx.createGain(); out.gain.value = 0.85; out.connect(comp);
  const noise = makeNoise(ctx);
  for (let bar = 0; bar < n; bar++) {
    for (let step = 0; step < B.STEPS; step++) {
      scheduleStep(ctx, out, noise, state.pattern, step, 0.02 + bar * B.barSeconds(state.bpm) + B.stepOffset(step, state.bpm, state.swing));
    }
  }
  const buf = await ctx.startRendering();
  return { samples: buf.getChannelData(0), sampleRate };
}

root.Beat = Object.assign(root.Beat || {}, { createEngine, bounce, VOICES });
})(typeof globalThis !== "undefined" ? globalThis : this);
