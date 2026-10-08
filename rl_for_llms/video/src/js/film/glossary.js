/*
 * The film's notation, as data. Every symbol has one colour (by its role),
 * a plain-English name, where it comes from, and why it is there.
 *
 * Each symbol becomes a TeX macro named by its id (\pt, \rr, \grad, ...; ids
 * never reuse a TeX command name, so π is \pp, ρ is \rat, η is \lr). A formula written
 * with the macros is coloured and tagged automatically: every π_θ in the film
 * is the same blue, and a scene can spotlight a symbol (A.Spot) or show its
 * card (S.symcard) by id. index.html passes FILM.macros to MathJax.
 *
 * Roles and colours (3b1b palette):
 *   policy     BLUE    what the model does: the probabilities π
 *   params     TEAL    what training changes: weights θ, logits z
 *   grad       YELLOW  directions: the gradient ∇ and its estimates
 *   reward     GOLD    what the judge says: r, R, returns G, the objective J
 *   baseline   PURPLE  what we expected: baselines b, values V, group means
 *   advantage  GREEN   better or worse than expected: A, δ
 *   frozen     GREY_B  copies that do not train: π_ref, π_old
 *   leash      ORANGE  staying close: β, KL, the normaliser Z
 *   ratio      MAROON  new over old: ρ
 *   knob       PINK    numbers we choose: ε, γ, λ, η, k, G
 *   data       WHITE   what is being scored: prompts, answers, tokens
 *   op         WHITE   operators: expectation, sigmoid
 */
