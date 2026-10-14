// ───────────────────────────── chapters 00–04 ─────────────────────────────
// Each chapter is { textPos?, textX?, textW?, flat(t, c, D, O) }. t = seconds into the chapter,
// c(i) = start time of beat i, D = chapter length. Pure functions of time → deterministic capture.

const FIG = { x: 230, y: 150, w: 1460, h: 620 };   // the region figures live in, above the caption

// 00 · intro — a clonal population, a few lineages expanding, then a barcode written in
SCENES.intro = {
  textPos: 'bottom',
  flat(t, c, D) {
    // a loose field of cells
    const N = 230, cx = 960, cy = 440;
    const r = rng(7);
    const pts = [];
    for (let i = 0; i < N; i++) { const a = hash01(i, 3) * TAU, rr = 120 + 340 * Math.sqrt(hash01(i, 9)); pts.push([cx + Math.cos(a) * rr * 1.55, cy + Math.sin(a) * rr * 0.72]); }
    const adaptive = [12, 47, 88, 150, 193];
    const appear = inv(c(0), c(0) + 2.2, t);
    for (let i = 0; i < N; i++) {
      const [x, y] = pts[i]; if (Math.abs(x - cx) > 720 || Math.abs(y - cy) > 350) continue;
      const am = adaptive.indexOf(i);
      const on = am >= 0 ? inv(c(0) + 1.4 + am * 0.25, c(0) + 2.6 + am * 0.25, t) : 0;
      const a = appear * (0.55 + 0.45 * hash01(i, 5)) * (1 - 0.45 * inv(c(1), c(1) + 1.5, t) * (am < 0 ? 1 : 0));
      const col = am >= 0 ? [PAL.purple, PAL.orange, PAL.green, PAL.red, PAL.blue][am] : '#a7a39a';
      cell(x, y, 7.5 + on * 3.5, { alpha: a, col: on > 0 ? col : '#a7a39a', fill: on > 0 ? hexA(col, 0.2) : '#fff', lw: 1.5 });
    }
    // a barcode written into one cell, beat 3
    const b3 = inv(c(2), c(2) + 2, t);
    if (b3 > 0) {
      const bx = cx - 150, by = 700;
      const cols = [PAL.yellow, PAL.blue, PAL.red, PAL.green, PAL.purple];
      const shown = Math.floor(b3 * 5 + 0.001);
      barcodeStrip(bx, by, cols.slice(0, shown + 1), { alpha: b3, bw: 30, h: 38 });
      text('a cell’s inherited barcode string', bx, by + 44, { size: 18, fam: 'mono', color: PAL.dim, alpha: b3 });
    }
  },
};

