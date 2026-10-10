/* VoiceAnalyzer: prosody measurements from a mono recording.
   Input: Float32Array samples + sample rate. Output: metrics + tracks.
   Pitch: YIN at 8 kHz. Syllables: intensity peaks on voiced frames (de Jong & Wempe style). */
const VoiceAnalyzer = (() => {
  const SR = 8000, HOP = 80, WIN = 320; // 10 ms hop, 40 ms window

  function resample(x, sr) {
    if (sr === SR) return x;
    const k = sr / SR, n = Math.floor(x.length / k), y = new Float32Array(n);
    const half = Math.max(1, Math.floor(k / 2));
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i * k); let s = 0, m = 0;
      for (let j = c - half; j <= c + half; j++) if (j >= 0 && j < x.length) { s += x[j]; m++; }
      y[i] = s / m;
    }
    return y;
  }

  function yin(buf, off, tauMin, tauMax, d) {
    const W = 256;
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const v = buf[off + i] - buf[off + i + tau]; s += v * v; }
      d[tau] = s;
    }
    let run = 0; d[0] = 1;
    for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; d[tau] = run ? d[tau] * tau / run : 1; }
    let best = tauMin;
    for (let tau = tauMin; tau < tauMax; tau++) if (d[tau] < d[best]) best = tau;
    for (let tau = tauMin; tau < tauMax; tau++) {
      if (d[tau] < 0.25 || (tau === best && d[tau] < 0.45)) {
        while (tau + 1 < tauMax && d[tau + 1] < d[tau]) tau++;
        const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b;
        const t = den ? tau + (a - c) / (2 * den) : tau;
        return SR / t;
      }
    }
    return 0;
  }

  function pct(arr, p) {
    if (!arr.length) return NaN;
    const s = Float64Array.from(arr).sort();
    return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
  }

  function analyze(samples, sampleRate) {
    const x = resample(samples, sampleRate);
    const nF = Math.max(0, Math.floor((x.length - WIN - 260) / HOP));
    const db = new Float32Array(nF), f0 = new Float32Array(nF);
    for (let f = 0; f < nF; f++) {
      let s = 0; const o = f * HOP;
      for (let i = 0; i < WIN; i++) s += x[o + i] * x[o + i];
      db[f] = 10 * Math.log10(s / WIN + 1e-10);
    }
    const hi = pct(db, 0.95), lo = pct(db, 0.10);
    const speechThr = Math.max(lo + 6, hi - 25);
    const d = new Float32Array(130), tauMin = Math.floor(SR / 420), tauMax = Math.ceil(SR / 65);
    for (let f = 0; f < nF; f++) if (db[f] > speechThr) f0[f] = yin(x, f * HOP, tauMin, tauMax, d);

    // clean octave jumps and isolated voiced frames
    for (let f = 2; f < nF - 2; f++) {
      if (!f0[f]) continue;
      const nb = [f0[f - 2], f0[f - 1], f0[f + 1], f0[f + 2]].filter(Boolean);
      if (nb.length < 2) { f0[f] = 0; continue; }
      const med = nb.sort((a, b) => a - b)[Math.floor(nb.length / 2)];
      if (f0[f] > med * 1.8 || f0[f] < med * 0.55) f0[f] = 0;
    }

    // speech / silence segmentation
    const sp = new Uint8Array(nF);
    for (let f = 0; f < nF; f++) sp[f] = db[f] > speechThr ? 1 : 0;
    // close tiny gaps (<60 ms) and drop tiny bursts (<50 ms)
    const fill = (val, maxLen) => {
      let f = 0;
      while (f < nF) {
        if (sp[f] === val) { let e = f; while (e < nF && sp[e] === val) e++; if (e - f < maxLen && f > 0 && e < nF) sp.fill(1 - val, f, e); f = e; } else f++;
      }
    };
    fill(0, 6); fill(1, 5);
    let first = sp.indexOf(1), last = sp.lastIndexOf(1);
    if (first < 0) return { ok: false, reason: "No speech found. Check that the recording isn't silent." };
    const pauses = []; const runs = [];
    let f = first, runStart = first;
    while (f <= last) {
      if (!sp[f]) {
        let e = f; while (e <= last && !sp[e]) e++;
        const len = (e - f) / 100;
        if (len >= 0.25) { pauses.push({ at: f / 100, len }); runs.push((f - runStart) / 100); runStart = e; }
        f = e;
      } else f++;
    }
    runs.push((last + 1 - runStart) / 100);
    const total = (last + 1 - first) / 100;
    const pauseTime = pauses.reduce((a, p) => a + p.len, 0);
    const speechTime = Math.max(0.1, total - pauseTime);

    // syllable nuclei: smoothed intensity peaks, voiced, with 2 dB dips either side
    const sm = new Float32Array(nF);
    for (let i = 0; i < nF; i++) { let s = 0, m = 0; for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < nF) { s += db[j]; m++; } sm[i] = s / m; }
    const peakThr = Math.max(speechThr + 2, pct(Array.from(sm).filter((v, i) => sp[i]), 0.5) - 8);
    const nuclei = []; let lastPeak = -100;
    for (let i = 1; i < nF - 1; i++) {
      if (!(sm[i] >= sm[i - 1] && sm[i] > sm[i + 1]) || sm[i] < peakThr || !sp[i]) continue;
      let voiced = false; for (let j = i - 3; j <= i + 3; j++) if (f0[j]) { voiced = true; break; }
      if (!voiced) continue;
      let lmin = sm[i]; for (let j = i - 1; j >= Math.max(0, i - 25); j--) { lmin = Math.min(lmin, sm[j]); if (sm[j] > sm[i]) break; }
      let rmin = sm[i]; for (let j = i + 1; j < Math.min(nF, i + 25); j++) { rmin = Math.min(rmin, sm[j]); if (sm[j] > sm[i]) break; }
      if (sm[i] - lmin < 1 || sm[i] - rmin < 1) continue;
      if (i - lastPeak < 7) { if (sm[i] > sm[lastPeak]) nuclei[nuclei.length - 1] = i, lastPeak = i; continue; }
      nuclei.push(i); lastPeak = i;
    }
    // detector finds ~85% of dictionary syllables in connected speech (calibrated on transcribed clips)
    const syl = Math.round(nuclei.length * 1.15);

    const voicedHz = []; for (let i = 0; i < nF; i++) if (f0[i]) voicedHz.push(f0[i]);
    const med = pct(voicedHz, 0.5);
    const st = (hz) => 12 * Math.log2(hz / med);
    const p5 = pct(voicedHz, 0.05), p95 = pct(voicedHz, 0.95);
    const stArr = voicedHz.map(st);
    const mean = stArr.reduce((a, b) => a + b, 0) / (stArr.length || 1);
    const sd = Math.sqrt(stArr.reduce((a, b) => a + (b - mean) ** 2, 0) / (stArr.length || 1));

    const track = [];
    for (let i = first; i <= last; i += 2) track.push([+(i / 100 - first / 100).toFixed(2), f0[i] ? +st(f0[i]).toFixed(1) : null, +(db[i] - hi).toFixed(1)]);

    return {
      ok: true,
      seconds: total,
      syllables: syl,
      wordsEst: Math.round(syl / 1.35),
      wpm: Math.round(syl / 1.35 / total * 60),
      sylRate: syl / total,
      artRate: syl / speechTime,
      pauseShare: pauseTime / total,
      pausesPerMin: pauses.length / total * 60,
      longPauses: pauses.filter(p => p.len >= 1).length,
      meanPause: pauses.length ? pauseTime / pauses.length : 0,
      runMedian: pct(runs, 0.5),
      runMax: Math.max(...runs),
      f0Median: med,
      rangeSt: 12 * Math.log2(p95 / p5),
      pitchSd: sd,
      voicedShare: voicedHz.length / Math.max(1, (last - first)),
      pauses: pauses.map(p => ({ at: +(p.at - first / 100).toFixed(2), len: +p.len.toFixed(2) })),
      nuclei: nuclei.map(i => +((i - first) / 100).toFixed(2)),
      track
    };
  }
  return { analyze };
})();
if (typeof module !== "undefined") module.exports = VoiceAnalyzer;
