// ───────────────────────────── domain model ─────────────────────────────
// The film is built from a domain model first. At its centre is the real dataset from the paper
// (Nguyen Ba, Cvijović, Rojas Echenique et al., Nature 2019), extracted from the authors' public
// repository by build/extract_data.py. Scenes read these objects; they never invent trajectories.
//
//   DATA            the extracted measurements, injected at build time
//   REBAR           the renewable-barcoding construct (lox sites, markers) — for the diagram chapters
//   Pop(name)       one evolving population: clones, Muller bands, the fitness wave, noise, WGS, assays
//   displayX(i)     the stretched "generation" x-coordinate of timepoint index i (barcoding = 100 wide)

const DATA = /*@DATA@*/ {};
const PER = DATA.perEpoch || 11;          // 10 evolution intervals + 1 barcoding interval per epoch
const BCW = DATA.bcWidth || 50;           // drawn width of a barcoding interval, in display units

/** stretched display coordinate of timepoint index i, after the paper's Figure 2 */
function displayX(i) { return 10 * i + 90 * Math.floor(i / PER); }
const EPOCH_DISP = 100 + 90;              // one epoch spans 190 display units (100 gens + 90 stretch)

// ── the renewable-barcoding construct, for the mechanism chapters ──
const REBAR = {
  // three orthogonal lox sites and the two drug markers that alternate between rounds
  sites: { loxP: PAL.purple, lox5171: PAL.yellow, lox2272: PAL.teal },
  markers: { Kan: PAL.blue, Hyg: PAL.green },
  steps: [
    ['Transform', 'library of barcode plasmids enters the cells'],
    ['Induce Cre', 'galactose switches on Cre for ~10 generations'],
    ['Recombine', 'barcode and marker swap into the landing pad'],
    ['Select', 'the new drug marker keeps only recombinants'],
    ['Counter-select', '5-FOA discards the spent plasmid'],
    ['Evolve', '100 generations before the next round'],
  ],
};

// clone band colours: clones that found sublineages get a wheel colour, the rest grey, as in the paper
const WHEEL = ['#8e44ad', '#ef7d10', '#2f7dc0', '#43a047', '#d83a32', '#c99700', '#1796a0', '#d96bb0', '#9c5a2c', '#5d6fd6', '#2aa17a', '#c0556f'];

function Pop(name) {
  const p = DATA.pops[name];
  const norm = name === 'YPD' ? 0.05 : 0.12;   // fitness → opacity scale, per the authors' code
  const clones = p.clones.map(c => ({ ...c, own: c.own.map(v => v / 1e4), F: c.F.map(v => v / 1e4), lo: c.lo.map(v => v / 1e4) }));
  const kids = clones.map(() => []);
  clones.forEach((c, i) => { if (c.parent >= 0) kids[c.parent].push(i); });
  // assign colours: founders of sublineages get distinct hues (ordered by peak frequency), rest grey
  const majors = clones.map((c, i) => i).filter(i => kids[i].length).sort((a, b) => Math.max(...clones[b].F) - Math.max(...clones[a].F));
  majors.forEach((i, k) => { clones[i].hue = WHEEL[k % WHEEL.length]; });
  clones.forEach((c, i) => {
    c.alpha = clamp(c.xe / 100 / norm * 0.6 + 0.4, 0.4, 1);
    if (kids[i].length) c.col = c.hue;
    else { let q = c.parent; while (q >= 0 && !clones[q].hue) q = clones[q].parent; c.col = q >= 0 ? clones[q].hue : '#9a9a9a'; if (q < 0) c.col = '#9a9a9a'; }
    c.childless = !kids[i].length;
  });
  const nT = p.epochs * PER;
  const times = Array.from({ length: nT }, (_, i) => i);   // timepoint indices
  // the ancestor (white) band lower edges, so the stack fills to 1
  return {
    name, code: p.code, epochs: p.epochs, popBarcode: p.popBarcode,
    clones, kids, ancestor: p.ancestor.map(v => v / 1e4), nT, times,
    kappa: p.kappa, coverage: p.coverage, lineagesPerEpoch: p.lineagesPerEpoch,
    noise: p.noise, wgs: p.wgs, assays: p.assays,
    accent: name === 'YPD' ? PAL.ypd : PAL.ypa,
    /** clones present at timepoint index i, with their own frequency and average fitness */
    waveAt(i) {
      const out = [];
      for (const c of clones) { const k = i - c.s; if (k >= 0 && k < c.own.length && c.own[k] > 1e-5) out.push({ xa: c.xa, f: c.own[k], col: c.col, alpha: c.alpha }); }
      return out;
    },
    meanFitnessAt(i) { let m = 0, tot = 0; for (const c of clones) { const k = i - c.s; if (k >= 0 && k < c.own.length) { m += c.own[k] * c.xa; tot += c.own[k]; } } return m; },
  };
}

// effect-size spectrum of all called mutations, for the histogram in the "rich get richer" chapter
function effectSizes(pop) { return pop.clones.map(c => c.xe); }
