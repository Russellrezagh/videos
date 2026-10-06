# The Polymerase Chain Reaction: an explorable textbook page

One self-contained HTML page (`dist/pcr.html`, about 1.25 MB) that teaches PCR
from base pairing to real-time quantification. It follows the "adaptive
explorable concept teacher" design: the concept is modelled once, and every
view on the page (prose, equations, figures, a narrated Manim-style animation,
five interactives, prediction questions) reads from that model.

## The model first

`src/model.js` is the shared semantic model. It has no DOM, no clock and no
unseeded randomness, and `tests/verify.mjs` checks it (23 checks).

| Part | What it holds |
|---|---|
| `OBJECTS`, `ROLES` | Template, target, primers, polymerase, dNTPs, Mg²⁺, new strand, amplicon, temperature, cycle, efficiency, threshold, Ct, primer-dimer, contamination; each with one colour role used in every view |
| `census(n)` | Exact strand bookkeeping (O → L, L → S, S → S); closed forms L = 2n, S = 2ⁿ⁺¹ − 2n − 2, amplicons = 2ⁿ − 2n |
| `copies`, `cyclesTo`, `grow` | N = N₀(1+E)ⁿ, its inverse, and a logistic plateau (a teaching model) |
| `fluorescence`, `thresholdCycle`, `standardCurve`, `foldChange` | Real-time PCR: Ct, the standard curve, E = 10^(−1/slope) − 1, ΔΔCt |
| `tmWallace`, `tmBasic`, `tmNN`, `primerReport` | Primer checks; nearest-neighbour Tm with SantaLucia (1998) unified parameters |
| `anneal`, `cycleEfficiency` | Two-state binding model for the annealing trade-off (a teaching model) |
| `dpcrLambda`, `poissonZero` | Digital PCR and low-copy sampling |

## Views

| Idea | Medium | File |
|---|---|---|
| What is in the tube | Labelled, hover-linked figure | `figs.js` |
| One cycle, then three | Narrated step animation (frames are pure functions of step and progress) | `scene.js`, `anim.js` |
| Why exact copies win | Prediction card, stepwise derivation, census interactive, the running code | `page.html`, `labs.js`, `ui.js` |
| Annealing temperature | Thermal-cycler sandbox with binding curves and a predicted gel lane | `labs.js` |
| Quantification | Amplification curves with a draggable threshold, live standard curve | `labs.js` |
| Primer design | Live checker with presets and a 3′ dimer view | `labs.js` |
| Digital PCR | Poisson counter with simulated droplets | `labs.js` |
| Wrong intuitions | Looks like / actually / because cards | `ui.js` |

Hover any coloured term to light up the same object in every figure.
Statements carry a tag: fact, rule of thumb, or teaching model.

## Build

```bash
node tests/verify.mjs                                    # model checks
python3 tools/narrate.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin   # optional: re-speak scene.js
node tools/build.mjs                                     # dist/pcr.html (+ dist/standalone.html for local use)
```

The narration uses the Kokoro-82M engine of `../agentic_science/video/tools/tts.py`
(voice af_heart); KaTeX comes from `../agentic_science/node_modules`.
`dist/voice.mp3` is committed, so the page builds without the speech model.

## Checked

- 23 model checks pass (`tests/verify.mjs`).
- Chromium at 1366 px (dark and light) and 390 px: no console errors, no
  horizontal overflow.
- Functional run: the narration plays in step with the animation; the
  prediction card, the census at n = 30, the cycler, the qPCR lab (E = 0.80
  gives slope −3.91 and recovers E = 80 %), the primer presets and the
  term-to-figure linking all respond.
