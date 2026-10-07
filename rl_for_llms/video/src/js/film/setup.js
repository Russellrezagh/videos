/*
 * The Gradient of Reward: the script.
 *
 * Each scene is a list of beats: one narration line plus the animations that
 * play while it is spoken. Every number on screen comes from the kernel
 * (src/js/rl.js), computed here when the page loads. Toy examples are
 * labelled as toy on screen.
 */
window.FILM = window.FILM || { parts: [], papers: {} };

window.buildVideo = function buildVideo(root, durations, words) {
  'use strict';
  const { C, A, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix } = MV;
  const video = new MV.Video(root, { durations, words, kit });
  video.poster = 'open.5';

  /* ---------- the running examples, computed once ---------- */
  // Chapter 1: next-token distribution after "The answer is" (toy logits)
  const NEXT = { labels: ['51', '41', '54', '50', 'other'], z: [1.2, 0.37, -0.19, -0.48, -0.37] };
  NEXT.p = RL.softmax(NEXT.z);
  // the toy answer and its token probabilities
  const ANSWER = { tokens: ['The', 'answer', 'is', '51', '.'], p: [0.62, 0.81, 0.93, 0.48, 0.97] };
  ANSWER.logp = ANSWER.p.map(Math.log);
  ANSWER.total = RL.sequenceLogProb(ANSWER.p);
  // Chapter 3 onwards: the bandit. Three answers to "What is 17 x 3?"
  const BAND = { labels: ['51', 'about 50', '41'], z: [0.6, 0.2, -0.3], r: [1, 0.3, 0] };
  BAND.pi = RL.softmax(BAND.z);
  BAND.J = RL.expectedReward(BAND.pi, BAND.r);
  BAND.grad = RL.exactGradient(BAND.z, BAND.r);
  // Monte Carlo: running average of sampled gradients for the "51" logit
  BAND.mc = (() => {
    const rand = RL.rng(3);
    const out = [];
    let acc = 0;
    for (let n = 1; n <= 2000; n++) {
      const a = RL.sampleIndex(BAND.pi, rand());
      acc += RL.reinforceSample(BAND.z, BAND.r, a)[0];
      out.push([n, acc / n]);
    }
    return out;
  })();
  // Chapter 4: generous rewards, same ranking
  const R10 = BAND.r.map((x) => x + 10);
  const J10 = RL.expectedReward(BAND.pi, R10);
  const VAR = { plain: RL.estimatorStats(BAND.z, BAND.r, 0).variance, off: RL.estimatorStats(BAND.z, R10, 0).variance, base: RL.estimatorStats(BAND.z, R10, J10).variance, bStar: RL.optimalBaseline(BAND.z, R10) };
  // five-answer training, averaged over 20 seeds
  const TRAIN = (() => {
    const r = [1, 0.8, 0.6, 0.4, 0.2].map((x) => x + 5);
    const avg = (baseline) => {
      const out = [];
      for (let seed = 1; seed <= 20; seed++) {
        const h = RL.trainBandit({ z0: [0, 0, 0, 0, 0], r, steps: 80, lr: 0.3, batch: 4, baseline, seed });
        h.forEach((x, t) => (out[t] = (out[t] || 0) + x.pi[0] / 20));
      }
      return out.map((v, t) => [t, v]);
    };
    return { none: avg('none'), loo: avg('loo') };
  })();
  // Chapter 5: one solved problem, token by token (toy critic values)
  const CREDIT = { tokens: ['17x3', '=', '17x3', '=', '10x3', '+', '7x3', '=', '30', '+', '21', '=', '51'], V: [0.52, 0.52, 0.53, 0.53, 0.66, 0.66, 0.74, 0.74, 0.8, 0.8, 0.88, 0.9, 0.97] };
  CREDIT.rewards = CREDIT.tokens.map((_, i) => (i === CREDIT.tokens.length - 1 ? 1 : 0));
  CREDIT.gae = (lambda) => RL.gae(CREDIT.rewards, CREDIT.V.concat([0]), 1, lambda);
  // Chapter 7: a reward model fitted to simulated comparisons
  const RM = { labels: ['A', 'B', 'C', 'D', 'E'], rTrue: [1.2, 0.4, 0, -0.6, -1] };
  RM.fit = RL.fitRewardModel(RL.simulatePreferences(RM.rTrue, 20000, 11), 5, { steps: 3000, lr: 2 });
  RM.mean = RL.sum(RM.rTrue) / 5;
  // Chapter 8: the leash. Four kinds of answer, a reference model, a proxy reward
  const LEASH = { labels: ['vague', 'helpful', 'rude', 'flattering'], ref: [0.5, 0.3, 0.15, 0.05], r: [0.2, 1.0, 0.0, 1.5] };
  LEASH.at = (beta) => RL.tilt(LEASH.ref, LEASH.r, beta);
  LEASH.frontier = RL.frontier(LEASH.ref, LEASH.r, Array.from({ length: 60 }, (_, i) => Math.exp(Math.log(8) - (i / 59) * (Math.log(8) - Math.log(0.04)))));
  // Chapter 9: DPO on infinite comparisons converges to the tilt
  const DPO = { beta: 0.5 };
  DPO.star = LEASH.at(DPO.beta);
  DPO.run = RL.dpoTrain(LEASH.ref, LEASH.r, DPO.beta, { steps: 6000, lr: 2 });
  // Chapter 10: a group of eight answers
  const GROUP = { r: [1, 0, 0, 1, 1, 0, 0, 0] };
  GROUP.adv = RL.groupAdvantages(GROUP.r);
  GROUP.kl = RL.klEstimators([0.4, 0.3, 0.2, 0.1], [0.35, 0.33, 0.2, 0.12]);
  // Chapter 11: pass@k for a toy base model and a toy sharpened model
  const PASS = (() => {
    // per-problem chance of a correct sample (toy): the RL model is sharper on
    // problems the base model can sometimes solve, and loses a few rare ones
    const base = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005];
    const rl = [0.99, 0.95, 0.85, 0.6, 0.4, 0.15, 0.03, 0, 0, 0];
    const ks = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    const curve = (ps) => ks.map((k) => [k, RL.sum(ps.map((p) => RL.passAtKExact(p, k))) / ps.length]);
    return { ks, base: curve(base), rl: curve(rl) };
  })();

  const f2 = (x) => x.toFixed(2);
  const f3 = (x) => x.toFixed(3);

  /* =========================================================== kit */
  function kit(S) {
    const H = (m) => m.hidden();
    const k = {};
    k.txt = (str, o = {}) => H(new Text(str, o));
    k.tex = (t, o = {}) => H(new Tex(t, o));
    k.head = (str, o = {}) => H(new Text(str, Object.assign({ size: 76 }, o)));
    k.title = (str, o = {}) => H(new Text(str, Object.assign({ size: 54, color: C.GREY_B }, o))).at(0, -455);
    k.creature = (o = {}) => H(new Creature(o));
    k.bubble = (str, o = {}) => H(new Bubble(str, o));
    k.line = (x1, y1, x2, y2, o = {}) => H(new Line(x1, y1, x2, y2, o));
    k.arrow = (x1, y1, x2, y2, o = {}) => H(new Arrow(x1, y1, x2, y2, o));
    k.circle = (r, o) => H(circle(r, o));
    k.rect = (w, h, o) => H(rect(w, h, o));
    k.dot = (r, color) => H(dot(r, color));
    k.path = (d, o) => H(path(d, o));
    k.group = (...m) => H(new Group(...m));
    k.box = (label, { w = 360, h = 110, color = C.BLUE, size = 38, fill = null, textColor = C.WHITE, sub = null, font } = {}) => {
      const r = rect(w, h, { stroke: color, width: 3, fill: fill || mix(C.BG, color, 0.14), rx: 10 });
      const t = new Text(label, { size, color: textColor, font });
      const g = new Group(r, t);
      if (sub) {
        t.at(0, -h * 0.15);
        g.add(new Text(sub, { size: Math.max(30, size * 0.66), color: C.GREY_B }).at(0, h * 0.24));
      }
      g.rect = r;
      g.label = t;
      return H(g);
    };
    k.check = (size = 40, color = C.GREEN) => H(path(`M ${-size * 0.5} 0 L ${-size * 0.12} ${size * 0.38} L ${size * 0.55} ${-size * 0.45}`, { stroke: color, width: Math.max(4, size / 7) }));
    k.cross = (size = 40, color = C.RED) => H(path(`M ${-size / 2} ${-size / 2} L ${size / 2} ${size / 2} M ${size / 2} ${-size / 2} L ${-size / 2} ${size / 2}`, { stroke: color, width: Math.max(4, size / 7) }));
    k.axes = ({ x0 = 0, x1 = 1, y0 = 0, y1 = 1, w = 900, h = 520, logx = false, logy = false, xticks = [], yticks = [], xlabel = '', ylabel = '', size = 30, xfmt = (v) => String(v), yfmt = (v) => String(v) } = {}) => {
      const g = new Group();
      const tx = (x) => (logx ? Math.log10(x) : x);
      const ty = (y) => (logy ? Math.log10(y) : y);
      const fx = (x) => ((tx(x) - tx(x0)) / (tx(x1) - tx(x0))) * w - w / 2;
      const fy = (y) => h / 2 - ((ty(y) - ty(y0)) / (ty(y1) - ty(y0))) * h;
      g.add(new Line(-w / 2, h / 2, w / 2 + 20, h / 2, { stroke: C.GREY_B, width: 3 }), new Line(-w / 2, h / 2, -w / 2, -h / 2 - 20, { stroke: C.GREY_B, width: 3 }));
      xticks.forEach((v) => {
        g.add(new Line(fx(v), h / 2, fx(v), h / 2 + 12, { stroke: C.GREY_B, width: 3 }));
        g.add(new Text(xfmt(v), { size, color: C.GREY_B }).at(fx(v), h / 2 + 40));
      });
      yticks.forEach((v) => {
        g.add(new Line(-w / 2 - 12, fy(v), -w / 2, fy(v), { stroke: C.GREY_B, width: 3 }));
        g.add(new Text(yfmt(v), { size, color: C.GREY_B, anchor: 'end' }).at(-w / 2 - 22, fy(v)));
      });
      if (xlabel) g.add(new Text(xlabel, { size: size + 2, color: C.GREY_B, anchor: 'end' }).at(w / 2 + 20, h / 2 - 28));
      if (ylabel) g.add(new Text(ylabel, { size: size + 2, color: C.GREY_B, anchor: 'start' }).at(-w / 2 - 10, -h / 2 - 52));
      g.fx = fx;
      g.fy = fy;
      g.plot = (fn, { color = C.BLUE, width = 6, samples = 160, from = x0, to = x1, dash = null } = {}) => {
        const pts = [];
        for (let i = 0; i <= samples; i++) {
          const x = logx ? Math.pow(10, Math.log10(from) + (i / samples) * (Math.log10(to) - Math.log10(from))) : from + (i / samples) * (to - from);
          pts.push([fx(x), fy(fn(x))]);
        }
        const p = path(polyPath(pts), { stroke: color, width, dash });
        p.init.draw = 0;
        p.init.o = 0;
        g.add(p);
        return p;
      };
      g.polyline = (pts, { color = C.BLUE, width = 6, dash = null } = {}) => {
        const p = path(polyPath(pts.map(([x, y]) => [fx(x), fy(y)])), { stroke: color, width, dash });
        p.init.draw = 0;
        p.init.o = 0;
        g.add(p);
        return p;
      };
      return H(g);
    };
    /*
     * Probability bars: the film's recurring picture of a policy. One bar per
     * answer (or token), height = probability. bars.to(values) animates to a
     * new distribution and counts the printed values along.
     */
    k.bars = ({ labels, values, w = 120, gap = 70, h = 360, color = C.BLUE, colors = null, labelSize = 40, valueSize = 32, fmt = f2, labelFont = 'mono', showValues = true } = {}) => {
      const n = labels.length;
      const step = w + gap;
      const xs = labels.map((_, i) => (i - (n - 1) / 2) * step);
      const g = new Group(new Line(xs[0] - w / 2 - 30, 0, xs[n - 1] + w / 2 + 30, 0, { stroke: C.GREY_B, width: 3 }));
      const cur = values.slice();
      const bars = xs.map((x, i) => {
        const b = new Line(x, 0, x, -h * values[i], { stroke: colors ? colors[i] : color, width: (w - 2.2) / 0.8 });
        b.s.setAttribute('stroke-linecap', 'butt');
        // a bar's width is part of the picture: it scales with the frame
        b.s.removeAttribute('vector-effect');
        g.add(b);
        return b;
      });
      const vals = xs.map((x, i) => {
        const t = new Text(fmt(values[i]), { size: valueSize, color: C.GREY_B }).at(x, -h * values[i] - 30);
        if (!showValues) t.init.o = 0;
        g.add(t);
        return t;
      });
      const labs = xs.map((x, i) => {
        const t = new Text(labels[i], { size: labelSize, font: labelFont, color: colors ? colors[i] : C.WHITE }).at(x, 44);
        g.add(t);
        return t;
      });
      Object.assign(g, { bars, vals, labs, xs, h, w, cur });
      g.top = (i) => [xs[i], -h * cur[i]];
      g.to = (nv, dur = 1.2) => {
        const from = cur.slice();
        nv.forEach((v, i) => (cur[i] = v));
        return par(
          bars.map((b, i) => A.Set(b, { y2: -h * nv[i] }, dur)),
          vals.map((t, i) => par(A.Set(t, { y: -h * nv[i] - 30 }, dur), A.Count(t, from[i], nv[i], fmt, dur)))
        );
      };
      return H(g);
    };
    // one bar growing from a baseline (negative heights grow downwards)
    k.bar = (x, base, h, color, width = 40) => {
      const b = new Line(x, base, x, base - h, { stroke: color, width: (width - 2.2) / 0.8 });
      b.s.setAttribute('stroke-linecap', 'butt');
      b.s.removeAttribute('vector-effect');
      b.init.draw = 0;
      return H(b);
    };
    // a row of token boxes (monospace), centred on the origin
    k.tokens = (list, { size = 40, gap = 12, pad = 14, color = C.WHITE, stroke = C.GREY, fill = C.GREY_E, colors = null } = {}) => {
      const cw = size * 0.6;
      const widths = list.map((t) => Math.max(t.length, 1) * cw + 2 * pad);
      const total = widths.reduce((s, x) => s + x, 0) + gap * (list.length - 1);
      let x0 = -total / 2;
      const g = new Group();
      g.items = list.map((t, i) => {
        const w = widths[i];
        const cx = x0 + w / 2;
        x0 += w + gap;
        const r = rect(w, size * 1.7, { stroke: colors ? colors[i] : stroke, width: 2.5, fill, rx: 8 });
        const tx = new Text(t, { size, font: 'mono', color: colors ? colors[i] : color });
        const item = new Group(r, tx).at(cx, 0);
        g.add(item);
        return { item, rect: r, text: tx, x: cx, w };
      });
      g.width = total;
      return H(g);
    };
    k.quote = (str, who, { size = 40, y = 0, width = 1400 } = {}) => {
      const words = str.split(' ');
      const lines = [];
      let cur = '';
      const maxChars = Math.floor(width / (size * 0.48));
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) {
          lines.push(cur.trim());
          cur = w;
        } else cur += ' ' + w;
      }
      if (cur.trim()) lines.push(cur.trim());
      const g = new Group();
      lines.forEach((ln, i) => g.add(new Text((i === 0 ? '“' : '') + ln + (i === lines.length - 1 ? '”' : ''), { size, italic: true }).at(0, (i - (lines.length - 1) / 2) * size * 1.35)));
      if (who) g.add(new Text(who, { size: Math.max(30, size * 0.72), color: C.GREY_B }).at(0, ((lines.length + 1) / 2) * size * 1.35 + 10));
      g.at(0, y);
      return H(g);
    };
    k.tag = (str, { color = C.GREY_B, size = 30 } = {}) => H(new Text(str, { size, color, font: 'mono' }));
    k.zoomTo = (m, frag, z = 2.2, dur = 1.6) => S.camTarget(() => {
      const b = m.fragBox(frag);
      return { cx: m.p.x + m.p.s * b.cx, cy: m.p.y + m.p.s * b.cy, z };
    }, dur);
    k.pullBack = (dur = 1.4) => S.cam(0, 0, 1, dur);
    k.toTitle = (m, y = -450, s = 0.68) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s));
    k.lens = () => S.fixed(new MV.Lens({ r: 1150 }));
    // a framed note in a corner of a formula, used for term tours
    k.note = (str, { color = C.YELLOW, size = 36 } = {}) => H(new Text(str, { size, color }));
    k.toy = (x, y) => H(new Text('toy numbers', { size: 30, color: C.GREY, italic: true })).at(x, y);
    return k;
  }

  /* =========================================================== chapter cards */
  function card(n, title) {
    video.scene(`card${n}`, title, (S) => {
      S.still();
      const kick = S.add(S.txt(`Chapter ${n}`, { size: 40, color: C.GREY_B }).at(0, -90));
      const t = S.add(S.txt(title, { size: 84 }).at(0, 0));
      const rule = S.add(S.line(-160, 80, 160, 80, { stroke: C.BLUE, width: 4 }).with({ draw: 0 }));
      S.silent(A.FadeIn(kick, { dur: 0.5, dy: -20 }), A.Write(t, 1.2), A.Create(rule, 0.6), wait(0.6));
    });
  }

  /* =========================================================== the chapters */
  const ctx = { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix,
    video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS };
  for (const part of FILM.parts) part(ctx);

  /* =========================================================== papers on screen */
  // A beat marked S.paper(key) shows that paper's title, small, bottom-left;
  // the page lists the full references (papers.js) in order of appearance.
  video.sources = [];
  video.after((v) => {
    v.sources.length = 0;
    for (const b of v.beats) {
      if (!b.paper) continue;
      const rec = FILM.papers[b.paper];
      if (!rec) throw new Error(`unknown paper ${b.paper} at ${b.id}`);
      v.sources.push(Object.assign({ key: b.paper, from: b.id }, rec));
    }
  });
  paperOverlay(video);

  function paperOverlay(v) {
    const g = MV.el('g');
    const wrap = (str, max) => {
      const lines = [];
      let cur = '';
      for (const w of str.split(' ')) {
        if (cur && (cur + ' ' + w).length > max) {
          lines.push(cur);
          cur = w;
        } else cur = cur ? cur + ' ' + w : w;
      }
      if (cur) lines.push(cur);
      return lines;
    };
    let tags = null;
    const makeTags = () => v.sources.map((ins) => {
      const tg = MV.el('g', { opacity: 0 });
      const lines = wrap(ins.title, ins.wrap || 22);
      const lh = 36;
      const top = 486 - (lines.length - 1) * lh;
      tg.appendChild(MV.el('path', { d: `M -892 ${top - 22} h 22 l 10 10 v 30 h -32 z`, fill: 'none', stroke: C.GREY_B, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      lines.forEach((ln, i) => {
        const t = MV.el('text', { x: -846, y: top + i * lh, 'dominant-baseline': 'central', 'font-family': MV.FONTS.serif, 'font-style': 'italic', 'font-size': 30, fill: C.GREY_B });
        t.textContent = ln;
        tg.appendChild(t);
      });
      g.appendChild(tg);
      return { ins, tg, last: -1 };
    });
    let spans = null;
    v.overlay({
      el: g,
      render(t) {
        if (!spans) {
          tags = makeTags();
          spans = tags.map((x) => {
            const a = v.beat(x.ins.from);
            const b = v.beat(x.ins.to || x.ins.from);
            return { x, t0: a.start + (x.ins.delay ?? 0.4), t1: b.start + b.dur - 0.2 };
          });
        }
        for (const { x, t0, t1 } of spans) {
          const o = Math.max(0, Math.min(1, (t - t0) / 0.6)) * Math.max(0, Math.min(1, (t1 - t) / 0.5));
          if (Math.abs(o - x.last) > 0.001) {
            x.tg.setAttribute('opacity', o.toFixed(3));
            x.last = o;
          }
        }
      },
    });
  }


  return video;
};
