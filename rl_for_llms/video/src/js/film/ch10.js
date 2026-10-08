// Chapter 10 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch10(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // numbers on screen, with a real minus sign; and the same inside TeX
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  const tnum = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '') + Math.abs(x).toFixed(d);
  const tsgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '+') + Math.abs(x).toFixed(d);
  // numbers as a narrator says them
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b] = Math.abs(x).toFixed(d).split('.');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const fade = (ms, dur = 0.6) => par(ms.flat(Infinity).filter(Boolean).map((m) => A.FadeOut(m, { dur })));
  const boxOf = (S, m, color, x = m.init.x, y = m.init.y) => S.add(S.rect(m.w + 80, m.h + 50, { stroke: color, width: 4, rx: 12 }).at(x, y));
  const reason = (S, str) => S.add(S.reason(str));
  // a value in a table
  const cell = (S, str, x, y, color = C.WHITE, size = 40) => S.add(S.txt(str, { size, color, font: 'mono' }).at(x, y));
  // a TeX row label that ends at x = right
  const rowLab = (S, tex, right, y, size = 40) => {
    const m = S.add(S.tex(tex, { size }));
    return m.at(right - m.w / 2, y);
  };
  // a framed panel: a title and a few lines
  const panel = (S, title, lines, { w = 780, h = 260, color = C.GREY_B, size = 34 } = {}) => {
    const g = S.group(rect(w, h, { stroke: color, width: 3, fill: mix(C.BG, color, 0.1), rx: 14 }), new Text(title, { size: 44, color }).at(0, -h / 2 + 50));
    lines.forEach((ln, i) => g.add(new Text(ln, { size, color: C.WHITE }).at(0, -h / 2 + 118 + i * 52)));
    return g;
  };
  /*
   * A term tour like S.tour, except that each stop can first run `pre`
   * animations (clearing space), and a stop can light a different formula.
   * Ends with S.endTour(formula) as usual.
   */
  const tour = (S, f, stops, at = [0, 160]) => {
    for (const st of stops) {
      const cid = st.card === undefined ? [].concat(st.sym)[0] : st.card;
      const cd = cid ? S.add(S.symcard(cid, Object.assign({ w: 1100 }, st.text || {}))).at(...(st.at || at)) : null;
      const prev = S._tourCard;
      const opts = { hold: st.hold ?? 0.9 };
      if (st.cap) opts.cap = st.cap;
      S.beat(st.say, par(st.pre || [], prev ? A.FadeOut(prev, { dur: 0.4 }) : null), A.Spot(st.f || f, st.sym), cd ? A.FadeIn(cd, { dy: 16, dur: 0.6 }) : null, ...(st.anims || []), opts);
      S._tourCard = cd;
    }
  };

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c10sd', 'data', '\\operatorname{std}(\\rr)', 'the group’s spread', 'the standard deviation of the G rewards: the root of their average squared distance from the mean', 'dividing by it puts every group’s advantages on one scale');
  FILM.addSymbol('c10len', 'data', '|\\yy_i|', 'the length of answer i', 'counting its tokens', 'dividing by it makes each answer count once, long or short');
  FILM.addSymbol('c10l', 'reward', '\\ell_{i,t}', 'the token’s score', 'the clipped term minus the leash, at token t of answer i', 'the objective is its average over tokens, answers and prompts');
  FILM.addSymbol('c10kh', 'leash', '\\widehat{\\mathrm{KL}}_{i,t}', 'the estimated KL at one token', 'the sampled token’s probability under π_θ and under π_ref', 'the exact KL averages over every token the model could write; we only see the one it wrote');
  FILM.addSymbol('c10k1', 'leash', 'k_1', 'the plain estimate', 'the log-ratio of the sampled token', 'its average is the KL, by definition');
  FILM.addSymbol('c10k3', 'leash', 'k_3', 'Schulman’s estimate', 'k₁ plus u − 1, a term that averages to zero', 'still right on average, never negative, and calm when the models are close');
  FILM.addSymbol('c10p', 'policy', 'p', 'the solve rate', 'the chance that one sampled answer to this prompt is right', 'easy prompts have p near 1, hard ones p near 0');
  FILM.addSymbol('c10s', 'ratio', 's_i', 'the sequence ratio', 'the geometric mean of answer i’s token ratios', 'the reward belongs to the whole answer; now one ratio does too');
  const SD_T = '\\cData{c10sd}{\\operatorname{std}(\\rr)}';
  const LEN = '\\cData{c10len}{|\\yy_i|}';
  const ELL = '\\cReward{c10l}{\\ell_{i,t}}';
  const KH = '\\cLeash{c10kh}{\\widehat{\\mathrm{KL}}_{i,t}}';
  const K1 = '\\cLeash{c10k1}{k_1}';
  const K3 = '\\cLeash{c10k3}{k_3}';
  const P = '\\cPolicy{c10p}{p}';
  const SR = '\\cRatio{c10s}{s_i}';
  const CLIP = '\\min\\Big(\\rat_{i,t}\\,\\Ahat_i,\\;\\; \\operatorname{clip}\\big(\\rat_{i,t},\\, 1-\\eps,\\, 1+\\eps\\big)\\,\\Ahat_i\\Big)';

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  // the group of eight (setup.js: GROUP), worked by hand
  const G = GROUP.r.length;
  const RIGHT = RL.sum(GROUP.r);
  const MEAN = RIGHT / G;
  const DEV = RL.groupAdvantages(GROUP.r, { std: false });
  const SD = Math.sqrt(RL.sum(DEV.map((d) => d * d)) / G);
  const ADV = GROUP.adv;
  const ADV10 = RL.groupAdvantages(GROUP.r.map((r) => 10 * r));
  const iR = GROUP.r.indexOf(1);
  const iW = GROUP.r.indexOf(0);
  const SQ = RL.sum(ADV.map((a) => a * a)) / G;
  // the KL toy of setup.js (GROUP.kl): pi_theta and pi_ref at one position
  const KQ = [0.4, 0.3, 0.2, 0.1];
  const KP = [0.35, 0.33, 0.2, 0.12];
  if (Math.abs(RL.klEstimators(KQ, KP).truth - GROUP.kl.truth) > 1e-12) throw new Error('ch10: the KL toy no longer matches GROUP.kl');
  const KL = GROUP.kl;
  const KU = KQ.map((q, i) => KP[i] / q);
  const KV1 = KU.map((u) => -Math.log(u));
  const KV3 = KU.map((u) => u - 1 - Math.log(u));
  // dead groups
  const DEAD = (p) => RL.deadGroupProbability(p, G);
  // the spread of a 0/1 group with k right answers
  const sdOf = (k) => {
    const d = RL.groupAdvantages(Array.from({ length: G }, (_, i) => (i < k ? 1 : 0)), { std: false });
    return Math.sqrt(RL.sum(d.map((x) => x * x)) / G);
  };
  // R1-Zero (papers.js: deepseek2025)
  const R1 = { before: 15.6, after: 77.9, v1: 71.0 };

  /* =========================================================== CHAPTER 10 */
  video.chapter('ch10', 'Verifiable rewards and GRPO');
  card(10, 'Rewards you can check: GRPO');

  /*
   * Verifiable rewards: a checker in place of the reward model. r is one bit,
   * the average reward is the chance of being right, and what a checker can
   * and cannot be trusted with.
   */
  video.scene('rlvr', 'Verifiable rewards', (S) => {
    const h = S.add(S.title('A judge that checks'));
    const RW = S.color('rr');

    // 1. a question with a right answer
    const q = S.add(S.box('What is 17 × 3?', { w: 470, h: 80, color: C.GREY_B, size: 40 }).at(-560, -300));
    const a1 = S.add(S.tokens(['…', 'so', 'the', 'answer', 'is', '51'], { size: 34 }).at(-560, -180));
    const a2 = S.add(S.tokens(['…', 'so', 'the', 'answer', 'is', '41'], { size: 34 }).at(-560, -40));
    const chk = S.add(S.box('checker', { w: 340, h: 260, color: RW, size: 44, sub: 'reference: 51' }).at(60, -110));
    const ar1 = S.add(S.arrow(-265, -180, -125, -180, { color: C.GREY_B, width: 4 }));
    const ar2 = S.add(S.arrow(-265, -40, -125, -40, { color: C.GREY_B, width: 4 }));
    const out1 = S.add(S.arrow(245, -180, 385, -180, { color: RW, width: 4 }));
    const out2 = S.add(S.arrow(245, -40, 385, -40, { color: RW, width: 4 }));
    const r1 = S.add(S.tex('\\rr = 1', { size: 64 }).at(510, -180));
    const r0 = S.add(S.tex('\\rr = 0', { size: 64 }).at(510, -40));
    const ok = S.add(S.check(46).at(670, -180));
    const no = S.add(S.cross(40).at(670, -40));
    const e1 = S.add(S.english('some answers can be {checked|rr}, not just judged', { size: 46 }).at(0, 170));
    S.beat('Until now, rewards came from a reward model, a network imitating people. But seventeen times three is fifty-one, whatever anyone prefers. Some answers can simply be checked.',
      A.FadeIn(h), A.FadeIn(q, { dy: -16 }), A.FadeIn(a1, { dx: -20 }), A.Arrow(ar1, 0.5), A.FadeIn(chk), A.Arrow(out1, 0.5), A.Write(r1, 0.8), A.Create(ok, 0.5), S.writeIn(e1, 1.6),
      { cap: 'Until now, rewards came from a reward model, a network imitating people. But 17 × 3 is 51, whatever anyone prefers. Some answers can simply be checked.' });

    // 2. the checker is a program; the reward is one bit
    const F = S.add(S.tex('\\rr(\\xx, \\yy) \\;=\\; \\begin{cases} 1 & \\text{if the checker accepts } \\yy \\\\ 0 & \\text{otherwise} \\end{cases}', { size: 62 }).at(0, 175));
    const n2 = S.add(S.english('for code, the checker runs the unit tests: {1|rr} if they all pass', { size: 34, color: C.GREY_B, italic: true }).at(0, 305));
    S.beat('A checker is an ordinary program. It pulls out the final answer and compares it with the reference: one if they match, zero if not. For code, it runs unit tests.',
      A.FadeOut(e1), A.FadeIn(a2, { dx: -20 }), A.Arrow(ar2, 0.5), A.Arrow(out2, 0.5), A.Write(r0, 0.8), A.Create(no, 0.5), A.Write(F, 1.8), S.writeIn(n2, 1.2),
      { cap: 'A checker is an ordinary program. It pulls out the final answer and compares it with the reference: 1 if they match, 0 if not. For code, it runs unit tests.' });

    // 3. symbol card: the reward, now computed
    const cR = S.add(S.symcard('rr', { w: 1100, from: 'a checker: a program that tests the final answer, or runs unit tests', why: 'it is computed, not predicted: there is no network in between to fool' }).at(0, 150));
    S.beat('So the reward is one bit, computed rather than predicted. There is no network in between whose mistakes the policy could learn to exploit.',
      fade([q, a1, a2, ar1, ar2, chk, out1, out2, r1, r0, ok, no, n2]), A.MoveTo(F, 0, -130), A.Spot(F, 'rr'), A.FadeIn(cR, { dy: 16 }));

    // 4. RLVR: chapter 8's objective with a checker
    const O = S.add(S.tex('\\JJ(\\th) \\;=\\; \\EE_{\\yy \\sim \\pt}\\big[\\rr(\\xx, \\yy)\\big] \\;-\\; \\bt\\, \\KL(\\pt \\,\\|\\, \\pref)', { size: 76 }).at(0, -60));
    const eO = S.add(S.english('chapter 8’s objective, leash and all, with a {checker|rr} where the reward model was', { size: 40 }).at(0, 120));
    const a10 = S.add(S.english('Tülu 3’s checker paid {10|rr} points for a correct answer, not 1', { size: 34, color: C.GREY_B, italic: true }).at(0, 210));
    S.paper('lambert2024');
    S.beat('The Tülu three team called this R L V R, reinforcement learning with verifiable rewards: chapter eight’s objective, leash and all, with a checker in place of the reward model. Theirs paid ten points per correct answer.',
      A.Unspot(F), A.FadeOut(cR), UP(F), A.Write(O, 2), S.writeIn(eO, 1.8), S.writeIn(a10, 1.2),
      { cap: 'The Tülu 3 team called this RLVR, reinforcement learning with verifiable rewards: chapter 8’s objective, leash and all, with a checker in place of the reward model. Theirs paid 10 points per correct answer (α = 10).' });

    // 5. with a 0/1 reward, the average reward is the chance of being right
    const D = S.add(S.tex('\\EE_{\\yy \\sim \\pt}\\big[\\rr(\\yy)\\big] \\;=\\; \\sum_{\\yy} \\pt(\\yy)\\, \\rr(\\yy) \\;=\\; \\sum_{\\yy \\,\\text{correct}} \\pt(\\yy) \\;=\\; \\Pr(\\text{correct})', { size: 62 }).at(0, -40));
    const r5 = reason(S, 'because: {r|rr} is 1 on correct answers and 0 elsewhere, so only correct ones remain');
    const n5 = S.add(S.english(`the bandit: only 51 passes the check, so the {average reward|rr} is {π(51)|pt} = ${f2(BAND.pi[0])}`, { size: 38 }).at(0, 140));
    const toy5 = S.add(S.toy(0, 200));
    S.beat(`With rewards of one and zero, wrong answers drop out of the average. What remains is the probability of being right: in our bandit, ${sayN(BAND.pi[0])}.`,
      fade([F, eO, a10]), UP(O), A.Write(D, 2.2), S.writeIn(r5, 1.6), S.writeIn(n5, 1.6), A.FadeIn(toy5),
      { cap: `With rewards of one and zero, wrong answers drop out of the average. What remains is the probability of being right: in our bandit, ${f2(BAND.pi[0])}.` });

    // 6. why it resists hacking
    const pRM = S.add(panel(S, 'a reward model (chapter 7)', ['the truth plus a fitted error', 'optimisation hunts for the error'], { color: C.GREY_B })).at(-420, -150);
    const pCK = S.add(panel(S, 'a checker', ['fits nothing: 51 matches, or not', 'flattery earns 0'], { color: RW })).at(420, -150);
    S.beat('Why is this harder to hack? Chapter seven’s reward model was the truth plus an error, and optimization hunted for the error. A checker fits nothing: fifty-one matches or it does not. Flattery earns zero.',
      fade([O, D, r5, n5, toy5]), A.FadeIn(pRM, { dy: 20 }), A.FadeIn(pCK, { dy: 20 }),
      { cap: 'Why is this harder to hack? Chapter 7’s reward model was the truth plus an error, and optimization hunted for the error. A checker fits nothing: 51 matches or it does not. Flattery earns 0.' });

    // 7. what it cannot do
    const l1 = S.add(S.english('1. the check can have holes: a loose answer extractor, tests that miss a case', { size: 36 }).at(0, 80));
    const l2 = S.add(S.english('2. it sees only what it checks: a right number from wrong reasoning still gets {1|rr}', { size: 36 }).at(0, 160));
    const l3 = S.add(S.english('3. helpfulness, clarity and honesty have no checker at all', { size: 36 }).at(0, 240));
    S.beat('Limits remain. The check can have holes, like a sloppy answer extractor, and optimization will find them. A right number from wrong reasoning still scores one. And helpfulness has no checker.',
      S.writeIn(l1, 1.4), wait(2.2), S.writeIn(l2, 1.4), wait(2), S.writeIn(l3, 1.2),
      { cap: 'Limits remain. The check can have holes, like a sloppy answer extractor, and optimization will find them. A right number from wrong reasoning still scores 1. And helpfulness has no checker.' });
  });

  /*
   * GRPO's advantage, built on the group of eight: the group mean as the
   * baseline (chapter 4), the spread, the division; tour; what dividing buys.
   */
  video.scene('grpo', 'Group-relative advantages', (S) => {
    const h = S.add(S.title('Better than the group?'));

    // 1. why: the same reward can be news or nothing
    const e0 = S.add(S.english('a {reward|rr} of 1 says the answer was right. But how good was it?', { size: 46 }).at(0, -330));
    const pA = S.add(S.box('What is 2 + 2?', { w: 640, h: 130, color: C.GREY_B, size: 42, sub: 'almost every answer is right' }).at(-420, -140));
    const pB = S.add(S.box('an olympiad problem', { w: 640, h: 130, color: C.GREY_B, size: 42, sub: 'a right answer is rare' }).at(420, -140));
    const rA = S.add(S.tex('\\rr = 1', { size: 60 }).at(-420, 10));
    const rB = S.add(S.tex('\\rr = 1', { size: 60 }).at(420, 10));
    const e1 = S.add(S.english('chapter 4: compare with a {baseline|bb}, the {reward we expected|bb} for this {prompt|xx}', { size: 40 }).at(0, 170));
    S.beat('A reward of one says right. But on two plus two nearly every answer is right, while on an olympiad problem a right answer is news. As in chapter four, compare with the reward we expected.',
      A.FadeIn(h), S.writeIn(e0, 1.6), A.FadeIn(pA, { dy: 16 }), A.FadeIn(rA), A.FadeIn(pB, { dy: 16 }), A.FadeIn(rB), S.writeIn(e1, 1.8),
      { cap: 'A reward of 1 says right. But on 2 + 2 nearly every answer is right, while on an olympiad problem a right answer is news. As in chapter 4, compare with the reward we expected.' });

    // 2. the group
    const X = GROUP.r.map((_, i) => -470 + i * 180);
    const LX = -585;
    const Y = { y: -265, m: -195, r: -130, d: -65, a: 0 };
    const pr = S.add(S.box('one prompt x', { w: 360, h: 70, color: C.GREY_B, size: 38 }).at(160, -365));
    const gN = S.add(S.tex(`\\GN = ${G}`, { size: 56 }).at(560, -365));
    const chips = X.map((x, i) => S.add(S.group(rect(140, 64, { stroke: C.GREY_B, width: 3, fill: mix(C.BG, C.WHITE, 0.08), rx: 10 }), new Tex(`\\yy_{${i + 1}}`, { size: 44 })).at(x, Y.y)));
    const lY = rowLab(S, '\\text{answer}', LX, Y.y);
    S.paper('shao2024');
    S.beat('P P O asks a critic network what to expect. G R P O, group relative policy optimization, from the DeepSeekMath paper, asks a group: G answers to the same prompt. Here, eight.',
      fade([e0, pA, pB, rA, rB, e1]), A.FadeIn(pr, { dy: -16 }), A.FadeIn(gN), A.FadeIn(lY), lag(0.12, chips.map((c) => A.FadeIn(c, { dy: 16, dur: 0.4 }))),
      { cap: 'PPO asks a critic network what to expect. GRPO, group relative policy optimization, from the DeepSeekMath paper, asks a group: G answers to the same prompt. Here, eight.' });

    // 3. score them; the group mean is the baseline
    const marks = GROUP.r.map((r, i) => S.add((r ? S.check(40) : S.cross(34)).at(X[i], Y.m)));
    const lR = rowLab(S, '\\text{reward } \\rr_i', LX, Y.r);
    const cR = GROUP.r.map((r, i) => cell(S, String(r), X[i], Y.r, S.color('rr')));
    const M = S.add(S.tex(`\\rbar \\;=\\; \\frac{1}{\\GN}\\sum_{j=1}^{\\GN} \\rr_j \\;=\\; \\frac{${RIGHT}}{${G}} \\;=\\; \\cBase{nm}{${MEAN.toFixed(3)}}`, { size: 64 }).at(0, 125));
    const r3 = reason(S, 'because: the group’s average estimates the {reward we expect|bb} on this {prompt|xx} (chapter 4)');
    S.beat('The checker scores them: three right, five wrong. The baseline is the group’s average reward, three eighths: the group’s own estimate of what to expect on this prompt.',
      lag(0.1, marks.map((m) => A.Create(m, 0.3))), A.FadeIn(lR), lag(0.06, cR.map((m) => A.FadeIn(m))), A.Write(M, 1.8), S.writeIn(r3, 1.6),
      { cap: `The checker scores them: three right, five wrong. The baseline is the group’s average reward, 3/8 = ${MEAN.toFixed(3)}: the group’s own estimate of what to expect on this prompt.` });

    // 4. subtract it
    const lD = rowLab(S, '\\rr_i - \\rbar', LX, Y.d);
    const cD = DEV.map((d, i) => cell(S, sgn(d, 3), X[i], Y.d, S.color('AA'), 36));
    const r4 = reason(S, `because (chapter 4): {r_i − r̄|AA} is ${G - 1}/${G} of the leave-one-out advantage, which is unbiased`);
    S.beat(`Subtract it. Right answers sit ${sayN(DEV[iR], 3)} above expectation, wrong ones ${sayN(-DEV[iW], 3)} below, and the row sums to zero. Chapter four showed this only rescales an unbiased estimate.`,
      A.FadeOut(r3), A.FadeIn(lD), lag(0.06, cD.map((m) => A.FadeIn(m, { dy: 10 }))), S.writeIn(r4, 1.8),
      { cap: `Subtract it. Right answers sit ${DEV[iR].toFixed(3)} above expectation, wrong ones ${(-DEV[iW]).toFixed(3)} below, and the row sums to zero. Chapter 4 showed this only rescales an unbiased estimate.` });

    // 5. the spread, and the division
    const SDF = S.add(S.tex(`${SD_T} \\;=\\; \\sqrt{\\frac{1}{\\GN}\\sum_{j=1}^{\\GN} (\\rr_j - \\rbar)^2} \\;=\\; ${SD.toFixed(3)}`, { size: 58 }).at(0, 130));
    S.beat(`Then G R P O divides by the group’s standard deviation, the typical size of those differences: here, ${sayN(SD, 3)}.`,
      fade([M, r4]), A.Write(SDF, 2),
      { cap: `Then GRPO divides by the group’s standard deviation, the typical size of those differences: here, ${SD.toFixed(3)}.` });
    const AF = S.add(S.tex(`\\Ahat_i \\;=\\; \\frac{\\rr_i - \\rbar}{${SD_T}}`, { size: 76 }).at(0, 168));
    const bx = boxOf(S, AF, S.color('Ahat'));
    const lA = rowLab(S, '\\Ahat_i', LX, Y.a);
    const cA = ADV.map((a, i) => cell(S, sgn(a), X[i], Y.a, S.color('Ahat')));
    S.beat(`Divide, and that is G R P O’s advantage: plus ${sayN(ADV[iR])} for each right answer, ${sayN(ADV[iW])} for each wrong one.`,
      A.FadeOut(SDF), A.Write(AF, 1.6), A.Create(bx, 0.8), A.FadeIn(lA), lag(0.06, cA.map((m) => A.FadeIn(m, { dy: 10 }))),
      { cap: `Divide, and that is GRPO’s advantage: ${sgn(ADV[iR])} for each right answer, ${sgn(ADV[iW])} for each wrong one.` });

    // 6. symbol tour
    const table = [pr, gN, chips, lY, marks, lR, cR, lD, cD, lA, cA, bx];
    tour(S, AF, [
      { sym: 'Ahat', pre: [fade(table), A.MoveTo(AF, 0, -150)], at: [0, 140],
        text: { name: 'the advantage of answer i', from: 'this one group of answers: no critic network', why: 'its sign says push answer i up or down; its size says how hard' },
        say: 'A-hat i is answer i’s advantage. The hat means estimated, here from this one group. Its sign says push the answer up or down; its size, how hard.',
        cap: 'Âᵢ is answer i’s advantage. The hat means estimated, here from this one group. Its sign says push the answer up or down; its size, how hard.' },
      { sym: ['rr', 'rbar', 'c10sd'], card: 'c10sd', at: [0, 140],
        say: 'On top, the reward minus r-bar, the baseline. Below, the spread: dividing by it measures each difference in units of the group’s own spread.',
        cap: 'On top, the reward minus r̄, the baseline. Below, the spread: dividing by it measures each difference in units of the group’s own spread.' },
    ]);

    // 7. read it
    const eA = S.add(S.english('answer i’s {advantage|Ahat}: how far its {reward|rr} sits above the {group’s average|rbar}, in units of the group’s {spread|c10sd}', { size: 42, width: 1500 }).at(0, 120));
    S.beat('As a sentence: answer i’s advantage is how far its reward sits above the group’s average, in units of the group’s spread.',
      S.endTour(AF), S.writeIn(eA, 2.2));

    // 8. what if the checker paid ten points? what dividing buys
    const W1 = S.add(S.tex(`\\rr_i \\in \\{0, 1\\}: \\quad \\rbar = ${MEAN.toFixed(3)},\\;\\; \\operatorname{std} = ${SD.toFixed(3)}, \\quad \\Ahat_i = ${tsgn(ADV[iR])} \\text{ or } ${tsgn(ADV[iW])}`, { size: 48 }).at(0, 40));
    const W2 = S.add(S.tex(`\\rr_i \\in \\{0, 10\\}: \\quad \\rbar = ${(10 * MEAN).toFixed(2)},\\;\\; \\operatorname{std} = ${(10 * SD).toFixed(2)}, \\quad \\Ahat_i = ${tsgn(ADV10[iR])} \\text{ or } ${tsgn(ADV10[iW])}`, { size: 48 }).at(0, 130));
    const e8 = S.add(S.english(`in every group the {advantages|Ahat} average 0 and their squares average ${SQ.toFixed(0)}, unless all rewards are equal`, { size: 36, color: C.GREY_B, italic: true }).at(0, 250));
    S.beat('What if the checker paid ten points, as in Tülu three? Mean and spread grow tenfold, and the advantages do not change. In every group, they average zero, and their squares average one.',
      A.FadeOut(eA), A.Write(W1, 1.6), A.Write(W2, 1.6), A.Indicate(W2, { color: C.GREEN, scale: 1.04 }), S.writeIn(e8, 1.6),
      { cap: 'What if the checker paid ten points, as in Tülu 3? Mean and spread grow tenfold, and the advantages do not change. In every group, they average zero, and their squares average one.' });
  });

  /*
   * The GRPO objective (DeepSeekMath, Eq. 3), built from PPO's ratio and
   * clip, the leash, and the two averages; toured and read.
   */
  video.scene('c10-obj', 'The GRPO objective', (S) => {
    const h = S.add(S.title('The GRPO objective'));

    // 1. the ratio
    const e0 = S.add(S.english('we know which answers to push; now, how far, and how safely?', { size: 44 }).at(0, -300));
    const RT = S.add(S.tex('\\rat_{i,t}(\\th) \\;=\\; \\frac{\\pt(\\yy_{i,t} \\mid \\ss_{i,t})}{\\pold(\\yy_{i,t} \\mid \\ss_{i,t})}', { size: 80 }).at(0, -60));
    const e1 = S.add(S.english('token t of answer i, in the same {state|ss} for both models: the prompt plus the tokens before it', { size: 36, color: C.GREY_B }).at(0, 130));
    const r1 = reason(S, 'because: {π_old|pold} sampled the group; the {ratio|rat} re-weights it for {π_θ|pt} (chapter 6)');
    S.beat('Now the update, borrowed from P P O. An old copy of the policy wrote the group, so each token gets a ratio: its new probability over its old one.',
      A.FadeIn(h), S.writeIn(e0, 1.6), A.Write(RT, 1.8), A.Spot(RT, ['pt', 'pold']), S.writeIn(e1, 1.6), S.writeIn(r1, 1.6), A.Unspot(RT),
      { cap: 'Now the update, borrowed from PPO. An old copy of the policy wrote the group, so each token gets a ratio: its new probability over its old one.' });

    // 2. the clipped term
    const CL = S.add(S.tex(CLIP, { size: 72 }).at(0, -60));
    const r2 = reason(S, 'because: one batch should not move any token’s {probability|pt} too far (chapter 6)');
    S.beat('Each token gets P P O’s clipped term, with its answer’s advantage: ratio times advantage, but no extra credit once the ratio leaves the band one plus or minus epsilon.',
      fade([e0, e1, r1]), UP(RT), A.Write(CL, 2), S.writeIn(r2, 1.4), A.Spot(CL, ['Ahat']), wait(1), A.Spot(CL, ['rat', 'eps']), wait(1), A.Unspot(CL),
      { cap: 'Each token gets PPO’s clipped term, with its answer’s advantage: ratio times advantage, but no extra credit once the ratio leaves the band 1 ± ε.' });

    // 3. the leash: the token's score
    const LT = S.add(S.tex(`${ELL} \\;=\\; ${CLIP} \\;-\\; \\bt\\, ${KH}`, { size: 60 }).at(0, -60));
    const r3 = reason(S, 'because: the {policy|pt} should stay near the {reference|pref} (chapter 8)');
    S.beat('Then chapter eight’s leash: minus beta times an estimate of the K L at this token. That makes the token’s score, ell. The leash is subtracted here directly, not folded into the reward.',
      A.FadeOut(r2), A.FadeOut(RT), UP(CL), A.Write(LT, 2), A.Spot(LT, ['bt', 'c10kh']), S.writeIn(r3, 1.8), A.Unspot(LT),
      { cap: 'Then chapter 8’s leash: minus β times an estimate of the KL at this token. That makes the token’s score, ℓ. The leash is subtracted here directly, not folded into the reward.' });

    // 4. average: the objective
    const JG = S.add(S.tex(`\\JJ_{\\text{GRPO}}(\\th) \\;=\\; \\EE_{\\xx,\\; \\yy_1 \\dots \\yy_{\\GN} \\sim \\pold}\\Big[\\frac{1}{\\GN}\\sum_{i=1}^{\\GN} \\frac{1}{${LEN}} \\sum_{t=1}^{${LEN}} ${ELL}\\Big]`, { size: 70 }).at(0, -250));
    const r4 = reason(S, 'because: dividing by its {length|c10len} makes each answer count once, however long');
    S.beat('Finally, average the scores over each answer’s tokens, dividing by its length; then over the G answers and the prompts. That is the G R P O objective from DeepSeekMath.',
      A.FadeOut(r3), A.FadeOut(CL), A.Write(JG, 2.4), S.writeIn(r4, 1.8),
      { cap: 'Finally, average the scores over each answer’s tokens, dividing by its length; then over the G answers and the prompts. That is the GRPO objective from DeepSeekMath.' });

    // 5. tour
    tour(S, JG, [
      { sym: 'GN', pre: [A.FadeOut(r4)], text: { why: 'more answers make a better baseline, and cost more compute' },
        say: 'G, the group size, is a knob: more answers give a better baseline, at more compute. DeepSeekMath sampled sixty-four per question.',
        cap: 'G, the group size, is a knob: more answers give a better baseline, at more compute. DeepSeekMath sampled 64 per question.' },
      { sym: 'c10len', say: 'The bars around y i mean its length in tokens. Dividing by it gives every answer the same total weight. Remember this division.',
        cap: 'The bars around yᵢ mean its length in tokens. Dividing by it gives every answer the same total weight. Remember this division.' },
      { f: LT, sym: ['bt', 'c10kh'], card: 'c10kh', pre: [A.Unspot(JG)],
        say: 'And K L hat estimates the K L at token t, priced by beta; DeepSeekMath used zero point zero four. How can one token estimate a K L? Next.',
        cap: 'And KL-hat estimates the KL at token t, priced by β; DeepSeekMath used β = 0.04. How can one token estimate a KL? Next.' },
    ], [0, 165]);

    // 6. read it, and what the group bought
    const eG = S.add(S.english('for each {prompt|xx}, sample {G|GN} answers; push every token along its answer’s {advantage|Ahat}, through a {clipped|eps} {ratio|rat}, minus a {leash|bt} to the {reference|pref}; average over tokens, then answers', { size: 38, width: 1600 }).at(0, 140));
    S.beat('In words: for each prompt, sample a group. Push every token along its answer’s advantage, through a clipped ratio, minus a leash to the reference. Average over tokens, then answers.',
      S.endTour(LT), S.writeIn(eG, 2.6));
    const chip = (label, key, x, y) => S.add(S.box(label, { w: 330, h: 80, color: S.color(key), size: 36 }).at(x, y));
    const ppoT = S.add(S.txt('PPO for RLHF (chapter 6)', { size: 42, color: C.GREY_B }).at(-430, -320));
    const grT = S.add(S.txt('GRPO with a checker', { size: 42, color: C.GREY_B }).at(430, -320));
    const ppo = [chip('policy', 'pt', -610, -210), chip('critic', 'VV', -250, -210), chip('reward model', 'rr', -610, -100), chip('reference', 'pref', -250, -100)];
    const grp = [chip('policy', 'pt', 250, -210), chip('reference', 'pref', 610, -210), chip('checker program', 'rr', 430, -100)];
    const nP = S.add(S.english('four networks; the {baseline|bb} is a critic as big as the model', { size: 34, color: C.GREY_B, width: 760 }).at(-430, 30));
    const nG = S.add(S.english('two networks and a program; the {baseline|bb} is the group mean, at the price of {G|GN} answers per prompt', { size: 34, color: C.GREY_B, width: 760 }).at(430, 30));
    S.beat('What did the group buy? P P O for R L H F runs four networks; G R P O with a checker, two. The price: many answers per prompt.',
      fade([JG, LT, eG]), A.FadeIn(ppoT), lag(0.3, ppo.map((c) => A.FadeIn(c, { dy: 12 }))), S.writeIn(nP, 1.2), A.FadeIn(grT), lag(0.3, grp.map((c) => A.FadeIn(c, { dy: 12 }))), S.writeIn(nG, 1.4),
      { cap: 'What did the group buy? PPO for RLHF runs four networks; GRPO with a checker, two. The price: many answers per prompt.' });
  });

  /*
   * The per-token KL estimate: k1 = -log u is unbiased but noisy and can be
   * negative; adding u - 1 (average 0) gives k3 = u - 1 - log u, unbiased,
   * >= 0 (log u <= u - 1), and quadratic near u = 1. Exact numbers: GROUP.kl.
   */
  video.scene('c10-k3', 'Estimating the leash', (S) => {
    const h = S.add(S.title('One token, one estimate'));
    const XS = [-120, 130, 380, 630];
    const LX = -250;
    const Y = { t: -275, q: -212, p: -156, u: -100, k1: -44, k3: 12 };
    const LCOL = S.color('KL');

    // 1. why: the exact KL needs every token, we see one
    const e0 = S.add(S.english('the exact {KL|KL} averages over every token the {policy|pt} could write here; we see only the one it {did write|yy}', { size: 42, width: 1500 }).at(0, 170));
    const toks = ['a', 'b', 'c', 'd'].map((t, i) => S.add(S.box(t, { w: 120, h: 70, color: C.GREY_B, size: 40, font: 'mono' }).at(XS[i], Y.t)));
    const lT = rowLab(S, '\\text{token}', LX, Y.t);

    // 2. the toy position
    const lQ = rowLab(S, '\\pt', LX, Y.q, 46);
    const lP = rowLab(S, '\\pref', LX, Y.p, 46);
    const cQ = KQ.map((v, i) => cell(S, v.toFixed(2), XS[i], Y.q, S.color('pt')));
    const cP = KP.map((v, i) => cell(S, v.toFixed(2), XS[i], Y.p, S.color('pref')));
    const toy = S.add(S.toy(-650, -340));
    const KLF = S.add(S.tex(`\\KL(\\pt \\,\\|\\, \\pref) \\;=\\; \\sum_{\\yy} \\pt(\\yy) \\log\\frac{\\pt(\\yy)}{\\pref(\\yy)} \\;=\\; \\cLeash{nk}{${KL.truth.toFixed(4)}}`, { size: 56 }).at(0, 175));
    const kTag = S.add(S.tex(`\\KL = ${KL.truth.toFixed(4)}`, { size: 44 }).at(640, -340));
    const say1 = `K L hat stands in for the K L at one position. The exact K L averages over every token the policy could write, but we see just one. Take a toy with four tokens: the exact K L is ${sayN(KL.truth, 4)}.`;
    const first1 = seq(A.FadeIn(h), A.FadeIn(lT), lag(0.2, toks.map((t) => A.FadeIn(t, { dy: 12 }))), S.writeIn(e0, 2.2), A.Indicate(toks[1], { color: C.YELLOW, scale: 1.2 }));
    S.beat(say1, first1, wait(Math.max(0, S.atWord(say1, 'Take a toy') - MV.durOf(first1))),
      par(A.FadeOut(e0), A.FadeIn(toy), A.FadeIn(lQ), A.FadeIn(lP), lag(0.15, cQ.map((m) => A.FadeIn(m))), lag(0.15, cP.map((m) => A.FadeIn(m)))), A.Write(KLF, 1.6), A.FadeIn(kTag),
      { cap: `KL-hat stands in for the KL at one position. The exact KL averages over every token the policy could write, but we see just one. Take a toy with four tokens: the exact KL is ${KL.truth.toFixed(4)}.` });

    // 3. k1: the log-ratio of the sampled token
    const F1 = S.add(S.tex(`${K1} \\;=\\; \\log\\frac{\\pt(\\yy)}{\\pref(\\yy)} \\;=\\; -\\log u, \\qquad u \\;=\\; \\frac{\\pref(\\yy)}{\\pt(\\yy)}`, { size: 60 }).at(0, 175));
    const lU = rowLab(S, 'u', LX, Y.u, 46);
    const lK1 = rowLab(S, K1, LX, Y.k1, 46);
    const cU = KU.map((v, i) => cell(S, v.toFixed(3), XS[i], Y.u));
    const cK1 = KV1.map((v, i) => cell(S, sgn(v, 3), XS[i], Y.k1, LCOL));
    const r3 = reason(S, 'because: the {KL|KL} is defined as the {policy’s|pt} own average of this log-ratio (chapter 8)');
    // 4. but single samples misbehave
    const e4 = S.add(S.english(`one sample of {k₁|c10k1} can be negative, and its spread is ${KL.k1.sd.toFixed(3)}: about ${Math.round(KL.k1.sd / KL.truth)} times the {KL|KL} it estimates`, { size: 38 }).at(0, 175));
    const say3 = `Chapter eight’s definition suggests k one, the sampled token’s log-ratio: on average, exactly the K L. But token d gives ${sayN(KV1[3])}, a negative distance, and samples scatter ${words(Math.round(KL.k1.sd / KL.truth))} times wider than the K L itself.`;
    const first3 = seq(A.FadeOut(KLF), A.Write(F1, 1.8), A.FadeIn(lU), lag(0.15, cU.map((m) => A.FadeIn(m))), A.FadeIn(lK1), lag(0.15, cK1.map((m) => A.FadeIn(m))), S.writeIn(r3, 1.6));
    S.beat(say3, first3, wait(Math.max(0, S.atWord(say3, 'But token') - MV.durOf(first3))),
      A.FadeOut(r3), A.FadeOut(F1), A.Indicate(cK1[3], { color: C.RED, scale: 1.35 }), A.Indicate(cK1[1], { color: C.RED, scale: 1.25 }), S.writeIn(e4, 1.8),
      { cap: `Chapter 8’s definition suggests k₁, the sampled token’s log-ratio: on average, exactly the KL. But token d gives ${num(KV1[3])}, a negative distance, and samples scatter ${Math.round(KL.k1.sd / KL.truth)} times wider than the KL itself.` });

    // 5. a term with average zero
    const EU = S.add(S.tex('\\EE_{\\yy \\sim \\pt}\\big[\\,u\\,\\big] \\;=\\; \\sum_{\\yy} \\pt(\\yy)\\, \\frac{\\pref(\\yy)}{\\pt(\\yy)} \\;=\\; \\sum_{\\yy} \\pref(\\yy) \\;=\\; 1', { size: 62 }).at(0, 150));
    const r5 = reason(S, `because: {π_θ|pt} cancels; the {reference’s|pref} chances sum to 1 (${KP.map((v) => v.toFixed(2)).join(' + ')})`);
    S.beat('The fix uses u. Its average under the policy is exactly one: the policy’s probabilities cancel, and the reference’s add up to one. So u minus one averages to zero.',
      A.FadeOut(e4), A.Write(EU, 2), S.writeIn(r5, 1.6), A.Indicate(lU, { color: C.YELLOW, scale: 1.3 }),
      { cap: 'The fix uses u. Its average under the policy is exactly 1: the policy’s probabilities cancel, and the reference’s add up to 1. So u − 1 averages to zero.' });

    // 6. k3
    const F3 = S.add(S.tex(`${K3} \\;=\\; \\underbrace{-\\log u}_{${K1}} \\;+\\; \\underbrace{(u - 1)}_{\\text{averages } 0} \\;=\\; \\frac{\\pref}{\\pt} \\;-\\; \\log\\frac{\\pref}{\\pt} \\;-\\; 1`, { size: 58 }).at(0, 170));
    const lK3 = rowLab(S, K3, LX, Y.k3, 46);
    const cK3 = KV3.map((v, i) => cell(S, v.toFixed(4), XS[i], Y.k3, LCOL));
    const r6 = reason(S, 'because: the average of a sum is the sum of the averages: {KL|KL} + 0');
    S.paper('schulman2020kl');
    S.beat('Add u minus one to k one. Adding something that averages zero leaves the average alone. This is k three, from a note by John Schulman, and it is what G R P O uses.',
      A.FadeOut(r5), A.FadeOut(EU), A.Write(F3, 2), A.FadeIn(lK3), lag(0.15, cK3.map((m) => A.FadeIn(m))), S.writeIn(r6, 1.4),
      { cap: 'Add u − 1 to k₁. Adding something that averages zero leaves the average alone. This is k₃, from a note by John Schulman, and it is what GRPO uses.' });

    // 7. never negative: log u <= u - 1
    const table = [toks, lT, lQ, lP, cQ, cP, lU, lK1, cU, cK1, lK3, cK3];
    const AX = -380;
    const AY = -55;
    const ax = S.add(S.axes({ x0: 0, x1: 2.5, y0: -1, y1: 1.5, w: 760, h: 460, xticks: [0, 0.5, 1, 1.5, 2, 2.5], yticks: [-1, 0, 1], xfmt: (v) => String(v), xlabel: 'u', size: 30 }).at(AX, AY));
    const zero = S.add(S.line(AX - 380, AY + ax.fy(0), AX + 380, AY + ax.fy(0), { stroke: C.GREY, width: 3, dash: '6 8' }));
    const c1 = ax.plot((u) => -Math.log(u), { color: C.GREY_B, width: 5, from: 0.37, to: 2.5, dash: '14 10' });
    const c3 = ax.plot((u) => u - 1 - Math.log(u), { color: LCOL, width: 7, from: 0.12, to: 2.5 });
    const c1L = S.add(S.tex(`${K1} = -\\log u`, { size: 40 }));
    c1L.at(AX + ax.fx(0.47) + c1L.w / 2, AY + ax.fy(1.08));
    const c3L = S.add(S.tex(`${K3}`, { size: 44 }).at(AX + ax.fx(2.3), AY + ax.fy(2.3 - 1 - Math.log(2.3)) - 45));
    const touch = S.add(S.dot(12, C.YELLOW).at(AX + ax.fx(1), AY + ax.fy(0)));
    const I1 = S.add(S.tex('\\log u \\;\\le\\; u - 1', { size: 64 }).at(470, -170));
    const I2 = S.add(S.tex(`\\Longrightarrow\\quad ${K3} \\;=\\; u - 1 - \\log u \\;\\ge\\; 0`, { size: 54 }).at(470, -60));
    const r7 = reason(S, 'because: {log u ≤ u − 1|leash} (chapter 8), with equality only at u = 1');
    S.beat('And every sample is now non-negative. Chapter eight showed that log u is at most u minus one, touching only at one. So u minus one minus log u never drops below zero.',
      fade([F3, r6, table]), A.FadeIn(ax), A.FadeIn(zero), A.Create(c3, 1.4), A.FadeIn(c3L), A.FadeIn(touch, { from: 2 }), A.Write(I1, 1.2), A.Write(I2, 1.6), S.writeIn(r7, 1.6),
      { cap: 'And every sample is now non-negative. Chapter 8 showed that log u ≤ u − 1, touching only at u = 1. So u − 1 − log u never drops below zero.' });

    // 8. calm near u = 1
    const T1 = S.add(S.tex('-\\log u \\;\\approx\\; -(u - 1)', { size: 54 }).at(470, 70));
    const T3 = S.add(S.tex(`${K3} \\;\\approx\\; \\tfrac{1}{2}\\,(u - 1)^2`, { size: 54 }).at(470, 170));
    const r8 = reason(S, 'because: near u = 1, log u ≈ (u − 1) − ½ (u − 1)²');
    S.beat('It is also calm. Near one, minus log u tilts like a straight line, up on one side and down on the other. Adding u minus one cancels the tilt, leaving a small square.',
      A.FadeOut(r7), A.Create(c1, 1.2), A.FadeIn(c1L), A.Write(T1, 1.2), A.Write(T3, 1.4), S.writeIn(r8, 1.4),
      { cap: 'It is also calm. Near u = 1, −log u tilts like a straight line, up on one side and down on the other. Adding u − 1 cancels the tilt, leaving a small square: ½(u − 1)².' });

    // 9. exact numbers for k1, k2, k3
    const CX = [-640, -300, 120, 430, 720];
    const RY = [-270, -170, -80, 10, 100];
    const hd = ['', 'one sample', 'average', 'spread', 'smallest'].map((t, i) => (t ? S.add(S.txt(t, { size: 36, color: C.GREY_B }).at(CX[i], RY[0])) : null)).filter(Boolean);
    const rows = [
      [K1, '-\\log u', KL.k1],
      ['\\cLeash{c10k2}{k_2}', '\\tfrac{1}{2} (\\log u)^2', KL.k2],
      [K3, 'u - 1 - \\log u', KL.k3],
    ].map(([n, f, st], j) => [
      S.add(S.tex(n, { size: 50 }).at(CX[0], RY[j + 1])),
      S.add(S.tex(f, { size: 44 }).at(CX[1], RY[j + 1])),
      cell(S, st.mean.toFixed(6), CX[2], RY[j + 1], LCOL, 38),
      cell(S, st.sd.toFixed(4), CX[3], RY[j + 1], C.WHITE, 38),
      cell(S, num(st.min, 3), CX[4], RY[j + 1], st.min < 0 ? C.RED : C.WHITE, 38),
    ]);
    const truth = S.add(S.tex(`\\text{exact: } \\KL(\\pt \\,\\|\\, \\pref) \\;=\\; \\cLeash{nk}{${KL.truth.toFixed(6)}}`, { size: 48 }).at(0, RY[4] + 50));
    const toy9 = S.add(S.toy(720, RY[4] + 50));
    const e9 = S.add(S.english(`{k₃|c10k3}: right on average, never negative, ${Math.round(KL.k1.sd / KL.k3.sd)} times calmer than {k₁|c10k1}; it needs only the sampled token’s two probabilities`, { size: 36, width: 1600 }).at(0, 265));
    S.beat(`Exact numbers for the toy. k one scatters ${words(Math.round(KL.k1.sd / KL.k3.sd))} times wider than k three, and goes negative. k two, half the squared log, is calm but slightly biased. k three is unbiased, never negative, and calm.`,
      fade([ax, zero, c1, c3, c1L, c3L, touch, I1, I2, T1, T3, r8, kTag, toy]), lag(0.1, hd.map((m) => A.FadeIn(m))), lag(0.5, rows.map((r) => par(r.map((m) => A.FadeIn(m, { dy: 10 }))))), A.Write(truth, 1.2), A.FadeIn(toy9),
      A.Indicate(rows[1][2], { color: C.RED, scale: 1.2 }), S.writeIn(e9, 1.8),
      { cap: `Exact numbers for the toy. k₁ scatters ${Math.round(KL.k1.sd / KL.k3.sd)} times wider than k₃, and goes negative. k₂, half the squared log, is calm but slightly biased. k₃ is unbiased, never negative, and calm.` });
  });

  /*
   * Dead groups: all-equal rewards give zero advantages; the chance of that
   * is p^G + (1 - p)^G; DAPO's dynamic sampling.
   */
  video.scene('dead', 'Groups that teach nothing', (S) => {
    const h = S.add(S.title('When the whole group agrees'));
    const X = GROUP.r.map((_, i) => -470 + i * 180);
    const LX = -585;
    const Y = { m: -300, r: -230, d: -160, a: -90 };

    // 1. a unanimous group
    const marks = X.map((x) => S.add(S.check(40).at(x, Y.m)));
    const lR = rowLab(S, '\\rr_i', LX, Y.r);
    const cR = X.map((x) => cell(S, '1', x, Y.r, S.color('rr')));
    const lD = rowLab(S, '\\rr_i - \\rbar', LX, Y.d);
    const cD = X.map((x) => cell(S, '0', x, Y.d, S.color('AA')));
    const lA = rowLab(S, '\\Ahat_i', LX, Y.a);
    const cA = X.map((x) => cell(S, '0', x, Y.a, S.color('Ahat')));
    const Z = S.add(S.tex(`\\rbar = 1, \\quad ${SD_T} = 0, \\qquad \\Ahat_i \\;=\\; \\frac{1 - 1}{0 + \\text{tiny}} \\;=\\; 0`, { size: 60 }).at(0, 70));
    const e2 = S.add(S.english('all wrong: the same. Every {advantage|Ahat} is 0, so the clipped term is 0, and only the {leash|bt} still pulls', { size: 38, width: 1500 }).at(0, 220));
    const say1 = 'A weakness. If all eight answers are right, every reward equals the mean: every difference is zero, the spread is zero, and every advantage comes out zero. All wrong is the same. Only the leash still pulls.';
    const first1 = seq(A.FadeIn(h), lag(0.08, marks.map((m) => A.Create(m, 0.3))), A.FadeIn(lR), lag(0.05, cR.map((m) => A.FadeIn(m))), A.Write(Z, 2), A.FadeIn(lD), lag(0.05, cD.map((m) => A.FadeIn(m))), A.FadeIn(lA), lag(0.05, cA.map((m) => A.FadeIn(m))));
    S.beat(say1, first1, wait(Math.max(0, S.atWord(say1, 'All wrong') - MV.durOf(first1))), S.writeIn(e2, 2),
      { cap: 'A weakness. If all 8 answers are right, every reward equals the mean: every difference is 0, the spread is 0, and every advantage comes out 0. All wrong is the same. Only the leash still pulls.' });

    // 2. how often: p^G + (1 - p)^G
    const PF = S.add(S.tex(`\\Pr(\\text{all } \\GN \\text{ answers equal}) \\;=\\; ${P}^{\\GN} \\;+\\; (1 - ${P})^{\\GN}`, { size: 74 }).at(0, -60));
    const cp = S.add(S.symcard('c10p', { w: 1100 }).at(0, 130));
    const r2 = reason(S, 'because: the answers are independent, so chances multiply; the two cases never overlap');
    S.beat('How often? If each answer is right with probability p, independently, all G are right with probability p to the G, and all wrong with one minus p to the G.',
      fade([marks, lR, cR, lD, cD, lA, cA, Z, e2]), A.Write(PF, 2), A.FadeIn(cp, { dy: 16 }), S.writeIn(r2, 1.8),
      { cap: 'How often? If each answer is right with probability p, independently, all G are right with probability p^G, and all wrong with probability (1 − p)^G.' });

    // 3. the curve for G = 8
    const AX = 40;
    const AY = 60;
    const ax = S.add(S.axes({ x0: 0, x1: 1, y0: 0, y1: 1, w: 1000, h: 340, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xlabel: 'solve rate p', ylabel: `chance a group of ${G} is dead`, size: 30 }).at(AX, AY));
    const cv = ax.plot((p) => DEAD(p), { color: C.RED, width: 6 });
    const pts = [0.1, 0.5, 0.9].map((p) => S.add(S.dot(12, C.YELLOW).at(AX + ax.fx(p), AY + ax.fy(DEAD(p)))));
    const lab = [
      S.add(S.txt(`${Math.round(100 * DEAD(0.1))}%`, { size: 34, color: C.YELLOW }).at(AX + ax.fx(0.1) + 70, AY + ax.fy(DEAD(0.1)) - 10)),
      S.add(S.txt(`2 in 256`, { size: 34, color: C.YELLOW }).at(AX + ax.fx(0.5), AY + ax.fy(DEAD(0.5)) - 40)),
      S.add(S.txt(`${Math.round(100 * DEAD(0.9))}%`, { size: 34, color: C.YELLOW }).at(AX + ax.fx(0.9) - 70, AY + ax.fy(DEAD(0.9)) - 10)),
    ];
    if (Math.abs(DEAD(0.5) - 2 / 256) > 1e-12) throw new Error('ch10: dead-group probability at p = 1/2');
    S.beat(`With eight answers, a prompt solved half the time goes dead two times in two hundred fifty-six. At one in ten, or nine in ten: ${words(Math.round(100 * DEAD(0.1)))} percent. And as the model improves, more prompts become easy.`,
      A.FadeOut(cp), A.FadeOut(r2), UP(PF), A.FadeIn(ax), A.Create(cv, 1.8), lag(0.4, pts.map((d) => A.FadeIn(d, { from: 2 }))), lag(0.4, lab.map((m) => A.FadeIn(m))),
      { cap: `With eight answers, a prompt solved half the time goes dead 2 times in 256. At one in ten, or nine in ten: ${Math.round(100 * DEAD(0.1))}%. And as the model improves, more prompts become easy.` });

    // 4. DAPO: dynamic sampling
    const ps = [0.95, 0.5, 0.1, 0.7, 0.05, 0.4];
    const rand = RL.rng(6);
    const groups = ps.map((p) => Array.from({ length: G }, () => (rand() < p ? 1 : 0)));
    const GX = (i) => -330 + i * 72;
    const GY = (j) => -250 + j * 78;
    const rowsG = groups.map((g, j) => {
      const dead = g.every((x) => x === g[0]);
      const lab2 = S.add(S.tex(`${P} = ${ps[j]}`, { size: 38 }));
      lab2.at(-430 - lab2.w / 2, GY(j));
      const mk = g.map((x, i) => S.add((x ? S.check(30) : S.cross(26)).at(GX(i), GY(j))));
      const verdict = S.add(S.txt(dead ? 'all equal: dropped' : 'kept', { size: 34, color: dead ? C.RED : C.GREEN, anchor: 'start' }).at(300, GY(j)));
      const strike = dead ? S.add(S.line(GX(0) - 40, GY(j), GX(G - 1) + 40, GY(j), { stroke: C.RED, width: 4 }).with({ draw: 0 })) : null;
      return { lab2, mk, verdict, strike, dead };
    });
    const toyG = S.add(S.toy(720, -330));
    const e4 = S.add(S.english('dynamic sampling: keep sampling prompts until the batch is full of groups with 0 < right answers < {G|GN}', { size: 36, width: 1400 }).at(160, 270));
    S.paper('yu2025dapo');
    S.beat('DAPO, an open-source training recipe built on G R P O, uses dynamic sampling: sample extra prompts, drop every group that is all right or all wrong, and refill until the batch is full of groups that teach.',
      fade([ax, cv, pts, lab, PF]), A.FadeIn(toyG), lag(0.25, rowsG.map((r) => par(A.FadeIn(r.lab2), r.mk.map((m) => A.Create(m, 0.3))))), lag(0.3, rowsG.map((r) => par(A.FadeIn(r.verdict), r.strike ? A.Create(r.strike, 0.5) : null, r.dead ? par(r.mk.map((m) => A.Set(m, { o: 0.35 }))) : null))), S.writeIn(e4, 1.8),
      { cap: 'DAPO, an open-source training recipe built on GRPO, uses dynamic sampling: sample extra prompts, drop every group that is all right or all wrong, and refill until the batch is full of groups that teach.' });
  });

  /*
   * Repairs: DAPO's clip-higher and token-level loss, Dr. GRPO's two biases
   * (length and difficulty), and GSPO's sequence ratio.
   */
  video.scene('c10-fix', 'Repairs to GRPO', (S) => {
    const h = S.add(S.title('Repairs'));

    // 1. the clip holds rare tokens back
    const e0 = S.add(S.english('with {ε|eps} = 0.2, how much can one round push up a token’s {probability|pt}?', { size: 42 }).at(0, -330));
    const lo = S.add(S.box('a rare token', { w: 700, h: 90, color: S.color('pt'), size: 42 }).at(-420, -210));
    const hi = S.add(S.box('a common token', { w: 700, h: 90, color: S.color('pt'), size: 42 }).at(420, -210));
    const lot = S.add(S.tex(`\\pold = 0.01 \\;\\to\\; 0.01 \\times 1.2 = ${(0.01 * 1.2).toFixed(3)}`, { size: 50 }).at(-420, -90));
    const hit = S.add(S.tex('\\pold = 0.90 \\;\\to\\; \\text{up to } 1.00', { size: 50 }).at(420, -90));
    const gl = S.add(S.txt(`the clip stops the push: +${(0.01 * 0.2).toFixed(3)} at most`, { size: 38, color: C.RED }).at(-420, 10));
    const gh = S.add(S.txt(`room for +${(1 - 0.9).toFixed(2)}: ${Math.round((1 - 0.9) / (0.01 * 0.2))} times more`, { size: 38, color: C.GREEN }).at(420, 10));
    const toy1 = S.add(S.toy(0, 100));
    S.paper('yu2025dapo');
    S.beat('DAPO also changed the clip. With epsilon zero point two, a token at probability zero point zero one stops being pushed at zero point zero one two, while one at zero point nine can gain fifty times more.',
      A.FadeIn(h), S.writeIn(e0, 1.6), A.FadeIn(lo, { dy: 16 }), A.Write(lot, 1.2), A.FadeIn(gl), A.FadeIn(hi, { dy: 16 }), A.Write(hit, 1.2), A.FadeIn(gh), A.FadeIn(toy1),
      { cap: 'DAPO also changed the clip. With ε = 0.2, a token at probability 0.01 stops being pushed at 0.012, while one at 0.9 can gain 50 times more.' });

    // 2. clip-higher
    const CH = S.add(S.tex('\\operatorname{clip}\\big(\\rat_{i,t},\\; 1 - \\cKnob{c10el}{\\eps_{\\text{low}}},\\; 1 + \\cKnob{c10eh}{\\eps_{\\text{high}}}\\big), \\qquad \\cKnob{c10el}{\\eps_{\\text{low}}} = 0.2,\\;\\; \\cKnob{c10eh}{\\eps_{\\text{high}}} = 0.28', { size: 58 }).at(0, 210));
    const nCH = S.add(S.english(`clip-higher: the rare token may now reach 0.01 × 1.28 = ${(0.01 * 1.28).toFixed(4)}`, { size: 34, color: C.GREY_B, italic: true }).at(0, 300));
    S.beat('So DAPO splits epsilon: the lower limit stays zero point two, the upper rises to zero point two eight. With this clip-higher, rare tokens that prove good can grow faster.',
      A.FadeOut(toy1), A.Write(CH, 2.2), S.writeIn(nCH, 1.4),
      { cap: 'So DAPO splits ε: the lower limit stays 0.2, the upper rises to 0.28. With this clip-higher, rare tokens that prove good can grow faster.' });

    // 3. the division by length
    const WF = S.add(S.tex(`\\text{each token of answer } i \\text{ carries } \\;\\frac{\\Ahat_i}{\\GN\\; ${LEN}}`, { size: 64 }).at(0, -300));
    const PX = 6; // px per token
    const L0 = -600;
    const nS = 20;
    const nL = 200;
    const a = ADV[iW];
    const sS = S.add(S.rect(nS * PX, 44, { stroke: C.RED, width: 3, fill: mix(C.BG, C.RED, 0.3), rx: 6 }).at(L0 + (nS * PX) / 2, -120));
    const sL = S.add(S.rect(nL * PX, 44, { stroke: C.RED, width: 3, fill: mix(C.BG, C.RED, 0.3), rx: 6 }).at(L0 + (nL * PX) / 2, 60));
    const tS = S.add(S.txt(`a wrong answer, ${nS} tokens`, { size: 34, color: C.GREY_B, anchor: 'start' }).at(L0, -180));
    const tL = S.add(S.txt(`a wrong answer, ${nL} tokens`, { size: 34, color: C.GREY_B, anchor: 'start' }).at(L0, 0));
    const vS = S.add(S.tex(`\\frac{${tnum(a)}}{${nS}} = ${tnum(a / nS, 3)} \\text{ per token}`, { size: 46 }).at(120, -120));
    const vL = S.add(S.tex(`\\frac{${tnum(a)}}{${nL}} = ${tnum(a / nL, 4)} \\text{ per token}`, { size: 46 }).at(0, 160));
    const nG = S.add(S.english('(the 1/{G|GN} is the same for every answer)', { size: 32, color: C.GREY_B, italic: true }).at(0, 260));
    S.beat(`Next, the length division. Each token carries its answer’s advantage over the answer’s length: ${sayN(a / nS, 3)} per token for a twenty-token wrong answer, ten times less for two hundred tokens.`,
      fade([e0, lo, hi, lot, hit, gl, gh, CH, nCH]), A.Write(WF, 1.6), A.FadeIn(tS), A.Create(sS, 0.6), A.Write(vS, 1.2), A.FadeIn(tL), A.Create(sL, 1.2), A.Write(vL, 1.2), A.FadeIn(nG),
      { cap: `Next, the length division. Each token carries its answer’s advantage over the answer’s length: ${num(a / nS, 3)} per token for a 20-token wrong answer, ten times less for 200 tokens.` });
    const eB = S.add(S.english('long and wrong: punished less per token. Short and right: rewarded more per token', { size: 38 }).at(0, 262));

    // 4. the fixes: how much one token counts
    const MX = [-560, 0, 560];
    const fixes = [
      ['GRPO', `\\frac{1}{\\GN\\; ${LEN}}`, 'depends on its answer’s length'],
      ['DAPO', '\\frac{1}{\\sum_{j} |\\yy_j|}', 'the same for every token in the group'],
      ['Dr. GRPO', '\\frac{1}{\\GN}', 'the same for every token'],
    ].map(([n, f, note], j) => [
      S.add(S.txt(n, { size: 42, color: j ? C.GREEN : C.RED }).at(MX[0], -200 + j * 185)),
      S.add(S.tex(f, { size: 60 }).at(MX[1], -200 + j * 185)),
      S.add(S.txt(note, { size: 34, color: C.GREY_B }).at(MX[2], -200 + j * 185)),
    ]);
    const hdW = S.add(S.txt('how much one token counts', { size: 38, color: C.GREY_B }).at(0, -310));
    S.paper('liu2025drgrpo');
    S.beat('So long wrong answers are punished less per token, and short right ones are rewarded more. The Dr. G R P O paper calls this a response-level length bias.',
      A.FadeOut(nG), S.writeIn(eB, 1.8),
      { cap: 'So long wrong answers are punished less per token, and short right ones are rewarded more. The Dr. GRPO paper calls this a response-level length bias.' });
    S.beat('Two repairs. DAPO divides every token by the group’s total number of tokens, so all tokens in the group count the same. Dr. G R P O drops the length altogether, and divides by G alone.',
      fade([WF, sS, sL, tS, tL, vS, vL, eB]), A.FadeIn(hdW), lag(1.6, fixes.map((r) => par(r.map((m) => A.FadeIn(m, { dy: 12 }))))),
      { cap: 'Two repairs. DAPO divides every token by the group’s total number of tokens, so all tokens in the group count the same. Dr. GRPO drops the length altogether, and divides by G alone.' });

    // 5. the division by the spread: a difficulty bias
    const DF = S.add(S.tex(`\\text{Dr. GRPO:}\\quad \\Ahat_i \\;=\\; \\rr_i - \\rbar \\qquad \\big(\\text{no division by } ${SD_T}\\big)`, { size: 58 }).at(0, -280));
    const dRows = [1, 4].map((k, j) => S.add(S.tex(`${k} \\text{ right of } ${G}: \\quad ${SD_T} = ${sdOf(k).toFixed(2)} \\quad\\Longrightarrow\\quad \\text{advantages} \\times ${(1 / sdOf(k)).toFixed(2)}`, { size: 52 }).at(0, -120 + j * 110)));
    const eD = S.add(S.english('prompts that are nearly always right, or nearly always wrong, weigh more: a question-level difficulty bias', { size: 38, width: 1500 }).at(0, 160));
    S.beat('Dr. G R P O also drops the division by the spread. That division triples the advantages when one answer in eight is right, but only doubles them at four in eight. So lopsided prompts weigh more: a difficulty bias.',
      fade([hdW, fixes]), A.Write(DF, 1.8), lag(0.8, dRows.map((m) => A.Write(m, 1.4))), S.writeIn(eD, 1.8),
      { cap: 'Dr. GRPO also drops the division by the spread. That division triples the advantages when one answer in 8 is right, but only doubles them at 4 in 8. So lopsided prompts weigh more: a question-level difficulty bias.' });

    // 6. GSPO: one ratio per answer
    const PR = S.add(S.tex('\\frac{\\pt(\\yy_i \\mid \\xx)}{\\pold(\\yy_i \\mid \\xx)} \\;=\\; \\prod_{t=1}^{|\\yy_i|} \\frac{\\pt(\\yy_{i,t} \\mid \\ss_{i,t})}{\\pold(\\yy_{i,t} \\mid \\ss_{i,t})} \\;=\\; \\prod_{t=1}^{|\\yy_i|} \\rat_{i,t}', { size: 64 }).at(0, -60));
    const rP = reason(S, 'because: an answer’s {probability|pt} is the product of its tokens’ (chapter 1)');
    S.beat('Last, the ratio. The reward belongs to the whole answer, which has a ratio of its own: its probability is a product over tokens, so its ratio is the product of the token ratios.',
      fade([DF, dRows, eD]), A.Write(PR, 2.2), S.writeIn(rP, 1.6));
    const big = Math.pow(1.01, 500);
    const small = Math.pow(0.99, 500);
    const SF = S.add(S.tex(`${SR}(\\th) \\;=\\; \\Big(\\frac{\\pt(\\yy_i \\mid \\xx)}{\\pold(\\yy_i \\mid \\xx)}\\Big)^{1/|\\yy_i|} \\;=\\; \\Big(\\prod_{t=1}^{|\\yy_i|} \\rat_{i,t}\\Big)^{1/|\\yy_i|}`, { size: 64 }).at(0, 130));
    const nB = S.add(S.english(`500 token ratios of 1.01 multiply to ${big.toFixed(0)}; of 0.99, to ${small.toFixed(4)}`, { size: 34, color: C.GREY_B, italic: true }).at(0, 268));
    S.paper('zheng2025gspo');
    S.beat(`But products of hundreds of ratios run wild: five hundred ratios of one point zero one make about ${words(Math.round(big))}. So G S P O, from the Kwen team, uses their geometric mean instead.`,
      A.FadeOut(rP), UP(PR), A.Write(SF, 2.2), S.writeIn(nB, 1.4),
      { cap: `But products of hundreds of ratios run wild: five hundred ratios of 1.01 make about ${Math.round(big)}. So GSPO, from the Qwen team, takes the length-th root: their geometric mean.` });
    tour(S, SF, [
      { sym: 'c10s', pre: [A.FadeOut(PR), A.FadeOut(nB), A.MoveTo(SF, 0, -120)], at: [0, 150],
        say: 'Now five hundred ratios of one point zero one give exactly one point zero one, so one clip range fits any length. G S P O clips this one ratio, shared by all of the answer’s tokens.',
        cap: 'Now five hundred ratios of 1.01 give exactly 1.01, so one clip range fits any length. GSPO clips this one ratio, shared by all of the answer’s tokens.' },
    ]);
  });

  /*
   * R1-Zero: GRPO with checker rewards, straight from a base model.
   * Numbers: papers.js deepseek2025.
   */
  video.scene('r1', 'R1-Zero', (S) => {
    const h = S.add(S.title('DeepSeek-R1-Zero'));
    const steps = [
      S.add(S.box('a base model', { w: 420, h: 110, color: C.GREY_B, size: 40, sub: 'no supervised fine-tuning' }).at(-560, -250)),
      S.add(S.box('GRPO', { w: 420, h: 110, color: S.color('Ahat'), size: 40, sub: 'groups of answers' }).at(0, -250)),
      S.add(S.box('R1-Zero', { w: 420, h: 110, color: S.color('pt'), size: 40 }).at(560, -250)),
    ];
    const arr = [S.add(S.arrow(-340, -250, -220, -250, { color: C.GREY_B, width: 4 })), S.add(S.arrow(220, -250, 340, -250, { color: C.GREY_B, width: 4 }))];
    const rw = S.add(S.english('{reward|rr} = is the final answer correct? + is the response in the required format?', { size: 40 }).at(0, -100));
    S.paper('deepseek2025');
    S.beat('Now the best-known result of this recipe. DeepSeek ran G R P O straight on a base model, with no supervised fine-tuning first, and two checker rewards: is the answer correct, and is the format right?',
      A.FadeIn(h), lag(0.6, steps.map((s, i) => seq(A.FadeIn(s, { dx: -16 }), i < arr.length ? A.Arrow(arr[i], 0.4) : null))), S.writeIn(rw, 1.8),
      { cap: 'Now the best-known result of this recipe. DeepSeek ran GRPO straight on a base model, with no supervised fine-tuning first, and two checker rewards: is the answer correct, and is the format right?' });

    // 2. AIME 2024 pass@1
    const base = 300;
    const sc = 3.6;
    const b0 = S.add(S.bar(-260, base, R1.before * sc, C.GREY, 170));
    const b1 = S.add(S.bar(260, base, R1.after * sc, S.color('pt'), 170));
    const l0 = S.add(S.txt(`before: ${R1.before}%`, { size: 38, color: C.GREY_B }).at(-260, base - R1.before * sc - 34));
    const l1 = S.add(S.txt(`after: ${R1.after}%`, { size: 38, color: S.color('pt') }).at(260, base - R1.after * sc - 34));
    const axl = S.add(S.line(-480, base, 480, base, { stroke: C.GREY_B, width: 3 }));
    const lab = S.add(S.txt('AIME 2024, pass@1: the chance one sampled answer is right', { size: 32, color: C.GREY_B }).at(0, base + 36));
    S.beat('On the A I M E twenty twenty-four problems, the chance that one sampled answer is right rose from fifteen point six percent to seventy-seven point nine. That is exactly the average of the one-bit correctness reward.',
      fade([rw]), par(steps.map((s) => A.Set(s, { o: 0.5 }))), A.FadeIn(axl), A.FadeIn(lab), A.Create(b0, 0.8), A.FadeIn(l0), A.Create(b1, 2), A.FadeIn(l1),
      { cap: `On the AIME 2024 problems, the chance that one sampled answer is right (pass@1) rose from ${R1.before}% to ${R1.after}% (Nature version; ${R1.v1.toFixed(1)}% in the first arXiv version). That is exactly the average of the one-bit correctness reward.` });

    // 3. the question for the last chapter
    const e4 = S.add(S.english('did RL teach new reasoning, or {sharpen|pt} what the base model could already do?', { size: 46 }).at(0, -40));
    S.beat('So right answers became far more likely. Did reinforcement learning teach something new, or sharpen what the base model could already do? The last chapter asks.',
      fade([...steps, ...arr, b0, b1, l0, l1, axl, lab]), S.writeIn(e4, 2));
  });
});
