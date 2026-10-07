# The Gradient of Reward

A narrated film (about 35 minutes) on the mathematics of reinforcement learning
for language models, built from first principles, drawn in a 3Blue1Brown-like
style with a Manim-style engine written in JavaScript and SVG.

It starts from one question: how do you take the gradient of something you can
only sample? It then builds, step by step:

| Chapter | What it derives or shows |
|---|---|
| 1. A language model is a policy | tokens, logits, softmax; a response's probability is a product, its log-probability a sum; states, actions, rewards; the objective J(θ) |
| 2. Learning from a score | SFT as maximum likelihood; why judging is easier than writing; why the reward cannot be back-propagated |
| 3. The log-derivative trick | ∇E[R] = E[R ∇log π] derived on a three-answer bandit; the softmax score 1[a=b] − π_b; Monte Carlo convergence; REINFORCE for sequences |
| 4. Taming the noise | why an offset of 10 makes the estimate noisy; E[∇log π] = 0, so any baseline keeps it unbiased; the variance as a function of the baseline; the advantage; critic, leave-one-out (RLOO) and group baselines |
| 5. Credit assignment | reward-to-go, the value function, TD errors, GAE(γ, λ); process supervision |
| 6. Small steps | importance ratios, the surrogate objective, TRPO's KL constraint, PPO's clipped objective plotted for A > 0 and A < 0, the PPO loop for language models |
| 7. Rewards from preferences | Bradley–Terry, the reward-model loss, a reward model fitted to 20,000 simulated comparisons, the InstructGPT recipe, reward over-optimization |
| 8. The KL leash | KL divergence, the per-token penalty, the exact optimum π* ∝ π_ref e^{r/β} with its derivation, the β knob, the reward–KL frontier, the Bayesian reading |
| 9. DPO | solving for the reward, the cancelling log Z, the DPO loss and gradient, and DPO on unlimited comparisons converging to the exact RLHF optimum |
| 10. Verifiable rewards and GRPO | RLVR, group-normalized advantages, the GRPO objective, Schulman's k3 KL estimator, groups with no signal, DAPO, Dr. GRPO's length bias, GSPO, DeepSeek-R1-Zero |
| 11. What RL changes | pass@k and sharpening; every method as one weight on ∇log π; recap |

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
node video/tools/build.mjs --fragment out.html   # one file, voice embedded
node video/tools/render-mp4.mjs --workers 4      # video/dist/the-gradient-of-reward.mp4
node video/tools/check-av.mjs                    # the voice plays in step with the picture
node video/tools/lint-layout.mjs                 # every beat against the design rules
```

The engine, player and tools are a fork of `../agentic_science/video` (the
same frame-as-a-function-of-time engine, narration pipeline and checks), with
a dark board palette, Computer Modern text and flat 3b1b-style characters.
