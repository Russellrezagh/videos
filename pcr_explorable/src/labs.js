/*
 * Interactives. Each one answers one question, stated in its task line:
 *   census   when do exact copies take over?          (change n)
 *   cycler   where is the annealing window?            (change Ta, extension, length)
 *   qpcr     why does Ct spacing reveal efficiency?    (change E, drag the threshold)
 *   primers  which rules does a pair pass, and why?    (edit sequences)
 *   dpcr     why do positive droplets undercount?      (change the positive fraction)
 * All numbers come from PCR (model.js).
 */
(function () {
  'use strict';
  const { el, C } = FIG;
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (x, d = 0) => x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (x, d = 0) => `${(100 * x).toFixed(d)} %`;

  /* ---------- small builders ---------- */
  function frame(host, title, task) {
    host.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.className = 'task';
    p.innerHTML = task;
    host.append(h, p);
    return host;
  }
  function slider(parent, { id, label, min, max, step, value, unit = '', fmtv = (v) => v }) {
    const w = document.createElement('div');
    w.className = 'ctl';
    w.innerHTML = `<label for="${id}"><span></span><output for="${id}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">`;
    w.querySelector('span').textContent = label;
    const input = w.querySelector('input');
    const out = w.querySelector('output');
    const sync = () => (out.textContent = `${fmtv(Number(input.value))}${unit}`);
    input.addEventListener('input', sync);
    sync();
    parent.appendChild(w);
    return input;
  }
  function controls(host) {
    const c = document.createElement('div');
    c.className = 'controls';
    host.appendChild(c);
    return c;
  }
  function readouts(host, keys) {
    const r = document.createElement('div');
    r.className = 'readouts';
    const out = {};
    for (const [k, label] of keys) {
      const d = document.createElement('div');
      d.className = 'ro';
      d.innerHTML = '<div class="k"></div><div class="v"></div>';
      d.firstChild.textContent = label;
      r.appendChild(d);
      out[k] = { set: (v, cls = '') => { d.lastChild.textContent = v; d.className = `ro ${cls}`; } };
    }
    host.appendChild(r);
    return out;
  }
  function tryList(host, items) {
    const ul = document.createElement('ul');
    ul.className = 'try';
    for (const t of items) {
      const li = document.createElement('li');
      li.innerHTML = t;
      ul.appendChild(li);
    }
    host.appendChild(ul);
  }
  function axes(s, { x0, y0, w, h, xmin, xmax, ymin, ymax, logy = false, xticks = [], yticks = [], xlabel = '', ylabel = '', yfmt = (v) => String(v) }) {
    const fx = (v) => x0 + ((v - xmin) / (xmax - xmin)) * w;
    const ty = (v) => (logy ? Math.log10(v) : v);
    const fy = (v) => y0 + h - ((ty(Math.max(logy ? 1e-12 : -1e300, v)) - ty(ymin)) / (ty(ymax) - ty(ymin))) * h;
    const g = el('g', {}, s);
    el('line', { x1: x0, y1: y0 + h, x2: x0 + w, y2: y0 + h, stroke: C('context'), 'stroke-width': 1.5 }, g);
    el('line', { x1: x0, y1: y0, x2: x0, y2: y0 + h, stroke: C('context'), 'stroke-width': 1.5 }, g);
    for (const t of xticks) {
      el('line', { x1: fx(t), y1: y0 + h, x2: fx(t), y2: y0 + h + 6, stroke: C('context'), 'stroke-width': 1.5 }, g);
      el('text', { x: fx(t), y: y0 + h + 22, cls: 'svg-mono', 'text-anchor': 'middle' }, g, String(t));
    }
    for (const t of yticks) {
      el('line', { x1: x0 - 6, y1: fy(t), x2: x0 + w, y2: fy(t), stroke: C('context'), 'stroke-width': 1, opacity: 0.22 }, g);
      el('text', { x: x0 - 10, y: fy(t) + 5, cls: 'svg-mono', 'text-anchor': 'end' }, g, yfmt(t));
    }
    if (xlabel) el('text', { x: x0 + w, y: y0 + h + 44, cls: 'svg-label', 'text-anchor': 'end' }, g, xlabel);
    if (ylabel) el('text', { x: x0, y: y0 - 12, cls: 'svg-label', 'text-anchor': 'start' }, g, ylabel);
    return { fx, fy, g };
  }
  const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  /* =============================================== census */
  function census() {
    const host = frame($('#lab-census'), 'Strand census', 'Move <b>n</b> and watch the share of exact double strands. <b>Find the first cycle where more than half of all double strands are exact copies.</b>');
    const ctl = controls(host);
    const n = slider(ctl, { id: 'cn', label: 'cycles n', min: 0, max: 12, step: 1, value: 3 });
    const b30 = document.createElement('button');
    b30.type = 'button';
    b30.textContent = 'Jump to n = 30';
    ctl.appendChild(b30);
    const s = FIG.svg(host, 1000, 250, 'Composition of double strands after n cycles');
    const ro = readouts(host, [['tot', 'double strands, 2ⁿ'], ['amp', 'exact (amplicons), 2ⁿ − 2n'], ['long', 'long strands, 2n'], ['share', 'exact share']]);
    tryList(host, ['Before moving: predict the exact share at n = 4.', 'At n = 10, how many of the 1,024 double strands still contain a long strand?']);
    let N = 3;
    const draw = () => {
      while (s.firstChild) s.removeChild(s.firstChild);
      const c = PCR.census(N);
      const tot = N === 0 ? 1 : c.duplexes;
      const parts = N === 0 ? [['template (original pair)', 1, 'source', 1]] : [['original + long', c.OL, 'source', 0.9], ['long + exact', c.LS, 'product', 0.5], ['exact + exact', c.SS, 'product', 1]];
      let x = 40;
      const W = 920;
      el('text', { x: 40, y: 30, cls: 'svg-label big' }, s, `after cycle ${N}: ${fmt(tot)} double strand${tot === 1 ? '' : 's'}`);
      for (const [name, k, role, o] of parts) {
        const w = (W * k) / tot;
        if (w <= 0) continue;
        el('rect', { x, y: 50, width: Math.max(w, 1.5), height: 54, fill: C(role), opacity: o, 'data-obj': name === 'exact + exact' ? 'amplicon' : null }, s);
        if (w > 120) el('text', { x: x + 10, y: 84, cls: 'svg-label', style: 'fill:var(--bg);font-weight:600' }, s, `${name}: ${fmt(k)}`);
        x += w;
      }
      // the history, log scale
      const a = axes(s, { x0: 80, y0: 130, w: 860, h: 80, xmin: 0, xmax: 12, ymin: 1, ymax: 5000, logy: true, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [1, 10, 100, 1000], yfmt: (v) => fmt(v) });
      const ampPts = [];
      const lngPts = [];
      for (let k = 1; k <= 12; k++) {
        ampPts.push([a.fx(k), a.fy(Math.max(1, PCR.closed.amplicons(k)))]);
        lngPts.push([a.fx(k), a.fy(PCR.closed.longStrands(k))]);
      }
      el('path', { d: poly(lngPts), fill: 'none', stroke: C('product'), 'stroke-width': 2.5, opacity: 0.5, 'stroke-dasharray': '6 5' }, s);
      el('path', { d: poly(ampPts.slice(2)), fill: 'none', stroke: C('product'), 'stroke-width': 3, 'data-obj': 'amplicon' }, s);
      if (N >= 1 && N <= 12) el('line', { x1: a.fx(N), y1: 130, x2: a.fx(N), y2: 210, stroke: C('param'), 'stroke-width': 2 }, s);
      el('text', { x: 940, y: 128, cls: 'svg-label', 'text-anchor': 'end' }, s, 'exact (solid) vs long strands (dashed), log scale');
      ro.tot.set(fmt(tot));
      ro.amp.set(fmt(c.SS || 0), 'warn');
      ro.long.set(fmt(c.L));
      ro.share.set(N === 0 ? '0 %' : pct(c.SS / tot, c.SS / tot > 0.999 ? 5 : 1), c.SS / tot > 0.5 ? 'good' : '');
    };
    n.addEventListener('input', () => { N = Number(n.value); draw(); });
    b30.addEventListener('click', () => { N = 30; n.value = 12; draw(); n.parentNode.querySelector('output').textContent = '30'; });
    draw();
  }

  /* =============================================== thermal cycler */
  function cycler() {
    const host = frame($('#lab-cycler'), 'Thermal cycler', 'Primers with T<sub>m</sub> = 60 °C. <b>Find the range of annealing temperatures that gives a strong, clean band</b>, then break the reaction on purpose by shortening the extension step for a long product.');
    const ctl = controls(host);
    const ta = slider(ctl, { id: 'ta', label: 'annealing T_a', min: 45, max: 70, step: 0.5, value: 56, unit: ' °C', fmtv: (v) => v.toFixed(1) });
    const ext = slider(ctl, { id: 'ext', label: 'extension time', min: 5, max: 90, step: 5, value: 30, unit: ' s' });
    const len = slider(ctl, { id: 'len', label: 'product length', min: 200, max: 3000, step: 100, value: 500, unit: ' bp', fmtv: (v) => fmt(v) });
    const wrap = document.createElement('div');
    wrap.className = 'two';
    host.appendChild(wrap);
    const left = document.createElement('div');
    const right = document.createElement('div');
    wrap.append(left, right);
    const sP = FIG.svg(left, 520, 250, 'Temperature program for three cycles');
    const sB = FIG.svg(right, 520, 250, 'Fraction of primer bound against temperature');
    const ro = readouts(host, [['on', 'primer bound at target'], ['spec', 'specificity'], ['ext', 'extension complete'], ['E', 'efficiency per cycle'], ['yield', 'yield after 30 cycles (of ideal)']]);
    const gelBox = document.createElement('div');
    host.appendChild(gelBox);
    const sG = FIG.svg(gelBox, 1000, 110, 'Predicted gel lane');
    tryList(host, ['Slide T<sub>a</sub> down to 47 °C: the band gets brighter but the lane fills with wrong products.', 'Slide it up to 66 °C: clean, but almost nothing is made.', 'Set 2,000 bp with a 30 s extension: the polymerase cannot finish, and yield collapses.']);
    const draw = () => {
      const Ta = Number(ta.value);
      const tE = Number(ext.value);
      const L = Number(len.value);
      const r = PCR.cycleEfficiency({ Ta, Tm: 60, extSeconds: tE, length: L });
      // program
      while (sP.firstChild) sP.removeChild(sP.firstChild);
      const segs = [];
      let t = 0;
      const push = (dur, T) => { segs.push([t, T]); t += dur; segs.push([t, T]); };
      push(30, 25);
      push(90, 95);
      for (let c = 0; c < 3; c++) { push(20, 95); push(30, Ta); push(tE, 72); }
      const a = axes(sP, { x0: 52, y0: 26, w: 440, h: 170, xmin: 0, xmax: t, ymin: 20, ymax: 100, xticks: [], yticks: [20, 40, 60, 72, 95], xlabel: 'time', ylabel: '°C' });
      el('path', { d: poly(segs.map(([x, y]) => [a.fx(x), a.fy(y)])), fill: 'none', stroke: C('param'), 'stroke-width': 3, 'stroke-linejoin': 'round', 'data-obj': 'temperature' }, sP);
      // first cycle: denature 120-140 s, anneal 140-170 s, extend 170 s on
      el('text', { x: a.fx(75), y: a.fy(95) - 10, cls: 'svg-label', 'text-anchor': 'middle' }, sP, 'denature');
      el('text', { x: a.fx(155), y: a.fy(Ta) + 22, cls: 'svg-label', 'text-anchor': 'middle' }, sP, 'anneal');
      el('text', { x: a.fx(t - tE / 2), y: a.fy(72) - 10, cls: 'svg-label', 'text-anchor': 'middle' }, sP, 'extend');
      // binding curves
      while (sB.firstChild) sB.removeChild(sB.firstChild);
      const b = axes(sB, { x0: 52, y0: 26, w: 440, h: 170, xmin: 45, xmax: 72, ymin: 0, ymax: 1, xticks: [45, 50, 55, 60, 65, 70], yticks: [0, 0.5, 1], yfmt: (v) => pct(v), xlabel: 'annealing temperature, °C', ylabel: 'primer bound' });
      const on = [];
      const off = [];
      for (let T = 45; T <= 72; T += 0.25) {
        on.push([b.fx(T), b.fy(PCR.bound(T, 60))]);
        off.push([b.fx(T), b.fy(PCR.bound(T, 51))]);
      }
      el('path', { d: poly(off), fill: 'none', stroke: C('fault'), 'stroke-width': 3, 'data-obj': 'dimer' }, sB);
      el('path', { d: poly(on), fill: 'none', stroke: C('agent'), 'stroke-width': 3.5, 'data-obj': 'primer' }, sB);
      el('line', { x1: b.fx(Ta), y1: 26, x2: b.fx(Ta), y2: 196, stroke: C('param'), 'stroke-width': 2 }, sB);
      el('text', { x: b.fx(Ta < 62 ? 62.5 : 56.5), y: b.fy(0.78), cls: 'svg-label', 'text-anchor': Ta < 62 ? 'start' : 'end', style: 'fill:var(--c-agent)' }, sB, 'target site');
      el('text', { x: b.fx(45.8), y: b.fy(0.2), cls: 'svg-label', style: 'fill:var(--c-fault)' }, sB, 'partial matches');
      // readouts
      const yieldRel = ((1 + r.E) / 2) ** 30;
      ro.on.set(pct(r.on), r.on > 0.8 ? 'good' : r.on > 0.4 ? 'warn' : 'bad');
      ro.spec.set(pct(r.specificity), r.specificity > 0.9 ? 'good' : r.specificity > 0.6 ? 'warn' : 'bad');
      ro.ext.set(pct(r.ext), r.ext >= 1 ? 'good' : 'bad');
      ro.E.set(r.E.toFixed(2), r.E > 0.85 ? 'good' : r.E > 0.6 ? 'warn' : 'bad');
      ro.yield.set(yieldRel < 1e-3 ? PCR.sci(yieldRel, 1) : pct(yieldRel, 1), yieldRel > 0.2 ? 'good' : 'bad');
      // gel lane (horizontal): ladder above, sample below
      while (sG.firstChild) sG.removeChild(sG.firstChild);
      const gx = (bp) => 60 + 900 * ((Math.log10(bp) - Math.log10(50)) / (Math.log10(4000) - Math.log10(50)));
      el('rect', { x: 40, y: 10, width: 940, height: 90, rx: 6, fill: '--bg', stroke: C('context'), 'stroke-width': 1 }, sG);
      for (const bp of [100, 200, 300, 500, 1000, 2000, 3000]) {
        el('rect', { x: gx(bp) - 2, y: 18, width: 4, height: 22, fill: C('context'), opacity: 0.8 }, sG);
        el('text', { x: gx(bp), y: 56, cls: 'svg-mono', 'text-anchor': 'middle', style: 'font-size:12px' }, sG, String(bp));
      }
      const amt = Math.min(1, yieldRel * r.specificity * 1.2);
      el('rect', { x: gx(L) - 3, y: 66, width: 6, height: 26, fill: C('product'), opacity: Math.max(0.04, amt), 'data-obj': 'amplicon' }, sG);
      const junk = Math.min(0.85, yieldRel * (1 - r.specificity) * 1.4);
      for (const f of [0.45, 0.7, 1.6]) el('rect', { x: gx(L * f) - 2.5, y: 68, width: 5, height: 22, fill: C('fault'), opacity: junk * (f === 0.7 ? 1 : 0.7) }, sG);
      const dimer = Math.min(0.8, Math.max(0, (56 - Ta) / 10) + (r.E < 0.3 ? 0.25 : 0));
      el('rect', { x: gx(55) - 14, y: 66, width: 28, height: 26, rx: 6, fill: C('fault'), opacity: dimer * 0.7, 'data-obj': 'dimer' }, sG);
      el('text', { x: 46, y: 84, cls: 'svg-mono', style: 'font-size:12px' }, sG, 'lane');
    };
    for (const i of [ta, ext, len]) i.addEventListener('input', draw);
    draw();
  }

  /* =============================================== qPCR */
  function qpcr() {
    const host = frame($('#lab-qpcr'), 'Real-time PCR', 'Five standards (10⁷ down to 10³ copies) and one unknown. <b>Drag the threshold</b> (or use the slider), switch between log and linear views, and change the efficiency. <b>Watch the spacing between neighbouring curves, and the slope of the standard curve.</b>');
    const ctl = controls(host);
    const eS = slider(ctl, { id: 'qe', label: 'efficiency E', min: 0.7, max: 1, step: 0.01, value: 0.95, fmtv: (v) => v.toFixed(2) });
    const thS = slider(ctl, { id: 'qt', label: 'threshold (log₁₀ fluorescence)', min: -1.6, max: 0.95, step: 0.01, value: -0.8, fmtv: (v) => (10 ** v).toFixed(v < -1 ? 3 : 2) });
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<button type="button" aria-pressed="true">log view</button><button type="button" aria-pressed="false">linear view</button>';
    ctl.appendChild(seg);
    const wrap = document.createElement('div');
    wrap.className = 'two';
    host.appendChild(wrap);
    const left = document.createElement('div');
    const right = document.createElement('div');
    wrap.append(left, right);
    const sA = FIG.svg(left, 560, 330, 'Amplification curves');
    const sS = FIG.svg(right, 460, 330, 'Standard curve');
    const ro = readouts(host, [['slope', 'slope (cycles per decade)'], ['E', 'efficiency from slope'], ['r2', 'R²'], ['unk', 'unknown: estimated copies']]);
    const reveal = document.createElement('p');
    reveal.className = 'small';
    host.appendChild(reveal);
    tryList(host, ['With the threshold in the steep, straight part of the log view, the curves are evenly spaced: about 3.4 cycles per tenfold at E = 0.95.', 'Switch to the linear view and drag the threshold up into the plateau: the spacing breaks, and so does the efficiency you compute.', 'Lower E to 0.80: the spacing grows to about 3.9 cycles, and the slope says so.']);
    const STD = [1e7, 1e6, 1e5, 1e4, 1e3];
    const UNK = 2.6e4;
    const rng = PCR.mulberry32(20261006);
    const noise = Array.from({ length: 7 }, () => Array.from({ length: 46 }, () => (rng() - 0.5) * 0.008));
    let logView = true;
    let dragging = false;
    const draw = () => {
      const E = Number(eS.value);
      const thr = 10 ** Number(thS.value);
      const curves = [...STD, UNK].map((N0, i) => PCR.fluorescence(N0, E, 45, { K: 1e12 }).map((f, k) => Math.max(1e-3, f + noise[i][k])));
      const ntc = Array.from({ length: 46 }, (_, k) => Math.max(1e-3, 0.05 + noise[6][k]));
      while (sA.firstChild) sA.removeChild(sA.firstChild);
      const ymin = logView ? 0.02 : 0;
      const ymax = logView ? 20 : 11;
      const a = axes(sA, { x0: 56, y0: 22, w: 480, h: 250, xmin: 0, xmax: 45, ymin, ymax, logy: logView, xticks: [0, 10, 20, 30, 40], yticks: logView ? [0.1, 1, 10] : [0, 2.5, 5, 7.5, 10], yfmt: (v) => String(v), xlabel: 'cycle', ylabel: logView ? 'fluorescence (log)' : 'fluorescence' });
      const ctOf = [];
      curves.forEach((cv, i) => {
        const unknown = i === 5;
        el('path', { d: poly(cv.map((f, k) => [a.fx(k), a.fy(f)])), fill: 'none', stroke: unknown ? C('source') : C('product'), 'stroke-width': unknown ? 3.4 : 2.6, opacity: unknown ? 1 : 0.55 + 0.09 * i, 'data-obj': 'amplicon', 'stroke-dasharray': unknown ? '7 5' : null }, sA);
        ctOf.push(PCR.thresholdCycle(cv, thr));
      });
      el('path', { d: poly(ntc.map((f, k) => [a.fx(k), a.fy(f)])), fill: 'none', stroke: C('context'), 'stroke-width': 2 }, sA);
      // threshold line (draggable)
      const yT = a.fy(thr);
      const tl = el('line', { x1: 56, y1: yT, x2: 536, y2: yT, stroke: C('param'), 'stroke-width': 3, 'data-obj': 'threshold', style: 'cursor:ns-resize' }, sA);
      el('rect', { x: 56, y: yT - 12, width: 480, height: 24, fill: 'transparent', style: 'cursor:ns-resize', 'data-obj': 'threshold' }, sA).addEventListener('pointerdown', (e) => { dragging = true; e.target.setPointerCapture(e.pointerId); });
      void tl;
      el('text', { x: 534, y: yT - 8, cls: 'svg-label', 'text-anchor': 'end', style: 'fill:var(--c-param)' }, sA, 'threshold');
      ctOf.forEach((ct, i) => {
        if (ct === null) return;
        el('circle', { cx: a.fx(ct), cy: yT, r: 5.5, fill: i === 5 ? C('source') : C('product'), 'data-obj': 'ct' }, sA);
      });
      el('text', { x: 62, y: a.fy(logView ? 0.05 : 0.05) - 8, cls: 'svg-label', style: 'font-size:13px' }, sA, 'no-template control');
      // standard curve
      while (sS.firstChild) sS.removeChild(sS.firstChild);
      const pts = STD.map((N0, i) => ({ N0, ct: ctOf[i] })).filter((p) => p.ct !== null);
      const b = axes(sS, { x0: 56, y0: 22, w: 380, h: 250, xmin: 2.5, xmax: 7.5, ymin: 5, ymax: 45, xticks: [3, 4, 5, 6, 7], yticks: [10, 20, 30, 40], xlabel: 'log₁₀ starting copies', ylabel: 'Ct' });
      if (pts.length >= 3) {
        const sc = PCR.standardCurve(pts);
        el('line', { x1: b.fx(2.5), y1: b.fy(sc.slope * 2.5 + sc.intercept), x2: b.fx(7.5), y2: b.fy(sc.slope * 7.5 + sc.intercept), stroke: C('param'), 'stroke-width': 2, opacity: 0.8 }, sS);
        pts.forEach((p) => el('circle', { cx: b.fx(Math.log10(p.N0)), cy: b.fy(p.ct), r: 6, fill: C('product'), 'data-obj': 'ct' }, sS));
        const cu = ctOf[5];
        if (cu !== null) {
          const est = sc.quantify(cu);
          el('circle', { cx: b.fx(Math.log10(est)), cy: b.fy(cu), r: 7, fill: 'none', stroke: C('source'), 'stroke-width': 3 }, sS);
          el('text', { x: b.fx(Math.log10(est)) + 12, y: b.fy(cu) + 5, cls: 'svg-label', style: 'fill:var(--c-source)' }, sS, 'unknown');
          ro.unk.set(fmt(est), Math.abs(Math.log10(est / UNK)) < 0.05 ? 'good' : 'warn');
          reveal.textContent = `Truth for the unknown: ${fmt(UNK)} copies. Your estimate is off by a factor ${(Math.max(est, UNK) / Math.min(est, UNK)).toFixed(2)}.`;
        }
        ro.slope.set(sc.slope.toFixed(2), sc.slope <= -3.1 && sc.slope >= -3.6 ? 'good' : 'warn');
        ro.E.set(pct(sc.E, 1), sc.E >= 0.9 && sc.E <= 1.1 ? 'good' : 'bad');
        ro.r2.set(sc.r2.toFixed(4), sc.r2 > 0.98 ? 'good' : 'bad');
      } else {
        ro.slope.set('—');
        ro.E.set('—');
        ro.r2.set('—');
        ro.unk.set('—');
        reveal.textContent = 'Fewer than three standards cross the threshold. Lower it.';
      }
      sA._axes = a;
    };
    sA.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(sA.getScreenCTM().inverse());
      const a = sA._axes;
      // invert fy
      const y = Math.max(22, Math.min(272, pt.y));
      let v;
      if (logView) v = Math.log10(0.02) + ((272 - y) / 250) * (Math.log10(20) - Math.log10(0.02));
      else v = Math.log10(Math.max(0.03, ((272 - y) / 250) * 11));
      thS.value = Math.max(-1.6, Math.min(0.95, v)).toFixed(2);
      thS.dispatchEvent(new Event('input'));
      void a;
    });
    sA.addEventListener('pointerup', () => (dragging = false));
    for (const b of seg.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        logView = b.textContent.startsWith('log');
        seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      });
    }
    eS.addEventListener('input', draw);
    thS.addEventListener('input', draw);
    draw();
  }

  /* =============================================== primers */
  const PRESETS = {
    'a good pair': ['AGCGTCAGTTCCAGTACCTG', 'GTTGGACTCGTCAAGGACTC'],
    'GC-rich': ['GCGGCCGCGGGCCCGCGGCG', 'CCGCGGCCGCGCGGGCCGCC'],
    'dimer-prone': ['TTGACCAGTCAAGTGCATGC', 'GTTGGACTCGTCAAGCATGC'],
    'too short': ['ATTAGCTAAT', 'TTAACGTAAT'],
  };
  function primers() {
    const host = frame($('#lab-primers'), 'Primer checker', 'Edit either primer (5′ → 3′), or load an example. <b>Make the “dimer-prone” pair pass</b> by changing as few bases as you can.');
    const pre = document.createElement('div');
    pre.className = 'chips';
    host.appendChild(pre);
    const two = document.createElement('div');
    two.className = 'two';
    host.appendChild(two);
    const mk = (id, label) => {
      const d = document.createElement('div');
      d.className = 'ctl';
      d.innerHTML = `<label for="${id}"><span></span></label><input type="text" id="${id}" spellcheck="false" autocomplete="off" autocapitalize="characters">`;
      d.querySelector('span').textContent = label;
      two.appendChild(d);
      return d.querySelector('input');
    };
    const f = mk('pf', 'forward primer 5′→3′');
    const r = mk('pr', 'reverse primer 5′→3′');
    const tbl = document.createElement('div');
    tbl.className = 'tbl';
    host.appendChild(tbl);
    const checks = document.createElement('div');
    checks.className = 'chips';
    host.appendChild(checks);
    const dimer = document.createElement('pre');
    dimer.className = 'code';
    host.appendChild(dimer);
    for (const name of Object.keys(PRESETS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.addEventListener('click', () => { [f.value, r.value] = PRESETS[name]; draw(); });
      pre.appendChild(b);
    }
    const draw = () => {
      const rep = PCR.primerReport(f.value, r.value);
      const row = (name, p) => `<tr><td>${name}</td><td class="num">${p.length}</td><td class="num">${(100 * p.gc).toFixed(0)} %</td><td class="num">${p.wallace.toFixed(0)}</td><td class="num">${isFinite(p.basic) ? p.basic.toFixed(1) : '—'}</td><td class="num">${isFinite(p.nn) ? p.nn.toFixed(1) : '—'}</td><td class="num">${p.clamp}</td></tr>`;
      tbl.innerHTML = `<table><thead><tr><th>primer</th><th class="num">length</th><th class="num">GC</th><th class="num">Tm Wallace</th><th class="num">Tm GC formula</th><th class="num">Tm nearest-neighbour</th><th class="num">3′ G/C</th></tr></thead><tbody>${row('forward', rep.f)}${row('reverse', rep.r)}</tbody></table>`;
      checks.innerHTML = '';
      for (const c of rep.checks) {
        const s = document.createElement('span');
        s.className = `chip ${c.ok ? 'ok' : 'no'}`;
        s.textContent = `${c.ok ? '✓' : '✗'} ${c.text}`;
        checks.appendChild(s);
      }
      // show the worst 3' overlap: a over the other strand, read 3'->5'
      const k = rep.cross3;
      const self = Math.max(rep.f.self3, rep.r.self3);
      const kk = Math.max(k, self);
      if (kk >= 4) {
        const [a, b] = k >= self ? [rep.f.seq, rep.r.seq] : rep.f.self3 >= rep.r.self3 ? [rep.f.seq, rep.f.seq] : [rep.r.seq, rep.r.seq];
        const comp = { A: 'T', T: 'A', G: 'C', C: 'G' };
        const bRev = [...b].reverse().join('');
        const pos = bRev.indexOf([...a.slice(-kk)].map((x) => comp[x]).join(''));
        const shift = a.length - kk - pos; // columns to move the lower strand right
        const padA = ' '.repeat(Math.max(0, -shift));
        const padB = ' '.repeat(Math.max(0, shift));
        dimer.textContent = [
          `3′ ends pair over ${kk} bases: a primer-dimer the polymerase can extend`,
          `${padA}5′ ${a} 3′`,
          `${padA}   ${' '.repeat(a.length - kk)}${'|'.repeat(kk)}`,
          `${padB}3′ ${bRev} 5′`,
        ].join('\n');
      } else dimer.textContent = 'No 3′ end pairs with the other primer (or itself) over 4 or more bases.';
    };
    f.addEventListener('input', draw);
    r.addEventListener('input', draw);
    [f.value, r.value] = PRESETS['a good pair'];
    draw();
  }

  /* =============================================== digital PCR */
  function dpcr() {
    const host = frame($('#lab-dpcr'), 'Digital PCR counter', '20,000 droplets of 0.85 nL. <b>Raise the fraction of positive droplets and compare the naive count with the Poisson estimate.</b>');
    const ctl = controls(host);
    const p = slider(ctl, { id: 'dp', label: 'positive droplets', min: 1, max: 95, step: 1, value: 40, unit: ' %' });
    const s = FIG.svg(host, 1000, 170, 'A sample of droplets');
    const ro = readouts(host, [['lam', 'λ = −ln(1 − p) copies per droplet'], ['naive', 'naive count (positives)'], ['copies', 'Poisson estimate'], ['conc', 'concentration']]);
    const draw = () => {
      const frac = Number(p.value) / 100;
      const parts = 20000;
      const lam = PCR.dpcrLambda(frac * parts, parts);
      while (s.firstChild) s.removeChild(s.firstChild);
      const rng = PCR.mulberry32(7);
      // draw 250 droplets with Poisson draws at this lambda
      for (let i = 0; i < 250; i++) {
        const x = 20 + (i % 50) * 19.4;
        const y = 22 + Math.floor(i / 50) * 30;
        let k = 0;
        let pr = Math.exp(-lam);
        let cum = pr;
        const u = rng();
        while (u > cum && k < 8) { k++; pr *= lam / k; cum += pr; }
        el('circle', { cx: x, cy: y, r: 8.5, fill: k === 0 ? 'none' : C('product'), stroke: k === 0 ? C('context') : C('product'), 'stroke-width': 1.5, opacity: k === 0 ? 0.6 : Math.min(1, 0.55 + 0.2 * k) }, s);
        if (k >= 2) el('text', { x, y: y + 4, cls: 'svg-mono', 'text-anchor': 'middle', style: 'font-size:10.5px;fill:var(--bg)' }, s, String(k));
      }
      el('text', { x: 20, y: 166, cls: 'svg-label', style: 'font-size:13px' }, s, 'Numbers mark droplets that received two or more copies. Each counts once as “positive”.');
      ro.lam.set(lam.toFixed(3));
      ro.naive.set(fmt(frac * parts));
      ro.copies.set(fmt(lam * parts), 'good');
      ro.conc.set(`${fmt(lam / 0.85e-3)} /µL`);
    };
    p.addEventListener('input', draw);
    draw();
  }

  window.LABS = { boot: () => { census(); cycler(); qpcr(); primers(); dpcr(); } };
})();
