# Evolution, Barcoded

A narrated animated film (about 12 minutes) on the method of microbial experimental
evolution: what each step of the standard protocol is, why it is done, and what goes wrong
without it. It then covers the DNA barcoding approach of Levy et al. (Nature 2015) and its
use as a measuring instrument by Kinsler, Geiler-Samerotte & Petrov
(eLife 2020, https://elifesciences.org/articles/61271).

Open `evolution_barcoded.html` in a browser. Everything (code, narration audio, timing) is
in that one file. The only network request is for Google Fonts.

## Chapters

Step chapters share one layout: WHAT WE DO, WHY, and WITHOUT IT (a counterfactual). A rail
in the top-right corner shows where the chapter sits in the protocol.

| # | Chapter | What it teaches |
|---|---------|-----------------|
| – | Evolution, Barcoded | Gould's "replaying the tape": the same start, a different history |
| 01 | Why evolve life in a flask? | Control, replication, time travel, scale |
| 02 | The standard recipe | The six steps, each removing one source of ambiguity |
| 03 | Step 1 · Start from one clone | Streak plating; why identical genomes make every later change a new mutation |
| 04 | Step 2 · Define the environment | Defined minimal medium, one limiting nutrient, fixed physical conditions |
| 05 | Step 3 · Serial transfer | The 48 h cycle, 1:250 ≈ 2⁸, feast and famine, batch vs chemostat |
| 06 | Why the bottleneck size matters | The establishment lottery (~1/s cells), mutation supply N·μ |
| 07 | Steps 4 & 5 · Freeze and replicate | Revive, compare, replay; parallel evolution as a signature of selection |
| 08 | Step 6 · Measure fitness by competition | Why compete instead of growth rate; slope of ln(ratio) = s |
| 09 | The blind spot | The ~1% detection limit; seeing winners, not the race |
| 10 | Step 7 · Barcode every cell | Follow lineages, not mutations; random, neutral, stable, fixed position |
| 11 | Installing half a million barcodes | Landing pad, Cre–lox, split URA3 as quality control, one-way integration |
| 12 | Step 8 · Count the lineages | Sampling depth, UMIs, indices, the neutral noise floor |
| 13 | What the census revealed | Trajectories, s and τ, 25,000 adaptive lineages, 1×10⁻⁶ |
| 14 | Barcodes as a measuring instrument | 90% ancestor, ApaLI digest, neutral lineages for mean fitness |
| 15 | Why change the environment? | Fitness profiles as fingerprints; 8 traits near home, small ones matter far away |
| 16 | The logic of the method | Each step and the ambiguity it removes |

## How it is built

The code starts from a domain model (`src/domain.js`), and the pictures are drawn from it.

- `Barcode`: a random 20-mer between fixed flanks.
- `PROTOCOL`: the method's steps, each with what is done and what it rules out. It drives
  the step rail and the closing recap.
- `establishmentLottery`: a branching process of new mutants (chapter 06). `RaceModel`: two
  strains in one batch culture (chapter 08).
- `LineageTracking`: simulates the Levy et al. evolution (25,000 adaptive lineages with a
  2–5%-heavy fitness-effect spectrum, establishment at 1/(sN), mean-fitness drag, drift at each
  bottleneck). Chapters 09, 12 and 13 plot its trajectories.
- `MUTANT_CLASSES`, `ENVIRONMENTS`, `FitnessAtlas`: a latent-phenotype model of 292 mutants in
  45 environments, with an in-page SVD of its 292 × 25 subtle block as in the paper. Chapter
  15's fingerprints and salt panel are drawn from this matrix.

Plots made from these simulations carry a "simulated data" badge. Numbers in the narration
and on the "values as reported" charts come from the papers.

Other sources:

- `src/script.json`: the narration, one line per caption, with optional `say` text for pronunciation.
- `src/core.js`, `src/draw.js`: easing, seeded randomness, and canvas primitives (yeast cells,
  flasks, helices, plots).
- `src/kit.js`: shared plots and teaching devices (step rail, WHAT / WHY / WITHOUT zones, plates).
- `src/scenes_a.js`, `src/scenes_b.js`: one pure `draw(t, cue, duration)` function per chapter.
  Visual beats are keyed to narration cues, so re-timing the voice re-times the picture.
- `src/music.js`: a generative Web Audio score. Each event depends only on film time, so the
  same code plays live (and survives seeking) and renders offline for the MP4.
- `src/player.js`: timeline, captions, transport controls, chapter deep links (`#bottleneck`), and
  WebM recording when the file is opened directly.

## Rebuilding

```sh
pip install piper-tts                              # narration voice (en_US-lessac-high)
python3 build/tts.py <voice_dir> <out_dir>         # synthesise lines, measure them, write timing.json + narration.mp3
cp <out_dir>/timing.json <out_dir>/narration.mp3 build/assets/
node build/build.js                                # → evolution_barcoded.html (+ build/out/artifact.html)
node build/shots.js <dir> --scenes                 # still frames for review
node build/render_video.js out.mp4 --width 1920    # deterministic frame capture + score + narration → MP4
```
