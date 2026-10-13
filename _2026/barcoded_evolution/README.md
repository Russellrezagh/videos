# Evolution, Barcoded

A silent animated film (about 15 minutes, 24 chapters) on the method of microbial experimental
evolution. It shows what each step of the standard protocol is and why it is done, then how DNA
barcodes are installed, amplified, sequenced and counted. It then covers how barcoded pools are
used to measure many mutants at once, and how whole-genome sequencing finds the mutations.

Sources:

- Levy et al., *Nature* 519 (2015): high-resolution lineage tracking.
- Kinsler, Geiler-Samerotte & Petrov, *eLife* 9:e61271 (2020): https://elifesciences.org/articles/61271
- Chochinov & Nguyen Ba, *Methods Mol Biol* 2477 (2022): the barcode-sequencing protocol
  (DNA extraction, two-step PCR with UMIs, SPRI cleanups, read parsing).
- Schmidlin et al., *eLife* (2024): https://elifesciences.org/articles/94144 (experimental design
  with 12 drug environments, fitness profiles and clusters, whole-genome sequencing of isolates).

Open `evolution_barcoded.html` in a browser. The film is a single file: three.js
(r149, from jsDelivr) draws the 3D scenes, and a Canvas 2D layer on top draws the type, plots and
callouts. Google Fonts supplies IBM Plex and STIX Two. There is no audio. Each chapter is a
sequence of short on-screen text beats, and each beat stays up long enough to be read.

## Look

The style follows Welch Labs: a pure black ground, white type, thin lines, and a few saturated
accents with fixed meanings. Yellow is the subject or the barcode. A, C, G and T are always
green, blue, yellow and red. There are no panels, badges, glows or gradients. The 3D objects
(flasks, dishes, cells, helices, the lineage forest, the flow cell) are lit simply. They get
crisp 2D outlines and callouts projected from their 3D positions. The camera pans in screen
space (`Stage.orbit(..., panX, panY)`), so a subject can sit beside its labels while it rotates.

## Chapters

| # | Chapter | What it teaches |
|---|---------|-----------------|
| – | Evolution, Barcoded | Gould's "replaying the tape": the same start, a different history |
| 01 | Why evolve life in a flask | Control, replication, time travel, scale |
| 02 | The standard recipe | Six classic steps, plus two for barcoding |
| 03 | Step 1 · Start from one clone | Streak plating; why identical genomes make every later change a new mutation |
| 04 | Step 2 · Define the environment | M3 minimal medium, glucose limitation, no uracil, 100 mL / 500 mL / 30 °C / 200 rpm |
| 05 | Step 3 · Serial transfer | The 48 h cycle, 400 µL of 100 mL = 1:250 ≈ 2⁸, feast and famine |
| 06 | Why the bottleneck is large | The establishment lottery (~1/s cells), mutation supply N·μ |
| 07 | Steps 4 & 5 · Freeze and replicate | Glycerol stocks at −80 °C, revival, parallel evolution |
| 08 | Step 6 · Measure fitness by competition | Lag versus growth rate; slope of ln(ratio) = s |
| 09 | The blind spot | The ~1% detection limit of whole-population sequencing |
| 10 | Step 7 · Tag every cell | A random 20-mer in an artificial URA3 intron: random, neutral, inherited |
| 11 | Installing the barcodes | Landing pad, GAL-Cre, lox66/71, split URA3, 24 transformations, "monster" barcodes |
| 12 | Evolving the barcoded pool | 168 generations; pre-existing mutations; every transfer frozen |
| 13 | Counting barcodes I · Extract the DNA | Zymolyase, guanidine thiocyanate on silica at pH ≈ 5, elution, 200 ng ≈ 10⁷ genomes |
| 14 | Counting barcodes II · Two-step PCR | 3 cycles adding UMIs and inline indexes, SPRI ratios, adapter PCR, the ≈290 bp band |
| 15 | Counting barcodes III · Reads to frequencies | Dual indexes, fuzzy parsing, matching within 2 edits, UMI deduplication, rules of thumb |
| 16 | Inferring fitness | df/dt = f(s − s̄), log-ratio slopes, read-weighted and likelihood fits, the neutral noise floor |
| 17 | What lineage tracking revealed | ~25,000 adaptive lineages, ~10⁻⁶ per generation, ~15 visible to bulk sequencing |
| 18 | Measuring hundreds of mutants at once | 90% ancestor, ApaLI digest or a barcodeless ancestor, control strains define zero |
| 19 | Design · Twelve drug environments | FLU and RAD doses from growth curves, ~21,000 isolates, 24 competitions |
| 20 | Fitness profiles as fingerprints | 774 × 12 fitness matrix, embedding, 6 clusters and their tradeoffs |
| 21 | Whole-genome sequencing I · Colony to library | Clones from the pool, tagmentation, index PCR, double-sided size selection |
| 22 | Whole-genome sequencing II · Sequencing by synthesis | Cluster generation, one fluorescent base per cycle, 2 × 150 paired reads |
| 23 | Whole-genome sequencing III · Finding the mutation | Alignment to sacCer3, GATK calls, background filtering, SnpEff, ploidy by flow cytometry |
| 24 | The logic of the method | Each step and the ambiguity it removes |