// 01 · why one barcode is not enough
SCENES.problem = {
  textPos: 'bottom', textW: 1480,
  flat(t, c, D) {
    const box = { x: 300, y: 165, w: 1320, h: 470 };
    // a schematic Muller: several lineages competing, one expands and swallows later variation
    const P = axes(box, [0, 10], [0, 1]);
    const a1 = inv(c(0), c(0) + 1.5, t);
    if (a1 > 0) {
      // competing cohorts (clonal interference)
      const cohorts = [[0.5, PAL.blue, 0.1], [1.2, PAL.green, 0.42], [1.0, PAL.orange, 0.68], [0.7, PAL.purple, 0.88]];
      const winUpto = inv(c(0), c(3), t) * 10;
      for (const [grow, col, y0] of cohorts) {
        const pts = [], low = [];
        for (let x = 0; x <= Math.min(winUpto, 10); x += 0.25) {
          const f = 0.02 + 0.14 * grow * (1 / (1 + Math.exp(-(x - 3) * 0.8)));
          pts.push([P.X(x), P.Y(y0 + f)]); low.push([P.X(x), P.Y(y0 - f)]);
        }
        fillPoly(pts.concat(low.reverse()), col, a1 * 0.7);
      }
    }
    // beat 4: one barcode lineage expands and hides later mutations inside it
    const a4 = inv(c(3), c(3) + 2, t);
    if (a4 > 0) {
      rect(box.x, box.y, box.w, box.h, PAL.bg, a4 * 0.82);
      const P2 = axes(box, [0, 10], [0, 1]); P2.draw(a4);
      const upto = inv(c(3), c(3) + 2.5, t) * 10;
      // the expanding barcoded lineage (one colour)
      const pts = [], low = [];
      for (let x = 0; x <= Math.min(upto, 10); x += 0.2) { const f = 0.5 / (1 + Math.exp(-(x - 4.5) * 1.0)); pts.push([P2.X(x), P2.Y(0.5 + f)]); low.push([P2.X(x), P2.Y(0.5 - f)]); }
      fillPoly(pts.concat(low.reverse()), PAL.blue, a4 * 0.5);
      // hidden sub-mutations inside, invisible to bulk view
      const a4b = inv(c(3) + 1.2, c(3) + 3, t);
      for (const [off, gr] of [[0.14, 1], [-0.2, 0.7], [0.03, 0.5]]) {
        const sp = [], sl = [];
        for (let x = 4; x <= Math.min(upto, 10); x += 0.2) { const f = 0.5 / (1 + Math.exp(-(x - 4.5))), inner = 0.06 * gr / (1 + Math.exp(-(x - 6.5))); sp.push([P2.X(x), P2.Y(0.5 + off + inner)]); sl.push([P2.X(x), P2.Y(0.5 + off - inner)]); }
        fillPoly(sp.concat(sl.reverse()), mixHex(PAL.blue, '#000', 0.3), a4b * 0.6);
      }
      text('later mutations share the barcode — hidden', P2.X(7), P2.Y(0.5) - 2, { size: 19, color: PAL.ink, align: 'center', alpha: inv(c(3) + 1.8, c(3) + 3, t) });
    }
    if (a1 > 0 && a4 < 0.3) { P.draw(a1 * (1 - a4)); text('one clone sweeps, erasing the record of the rest', box.x + box.w / 2, box.y - 18, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(0) + 0.5, c(0) + 2, t) * (1 - a4) }); }
  },
};

// 02 · renewable barcoding — the core idea, ending on a real barcode string
SCENES.idea = {
  textPos: 'bottom',
  flat(t, c, D) {
    const pop = POPS.YPD;
    // beats 0–3: schematic — a lineage repeatedly split by new barcodes
    const schem = 1 - inv(c(4) - 0.4, c(4) + 0.6, t);
    if (schem > 0) {
      const y0 = 300, bx = 360;
      const rounds = Math.min(4, Math.floor(inv(c(0), c(3) + 1.5, t) * 4 + 0.5));
      // tree of barcode additions
      const cols = [PAL.ypd, PAL.purple, PAL.orange, PAL.green, PAL.blue];
      const draw = (x, y, depth, spread, alpha) => {
        if (depth > rounds) return;
        const nb = depth === 0 ? 1 : 3;
        for (let k = 0; k < (depth === 0 ? 1 : 3); k++) {
          const yy = y + (depth === 0 ? 0 : (k - 1) * spread);
          line(x - 60, y, x, yy, PAL.faint, 1.4, alpha);
          rect(x, yy - 12, 24, 24, cols[depth], alpha * 0.9);
          if (depth < rounds) draw(x + 150, yy, depth + 1, spread * 0.42, alpha);
        }
      };
      // simpler: horizontal growing string with branch labels
      const cx = 420, cy = 420;
      for (let d = 0; d <= rounds; d++) {
        const x = cx + d * 230, a = schem * inv(c(Math.min(d, 3)), c(Math.min(d, 3)) + 1, t);
        if (a <= 0) continue;
        text(d === 0 ? 'barcode' : `+ barcode ${d + 1}`, x, 230, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: a });
        text(d === 0 ? '' : `after ${d} × 100 gens`, x, 255, { size: 15, fam: 'mono', color: PAL.faint, align: 'center', alpha: a });
      }
      // a widening family of strings
      const fam = Math.min(rounds, 4);
      const base = [PAL.yellow];
      const branches = [];
      const build = (prefix, depth) => { if (depth > fam) { branches.push(prefix); return; } for (let k = 0; k < (depth === 0 ? 1 : 2); k++) build(prefix.concat([[PAL.ypd, PAL.purple, PAL.orange, PAL.green][depth % 4]]), depth + 1); };
      build([PAL.yellow], 0);
      const n = branches.length, top = 320, step = Math.min(70, 430 / Math.max(1, n));
      branches.forEach((b, i) => {
        const yy = top + i * step, a = schem * inv(c(0) + 0.3, c(3) + 1.5, t);
        barcodeStrip(cx, yy, b, { alpha: a * (0.6 + 0.4 * schem), bw: 24, h: Math.min(26, step - 8), lox: true });
      });
    }
    // beat 4: a real string from the data
    const real = inv(c(4), c(4) + 1.4, t);
    if (real > 0) {
      const deep = pop.clones.filter(cl => cl.depth >= 5).sort((a, b) => b.depth - a.depth)[0];
      const seedCols = i => hslToHex((i * 57 + 20) % 360, 62, 52);
      const cols = Array.from({ length: Math.min(9, deep.depth) }, (_, i) => i === 0 ? PAL.yellow : seedCols(i));
      const cx = 430, cy = 420;
      const shown = Math.floor(inv(c(4), c(4) + 2.4, t) * cols.length + 0.001);
      barcodeStrip(cx, cy, cols.slice(0, Math.max(1, shown)), { alpha: real, bw: 40, h: 54, gap: 6 });
      text('one YPD cell’s barcode locus', cx, cy - 56, { size: 22, color: PAL.ink, alpha: real });
      text('founding barcode', cx + 20, cy + 54, { size: 16, fam: 'mono', color: PAL.dim, alpha: real });
      text('added over 800 generations →', cx + 520, cy + 54, { size: 16, fam: 'mono', color: PAL.dim, align: 'right', alpha: real });
    }
  },
};

