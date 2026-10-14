// ───────────────────────────── chapters 05–10 ─────────────────────────────

// 05 · making the reaction one-way (the lox2 arm trick)
SCENES.oneway = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    // a lox site with two arms gripping Cre
    const a0 = inv(c(0), c(0) + 1.2, t);
    const site = (x, y, left, right, s, alpha, lab) => {
      // spacer in middle, two arm boxes
      const armCol = m => m ? PAL.red : PAL.ink;
      rect(x - 70, y - 14, 56, 28, armCol(left), alpha * (left ? 0.85 : 0.0)); if (!left) frame(x - 70, y - 14, 56, 28, PAL.ink, 1.6, alpha);
      rect(x + 14, y - 14, 56, 28, armCol(right), alpha * (right ? 0.85 : 0.0)); if (!right) frame(x + 14, y - 14, 56, 28, PAL.ink, 1.6, alpha);
      triangle(x, y, 26, 1, PAL.purple, { alpha });
      text(lab, x, y + 42, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha });
    };
    const a1 = inv(c(1), c(1) + 1.2, t);
    if (a1 > 0) {
      text('each lox site has two arms that Cre grips', cx, 250, { size: 21, color: PAL.dim, align: 'center', alpha: a1 });
      site(cx, 360, 0, 0, 1, a1, 'wild-type arms: full activity');
    }
    // beat 2: combining two single-arm mutations → double mutant, inactive
    const a2 = inv(c(2), c(3), t);
    if (a2 > 0) {
      const yl = 470;
      site(640, yl, 1, 0, 1, a2, 'left-arm mutant');
      text('+', 790, yl + 6, { size: 34, color: PAL.dim, align: 'center', alpha: a2 });
      site(900, yl, 0, 1, 1, a2, 'right-arm mutant');
      arrow(1010, yl, 1130, yl, PAL.ink, { alpha: inv(c(2) + 1, c(3), t) });
      site(1270, yl, 1, 1, 1, inv(c(2) + 1.2, c(3), t), 'both arms mutant: dead');
      triangle(1270, yl, 26, 1, PAL.purple, { alpha: inv(c(2) + 1.2, c(3), t), dead: true });
    }
    // beat 3: lox2 — active in trans, dead in cis
    const a3 = inv(c(3), c(3) + 1.6, t);
    if (a3 > 0) {
      rect(230, 420, 1460, 230, PAL.bg, a3 * 0.9);
      text('the lox2 arm: full activity when paired with a normal arm, but off when paired with itself', cx, 470, { size: 22, color: PAL.ink, align: 'center', alpha: a3 });
      site(700, 560, 1, 0, 1, a3, 'lox2 + normal → fires once');
      site(1220, 560, 1, 1, 1, a3, 'lox2 + lox2 → locked off');
      triangle(1220, 560, 26, 1, PAL.purple, { alpha: a3, dead: true });
      text('exactly the one-way switch re-barcoding needs', cx, 640, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(3) + 0.8, c(3) + 1.8, t) });
    }
  },
};

// 06 · two alternating plasmids, broken markers, a diverse library
SCENES.plasmid = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    // odd / even plasmids swapping Kan/Hyg
    const a0 = inv(c(0), c(0) + 1.4, t);
    if (a0 > 0) {
      const plasmid = (x, y, mk, label, alpha) => {
        ring(x, y, 70, PAL.ink, 2, alpha);
        const col = REBAR.markers[mk];
        construct(x - 46, y - 92, [{ w: 40, col: PAL.red, txt: 'BC', fill: 0.9 }, { w: 52, col, txt: mk, fill: 0.85 }], { alpha, labels: false });
        text(label, x, y + 96, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha });
      };
      plasmid(700, 410, 'Kan', 'odd rounds', a0);
      plasmid(1220, 410, 'Hyg', 'even rounds', inv(c(0) + 0.5, c(0) + 1.8, t));
      text('two plasmids, mirror images, swap the drug marker each round', cx, 270, { size: 21, color: PAL.dim, align: 'center', alpha: a0 });
    }
    // beat 1: broken marker (no start codon) — only integration activates it
    const a1 = inv(c(1), c(2), t);
    if (a1 > 0) {
      rect(230, 320, 1460, 320, PAL.bg, a1 * 0.92);
      const y = 430;
      construct(540, y, [{ w: 60, col: PAL.red, txt: 'BC', fill: 0.9 }, { w: 120, col: PAL.faint, txt: 'Kan', fill: 0.5 }], { alpha: a1, labels: false });
      text('on the plasmid: no start codon → marker is silent', 540, y - 40, { size: 20, color: PAL.ink, alpha: a1 });
      text('intron', 740, y + 36, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: a1 });
      const a1b = inv(c(1) + 1, c(2), t);
      arrow(760, y + 60, 900, y + 60, PAL.dim, { alpha: a1b, p: 1 });
      const y2 = y;
      rect(1000, y2 - 14, 60, 28, PAL.ink, a1b * 0.85); text('ATG', 1030, y2, { size: 15, fam: 'mono', color: '#fff', align: 'center', base: 'middle', alpha: a1b });
      construct(1070, y2, [{ w: 60, col: PAL.red, txt: 'BC', fill: 0.9 }, { w: 120, col: REBAR.markers.Kan, txt: 'Kan', fill: 0.85 }], { alpha: a1b, labels: false });
      text('in the genome: start codon + correct splicing → marker works', 1000, y2 - 40, { size: 20, color: PAL.ink, alpha: a1b });
    }
    // beat 2: diverse library, soft agar, >10^6 barcodes
    const a2 = inv(c(2), c(2) + 1.6, t);
    if (a2 > 0) {
      rect(230, 320, 1460, 320, PAL.bg, a2 * 0.92);
      text('a random 16-base barcode in every plasmid', cx, 400, { size: 22, color: PAL.ink, align: 'center', alpha: a2 });
      // NNN... barcode
      const seq = 'tactNNNTANNNNNATNNNNNTANNNcgct'.toUpperCase();
      const bw = 30, x0 = cx - seq.length * bw / 2;
      for (let i = 0; i < seq.length; i++) { const ch = seq[i]; const isN = ch === 'N'; baseBox(isN ? 'N' : ch, x0 + i * bw + bw / 2, 470, bw - 4, { alpha: a2, dim: !isN, hi: isN, fill: isN }); }
      text('> 10⁶ distinct barcodes per library', cx, 560, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(2) + 0.7, c(2) + 1.8, t) });
    }
  },
};

