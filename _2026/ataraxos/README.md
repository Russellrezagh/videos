# Decisions in the Dark, explorable

An adaptive textbook chapter on the Ataraxos paper (Nature, 2026,
[s41586-026-11036-y](https://www.nature.com/articles/s41586-026-11036-y)): how a
self-play system learned to beat the world's best Stratego player.

It starts from first principles: what a game is, perfect and complete information,
mixed strategies, Nash equilibrium, exploitability and Bayesian beliefs. Then it
covers the history from von Neumann to DeepNash, damped self-play with magnetic mirror
descent, the belief network and search as one update, and the results.

One semantic model is shared by the prose, the MathJax equations, the figures and a
silent Manim video, with the same colours. That model holds public and hidden
information, policy, belief, value, the knobs η, α and β, and one toy model, the bluff
game. Every figure on the page is drawn in the visual style of the video: a dark stage,
Stratego tiles, game trees and self-play paths. Most figures are short loops. Each one
is a pure function of time, so it plays, pauses and jumps without hidden state, and with
reduced motion it shows a still frame. The prose follows the writing rules of
ASD-STE100 (Simplified Technical English) at about 80%. The page measures its own
conformance live in Appendix B.

| File | What it is |
|------|------------|
| `ataraxos_explorable.html` | The chapter. Open it in a browser. Video 0.1 needs the `ataraxos_explained.*` files next to it. |
| `ataraxos_explained.mp4`, `ataraxos_explained.webm` | Video 0.1: 2 min 47 s, 720p30, silent, no captions (H.264, plus a VP9 fallback for browsers without H.264). |
| `ataraxos_explained_poster.jpg` | Poster frame for Video 0.1. |
| `ataraxos_manim.py` | Manim source for Video 0.1. It has five scenes, one per chapter. A headline at the top left names each beat. |
| `bluff_mmd.py` | Pure-Python self-play with magnetic mirror descent on the bluff game. Section 4.3 shows its output. |

## Regenerating the video

`ataraxos_manim.py` uses **Manim Community Edition** (`from manim import *`), not the
3b1b `manimgl` that the rest of this repository uses. It was made with the
[manim-skill](https://github.com/Yusuke710/manim-skill) pipeline, without the voice and
subtitle steps.

```bash
ATA_QUALITY=final manim ataraxos_manim.py Scene1_Hidden Scene2_Bluff Scene3_Damping Scene4_Search Scene5_Results
# list the five scene files in concat.txt, then:
ffmpeg -f concat -safe 0 -i concat.txt -an -c:v copy -movflags +faststart ataraxos_explained.mp4
ffmpeg -i ataraxos_explained.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 ataraxos_explained.webm
```

Each scene is a list of timed beats (`self.beat(seconds)`). A beat ends at its exact
planned time, so frame rounding does not add up, and the chapter times in the page stay
correct. Without `ATA_QUALITY=final`, the script renders a 480p15 draft.

## The figures

The page script has one function per figure, `sceneBluff`, `sceneDynamics` and so on.
Each one draws its objects once and returns `frame(t)`, which sets every changing
attribute from the time `t` alone. `makeStage` adds the player: autoplay while the
figure is on screen, a pause button, a time bar with beat marks, and a full-screen button.