// 03 · three requirements
SCENES.needs = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const reqs = [
      ['One locus per cell', 'diploid yeast, barcode on one chromosome', c(0)],
      ['No tight bottlenecks', 'keep the population large through barcoding', c(2)],
      ['One-way, repeatable', 'Cre recombinase, not a CRISPR cut', c(3)],
    ];
    const cols = [920, 920, 920];
    reqs.forEach(([title, sub, start], i) => {
      const a = inv(start, start + 1.2, t);
      const y = 250 + i * 160, x = 360;
      if (a <= 0) return;
      // numeral
      text(`${i + 1}`, x, y + 14, { size: 54, fam: 'mono', weight: 600, color: POPS.YPD.accent, alpha: a * 0.8 });
      text(title, x + 90, y - 12, { size: 34, weight: 600, color: PAL.ink, alpha: a });
      text(sub, x + 90, y + 28, { size: 24, color: PAL.dim, alpha: a });
      // a small glyph on the right
      const gx = 1400, gy = y;
      if (i === 0) { cell(gx, gy, 34, { alpha: a, col: PAL.ink, bud: 0.4 }); line(gx - 18, gy, gx + 18, gy, PAL.faint, 1.4, a); rect(gx - 5, gy - 7, 10, 14, PAL.yellow, a * 0.9); }
      if (i === 1) { for (let k = 0; k < 7; k++) cell(gx - 54 + k * 18, gy, 7, { alpha: a, col: PAL.ink }); arrow(gx + 70, gy, gx + 120, gy, PAL.dim, { alpha: a }); for (let k = 0; k < 6; k++) cell(gx + 140 + k * 18, gy, 7, { alpha: a, col: PAL.ink }); }
      if (i === 2) { triangle(gx - 60, gy, 30, 1, PAL.purple, { alpha: a }); arrow(gx - 36, gy, gx + 10, gy, PAL.dim, { alpha: a }); triangle(gx + 36, gy, 30, 1, PAL.purple, { alpha: a, dead: true }); text('Cre', gx - 25, gy - 30, { size: 17, fam: 'mono', italic: false, color: PAL.dim, align: 'center', alpha: a }); }
    });
  },
};

