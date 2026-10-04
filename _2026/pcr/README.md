# The Polymerase Chain Reaction, explorable

An adaptive textbook chapter on PCR. One semantic model of the reaction (template,
primers, polymerase, efficiency `E`, threshold cycle `Ct`, ...) is rendered as prose,
MathJax equations, SVG/JavaScript figures and a narrated Manim video, all with the
same colours and geometry.

| File | What it is |
|------|------------|
| `pcr_explorable.html` | The chapter. Open it in a browser; Video 3.1 needs the `pcr_explained.*` files beside it. |
| `pcr_explained.mp4`, `pcr_explained.webm` | Video 3.1, 1 min 49 s, 720p30 (H.264 and a VP9 fallback for browsers without H.264). |
| `pcr_explained.vtt`, `pcr_explained_poster.jpg` | Captions and poster frame for Video 3.1. |
| `pcr_manim.py` | Manim source for Video 3.1: five scenes, one per chapter of the video. |
| `pcr_narration.txt` | The spoken lines. Each line is one TTS clip and one caption. |
| `pcr_branching.py` | Branching-process simulation whose output appears in section 5.7. |

## Regenerating the video

`pcr_manim.py` uses **Manim Community Edition** (`from manim import *`), not the 3b1b
`manimgl` used by the rest of this repository. It was made with the
[manim-skill](https://github.com/Yusuke710/manim-skill) pipeline: narration, then local
Kokoro TTS, then code timed to the measured audio, then subtitle lint, render and mux.

```bash
TOOLS=<manim-skill>/skills/manim-skill/tools
python "$TOOLS/tts-generate.py" --narration pcr_narration.txt   # voiceover.mp3 + timestamps.json
python "$TOOLS/lint-subtitles.py" pcr_manim.py                  # timing check, no rendering
PCR_QUALITY=final manim pcr_manim.py Scene1_Problem Scene2_OneCycle Scene3_ExactCopy Scene4_Counting Scene5_LogLine
# then concatenate the scenes, mux with voiceover.mp3 (see the skill's SKILL.md), and for the fallback:
ffmpeg -i video.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -c:a libopus -b:a 64k video.webm
```

The per-line durations from `timestamps.json` are written into `pcr_manim.py` as
literals, so if you change a narration line, regenerate the TTS and update the
matching `dur = ...` value before rendering. Without `PCR_QUALITY=final` the script
renders a 480p15 draft.
