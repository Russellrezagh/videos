// ───────────────────────────── chapters 11–19 ─────────────────────────────

// 11 · a model of the noise (drift) — real: lineages near 40 reads, where they land next
SCENES.noise = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPA;
    const cx = 960;
    // beats 0-1: branching process / two noise sources (schematic)
    const a0 = inv(c(0), c(0) + 1.2, t), fade = 1 - inv(c(2) - 0.4, c(2) + 0.6, t);
    if (fade > 0.02) {
      const src = [['daily transfer', PAL.ypa, 540], ['DNA prep & sequencing', PAL.blue, 1140]];
      const a1 = inv(c(1), c(1) + 1.2, t);
      src.forEach(([lab, col, x], i) => {
        const a = i === 0 ? a0 : a1;
        for (let k = 0; k < 9; k++) cell(x - 72 + k * 18, 330, 6, { alpha: a * fade, col: PAL.ink });
        arrow(x, 350, x, 408, col, { alpha: a * fade });
        const r = rng(i + 3); const kept = 5 + Math.floor(r() * 3);
        for (let k = 0; k < kept; k++) cell(x - 60 + k * 20, 440, 6, { alpha: a * fade, col });
        text(lab, x, 500, { size: 18, fam: 'mono', color: col, align: 'center', alpha: a * fade });
      });
      text('each lineage is a branching process: its count changes by selection, and by chance', cx, 250, { size: 21, color: PAL.dim, align: 'center', alpha: a0 * fade });
      text('chance — “drift” — has two sources', cx, 560, { size: 20, color: PAL.ink, align: 'center', alpha: inv(c(1), c(1) + 1, t) * fade });
    }
    // beat 2-3: the real histogram — lineages at ~40 reads, observed vs model
    const a2 = inv(c(2), c(2) + 1.2, t);
    if (a2 > 0) {
      const nz = pop.noise.barcoding;
      const box = { x: 420, y: 200, w: 1080, h: 420 };
      const edges = nz.edges, maxV = Math.max(...nz.obs, ...nz.pred) * 1.1;
      const P = axes(box, [edges[0], edges[edges.length - 1]], [0, maxV], { xt: [[1, '1'], [40, '40'], [80, '80'], [120, '120'], [160, '160']], yt: [], xl: 'reads at the next timepoint', grid: false });
      P.draw(a2);
      // observed as dots
      for (let i = 0; i < nz.obs.length; i++) { const xm = (edges[i] + edges[i + 1]) / 2; dot(P.X(xm), P.Y(nz.obs[i]), 3.4, pop.accent, a2 * 0.85); }
      // model as a line
      const line2 = [];
      for (let i = 0; i < nz.pred.length; i++) { const xm = (edges[i] + edges[i + 1]) / 2; line2.push([P.X(xm), P.Y(nz.pred[i])]); }
      poly(line2, PAL.ink, 2.4, inv(c(2) + 0.6, c(2) + 1.6, t));
      line(P.X(40), box.y, P.X(40), box.y + box.h, PAL.faint, 1.4, a2, [5, 5]);
      text('started at ≈ 40 reads', P.X(40) + 8, box.y + 24, { size: 16, fam: 'mono', color: PAL.dim, alpha: a2 });
      text(`lineages near 40 reads, one barcoding interval later (YPA, n = ${fmtInt(nz.n)})`, box.x, box.y - 22, { size: 20, color: PAL.ink, alpha: a2 });
      text('● observed     — drift model (one parameter κ)', box.x + box.w, box.y - 22, { size: 17, fam: 'mono', color: PAL.dim, align: 'right', alpha: inv(c(2) + 0.6, c(2) + 1.6, t) });
    }
  },
};