// 07 · one round of barcoding — the six bench steps
SCENES.procedure = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const steps = REBAR.steps;
    const n = steps.length, x0 = 300, dx = 1320 / n;
    steps.forEach(([title, sub], i) => {
      const start = c(0) + i * ((c(3) - c(0)) / 2.0) * 0;   // reveal paced below
      const a = inv(c(0) + i * 0.5, c(0) + i * 0.5 + 1, t);
      const x = x0 + dx * (i + 0.5), y = 420;
      if (a <= 0) return;
      // node
      dot(x, y, 9, POPS.YPD.accent, a);
      if (i > 0) line(x0 + dx * (i - 0.5), y, x, y, PAL.faint, 2, a);
      text(`${i + 1}`, x, y - 36, { size: 20, fam: 'mono', weight: 600, color: PAL.ink, align: 'center', alpha: a });
      rotLabel(title, x, y + 34, a, 'ink', 22, 600);
      rotLabel(sub, x, y + 64, a, 'dim', 15, 400, 180);
    });
    // media hints keyed to beats: galactose (beat 1), 5-FOA (beat 2)
    const hl = (beat, i) => inv(c(beat), c(beat) + 1.2, t);
    text('galactose turns on Cre', x0 + dx * 1.5, 320, { size: 17, fam: 'mono', color: PAL.green, align: 'center', alpha: hl(1) * (1 - inv(c(2), c(2) + 1, t)) });
    text('5-FOA removes the plasmid', x0 + dx * 4.5, 320, { size: 17, fam: 'mono', color: PAL.orange, align: 'center', alpha: hl(2) });
    text('≈ 50,000 new barcodes written in, no bottleneck tighter than the daily transfer', 960, 600, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(3), c(3) + 1.4, t) });
  },
};
function rotLabel(str, x, y, a, col, size, weight = 400, maxW = 0) {
  text(str, x, y, { size, weight, color: col === 'ink' ? PAL.ink : PAL.dim, align: 'center', alpha: a, maxW: maxW || 160 });
}