window.FILM = window.FILM || { parts: [], papers: {} };
(function () {
  const ROLE = {
    policy: '#58C4DD', params: '#5CD0B3', grad: '#F7D96F', reward: '#F0AC5F', baseline: '#A881C9', advantage: '#83C167',
    frozen: '#BBBBBB', leash: '#FF862F', ratio: '#C55F73', knob: '#D147BD', data: '#ECECEC', op: '#ECECEC',
  };
  const ROLE_NAME = {
    policy: 'the policy', params: 'the weights', grad: 'gradients', reward: 'reward', baseline: 'expectations',
    advantage: 'advantage', frozen: 'frozen copies', leash: 'the leash', ratio: 'ratios', knob: 'knobs we set', data: 'data', op: 'operators',
  };
  // id: [role, tex, name, from, why]
  const S = {
    // the policy
    pt: ['policy', '\\pi_\\theta', 'the policy', 'the softmax at the end of the network', 'we sample answers from it, and training reshapes it'],
    pp: ['policy', '\\pi', 'a policy', 'any assignment of probabilities to answers', 'the thing we are choosing'],
    lp: ['policy', '\\log \\pi_\\theta', 'the log-probability', 'the logarithm of the policy’s probability', 'it turns products into sums, and ratios into differences'],
    pstar: ['policy', '\\pi^{*}', 'the best policy', 'solving the objective exactly', 'it tells us where training is heading'],
    // the parameters
    th: ['params', '\\theta', 'the weights', 'every adjustable number inside the network', 'the only thing training is allowed to change'],
    zz: ['params', 'z', 'a logit', 'the network’s raw score for one token', 'softmax turns logits into probabilities'],
    // gradients
    grad: ['grad', '\\nabla_{\\!\\theta}', 'the gradient', 'derivatives with respect to every weight', 'it points in the direction that increases a quantity fastest'],
    ghat: ['grad', '\\hat g', 'the gradient estimate', 'computed from sampled answers', 'the true gradient is a sum we cannot compute'],
    sc: ['grad', 's', 'the score', 'the gradient of the log-probability of the sampled answer', 'it is the direction that makes that answer more likely'],
    // reward
    rr: ['reward', 'r', 'the reward', 'the judge: a person, a reward model, or a checker', 'it is the only signal of what we want'],
    RR: ['reward', 'R', 'the total reward', 'the reward for a whole response', 'it is what a response earns'],
    GG: ['reward', 'G', 'the return', 'the rewards still to come from this point', 'a token can only affect what comes after it'],
    JJ: ['reward', 'J', 'the objective', 'the average reward the policy earns', 'it is the one number training tries to increase'],
    // baselines and values
    bb: ['baseline', 'b', 'the baseline', 'a reward we expected anyway', 'subtracting it removes noise and adds no bias'],
    VV: ['baseline', 'V', 'the value', 'a critic’s prediction of the reward to come', 'it is a baseline that depends on the state'],
    rbar: ['baseline', '\\bar r', 'the group mean', 'the average reward of the other answers', 'a baseline that needs no critic'],
    // advantage
    AA: ['advantage', 'A', 'the advantage', 'reward minus what we expected', 'it says better or worse than usual, not just good or bad'],
    Ahat: ['advantage', '\\hat A', 'the estimated advantage', 'computed from rewards and value predictions', 'the true advantage is unknown'],
    dd: ['advantage', '\\delta', 'the TD error', 'one step of reward plus the change in value', 'a one-step surprise'],
    // frozen copies
    pref: ['frozen', '\\pi_{\\mathrm{ref}}', 'the reference model', 'the model before this training began', 'it anchors what normal behaviour looks like'],
    pold: ['frozen', '\\pi_{\\mathrm{old}}', 'the old policy', 'the policy that sampled this batch', 'the samples came from it, not from the current one'],
    // the leash
    bt: ['leash', '\\beta', 'the leash strength', 'a number we choose', 'it trades reward against staying close'],
    KL: ['leash', '\\mathrm{KL}', 'the KL divergence', 'an average log-ratio of two distributions', 'it measures how far the policy has moved'],
    ZZ: ['leash', 'Z', 'the normaliser', 'the sum of the reweighted chances', 'dividing by it makes the reweighted chances add up to 1'],
    // ratios
    rat: ['ratio', '\\rho', 'the probability ratio', 'new probability over old probability', 'it re-weights old samples for the new policy'],
    // knobs
    eps: ['knob', '\\epsilon', 'the clip range', 'a number we choose, usually 0.2', 'it limits how far one batch can move the policy'],
    gam: ['knob', '\\gamma', 'the discount', 'a number we choose, between 0 and 1', 'later rewards can count for less'],
    lam: ['knob', '\\lambda', 'the GAE mix', 'a number we choose, between 0 and 1', 'it trades bias against variance'],
    lr: ['knob', '\\eta', 'the step size', 'a number we choose', 'how far each update moves the weights'],
    kk: ['knob', 'k', 'the number of samples', 'how many answers we draw for one prompt', 'more samples give a better average, or more chances to be right'],
    GN: ['knob', 'G', 'the group size', 'how many answers per prompt', 'the group is its own baseline'],
    // data
    xx: ['data', 'x', 'the prompt', 'the question or instruction', 'everything is conditioned on it'],
    yy: ['data', 'y', 'the response', 'a sample from the policy', 'it is what gets judged'],
    aa: ['data', 'a', 'an answer', 'one of the possible outputs', 'the policy puts a probability on each'],
    ss: ['data', 's', 'the state', 'the prompt plus the tokens so far', 'it is everything the model sees at this step'],
    yw: ['data', 'y_w', 'the preferred response', 'the one a person picked', 'the winner of the comparison'],
    yl: ['data', 'y_l', 'the rejected response', 'the one a person passed over', 'the loser of the comparison'],
    // operators
    EE: ['op', '\\mathbb{E}', 'the expectation', 'an average weighted by probability', 'it is what “on average” means'],
    sig: ['op', '\\sigma', 'the sigmoid', '1 / (1 + e^(−t)), an S-shaped curve', 'it turns any number into a probability'],
  };
  const symbols = {};
  const macros = {};
  for (const [id, [role, tex, name, from, why]] of Object.entries(S)) {
    const color = ROLE[role];
    symbols[id] = { id, role, tex, name, from, why, color };
    macros[id] = role === 'data' || role === 'op'
      ? `\\class{s-${id}}{${tex}}`
      : `\\class{s-${id}}{{\\color{${color}}{${tex}}}}`;
  }
  // role macros for symbols not in the glossary: \cReward{rt}{r_t} is coloured
  // like a reward and spotlightable as 'rt'. One per role: \cPolicy \cParams
  // \cGrad \cReward \cBase \cAdv \cFrozen \cLeash \cRatio \cKnob \cData
  const ROLE_MACRO = { policy: 'cPolicy', params: 'cParams', grad: 'cGrad', reward: 'cReward', baseline: 'cBase', advantage: 'cAdv',
    frozen: 'cFrozen', leash: 'cLeash', ratio: 'cRatio', knob: 'cKnob', data: 'cData' };
  for (const [role, name] of Object.entries(ROLE_MACRO)) {
    // (## is a literal # inside a macro that takes arguments)
    macros[name] = [role === 'data' ? '\\class{s-#1}{#2}' : `\\class{s-#1}{{\\color{${ROLE[role].replace('#', '##')}}{#2}}}`, 2];
  }
  // a chapter can describe its own symbols for cards (S.symcard), without
  // touching this file: FILM.addSymbol('rt', 'reward', 'r_t', name, from, why)
  FILM.addSymbol = (id, role, tex, name, from, why) => {
    symbols[id] = { id, role, tex, name, from, why, color: ROLE[role], local: true };
  };
  FILM.ROLE_MACRO = ROLE_MACRO;
  FILM.ROLE = ROLE;
  FILM.ROLE_NAME = ROLE_NAME;
  FILM.symbols = symbols;
  FILM.macros = macros;
})();