// 04 · Cre and orthogonal lox sites
SCENES.lox = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960, yPad = 300, yPla = 470;
    // landing pad with one lox site + a plasmid carrying a matching site and a barcode
    const a0 = inv(c(0), c(0) + 1.2, t);
    // three orthogonal sites legend (beat 1)
    const a1 = inv(c(1), c(1) + 1.2, t);
    if (a1 > 0) {
      const names = [['loxP', REBAR.sites.loxP], ['lox5171', REBAR.sites.lox5171], ['lox2272', REBAR.sites.lox2272]];
      names.forEach(([nm, col], i) => { const x = 700 + i * 220; triangle(x, 200, 30, 1, col, { alpha: a1 }); text(nm, x + 26, 206, { size: 20, fam: 'mono', color: PAL.ink, alpha: a1 }); });
      text('three orthogonal lox sites: same type reacts, different types ignore each other', cx, 250, { size: 20, color: PAL.dim, align: 'center', alpha: a1 });
    }
    // the integration reaction (beats 2–3)
    const react = inv(c(2), c(3) + 1.5, t);
    if (react > 0) {
      const yLP = 400, yPL = 560;
      // landing pad (genome line)
      line(430, yLP, 1490, yLP, PAL.ink, 2, react);
      triangle(650, yLP, 28, 1, REBAR.sites.loxP, { alpha: react });
      construct(760, yLP, [{ w: 120, col: REBAR.markers.Hyg, lab: 'Hyg', txt: 'Hyg', fill: 0.85 }], { alpha: react, labels: false });
      text('start', 1180, yLP - 28, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: react });
      rect(1150, yLP - 14, 60, 28, PAL.ink, react * 0.85); text('ATG', 1180, yLP, { size: 15, fam: 'mono', color: '#fff', align: 'center', base: 'middle', alpha: react });
      text('landing pad', 430, yLP - 32, { size: 20, color: PAL.ink, alpha: react });
      // plasmid below carrying barcode + matching site + new marker
      const pa = react * (1 - inv(c(3), c(3) + 1.5, t) * 0.0);
      line(560, yPL, 1360, yPL, PAL.faint, 2, pa, [6, 5]);
      triangle(650, yPL, 28, 1, REBAR.sites.loxP, { alpha: pa });
      rect(720, yPL - 16, 70, 32, PAL.red, pa * 0.9); text('BC', 755, yPL, { size: 16, fam: 'mono', color: '#fff', align: 'center', base: 'middle', alpha: pa });
      construct(820, yPL, [{ w: 120, col: REBAR.markers.Kan, lab: 'Kan', txt: 'Kan', fill: 0.85 }], { alpha: pa, labels: false });
      text('plasmid', 560, yPL + 44, { size: 20, color: PAL.dim, alpha: pa });
      // Cre arrows pairing the two loxP
      const cre = inv(c(2) + 1, c(3), t);
      if (cre > 0) { arrow(650, yPL - 18, 650, yLP + 18, PAL.ink, { alpha: cre, p: 1, head: 9 }); text('Cre', 605, (yLP + yPL) / 2, { size: 18, fam: 'mono', color: PAL.ink, align: 'right', alpha: cre }); }
    }
    // result: barcode + swapped marker integrated (beat 3 end)
    const done = inv(c(3) + 0.8, c(3) + 2.4, t);
    if (done > 0) {
      rect(FIG.x, 330, FIG.w, 300, PAL.bg, done * 0.9);
      const yR = 470;
      line(430, yR, 1490, yR, PAL.ink, 2, done);
      triangle(650, yR, 28, 1, REBAR.sites.loxP, { alpha: done, dead: true });
      rect(700, yR - 16, 70, 32, PAL.red, done * 0.9); text('BC', 735, yR, { size: 16, fam: 'mono', color: '#fff', align: 'center', base: 'middle', alpha: done });
      construct(790, yR, [{ w: 120, col: REBAR.markers.Kan, txt: 'Kan', fill: 0.85 }], { alpha: done, labels: false });
      text('ATG', 1060, yR, { size: 15, fam: 'mono', color: '#fff', align: 'center', base: 'middle', alpha: done }); rect(1030, yR - 14, 60, 28, PAL.ink, done * 0.85);
      text('barcode integrated; drug marker swapped Hyg → Kan', 960, yR - 40, { size: 22, color: PAL.ink, align: 'center', alpha: done });
      text('only correctly integrated cells survive the next selection', 960, yR + 48, { size: 20, color: PAL.dim, align: 'center', alpha: done });
    }
  },
};