// 12 · from trajectories to fitness
SCENES.fitness = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPD, cx = 960;
    const box = { x: 360, y: 180, w: 1200, h: 440 };
    const a0 = inv(c(0), c(0) + 1.2, t);
    // log-frequency vs generation for a handful of real clones; slope = fitness - mean
    const P = axes(box, [0, displayX(pop.nT - 1)], [-9.2, 0], {
      xt: [[0, '0'], [displayX(33), ''], [displayX(66), ''], [displayX(99), '']],
      yt: [[-9.2, '10⁻⁴'], [-6.9, '10⁻³'], [-4.6, '10⁻²'], [-2.3, '0.1'], [0, '1']],
      xl: 'generation', grid: true,
    });
    P.draw(a0);
    text('log frequency', box.x - 54, box.y + box.h / 2, { size: 19, color: PAL.dim, align: 'center', alpha: a0, _rot: 1 }) || rotText('log frequency', box.x - 56, box.y + box.h / 2, { size: 19, color: PAL.dim });
    // choose a few informative clones: some adaptive (steady climb), some flat/declining
    const chosen = pop.clones.filter(cl => cl.depth <= 3).sort((a, b) => Math.max(...b.F) - Math.max(...a.F)).slice(0, 7);
    const reveal = inv(c(0) + 0.3, c(1) + 1, t);
    chosen.forEach((cl, j) => {
      const pts = [];
      for (let i = cl.s; i < pop.nT; i++) { const k = i - cl.s; const f = cl.own[k]; if (f <= 0) { if (pts.length) break; continue; } pts.push([P.X(displayX(i)), P.Y(Math.max(-9.2, Math.log(f)))]); }
      const upto = box.x + box.w * reveal;
      g.save(); g.beginPath(); g.rect(box.x, box.y - 4, box.w * reveal, box.h + 8); g.clip();
      poly(pts, cl.col, cl.xe > 0.2 ? 2.6 : 1.6, (cl.xe > 0.2 ? 0.95 : 0.5) * a0);
      g.restore();
    });
    // beat 2: discard drift-only; the kept ones are fit jointly
    const a2 = inv(c(2), c(2) + 1.4, t);
    text('rising faster than drift → beneficial; flat or falling → discarded', cx, box.y + box.h + 96, { size: 20, color: PAL.dim, align: 'center', alpha: a2 });
    text('slope of log-frequency  =  fitness relative to the population mean', cx, box.y - 22, { size: 20, color: PAL.ink, align: 'center', alpha: inv(c(1), c(1) + 1.2, t) });
  },
};

// 13 · finding the mutations — compare each lineage with its parent
SCENES.clones = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    const box = { x: 420, y: 190, w: 760, h: 420 };
    const a0 = inv(c(0), c(0) + 1.2, t);
    // schematic: parent band, a child pulling ahead → a star
    const P = axes(box, [0, 4], [0, 1]);
    P.draw(a0);
    const upto = inv(c(0), c(1) + 1, t) * 4;
    const parent = [], pl = [];
    for (let x = 0; x <= Math.min(upto, 4); x += 0.1) { const f = 0.25 + 0.2 / (1 + Math.exp(-(x - 2))); parent.push([P.X(x), P.Y(0.5 + f)]); pl.push([P.X(x), P.Y(0.5 - f)]); }
    fillPoly(parent.concat(pl.reverse()), PAL.blue, a0 * 0.4);
    // child that establishes a mutation at x=2
    const a1 = inv(c(1), c(1) + 1.4, t);
    if (a1 > 0) {
      const cp = [], cl2 = [];
      for (let x = 1; x <= Math.min(upto, 4); x += 0.1) { const base = 0.5, inner = x < 2 ? 0.05 : 0.05 + 0.18 / (1 + Math.exp(-(x - 2.6) * 2)); cp.push([P.X(x), P.Y(base + 0.12 + inner)]); cl2.push([P.X(x), P.Y(base + 0.12 - inner)]); }
      fillPoly(cp.concat(cl2.reverse()), mixHex(PAL.blue, PAL.red, 0.6), a1 * 0.8);
      star(P.X(2), P.Y(0.62), 9, PAL.red, { alpha: inv(c(1) + 0.6, c(1) + 1.4, t), edge: '#333' });
      text('child outgrows parent → a mutation established here', P.X(2), box.y - 20, { size: 19, color: PAL.ink, align: 'center', alpha: a1 });
    }
    // beat 2: the real counts
    const a2 = inv(c(2), c(2) + 1.2, t);
    if (a2 > 0) {
      const rx = 1300;
      text('called clones', rx, 250, { size: 24, weight: 600, color: PAL.ink, alpha: a2 });
      const rows = [['YPD', 72, PAL.ypd], ['YPA', 124, PAL.ypa]];
      rows.forEach(([nm, n, col], i) => {
        const y = 330 + i * 110;
        text(nm, rx, y, { size: 22, color: col, alpha: a2 });
        text(String(n), rx + 130, y, { size: 48, fam: 'mono', weight: 600, color: PAL.ink, alpha: a2 });
        text('clones', rx + 250, y, { size: 20, color: PAL.dim, alpha: a2 });
      });
      text('nested many layers deep', rx, 560, { size: 18, color: PAL.dim, alpha: inv(c(2) + 0.6, c(2) + 1.6, t) });
    }
  },
};