## How it is built

The code starts from a domain model (`src/domain.js`). Scenes draw from it and never invent
data inline.

- `PROTOCOL`: the method's eight steps, each with what is done and the ambiguity it removes.
  It drives the recipe chapter and the closing recap.
- `batchCulture`: one 48 h cycle (lag, fermentation, diauxic shift, stationary phase).
- `establishmentLottery`: a branching process of new mutants. `RaceModel`: two strains in one batch.
- `LineageTracking`: a simulation of the Levy et al. evolution (adaptive lineages with a
  2–5%-heavy fitness-effect spectrum, establishment, mean-fitness drag, drift at each bottleneck).
  It feeds the lineage forest and the noise-floor plot.
- `DRUG_ENVS`, `DRUG_CLUSTERS`, `DrugAtlas`: the Schmidlin et al. design, with illustrative
  cluster profiles that follow the paper's descriptions. The film uses PCA as a stand-in for UMAP.
- `Pileup`: a toy alignment around one variant.

Plots drawn from these simulations are labelled "simulated" or "schematic". Numbers printed as
results come from the papers.

Other sources:

- `src/film.json`: the on-screen text, one beat per line, with optional hold times.
- `src/core.js`: palette, fonts, easing, seeded randomness.
- `src/gfx.js`: the 2D overlay (text, formulas with sub/superscripts, thin lines, axes, callouts).
- `src/stage.js`: the three.js stage (camera orbit with screen-space pan, lights, instanced
  cells, flasks, dishes, tubes, helices) and helpers that outline 3D objects in 2D.
- `src/kit.js`: shared pieces (simulation instances, colour scales).
- `src/scenes1.js` … `src/scenes4.js`: one chapter each, with optional `build` (3D objects),
  `three(t, cue, …)` (3D state) and `flat(t, cue, …)` (2D overlay). Every chapter is a pure
  function of time, so seeking and frame capture are deterministic.
- `src/player.js`: timeline, transport, chapter deep links (`#pcr`, `#wgs2`, …), and WebM
  recording when the file is opened directly.

## Rebuilding

```sh
node build/build.js                                      # → evolution_barcoded.html (+ build/out/artifact.html)
node build/shots.js <dir> --scenes                       # three stills per chapter for review
node build/shots.js <dir> --keys pcr,wgs2                # one still per text beat of chosen chapters
node build/render_video.js out.mp4 --width 1920          # deterministic frame capture → silent MP4
```

Headless capture uses SwiftShader WebGL (`--use-angle=swiftshader`), so it needs no GPU.
