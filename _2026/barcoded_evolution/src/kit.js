// ───────────────────────────── shared data and plot helpers for the chapters ─────────────────────────────
// Each chapter is { build(group), three(t, c, D, O), flat(t, c, D, O) }: t = seconds into the chapter,
// c(i) = when text beat i starts, D = chapter length, O = objects returned by build.
const SCENES = {};

const LT = LineageTracking.run();
const SUP = { '-1': '⁻¹', '-2': '⁻²', '-3': '⁻³', '-4': '⁻⁴', '-5': '⁻⁵', '-6': '⁻⁶', '-7': '⁻⁷', '-8': '⁻⁸', '0': '⁰', '7': '⁷', '8': '⁸', '9': '⁹', '10': '¹⁰' };
const pow10 = e => e === 0 ? '1' : '10' + (SUP[String(e)] || '^' + e);
const sHue = s => lerp(178, 335, inv(0.02, 0.11, s));

function drawLineages(P, upto, o = {}) {
  const { neutralA = 0.07, adaptA = 0.8, colorMix = 1, highlightAbove = null, onlyAbove = false, width = 1.6 } = o;
  const kMax = upto / LT.STEP;
  g.save(); g.lineJoin = 'round';
  for (const pass of ['neutral', 'adaptive']) {
    for (const l of LT.lines) {
      if (l.kind !== pass) continue;
      const col = pass === 'neutral' ? 'rgba(125,143,184,1)' : mixHex('#7d8fb8', '#' + hslToHex(sHue(l.s), 85, 62), colorMix);
      g.strokeStyle = col; g.globalAlpha = pass === 'neutral' ? neutralA : adaptA * (0.12 + 0.88 * inv(-5.6, -2, l.y[l.y.length - 1]));
      g.lineWidth = pass === 'neutral' ? 1.2 : width;
      g.beginPath();
      let started = false;
      for (let k = 0; k <= Math.ceil(kMax) && k < l.y.length; k++) {
        let yv = l.y[k], xv = k * LT.STEP;
        if (k > kMax) { const f = kMax - (k - 1); yv = lerp(l.y[k - 1], l.y[k], f); xv = upto; }
        if (yv < -8.5) { if (started) { g.lineTo(P.X(xv), P.Y(-7.5)); } break; }
        const px = P.X(xv), py = P.Y(Math.max(-7.5, yv));
        started ? g.lineTo(px, py) : g.moveTo(px, py); started = true;
      }
      g.stroke();
    }
  }
  g.restore();
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}

const BC_SEQ = 'TCGAATGCACTAGTTGCAAC';
const LOTTERY = establishmentLottery(40, 0.05, 160, 3);
/** fade-in/fade-out envelope keyed to two times */
const vis = (t, a, b = 1e9, fi = 0.6, fo = 0.5) => Math.min(clamp((t - a) / fi), clamp((b - t) / fo));
