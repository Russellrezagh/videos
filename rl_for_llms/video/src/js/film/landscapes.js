/*
 * The three 3D landscapes, as scene builders called from chapters 4, 6 and 8
 * (drawn with space3.js, numbers from src/js/rl.js).
 *
 *   FILM.landscapes.logits(ctx)  chapter 4, scenes land-logits and land-noise: the
 *                                reward landscape over two logits, the exact
 *                                gradient, the one-sample arrows, the +10 offset,
 *                                the baseline, training runs with and without
 *   FILM.landscapes.clip(ctx)    chapter 6, scene land-clip: PPO's clipped
 *                                objective over (ratio, advantage)
 *   FILM.landscapes.dome(ctx)    chapter 8, scene land-dome: reward minus beta KL
 *                                over the triangle of policies, and the beta sweep
 *
 * Each adds its scenes (ids 'land-...') to the chapter it is called from.
 * The pictures sit on the left; formulas, readings and reasons in a column
 * on the right (x = RX). Every number on screen or spoken is computed here
 * from the kernel, and checked against the words that say it (see `must`).
 */
window.FILM = window.FILM || { parts: [], papers: {} };
FILM.landscapes = FILM.landscapes || {};
(function () {
  'use strict';
  const { Space3, Surface3, Path3, Dot3, Arrow3, Label3, ramp, grid } = MV3;
  const C = MV.C;
  const RX = 480; // the column beside a picture
  const COLW = 800; // its width

  // A number the narration says must be the number the kernel computes; a
  // mismatch is reported like a chapter error (probe.mjs prints it).
  const must = (ok, what) => {
    if (!ok) (window.__partErrors = window.__partErrors || []).push(`landscapes: ${what}`);
  };
  const fx = (x, d = 2) => (x < 0 ? '-' : '') + Math.abs(x).toFixed(d);
  const pct = (x) => `${Math.round(x * 100)}%`;

  // a text whose words are recomputed every frame from the props of other mobs
  class Readout extends MV.Text {
    constructor(fn, opts) {
      super(' ', opts);
      this.fn = fn;
    }
    draw(p) {
      p.str = this.fn();
      super.draw(p);
    }
  }

  // the column's furniture
  const col = {
    tex: (S, t, y, size = 56) => S.add(S.tex(t, { size })).at(RX, y),
    say: (S, str, y, size = 38) => S.add(S.english(str, { size, width: COLW })).at(RX, y),
    why: (S, str, y) => S.add(S.english(str, { size: 32, color: C.GREY_B, italic: true, width: COLW })).at(RX, y),
  };
  // fade a list of mobs
  const fade = (A, ms, dur = 0.5) => ms.filter(Boolean).map((m) => A.FadeOut(m, { dur }));
  const hide = (...ms) => ms.flat().forEach((m) => (m.init.o = 0));
  // animations cued to words of the narration: steps [word or null, anim];
  // each anim waits until its word is spoken (call before S.beat)
  const cued = (S, say, steps) => {
    const out = [];
    let t = 0;
    for (const [word, an] of steps) {
      if (word) {
        const w = Math.max(0, S.atWord(say, word) - t);
        out.push(MV.wait(w));
        t += w;
      }
      out.push(an);
      t += MV.durOf(an);
    }
    return MV.seq(...out);
  };
  const undrawn = (...ms) => ms.flat().forEach((m) => {
    m.init.o = 0;
    m.init.draw = 0;
  });

  // the heights of a reward landscape: dark low ground to gold high ground
  const GOLDEN = ['#232B3D', '#3B3550', '#664B39', '#B07A3E', '#F0AC5F', '#FFDFAE'];

  /* ================================================================= 1. LOGITS */
  FILM.landscapes.logits = function (ctx) {
    const { A, BAND, video, par, lag, wait, mix } = ctx;
    const r = BAND.r;
    const pi = BAND.pi;
    const names = BAND.labels; // '51', 'about 50', '41'
    const AC = [C.GREEN, C.YELLOW, C.RED];
    const u0 = BAND.z[0] - BAND.z[2];
    const v0 = BAND.z[1] - BAND.z[2];
    const Jf = (u, v, off = 0) => RL.expectedReward(RL.softmax([u, v, 0]), r.map((x) => x + off));
    const J0 = Jf(u0, v0);
    const g = RL.exactGradient(BAND.z, r);
    const score = [0, 1, 2].map((a) => RL.score(pi, a));
    const J10 = J0 + 10;
    // one sample of answer a, on the floor: (r_a + off - b) times the push for a (its u and v parts)
    const arrowOf = (a, off, base) => [(r[a] + off - base) * score[a][0], (r[a] + off - base) * score[a][1]];
    // the spread of one sample: E |g_hat - grad J|^2, on the floor (u, v)
    const spread = (off, base) => [0, 1, 2].reduce((s, a) => {
      const d = arrowOf(a, off, base);
      return s + pi[a] * ((d[0] - g[0]) ** 2 + (d[1] - g[1]) ** 2);
    }, 0);
    const SP = { plain: spread(0, 0), off: spread(10, 0), base: spread(10, J10) };
    for (const [o, b] of [[0, 0], [10, 0], [10, J10]]) {
      const m = [0, 1, 2].reduce((s, a) => [s[0] + pi[a] * arrowOf(a, o, b)[0], s[1] + pi[a] * arrowOf(a, o, b)[1]], [0, 0]);
      must(Math.abs(m[0] - g[0]) < 1e-12 && Math.abs(m[1] - g[1]) < 1e-12, 'the sample arrows must average to the gradient');
    }
    must(Math.abs(Jf(u0 + 0.3, v0 - 0.2, 10) - Jf(u0 + 0.3, v0 - 0.2) - 10) < 1e-12, 'J + 10');
    must(BAND.z.join() === '0.6,0.2,-0.3' && r.join() === '1,0.3,0', 'the bandit the narration describes');
    must(pct(pi[0]) === '48%' && pct(pi[1]) === '32%' && pct(pi[2]) === '20%', 'the chances 48, 32, 20');
    must(fx(J0) === '0.58' && fx(g[0]) === '0.20' && fx(g[1]) === '-0.09', 'J = 0.58, slopes 0.20 and -0.09');
    must(SP.plain.toFixed(2) === '0.15' && Math.round(SP.off) === 52 && SP.base.toFixed(3) === '0.022' && SP.off / SP.plain > 300, 'spreads 0.15, 52, 0.022');
    must(fx(J10) === '10.58', 'b = 10.58');
    const V3 = { plain: RL.estimatorStats(BAND.z, r, 0).variance, off: RL.estimatorStats(BAND.z, r.map((x) => x + 10), 0).variance };

    /* training on the floor: u and v are the weights; 41's logit stays 0 */
    const RUN = { start: [-2, -1], steps: 60, lr: 1, batch: 4, off: 10 };
    const climb = (kind, seed) => {
      const rand = RL.rng(seed);
      let [u, v] = RUN.start;
      const path = [[u, v]];
      const R = r.map((x) => x + RUN.off);
      for (let t = 0; t < RUN.steps; t++) {
        const p = RL.softmax([u, v, 0]);
        const d = [0, 0];
        if (kind === 'exact') {
          const e = RL.exactGradient([u, v, 0], r);
          d[0] = e[0];
          d[1] = e[1];
        } else {
          const acts = [];
          const rew = [];
          for (let i = 0; i < RUN.batch; i++) {
            const a = RL.sampleIndex(p, rand());
            acts.push(a);
            rew.push(R[a]);
          }
          const tot = RL.sum(rew);
          acts.forEach((a, i) => {
            const b = kind === 'loo' ? (tot - rew[i]) / (RUN.batch - 1) : 0;
            const s = RL.score(p, a);
            d[0] += ((rew[i] - b) * s[0]) / RUN.batch;
            d[1] += ((rew[i] - b) * s[1]) / RUN.batch;
          });
        }
        u += RUN.lr * d[0];
        v += RUN.lr * d[1];
        path.push([u, v]);
      }
      return path;
    };
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const RUNS = { exact: climb('exact', 0), none: seeds.map((s) => climb('none', s)), loo: seeds.map((s) => climb('loo', s)) };
    const sureOf = (path) => {
      const [u, v] = path[path.length - 1];
      const p = RL.softmax([u, v, 0]);
      return p.indexOf(Math.max(...p));
    };
    const ends = (runs) => [0, 1, 2].map((a) => runs.filter((pth) => sureOf(pth) === a).length);
    const END = { none: ends(RUNS.none), loo: ends(RUNS.loo) };
    must(END.none.join() === '3,4,1', `no-baseline runs end sure of 51, about 50, 41: ${END.none}`);
    must(END.loo.join() === '8,0,0', `leave-one-out runs: ${END.loo}`);
    must(sureOf(RUNS.exact) === 0, 'the exact path reaches 51');
    must([...RUNS.none, ...RUNS.loo].every((pth) => pth.every(([u, v]) => Math.abs(u) < 7 && Math.abs(v) < 7)), 'the runs stay on the floor');
    const p0 = RL.softmax([...RUN.start, 0]);
    must(pct(p0[2]) === '67%', 'the start says 41 two times in three');

    FILM.addSymbol('lu', 'params', 'u', 'how far 51 leads 41', 'the logit of 51, minus the logit of 41', 'u large: the model is sure of 51');
    FILM.addSymbol('lv', 'params', 'v', 'how far “about 50” leads 41', 'the logit of about 50, minus the logit of 41', 'v large: the model is sure of about 50');
    const U = '\\cParams{lu}{u}';
    const V = '\\cParams{lv}{v}';

    /* ---------- the landscape, shared by both scenes ---------- */
    const HZ = 5; // world height of J = 1
    const K = 8; // floor units per unit of gradient, for every arrow
    const HEIGHT = ramp(GOLDEN, 0, 1);
    const ZA = 0.06; // arrows float just above the map
    const TOP = { phi: 0, theta: -90, zoom: 1, cx: 0, cy: 0, cz: 0 };
    // (cameras chosen so the picture stays inside x -900..60, y -280..380)
    const VIEW = { phi: 50, theta: -64, zoom: 1.06, cx: -0.6, cy: 0.8, cz: 1.25 };
    const MAP = { phi: 0, theta: -90, zoom: 2.3, cx: u0 + 1.3, cy: v0 + 0.15, cz: 0 };
    const FAR = { phi: 0, theta: -90, zoom: 0.165, cx: u0 + 0.5, cy: v0 + 6, cz: 0 };
    const MAPFO = 0.55; // the map is darker than the landscape, so the arrows read on it
    const bright = pi.map((p) => 0.35 + (0.65 * p) / Math.max(...pi));
    const sampleColor = (a) => mix(C.BG, C.WHITE, bright[a]);

    function landscape(S) {
      const sp = S.add(new Space3({ unit: 44, ...TOP, window: [900, 650] }).at(-440, 2).hidden());
      const surf = new Surface3((u, v, p) => [u, v, HZ * p.h * Jf(u, v)], {
        u: [-7, 7], v: [-7, 7], res: [36, 36], color: (u, v) => HEIGHT(Jf(u, v)), props: { h: 0 },
      });
      const floor = grid({ x: [-7, 7], y: [-7, 7], step: 1, color: C.GREY, width: 2, opacity: 0.32 });
      const axU = new Path3([[-7, 0, 0], [7.6, 0, 0]], { color: C.TEAL, width: 3, under: true, opacity: 0.8 });
      const axV = new Path3([[0, -7, 0], [0, 7.6, 0]], { color: C.TEAL, width: 3, under: true, opacity: 0.8 });
      const labU = new Label3(new MV.Tex(U, { size: 50 }), [8.4, 0, 0]);
      const labV = new Label3(new MV.Tex(V, { size: 50 }), [0, 8.4, 0]);
      const onSurf = (u, v, lift = 0) => () => [u, v, HZ * surf.p.h * Jf(u, v) + lift];
      const corner = [
        new Label3('sure of 51', onSurf(4.6, -4.4, 0.5), { size: 34, color: AC[0] }),
        new Label3('sure of about 50', onSurf(-3.4, 4.9, 0.5), { size: 34, color: AC[1] }),
        new Label3('sure of 41', onSurf(-4.4, -4.6, 0.5), { size: 34, color: AC[2] }),
      ];
      const dot = new Dot3(onSurf(u0, v0, 0.08), { r: 12, color: C.WHITE });
      hide(surf, labU, labV, corner, dot);
      sp.add(...floor, axU, axV, surf, labU, labV, ...corner, dot);
      return { sp, surf, floor, axU, axV, labU, labV, corner, dot };
    }
    // the exact gradient on the map, and the one-sample arrows (props off, base)
    function arrows(sp) {
      const P0 = [u0, v0, ZA];
      const grad = new Arrow3(P0, [u0 + K * g[0], v0 + K * g[1], ZA], { color: C.YELLOW, width: 7 });
      const samples = [0, 1, 2].map((a) => new Arrow3((p) => {
        const d = arrowOf(a, p.off, p.base);
        return [P0, [u0 + K * d[0], v0 + K * d[1], ZA]];
      }, null, { color: sampleColor(a), width: 6, props: { off: 0, base: 0 } }));
      // labels just past each tip (a fixed number of pixels, whatever the zoom)
      const labels = [0, 1, 2].map((a) => new Label3(`${names[a]} · ${pct(pi[a])}`, () => {
        const s = samples[a].p;
        const d = arrowOf(a, s.off, s.base);
        const n = Math.hypot(d[0], d[1]);
        const dir = n > 1e-9 ? [d[0] / n, d[1] / n] : [-0.6, -0.8];
        const px = 1 / (44 * sp.p.zoom);
        return [u0 + K * d[0] * s.draw + dir[0] * 95 * px, v0 + K * d[1] * s.draw + dir[1] * 34 * px, ZA];
      }, { size: 32, color: AC[a] }));
      const gradLab = new Label3(new MV.Tex('\\grad\\JJ', { size: 46 }), () => {
        // below the tip on the close map; above it when the map is far away and
        // the long sample arrows take the other directions
        const px = 1 / (44 * sp.p.zoom);
        const t = MV.clamp01((sp.p.zoom - 0.3) / 1.2);
        return [u0 + K * g[0] - 72 * t * px, v0 + K * g[1] + (58 - 108 * t) * px, ZA];
      });
      // the chain: each arrow times its chance, tip to tail
      const pieces = [0, 1, 2].map((a) => new Arrow3((p) => {
        let x = u0;
        let y = v0;
        for (let b = 0; b < a; b++) {
          const d = arrowOf(b, p.off, p.base);
          x += K * pi[b] * d[0];
          y += K * pi[b] * d[1];
        }
        const d = arrowOf(a, p.off, p.base);
        return [[x, y, ZA + 0.01], [x + K * pi[a] * d[0], y + K * pi[a] * d[1], ZA + 0.01]];
      }, null, { color: [C.WHITE, '#B8B8B8', '#8A8A8A'][a], width: 8, props: { off: 0, base: 0 } }));
      undrawn(grad, samples, pieces);
      hide(labels, gradLab);
      sp.add(grad, ...samples, ...pieces, ...labels, gradLab);
      return { grad, samples, labels, gradLab, pieces };
    }

    /* ---------------------------------------------------- scene 1 */
    video.scene('land-logits', 'The reward landscape', (S) => {
      const h = S.add(S.title('The reward landscape'));
      const chips = [0, 1, 2].map((a) => S.add(S.group(
        new MV.Text(names[a], { size: 56, color: AC[a] }),
        new MV.Text(`reward ${r[a]}`, { size: 34, color: C.GOLD }).at(0, 56)
      ).at(-420 + 420 * a, -260)));
      const head = S.add(S.english('every {policy|pt} becomes a point on a floor, and its {average reward|JJ} a height above it', { size: 46, width: 1400 }).at(0, 30));
      S.beat('Everything so far can be drawn as one landscape. Every possible policy becomes a point on a floor, its average reward a height above that point, and training a climb.',
        A.FadeIn(h), lag(0.3, chips.map((c) => A.FadeIn(c, { dy: 16 }))), S.writeIn(head, 2.4));

      // why two numbers are enough
      const F1 = S.add(S.tex('\\pt(\\aa) \\;=\\; \\frac{e^{\\zz_{\\aa}}}{\\sum_{\\aa\'} e^{\\zz_{\\aa\'}}}', { size: 76 }).at(0, -250));
      const F2 = S.add(S.tex('\\frac{e^{\\zz_{\\aa} + c}}{\\sum_{\\aa\'} e^{\\zz_{\\aa\'} + c}} \\;=\\; \\frac{e^{c}\\; e^{\\zz_{\\aa}}}{e^{c} \\sum_{\\aa\'} e^{\\zz_{\\aa\'}}} \\;=\\; \\pt(\\aa)', { size: 72 }).at(0, -20));
      const R2 = S.add(S.reason('because: adding c to every logit multiplies every exponential by the same factor, on top and on bottom'));
      S.beat('First, the floor. The policy is a softmax of three logits. Add the same number, c, to all three: every term gains the same factor, e to the c, on top and on bottom, so it cancels.',
        fade(A, [...chips, head]), A.Write(F1, 1.6), A.Write(F2, 2.4), S.writeIn(R2, 1.4),
        { cap: 'First, the floor. The policy is a softmax of three logits. Add the same number c to all three: every term gains the same factor, e^c, on top and on bottom, so it cancels.' });

      const F3 = S.add(S.tex(`${U} \\;=\\; \\zz_{51} - \\zz_{41}, \\qquad ${V} \\;=\\; \\zz_{\\approx 50} - \\zz_{41}`, { size: 76 }).at(0, -40));
      const E3 = S.add(S.english('only {differences between logits|zz} matter, so two numbers fix the whole {policy|pt}', { size: 40 }).at(0, 150));
      const R3 = S.add(S.reason('because: subtracting the logit of 41 from all three changes nothing'));
      S.beat('So only differences matter. Subtract forty-one’s logit from all three, making it zero. Two numbers are left, and they fix the whole policy: u and v.',
        A.FadeOut(F1), A.FadeOut(R2), par(A.MoveTo(F2, 0, -275), A.ScaleTo(F2, 0.72), A.Set(F2, { o: 0.5 })), A.Write(F3, 1.8), S.writeIn(E3, 1.6), S.writeIn(R3, 1.2));
      S.tour(F3, [
        { sym: 'lu', at: [0, 175], anims: fade(A, [E3, R3]),
          say: 'u is how far fifty-one is ahead of forty-one. When u is large, fifty-one dominates, and the model is sure of it.' },
        { sym: 'lv', at: [0, 175],
          say: 'v is how far about fifty is ahead of forty-one. When v is large, the model is sure of about fifty. When both are very negative, forty-one wins.' },
      ]);

      // the floor, seen from above, and our model on it
      const L = landscape(S);
      const M1 = S.add(S.tex('\\zz \\;=\\; (0.6,\\; 0.2,\\; -0.3)', { size: 54 })).at(RX, -170);
      const M2 = S.add(S.tex(`(${U},\\, ${V}) \\;=\\; (${fx(u0, 1)},\\; ${fx(v0, 1)})`, { size: 54 })).at(RX, -80);
      const R6 = col.why(S, 'because: 0.6 − (−0.3) = 0.9 and 0.2 − (−0.3) = 0.5', 20);
      const E6 = col.say(S, 'every point of the floor is a policy: a mixture of the three answers', 150, 36);
      S.beat('Here is that floor, seen from above. Our model sits at u equals zero point nine, v equals zero point five: its logits, minus forty-one’s. Far right, the model would be sure of fifty-one; far up, of about fifty; down and left, of forty-one.',
        S.endTour(F3), A.FadeOut(F2), par(A.MoveTo(F3, RX, -300), A.ScaleTo(F3, 0.68)),
        A.FadeIn(L.sp), A.FadeIn(L.labU), A.FadeIn(L.labV), A.Write(M1, 1.2), A.Write(M2, 1.2), A.FadeIn(L.dot, { from: 2 }), S.writeIn(R6, 1),
        lag(0.8, L.corner.map((c) => A.FadeIn(c))), S.writeIn(E6, 1.4),
        { cap: 'Here is that floor, seen from above. Our model sits at u = 0.9, v = 0.5: its logits, minus 41’s. Far right, the model would be sure of 51; far up, of about 50; down and left, of 41.' });

      // lift the floor to J
      const F8 = col.tex(S, `\\JJ(${U}, ${V}) \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\; \\rr(\\aa)`, -140, 62);
      const R8 = col.why(S, 'because: the {average reward|JJ} is each answer’s {chance|pt} times its {reward,|rr} added up', -20);
      S.beat('Now lift every point of the floor to the average reward of its policy: each answer’s chance, times its reward, added up. The flat floor becomes a landscape.',
        fade(A, [M1, M2, R6, E6]), A.Write(F8, 1.6), S.writeIn(R8, 1.4), A.FadeIn(L.surf, { dur: 0.6 }), par(A.Set(L.surf, { h: 1 }, 3.2), A.Set(L.sp, VIEW, 3.2)));
      const E9 = col.say(S, 'three plateaus: height {1 for 51,|JJ} {0.3 for about 50,|JJ} {0 for 41;|JJ} ramps between them', 140, 36);
      S.beat('It has three flat plateaus, one for each answer the model can become sure of: height one for fifty-one, zero point three for about fifty, zero for forty-one. Ramps join them, and training climbs.',
        S.writeIn(E9, 2.4), A.Set(L.sp, { theta: -55 }, 6, 'linear'),
        { cap: 'It has three flat plateaus, one for each answer the model can become sure of: height 1 for 51, 0.3 for about 50, 0 for 41. Ramps join them, and training climbs.' });

      // which way is uphill?
      const hLab = new Label3(new MV.Tex(`\\JJ = ${fx(J0)}`, { size: 44 }), () => [u0, v0, HZ * L.surf.p.h * J0 + 1.1]);
      hide(hLab);
      L.sp.add(hLab);
      const G1 = col.tex(S, `\\frac{\\partial \\JJ}{\\partial ${U}} \\;=\\; \\pt(51)\\,\\big(\\rr(51) - \\JJ\\big)`, -300, 46);
      const N1 = col.tex(S, `=\\; \\cPolicy{n1}{${fx(pi[0])}} \\times (\\cReward{n2}{1} - \\cReward{n3}{${fx(J0)}}) \\;=\\; \\cGrad{n4}{${fx(g[0])}}`, -210, 44);
      const G2 = col.tex(S, `\\frac{\\partial \\JJ}{\\partial ${V}} \\;=\\; \\pt(\\text{about 50})\\,\\big(\\rr(\\text{about 50}) - \\JJ\\big)`, -100, 46);
      const N2 = col.tex(S, `=\\; \\cPolicy{n1}{${fx(pi[1])}} \\times (\\cReward{n2}{0.3} - \\cReward{n3}{${fx(J0)}}) \\;=\\; \\cGrad{n4}{${fx(g[1])}}`, -10, 44);
      const R10 = col.why(S, 'because: with 41’s logit pinned at 0, u is the logit of 51 and v the logit of about 50; each slope is π × (r − J), as in chapter 3', 110);
      S.beat('Our model stands on a ramp, at height zero point five eight. Which way is uphill? As in chapter three, each slope is a chance, times reward minus the average: zero point two along u, minus zero point zero nine along v.',
        fade(A, [F8, R8, E9, F3]), A.FadeIn(hLab), A.Indicate(L.dot, { scale: 1.6 }), A.Write(G1, 1.4), A.Write(N1, 1.2), A.Write(G2, 1.4), A.Write(N2, 1.2), S.writeIn(R10, 1.6),
        { cap: 'Our model stands on a ramp, at height 0.58. Which way is uphill? As in chapter 3, each slope is a chance, times reward minus the average: 0.2 along u, −0.09 along v.' });
      const AR = arrows(L.sp);
      const tag = S.add(S.txt('arrows drawn 8 × longer', { size: 30, color: C.GREY, italic: true })).at(-440, 360);
      S.beat('Flatten the landscape into a map, seen from above, and the two slopes make one arrow: the gradient. It points mostly toward fifty-one, and a little away from about fifty.',
        fade(A, [hLab, ...L.corner, L.labU, L.labV]),
        par(A.Set(L.surf, { h: 0, fo: MAPFO }, 2.6), A.Set(L.sp, MAP, 2.6), A.Set(L.sp, { win: 1 }, 2.6)),
        A.Arrow(AR.grad, 1), A.FadeIn(AR.gradLab), A.FadeIn(tag));

      // one sample, one of three arrows
      const E12 = col.tex(S, '\\ghat \\;=\\; \\rr(\\aa)\\; \\grad\\lp(\\aa), \\quad \\aa \\sim \\pt', -300, 52);
      const E12b = col.say(S, 'a real model never sees the {yellow arrow;|grad} it gets {one sampled answer|aa} and its {reward|rr}', -190, 36);
      S.beat('But a real model can never compute that arrow: it needs every possible answer. It gets one sampled answer and its reward, and forms g-hat: the reward, times the push that makes that answer more likely.',
        fade(A, [G1, N1, G2, N2, R10]), A.Write(E12, 1.6), S.writeIn(E12b, 2),
        { cap: 'But a real model can never compute that arrow: it needs every possible answer. It gets one sampled answer and its reward, and forms ĝ: the reward, times the push that makes that answer more likely.' });
      const rowTex = [
        `\\aa = 51: \\quad \\cReward{q1}{1} \\times \\cGrad{q2}{(${fx(score[0][0])},\\, ${fx(score[0][1])})}`,
        `\\aa = \\text{about 50}: \\quad \\cReward{q1}{0.3} \\times \\cGrad{q2}{(${fx(score[1][0])},\\, ${fx(score[1][1])})}`,
        `\\aa = 41: \\quad \\cReward{q1}{0} \\times \\cGrad{q2}{(${fx(score[2][0])},\\, ${fx(score[2][1])})}`,
      ];
      const rows = rowTex.map((t, i) => col.tex(S, t, -80 + 76 * i, 44));
      const R13 = col.why(S, 'because: the push for answer a raises a’s own logit by one, minus the {chances|pt} (chapter 3)', 190);
      S.beat('On this floor, each answer has its own arrow. Fifty-one pushes toward itself, with reward one. About fifty pushes toward itself too, but earns only zero point three. Forty-one earns nothing, so its arrow has no length at all.',
        fade(A, [E12b]), lag(1.2, rows.map((rw, a) => par(A.Write(rw, 1), a < 2 ? A.Arrow(AR.samples[a], 0.9) : wait(0), A.FadeIn(AR.labels[a])))), S.writeIn(R13, 1.4),
        { cap: 'On this floor, each answer has its own arrow. 51 pushes toward itself, with reward 1. About 50 pushes toward itself too, but earns only 0.3. 41 earns nothing, so its arrow has no length at all.' });
      S.beat('Which arrow we get is up to chance: fifty-one forty-eight percent of the time, about fifty thirty-two, forty-one twenty. Each arrow is drawn as bright as it is likely. None of them is the gradient.',
        lag(0.5, AR.labels.map((l) => A.Indicate(l, { scale: 1.25, color: C.WHITE }))),
        { cap: 'Which arrow we get is up to chance: 51 48% of the time, about 50 32%, 41 20%. Each arrow is drawn as bright as it is likely. None of them is the gradient.' });

      // tip to tail
      const T15 = col.tex(S, '\\sum_{\\aa} \\pt(\\aa)\\; \\ghat(\\aa) \\;=\\; \\grad\\JJ', -180, 58);
      const T15b = col.tex(S, `\\cPolicy{w1}{${fx(pi[0])}}\\,(${fx(arrowOf(0, 0, 0)[0])}, ${fx(arrowOf(0, 0, 0)[1])}) + \\cPolicy{w2}{${fx(pi[1])}}\\,(${fx(arrowOf(1, 0, 0)[0])}, ${fx(arrowOf(1, 0, 0)[1])}) + \\cPolicy{w3}{${fx(pi[2])}}\\,(0, 0)`, -85, 38);
      const T15c = col.tex(S, `=\\; \\cGrad{w4}{(${fx(g[0])},\\, ${fx(g[1])})}`, -15, 44);
      const R15 = col.why(S, 'because: an average over samples is each value times its {chance,|pt} added up', 80);
      const E16 = col.say(S, 'one {sample|aa} gives one of three arrows; weighted by their {chances,|pt} they add up to the {gradient|grad}', 200, 36);
      S.beat('Shrink each arrow by its chance, and lay them tip to tail. They land exactly on the tip of the gradient. That is the log-derivative trick, seen from above: noisy pieces, the right average.',
        fade(A, [...rows, R13]), A.Write(T15, 1.4), par(AR.samples.map((m) => A.Set(m, { o: 0.35 }, 0.6)), fade(A, AR.labels), A.Set(L.sp, { zoom: 3.4, cx: u0 + 0.85, cy: v0 - 0.35 }, 1.4)), lag(1.1, AR.pieces.slice(0, 2).map((m) => A.Arrow(m, 1))), A.Write(T15b, 1.6), A.Write(T15c, 1), S.writeIn(R15, 1.2), S.writeIn(E16, 1.8));
    });

    /* ---------------------------------------------------- scene 2 */
    video.scene('land-noise', 'Noise, seen from above', (S) => {
      const h = S.add(S.title('A generous judge, on the map'));
      const L = landscape(S);
      const AR = arrows(L.sp);
      // start where the last scene left off: the map, the gradient, the three samples
      Object.assign(L.sp.init, MAP, { win: 1 });
      L.surf.init.fo = MAPFO;
      [L.surf, L.dot, AR.grad, AR.gradLab, AR.samples[0], AR.samples[1], ...AR.labels].forEach((m) => (m.init.o = 1));
      AR.grad.init.draw = 1;
      AR.samples.forEach((m) => (m.init.draw = 1));
      const tag = S.add(S.txt('arrows drawn 8 × longer', { size: 30, color: C.GREY, italic: true })).at(-440, 360);

      const F1 = col.tex(S, '\\JJ_{+10} \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\,\\big(\\rr(\\aa) + 10\\big) \\;=\\; \\JJ + 10', -300, 46);
      const R1 = col.why(S, 'because: the {chances|pt} add up to one, so the extra 10 comes out as 10 × 1', -210);
      // a slice through our model along u, seen from the side
      const SL = { x0: -4, x1: 6, w: 600, hh: 210, cx: RX + 20, cy: 30 };
      const sx = (u) => SL.cx - SL.w / 2 + ((u - SL.x0) / (SL.x1 - SL.x0)) * SL.w;
      const sy = (j) => SL.cy + SL.hh / 2 - j * SL.hh;
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const u = SL.x0 + ((SL.x1 - SL.x0) * i) / 120;
        pts.push([sx(u), sy(Jf(u, v0))]);
      }
      const tl = 1.4;
      const slice = S.add(S.group(
        new ctx.Line(SL.cx - SL.w / 2, sy(0), SL.cx + SL.w / 2 + 16, sy(0), { stroke: C.GREY_B, width: 3 }),
        new ctx.Line(SL.cx - SL.w / 2, sy(0), SL.cx - SL.w / 2, sy(1) - 20, { stroke: C.GREY_B, width: 3 }),
        ctx.path(ctx.polyPath(pts), { stroke: C.GOLD, width: 6 }),
        new ctx.Line(sx(u0 - tl), sy(J0 - g[0] * tl), sx(u0 + tl), sy(J0 + g[0] * tl), { stroke: C.YELLOW, width: 5 }),
        ctx.dot(10, C.WHITE).at(sx(u0), sy(J0)),
        new MV.Text(`a slice at v = ${fx(v0, 1)}, seen from the side`, { size: 30, color: C.GREY_B, italic: true }).at(SL.cx + 40, sy(1) - 50)
      ));
      const ticks = [0, 1].map((j) => S.add(S.txt(String(j), { size: 32, color: C.GOLD, anchor: 'end' })).at(SL.cx - SL.w / 2 - 14, sy(j)));
      S.beat('Now chapter four’s generous judge: add ten to every reward. Every policy’s average reward rises by exactly ten, because the chances add up to one. The landscape lifts by ten, and keeps its shape.',
        A.FadeIn(h), A.FadeIn(L.sp), A.FadeIn(tag), A.Write(F1, 1.8), S.writeIn(R1, 1.4), A.FadeIn(slice), par(ticks.map((t) => A.FadeIn(t))));
      const F2 = col.tex(S, '\\grad\\big(\\JJ + 10\\big) \\;=\\; \\grad\\JJ', 230, 52);
      const F3 = col.tex(S, '\\ghat \\;=\\; \\big(\\rr(\\aa) + 10\\big)\\; \\grad\\lp(\\aa)', -300, 54);
      const R3 = col.why(S, 'every {reward|rr} is now about 10, so every arrow is about 10 times longer', -205);
      S.beat('Seen from the side, only the numbers on the axis change, so the yellow gradient stays exactly the same. The samples do not. Each is its reward times its push, and every reward is now about ten.',
        par(ticks.map((t, j) => A.Count(t, j, j + 10, (x) => String(Math.round(x)), 1.6))), A.Write(F2, 1.2), wait(1.2),
        fade(A, [F1, R1, slice, ...ticks, F2, tag]), A.Write(F3, 1.4), S.writeIn(R3, 1.2),
        par(A.Set(L.sp, FAR, 3), A.Set(L.sp, { win: 0 }, 1.2), AR.samples.map((m) => A.Set(m, { off: 10 }, 3)), A.Show(AR.samples[2]), A.Set(AR.samples[2], { draw: 1 }, 0.01)));
      const T4 = col.tex(S, '\\sum_{\\aa} \\pt(\\aa)\\; \\ghat(\\aa) \\;=\\; \\grad\\JJ', -80, 56);
      const E4 = col.say(S, 'right on average; wildly off one sample at a time', 30, 36);
      AR.pieces.forEach((m) => (m.init.off = 10));
      S.beat('Even forty-one now earns ten points, and gets a long arrow. Yet weighted by their chances and laid tip to tail, the huge arrows still land on the small yellow one. Right on average; wildly off one at a time.',
        A.Indicate(AR.labels[2], { scale: 1.3 }), A.Write(T4, 1.4), par(AR.samples.map((m) => A.Set(m, { o: 0.35 }, 0.6))), lag(1.1, AR.pieces.map((m) => A.Arrow(m, 1))), A.Indicate(AR.gradLab, { scale: 1.3 }), S.writeIn(E4, 1.4));

      // how far they swing
      const S5 = col.tex(S, '\\text{spread} \\;=\\; \\EE_{\\aa\\sim\\pt}\\Big[\\, \\big\\|\\, \\ghat - \\grad\\JJ \\,\\big\\|^{2} \\,\\Big]', -290, 52);
      const E5 = col.say(S, 'the average squared distance from a {sample’s arrow|ghat} to the {true gradient|grad}', -180, 34);
      const rowS = [
        S.add(S.txt(`rewards 1, 0.3, 0:   ${SP.plain.toFixed(3)}`, { size: 38, color: C.WHITE })).at(RX, -70),
        S.add(S.txt(`rewards + 10:   ${SP.off.toFixed(1)}`, { size: 38, color: C.RED })).at(RX, -10),
      ];
      const R5 = col.why(S, `measured on this floor (u and v); over all three logits it is ${V3.plain.toFixed(2)} and ${Math.round(V3.off)}`, 90);
      S.beat('Measure the swing as the average squared distance from a sample’s arrow to the true gradient: the spread. With the plain rewards it is zero point one five. With ten added, fifty-two: more than three hundred times larger.',
        fade(A, [F3, R3, T4, E4, ...AR.pieces]), par(AR.samples.map((m) => A.Set(m, { o: 1 }, 0.6))), A.Write(S5, 1.6), S.writeIn(E5, 1.4), A.FadeIn(rowS[0]), wait(0.6), A.FadeIn(rowS[1], { from: 1.3 }), S.writeIn(R5, 1.4),
        { cap: `Measure the swing as the average squared distance from a sample’s arrow to the true gradient: the spread. With the plain rewards it is ${SP.plain.toFixed(2)}. With 10 added, ${Math.round(SP.off)}: more than 300 times larger.` });

      // the baseline brings them back
      const B6 = col.tex(S, '\\ghat \\;=\\; \\big(\\rr(\\aa) + 10 - \\bb\\big)\\; \\grad\\lp(\\aa)', -300, 50);
      const B6b = col.tex(S, `\\bb \\;=\\; \\JJ + 10 \\;=\\; ${fx(J10)}`, -210, 50);
      const rowB = S.add(S.txt(`with the baseline:   ${SP.base.toFixed(3)}`, { size: 38, color: C.PURPLE })).at(RX, 50);
      const R6 = col.why(S, 'because: {b|bb} does not depend on which answer was drawn, so it changes no average (chapter 4)', 160);
      S.beat('Now subtract a baseline, b: the average reward, ten point five eight. The arrows shrink back, closer to the yellow one than ever. The spread falls to zero point zero two two, and the average has not moved.',
        fade(A, [S5, E5, R5, ...AR.labels]), par(A.MoveTo(rowS[0], RX, -110), A.MoveTo(rowS[1], RX, -40)), A.Write(B6, 1.6), A.Write(B6b, 1.2),
        par(AR.samples.map((m) => A.Set(m, { base: J10 }, 2))), par(A.Set(L.sp, MAP, 2.4), A.Set(L.sp, { win: 1 }, 2.4)), A.FadeIn(rowB, { from: 1.3 }), S.writeIn(R6, 1.4),
        { cap: `Now subtract a baseline, b: the average reward, ${fx(J10)}. The arrows shrink back, closer to the yellow one than ever. The spread falls to ${SP.base.toFixed(3)}, and the average has not moved.` });
      const adv = [0, 1, 2].map((a) => r[a] + 10 - J10);
      must(adv.map((x) => fx(x)).join() === '0.42,-0.28,-0.58', 'r - b = +0.42, -0.28, -0.58');
      // every arrow now points uphill: its dot product with the gradient is positive
      must([0, 1, 2].every((a) => arrowOf(a, 10, J10)[0] * g[0] + arrowOf(a, 10, J10)[1] * g[1] > 0), 'all three arrows point uphill');
      const rowsA = [0, 1, 2].map((a) => col.tex(S, `\\text{${names[a]}}: \\quad \\rr - \\bb \\;=\\; \\cAdv{d${a}}{${adv[a] > 0 ? '+' : ''}${fx(adv[a])}}`, -110 + 74 * a, 44));
      rowsA.forEach((m, a) => (m.init.color = AC[a]));
      const E7 = col.say(S, 'pushing a {worse-than-expected|advantage} answer down is also uphill', 200, 36);
      S.beat('Each reward is now better or worse than expected: plus zero point four two for fifty-one, minus zero point two eight and minus zero point five eight for the others. Pushing a worse answer down is also uphill, so every arrow points uphill.',
        fade(A, [...rowS, rowB, R6]), lag(0.5, rowsA.map((m) => A.Write(m, 1))), S.writeIn(E7, 1.4),
        { cap: 'Each reward is now better or worse than expected: +0.42 for 51, −0.28 and −0.58 for the others. Pushing a worse answer down is also uphill, so every arrow points uphill.' });

      // training runs
      const onTop = (u, v) => [u, v, HZ * Jf(u, v) + 0.1];
      // a run drawn on the ground: each step is a straight move on the floor,
      // lifted point by point to the height of the landscape under it
      const hug = (pth) => {
        const out = [onTop(...pth[0])];
        for (let i = 1; i < pth.length; i++) {
          const [u0_, v0_] = pth[i - 1];
          const [u1, v1] = pth[i];
          const n = Math.max(1, Math.ceil(Math.hypot(u1 - u0_, v1 - v0_) / 0.25));
          for (let k = 1; k <= n; k++) out.push(onTop(u0_ + ((u1 - u0_) * k) / n, v0_ + ((v1 - v0_) * k) / n));
        }
        return out;
      };
      const exact = new Path3(hug(RUNS.exact), { color: C.YELLOW, width: 6 });
      const none = RUNS.none.map((pth) => new Path3(hug(pth), { color: C.RED, width: 4 }));
      const loo = RUNS.loo.map((pth) => new Path3(hug(pth), { color: C.PURPLE, width: 5 }));
      const endsN = RUNS.none.map((pth) => new Dot3(onTop(...pth[pth.length - 1]), { r: 9, color: C.RED }));
      const start = new Dot3(onTop(...RUN.start), { r: 12, color: C.WHITE });
      undrawn(exact, none, loo);
      hide(endsN, start);
      L.sp.add(exact, ...none, ...loo, ...endsN, start);
      L.corner.forEach((c) => L.sp.topG.appendChild(c.el)); // labels above the runs
      const U8 = col.tex(S, `(${U}, ${V}) \\;\\leftarrow\\; (${U}, ${V}) \\;+\\; \\lr \\cdot \\tfrac{1}{4} \\textstyle\\sum_{i=1}^{4} \\ghat_i`, -300, 48);
      const E8 = col.say(S, 'start: says {41|#FC6255} two times in three · 4 samples a step · {η = 1|lr} · every {reward|rr} + 10 · 60 steps', -200, 32);
      const VIEW2 = { phi: 48, theta: -70, zoom: 1.06, cx: -0.6, cy: 0.8, cz: 1.25 };
      S.beat('Does the swing matter? Start from a model that says forty-one two times in three, and train: four samples a step, every reward plus ten, sixty steps. The exact gradient would climb this smooth yellow path to fifty-one.',
        fade(A, [...rowsA, E7, B6, B6b, AR.grad, AR.gradLab, ...AR.samples, L.dot]),
        par(A.Set(L.sp, { win: 0 }, 1), A.Set(L.sp, VIEW2, 3.2), A.Set(L.surf, { h: 1, fo: 0.9 }, 3.2)), A.Write(U8, 1.6), S.writeIn(E8, 1.4),
        lag(0.4, L.corner.map((c) => A.FadeIn(c))), A.FadeIn(start), A.Create(exact, 2.4),
        { cap: 'Does the swing matter? Start from a model that says 41 two times in three, and train: 4 samples a step, every reward +10, 60 steps. The exact gradient would climb this smooth yellow path to 51.' });
      const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
      const C9 = [
        S.add(S.txt('no baseline, after 60 steps:', { size: 36, color: C.RED })).at(RX, -80),
        S.add(S.english(`sure of {51:|#83C167} ${END.none[0]}   ·   {about 50:|#F7D96F} ${END.none[1]}   ·   {41:|#FC6255} ${END.none[2]}`, { size: 36, width: COLW })).at(RX, -20),
      ];
      S.beat(`Here are eight runs with no baseline. They lurch across the landscape. After sixty steps only ${words[END.none[0]]} are sure of fifty-one; ${words[END.none[1]]} are sure of about fifty, and ${words[END.none[2]]} of forty-one.`,
        lag(0.5, none.map((m) => A.Create(m, 2.6))), par(endsN.map((m) => A.FadeIn(m))), lag(0.3, C9.map((m) => A.FadeIn(m))),
        { cap: `Here are eight runs with no baseline. They lurch across the landscape. After 60 steps only ${END.none[0]} are sure of 51; ${END.none[1]} are sure of about 50, and ${END.none[2]} of 41.` });
      const E10 = col.say(S, 'with no {baseline,|bb} every {reward|rr} is about 10, so every sample says “more of this”', 90, 36);
      const R10 = col.why(S, 'once it is sure of a wrong answer, it almost never samples 51 again', 200);
      S.beat('With every reward about ten, every sample says: more of this. Whatever the model says often gets pushed further, until it is sure. Then it almost never samples fifty-one again, so it almost never learns.',
        S.writeIn(E10, 1.8), S.writeIn(R10, 1.4), A.Set(L.sp, { theta: -61 }, 5, 'linear'));
      const L11 = col.tex(S, '\\bb_i \\;=\\; \\tfrac{1}{3} \\textstyle\\sum_{j \\ne i} \\big(\\rr_j + 10\\big)', -80, 52);
      const C11 = S.add(S.english(`with it, sure of {51:|#83C167} ${END.loo[0]} of 8`, { size: 36, width: COLW })).at(RX, 20);
      const E11 = col.say(S, 'a {baseline|bb} leaves the average alone; it tames the swing, and that decides whether training finds the top', 150, 34);
      S.beat(`With a leave-one-out baseline, each sample is compared with the average reward of the other three in its batch. All ${words[END.loo[0]]} runs climb to fifty-one. A baseline leaves the average alone; it tames the swing, and that decides whether training finds the top.`,
        fade(A, [...C9, E10, R10]), par(none.map((m) => A.Set(m, { o: 0.25 }, 0.6)), endsN.map((m) => A.Set(m, { o: 0.25 }, 0.6))), A.Write(L11, 1.4),
        lag(0.25, loo.map((m) => A.Create(m, 2.2))), A.FadeIn(C11), S.writeIn(E11, 2));
    });
  };

  /* ================================================================= 2. CLIP */
  FILM.landscapes.clip = function (ctx) {
    const { A, video, par, lag, wait, mix } = ctx;
    const EPS = 0.2;
    // world coordinates: ratio along x, advantage along y, objective up
    const KX = 3.6;
    const KY = 2.2;
    const KZ = 1.35;
    const X = (rho) => (rho - 1) * KX;
    const Y = (a) => a * KY;
    const Z = (l) => l * KZ;
    const ZF = Z(-1.9); // the floor
    const FLAT = '#5A5E66';
    const slopeColor = (rho, a, eps) => {
      const s = RL.ppoClipSlope(rho, a, eps);
      return s === 0 ? FLAT : a > 0 ? C.GREEN : C.RED;
    };
    must(RL.ppoClip(1.6, 0.8) === 0.96 && RL.ppoClipSlope(1.6, 0.8) === 0 && RL.ppoClipSlope(1.1, 0.8) === 0.8, 'a good token past 1.2: flat at 0.96');
    must(Math.abs(RL.ppoClip(0.5, -0.8) + 0.64) < 1e-12 && Math.abs(RL.ppoClip(1.6, -0.8) + 1.28) < 1e-12, 'the A = -0.8 slice');
    must(RL.ppoClipSlope(0.5, 0.8) === 0.8 && RL.ppoClipSlope(1.55, -0.8) === -0.8, 'the one-sided correction');
    must(RL.ppoClip(1.6, 0.8) < 1.6 * 0.8, 'the clipped value is below the sheet at 1.6');

    video.scene('land-clip', 'The clipped landscape', (S) => {
      const h = S.add(S.title('PPO’s objective, as a landscape'));
      // seen from the front: ratio left to right, advantage running away from us
      const CAM = { phi: 66, theta: -104, zoom: 1.1, cx: 0, cy: 0, cz: -0.4 };
      const sp = S.add(new Space3({ unit: 88, ...CAM }).at(-370, -10).hidden());
      // the floor: ratio across, advantage front to back
      const fl = new Path3([[X(0.2), Y(-1), ZF], [X(1.8), Y(-1), ZF], [X(1.8), Y(1), ZF], [X(0.2), Y(1), ZF]], { color: C.GREY, width: 2, closed: true, fill: C.GREY, fillOpacity: 0.08, under: true, opacity: 0.7 });
      const ticks = [0.8, 1, 1.2].map((x) => new Path3([[X(x), Y(-1), ZF], [X(x), Y(1), ZF]], { color: x === 1 ? C.WHITE : C.GREY_B, width: 2, dash: '10 10', under: true, opacity: 0.7 }));
      const zero = new Path3([[X(0.2), 0, ZF], [X(1.8), 0, ZF]], { color: C.GREY_B, width: 2, under: true, opacity: 0.6 });
      const tickL = [0.8, 1, 1.2].map((x) => new Label3(String(x), [X(x), Y(-1.3), ZF], { size: 32, color: C.GREY_B, bg: 0 }));
      const rhoL = new Label3(new MV.Tex('\\text{ratio } \\rat', { size: 44 }), [X(1.25), Y(-1.95), ZF], { bg: 0 });
      // the advantage axis runs away from us along the left edge: labels end just left of it
      const advT = new MV.Tex('\\text{advantage } \\AA', { size: 36 });
      const advL = [new Label3('A = +1', [X(0.2) - 0.3, Y(1), ZF], { size: 32, color: C.GREEN, anchor: 'end', bg: 0 }), new Label3('A = −1', [X(0.2) - 0.3, Y(-1), ZF], { size: 32, color: C.RED, anchor: 'end', bg: 0 }),
        new Label3(advT, [X(0.2) - 0.3, Y(-0.4), ZF], { bg: 0, props: { dx: -advT.w / 2 - 6 } })];
      const sheet = new Surface3((rho, a) => [X(rho), Y(a), Z(rho * a)], {
        u: [0.2, 1.8], v: [-1, 1], res: [32, 20], color: (rho, a) => mix(C.GREY_B, a > 0 ? C.GREEN : C.RED, 0.35), opacity: 0.36, stroke: C.GREY_B, strokeOpacity: 0.45, shade: 0.25,
      });
      const clipS = new Surface3((rho, a, p) => [X(rho), Y(a), Z((1 - p.m) * rho * a + p.m * RL.ppoClip(rho, a, p.eps))], {
        u: [0.2, 1.8], v: [-1, 1], res: [32, 20], color: (rho, a, p) => mix(C.GREY_B, slopeColor(rho, a, p.eps), p.m), opacity: 0.88, shade: 0.25, bias: 0.05, props: { m: 0, eps: EPS },
      });
      hide(sheet, clipS, tickL, rhoL, advL);
      sp.add(fl, zero, ...ticks, sheet, clipS, ...tickL, rhoL, ...advL);

      // 1. the two numbers of a token, and the floor they make
      const F1 = col.tex(S, '\\rat \\;=\\; \\frac{\\pt(\\yy_t \\mid \\ss_t)}{\\pold(\\yy_t \\mid \\ss_t)}', -290, 64);
      const E1a = col.say(S, '{ρ:|rat} new {probability|pt} ÷ {old probability;|pold} 1 means unchanged', -160, 34);
      const E1b = col.say(S, '{A:|AA} was it {better (+)|advantage} or {worse (−)|#FC6255} than expected?', -95, 34);
      S.beat('Here is P P O’s clipped objective, as a landscape. Each token brings two numbers: its ratio, new probability over old, and its advantage, better or worse than expected. They make the floor: ratio left to right, advantage front to back.',
        A.FadeIn(h), A.Write(F1, 1.6), S.writeIn(E1a, 1.4), S.writeIn(E1b, 1.2), A.FadeIn(sp), lag(0.3, tickL.map((m) => A.FadeIn(m))), A.FadeIn(rhoL), lag(0.4, advL.map((m) => A.FadeIn(m))),
        { cap: 'Here is PPO’s clipped objective, as a landscape. Each token brings two numbers: its ratio, new probability over old, and its advantage, better or worse than expected. They make the floor: ratio left to right, advantage front to back.' });

      // 2. the plain surrogate: a twisted sheet
      const F3 = col.tex(S, '\\cReward{Lc}{L} \\;=\\; \\rat\\, \\AA', 100, 64);
      const R3 = col.why(S, 'because: averaging {ρ × A|rat} over old samples is averaging {A|AA} under the new policy (importance sampling)', 210);
      S.beat('With no rule, the objective is the ratio times the advantage. Over this floor, that is a twisted sheet: rising with the ratio where the advantage is positive, falling where it is negative, flat along zero.',
        fade(A, [E1a, E1b]), A.Write(F3, 1.2), S.writeIn(R3, 1.6), A.FadeIn(sheet, { dur: 1.6 }), A.Set(sp, { theta: -96 }, 5, 'linear'));
      // pushes are directions, so they are drawn in the gradient's yellow
      const up = new Arrow3([X(1.15), Y(0.8), Z(1.15 * 0.8) + 0.25], [X(1.75), Y(0.8), Z(1.75 * 0.8) + 0.25], { color: C.YELLOW, width: 8 });
      undrawn(up);
      sp.add(up);
      const E4 = col.say(S, 'the sheet never levels off, so a good token is pushed to be more and more likely', 250, 34);
      S.beat('Gradient ascent climbs it. Where the advantage is positive, it pushes the ratio up and up, because the sheet never levels off. But after a few steps on one batch, the old samples no longer describe the new policy.',
        A.Arrow(up, 1.2), S.writeIn(E4, 1.6), fade(A, [R3]));

      // 3. the clip
      const F5 = col.tex(S, '\\operatorname{clip}(\\rat,\\; 1-\\eps,\\; 1+\\eps)', -130, 56);
      const E5 = [col.say(S, 'the {ratio,|rat} kept between {1 − ε|eps} and {1 + ε|eps}', -50, 34), col.say(S, '(with {ε = 0.2:|eps} from 0.8 to 1.2)', 0, 34)];
      const band = new Path3([[X(0.8), Y(-1), ZF], [X(1.2), Y(-1), ZF], [X(1.2), Y(1), ZF], [X(0.8), Y(1), ZF]], { color: C.PINK, width: 2, closed: true, fill: C.PINK, fillOpacity: 0.22, under: true, opacity: 0.6 });
      hide(band);
      sp.add(band);
      S.beat('P P O’s fix starts with a clipped copy of the ratio, held between one minus epsilon and one plus epsilon. With epsilon at zero point two, that is between zero point eight and one point two.',
        fade(A, [up, E4, F1]), A.Write(F5, 1.6), S.writeIn(E5[0], 1.2), S.writeIn(E5[1], 1), A.FadeIn(band), A.Set(sp, CAM, 2),
        { cap: 'PPO’s fix starts with a clipped copy of the ratio, held between 1 − ε and 1 + ε. With ε = 0.2, that is between 0.8 and 1.2.' });

      // 4. the minimum: the sheet folds
      // the two terms of the minimum can be spotlit as 'plainT' and 'clipT'
      const F6 = col.tex(S, '\\cReward{Lc}{L^{\\text{CLIP}}} \\;=\\; \\min\\!\\big(\\class{s-plainT}{\\rat\\, \\AA},\\;\\; \\class{s-clipT}{\\operatorname{clip}(\\rat, 1-\\eps, 1+\\eps)\\, \\AA}\\big)', -300, 44);
      S.paper('schulman2017ppo');
      const say5 = 'Then take the smaller of two things: the plain product, and the product with the clipped ratio. Watch the sheet fold. Where the advantage is positive, it turns flat beyond one point two. Where it is negative, flat below zero point eight.';
      S.beat(say5,
        cued(S, say5, [[null, par(fade(A, [F5, ...E5, F3]))], [null, A.Write(F6, 2)], ['plain', A.Spot(F6, 'plainT', { dur: 0.5 })], ['clipped', A.Spot(F6, 'clipT', { dur: 0.5 })],
          ['Watch', par(A.Unspot(F6, 0.5), A.FadeIn(clipS, { dur: 0.4 }), A.Set(sheet, { fo: 0.14 }, 1))]]),
        par(A.Set(clipS, { m: 1 }, 3.2), A.Set(sp, { theta: -112, phi: 64 }, 4)),
        { cap: 'Then take the smaller of two things: the plain product, and the product with the clipped ratio. Watch the sheet fold. Where the advantage is positive, it turns flat beyond 1.2. Where it is negative, flat below 0.8.' });
      const E7 = col.say(S, 'take the smaller of {ratio × advantage|rat} and the same with the {ratio held within ε of 1|eps}', -170, 34);
      const key = [
        S.add(S.english('{green:|advantage} slopes up, the gradient pushes {ρ|rat} up', { size: 32, width: COLW })).at(RX, -50),
        S.add(S.english('{red:|#FC6255} slopes down, the gradient pushes {ρ|rat} down', { size: 32, width: COLW })).at(RX, 5),
        S.add(S.english('{grey:|#9A9EA6} flat, no push at all', { size: 32, width: COLW })).at(RX, 60),
      ];
      S.beat('In words: take the smaller of the ratio times the advantage, and the same thing with the ratio held within epsilon of one. The colours show the slope. Green and red still push. Grey is flat: no push at all.',
        S.writeIn(E7, 2), lag(0.6, key.map((m) => A.FadeIn(m, { dx: -10 }))));

      // 5. two slices
      const slice = (a) => {
        const pts = [];
        for (let i = 0; i <= 96; i++) {
          const rho = 0.2 + (1.6 * i) / 96;
          pts.push([X(rho), Y(a), Z(RL.ppoClip(rho, a)) + 0.05]);
        }
        return new Path3(pts, { color: C.WHITE, width: 6 });
      };
      const sl = [slice(0.8), slice(-0.8)];
      undrawn(sl);
      const E8 = [
        S.add(S.english('{A = +0.8:|advantage} up to {ρ = 1.2,|rat} then flat at 0.96', { size: 32, width: COLW })).at(RX, 160),
        S.add(S.english('{A = −0.8:|#FC6255} flat at −0.64 below {ρ = 0.8,|rat} then down', { size: 32, width: COLW })).at(RX, 220),
      ];
      sp.add(...sl);
      S.beat('Two slices show the shape. At advantage plus zero point eight: a ramp up to one point two, then a flat shelf. At minus zero point eight: a flat shelf below zero point eight, then a ramp down.',
        fade(A, [E7]), par(key.map((m, i) => A.MoveTo(m, RX, -190 + 55 * i))), A.Create(sl[0], 1.6), A.FadeIn(E8[0]), A.Create(sl[1], 1.6), A.FadeIn(E8[1]),
        { cap: 'Two slices show the shape. At advantage +0.8: a ramp up to 1.2, then a flat shelf. At −0.8: a flat shelf below 0.8, then a ramp down.' });

      // 6. one good token
      const AT = 0.8;
      const tok = new Dot3((p) => [X(p.rho), Y(AT), Z(RL.ppoClip(p.rho, AT)) + 0.08], { r: 13, color: C.WHITE, props: { rho: 1 } });
      const ghost = new Dot3(() => [X(tok.p.rho), Y(AT), Z(tok.p.rho * AT) + 0.08], { r: 9, color: C.GREY_B });
      const gap = new Path3(() => [[X(tok.p.rho), Y(AT), Z(RL.ppoClip(tok.p.rho, AT))], [X(tok.p.rho), Y(AT), Z(tok.p.rho * AT)]], { color: C.GREY_B, width: 3, dash: '8 8' });
      hide(tok, ghost, gap);
      sp.add(gap, ghost, tok);
      const rd = [
        S.add(new Readout(() => `ratio ρ = ${tok.p.rho.toFixed(2)}`, { size: 40, color: C.MAROON }).hidden()).at(RX, -150),
        S.add(new Readout(() => `slope = ${RL.ppoClipSlope(tok.p.rho, AT).toFixed(1)}`, { size: 40, color: C.WHITE }).hidden()).at(RX, -90),
      ];
      const E9 = col.say(S, 'flat ground: slope 0, so this batch stops pushing the token once it is 20% more likely', 10, 34);
      S.beat('Follow one good token as its ratio grows. Up to one point two the ground slopes up, and the gradient pushes. Past it, the ground is flat: slope zero. This batch stops pushing once the token is twenty percent more likely.',
        fade(A, [...key, ...E8]), A.Set(sl[1], { o: 0.35 }, 0.6), A.FadeIn(tok), A.FadeIn(ghost), A.FadeIn(gap), par(rd.map((m) => A.FadeIn(m))),
        A.Set(sp, { theta: -110, phi: 64 }, 2), A.Set(tok, { rho: 1.6 }, 5, 'linear'), S.writeIn(E9, 1.4),
        { cap: 'Follow one good token as its ratio grows. Up to 1.2 the ground slopes up, and the gradient pushes. Past it, the ground is flat: slope zero. This batch stops pushing once the token is 20% more likely.' });

      // 7. pessimism
      const F10 = col.tex(S, '\\min(x,\\, y) \\;\\le\\; x', 120, 52);
      const E10 = col.say(S, 'the clipped objective never promises more than the plain {ρ × A:|rat} a pessimistic estimate', 220, 34);
      S.beat('Notice the gap above the token. The clipped surface never rises above the sheet, because the smaller of two numbers is never bigger than either. So the objective never promises more gain than the plain estimate. It is pessimistic on purpose.',
        A.Indicate(gap, { scale: 1.0, color: C.WHITE }), A.Write(F10, 1), S.writeIn(E10, 1.6));

      // 8. one-sided: mistakes are always corrected
      const back = [
        new Arrow3([X(0.45), Y(AT), Z(0.45 * AT) + 0.25], [X(0.8), Y(AT), Z(0.8 * AT) + 0.25], { color: C.YELLOW, width: 8 }),
        new Arrow3([X(1.6), Y(-AT), Z(-1.6 * AT) + 0.25], [X(1.25), Y(-AT), Z(-1.25 * AT) + 0.25], { color: C.YELLOW, width: 8 }),
      ];
      undrawn(back);
      sp.add(...back);
      const E11 = [
        S.add(S.english('good token made rarer {(ρ = 0.5):|rat} slope {+0.8|advantage}', { size: 32, width: COLW })).at(RX, -130),
        S.add(S.english('bad token made likelier {(ρ = 1.55):|rat} slope {−0.8|#FC6255}', { size: 32, width: COLW })).at(RX, -75),
        S.add(S.english('both are pulled back', { size: 32, width: COLW })).at(RX, -20),
      ];
      S.beat('The flat parts are on one side only. If a step made a good token rarer, the ground there still slopes, and the gradient pulls it back. The same holds for a bad token that became more likely.',
        fade(A, [F10, E10, E9, ...rd]), A.Set(tok, { rho: 0.5 }, 2), A.Set(sp, { theta: -104, phi: 66, zoom: 1.1, cx: 0, cy: 0, cz: -0.4 }, 3), A.Set(sl[1], { o: 1 }, 0.6),
        A.Arrow(back[0], 1), A.FadeIn(E11[0]), A.Arrow(back[1], 1), A.FadeIn(E11[1]), A.FadeIn(E11[2]));

      // 9. a bigger epsilon, and what it buys
      const E12 = col.say(S, 'a larger {ε|eps} moves the shelves out: each batch may move the policy further', 80, 34);
      const E13 = col.say(S, 'push only so far where we want to go; always undo a mistake', 200, 38);
      S.beat('What if epsilon were larger? The shelves move out, and each batch may move the policy further. So epsilon sets the size of step we trust: push only so far where we want to go, and always undo a mistake.',
        fade(A, [...E11, ...back, tok, ghost, gap, sl[0], sl[1]]), A.Set(band, { o: 0 }, 0.6), A.Set(clipS, { eps: 0.4 }, 2.4), A.Spot(F6, 'eps'), S.writeIn(E12, 1.4), wait(0.6), A.Set(clipS, { eps: EPS }, 2.4), A.Unspot(F6), S.writeIn(E13, 1.6), A.Set(sp, { theta: -96 }, 4));
    });
  };

  /* ================================================================= 3. DOME */
  FILM.landscapes.dome = function (ctx) {
    const { A, video, par, lag, wait } = ctx;
    const labels = ['vague', 'helpful', 'flattering'];
    const ref = [0.6, 0.3, 0.1];
    const r = [0.2, 1.0, 1.5];
    const AC = [C.GREY_B, C.GREEN, C.PINK];
    const B0 = 0.5;
    const tilt = (b) => RL.tilt(ref, r, b);
    const height = (b) => b * RL.logPartition(ref, r, b);
    const obj = (p, b) => RL.regularisedObjective(p, ref, r, b);
    const Eref = RL.expectedReward(ref, r);
    // the triangle: corners on the floor, a policy is the weighted average of the corners
    const TRI = [[-2.6, -1.5], [2.6, -1.5], [0, 3]];
    const floorOf = (p) => [p[0] * TRI[0][0] + p[1] * TRI[1][0] + p[2] * TRI[2][0], p[0] * TRI[0][1] + p[1] * TRI[1][1] + p[2] * TRI[2][1]];
    // the unit square onto the triangle, finer near the edges where KL is steep
    const cosq = (x) => (1 - Math.cos(Math.PI * x)) / 2;
    const simplex = (s, t) => {
      const a = cosq(s);
      const b = cosq(t);
      return [(1 - b) * (1 - a), (1 - b) * a, b];
    };
    const KZ = 2.0; // world height per unit of objective
    const LOW = -0.35; // the floor stands for an objective of -0.35, the lowest we draw
    const zOf = (val) => KZ * (Math.max(val, LOW) - LOW);
    const VALUE = ramp(GOLDEN, -0.35, 1.2);
    const ts = tilt(B0);
    must(pct(ts[0]) === '17%' && pct(ts[1]) === '43%' && pct(ts[2]) === '39%', 'the peak at beta 0.5: 17, 43, 39');
    must(fx(height(B0)) === '0.82' && fx(Eref) === '0.57', 'peak height 0.82, reference 0.57');
    must(Math.abs(obj(ts, B0) - height(B0)) < 1e-12, 'the objective at the tilt is beta log Z');
    must(pct(tilt(0.1)[2]) === '98%' && RL.kl(tilt(50), ref) < 1e-3, 'beta 0.1: 98% flattering; large beta: the reference');
    must([0, 1, 2].map((i) => RL.kl([0, 1, 2].map((j) => (j === i ? 1 : 0)), ref).toFixed(2)).join() === '0.51,1.20,2.30', 'KL at the corners');
    // the dome peaks at the tilt: nothing on a fine grid is higher
    let best = -Infinity;
    for (let i = 0; i <= 60; i++) for (let j = 0; j < 60; j++) best = Math.max(best, obj([(1 - j / 60) * (1 - i / 60), (1 - j / 60) * (i / 60), j / 60], B0));
    must(best <= height(B0) + 1e-12, 'the tilt is the top of the dome');

    video.scene('land-dome', 'The leash as a landscape', (S) => {
      const h = S.add(S.title('The leash, as a landscape'));
      const CAM = { phi: 52, theta: -84, zoom: 1.05, cx: 0, cy: 0.6, cz: 1.3 };
      const sp = S.add(new Space3({ unit: 118, ...CAM }).at(-400, 30).hidden());
      const TALL = { zoom: 0.84, cz: 1.9 };
      const tri = new Path3(TRI.map(([x, y]) => [x, y, 0]), { color: C.GREY_B, width: 3, closed: true, fill: C.GREY, fillOpacity: 0.1, under: true, opacity: 0.8 });
      const lb0 = Math.log(B0);
      const corners = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      // a corner's label sits just outside the triangle, at the height of the surface there
      // (on the floor while the surface is hidden)
      const cornerAt = (i, up) => () => {
        const [x, y] = TRI[i];
        const p = surf.p;
        const z = p.o * zOf(RL.expectedReward(corners[i], r) - p.m * Math.exp(p.lb) * RL.kl(corners[i], ref));
        return i === 2 ? [x, y + 0.3, z + up] : [x + (x > 0 ? 0.6 : -0.6), y + 0.1, z + up];
      };
      const cornerL = labels.map((s, i) => new Label3(s, cornerAt(i, 0.25), { size: 36, color: AC[i] }));
      const rewardL = labels.map((s, i) => new Label3(`r = ${r[i]}`, cornerAt(i, 0.25), { size: 32, color: C.GOLD, props: { dy: -44 } }));
      const surf = new Surface3((s, t, p) => {
        const q = simplex(s, t);
        const [x, y] = floorOf(q);
        return [x, y, zOf(RL.expectedReward(q, r) - p.m * Math.exp(p.lb) * RL.kl(q, ref))];
      }, { u: [0, 1], v: [0, 0.999], res: [30, 30], color: (s, t, p) => VALUE(RL.expectedReward(simplex(s, t), r) - p.m * Math.exp(p.lb) * RL.kl(simplex(s, t), ref)), opacity: 0.86, props: { m: 0, lb: lb0 } });
      const beta = () => Math.exp(surf.p.lb);
      const bowl = new Surface3((s, t) => {
        const q = simplex(s, t);
        const [x, y] = floorOf(q);
        // drawn at the height of beta KL for beta = 0.5, in the objective's own
        // units, so that the dome below is this plane minus this bowl
        return [x, y, KZ * B0 * RL.kl(q, ref)];
      }, { u: [0, 1], v: [0, 0.999], res: [30, 30], color: () => C.ORANGE, opacity: 0.5, stroke: C.ORANGE, strokeOpacity: 0.3, shade: 0.35 });
      hide(surf, bowl, cornerL, rewardL);
      sp.add(tri, surf, bowl, ...cornerL, ...rewardL);
      const toy = S.add(S.toy(-420, 365));

      // 1. why: three answers, a triangle
      const E1 = col.say(S, 'the {objective|JJ} trades {reward|rr} against distance from the {reference;|pref} to see the whole trade, take three kinds of answer', -270, 36);
      S.beat('One more landscape, for the leash. The objective trades reward against distance from the reference model. To see the whole trade at once, take a prompt with just three kinds of answer: vague, helpful, and flattering.',
        A.FadeIn(h), S.writeIn(E1, 2.4), A.FadeIn(sp), lag(0.5, cornerL.map((m) => A.FadeIn(m))), A.FadeIn(toy));
      const F2 = col.tex(S, '\\pp(\\text{vague}) + \\pp(\\text{helpful}) + \\pp(\\text{flattering}) \\;=\\; 1', -120, 40);
      const R2 = col.why(S, 'because: three numbers with a fixed sum have only two free ones, so they fit on a flat triangle', -20);
      const mover = new Dot3((p) => [...floorOf([1 / 3 - p.k / 3, 1 / 3 + (2 * p.k) / 3, 1 / 3 - p.k / 3]), 0.04], { r: 12, color: C.BLUE, props: { k: 0 } });
      hide(mover);
      sp.add(mover);
      S.beat('A policy is three chances that add up to one. Only two of them are free, so every policy is a point of this flat triangle. Each corner is certainty: always that answer. The middle is an even split, a third each.',
        A.Write(F2, 1.8), S.writeIn(R2, 1.6), A.FadeIn(mover), wait(0.6), A.Set(mover, { k: 1 }, 1.6), wait(0.4), A.Set(mover, { k: 0 }, 1.4));

      // 2. the reference and the reward
      const refDot = new Dot3((p) => [...floorOf(ref), p.lift * zOf(Eref) + 0.05], { r: 12, color: C.GREY_B, props: { lift: 0 } });
      const refLab = new Label3(new MV.Tex('\\pref', { size: 46 }), () => [floorOf(ref)[0] - 0.6, floorOf(ref)[1] - 0.3, refDot.p.lift * zOf(Eref) + 0.3]);
      hide(refDot, refLab);
      sp.add(refDot, refLab);
      const F3a = col.tex(S, '\\pref \\;=\\; (0.6,\\; 0.3,\\; 0.1)', -280, 52);
      const F3b = col.tex(S, '\\rr \\;=\\; (0.2,\\; 1.0,\\; 1.5)', -190, 52);
      const E3 = col.say(S, 'the {reward model|rr} pays most for {flattery:|#D147BD} that is its flaw', -100, 36);
      S.beat('The reference model, where training starts, sits here: vague sixty percent of the time, helpful thirty, flattering ten. The reward model pays one point five for flattery, more than for a helpful answer. That is its flaw.',
        fade(A, [E1, F2, R2, mover]), A.Write(F3a, 1.4), A.FadeIn(refDot, { from: 2 }), A.FadeIn(refLab), A.Write(F3b, 1.4), lag(0.4, rewardL.map((m) => A.FadeIn(m))), S.writeIn(E3, 1.2),
        { cap: 'The reference model, where training starts, sits here: vague 60% of the time, helpful 30%, flattering 10%. The reward model pays 1.5 for flattery, more than for a helpful answer. That is its flaw.' });

      // 3. the plane
      const F4 = col.tex(S, '\\EE_{\\yy\\sim\\pp}[\\rr] \\;=\\; \\sum_{\\yy} \\pp(\\yy)\\; \\rr(\\yy)', 20, 54);
      const R4 = col.why(S, 'because: it is a weighted average of the corner {rewards,|rr} so it is flat, and highest at the flattering corner', 130);
      S.beat('Expected reward is chance times reward, added up. Over the triangle, that is a tilted flat plane, highest at the flattering corner. A pure reward maximizer would slide straight there.',
        fade(A, [E3]), A.Write(F4, 1.4), S.writeIn(R4, 1.6), A.FadeIn(surf, { dur: 1.6 }), A.Set(refDot, { lift: 1 }, 1.6), A.Set(sp, TALL, 1.6), A.Set(sp, { theta: -70 }, 5, 'linear'));

      // 4. the bowl
      const F5 = col.tex(S, '\\KL(\\pp \\,\\|\\, \\pref) \\;=\\; \\sum_{\\yy} \\pp(\\yy)\\, \\log\\frac{\\pp(\\yy)}{\\pref(\\yy)}', 10, 52);
      const R5 = col.why(S, 'because: {KL|KL} is never negative, and it is zero only when {π|pp} equals the {reference|pref}', 125);
      const E5 = col.say(S, '{KL|KL} at the corners: vague 0.51 · helpful 1.20 · flattering 2.30', 215, 32);
      const N5 = col.why(S, 'drawn at half height: {β × KL|bt} with {β = 0.5|bt}', 285);
      S.beat('The leash is the K L divergence from the reference. Over the triangle it is a bowl: zero at the reference, rising toward the edges. It is steepest toward flattery, which the reference rarely gives: two point three at that corner.',
        fade(A, [F4, R4, ...rewardL]), A.Set(surf, { fo: 0.05 }, 1), A.Write(F5, 1.6), A.FadeIn(bowl, { dur: 1.6 }), S.writeIn(R5, 1.4), S.writeIn(E5, 1.4), S.writeIn(N5, 1),
        { cap: 'The leash is the KL divergence from the reference. Over the triangle it is a bowl: zero at the reference, rising toward the edges. It is steepest toward flattery, which the reference rarely gives: 2.30 at that corner.' });

      // 5. plane minus beta bowl
      // its two terms can be spotlit as 'planeT' and 'bowlT'
      const F6 = col.tex(S, '\\JJ_{\\bt}(\\pp) \\;=\\; \\class{s-planeT}{\\EE_{\\pp}[\\rr]} \\;-\\; \\class{s-bowlT}{\\bt\\, \\KL(\\pp \\,\\|\\, \\pref)}', -300, 52);
      const bLab = S.add(new Readout(() => `β = ${beta().toFixed(2)}`, { size: 44, color: C.ORANGE }).hidden()).at(RX, -205);
      const say6 = 'The objective is the plane, minus beta times the bowl. With beta at zero point five, that is exactly the bowl as drawn. Subtract it, and watch the plane bend: its edges sink, most of all toward flattery, and a dome rises in between.';
      S.beat(say6,
        cued(S, say6, [[null, par(fade(A, [F3a, F3b, F5, R5, E5, N5]))], [null, A.Write(F6, 1.8)], ['plane', A.Spot(F6, 'planeT', { dur: 0.5 })], ['bowl.', A.Spot(F6, 'bowlT', { dur: 0.5 })],
          [null, A.FadeIn(bLab)], ['Subtract', par(A.Unspot(F6, 0.5), A.Set(surf, { fo: 0.86 }, 0.8), A.Set(bowl, { o: 0 }, 1.6), A.Set(surf, { m: 1 }, 3.2), A.Set(sp, CAM, 4))]]),
        { cap: 'The objective is the plane, minus β times the bowl. With β = 0.5, that is exactly the bowl as drawn. Subtract it, and watch the plane bend: its edges sink, most of all toward flattery, and a dome rises in between.' });
      const E7 = col.say(S, '{expected reward,|rr} minus a price for moving away from the {reference;|pref} {β|bt} sets the price', -100, 36);
      S.beat('Read it as: expected reward, minus a price for moving away from the reference. Beta sets the price.',
        S.writeIn(E7, 2), A.Spot(F6, 'bt'));

      // 6. the peak and its height
      const peakAt = () => [...floorOf(tilt(beta())), zOf(height(beta()))];
      const peak = new Dot3(() => {
        const q = peakAt();
        return [q[0], q[1], q[2] + 0.07];
      }, { r: 13, color: C.BLUE });
      const drop = new Path3(() => {
        const q = peakAt();
        return [[q[0], q[1], q[2]], [q[0], q[1], 0]];
      }, { color: C.BLUE, width: 3, dash: '10 9' });
      const foot = new Dot3(() => [...floorOf(tilt(beta())), 0.02], { r: 8, color: C.BLUE });
      foot.under = true;
      const peakLab = new Label3(new MV.Tex('\\pstar', { size: 46 }), () => {
        const q = peakAt();
        return [q[0] + 1.1, q[1] + 0.1, q[2] + 0.3];
      });
      hide(peak, foot, peakLab);
      undrawn(drop);
      sp.add(drop, foot, peak, peakLab);
      const F8 = col.tex(S, '\\pstar \\;=\\; \\frac{1}{\\ZZ}\\; \\pref\\; e^{\\rr/\\bt}, \\qquad \\ZZ \\;=\\; \\sum_{\\yy} \\pref(\\yy)\\, e^{\\rr(\\yy)/\\bt}', -60, 40);
      const piRd = S.add(new Readout(() => {
        const t = tilt(beta());
        return `π* = ${t[0].toFixed(2)} vague · ${t[1].toFixed(2)} helpful · ${t[2].toFixed(2)} flattering`;
      }, { size: 32, color: C.BLUE }).hidden()).at(RX, 40);
      S.beat('The top of the dome is the exact solution we met before: the reference, reweighted by e to the reward over beta, then normalized. At beta zero point five, it is seventeen percent vague, forty-three helpful, thirty-nine flattering.',
        A.Unspot(F6), fade(A, [E7]), A.Write(F8, 2), A.FadeIn(peak, { from: 2 }), A.Create(drop, 0.8), A.FadeIn(foot), A.FadeIn(peakLab), A.FadeIn(piRd),
        { cap: 'The top of the dome is the exact solution we met before: the reference, reweighted by e^(r/β), then normalized. At β = 0.5 it is 17% vague, 43% helpful, 39% flattering.' });
      const F9 = col.tex(S, '\\JJ_{\\bt}(\\pp) \\;=\\; -\\bt\\, \\KL(\\pp \\,\\|\\, \\pstar) \\;+\\; \\bt \\log \\ZZ', 130, 46);
      const R9 = col.why(S, `because: at the peak the K L to {π*|pstar} is zero, so the height is {β log Z|bt} = ${fx(height(B0))}; the {reference|pref} sits at ${fx(Eref)}`, 230);
      S.beat('How high is the peak? Earlier we rewrote the objective as minus beta times the K L to the peak, plus beta log Z. At the peak that K L is zero, so the height is beta log Z: zero point eight two.',
        A.Write(F9, 2), S.writeIn(R9, 1.6), A.Indicate(peak, { scale: 1.5 }), A.Indicate(refDot, { scale: 1.5 }),
        { cap: `How high is the peak? Earlier we rewrote the objective as −β KL(π ‖ π*) + β log Z. At the peak that KL is zero, so the height is β log Z = ${fx(height(B0))}.` });

      // 7. turn the knob
      const trailB = Array.from({ length: 80 }, (_, i) => Math.exp(Math.log(2.5) + (i / 79) * (Math.log(0.1) - Math.log(2.5))));
      const trail = new Path3(() => {
        const b = beta();
        const pts = trailB.filter((x) => x >= b - 1e-9).map((x) => [...floorOf(tilt(x)), 0.03]);
        pts.push([...floorOf(tilt(b)), 0.03]);
        if (pts.length < 2) pts.push(pts[0]);
        return pts;
      }, { color: C.BLUE, width: 5, under: true });
      hide(trail);
      sp.add(trail);
      S.beat('Now turn the knob. A large beta makes the bowl steep, and moving away expensive. The peak stays close to the reference.',
        fade(A, [F8, F9, R9]), A.Set(surf, { lb: Math.log(2.5) }, 3.4), A.Set(sp, { theta: -78 }, 3.4));
      const E11 = col.say(S, 'smaller {β:|bt} a flatter bowl, and the peak slides toward {flattery|#D147BD}', 140, 36);
      S.beat('As beta shrinks, the bowl flattens, and the peak slides away from the reference, toward the flattering corner: the answer the reward model overrates. At beta zero point one, the best policy flatters ninety-eight percent of the time.',
        A.FadeIn(trail), A.Set(surf, { fo: 0.62 }, 1), A.Set(surf, { lb: Math.log(0.1) }, 7, 'linear'), A.Set(sp, { theta: -96, ...TALL }, 7), S.writeIn(E11, 1.6),
        { cap: 'As β shrinks, the bowl flattens, and the peak slides away from the reference, toward the flattering corner: the answer the reward model overrates. At β = 0.1, the best policy flatters 98% of the time.' });
      const F12a = col.tex(S, '\\bt \\to \\infty: \\quad \\pstar \\to \\pref', 220, 44);
      const F12b = col.tex(S, '\\bt \\to 0: \\quad \\pstar \\to \\text{the top-reward answer}', 290, 44);
      S.beat('In the limits: as beta grows without bound, the best policy is the reference itself. As beta goes to zero, the leash is gone, and the best policy is whichever answer the reward model likes most.',
        A.Write(F12a, 1.4), A.Write(F12b, 1.6), A.Set(sp, { theta: -84 }, 4));

      // 8. what it means
      const E13 = col.say(S, 'reward over-optimization: the {reward|rr} is only a model, and the climb finds its flaws', 140, 36);
      S.paper('gao2023');
      S.beat('That slide is reward over-optimization. The reward model is only a model of what we want. Gao, Schulman and Hilton measured it, with a gold reward model standing in for people: optimize hard against a learned proxy, and the gold reward first rises, then falls.',
        fade(A, [F12a, F12b, toy, E11]), S.writeIn(E13, 2), A.Set(surf, { lb: Math.log(0.6) }, 4), A.Set(sp, CAM, 4),
        { cap: 'That slide is reward over-optimization. The reward model is only a model of what we want. Gao, Schulman and Hilton measured it, with a gold reward model standing in for people: optimize hard against a learned proxy, and the gold reward first rises, then falls.' });
      const E14 = col.say(S, '{β|bt} decides how far the {policy|pt} may wander from where it started, and so how much it trusts the {reward|rr}', 260, 34);
      S.beat('Beta decides how far the policy may wander from where it started, and so how much it trusts the reward. And the peak has a closed form. Could we find it without climbing at all?',
        S.writeIn(E14, 2), A.Indicate(peak, { scale: 1.4 }));
    });
  };
})();
