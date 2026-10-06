# Handoff / current state                       (agentic_science, 6 October 2026)

Goal:                    A public, self-testing HTML/JS course on agentic science,
                         built on one computational-biology project (QUARTET).
Allowed paths:           agentic_science/ only.
Source identity:         science source hash 5722de84b7201451c3fabe5cd4b574c1144e18d0e22f793c97432a671dcfefb9
Working directory:       branch claude/agentic-science-html-demo-edmam9
Conventions:             CONVENTIONS.md (C-1 … C-9), imported by CLAUDE.md
Commands executed:       node tests/verify.js; node tools/build.mjs
Recorded run:            results/verification.json, run 20261006T060056Z_dcda0e1a, 16/16 groups passed
Observed checks:         M0 passes C1–C11; M1 rejected only by C9–C11; M4 only by C8;
                         M2 by C5 and C8; M3 at rung 1. Browser (Chromium 141) reproduces
                         recorded studies A (30/30 fractions) and B (45/45) exactly and
                         matches all 55 mutation verdicts.
Visual checks:           Chromium at 1440 px and 390 px, light and dark; no console errors;
                         no horizontal page overflow.
What has NOT been tested: Firefox and Safari rendering (MathML and canvas fonts);
                         screen-reader navigation of the SVG plates; very old browsers.
Open issue:              none blocking.
Next action:             If the kernel or lab changes, run the verification again and rebuild.
