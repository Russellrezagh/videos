// Chapter 0 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch00(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

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

  video.scene('colors', 'How to read the formulas', (S) => {
    const h = S.add(S.title('How to read the formulas'));
    const roles = [
      ['pt', 'policy', 'what the model does: its probabilities'],
      ['th', 'params', 'what training changes: weights, logits'],
      ['grad', 'grad', 'directions: gradients and their estimates'],
      ['rr', 'reward', 'what the judge says'],
      ['bb', 'baseline', 'what we expected to get'],
      ['AA', 'advantage', 'better or worse than expected'],
      ['pref', 'frozen', 'copies of the model that do not train'],
      ['bt', 'leash', 'how far we may stray'],
      ['rat', 'ratio', 'new probability over old'],
      ['eps', 'knob', 'numbers we choose'],
    ];
    const chips = roles.map(([id, role, meaning], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? -830 : 70;
      const y = -300 + row * 122;
      const g = S.add(S.group(
        new Tex(`\\${id}`, { size: 70 }).at(60, 0),
        new Text(FILM.ROLE_NAME[role], { size: 38, anchor: 'start', color: S.color(role) }).at(150, -20),
        new Text(meaning, { size: 30, anchor: 'start', color: C.GREY_B }).at(150, 22)
      ).at(x, y));
      return g;
    });
    S.beat('Before we start, a word about how to read the formulas in this film. Every symbol keeps one colour from beginning to end, and the colour tells you what kind of thing it is.',
      A.FadeIn(h), lag(0.12, chips.slice(0, 2).map((c) => A.FadeIn(c, { dy: 16 }))));
    S.beat('Blue is what the model does: its probabilities. Teal is what training changes: the weights. Yellow is a direction, a gradient. Gold is what the judge says: reward. Purple is what we expected to get, and green is the difference: better or worse than expected.',
      lag(0.5, chips.slice(2, 6).map((c) => A.FadeIn(c, { dy: 16 }))));
    S.beat('Grey marks frozen copies of the model, orange the leash that keeps it close to where it began, maroon a ratio of new to old, and pink the knobs that we, the people training it, get to choose.',
      lag(0.5, chips.slice(6).map((c) => A.FadeIn(c, { dy: 16 }))));
    const line = S.add(S.tex('\\grad\\, \\JJ(\\th) \\;=\\; \\EE_{\\aa \\sim \\pt}\\Big[\\, \\rr(\\aa)\\; \\grad \\lp(\\aa) \\,\\Big]', { size: 84 }).at(0, -170));
    const read = S.add(S.english('the {slope of the average reward|JJ} = the average, over the {model’s own answers|pt}, of {reward|rr} × {the direction that makes that answer more likely|grad}', { size: 40, width: 1500 }).at(0, 30));
    S.beat('Here is the line this film is built around. You do not need to follow it yet. Just notice that you can already read its colours: a direction, a reward, the model’s probabilities. By chapter three, you will read it like a sentence.',
      par(chips.map((c) => A.FadeOut(c, { dur: 0.6 }))), A.Write(line, 2.4), wait(0.4), S.writeIn(read, 2.6));
    const cardEx = S.add(S.symcard('rr').at(0, 240));
    S.beat('And whenever a new symbol appears, a card like this one tells you three things: its name, where it comes from, and why it is there at all.',
      A.Spot(line, 'rr'), A.FadeIn(cardEx, { dy: 16 }), A.FadeOut(read));
  });
});
