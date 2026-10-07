/*
 * The Gradient of Reward: the script.
 *
 * Each scene is a list of beats: one narration line plus the animations that
 * play while it is spoken. Every number on screen comes from the kernel
 * (src/js/rl.js), computed here when the page loads. Toy examples are
 * labelled as toy on screen.
 */
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

  /* =========================================================== OPEN */
  video.chapter('ch0', 'The question');
  video.scene('open', 'How do you take the gradient of a sample?', (S) => {
    const model = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 1.1 }).at(-560, 140));
    const prompt = S.add(S.box('What is 17 × 3?', { w: 520, h: 100, color: C.GREY_B, size: 46 }).at(-560, -200));
    const a1 = S.add(S.bubble('51', { size: 54 }).at(-180, -10));
    const a2 = S.add(S.bubble('41', { size: 54 }).at(-180, 250));
    const ok = S.add(S.check(54).at(-60, -10));
    const no = S.add(S.cross(48).at(-60, 250));
    S.beat('Here is a language model answering a question. What is seventeen times three? It says fifty-one. Ask again, and it might say forty-one.',
      A.FadeIn(model, { dy: 30 }), A.FadeIn(prompt, { dy: -20 }), A.FadeIn(a1), A.Write(a1.text, 0.5), A.Create(ok, 0.5), wait(1.2), A.FadeIn(a2), A.Write(a2.text, 0.5), A.Create(no, 0.5), A.Mood(model, 0.1),
      { cap: 'Here is a language model answering a question. What is 17 × 3? It says 51. Ask again, and it might say 41.' });
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 420 }).at(470, 180));
    const up = S.add(S.arrow(470 + bars.xs[0] - 110, 180 - 420 * BAND.pi[0] + 40, 470 + bars.xs[0] - 110, 180 - 420 * BAND.pi[0] - 120, { color: C.GREEN, width: 6 }));
    S.beat('Both answers came out of the same probabilities. Training will change those probabilities, so that the good answer becomes more likely.',
      A.FadeIn(bars, { dx: 40 }), A.Arrow(up, 0.8), bars.to([0.72, 0.18, 0.1], 1.6), A.Set(up, { y1: 180 - 420 * 0.72 + 40, y2: 180 - 420 * 0.72 - 120 }, 1.6));
    const chain = [
      S.add(S.tex('\\theta', { size: 90, color: C.YELLOW }).at(-720, -40)),
      S.add(S.box('model', { w: 230, h: 110, color: C.TEAL, size: 44 }).at(-430, -40)),
      S.add(S.box('sample', { w: 230, h: 110, color: C.GREY_B, size: 44 }).at(-110, -40)),
      S.add(S.box('text', { w: 200, h: 110, color: C.WHITE, size: 44 }).at(190, -40)),
      S.add(S.box('judge', { w: 220, h: 110, color: C.GOLD, size: 44 }).at(480, -40)),
      S.add(S.tex('R', { size: 90, color: C.GOLD }).at(740, -40)),
    ];
    const links = [[-670, -540], [-310, -230], [10, 85], [295, 365], [595, 690]].map(([x1, x2]) => S.add(S.arrow(x1, -40, x2, -40, { color: C.GREY_B, width: 4 })));
    const back = S.add(S.path('M 740 40 C 600 260 -560 260 -720 40', { stroke: C.RED, width: 4, dash: '16 14' }).with({ draw: 0 }));
    const q = S.add(S.tex('\\frac{\\partial R}{\\partial \\theta}\\;?', { size: 80, color: C.RED }).at(0, 300));
    const dice = S.add(S.txt('random, discrete', { size: 34, color: C.GREY_B, italic: true }).at(-110, -150));
    S.beat('That sounds like ordinary machine learning. But there is a catch. The thing we want to increase, the reward, is not a smooth function of the model’s weights. It is a judge looking at a sampled piece of text.',
      par([model, prompt, a1, a2, ok, no, bars, up].map((m) => A.FadeOut(m, { dur: 0.6 }))), lag(0.25, chain.map((m, i) => seq(A.FadeIn(m, { dur: 0.5, dx: -20 }), i < links.length ? A.Arrow(links[i], 0.35) : wait(0)))), A.FadeIn(dice), A.Create(back, 1.2), A.Write(q, 1));
    const big = S.add(S.tex('\\nabla_\\theta\\, \\mathbb{E}\\big[\\,R\\,\\big] \\;=\\; ?', { size: 120 }).at(0, -20));
    S.beat('So how do you take the gradient of something you can only sample? That one question is the whole subject of reinforcement learning for language models.',
      par([...chain, ...links, back, q, dice].map((m) => A.FadeOut(m, { dur: 0.6 }))), A.Write(big, 1.6));
    const title = S.add(S.head('The Gradient of Reward', { size: 108 }).at(0, -80));
    const sub = S.add(S.txt('the mathematics of reinforcement learning for language models, from first principles', { size: 36, color: C.GREY_B }).at(0, 20));
    const methods = ['softmax', 'REINFORCE', 'baselines', 'GAE', 'PPO', 'reward models', 'KL', 'DPO', 'GRPO'];
    const ms = methods.map((m, i) => S.add(S.txt(m, { size: 34, color: [C.BLUE, C.TEAL, C.GREEN, C.GREEN, C.YELLOW, C.GOLD, C.ORANGE, C.RED, C.PINK][i], font: 'mono' }).at(-760 + i * 190, 190)));
    S.beat('This is The Gradient of Reward. We will build it from first principles: from one softmax, all the way to P P O, D P O, and G R P O, the methods used to train today’s assistants and reasoning models.',
      A.FadeOut(big, { dur: 0.6 }), A.Write(title, 1.6), A.FadeIn(sub, { dy: 20 }), lag(0.2, ms.map((m) => A.FadeIn(m, { dy: 20, dur: 0.5 }))),
      { cap: 'This is The Gradient of Reward. We will build it from first principles: from one softmax, all the way to PPO, DPO and GRPO, the methods used to train today’s assistants and reasoning models.' });
  });

  /* =========================================================== CHAPTER 1 */
  video.chapter('ch1', 'A language model is a policy');
  card(1, 'A language model is a policy');

  video.scene('tokens', 'Tokens, logits, softmax', (S) => {
    const h = S.add(S.head('What does a language model compute?'));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 56 }).at(0, 30));
    S.beat('First, what does a language model actually compute? It reads text as tokens: words, pieces of words, numbers, punctuation.',
      A.Write(h, 1.4), S.toTitle(h), A.Show(toks), lag(0.2, toks.items.map((t) => A.FadeIn(t.item, { dy: 20, dur: 0.5 }))));
    const ctx = S.add(S.tokens(['The', 'answer', 'is'], { size: 44 }).at(-560, -60));
    const net = S.add(S.box('network', { w: 300, h: 160, color: C.TEAL, size: 46, sub: 'weights θ' }).at(-560, 170));
    const a0 = S.add(S.arrow(-560, -10, -560, 80, { color: C.GREY_B, width: 4 }));
    const logitRows = NEXT.labels.map((lab, i) => S.add(S.group(new Text(lab, { size: 40, font: 'mono' }).at(-120, 0), new Text(NEXT.z[i].toFixed(2), { size: 40, font: 'mono', color: C.YELLOW, anchor: 'end' }).at(120, 0)).at(120, -200 + i * 80)));
    const lhead = S.add(S.txt('logits', { size: 40, color: C.YELLOW }).at(120, -290));
    const a1 = S.add(S.arrow(-400, 170, -60, 0, { color: C.GREY_B, width: 4 }));
    const vocab = S.add(S.txt('one per token in the vocabulary: often more than 100,000', { size: 34, color: C.GREY_B }).at(120, 230));
    S.beat('Given the tokens so far, it outputs one number for every token in its vocabulary, often more than a hundred thousand of them. These numbers are called logits.',
      A.FadeOut(toks), A.FadeIn(ctx, { dy: -20 }), A.Arrow(a0, 0.4), A.FadeIn(net), A.Arrow(a1, 0.5), A.FadeIn(lhead), lag(0.15, logitRows.map((r) => A.FadeIn(r, { dx: -20, dur: 0.4 }))), A.FadeIn(vocab));
    const sm = S.add(S.tex('\\pi_\\theta(a \\mid \\text{context}) \\;=\\; \\frac{\\class{f-num}{e^{z_a}}}{\\class{f-den}{\\sum_{b} e^{z_b}}}', { size: 80 }).at(0, -250));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, h: 400, w: 120, gap: 80, colors: [C.GREEN, C.RED, C.RED, C.YELLOW, C.GREY] }).at(0, 300));
    S.beat('The softmax turns logits into probabilities: exponentiate each one, then divide by the total. Big logits get most of the mass, and everything adds up to one.',
      par([ctx, net, a0, a1, ...logitRows, lhead, vocab].map((m) => A.FadeOut(m))), A.Write(sm, 1.6), A.Focus(sm, 'num', { color: C.YELLOW }), wait(0.6), A.Focus(sm, 'den', { color: C.TEAL }), A.Unfocus(sm), A.FadeIn(bars, { dy: 30 }));
    const ctx2 = S.add(S.txt('after “The answer is”', { size: 38, color: C.GREY_B, italic: true }).at(-560, -120));
    const toyL = S.add(S.toy(640, -120));
    S.beat('Here is the distribution for the next token after the words, the answer is. Fifty-one gets about half the mass. Forty-one, fifty-four, and the rest share the remainder.',
      A.FadeIn(ctx2), A.FadeIn(toyL), A.Indicate(bars.bars[0], { color: C.GREEN, scale: 1.04 }), A.Indicate(bars.vals[0], { color: C.GREEN, scale: 1.3 }),
      { cap: `Here is the distribution for the next token after the words “The answer is”. 51 gets about half the mass (${f2(NEXT.p[0])}). 41, 54 and the rest share the remainder.` });
  });

  video.scene('sequence', 'A sentence is a product', (S) => {
    const h = S.add(S.title('From tokens to answers'));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 52, gap: 56 }).at(0, -170));
    const probs = ANSWER.p.map((p, i) => S.add(S.txt(p.toFixed(2), { size: 40, color: C.YELLOW, font: 'mono' }).at(toks.items[i].x, -70)));
    const eq = S.add(S.tex('\\pi_\\theta(y \\mid x) \\;=\\; \\prod_{t} \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 76 }).at(0, 100));
    const prod = S.add(S.txt(`${ANSWER.p.map((p) => p.toFixed(2)).join(' × ')} = ${ANSWER.p.reduce((a, b) => a * b, 1).toFixed(3)}`, { size: 40, font: 'mono', color: C.YELLOW }).at(0, 260));
    S.beat('To write a whole answer, the model samples one token, appends it, and repeats. So the probability of a complete answer is a product: the probability of each token, given everything before it.',
      A.FadeIn(h), A.Show(toks), lag(0.35, toks.items.map((t, i) => par(A.FadeIn(t.item, { dur: 0.4, dx: -20 }), A.FadeIn(probs[i], { dur: 0.4 })))), A.Write(eq, 1.6), A.FadeIn(prod));
    const leq = S.add(S.tex('\\log \\pi_\\theta(y \\mid x) \\;=\\; \\sum_{t} \\log \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 76, color: C.WHITE }).at(0, 100));
    const logs = ANSWER.logp.map((l, i) => S.add(S.txt(l.toFixed(2), { size: 40, color: C.TEAL, font: 'mono' }).at(toks.items[i].x, -70)));
    const lsum = S.add(S.txt(`sum = ${ANSWER.total.toFixed(2)}`, { size: 44, font: 'mono', color: C.TEAL }).at(0, 260));
    const flow = S.add(S.txt('every gradient in this film flows through this sum', { size: 36, color: C.GREY_B, italic: true }).at(0, 340));
    S.beat('Products of many small numbers are awkward, so we take logarithms. The log-probability of an answer is the sum of the log-probabilities of its tokens. Remember this sum. It is where every gradient in this film will flow.',
      par(A.FadeOut(eq), A.FadeOut(prod)), A.Write(leq, 1.6), par(probs.map((p) => A.FadeOut(p, { dur: 0.4 }))), lag(0.15, logs.map((l) => A.FadeIn(l, { dur: 0.4 }))), A.FadeIn(lsum), A.FadeIn(flow, { dy: 10 }));
  });

  video.scene('mdp', 'States, actions, rewards', (S) => {
    const h = S.add(S.title('The language of reinforcement learning'));
    const agent = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.9 }).at(-560, 60));
    const world = S.add(S.box('world', { w: 300, h: 140, color: C.GREY_B, size: 46 }).at(500, 60));
    const act = S.add(S.arrow(-440, 0, 330, 0, { color: C.YELLOW, width: 5 }));
    const obs = S.add(S.arrow(330, 120, -440, 120, { color: C.BLUE, width: 5 }));
    const actL = S.add(S.txt('action', { size: 40, color: C.YELLOW }).at(-60, -40));
    const obsL = S.add(S.txt('new state, reward', { size: 40, color: C.BLUE }).at(-60, 165));
    S.beat('Now some vocabulary from reinforcement learning. An agent observes a state, chooses an action, and the world responds with a new state.',
      A.FadeIn(h), A.FadeIn(agent, { dx: -30 }), A.FadeIn(world, { dx: 30 }), A.Arrow(act, 0.8), A.FadeIn(actL), A.Arrow(obs, 0.8), A.FadeIn(obsL));
    const rows = [
      ['state', 'the prompt plus the text so far'],
      ['action', 'the next token'],
      ['transition', 'append the token (no randomness)'],
      ['policy πθ', 'the model’s next-token probabilities'],
      ['episode', 'one complete answer'],
      ['reward', 'a score for the finished answer'],
    ].map(([a, b], i) => S.add(S.group(new Text(a, { size: 42, color: [C.BLUE, C.YELLOW, C.GREY_B, C.TEAL, C.GREEN, C.GOLD][i], anchor: 'end' }).at(-120, 0), new Text(b, { size: 40, anchor: 'start' }).at(-80, 0)).at(0, -280 + i * 92)));
    S.beat('For a language model, the state is the prompt plus the text written so far. The action is the next token. And the world is very simple: it just appends that token.',
      par([agent, world, act, obs, actL, obsL].map((m) => A.FadeOut(m))), lag(0.9, rows.slice(0, 3).map((r) => A.FadeIn(r, { dx: -30 }))));
    S.beat('The model’s probabilities, as a rule for picking actions, are called a policy, written pi theta, where theta stands for all the weights. One finished answer is an episode.',
      lag(0.9, rows.slice(3, 5).map((r) => A.FadeIn(r, { dx: -30 }))), { cap: 'The model’s probabilities, as a rule for picking actions, are called a policy, written πθ, where θ stands for all the weights. One finished answer is an episode.' });
    const judges = [['a person', C.GOLD], ['a reward model', C.ORANGE], ['a program that checks', C.GREEN]].map(([t, col], i) => S.add(S.box(t, { w: 420, h: 90, color: col, size: 36 }).at(-470 + i * 470, 330)));
    S.beat('At the end of the episode, a judge hands out a reward: one number saying how good the answer was. It might come from a person, from a learned reward model, or from a program that checks the answer.',
      A.FadeIn(rows[5], { dx: -30 }), lag(0.4, judges.map((j) => A.FadeIn(j, { dy: 20 }))));
  });

  video.scene('objective', 'The objective', (S) => {
    const h = S.add(S.title('What we want'));
    const J = S.add(S.tex('J(\\theta) \\;=\\; \\class{f-x}{\\mathbb{E}_{x \\sim \\mathcal{D}}}\\; \\class{f-y}{\\mathbb{E}_{y \\sim \\pi_\\theta(\\cdot \\mid x)}}\\, \\big[\\, \\class{f-r}{R(x, y)} \\,\\big]', { size: 92 }).at(0, -60));
    S.beat('Our goal is to choose the weights that make the expected reward as large as possible: the average reward over prompts, and over answers sampled from the model.',
      A.FadeIn(h), A.Write(J, 2));
    const nR = S.add(S.note('the judge’s score', { color: C.GOLD }).at(470, 120));
    const nY = S.add(S.note('answers sampled from the model itself', { color: C.TEAL }).at(60, 200));
    const nX = S.add(S.note('prompts from a dataset', { color: C.BLUE }).at(-420, 120));
    const say = 'Read it from the inside out. R of x and y is the judge’s score. The answer y is drawn from the model itself, so changing theta changes which answers we see. And the prompt x is drawn from a set of prompts.';
    S.beat(say,
      seq(A.Focus(J, 'r', { color: C.GOLD }), A.FadeIn(nR)),
      seq(wait(Math.max(0, S.atWord(say, 'drawn') - 1.6)), A.Focus(J, 'y', { color: C.TEAL }), A.FadeIn(nY)),
      seq(wait(Math.max(0, S.atWord(say, 'prompt') - S.atWord(say, 'drawn') - 1.0)), A.Focus(J, 'x', { color: C.BLUE }), A.FadeIn(nX)),
      A.Unfocus(J), { cap: 'Read it from the inside out. R(x, y) is the judge’s score. The answer y is drawn from the model itself, so changing θ changes which answers we see. And the prompt x is drawn from a set of prompts.' });
  });

  /* =========================================================== CHAPTER 2 */
  video.chapter('ch2', 'Learning from a score');
  card(2, 'Learning from a score');

  video.scene('sft', 'Imitation first', (S) => {
    const h = S.add(S.head('Imitation'));
    const stages = [['pre-training', 'imitate text from the internet', C.BLUE], ['supervised fine-tuning', 'imitate answers written by people', C.TEAL]].map(([a, b, col], i) => S.add(S.box(a, { w: 760, h: 140, color: col, size: 46, sub: b }).at(-420 + i * 840, 0)));
    S.beat('Before reinforcement learning, a language model is trained by imitation. Pre-training imitates text from the internet. Supervised fine-tuning imitates answers written by people.',
      A.Write(h, 1), S.toTitle(h), lag(0.8, stages.map((s) => A.FadeIn(s, { dy: 30 }))));
    const L = S.add(S.tex('\\mathcal{L}_{\\text{SFT}}(\\theta) \\;=\\; -\\log \\pi_\\theta(y^\\star \\mid x) \\;=\\; -\\sum_t \\log \\pi_\\theta\\big(y^\\star_t \\mid x,\\, y^\\star_{<t}\\big)', { size: 66 }).at(0, -230));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, h: 380, colors: [C.GREEN, C.RED, C.RED, C.YELLOW, C.GREY] }).at(0, 260));
    const star = S.add(S.txt('demonstrated', { size: 34, color: C.GREEN }).at(bars.xs[0], 350));
    S.beat('Imitation has a simple loss: the negative log-probability of the demonstrated answer. Its gradient pushes up every token of the demonstration.',
      par(stages.map((s) => A.FadeOut(s))), A.Write(L, 2), A.FadeIn(bars), A.FadeIn(star), bars.to([0.8, 0.08, 0.05, 0.03, 0.04], 1.6));
    const limits = ['someone must write the right answer', 'it never sees its own mistakes', 'at best, it matches its teachers'].map((t, i) => S.add(S.group(S.cross(36).with({ o: 1 }), new Text(t, { size: 44, anchor: 'start' }).at(50, 0)).at(-420, -80 + i * 110)));
    S.beat('This works, and it is how assistants learn the shape of a good answer. But it has limits. It needs someone to write the right answer. It never sees its own mistakes. And it can, at best, match its teachers.',
      par(A.FadeOut(L), A.FadeOut(bars), A.FadeOut(star)), lag(1.1, limits.map((l) => A.FadeIn(l, { dx: -30 }))));
  });

  video.scene('judge', 'Judging is easier than writing', (S) => {
    const h = S.add(S.title('Judging is easier than writing'));
    const c1 = S.add(S.group(new Text('17 × 3 = 51', { size: 56, font: 'mono' }), S.check(50).with({ o: 1 }).at(260, 0)).at(-430, -60));
    const c2 = S.add(S.group(new Text('essay A', { size: 50 }).at(-130, 0), new Text('≻', { size: 60, color: C.GOLD }), new Text('essay B', { size: 50 }).at(130, 0)).at(430, -60));
    const l1 = S.add(S.txt('a program can check it', { size: 36, color: C.GREY_B }).at(-430, 40));
    const l2 = S.add(S.txt('a person can compare them', { size: 36, color: C.GREY_B }).at(430, 40));
    S.beat('Often it is far easier to judge an answer than to write one. A program can check that fifty-one is right. A person can say which of two essays is better. Reinforcement learning learns from exactly that kind of signal.',
      A.FadeIn(h), A.FadeIn(c1, { dy: 20 }), A.FadeIn(l1), wait(0.6), A.FadeIn(c2, { dy: 20 }), A.FadeIn(l2));
    const loop = [['sample', C.TEAL, -520], ['score', C.GOLD, 0], ['update', C.YELLOW, 520]].map(([t, col, x]) => S.add(S.box(t, { w: 300, h: 120, color: col, size: 48 }).at(x, 190)));
    const ar = [S.add(S.arrow(-360, 190, -160, 190, { color: C.GREY_B, width: 5 })), S.add(S.arrow(160, 190, 360, 190, { color: C.GREY_B, width: 5 })), S.add(S.path('M 520 260 C 400 350 -400 350 -520 260', { stroke: C.GREY_B, width: 4 }).with({ draw: 0 }))];
    S.beat('So here is the plan. The model samples its own answers. A judge scores them. And we change the weights so that high-scoring answers become more likely.',
      par(A.Shift(c1, 0, -120), A.Shift(c2, 0, -120), A.Shift(l1, 0, -120), A.Shift(l2, 0, -120)), lag(0.6, loop.map((b, i) => seq(A.FadeIn(b, { dy: 20, dur: 0.5 }), A.Create(ar[i], 0.6)))));
  });

  video.scene('obstacle', 'The obstacle', (S) => {
    const h = S.add(S.title('The obstacle'));
    const nodes = [['\\theta', C.YELLOW, -720], ['\\text{logits}', C.TEAL, -400], ['\\text{sample } y', C.GREY_B, -40], ['R(x,y)', C.GOLD, 360]].map(([t, col, x]) => S.add(S.tex(t, { size: 70, color: col }).at(x, -40)));
    const fw = [[-660, -500], [-280, -170], [100, 250]].map(([a, b]) => S.add(S.arrow(a, -40, b, -40, { color: C.GREY_B, width: 4 })));
    const die = S.add(S.rect(120, 120, { stroke: C.WHITE, width: 4, rx: 18 }).at(-40, 190));
    const pips = [[-30, -30], [30, 30], [0, 0]].map(([dx, dy]) => S.add(S.dot(10, C.WHITE).at(-40 + dx, 190 + dy)));
    const bw = [[250, 10]].map(([a, b]) => S.add(S.arrow(a, 40, b, 40, { color: C.RED, width: 4 })));
    const block = S.add(S.cross(60).at(-40, 40));
    const txt = S.add(S.txt('no smooth path from the weights to the score', { size: 42, color: C.RED }).at(0, 320));
    S.beat('Now the catch. To use gradient descent, we need the gradient of the expected reward with respect to theta. But the reward depends on theta only through a random choice of discrete tokens. There is no smooth path from the weights to the score that we can back-propagate through.',
      A.FadeIn(h), lag(0.3, nodes.map((n, i) => seq(A.FadeIn(n, { dur: 0.4 }), i < fw.length ? A.Arrow(fw[i], 0.4) : wait(0)))), A.FadeIn(die), lag(0.1, pips.map((p) => A.FadeIn(p, { dur: 0.2 }))), A.Arrow(bw[0], 0.6), A.Create(block, 0.5), A.FadeIn(txt),
      { cap: 'Now the catch. To use gradient descent we need the gradient of the expected reward with respect to θ. But the reward depends on θ only through a random choice of discrete tokens. There is no smooth path from the weights to the score to back-propagate through.' });
    const trick = S.add(S.head('the log-derivative trick', { size: 80, color: C.YELLOW }).at(0, 40));
    S.beat('The way around it is a single line of calculus, called the log-derivative trick. Let us derive it on the smallest possible example.',
      par([...nodes, ...fw, die, ...pips, ...bw, block, txt].map((m) => A.FadeOut(m))), A.Write(trick, 1.4));
  });

  /* =========================================================== CHAPTER 3 */
  video.chapter('ch3', 'The log-derivative trick');
  card(3, 'The log-derivative trick');

  video.scene('bandit', 'Three answers', (S) => {
    const h = S.add(S.title('The smallest example'));
    const q = S.add(S.box('What is 17 × 3?', { w: 520, h: 96, color: C.GREY_B, size: 44 }).at(0, -330));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-80, 170));
    const rs = BAND.r.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 38, color: C.GOLD }).at(-80 + bars.xs[i], 272)));
    S.beat('Strip everything away. One prompt, and just three possible answers: fifty-one, which is right; about fifty, which is close; and forty-one, which is wrong. Give them rewards one, zero point three, and zero.',
      A.FadeIn(h), A.FadeIn(q), A.FadeIn(bars, { dy: 30 }), lag(0.5, rs.map((r) => A.FadeIn(r, { dy: 10 }))),
      { cap: 'Strip everything away. One prompt, and just three possible answers: 51, which is right; about 50, which is close; and 41, which is wrong. Give them rewards 1, 0.3 and 0.' });
    const zs = BAND.z.map((z, i) => S.add(S.txt(`z = ${z.toFixed(1)}`, { size: 34, color: C.YELLOW, font: 'mono' }).at(-80 + bars.xs[i], 326)));
    const sm = S.add(S.tex('\\pi = \\operatorname{softmax}(z)', { size: 56, color: C.TEAL }).at(620, -150));
    S.beat('The model is now just three logits and a softmax. This setting, one choice and one reward, is called a bandit, after a row of slot machines.',
      lag(0.3, zs.map((z) => A.FadeIn(z))), A.Write(sm, 1));
    const Jt = S.add(S.tex(`J \\;=\\; \\sum_a \\pi_a\\, r_a \\;=\\; ${f2(BAND.pi[0])}\\cdot 1 + ${f2(BAND.pi[1])}\\cdot 0.3 + ${f2(BAND.pi[2])}\\cdot 0 \\;=\\; ${f2(BAND.J)}`, { size: 56 }).at(0, -280));
    S.beat(`The expected reward is a weighted average of the three rewards, weighted by the probabilities. Right now it is about zero point ${Math.round(BAND.J * 100)}.`,
      A.FadeOut(sm), A.FadeOut(q), A.Write(Jt, 2), { cap: `The expected reward is a weighted average of the three rewards, weighted by the probabilities. Right now it is about ${f2(BAND.J)}.` });
    const gArrows = BAND.grad.map((g, i) => {
      const [x, y] = [-80 + bars.xs[i] + 125, 170 - 380 * BAND.pi[i]];
      return S.add(S.arrow(x, y, x, y - g * 520, { color: g > 0 ? C.GREEN : C.RED, width: 6 }));
    });
    const gl = BAND.grad.map((g, i) => S.add(S.txt((g > 0 ? '+' : '') + f3(g), { size: 34, color: g > 0 ? C.GREEN : C.RED, font: 'mono', anchor: 'start' }).at(-80 + bars.xs[i] + 145, 170 - 380 * BAND.pi[i] - g * 520 + (g > 0 ? 10 : -10))));
    const ge = S.add(S.tex('\\frac{\\partial J}{\\partial z_b} \\;=\\; \\pi_b\\,(r_b - J)', { size: 60, color: C.WHITE }).at(620, -40));
    S.beat('Changing a logit changes the weights of that average. Here is the gradient, computed exactly: raise the logit of fifty-one, and lower the other two.',
      A.Write(ge, 1.2), lag(0.3, gArrows.map((a, i) => par(A.Arrow(a, 0.7), A.FadeIn(gl[i])))));
    const huge = S.add(S.txt('possible answers: more than atoms in the universe', { size: 44, color: C.RED }).at(0, -330));
    S.beat('But with a real model we cannot sum over every possible answer. There are more possible answers than atoms in the universe. We can only sample a few. So we need to write the gradient as an average over samples.',
      A.FadeOut(Jt), A.FadeIn(huge, { dy: -20 }));
  });

  video.scene('trick', 'Deriving the policy gradient', (S) => {
    const h = S.add(S.title('The log-derivative trick'));
    const l1 = S.add(S.tex('\\nabla_\\theta J \\;=\\; \\nabla_\\theta \\sum_a \\pi_\\theta(a)\\, r(a) \\;=\\; \\sum_a r(a)\\, \\class{f-g}{\\nabla_\\theta \\pi_\\theta(a)}', { size: 62 }).at(0, -270));
    S.beat('Here is the trick. Start from the gradient of the sum: the rewards, times the gradient of each probability.', A.FadeIn(h), A.Write(l1, 2));
    const l2 = S.add(S.tex('\\nabla_\\theta \\pi_\\theta(a) \\;=\\; \\pi_\\theta(a)\\, \\frac{\\nabla_\\theta \\pi_\\theta(a)}{\\pi_\\theta(a)} \\;=\\; \\pi_\\theta(a)\\, \\class{f-l}{\\nabla_\\theta \\log \\pi_\\theta(a)}', { size: 62 }).at(0, -105));
    S.beat('Now multiply and divide by the probability itself. The gradient of pi, divided by pi, is the gradient of log pi. That is just the chain rule for the logarithm.',
      A.Focus(l1, 'g', { color: C.YELLOW }), A.Write(l2, 2), A.Focus(l2, 'l', { color: C.TEAL }),
      { cap: 'Now multiply and divide by the probability itself. The gradient of π, divided by π, is the gradient of log π. That is just the chain rule for the logarithm.' });
    const l3 = S.add(S.tex('\\nabla_\\theta J \\;=\\; \\sum_a \\class{f-w}{\\pi_\\theta(a)}\\, r(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a) \\;=\\; \\class{f-e}{\\mathbb{E}_{a \\sim \\pi_\\theta}}\\big[\\, r(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a) \\,\\big]', { size: 58 }).at(0, 65));
    S.beat('Substitute, and the probabilities reappear as weights. A sum weighted by probabilities is an expectation. So the gradient of the expected reward is the expected value of reward, times the gradient of log pi.',
      A.Unfocus(l1), A.Unfocus(l2), A.Write(l3, 2.2), A.Focus(l3, 'w', { color: C.YELLOW }), wait(0.8), A.Focus(l3, 'e', { color: C.YELLOW }),
      { cap: 'Substitute, and the probabilities reappear as weights. A sum weighted by probabilities is an expectation. So the gradient of the expected reward is the expected value of reward times the gradient of log π.' });
    const est = S.add(S.tex('\\hat g \\;=\\; R(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a), \\qquad a \\sim \\pi_\\theta', { size: 76, color: C.YELLOW }).at(0, 260));
    const frame = S.add(S.rect(est.w + 90, 130, { stroke: C.YELLOW, width: 4, rx: 12 }).at(0, 260));
    S.beat('That is the policy gradient. And we can estimate it with samples: draw an answer from the model, score it, and multiply the score by the gradient of its log-probability.',
      A.Unfocus(l3), A.Write(est, 1.6), A.Create(frame, 0.8));
    const lens = S.lens();
    S.beat('Notice what is gone. The gradient never passes through the judge. We only need the reward as a plain number, and the gradient of the model’s own log-probability, which back-propagation computes as usual.',
      par(S.cam(0, 260, 1.7, 1.6), A.Set(lens, { o: 1, r: 520 }, 1.6)), wait(1.4), par(S.pullBack(1.4), A.Set(lens, { o: 0, r: 1150 }, 1.4)));
  });

  video.scene('meaning', 'What the gradient says', (S) => {
    const h = S.add(S.title('Reading the policy gradient'));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-300, 250));
    const est = S.add(S.tex('\\hat g = R(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a)', { size: 60, color: C.YELLOW }).at(520, -300));
    const pushes = BAND.r.map((r, i) => {
      const x = -300 + bars.xs[i];
      const y = 250 - 380 * BAND.pi[i] - 50;
      return S.add(S.arrow(x, y, x, y - 40 - 180 * r, { color: [C.GREEN, C.YELLOW, C.RED][i], width: 6 }));
    });
    const lab = BAND.r.map((r, i) => S.add(S.txt(`sampled: push × ${r}`, { size: 34, color: C.GREY_B }).at(-300 + bars.xs[i], 250 - 380 * BAND.pi[i] - 300 - 180 * r * 0.2)));
    S.beat('Read what it says. The gradient of log pi of an answer is the direction that makes that answer more likely. Each sample pushes its own probability up, by an amount proportional to its reward.',
      A.FadeIn(h), A.FadeIn(bars), A.FadeIn(est), lag(1.1, pushes.map((p, i) => par(A.Arrow(p, 0.6), A.FadeIn(lab[i]))) ),
      { cap: 'Read what it says. ∇ log π of an answer is the direction that makes that answer more likely. Each sample pushes its own probability up, by an amount proportional to its reward.' });
    const sc = S.add(S.tex('\\frac{\\partial \\log \\pi_a}{\\partial z_b} \\;=\\; \\mathbf{1}[a = b] \\;-\\; \\pi_b', { size: 60 }).at(470, -150));
    const sv = S.add(S.tex(`\\text{sample } 51:\\quad (1 - ${f2(BAND.pi[0])},\\; -${f2(BAND.pi[1])},\\; -${f2(BAND.pi[2])})`, { size: 42, color: C.TEAL }).at(470, -30));
    S.beat('For a softmax, that direction is beautifully simple. The gradient of log pi of a, with respect to the logits, is one for the chosen answer, minus the probability vector. Push up the chosen logit, and push every other logit down in proportion to how likely it was.',
      par(pushes.map((p) => A.FadeOut(p)), lab.map((l) => A.FadeOut(l))), A.Write(sc, 1.6), A.FadeIn(sv, { dy: 10 }),
      { cap: 'For a softmax that direction is simple: ∂ log π_a / ∂z_b = 1[a = b] − π_b. Push up the chosen logit, and push every other logit down in proportion to how likely it was.' });
  });

  video.scene('mc', 'Does it work?', (S) => {
    const h = S.add(S.title('Averaging samples'));
    const exact = BAND.grad[0];
    const ax = S.add(S.axes({ x0: 1, x1: 2000, y0: -0.2, y1: 0.6, w: 1240, h: 520, logx: true, xticks: [1, 10, 100, 1000], yticks: [-0.2, 0, 0.2, 0.4, 0.6], yfmt: (v) => v.toFixed(1), xlabel: 'samples', ylabel: 'estimate of ∂J/∂z for “51”' }).at(40, 30));
    const ex = ax.plot(() => exact, { color: C.YELLOW, width: 4, dash: '14 12', from: 1, to: 2000 });
    const run = ax.polyline(BAND.mc.filter((_, i) => i < 30 || i % 4 === 0), { color: C.BLUE, width: 5 });
    const exL = S.add(S.txt(`exact: ${f3(exact)}`, { size: 36, color: C.YELLOW }).at(560, 30 + ax.fy(exact) - 40));
    S.beat('Does it work? Here are samples, one at a time. Each single estimate points somewhere different. But their running average closes in on the exact gradient.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(ex, 0.8), A.FadeIn(exL), A.Create(run, 4));
    const tag = S.add(S.txt(`after 2,000 samples: ${f3(BAND.mc[1999][1])}`, { size: 36, color: C.BLUE }).at(-300, -230));
    S.beat('This estimator is called REINFORCE. Ronald Williams described it in nineteen ninety-two. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.',
      A.FadeIn(tag), { cap: 'This estimator is called REINFORCE. Ronald Williams described it in 1992. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.' });
  });

  video.scene('reinforce', 'REINFORCE for text', (S) => {
    const h = S.add(S.title('REINFORCE for language models'));
    const eq = S.add(S.tex('\\nabla_\\theta \\log \\pi_\\theta(y \\mid x) \\;=\\; \\sum_t \\nabla_\\theta \\log \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 72 }).at(0, -230));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 52 }).at(0, 60));
    const R = S.add(S.txt('reward R = 1', { size: 44, color: C.GOLD }).at(0, 300));
    const ups = toks.items.map((t) => S.add(S.arrow(t.x, 10, t.x, -70, { color: C.GREEN, width: 5 })));
    S.beat('For a language model, the answer is a sequence, and its log-probability is a sum over tokens. So the gradient of the log-probability is a sum too: every token in a sampled answer gets the same push, scaled by the answer’s reward.',
      A.FadeIn(h), A.Write(eq, 2), A.Show(toks), lag(0.15, toks.items.map((t) => A.FadeIn(t.item, { dur: 0.4 }))), A.FadeIn(R), lag(0.12, ups.map((u) => A.Arrow(u, 0.4))));
    const box = S.add(S.box('sample a response  →  score it  →  push up every token, × score', { w: 1500, h: 110, color: C.YELLOW, size: 42 }).at(0, -60));
    S.beat('That is REINFORCE for language models: sample a response, score it, and nudge up every token in it, in proportion to the score. Everything else in this film is about making this simple idea work well.',
      par(A.FadeOut(toks), ups.map((u) => A.FadeOut(u)), A.FadeOut(R)), A.FadeIn(box, { from: 0.85 }));
  });

  /* =========================================================== CHAPTERS 4 to 7 */
  /* =========================================================== CHAPTER 4 */
  video.chapter('ch4', 'Taming the noise');
  card(4, 'Taming the noise: baselines');

  video.scene('offset', 'A generous judge', (S) => {
    const h = S.add(S.title('A generous judge'));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-300, 170));
    const rs = BAND.r.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 38, color: C.GOLD }).at(-300 + bars.xs[i], 272)));
    S.beat('Simple, but noisy. Suppose the judge is generous: rewards of eleven, ten point three, and ten, instead of one, zero point three, and zero. Same ranking. Same differences. Only an offset of ten.',
      A.FadeIn(h), A.FadeIn(bars), lag(0.2, rs.map((r) => A.FadeIn(r))), wait(0.6), par(rs.map((r, i) => A.Count(r, BAND.r[i], R10[i], (v) => `reward ${(Math.round(v * 10) / 10).toFixed(R10[i] % 1 ? 1 : 0)}`, 1.4))), lag(0.2, rs.map((r) => A.Indicate(r, { color: C.GOLD, scale: 1.2 }))),
      { cap: 'Simple, but noisy. Suppose the judge is generous: rewards of 11, 10.3 and 10 instead of 1, 0.3 and 0. Same ranking. Same differences. Only an offset of 10.' });
    const ex = S.add(S.tex('\\nabla J \\text{ is unchanged}', { size: 56, color: C.GREEN }).at(560, -250));
    const big = S.add(S.arrow(-300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 60, -300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 330, { color: C.RED, width: 8 }));
    const bigL = S.add(S.txt('sampled 41: push up \u00d7 10', { size: 36, color: C.RED }).at(-300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 370));
    S.beat('The exact gradient does not change at all, because adding the same constant to every reward cannot change which answer is better. But now every sample pushes its own answer up, hard. Even the wrong answer, forty-one, gets a big push up.',
      A.Write(ex, 1), wait(1.4), A.Arrow(big, 0.8), A.FadeIn(bigL));
    const v1 = S.add(S.tex(`\\operatorname{Var}\\,\\hat g = ${VAR.plain.toFixed(2)}`, { size: 60 }).at(560, -60));
    const v2 = S.add(S.tex(`\\operatorname{Var}\\,\\hat g = ${VAR.off.toFixed(1)}`, { size: 60, color: C.RED }).at(560, 60));
    const l1 = S.add(S.txt('rewards 1, 0.3, 0', { size: 32, color: C.GREY_B }).at(560, -10));
    const l2 = S.add(S.txt('rewards 11, 10.3, 10', { size: 32, color: C.GREY_B }).at(560, 110));
    S.beat(`The pushes only cancel out on average. One sample at a time, the estimate swings wildly. Its total variance, computed exactly, goes from about zero point one six to about ${Math.round(VAR.off)}.`,
      A.FadeIn(v1), A.FadeIn(l1), wait(0.8), A.FadeIn(v2, { from: 1.4 }), A.FadeIn(l2),
      { cap: `The pushes only cancel out on average. One sample at a time, the estimate swings wildly. Its total variance, computed exactly, goes from ${VAR.plain.toFixed(2)} to ${VAR.off.toFixed(1)}.` });
  });

  video.scene('baseline', 'Subtract a baseline', (S) => {
    const h = S.add(S.title('Subtract a baseline'));
    const est = S.add(S.tex('\\hat g \\;=\\; \\big(R(a) - \\class{f-b}{b}\\big)\\, \\nabla_\\theta \\log \\pi_\\theta(a)', { size: 78, color: C.YELLOW }).at(0, -260));
    S.beat('The fix is to subtract a baseline: a number b that does not depend on which answer was sampled. Use reward minus b in place of reward.',
      A.FadeIn(h), A.Write(est, 1.8), A.Focus(est, 'b', { color: C.TEAL }));
    const z = S.add(S.tex('\\mathbb{E}_{a \\sim \\pi}\\big[\\nabla \\log \\pi(a)\\big] \\;=\\; \\sum_a \\pi(a)\\, \\frac{\\nabla \\pi(a)}{\\pi(a)} \\;=\\; \\sum_a \\nabla \\pi(a)', { size: 60 }).at(0, -110));
    const z2 = S.add(S.tex('\\;=\\; \\nabla \\sum_a \\pi(a) \\;=\\; \\nabla\\, 1 \\;=\\; 0', { size: 60 }).at(140, 20));
    S.beat('Why is that allowed? Because the gradient of log pi averages to zero. Its expectation is a sum of pi times gradient log pi, which is the sum of the gradients of the probabilities, which is the gradient of their total. And the total is always one. The gradient of one is zero.',
      A.Unfocus(est), A.Write(z, 3), A.Write(z2, 2), { cap: 'Why is that allowed? Because ∇ log π averages to zero: E[∇ log π] = Σ π ∇π/π = Σ ∇π = ∇ Σ π = ∇1 = 0.' });
    const u = S.add(S.tex('\\mathbb{E}\\big[(R - b)\\, \\nabla \\log \\pi\\big] \\;=\\; \\mathbb{E}\\big[R\\, \\nabla \\log \\pi\\big] \\;-\\; b \\cdot 0', { size: 62, color: C.GREEN }).at(0, 150));
    const any = S.add(S.txt('unbiased for any b; the noise is what changes', { size: 40, color: C.GREY_B }).at(0, 270));
    S.beat('So subtracting b, times something whose average is zero, changes nothing on average. The estimate stays unbiased, for any b. But the noise can shrink enormously.',
      A.Write(u, 1.8), A.FadeIn(any, { dy: 10 }));
  });

  video.scene('variance', 'The best baseline', (S) => {
    const h = S.add(S.title('How much noise, for each baseline?'));
    const varAt = (b) => RL.estimatorStats(BAND.z, R10, b).variance;
    const ax = S.add(S.axes({ x0: 8, x1: 13, y0: 0, y1: 4, w: 1180, h: 480, xticks: [8, 9, 10, 11, 12, 13], yticks: [0, 1, 2, 3, 4], xlabel: 'baseline b', ylabel: 'variance of the estimate' }).at(40, 30));
    const cv = ax.plot(varAt, { color: C.BLUE, width: 6, samples: 120 });
    const mean = S.add(S.line(40 + ax.fx(J10), 30 + ax.fy(0), 40 + ax.fx(J10), 30 + ax.fy(3.2), { stroke: C.YELLOW, width: 3, dash: '10 10' }));
    const meanL = S.add(S.txt(`mean reward ${f2(J10)}`, { size: 34, color: C.YELLOW }).at(40 + ax.fx(J10) + 150, 30 + ax.fy(3.4)));
    const best = S.add(S.dot(12, C.GREEN).at(40 + ax.fx(VAR.bStar), 30 + ax.fy(varAt(VAR.bStar))));
    const bestL = S.add(S.txt(`minimum at b = ${f2(VAR.bStar)}: ${f3(varAt(VAR.bStar))}`, { size: 34, color: C.GREEN }).at(40 + ax.fx(VAR.bStar) + 330, 30 + ax.fy(0.9)));
    S.beat(`Here is the variance of the estimate as a function of b. It is smallest near the average reward. The exact minimum is close by, and there the variance is below zero point one, down from about ${Math.round(VAR.off)} with no baseline at all.`,
      A.FadeIn(h), A.FadeIn(ax), A.Create(cv, 1.6), A.FadeIn(mean), A.FadeIn(meanL), A.FadeIn(best, { from: 2 }), A.FadeIn(bestL),
      { cap: `Here is the variance of the estimate as a function of b. It is smallest near the average reward (${f2(J10)}). The exact minimum, at b = ${f2(VAR.bStar)}, is ${f3(varAt(VAR.bStar))}, down from ${VAR.off.toFixed(1)} with no baseline.` });
  });

  video.scene('advantage', 'The advantage', (S) => {
    const h = S.add(S.title('The advantage'));
    const A0 = S.add(S.tex('A(a) \\;=\\; R(a) - b \\;\\approx\\; R(a) - \\mathbb{E}[R]', { size: 72, color: C.YELLOW }).at(0, -270));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-120, 170));
    const adv = R10.map((r) => r - J10);
    const arrows = adv.map((a, i) => {
      const x = -120 + bars.xs[i] + 125;
      const y = 170 - 380 * BAND.pi[i];
      return S.add(S.arrow(x, y, x, y - a * 400, { color: a > 0 ? C.GREEN : C.RED, width: 6 }));
    });
    const al = adv.map((a, i) => S.add(S.txt(`A = ${a > 0 ? '+' : ''}${f2(a)}`, { size: 34, color: a > 0 ? C.GREEN : C.RED, font: 'mono', anchor: 'start' }).at(-120 + bars.xs[i] + 145, 170 - 380 * BAND.pi[i] - a * 400 + (a > 0 ? 0 : 10))));
    S.beat('Reward minus baseline has a name: the advantage. It asks, was this answer better or worse than expected? Better than expected: push it up. Worse than expected: push it down.',
      A.FadeIn(h), A.Write(A0, 1.6), A.FadeIn(bars), lag(0.4, arrows.map((a, i) => par(A.Arrow(a, 0.6), A.FadeIn(al[i])))));
  });

  video.scene('training', 'Training with and without', (S) => {
    const h = S.add(S.title('Five answers, four samples a step, twenty runs'));
    const ax = S.add(S.axes({ x0: 0, x1: 80, y0: 0, y1: 1, w: 1240, h: 520, xticks: [0, 20, 40, 60, 80], yticks: [0, 0.5, 1], xlabel: 'training step', ylabel: 'probability of the best answer' }).at(40, 30));
    const none = ax.polyline(TRAIN.none, { color: C.RED, width: 6 });
    const loo = ax.polyline(TRAIN.loo, { color: C.GREEN, width: 6 });
    const nl = S.add(S.txt('no baseline', { size: 38, color: C.RED }).at(40 + ax.fx(60), 30 + ax.fy(TRAIN.none[60][1]) + 50));
    const ll = S.add(S.txt('leave-one-out baseline', { size: 38, color: C.GREEN }).at(40 + ax.fx(34), 30 + ax.fy(TRAIN.loo[34][1]) - 80));
    S.beat('Here is training on a slightly bigger problem: five answers, generous rewards, four samples per step, averaged over twenty runs. With a baseline, the policy finds the best answer much faster.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(none, 2.4), A.FadeIn(nl), A.Create(loo, 2.4), A.FadeIn(ll));
  });

  video.scene('baselines', 'Baselines for language models', (S) => {
    const h = S.add(S.title('Three baselines for language models'));
    const cards = [
      ['a critic', 'a second network predicts the expected reward', 'PPO', C.BLUE],
      ['the others', 'mean reward of the other answers to the same prompt', 'RLOO', C.TEAL],
      ['the group', 'normalize rewards within the group of answers', 'GRPO', C.PINK],
    ].map(([a, b, c, col], i) => S.add(S.group(
      rect(540, 300, { stroke: col, width: 3, fill: mix(C.BG, col, 0.1), rx: 14 }),
      new Text(a, { size: 50, color: col }).at(0, -90),
      new Text(b.split(' ').slice(0, 4).join(' '), { size: 32 }).at(0, -10),
      new Text(b.split(' ').slice(4).join(' '), { size: 32 }).at(0, 34),
      new Text(c, { size: 42, font: 'mono', color: col }).at(0, 104)
    ).at(-600 + i * 600, -20)));
    S.beat('For language models, three baselines are popular. Train a second network, a critic, to predict the expected reward. Or sample several answers to the same prompt, and use the average reward of the others. Or normalize the rewards within that group. These are the choices behind P P O, R L O O, and G R P O.',
      A.FadeIn(h), lag(1.6, cards.map((c) => A.FadeIn(c, { dy: 30 }))), { cap: 'For language models, three baselines are popular: a critic network that predicts the expected reward; the average reward of the other answers to the same prompt; or rewards normalized within that group. These are the choices behind PPO, RLOO and GRPO.' });
    const loo = S.add(S.tex('A_i \\;=\\; r_i \\;-\\; \\frac{1}{k-1} \\sum_{j \\ne i} r_j', { size: 76, color: C.TEAL }).at(0, 290));
    S.beat('The leave-one-out version is neat. For each answer, the baseline is the mean reward of the other answers to the same prompt. It never uses the answer\u2019s own reward, so it stays unbiased. Kool and colleagues proposed it in twenty nineteen, and in twenty twenty-four Ahmadian and colleagues found it outperformed P P O for learning from human feedback.',
      A.Indicate(cards[1], { color: C.TEAL, scale: 1.05 }), A.Write(loo, 1.6),
      { cap: 'The leave-one-out version: for each answer, the baseline is the mean reward of the other answers to the same prompt. It never uses the answer\u2019s own reward, so it stays unbiased. Kool et al. (2019) proposed it; Ahmadian et al. (2024) found it outperformed PPO for RLHF.' });
  });

  /* =========================================================== CHAPTER 5 */
  video.chapter('ch5', 'Credit assignment');
  card(5, 'Which token deserves the credit?');

  video.scene('credit', 'Credit over tokens', (S) => {
    const h = S.add(S.title('One reward, many tokens'));
    const toks = S.add(S.tokens(CREDIT.tokens, { size: 34, gap: 10, pad: 10 }).at(0, 120));
    const same = toks.items.map((t) => S.add(S.arrow(t.x, 70, t.x, 10, { color: C.GREEN, width: 4 })));
    const R = S.add(S.txt('reward 1, at the end', { size: 40, color: C.GOLD }).at(0, 260));
    S.beat('So far, every token in an answer gets the same push. That is crude. A long solution might go wrong in a single line, and yet every token is blamed equally.',
      A.FadeIn(h), A.Show(toks), lag(0.06, toks.items.map((t) => A.FadeIn(t.item, { dur: 0.3 }))), A.FadeIn(R), lag(0.05, same.map((a) => A.Arrow(a, 0.3))));
    const rtg = S.add(S.tex('\\hat G_t \\;=\\; \\sum_{t\' \\ge t} r_{t\'}', { size: 68, color: C.WHITE }).at(0, -250));
    S.beat('One easy improvement: a token can only affect what comes after it. So judge each token by the rewards that follow it, not the ones before. This is the reward to go. With a single reward at the very end, though, every token still sees the same number.',
      A.Write(rtg, 1.4), A.Indicate(R, { color: C.GOLD }));
    const ax = S.add(S.axes({ x0: 0, x1: CREDIT.tokens.length - 1, y0: 0, y1: 1, w: toks.width - 60, h: 240, yticks: [0, 0.5, 1], size: 30 }).at(0, -130));
    const vline = ax.polyline(CREDIT.V.map((v, i) => [i, v]), { color: C.BLUE, width: 6 });
    const vL = S.add(S.tex('V(s_t)', { size: 54, color: C.BLUE }).at(-toks.width / 2 - 40, -300));
    S.beat('To do better, ask at each point: from here, how much reward do we expect? That is the value function, V of the state. A critic network learns to predict it, from the text so far.',
      A.FadeOut(rtg), par(same.map((a) => A.FadeOut(a))), A.FadeIn(ax), A.FadeIn(vL), A.Create(vline, 2));
    const g0 = CREDIT.gae(0);
    const dBars = g0.deltas.map((d, i) => S.add(S.bar(toks.items[i].x, 320, d * 700, d >= 0 ? C.GREEN : C.RED, 30)));
    const dEq = S.add(S.tex('\\delta_t \\;=\\; r_t + \\gamma\\, V(s_{t+1}) - V(s_t)', { size: 54, color: C.YELLOW }).at(0, -375));
    S.beat('Now compare the critic\u2019s prediction before and after each token. If the value jumps up after a token, that token was a good move. Reward, plus the next value, minus the current value: this is the temporal-difference error, delta.',
      A.FadeOut(R), A.Write(dEq, 1.4), lag(0.08, dBars.map((b) => A.Create(b, 0.4))),
      { cap: 'Now compare the critic\u2019s prediction before and after each token. If the value jumps up after a token, that token was a good move. δ_t = r_t + γV(s_{t+1}) − V(s_t): the temporal-difference error.' });
  });

  video.scene('gae', 'Generalized advantage estimation', (S) => {
    const h = S.add(S.title('Generalized advantage estimation'));
    const eq = S.add(S.tex('\\hat A_t^{\\text{GAE}(\\gamma,\\lambda)} \\;=\\; \\sum_{l \\ge 0} (\\gamma \\lambda)^l\\, \\delta_{t+l}', { size: 76, color: C.YELLOW }).at(0, -270));
    S.beat('Delta uses one step, and trusts the critic for everything after. That is low in noise, but biased if the critic is wrong. The full return trusts nothing, but it is noisy. Generalized advantage estimation blends them: a sum of future deltas, discounted by gamma times lambda.',
      A.FadeIn(h), A.Write(eq, 2));
    const toks = S.add(S.tokens(CREDIT.tokens, { size: 30, gap: 8, pad: 8 }).at(0, 290));
    const lam = [0, 0.9, 1];
    const series = lam.map((l) => CREDIT.gae(l).adv);
    const base = 160;
    const bars = series[0].map((a, i) => S.add(S.bar(toks.items[i].x, base, a * 300, C.GREEN, 34)));
    const lbl = S.add(S.tex('\\lambda = 0', { size: 56, color: C.TEAL }).at(-640, -80));
    const lines = [S.add(S.line(-toks.width / 2, base, toks.width / 2, base, { stroke: C.GREY_B, width: 3 }))];
    S.beat('Lambda equal to zero gives the one-step delta. Lambda equal to one gives the full return minus the value. In between, you choose your trade-off between bias and noise. For language models, gamma is usually one.',
      A.Show(toks), lag(0.05, toks.items.map((t) => A.FadeIn(t.item, { dur: 0.3 }))), A.FadeIn(lines[0]), lag(0.05, bars.map((b) => A.Create(b, 0.4))), A.FadeIn(lbl), wait(0.8),
      par(bars.map((b, i) => A.Set(b, { y2: base - series[1][i] * 300 }, 1.2)), A.Set(lbl, { o: 0 }, 0.3)), wait(1.2),
      par(bars.map((b, i) => A.Set(b, { y2: base - series[2][i] * 300 }, 1.2))),
      { cap: 'λ = 0 gives the one-step δ. λ = 1 gives the full return minus the value. In between, you choose your trade-off between bias and noise. For language models, γ is usually 1.' });
    const l2 = S.add(S.tex('\\lambda = 1:\\;\\; \\hat A_t = R - V(s_t)', { size: 50, color: C.TEAL }).at(0, -150));
    const cost = S.add(S.txt('the critic is often as large as the policy: twice the memory', { size: 40, color: C.RED }).at(0, -70));
    S.beat('There is a catch: the critic is usually another network as large as the policy. That doubles the memory. Keep it in mind. Later methods will find ways to drop it.',
      A.FadeIn(l2), A.FadeIn(cost, { dy: 10 }));
    const prm = S.add(S.box('process supervision: grade every step', { w: 1000, h: 100, color: C.GOLD, size: 40 }).at(0, -110));
    S.beat('Another route to finer credit is to have the judge grade each step, not just the final answer. In Let\u2019s Verify Step by Step, Open A I collected eight hundred thousand step-level labels, and a process reward model picked correct solutions more often than one that judged outcomes alone.',
      A.FadeOut(cost), A.FadeOut(l2), A.FadeIn(prm, { dy: -20 }),
      { cap: 'Another route to finer credit: have the judge grade each step. In Let\u2019s Verify Step by Step, OpenAI collected 800K step-level labels; a process reward model picked correct solutions more often than an outcome model (78.2% vs 72.4%, best-of-1860, on a MATH subset).' });
  });

  /* =========================================================== CHAPTER 6 */
  video.chapter('ch6', 'Small steps: PPO');
  card(6, 'Small steps: trust regions and PPO');

  video.scene('steps', 'How far to step', (S) => {
    const h = S.add(S.title('How far should we step?'));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, h: 420, w: 130, gap: 90, colors: [C.GREEN, C.RED, C.RED, C.YELLOW, C.GREY] }).at(0, 230));
    S.beat('Now we can estimate a direction. But how far should we step? A gradient describes the policy only nearby. Step too far, and the policy can collapse: probability piles onto a few strange answers, and the samples that guided the step no longer describe the new policy.',
      A.FadeIn(h), A.FadeIn(bars), wait(2.5), bars.to([0.05, 0.02, 0.01, 0.02, 0.9], 1.4), A.Indicate(bars.bars[4], { color: C.RED, scale: 1.02 }));
    const reuse = S.add(S.txt('reuse each batch for several updates?', { size: 44, color: C.YELLOW }).at(0, -250));
    S.beat('Sampling is also expensive. We would like to reuse each batch of answers for several updates. But after the first update, those samples come from an older policy.',
      bars.to(NEXT.p, 1), A.FadeIn(reuse, { dy: -20 }));
  });

  video.scene('ratio', 'Importance ratios', (S) => {
    const h = S.add(S.title('Importance sampling'));
    const is = S.add(S.tex('\\mathbb{E}_{a \\sim \\pi_\\theta}\\big[A(a)\\big] \\;=\\; \\mathbb{E}_{a \\sim \\pi_{\\text{old}}}\\Big[\\, \\class{f-r}{\\frac{\\pi_\\theta(a)}{\\pi_{\\text{old}}(a)}}\\, A(a) \\Big]', { size: 72 }).at(0, -250));
    const rr = S.add(S.tex('r(\\theta) \\;=\\; \\frac{\\pi_\\theta(a)}{\\pi_{\\text{old}}(a)}', { size: 66, color: C.YELLOW }).at(0, -60));
    S.beat('Importance sampling fixes the bookkeeping. To average something under the new policy, using samples from the old one, weight each sample by the ratio of the two probabilities: new over old.',
      A.FadeIn(h), A.Write(is, 2), A.Focus(is, 'r', { color: C.YELLOW }), A.Write(rr, 1));
    const sur = S.add(S.tex('L(\\theta) = \\mathbb{E}_{\\text{old}}\\big[\\, r(\\theta)\\, A \\,\\big], \\qquad \\nabla L\\,\\big|_{\\theta = \\theta_{\\text{old}}} = \\mathbb{E}\\big[A\\, \\nabla \\log \\pi_\\theta\\big]', { size: 58 }).at(0, 120));
    S.beat('The surrogate objective, ratio times advantage, has exactly the policy gradient as its gradient at the start, where the ratio is one. But the further the ratio drifts, the less we should trust the old samples.',
      A.Unfocus(is), A.Write(sur, 2));
    const trpo = S.add(S.tex('\\max_\\theta\\; \\mathbb{E}\\big[r(\\theta)\\, A\\big] \\quad \\text{subject to} \\quad \\mathbb{E}\\big[\\mathrm{KL}(\\pi_{\\text{old}} \\,\\|\\, \\pi_\\theta)\\big] \\le \\delta', { size: 58, color: C.TEAL }).at(0, 280));
    S.beat('Trust region policy optimization, T R P O, adds a constraint: maximize the surrogate, but keep the average K L divergence between the old and new policies below a small number, delta.',
      A.Write(trpo, 2), { cap: 'Trust region policy optimization (TRPO) adds a constraint: maximize the surrogate, but keep the average KL divergence between the old and new policies below a small number δ.' });
  });

  video.scene('clip', 'The clip', (S) => {
    const h = S.add(S.title('Proximal policy optimization'));
    const L = S.add(S.tex('L^{\\text{CLIP}} = \\mathbb{E}\\Big[\\min\\big(r\\,A,\\;\\; \\operatorname{clip}(r,\\, 1-\\epsilon,\\, 1+\\epsilon)\\, A\\big)\\Big]', { size: 70, color: C.YELLOW }).at(0, -280));
    S.beat('Proximal policy optimization, P P O, gets a similar effect with a simpler trick. Clip the ratio to a band around one, from one minus epsilon to one plus epsilon, and take the smaller of the clipped and unclipped objectives. The paper suggests epsilon equal to zero point two.',
      A.FadeIn(h), A.Write(L, 2.4), { cap: 'Proximal policy optimization (PPO) gets a similar effect with a simpler trick: clip the ratio to [1 − ε, 1 + ε] and take the smaller of the clipped and unclipped objectives. The paper suggests ε = 0.2.' });
    const mk = (x, A0, col, label) => {
      const band = S.add(S.rect(128, 400, { stroke: 'none', width: 0, fill: mix(C.BG, C.GREY_B, 0.1), rx: 0 }).at(x, 110));
      const ax = S.add(S.axes({ x0: 0, x1: 2, y0: -1.6, y1: 1.6, w: 640, h: 400, xticks: [0, 0.8, 1, 1.2, 2], yticks: [-1, 0, 1], xfmt: (v) => String(v), size: 28, xlabel: 'ratio r' }).at(x, 110));
      const cur = ax.plot((r) => RL.ppoClip(r, A0), { color: col, width: 7, samples: 200 });
      const ghost = ax.plot((r) => r * A0, { color: C.GREY, width: 3, dash: '10 10' });
      const t = S.add(S.tex(label, { size: 50, color: col }).at(x, -150));
      return { ax, band, cur, ghost, t };
    };
    const pos = mk(-460, 0.7, C.GREEN, 'A > 0');
    S.beat('Look at it as a function of the ratio. When the advantage is positive, the objective rises with the ratio until one plus epsilon. Then it goes flat. There is nothing to gain from making a good answer more than twenty percent more likely in one round.',
      A.FadeIn(pos.ax), A.FadeIn(pos.band), A.FadeIn(pos.t), A.Create(pos.ghost, 1), A.Create(pos.cur, 1.6));
    const neg = mk(460, -0.7, C.RED, 'A < 0');
    S.beat('When the advantage is negative, it is the mirror image: flat below one minus epsilon. And where the objective is flat, its gradient is zero. Those samples simply stop pulling.',
      A.FadeIn(neg.ax), A.FadeIn(neg.band), A.FadeIn(neg.t), A.Create(neg.ghost, 1), A.Create(neg.cur, 1.6));
    const hl = S.add(S.circle(46, { stroke: C.YELLOW, width: 5 }).at(460 + neg.ax.fx(1.75), 110 + neg.ax.fy(-0.7 * 1.75)));
    S.beat('The minimum also keeps the pessimistic side. If a bad answer has become more likely, the unclipped term is the smaller one, and the full penalty stays.',
      A.Create(hl, 0.8), A.Indicate(hl, { scale: 1.2 }));
  });

  video.scene('ppoloop', 'PPO for language models', (S) => {
    const h = S.add(S.title('PPO for language models'));
    const tok = S.add(S.tex('r_t(\\theta) = \\frac{\\pi_\\theta(y_t \\mid x, y_{<t})}{\\pi_{\\text{old}}(y_t \\mid x, y_{<t})}', { size: 66 }).at(0, -260));
    S.beat('For a language model, all of this happens per token. Each token gets its own ratio and its own advantage, and the losses are averaged over tokens.', A.FadeIn(h), A.Write(tok, 1.8));
    const steps = [['sample answers', C.TEAL], ['score them', C.GOLD], ['advantages: critic + GAE', C.BLUE], ['clipped updates, a few epochs', C.YELLOW]];
    const pos = [[-500, -20], [500, -20], [500, 250], [-500, 250]];
    const boxes = steps.map(([t, col], i) => S.add(S.box(t, { w: 640, h: 110, color: col, size: 40 }).at(...pos[i])));
    const arrows = [[[-170, -20], [170, -20]], [[500, 40], [500, 190]], [[170, 250], [-170, 250]], [[-500, 190], [-500, 40]]].map(([a, b]) => S.add(S.arrow(a[0], a[1], b[0], b[1], { color: C.GREY_B, width: 5 })));
    S.beat('Put it together and you have the classic P P O loop for language models. Sample answers. Score them. Compute advantages with the critic and G A E. Then run a few epochs of clipped updates on minibatches, and repeat.',
      A.Shift(tok, 0, -10), lag(1.2, boxes.map((b, i) => seq(A.FadeIn(b, { dur: 0.5 }), A.Arrow(arrows[i], 0.5)))),
      { cap: 'Put it together and you have the classic PPO loop for language models. Sample answers. Score them. Compute advantages with the critic and GAE. Then run a few epochs of clipped updates on minibatches, and repeat.' });
  });

  /* =========================================================== CHAPTER 7 */
  video.chapter('ch7', 'Rewards from preferences');
  card(7, 'Where rewards come from: preferences');

  video.scene('bt', 'Bradley and Terry', (S) => {
    const h = S.add(S.title('Comparisons, not scores'));
    const ca = S.add(S.box('answer A', { w: 360, h: 220, color: C.BLUE, size: 46 }).at(-300, -80));
    const cb = S.add(S.box('answer B', { w: 360, h: 220, color: C.BLUE, size: 46 }).at(300, -80));
    const who = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 0.8 }).at(0, 200));
    const pick = S.add(S.tex('\\succ', { size: 90, color: C.GOLD }).at(0, -80));
    S.beat('Where does the reward come from? For open-ended tasks, like writing a helpful answer, there is no checker. But people can compare. Given two answers, which one is better?',
      A.FadeIn(h), A.FadeIn(ca, { dx: -30 }), A.FadeIn(cb, { dx: 30 }), A.FadeIn(who, { dy: 30 }), A.Look(who, -1, -0.5), wait(0.4), A.Look(who, 1, -0.5), A.FadeIn(pick, { from: 2 }), A.Indicate(ca, { color: C.GREEN }));
    const bt = S.add(S.tex('P(y_w \\succ y_l) \\;=\\; \\sigma\\big(r(x, y_w) - r(x, y_l)\\big), \\qquad \\sigma(t) = \\frac{1}{1 + e^{-t}}', { size: 64, color: C.YELLOW }).at(0, -280));
    S.beat('To turn comparisons into numbers, we use a model from nineteen fifty-two, the Bradley-Terry model. Give each answer a hidden score, r. The chance that answer w beats answer l is the sigmoid of the difference of their scores.',
      par([ca, cb, who, pick].map((m) => A.FadeOut(m))), A.Write(bt, 2.2));
    const ax = S.add(S.axes({ x0: -6, x1: 6, y0: 0, y1: 1, w: 1000, h: 380, xticks: [-4, -2, 0, 2, 4], yticks: [0, 0.5, 1], xlabel: 'score difference', ylabel: 'probability the first one wins' }).at(40, 130));
    const sg = ax.plot((t) => RL.sigmoid(t), { color: C.BLUE, width: 7 });
    const p0 = S.add(S.dot(12, C.YELLOW).at(40 + ax.fx(0), 130 + ax.fy(0.5)));
    const p2 = S.add(S.dot(12, C.GREEN).at(40 + ax.fx(2), 130 + ax.fy(RL.sigmoid(2))));
    const t2 = S.add(S.txt(`difference 2: ${(RL.sigmoid(2) * 100).toFixed(0)}%`, { size: 36, color: C.GREEN, anchor: 'start' }).at(40 + ax.fx(2) + 30, 130 + ax.fy(RL.sigmoid(2)) + 40));
    S.beat('Only differences matter. Add the same constant to every score, and nothing changes. Equal scores give a coin flip. A difference of two gives about eighty-eight percent.',
      A.FadeIn(ax), A.Create(sg, 1.4), A.FadeIn(p0, { from: 2 }), A.FadeIn(p2, { from: 2 }), A.FadeIn(t2));
    const loss = S.add(S.tex('\\mathcal{L}_{\\text{RM}}(\\phi) \\;=\\; -\\,\\mathbb{E}\\Big[\\log \\sigma\\big(r_\\phi(x, y_w) - r_\\phi(x, y_l)\\big)\\Big]', { size: 70 }).at(0, 30));
    S.beat('A reward model is a language model with a small head that outputs this score. It is trained on human comparisons by making the observed winners likely: the loss is minus log sigma, of the winner\u2019s score minus the loser\u2019s.',
      par([ax, p0, p2, t2].map((m) => A.FadeOut(m))), A.Write(loss, 2));
  });

  video.scene('rmfit', 'Fitting a reward model', (S) => {
    const h = S.add(S.title('Twenty thousand comparisons, five numbers'));
    const ax = S.add(S.axes({ x0: -0.5, x1: 4.5, y0: -1.5, y1: 1.5, w: 1000, h: 520, yticks: [-1, 0, 1], xlabel: '', ylabel: 'score' }).at(-60, 40));
    const xs = RM.labels.map((_, i) => -60 + ax.fx(i));
    const labs = RM.labels.map((l, i) => S.add(S.txt(l, { size: 44, font: 'mono' }).at(xs[i], 40 + 300)));
    const truth = RM.rTrue.map((r, i) => S.add(S.line(xs[i] - 70, 40 + ax.fy(r - RM.mean), xs[i] + 70, 40 + ax.fy(r - RM.mean), { stroke: C.GOLD, width: 6 })));
    const fit = RM.fit.r.map((r, i) => S.add(S.dot(16, C.BLUE).at(xs[i], 40 + ax.fy(r))));
    const leg = S.add(S.group(new Line(-40, 0, 40, 0, { stroke: C.GOLD, width: 6 }), new Text('true score (centred)', { size: 34, color: C.GOLD, anchor: 'start' }).at(60, 0), dot(14, C.BLUE).at(0, 60), new Text('fitted from comparisons', { size: 34, color: C.BLUE, anchor: 'start' }).at(60, 60)).at(420, -200));
    S.beat('Here is that loss at work, on a toy problem. Five answers with hidden true scores. We simulate twenty thousand noisy comparisons, and fit five numbers. The fitted scores land on the true ones, up to the shift that comparisons can never see.',
      A.FadeIn(h), A.FadeIn(ax), lag(0.1, labs.map((l) => A.FadeIn(l))), lag(0.15, truth.map((t) => A.Create(t, 0.4))), A.FadeIn(leg), lag(0.2, fit.map((f) => A.FadeIn(f, { from: 2.5 }))));
  });

  video.scene('instruct', 'InstructGPT', (S) => {
    const h = S.add(S.title('The RLHF recipe'));
    const steps = [['1  supervised fine-tuning', 'on demonstrations', C.TEAL], ['2  reward model', 'from rankings of the model\u2019s answers', C.GOLD], ['3  PPO', 'against it, with a KL penalty', C.YELLOW]];
    const boxes = steps.map(([a, b, col], i) => S.add(S.box(a, { w: 560, h: 150, color: col, size: 40, sub: b }).at(-600 + i * 600, -100)));
    const ar = [0, 1].map((i) => S.add(S.arrow(-600 + i * 600 + 290, -100, -600 + (i + 1) * 600 - 290, -100, { color: C.GREY_B, width: 5 })));
    S.beat('This is the recipe that turned G P T 3 into InstructGPT, published in twenty twenty-two. Step one: supervised fine-tuning on demonstrations. Step two: a reward model, trained on rankings of the model\u2019s own answers. Step three: P P O against that reward model, with a K L penalty that keeps it close to the supervised model.',
      A.FadeIn(h), lag(1.4, boxes.map((b, i) => seq(A.FadeIn(b, { dy: 20, dur: 0.6 }), i < 2 ? A.Arrow(ar[i], 0.5) : wait(0)))),
      { cap: 'This is the recipe that turned GPT-3 into InstructGPT (2022). Step 1: supervised fine-tuning on demonstrations. Step 2: a reward model trained on rankings of the model\u2019s own answers. Step 3: PPO against that reward model, with a KL penalty to the supervised model.' });
    const small = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.55 }).at(-260, 230));
    const large = S.add(S.creature({ color: C.GREY, kind: 'agent', size: 1.4 }).at(260, 180));
    const sl = S.add(S.txt('InstructGPT 1.3B', { size: 36, color: C.TEAL }).at(-260, 330));
    const ll = S.add(S.txt('GPT-3 175B', { size: 36, color: C.GREY_B }).at(260, 330));
    const pref = S.add(S.tex('\\succ', { size: 90, color: C.GOLD }).at(0, 200));
    S.beat('Labelers preferred the answers of the one point three billion parameter InstructGPT model to those of the one hundred seventy-five billion parameter G P T 3, a model more than a hundred times larger.',
      A.FadeIn(small, { dy: 20 }), A.FadeIn(sl), A.FadeIn(large, { dy: 20 }), A.FadeIn(ll), A.FadeIn(pref, { from: 2 }), A.Mood(small, 1),
      { cap: 'Labelers preferred the answers of the 1.3B-parameter InstructGPT model to those of the 175B-parameter GPT-3, a model more than 100 times larger.' });
  });

  video.scene('hacking', 'Reward hacking', (S) => {
    const h = S.add(S.title('Goodhart\u2019s law, measured'));
    const traits = ['too long', 'too flattering', 'confidently wrong'].map((t, i) => S.add(S.txt(t, { size: 48, color: C.RED }).at(-520 + i * 520, -150)));
    S.beat('But a reward model is only a model. Push hard enough on any proxy, and you find its mistakes. The policy learns answers the reward model loves and people do not: too long, too flattering, confidently wrong. This is called reward hacking.',
      A.FadeIn(h), lag(0.8, traits.map((t) => A.FadeIn(t, { dy: 20 }))));
    const gold = (d) => (d <= 0 ? 0 : d * (1 - 0.45 * Math.log(d)));
    const proxy = (d) => (d <= 0 ? 0 : d * (1 - 0.1 * Math.log(d)));
    const ax = S.add(S.axes({ x0: 0, x1: 8, y0: -0.5, y1: 5, w: 1100, h: 400, xticks: [0, 2, 4, 6, 8], yticks: [0, 2, 4], xlabel: 'distance from the start, \u221aKL', ylabel: 'reward' }).at(40, 90));
    const pc = ax.plot(proxy, { color: C.BLUE, width: 6, from: 0.001, to: 5 });
    const gc = ax.plot(gold, { color: C.GOLD, width: 6, from: 0.001, to: 8 });
    const pl = S.add(S.txt('proxy reward model', { size: 36, color: C.BLUE }).at(40 + ax.fx(4.2), 90 + ax.fy(proxy(4.2)) - 50));
    const gl = S.add(S.txt('gold reward', { size: 36, color: C.GOLD }).at(40 + ax.fx(6.2), 90 + ax.fy(gold(6.2)) - 50));
    const note = S.add(S.txt('shape from Gao et al. 2022: R(d) = d (\u03b1 \u2212 \u03b2 log d); constants illustrative', { size: 30, color: C.GREY, italic: true }).at(40, -360));
    S.beat('Gao, Schulman and Hilton measured this with a stand-in for people: a large gold reward model, and smaller proxy reward models trained on its labels. As the policy moves away from where it started, the proxy reward keeps climbing. The gold reward rises, peaks, and then falls.',
      par(traits.map((t) => A.FadeOut(t))), A.FadeIn(ax), A.Create(pc, 2), A.FadeIn(pl), A.Create(gc, 2.4), A.FadeIn(gl), A.FadeIn(note));
    const leash = S.add(S.txt('we need a leash', { size: 56, color: C.YELLOW }).at(-260, -250));
    S.beat('So we need a leash: something that keeps the policy close to where it started, where the reward model can still be trusted.', A.FadeIn(leash, { dy: -20 }));
  });


  /* =========================================================== CHAPTER 8 */
  video.chapter('ch8', 'The KL leash');
  card(8, 'The leash: KL, and an exact answer');

  video.scene('kl', 'Kullback and Leibler', (S) => {
    const h = S.add(S.title('Measuring distance between policies'));
    const def = S.add(S.tex('\\mathrm{KL}(\\pi \\,\\|\\, \\pi_{\\text{ref}}) \\;=\\; \\mathbb{E}_{y \\sim \\pi}\\Big[\\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)}\\Big] \\;=\\; \\sum_y \\pi(y)\\, \\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)}', { size: 64 }).at(0, -280));
    const ref = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 110, gap: 60, color: C.GREY, labelFont: 'serif', labelSize: 32, valueSize: 28 }).at(-480, 230));
    const pol = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 110, gap: 60, color: C.BLUE, labelFont: 'serif', labelSize: 32, valueSize: 28 }).at(480, 230));
    const rl = S.add(S.tex('\\pi_{\\text{ref}}', { size: 54, color: C.GREY_B }).at(-480, -120));
    const pl = S.add(S.tex('\\pi', { size: 60, color: C.BLUE }).at(480, -120));
    S.beat('The standard leash is the Kullback-Leibler divergence. It measures how different one distribution is from another: the average, under pi, of the log of pi over pi ref.',
      A.FadeIn(h), A.Write(def, 2.4), A.FadeIn(ref), A.FadeIn(rl), A.FadeIn(pol), A.FadeIn(pl),
      { cap: 'The standard leash is the Kullback–Leibler divergence. It measures how different one distribution is from another: the average, under π, of log π / π_ref.' });
    const target = LEASH.at(0.2);
    const klv = S.add(S.txt('KL = 0.00', { size: 44, color: C.YELLOW, font: 'mono' }).at(0, -90));
    S.beat('It is zero only when the two distributions are equal, and it grows as pi moves its mass to where the reference puts little.',
      A.FadeIn(klv), wait(0.6), par(pol.to(target, 2.2), A.Count(klv, 0, RL.kl(target, LEASH.ref), (v) => `KL = ${v.toFixed(2)}`, 2.2)));
    const obj = S.add(S.tex('\\max_{\\theta}\\;\\; \\mathbb{E}_{x,\\; y \\sim \\pi_\\theta}\\big[\\,r(x, y)\\,\\big] \\;-\\; \\beta\\, \\mathrm{KL}\\big(\\pi_\\theta(\\cdot \\mid x) \\,\\|\\, \\pi_{\\text{ref}}(\\cdot \\mid x)\\big)', { size: 64, color: C.YELLOW }).at(0, -80));
    S.beat('The objective for language models subtracts it. Maximize the expected reward, minus beta times the K L divergence from a reference model, which is usually the supervised model we started from.',
      par([ref, pol, rl, pl, klv].map((m) => A.FadeOut(m))), A.Write(obj, 2.4));
    const tok = S.add(S.tex('r_t \\;=\\; -\\,\\beta\\, \\log \\frac{\\pi_\\theta(y_t \\mid s_t)}{\\pi_{\\text{ref}}(y_t \\mid s_t)} \\;\\; \\big(+\\; r(x, y) \\text{ at the last token}\\big)', { size: 58 }).at(0, 120));
    const ig = S.add(S.txt('InstructGPT: β = 0.02, per token', { size: 36, color: C.GREY_B }).at(0, 250));
    S.beat('For a sequence, the log ratio is a sum over tokens, so the penalty can be paid token by token: each token’s reward includes minus beta times the log ratio of the new probability to the reference probability. InstructGPT used this, with beta equal to zero point zero two.',
      A.Write(tok, 2.2), A.FadeIn(ig), { cap: 'For a sequence, the log ratio is a sum over tokens, so the penalty can be paid token by token: each token’s reward includes −β log(π_θ / π_ref). InstructGPT used this with β = 0.02.' });
  });

  video.scene('tilt', 'The exact optimum', (S) => {
    const h = S.add(S.title('The exact solution'));
    const star = S.add(S.tex('\\pi^*(y \\mid x) \\;=\\; \\frac{1}{Z(x)}\\; \\class{f-ref}{\\pi_{\\text{ref}}(y \\mid x)}\\; \\class{f-exp}{\\exp\\!\\big(r(x, y) / \\beta\\big)}', { size: 78, color: C.YELLOW }).at(0, -280));
    const zdef = S.add(S.tex('Z(x) = \\sum_y \\pi_{\\text{ref}}(y \\mid x)\\, e^{\\,r(x, y)/\\beta}', { size: 50, color: C.GREY_B }).at(0, -125));
    S.beat('Here is the beautiful part. This objective has an exact solution. Among all distributions, the best one is the reference distribution, tilted by the exponential of reward over beta, and renormalized.',
      A.FadeIn(h), A.Write(star, 2.4), A.FadeIn(zdef));
    const d1 = S.add(S.tex('\\mathbb{E}_\\pi[r] - \\beta\\, \\mathrm{KL}(\\pi \\| \\pi_{\\text{ref}}) \\;=\\; -\\beta\\, \\mathbb{E}_\\pi\\Big[\\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)\\, e^{r(y)/\\beta}}\\Big]', { size: 56 }).at(0, -20));
    const d2 = S.add(S.tex('\\;=\\; -\\beta\\, \\mathbb{E}_\\pi\\Big[\\log \\frac{\\pi(y)}{\\pi^*(y)}\\Big] + \\beta \\log Z \\;=\\; \\class{f-k}{-\\beta\\, \\mathrm{KL}(\\pi \\,\\|\\, \\pi^*)} + \\beta \\log Z', { size: 56 }).at(60, 120));
    const zero = S.add(S.txt('largest when this is zero: π = π*', { size: 40, color: C.GREEN }).at(220, 250));
    S.beat('Why? Rewrite the objective. It equals minus beta, times the K L divergence from pi to that tilted distribution, plus beta log Z, which does not depend on pi. And a K L divergence is smallest, zero, exactly when the two distributions are equal.',
      A.FadeOut(zdef), A.Write(d1, 2.4), A.Write(d2, 2.4), A.Focus(d2, 'k', { color: C.GREEN }), A.FadeIn(zero),
      { cap: 'Why? Rewrite the objective: it equals −β KL(π ‖ π*) + β log Z, and β log Z does not depend on π. A KL divergence is smallest, zero, exactly when the two distributions are equal.' });
  });

  video.scene('beta', 'Turning the knob', (S) => {
    const h = S.add(S.title('Turning the knob'));
    const star = S.add(S.tex('\\pi^* \\;\\propto\\; \\pi_{\\text{ref}}\\; e^{\\,r/\\beta}', { size: 66, color: C.YELLOW }).at(-520, -300));
    const rews = LEASH.r.map((r, i) => r);
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.at(8), h: 420, w: 150, gap: 110, colors: [C.GREY_B, C.GREEN, C.RED, C.PINK], labelFont: 'serif', labelSize: 40 }).at(80, 190));
    const rl = rews.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 32, color: C.GOLD }).at(80 + bars.xs[i], 290)));
    const betas = [8, 1, 0.5, 0.2, 0.05];
    // one beta label per value, swapped by fading
    const bl = betas.map((b, i) => S.add(S.tex(`\\beta = ${b}`, { size: 64, color: C.TEAL }).at(-520, -190)));
    const shows = [];
    for (let i = 1; i < betas.length; i++) shows.push(seq(par(A.FadeOut(bl[i - 1], { dur: 0.3 }), A.FadeIn(bl[i], { dur: 0.3 })), bars.to(LEASH.at(betas[i]), 1.4), wait(0.8)));
    S.beat('Watch beta. With a large beta, the leash is tight, and the policy stays at the reference. As beta shrinks, mass flows toward high-reward answers. Near zero, everything piles onto the single answer the reward model rates highest. Here, that is the flattering one.',
      A.FadeIn(h), A.FadeIn(star), A.FadeIn(bars), lag(0.1, rl.map((r) => A.FadeIn(r))), A.FadeIn(bl[0]), wait(0.8), seq(shows), A.Indicate(bars.labs[3], { color: C.RED, scale: 1.3 }));
    const ax = S.add(S.axes({ x0: 0, x1: 3.2, y0: 0, y1: 1.6, w: 1000, h: 420, xticks: [0, 1, 2, 3], yticks: [0, 0.5, 1, 1.5], xlabel: 'KL from the reference', ylabel: 'expected reward' }).at(40, 120));
    const fr = ax.polyline(LEASH.frontier.map((f) => [f.kl, f.reward]), { color: C.YELLOW, width: 6 });
    const marks = [8, 1, 0.2].map((b) => {
      const pi = LEASH.at(b);
      return S.add(S.group(dot(12, C.TEAL), new Text(`β = ${b}`, { size: 32, color: C.TEAL, anchor: 'start' }).at(20, -26)).at(40 + ax.fx(RL.kl(pi, LEASH.ref)), 120 + ax.fy(RL.expectedReward(pi, LEASH.r))));
    });
    S.beat('Each beta buys some reward at some K L cost. Trace them all, and you get a frontier: the most reward any policy can get, for a given distance from the reference.',
      par([star, bars, ...rl, ...bl].map((m) => A.FadeOut(m))), A.FadeIn(ax), A.Create(fr, 2), lag(0.4, marks.map((m) => A.FadeIn(m, { from: 1.6 }))));
    const bayes = S.add(S.tex('\\underbrace{\\pi^*(y)}_{\\text{posterior}} \\;\\propto\\; \\underbrace{\\pi_{\\text{ref}}(y)}_{\\text{prior}}\\; \\underbrace{e^{\\,r(y)/\\beta}}_{\\text{likelihood}}', { size: 76, color: C.YELLOW }).at(0, -40));
    S.beat('There is a second way to read the solution. The reference model is a prior. The exponentiated reward is a likelihood. And the optimal policy is the posterior. Korbak, Perez and Buckley argued that R L with K L penalties is best viewed as Bayesian inference.',
      par([ax, ...marks].map((m) => A.FadeOut(m))), A.Write(bayes, 2.4),
      { cap: 'There is a second way to read the solution. The reference model is a prior, the exponentiated reward a likelihood, and the optimal policy the posterior. Korbak, Perez and Buckley argued that RL with KL penalties is best viewed as Bayesian inference.' });
    const zz = S.add(S.txt('but Z(x) sums over every possible answer', { size: 44, color: C.RED }).at(0, 200));
    S.beat('We cannot compute this posterior directly, because Z sums over every possible answer. That is why we train with P P O. Or is it?',
      A.FadeIn(zz, { dy: 20 }), { cap: 'We cannot compute this posterior directly, because Z sums over every possible answer. That is why we train with PPO. Or is it?' });
  });

  /* =========================================================== CHAPTER 9 */
  video.chapter('ch9', 'DPO');
  card(9, 'DPO: the reward model was inside the policy');

  video.scene('dpo', 'Direct preference optimization', (S) => {
    const h = S.add(S.title('Solve for the reward'));
    const inv = S.add(S.tex('r(x, y) \\;=\\; \\beta \\log \\frac{\\pi^*(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} \\;+\\; \\beta \\log Z(x)', { size: 74, color: C.YELLOW }).at(0, -280));
    S.beat('In twenty twenty-three, Rafailov and colleagues at Stanford noticed something. If the optimal policy is determined by the reward, then the reward is determined by the optimal policy. Just solve for r.',
      A.FadeIn(h), A.Write(inv, 2.2));
    const bt = S.add(S.tex('P(y_w \\succ y_l) = \\sigma\\Big(\\beta \\log \\frac{\\pi^*(y_w)}{\\pi_{\\text{ref}}(y_w)} \\class{f-z1}{+ \\beta \\log Z} - \\beta \\log \\frac{\\pi^*(y_l)}{\\pi_{\\text{ref}}(y_l)} \\class{f-z2}{- \\beta \\log Z}\\Big)', { size: 56 }).at(0, -100));
    S.beat('Now put that into the Bradley-Terry model. Bradley-Terry only looks at differences of rewards, and the awkward term, beta log Z, is the same for both answers to the same prompt. It cancels.',
      A.Write(bt, 2.4), A.Focus(bt, 'z1', { color: C.RED }), wait(0.5), A.Focus(bt, 'z2', { color: C.RED }), A.Unfocus(bt));
    const loss = S.add(S.tex('\\mathcal{L}_{\\text{DPO}}(\\theta) = -\\,\\mathbb{E}\\Big[\\log \\sigma\\Big(\\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)}\\Big)\\Big]', { size: 58, color: C.YELLOW }).at(0, 80));
    S.beat('So we can train the policy directly on preference pairs, with the same loss as the reward model, but with the policy’s own log ratios as the scores. This is Direct Preference Optimization, D P O.',
      A.Write(loss, 2.6), { cap: 'So we can train the policy directly on preference pairs, with the same loss as the reward model, but with the policy’s own log ratios as the scores. This is Direct Preference Optimization (DPO).' });
    const imp = S.add(S.tex('\\hat r_\\theta(x, y) \\;=\\; \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)}', { size: 62, color: C.TEAL }).at(0, 250));
    S.beat('Beta times the log ratio acts as an implicit reward. In the words of the paper’s title: your language model is secretly a reward model.', A.Write(imp, 1.8));
  });

  video.scene('dpograd', 'What DPO pushes', (S) => {
    const h = S.add(S.title('The DPO gradient'));
    const g = S.add(S.tex('\\nabla_\\theta \\mathcal{L}_{\\text{DPO}} = -\\beta\\, \\mathbb{E}\\Big[\\class{f-w}{\\sigma\\big(\\hat r_\\theta(x, y_l) - \\hat r_\\theta(x, y_w)\\big)}\\, \\big(\\nabla \\log \\pi(y_w \\mid x) - \\nabla \\log \\pi(y_l \\mid x)\\big)\\Big]', { size: 54, color: C.YELLOW }).at(0, -260));
    const up = S.add(S.box('winner: pushed up', { w: 560, h: 100, color: C.GREEN, size: 40 }).at(-400, -60));
    const dn = S.add(S.box('loser: pushed down', { w: 560, h: 100, color: C.RED, size: 40 }).at(400, -60));
    const wt = S.add(S.txt('weight: large when the implicit reward ranks them the wrong way round', { size: 38, color: C.YELLOW }).at(0, 80));
    S.beat('Its gradient is easy to read. Push up the winner’s log-probability, push down the loser’s, weighted by how wrong the implicit reward currently is: the sigmoid of the loser’s implicit reward minus the winner’s.',
      A.FadeIn(h), A.Write(g, 2.6), A.FadeIn(up, { dx: -20 }), A.FadeIn(dn, { dx: 20 }), A.Focus(g, 'w', { color: C.YELLOW }), A.FadeIn(wt));
  });

  video.scene('dpoconv', 'Same destination', (S) => {
    const h = S.add(S.title('Does DPO land where RLHF lands?'));
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 420, w: 140, gap: 90, colors: [C.GREY_B, C.GREEN, C.RED, C.PINK], labelFont: 'serif', labelSize: 40 }).at(-430, 220));
    const ticks = DPO.star.map((p, i) => S.add(S.line(-430 + bars.xs[i] - 90, 220 - 420 * p, -430 + bars.xs[i] + 90, 220 - 420 * p, { stroke: C.YELLOW, width: 5, dash: '12 8' })));
    const tl = S.add(S.group(new Line(-40, 0, 40, 0, { stroke: C.YELLOW, width: 5, dash: '12 8' }), new Text('RLHF optimum, β = 0.5', { size: 34, color: C.YELLOW, anchor: 'start' }).at(60, 0)).at(200, -220));
    const kl = S.add(S.txt('', { size: 38, color: C.TEAL, font: 'mono', anchor: 'start' }).at(160, -140));
    const snaps = [0, 1, 3, 10, 60].map((i) => DPO.run.trace[Math.min(i, DPO.run.trace.length - 1)]);
    const steps = snaps.slice(1).map((sn, i) => seq(par(bars.to(sn.pi, 1.2), A.Set(kl, { str: `step ${sn.step}: KL ${sn.kl < 1e-9 ? '< 1e-9' : sn.kl.toExponential(1)}` }, 0.01)), wait(0.4)));
    S.beat('Does it really land in the same place as R L H F? On our toy problem, yes. Train D P O on every pair, with unlimited comparisons drawn from the true rewards, and the policy converges to the exact tilted distribution.',
      A.FadeIn(h), A.FadeIn(bars), lag(0.1, ticks.map((t) => A.Create(t, 0.4))), A.FadeIn(tl), A.Set(kl, { o: 1, str: `step 0: KL ${snaps[0].kl.toFixed(3)}` }, 0.01), seq(steps),
      { cap: 'Does it land in the same place as RLHF? On our toy problem, yes: trained on every pair, with unlimited comparisons drawn from the true rewards, DPO converges to the exact tilted distribution.' });
    const pros = S.add(S.txt('no reward model · no sampling · no critic', { size: 44, color: C.GREEN }).at(0, -380));
    S.beat('No reward model, no sampling, no critic. Just a classification loss on pairs. That is why D P O spread so quickly.', A.FadeIn(pros, { dy: -20 }),
      { cap: 'No reward model, no sampling, no critic: just a classification loss on pairs. That is why DPO spread so quickly.' });
    const cons = ['unlimited data', 'a model that can represent the optimum', 'pairs that cover what the policy produces'].map((t, i) => S.add(S.txt(t, { size: 36, color: C.RED, anchor: 'start' }).at(160, -120 + i * 64)));
    const assume = S.add(S.txt('the equivalence assumes', { size: 36, color: C.GREY_B, anchor: 'start' }).at(160, -190));
    S.beat('But the equivalence assumes a lot: unlimited data, a model that can represent the optimum, and comparisons that cover the answers the policy will actually produce. In practice, D P O learns from a fixed set of pairs, and it can even lower the probability of the preferred answer, as long as the rejected one falls faster.',
      A.FadeOut(kl), A.FadeOut(tl), A.FadeIn(assume), lag(0.6, cons.map((c) => A.FadeIn(c, { dx: -20 }))),
      { cap: 'But the equivalence assumes a lot: unlimited data, a model that can represent the optimum, and comparisons that cover what the policy will produce. In practice DPO learns from a fixed set of pairs, and it can even lower the probability of the preferred answer, as long as the rejected one falls faster.' });
  });

  /* =========================================================== CHAPTER 10 */
  video.chapter('ch10', 'Verifiable rewards and GRPO');
  card(10, 'Rewards you can check: GRPO');

  video.scene('rlvr', 'Verifiable rewards', (S) => {
    const h = S.add(S.title('A judge that cannot be flattered'));
    const v = S.add(S.tex('v(x, y) \\;=\\; \\begin{cases} \\alpha & \\text{if the answer is correct} \\\\ 0 & \\text{otherwise} \\end{cases}', { size: 70, color: C.GREEN }).at(0, -150));
    const ex = [['final number matches', C.GREEN], ['unit tests pass', C.GREEN], ['format is right', C.TEAL]].map(([t, col], i) => S.add(S.group(S.check(40, col).with({ o: 1 }), new Text(t, { size: 40, anchor: 'start' }).at(44, 0)).at(-520 + i * 520, 120)));
    S.beat('For math and code, there is a better judge than any reward model: check the answer. Does the final number match? Do the unit tests pass? The Tulu 3 team called this reinforcement learning with verifiable rewards.',
      A.FadeIn(h), A.Write(v, 2), lag(0.6, ex.map((e) => A.FadeIn(e, { dy: 20 }))),
      { cap: 'For math and code there is a better judge than any reward model: check the answer. Does the final number match? Do the unit tests pass? The Tülu 3 team called this reinforcement learning with verifiable rewards (RLVR).' });
    const w = S.add(S.txt('the only thing left to exploit is the check itself', { size: 42, color: C.YELLOW }).at(0, 290));
    S.beat('A verifier cannot be flattered. The only thing left to exploit is the check itself, so it must be written carefully.', A.FadeIn(w, { dy: 20 }));
  });

  video.scene('grpo', 'Group relative policy optimization', (S) => {
    const h = S.add(S.title('Group relative policy optimization'));
    const q = S.add(S.box('one question', { w: 380, h: 90, color: C.GREY_B, size: 42 }).at(0, -330));
    const xs = GROUP.r.map((_, i) => -735 + i * 210);
    const chips = GROUP.r.map((r, i) => S.add(S.box(`answer ${i + 1}`, { w: 180, h: 80, color: C.BLUE, size: 32 }).at(xs[i], -170)));
    const lines = xs.map((x) => S.add(S.line(0, -285, x, -210, { stroke: C.GREY, width: 3 }).with({ draw: 0 })));
    S.beat('The method most associated with verifiable rewards is G R P O, group relative policy optimization, introduced with DeepSeekMath in twenty twenty-four. For each question, sample a group of answers. Here, eight.',
      A.FadeIn(h), A.FadeIn(q), lag(0.1, lines.map((l) => A.Create(l, 0.4))), lag(0.12, chips.map((c) => A.FadeIn(c, { dy: 20, dur: 0.4 }))),
      { cap: 'The method most associated with verifiable rewards is GRPO, group relative policy optimization, introduced with DeepSeekMath in 2024. For each question, sample a group of answers. Here, eight.' });
    const marks = GROUP.r.map((r, i) => S.add((r ? S.check(44) : S.cross(38)).at(xs[i], -80)));
    const rl = GROUP.r.map((r, i) => S.add(S.txt(`r = ${r}`, { size: 32, color: C.GOLD, font: 'mono' }).at(xs[i], -20)));
    const adv = S.add(S.tex('\\hat A_i \\;=\\; \\frac{r_i - \\operatorname{mean}(r)}{\\operatorname{std}(r)}', { size: 66, color: C.YELLOW }).at(-460, 180));
    const al = GROUP.adv.map((a, i) => S.add(S.txt(`${a > 0 ? '+' : ''}${f2(a)}`, { size: 34, color: a > 0 ? C.GREEN : C.RED, font: 'mono' }).at(xs[i], 40)));
    const stats = S.add(S.txt(`mean ${f3(RL.sum(GROUP.r) / 8)}, std ${f3(Math.sqrt(RL.sum(GROUP.r.map((x) => (x - 0.375) ** 2)) / 8))}`, { size: 34, color: C.GREY_B }).at(360, 180));
    S.beat('Score each one: one for correct, zero for wrong. Each answer’s advantage is its reward minus the group mean, divided by the group’s standard deviation.',
      lag(0.1, marks.map((m) => A.Create(m, 0.3))), lag(0.05, rl.map((r) => A.FadeIn(r))), A.Write(adv, 1.6), A.FadeIn(stats), lag(0.06, al.map((a) => A.FadeIn(a))));
    S.beat('Correct answers get a positive advantage, wrong ones a negative advantage, and the group’s own average plays the role of the baseline. No critic network. Every token in an answer shares that answer’s advantage.',
      lag(0.06, al.map((a, i) => A.Indicate(a, { color: GROUP.adv[i] > 0 ? C.GREEN : C.RED, scale: 1.25 }))));
    const obj = S.add(S.tex('\\mathcal{J}_{\\text{GRPO}} = \\mathbb{E}\\Big[\\frac{1}{G}\\sum_{i=1}^{G} \\frac{1}{|o_i|} \\sum_{t=1}^{|o_i|} \\Big\\{ \\min\\big(r_{i,t}\\hat A_{i},\\; \\operatorname{clip}(r_{i,t}, 1-\\epsilon, 1+\\epsilon)\\hat A_{i}\\big) - \\beta\\, \\mathbb{D}_{\\text{KL}}\\big[\\pi_\\theta \\,\\|\\, \\pi_{\\text{ref}}\\big] \\Big\\}\\Big]', { size: 46, color: C.WHITE }).at(0, 310));
    S.beat('The update is P P O’s: per-token clipped ratios, times these advantages, plus a K L penalty to the reference model, added straight to the loss.',
      A.FadeOut(stats), A.FadeOut(adv), A.Write(obj, 3), { cap: 'The update is PPO’s: per-token clipped ratios, times these advantages, plus a KL penalty to the reference model, added straight to the loss (DeepSeekMath, Eq. 3).' });
    const k3 = S.add(S.tex('\\mathbb{D}_{\\text{KL}} \\approx \\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - \\log \\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - 1', { size: 62, color: C.TEAL }).at(-460, 180));
    const kn = S.add(S.txt(`toy example: spread ${GROUP.kl.k1.sd.toFixed(3)} (log ratio) vs ${GROUP.kl.k3.sd.toFixed(4)} (this one)`, { size: 32, color: C.GREY_B }).at(360, 180));
    S.beat(`That K L term is estimated per token with a formula from John Schulman: the ratio, minus the log of the ratio, minus one. On average it equals the K L divergence. Unlike the plain log ratio, it is never negative, and when the two policies are close it is far less noisy. In a small example, its spread is ${Math.round(GROUP.kl.k1.sd / GROUP.kl.k3.sd)} times smaller.`,
      A.Write(k3, 1.8), A.FadeIn(kn),
      { cap: `That KL term is estimated per token with a formula from John Schulman: ratio − log(ratio) − 1. On average it equals the KL divergence; unlike the plain log ratio it is never negative, and when the policies are close it is far less noisy (here ${Math.round(GROUP.kl.k1.sd / GROUP.kl.k3.sd)}× smaller spread).` });
  });

  video.scene('dead', 'Groups that teach nothing', (S) => {
    const h = S.add(S.title('When the whole group agrees'));
    const ax = S.add(S.axes({ x0: 0, x1: 1, y0: 0, y1: 1, w: 1000, h: 420, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xlabel: 'chance the model solves the question', ylabel: 'groups of 8 with no signal' }).at(40, 90));
    const cv = ax.plot((p) => RL.deadGroupProbability(p, 8), { color: C.RED, width: 6 });
    const mid = S.add(S.dot(12, C.YELLOW).at(40 + ax.fx(0.5), 90 + ax.fy(RL.deadGroupProbability(0.5, 8))));
    const midL = S.add(S.txt('2 in 256', { size: 36, color: C.YELLOW }).at(40 + ax.fx(0.5), 90 + ax.fy(0) - 60));
    S.beat('Now a subtle problem. If all eight answers are correct, or all eight are wrong, every advantage is zero, and the question teaches nothing. For a question the model solves half the time, that happens in only two groups out of two hundred fifty-six. But for questions that are very easy or very hard, it is almost every group.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(cv, 2), A.FadeIn(mid, { from: 2 }), A.FadeIn(midL),
      { cap: 'Now a subtle problem. If all eight answers are correct, or all eight are wrong, every advantage is zero and the question teaches nothing. For a question solved half the time that happens in 2 groups out of 256; for very easy or very hard questions it is almost every group.' });
    const dapo = [['dynamic sampling', 'skip all-right / all-wrong groups'], ['clip-higher', 'ε low 0.2, ε high 0.28'], ['token-level loss', 'average over all batch tokens']].map(([a, b], i) => S.add(S.box(a, { w: 560, h: 130, color: C.TEAL, size: 40, sub: b }).at(-600 + i * 600, -230)));
    S.beat('DAPO, from ByteDance Seed and Tsinghua, filters those groups out and samples more, which they call dynamic sampling. It also raises the upper clip limit, from zero point two to zero point two eight, so that rare but good tokens can grow faster. And it averages the loss over all tokens in the batch, rather than answer by answer.',
      par(A.FadeOut(ax), A.FadeOut(mid), A.FadeOut(midL)), lag(1.6, dapo.map((d) => A.FadeIn(d, { dy: 20 }))),
      { cap: 'DAPO (ByteDance Seed, Tsinghua) filters those groups out and samples more: dynamic sampling. It raises the upper clip limit from 0.2 to 0.28 so that rare good tokens can grow faster, and it averages the loss over all tokens in the batch rather than answer by answer.' });
    const shortT = S.add(S.tokens(['wrong', 'answer'], { size: 36, colors: [C.RED, C.RED] }).at(-420, 60));
    const longT = S.add(S.tokens(['a', 'very', 'long', 'and', 'rambling', 'wrong', 'answer'], { size: 36, colors: Array(7).fill(C.RED) }).at(300, 60));
    const sp = S.add(S.txt('per token: −A / 2', { size: 38, color: C.RED, font: 'mono' }).at(-420, 160));
    const lp = S.add(S.txt('per token: −A / 7', { size: 38, color: C.RED, font: 'mono' }).at(300, 160));
    const bias = S.add(S.txt('dividing by length: rambling when wrong is punished less per token', { size: 38, color: C.YELLOW }).at(0, 270));
    S.beat('That last change matters. G R P O divides each answer’s loss by its length. A long wrong answer is then penalized less per token than a short wrong one, which quietly rewards rambling when wrong. The Dr. G R P O paper calls this a response-level length bias, and removes both the length division and the standard deviation scaling.',
      A.FadeIn(shortT), A.FadeIn(longT), A.FadeIn(sp), A.FadeIn(lp), A.FadeIn(bias, { dy: 10 }),
      { cap: 'That last change matters. GRPO divides each answer’s loss by its length, so a long wrong answer is penalized less per token than a short wrong one, which quietly rewards rambling when wrong. The Dr. GRPO paper calls this a response-level length bias, and removes both the length division and the std scaling.' });
    const gs = S.add(S.tex('s_i(\\theta) \\;=\\; \\Big(\\frac{\\pi_\\theta(y_i \\mid x)}{\\pi_{\\text{old}}(y_i \\mid x)}\\Big)^{1/|y_i|}', { size: 64, color: C.PINK }).at(0, 120));
    S.beat('Other variants change the ratio itself. Qwen’s G S P O uses one ratio for the whole answer, the geometric mean of its token ratios, which proved steadier for large mixture-of-experts models.',
      par([shortT, longT, sp, lp, bias, ...dapo].map((m) => A.FadeOut(m))), A.Write(gs, 2),
      { cap: 'Other variants change the ratio itself. Qwen’s GSPO uses one ratio for the whole answer, the geometric mean of its token ratios, which proved steadier for large mixture-of-experts models.' });
  });

  video.scene('r1', 'R1-Zero', (S) => {
    const h = S.add(S.title('DeepSeek-R1-Zero'));
    const base = 300;
    const b0 = S.add(S.bar(-260, base, 15.6 * 6, C.GREY, 160));
    const b1 = S.add(S.bar(260, base, 77.9 * 6, C.GREEN, 160));
    const l0 = S.add(S.txt('before RL: 15.6%', { size: 40, color: C.GREY_B }).at(-260, base - 15.6 * 6 - 40));
    const l1 = S.add(S.txt('after RL: 77.9%', { size: 40, color: C.GREEN }).at(260, base - 77.9 * 6 - 40));
    const ax = S.add(S.line(-480, base, 480, base, { stroke: C.GREY_B, width: 3 }));
    const lab = S.add(S.txt('AIME 2024, pass@1', { size: 36, color: C.GREY_B }).at(0, base + 44));
    S.beat('Applied straight to a base model, with no supervised step, and rewards only for correctness and format, this recipe produced DeepSeek R1 Zero. On the AIME 2024 math competition, its pass at one rose from fifteen point six percent to seventy-seven point nine percent.',
      A.FadeIn(h), A.FadeIn(ax), A.FadeIn(lab), A.Create(b0, 0.8), A.FadeIn(l0), A.Create(b1, 2), A.FadeIn(l1),
      { cap: 'Applied straight to a base model, with no supervised step and rewards only for correctness and format, this recipe produced DeepSeek-R1-Zero. On AIME 2024, its pass@1 rose from 15.6% to 77.9% (Nature version; 71.0% in the first arXiv version).' });
    const q = S.add(S.quote('Wait, wait. Wait. That’s an aha moment I can flag here.', 'DeepSeek-R1-Zero, in the middle of a solution', { size: 46, y: -40 }));
    S.beat('Its answers grew longer as training went on, and it began to re-check its own work. The authors showed one such moment, which the model itself called an aha moment. Later analysis found that base models already show some of this behavior; reinforcement learning made it frequent.',
      par([b0, b1, l0, l1, ax, lab].map((m) => A.FadeOut(m))), A.FadeIn(q, { dy: 20 }));
  });

  /* =========================================================== CHAPTER 11 */
  video.chapter('ch11', 'What RL changes');
  card(11, 'What reinforcement learning changes');

  video.scene('passk', 'Sharpening', (S) => {
    const h = S.add(S.title('pass@k'));
    const pk = S.add(S.tex('\\text{pass@}k \\;=\\; \\mathbb{E}\\Bigg[\\,1 - \\frac{\\binom{n - c}{k}}{\\binom{n}{k}}\\,\\Bigg]', { size: 72, color: C.YELLOW }).at(0, -250));
    S.beat('What does this training actually change? Measure pass at k: the chance that at least one of k samples is correct. From n samples with c correct, the unbiased estimate is one minus a ratio of binomial coefficients.',
      A.FadeIn(h), A.Write(pk, 2.2), { cap: 'What does this training actually change? Measure pass@k: the chance that at least one of k samples is correct. From n samples with c correct, the unbiased estimate is 1 − C(n−c, k) / C(n, k).' });
    const ax = S.add(S.axes({ x0: 1, x1: 256, y0: 0, y1: 1, w: 1100, h: 400, logx: true, xticks: [1, 4, 16, 64, 256], yticks: [0, 0.5, 1], xlabel: 'k', ylabel: 'problems solved' }).at(40, 100));
    const cb = ax.polyline(PASS.base, { color: C.GREY_B, width: 6 });
    const cr = ax.polyline(PASS.rl, { color: C.GREEN, width: 6 });
    const lb = S.add(S.txt('base model', { size: 36, color: C.GREY_B }).at(40 + ax.fx(64), 100 + ax.fy(PASS.base[6][1]) - 40));
    const lr = S.add(S.txt('after RL', { size: 36, color: C.GREEN }).at(40 + ax.fx(4), 100 + ax.fy(PASS.rl[2][1]) - 40));
    const toy = S.add(S.toy(500, 380 - 70));
    S.beat('Reinforcement learning raises pass at one, a lot: the model puts more mass on answers it could already find. But Yue and colleagues found that with enough samples, base models often solve as many problems, or more. Much of the gain is sharpening, not new ability.',
      A.FadeOut(pk), A.FadeIn(ax), A.Create(cb, 1.6), A.FadeIn(lb), A.Create(cr, 1.6), A.FadeIn(lr), A.FadeIn(toy),
      { cap: 'Reinforcement learning raises pass@1 a lot: the model puts more mass on answers it could already find. But Yue et al. found that with enough samples, base models often solve as many problems, or more. Much of the gain is sharpening, not new ability.' });
    const ent = S.add(S.tex('H(\\pi) \\;=\\; -\\sum_a \\pi(a) \\log \\pi(a)', { size: 60, color: C.TEAL }).at(0, -290));
    S.beat('Sharpening has a cost: entropy falls, and with it, exploration. If the model never samples a correct answer, no gradient can reward it.', A.Write(ent, 1.6));
  });

  video.scene('unify', 'One equation', (S) => {
    const h = S.add(S.title('Every method, one shape'));
    const eq = S.add(S.tex('\\nabla_\\theta \\;\\approx\\; \\mathbb{E}\\Big[\\, \\class{f-w}{w(x, y)}\\; \\nabla_\\theta \\log \\pi_\\theta(y \\mid x) \\,\\Big]', { size: 84, color: C.YELLOW }).at(0, -300));
    S.beat('Step back. Every method in this film has the same shape: an average, over some answers, of a weight times the gradient of their log-probability. Only the weight changes.',
      A.FadeIn(h), A.Write(eq, 2), A.Focus(eq, 'w', { color: C.YELLOW }));
    const rows = [
      ['SFT', '1 \\text{ on demonstrations}', C.TEAL],
      ['REINFORCE', 'R(x, y)', C.BLUE],
      ['+ baseline', 'R - b = A', C.GREEN],
      ['PPO', 'A, \\text{ switched off by the clip}', C.YELLOW],
      ['DPO', '\\pm\\beta\\, \\sigma(\\hat r_l - \\hat r_w)', C.RED],
      ['GRPO', '(r_i - \\operatorname{mean}) / \\operatorname{std}', C.PINK],
    ];
    const rm = rows.map(([n, w, col], i) => S.add(S.group(new Text(n, { size: 44, color: col, anchor: 'end' }).at(-140, 0), new Tex(w, { size: 50, color: C.WHITE }).at(260, 0)).at(0, -150 + i * 82)));
    S.beat('For supervised fine-tuning, the weight is one, on the demonstrations. For REINFORCE, it is the reward. With a baseline, the advantage. For P P O, the advantage, switched off by the clip. For D P O, plus or minus beta, times a sigmoid of how wrong the implicit reward is. For G R P O, the group-normalized reward.',
      lag(1.3, rm.map((r) => A.FadeIn(r, { dx: -30 }))),
      { cap: 'For SFT the weight is 1, on the demonstrations. For REINFORCE, the reward. With a baseline, the advantage. For PPO, the advantage, switched off by the clip. For DPO, ±β times a sigmoid of how wrong the implicit reward is. For GRPO, the group-normalized reward.' });
    S.beat('The art is all in the weight: making it low in noise, honest enough, and hard to game, while keeping the policy close to what it already knows.', A.Unfocus(eq), lag(0.1, rm.map((r) => A.Indicate(r, { color: C.YELLOW, scale: 1.04, dur: 0.6 }))));
  });

  video.scene('recap', 'Recap', (S) => {
    const steps = ['a language model is a policy over tokens', 'the log-derivative trick turns a sampled reward into a gradient', 'baselines and critics tame the noise', 'PPO keeps each step small', 'Bradley–Terry turns preferences into rewards', 'the KL leash, and its exact solution, give DPO', 'verifiable rewards and group baselines give GRPO'];
    const sm = steps.map((t, i) => S.add(S.txt(t, { size: 40, color: [C.BLUE, C.YELLOW, C.GREEN, C.YELLOW, C.GOLD, C.RED, C.PINK][i] }).at(0, -330 + i * 80)));
    S.beat('Let us retrace the path. A language model is a policy over tokens. The log-derivative trick turns a reward we can only sample into a gradient we can estimate. Baselines and critics tame its noise. P P O keeps each step small.',
      lag(2.2, sm.slice(0, 4).map((m) => A.FadeIn(m, { dy: 20 }))),
      { cap: 'Let us retrace the path. A language model is a policy over tokens. The log-derivative trick turns a reward we can only sample into a gradient we can estimate. Baselines and critics tame its noise. PPO keeps each step small.' });
    S.beat('Preferences become rewards through Bradley-Terry. The K L leash keeps the policy near where it began, and its exact solution reveals D P O. And with verifiable rewards and group baselines, G R P O trains reasoning models without a critic.',
      lag(2.4, sm.slice(4).map((m) => A.FadeIn(m, { dy: 20 }))),
      { cap: 'Preferences become rewards through Bradley–Terry. The KL leash keeps the policy near where it began, and its exact solution reveals DPO. And with verifiable rewards and group baselines, GRPO trains reasoning models without a critic.' });
    const fin = S.add(S.tex('\\nabla_\\theta\\, \\mathbb{E}_{y \\sim \\pi_\\theta}\\big[R(y)\\big] \\;=\\; \\mathbb{E}_{y \\sim \\pi_\\theta}\\big[R(y)\\, \\nabla_\\theta \\log \\pi_\\theta(y)\\big]', { size: 84, color: C.YELLOW }).at(0, -40));
    const title = S.add(S.txt('The Gradient of Reward', { size: 54, color: C.GREY_B }).at(0, 140));
    S.beat('All of it rests on one line: the gradient of an expectation is the expectation of the reward, times the gradient of the log-probability. Thanks for watching.',
      par(sm.map((m) => A.FadeOut(m))), A.Write(fin, 2.4), A.FadeIn(title), { hold: 2.5 });
    S.keep();
  });

  /* =========================================================== papers on screen */
  // Sources behind the beats: the title only, small, bottom-left. The page
  // lists the full references from the same records. Each was checked
  // against the source itself (publisher, arXiv, NeurIPS/PMLR, author's blog).
  const INSERTS = [
    { from: 'mc.2', title: 'Simple Statistical Gradient-Following Algorithms for Connectionist Reinforcement Learning', ref: 'Williams, R. J. (1992). Machine Learning 8(3–4): 229–256. REINFORCE: "REward Increment = Nonnegative Factor x Offset Reinforcement x Characteristic Eligibility".', url: 'https://doi.org/10.1007/BF00992696' },
    { from: 'trick.3', title: 'Policy Gradient Methods for Reinforcement Learning with Function Approximation', ref: 'Sutton, R. S., McAllester, D., Singh, S. & Mansour, Y. (2000). Advances in Neural Information Processing Systems 12 (NIPS 1999): 1057–1063. The policy gradient theorem.', url: 'https://proceedings.neurips.cc/paper/1999/hash/464d828b85b0bed98e80ade0a5c43b0f-Abstract.html' },
    { from: 'baselines.1', title: 'Buy 4 REINFORCE Samples, Get a Baseline for Free!', ref: 'Kool, W., van Hoof, H. & Welling, M. (2019). ICLR 2019 workshop (Deep RL Meets Structured Prediction). The leave-one-out baseline.', url: 'https://openreview.net/forum?id=r1lgTGL5DE' },
    { from: 'baselines.2', title: 'Back to Basics: Revisiting REINFORCE Style Optimization for Learning from Human Feedback in LLMs', ref: 'Ahmadian, A., Cremer, C., Gallé, M., Fadaee, M., Kreutzer, J., Pietquin, O., Üstün, A. & Hooker, S. (2024). ACL 2024. RLOO outperforms PPO in their RLHF settings.', url: 'https://arxiv.org/abs/2402.14740' },
    { from: 'gae.1', title: 'High-Dimensional Continuous Control Using Generalized Advantage Estimation', ref: 'Schulman, J., Moritz, P., Levine, S., Jordan, M. & Abbeel, P. (2016). ICLR 2016. arXiv 1506.02438.', url: 'https://arxiv.org/abs/1506.02438' },
    { from: 'gae.4', title: 'Let’s Verify Step by Step', ref: 'Lightman, H., Kosaraju, V., Burda, Y. et al. (2023). PRM800K: 800K step-level labels; a process reward model reaches 78.2% (best-of-1860) vs 72.4% for an outcome model on a 500-problem MATH subset.', url: 'https://arxiv.org/abs/2305.20050' },
    { from: 'ratio.3', title: 'Trust Region Policy Optimization', ref: 'Schulman, J., Levine, S., Moritz, P., Jordan, M. & Abbeel, P. (2015). ICML 2015, PMLR 37: 1889–1897.', url: 'https://arxiv.org/abs/1502.05477' },
    { from: 'clip.1', title: 'Proximal Policy Optimization Algorithms', ref: 'Schulman, J., Wolski, F., Dhariwal, P., Radford, A. & Klimov, O. (2017). arXiv 1707.06347. "say, ε = 0.2".', url: 'https://arxiv.org/abs/1707.06347' },
    { from: 'bt.2', title: 'Rank Analysis of Incomplete Block Designs: I. The Method of Paired Comparisons', ref: 'Bradley, R. A. & Terry, M. E. (1952). Biometrika 39(3/4): 324–345.', url: 'https://doi.org/10.2307/2334029' },
    { from: 'bt.4', title: 'Deep Reinforcement Learning from Human Preferences', ref: 'Christiano, P., Leike, J., Brown, T. B., Martic, M., Legg, S. & Amodei, D. (2017). NIPS 2017. Reward models learned from comparisons, with feedback on less than 1% of interactions.', url: 'https://arxiv.org/abs/1706.03741' },
    { from: 'instruct.1', title: 'Training language models to follow instructions with human feedback', ref: 'Ouyang, L. et al. (2022). NeurIPS 2022. SFT, reward model (K = 4 to 9 ranked answers), PPO with a per-token KL penalty (β = 0.02); 1.3B InstructGPT preferred to 175B GPT-3.', url: 'https://arxiv.org/abs/2203.02155' },
    { from: 'hacking.2', title: 'Scaling Laws for Reward Model Overoptimization', ref: 'Gao, L., Schulman, J. & Hilton, J. (2023). ICML 2023, PMLR 202 (arXiv 2022). R_RL(d) = d(α − β log d), with d = √KL.', url: 'https://arxiv.org/abs/2210.10760' },
    { from: 'kl.4', title: 'Fine-Tuning Language Models from Human Preferences', ref: 'Ziegler, D. M., Stiennon, N., Wu, J., Brown, T. B., Radford, A., Amodei, D., Christiano, P. & Irving, G. (2019). arXiv 1909.08593. R(x, y) = r(x, y) − β log(π(y|x)/ρ(y|x)).', url: 'https://arxiv.org/abs/1909.08593' },
    { from: 'beta.3', title: 'RL with KL penalties is better viewed as Bayesian inference', ref: 'Korbak, T., Perez, E. & Buckley, C. L. (2022). Findings of EMNLP 2022. arXiv 2205.11275.', url: 'https://arxiv.org/abs/2205.11275' },
    { from: 'dpo.1', title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model', ref: 'Rafailov, R., Sharma, A., Mitchell, E., Ermon, S., Manning, C. D. & Finn, C. (2023). NeurIPS 2023. Eqs. 4, 5 and 7; the optimum derivation is in Appendix A.1.', url: 'https://arxiv.org/abs/2305.18290' },
    { from: 'rlvr.1', title: 'Tülu 3: Pushing Frontiers in Open Language Model Post-Training', ref: 'Lambert, N., Morrison, J., Pyatkin, V. et al. (2024). arXiv 2411.15124. RLVR: the RLHF objective with a verification function in place of the reward model (α = 10), trained with PPO.', url: 'https://arxiv.org/abs/2411.15124' },
    { from: 'grpo.1', title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models', ref: 'Shao, Z., Wang, P., Zhu, Q. et al. (2024). arXiv 2402.03300. GRPO, Eq. 3; 64 samples per question, KL coefficient 0.04 (with a learned reward model).', url: 'https://arxiv.org/abs/2402.03300' },
    { from: 'grpo.5', title: 'Approximating KL Divergence', ref: 'Schulman, J. (2020). Blog post, joschu.net. k1 = −log r, k2 = (log r)²/2, k3 = (r − 1) − log r with r = p(x)/q(x), x ~ q.', url: 'http://joschu.net/blog/kl-approx.html' },
    { from: 'dead.2', title: 'DAPO: An Open-Source LLM Reinforcement Learning System at Scale', ref: 'Yu, Q., Zhang, Z., Zhu, R., Yuan, Y. et al. (2025). arXiv 2503.14476. Clip-Higher (0.2 / 0.28), dynamic sampling, token-level loss, overlong shaping; 50 on AIME 2024 (avg@32) with Qwen2.5-32B.', url: 'https://arxiv.org/abs/2503.14476' },
    { from: 'dead.3', title: 'Understanding R1-Zero-Like Training: A Critical Perspective', ref: 'Liu, Z., Chen, C., Li, W., Qi, P. et al. (2025). COLM 2025. Response-level length bias and question-level difficulty bias; Dr. GRPO.', url: 'https://arxiv.org/abs/2503.20783' },
    { from: 'dead.4', title: 'Group Sequence Policy Optimization', ref: 'Zheng, C., Liu, S., Li, M., Chen, X.-H., Yu, B. et al. (2025). Qwen Team. arXiv 2507.18071. s_i(θ) = (π_θ(y_i|x)/π_old(y_i|x))^(1/|y_i|).', url: 'https://arxiv.org/abs/2507.18071' },
    { from: 'r1.1', title: 'DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning', ref: 'DeepSeek-AI (2025). Nature 645: 633–638. R1-Zero AIME 2024 pass@1 15.6% to 77.9% (arXiv v1, 2501.12948: 71.0%).', url: 'https://doi.org/10.1038/s41586-025-09422-z' },
    { from: 'passk.1', title: 'Evaluating Large Language Models Trained on Code', ref: 'Chen, M., Tworek, J., Jun, H., Yuan, Q. et al. (2021). arXiv 2107.03374. The unbiased pass@k estimator, Eq. 1.', url: 'https://arxiv.org/abs/2107.03374' },
    { from: 'passk.2', title: 'Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?', ref: 'Yue, Y., Chen, Z., Lu, R., Zhao, A., Wang, Z., Yue, Y., Song, S. & Huang, G. (2025). NeurIPS 2025. arXiv 2504.13837.', url: 'https://arxiv.org/abs/2504.13837' },
  ];
  video.sources = INSERTS;
  paperOverlay(video, INSERTS);

  function paperOverlay(v, inserts) {
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
    const tags = inserts.map((ins) => {
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
