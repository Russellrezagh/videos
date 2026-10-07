// Chapter 2 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch02(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

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
});
