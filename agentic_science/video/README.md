# The Tree and the Agent

A narrated animated explainer (about 21 minutes), drawn as a field notebook and
built with plain JavaScript and SVG. It explains, from zero, how to do science
with AI agents and how to know when the science is right, through one
phylogenetics puzzle: four DNA sequences, three possible trees, and the
long-branch trap.

Open `dist/index.html` and press play. The narration (`dist/narration.mp3`, next
to the page) is the clock of the video, so picture and voice cannot drift. For a
host that serves one file only, `build.mjs --embed-audio` (or `--fragment`) puts
the voice inside the page as base64; the player then needs no file host at all.

The player tries its voice sources in order (embedded bytes as a `blob:` URL, the
same bytes as a `data:` URI, then `narration.mp3`) and moves to the next one when
a content policy refuses a source, a source cannot seek, or it does not start
within 12 s. When no source can play, the status line says so and the video
runs with captions. Keys: Space, ← →, J L, C captions, M mute, F full screen,
1–7 chapters.

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
| `src/js/engine.js` | A small Manim-style engine: mobjects with plain props, animations as functions of progress, a camera, beats, scenes, chapters, overlays. Every frame is a pure function of time. Also the inks, the type roles, the line boil, the rubber stamp and the hand lens. |
| `src/js/notebook.js` | The film's one world: the seeded paper, the margin tree (the motif), Darwin's sketch, the page turn, the page numbers and the paper titles in the corner. |
| `src/js/scenes.js` | The script: each beat is one narration line plus its animations. On-screen numbers come from the QUARTET science code (`../src/js/kernel.js`, `../src/js/lab.js`). |
| `src/js/player.js` | Player: the narration track is the clock; scrubber, chapters, captions, transcript, keyboard. `?export` turns it into a frame server for rendering. |
| `tools/build.mjs` | Inlines MathJax (SVG paths, so equations can be written stroke by stroke), the Computer Modern fonts and all code into `dist/index.html`. |
| `tools/narrate.mjs` | Exports the script, speaks each line (`tts.py`: Kokoro-82M by default, Piper as a fast fallback), re-times every beat to the real clip lengths, mixes one track (`mix.py`), encodes `dist/narration.mp3`. |
| `tools/check-av.mjs`, `tools/check_av.py` | End-to-end check of the real page: presses Play, records what the narration element outputs, transcribes it with Whisper and checks every spoken word against the line on screen at that moment, plus picture–voice clock drift. |
| `tools/render-mp4.mjs` | Frame-exact MP4 render: parallel headless Chromium workers seek, screenshot and pipe into x264; then the narration is muxed in. |
| `tools/words.py` | Word onsets for every clip (faster-whisper), so a stamp or a pencil mark lands on the spoken word. Cached per clip. |
| `narration/*.json` | The exported script, the measured clip durations, the word onsets and the resulting schedule. |

## Rebuild

```bash
cd agentic_science
npm install                                  # KaTeX, MathJax, the OFL fonts
node video/tools/build.mjs                   # dist/index.html (captions only)

# narration (needs: pip install kokoro-onnx numpy faster-whisper; playwright; ffmpeg)
R=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -LO $R/kokoro-v1.0.onnx -LO $R/voices-v1.0.bin
node video/tools/narrate.mjs --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice af_heart --speed 0.95
#   (fast fallback: --engine piper --model en_US-lessac-medium.onnx)
node video/tools/build.mjs                   # now with narration
node video/tools/build.mjs --fragment out.html  # one file, voice embedded (about 14 MB)

node video/tools/render-mp4.mjs --workers 3  # dist/the-tree-and-the-agent.mp4
node video/tools/check-av.mjs                # voice plays, in step with the picture
node video/tools/lint-layout.mjs             # every beat against the design rules
```

`dist/narration.mp3` is committed so that a clone plays with its voice. The MP4
is a build product and is not committed.

## The look: a field notebook