// 14 · clones in competition — the real YPD Muller diagram
SCENES.muller = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPD;
    const box = { x: 300, y: 165, w: 1320, h: 460 };
    const a0 = inv(c(0), c(0) + 1, t);
    panel(box.x - 6, box.y - 6, box.w + 12, box.h + 12, { alpha: a0, fill: PAL.panel });
    const upto = displayX(pop.nT - 1) * inv(c(0), c(2) + 0.5, t);
    mullerDiagram(pop, box, upto, { alpha: a0, stars: inv(c(0) + 1, c(2), t) > 0 });
    text('YPD — clones coloured by founding mutation; stars mark where each established', box.x, box.y - 22, { size: 21, color: PAL.ink, alpha: a0 });
    text('generation →', box.x + box.w, box.y + box.h + 54, { size: 17, color: PAL.dim, align: 'right', alpha: a0 });
  },
};

// 15 · a travelling wave — the fitness distribution marching right
SCENES.wave = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPD;
    const box = { x: 360, y: 165, w: 920, h: 430 };
    const a0 = inv(c(0), c(0) + 1, t);
    panel(box.x - 8, box.y - 8, box.w + 16, box.h + 16, { alpha: a0 });
    // sweep the timepoint from epoch 1 to the end over beats 1-2
    const prg = inv(c(1), D - 1.2, t);
    const idx = Math.round(lerp(11, pop.nT - 1, ease.io(prg)));
    g.save(); g.beginPath(); g.rect(box.x - 8, box.y - 8, box.w + 16, box.h + 16); g.clip();
    waveFrame(pop, box, idx, { alpha: a0 });
    g.restore();
    const gen = displayX(idx); // approximate generation readout
    const realGen = Math.round(idx / 11 * 100 / 10) * 10; // 10 gens per index within epoch, 100/epoch
    text(`generation ${Math.round((idx % 11) * 10 + Math.floor(idx / 11) * 100)}`, box.x + box.w - 10, box.y + 24, { size: 18, fam: 'mono', color: PAL.ink, align: 'right', alpha: a0 });
    // inset: mean fitness vs time, building up
    const ins = { x: 1360, y: 300, w: 300, h: 230 };
    const a1 = inv(c(1), c(1) + 1, t);
    if (a1 > 0) {
      const Pi = axes(ins, [0, pop.nT - 1], [0, 1.3], { xt: [[0, '0'], [pop.nT - 1, '900']], yt: [[0, '0'], [1, '1']], xl: 'generation', grid: true });
      Pi.draw(a1);
      const pts = [];
      for (let i = 1; i <= idx; i++) pts.push([Pi.X(i), Pi.Y(pop.meanFitnessAt(i))]);
      poly(pts, PAL.ink, 2.4, a1);
      dot(pts.length ? pts[pts.length - 1][0] : Pi.X(0), pts.length ? pts[pts.length - 1][1] : Pi.Y(0), 4, pop.accent, a1);
      text('mean fitness (%)', ins.x, ins.y - 16, { size: 16, color: PAL.dim, alpha: a1 });
    }
    text('the distribution holds its shape and marches toward higher fitness', box.x, box.y - 22, { size: 21, color: PAL.ink, alpha: inv(c(1), c(1) + 1.2, t) });
  },
};

