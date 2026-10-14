# Renewable Barcodes

A silent animated film (about 13 minutes, 19 chapters) on **renewable DNA barcoding** — the method
Nguyen Ba, Cvijović, Rojas Echenique and colleagues introduced to follow thousands of competing
yeast lineages through 1,000 generations of evolution, far below the resolution of genome
sequencing, and the travelling wave of adaptation they found.

Every plot in the film is drawn from the authors' **own published data**, extracted from their public
repository — the Muller diagrams, the raw lineage trajectories, the noise model, the fitness wave,
the replay experiment and the whole-genome allele-frequency trajectories are the real measurements,
not reconstructions.

Source:

- Nguyen Ba, Cvijović, Rojas Echenique, Lawrence, Rego-Costa, Liu, Levy & Desai,
  *High-resolution lineage tracking reveals travelling wave of adaptation in laboratory yeast*,
  **Nature 575, 494–499 (2019)**. https://www.nature.com/articles/s41586-019-1749-3
- Data and analysis code: https://github.com/icvijovic/lineage-tracking
- Background on barcoded lineage tracking: Levy et al., *Nature* 519 (2015).

Open `renewable_barcodes.html` in a browser. It is a single self-contained file: a Canvas 2D layer
draws the type, diagrams and plots, styled after the paper's own figures (IBM Plex + STIX Two from
Google Fonts). There is no audio. Each chapter is a sequence of short on-screen text beats, and each
beat stays up long enough to be read. Space plays and pauses; `[` and `]` jump between chapters;
`#muller`, `#wave`, … deep-link to a chapter.

## Look

The film is styled as a journal figure brought to life: a warm paper ground, dark ink, thin rules,
white plot panels and the paper's saturated lineage colours (the YPD population navy, YPA orange;
clones that found sublineages take a wheel colour, the rest grey, exactly as in the paper). No
glows, gradients or drop shadows.

## Chapters

| # | Chapter | What it teaches |
|---|---------|-----------------|
| – | Renewable Barcodes | 50,000 lineages in one tube; most beneficial mutations never surface |
| 01 | Why one barcode is not enough | Clonal interference; a barcode is hidden once its lineage expands |
| 02 | Renewable barcoding | Add a fresh barcode every 100 generations; the string is a family tree |
| 03 | Three requirements | One locus per cell, no tight bottlenecks, one-way repeatable insertion |
| 04 | Cre and orthogonal lox sites | loxP / lox5171 / lox2272; a landing pad; marker swap |
| 05 | Making the reaction one-way | Two-arm lox logic; the lox2 arm active in trans, dead in cis |
| 06 | Two alternating plasmids | Kan/Hyg swap, a broken marker activated only by integration, a diverse library |
| 07 | One round of barcoding | Transform, induce Cre, recombine, select, counter-select, evolve |
| 08 | The evolution experiment | YPD and YPA, 1:1024 daily, re-barcode each epoch, 9 and 10 epochs |
| 09 | Reading the barcode locus | UMIs, four barcodes per read, assembly by shared ancestors |
| 10 | The raw trajectories | Every YPA sublineage above 0.1%, the real stacked picture |
| 11 | A model of the noise | Branching process; drift; the real read-count histogram vs model |
| 12 | From trajectories to fitness | Slope of log-frequency; discard drift; joint fit |
| 13 | Finding the mutations | Child fitter than parent → a mutation; 72 and 124 clones |
| 14 | Clones in competition | The real YPD Muller diagram with establishment stars |
| 15 | A travelling wave | The fitness distribution marching right; mean fitness climbing |
| 16 | Leapfrogging | The YPA sweep, confirmed by two barcode-free replay replicates |
| 17 | Rich get richer | A fitter lineage is a larger target; real effect-size spectrum |
| 18 | Which genes mutated | WGS allele frequencies; BNA3, ASG1, ASC1 and acid tolerance |
| 19 | What renewable barcoding showed | The three results, over the raw data |

## How it is built

The code starts from a domain model (`src/domain.js`), which wraps the extracted dataset.

- `build/extract_data.py` reads the authors' repository and writes `src/data.json` plus
  `src/raw_YPD.webp` / `src/raw_YPA.webp`. It ports the authors' Muller-stacking algorithm to
  Python 3, so the film's diagrams lay lineages out exactly as the published figures do. It also
  rebuilds the read-count noise histogram (SI eq. 7), the clone fitnesses (evolution, barcoding and
  their average, SI eq. 25), the WGS allele-frequency trajectories and the two replay populations.
- `Pop(name)` exposes one population: its clones (frequency, Muller bands, fitness, colour), the
  ancestor band, the fitness wave at any timepoint, the noise model, the WGS calls and the fitness
  assays.
- `REBAR` holds the renewable-barcoding construct (lox sites, markers, bench steps) for the
  mechanism chapters.

Other sources:

- `src/film.json`: the on-screen text, one beat per line, with optional hold times.
- `src/core.js`: palette, fonts, easing, seeded randomness.
- `src/gfx.js`: the 2D toolkit (text, formulas, thin lines, axes, panels, glyphs).
- `src/kit.js`: the shared real-data plots — the Muller diagram, the fitness wave, the raw-trajectory
  panel — and glyphs (cells, barcode strings, helices).
- `src/scenes1.js` … `src/scenes3.js`: one chapter each, as a pure `flat(t, c, D)` function of time,
  so seeking and frame capture are deterministic.
- `src/player.js`: timeline, transport, chapter deep links, and WebM recording when opened directly.

## Rebuilding

```sh
python3 build/extract_data.py <path to a clone of icvijovic/lineage-tracking>   # → src/data.json + raw_*.webp
node build/build.js                                      # → renewable_barcodes.html (+ build/out/artifact.html)
node build/shots.js <dir> --scenes                       # three stills per chapter for review
node build/shots.js <dir> --keys muller,wave 0.8         # one still per text beat of chosen chapters
node build/render_video.js out.mp4 --width 1280          # deterministic frame capture → silent MP4
```

Frame capture is pure Canvas 2D, so the render needs no GPU.
