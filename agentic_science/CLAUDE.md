# Agent instructions for agentic_science/

This folder is a self-testing, single-page course: "Agentic Science, Worked".
The conventions below load with this file, so they survive compaction.

@CONVENTIONS.md

## Rules

1. Run `node tests/verify.js` before every commit. Do not commit if any group fails.
2. Rebuild after any change in `src/` or `results/`: `node tools/build.mjs` (needs `npm install` once, for KaTeX).
3. Do not edit `dist/index.html` by hand. It is a build product.
4. Keep science in `src/js/kernel.js` and `src/js/lab.js`. Keep `src/js/ui.js` free of science.
5. A change to `kernel.js` or `lab.js` changes the source hash. Run the verification again so the page and the recorded run agree.
6. Label every new statement on the page: Reported, Proposed or Computed. Copy quotes exactly; never paraphrase inside quotation marks.
7. Never claim that a source used the Git or file layout that this page proposes.
8. Update `STATUS.md` at the end of a working session.
