// Chapter 7 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch07(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // numbers on screen, with a real minus sign; and the same inside TeX
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  const tnum = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '') + Math.abs(x).toFixed(d);
  // numbers as a narrator says them
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
    return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? `${n % 1000 < 100 ? ' and ' : ' '}${words(n % 1000)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b] = Math.abs(x).toFixed(d).split('.');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  const pct = (p) => `${Math.round(100 * p)}%`;
  const sayPct = (p) => `${words(Math.round(100 * p))} percent`;
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  // a formula parked at the top while a picture explains it
  const TOP = (m, y = -330, s = 0.62) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s), A.Set(m, { o: 1 }));
  // a side note in the "because" style, for layouts with a picture beside it
  const side = (S, str, x, y, w = 760, size = 34) => S.english(str, { size, color: C.GREY_B, italic: true, width: w }).at(x, y);
  // a framed slip of text: an answer, a step of a recipe
  const slip = (S, lines, { w = 700, size = 34, color = C.WHITE, stroke = C.GREY, title = null, tcolor = C.GREY_B } = {}) => {
    const lh = size * 1.32;
    const rows = (title ? 1 : 0) + lines.length;
    const hh = rows * lh + 44;
    const g = new Group(rect(w, hh, { stroke, width: 3, fill: mix(C.BG, stroke, 0.12), rx: 12 }));
    let y = -hh / 2 + 22 + lh / 2;
    if (title) {
      g.add(new Text(title, { size: size - 2, color: tcolor, italic: true }).at(0, y));
      y += lh;
    }
    for (const ln of lines) {
      g.add(new Text(ln, { size, color }).at(0, y));
      y += lh;
    }
    g.h = hh;
    return S.add(g.hidden());
  };
  const fade = (ms, dur = 0.6) => par(ms.filter(Boolean).map((m) => A.FadeOut(m, { dur })));

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c7phi', 'params', '\\phi', 'the reward model’s weights', 'every adjustable number inside the reward model', 'a second network, with its own weights: θ stays the policy’s');
  FILM.addSymbol('c7gap', 'reward', '\\Delta', 'the score gap', 'the winner’s score minus the loser’s', 'Bradley-Terry only ever looks at this difference');
  FILM.addSymbol('c7D', 'data', '\\mathcal{D}', 'the comparisons', 'people shown two answers to one prompt, picking the better one', 'the only thing the reward model learns from');
  FILM.addSymbol('c7L', 'data', '\\mathcal{L}', 'the loss', 'minus the log-likelihood of people’s choices, averaged', 'training pushes it down, which makes the choices people really made likely');
  const PHI = '\\cParams{c7phi}{\\phi}';
  const RP = `\\rr_{${PHI}}`; // r_phi, the reward model's score
  const GAP = '\\cReward{c7gap}{\\Delta}';
  const DD = '\\cData{c7D}{\\mathcal{D}}';
  const LL = '\\cData{c7L}{\\mathcal{L}}';

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  const sig = RL.sigmoid;
  const T = RM.rTrue; // the toy's hidden scores, A..E (they average to zero)
  const pAE = sig(T[0] - T[4]);
  // the same 20,000 simulated comparisons setup.js fitted RM to
  const pairs = RL.simulatePreferences(RM.rTrue, 20000, 11);
  const count = (w, l) => pairs.filter(([a, b]) => a === w && b === l).length;
  const nAE = count(0, 4);
  const nEA = count(4, 0);
  const lossOf = (r) => RL.sum(pairs.map(([w, l]) => RL.btLoss(r[w], r[l]))) / pairs.length;
  const L0 = lossOf(T.map(() => 0));
  const Lfit = lossOf(RM.fit.r);
  const Lshift = lossOf(RM.fit.r.map((x) => x + 10));
  const GAPAE = T[0] - T[4]; // 2.2: the gap used for "expected" and "upset"
  // the leash toy (setup.js): four kinds of answer, a reference model, a proxy reward
  const Eref = RL.expectedReward(LEASH.ref, LEASH.r);
  const best = LEASH.r.indexOf(Math.max(...LEASH.r));

  /* =========================================================== CHAPTER 7 */
  video.chapter('ch7', 'Rewards from preferences');
  card(7, 'Where rewards come from: preferences');

  /*
   * Bradley-Terry, built from a wish list: strengths e^r, the winner's share
   * of the pair, divided through to a sigmoid of the score gap. Only gaps
   * matter. The sigmoid's shape, with numbers.
   */
  video.scene('bt', 'Bradley and Terry', (S) => {
    const h = S.add(S.title('Where rewards come from'));

    // 1. why: no checker for open-ended answers
    const q = S.add(S.box('Explain why the sky is blue, to a child.', { w: 980, h: 90, color: C.GREY_B, size: 40 }).at(0, -330));
    const ansA = slip(S, ['Sunlight is every colour mixed.', 'The air bounces the blue part', 'around the sky the most.'], { w: 640, title: 'answer A' }).at(-390, -95);
    const ansB = slip(S, ['Rayleigh scattering: intensity', 'goes as 1/λ⁴, so short', 'wavelengths dominate.'], { w: 640, title: 'answer B' }).at(390, -95);
    const e1 = S.add(S.english('both are true. Which is better? No program can check that.', { size: 40, color: C.GREY_B }).at(0, 150));
    S.beat('Where do rewards come from? For seventeen times three, a program checks the answer. But explain why the sky is blue, to a child? Both answers here are true, and no program can say which is better.',
      A.FadeIn(h), A.FadeIn(q, { dy: -16 }), A.FadeIn(ansA, { dx: -20 }), A.FadeIn(ansB, { dx: 20 }), S.writeIn(e1, 1.6),
      { cap: 'Where do rewards come from? For 17 × 3, a program checks the answer. But explain why the sky is blue, to a child? Both answers here are true, and no program can say which is better.' });

    // 2. people compare well
    const pick = S.add(S.tex('\\succ', { size: 96 }).at(0, -95));
    const e2 = S.add(S.english('a score out of ten? People disagree. {Which of two is better?|rr} They mostly agree.', { size: 40, width: 1500 }).at(0, 150));
    S.beat('Ask people for a score out of ten, and they disagree. Show them two answers side by side, and they can usually say which one is better.',
      A.FadeOut(e1), A.FadeIn(pick, { from: 2 }), A.Indicate(ansA, { color: C.GREEN, scale: 1.04 }), S.writeIn(e2, 1.8));

    // 3. notation: winner and loser
    const F3 = S.add(S.tex('\\xx: \\qquad \\yw \\;\\succ\\; \\yl', { size: 110 }).at(0, -110));
    const e3 = S.add(S.english('for the {prompt x|xx}, people preferred answer {y_w|yw} to answer {y_l|yl}', { size: 42 }).at(0, 50));
    S.beat('So our data are comparisons: a prompt, x, and two answers. The curly sign means: is preferred to.',
      fade([q, ansA, ansB, pick, e2]), A.Write(F3, 1.4), S.writeIn(e3, 1.6));
    S.tour(F3, [
      { sym: 'yw', at: [0, 220], text: { why: 'it won the comparison: w for winner' },
        say: 'y w, w for winner, is the answer the person picked.', cap: 'y_w, w for winner, is the answer the person picked.' },
      { sym: 'yl', at: [0, 220], text: { why: 'it lost the comparison: l for loser' },
        say: 'y l, l for loser, is the one they passed over. A comparison tells us nothing more.', cap: 'y_l, l for loser, is the one they passed over. A comparison tells us nothing more.' },
    ]);

    // 4. the plan: a hidden score, and a wish list for the rule
    const F4 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\;?', { size: 96 }).at(0, -230));
    const wish = [
      S.add(S.english('every answer {y|yy} has a hidden {score r(y)|rr}. We need a rule: two {scores|rr} in, a chance out', { size: 38, width: 1700 }).at(0, -70)),
      S.add(S.english('1.  the chance lies between 0 and 1', { size: 38 }).at(0, 40)),
      S.add(S.english('2.  the two chances, {y_w|yw} wins and {y_l|yl} wins, add up to 1', { size: 38 }).at(0, 110)),
      S.add(S.english('3.  a higher {score|rr} wins more often', { size: 38 }).at(0, 180)),
    ];
    S.beat('Suppose each answer has a hidden score, r. We need a rule: two scores in, a chance out. The chance lies between zero and one, the two chances add to one, and higher scores win more often.',
      S.endTour(F3), fade([F3, e3]), A.Write(F4, 1.2), S.writeIn(wish[0], 1.8), lag(1.4, wish.slice(1).map((w) => S.writeIn(w, 1.2))));

    // 5. build it: strengths, and the winner's share
    const F5 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\frac{e^{\\rr(\\yw)}}{e^{\\rr(\\yw)} + e^{\\rr(\\yl)}}', { size: 92 }).at(0, -60));
    const e5 = S.add(S.english('each answer gets a strength {e^r|rr}; the chance of winning is the winner’s share of the pair’s strength (chapter 3’s {softmax|pt}, over two answers)', { size: 38, width: 1500 }).at(0, 140));
    const r5 = S.add(S.reason('because: e to any power is positive and grows with the power; a share lies between 0 and 1, and the two shares add to 1'));
    S.beat('Give each answer a strength: e to its score, always positive, growing with the score. The chance of winning is the winner’s share of the two strengths. All three wishes hold. It is chapter three’s softmax, over two answers.',
      fade(wish), A.FadeOut(F4), A.Write(F5, 1.8), S.writeIn(e5, 2), S.writeIn(r5, 1.8),
      { cap: 'Give each answer a strength: e to its score, always positive, growing with the score. The chance of winning is the winner’s share of the two strengths. All three wishes hold. It is chapter 3’s softmax, over two answers.' });

    // 6. derive: divide through by the winner's strength
    const F6 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\frac{1}{1 + e^{\\rr(\\yl) - \\rr(\\yw)}} \\;=\\; \\frac{1}{1 + e^{-(\\rr(\\yw) - \\rr(\\yl))}}', { size: 72 }).at(0, -60));
    const r6 = S.add(S.reason('because: dividing the top and the bottom by the same number, {e^r(y_w)|rr}, changes nothing; and e^a / e^b = e^(a − b)'));
    S.beat('Now simplify. Divide the top and the bottom by the winner’s strength. That changes nothing. The top becomes one; the bottom, one plus e to the loser’s score minus the winner’s.',
      A.FadeOut(e5), A.FadeOut(r5), UP(F5), A.Write(F6, 2), S.writeIn(r6, 1.8));

    // 7. name it: the sigmoid
    const F7 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\sig\\big(\\rr(\\yw) - \\rr(\\yl)\\big), \\qquad \\sig(t) \\;=\\; \\frac{1}{1 + e^{-t}}', { size: 72 }).at(0, -60));
    const box7 = S.add(S.rect(F7.w + 80, F7.h + 50, { stroke: S.color('rr'), width: 4, rx: 12 }).at(0, -60));
    S.paper('bradley1952');
    S.beat('One over one plus e to the minus t is called the sigmoid, sigma. So the chance that w wins is the sigmoid of the score gap. This is the Bradley-Terry model, from nineteen fifty-two.',
      fade([F5, r6]), UP(F6), A.Write(F7, 2), A.Create(box7, 0.8),
      { cap: 'One over one plus e to the minus t is called the sigmoid, σ. So the chance that w wins is the sigmoid of the score gap. This is the Bradley-Terry model, from 1952.' });
    S.tour(F7, [
      { sym: 'sig', at: [0, 175], text: { from: 'σ(t) = 1 / (1 + e^(−t)), named for its S shape', why: 'it squashes any score gap into a chance between 0 and 1' }, anims: [A.FadeOut(F6)],
        say: 'The sigmoid takes any number, however large or negative, and squashes it smoothly into a chance between zero and one.' },
    ]);
    const e7 = S.add(S.english('the {chance|sig} that people prefer {y_w|yw} = the {sigmoid|sig} of how much higher {its score|rr} is than {the other’s|rr}', { size: 40, width: 1500 }).at(0, 150));
    S.beat('In words: the chance that people prefer y w is the sigmoid of how much higher its score is than the other’s.',
      S.endTour(F7), S.writeIn(e7, 2.2), { cap: 'In words: the chance that people prefer y_w is the sigmoid of how much higher its score is than the other’s.' });

    // 8. only differences matter
    const F8 = S.add(S.tex('\\sig\\big((\\rr(\\yw) + c) - (\\rr(\\yl) + c)\\big) \\;=\\; \\sig\\big(\\rr(\\yw) - \\rr(\\yl)\\big)', { size: 72 }).at(0, 140));
    const r8 = S.add(S.reason('because: the constant c cancels in the gap'));
    S.beat('Notice what it cannot see. Add the same constant to both scores, and the gap, and so the chance, stay the same. Comparisons pin down the gaps between scores, never their level.',
      A.FadeOut(e7), A.Write(F8, 2), S.writeIn(r8, 1.2));

    // 9. the sigmoid's shape, with numbers
    const AX = 60;
    const AY = 80;
    const ax = S.add(S.axes({ x0: -5, x1: 5, y0: 0, y1: 1, w: 1080, h: 360, xticks: [-4, -2, 0, 2, 4], yticks: [0, 0.5, 1], yfmt: (v) => String(v), xlabel: 'score gap  r(y_w) − r(y_l)', ylabel: 'chance y_w wins' }).at(AX, AY));
    const sc = ax.plot((t) => sig(t), { color: C.WHITE, width: 7 });
    const marks = [0, 1, 2, -2].map((t) => S.add(S.group(dot(12, S.color('rr')), new Text(`${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(t)}:  ${pct(sig(t))}`, { size: 34, color: S.color('rr'), anchor: t <= 0 ? 'end' : 'start' }).at(t <= 0 ? -24 : 24, t <= 0 ? -32 : 32)).at(AX + ax.fx(t), AY + ax.fy(sig(t)))));
    S.beat(`Its shape, with numbers. A gap of zero is a coin flip. A gap of one gives ${sayPct(sig(1))}; two gives ${sayPct(sig(2))}; minus two, ${sayPct(sig(-2))}. It is steepest at zero, and flattens where one answer almost surely wins.`,
      fade([F8, r8, box7]), TOP(F7), A.FadeIn(ax), A.Create(sc, 1.4), lag(0.8, marks.map((m) => A.FadeIn(m, { from: 1.6 }))),
      { cap: `Its shape, with numbers. A gap of 0 is a coin flip. A gap of 1 gives ${pct(sig(1))}; 2 gives ${pct(sig(2))}; −2, ${pct(sig(-2))}. It is steepest at zero, and flattens where one answer almost surely wins.` });

    // 10. the score as a network
    const net = S.add(S.box('language model', { w: 440, h: 130, color: C.TEAL, size: 42 }).at(-60, 0));
    const inp = S.add(S.box('prompt x + answer y', { w: 420, h: 100, color: C.GREY_B, size: 36 }).at(-630, 0));
    const head = S.add(S.box('one number', { w: 300, h: 100, color: S.color('rr'), size: 38 }).at(480, 0));
    const outT = S.add(S.tex('\\rr(\\xx, \\yy)', { size: 70 }).at(770, 0));
    const ar1 = S.add(S.arrow(-415, 0, -285, 0, { color: C.GREY_B, width: 5 }));
    const ar2 = S.add(S.arrow(165, 0, 325, 0, { color: C.GREY_B, width: 5 }));
    const e12 = S.add(S.english('a {reward model|rr}: a language model whose last layer gives one number instead of next-token {probabilities|pt}', { size: 38, width: 1500 }).at(0, 190));
    S.paper('christiano2017');
    S.beat('In practice, the hidden score is a network: a language model whose last layer outputs one number, instead of next-token probabilities. In twenty seventeen, Christiano and colleagues trained such a reward model from human comparisons.',
      fade([F7, ax, sc, ...marks]), A.FadeIn(inp, { dx: -20 }), A.Arrow(ar1, 0.5), A.FadeIn(net), A.Arrow(ar2, 0.5), A.FadeIn(head), A.Write(outT, 1), S.writeIn(e12, 2),
      { cap: 'In practice, the hidden score is a network: a language model whose last layer outputs one number, instead of next-token probabilities. In 2017, Christiano and colleagues trained such a reward model from human comparisons.' });
  });

  /*
   * The reward model's loss as maximum likelihood, its gradient (the winner
   * up, the loser down, by the surprise 1 - sigma), and a fit on 20,000
   * simulated comparisons that recovers the true scores up to a shift.
   */
  video.scene('rmfit', 'Fitting a reward model', (S) => {
    const h = S.add(S.title('Training a reward model'));

    // 1. why: weights that explain the choices
    const goal = S.add(S.english('how should we set the {reward model’s weights|c7phi}, so that its {scores|rr} explain the choices people made?', { size: 44, width: 1500 }).at(0, -260));
    const F1 = S.add(S.tex(`${RP}(\\xx, \\yy)`, { size: 120 }).at(0, -50));
    S.beat('We have a pile of comparisons, and a network that outputs a score. How should we set its weights, so that its scores explain the choices people made?',
      A.FadeIn(h), S.writeIn(goal, 2.2), A.Write(F1, 1.4));
    S.tour(F1, [
      { sym: 'c7phi', at: [0, 190], say: 'We call the reward model’s weights phi, to keep them apart from the policy’s weights, theta. Training the reward model changes phi only.',
        cap: 'We call the reward model’s weights φ, to keep them apart from the policy’s weights, θ. Training the reward model changes φ only.' },
    ]);

    // 2. one comparison's probability under the model
    const L1 = S.add(S.tex(`P_{${PHI}}(\\yw \\succ \\yl) \\;=\\; \\sig(${GAP}), \\qquad ${GAP} \\;=\\; ${RP}(\\xx, \\yw) - ${RP}(\\xx, \\yl)`, { size: 70 }).at(0, -60));
    const r1 = S.add(S.reason('because: Bradley-Terry, with the network’s {scores|rr} as the hidden scores'));
    S.beat('Take one comparison. Under the model, the choice the person made has a probability: the sigmoid of the gap between the network’s two scores. Call the gap delta.',
      S.endTour(F1), fade([goal, F1]), A.Write(L1, 2), S.writeIn(r1, 1.4), A.Spot(L1, 'c7gap'),
      { cap: 'Take one comparison. Under the model, the choice the person made has a probability: the sigmoid of the gap between the network’s two scores. Call the gap Δ.' });
    const e1 = S.add(S.english('maximum likelihood: choose {φ|c7phi} so that what people actually chose looks as likely as possible', { size: 40, width: 1500 }).at(0, 140));
    S.beat('A good model of people is not surprised by what they did. So choose phi to make their actual choices as likely as possible. That is called maximum likelihood.',
      A.Unspot(L1), A.FadeOut(r1), S.writeIn(e1, 2),
      { cap: 'A good model of people is not surprised by what they did. So choose φ to make their actual choices as likely as possible. That is called maximum likelihood.' });

    // 3. all of them: a product
    const L2 = S.add(S.tex(`P_{${PHI}}(\\text{all } N \\text{ choices}) \\;=\\; \\prod_{i=1}^{N} \\sig(${GAP}_i)`, { size: 76 }).at(0, -60));
    const r2 = S.add(S.reason('because: for independent events, the chance of all of them is the product of their chances'));
    S.beat('Assume the comparisons are independent. Then the chance of all of them together is the product of their chances: one sigmoid per comparison.',
      A.FadeOut(e1), UP(L1), A.Write(L2, 1.8), S.writeIn(r2, 1.6));

    // 4. take logs
    const L3 = S.add(S.tex(`\\log \\prod_{i=1}^{N} \\sig(${GAP}_i) \\;=\\; \\sum_{i=1}^{N} \\log \\sig(${GAP}_i)`, { size: 76 }).at(0, 130));
    const r3 = S.add(S.reason('because: the log of a product is the sum of the logs; and log only ever goes up, so the best {φ|c7phi} is the same'));
    S.beat('Thousands of numbers below one multiply to something too small for a computer. So take the log. The product becomes a sum, and since the log only goes up, the best phi is unchanged.',
      A.FadeOut(r2), A.Write(L3, 1.8), S.writeIn(r3, 1.8),
      { cap: 'Thousands of numbers below one multiply to something too small for a computer. So take the log. The product becomes a sum, and since the log only goes up, the best φ is unchanged.' });

    // 5. flip the sign, average: the loss
    const L4 = S.add(S.tex(`${LL}(${PHI}) \\;=\\; -\\,\\EE_{(\\xx, \\yw, \\yl) \\sim ${DD}}\\Big[\\log \\sig\\big(${RP}(\\xx, \\yw) - ${RP}(\\xx, \\yl)\\big)\\Big]`, { size: 72 }).at(0, -60));
    const box4 = S.add(S.rect(L4.w + 80, L4.h + 50, { stroke: S.color('rr'), width: 4, rx: 12 }).at(0, -60));
    const r4 = S.add(S.reason('because: training minimises, so flip the sign; dividing by N turns the sum into an average'));
    S.beat('Training software minimises, so flip the sign; and divide by the number of comparisons, to get an average. This is the reward model’s loss.',
      fade([L1, L2, r3]), UP(L3), A.Write(L4, 2.2), A.Create(box4, 0.8), S.writeIn(r4, 1.6));
    S.tour(L4, [
      { sym: 'c7L', at: [0, 175], anims: [A.FadeOut(r4), A.FadeOut(L3)], say: 'Curly L is the loss: one number that measures how surprised the model is by people’s choices.',
        cap: '𝓛 is the loss: one number that measures how surprised the model is by people’s choices.' },
      { sym: ['c7D', 'EE'], card: 'c7D', at: [0, 175], say: 'Curly D is the pile of comparisons. The expectation means: averaged over that pile.',
        cap: '𝓓 is the pile of comparisons. The expectation means: averaged over that pile.' },
    ]);
    const e4 = S.add(S.english('the {loss|c7L}: averaged over people’s {comparisons|c7D}, minus the log of the {chance|sig} the model gave to the choice they made', { size: 40, width: 1500 }).at(0, 160));
    S.beat('In a sentence: averaged over people’s comparisons, minus the log of the chance the model gave to the choice they made.',
      S.endTour(L4), S.writeIn(e4, 2.2));

    // 6. what the loss charges, with numbers
    const AX = -330;
    const AY = 70;
    const ax = S.add(S.axes({ x0: -4, x1: 4, y0: 0, y1: 4, w: 760, h: 340, xticks: [-4, -2, 0, 2, 4], yticks: [0, 1, 2, 3, 4], xlabel: 'gap Δ', ylabel: 'loss −log σ(Δ)' }).at(AX, AY));
    const lc = ax.plot((t) => RL.btLoss(t, 0), { color: S.color('rr'), width: 7 });
    const ex = [GAPAE, 0, -GAPAE];
    const pts = ex.map((t) => S.add(S.dot(12, C.WHITE).at(AX + ax.fx(t), AY + ax.fy(RL.btLoss(t, 0)))));
    const rows = [
      [`\\sig(${GAP}) = ${sig(ex[0]).toFixed(2)}`, RL.btLoss(ex[0], 0), 'expected the choice'],
      [`\\sig(${GAP}) = ${sig(ex[1]).toFixed(2)}`, RL.btLoss(ex[1], 0), 'a coin flip'],
      [`\\sig(${GAP}) = ${sig(ex[2]).toFixed(2)}`, RL.btLoss(ex[2], 0), 'confidently wrong'],
    ].map(([s, l, why], i) => S.add(S.group(
      new Tex(s, { size: 44 }).at(-110, 0),
      new Text(`loss ${l.toFixed(2)}`, { size: 38, color: S.color('rr'), anchor: 'start' }).at(40, -18),
      new Text(why, { size: 32, color: C.GREY_B, italic: true, anchor: 'start' }).at(40, 24)
    ).at(560, -110 + i * 130)));
    S.beat(`What does it charge? If the model gave their choice a chance of ${sayN(sig(ex[0]), 1)}, the loss is ${sayN(RL.btLoss(ex[0], 0))}. A coin flip costs ${sayN(RL.btLoss(0, 0))}. A confident mistake costs ${sayN(RL.btLoss(ex[2], 0), 1)}.`,
      fade([e4, box4]), TOP(L4), A.FadeIn(ax), A.Create(lc, 1.4), lag(0.9, pts.map((p, i) => par(A.FadeIn(p, { from: 2 }), A.FadeIn(rows[i], { dx: 20 })))),
      { cap: `What does it charge? If the model gave their choice a chance of ${sig(ex[0]).toFixed(1)}, the loss is ${RL.btLoss(ex[0], 0).toFixed(2)}. A coin flip costs ${RL.btLoss(0, 0).toFixed(2)}. A confident mistake costs ${RL.btLoss(ex[2], 0).toFixed(1)}.` });

    // 7. the gradient: the sigmoid's slope, then the loss's slope
    const G1 = S.add(S.tex('\\sig\'(t) \\;=\\; \\frac{e^{-t}}{(1 + e^{-t})^2} \\;=\\; \\sig(t)\\,\\big(1 - \\sig(t)\\big)', { size: 80 }).at(0, -60));
    const rg1 = S.add(S.reason('because: σ = (1 + e^(−t))^(−1), so the chain rule gives the middle; and e^(−t) / (1 + e^(−t)) = 1 − σ(t)'));
    S.beat('Which way does training push the scores? First, one fact: the slope of the sigmoid is sigma, times one minus sigma.',
      fade([L4, ax, lc, ...pts, ...rows]), A.Write(G1, 2), S.writeIn(rg1, 2),
      { cap: 'Which way does training push the scores? First, one fact: the slope of the sigmoid is σ(1 − σ).' });
    const G2 = S.add(S.tex(`\\frac{d}{d${GAP}}\\Big[-\\log \\sig(${GAP})\\Big] \\;=\\; -\\frac{\\sig'(${GAP})}{\\sig(${GAP})} \\;=\\; -\\big(1 - \\sig(${GAP})\\big)`, { size: 76 }).at(0, 130));
    const rg2 = S.add(S.reason('because: the chain rule, (log u)′ = u′ / u, and the slope of the sigmoid just above'));
    S.beat('So one comparison’s loss, minus log sigma of delta, has slope minus one minus sigma of delta. The sigma on top cancels the one below.',
      A.FadeOut(rg1), A.Write(G2, 2), S.writeIn(rg2, 1.4),
      { cap: 'So one comparison’s loss, −log σ(Δ), has slope −(1 − σ(Δ)). The σ on top cancels the one below.' });

    // 8. the push: winner up, loser down
    const G3 = S.add(S.tex(`\\frac{\\partial\\, \\text{loss}}{\\partial\\, ${RP}(\\xx, \\yw)} = -\\big(1 - \\sig(${GAP})\\big), \\qquad \\frac{\\partial\\, \\text{loss}}{\\partial\\, ${RP}(\\xx, \\yl)} = +\\big(1 - \\sig(${GAP})\\big)`, { size: 62 }).at(0, -60));
    const rg3 = S.add(S.reason('because: {Δ|c7gap} = winner’s {score|rr} − loser’s {score|rr}: it moves +1 with the first and −1 with the second'));
    const e8 = S.add(S.english('a step downhill: the {winner’s score|rr} goes up, the {loser’s score|rr} goes down, both by {1−σ(Δ)|c7gap}; back-propagation carries this into {φ|c7phi}', { size: 38, width: 1500 }).at(0, 140));
    S.beat('Delta rises with the winner’s score and falls with the loser’s. So a step downhill raises the winner’s score and lowers the loser’s, both by one minus sigma. Back-propagation carries that into phi.',
      A.FadeOut(rg2), A.FadeOut(G1), UP(G2), A.Write(G3, 2.2), S.writeIn(rg3, 1.6), S.writeIn(e8, 2),
      { cap: 'Δ rises with the winner’s score and falls with the loser’s. So a step downhill raises the winner’s score and lowers the loser’s, both by 1 − σ(Δ). Back-propagation carries that into φ.' });

    // 9. the push is the surprise
    const G4 = S.add(S.tex(`1 - \\sig(${GAP}) \\;=\\; P_{${PHI}}(\\yl \\succ \\yw)`, { size: 90 }).at(0, -60));
    const rg4 = S.add(S.reason('because: the two chances add up to one (wish 2)'));
    const e9 = S.add(S.english('the push is the {chance|sig} the model gave to the other outcome: how surprised it was', { size: 40, width: 1750 }).at(0, 90));
    const ex1 = S.add(S.english(`an expected win, {Δ = ${num(GAPAE, 1)}|c7gap}: push ${(1 - sig(GAPAE)).toFixed(2)};  an upset, {Δ = ${num(-GAPAE, 1)}|c7gap}: push ${(1 - sig(-GAPAE)).toFixed(2)}`, { size: 38, color: C.GREY_B, width: 1700 }).at(0, 190));
    S.beat(`And one minus sigma is the chance the model gave to the other outcome: its surprise. An expected win, at a gap of ${sayN(GAPAE, 1)}, pushes by ${sayN(1 - sig(GAPAE), 1)}. An upset pushes by ${sayN(1 - sig(-GAPAE), 1)}.`,
      fade([G2, G3, rg3, e8]), A.Write(G4, 1.6), S.writeIn(rg4, 1.2), S.writeIn(e9, 1.8), S.writeIn(ex1, 1.8),
      { cap: `And 1 − σ is the chance the model gave to the other outcome: its surprise. An expected win, at a gap of ${GAPAE.toFixed(1)}, pushes by ${(1 - sig(GAPAE)).toFixed(1)}. An upset pushes by ${(1 - sig(-GAPAE)).toFixed(1)}.` });

    // 10. the fit on simulated comparisons
    const toy = S.add(S.toy(760, -380));
    const AX2 = -360;
    const AY2 = 20;
    const ax2 = S.add(S.axes({ x0: -0.5, x1: 4.5, y0: -1.5, y1: 1.5, w: 860, h: 500, yticks: [-1, 0, 1], xlabel: '', ylabel: 'score' }).at(AX2, AY2));
    const xs = RM.labels.map((_, i) => AX2 + ax2.fx(i));
    const labs = RM.labels.map((l, i) => S.add(S.txt(l, { size: 44, font: 'mono' }).at(xs[i], AY2 + 300)));
    const truth = T.map((r, i) => S.add(S.line(xs[i] - 70, AY2 + ax2.fy(r), xs[i] + 70, AY2 + ax2.fy(r), { stroke: S.color('rr'), width: 6 }).with({ draw: 0 })));
    const fitD = RM.fit.r.map((r, i) => S.add(S.dot(16, S.color('c7phi')).at(xs[i], AY2 + ax2.fy(r))));
    const TX = 540;
    const th = [S.add(S.txt('true', { size: 36, color: S.color('rr') }).at(TX - 60, -270)), S.add(S.txt('fitted', { size: 36, color: S.color('c7phi') }).at(TX + 100, -270))];
    const trows = RM.labels.map((l, i) => S.add(S.group(
      new Text(l, { size: 38, font: 'mono' }).at(TX - 200, 0),
      new Text(num(T[i], 2), { size: 38, font: 'mono', color: S.color('rr') }).at(TX - 60, 0)
    ).at(0, -200 + i * 64)));
    const fitT = RM.fit.r.map((r, i) => S.add(S.txt(num(r, 2), { size: 38, font: 'mono', color: S.color('c7phi') }).at(TX + 100, -200 + i * 64)));
    const sim = S.add(side(S, `20,000 simulated comparisons: A beat E ${pct(nAE / (nAE + nEA))} of the time; σ(${num(GAPAE, 1)}) = ${pct(pAE)}`, TX, 170, 640, 32));
    S.beat(`Does it work? Give five toy answers, A to E, hidden scores, and simulate twenty thousand comparisons with Bradley-Terry odds. A beat E ${sayPct(nAE / (nAE + nEA))} of the time, as sigma of ${sayN(GAPAE, 1)} predicts.`,
      fade([G4, rg4, e9, ex1]), A.FadeIn(toy), A.FadeIn(ax2), lag(0.1, labs.map((l) => A.FadeIn(l))), lag(0.15, truth.map((t) => A.Create(t, 0.4))), A.FadeIn(th[0]), lag(0.15, trows.map((r) => A.FadeIn(r))), S.writeIn(sim, 1.4),
      { cap: `Does it work? Give five toy answers, A to E, hidden scores, and simulate 20,000 comparisons with Bradley-Terry odds. A beat E ${pct(nAE / (nAE + nEA))} of the time, as σ(${GAPAE.toFixed(1)}) predicts.` });
    const lossT = S.add(S.txt(`loss ${L0.toFixed(2)} → ${Lfit.toFixed(2)}`, { size: 36, color: C.GREY_B }).at(TX, 250));
    S.beat(`Now hide the scores, start them all at zero, and walk down the loss. It falls from ${sayN(L0)}, a coin flip everywhere, to ${sayN(Lfit)}. The fitted scores land on the true ones.`,
      A.FadeOut(sim), A.FadeIn(th[1]), lag(0.25, fitD.map((f, i) => par(A.FadeIn(f, { from: 2.5 }), A.FadeIn(fitT[i], { dx: -10 })))), A.FadeIn(lossT),
      { cap: `Now hide the scores, start them all at zero, and walk down the loss. It falls from ${L0.toFixed(2)}, a coin flip everywhere, to ${Lfit.toFixed(2)}. The fitted scores land on the true ones.` });

    // 11. up to a shift; what it buys
    const shT = S.add(S.txt('+10', { size: 36, color: S.color('c7phi') }).at(TX + 250, -270));
    const shRows = RM.fit.r.map((r, i) => S.add(S.txt(num(r + 10, 2), { size: 38, font: 'mono', color: S.color('c7phi') }).at(TX + 250, -200 + i * 64)));
    const lossS = S.add(S.txt(`with +10: loss ${Lshift.toFixed(2)}`, { size: 36, color: C.GREY_B }).at(TX, 120));
    const buys = S.add(side(S, 'now any answer gets a {score|rr}, even one nobody compared', TX, 300, 640, 34));
    S.beat('Up to one thing: add ten to every fitted score, and the loss does not move. Comparisons only see gaps, so the scores have no natural zero; we centre them. And now any answer gets a score, even one nobody compared.',
      A.FadeOut(lossT), A.FadeIn(shT), lag(0.15, shRows.map((m) => A.FadeIn(m, { dx: -10 }))), A.FadeIn(lossS), S.writeIn(buys, 1.4));
  });

  /*
   * The InstructGPT recipe (numbers from the ouyang2022 record only).
   */
  video.scene('instruct', 'InstructGPT', (S) => {
    const h = S.add(S.title('The RLHF recipe'));
    const steps = [['1  imitate', 'demonstrations', C.TEAL], ['2  reward model', 'from rankings', S.color('rr')], ['3  PPO', 'with a KL penalty', S.color('grad')]];
    const BY = -270;
    const boxes = steps.map(([a, b, col], i) => S.add(S.box(a, { w: 480, h: 150, color: col, size: 42, sub: b }).at(-580 + i * 580, BY)));
    const ar = [0, 1].map((i) => S.add(S.arrow(-580 + i * 580 + 250, BY, -580 + (i + 1) * 580 - 250, BY, { color: C.GREY_B, width: 5 })));
    const e0 = S.add(S.english('imitation (chapter 2), {policy gradients|grad} and PPO (chapters 3 to 6), a {learned reward|rr} (this chapter)', { size: 38, color: C.GREY_B, width: 1600 }).at(0, -40));
    S.paper('ouyang2022');
    S.beat('Now we have every piece. In twenty twenty-two, OpenAI put them together to turn G P T 3 into InstructGPT, in three steps you have already met.',
      A.FadeIn(h), lag(1.0, boxes.map((b, i) => seq(A.FadeIn(b, { dy: 20, dur: 0.6 }), i < 2 ? A.Arrow(ar[i], 0.5) : wait(0)))), S.writeIn(e0, 2.2),
      { cap: 'Now we have every piece. In 2022, OpenAI put them together to turn GPT-3 into InstructGPT, in three steps you have already met.' });

    // step 1
    const hi = (i) => par(boxes.map((b, j) => A.Set(b, { o: j === i ? 1 : 0.35 }, 0.6)));
    const d1 = S.add(S.english('people write good answers; the model is fine-tuned to imitate them', { size: 40 }).at(0, 30));
    const d1b = S.add(S.english('the result, the {supervised model|pref}, becomes the {reference π_ref|pref}', { size: 40 }).at(0, 120));
    S.beat('Step one: people write good answers, and the model is fine-tuned to imitate them, with chapter two’s loss. The result, the supervised model, becomes our reference, pi ref.',
      A.FadeOut(e0), hi(0), S.writeIn(d1, 1.8), S.writeIn(d1b, 1.8),
      { cap: 'Step one: people write good answers, and the model is fine-tuned to imitate them, with chapter 2’s loss. The result, the supervised model, becomes our reference, π_ref.' });

    // step 2: rankings give comparisons
    const KK = '\\cKnob{c7K}{K}';
    const d2 = S.add(S.english('labelers rank K = 4 to 9 of the model’s answers to one prompt', { size: 40 }).at(0, -60));
    const F2 = S.add(S.tex(`\\text{pairs in a ranking of } ${KK} \\;=\\; \\binom{${KK}}{2} \\;=\\; \\frac{${KK}(${KK} - 1)}{2}`, { size: 62 }).at(0, 80));
    const d2b = S.add(S.english('K = 4: 6 pairs;  K = 9: 36 pairs. Each pair is one term of the {Bradley-Terry loss|c7L}', { size: 36, color: C.GREY_B, width: 1600 }).at(0, 230));
    S.beat('Step two: labelers rank four to nine of the model’s answers to a prompt. A ranking of K answers holds K times K minus one over two pairs: six to thirty-six comparisons, each a term of our loss.',
      fade([d1, d1b]), hi(1), S.writeIn(d2, 1.6), A.Write(F2, 2), S.writeIn(d2b, 1.8),
      { cap: 'Step two: labelers rank 4 to 9 of the model’s answers to a prompt. A ranking of K answers holds K(K − 1)/2 pairs: 6 to 36 comparisons, each a term of our loss.' });

    // step 3: PPO with the penalty
    const F3 = S.add(S.tex(`${RP}(\\xx, \\yy) \\;-\\; \\bt\\, \\log \\frac{\\pt(\\yy \\mid \\xx)}{\\pref(\\yy \\mid \\xx)}`, { size: 76 }).at(0, 50));
    const d3 = S.add(S.english('the {reward model’s score|rr}, minus a penalty for drifting from the {supervised model|pref}; {β = 0.02|bt}, charged per token', { size: 38, width: 1750 }).at(0, 210));
    S.beat('Step three: P P O, against the reward model’s score minus a penalty for drifting from the supervised model, scaled by beta, zero point zero two, per token. That penalty is the next chapter.',
      fade([d2, F2, d2b]), hi(2), A.Write(F3, 2), S.writeIn(d3, 2),
      { cap: 'Step three: PPO, against the reward model’s score minus a penalty for drifting from the supervised model, scaled by β = 0.02, per token. That penalty is the next chapter.' });

    // the result
    const small = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.5 }).at(-300, 100));
    const large = S.add(S.creature({ color: C.GREY, kind: 'agent', size: 1.1 }).at(300, 60));
    const sl = S.add(S.txt('InstructGPT, 1.3B', { size: 38, color: C.TEAL }).at(-300, 250));
    const ll = S.add(S.txt('GPT-3, 175B', { size: 38, color: C.GREY_B }).at(300, 250));
    const pref = S.add(S.tex('\\succ', { size: 96 }).at(0, 100));
    S.beat('The result: labelers preferred the one point three billion parameter InstructGPT to the one hundred and seventy-five billion parameter G P T 3, a model over a hundred times larger.',
      fade([F3, d3]), par(boxes.map((b) => A.Set(b, { o: 1 }, 0.6))), A.FadeIn(small, { dy: 20 }), A.FadeIn(sl), A.FadeIn(large, { dy: 20 }), A.FadeIn(ll), A.FadeIn(pref, { from: 2 }), A.Mood(small, 1),
      { cap: 'The result: labelers preferred the 1.3B-parameter InstructGPT to the 175B-parameter GPT-3, a model over 100 times larger.' });
  });

  /*
   * Reward hacking: a proxy's errors are what optimisation finds. The leash
   * toy shows it; Gao et al. measured it (functional form from the record).
   */
  video.scene('hacking', 'Reward hacking', (S) => {
    const h = S.add(S.title('Goodhart’s law'));

    // 1. why: the policy pleases the proxy, and Goodhart's law
    const F1 = S.add(S.tex(`${RP}(\\yy) \\;=\\; \\underbrace{\\cReward{c7true}{r^{\\text{true}}}(\\yy)}_{\\text{what people prefer}} \\;+\\; \\underbrace{\\text{error}(\\yy)}_{\\text{the model’s mistake}}`, { size: 76 }).at(0, -150));
    const e2 = S.add(S.english('when a measure becomes a target, it stops being a good measure', { size: 44, italic: true }).at(0, 100));
    const e2b = S.add(S.english('optimisation hunts for the highest {score|rr}, and finds the answers whose {error|rr} is largest', { size: 38, color: C.GREY_B, width: 1500 }).at(0, 200));
    S.beat('Now the catch. The policy is trained to please the reward model, not people, and its score is the truth plus an error. Goodhart’s law: when a measure becomes a target, it stops being a good measure. Optimisation finds where the error is largest.',
      A.FadeIn(h), A.Write(F1, 2.2), S.writeIn(e2, 2), S.writeIn(e2b, 2));

    // 2. the leash toy: the proxy overrates flattery
    const toy = S.add(S.toy(720, -330));
    const BX = -330;
    const BY = 230;
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 130, gap: 80, color: S.color('pp'), labelFont: 'serif', labelSize: 36, valueSize: 30 }).at(BX, BY));
    const rl = LEASH.r.map((r, i) => S.add(S.txt(`r = ${r}`, { size: 32, color: S.color('rr'), font: 'mono' }).at(BX + bars.xs[i], BY + 92)));
    const pl = S.add(S.tex('\\pref', { size: 60 }).at(BX - 400, BY - 330));
    const ER = S.add(S.txt(`average reward ${Eref.toFixed(2)}`, { size: 40, color: S.color('rr') }).at(560, -60));
    const e3 = S.add(side(S, 'people prefer helpful answers; the {reward model|rr} pays most for flattery', 560, 60, 620, 36));
    S.beat(`A toy version. One prompt, four kinds of answer. The starting model is mostly vague, sometimes helpful, rarely rude or flattering. People prefer helpful answers, but the reward model has a flaw: it pays ${sayN(LEASH.r[best], 1)} for flattery.`,
      fade([F1, e2, e2b]), A.FadeIn(toy), A.FadeIn(bars), A.FadeIn(pl), lag(0.3, rl.map((m) => A.FadeIn(m, { dy: 10 }))), A.FadeIn(ER), S.writeIn(e3, 1.8), A.Indicate(rl[best], { color: C.RED, scale: 1.3 }),
      { cap: `A toy version. One prompt, four kinds of answer. The starting model is mostly vague, sometimes helpful, rarely rude or flattering. People prefer helpful answers, but the reward model has a flaw: it pays ${LEASH.r[best]} for flattery.` });
    const allIn = LEASH.r.map((_, i) => (i === best ? 1 : 0));
    const pl2 = S.add(S.tex('\\pp', { size: 60 }).at(BX - 400, BY - 330));
    const e4 = S.add(side(S, 'longer, more flattering or more confident than they should be: this is {reward hacking|rr}', 560, 200, 620, 34));
    S.beat(`Maximise that reward with nothing holding the policy back, and it learns to flatter every single time. The average reward climbs to ${sayN(LEASH.r[best], 1)}. People are worse off. This is called reward hacking.`,
      A.FadeOut(pl), A.FadeIn(pl2), bars.to(allIn, 2), A.Count(ER, Eref, LEASH.r[best], (v) => `average reward ${v.toFixed(2)}`, 2), S.writeIn(e4, 2),
      { cap: `Maximise that reward with nothing holding the policy back, and it learns to flatter every single time. The average reward climbs to ${LEASH.r[best]}. People are worse off. This is called reward hacking.` });

    // 3. Gao, Schulman and Hilton: measured
    const GA = 1;
    const GB = 0.45;
    const gold = (d) => (d <= 0 ? 0 : d * (GA - GB * Math.log(d)));
    const proxy = (d) => gold(d) + 0.06 * d * d;
    const AX = 0;
    const AY = 50;
    const ax = S.add(S.axes({ x0: 0, x1: 8, y0: 0, y1: 4.5, w: 1000, h: 360, xticks: [0, 2, 4, 6, 8], yticks: [0, 1, 2, 3, 4], xlabel: 'distance d', ylabel: 'reward' }).at(AX, AY));
    const pc = ax.plot(proxy, { color: S.color('rr'), width: 6, from: 0.001, to: 8, dash: '16 12' });
    const gc = ax.plot(gold, { color: S.color('rr'), width: 7, from: 0.001, to: 8 });
    const pL = S.add(S.txt('proxy reward model', { size: 34, color: S.color('rr'), anchor: 'end' }).at(AX + ax.fx(7.2), AY + ax.fy(proxy(7.2)) - 12));
    const gL = S.add(S.txt('gold reward model', { size: 34, color: S.color('rr') }).at(AX + ax.fx(5.2), AY + ax.fy(gold(5.2)) + 44));
    const shape = S.add(S.txt('toy curves: the shape, not the paper’s numbers', { size: 30, color: C.GREY, italic: true }).at(AX, -300));
    S.paper('gao2023');
    S.beat('Gao, Schulman and Hilton measured this. A large gold reward model stood in for people, and smaller proxy reward models were trained on its labels. Optimise against a proxy, and the proxy score keeps climbing. The gold score rises, peaks, and falls.',
      fade([toy, bars, ...rl, pl2, ER, e3, e4]), A.FadeIn(ax), A.FadeIn(shape), A.Create(pc, 2), A.FadeIn(pL), A.Create(gc, 2.4), A.FadeIn(gL));
    const FG = S.add(S.tex('\\cReward{c7R}{R}_{\\mathrm{RL}}(\\cLeash{c7d}{d}) \\;=\\; \\cLeash{c7d}{d}\\,\\big(\\alpha - \\beta \\log \\cLeash{c7d}{d}\\big), \\qquad \\cLeash{c7d}{d} \\;=\\; \\sqrt{\\KL(\\pp \\,\\|\\, \\cFrozen{c7init}{\\pi_{\\mathrm{init}}})}', { size: 54 }).at(0, -290));
    const e6 = S.add(side(S, 'a gain that grows like {d|c7d}, minus a cost, {d|c7d} log {d|c7d}, that grows faster and wins in the end', 0, -222, 1750, 34));
    const nG = S.add(S.english('α, β: constants fitted to each experiment. This β is not the {leash β|bt} of chapter 8', { size: 32, color: C.GREY_B, width: 1500 }).at(0, 345));
    S.beat('They found the gold score follows d times alpha minus beta log d, where d is the square root of a K L divergence, defined next chapter. A gain grows with distance; a cost grows faster, and wins. Alpha and beta are fitted constants, not our beta.',
      A.FadeOut(shape), A.Write(FG, 2.2), S.writeIn(e6, 2), S.writeIn(nG, 1.8), A.Indicate(gL, { color: C.RED, scale: 1.1 }),
      { cap: 'They found the gold score follows d(α − β log d), where d is the square root of a KL divergence, defined next chapter. A gain grows with distance; a cost grows faster, and wins. α and β are fitted constants, not our β.' });

    // 4. what we need
    const e7 = S.add(S.english('the {reward model|rr} learned from answers like the {starting model’s|pref}: it is trustworthy near there', { size: 40, width: 1500 }).at(0, -60));
    const e8 = S.add(S.english('so we need a leash: a price for moving away from the {starting model|pref}', { size: 46, color: S.color('bt') }).at(0, 60));
    const e9 = S.add(S.english('and to put a price on distance, first a way to measure it', { size: 38, color: C.GREY_B }).at(0, 160));
    S.beat('Where can the reward model be trusted? Near the answers it learned from: answers like the starting model’s. So we need a leash: a price for moving away from the starting model. And for that, a way to measure distance.',
      fade([ax, pc, gc, pL, gL, FG, nG, e6]), S.writeIn(e7, 2), S.writeIn(e8, 2), S.writeIn(e9, 1.6));
  });
});
