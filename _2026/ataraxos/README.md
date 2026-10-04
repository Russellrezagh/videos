# Decisions in the Dark, explorable

An adaptive textbook chapter on the Ataraxos paper (Nature, 2026,
[s41586-026-11036-y](https://www.nature.com/articles/s41586-026-11036-y)): how a
self-play system learned to beat the world's best Stratego player.

It starts from first principles: what a game is, perfect and complete information,
mixed strategies, Nash equilibrium, exploitability and Bayesian beliefs. Then it
covers the history from von Neumann to DeepNash, damped self-play with magnetic mirror
descent, the belief network and search as one update, and the results.

One semantic model is shared by the prose, the MathJax equations, the SVG/JavaScript
labs and a narrated Manim video, with the same colours. That model holds public and
hidden information, policy, belief, value, the knobs η, α and β, and one toy model,
the bluff game. The prose follows the writing rules of ASD-STE100 (Simplified
Technical English) at about 80%. The page measures its own conformance live in
Appendix B.

| File | What it is |
|------|------------|
| `ataraxos_explorable.html` | The chapter. Open it in a browser. Video 0.1 needs the `ataraxos_explained.*` files next to it. |
| `ataraxos_explained.mp4`, `ataraxos_explained.webm` | Video 0.1, 2 min 47 s, 720p30 (H.264, plus a VP9 fallback for browsers without H.264). |
| `ataraxos_explained.vtt`, `ataraxos_explained_poster.jpg` | Captions and poster frame for Video 0.1. The page loads the same captions from inline data. |
| `ataraxos_manim.py` | Manim source for Video 0.1. It has five scenes, one per chapter of the video. |
| `ataraxos_narration.txt` | The spoken lines. Each line is one TTS clip and one caption. |
| `bluff_mmd.py` | Pure-Python self-play with magnetic mirror descent on the bluff game. Section 4.3 shows its output. |

## Regenerating the video

`ataraxos_manim.py` uses **Manim Community Edition** (`from manim import *`), not the
3b1b `manimgl` that the rest of this repository uses. The video comes from the
[manim-skill](https://github.com/Yusuke710/manim-skill) pipeline. The steps are:
narration, local Kokoro TTS, code timed to the measured audio, subtitle lint, render
and mux.

```bash
TOOLS=<manim-skill>/skills/manim-skill/tools
python "$TOOLS/tts-generate.py" --narration ataraxos_narration.txt   # voiceover.mp3 + timestamps.json
python "$TOOLS/lint-subtitles.py" ataraxos_manim.py                  # timing check, no rendering
ATA_QUALITY=final manim ataraxos_manim.py Scene1_Hidden Scene2_Bluff Scene3_Damping Scene4_Search Scene5_Results
# then concatenate the scenes, mux them with voiceover.mp3 (see the skill's SKILL.md), and make the fallback:
ffmpeg -i video.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -c:a libopus -b:a 64k video.webm
```

The script writes each line's duration from `timestamps.json` as a literal in
`self.seg(text, duration)`. Each segment ends at its exact audio time, so frame
rounding does not add up across the video. If you change a narration line,
regenerate the TTS and update the matching duration before you render. Without
`ATA_QUALITY=final`, the script renders a 480p15 draft.
