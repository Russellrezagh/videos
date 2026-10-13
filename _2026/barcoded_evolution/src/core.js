// ───────────────────────────── core: math, easing, randomness ─────────────────────────────
const W = 1920, H = 1080;

const PAL = {
  bg: '#08101f', bg2: '#0e1930', panel: 'rgba(18,30,56,0.72)', line: '#26365a',
  ink: '#eaf0fb', dim: '#93a2c3', faint: '#4a5a80',
  // nucleotides double as the categorical palette of the whole film
  A: '#3fd49b', C: '#58a6ff', G: '#ffbf47', T: '#ff5f72',
  violet: '#a98bff', ref: '#7d8aa6',
};
const BASE_COL = { A: PAL.A, C: PAL.C, G: PAL.G, T: PAL.T };
const FONT = {
  disp: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  body: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
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
/** stable pseudo-random number in [0,1) from integers — used where a pure function of (i, j) is needed */
function hash01(a, b = 0, c = 0) {
  let h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0x632BE5AB, 0xC2B2AE35) ^ Math.imul(c + 0x27D4EB2F, 0x165667B1);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const m = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}
const fmtInt = n => Math.round(n).toLocaleString('en-US');