The film follows the "field notebook" direction of the
[dont-go-quiet-on-me](https://github.com/neelnanda-io/dont-go-quiet-on-me/tree/main/skills)
video skills, kept to TED-Ed restraint: one idea per frame, flat shapes,
generous space. No code is taken from that repository; the rules are its
written guidance, rebuilt here.

| Element | What it is |
|---|---|
| One world | Ink and watercolour on graph paper. The paper is painted once from a seed (mottle, fibres, flecks, a 40 px grid) and never moves; a grain layer multiplies over the ink. No pure black or white. |
| Inks | Indigo, vermilion, ochre, teal, sap green, sepia and pencil, chosen to read on paper at small sizes. DNA letters keep one ink each. |
| Type | Instrument Serif for headlines, Fraunces for text, Shantell Sans for marginal notes, Caveat for real handwriting (Darwin, page numbers), IBM Plex Mono for data. All OFL, embedded. |
| Line boil | Like hand-drawn animation, lines are redrawn 12 times a second from 4 poses (about a pixel of movement). Text stays still. |
| Hook | A silent cold open: Darwin's 1837 "I think" tree, redrawn with the layout of Notebook B, p. 36 (root 1 bottom left, D left, B and C top, A right). The agent then stamps VERIFIED on its own tree. |
| Motif | A tree in the top-left margin with one continuous parameter, the chapters told so far. It is sketched in pencil from the start and inked one branch per chapter; the agent climbs to the newest tip. On the last page it returns, fully inked, signed "I think". |
| Transitions | A page turn into every chapter card (same composition each time); a hand-lens iris for every zoom; fades everywhere else; a slow 1.2 % push-in on every scene. |
| The stamp | The thread through the film: VERIFIED as an overclaim (opening), VERIFIED struck out when two methods share one bug (chapter 4), then SUPPORTED, REJECTED and NOT TESTED used honestly on the claims (chapter 6). |
| Papers | The paper or record behind a beat appears as its title only, small, bottom left. Full references are listed under the player, generated from the same records (`INSERTS` in `scenes.js`). Each was checked against the source itself. |
| Felsenstein zone | In the long-branch beat, the classic four-taxon map is computed live: for 576 pairs of branch lengths, the tree parsimony picks from exact infinite-data site frequencies. Our tree sits inside the zone. |

## Design rules

All sizes are in 1080p units and live in one object, `STYLE` in `src/js/engine.js`.
The web player shows the frame at about 1/2 (desktop) to 1/5 (phone) of that
size, so the rules set floors, not just defaults:

| Token | Value | Why |
|---|---|---|
| strokes | floor 4 px; fine structure 4–5 px, marks to follow 6–7 px | a 2–3 px line vanishes at 1/3 scale |
| type | floor 30 px; labels 34, body 40, titles 54 | 22 px labels were unreadable in the player |
| safe area | 60 px side margin; pictures end above y = 385 | the caption band below is reserved |
| subtitles | at most two lines, half the frame wide, in chunks timed by their share of the clip; under the picture on phones | three-line captions covered the plots; the corners stay free for paper titles and page numbers |

`tools/lint-layout.mjs` checks the rendered frames against the same numbers:
every narrated beat at its middle and its end, for content off the safe area,
content under the caption, overlapping text, small text and thin lines. The
design pass took it from 723 thin lines, 136 small texts, 55 caption
collisions and 5 overlaps to none. The rules follow the review method of the
making-explainer-videos skill (Neel Nanda, `dont-go-quiet-on-me`): contact
sheets at each beat's middle and end, full-resolution crops of text, and the
right edge checked on every frame.

## The voice

The narration is spoken by [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)
(Apache-2.0), voice `af_heart`, at 0.95× speed (about 156 words a minute), run
locally on a CPU through [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx).
The track is levelled to −17 LUFS.

Why Kokoro: it is the open model most often ranked first for natural speech per
unit of compute, it needs no GPU, and its licence allows any use. The choice and
the method (one clip per line, so every line's start time is exact, and a cache
keyed by the model's fingerprint) follow the
[anything2explainer](https://github.com/FavorPan/anything2explainer) Claude Code
skill, which uses Kokoro for English narration. No code is copied from it (its
licence is noncommercial); `tools/tts.py` is written for this project.

Voices were auditioned on the ten hardest lines (names, terms, numbers), each
transcribed back with Whisper small.en. All six Kokoro voices tried were as
intelligible as Piper (2.8–5.6 % word errors with number formatting ignored,
Piper 5.2 %); `af_heart` was chosen because Kokoro grades it highest for
naturalness. Swap it with `--voice am_michael` (or any Kokoro voice) and run
`narrate.mjs` again: every beat re-times itself to the new clips.

## Checks done on this build

- All 136 narration lines were transcribed back with Whisper (small.en): see
  `STATUS.md` for the word error rate. (The earlier Piper build: 6.2 % with
  base.en, mostly number formatting.)
- `tools/check-av.mjs` on the real page: the voice plays, every spoken word in
  three windows (opening, chapter 3, recap) matches the line on screen (99–100 %),
  and picture and voice stay within 17 ms. The same check passes on the
  single-file page with the voice embedded, served the way the artifact host
  serves it, including when the host refuses `blob:` media.
- Notebook cut: the layout linter passes on all 344 measured frames (overlays
  included); every beat was reviewed on contact sheets at its middle and end;
  `check-av` passes in four windows (cold open, chapter 2, chapter 4, recap),
  99–100 % of words on screen, picture–voice drift at most 95 ms; the page
  plays at 60 fps in headless Chromium at 1366 and 390 px wide, with no
  horizontal overflow and no console errors.
- Every narrated beat was rendered to a still and reviewed for overlaps.
- Quotes from Schwartz were checked against the text of the source articles.
- The mixer asserts that no narration line runs past the end of its beat.
- Voice playback was tested in Chromium under five content policies (none,
  `blob:` only, `data:` only, `'self'` only, no media at all), with play pressed
  before any buffering, pause → chapter jump → play, mute, 1.25× speed, the end
  of the video, and the local `file://` build.
