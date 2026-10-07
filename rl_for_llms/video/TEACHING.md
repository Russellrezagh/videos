# Teaching style guide (for everyone editing the film)

The film is being rebuilt from a fast scaffold into a slow, first-principles
lesson. The viewer's request, in their words: *the math formulas and their
logic haven't been explained from first principles; add a plain-English
translation of them and their symbols, and the intuition for why we have them;
use colour coding to show where the symbols come from and why they are there;
it is fast and flashy for education — flesh it out with the logic and
descriptions.*

So every formula in the film gets the treatment below. Speed is the enemy:
when in doubt, add a beat.

## The pattern for every formula

1. **Why we need it** (before any symbol). One or two beats in plain words:
   what problem are we stuck on, what question will this formula answer?
   Use an on-screen `S.english(...)` headline or a picture, not symbols.
2. **Build it up**, never drop it whole. A formula appears as the end of a
   short derivation or construction, one step per beat, each step with a
   `S.reason('because: ...')` strip saying *why the step is allowed*
   (definition, chain rule, linearity of expectation, "multiplying by 1", ...).
3. **Symbol tour.** The first time a symbol appears in the film (or in a
   chapter, if it has been a while), spotlight it and show its card:
   `S.tour(formula, [{ sym: 'rr', say: '...' }, ...])`. The card says the
   name, *where it comes from* and *why it is there*; reword `text: { why }`
   for the context. Symbols already toured can be spotlit without a card
   (`card: false`).
4. **Read it in English.** One beat that reads the whole formula as a
   sentence, on screen with `S.english('... {reward|rr} ...')` in the same
   colours as the formula, and in the narration.
5. **Intuition with numbers.** Show what the formula *does* on the film's
   running examples (the 3-answer bandit BAND, the leash LEASH, the group
   GROUP, ...), with numbers from the kernel (`RL.*`, src/js/rl.js). Ask
   "what happens if ...?" (the reward doubles, β → 0, the advantage is
   negative) and show the answer.
6. **What it buys us / what is still missing**, leading into the next idea.

Exemplars to copy: `film/ch00.js` scene `colors` and `film/ch03.js` scene
`trick` (the log-derivative trick as a 17-beat derivation).

## Notation: one colour per role, everywhere

Write every formula with the glossary macros (`video/src/js/film/glossary.js`),
so colours and spotlights work. Never hard-code colours for these symbols.

| role | colour | meaning |
|---|---|---|
| policy | blue | what the model does: probabilities π |
| params | teal | what training changes: weights θ, logits z |
| grad | yellow | directions: ∇ and estimates ĝ |
| reward | gold | what the judge says: r, R, returns G, objective J |
| baseline | purple | what we expected: b, V, group means |
| advantage | green | better or worse than expected: A, δ |
| frozen | grey | copies that do not train: π_ref, π_old |
| leash | orange | staying close: β, KL, Z |
| ratio | maroon | new over old: ρ |
| knob | pink | numbers we choose: ε, γ, λ, η, k, G |
| data, op | white | prompts, answers, tokens; 𝔼, σ, log, Σ |

| macro | TeX | role | name |
|---|---|---|---|
| `\pt` | `\pi_\theta` | policy | the policy |
| `\pp` | `\pi` | policy | a policy |
| `\lp` | `\log \pi_\theta` | policy | the log-probability |
| `\pstar` | `\pi^{*}` | policy | the best policy |
| `\th` | `\theta` | params | the weights |
| `\zz` | `z` | params | a logit |
| `\grad` | `\nabla_{\!\theta}` | grad | the gradient |
| `\ghat` | `\hat g` | grad | the gradient estimate |
| `\sc` | `s` | grad | the score (∇ log π of the sampled answer) |
| `\rr` | `r` | reward | the reward |
| `\RR` | `R` | reward | the total reward |
| `\GG` | `G` | reward | the return |
| `\JJ` | `J` | reward | the objective |
| `\bb` | `b` | baseline | the baseline |
| `\VV` | `V` | baseline | the value |
| `\rbar` | `\bar r` | baseline | the group mean |
| `\AA` | `A` | advantage | the advantage |
| `\Ahat` | `\hat A` | advantage | the estimated advantage |
| `\dd` | `\delta` | advantage | the TD error |
| `\pref` | `\pi_{\mathrm{ref}}` | frozen | the reference model |
| `\pold` | `\pi_{\mathrm{old}}` | frozen | the old policy |
| `\bt` | `\beta` | leash | the leash strength |
| `\KL` | `\mathrm{KL}` | leash | the KL divergence |
| `\ZZ` | `Z` | leash | the normaliser |
| `\rat` | `\rho` | ratio | the probability ratio |
| `\eps` | `\epsilon` | knob | the clip range |
| `\gam` | `\gamma` | knob | the discount |
| `\lam` | `\lambda` | knob | the GAE mix |
| `\lr` | `\eta` | knob | the step size |
| `\kk` | `k` | knob | the number of tries |
| `\GN` | `G` | knob | the group size |
| `\xx` | `x` | data | the prompt |
| `\yy` | `y` | data | the response |
| `\aa` | `a` | data | an answer |
| `\ss` | `s` | data | the state |
| `\yw` | `y_w` | data | the preferred response |
| `\yl` | `y_l` | data | the rejected response |
| `\EE` | `\mathbb{E}` | op | the expectation |
| `\sig` | `\sigma` | op | the sigmoid |

Subscripts and arguments stay outside the macro: `\rr(\aa)`, `\rr_t`,
`\pt(\yy_t \mid \ss_t)`, `\VV(\ss_{t+1})`.