// 16 · leapfrogging — the YPA sweep, confirmed by replay
SCENES.leapfrog = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPA, cx = 960;
    const box = { x: 300, y: 165, w: 1320, h: 380 };
    const a0 = inv(c(0), c(0) + 1, t);
    rawPanel(pop, box, { alpha: a0 });
    text('YPA — a lineage far behind leapfrogs everything ahead of it', box.x, box.y - 22, { size: 21, color: PAL.ink, alpha: inv(c(1), c(1) + 1, t) });
    // highlight the late red sweep
    const a1 = inv(c(1), c(1) + 1.2, t);
    if (a1 > 0) { const P = axes(box, [0, displayX(pop.nT - 1)], [0, 1]); const x = P.X(displayX(8 * 11)); callout(x, box.y + box.h * 0.5, x - 160, box.y + 50, 'two strong mutations, one sweep', { alpha: a1, color: PAL.red, size: 18 }); }
    // beat 2: replay — 12 populations re-evolved without barcoding, all the same
    const a2 = inv(c(2), c(2) + 1.4, t);
    if (a2 > 0) {
      const reps = ['D1R1', 'D1R2'];
      const rb = DATA.replay;
      reps.forEach((rn, i) => {
        const rbox = { x: 360 + i * 640, y: 610, w: 560, h: 150 };
        panel(rbox.x, rbox.y, rbox.w, rbox.h, { alpha: a2 });
        const rep = rb[rn]; const tmin = rep.t[0], tmax = rep.t[rep.t.length - 1];
        const P = axes(rbox, [tmin, tmax], [0, 1]);
        g.save(); g.beginPath(); g.rect(rbox.x, rbox.y, rbox.w, rbox.h); g.clip();
        for (const id in rep.clones) {
          const cl = pop.clones.find(x => x.id === id); if (!cl) continue;
          const F = rep.clones[id].F.map(v => v / 1e4), lo = rep.clones[id].lo.map(v => v / 1e4);
          const up = [], dn = [];
          for (let k = 0; k < rep.t.length; k++) { up.push([P.X(rep.t[k]), P.Y(lo[k] + F[k])]); dn.push([P.X(rep.t[k]), P.Y(lo[k])]); }
          fillPoly(up.concat(dn.reverse()), cl.col, a2 * cl.alpha);
        }
        g.restore();
        text(`replicate ${i + 1}`, rbox.x + 6, rbox.y - 8, { size: 16, fam: 'mono', color: PAL.dim, alpha: a2 });
      });
      text('re-evolved from just before the sweep, with no barcoding — the same takeover, every time', cx, 788, { size: 19, color: PAL.ink, align: 'center', alpha: inv(c(2) + 0.6, c(2) + 1.8, t) });
    }
  },
};

// 17 · rich get richer
SCENES.rich = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    // beats 0-1: a fit, fast-growing lineage is a larger target for new mutations
    const fade = 1 - inv(c(2) - 0.3, c(2) + 0.6, t);
    const a0 = inv(c(0), c(0) + 1.2, t);
    if (fade > 0.02) {
      const lanes = [['slow background', PAL.faint, 0.6, 320], ['fit, expanding background', PAL.green, 1.6, 470]];
      lanes.forEach(([lab, col, rate, y], i) => {
        const a = (i === 0 ? a0 : inv(c(0) + 0.6, c(0) + 1.8, t)) * fade;
        const n = Math.round(6 * rate);
        for (let k = 0; k < n; k++) { const x = 420 + k * (900 / 14) * (i ? 1 : 1.6); cell(x, y, 8, { alpha: a, col: PAL.ink }); }
        // mutations landing (stars), more on the fit lane
        const nm = i ? 4 : 1;
        for (let k = 0; k < nm; k++) star(560 + k * 230, y - 34, 8, col, { alpha: inv(c(1), c(1) + 1.2, t) * fade, edge: '#333' });
        text(lab, 1360, y + 5, { size: 20, color: i ? PAL.green : PAL.dim, align: 'right', alpha: a });
      });
      text('a fitter lineage grows into a larger, safer target — new mutations are less likely to be lost', cx, 250, { size: 21, color: PAL.dim, align: 'center', alpha: a0 * fade });
      text('so success compounds: the rich get richer', cx, 600, { size: 22, color: PAL.ink, align: 'center', alpha: inv(c(1) + 0.6, c(1) + 1.8, t) * fade });
    }
    // beat 2: real distribution of mutation effect sizes
    const a2 = inv(c(2), c(2) + 1.2, t);
    if (a2 > 0) {
      const box = { x: 520, y: 210, w: 880, h: 380 };
      const es = effectSizes(POPS.YPD).concat(effectSizes(POPS.YPA));
      const bins = new Array(24).fill(0); const lo = -0.5, hi = 4;
      for (const v of es) { const k = Math.floor((v - lo) / (hi - lo) * 24); if (k >= 0 && k < 24) bins[k]++; }
      const maxB = Math.max(...bins);
      const P = axes(box, [lo, hi], [0, maxB * 1.1], { xt: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], yt: [], xl: 'fitness effect of a mutation (%)', grid: false });
      P.draw(a2);
      for (let k = 0; k < 24; k++) { const x = P.X(lo + k / 24 * (hi - lo)), w = P.X(lo + (hi - lo) / 24) - P.X(lo) - 2; const h = (P.Y(0) - P.Y(bins[k])) * inv(c(2) + 0.3, c(2) + 1.4, t); rect(x + 1, P.Y(0) - h, w, h, POPS.YPD.accent, a2 * 0.8); }
      text('effect sizes of all called mutations (both populations)', box.x, box.y - 20, { size: 20, color: PAL.ink, alpha: a2 });
      text('mostly 0.5–1%, with a heavy tail of strong ones', cx, box.y + box.h + 96, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(2) + 0.6, c(2) + 1.6, t) });
    }
  },
};

