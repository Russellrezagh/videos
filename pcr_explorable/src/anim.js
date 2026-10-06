/*
 * Guided animation: one cycle in detail, then cycles 2 and 3 as a census.
 * Like a Manim scene, each frame is a pure function of (step, progress):
 * a step tweens from the state the previous step ended in to its own end
 * state, so stepping, scrubbing and jumping all give the same pictures.
 *
 * Objects keep their identity and colour throughout: the template strands
 * are blue (source), primers and polymerase green (agent), new strands
 * orange (product), temperature violet (param).
 *
 * Narration: one track (embedded MP3, Kokoro-82M voice) with an offset per
 * step. Without it, the captions carry the narration and steps advance on
 * a reading clock.
 */
(function () {
  'use strict';
  const { el, C } = FIG;
  const W = 1000;
  const H = 440;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);

  const STEPS = window.SCENE;


  /* ------------------------------------------------ geometry and states */
  const X0 = 100;
  const X1 = 860;
  const TL = 370;
  const TR = 590;
  const PL = 46; // primer length
  const GAP = 30; // paired strands
  // end state of each step: a flat map of numbers
  const S = [];
  S[0] = { topY: 200, botY: 230, rungs: 1, tgt: 1, temp: 25, pF: 0, pFy: 380, pR: 0, pRy: 30, nF: 0, nR: 0, pol: 0, over: 0, detail: 1, c2: 0, c3: 0, chart: 0 };
  S[1] = { ...S[0], topY: 110, botY: 330, rungs: 0, temp: 95 };
  S[2] = { ...S[1], temp: 58, pF: 1, pFy: 330 - GAP, pR: 1, pRy: 110 + GAP };
  S[3] = { ...S[2], temp: 72, nF: 1, nR: 1, pol: 1 };
  S[4] = { ...S[3], pol: 0, over: 1 };
  S[5] = { ...S[4], detail: 0, over: 0, c2: 1, tgt: 0 };
  S[6] = { ...S[5], c2: 0, c3: 1 };
  S[7] = { ...S[6], c3: 0, chart: 1 };
  const START = { ...S[0], tgt: 0, rungs: 1, detail: 1 };
  function state(step, p) {
    const a = step === 0 ? START : S[step - 1];
    const b = S[step];
    const q = ease(clamp01(p));
    const out = {};
    for (const k of Object.keys(b)) out[k] = lerp(a[k], b[k], q);
    out.step = step;
    out.p = clamp01(p);
    return out;
  }

  /* ------------------------------------------------ drawing */
  let svg;
  const n = {};
  function strand(id, role, parent, obj) {
    const g = el('g', { 'data-obj': obj }, parent);
    n[id] = { line: el('line', { stroke: C(role), 'stroke-width': 8, 'stroke-linecap': 'round' }, g), tip: el('path', { fill: C(role) }, g) };
    return g;
  }
  function setStrand(id, x0, x1, y, dir, o) {
    const s = n[id];
    s.line.setAttribute('x1', x0);
    s.line.setAttribute('x2', x1);
    s.line.setAttribute('y1', y);
    s.line.setAttribute('y2', y);
    s.line.setAttribute('opacity', o);
    // the arrow tip marks the 3' end: the direction a strand can grow
    const tx = dir > 0 ? x1 + 4 : x0 - 4;
    s.tip.setAttribute('d', `M ${tx + dir * 10} ${y} L ${tx - dir * 4} ${y - 9} L ${tx - dir * 4} ${y + 9} Z`);
    s.tip.setAttribute('opacity', o * (Math.abs(x1 - x0) > 20 ? 1 : 0));
  }
  function rungs(g, xa, xb, ya, yb, o, role) {
    while (g.firstChild) g.removeChild(g.firstChild);
    if (o <= 0.01 || xb - xa < 4) return;
    for (let x = Math.ceil(xa / 14) * 14; x <= xb; x += 14) el('line', { x1: x, y1: ya + 6, x2: x, y2: yb - 6, stroke: C(role), 'stroke-width': 2.2, opacity: 0.55 * o }, g);
  }
  function label(x, y, text, cls = 'svg-label', anchor = 'middle', parent = svg) {
    return el('text', { x, y, cls, 'text-anchor': anchor }, parent, text);
  }

  function build(host) {
    svg = FIG.svg(host, W, H, 'Animation of the PCR cycle');
    // detail view
    const d = (n.detail = el('g', {}, svg));
    n.tgt = el('rect', { x: TL, y: 150, width: TR - TL, height: 120, rx: 6, fill: C('source'), opacity: 0.1, 'data-obj': 'target' }, d);
    n.tgtL = label((TL + TR) / 2, 140, 'target', 'svg-label', 'middle', d);
    n.rTT = el('g', {}, d);
    n.rPF = el('g', {}, d);
    n.rPR = el('g', {}, d);
    n.rNF = el('g', {}, d);
    n.rNR = el('g', {}, d);
    strand('top', 'source', d, 'template');
    strand('bot', 'source', d, 'template');
    strand('nF', 'product', d, 'newstrand');
    strand('nR', 'product', d, 'newstrand');
    strand('pF', 'agent', d, 'primer');
    strand('pR', 'agent', d, 'primer');
    n.ends = el('g', {}, d);
    n.e5t = label(X0 - 26, 0, '5′', 'svg-mono', 'middle', n.ends);
    n.e3t = label(X1 + 30, 0, '3′', 'svg-mono', 'middle', n.ends);
    n.e3b = label(X0 - 26, 0, '3′', 'svg-mono', 'middle', n.ends);
    n.e5b = label(X1 + 30, 0, '5′', 'svg-mono', 'middle', n.ends);
    n.polF = el('g', { 'data-obj': 'polymerase' }, d);
    el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 24, fill: C('agent'), 'fill-opacity': 0.22, stroke: C('agent'), 'stroke-width': 3 }, n.polF);
    el('text', { x: 0, y: -32, cls: 'svg-label', 'text-anchor': 'middle', style: 'fill:var(--c-agent)' }, n.polF, 'polymerase');
    n.polR = el('g', { 'data-obj': 'polymerase' }, d);
    el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 24, fill: C('agent'), 'fill-opacity': 0.22, stroke: C('agent'), 'stroke-width': 3 }, n.polR);
    n.overF = el('rect', { x: TR, y: 0, width: X1 - TR, height: 26, rx: 5, fill: 'none', stroke: C('product'), 'stroke-width': 2, 'stroke-dasharray': '6 6' }, d);
    n.overR = el('rect', { x: X0, y: 0, width: TL - X0, height: 26, rx: 5, fill: 'none', stroke: C('product'), 'stroke-width': 2, 'stroke-dasharray': '6 6' }, d);
    n.overL1 = label(X1 - 10, 0, 'runs past the target', 'svg-label', 'end', d);
    n.overL2 = label(X0 + 10, 0, 'runs past the target', 'svg-label', 'start', d);
    n.dupL1 = label(X0 - 50, 128, '1', 'svg-mono', 'middle', d);
    n.dupL2 = label(X0 - 50, 318, '2', 'svg-mono', 'middle', d);
    // census views
    n.c2 = el('g', {}, svg);
    n.c3 = el('g', {}, svg);
    census(n.c2, 2);
    census(n.c3, 3);
    // chart
    n.chart = el('g', {}, svg);
    chart(n.chart);
    // thermometer and counters
    const t = (n.thermo = el('g', { 'data-obj': 'temperature' }, svg));
    el('rect', { x: 948, y: 50, width: 16, height: 330, rx: 8, fill: '--bg-3', stroke: C('param'), 'stroke-width': 1.5 }, t);
    n.tfill = el('rect', { x: 951, y: 0, width: 10, height: 0, rx: 5, fill: C('param') }, t);
    n.tval = el('text', { x: 956, y: 405, cls: 'svg-mono', 'text-anchor': 'middle', style: 'fill:var(--c-param)' }, t, '');
    n.cyc = el('text', { x: 20, y: 30, cls: 'svg-mono', style: 'font-size:15px' }, svg, '');
  }

  // one double strand drawn small: kind of top and bottom strand
  const SPAN = { O: [X0, X1], LF: [TL, X1], LR: [X0, TR], S: [TL, TR] };
  const ROLE = { O: 'source', LF: 'product', LR: 'product', S: 'product' };
  function glyph(g, x, y, w, top, bot, tag) {
    const sx = (v) => x + ((v - X0) / (X1 - X0)) * w;
    const gg = el('g', { 'data-obj': tag === 'amplicon' ? 'amplicon' : null }, g);
    for (const [k, yy] of [[top, y], [bot, y + 18]]) {
      const [a, b] = SPAN[k];
      el('line', { x1: sx(a), y1: yy, x2: sx(b), y2: yy, stroke: C(ROLE[k]), 'stroke-width': 7, 'stroke-linecap': 'round', opacity: k === 'O' ? 0.9 : k === 'S' ? 1 : 0.62 }, gg);
    }
    if (tag === 'amplicon') el('rect', { x: sx(TL) - 14, y: y - 14, width: sx(TR) - sx(TL) + 28, height: 46, rx: 6, fill: 'none', stroke: C('product'), 'stroke-width': 2.4 }, gg);
    return gg;
  }
  function census(g, cycle) {
    const rows = cycle === 2
      ? [['O', 'LF', 'original + long'], ['LR', 'O', 'long + original'], ['LF', 'S', 'long + exact'], ['S', 'LR', 'exact + long']]
      : [['O', 'LF', 'original + long'], ['LR', 'O', 'long + original'], ['LF', 'S', 'long + exact'], ['S', 'LR', 'exact + long'], ['LF', 'S', 'long + exact'], ['S', 'LR', 'exact + long'], ['S', 'S', 'amplicon'], ['S', 'S', 'amplicon']];
    const cols = 2;
    const w = 280;
    rows.forEach(([a, b, name], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 40 + col * 450;
      const y = (cycle === 2 ? 120 : 64) + row * (cycle === 2 ? 120 : 84);
      const gg = glyph(g, x, y, w, a, b, name === 'amplicon' ? 'amplicon' : null);
      gg.dataset.i = i;
      const t = el('text', { x: x + w + 18, y: y + 15, cls: `svg-label${name === 'amplicon' ? '' : ' glyph-name'}`, 'text-anchor': 'start' }, gg, name);
      if (name === 'amplicon') t.style.fill = `var(${C('product')})`;
    });
    el('text', { x: 500, y: cycle === 2 ? 70 : 34, cls: 'svg-label big', 'text-anchor': 'middle' }, g, cycle === 2 ? 'after cycle 2: 4 double strands, exact strands appear' : 'after cycle 3: 8 double strands, 2 exact on both strands');
  }
  function chart(g) {
    const bx = 120;
    const by = 360;
    const bw = 700;
    const bh = 250;
    const ly = (v) => by - (bh * Math.log10(Math.max(1, v))) / 3.2;
    el('line', { x1: bx, y1: by, x2: bx + bw, y2: by, stroke: C('context'), 'stroke-width': 1.5 }, g);
    for (const t of [1, 10, 100, 1000]) {
      el('line', { x1: bx - 6, y1: ly(t), x2: bx + bw, y2: ly(t), stroke: C('context'), 'stroke-width': 1, opacity: 0.25 }, g);
      el('text', { x: bx - 12, y: ly(t) + 5, cls: 'svg-mono', 'text-anchor': 'end' }, g, t.toLocaleString('en-US'));
    }
    n.bars = [];
    for (let c = 1; c <= 10; c++) {
      const cx = bx + (c - 0.5) * (bw / 10);
      const amp = PCR.closed.amplicons(c);
      const lng = PCR.closed.longStrands(c);
      const b1 = el('rect', { x: cx - 24, width: 22, y: ly(amp), height: by - ly(amp), fill: C('product'), 'data-obj': 'amplicon' }, g);
      const b2 = el('rect', { x: cx + 2, width: 22, y: ly(lng), height: by - ly(lng), fill: C('product'), opacity: 0.42 }, g);
      n.bars.push([b1, b2]);
      el('text', { x: cx, y: by + 22, cls: 'svg-mono', 'text-anchor': 'middle' }, g, String(c));
    }
    el('text', { x: bx + bw / 2, y: by + 46, cls: 'svg-label', 'text-anchor': 'middle' }, g, 'cycle');
    el('rect', { x: bx + 10, y: 70, width: 14, height: 14, fill: C('product') }, g);
    el('text', { x: bx + 32, y: 82, cls: 'svg-label' }, g, 'exact double strands  2ⁿ − 2n');
    el('rect', { x: bx + 330, y: 70, width: 14, height: 14, fill: C('product'), opacity: 0.42 }, g);
    el('text', { x: bx + 352, y: 82, cls: 'svg-label' }, g, 'long strands  2n');
    el('text', { x: 500, y: 34, cls: 'svg-label big', 'text-anchor': 'middle' }, g, `cycle 30: ${PCR.closed.amplicons(30).toLocaleString('en-US')} exact, ${PCR.closed.longStrands(30)} long`);
  }

  function draw(st) {
    const vis = (node, o) => {
      node.setAttribute('opacity', o.toFixed(3));
      node.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    };
    vis(n.detail, st.detail);
    vis(n.c2, st.c2);
    vis(n.c3, st.c3);
    vis(n.chart, st.chart);
    // cycle 3 glyphs arrive in order; the two amplicons last
    if (st.c3 > 0) n.c3.querySelectorAll('g[data-i]').forEach((gg) => gg.setAttribute('opacity', clamp01(st.c3 * 1.6 - Number(gg.dataset.i) * 0.08).toFixed(3)));
    if (st.chart > 0) n.bars.forEach(([a, b], i) => { const o = clamp01(st.chart * 2 - i * 0.12); a.setAttribute('opacity', o); b.setAttribute('opacity', 0.42 * o); });
    // template strands
    setStrand('top', X0, X1, st.topY, +1, 1);
    setStrand('bot', X0, X1, st.botY, -1, 1);
    n.tgt.setAttribute('y', st.topY - 30);
    n.tgt.setAttribute('height', st.botY - st.topY + 60);
    vis(n.tgt, 0.12 * st.tgt);
    vis(n.tgtL, st.tgt);
    n.tgtL.setAttribute('y', st.topY - 40);
    rungs(n.rTT, X0, X1, st.topY, st.botY, st.rungs, 'source');
    for (const [t, y] of [[n.e5t, st.topY], [n.e3t, st.topY], [n.e3b, st.botY], [n.e5b, st.botY]]) t.setAttribute('y', y + 5);
    // primers fly in to their sites
    const fy = st.pFy;
    const ry = st.pRy;
    setStrand('pF', TL, TL + PL, fy, +1, st.pF);
    setStrand('pR', TR - PL, TR, ry, -1, st.pR);
    const boundF = clamp01((st.pF - 0.85) / 0.15);
    rungs(n.rPF, TL, TL + PL, fy, st.botY, boundF, 'agent');
    rungs(n.rPR, TR - PL, TR, st.topY, ry, boundF, 'agent');
    // extension from the 3' ends
    const fx1 = lerp(TL + PL, X1, st.nF);
    const rx0 = lerp(TR - PL, X0, st.nR);
    setStrand('nF', TL + PL, fx1, fy, +1, st.nF > 0.002 ? 1 : 0);
    setStrand('nR', rx0, TR - PL, ry, -1, st.nR > 0.002 ? 1 : 0);
    rungs(n.rNF, TL + PL, fx1, fy, st.botY, st.nF > 0.002 ? 1 : 0, 'product');
    rungs(n.rNR, rx0, TR - PL, st.topY, ry, st.nR > 0.002 ? 1 : 0, 'product');
    n.polF.setAttribute('transform', `translate(${fx1 + 4},${(fy + st.botY) / 2})`);
    n.polR.setAttribute('transform', `translate(${rx0 - 4},${(ry + st.topY) / 2})`);
    vis(n.polF, st.pol * (st.nF > 0.01 ? 1 : 0));
    vis(n.polR, st.pol * (st.nR > 0.01 ? 1 : 0));
    // the overhang that makes cycle-1 products too long
    n.overF.setAttribute('y', fy - 13);
    n.overR.setAttribute('y', ry - 13);
    vis(n.overF, st.over);
    vis(n.overR, st.over);
    n.overL1.setAttribute('y', fy - 22);
    n.overL2.setAttribute('y', ry + 36);
    vis(n.overL1, st.over);
    vis(n.overL2, st.over);
    vis(n.dupL1, st.over);
    vis(n.dupL2, st.over);
    // thermometer: 20..100 °C
    const T = st.temp;
    const h = (330 - 6) * clamp01((T - 20) / 80);
    n.tfill.setAttribute('y', 377 - h);
    n.tfill.setAttribute('height', h);
    n.tval.textContent = `${Math.round(T)} °C`;
    n.cyc.textContent = st.step <= 4 ? `cycle 1 · ${['set-up', 'denature', 'anneal', 'extend', 'done'][st.step]}` : st.step === 7 ? 'cycles 1–10' : `cycle ${st.step - 3}`;
  }

  /* ------------------------------------------------ player */
  let step = 0;
  let t0 = 0;
  let playing = false;
  let raf = 0;
  let audio = null;
  let track = null; // {offsets:[...], durs:[...]}
  let voiceOn = true;
  const stepDur = (k) => (track ? track.durs[k] + 0.7 : Math.max(4, STEPS[k].say.split(' ').length / 2.6 + 0.8));
  const animDur = (k) => Math.min(4.5, Math.max(2.2, stepDur(k) * 0.65));
  let cap;
  let dots = [];
  let playBtn;
  let status;

  function render(p) {
    draw(state(step, p / animDur(step)));
  }
  function show(k, { autoplay = playing } = {}) {
    step = Math.max(0, Math.min(STEPS.length - 1, k));
    cap.innerHTML = `<span class="stepname"></span><span class="say"></span>`;
    cap.firstChild.textContent = `${step + 1} / ${STEPS.length} · ${STEPS[step].name}`;
    cap.lastChild.textContent = STEPS[step].say;
    dots.forEach((d, i) => (i === step ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    t0 = performance.now();
    if (autoplay) {
      speak(step);
      loop();
    } else {
      stopVoice();
      render(animDur(step)); // a still shows the end of the step
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    const tick = (now) => {
      const el = (now - t0) / 1000;
      render(el);
      if (!playing) return;
      if (el >= stepDur(step)) {
        if (step < STEPS.length - 1) show(step + 1, { autoplay: true });
        else setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : step === STEPS.length - 1 && !on ? 'Replay' : 'Play';
    playBtn.setAttribute('aria-pressed', String(on));
    if (on) {
      if (step === STEPS.length - 1) step = 0;
      show(step, { autoplay: true });
    } else {
      cancelAnimationFrame(raf);
      stopVoice();
    }
  }
  function speak(k) {
    if (!audio || !voiceOn || !track) return;
    try {
      audio.currentTime = track.offsets[k];
      const p = audio.play();
      if (p && p.catch) p.catch(() => { status.textContent = 'voice blocked by the browser: captions only'; });
      const end = track.offsets[k] + track.durs[k] + 0.05;
      const stopAt = () => { if (audio.currentTime >= end) { audio.pause(); audio.removeEventListener('timeupdate', stopAt); } };
      audio.addEventListener('timeupdate', stopAt);
    } catch (e) {
      /* captions carry it */
    }
  }
  function stopVoice() {
    if (audio && !audio.paused) audio.pause();
  }

  function loadVoice() {
    const n = document.getElementById('anim-voice');
    if (!n || !n.textContent.trim()) return;
    try {
      const v = JSON.parse(n.textContent);
      track = { offsets: v.offsets, durs: v.durs };
      const bin = atob(v.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const sources = [() => URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })), () => `data:audio/mpeg;base64,${v.b64}`];
      let k = 0;
      const attach = () => {
        if (k >= sources.length) {
          audio = null;
          track = null;
          status.textContent = 'voice unavailable here: captions only';
          return;
        }
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('error', () => { k++; attach(); }, { once: true });
        audio.src = sources[k]();
      };
      attach();
      status.textContent = 'narrated · Kokoro-82M voice';
    } catch (e) {
      track = null;
    }
  }

  function boot() {
    const stage = document.getElementById('anim-stage');
    if (!stage) return;
    build(stage);
    cap = document.getElementById('anim-cap');
    const bar = document.getElementById('anim-bar');
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.textContent = '◀ Back';
    playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.textContent = 'Play';
    playBtn.setAttribute('aria-pressed', 'false');
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next ▶';
    const dwrap = document.createElement('div');
    dwrap.className = 'dots';
    dots = STEPS.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(i + 1);
      b.title = s.name;
      b.addEventListener('click', () => { setPlaying(false); show(i, { autoplay: false }); });
      dwrap.appendChild(b);
      return b;
    });
    const voice = document.createElement('button');
    voice.type = 'button';
    voice.textContent = 'Voice on';
    voice.setAttribute('aria-pressed', 'true');
    voice.addEventListener('click', () => {
      voiceOn = !voiceOn;
      voice.textContent = voiceOn ? 'Voice on' : 'Voice off';
      voice.setAttribute('aria-pressed', String(voiceOn));
      if (!voiceOn) stopVoice();
      else if (playing) speak(step);
    });
    status = document.createElement('span');
    status.className = 'voice-status';
    prev.addEventListener('click', () => { const was = playing; setPlaying(false); show(step - 1, { autoplay: false }); if (was) setPlaying(true); });
    next.addEventListener('click', () => { const was = playing; setPlaying(false); show(step + 1, { autoplay: false }); if (was) setPlaying(true); });
    playBtn.addEventListener('click', () => setPlaying(!playing));
    bar.append(prev, playBtn, next, dwrap, voice, status);
    loadVoice();
    show(0, { autoplay: false });
    window.ANIM = {
      goto: (k1) => { setPlaying(false); show(k1 - 1, { autoplay: false }); },
      play: () => setPlaying(true),
      // for tests: draw a given step at a given progress
      frame: (k, p) => { step = k; draw(state(k, p)); },
      steps: STEPS,
      // for tests: is the voice actually playing?
      voice: () => (audio ? { t: audio.currentTime, paused: audio.paused, src: audio.src.slice(0, 5) } : null),
    };
  }
  window.ANIM = { boot };
  window.ANIM_STEPS = STEPS;
})();
