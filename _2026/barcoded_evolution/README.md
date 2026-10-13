# Evolution, Barcoded

A 10½-minute narrated animated film on how evolution experiments work and how DNA barcodes let
us follow ~500,000 yeast lineages at once. It covers Levy et al. (Nature 2015) and Kinsler,
Geiler-Samerotte & Petrov (eLife 2020, https://elifesciences.org/articles/61271).

Open `evolution_barcoded.html` in a browser. Everything (code, narration audio, timing) is
in that one file. The only network request is for Google Fonts.

## Chapters

| # | Chapter | What it shows |
|---|---------|---------------|
| – | Evolution, Barcoded | One ancestral cell blooms into a field of barcoded lineages |
| 01 | What is an evolution experiment? | Ancestor, environment, generations, frozen fossil record, replicates |
| 02 | Serial batch transfer | The 48 h growth curve, the 1:250 ≈ 2⁸ dilution, sawtooth cycles, mutation and sweep |
| 03 | The invisible race | The ~1% detection limit of bulk sequencing; drift and clonal interference |
| 04 | A name for every cell | The 20-nt random barcode, 4²⁰ sequences, inheritance, PCR from fixed flanks |
| 05 | Installing the barcodes | Landing pad, plasmid library, Cre–lox66/71 integration, URA3 intron, −Ura selection |
| 06 | Reading half a million names | Freeze, extract, PCR with UMIs, indexing, read counting |
| 07 | Watching 500,000 lineages | Lineage trajectories, mean fitness, inferring s and τ, DFE, pre-existing mutations |
| 08 | Who are the winners? | Diploids; Ras/PKA and TOR/Sch9 hits (IRA1, IRA2, GPB2, PDE2) |
| 09 | Measuring fitness with barcodes | 90% reference pool, five 48 h time points, ApaLI digest, slope = fitness |
| 10 | Forty-five environments | Subtle vs strong perturbations (Z vs EC batches), the fitness matrix |
| 11 | Counting hidden phenotypes | F ≈ P·E by SVD, 8 components, bi-cross-validation, prediction in strong environments |
| 12 | Locally modular, globally pleiotropic | Minor components matter far from home |

## How it is built

The code starts from a domain model (`src/domain.js`), and the pictures are drawn from it.

- `Barcode`: a random 20-mer between fixed flanks.
- `LineageTracking`: simulates the Levy et al. evolution (25,000 adaptive lineages with a
  2–5%-heavy fitness-effect spectrum, establishment at 1/(sN), mean-fitness drag, drift at each
  bottleneck). Chapters 03, 06 and 07 plot its trajectories.
- `MUTANT_CLASSES`, `ENVIRONMENTS`, `FitnessAtlas`: a latent-phenotype model of 292 mutants in
  45 environments. Its 292 × 25 subtle block is decomposed by an in-page SVD (Jacobi
  eigen-decomposition), and chapter 11's phenotype space is that decomposition.

Plots made from these simulations carry a "simulated data" badge. Numbers in the narration
and on the "values as reported" charts come from the papers.

Other sources:

- `src/script.json`: the narration, one line per caption, with optional `say` text for pronunciation.
- `src/core.js`, `src/draw.js`: easing, seeded randomness, and canvas primitives (yeast cells,
  flasks, helices, plots).
- `src/scenes1.js`, `src/scenes2.js`: one pure `draw(t, cue, duration)` function per chapter.
  Visual beats are keyed to narration cues, so re-timing the voice re-times the picture.
- `src/music.js`: a generative Web Audio score. Each event depends only on film time, so the
  same code plays live (and survives seeking) and renders offline for the MP4.
- `src/player.js`: timeline, captions, transport controls, chapter deep links (`#svd`), and
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
