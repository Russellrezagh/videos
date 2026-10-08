# The Gradient of Reward

A narrated film (1 hour 42 minutes) on the mathematics of reinforcement learning
for language models, built from first principles and drawn in a 3Blue1Brown-like
style with a Manim-style engine written in JavaScript and SVG, including 3D
landscapes.

It starts from one question: how do you take the gradient of something you can
only sample? Then it builds the answer one justified step at a time. Every
formula is introduced the same way: why we need it, a derivation with a
"because" for each step, a tour of its symbols (name, where it comes from, why
it is there), a plain-English reading in the symbols' colours, and what it does
to real numbers from the film's tested kernel.

| Chapter | What it derives or shows |
|---|---|
| 0. The question | the problem; how to read the film's colour-coded formulas |
| 1. A language model is a policy | logits and the softmax (why exponentiate, why divide, shift invariance, temperature); a response's probability as a product and its log as a sum; states, actions, rewards; the objective J(θ) toured symbol by symbol |
| 2. Learning from a score | SFT as maximum likelihood (why the minus and the log); judging is easier than writing; why the reward cannot be back-propagated |
| 3. The log-derivative trick | the softmax built on a three-answer bandit; the policy gradient derived in 17 steps; the softmax score 1[a=j] − π(j) derived from log π = z − log Σe^z; the exact gradient π(j)(r(j) − J); Monte Carlo convergence; REINFORCE for sequences |
| 4. Taming the noise | an offset of 10 keeps the gradient but multiplies the variance; the proof that E[∇log π] = 0, so any baseline adds no bias; the variance as a parabola in b and the optimal baseline; the advantage; critic, leave-one-out and group baselines; **3D**: the reward landscape over the logit plane, the one-sample arrows laid tip to tail, the +10 offset and the baseline, training runs with and without a baseline |
| 5. Credit assignment | reward-to-go and why past rewards may be dropped; the value as a learned baseline; the TD error; GAE and its λ = 0 and λ = 1 limits by telescoping; process supervision |
| 6. Small steps | importance sampling derived; the surrogate and its gradient at θ_old; TRPO's trust region; PPO's clip case by case; the PPO loop for language models; **3D**: the clipped surrogate as a surface over (ρ, A) |
| 7. Rewards from preferences | Bradley–Terry derived (a two-answer softmax is a sigmoid of the gap); the reward-model loss as maximum likelihood and its gradient; InstructGPT; reward over-optimization |
| 8. The KL leash | KL defined, read and its properties; the per-token penalty; the optimum π* = π_ref e^{r/β} / Z derived from E[r] − βKL = β log Z − βKL(π‖π*); the β knob and the Bayesian reading; **3D**: the objective as a dome over the simplex, its peak sliding as β shrinks |
| 9. DPO | solving the optimum for the reward; log Z cancelling inside Bradley–Terry; the DPO loss and its gradient; convergence to the RLHF optimum |
| 10. Verifiable rewards and GRPO | RLVR; group-normalized advantages; the GRPO objective; the k3 estimator shown non-negative and unbiased; groups with no signal; DAPO, Dr. GRPO, GSPO; DeepSeek-R1-Zero |
| 11. What RL changes | pass@k and its unbiased estimator; sharpening; every method as E[w ∇log π]; recap |

## The teaching layer

- `video/src/js/film/glossary.js`: every symbol of the film with one colour
  by role (the policy blue, weights teal, gradients yellow, rewards gold,
  baselines purple, advantages green, frozen models grey, the KL leash
  orange, ratios maroon, knobs pink), a plain-English name, where it comes
  from and why it is there. The symbols become TeX macros (`\pt`, `\rr`,
  `\grad`, ...), so every formula is coloured and tagged automatically.
- The kit (`film/setup.js`): `S.tour` spotlights a formula's symbols one beat at
  a time with their cards, `S.english` writes a plain-English reading in the
  same colours, `S.reason` shows why a derivation step is allowed.
- `video/TEACHING.md`: the pattern every formula follows, notation, layout and
  narration rules.