// 08 · the evolution experiment — two populations, daily transfer, re-barcode each epoch
SCENES.evolve = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    // two tubes: YPD, YPA
    const a0 = inv(c(0), c(0) + 1.2, t);
    const a1 = inv(c(1), c(1) + 1.2, t);
    const tube = (x, label, col, alpha) => {
      const y = 360, h = 150, w = 60;
      g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = PAL.ink; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y + h - 20); g.quadraticCurveTo(x - w / 2, y + h, x, y + h); g.quadraticCurveTo(x + w / 2, y + h, x + w / 2, y + h - 20); g.lineTo(x + w / 2, y); g.stroke();
      g.restore();
      rect(x - w / 2 + 2, y + 40, w - 4, h - 42, hexA(col, 0.22), alpha);
      text(label, x, y - 20, { size: 24, weight: 600, color: col, align: 'center', alpha });
    };
    if (a0 > 0) { tube(720, 'YPD', PAL.ypd, a0); text('rich medium', 720, 540, { size: 18, color: PAL.dim, align: 'center', alpha: a0 }); }
    if (a1 > 0) { tube(1200, 'YPA', PAL.ypa, a1); text('rich medium + acetic acid', 1200, 540, { size: 18, color: PAL.dim, align: 'center', alpha: a1 }); }
    if (a0 > 0 && inv(c(1), c(1) + 1, t) < 0.4) text('founded from the same ancestor, each ≈ 50,000 barcodes', cx, 250, { size: 21, color: PAL.dim, align: 'center', alpha: a0 * (1 - inv(c(1), c(1) + 1, t)) });
    // beat 2: 1:1024 daily transfer
    const a2 = inv(c(2), c(2) + 1.4, t);
    if (a2 > 0) {
      rect(230, 230, 1460, 120, PAL.bg, a2 * 0.9);
      text('daily 1 : 1024 dilution  ≈  10 generations/day  •  bottleneck ≈ 5 × 10⁵ cells', cx, 290, { size: 22, color: PAL.ink, align: 'center', alpha: a2 });
    }
    // beat 3-4: epoch timeline with re-barcoding marks
    const a3 = inv(c(3), c(3) + 1.4, t);
    if (a3 > 0) {
      const y = 650, x0 = 300, x1 = 1620;
      line(x0, y, x1, y, PAL.ink, 2, a3);
      for (let e = 0; e <= 10; e++) {
        const x = x0 + (x1 - x0) * e / 10, bc = e < 10;
        if (bc) { triangle(x, y, 18, 1, PAL.red, { alpha: a3 * 0.9 }); }
        text(`${e * 100}`, x, y + 34, { size: 14, fam: 'mono', color: PAL.dim, align: 'center', alpha: a3 });
      }
      text('re-barcode every 100 generations (an “epoch”)', x0, y - 26, { size: 18, fam: 'mono', color: PAL.red, alpha: a3 });
      text('YPD: 9 epochs  •  YPA: 10 epochs', x1, y - 26, { size: 18, fam: 'mono', color: PAL.ink, align: 'right', alpha: inv(c(4), c(4) + 1.2, t) });
    }
  },
};

// 09 · reading the barcode locus — four barcodes per read, assembled by overlap
SCENES.sequence = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const cx = 960;
    // beat 0: extract + UMI
    const a0 = inv(c(0), c(0) + 1.4, t);
    if (a0 > 0 && inv(c(1), c(1) + 1, t) < 0.5) {
      helix(620, 380, 700, { alpha: a0 * (1 - inv(c(1), c(1) + 1, t)), turns: 4, amp: 22 });
      text('extract DNA  •  tag each molecule with a UMI so it is counted once', cx, 300, { size: 21, color: PAL.dim, align: 'center', alpha: a0 * (1 - inv(c(1), c(1) + 1, t)) });
    }
    // beats 1-3: the locus, a read window of 4 barcodes, assembly by shared ancestors
    const a1 = inv(c(1), c(1) + 1.2, t);
    if (a1 > 0) {
      const seedCols = i => hslToHex((i * 57 + 20) % 360, 60, 52);
      const y = 430, x0 = 360, bw = 44, gap = 8;
      const cols = Array.from({ length: 8 }, (_, i) => i === 0 ? PAL.yellow : seedCols(i));
      let cx2 = barcodeStrip(x0, y, cols, { alpha: a1, bw, h: 54, gap, lox: true });
      text('the barcode locus grows one block per round', x0, y - 50, { size: 21, color: PAL.ink, alpha: a1 });
      // read window over the last 4 barcodes
      const a2 = inv(c(2), c(2) + 1.2, t);
      if (a2 > 0) {
        const span = (bw + gap + 27) * 4;
        const wx = cx2 - span - 10;
        frame(wx, y - 40, span, 80, PAL.red, 2.2, a2);
        text('one paired-end read ≈ 4 barcodes', wx + span / 2, y - 52, { size: 18, fam: 'mono', color: PAL.red, align: 'center', alpha: a2 });
      }
      // assembly: the older barcodes are already known → whole string reconstructed
      const a3 = inv(c(3), c(3) + 1.4, t);
      if (a3 > 0) { text('older barcodes were already sequenced, and each is unique → the full ancestry reassembles', cx, y + 90, { size: 20, color: PAL.dim, align: 'center', alpha: a3 }); }
    }
    text('≈ 360,000 lineage counts per timepoint, after error-correcting the reads', cx, 650, { size: 20, color: PAL.dim, align: 'center', alpha: inv(c(3) + 0.6, c(3) + 1.8, t) });
  },
};

// 10 · the raw trajectories — the real picture, every sublineage above 0.1%
SCENES.raw = {
  textPos: 'bottom', textW: 1500,
  flat(t, c, D) {
    const pop = POPS.YPA;
    const box = { x: 300, y: 170, w: 1320, h: 470 };
    const a0 = inv(c(0), c(0) + 1.2, t);
    rawPanel(pop, box, { alpha: a0 });
    text('YPA — every barcoded sublineage above 0.1%, stacked by frequency', box.x, box.y - 22, { size: 21, color: PAL.ink, alpha: a0 });
    // beat 1: point at grey barcoding bands
    const a1 = inv(c(1), c(1) + 1.2, t);
    if (a1 > 0) { const P = axes(box, [0, displayX(pop.nT - 1)], [0, 1]); const bx = P.X(displayX(5 * 11 - 1)); callout(bx, box.y + box.h - 20, bx - 120, box.y + box.h + 70, 'a barcoding round', { alpha: a1, color: PAL.ink, size: 18 }); }
  },
};
