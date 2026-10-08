// Chapter 6 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch06(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  // words a narrator says for a decimal number (trailing zeros dropped)
  const sayN = (x, d = 2) => {
    const s = Math.abs(x).toFixed(d);
    const [a, b] = s.split('.');
    const tail = (b || '').replace(/0+$/, '');
    return `${x < 0 ? 'minus ' : ''}${DIG[+a] || a}${tail ? ` point ${tail.split('').map((c) => DIG[+c]).join(' ')}` : ''}`;
  };
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const sayInt = (n) => (n < 10 ? DIG[n] : n < 20 ? ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'][n - 10] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${DIG[n % 10]}` : ''}`);
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const fade = (...ms) => par(ms.flat().filter(Boolean).map((m) => A.FadeOut(m, { dur: 0.6 })));
  const side = (S, str, x, y, w = 760) => S.english(str, { size: 32, color: C.GREY_B, italic: true, width: w }).at(x, y);
  const must = (ok, what) => {
    if (!ok) throw new Error(`ch06: ${what}`);
  };

  /* ---------------------------------------------------------- the numbers */
  // the bandit of chapter 3 (BAND): three answers, rewards 1, 0.3, 0
  const PI = BAND.pi;
  const JOLD = BAND.J;
  // an unlucky batch of four, with no 51 in it, and its leave-one-out estimate
  const BATCH = [1, 2, 1, 2];
  const BADV = RL.looAdvantages(BATCH.map((a) => BAND.r[a]));
  const BG = [0, 0, 0];
  BATCH.forEach((a, i) => RL.score(PI, a).forEach((s, b) => (BG[b] += (BADV[i] * s) / BATCH.length)));
  const stepBy = (eta) => RL.softmax(BAND.z.map((z, b) => z + eta * BG[b]));
  const P_SMALL = stepBy(1);
  const P_BIG = stepBy(40);
  const J_SMALL = RL.expectedReward(P_SMALL, BAND.r);
  const J_BIG = RL.expectedReward(P_BIG, BAND.r);
  const NO51 = (1 - PI[0]) ** 4;
  const NO51_BIG = (1 - P_BIG[0]) ** 4;
  must(Math.round(NO51 * 100) === 7 && Math.round(NO51_BIG * 10) === 9, 'the narration says 7 in 100, then 9 in 10');
  must(Math.abs(J_SMALL - JOLD) < 0.01 && J_BIG < 0.33 && P_BIG[1] > 0.95 && NO51_BIG > 0.85, 'the unlucky batch collapses the policy on a big step');
  // importance sampling: the policy after one small exact-gradient step
  const PN = RL.softmax(BAND.z.map((z, b) => z + BAND.grad[b]));
  const RHO = PN.map((p, b) => p / PI[b]);
  const JNEW = RL.expectedReward(PN, BAND.r);
  const IS = RL.sum(PI.map((p, b) => p * RHO[b] * BAND.r[b]));
  const GAIN = RL.sum(PI.map((p, b) => p * RHO[b] * (BAND.r[b] - JOLD)));
  const KLSTEP = RL.kl(PI, PN);
  must(Math.abs(IS - JNEW) < 1e-12 && Math.abs(GAIN - (JNEW - JOLD)) < 1e-12, 'importance sampling is exact on the bandit');
  // the clip, eps = 0.2 (Schulman et al. 2017)
  const EPS = 0.2;
  const AP = 0.8;
  const AN = -0.8;
  const PTS_P = [0.5, 1.1, 1.6];
  const PTS_N = [0.5, 0.9, 1.6];
  must(RL.ppoClipSlope(1.6, AP) === 0 && RL.ppoClipSlope(0.5, AP) === AP && RL.ppoClipSlope(0.5, AN) === 0 && RL.ppoClipSlope(1.6, AN) === AN, 'clip slopes');
  PTS_P.concat(PTS_N).forEach((r) => must(RL.ppoClip(r, AP) <= r * AP + 1e-12 && RL.ppoClip(r, AN) <= r * AN + 1e-12, 'the clip is a lower bound'));

  // symbols this chapter adds (colours come from their role)
  FILM.addSymbol('c6L', 'reward', 'L', 'the surrogate objective', 'importance sampling of the advantage, from the old batch', 'its slope at the start is the policy gradient, and we can keep climbing it on the same samples');
  FILM.addSymbol('c6tr', 'knob', '\\delta', 'the trust-region size', 'a small number we choose', 'it caps how far, on average, one update may move the policy; not the TD error δ of chapter 5');

  /* =========================================================== CHAPTER 6 */
  video.chapter('ch6', 'Small steps: PPO');
  card(6, 'Small steps: trust regions and PPO');

  /*
   * Why a big step is dangerous: an unlucky batch, trusted too far, collapses
   * the bandit's policy; and samples describe only the policy that drew them.
   */
  video.scene('steps', 'How far to step', (S) => {
    const h = S.add(S.title('How far should we step?'));
    const POL = S.color('pt');
    const BX = -430;
    const BY = 200;
    const bars = S.add(S.bars({ labels: BAND.labels, values: PI, color: POL, h: 340, w: 130, gap: 80, labelFont: 'serif', labelSize: 40 }).at(BX, BY));
    const bt = S.add(S.txt('the model’s probabilities', { size: 34, color: C.GREY_B }).at(BX, -260));
    const toy = S.add(S.toy(BX, -320));
    const RXc = 420;
    const bh = S.add(S.txt('a batch of four samples', { size: 34, color: C.GREY_B }).at(RXc, -260));
    const items = BATCH.map((a, i) => S.add(S.group(
      new Text(BAND.labels[a], { size: 40, anchor: 'end' }).at(-40, 0),
      new Text(`r = ${BAND.r[a]}`, { size: 36, color: S.color('rr'), font: 'mono', anchor: 'start' }).at(0, 0)
    ).at(RXc - 40, -170 + i * 75)));
    const no = S.add(S.english(`no 51 in four samples: (1 − ${PI[0].toFixed(2)})⁴ ≈ ${NO51.toFixed(2)}`, { size: 34, color: C.GREY_B }).at(RXc, 160));
    S.beat('How far should we step along our direction? Back to the three answers. Here is an unlucky batch: four samples, none of them fifty-one. About seven batches in a hundred look like this.',
      A.FadeIn(h), par(A.FadeIn(bars, { dy: 20 }), A.FadeIn(bt), A.FadeIn(toy)), A.FadeIn(bh), lag(0.3, items.map((m) => A.FadeIn(m, { dx: 20 }))), S.writeIn(no, 1.4),
      { cap: 'How far should we step along our direction? Back to the three answers. Here is an unlucky batch: four samples, none of them 51. About 7 batches in 100 look like this.' });

    // 2. its estimate, and a small step
    const advs = BADV.map((v, i) => S.add(S.txt(`A = ${sgn(v, 1)}`, { size: 36, color: S.color('AA'), font: 'mono', anchor: 'start' }).at(RXc + 170, -170 + i * 75)));
    const Jl = S.add(S.txt('average reward', { size: 34, color: C.GREY_B, anchor: 'end' }).at(RXc + 40, 250));
    const Jv = S.add(S.txt(JOLD.toFixed(2), { size: 46, color: S.color('JJ'), font: 'mono', anchor: 'start' }).at(RXc + 70, 250));
    S.beat('With chapter four’s leave-one-out baseline, it says: more about fifty, less forty-one. A small step barely moves the model, and the next batch will likely set things right.',
      A.FadeOut(no), lag(0.25, advs.map((m) => A.FadeIn(m, { dx: -10 }))), par(A.FadeIn(Jl), A.FadeIn(Jv)), bars.to(P_SMALL, 1.4), A.Count(Jv, JOLD, J_SMALL, (v) => v.toFixed(2), 0.6),
      { cap: 'With chapter 4’s leave-one-out baseline, it says: more ‘about 50’, less 41. A small step barely moves the model, and the next batch will likely set things right.' });

    // 3. a big step on the same batch
    const nb = S.add(S.english(`now a batch has no 51 with chance ${NO51_BIG.toFixed(2)}`, { size: 34, color: C.GREY_B }).at(RXc, 160));
    S.beat(`Now trust this batch completely, with a step forty times larger. The model becomes ${sayInt(Math.round(P_BIG[1] * 100))} percent sure of about fifty; its average reward falls to ${sayN(J_BIG)}. And nine batches in ten now hold no fifty-one.`,
      bars.to(P_BIG, 1.8), A.Count(Jv, J_SMALL, J_BIG, (v) => v.toFixed(2), 1.2), A.Indicate(Jv, { color: C.RED, scale: 1.2 }), S.writeIn(nb, 1.2),
      { cap: `Now trust this batch completely, with a step 40 times larger. The model becomes ${Math.round(P_BIG[1] * 100)}% sure of ‘about 50’; its average reward falls to ${J_BIG.toFixed(2)}. And nine batches in ten now hold no 51.` });

    // 4. the lesson, and the wish to reuse samples
    const e4 = S.add(S.english('a gradient estimate is only good near the {policy that drew the samples|pold}', { size: 40, width: 1500 }).at(0, -40));
    const e4b = S.add(S.english('and sampling is slow: we want several updates from each batch', { size: 40, width: 1500 }).at(0, 60));
    const e4c = S.add(S.english('needed: a {correction|rat} for old samples, and a {limit|leash} on each step', { size: 40, width: 1500 }).at(0, 180));
    S.beat('So an estimate is only good near the policy that drew the samples. And sampling is slow, so we want several updates per batch. We need a correction for old samples, and a limit on each step.',
      fade(bars, bt, toy, bh, items, advs, Jl, Jv, nb), S.writeIn(e4, 1.8), S.writeIn(e4b, 1.6), S.writeIn(e4c, 1.6));
  });

  /*
   * Importance sampling derived; the ratio; the surrogate objective and its
   * gradient at the old policy; KL and TRPO's trust region.
   */
  video.scene('ratio', 'Importance ratios', (S) => {
    const h = S.add(S.title('Importance sampling'));
    const POL = S.color('pt');
    const OLD = S.color('pold');

    // 2. the definition
    const L1 = S.add(S.tex('\\EE_{\\yy \\sim \\pt}\\big[\\, f(\\yy) \\,\\big] \\;=\\; \\sum_{\\yy} \\pt(\\yy)\\; f(\\yy)', { size: 84 }).at(0, -60));
    const e1 = S.add(S.english('the batch came from the {old policy|pold}; we want averages under the {new one|pt}', { size: 40, width: 1500 }).at(0, -260));
    const r2 = S.add(S.reason('because: an average under a policy is a sum: each answer’s value f, weighted by its {probability|pt}'));
    S.beat('Now the correction. The batch came from the old policy; we want averages under the new one. By definition, an average under the new policy weights each answer’s value, f, by its new probability.',
      A.FadeIn(h), S.writeIn(e1, 1.8), A.Write(L1, 1.8), S.writeIn(r2, 1.4));

    // 3. multiply and divide by the old probability
    const L2 = S.add(S.tex('\\EE_{\\yy \\sim \\pt}\\big[\\, f(\\yy) \\,\\big] \\;=\\; \\sum_{\\yy} \\pold(\\yy)\\; \\frac{\\pt(\\yy)}{\\pold(\\yy)}\\; f(\\yy)', { size: 84 }).at(0, -60));
    const r3 = S.add(S.reason('because: multiplying and dividing by the {old probability|pold} is multiplying by one (it must not be zero where the {new one|pt} is not)'));
    S.beat('Now chapter three’s trick in a new place: multiply and divide by the old probability. That is multiplying by one, as long as the old policy could produce every answer the new one can.',
      par(A.FadeOut(r2), A.FadeOut(e1), UP(L1)), A.Write(L2, 2), A.Spot(L2, 'pold'), S.writeIn(r3, 1.6));

    // 4. a sum weighted by the old policy is an average over old samples
    const L3 = S.add(S.tex('\\EE_{\\yy \\sim \\pt}\\big[\\, f(\\yy) \\,\\big] \\;=\\; \\EE_{\\yy \\sim \\pold}\\big[\\, \\rat(\\yy)\\; f(\\yy) \\,\\big], \\qquad \\rat(\\yy) \\;=\\; \\frac{\\pt(\\yy)}{\\pold(\\yy)}', { size: 72 }).at(0, 120));
    const r4 = S.add(S.reason('because: a sum weighted by {old probabilities|pold} is an average over samples from the {old policy|pold}'));
    S.beat('Now the sum is weighted by old probabilities, so it is an average over old samples, each multiplied by one correction: new probability over old. This is importance sampling; the correction is rho.',
      par(A.Unspot(L2), A.FadeOut(r3)), A.Write(L3, 2.2), S.writeIn(r4, 1.6));

    // 5. symbol tour: the ratio, and the old policy
    const cR = S.add(S.symcard('rat', { w: 1300, why: '1: the policies agree on this answer; above 1 the new policy likes it more, so the old sample counts more' }).at(0, -140));
    S.beat('Rho, the probability ratio. One means the two policies agree on this answer. Above one, the new policy likes it more, so the old sample counts more. Below one, less.',
      par(A.FadeOut(r4), A.FadeOut(L1), A.FadeOut(L2)), A.Spot(L3, 'rat'), A.FadeIn(cR, { dy: 16 }),
      { cap: 'ρ, the probability ratio. 1 means the two policies agree on this answer. Above 1, the new policy likes it more, so the old sample counts more. Below 1, less.' });
    const cO = S.add(S.symcard('pold', { w: 1300, why: 'the samples came from it; its probabilities are recorded when they are drawn' }).at(0, -140));
    S.beat('And pi old is a frozen copy, the policy that drew the batch. It does not train; its probabilities are recorded when the samples are drawn.',
      A.Spot(L3, 'pold'), A.FadeOut(cR, { dur: 0.4 }), A.FadeIn(cO, { dy: 16 }),
      { cap: 'And π_old is a frozen copy, the policy that drew the batch. It does not train; its probabilities are recorded when the samples are drawn.' });

    // 6. numbers on the bandit
    const COLS = [-560, -260, 0, 260, 520];
    const HY = -260;
    const hd = [S.add(S.txt('answer', { size: 34, color: C.GREY_B }).at(COLS[0], HY))];
    const hdT = ['\\pold', '\\pt', '\\rat = \\pt / \\pold', '\\rr'].map((t, i) => S.add(S.tex(t, { size: 46 }).at(COLS[i + 1], HY)));
    const rows = BAND.labels.map((l, a) => S.add(S.group(
      new Text(l, { size: 40 }).at(COLS[0], 0),
      new Text(PI[a].toFixed(2), { size: 40, font: 'mono', color: OLD }).at(COLS[1], 0),
      new Text(PN[a].toFixed(2), { size: 40, font: 'mono', color: POL }).at(COLS[2], 0),
      new Text(RHO[a].toFixed(2), { size: 40, font: 'mono', color: S.color('rat') }).at(COLS[3], 0),
      new Text(String(BAND.r[a]), { size: 40, font: 'mono', color: S.color('rr') }).at(COLS[4], 0)
    ).at(0, -180 + a * 75)));
    const sumT = BAND.labels.map((_, a) => `\\cFrozen{np}{${PI[a].toFixed(2)}} \\cdot \\cRatio{nr}{${RHO[a].toFixed(2)}} \\cdot \\cReward{nw}{${BAND.r[a]}}`).join(' + ');
    const sumL = S.add(S.tex(`${sumT} \\;=\\; \\cReward{nJ}{${IS.toFixed(2)}} \\;=\\; \\sum_{\\yy} \\pt(\\yy)\\, \\rr(\\yy)`, { size: 50 }).at(0, 140));
    const toy6 = S.add(S.toy(760, HY));
    const r6 = S.add(S.reason('after one small step: old samples, re-weighted by {ρ|rat}, give exactly the {new average reward|JJ}'));
    S.beat(`On our bandit, one small step took fifty-one from ${sayN(PI[0])} to ${sayN(PN[0])}: a ratio of ${sayN(RHO[0])}. Re-weighted this way, the old samples give exactly the new average reward, ${sayN(IS)}.`,
      par(A.Unspot(L3), A.FadeOut(cO), A.FadeOut(L3)), par(hd.map((m) => A.FadeIn(m)), hdT.map((m) => A.FadeIn(m)), A.FadeIn(toy6)), lag(0.3, rows.map((r) => A.FadeIn(r, { dx: 20 }))), A.Write(sumL, 2.2), S.writeIn(r6, 1.4),
      { cap: `On our bandit, one small step took 51 from ${PI[0].toFixed(2)} to ${PN[0].toFixed(2)}: a ratio of ${RHO[0].toFixed(2)}. Re-weighted this way, the old samples give exactly the new average reward, ${IS.toFixed(2)}.` });

    // 7. the surrogate objective
    const L4 = S.add(S.tex('\\cReward{c6L}{L}(\\th) \\;=\\; \\EE_{\\pold}\\big[\\, \\rat_t(\\th)\\; \\AA_t \\,\\big]', { size: 92 }).at(0, -60));
    const e7 = S.add(S.english('{L|c6L}: the average {advantage|AA} the {new policy|pt} would get, judged from {old samples|pold}', { size: 40, width: 1500 }).at(0, 110));
    const e7b = S.add(S.english(`on the bandit, with {A = r − old average|AA}: {L|c6L} = ${JNEW.toFixed(2)} − ${JOLD.toFixed(2)} = ${GAIN.toFixed(2)}, exactly the gain`, { size: 36, color: C.GREY_B }).at(0, 210));
    S.beat(`Now average the advantage, measured on the old batch. That is the surrogate objective, L: how much better the new policy would do, judged from old samples. On the bandit it is exactly the gain, ${sayN(GAIN)}.`,
      fade(hd, hdT, rows, sumL, r6, toy6), A.Write(L4, 1.6), A.Spot(L4, 'c6L'), wait(0.8), A.Unspot(L4), S.writeIn(e7, 2), S.writeIn(e7b, 1.6),
      { cap: `Now average the advantage, measured on the old batch. That is the surrogate objective, L: how much better the new policy would do, judged from old samples. On the bandit it is exactly the gain, ${GAIN.toFixed(2)}.` });

    // 8. its gradient: grad rho = rho grad log pi
    const L5 = S.add(S.tex('\\grad \\rat_t \\;=\\; \\frac{\\grad \\pt(\\yy_t \\mid \\ss_t)}{\\pold(\\yy_t \\mid \\ss_t)} \\;=\\; \\rat_t\\; \\grad \\lp(\\yy_t \\mid \\ss_t)', { size: 76 }).at(0, -60));
    const r8 = S.add(S.reason('because: the {old policy|pold} is frozen, so only the top moves; and ∇π = π ∇log π, the chain rule of chapter 3'));
    S.beat('Its slope? Pi old is frozen, so only the top of the ratio moves, and the gradient of pi is pi times the gradient of log pi. So the gradient of rho is rho times the gradient of log pi.',
      par(A.Unspot(L4), A.FadeOut(e7), A.FadeOut(e7b), UP(L4)), A.Write(L5, 2), S.writeIn(r8, 1.6));

    // 9. at the start of the update it is the policy gradient
    const L6 = S.add(S.tex('\\grad \\cReward{c6L}{L}\\,\\Big|_{\\th = \\th_{\\mathrm{old}}} \\;=\\; \\EE_{\\pold}\\big[\\, \\AA_t\\; \\grad \\lp(\\yy_t \\mid \\ss_t) \\,\\big]', { size: 76 }).at(0, 120));
    const r9 = S.add(S.reason('because: at the start the two policies are the same, so every {ratio|rat} is 1'));
    S.beat('At the start of an update every ratio is one, so the slope of L is exactly the policy gradient with advantages. The difference: we can keep climbing L on the same batch.',
      A.FadeOut(r8), A.Write(L6, 2), A.Spot(L6, ['AA', 'grad', 'lp']), S.writeIn(r9, 1.4), A.Unspot(L6));

    // 10. but nothing in L says stop
    const AXc = 120;
    const AYc = 60;
    // the band goes behind the axes and the line (ρ from 0 to 3 over 900 px)
    const band = S.add(S.rect((0.4 / 3) * 900, 380, { stroke: 'none', width: 0, fill: mix(C.BG, C.GREY_B, 0.2), rx: 0 }).at(AXc + (1 / 3) * 900 - 450, AYc));
    const ax = S.add(S.axes({ x0: 0, x1: 3, y0: 0, y1: 2.4, w: 900, h: 380, xticks: [0, 1, 2, 3], yticks: [0, 1, 2], xlabel: 'ratio ρ', ylabel: 'ρ × A,  with A = +0.8', size: 30 }).at(AXc, AYc));
    const ln = ax.plot((r) => r * AP, { color: S.color('AA'), width: 7 });
    const go = S.add(S.arrow(AXc + ax.fx(2.2), AYc + ax.fy(2.2 * AP) - 40, AXc + ax.fx(2.85), AYc + ax.fy(2.85 * AP) - 40, { color: S.color('grad'), width: 6 }));
    const bandL = S.add(S.txt('← near ρ = 1: old samples trustworthy', { size: 30, color: C.GREY_B, italic: true, anchor: 'start' }).at(AXc + ax.fx(1.2) + 14, AYc + 95));
    S.beat('But nothing in L says stop. For a good token, rho times A keeps growing with rho, so the optimizer makes it as likely as it can, far beyond where old samples can be trusted.',
      fade(L4, L5, L6, r9), A.FadeIn(ax), A.FadeIn(band), A.FadeIn(bandL), A.Create(ln, 1.4), A.Arrow(go, 0.8));

    // 11. a distance between policies: KL
    const K1 = S.add(S.tex('\\KL\\big(\\pold \\,\\|\\, \\pt\\big) \\;=\\; \\sum_{\\yy} \\pold(\\yy)\\, \\log \\frac{\\pold(\\yy)}{\\pt(\\yy)}', { size: 80 }).at(0, -90));
    const cK = S.add(S.symcard('KL', { w: 1300, from: 'the average, under the old policy, of the log of old over new probability', why: 'zero when the two policies agree, larger the more they differ' }).at(0, 160));
    const kv = S.add(S.english(`our small step: {KL|KL} = ${KLSTEP.toFixed(3)}`, { size: 36, color: C.GREY_B }).at(0, 318));
    S.beat(`To limit a step, we need a distance between policies. The K L divergence averages, under the old policy, the log of old over new probability. Zero when they agree; our small step: ${sayN(KLSTEP, 3)}.`,
      fade(ax, band, bandL, go), A.Write(K1, 2), A.Spot(K1, 'KL'), A.FadeIn(cK, { dy: 16 }), A.FadeIn(kv),
      { cap: `To limit a step, we need a distance between policies. The KL divergence averages, under the old policy, the log of old over new probability. Zero when they agree; our small step: ${KLSTEP.toFixed(3)}.` });

    // 12. TRPO: climb the surrogate inside a trust region
    const TR = S.add(S.tex('\\max_{\\th}\\; \\EE\\big[\\rat_t \\AA_t\\big] \\quad \\text{subject to} \\quad \\EE_{\\ss}\\Big[\\KL\\big(\\pold(\\cdot \\mid \\ss) \\,\\|\\, \\pt(\\cdot \\mid \\ss)\\big)\\Big] \\;\\le\\; \\cKnob{c6tr}{\\delta}', { size: 62 }).at(0, -60));
    const cT = S.add(S.symcard('c6tr', { w: 1300 }).at(0, 150));
    S.paper('schulman2015trpo');
    S.beat('Trust region policy optimization, T R P O, climbs the surrogate only where the average K L stays below a small number, delta: a size we choose, not chapter five’s surprise.',
      par(A.Unspot(K1), A.FadeOut(cK), A.FadeOut(kv), UP(K1)), A.Write(TR, 2.4), A.Spot(TR, 'c6tr'), A.FadeIn(cT, { dy: 16 }),
      { cap: 'Trust region policy optimization (TRPO) climbs the surrogate only where the average KL stays below a small number, δ: a size we choose, not chapter 5’s TD error.' });
  });

  /*
   * PPO's clipped objective: definition, the two cases by the sign of A,
   * the pessimistic bound, and what it does to the gradient.
   */
  video.scene('clip', 'The clip', (S) => {
    const h = S.add(S.title('Proximal policy optimization'));
    const GRN = S.color('AA');

    // 1. why: TRPO is heavy
    const TR = S.add(S.tex('\\max_{\\th}\\; \\EE\\big[\\rat_t \\AA_t\\big] \\quad \\text{subject to} \\quad \\EE\\big[\\KL(\\pold \\,\\|\\, \\pt)\\big] \\le \\cKnob{c6tr}{\\delta}', { size: 56 }).at(0, -300));
    const e1 = S.add(S.english('enforcing it takes a quadratic model of the {KL|KL}, conjugate gradient and a line search: heavy for billions of {weights|th}', { size: 38, width: 1500, color: C.GREY_B }).at(0, -150));
    const e1b = S.add(S.english('PPO: ordinary gradient steps, but no reason to push a {ratio|rat} far from 1', { size: 44, width: 1500 }).at(0, 20));
    S.beat('T R P O enforces that limit with second-order machinery: a quadratic model of the K L, conjugate gradient, a line search. Heavy, for billions of weights. Can plain gradient steps do the job?',
      A.FadeIn(h), A.FadeIn(TR), S.writeIn(e1, 2.2), S.writeIn(e1b, 1.8));

    // 2. the clip function
    const CX = 280;
    const CYc = 130;
    const cax = S.add(S.axes({ x0: 0, x1: 2, y0: 0, y1: 2, w: 560, h: 280, xticks: [0, 0.8, 1.2, 2], yticks: [0.8, 1.2], xfmt: (v) => String(v), yfmt: (v) => String(v), xlabel: 'ρ', size: 30 }).at(CX, CYc));
    const idl = cax.plot((r) => r, { color: C.GREY, width: 4, dash: '10 10' });
    const cl = cax.plot((r) => RL.clip(r, 1 - EPS, 1 + EPS), { color: S.color('rat'), width: 7, samples: 200 });
    const CF = S.add(S.tex('\\operatorname{clip}(\\rat,\\, 1-\\eps,\\, 1+\\eps)', { size: 70 }).at(0, -150));
    const cE = S.add(S.symcard('eps', { w: 700, from: 'a number we choose; the PPO paper suggests 0.2', why: 'it sets the band: 0.8 to 1.2' }).at(-520, 130));
    S.paper('schulman2017ppo');
    S.beat('P P O’s tool is the clip: hold the ratio in a band around one, from one minus epsilon to one plus epsilon. The paper suggests epsilon zero point two: from zero point eight to one point two.',
      fade(TR, e1, e1b), A.Write(CF, 1.6), A.FadeIn(cax), A.Create(idl, 0.8), A.Create(cl, 1.4), A.Spot(CF, 'eps'), A.FadeIn(cE, { dy: 16 }),
      { cap: 'PPO’s tool is the clip: hold the ratio in a band around one, from 1 − ε to 1 + ε. The paper suggests ε = 0.2: from 0.8 to 1.2.' });

    // 3. the clipped objective, read in English
    const LC = S.add(S.tex('\\cReward{c6L}{L^{\\text{CLIP}}} \\;=\\; \\EE\\Big[\\min\\big(\\class{s-c6p}{\\rat_t\\, \\AA_t},\\;\\; \\class{s-c6c}{\\operatorname{clip}(\\rat_t,\\, 1-\\eps,\\, 1+\\eps)\\, \\AA_t}\\big)\\Big]', { size: 66 }).at(0, -60));
    const e3 = S.add(S.english('for each token: the smaller of {ratio × advantage|rat} and the same with the {ratio held in the band|eps}', { size: 40, width: 1500 }).at(0, 130));
    const say3 = 'For each token, take the smaller of two numbers: the plain ratio times advantage, and the clipped ratio times advantage. Averaged over tokens, that is L clip. Why the smaller? It depends on the sign of A.';
    S.beat(say3,
      par(fade(cax, idl, cl, cE), A.Unspot(CF), A.FadeOut(CF)), A.Write(LC, 2.2), wait(0.3), A.Spot(LC, 'c6p', { dur: 0.5 }), wait(1.2), A.Spot(LC, 'c6c', { dur: 0.5 }), wait(1.2), A.Unspot(LC), S.writeIn(e3, 2));

    // the two plots: A > 0 on the left, A < 0 on the right
    const PY = 95;
    const mk = (x, A0, col, pts, offs) => {
      const band = S.add(S.rect(128, 320, { stroke: 'none', width: 0, fill: mix(C.BG, C.GREY_B, 0.12), rx: 0 }).at(x, PY));
      const ax = S.add(S.axes({ x0: 0, x1: 2, y0: -1.6, y1: 1.6, w: 640, h: 320, xticks: [0, 0.8, 1.2, 2], yticks: [-1, 0, 1], xfmt: (v) => String(v), size: 30, xlabel: 'ratio ρ' }).at(x, PY));
      const zero = S.add(S.line(x + ax.fx(0), PY + ax.fy(0), x + ax.fx(2), PY + ax.fy(0), { stroke: C.GREY_D, width: 4 }));
      const ghost = ax.plot((r) => r * A0, { color: C.GREY_B, width: 4, dash: '12 10' });
      const cur = ax.plot((r) => RL.ppoClip(r, A0, EPS), { color: col, width: 7, samples: 200 });
      const dots = pts.map((r) => S.add(S.dot(9, C.WHITE).at(x + ax.fx(r), PY + ax.fy(RL.ppoClip(r, A0, EPS)))));
      // labels sit on the side away from the dashed line
      const vals = pts.map((r, i) => {
        const v = RL.ppoClip(r, A0, EPS);
        return S.add(S.txt(v.toFixed(2).replace('-', '−'), { size: 30, color: C.WHITE, font: 'mono' }).at(x + ax.fx(r), PY + ax.fy(v) + offs[i]));
      });
      return { ax, band, zero, ghost, cur, dots, vals, x };
    };
    const P = mk(-460, AP, GRN, PTS_P, [-34, -34, 34]);
    const N = mk(460, AN, C.RED, PTS_N, [34, 34, -34]);
    const showPlot = (q) => seq(par(A.FadeIn(q.ax), A.FadeIn(q.band), A.FadeIn(q.zero)), A.Create(q.ghost, 0.8), A.Create(q.cur, 1.4), lag(0.3, q.dots.map((d, i) => par(A.FadeIn(d), A.FadeIn(q.vals[i])))));

    // 4. A > 0: a positive factor keeps the order
    const slP = S.add(S.english(`slope: {${RL.ppoClipSlope(0.5, AP)}|AA} at ρ = 0.5,  {${RL.ppoClipSlope(1.1, AP)}|AA} at 1.1,  {${RL.ppoClipSlope(1.6, AP)}|AA} at 1.6`, { size: 32, color: C.GREY_B }).at(-460, 330));
    const CP = S.add(S.tex('\\AA > 0: \\;\\; \\min\\big(\\rat\\AA,\\, \\operatorname{clip}(\\rat)\\AA\\big) = \\AA\\, \\min\\big(\\rat,\\, 1+\\eps\\big)', { size: 40 }).at(-460, -215));
    const sP = S.add(side(S, 'because: a positive {A|AA} keeps the order, so the smaller {ratio|rat} wins; the clipped one is smaller only past 1 + ε', -460, -145, 820));
    S.beat(`A good token, advantage plus zero point eight. A positive factor keeps the order, so the minimum takes the smaller ratio: rho, until rho passes one point two. Then it is flat: no more push. Below the band, it still pulls back.`,
      par(A.FadeOut(e3), A.MoveTo(LC, 0, -335), A.ScaleTo(LC, 0.7)), A.Write(CP, 1.8), S.writeIn(sP, 1.4), showPlot(P), S.writeIn(slP, 1.2),
      { cap: `A good token, advantage +0.8. A positive factor keeps the order, so the minimum takes the smaller ratio: ρ, until ρ passes 1.2. Then it is flat: no more push. Below the band, it still pulls back.` });

    // 6. A < 0: a negative factor flips the order
    const CN = S.add(S.tex('\\AA < 0: \\;\\; \\min\\big(\\rat\\AA,\\, \\operatorname{clip}(\\rat)\\AA\\big) = \\AA\\, \\max\\big(\\rat,\\, 1-\\eps\\big)', { size: 40 }).at(460, -215));
    const sN = S.add(side(S, 'because: a negative {A|AA} flips the order, so the larger {ratio|rat} wins; the clipped one is larger only below 1 − ε', 460, -145, 820));
    const slN = S.add(S.english(`slope: {${RL.ppoClipSlope(0.5, AN)}|#FC6255} at ρ = 0.5,  {${sgn(RL.ppoClipSlope(0.9, AN), 1)}|#FC6255} at 0.9,  {${sgn(RL.ppoClipSlope(1.6, AN), 1)}|#FC6255} at 1.6`, { size: 32, color: C.GREY_B }).at(460, 330));
    S.beat(`A bad token, advantage minus zero point eight, flips the order: the minimum takes the larger ratio. Below zero point eight it is flat; above, the full penalty stays: ${sayN(RL.ppoClip(1.6, AN))} at one point six.`,
      A.Write(CN, 1.8), S.writeIn(sN, 1.4), showPlot(N), S.writeIn(slN, 1.2),
      { cap: `A bad token, advantage −0.8, flips the order: the minimum takes the larger ratio. Below 0.8 it is flat; above, the full penalty stays: ${RL.ppoClip(1.6, AN).toFixed(2).replace('-', '−')} at 1.6.` });

    // 7. a pessimistic bound
    const gapP = S.add(S.line(P.x + P.ax.fx(1.6), PY + P.ax.fy(1.6 * AP), P.x + P.ax.fx(1.6), PY + P.ax.fy(RL.ppoClip(1.6, AP)), { stroke: C.YELLOW, width: 5, dash: '8 8' }));
    const gapN = S.add(S.line(N.x + N.ax.fx(0.5), PY + N.ax.fy(0.5 * AN), N.x + N.ax.fx(0.5), PY + N.ax.fy(RL.ppoClip(0.5, AN)), { stroke: C.YELLOW, width: 5, dash: '8 8' }));
    const LB = S.add(S.tex('\\min(x,\\, y) \\le x \\quad\\Longrightarrow\\quad \\cReward{c6L}{L^{\\text{CLIP}}} \\;\\le\\; \\cReward{c6L}{L}', { size: 56 }).at(0, -225));
    const sB = S.add(side(S, 'equal inside the band: at ρ = 1 the values and the slopes agree', 0, -150, 1500));
    S.beat('The solid curves never lie above the dashed ones: the smaller of two numbers is at most either. Inside the band they agree, so the first step is the plain policy gradient. L clip is a pessimistic bound.',
      fade(CP, sP, CN, sN, slP, slN), A.Write(LB, 1.6), S.writeIn(sB, 1.6), par(A.Create(gapP, 0.6), A.Create(gapN, 0.6)), par(A.Indicate(gapP, { color: C.WHITE }), A.Indicate(gapN, { color: C.WHITE })));

    // 8. what the clip buys
    const GX = [-420, 0, 420];
    const heads = ['ρ < 1 − ε', 'inside the band', 'ρ > 1 + ε'].map((t, i) => S.add(S.txt(t, { size: 36, color: S.color('rat') }).at(130 + GX[i] * 1.2, -170)));
    const rowsL = [['good token, A > 0', GRN], ['bad token, A < 0', C.RED]].map(([t, c], j) => S.add(S.txt(t, { size: 36, color: c, anchor: 'end' }).at(-540, -80 + j * 100)));
    const cells = [['pushed back up', 'pushed up', 'no push'], ['no push', 'pushed down', 'pushed back down']].map((rw, j) => rw.map((t, i) => S.add(S.txt(t, { size: 36, color: t === 'no push' ? C.GREY : C.WHITE }).at(130 + GX[i] * 1.2, -80 + j * 100))));
    const e8 = S.add(S.english('push only so far where we want to go; always undo a mistake', { size: 42 }).at(0, 140));
    const e8b = S.add(S.english('next: every ratio and advantage at once, as a landscape', { size: 34, color: C.GREY_B }).at(0, 240));
    S.beat('So the clip removes any reason to push a ratio out of the band, but never the reason to come back. Push only so far; always undo a mistake. Next, the whole picture as a landscape.',
      fade(P.ax, P.band, P.zero, P.ghost, P.cur, P.dots, P.vals, N.ax, N.band, N.zero, N.ghost, N.cur, N.dots, N.vals, gapP, gapN, LB, sB),
      par(heads.map((m) => A.FadeIn(m))), lag(0.3, rowsL.map((m, j) => par(A.FadeIn(m), cells[j].map((c) => A.FadeIn(c))))), S.writeIn(e8, 1.6), S.writeIn(e8b, 1.2));
  });

  // the 3D landscape (film/landscapes.js, drawn with space3.js)
  if (FILM.landscapes && FILM.landscapes.clip) FILM.landscapes.clip(ctx);

  /*
   * PPO for language models, end to end: per-token ratios from
   * log-probabilities, the loop, per-token KL rewards, critic and GAE,
   * epochs of clipped minibatch updates.
   */
  video.scene('ppoloop', 'PPO for language models', (S) => {
    const h = S.add(S.title('PPO for language models'));

    // 1. per-token ratios, from log-probabilities
    const R1 = S.add(S.tex('\\rat_t(\\th) \\;=\\; \\frac{\\pt(\\yy_t \\mid \\ss_t)}{\\pold(\\yy_t \\mid \\ss_t)} \\;=\\; \\exp\\!\\big(\\lp(\\yy_t \\mid \\ss_t) \\;-\\; \\log \\pold(\\yy_t \\mid \\ss_t)\\big)', { size: 58 }).at(0, -60));
    const r1 = S.add(S.reason('because: a ratio of probabilities is e to the difference of their logs, and models output log-probabilities'));
    const e2 = S.add(S.english('caveat: one token’s {ratio|rat} ignores that earlier {tokens|yy}, and so the {states|ss}, would change too; fine while the {policy|pt} stays close, as the clip enforces', { size: 36, color: C.GREY_B, width: 1500 }).at(0, 140));
    S.beat('For a language model, each token is one choice, with its own ratio and advantage, computed from log-probabilities. A token’s ratio ignores how earlier tokens would change; that is fine while the policy stays close.',
      A.FadeIn(h), A.Write(R1, 2.4), S.writeIn(r1, 1.6), S.writeIn(e2, 2));

    // the loop: five boxes
    const BW = 520;
    const BH = 120;
    const spec = [
      ['sample', 'responses; keep old log-probs', C.TEAL, -580, -250],
      ['score', 'reward model R(x, y)', S.color('rr'), 0, -250],
      ['token rewards', 'R at the end, a KL price on each', S.color('bt'), 580, -250],
      ['advantages', 'critic, TD errors, GAE', S.color('AA'), 430, 0],
      ['update', 'a few epochs of clipped steps', S.color('grad'), -430, 0],
    ];
    const boxes = spec.map(([t, sub, col, x, y]) => S.add(S.box(t, { w: BW, h: BH, color: col, size: 38, sub }).at(x, y)));
    const arr = [
      [-320, -250, -260, -250], [260, -250, 320, -250], [560, -190, 560, -60], [170, 0, -170, 0], [-560, -60, -560, -190],
    ].map(([x1, y1, x2, y2]) => S.add(S.arrow(x1, y1, x2, y2, { color: C.GREY_B, width: 5 })));

    // 3. sample and score
    const e3 = S.add(S.english('freeze a copy as the {old policy|pold}, and record each {token|yy}’s log-probability', { size: 38, width: 1500 }).at(0, 200));
    S.beat('Now the whole loop. Sample responses from the current policy, freeze a copy as pi old, and record each token’s log-probability. The reward model, built in chapter seven, scores each response.',
      fade(R1, e2, r1), A.FadeIn(boxes[0], { dy: 20 }), S.writeIn(e3, 1.6), A.Arrow(arr[0], 0.5), A.FadeIn(boxes[1], { dy: 20 }),
      { cap: 'Now the whole loop. Sample responses from the current policy, freeze a copy as π_old, and record each token’s log-probability. The reward model, built in chapter 7, scores each response.' });

    // 4. per-token rewards with the KL price
    const KR = S.add(S.tex('\\rr_t \\;=\\; -\\,\\bt\\, \\log \\frac{\\pold(\\yy_t \\mid \\ss_t)}{\\pref(\\yy_t \\mid \\ss_t)} \\;+\\; \\begin{cases} \\RR(\\xx, \\yy) & \\text{last token} \\\\ 0 & \\text{otherwise} \\end{cases}', { size: 56 }).at(0, 215));
    S.beat('Each token gets its own reward, as in chapter five: the score on the last token, and on every token a small price, beta times the log-ratio to the reference model, the model before R L began. Chapter eight explains this leash.',
      A.FadeOut(e3), A.Arrow(arr[1], 0.5), A.FadeIn(boxes[2], { dy: 20 }), A.Write(KR, 2.4), A.Spot(KR, ['bt', 'pref', 'RR']), wait(2.5), A.Unspot(KR),
      { cap: 'Each token gets its own reward, as in chapter 5: the score on the last token, and on every token a small price, β times the log-ratio to the reference model, the model before RL began. Chapter 8 explains this leash.' });

    // 5. critic and GAE
    const GA = S.add(S.tex('\\Ahat_t \\;=\\; \\dd_t \\;+\\; \\gam\\, \\lam\\, \\Ahat_{t+1}, \\qquad \\text{critic target: } \\Ahat_t + \\VV(\\ss_t)', { size: 56 }).at(0, 200));
    const r5 = S.add(S.reason('because: the GAE sum, computed backwards from the last token in one pass'));
    S.beat('The critic values every token’s state, and G A E turns the surprises into advantages, computed backwards from the last token in one pass. The critic’s own target is advantage plus value.',
      A.FadeOut(KR), A.Arrow(arr[2], 0.5), A.FadeIn(boxes[3], { dy: 20 }), A.Write(GA, 2), S.writeIn(r5, 1.4));

    // 6. the update: epochs of clipped minibatch steps
    const UPF = S.add(S.tex('\\text{maximize} \\;\\; \\cReward{c6L}{L^{\\text{CLIP}}} \\;=\\; \\frac{1}{N} \\sum_{t} \\min\\big(\\rat_t \\Ahat_t,\\; \\operatorname{clip}(\\rat_t,\\, 1-\\eps,\\, 1+\\eps)\\, \\Ahat_t\\big)', { size: 52 }).at(0, 200));
    const e6 = S.add(S.english('at first every {ratio|rat} is 1; then they drift, and the clip holds them', { size: 36, color: C.GREY_B }).at(0, 300));
    S.beat('Then the update: shuffle tokens into minibatches and take gradient steps on L clip, for a few passes over the batch, while the critic fits its targets. Ratios start at one, drift, and the clip holds them.',
      par(A.FadeOut(GA), A.FadeOut(r5)), A.Arrow(arr[3], 0.5), A.FadeIn(boxes[4], { dy: 20 }), A.Write(UPF, 2.2), S.writeIn(e6, 1.4));

    // 7. repeat; count the networks
    const e7 = S.add(S.english('four large networks: the {policy|pt} and the {critic|VV} train; the {reference|pref} and the {reward model|rr} stay frozen', { size: 38, width: 1500 }).at(0, 200));
    const e7b = S.add(S.english('next: where does the {reward model|rr} come from?', { size: 36, color: C.GREY_B }).at(0, 300));
    S.beat('Then the new policy becomes the old one, and the loop repeats. Four large networks: the policy and critic train, the reference and reward models stay frozen. And where does the reward model come from?',
      fade(UPF, e6), A.Arrow(arr[4], 0.6), lag(0.15, boxes.map((b) => A.Indicate(b, { scale: 1.04, color: C.WHITE }))), S.writeIn(e7, 2), S.writeIn(e7b, 1.2));
  });
});