- `video/src/js/space3.js`: 3D surfaces, paths, points and labels for the
  engine (projected to SVG, painter's algorithm, frame-pure), used by the
  landscapes in `film/landscapes.js`.

The film is one file per chapter (`video/src/js/film/ch00.js` ... `ch11.js`),
so chapters can be written and reviewed in parallel. This version was written
that way: one writer per chapter group and one for the 3D module, then
reviewers who re-derived every formula and recomputed every number.

## The model first

`src/js/rl.js` is the domain model: a pure, seeded kernel with no DOM and no
clock. Every number the film shows is computed by it when the page loads:
exact gradients and exact variances of the REINFORCE estimator (summed over
actions, not sampled), the optimal baseline, seeded training runs, GAE, the PPO
clip and its slope, Bradley–Terry fitting, the KL-regularised optimum and the
reward–KL frontier, tabular DPO, group and leave-one-out advantages, the exact
means and spreads of the k1, k2 and k3 KL estimators, and pass@k.

`tests/verify.mjs` checks the identities the narration states (42 checks),
among them:

- the exact gradient π_b (r_b − J) matches finite differences;
- E[∇log π] = 0, and REINFORCE stays unbiased for any baseline;
- the optimal baseline minimises the variance;
- GAE with λ = 1 is the return minus the value, and with λ = 0 the TD error;
- the PPO clip stops paying above 1 + ε (A > 0) and below 1 − ε (A < 0);
- a reward model fitted to 20,000 comparisons recovers the true scores up to a shift;
- π_ref e^{r/β} / Z beats 2,000 nearby policies, and its value is β log Z;
- DPO on infinite preference data converges to the RLHF optimum (KL < 1e-15);
- k1 and k3 are unbiased, k3 is never negative, and k3 is less noisy near the reference;
- the pass@k estimator matches brute-force subsets.

Toy examples (a next-token distribution, critic values, the pass@k curves) are
labelled "toy numbers" on screen.

## Sources

Each paper that appears on screen (title only, bottom-left) was checked
against the source itself: the publisher, arXiv, NeurIPS or PMLR pages, or the
author's blog. The page lists the full references under the player, generated
from the same records (`INSERTS` in `video/src/js/scenes.js`):

Williams 1992 (REINFORCE) · Sutton et al. 1999 (policy gradient theorem) ·
Kool et al. 2019 (leave-one-out baseline) · Ahmadian et al. 2024 (RLOO for RLHF) ·
Schulman et al. 2016 (GAE) · Lightman et al. 2023 (process supervision) ·
Schulman et al. 2015 (TRPO) · Schulman et al. 2017 (PPO) · Bradley & Terry 1952 ·
Christiano et al. 2017 · Ouyang et al. 2022 (InstructGPT) · Gao et al. 2023
(reward model over-optimization) · Ziegler et al. 2019 · Korbak et al. 2022 ·
Rafailov et al. 2023 (DPO) · Lambert et al. 2024 (Tülu 3, RLVR) · Shao et al. 2024
(DeepSeekMath, GRPO) · Schulman 2020 (KL estimators) · Yu et al. 2025 (DAPO) ·
Liu et al. 2025 (Dr. GRPO) · Zheng et al. 2025 (GSPO) · DeepSeek-AI 2025
(DeepSeek-R1, Nature) · Chen et al. 2021 (pass@k) · Yue et al. 2025.

Details that depend on a paper's version are stated with it: DeepSeek-R1-Zero's
AIME 2024 pass@1 is 15.6% → 77.9% in the Nature version (71.0% in arXiv v1);
DeepSeekMath's GRPO run used a learned reward model, while R1-Zero used
rule-based accuracy and format rewards.

## Build

```bash
npm install                                   # MathJax, KaTeX, IBM Plex
node tests/verify.mjs                         # the kernel's 42 checks
node video/tools/build.mjs                    # video/dist/index.html

# narration (needs: pip install kokoro-onnx numpy faster-whisper; playwright; ffmpeg)
node video/tools/narrate.mjs --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice af_heart --speed 0.95
node video/tools/build.mjs --fragment out.html --embed-kbps 40   # one file, voice embedded (fits 16 MB)
node video/tools/render-mp4.mjs --workers 4      # video/dist/the-gradient-of-reward.mp4
node video/tools/check-av.mjs                    # the voice plays in step with the picture
node video/tools/lint-layout.mjs                 # every beat against the design rules
node video/tools/probe.mjs                       # page, TeX and chapter errors; length per chapter
node video/tools/sheet.mjs --page video/dist/index.html --scenes trick --out trick.png   # contact sheet
node video/tools/build.mjs --publish pub/        # page + voice as Opus and MP3 files (long films)
```

## Three Landscapes (Manim)

`manim/` holds a five-minute 3D companion made with Manim Community: the
reward surface over the logit plane with REINFORCE's sample arrows and
training runs, PPO's clipped surrogate as a surface, and the KL-regularised
objective as a dome over the probability simplex whose peak slides as β
shrinks. Its NumPy model is checked against `src/js/rl.js`; see
`manim/README.md`.

The engine, player and tools are a fork of `../agentic_science/video` (the
same frame-as-a-function-of-time engine, narration pipeline and checks), with
a dark board palette, Computer Modern text and flat 3b1b-style characters.
