# The Tree and the Agent

A narrated, 3Blue1Brown-style animated explainer (about 20 minutes) built with
plain JavaScript and SVG. It explains, from zero, how to do science with AI
agents and how to know when the science is right, through one phylogenetics
puzzle: four DNA sequences, three possible trees, and the long-branch trap.

Open `dist/index.html`. It is one self-contained file. With `dist/narration.mp3`
next to it, the narration plays as the clock of the video. Without it, the video
plays with captions only.

## Chapters

1. **The question.** What an AI agent is; what Schwartz reports; the two problems.
2. **The puzzle.** DNA, sites, branch length, three trees, parsimony, maximum
   likelihood, long-branch attraction, and why more data makes it worse.
3. **Isolation protects work.** Six places where work lives; worktrees; context
   as a desk; compaction; runs and manifests; tool, skill, agent, hook, harness.
4. **Evidence supports claims.** A lost unit convention; two methods that agree
   and are both wrong; the ladder of independence; mutation testing.
5. **Correct code, wrong science.** Invariant sites, goodness of fit, a better model.
6. **Putting it together.** One research week; stale-by-default task graphs; claims.
7. **The two sentences.** Recap.

## How it is made

| Path | Role |
|---|---|
| `src/js/engine.js` | A small Manim-style engine: mobjects with plain props, animations as functions of progress, a camera, beats, scenes, chapters. Every frame is a pure function of time. |
| `src/js/scenes.js` | The script: each beat is one narration line plus its animations. On-screen numbers come from the QUARTET science code (`../src/js/kernel.js`, `../src/js/lab.js`). |
| `src/js/player.js` | Player: the narration track is the clock; scrubber, chapters, captions, transcript, keyboard. `?export` turns it into a frame server for rendering. |
| `tools/build.mjs` | Inlines MathJax (SVG paths, so equations can be written stroke by stroke), the Computer Modern fonts and all code into `dist/index.html`. |
| `tools/narrate.mjs` | Exports the script, synthesizes each line with Piper TTS (`tts.py`), re-times every beat to the real clip lengths, mixes one track (`mix.py`), encodes `dist/narration.mp3`. |
| `tools/render-mp4.mjs` | Frame-exact MP4 render: parallel headless Chromium workers seek, screenshot and pipe into x264; then the narration is muxed in. |
| `narration/*.json` | The exported script, the measured clip durations and the resulting schedule. |

## Rebuild

```bash
cd agentic_science
npm install                                  # KaTeX fonts + MathJax
node video/tools/build.mjs                   # dist/index.html (captions only)

# narration (needs: pip install piper-tts numpy; playwright; ffmpeg)
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
node video/tools/narrate.mjs --model en_US-lessac-medium.onnx
node video/tools/build.mjs                   # now with narration

node video/tools/render-mp4.mjs --workers 3  # dist/the-tree-and-the-agent.mp4
```

`narration.mp3` and the MP4 are build products and are not committed.

## Checks done on this build

- All 136 narration lines were transcribed back with Whisper (base.en). Word
  error rate 6.2%, most of it number formatting (“2026” against “twenty
  twenty-six”). Lines that came out unclear were rewritten in plainer words.
- Every narrated beat was rendered to a still and reviewed for overlaps.
- Quotes from Schwartz were checked against the text of the source articles.
- The mixer asserts that no narration line runs past the end of its beat.