// 18 · which genes mutated — whole-genome sequencing, in parallel
SCENES.wgs = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPA, cx = 960;
    const box = { x: 360, y: 180, w: 1200, h: 430 };
    const a0 = inv(c(0), c(0) + 1.2, t);
    panel(box.x - 8, box.y - 8, box.w + 16, box.h + 16, { alpha: a0 });
    const P = axes(box, [0, 1000], [0, 1], { xt: [[0, '0'], [250, ''], [500, '500'], [750, ''], [1000, '1000']], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: 'generation', yl: '', grid: true });
    P.draw(a0);
    rotText('allele frequency', box.x - 54, box.y + box.h / 2, { size: 18, color: PAL.dim });
    const tox = new Set(['BNA3', 'ASG1', 'ASC1']);
    const reveal = inv(c(0) + 0.3, c(1) + 0.5, t);
    g.save(); g.beginPath(); g.rect(box.x, box.y - 4, box.w * reveal, box.h + 8); g.clip();
    pop.wgs.forEach((m, j) => {
      const pts = [];
      m.t.forEach((ts, k) => { const gen = (parseInt(ts) - 1) * 100 + 100; const f = m.f[k]; if (f != null) pts.push([P.X(gen), P.Y(f)]); });
      const hot = tox.has(m.gene);
      poly(pts, hot ? PAL.ypa : PAL.faint, hot ? 2.8 : 1.4, (hot ? 0.95 : 0.5) * a0);
    });
    g.restore();
    line(P.X(0), P.Y(0.5), P.X(1000), P.Y(0.5), PAL.faint, 1.2, a0, [4, 4]);
    text('YPA — mutations that passed the few-percent limit of population sequencing', box.x, box.y - 22, { size: 21, color: PAL.ink, alpha: a0 });
    // beat 1: label the acid-tolerance genes
    const a1 = inv(c(1), c(1) + 1.4, t);
    if (a1 > 0) {
      const labelled = pop.wgs.filter(m => tox.has(m.gene));
      labelled.forEach((m, i) => {
        const lastk = m.f.length - 1; const gen = (parseInt(m.t[lastk]) - 1) * 100 + 100;
        text(m.gene, P.X(gen) + 10, P.Y(m.f[lastk]) + 6 + i * 2, { size: 19, fam: 'mono', weight: 600, color: PAL.ypa, alpha: a1 });
      });
      text('BNA3, ASG1, ASC1 — all known to help cells tolerate acetic acid', cx, box.y + box.h + 96, { size: 20, color: PAL.dim, align: 'center', alpha: a1 });
    }
  },
};

// 19 · what renewable barcoding showed
SCENES.close = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPA, cx = 960;
    const box = { x: 300, y: 150, w: 1320, h: 330 };
    const a0 = inv(c(0), c(0) + 1.4, t);
    rawPanel(pop, box, { alpha: a0 * 0.9 });
    const lines = [
      ['Follow lineages far below the limit of genome sequencing', c(0)],
      ['Adaptation moves as a travelling wave — but a disorderly one', c(1)],
      ['Leapfrogging and compounding success break the older models', c(2)],
    ];
    lines.forEach(([s, start], i) => {
      const a = inv(start, start + 1.2, t), y = 560 + i * 72;
      dot(360, y - 8, 5, pop.accent, a);
      text(s, 390, y, { size: 26, color: PAL.ink, alpha: a });
    });
  },
};
