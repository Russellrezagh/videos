# Agentic Science, Worked

A self-testing interactive course on how to do science with AI agents.
One computational-biology project, **Project QUARTET**, carries every idea:
worktrees, context, runs, tools, skills, hooks, harnesses, checks and claims.

**New to the topic? Start with the video.** [`video/`](video/) holds *The Tree
and the Agent*, a narrated, 3Blue1Brown-style animated explainer (about 20
minutes) that builds the same ideas from zero, one at a time.

**Open [`dist/index.html`](dist/index.html) in a browser** for the interactive course. It is one
self-contained file (about 300 KB) with no runtime dependencies. Google Fonts
load if the network allows; otherwise system fonts are used.

## What the page teaches

The question: *four DNA sequences, three possible trees. Which tree do the data
support, and how sure can we be?* Two of the four lineages evolve fast, so the
problem sits in the Felsenstein zone, where parsimony is consistently wrong
(long-branch attraction). The project then becomes a worked example of agentic
research engineering:

| Chapter | Idea | Interactive part |
|---|---|---|
| 1 | Domain model first: 15 entities of agentic science | Plate 2, explorable diagram |
| 2 | The science: JC69, pruning, parsimony, 15 pattern classes | Live simulated alignment |
| 3 | Six kinds of state, and what each mechanism isolates | 16 × 6 isolation matrix |
| 4 | Git worktrees, step by step, including the runtime collision | 7-step stepper |
| 5 | Choose the smallest adequate mechanism | 9 scenarios |
| 6 | Context is a desk, not a library; ask / enforce / verify | Lab 0: a convention lost at compaction |
| 7 | One revision, many runs; manifests | The real recorded manifest |
| 8 | Tool, skill, agent, hook, harness, scientist | A SKILL.md example |
| 9 | The ladder of independence; mutation testing | Labs 1–2: 11 checks × 5 kernels, live |
| 10 | The result: more data, more confidence, wrong tree | Labs 3–4: zone map, study harness with run ledger |
| 11 | Correct code, wrong science: model adequacy | Lab 5: G-test, JC69 vs JC69+I |
| 12 | The research week; stale-by-default task graphs | Lab 6: invalidation propagation |
| 13 | Claims with evidence and limits | Claim ledger |
| 14 | Twelve mental models, exercises, glossary | — |

Every statement on the page carries a label: **Reported** (a cited source states
it; quotes are exact), **Proposed** (our teaching adaptation), or **Computed**
(code produced it).

## Verify it yourself

```bash
node tests/verify.js          # 16 check groups, no dependencies; writes results/verification.json
npm install                   # once: KaTeX, for build-time equation rendering
node tools/build.mjs          # writes dist/index.html
```

The verification run hashes the source text of the science code (SHA-256 of
`quartetKernelFactory` and `quartetLabFactory`). The page hashes the same source
again in the browser and shows whether the two hashes match. The page can also
re-run the recorded consistency studies and compare every fraction.

## Files

| Path | Role |
|---|---|
| `src/js/kernel.js` | JC69 quartet model, two independent likelihood routes, four mutants, parsimony, ML fit |
| `src/js/lab.js` | Event simulator, checks C1–C11, mutation matrix, studies, G-test, SHA-256, manifests |
| `src/js/course.js` | The course's domain model as data (entities, mechanisms, scenarios, tasks, claims) |
| `src/js/ui.js` | Rendering and interaction only; no science |
| `src/index.html`, `src/css/style.css` | Page source |
| `tests/verify.js` | The verification run |
| `tools/build.mjs` | Inlines everything; renders TeX to MathML |
| `results/verification.json` | The recorded run manifest embedded in the page |
| `CONVENTIONS.md`, `CLAUDE.md`, `STATUS.md` | The project's own conventions, agent instructions and handoff |

## Scope and limits

- All sequence data are simulated. No real organism is analysed.
- Four taxa; JC69 and JC69+I only. Real phylogenetics uses richer models.
- The research week is a constructed teaching story. The sources describe the
  physicists' own practices; they do not use this file layout.
- Sources: M. D. Schwartz, *Vibe physics* (Anthropic, March 2026) and *Claude-shaped
  science* (Anthropic, October 2026); S. Mishra-Sharma, *Long-running Claude for
  scientific computing* (Anthropic, March 2026); Felsenstein 1978 and 1981;
  Jukes & Cantor 1969; Fitch 1971; Claude Code documentation. Full list on the page.
