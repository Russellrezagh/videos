# Three Landscapes

A five-minute 3D companion to *The Gradient of Reward*, made with
[Manim Community](https://www.manim.community/). It draws three of the film's
ideas as surfaces, where a third dimension helps:

| Act | The surface | What it shows |
|---|---|---|
| 1. The logit plane | expected reward J over the two free logits of the three-answer bandit | the exact gradient; one REINFORCE sample as one of three arrows, drawn as bright as it is likely; the probability-weighted arrows laid tip to tail ending exactly on the gradient; +10 on every reward leaves the slope alone but swings the arrows out (spread 0.15 → 52); a baseline brings them back (0.02); eight training runs with and without a baseline (6 of 8 end sure of a wrong answer without one; 8 of 8 reach 51 with one) |
| 2. The clipped surrogate | PPO's min(ρA, clip(ρ, 1−ε, 1+ε)A) over ratio and advantage | the unclipped sheet ρA; where the clipped surface goes flat (no push) and where it stays steep; a token that has gained enough stops being pushed; a step in the wrong direction is still corrected |
| 3. The KL dome | E_π[r] − β KL(π ‖ π_ref) over the probability simplex of three answers | the reward plane and the KL bowl; the dome's peak at π_ref e^{r/β} / Z with height β log Z; as β shrinks the peak slides from the reference to the answer the reward model overrates |

## The model first

- `landscapes.py` is the model: plain NumPy, no drawing. It mirrors the film's
  kernel (`../src/js/rl.js`) term for term.
- `test_landscapes.py` runs the kernel in node (`kernel_values.mjs`) on the
  same inputs and checks that the two agree (softmax, the exact gradient, the
  estimator's mean and variance, the PPO clip and slope, the tilt, log Z, the
  regularised objective). It then checks what the narration claims: the
  weighted arrows average to the gradient, +10 lifts J without changing its
  gradient, the clipped objective never exceeds ρA, and the dome's maximum over
  a grid is the tilt with height β log Z.
- `script.py` writes the narration and asserts every number it speaks.
- `scenes.py` draws; `style.py` holds the film's palette, type (KaTeX's
  Computer Modern) and the narrator, which makes each beat wait for its voice
  clip and records the cues used for subtitles.
- `tex.mjs` typesets the formulas with MathJax, so no LaTeX install is needed.

## Build

```bash
# Manim CE with Pango and Cairo, e.g. from conda-forge:
#   micromamba create -p ./manim-env -c conda-forge python=3.12 manim
python3 manim/make.py --manim ./manim-env/bin/manim \
    --model kokoro-v1.0.onnx --voices voices-v1.0.bin --quality 1080
# -> manim/dist/three-landscapes.mp4 and three-landscapes.srt
```

`make.py` checks the model, writes the script, typesets the formulas, speaks the
lines (Kokoro, cached per line), renders the five scenes in parallel, then joins
the pictures and lays one voice track from the recorded cues, mixed to −17 LUFS
like the main film, with the captions as a soft subtitle track.
