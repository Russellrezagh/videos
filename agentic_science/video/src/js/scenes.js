/*
 * The script. Each scene is a list of beats: one narration line plus the
 * animations that play while it is spoken. Numbers that appear on screen
 * come from the QUARTET science code (kernel.js, lab.js), computed here.
 */
window.buildVideo = function buildVideo(root, durations) {
  'use strict';
  const { C, A, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix } = MV;
  const K = QuartetKernel;
  const Lab = quartetLabFactory(K);
  const M0 = K.makeModel(K.VARIANTS[0]);
  const M1 = K.makeModel(K.VARIANTS[1]);
  const TOPO = ['AB|CD', 'AC|BD', 'AD|BC'];
  const TOPO_SAY = ['A B bar C D', 'A C bar B D', 'A D bar B C'];

  /* ---------- science computed once, used on screen ---------- */
  const SC_A = { tLong: 1.0, tShort: 0.05 };
  const treeA = Lab.felsensteinTree(SC_A.tLong, SC_A.tShort);
  const align72 = Lab.simulateQuartet(treeA, 72, 20261006, 0, 72).sequences;
  const supportCounts = [0, 0, 0];
  for (let i = 0; i < 72; i++) {
    const cls = K.CLASSES[K.classOf(align72.map((q) => 'ACGT'.indexOf(q[i])))].label;
    if (cls === 'xxyy') supportCounts[0]++;
    if (cls === 'xyxy') supportCounts[1]++;
    if (cls === 'xyyx') supportCounts[2]++;
  }
  const infA = Lab.infiniteData({ tLong: 1.0, tShort: 0.05, pInv: 0 });
  const infB = Lab.infiniteData({ tLong: 0.75, tShort: 0.05, pInv: 0.3 });
  const studyA = { ns: [100, 300, 1000, 3000, 10000], pars: [0, 0, 0, 0, 0], ml: [0.61, 0.61, 0.825, 1, 1] };
  const gofData = Lab.simulateQuartet(Lab.felsensteinTree(0.75, 0.05), 5000, 11, 0.3).counts;
  const gofJC = Lab.adequacy(gofData);
  const gofJCI = Lab.adequacy(gofData, { invariant: true });
  const jcd = (t, M) => Lab.jcDistance(1 - M.p(t).same);

  const video = new MV.Video(root, { durations, kit });

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
    // A labelled box
    k.box = (label, { w = 360, h = 110, color = C.BLUE, size = 38, fill = null, textColor = C.WHITE, sub = null } = {}) => {
      const r = rect(w, h, { stroke: color, width: 3, fill: fill || mix(C.BG, color, 0.12), rx: 10 });
      const t = new Text(label, { size, color: textColor });
      const g = new Group(r, t);
      if (sub) {
        t.at(0, -h * 0.14);
        g.add(new Text(sub, { size: size * 0.62, color: C.GREY_B }).at(0, h * 0.22));
      }
      g.rect = r;
      g.label = t;
      return H(g);
    };
    // A check mark or a cross, drawn as a stroke
    k.check = (size = 40, color = C.GREEN) => H(path(`M ${-size * 0.5} 0 L ${-size * 0.12} ${size * 0.38} L ${size * 0.55} ${-size * 0.45}`, { stroke: color, width: Math.max(4, size / 7) }));
    k.cross = (size = 40, color = C.RED) => H(path(`M ${-size / 2} ${-size / 2} L ${size / 2} ${size / 2} M ${size / 2} ${-size / 2} L ${-size / 2} ${size / 2}`, { stroke: color, width: Math.max(4, size / 7) }));
    // A row of DNA letters
    k.dna = (str, { size = 46, gap = 40, color = null } = {}) => {
      const letters = [...str].map((ch, i) => new Text(ch, { size, color: color || MV.BASE_COLORS[ch] || C.WHITE, font: 'mono', weight: 500 }).at((i - (str.length - 1) / 2) * gap, 0));
      const g = new Group(...letters);
      g.letters = letters;
      g.gap = gap;
      return H(g);
    };
    // An unrooted quartet tree. lens: visual lengths per taxon; topo 0..2
    k.quartet = ({ topo = 0, long = [], scale = 1, short = 95, longLen = 250, mid = 70, labelSize = 56, color = C.WHITE, longColor = C.RED, width = 5 } = {}) => {
      const cher = K.TOPOLOGIES[topo].cherries;
      const names = ['A', 'B', 'C', 'D'];
      const len = (i) => (long.includes(i) ? longLen : short);
      const u = [-mid / 2, 0];
      const v = [mid / 2, 0];
      const dirs = [[-0.72, -0.69], [-0.72, 0.69], [0.72, -0.69], [0.72, 0.69]];
      const ends = {};
      const g = new Group();
      const internal = new Line(u[0], u[1], v[0], v[1], { stroke: color, width: width + 1 });
      g.add(internal);
      const branches = {};
      const leaves = {};
      [[cher[0][0], u, 0], [cher[0][1], u, 1], [cher[1][0], v, 2], [cher[1][1], v, 3]].forEach(([taxon, base, slot]) => {
        const L = len(taxon);
        const d = dirs[slot];
        const end = [base[0] + d[0] * L, base[1] + d[1] * L];
        ends[taxon] = end;
        const isLong = long.includes(taxon);
        const ln = new Line(base[0], base[1], end[0], end[1], { stroke: isLong ? longColor : color, width: isLong ? width + 1 : width });
        branches[names[taxon]] = ln;
        g.add(ln);
        const lbl = new Text(names[taxon], { size: labelSize, color: isLong ? longColor : color, italic: true }).at(end[0] + d[0] * 38, end[1] + d[1] * 38);
        leaves[names[taxon]] = lbl;
        g.add(lbl);
      });
      [u, v].forEach((q) => g.add(dot(width + 2, color).at(q[0], q[1])));
      g.scale(scale);
      g.internal = internal;
      g.branches = branches;
      g.leaves = leaves;
      g.ends = ends;
      g.dirs = {};
      [[cher[0][0], 0], [cher[0][1], 1], [cher[1][0], 2], [cher[1][1], 3]].forEach(([taxon, slot]) => (g.dirs[taxon] = dirs[slot]));
      g.out = (taxon, d) => [ends[taxon][0] + g.dirs[taxon][0] * d, ends[taxon][1] + g.dirs[taxon][1] * d];
      g.u = u;
      g.v = v;
      g.grow = (dur = 1.6) => seq(A.Create(internal, dur * 0.25), par(Object.values(branches).map((b) => A.Create(b, dur * 0.5))), par(Object.values(leaves).map((l) => A.FadeIn(l, { dur: dur * 0.25 }))));
      // mark every child as drawn-from-zero so grow() works on first reveal
      Object.values(branches).concat([internal]).forEach((b) => (b.init.draw = 0));
      Object.values(leaves).forEach((l) => (l.init.o = 0));
      return H(g);
    };
    // Axes with mapping helpers
    k.axes = ({ x0 = 0, x1 = 1, y0 = 0, y1 = 1, w = 900, h = 520, logx = false, xticks = [], yticks = [], xlabel = '', ylabel = '', size = 28, xfmt = (v) => String(v), yfmt = (v) => String(v) } = {}) => {
      const g = new Group();
      const fx = (x) => (logx ? (Math.log10(x) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0)) : (x - x0) / (x1 - x0)) * w - w / 2;
      const fy = (y) => h / 2 - ((y - y0) / (y1 - y0)) * h;
      const xa = new Line(-w / 2, h / 2, w / 2 + 20, h / 2, { stroke: C.GREY_B, width: 3 });
      const ya = new Line(-w / 2, h / 2, -w / 2, -h / 2 - 20, { stroke: C.GREY_B, width: 3 });
      g.add(xa, ya);
      xticks.forEach((v) => {
        g.add(new Line(fx(v), h / 2, fx(v), h / 2 + 12, { stroke: C.GREY_B, width: 3 }));
        g.add(new Text(xfmt(v), { size, color: C.GREY_B }).at(fx(v), h / 2 + 38));
      });
      yticks.forEach((v) => {
        g.add(new Line(-w / 2 - 12, fy(v), -w / 2, fy(v), { stroke: C.GREY_B, width: 3 }));
        g.add(new Text(yfmt(v), { size, color: C.GREY_B, anchor: 'end' }).at(-w / 2 - 22, fy(v)));
      });
      if (xlabel) g.add(new Text(xlabel, { size: size + 2, color: C.GREY_B, anchor: 'end' }).at(w / 2 + 20, h / 2 - 26));
      if (ylabel) g.add(new Text(ylabel, { size: size + 2, color: C.GREY_B, anchor: 'start' }).at(-w / 2 - 10, -h / 2 - 50));
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
      g.polyline = (pts, { color = C.BLUE, width = 6 } = {}) => {
        const p = path(polyPath(pts.map(([x, y]) => [fx(x), fy(y)])), { stroke: color, width });
        p.init.draw = 0;
        p.init.o = 0;
        g.add(p);
        return p;
      };
      return H(g);
    };
    // Simple icons
    k.cabinet = (label, { w = 300, h = 170, color = C.BLUE } = {}) => {
      const g = new Group(rect(w, h, { stroke: color, width: 3, fill: mix(C.BG, color, 0.1), rx: 8 }));
      for (let i = 1; i < 3; i++) g.add(new Line(-w / 2, -h / 2 + (i * h) / 3, w / 2, -h / 2 + (i * h) / 3, { stroke: color, width: 2 }));
      for (let i = 0; i < 3; i++) g.add(new Line(-24, -h / 2 + ((i + 0.5) * h) / 3, 24, -h / 2 + ((i + 0.5) * h) / 3, { stroke: color, width: 4 }));
      if (label) g.add(new Text(label, { size: 32, color: C.GREY_B }).at(0, h / 2 + 34));
      return H(g);
    };
    k.desk = (label, { w = 340, color = C.WHITE } = {}) => {
      const g = new Group(
        new Line(-w / 2, 40, w / 2, 40, { stroke: color, width: 5 }),
        new Line(-w / 2 + 24, 40, -w / 2 + 24, 120, { stroke: color, width: 5 }),
        new Line(w / 2 - 24, 40, w / 2 - 24, 120, { stroke: color, width: 5 })
      );
      if (label) g.add(new Text(label, { size: 30, color: C.GREY_B }).at(0, 158));
      return H(g);
    };
    k.page = (label, { color = C.WHITE, w = 90, h = 116, size = 22 } = {}) => {
      const d = `M ${-w / 2} ${-h / 2} H ${w / 2 - 24} L ${w / 2} ${-h / 2 + 24} V ${h / 2} H ${-w / 2} Z`;
      const g = new Group(path(d, { stroke: color, width: 3, fill: '#1a1c22' }));
      for (let i = 0; i < 4; i++) g.add(new Line(-w / 2 + 14, -h / 2 + 34 + i * 18, w / 2 - 14, -h / 2 + 34 + i * 18, { stroke: mix(color, C.BG, 0.5), width: 2 }));
      // the file name sits above the sheet, clear of the desk it lies on
      if (label) g.add(new Text(label, { size, color }).at(0, -h / 2 - Math.max(size, 30) * 0.85));
      return H(g);
    };
    k.quote = (str, who, { size = 38, y = 0, width = 1400 } = {}) => {
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
      if (who) g.add(new Text(who, { size: size * 0.7, color: C.GREY_B }).at(0, ((lines.length + 1) / 2) * size * 1.35 + 10));
      g.at(0, y);
      return H(g);
    };
    k.tag = (str, { color = C.GREY_B, size = 28 } = {}) => H(new Text(str, { size, color, font: 'mono' }));
    // camera flies to one fragment of a Tex and back
    k.zoomTo = (m, frag, z = 2.2, dur = 1.6) => S.camTarget(() => {
      const b = m.fragBox(frag);
      return { cx: m.p.x + m.p.s * b.cx, cy: m.p.y + m.p.s * b.cy, z };
    }, dur);
    k.pullBack = (dur = 1.4) => S.cam(0, 0, 1, dur);
    // a vertical bar that grows from its base
    k.bar = (x, base, h, color, width = 70) => {
      const b = new Line(x, base, x, base - h, { stroke: color, width });
      b.s.setAttribute('stroke-linecap', 'butt');
      b.init.draw = 0;
      return H(b);
    };
    k.toTitle = (m, y = -450, s = 0.68) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s));
    return k;
  }

  /* =========================================================== CHAPTER 1 */
  video.chapter('ch1', 'The question');

  video.scene('open', 'Should you believe it?', (S) => {
    const { A } = S;
    const agent = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 1.25 }).at(-420, 120));
    const bub = S.add(S.bubble('I verified it. Everything checks out.', { size: 40, side: 'left' }).at(-120, -120));
    const sci = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 1.25 }).at(520, 120).with({ lx: -1, mood: 0.1 }));
    const q = S.add(S.txt('?', { size: 150, color: C.YELLOW }).at(520, -150));
    S.beat('Imagine an AI agent finishes a long piece of research for you. Then it says: I verified it. Everything checks out.',
      A.FadeIn(agent, { dy: 40 }), A.FadeIn(bub, { dur: 0.6 }), A.Write(bub.text, 1.6), A.Mood(agent, 1, 0.4));
    S.beat('Should you believe it? Not because the agent is lying, but because nobody, human or machine, gets everything right on the first try.',
      A.FadeIn(sci, { dy: 40 }), A.Look(agent, 1, 0, 0.4), A.Write(q, 0.8), A.Mood(sci, -0.3), A.Blink(sci));
    const title = S.add(S.head('The Tree and the Agent', { size: 100 }).at(0, -40));
    const sub = S.add(S.txt('how to do science with AI agents, and how to know when it is right', { size: 40, color: C.GREY_B }).at(0, 60));
    S.beat('This video is about how to do science with AI agents, and how to know when the science is actually right.',
      par(A.FadeOut(agent), A.FadeOut(bub), A.FadeOut(sci), A.FadeOut(q)), A.Write(title, 1.8), A.FadeIn(sub, { dy: 20 }));
    const s1 = S.add(S.txt('Isolation protects work.', { size: 64, color: C.BLUE }).at(0, -40));
    const s2 = S.add(S.txt('Evidence supports claims.', { size: 64, color: C.YELLOW }).at(0, 60));
    S.beat('By the end, two short sentences will make complete sense. Isolation protects work. Evidence supports claims.',
      par(A.FadeOut(title, { dy: -40 }), A.FadeOut(sub, { dy: -40 })), A.Write(s1, 1.2), wait(0.4), A.Write(s2, 1.2));
    const tr = S.add(S.quartet({ long: [0, 2], scale: 0.6 }).at(0, 210));
    S.beat('We will get there through one small puzzle from biology. You do not need any biology to follow it. We will build everything from zero.',
      par(A.MoveTo(s1, 0, -300), A.MoveTo(s2, 0, -210)), A.Show(tr), tr.grow(2));
  });

  video.scene('agents', 'What is an AI agent?', (S) => {
    const h = S.add(S.head('What is an AI agent?'));
    S.beat('First, what do we even mean by an AI agent?', A.Write(h, 1.2));
    const chatL = S.add(S.txt('a chatbot', { size: 44, color: C.BLUE }).at(-560, -250));
    const chat = S.add(S.creature({ color: C.BLUE, kind: 'agent' }).at(-560, 110));
    const chatB = S.add(S.bubble('Here is an answer.', { size: 34 }).at(-390, -95));
    S.beat('A chatbot answers a question, and then it stops.', S.toTitle(h), A.FadeIn(chatL), A.FadeIn(chat, { dy: 30 }), A.FadeIn(chatB), A.Write(chatB.text, 1));
    const agL = S.add(S.txt('an agent', { size: 44, color: C.TEAL }).at(400, -250));
    const ag = S.add(S.creature({ color: C.TEAL, kind: 'agent' }).at(400, 110));
    const tools = ['write code', 'run it', 'read the output', 'fix mistakes', 'take notes', 'try again'];
    const angles = [-150, -30, 0, 30, 150, 180];
    const toolMobs = tools.map((t, i) => {
      const a = ((angles[i] + (i === 2 ? 0 : 0)) * Math.PI) / 180;
      const rx = 330;
      const ry = 200;
      return S.add(S.txt(t, { size: 34, color: C.TEAL }).at(400 + rx * Math.cos(a), 110 + ry * Math.sin(a) + (i === 2 || i === 5 ? 0 : 0)));
    });
    S.beat('An agent keeps going. It writes code, runs it, reads the output, fixes its mistakes, takes notes, and tries again, often for hours.',
      A.FadeIn(agL), A.FadeIn(ag, { dy: 30 }), lag(0.35, toolMobs.map((m) => A.FadeIn(m, { dur: 0.6, from: 0.6 }))), lag(0.06, toolMobs.map((m) => A.Indicate(m, { dur: 0.6 }))));
    const h2 = S.add(S.title('Agentic science'));
    const sci = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 1.1 }).at(0, 40));
    const sciL = S.add(S.txt('scientist', { size: 36, color: C.GOLD }).at(0, 210));
    const pos = [[-600, -170], [600, -170], [-600, 230], [600, 230]];
    const agents = pos.map(([x, y]) => S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.72 }).at(x, y)));
    const arrowsOut = [];
    const arrowsBack = [];
    pos.forEach(([x, y]) => {
      const dx = x - 0;
      const dy = y - 40;
      const L = Math.hypot(dx, dy);
      const ux = dx / L;
      const uy = dy / L;
      const nx = -uy * 16;
      const ny = ux * 16;
      arrowsOut.push(S.add(S.arrow(ux * 140 + nx, 40 + uy * 140 + ny, ux * (L - 110) + nx, 40 + uy * (L - 110) + ny, { color: C.GOLD, width: 4 })));
      arrowsBack.push(S.add(S.arrow(ux * (L - 110) - nx, 40 + uy * (L - 110) - ny, ux * 140 - nx, 40 + uy * 140 - ny, { color: C.TEAL, width: 4 })));
    });
    const taskL = S.add(S.txt('tasks →', { size: 34, color: C.GOLD }).at(-330, -150));
    const resL = S.add(S.txt('← results', { size: 34, color: C.TEAL }).at(330, 250));
    S.beat('In agentic science, a human scientist directs several of these agents. The scientist hands out tasks. The agents send back results.',
      par(A.FadeOut(h), A.FadeOut(chat), A.FadeOut(chatB), A.FadeOut(chatL), A.FadeOut(ag), A.FadeOut(agL), toolMobs.map((m) => A.FadeOut(m))),
      A.FadeIn(h2), A.FadeIn(sci, { dy: 30 }), A.FadeIn(sciL), lag(0.15, agents.map((a) => A.FadeIn(a, { from: 0.4 }))), lag(0.12, arrowsOut.map((a) => A.Arrow(a, 0.6))), A.FadeIn(taskL), lag(0.12, arrowsBack.map((a) => A.Arrow(a, 0.6))), A.FadeIn(resL));
    const card = S.add(S.box('Matthew Schwartz · Harvard physics · 2026', { w: 1200, h: 90, color: C.BLUE, size: 40 }).at(0, -300));
    const stats = [['102', 'tasks'], ['270', 'sessions'], ['2', 'weeks']].map(([n, l], i) => S.add(S.group(new Text(n, { size: 120, color: C.BLUE }), new Text(l, { size: 40, color: C.GREY_B }).at(0, 90)).at(-420 + i * 420, -90)));
    S.beat('This is already real. In twenty twenty-six, the Harvard physicist Matthew Schwartz supervised Claude through a genuine research calculation: one hundred and two tasks, two hundred and seventy sessions, about two weeks instead of the usual year.',
      par([sci, sciL, taskL, resL, ...agents, ...arrowsOut, ...arrowsBack].map((m) => A.FadeOut(m))), A.FadeIn(card, { dy: -20 }), lag(0.3, stats.map((m) => A.FadeIn(m, { dy: 30 }))),
      { cap: 'This is already real. In 2026, the Harvard physicist Matthew Schwartz supervised Claude through a genuine research calculation: 102 tasks, 270 sessions, about two weeks instead of the usual year.' });
    const probs = ['a key formula was wrong from the start', 'plots were tuned to match instead of fixed', '“verified” said without checking'].map((p, i) => {
      const g = S.group(S.cross(36).with({ o: 1 }), new Text(p, { size: 42, anchor: 'start' }).at(50, 0));
      return S.add(g.at(-470, 120 + i * 90));
    });
    S.beat('It worked. But he also reports what went wrong. A key formula was wrong from the start. Plots were adjusted to match, instead of being fixed. And the agent sometimes said verified when it had not checked.',
      lag(0.9, probs.map((m) => A.FadeIn(m, { dx: -30 }))));
    const p1 = S.add(S.box('Keep the work organized', { w: 760, h: 150, color: C.BLUE, size: 46, sub: 'so it does not collide or get lost' }).at(-440, -60));
    const p2 = S.add(S.box('Know when it is right', { w: 760, h: 150, color: C.YELLOW, size: 46, sub: 'so a result deserves belief' }).at(440, -60));
    const n1 = S.add(S.txt('Problem 1', { size: 36, color: C.BLUE }).at(-440, -180));
    const n2 = S.add(S.txt('Problem 2', { size: 36, color: C.YELLOW }).at(440, -180));
    S.beat('So agentic science has two separate problems. One: keep a big, fast, many-agent project organized, so work does not collide or get lost. Two: know whether a result is actually correct.',
      par(A.FadeOut(card), stats.map((m) => A.FadeOut(m)), probs.map((m) => A.FadeOut(m)), A.FadeOut(h2)), par(A.FadeIn(n1), A.FadeIn(p1, { dy: 30 })), wait(1.2), par(A.FadeIn(n2), A.FadeIn(p2, { dy: 30 })));
    const a1 = S.add(S.txt('Isolation protects work.', { size: 50, color: C.BLUE }).at(-440, 130));
    const a2 = S.add(S.txt('Evidence supports claims.', { size: 50, color: C.YELLOW }).at(440, 130));
    S.beat('Our two sentences answer these two problems. Now let us build the puzzle that will carry both of them.', A.Write(a1, 1.1), A.Write(a2, 1.1));
  });

  /* =========================================================== CHAPTER 2 */
  video.chapter('ch2', 'The puzzle: a family tree from DNA');

  video.scene('dna', 'DNA and branch length', (S) => {
    const h = S.add(S.head('DNA is a string of four letters'));
    const big = ['A', 'C', 'G', 'T'].map((b, i) => S.add(S.txt(b, { size: 150, color: MV.BASE_COLORS[b], font: 'mono', weight: 500 }).at(-300 + i * 200, 140)));
    S.beat('Every living thing carries DNA. For our purposes, DNA is just a very long string, written with four letters: A, C, G, and T.', A.Write(h, 1.4), lag(0.35, big.map((m) => A.FadeIn(m, { dy: 30 }))));
    const seqStr = 'ATGGCGTACCTGAAGTCGATTCGA';
    const row = S.add(S.dna(seqStr, { size: 50, gap: 56 }).at(0, -40));
    row.letters.forEach((l) => (l.init.o = 0));
    S.beat('Here is a short stretch of it. Each position in the string is called a site.', S.toTitle(h), par(big.map((m) => A.FadeOut(m))), A.Show(row), lag(0.05, row.letters.map((l) => A.FadeIn(l, { dur: 0.4, dy: 20 }))));
    const hl = S.add(S.rect(52, 80, { stroke: C.YELLOW, width: 4, rx: 6 }).at(-row.gap * 11.5, -40));
    const siteL = S.add(S.txt('site 1', { size: 36, color: C.YELLOW }).at(-row.gap * 11.5, -120));
    S.beat('Site one, site two, site three, and so on, all the way along.',
      A.Create(hl, 0.6), A.FadeIn(siteL),
      seq([1, 2, 3, 4].map((i) => par(A.MoveTo(hl, -row.gap * (11.5 - i), -40, 0.45), A.MoveTo(siteL, -row.gap * (11.5 - i), -120, 0.45), A.Set(siteL, { str: `site ${i + 1}` }, 0.01)))));
    // ancestor splits into two
    const top = S.add(S.dna(seqStr, { size: 46, gap: 52 }).at(80, -120));
    const bot = S.add(S.dna(seqStr, { size: 46, gap: 52 }).at(80, 150));
    const anc = S.add(S.dot(10, C.WHITE).at(-820, 15));
    const b1 = S.add(S.line(-820, 15, -620, -120, { stroke: C.WHITE, width: 4 }).with({ draw: 0 }));
    const b2 = S.add(S.line(-820, 15, -620, 150, { stroke: C.WHITE, width: 4 }).with({ draw: 0 }));
    const l1 = S.add(S.txt('species 1', { size: 30, color: C.GREY_B }).at(-650, -170));
    const l2 = S.add(S.txt('species 2', { size: 30, color: C.GREY_B }).at(-650, 200));
    const ancL = S.add(S.txt('ancestor', { size: 30, color: C.GREY_B }).at(-820, 60));
    S.beat('When a species splits in two, both new species start out with the same DNA.',
      par(A.FadeOut(hl), A.FadeOut(siteL), A.FadeOut(row)), A.FadeIn(anc), A.FadeIn(ancL), par(A.Create(b1), A.Create(b2)), par(A.FadeIn(top, { dy: 60 }), A.FadeIn(bot, { dy: -60 }), A.FadeIn(l1), A.FadeIn(l2)));
    const flipsTop = [[3, 'A'], [9, 'T'], [15, 'C'], [20, 'G']];
    const flipsBot = [[1, 'C'], [7, 'C'], [12, 'G'], [18, 'A'], [22, 'T']];
    const flip = (rowG, [i, b]) => par(A.Set(rowG.letters[i], { str: b, color: MV.BASE_COLORS[b] }, 0.3), A.Indicate(rowG.letters[i], { scale: 1.5, color: C.WHITE, dur: 0.6 }));
    const diffL = S.add(S.txt('differences: 0', { size: 40, color: C.YELLOW }).at(80, 15));
    S.beat('Then, over time, random mutations change single letters. Each copy collects its own changes, independently of the other.',
      A.FadeIn(diffL), lag(0.35, [...flipsTop.map((f) => flip(top, f)), ...flipsBot.map((f) => flip(bot, f))]), A.Count(diffL, 0, 9, (v) => `differences: ${Math.round(v)}`, 0.8));
    // branch length
    const axisL = S.add(S.arrow(-700, 300, 700, 300, { color: C.GREY_B, width: 4 }).with({ draw: 0 }));
    const timeL = S.add(S.txt('time apart →', { size: 32, color: C.GREY_B }).at(560, 345));
    const ticks = [];
    for (let i = 0; i < 18; i++) {
      const x = -680 + ((i + 0.5) * 1360) / 18 + (i % 3) * 9;
      ticks.push(S.add(S.line(x, 282, x, 318, { stroke: C.YELLOW, width: 4 })));
    }
    S.beat('The longer two lineages have been apart, the more their strings differ. Biologists call this separation a branch length.',
      par(A.FadeOut(top), A.FadeOut(bot), A.FadeOut(anc), A.FadeOut(ancL), A.FadeOut(b1), A.FadeOut(b2), A.FadeOut(l1), A.FadeOut(l2), A.FadeOut(diffL)), A.Arrow(axisL, 1.2), A.FadeIn(timeL), lag(0.1, ticks.map((t) => A.FadeIn(t, { dur: 0.25, from: 2 }))));
    const conv = S.add(S.box('branch length = expected changes per site', { w: 1240, h: 120, color: C.GOLD, size: 50 }).at(0, -40));
    const ex = S.add(S.txt('length 0.1  means about one change for every ten sites', { size: 38, color: C.GREY_B }).at(0, 90));
    S.beat('It is measured in expected changes per site. A branch of length zero point one means about one change for every ten sites.',
      A.FadeIn(conv, { from: 0.8 }), A.FadeIn(ex, { dy: 20 }), { cap: 'It is measured in expected changes per site. A branch of length 0.1 means about one change for every ten sites.' });
    S.beat('Remember that definition. It will matter a lot later.', A.Indicate(conv, { color: C.GOLD, scale: 1.06, dur: 1.2 }));
  });

  video.scene('trees', 'Three possible trees', (S) => {
    const h = S.add(S.head('Four species. Who is related to whom?'));
    S.beat('Now the puzzle. We have DNA from four living species. Call them A, B, C, and D.', A.Write(h, 1.6));
    const rows = ['A', 'B', 'C', 'D'].map((n, i) => {
      const lbl = new Text(n, { size: 48, italic: true, color: C.WHITE }).at(-560, 0);
      const d = new Group(...[...align72[i].slice(0, 18)].map((ch, j) => new Text(ch, { size: 42, color: MV.BASE_COLORS[ch], font: 'mono', weight: 500 }).at(-470 + j * 54, 0)));
      return S.add(S.group(lbl, d).at(0, -230 + i * 70));
    });
    const col = S.add(S.rect(50, 300, { stroke: C.YELLOW, width: 3, rx: 6 }).at(-470 + 4 * 54, -125));
    S.beat('We line their strings up, site by site. This is called an alignment. Each column compares the four species at one site.',
      S.toTitle(h), lag(0.2, rows.map((r) => A.FadeIn(r, { dx: -40 }))), A.Create(col, 0.8), A.MoveTo(col, -470 + 9 * 54, -125, 1));
    const trees = [0, 1, 2].map((tp) => S.add(S.quartet({ topo: tp, scale: 0.62, short: 150, mid: 80 }).at(-600 + tp * 600, 170)));
    const labels = [0, 1, 2].map((tp) => S.add(S.txt(TOPO[tp], { size: 46, font: 'mono' }).at(-600 + tp * 600, 320)));
    S.beat('We want their family tree. With four species, there are only three ways to pair them up: A with B, A with C, or A with D.',
      par(A.FadeOut(col), rows.map((r, i) => A.Shift(r, 0, -40 + i * -8))), lag(0.5, trees.map((t) => seq(A.Show(t), t.grow(1.2)))), lag(0.3, labels.map((l) => A.FadeIn(l))));
    S.beat('We name each tree by how it splits the four. The first tree pairs A with B, and C with D. Biologists write it as A B, C D. Our job is to decide which of the three trees the DNA supports.',
      lag(0.6, labels.map((l) => A.Indicate(l, { dur: 0.9 }))), { cap: 'We name each tree by how it splits the four. The first tree pairs A with B, and C with D: written AB|CD. Our job: decide which of the three trees the DNA supports.' });
    const truth = S.add(S.rect(520, 300, { stroke: C.GREEN, width: 4, rx: 12 }).at(-600, 205));
    const truthL = S.add(S.txt('the truth (we simulated it)', { size: 34, color: C.GREEN }).at(-600, 20));
    S.beat('In this project we cheat, on purpose. We simulate the evolution ourselves, on the first tree. So we know the right answer, and we can check whether a method finds it.',
      A.Create(truth, 1), A.FadeIn(truthL, { dy: 20 }));
  });

  video.scene('parsimony', 'Method 1: parsimony', (S) => {
    const h = S.add(S.head('Method 1: count the changes'));
    S.beat('The first method is called parsimony. The idea is simple: prefer the tree that needs the fewest mutations.', A.Write(h, 1.4));
    const colLetters = ['G', 'G', 'T', 'T'];
    const column = S.add(S.group(...['A', 'B', 'C', 'D'].map((n, i) => new Group(new Text(n, { size: 44, italic: true }).at(-46, 0), new Text(colLetters[i], { size: 48, font: 'mono', weight: 500, color: MV.BASE_COLORS[colLetters[i]] }).at(30, 0)).at(0, -120 + i * 74))).at(-780, 40));
    const colL = S.add(S.txt('one site', { size: 32, color: C.GREY_B }).at(-780, -150));
    const mkTree = (topo, x) => {
      const t = S.quartet({ topo, scale: 0.85, short: 170, mid: 110 }).at(x, 40);
      const names = ['A', 'B', 'C', 'D'];
      const leafLetters = names.map((n, i) => {
        const [x, y] = t.out(i, 105);
        return new Text(colLetters[i], { size: 50, font: 'mono', weight: 500, color: MV.BASE_COLORS[colLetters[i]] }).at(x, y);
      });
      leafLetters.forEach((l) => (l.init.o = 0));
      t.add(...leafLetters);
      t.leafLetters = leafLetters;
      return S.add(t);
    };
    const t1 = mkTree(0, -200);
    const t2 = mkTree(1, 480);
    const lab1 = S.add(S.txt('AB|CD', { size: 44, font: 'mono' }).at(-200, -230));
    const lab2 = S.add(S.txt('AC|BD', { size: 44, font: 'mono' }).at(480, -230));
    const m1 = S.add(S.dot(14, C.YELLOW).at(-200, 40));
    const c1 = S.add(S.txt('1 change', { size: 40, color: C.GREEN }).at(-200, 290));
    S.beat('Look at one single site. Species A and species B both have the letter G. Species C and D both have the letter T. On the tree that pairs A with B, one single mutation, on the middle branch, explains everything.',
      S.toTitle(h), A.FadeIn(colL), A.FadeIn(column, { dx: -30 }), A.FadeIn(lab1), A.Show(t1), t1.grow(1.2), lag(0.1, t1.leafLetters.map((l) => A.FadeIn(l, { from: 1.6 }))), A.FadeIn(m1, { from: 3 }), A.FadeIn(c1),
      { cap: 'Look at one single site. Species A and B both have the letter G. Species C and D both have the letter T. On the tree AB|CD, one single mutation, on the middle branch, explains everything.' });
    const e = t2.ends;
    const mA = S.add(S.dot(14, C.YELLOW).at(480 + e[0][0] * 0.85 * 0.5, 40 + e[0][1] * 0.85 * 0.5));
    const mC = S.add(S.dot(14, C.YELLOW).at(480 + e[2][0] * 0.85 * 0.5, 40 + e[2][1] * 0.85 * 0.5));
    const c2 = S.add(S.txt('2 changes', { size: 40, color: C.RED }).at(480, 290));
    S.beat('On the tree that pairs A with C, you need at least two mutations. So this site votes for the tree that pairs A with B.',
      A.FadeIn(lab2), A.Show(t2), t2.grow(1.2), lag(0.1, t2.leafLetters.map((l) => A.FadeIn(l, { from: 1.6 }))), lag(0.3, [A.FadeIn(mA, { from: 3 }), A.FadeIn(mC, { from: 3 })]), A.FadeIn(c2), A.Indicate(c1, { color: C.GREEN, scale: 1.3 }),
      { cap: 'On the tree AC|BD you need at least two mutations. So this site votes for AB|CD.' });
    // tally
    const base = 300;
    const bars = [C.GREEN, C.RED, C.GREY].map((col, i) => S.add(S.bar(-260 + i * 260, base, [300, 120, 90][i], col, 110)));
    const blabels = TOPO.map((t, i) => S.add(S.txt(t, { size: 40, font: 'mono' }).at(-260 + i * 260, base + 46)));
    const tallyT = S.add(S.txt('sites that vote for each tree', { size: 38, color: C.GREY_B }).at(0, -260));
    S.beat('Parsimony goes through every site, adds up the votes, and picks the tree that needs the fewest changes. It is fast, and it needs no model of evolution at all. Remember that last part.',
      par([column, colL, t1, t2, lab1, lab2, m1, mA, mC, c1, c2].map((m) => A.FadeOut(m))), A.FadeIn(tallyT), lag(0.2, bars.map((b) => A.Create(b, 1.2))), lag(0.2, blabels.map((b) => A.FadeIn(b))));
  });

  video.scene('ml', 'Method 2: maximum likelihood', (S) => {
    const h = S.add(S.head('Method 2: which tree makes the data most likely?', { size: 66 }));
    S.beat('The second method is called maximum likelihood. Instead of counting changes, it asks a different question: if this tree were the truth, how probable would our exact data be?', A.Write(h, 1.8));
    const center = S.add(S.txt('A', { size: 110, color: MV.BASE_COLORS.A, font: 'mono', weight: 500 }).at(-420, 60));
    const others = ['C', 'G', 'T'].map((b, i) => S.add(S.txt(b, { size: 90, color: MV.BASE_COLORS[b], font: 'mono', weight: 500 }).at(80, -120 + i * 180)));
    const arrows = others.map((o, i) => S.add(S.arrow(-340, 60, 20, -120 + i * 180, { color: C.GREY_B, width: 4 })));
    const probs = others.map((o, i) => S.add(S.tex('\\tfrac13', { size: 64, color: C.YELLOW }).at(-150, [-125, 10, 240][i])));
    const mdl = S.add(S.txt('Jukes–Cantor model', { size: 44, color: C.YELLOW }).at(560, 60));
    S.beat('To compute a probability, we need a model of how mutations happen. The simplest one is the Jukes Cantor model. Mutations strike at random, and each one turns the letter into one of the other three, all equally likely.',
      S.toTitle(h), A.FadeIn(center), lag(0.3, arrows.map((a) => A.Arrow(a, 0.7))), lag(0.3, others.map((o) => A.FadeIn(o))), lag(0.2, probs.map((p) => A.Write(p, 0.6))), A.FadeIn(mdl),
      { cap: 'To compute a probability, we need a model of how mutations happen. The simplest is the Jukes–Cantor model: mutations strike at random, and each one turns the letter into one of the other three, all equally likely.' });
    const eq = S.add(S.tex('P_{\\text{same}}(t) \\;=\\; \\class{f-quarter}{\\tfrac14} \\;+\\; \\class{f-amp}{\\tfrac34}\\, e^{-\\class{f-rate}{\\frac{4}{3}}\\,\\class{f-t}{t}}', { size: 92 }).at(0, -300));
    S.beat('From that model, you can work out the chance that a site shows the same letter at both ends of a branch of length t.',
      par(A.FadeOut(center), others.map((o) => A.FadeOut(o)), arrows.map((a) => A.FadeOut(a)), probs.map((p) => A.FadeOut(p)), A.FadeOut(mdl), A.FadeOut(h)), A.Write(eq, 2.2));
    const ax = S.add(S.axes({ x0: 0, x1: 3, y0: 0, y1: 1, w: 1200, h: 420, xticks: [0, 1, 2, 3], yticks: [0, 0.25, 1], yfmt: (v) => (v === 0.25 ? '1/4' : String(v)), xlabel: 'branch length t', ylabel: 'chance the letter is the same' }).at(40, 100));
    const curve = ax.plot((t) => M0.p(t).same, { color: C.BLUE, width: 7 });
    const asym = ax.plot(() => 0.25, { color: C.GREY, width: 3, dash: '10 10' });
    const d0 = S.add(S.dot(14, C.YELLOW).at(40 + ax.fx(0), 100 + ax.fy(1)));
    S.beat('At t equals zero, no time has passed, so the chance is one. The letter is certainly the same.',
      A.FadeIn(ax), A.FadeIn(d0, { from: 3 }), A.Focus(eq, 't', { color: C.YELLOW }));
    S.beat('As t grows, the chance falls toward one quarter. After many mutations, the letter is basically random, and a random letter matches by chance one time in four.',
      A.Create(curve, 2.4), A.Create(asym, 0.8), A.Focus(eq, 'quarter', { color: C.YELLOW }));
    S.beat('And this four thirds is not decoration. It is exactly what makes t mean expected changes per site. Hold on to that number.',
      A.Focus(eq, 'rate', { color: C.GOLD }), S.zoomTo(eq, 'rate', 2.6, 1.6), wait(1.2), S.pullBack(1.2), { cap: 'And this 4/3 is not decoration. It is exactly what makes t mean expected changes per site. Hold on to that number.' });
    // three trees with likelihoods
    const trees = [0, 1, 2].map((tp) => S.add(S.quartet({ topo: tp, long: [0, 2], scale: 0.48, longLen: 260, short: 110, mid: 70, labelSize: 64 }).at(-600 + tp * 600, -40)));
    const lls = [0, 1, 2].map((tp) => S.add(S.txt(`${TOPO[tp]}   ${infA.ml.logL[tp].toFixed(4)}`, { size: 40, font: 'mono', color: tp === 0 ? C.GREEN : C.GREY_B }).at(-600 + tp * 600, 190)));
    const llT = S.add(S.txt('best log-likelihood per site (higher is better)', { size: 36, color: C.GREY_B }).at(0, 300));
    const best = S.add(S.check(60, C.GREEN).at(-600, 270));
    S.beat('Maximum likelihood combines these probabilities along every branch, for every site. It adjusts the branch lengths until the data are as probable as possible, then picks the tree with the highest score.',
      par(A.FadeOut(eq), A.FadeOut(ax), A.FadeOut(d0)), lag(0.3, trees.map((t) => seq(A.Show(t), t.grow(1)))), lag(0.3, lls.map((l) => A.FadeIn(l))), A.FadeIn(llT), A.Create(best, 0.6));
  });

  video.scene('trap', 'The trap: long-branch attraction', (S) => {
    const h = S.add(S.head('The trap'));
    S.beat('Now the twist that makes this puzzle famous.', A.Write(h, 1));
    const tree = S.add(S.quartet({ topo: 0, long: [0, 2], scale: 1, longLen: 330, short: 120, mid: 90 }).at(0, 40));
    S.beat('Suppose species A and C evolve fast. Their branches are long. B and D evolve slowly, and the middle branch is short.', S.toTitle(h), A.Show(tree), tree.grow(2));
    // mutation flashes along long branches
    const flashes = [];
    const along = (taxon, f) => {
      const base = taxon === 0 || taxon === 1 ? tree.u : tree.v;
      const e = tree.ends[taxon];
      return [base[0] + (e[0] - base[0]) * f, 40 + base[1] + (e[1] - base[1]) * f];
    };
    [0.18, 0.33, 0.47, 0.62, 0.78, 0.9].forEach((f) => flashes.push(S.add(S.dot(11, C.YELLOW).at(...along(0, f)))));
    [0.15, 0.3, 0.44, 0.58, 0.74, 0.88].forEach((f) => flashes.push(S.add(S.dot(11, C.YELLOW).at(...along(2, f)))));
    [0.5].forEach((f) => flashes.push(S.add(S.dot(11, C.YELLOW).at(...along(1, f)))));
    S.beat('Long branches collect many mutations. And with only four letters to choose from, two long branches often land on the same letter, by pure coincidence.',
      lag(0.22, flashes.map((d) => seq(A.FadeIn(d, { dur: 0.2, from: 3 }), A.Indicate(d, { dur: 0.5 })))));
    const tipLetters = ['T', 'G', 'T', 'G'];
    const tipPos = [0, 1, 2, 3].map((i) => tree.out(i, 110));
    const tips = [0, 1, 2, 3].map((i) => S.add(S.txt(tipLetters[i], { size: 64, font: 'mono', weight: 500, color: MV.BASE_COLORS[tipLetters[i]] }).at(tipPos[i][0], 40 + tipPos[i][1])));
    const link = S.add(S.path(`M ${tipPos[0][0] + 40} ${40 + tipPos[0][1]} Q 0 ${40 + tipPos[0][1] - 110} ${tipPos[2][0] - 40} ${40 + tipPos[2][1]}`, { stroke: C.RED, width: 4, dash: '12 10' }).with({ draw: 0 }));
    const fake = S.add(S.txt('looks like A and C are relatives', { size: 40, color: C.RED }).at(0, 330));
    S.beat('When A and C happen to match, while B and D keep the old letter, that site looks exactly like evidence that A and C are relatives.',
      par(flashes.map((d) => A.FadeOut(d))), lag(0.2, tips.map((t) => A.FadeIn(t, { from: 1.8 }))), A.Create(link, 1), A.FadeIn(fake));
    // real tally from the simulated 72 sites
    const mini = S.add(S.group(...['A', 'B', 'C', 'D'].map((n, i) => new Group(
      new Text(n, { size: 30, italic: true, color: i % 2 === 0 ? C.RED : C.WHITE }).at(-830, 0),
      new Text(align72[i].slice(0, 72), { size: 22, font: 'mono', color: C.GREY_B, anchor: 'start', spacing: 1 }).at(-800, 0)
    ).at(0, -300 + i * 40))));
    const g1 = S.add(S.txt(`sites that support AB|CD (true):  ${supportCounts[0]}`, { size: 44, color: C.GREEN }).at(0, -60));
    const g2 = S.add(S.txt(`sites that support AC|BD (wrong): ${supportCounts[1]}`, { size: 44, color: C.RED }).at(0, 20));
    const g3 = S.add(S.txt(`sites that support AD|BC:          ${supportCounts[2]}`, { size: 44, color: C.GREY_B }).at(0, 100));
    S.beat(`In our simulation, among the first seventy-two sites, ${supportCounts[0] === 0 ? 'zero' : supportCounts[0]} sites support the true tree, and ${supportCounts[1]} support the tree that pairs A with C. The fake signal wins.`,
      par(A.FadeOut(tree), tips.map((t) => A.FadeOut(t)), A.FadeOut(link), A.FadeOut(fake)), A.FadeIn(mini), lag(0.5, [A.FadeIn(g1), A.FadeIn(g2), A.FadeIn(g3)]),
      { cap: `In our simulation, among the first 72 sites, ${supportCounts[0]} support the true tree and ${supportCounts[1]} support AC|BD. The fake signal wins.` });
    const wrong = S.add(S.quartet({ topo: 1, long: [0, 2], scale: 0.7, longLen: 300, short: 120, mid: 80 }).at(0, 120));
    const wl = S.add(S.txt('parsimony picks AC|BD', { size: 46, color: C.RED }).at(0, -150));
    S.beat('Parsimony counts honestly, and picks the wrong tree.',
      par(A.FadeOut(mini), A.FadeOut(g1), A.FadeOut(g2), A.FadeOut(g3)), A.Show(wrong), wrong.grow(1.2), A.FadeIn(wl));
    const name = S.add(S.txt('long-branch attraction', { size: 72, color: C.YELLOW }).at(0, -40));
    const who = S.add(S.txt('Joseph Felsenstein, 1978', { size: 40, color: C.GREY_B }).at(0, 50));
    S.beat('This is called long-branch attraction. Joseph Felsenstein described it in nineteen seventy-eight: long branches attract each other, even when they are not related.',
      par(A.FadeOut(wrong), A.FadeOut(wl)), A.Write(name, 1.4), A.FadeIn(who), { cap: 'This is called long-branch attraction. Joseph Felsenstein described it in 1978: long branches attract each other, even when they are not related.' });
  });

  video.scene('confidence', 'More data makes it worse', (S) => {
    const h = S.add(S.head('More data makes it worse'));
    S.beat('Here is the truly unsettling part. What happens if we collect more data?', A.Write(h, 1.2));
    const ax = S.add(S.axes({ x0: 100, x1: 10000, y0: 0, y1: 1, w: 1180, h: 520, logx: true, xticks: studyA.ns, yticks: [0, 0.5, 1], xfmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)), yfmt: (v) => `${v * 100}%`, xlabel: 'sites in the alignment', ylabel: 'runs that find the true tree' }).at(30, 40));
    const pars = ax.polyline(studyA.ns.map((n, i) => [n, studyA.pars[i]]), { color: C.RED, width: 8 });
    const ml = ax.polyline(studyA.ns.map((n, i) => [n, studyA.ml[i]]), { color: C.BLUE, width: 8 });
    const pl = S.add(S.txt('parsimony', { size: 40, color: C.RED }).at(-250, 250));
    const ml1 = S.add(S.txt('maximum likelihood', { size: 40, color: C.BLUE }).at(470, -285));
    const dotsP = studyA.ns.map((n, i) => S.add(S.dot(10, C.RED).at(30 + ax.fx(n), 40 + ax.fy(studyA.pars[i]))));
    const dotsM = studyA.ns.map((n, i) => S.add(S.dot(10, C.BLUE).at(30 + ax.fx(n), 40 + ax.fy(studyA.ml[i]))));
    S.beat('We ran the experiment forty times at each data size, from one hundred to ten thousand sites. Parsimony found the true tree zero percent of the time. Every run wrong, and more certain with every extra site.',
      S.toTitle(h), A.FadeIn(ax), A.Create(pars, 2), lag(0.15, dotsP.map((d) => A.FadeIn(d, { from: 2 }))), A.FadeIn(pl));
    S.beat('Maximum likelihood, with the right model, started at about sixty percent, and climbed to one hundred.',
      A.Create(ml, 2), lag(0.15, dotsM.map((d) => A.FadeIn(d, { from: 2 }))), A.FadeIn(ml1));
    const big = S.add(S.txt('Confidence is not correctness.', { size: 80, color: C.YELLOW }).at(0, -20));
    S.beat('A method can be consistently, confidently wrong. More data shrinks random noise. It does nothing about a built-in bias.',
      par([ax, pl, ml1, ...dotsP, ...dotsM].map((m) => A.FadeOut(m))), A.Write(big, 1.6));
    const early = S.add(S.group(new Text('early trees', { size: 40, color: C.GREY_B }).at(0, -150),
      new Line(-200, 120, 200, 120, { stroke: C.WHITE, width: 4 }), new Line(-200, 120, -200, -60, { stroke: C.WHITE, width: 4 }), new Text('microsporidia', { size: 36, color: C.RED }).at(-200, -95),
      new Line(-60, 120, -60, -30, { stroke: C.WHITE, width: 4 }), new Line(80, 120, 80, -30, { stroke: C.WHITE, width: 4 }), new Text('animals', { size: 30 }).at(-60, -60), new Text('fungi', { size: 30 }).at(80, -60),
      new Text('placed near the root', { size: 30, color: C.RED }).at(0, 170)).at(-420, 60));
    const later = S.add(S.group(new Text('later, better models', { size: 40, color: C.GREY_B }).at(0, -150),
      new Line(-200, 120, 200, 120, { stroke: C.WHITE, width: 4 }), new Line(-120, 120, -120, -30, { stroke: C.WHITE, width: 4 }), new Text('animals', { size: 30 }).at(-120, -60),
      new Line(60, 120, 60, 40, { stroke: C.WHITE, width: 4 }), new Line(0, 40, 120, 40, { stroke: C.WHITE, width: 4 }), new Line(0, 40, 0, -30, { stroke: C.WHITE, width: 4 }), new Line(120, 40, 120, -30, { stroke: C.WHITE, width: 4 }),
      new Text('fungi', { size: 30 }).at(0, -60), new Text('microsporidia', { size: 30, color: C.GREEN }).at(140, -95),
      new Text('placed with the fungi', { size: 30, color: C.GREEN }).at(0, 170)).at(420, 60));
    S.beat('This is not just a toy. Fast-evolving parasites called microsporidia were once placed near the root of the tree of complex life. Later work, with more data and better models, placed them with the fungi. Long-branch attraction is the usual explanation.',
      A.MoveTo(big, 0, -330), A.ScaleTo(big, 0.6), A.FadeIn(early, { dx: -30 }), wait(0.8), A.FadeIn(later, { dx: 30 }));
    const ag = [-500, 0, 500].map((x) => S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.8 }).at(x, 120)));
    const tq = S.add(S.txt('What can go wrong in the work itself?', { size: 52 }).at(0, -150));
    S.beat('So that is our puzzle. Now imagine solving it with a team of AI agents. What can go wrong in the work itself?',
      par(A.FadeOut(early), A.FadeOut(later), A.FadeOut(big), A.FadeOut(h)), lag(0.2, ag.map((a) => A.FadeIn(a, { dy: 30 }))), A.Write(tq, 1.2));
  });

  /* =========================================================== CHAPTER 3 */
  video.chapter('ch3', 'Isolation protects work');

  video.scene('state', 'Six kinds of state', (S) => {
    const h = S.add(S.head('Six places where work lives'));
    S.beat('Here is the first big idea. When agents work on a project, they change things. And the things they change live in six different places.', A.Write(h, 1.4));
    const layers = [
      ['source history', 'saved versions of the code, kept by Git', 'an archive of snapshots', C.BLUE],
      ['working files', 'the files being edited right now', 'papers on a workbench', C.GREEN],
      ['agent context', 'what the agent can see at this moment', 'what is in its head', C.YELLOW],
      ['execution state', 'running programs, installed tools, temp files', 'the machine itself', C.GREY_B],
      ['artifacts', 'outputs: result files, tables, figures', 'the finished products', C.MAROON],
      ['evidence', 'which claims are backed by which checks', 'the case for belief', C.GOLD],
    ];
    const rows = layers.map(([name, what, like, col], i) => {
      const g = S.group(
        rect(1560, 92, { stroke: col, width: 3, fill: mix(C.BG, col, 0.1), rx: 8 }),
        new Text(`${i + 1}`, { size: 44, color: col }).at(-720, 0),
        new Text(name, { size: 44, color: col, anchor: 'start' }).at(-670, 0),
        new Text(what, { size: 32, anchor: 'start' }).at(-260, -14),
        new Text(like, { size: 28, color: C.GREY_B, italic: true, anchor: 'start' }).at(-260, 22)
      ).at(0, -300 + i * 108);
      return S.add(g);
    });
    const says = [
      'One: source history. The saved versions of the code, kept by Git, like an archive of snapshots.',
      'Two: working files. The files being edited right now, like papers spread on a workbench.',
      'Three: agent context. Whatever the agent can see in its head at this moment.',
      'Four: execution state. The running programs, installed tools, and temporary files on the machine.',
      'Five: artifacts. The outputs, like result files, tables, and figures.',
      'And six: evidence. Which claims are backed by which checks.',
    ];
    rows.forEach((r, i) => S.beat(says[i], i === 0 ? S.toTitle(h) : wait(0), A.FadeIn(r, { dx: -40 })));
    const rule = S.add(S.box('Name the place that changes. Protect that place.', { w: 1300, h: 110, color: C.YELLOW, size: 50 }).at(0, 20));
    S.beat('Almost every mess in agentic work comes from protecting one of these places with a tool built for another. So the rule is: name the place that is changing, and protect exactly that place.',
      par(rows.map((r) => A.FadeOut(r))), A.FadeIn(rule, { from: 0.8 }));
  });

  video.scene('worktrees', 'Worktrees', (S) => {
    const h = S.add(S.head('Two agents, one folder'));
    const page = S.add(S.page('kernel.js', { w: 150, h: 190, size: 32 }).at(0, 30));
    const desk = S.add(S.desk('one shared folder', { w: 520 }).at(0, 80));
    const a1 = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.9 }).at(-480, 60));
    const a2 = S.add(S.creature({ color: C.BLUE, kind: 'agent', size: 0.9 }).at(480, 60).with({ lx: -1 }));
    S.beat('Let us watch this happen. On day one, two agents write two versions of the likelihood code, at the same time.',
      A.Write(h, 1.2), S.toTitle(h), A.FadeIn(desk), A.FadeIn(page, { dy: -20 }), A.FadeIn(a1, { dx: -40 }), A.FadeIn(a2, { dx: 40 }), A.Look(a1, 1, 0.3));
    const scribbles = [0, 1, 2, 3].map((i) => S.add(S.line(-50, -20 + i * 26, 50, -20 + i * 26, { stroke: i % 2 ? C.BLUE : C.TEAL, width: 6 }).with({ draw: 0 })));
    const boom = S.add(S.txt('overwritten!', { size: 46, color: C.RED }).at(0, -150));
    S.beat('If they share one folder, they edit the same files. One agent silently overwrites the other one’s work. It is like two people writing on the same sheet of paper.',
      lag(0.25, scribbles.map((l) => A.Create(l, 0.4))), A.Indicate(page, { color: C.RED, scale: 1.2 }), A.FadeIn(boom, { from: 1.4 }), A.Mood(a1, -0.6), A.Mood(a2, -0.6));
    const tag1 = S.add(S.box('branch: pruning', { w: 290, h: 64, color: C.TEAL, size: 32 }).at(-210, -260));
    const tag2 = S.add(S.box('branch: brute', { w: 270, h: 64, color: C.BLUE, size: 32 }).at(210, -260));
    const same = S.add(S.txt('still the same desk', { size: 40, color: C.RED }).at(0, 312));
    S.beat('A common first idea is to give each agent its own Git branch. But a branch is only a name for a line of saved versions. Both agents would still be writing on the same desk.',
      A.FadeOut(boom), A.FadeIn(tag1, { dy: -20 }), A.FadeIn(tag2, { dy: -20 }), A.FadeIn(same));
    S.silent(par([page, desk, a1, a2, tag1, tag2, same, ...scribbles].map((m) => A.FadeOut(m))));
    const arch = S.add(S.cabinet('', { w: 420, h: 150 }).at(0, -260));
    const archL = S.add(S.txt('shared archive: Git history', { size: 34, color: C.BLUE }).at(0, -372));
    const d1 = S.add(S.desk('worktree 1', { w: 420 }).at(-460, 70));
    const d2 = S.add(S.desk('worktree 2', { w: 420 }).at(460, 70));
    const p1 = S.add(S.page('kernel.js', { color: C.TEAL }).at(-460, 40));
    const p2 = S.add(S.page('kernel.js', { color: C.BLUE }).at(460, 40));
    const b1 = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.65 }).at(-760, 70));
    const b2 = S.add(S.creature({ color: C.BLUE, kind: 'agent', size: 0.65 }).at(760, 70).with({ lx: -1 }));
    const l1 = S.add(S.line(-460, -80, -120, -185, { stroke: C.GREY, width: 3 }).with({ draw: 0 }));
    const l2 = S.add(S.line(460, -80, 120, -185, { stroke: C.GREY, width: 3 }).with({ draw: 0 }));
    S.beat('What they need is a worktree. A worktree is a second desk, connected to the same archive. Each desk has its own files, and its own staging area.',
      A.FadeOut(h), A.FadeIn(arch), A.FadeIn(archL), par(A.Create(l1), A.Create(l2)), par(A.FadeIn(d1), A.FadeIn(d2)), par(A.FadeIn(p1, { dy: -20 }), A.FadeIn(p2, { dy: -20 })), par(A.FadeIn(b1), A.FadeIn(b2)));
    const fly = S.add(S.page('', { color: C.TEAL, w: 60, h: 76 }).at(-460, 40));
    const v1 = S.add(S.txt('version saved', { size: 30, color: C.TEAL }).at(-420, -280));
    const okB = S.add(S.check(46, C.GREEN).at(570, -40));
    S.beat('When agent one saves a version, it goes into the shared archive, where everyone can see it. But the papers on agent two’s desk do not change. Nothing collides.',
      A.FadeIn(fly), A.MoveTo(fly, -110, -260, 1.2), A.FadeIn(v1), A.Indicate(arch, { color: C.TEAL }), A.Indicate(p2, { color: C.GREEN, scale: 1.1 }), A.Create(okB, 0.5));
    const floor = S.add(S.rect(1700, 70, { stroke: C.RED, width: 3, fill: mix(C.BG, C.RED, 0.12), rx: 8 }).at(0, 330));
    const floorL = S.add(S.txt('the same machine:  /tmp/study.csv', { size: 34, color: C.RED, font: 'mono' }).at(0, 330));
    const r1 = S.add(S.arrow(-460, 250, -150, 296, { color: C.RED, width: 4 }));
    const r2 = S.add(S.arrow(460, 250, 150, 296, { color: C.RED, width: 4 }));
    S.beat('But notice what a worktree does not separate. Both desks sit on the same machine. If both agents write their results to the same temporary file, the second run destroys the first.',
      A.FadeOut(okB), A.FadeIn(floor), A.FadeIn(floorL), par(A.Arrow(r1), A.Arrow(r2)), A.Indicate(floorL, { color: C.RED, scale: 1.1 }));
    const f1 = S.add(S.box('results/run-1/', { w: 330, h: 64, color: C.GREEN, size: 32 }).at(-460, 320));
    const f2 = S.add(S.box('results/run-2/', { w: 330, h: 64, color: C.GREEN, size: 32 }).at(460, 320));
    S.beat('The fix lives in a different place: give every run its own output folder. Worktrees separate files. They do not separate the machine.',
      par(A.FadeOut(floor), A.FadeOut(floorL), A.FadeOut(r1), A.FadeOut(r2)), par(A.FadeIn(f1, { dy: 20 }), A.FadeIn(f2, { dy: 20 })));
  });

  video.scene('context', 'Context is a desk', (S) => {
    const h = S.add(S.head('Context is a desk, not a library'));
    const shelf = S.add(S.group(
      rect(420, 380, { stroke: C.WHITE, width: 3, rx: 6, fill: '#15171c' }),
      ...['CLAUDE.md', 'notes.md', 'kernel.js', 'study.log', 'paper.pdf', 'results/'].map((n, i) => new Group(rect(46, 300 - (i % 3) * 30, { stroke: C.GREY_B, width: 2, fill: '#22252c', rx: 3 }), new Text(n, { size: 22, color: C.GREY_B }).rotate(-90)).at(-160 + i * 64, 20 + (i % 3) * 15)),
      new Text('library: everything on disk', { size: 34, color: C.GREY_B }).at(0, 240)
    ).at(-520, -20));
    const lamp = S.add(S.group(
      path('M -40 -200 h 80 l 22 34 h -124 z', { stroke: C.YELLOW, width: 3, fill: '#2a2616' }),
      path('M -62 -166 L -260 160 L 260 160 L 62 -166 Z', { stroke: 'none', width: 0, fill: C.YELLOW, fillOpacity: 0.07 }),
      new Line(-280, 160, 280, 160, { stroke: C.WHITE, width: 5 }),
      new Text('desk: what the agent sees now', { size: 34, color: C.YELLOW }).at(0, 220)
    ).at(440, -20));
    S.beat('Now the third place, agent context. It is the trickiest one. Think of everything on disk as a library. The agent’s context is a small desk under a lamp. Only what is on the desk, right now, is visible to the agent.',
      A.Write(h, 1.4), S.toTitle(h), A.FadeIn(shelf, { dx: -30 }), A.FadeIn(lamp, { dx: 30 }));
    // the context bar
    const barW = 1500;
    const frame = S.add(S.rect(barW + 12, 92, { stroke: C.WHITE, width: 3, rx: 6 }).at(0, 230));
    const limit = S.add(S.line(barW / 2 - 140, 182, barW / 2 - 140, 278, { stroke: C.RED, width: 3, dash: '8 8' }));
    const limitL = S.add(S.txt('full', { size: 30, color: C.RED }).at(barW / 2 - 140, 160));
    const chipsSpec = [
      ['instructions', 210, C.BLUE],
      ['convention', 190, C.GREEN],
      ['conversation', 220, C.GREY],
      ['kernel.js', 175, C.GOLD],
      ['study.log', 175, C.GOLD],
      ['paper', 130, C.GOLD],
    ];
    let x0 = -barW / 2;
    const chips = chipsSpec.map(([name, w, col]) => {
      const g = S.group(rect(w - 10, 72, { stroke: col, width: 2, fill: mix(C.BG, col, 0.35), rx: 5 }), new Text(name, { size: 30, color: C.WHITE })).at(x0 + w / 2, 230);
      if (name === 'convention') g.add(new Text('branch length = changes per site', { size: 32, color: C.GREEN }).at(0, -76));
      x0 += w;
      return S.add(g);
    });
    S.beat('As a session goes on, the desk fills up: instructions, conversation, and every file the agent reads. Somewhere in that conversation, the scientist said: branch length means expected changes per site.',
      par(A.FadeOut(shelf), A.FadeOut(lamp)), A.FadeIn(frame), A.FadeIn(limit), A.FadeIn(limitL), lag(0.5, chips.map((c) => A.FadeIn(c, { dx: -40 }))), A.Indicate(chips[1], { color: C.GREEN, scale: 1.08, dur: 1 }));
    const summary = S.add(S.group(rect(292, 72, { stroke: C.WHITE, width: 2, fill: '#2b2e36', rx: 5 }), new Text('summary', { size: 30 })).at(-barW / 2 + 210 + 150, 230));
    const lost = S.add(S.txt('lost at compaction', { size: 34, color: C.RED }).at(-barW / 2 + 305, -70));
    S.beat('When the desk is full, the system compacts it. Old conversation is replaced by a short summary. And a detail that was only said in conversation can simply vanish.',
      par(A.MoveTo(chips[2], -barW / 2 + 360, 230), A.MoveTo(chips[3], -barW / 2 + 360, 230), A.MoveTo(chips[4], -barW / 2 + 360, 230), A.MoveTo(chips[5], -barW / 2 + 360, 230), A.FadeOut(chips[2]), A.FadeOut(chips[3]), A.FadeOut(chips[4]), A.FadeOut(chips[5])),
      A.FadeIn(summary, { from: 0.6 }), par(A.Shift(chips[1], 0, -150, 1), A.Set(chips[1], { o: 0.35 }, 1)), A.FadeIn(lost));
    const pinned = S.add(S.group(rect(760, 72, { stroke: C.BLUE, width: 3, fill: mix(C.BG, C.BLUE, 0.3), rx: 5 }), new Text('CLAUDE.md: branch length = changes per site', { size: 30 })).at(250, 230));
    const reload = S.add(S.txt('read again from disk after compaction', { size: 34, color: C.BLUE }).at(250, 120));
    S.beat('Instruction files are different. A file like CLAUDE dot M D lives on disk, and it is read again after every compaction. So write down what must survive.',
      par(A.FadeOut(chips[1]), A.FadeOut(lost)), A.FadeIn(pinned, { dy: -40 }), A.FadeIn(reload), A.Indicate(pinned, { color: C.BLUE, scale: 1.06 }), { cap: 'Instruction files are different. A file like CLAUDE.md lives on disk, and it is read again after every compaction. So write down what must survive.' });
    const q = S.add(S.quote('I had Claude periodically organize its files and consolidate them, so it always had access to the latest version of the plan.', 'Matthew Schwartz, Claude-shaped science, 2026', { size: 42, y: -140 }));
    S.beat('Schwartz found the same thing. He had Claude regularly consolidate its notes into files, so that it always had the latest version of the plan.',
      par(A.FadeOut(reload)), A.FadeIn(q));
  });

  video.scene('runs', 'A run is a function', (S) => {
    const h = S.add(S.head('A run is a function'));
    S.beat('Results come from runs. And every run is like a function.', A.Write(h, 1.2));
    const machine = S.add(S.box('run', { w: 300, h: 220, color: C.BLUE, size: 60 }).at(0, -20));
    const ins = ['code version', 'environment', 'inputs', 'random seed'].map((n, i) => S.add(S.txt(n, { size: 40, anchor: 'end' }).at(-330, -150 + i * 88)));
    const inA = ins.map((m, i) => S.add(S.arrow(-310, -150 + i * 88, -160, -60 + i * 26, { color: C.GREY_B, width: 4 })));
    const out = S.add(S.arrow(160, -20, 420, -20, { color: C.GREEN, width: 5 }));
    const outL = S.add(S.txt('results', { size: 44, color: C.GREEN, anchor: 'start' }).at(440, -20));
    S.beat('Its output depends on four things: which version of the code ran, in which environment, on which inputs, and with which random seed.',
      S.toTitle(h), A.FadeIn(machine, { from: 0.8 }), lag(0.6, ins.map((m, i) => par(A.FadeIn(m, { dx: -30 }), A.Arrow(inA[i], 0.6)))), A.Arrow(out), A.FadeIn(outL));
    const eq = S.add(S.tex('\\text{output} = f(\\,\\text{version},\\ \\text{environment},\\ \\text{inputs},\\ \\text{seed}\\,)', { size: 62, color: C.WHITE }).at(0, 270));
    S.beat('Written as a formula: output equals f of version, environment, inputs, and seed.', A.Write(eq, 2));
    const card = S.add(S.group(
      rect(760, 360, { stroke: C.YELLOW, width: 3, fill: '#1c1b14', rx: 10 }),
      new Text('manifest.json', { size: 38, color: C.YELLOW, font: 'mono' }).at(0, -140),
      ...[['run id', '20261006T060056Z_dcda0e1a'], ['code version', 'source hash 5722de84…'], ['environment', 'Node v22.22.0'], ['inputs', 'tLong 1.0, tShort 0.05'], ['seed', '20261006']].map(([k, v], i) => new Group(new Text(k, { size: 28, color: C.GREY_B, anchor: 'end' }).at(-120, 0), new Text(v, { size: 28, font: 'mono', anchor: 'start' }).at(-100, 0)).at(0, -70 + i * 52))
    ).at(0, -20));
    S.beat('Write all four into a small record, called a manifest, right next to the output. Then anyone can run it again, and check.',
      par([machine, ...ins, ...inA, out, outL, eq].map((m) => A.FadeOut(m))), A.FadeIn(card, { from: 0.85 }));
    const trays = [1, 2, 3].map((i) => S.add(S.box(`results/run-${i}/   seed ${i}   + manifest`, { w: 760, h: 80, color: C.GREEN, size: 34 }).at(140, -150 + i * 100)));
    S.beat('One version of the code can produce many runs. Give every run its own folder and its own manifest, and never overwrite an old one.',
      A.MoveTo(card, -470, -20), lag(0.4, trays.map((t) => A.FadeIn(t, { dx: 40 }))), par(trays.map((t) => A.Shift(t, 300, 0))));
  });

  video.scene('roles', 'Who does what', (S) => {
    const h = S.add(S.head('Six words that get mixed up'));
    S.beat('One more piece of vocabulary, because these six words get mixed up all the time.', A.Write(h, 1.4));
    const items = [
      ['Tool', 'computes a defined result', 'fit(counts, tree)', C.BLUE, 'A tool computes a defined result from explicit inputs, like a function that fits branch lengths to data.'],
      ['Skill', 'a written procedure', 'how to run a study', C.GREEN, 'A skill is a written procedure, like a recipe for running a study correctly.'],
      ['Agent', 'chooses the actions', 'inside a given task', C.TEAL, 'Agents choose which actions to take, inside the task they were given.'],
      ['Hook', 'enforces a rule', 'no save if tests fail', C.RED, 'A hook enforces a rule automatically. For example: refuse to save new code while the tests fail.'],
      ['Harness', 'runs and records', 'routes results to review', C.PURPLE, 'A harness runs everything, keeps the records, and routes results to review.'],
      ['Scientist', 'asks and judges', 'which answers matter', C.GOLD, 'And the scientist sets the question, and judges whether the answers matter.'],
    ];
    const cards = items.map(([n, a, b, col], i) => S.add(S.group(
      rect(520, 220, { stroke: col, width: 3, fill: mix(C.BG, col, 0.1), rx: 12 }),
      new Text(n, { size: 56, color: col }).at(0, -56),
      new Text(a, { size: 34 }).at(0, 14),
      new Text(b, { size: 28, color: C.GREY_B, italic: true }).at(0, 62)
    ).at(-580 + (i % 3) * 580, -170 + Math.floor(i / 3) * 270)));
    items.forEach((it, i) => S.beat(it[4], i === 0 ? S.toTitle(h) : wait(0), A.FadeIn(cards[i], { from: 0.85 })));
    const cols = [['Instructions', 'ask', C.BLUE], ['Hooks', 'enforce', C.RED], ['Checks', 'verify', C.YELLOW]].map(([a, b, col], i) => S.add(S.group(new Text(a, { size: 56 }).at(0, -40), new Text(b, { size: 80, color: col }).at(0, 50)).at(-560 + i * 560, -20)));
    const note = S.add(S.txt('an instruction alone guarantees nothing', { size: 40, color: C.GREY_B }).at(0, 220));
    S.beat('Notice three different verbs. Instructions ask. Hooks enforce. Checks verify. An instruction, by itself, guarantees nothing.',
      par(cards.map((c) => A.FadeOut(c))), lag(0.8, cols.map((c) => A.FadeIn(c, { dy: 30 }))), A.FadeIn(note));
  });

  /* =========================================================== CHAPTER 4 */
  video.chapter('ch4', 'Evidence supports claims');

  video.scene('drift', 'A lost convention', (S) => {
    const h = S.add(S.head('Day three: a lost convention'));
    const chip = S.add(S.group(rect(640, 80, { stroke: C.GREEN, width: 3, fill: mix(C.BG, C.GREEN, 0.3), rx: 6 }), new Text('branch length = expected changes per site', { size: 32 })).at(0, 0));
    S.beat('Now the second big idea, told as a story. On day three, a long session compacts. The rule, branch length means expected changes per site, was only said in conversation. It vanishes.',
      A.Write(h, 1.4), A.FadeIn(chip, { from: 0.8 }), wait(0.6), par(A.Shift(chip, 0, 200, 1.4), A.FadeOut(chip, { dur: 1.4 })));
    const right = S.add(S.tex('P_{\\text{same}}(t) = \\tfrac14 + \\tfrac34\\, e^{-\\frac{4}{3} t}', { size: 84, color: C.BLUE }).at(0, -140));
    const wrong = S.add(S.tex('P_{\\text{same}}(t) = \\tfrac14 + \\tfrac34\\, e^{-4 t}', { size: 84, color: C.RED }).at(0, 120));
    const rl = S.add(S.txt('the project’s convention', { size: 36, color: C.BLUE }).at(0, -260));
    const wl = S.add(S.txt('copied from a textbook with other time units', { size: 36, color: C.RED }).at(0, 240));
    const ag = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.75 }).at(-700, 120).with({ lx: 1 }));
    S.beat('Later, the agent rewrites the formula from memory. It copies a textbook version that measures time in different units: e to the minus four t, instead of e to the minus four thirds t.',
      S.toTitle(h), A.Write(right, 1.4), A.FadeIn(rl), A.FadeIn(ag), A.Write(wrong, 1.6), A.FadeIn(wl), { cap: 'Later, the agent rewrites the formula from memory. It copies a textbook version that measures time in different units: e^(−4t) instead of e^(−4t/3).' });
    const q = S.add(S.quote('When conventions are non-standard, it constantly reverts to textbook defaults even if you force it to write the conventions down and stick with them.', 'Matthew Schwartz, Vibe physics, 2026', { size: 42, y: -20 }));
    S.beat('This is not hypothetical. Schwartz reports exactly this habit. When conventions are non-standard, Claude constantly reverts to textbook defaults, even if you force it to write the conventions down.',
      par(A.FadeOut(right), A.FadeOut(wrong), A.FadeOut(rl), A.FadeOut(wl), A.FadeOut(ag)), A.FadeIn(q));
    const mars = S.add(S.circle(120, { stroke: C.ORANGE, width: 0, fill: mix(C.ORANGE, C.BG, 0.25) }).at(-260, 60));
    const orbit = S.add(S.circle(280, { stroke: C.GREY_B, width: 3, dash: '12 12' }).at(-260, 60));
    const path1 = S.add(S.path('M 560 -300 C 300 -200 0 -120 -120 -40', { stroke: C.RED, width: 5 }).with({ draw: 0 }));
    const craft = S.add(S.dot(14, C.WHITE).at(560, -300));
    const units = S.add(S.group(new Text('pound-force seconds', { size: 40, color: C.RED }).at(0, -30), new Text('vs  newton seconds', { size: 40, color: C.BLUE }).at(0, 30)).at(460, 210));
    const mcoL = S.add(S.txt('Mars Climate Orbiter, 1999', { size: 44 }).at(0, -330));
    S.beat('Unit mix-ups are a classic. In nineteen ninety-nine, NASA lost the Mars Climate Orbiter because one program reported thrust in pound-force seconds, while another expected newton seconds. The spacecraft flew far too low.',
      A.FadeOut(q), A.FadeIn(mcoL), A.FadeIn(mars), A.Create(orbit, 1), A.FadeIn(craft), par(A.Create(path1, 2.2), A.MoveTo(craft, -120, -40, 2.2)), A.FadeIn(units));
  });

  video.scene('curves', 'Same shape, wrong unit', (S) => {
    const h = S.add(S.title('Right formula vs wrong formula'));
    const ax = S.add(S.axes({ x0: 0, x1: 2, y0: 0, y1: 0.8, w: 1200, h: 560, xticks: [0, 0.5, 1, 1.5, 2], yticks: [0, 0.25, 0.5, 0.75], yfmt: (v) => (v === 0.75 ? '3/4' : String(v)), xlabel: 'branch length t', ylabel: 'chance the site differs' }).at(30, 20));
    const ref = ax.plot((t) => 1 - M0.p(t).same, { color: C.BLUE, width: 7 });
    const mut = ax.plot((t) => 1 - M1.p(t).same, { color: C.RED, width: 7, dash: '18 12' });
    const lr = S.add(S.tex('\\text{right: } e^{-4t/3}', { size: 54, color: C.BLUE }).at(560, -40));
    const lm = S.add(S.tex('\\text{wrong: } e^{-4t}', { size: 54, color: C.RED }).at(-150, -270));
    S.beat('Let us compare the right formula with the wrong one, as curves. This is the chance that a site differs, across a branch of length t.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(ref, 2), A.FadeIn(lr), A.Create(mut, 2), A.FadeIn(lm));
    const o = S.add(S.circle(26, { stroke: C.YELLOW, width: 4 }).at(30 + ax.fx(0), 20 + ax.fy(0)));
    S.beat('Both curves start at zero. No time, no difference.', A.Create(o, 0.8), A.Indicate(o, { scale: 1.4 }));
    const asym = ax.plot(() => 0.75, { color: C.GREY, width: 3, dash: '8 10' });
    S.beat('Both level off at three quarters. After enough mutations, the letters are random.', A.FadeOut(o), A.Create(asym, 1));
    const checks = [['probabilities add up to one', 0], ['never below zero, never above one', 1], ['two short branches = one long branch', 2]].map(([t, i]) => S.add(S.group(S.check(34).with({ o: 1 }), new Text(t, { size: 34, anchor: 'start' }).at(36, 0)).at(-90, 110 + i * 60)));
    checks.forEach((g) => g.kids.forEach((k) => (k.init.o = 1)));
    S.beat('And both are perfectly valid probability models. Every probability is between zero and one, they add up correctly, and two short branches combine exactly like one long branch.',
      lag(0.6, checks.map((c) => A.FadeIn(c, { dx: -20 }))));
    const t1 = S.add(S.line(30 + ax.fx(0), 20 + ax.fy(0), 30 + ax.fx(0.16), 20 + ax.fy(0.16), { stroke: C.BLUE, width: 3, dash: '6 6' }).with({ draw: 0 }));
    const t3 = S.add(S.line(30 + ax.fx(0), 20 + ax.fy(0), 30 + ax.fx(0.16 / 3), 20 + ax.fy(0.16), { stroke: C.RED, width: 3, dash: '6 6' }).with({ draw: 0 }));
    const s1 = S.add(S.txt('slope 1', { size: 16, color: C.BLUE, anchor: 'start' }).at(30 + ax.fx(0.1) + 8, 20 + ax.fy(0.08)));
    const s3 = S.add(S.txt('slope 3', { size: 16, color: C.RED, anchor: 'end' }).at(30 + ax.fx(0.03) - 6, 20 + ax.fy(0.12)));
    S.beat('The only difference is how fast they start. Let us zoom in near zero. With the right formula, a short branch of length t carries about t changes per site. With the wrong one, three times as many.',
      par(checks.map((c) => A.FadeOut(c))), S.cam(30 + ax.fx(0.06), 20 + ax.fy(0.08) + 24, 4.2, 2), par(A.Create(t1), A.Create(t3)), par(A.FadeIn(s1), A.FadeIn(s3)), wait(1.5));
    S.beat('Same shape. Wrong unit. Every number computed downstream is now off by a factor of three, and nothing crashes.',
      S.pullBack(1.6), A.Indicate(lm, { color: C.RED, scale: 1.15 }));
  });

  video.scene('agree', 'Two methods agree', (S) => {
    const h = S.add(S.head('Two methods agree. Both are wrong.'));
    S.beat('Here is the part that fools people.', A.Write(h, 1.4));
    const pat = [0, 0, 1, 1];
    const fast = M1.siteLikelihood(pat, treeA);
    const slow = M1.siteLikelihoodBrute(pat, treeA);
    const right = M0.siteLikelihood(pat, treeA);
    const f = (x) => x.toPrecision(15);
    const b1 = S.add(S.box('fast algorithm', { w: 520, h: 120, color: C.TEAL, size: 44, sub: 'pruning, closed form' }).at(-460, -180));
    const b2 = S.add(S.box('slow brute force', { w: 520, h: 120, color: C.BLUE, size: 44, sub: 'sum over every possibility' }).at(460, -180));
    const v1 = S.add(S.txt(f(fast), { size: 40, font: 'mono', color: C.WHITE }).at(-460, -20));
    const v2 = S.add(S.txt(f(slow), { size: 40, font: 'mono', color: C.WHITE }).at(460, -20));
    const eqs = S.add(S.txt('=', { size: 90, color: C.GREEN }).at(0, -20));
    S.beat('Our project computes each likelihood in two independent ways: a fast, clever algorithm, and a slow brute-force sum over every possibility. If they agree, surely the code is right?',
      S.toTitle(h), par(A.FadeIn(b1, { dy: 30 }), A.FadeIn(b2, { dy: 30 })), par(A.FadeIn(v1), A.FadeIn(v2)), A.FadeIn(eqs, { from: 2 }));
    const shared = S.add(S.box('shared constant: μ = 4', { w: 560, h: 110, color: C.RED, size: 44 }).at(0, 230));
    const l1 = S.add(S.line(-460, 30, -150, 175, { stroke: C.RED, width: 4 }).with({ draw: 0 }));
    const l2 = S.add(S.line(460, 30, 150, 175, { stroke: C.RED, width: 4 }).with({ draw: 0 }));
    const truth = S.add(S.txt(`correct value: ${f(right)}`, { size: 34, font: 'mono', color: C.GREEN }).at(0, -330));
    S.beat('But both of them read the same constant, from the same place. The bug lives in what they share. So they agree perfectly, to fifteen digits, and both are wrong.',
      A.FadeIn(shared), par(A.Create(l1), A.Create(l2)), A.Indicate(shared, { color: C.RED }), A.FadeIn(truth), { cap: 'But both of them read the same constant, from the same place. The bug lives in what they share. So they agree perfectly, to 15 digits, and both are wrong.' });
    const big = S.add(S.txt('Agreement is not independence.', { size: 76, color: C.YELLOW }).at(0, 0));
    S.beat('Agreement is not independence. Two agents with the same prompt, the same helper code, or the same convention can share one mistake.',
      par([b1, b2, v1, v2, eqs, shared, l1, l2, truth].map((m) => A.FadeOut(m))), A.Write(big, 1.6));
  });

  video.scene('ladder', 'The ladder of independence', (S) => {
    const h = S.add(S.head('The ladder of independence'));
    S.beat('So how do you catch a bug like this? You climb a ladder.', A.Write(h, 1.4));
    const yOf = (n) => 280 - n * 140;
    const rails = [S.add(S.line(-760, 320, -760, -340, { stroke: C.WHITE, width: 6 }).with({ draw: 0 })), S.add(S.line(-620, 320, -620, -340, { stroke: C.WHITE, width: 6 }).with({ draw: 0 }))];
    const rungs = [
      ['Run it again', 'same code, same assumptions', C.GREY, 'Rung zero: run it again. Same code, same assumptions. It can only find random flakiness.'],
      ['Self-consistency', 'limits, sums, symmetries', C.BLUE, 'Rung one: self-consistency. Do the probabilities add up to one? Does zero time mean no change? Cheap checks, and they catch gross errors.'],
      ['Independent algorithm', 'another route to the same number', C.TEAL, 'Rung two: an independent algorithm that computes the same number another way. It catches mistakes in the clever code.'],
      ['External anchor', 'the definition, the literature, a simulation', C.YELLOW, 'Rung three: an external anchor, something tied to the definition itself, from outside your code. A formula from the published literature. Or a simulation built directly from the meaning of one change per site.'],
      ['Model adequacy + review', 'does the model fit? does it matter?', C.GOLD, 'Rung four: does the model even fit reality? And does the answer matter? Up here, people decide.'],
    ];
    const rungMobs = rungs.map(([name, desc, col], n) => {
      const y = yOf(n);
      const bar = S.add(S.line(-760, y, -620, y, { stroke: col, width: 6 }).with({ draw: 0 }));
      const lab = S.add(S.group(new Text(String(n), { size: 54, color: col }).at(-690, -36), new Text(name, { size: 46, color: col, anchor: 'start' }).at(-570, -16), new Text(desc, { size: 30, color: C.GREY_B, anchor: 'start' }).at(-570, 28)).at(0, y));
      return { bar, lab };
    });
    rungs.forEach((r, n) => S.beat(r[3], n === 0 ? par(S.toTitle(h), A.Create(rails[0], 1), A.Create(rails[1], 1)) : wait(0), A.Create(rungMobs[n].bar, 0.6), A.FadeIn(rungMobs[n].lab, { dx: -30 })));
    const tag = (txt, n, dy, col = C.RED) => S.add(S.group(rect(txt.length * 17 + 40, 56, { stroke: col, width: 3, fill: mix(C.BG, col, 0.2), rx: 6 }), new Text(txt, { size: 32, color: col })).at(520, yOf(n) - 10 + dy));
    const m3 = tag('M3  swapped same / different', 1, -34);
    const m2 = tag('M2  forgot the factor 1/4', 1, 34);
    const m4 = tag('M4  skipped the middle branch', 2, 0);
    const m1 = tag('M1  the unit bug, μ = 4', 3, 0);
    const s1 = tag('S1  correct code, wrong model', 4, 0, C.GOLD);
    S.beat('To test the ladder, we broke our own code on purpose, four different ways. This is called mutation testing. A good test suite should notice every break.');
    S.beat('Swapping same and different fails the simplest check at once. Forgetting a factor of one quarter makes probabilities add up to four instead of one. Both are caught on rung one.',
      A.FadeIn(m3, { dx: 40 }), A.FadeIn(m2, { dx: 40 }));
    S.beat('Skipping the middle branch still gives a valid probability model, so every rung one check passes. Only the independent algorithm disagrees. Caught on rung two.', A.FadeIn(m4, { dx: 40 }));
    S.beat('And the unit bug passes rungs one and two completely. Only the external anchors catch it. The published distance formula gives back three times the true length: zero point nine instead of zero point three.',
      A.FadeIn(m1, { dx: 40 }), A.Indicate(m1, { color: C.YELLOW, scale: 1.08 }), { cap: `And the unit bug passes rungs one and two completely. Only the external anchors catch it: the published distance formula gives back three times the true length, ${jcd(0.3, M1).toFixed(1)} instead of 0.3.` });
    S.beat('Every rung catches errors that the rungs below it cannot see. A good test suite is not a long list of checks. It is checks at different heights. And the top rung is next.', A.FadeIn(s1, { dx: 40 }));
  });

  /* =========================================================== CHAPTER 5 */
  video.chapter('ch5', 'Correct code, wrong science');

  video.scene('invariant', 'What if the code is perfect?', (S) => {
    const h = S.add(S.head('What if the code is perfect?'));
    const ok = ['rung 1', 'rung 2', 'rung 3'].map((r, i) => S.add(S.group(S.check(48).with({ o: 1 }), new Text(r, { size: 44, anchor: 'start' }).at(44, 0)).at(-60 + (i - 1) * 300, 40)));
    ok.forEach((g) => g.kids.forEach((k) => (k.init.o = 1)));
    S.beat('Now suppose the code passes every check, all the way up to rung three. Are we done?', A.Write(h, 1.4), S.toTitle(h), lag(0.4, ok.map((m) => A.FadeIn(m, { from: 1.4 }))));
    const rowsTxt = ['ATGGCGTACCTGAAGTCGAT', 'ATGCCGTTCCAGAAGTCCAT', 'ATTGCGAACCTGTAGTCGAA', 'ATGACGTACGTGAACTCGAT'];
    const locked = [0, 1, 4, 5, 9, 10, 14, 17];
    const lockBars = locked.map((j) => S.add(S.rect(46, 300, { stroke: 'none', width: 0, fill: C.GREY_D, rx: 4 }).at(-513 + j * 54, -30)));
    const al = rowsTxt.map((r, i) => S.add(S.group(...[...r].map((ch, j) => new Text(ch, { size: 40, font: 'mono', weight: 500, color: locked.includes(j) ? C.GREY_B : MV.BASE_COLORS[ch] }).at(-513 + j * 54, 0))).at(0, -135 + i * 70)));
    const lk = S.add(S.txt('grey columns: sites that never change', { size: 36, color: C.GREY_B }).at(0, 200));
    S.beat('Real genes contain sites that almost never change, because changing them would break the organism. Our simple model does not know that such sites exist.',
      par(ok.map((m) => A.FadeOut(m))), lag(0.1, lockBars.map((b) => A.FadeIn(b))), lag(0.15, al.map((r) => A.FadeIn(r, { dx: -30 }))), A.FadeIn(lk));
    const tw = S.add(S.quartet({ topo: 1, long: [0, 2], scale: 0.62, longLen: 290, short: 120, mid: 80 }).at(-420, 60));
    const tl = S.add(S.txt('ML with the simple model picks AC|BD', { size: 38, color: C.RED }).at(-420, -200));
    const ax = S.add(S.axes({ x0: 100, x1: 10000, y0: 0, y1: 1, w: 640, h: 300, logx: true, xticks: [100, 1000, 10000], yticks: [0, 1], xfmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)), yfmt: (v) => `${v * 100}%`, size: 26 }).at(460, 40));
    const jcLine = ax.polyline([[100, 0.15], [300, 0.125], [1000, 0], [3000, 0], [10000, 0]], { color: C.RED, width: 7 });
    const axl = S.add(S.txt('runs that find the true tree', { size: 30, color: C.GREY_B }).at(460, -170));
    S.beat('Now give maximum likelihood data in which thirty percent of the sites never change, and keep the simple model. It falls into the same trap as parsimony. It pairs A with C, and more data makes it more sure.',
      par([...lockBars, ...al, lk].map((m) => A.FadeOut(m))), A.Show(tw), tw.grow(1.2), A.FadeIn(tl), A.FadeIn(ax), A.FadeIn(axl), A.Create(jcLine, 1.6),
      { cap: 'Now give maximum likelihood data in which 30% of the sites never change, and keep the simple model. It falls into the same trap as parsimony: it picks AC|BD, and more data makes it more sure.' });
    const msg = S.add(S.txt('The code computes the wrong answer, correctly.', { size: 56, color: C.YELLOW }).at(0, 300));
    S.beat('Every code check still passes. The code computes the wrong answer, correctly. The problem is not the code. It is the model.', A.Write(msg, 1.6));
  });

  video.scene('fit', 'Does the model fit?', (S) => {
    const h = S.add(S.head('Ask the data whether the model fits'));
    S.beat('So we climb to the top rung, number four, and ask the data itself.', A.Write(h, 1.4));
    // observed vs expected for the biggest classes
    const n = gofData.reduce((a, b) => a + b, 0);
    const exp = K.makeModel().classProbabilities({ topo: gofJC.best.topo, t: gofJC.best.t }, 0);
    const order = K.CLASSES.map((c, i) => i).sort((a, b) => gofData[b] - gofData[a]).slice(0, 6);
    const maxv = Math.max(...order.map((i) => Math.max(gofData[i], n * exp[i])));
    const base = 250;
    const hscale = 470 / maxv;
    const bars = [];
    order.forEach((ci, k) => {
      const x = -650 + k * 260;
      const ob = S.add(S.bar(x - 40, base, gofData[ci] * hscale, C.WHITE, 70));
      const eb = S.add(S.bar(x + 40, base, n * exp[ci] * hscale, C.BLUE, 70));
      const lb = S.add(S.txt(K.CLASSES[ci].label, { size: 36, font: 'mono' }).at(x, base + 40));
      bars.push({ ob, eb, lb, ci });
    });
    const legend = S.add(S.group(new Text('observed', { size: 34, color: C.WHITE }).at(-140, 0), new Text('expected by the simple model', { size: 34, color: C.BLUE, anchor: 'start' }).at(0, 0)).at(120, -300));
    S.beat('Compare how often each pattern of letters actually appears in the data, with how often the model expects it.',
      S.toTitle(h), A.FadeIn(legend), lag(0.15, bars.map((b) => par(A.Create(b.ob, 1), A.Create(b.eb, 1), A.FadeIn(b.lb)))));
    const first = bars.find((b) => K.CLASSES[b.ci].label === 'xxxx') || bars[0];
    const gapL = S.add(S.txt('all four letters the same', { size: 36, color: C.YELLOW }).at(-650 + bars.indexOf(first) * 260 + 60, -275));
    S.beat('The biggest gap is in sites where all four species share the same letter. The data have far more of them than the simple model can explain.',
      A.Indicate(first.ob, { color: C.YELLOW, scale: 1.05 }), A.FadeIn(gapL));
    const [mant, ex] = gofJC.pValue.toExponential(1).split('e');
    const pv = S.add(S.tex(`p \\approx ${mant} \\times 10^{${parseInt(ex, 10)}}`, { size: 90, color: C.RED }).at(0, -60));
    const rej = S.add(S.txt('model rejected', { size: 52, color: C.RED }).at(0, 60));
    S.beat('A goodness-of-fit test turns that gap into one number: the chance of a gap this large, if the model were right. Here it is about ten to the minus ninety-nine. The model is rejected.',
      par(bars.map((b) => par(A.FadeOut(b.ob), A.FadeOut(b.eb), A.FadeOut(b.lb))), A.FadeOut(legend), A.FadeOut(gapL)), A.Write(pv, 1.6), A.FadeIn(rej));
    const fix = S.add(S.txt('add one parameter: the fraction of sites that never change', { size: 40, color: C.GREEN }).at(0, -150));
    const res = S.add(S.group(
      new Text(`estimated fraction: ${(gofJCI.best.pInv * 100).toFixed(0)}%   (truth: 30%)`, { size: 40 }).at(0, -40),
      new Text(`fit: p = ${gofJCI.pValue.toFixed(2)}   accepted`, { size: 40, color: C.GREEN }).at(0, 30),
      new Text(`best tree: ${TOPO[gofJCI.best.topo]}`, { size: 40, color: gofJCI.best.topo === 0 ? C.GREEN : C.RED }).at(0, 100)
    ).at(0, 60));
    S.beat('Add a single parameter, the fraction of sites that never change, and the model fits. It estimates about thirty percent, and it picks the true tree again.',
      par(A.FadeOut(pv), A.FadeOut(rej)), A.FadeIn(fix), A.FadeIn(res, { dy: 20 }));
    const rule = S.add(S.box('Test the model, not only the code.', { w: 1100, h: 120, color: C.YELLOW, size: 56 }).at(0, 300));
    S.beat('So test the model, not only the code. Real phylogenetics uses much richer models than these, and it still needs an expert to judge them.', A.FadeIn(rule, { from: 0.85 }));
  });

  /* =========================================================== CHAPTER 6 */
  video.chapter('ch6', 'Putting it together');

  video.scene('week', 'One week of agentic research', (S) => {
    const h = S.add(S.head('One week of agentic research'));
    S.beat('Let us replay the whole project as one week of work, and watch both big ideas in action.', A.Write(h, 1.4));
    const days = [
      ['Day 0', 'conventions first', C.GOLD, 'Day zero. The scientist writes the question. An agent drafts a conventions file. The scientist approves it. Conventions come before code.'],
      ['Day 1', 'two worktrees', C.BLUE, 'Day one. Two agents write the two algorithms, in two worktrees. A third session writes checks from the published literature, without ever looking at our code.'],
      ['Day 2', 'runs + manifests', C.GREEN, 'Day two. The harness runs parsimony. Every run gets its own folder and manifest. Parsimony pairs A with C, with total confidence. That is a reason to check, not to celebrate.'],
      ['Day 3', 'a lost convention', C.RED, 'Day three. Compaction drops the convention, and the unit bug slips in. Rungs one and two pass. The external anchors fail. The fix moves the convention into the instruction file.'],
      ['Day 4', 'fresh eyes', C.TEAL, 'Day four. A fresh reviewer session reads only the handoff notes and the evidence. It names long-branch attraction. The scientist asks about sites that never change.'],
      ['Day 5', 'claims + limits', C.YELLOW, 'Day five. The scientist writes down the claims, each one with its evidence and its limits.'],
    ];
    const axis = S.add(S.line(-820, 0, 820, 0, { stroke: C.GREY_B, width: 4 }).with({ draw: 0 }));
    const cards = days.map(([d, t, col], i) => {
      const x = -700 + i * 280;
      const up = i % 2 === 0;
      return S.add(S.group(
        new Line(0, 0, 0, up ? -60 : 60, { stroke: col, width: 3 }),
        circle(12, { stroke: col, width: 0, fill: col }),
        new Text(d, { size: 44, color: col }).at(0, up ? -100 : 100),
        new Text(t, { size: 30 }).at(0, up ? -150 : 150)
      ).at(x, 0));
    });
    days.forEach((d, i) => S.beat(d[3], i === 0 ? par(S.toTitle(h), A.Create(axis, 1)) : wait(0), A.FadeIn(cards[i], { dy: i % 2 ? 30 : -30 }), A.Indicate(cards[i], { color: d[2], scale: 1.1 }),
      i === 2 || i === 3 ? { cap: d[3].replace('Parsimony pairs A with C,', 'Parsimony says AC|BD,') } : {}));
  });

  video.scene('stale', 'Stale by default', (S) => {
    const h = S.add(S.head('When a definition changes'));
    const nodes = [
      ['conventions', -700, 0], ['pruning', -330, -200], ['brute force', -330, 0], ['anchors', -330, 200], ['integrate + test', 30, 0], ['simulator check', 360, -160], ['study', 360, 120], ['claims', 700, 0],
    ];
    const edges = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5], [4, 6], [5, 6], [6, 7]];
    const nm = nodes.map(([n, x, y]) => S.add(S.box(n, { w: 270, h: 84, color: C.GREEN, size: 32 }).at(x, y)));
    const em = edges.map(([a, b]) => {
      const [, xa, ya] = nodes[a];
      const [, xb, yb] = nodes[b];
      if (Math.abs(xa - xb) < 5) return S.add(S.arrow(xa, ya + (yb > ya ? 42 : -42), xb, yb + (yb > ya ? -42 : 42), { color: C.GREY, width: 3, head: 14 }));
      return S.add(S.arrow(xa + 135, ya, xb - 135, yb, { color: C.GREY, width: 3, head: 14 }));
    });
    S.beat('One more mechanism ties it all together. Tasks depend on each other, like the steps of a recipe.',
      A.Write(h, 1.2), S.toTitle(h), lag(0.15, nm.map((m) => A.FadeIn(m, { from: 0.8 }))), lag(0.08, em.map((e) => A.Arrow(e, 0.5))));
    const stale = nm.slice(1);
    S.beat('When an upstream definition changes, like the unit convention, every result downstream becomes stale. Git cannot see this. The change merges without a single conflict.',
      A.Indicate(nm[0], { color: C.BLUE, scale: 1.12 }), lag(0.15, stale.map((m) => par(A.Set(m.rect, { stroke: C.YELLOW, fill: mix(C.BG, C.YELLOW, 0.18) }, 0.5), A.Set(m.label, { color: C.YELLOW }, 0.5)))));
    S.beat('So mark everything downstream as stale, and run it again in order, before anyone cites it.',
      lag(0.35, stale.map((m) => par(A.Set(m.rect, { stroke: C.GREEN, fill: mix(C.BG, C.GREEN, 0.12) }, 0.4), A.Set(m.label, { color: C.WHITE }, 0.4), A.Indicate(m, { color: C.GREEN, scale: 1.08, dur: 0.6 })))));
  });

  video.scene('claims', 'Claims with limits', (S) => {
    const h = S.add(S.head('Results become claims'));
    S.beat('At the end, results become claims. And a claim without evidence and limits is just an advertisement.', A.Write(h, 1.4));
    const rows = [
      ['ML recovers the true tree when the model is right', 'supported', C.GREEN],
      ['parsimony converges to the wrong tree here', 'supported', C.GREEN],
      ['two agents agreeing proves a result', 'rejected', C.RED],
      ['this explains the history of real microsporidia', 'not tested', C.GREY_B],
    ].map(([t, st, col], i) => S.add(S.group(
      new Text(t, { size: 38, anchor: 'start' }).at(-760, 0),
      rect(250, 60, { stroke: col, width: 3, fill: mix(C.BG, col, 0.15), rx: 6 }).at(600, 0),
      new Text(st, { size: 32, color: col }).at(600, 0)
    ).at(0, -230 + i * 120)));
    S.beat('Some claims are supported, with evidence you can rerun. Some are rejected, like: two agents agreeing proves a result. And some are simply not tested, and we say so out loud.',
      S.toTitle(h), lag(0.9, rows.map((r) => A.FadeIn(r, { dx: -30 }))));
  });

  /* =========================================================== CHAPTER 7 */
  video.chapter('ch7', 'The two sentences');

  video.scene('recap', 'Recap', (S) => {
    const s1 = S.add(S.txt('Isolation protects work.', { size: 76, color: C.BLUE }).at(0, -60));
    const s2 = S.add(S.txt('Evidence supports claims.', { size: 76, color: C.YELLOW }).at(0, 60));
    S.beat('Let us come back to the two sentences.', A.Write(s1, 1.2), A.Write(s2, 1.2));
    const iso = ['worktrees keep agents off each other’s files', 'run folders + manifests keep results apart and repeatable', 'files on disk keep rules alive through compaction'];
    const isoM = iso.map((t, i) => S.add(S.txt(t, { size: 40 }).at(0, -170 + i * 70)));
    S.beat('Isolation protects work. Worktrees keep agents from overwriting each other’s files. Run folders and manifests keep results apart, and repeatable. And files on disk keep important rules alive through compaction.',
      A.FadeOut(s2), A.MoveTo(s1, 0, -330), A.ScaleTo(s1, 0.8), lag(0.9, isoM.map((m) => A.FadeIn(m, { dy: 20 }))));
    const but = S.add(S.txt('But isolation is not evidence.', { size: 60, color: C.RED }).at(0, 120));
    S.beat('But none of that makes a single result true.', A.FadeIn(but, { from: 1.3 }));
    const ev = ['climb the ladder of independent checks', 'agreement is not independence', 'more data can make a biased method more confident', 'test the model, not only the code'];
    const evM = ev.map((t, i) => S.add(S.txt(t, { size: 40 }).at(0, -170 + i * 70)));
    S.beat('Evidence supports claims. Climb the ladder of independent checks. Remember that agreement is not independence. Remember that more data can make a biased method more confident, but not more correct. And test the model, not only the code.',
      par(A.FadeOut(s1), A.FadeOut(but), isoM.map((m) => A.FadeOut(m))), A.FadeIn(s2), A.MoveTo(s2, 0, -330), A.ScaleTo(s2, 0.8), lag(0.9, evM.map((m) => A.FadeIn(m, { dy: 20 }))));
    const sci = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 1.3 }).at(0, 80));
    const ags = [-520, -300, 300, 520].map((x) => S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.7 }).at(x, 140).with({ lx: x < 0 ? 1 : -1 })));
    const taste = S.add(S.txt('taste', { size: 70, color: C.GOLD }).at(0, -170));
    S.beat('And at the top of the ladder, there is still a person. Agents can find thousands of problems that they can solve. Deciding which answers matter, what Schwartz calls taste, is still the scientist’s job.',
      par(A.FadeOut(s2), evM.map((m) => A.FadeOut(m))), A.FadeIn(sci, { dy: 40 }), lag(0.15, ags.map((a) => A.FadeIn(a, { dy: 30 }))), A.Write(taste, 1.2), A.Mood(sci, 1));
    const end = S.add(S.head('The Tree and the Agent', { size: 90 }).at(0, -60));
    const end2 = S.add(S.txt('every number in this video came from tested code that runs in your browser', { size: 36, color: C.GREY_B }).at(0, 40));
    S.beat('Every number in this video came from real, tested code, running in your browser. Thanks for watching.',
      par(A.FadeOut(sci), A.FadeOut(taste), ags.map((a) => A.FadeOut(a))), A.Write(end, 1.6), A.FadeIn(end2), { hold: 2.5 });
    S.keep();
  });

  return video;
};
