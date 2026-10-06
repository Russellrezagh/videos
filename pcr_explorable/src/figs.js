/*
 * Static figures, drawn from the model. Colours come only from the semantic
 * tokens (var(--c-*)), and every drawn object carries data-obj so the prose
 * can light it up (see ui.js).
 */
const FIG = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // presentation attributes cannot read CSS variables, so colours go to style
  function el(tag, attrs = {}, parent = null, text = null) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if ((k === 'stroke' || k === 'fill') && String(v).startsWith('--')) n.style[k] = `var(${v})`;
      else if (k === 'cls') n.setAttribute('class', v);
      else n.setAttribute(k, v);
    }
    if (text !== null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(host, w, h, label) {
    const s = el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label });
    host.appendChild(s);
    return s;
  }
  const ROLE_OF = (obj) => (PCR.OBJECTS[obj] ? PCR.OBJECTS[obj].role : 'context');
  const C = (role) => `--c-${role}`;
  const fmtInt = (x) => Math.round(x).toLocaleString('en-US');

  /* ------------------------------------------------ hero: 30 cycles */
  function hero(host) {
    const W = 1060;
    const H = 252;
    const s = svg(host, W, H, 'Temperature over thirty cycles, and copies growing from one to a billion');
    const x0 = 70;
    const x1 = W - 20;
    const cx = (c) => x0 + ((x1 - x0) * c) / 30;
    // temperature band (top): 95 / 58 / 72 per cycle
    const T = (t) => 52 - ((t - 50) / 50) * 44;
    let d = `M ${x0} ${T(25)}`;
    for (let c = 0; c < 30; c++) {
      const a = cx(c);
      const w = cx(c + 1) - a;
      d += ` L ${a + w * 0.04} ${T(95)} L ${a + w * 0.3} ${T(95)} L ${a + w * 0.36} ${T(58)} L ${a + w * 0.6} ${T(58)} L ${a + w * 0.66} ${T(72)} L ${a + w * 0.98} ${T(72)}`;
    }
    el('path', { d, fill: 'none', stroke: C('param'), 'stroke-width': 2, 'stroke-linejoin': 'round', 'data-obj': 'temperature' }, s);
    el('text', { x: 0, y: T(95) + 5, cls: 'svg-mono' }, s, '95 °C');
    el('text', { x: 0, y: T(58) + 5, cls: 'svg-mono' }, s, '58 °C');
    // copies (log scale) as bars
    const yb = 210;
    const ytop = 92;
    const ly = (n) => yb - ((yb - ytop) * Math.log10(Math.max(1, n))) / 9.2;
    for (let c = 0; c <= 30; c++) {
      const n = 2 ** c;
      const x = cx(c);
      el('line', { x1: x, y1: yb, x2: x, y2: ly(n), stroke: C('product'), 'stroke-width': 6, 'stroke-linecap': 'round', opacity: c % 10 === 0 ? 1 : 0.55, 'data-obj': 'amplicon' }, s);
    }
    el('line', { x1: x0 - 8, y1: yb + 8, x2: x1, y2: yb + 8, stroke: C('context'), 'stroke-width': 1 }, s);
    for (const c of [0, 10, 20, 30]) {
      const x = cx(c);
      el('text', { x, y: ly(2 ** c) - 12, cls: 'svg-mono', 'text-anchor': c === 30 ? 'end' : 'middle' }, s, fmtInt(2 ** c));
      el('text', { x, y: yb + 26, cls: 'svg-label', 'text-anchor': 'middle' }, s, `cycle ${c}`);
    }
    el('text', { x: 0, y: (yb + ytop) / 2 + 6, cls: 'svg-label' }, s, 'copies');
  }

  /* ------------------------------------------------ concept map */
  function map(host) {
    const W = 1000;
    const H = 330;
    const s = svg(host, W, H, 'Concept map of PCR');
    const nodes = [
      ['pair', 'base pairing', 90, 60, 'orient', 'source'],
      ['melt', 'melting and annealing', 90, 170, 'program', 'param'],
      ['primer', 'primers bind', 300, 120, 'primers', 'agent'],
      ['pol', 'polymerase extends 3′', 300, 230, 'ingredients', 'agent'],
      ['cycle', 'one cycle', 510, 175, 'mechanism', 'param'],
      ['count', 'exact copies win', 700, 95, 'counting', 'product'],
      ['exp', 'exponential growth', 700, 210, 'growth', 'product'],
      ['plateau', 'efficiency and plateau', 700, 300, 'growth', 'param'],
      ['ct', 'Ct and standard curve', 900, 175, 'qpcr', 'param'],
      ['spec', 'specificity', 510, 60, 'program', 'fault'],
      ['var', 'variants', 900, 290, 'variants', 'context'],
    ];
    const pos = Object.fromEntries(nodes.map((n) => [n[0], n]));
    const edges = [['pair', 'primer'], ['pair', 'melt'], ['melt', 'primer'], ['primer', 'cycle'], ['pol', 'cycle'], ['melt', 'pol'], ['primer', 'spec'], ['cycle', 'count'], ['cycle', 'exp'], ['exp', 'plateau'], ['exp', 'ct'], ['plateau', 'ct'], ['ct', 'var']];
    const defs = el('defs', {}, s);
    const mk = el('marker', { id: 'mapArrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0 L10 5 L0 10 z', fill: C('context') }, mk);
    const bw = 170;
    const bh = 42;
    for (const [a, b] of edges) {
      const A = pos[a];
      const B = pos[b];
      const dx = B[2] - A[2];
      const dy = B[3] - A[3];
      const len = Math.hypot(dx, dy);
      // leave the box edges
      const tA = Math.min(Math.abs((bw / 2) / (dx || 1e-9)), Math.abs((bh / 2) / (dy || 1e-9)));
      const tB = tA;
      el('line', { x1: A[2] + dx * tA * 1.08, y1: A[3] + dy * tA * 1.08, x2: B[2] - dx * tB * 1.12, y2: B[3] - dy * tB * 1.12, stroke: C('context'), 'stroke-width': 1.6, 'marker-end': 'url(#mapArrow)', opacity: 0.8 }, s);
      void len;
    }
    for (const [id, label, x, y, sec, role] of nodes) {
      const a = el('a', { href: `#${sec}` }, s);
      el('rect', { x: x - bw / 2, y: y - bh / 2, width: bw, height: bh, rx: 6, fill: '--bg', stroke: C(role), 'stroke-width': 1.8 }, a);
      el('text', { x, y: y + 5, cls: 'svg-label big', 'text-anchor': 'middle', style: 'font-size:15.5px' }, a, label);
      void id;
    }
  }

  /* ------------------------------------------------ the tube */
  function tube(host, info) {
    const W = 700;
    const H = 380;
    const s = svg(host, W, H, 'A PCR tube and its contents');
    // tube outline
    el('path', { d: 'M 210 30 H 490 V 220 Q 490 250 470 270 L 380 355 Q 350 375 320 355 L 230 270 Q 210 250 210 220 Z', fill: '--bg', stroke: C('context'), 'stroke-width': 2 }, s);
    el('rect', { x: 196, y: 14, width: 308, height: 22, rx: 5, fill: '--bg-3', stroke: C('context'), 'stroke-width': 2 }, s);
    // template: double strand with rungs
    const g1 = el('g', { 'data-obj': 'template', tabindex: 0, cls: 'part' }, s);
    el('line', { x1: 240, y1: 80, x2: 460, y2: 80, stroke: C('source'), 'stroke-width': 5, 'stroke-linecap': 'round' }, g1);
    el('line', { x1: 240, y1: 100, x2: 460, y2: 100, stroke: C('source'), 'stroke-width': 5, 'stroke-linecap': 'round' }, g1);
    for (let x = 250; x <= 450; x += 14) el('line', { x1: x, y1: 84, x2: x, y2: 96, stroke: C('source'), 'stroke-width': 2, opacity: 0.6 }, g1);
    el('rect', { x: 320, y: 72, width: 80, height: 36, rx: 4, fill: 'none', stroke: C('source'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4', 'data-obj': 'target' }, g1);
    // primers
    const g2 = el('g', { 'data-obj': 'primer', tabindex: 0, cls: 'part' }, s);
    el('line', { x1: 250, y1: 140, x2: 300, y2: 140, stroke: C('agent'), 'stroke-width': 6, 'stroke-linecap': 'round' }, g2);
    el('line', { x1: 400, y1: 160, x2: 450, y2: 160, stroke: C('agent'), 'stroke-width': 6, 'stroke-linecap': 'round' }, g2);
    el('path', { d: 'M 300 140 l -8 -6 m 8 6 l -8 6', stroke: C('agent'), 'stroke-width': 3, fill: 'none' }, g2);
    el('path', { d: 'M 400 160 l 8 -6 m -8 6 l 8 6', stroke: C('agent'), 'stroke-width': 3, fill: 'none' }, g2);
    // polymerase
    const g3 = el('g', { 'data-obj': 'polymerase', tabindex: 0, cls: 'part' }, s);
    el('path', { d: 'M 330 205 q 0 -28 30 -28 q 34 0 34 26 q 0 26 -32 26 q -32 0 -32 -24 z', fill: '--bg-3', stroke: C('agent'), 'stroke-width': 2.5 }, g3);
    el('text', { x: 361, y: 209, cls: 'svg-label', 'text-anchor': 'middle', style: 'font-size:14px' }, g3, 'Taq');
    // dNTPs
    const g4 = el('g', { 'data-obj': 'dntp', tabindex: 0, cls: 'part' }, s);
    const pts = [[260, 240], [282, 262], [300, 236], [418, 236], [440, 252], [400, 258], [330, 280], [362, 298], [388, 280], [250, 200], [460, 205]];
    pts.forEach(([x, y], i) => el('circle', { cx: x, cy: y, r: 5, fill: C('agent'), opacity: 0.55 + 0.1 * (i % 4) }, g4));
    // Mg ions
    const g5 = el('g', { 'data-obj': 'mg', tabindex: 0, cls: 'part' }, s);
    [[455, 130], [240, 170], [345, 320], [470, 185]].forEach(([x, y]) => {
      el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: C('param'), 'stroke-width': 2 }, g5);
    });
    // labels outside the tube, with leaders
    const labels = [
      ['template', 'template DNA', 520, 90, 460, 90],
      ['primer', 'primers (2)', 520, 150, 452, 155],
      ['polymerase', 'heat-stable polymerase', 520, 210, 396, 203],
      ['dntp', 'dNTPs: A, C, G, T', 20, 250, 255, 245],
      ['mg', 'Mg²⁺ ions', 20, 170, 232, 170],
      ['buffer', 'buffer (keeps the pH)', 20, 300, 290, 300],
    ];
    for (const [obj, text, x, y, lx, ly] of labels) {
      const anchorEnd = x < 200;
      const role = obj === 'buffer' ? 'context' : ROLE_OF(obj);
      el('line', { x1: anchorEnd ? x + 186 : x - 6, y1: y - 5, x2: lx, y2: ly, stroke: C('context'), 'stroke-width': 1, opacity: 0.7 }, s);
      const t = el('text', { x: anchorEnd ? x + 180 : x, y, cls: 'svg-label', 'text-anchor': anchorEnd ? 'end' : 'start', 'data-obj': obj === 'buffer' ? null : obj, tabindex: obj === 'buffer' ? null : 0 }, s, text);
      t.style.fill = `var(${C(role)})`;
    }
    el('text', { x: 350, y: 372, cls: 'svg-mono', 'text-anchor': 'middle', style: 'font-size:12px' }, s, '20–50 µL');
    // info panel
    if (info) {
      const show = (obj) => {
        const o = PCR.OBJECTS[obj];
        if (!o) return;
        info.innerHTML = '';
        const h = document.createElement('b');
        h.textContent = o.name;
        h.style.color = `var(--c-${o.role})`;
        info.append(h, document.createTextNode(` — ${o.def}`));
      };
      s.querySelectorAll('[data-obj]').forEach((n) => {
        n.addEventListener('mouseenter', () => show(n.getAttribute('data-obj')));
        n.addEventListener('focus', () => show(n.getAttribute('data-obj')));
        n.addEventListener('click', () => show(n.getAttribute('data-obj')));
      });
      show('primer');
    }
  }

  /* ------------------------------------------------ gel */
  function gel(host) {
    const W = 560;
    const H = 380;
    const s = svg(host, W, H, 'Agarose gel with five lanes');
    el('rect', { x: 60, y: 20, width: 470, height: 340, rx: 6, fill: '--bg', stroke: C('context'), 'stroke-width': 1.5 }, s);
    const lanes = 5;
    const lx = (i) => 60 + 470 * ((i + 0.5) / lanes);
    const y = (bp) => 60 + 270 * (1 - (Math.log10(bp) - Math.log10(50)) / (Math.log10(1500) - Math.log10(50)));
    for (let i = 0; i < lanes; i++) {
      el('rect', { x: lx(i) - 30, y: 34, width: 60, height: 10, rx: 2, fill: 'none', stroke: C('context'), 'stroke-width': 1.5 }, s);
      el('text', { x: lx(i), y: 375, cls: 'svg-mono', 'text-anchor': 'middle', style: 'font-size:12.5px' }, s, ['ladder', 'sample', 'too cold', 'NTC', 'NTC'][i]);
    }
    const band = (i, bp, role, o = 1, wpx = 50, h = 6, obj = null) => el('rect', { x: lx(i) - wpx / 2, y: y(bp) - h / 2, width: wpx, height: h, rx: 2, fill: C(role), opacity: o, 'data-obj': obj }, s);
    for (const bp of [100, 200, 300, 400, 500, 700, 1000, 1500]) {
      band(0, bp, 'context', bp === 500 ? 0.95 : 0.7, 50, 4);
      el('text', { x: 52, y: y(bp) + 4, cls: 'svg-mono', 'text-anchor': 'end', style: 'font-size:12px' }, s, String(bp));
    }
    band(1, 500, 'product', 1, 50, 7, 'amplicon');
    band(2, 500, 'product', 0.7, 50, 7, 'amplicon');
    band(2, 760, 'fault', 0.55, 50, 5, 'dimer');
    band(2, 310, 'fault', 0.5, 50, 5, 'dimer');
    el('rect', { x: lx(2) - 26, y: y(70) - 9, width: 52, height: 18, rx: 6, fill: C('fault'), opacity: 0.4, 'data-obj': 'dimer' }, s);
    band(4, 500, 'fault', 0.45, 50, 6, 'contamination');
    el('text', { x: 52, y: 14, cls: 'svg-mono', 'text-anchor': 'end', style: 'font-size:12px' }, s, 'bp');
    el('text', { x: 538, y: 46, cls: 'svg-mono', style: 'font-size:12px' }, s, '−');
    el('text', { x: 538, y: 352, cls: 'svg-mono', style: 'font-size:12px' }, s, '+');
  }

  /* ------------------------------------------------ timeline (HTML: it reflows on phones) */
  const EVENTS = [
    [1969, 'Thermus aquaticus described', 'Brock and Freeze; the source of Taq polymerase', 'agent'],
    [1983, 'Mullis conceives PCR', 'at Cetus Corporation', 'product'],
    [1985, 'First PCR paper', 'sickle-cell diagnosis, still with a heat-sensitive enzyme', 'product'],
    [1988, 'Taq polymerase', 'one enzyme survives the whole run', 'agent'],
    [1992, 'Real-time PCR', 'fluorescence read during every cycle', 'param'],
    [1993, 'Nobel Prize in Chemistry', 'Kary Mullis, shared with Michael Smith', 'product'],
    [2009, 'MIQE guidelines', 'what a qPCR paper must report', 'param'],
    [2020, 'RT-qPCR at global scale', 'the reference test for SARS-CoV-2', 'source'],
  ];
  function timeline(host) {
    const ol = document.createElement('ol');
    ol.className = 'timeline';
    for (const [yr, a, b, role] of EVENTS) {
      const li = document.createElement('li');
      li.style.setProperty('--sw', `var(${C(role)})`);
      li.innerHTML = `<span class="yr">${yr}</span><span class="what"><b></b><span></span></span>`;
      li.querySelector('b').textContent = a;
      li.querySelector('.what span').textContent = b;
      ol.appendChild(li);
    }
    host.appendChild(ol);
  }

  return { el, svg, hero, map, tube, gel, timeline, C, fmtInt };
})();
