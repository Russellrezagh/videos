// Chapter 0 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch00(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // a point on a cubic Bezier curve, for marks placed on a drawn path
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  };

  /* =========================================================== OPEN */
  video.chapter('ch0', 'The question');
  /*
   * The story of the film in one scene: a model answers, sometimes wrongly;
   * its answers come from probabilities; training should reshape them; but
   * the reward is a judge's verdict on a sample, so the usual chain of
   * derivatives breaks. The closing question, coloured: grad E[R] = ?
   */
  video.scene('open', 'How do you take the gradient of a sample?', (S) => {
    const POL = S.color('pt');
    // 1. one question, a right answer
    const model = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 1.1 }).at(-560, 140));
    const prompt = S.add(S.box('What is 17 × 3?', { w: 520, h: 100, color: C.GREY_B, size: 46 }).at(-560, -200));
    const a1 = S.add(S.bubble('51', { size: 54 }).at(-180, -10));
    const a2 = S.add(S.bubble('41', { size: 54 }).at(-180, 250));
    const ok = S.add(S.check(54).at(-60, -10));
    const no = S.add(S.cross(48).at(-60, 250));
    S.beat('Here is a language model, answering a question. What is seventeen times three? It says fifty-one. That is right.',
      A.FadeIn(model, { dy: 30 }), A.FadeIn(prompt, { dy: -20 }), wait(0.6), A.FadeIn(a1), A.Write(a1.text, 0.5), A.Create(ok, 0.5), A.Mood(model, 0.9),
      { cap: 'Here is a language model, answering a question. What is 17 × 3? It says 51. That is right.' });
    // 2. the same question again, a wrong answer
    S.beat('Now ask it the very same question again. This time, it might say forty-one. Nothing inside the model changed between the two answers.',
      A.FadeIn(a2), A.Write(a2.text, 0.5), A.Create(no, 0.5), A.Mood(model, 0.1),
      { cap: 'Now ask it the very same question again. This time, it might say 41. Nothing inside the model changed between the two answers.' });

    // 3. both came from the same probabilities
    const BX = 470;
    const BY = 200;
    const BH = 420;
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, color: POL, h: BH, w: 130, gap: 80, labelFont: 'serif', labelSize: 40 }).at(BX, BY));
    const bcap = S.add(S.english('the model’s {chance|pt} for each answer', { size: 36, width: 700 }).at(BX, -330));
    const toy = S.add(S.toy(BX, 330));
    S.beat('Both answers came from the same probabilities. The model holds a chance for every possible answer, and draws one at random, like rolling a weighted die.',
      A.FadeIn(bars, { dx: 40 }), A.FadeIn(bcap), A.FadeIn(toy), A.Indicate(bars.bars[0], { color: C.GREEN, scale: 1.04 }), A.Indicate(bars.bars[2], { color: C.RED, scale: 1.04 }));

    // 4. training should move the chances: a few exact gradient steps on the toy
    let zT = BAND.z.slice();
    for (let k = 0; k < 3; k++) {
      const g = RL.exactGradient(zT, BAND.r);
      zT = zT.map((v, i) => v + 2 * g[i]);
    }
    const piT = RL.softmax(zT);
    const up = S.add(S.arrow(BX + bars.xs[0] - 115, BY - BH * BAND.pi[0] + 30, BX + bars.xs[0] - 115, BY - BH * BAND.pi[0] - 110, { color: C.GREEN, width: 6 }));
    S.beat('Training should change those chances, so that the right answer becomes more likely. That sounds like ordinary machine learning: compute a slope, take a small step, repeat.',
      A.Arrow(up, 0.8), par(bars.to(piT, 1.8), A.Set(up, { y1: BY - BH * piT[0] + 30, y2: BY - BH * piT[0] - 110 }, 1.8)));

    // 5. the chain from weights to reward
    const CY = -60;
    const items = [
      S.add(S.tex('\\th', { size: 96 }).at(-800, CY)),
      S.add(S.box('probabilities', { w: 300, h: 110, color: POL, size: 40 }).at(-540, CY)),
      S.add(S.box('sample', { w: 220, h: 110, color: C.GREY_B, size: 40 }).at(-200, CY)),
      S.add(S.box('text', { w: 180, h: 110, color: C.WHITE, size: 40 }).at(90, CY)),
      S.add(S.box('judge', { w: 210, h: 110, color: S.color('rr'), size: 40 }).at(370, CY)),
      S.add(S.tex('\\RR', { size: 96 }).at(640, CY)),
    ];
    const links = [[-760, -700], [-380, -320], [-80, -10], [190, 255], [485, 590]].map(([x1, x2]) => S.add(S.arrow(x1, CY, x2, CY, { color: C.GREY_B, width: 4 })));
    const chainSay = 'But follow the chain. The weights, theta, set the probabilities. We draw a sample: a piece of text. A judge reads the text and hands back one number: the reward, R.';
    S.beat(chainSay,
      par([model, prompt, a1, a2, ok, no, bars, bcap, toy, up].map((m) => A.FadeOut(m, { dur: 0.6 }))),
      lag(0.55, items.map((m, i) => seq(A.FadeIn(m, { dur: 0.5, dx: -20 }), i < links.length ? A.Arrow(links[i], 0.35) : wait(0)))),
      { cap: 'But follow the chain. The weights, θ, set the probabilities. We draw a sample: a piece of text. A judge reads the text and hands back one number: the reward, R.' });

    // 6. running backwards: two links break
    const P0 = [640, 10];
    const P1 = [500, 250];
    const P2 = [-650, 250];
    const P3 = [-800, 10];
    const back = S.add(S.path(`M ${P0[0]} ${P0[1]} C ${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]} ${P3[0]} ${P3[1]}`, { stroke: C.RED, width: 4, dash: '16 14' }).with({ draw: 0 }));
    const brk = [0.25, 0.56].map((t) => S.add(S.cross(46).at(...bez(P0, P1, P2, P3, t))));
    const dice = S.add(S.txt('random, and it jumps', { size: 34, color: C.GREY_B, italic: true }).at(-200, -170));
    const dice2 = S.add(S.txt('between whole words', { size: 34, color: C.GREY_B, italic: true }).at(-200, -130));
    const blind = S.add(S.txt('a black box', { size: 34, color: C.GREY_B, italic: true }).at(370, -150));
    const q = S.add(S.tex('\\frac{\\partial \\RR}{\\partial \\th}\\;?', { size: 80, color: C.RED }).at(0, 290));
    const breakSay = 'To get a slope, we would run backwards along this chain. But two links break. The sample is random, and it jumps between whole words. And the judge is a black box: a person, or a program.';
    S.beat(breakSay,
      A.Create(back, 1.4), A.Write(q, 1),
      seq(wait(Math.max(0, S.atWord(breakSay, 'The sample') - 2.4)), A.Create(brk[1], 0.5), A.FadeIn(dice), A.FadeIn(dice2)),
      seq(wait(1.0), A.Create(brk[0], 0.5), A.FadeIn(blind)),
      { cap: 'To get a slope, we would run backwards along this chain. But two links break. The sample is random, and it jumps between whole words. And the judge is a black box: a person, or a program.' });

    // 7. the question, coloured
    const big = S.add(S.tex('\\grad\\, \\EE\\big[\\, \\RR \\,\\big] \\;=\\; ?', { size: 130 }).at(0, -80));
    S.beat('Yet on average, better weights do earn more reward. So the real question is this. How do you take the gradient of an average that you can only sample?',
      par([...items, ...links, back, ...brk, dice, dice2, blind, q].map((m) => A.FadeOut(m, { dur: 0.6 }))), A.Write(big, 1.8));
    const read = S.add(S.english('{which way to nudge the weights|grad} so that the {average|EE} {reward|RR} goes up?', { size: 46, width: 1500 }).at(0, 140));
    const readSay = 'Read it slowly. Nabla theta: which way to nudge the weights. E: the average, over answers the model draws. R: the reward. That one question is the whole subject of reinforcement learning for language models.';
    S.beat(readSay,
      par(S.writeIn(read, 2.4), seq(wait(Math.max(0, S.atWord(readSay, 'Nabla') - 0.2)), A.Spot(big, 'grad'), wait(Math.max(0, S.atWord(readSay, 'E:') - S.atWord(readSay, 'Nabla') - 0.7)), A.Spot(big, 'EE'),
        wait(Math.max(0, S.atWord(readSay, 'R:') - S.atWord(readSay, 'E:') - 0.7)), A.Spot(big, 'RR'), wait(1.6), A.Unspot(big))),
      { cap: 'Read it slowly. ∇θ: which way to nudge the weights. 𝔼: the average, over answers the model draws. R: the reward. That one question is the whole subject of reinforcement learning for language models.' });

    // 8. the title, and the road
    const title = S.add(S.head('The Gradient of Reward', { size: 108 }).at(0, -120));
    const sub = S.add(S.txt('the mathematics of reinforcement learning for language models, from first principles', { size: 36, color: C.GREY_B }).at(0, -20));
    const methods = [['softmax', 'pt'], ['REINFORCE', 'grad'], ['baselines', 'bb'], ['GAE', 'AA'], ['PPO', 'rat'], ['reward models', 'rr'], ['KL', 'KL'], ['DPO', 'pref'], ['GRPO', 'rbar']];
    // lay the names out by their (monospace) widths, 56 px apart
    const CW = 34 * 0.6;
    const GAP = 56;
    const total = methods.reduce((t, [m]) => t + m.length * CW, 0) + GAP * (methods.length - 1);
    let mx = -total / 2;
    const ms = methods.map(([m, key]) => {
      const w = m.length * CW;
      const t = S.add(S.txt(m, { size: 34, color: S.color(key), font: 'mono' }).at(mx + w / 2, 150));
      mx += w + GAP;
      return t;
    });
    S.beat('This is The Gradient of Reward. We will answer that question from first principles, starting from a single softmax and building up to P P O, D P O, and G R P O, the methods behind today’s assistants and reasoning models.',
      A.FadeOut(big, { dur: 0.6 }), A.FadeOut(read, { dur: 0.6 }), A.Write(title, 1.6), A.FadeIn(sub, { dy: 20 }), lag(0.25, ms.map((m) => A.FadeIn(m, { dy: 20, dur: 0.5 }))),
      { cap: 'This is The Gradient of Reward. We will answer that question from first principles, starting from a single softmax and building up to PPO, DPO and GRPO, the methods behind today’s assistants and reasoning models.' });
    const slow = S.add(S.english('every symbol: a {colour|pt}, a {name|rr}, and a {reason to be there|AA}', { size: 40, width: 1500 }).at(0, 280));
    S.beat('We will go slowly. Every formula will be built one step at a time, with a reason for each step, and every symbol will get a colour, a name, and a reason to be there.',
      S.writeIn(slow, 2));
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
