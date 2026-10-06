# CONVENTIONS — Project QUARTET

One word, one meaning. Change a convention only with a commit that also
updates the code, the tests and this file, and then run `node tests/verify.js`.
Every result produced before the change is stale until it runs again.

## Science

| ID  | Convention | Where it is enforced |
|-----|------------|----------------------|
| C-1 | **Branch length** is the expected number of substitutions per site. For JC69 this fixes the rate constant at `mu = 4/3`, so `P_same(t) = 1/4 + 3/4 exp(-4t/3)`. | `kernel.js` `CONVENTIONS.mu`; checks C9, C10, C11 |
| C-2 | Bases are the integers 0..3 for A, C, G, T. | `kernel.js` `CONVENTIONS.alphabet` |
| C-3 | Taxa are the integers 0..3 for A, B, C, D. | `kernel.js` `CONVENTIONS.taxa` |
| C-4 | Topologies: T1 = AB\|CD, T2 = AC\|BD, T3 = AD\|BC. The true tree in every scenario is T1. | `kernel.js` `TOPOLOGIES`; `lab.js` `felsensteinTree` |
| C-5 | A tree is `{ topo, t }` with `t = [tA, tB, tC, tD, tInternal]`. | `kernel.js` |
| C-6 | With a proportion `pInv` of invariant sites, branch lengths keep the C-1 unit, averaged over **all** sites. Variable sites evolve at rate `1/(1 - pInv)`. Fits report lengths in the C-1 unit. | test group G11 |
| C-7 | Exact comparisons accept `|f - g| <= a + r|g|` with `a = 1e-15`, `r = 1e-10` unless a check states otherwise. Statistical comparisons accept 4 standard errors. Model adequacy rejects at `p < 1e-3`. | `lab.js` `CHECKS`, `adequacy` |
| C-8 | Every replicate seed is `deriveSeed(baseSeed, n, replicate)`. The base seed of recorded runs is 20261006. | `lab.js` `studyJobs` |
| C-9 | The kernel is pure: no DOM, no clock, no randomness. Randomness lives in `lab.js` behind explicit seeds. | code review |

## Provenance labels on the page

| Label | Meaning |
|-------|---------|
| **Reported** | A cited source states it. Quotes are exact and were checked against the source text. |
| **Proposed** | Our teaching adaptation. Nobody in the sources did exactly this. |
| **Computed** | Code on the page, or the recorded verification run, produced it. |

## Writing (about half ASD-STE100)

- Procedural sentences: 20 words or fewer, imperative verb first, one instruction each.
- Descriptive sentences: 25 words or fewer. Active voice. Simple tenses.
- Warnings and cautions start with the command, then give the reason.
- Paragraphs: six sentences or fewer, one topic.
- Use the glossary terms in `src/js/course.js` (`GLOSSARY`) and no synonyms for them.
