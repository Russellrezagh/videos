// ───────────────────────────── score: a generative, timeline-locked pad ─────────────────────────────
// Every musical event is a pure function of film time, so the same schedule plays live (and survives
// seeking) and renders offline into the exported video's soundtrack.
const Score = (() => {
  const CHORDS = [
    [38, 50, 57, 60, 64, 69], [34, 46, 53, 57, 62, 65], [41, 53, 57, 60, 64, 67], [36, 48, 55, 59, 62, 64],
    [43, 55, 58, 62, 65, 69], [38, 50, 53, 57, 60, 64], [45, 52, 57, 60, 64, 67], [34, 46, 53, 58, 62, 65],
    [41, 53, 60, 64, 65, 69], [36, 48, 52, 55, 62, 67], [43, 50, 58, 62, 65, 70], [38, 50, 57, 62, 65, 69],
    [34, 46, 57, 62, 65, 69], [38, 50, 57, 60, 64, 69],
  ];
  const SCALE = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];
  const DENS = { intro: 0.3, tracking: 0.32, meaning: 0.28, credits: 0.2 };
  const BEAT = 0.6;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function makeGraph(ac, out) {
    const bus = ac.createGain(); bus.gain.value = 1;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.3;
    const verb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 4.2), ir = ac.createBuffer(2, len, ac.sampleRate), r = rng(99);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.55;
    const dry = ac.createGain(); dry.gain.value = 0.6;
    bus.connect(lp); lp.connect(dry); lp.connect(verb); verb.connect(wet);
    dry.connect(out); wet.connect(out);
    return { bus, live: [] };
  }

  /** schedule film-time window [T0, T1) of the score; toAc maps film seconds → AudioContext seconds */
  function schedule(ac, G, film, T0, T1, toAc, rate, done) {
    const now = ac.currentTime;
    film.scenes.forEach((sc, si) => {
      const S = sc.start, E = sc.start + sc.dur;
      const key = 'pad' + si;
      if (done.has(key) || E < T0 || S >= T1) return;
      done.add(key);
      const startF = Math.max(S - 1.2, T0), a0 = Math.max(now, toAc(startF)), a1 = toAc(E + 2.5);
      const attack = S - 1.2 < T0 ? 0.6 : 2.5;
      CHORDS[si % CHORDS.length].forEach((m, k) => {
        for (const [type, det, lvl] of [['sine', 0, 0.05], ['triangle', 6, 0.022], ['triangle', -7, 0.018]]) {
          const o = ac.createOscillator(), gn = ac.createGain();
          o.type = type; o.frequency.value = mtof(m); o.detune.value = det + (k % 2 ? 3 : -3);
          const level = lvl * (m < 48 ? 1.3 : m > 66 ? 0.55 : 1);
          gn.gain.setValueAtTime(0, a0);
          gn.gain.linearRampToValueAtTime(level, a0 + attack / rate);
          gn.gain.setValueAtTime(level, Math.max(a0 + attack / rate, a1 - 3.2 / rate));
          gn.gain.linearRampToValueAtTime(0, a1);
          o.connect(gn); gn.connect(G.bus); o.start(a0); o.stop(a1 + 0.1);
          G.live.push({ o, gn });
        }
      });
    });
    // sparse bell-like plinks on a beat grid
    for (let b = Math.ceil(T0 / BEAT); b * BEAT < T1; b++) {
      const key = 'b' + b; if (done.has(key)) continue; done.add(key);
      const tf = b * BEAT, sc = film.sceneAt(tf);
      if (!sc || hash01(b, 17) > (DENS[sc.key] ?? 0.18)) continue;
      const m = SCALE[Math.floor(hash01(b, 18) * SCALE.length)] + (hash01(b, 19) < 0.25 ? 12 : 0);
      const at = toAc(tf); if (at < now) continue;
      const o = ac.createOscillator(), gn = ac.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m);
      gn.gain.setValueAtTime(0, at); gn.gain.linearRampToValueAtTime(0.045, at + 0.012); gn.gain.exponentialRampToValueAtTime(0.0005, at + 2.2 / rate);
      o.connect(gn); gn.connect(G.bus); o.start(at); o.stop(at + 2.4 / rate);
      G.live.push({ o, gn });
    }
    // duck under the narrator
    for (const ln of film.lines) {
      const key = 'd' + ln.i; if (done.has(key) || ln.start + ln.dur < T0 || ln.start >= T1) continue; done.add(key);
      const a = Math.max(now, toAc(ln.start - 0.2)), b = Math.max(now, toAc(ln.start + ln.dur + 0.2));
      G.bus.gain.setTargetAtTime(0.55, a, 0.25); G.bus.gain.setTargetAtTime(1, b, 0.6);
    }
  }
  function stopAll(ac, G) {
    const now = ac.currentTime;
    for (const { o, gn } of G.live) { try { gn.gain.cancelScheduledValues(now); gn.gain.setTargetAtTime(0, now, 0.08); o.stop(now + 0.4); } catch (e) { /* already stopped */ } }
    G.live = [];
    G.bus.gain.cancelScheduledValues(now); G.bus.gain.setTargetAtTime(1, now, 0.1);
  }
  /** render the whole score offline; returns an AudioBuffer */
  async function renderOffline(film, sampleRate = 32000) {
    const ac = new OfflineAudioContext(2, Math.ceil((film.total + 1) * sampleRate), sampleRate);
    const master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    const G = makeGraph(ac, master);
    schedule(ac, G, film, 0, film.total + 1, f => f, 1, new Set());
    return ac.startRendering();
  }
  return { makeGraph, schedule, stopAll, renderOffline };
})();
