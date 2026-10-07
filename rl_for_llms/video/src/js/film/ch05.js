// Chapter 5 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch05(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

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
    S.paper('schulman2016gae');
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
    S.paper('lightman2023');
    S.beat('Another route to finer credit is to have the judge grade each step, not just the final answer. In Let\u2019s Verify Step by Step, Open A I collected eight hundred thousand step-level labels, and a process reward model picked correct solutions more often than one that judged outcomes alone.',
      A.FadeOut(cost), A.FadeOut(l2), A.FadeIn(prm, { dy: -20 }),
      { cap: 'Another route to finer credit: have the judge grade each step. In Let\u2019s Verify Step by Step, OpenAI collected 800K step-level labels; a process reward model picked correct solutions more often than an outcome model (78.2% vs 72.4%, best-of-1860, on a MATH subset).' });
  });
});
