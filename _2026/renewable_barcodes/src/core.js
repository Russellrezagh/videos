// ───────────────────────────── core: palette, math, easing, randomness ─────────────────────────────
// This film is styled after the paper's own figures (Nguyen Ba et al. 2019): a light page, dark ink,
// thin rules, saturated lineage colours. No glows, gradients or drop shadows.
const W = 1920, H = 1080;

const PAL = {
  bg: '#f6f5f1',      // warm paper
  panel: '#ffffff',   // plot areas, like a journal figure on the page
  ink: '#1b1b1b',
  dim: '#6d6a63',
  faint: '#b7b3a8',
  line: '#cfccc2',    // axes and light rules
  grid: '#e8e6df',
  // the two populations, after the paper (C1 navy, D1 orange)
  ypd: '#2c3c66', ypa: '#e07d12',
  // a Set1-like categorical set, darkened where needed to read on white
  red: '#d83a32', blue: '#2f7dc0', green: '#43a047', purple: '#8e44ad',
  orange: '#ef7d10', yellow: '#c99700', brown: '#9c5a2c', pink: '#d96bb0', teal: '#1796a0',
};
// DNA bases as categorical colours, legible on white
const BASE_COL = { A: '#43a047', C: '#2f7dc0', G: '#c99700', T: '#d83a32' };
// the Set1 wheel the paper draws clone colours from
const SET1 = ['#e4322c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#d4b400', '#a6562a', '#e87dbf', '#9a9a9a'];
const FONT = {
  sans: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
  math: '"STIX Two Text", "Times New Roman", Times, serif',
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const TAU = Math.PI * 2;

const ease = {
  lin: t => t,
  io: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
/** eased progress of an animation that starts at `a` and lasts `d` seconds */
const prog = (t, a, d = 1, e = ease.io) => e(clamp((t - a) / d));
/** visibility envelope: fades in at a, fades out at b */
const env = (t, a, b = 1e9, fi = 0.6, fo = 0.6) => Math.min(clamp((t - a) / fi), clamp((b - t) / fo));
const vis = env;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
/** stable pseudo-random number in [0,1) from integers — a pure function of (a,b,c) */
function hash01(a, b = 0, c = 0) {
  let h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0x632BE5AB, 0xC2B2AE35) ^ Math.imul(c + 0x27D4EB2F, 0x165667B1);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const m = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const SUP = { '-1': '⁻¹', '-2': '⁻²', '-3': '⁻³', '-4': '⁻⁴', '-5': '⁻⁵', '-6': '⁻⁶', '0': '⁰', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '10': '¹⁰' };
const pow10 = e => e === 0 ? '1' : '10' + (SUP[String(e)] || '^' + e);