**A symbol that is not in the glossary**: colour it by role with a role macro
`\cReward{rt}{r_t}` (macros: `\cPolicy \cParams \cGrad \cReward \cBase
\cAdv \cFrozen \cLeash \cRatio \cKnob \cData`; first argument = an id
for spotlights, second = the TeX). To give it a card, describe it once in your
chapter file: `FILM.addSymbol('rt', 'reward', 'r_t', 'the reward at step t',
'from', 'why')`. **Do not edit glossary.js** (other people are editing in
parallel); if a symbol is used in many chapters, report it.

## The kit (inside a scene, `S.`)

Existing: `S.title`, `S.head`, `S.txt`, `S.tex`, `S.box`, `S.bars`, `S.axes`
(with `.plot`, `.polyline`), `S.tokens`, `S.arrow`, `S.line`, `S.rect`,
`S.dot`, `S.group`, `S.creature`, `S.bubble`, `S.quote`, `S.tag`, `S.toy`,
`S.lens`, `S.zoomTo(m, frag)`, `S.pullBack()`, `S.toTitle(m)`, `S.cam`, and
`A.*` animations (FadeIn/Out, Write, Create, Set, MoveTo, ScaleTo, Shift,
Indicate, Count, Focus/Unfocus, Arrow), `seq`, `par`, `lag`, `wait`.
See `video/src/js/engine.js` and `film/setup.js` (`kit`).

Teaching kit (film/setup.js):

- `S.english(markup, { size = 40, width = 1560 })`: a plain-English line,
  `{words|key}` coloured by a glossary id or a role name. Wraps. Animate with
  `S.writeIn(g, dur)`.
- `S.reason(markup)`: the "because" strip at y = 285 (italic, grey).
- `S.symcard(id, { name, from, why, tex, w = 820 })`: a symbol card
  (about 200 px tall). Usually created by `S.tour`.
- `S.tour(formula, stops, { at: [x, y] })`: one beat per stop. Stop fields:
  `sym` (id or [ids] to light), `card` (id, or false), `text`, `at`,
  `say`, `cap`, `anims` (extra animations), `hold`, `paper`. Then
  `S.endTour(formula)` (an animation) relights everything and clears the card.
- `A.Spot(tex, ids)` / `A.Unspot(tex)`: light some symbols, dim the rest.
- `S.color(key)`: a glossary id or role → its colour (for pictures that
  should match the formula: bars of π in blue, rewards in gold, ...).
- `S.paper(key)` before a beat shows that paper's title bottom-left
  (`film/papers.js`); keep every existing `S.paper` mark on the right beat.

## Layout (1920 × 1080, origin at the centre)

- Scene title at y = -455 (`S.title`). Safe area |x| ≤ 900. **Nothing below
  y = 385**: that is the caption band.
- A good grid: main formula at y ≈ -60 (previous step above at y ≈ -275,
  scaled 0.72 and dimmed), second line at y ≈ 130, card or English at
  y ≈ 160–230, reason strip at y = 285.
- At most three formula lines on screen; fade old ones.
- Text ≥ 30 px, strokes ≥ 4 (`MV.STYLE`). The linter enforces it.
- On a beat with `S.paper`, keep the lower-left corner (x < -450, y > 300)
  empty: the paper title sits there.

## Narration

- One idea per beat, at most about 45 words (≈ 15 s). Split longer beats.
- `say` is spoken by a TTS voice: write symbols as words ("pi", "theta",
  "nabla", "beta", "rho", "epsilon", "g-hat", "pi-theta"), numbers as words
  ("zero point two"), and acronyms with spaces ("P P O", "K L", "D P O",
  "G R P O", "R L H F", "G A E", "T D", "S F T"). Then give `cap` with the
  written form (π, θ, 0.2, PPO, KL).
- Speak to one curious person. Short sentences. Name the problem before
  the solution. No hype words (crucial, delve, powerful, elegant...).
- Every number said or shown comes from the kernel (`RL.*`) or from a paper
  record in `film/papers.js`. Label toy numbers on screen (`S.toy`).
- Mathematical claims must be exactly right. If you are not certain, check
  (derive it, compute it with node, or read the paper) or leave it out.

## Ownership and tools

- Edit only the files you own. Do not edit engine.js, setup.js, glossary.js,
  papers.js, player.js, index.html, or other people's chapters. Need a
  helper? Write it inside your chapter file. Need a shared change? Report it.
- Keep the chapter structure (`video.chapter`, `card(n, ...)`) and existing
  scene ids where the scene still exists; new scene ids must be unique in
  the film (prefix them with your chapter, e.g. `c4-why`). Keep the 3D
  landscape hook lines in chapters 4, 6 and 8.
- Build to your own file and check it (run from `rl_for_llms/`;
  `export NODE_PATH=/opt/node22/lib/node_modules`):

  ```
  node video/tools/build.mjs --no-narration --out /tmp/<you>/draft.html
  node video/tools/probe.mjs /tmp/<you>/draft.html          # page and TeX errors
  node video/tools/lint-layout.mjs --page /tmp/<you>/draft.html --only scene1,scene2
  node video/tools/sheet.mjs --page /tmp/<you>/draft.html --scenes scene1,scene2 --out /tmp/<you>/s.png
  ```

  Look at the sheet (Read the PNG): it is how you see your scenes. Fix every
  lint issue in your scenes. Never run the narration tools (TTS); timings are
  estimated from the text in drafts.

## 3D landscapes

`video/src/js/space3.js` (MV3) draws 3D surfaces, paths and points into the
SVG stage; `film/landscapes.js` defines `FILM.landscapes.logits`, `.clip`
and `.dome`, called from chapters 4, 6 and 8. They follow the same teaching
pattern and the same colours, and their numbers come from rl.js.
