/*
 * Course model
 * ------------
 * The domain model of agentic science work, written as data before any
 * page code. The page renders it; tests/verify.js checks its integrity
 * (every mechanism covers every kind of state, every scenario answer names
 * a real mechanism, the task graph has no cycles, every claim cites
 * evidence that exists).
 *
 * Writing rule for all strings: about half ASD-STE100. Short sentences.
 * Active voice. One word for one meaning (see GLOSSARY).
 */
function courseModelFactory() {
  'use strict';

  /* ---------- Entities of the domain ---------- */
  const ENTITIES = Object.freeze([
    { id: 'question', name: 'Question', lives: 'evidence', def: 'The scientific problem that the project must answer. The scientist owns it.', ex: 'Which of the three quartet trees do the four sequences support?' },
    { id: 'convention', name: 'Convention', lives: 'source', def: 'A fixed definition that every task uses: units, symbols, labels, tolerances.', ex: 'Branch length is expected substitutions per site, so mu = 4/3.' },
    { id: 'task', name: 'Task', lives: 'source', def: 'A bounded unit of work with inputs, owned paths, acceptance criteria and dependencies.', ex: 'T04: write the brute-force likelihood route.' },
    { id: 'agent', name: 'Agent', lives: 'context', def: 'A model in a harness. It selects actions inside a task contract.', ex: 'A subagent that writes the pruning route.' },
    { id: 'context', name: 'Context', lives: 'context', def: 'What the agent can see now. It is transient. It is not the file system.', ex: 'CONVENTIONS.md, the task contract, the last failed check.' },
    { id: 'workspace', name: 'Workspace', lives: 'files', def: 'The checkout where an agent edits files: its own HEAD, index and working files.', ex: 'The worktree ../q-brute on branch kernel/brute.' },
    { id: 'revision', name: 'Revision', lives: 'source', def: 'One identified state of the source: a commit, or a commit plus a recorded diff.', ex: 'Commit 3f9c2e1, or the source hash on this page.' },
    { id: 'environment', name: 'Environment', lives: 'execution', def: 'The packages, runtime, permissions and resources that a run uses.', ex: 'Node 22, no network, one CPU core.' },
    { id: 'run', name: 'Run', lives: 'artifacts', def: 'One execution of a revision in an environment, with inputs and a seed.', ex: 'Consistency study, seed 20261006, 200 replicates.' },
    { id: 'manifest', name: 'Manifest', lives: 'artifacts', def: 'The record that identifies a run: source hash, command, parameters, seed, environment.', ex: 'results/verification.json' },
    { id: 'check', name: 'Check', lives: 'evidence', def: 'A test of one property, with a tolerance and a rung of independence.', ex: 'C10: the published Jukes-Cantor distance gives back t.' },
    { id: 'evidence', name: 'Evidence', lives: 'evidence', def: 'A check result or run output that is linked to a claim.', ex: 'ML picks AB|CD in 200 of 200 replicates at n = 3000.' },
    { id: 'claim', name: 'Claim', lives: 'evidence', def: 'A statement with a status, its evidence and its limits.', ex: 'Parsimony converges to the wrong tree in scenario A.' },
    { id: 'handoff', name: 'Handoff', lives: 'context', def: 'A durable restart record: goal, revision, evidence, open issue, next action.', ex: 'STATUS.md at the end of day 3.' },
    { id: 'scientist', name: 'Scientist', lives: 'evidence', def: 'The person who sets the question, approves conventions and judges claims.', ex: 'Decides that real data need a rate-variation model.' },
  ]);

  const RELATIONS = Object.freeze([
    ['scientist', 'question', 'sets'],
    ['scientist', 'convention', 'approves'],
    ['scientist', 'claim', 'judges'],
    ['question', 'task', 'splits into'],
    ['convention', 'task', 'constrains'],
    ['task', 'agent', 'is given to'],
    ['agent', 'context', 'sees'],
    ['agent', 'workspace', 'edits in'],
    ['workspace', 'revision', 'commits'],
    ['handoff', 'task', 'records state of'],
    ['revision', 'run', 'is executed by'],
    ['environment', 'run', 'hosts'],
    ['run', 'manifest', 'writes'],
    ['run', 'check', 'feeds'],
    ['check', 'evidence', 'produces'],
    ['evidence', 'claim', 'supports'],
    ['claim', 'question', 'answers'],
  ]);

  /* ---------- Six kinds of state ---------- */
  const STATES = Object.freeze([
    { id: 'source', name: 'Source history', where: 'Git objects and references', ex: 'Commit 3f9c2e1: "kernel: pruning route"', keeps: 'Commits, branches, remotes' },
    { id: 'files', name: 'Working files', where: 'A checkout and its staging index', ex: 'An uncommitted edit to kernel.js', keeps: 'Worktrees, deliberate commits' },
    { id: 'context', name: 'Agent context', where: 'The active context window of one session', ex: 'The rate convention, the open mismatch, the next step', keeps: 'Instruction files, handoffs, targeted reads' },
    { id: 'execution', name: 'Execution state', where: 'Processes, environments, caches, ports, devices', ex: 'Node version, a running study, /tmp/quartet.csv', keeps: 'Lockfiles, containers, job records' },
    { id: 'artifacts', name: 'Artifacts', where: 'Run directories or object storage', ex: 'results/<run-id>/summary.json and its figure', keeps: 'Unique run IDs, hashes, retention' },
    { id: 'evidence', name: 'Scientific evidence', where: 'Claims linked to checks, derivations and reviews', ex: '"ML recovers AB|CD" with its study and checks', keeps: 'Independent checks, review, provenance' },
  ]);

  /* ---------- Mechanisms, and what each one does to each kind of state ----------
   * Cell values: sep = gives a separate copy; rec = makes durable or
   * identifiable; shr = stays shared (a hazard to plan for); lim = limits
   * access; '' = no effect.
   */
  const MECHANISMS = Object.freeze([
    {
      id: 'session', group: 'context', name: 'New session',
      what: 'A new conversation with an empty context window.',
      use: 'A bounded task, a focused review, or a clean restart.',
      not: 'It does not give separate files. Two sessions in one directory edit the same files.',
      cells: { source: ['', ''], files: ['shr', 'Same directory, same files'], context: ['sep', 'Fresh context window'], execution: ['shr', 'Same machine and caches'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'subagent', group: 'context', name: 'Subagent',
      what: 'A delegated task that runs in its own context window and reports back.',
      use: 'Exploration or a separable task that would fill the main context.',
      not: 'File isolation depends on the workspace you assign. Give it a worktree for concurrent edits.',
      cells: { source: ['', ''], files: ['shr', 'Unless it gets a worktree'], context: ['sep', 'Own context window'], execution: ['shr', 'Same runtime'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'branch', group: 'git', name: 'Branch',
      what: 'A movable name that points to a commit.',
      use: 'One line of development in one checkout.',
      not: 'It does not give a second directory. Two writers on two branches in one checkout still collide.',
      cells: { source: ['rec', 'Names a line of commits'], files: ['', 'Same checkout'], context: ['', ''], execution: ['', ''], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'commit', group: 'git', name: 'Commit',
      what: 'A recorded tree of tracked files, with parents and a message.',
      use: 'A reviewable checkpoint of the source.',
      not: 'It does not record untracked files, data, the environment or the truth of a result.',
      cells: { source: ['rec', 'Adds an object'], files: ['rec', 'Tracked files only'], context: ['', ''], execution: ['', ''], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'stash', group: 'git', name: 'Stash',
      what: 'Temporary storage for work in progress.',
      use: 'A short interruption in one checkout.',
      not: 'It is not an experiment record. All worktrees of a repository share one stash list.',
      cells: { source: ['shr', 'One stash list per repository'], files: ['rec', 'Short term; untracked files need -u'], context: ['', ''], execution: ['', ''], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'worktree', group: 'git', name: 'Worktree',
      what: 'An extra checkout of the same repository, with its own HEAD, index and files.',
      use: 'Two or more tasks edit source at the same time.',
      not: 'It does not isolate ports, databases, caches, devices or absolute output paths. Ignored files such as .env are not copied.',
      cells: { source: ['shr', 'Shares objects and most refs'], files: ['sep', 'Own HEAD, index, files'], context: ['', ''], execution: ['shr', 'Ports, caches, /tmp, GPUs'], artifacts: ['shr', 'Unless paths are unique'], evidence: ['', ''] },
    },
    {
      id: 'clone', group: 'git', name: 'Clone',
      what: 'A separate logical repository.',
      use: 'Another machine, or an independent repository lifecycle.',
      not: 'It does not bring ignored files, data, installed packages or local services.',
      cells: { source: ['sep', 'Own refs and objects'], files: ['sep', 'Own checkout'], context: ['', ''], execution: ['', 'Recreate it there'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'env', group: 'runtime', name: 'Lockfile + environment',
      what: 'A pinned set of packages in a virtual environment.',
      use: 'Two tasks need different dependency versions.',
      not: 'It does not pin system libraries, hardware or data.',
      cells: { source: ['rec', 'Lockfile is tracked'], files: ['', ''], context: ['', ''], execution: ['sep', 'Language packages'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'container', group: 'runtime', name: 'Container',
      what: 'A packaged userspace with configured runtime limits.',
      use: 'System libraries matter, or a run must be portable.',
      not: 'It does not set every access policy by itself. It does not record which run used it.',
      cells: { source: ['', ''], files: ['', ''], context: ['', ''], execution: ['sep', 'Userspace, ports, limits'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'sandbox', group: 'runtime', name: 'Sandbox and permissions',
      what: 'Rules for what a process or tool can read, write or reach.',
      use: 'An agent runs commands without a person at every step.',
      not: 'It limits actions. It does not make the actions correct.',
      cells: { source: ['', ''], files: ['lim', 'Write scope'], context: ['', ''], execution: ['lim', 'Network and process access'], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'rundir', group: 'evidence', name: 'Run directory + manifest',
      what: 'A unique output directory with a record of how the run was made.',
      use: 'Every computation whose output you may cite.',
      not: 'It identifies a run. It does not validate the result.',
      cells: { source: ['rec', 'Source hash'], files: ['', ''], context: ['', ''], execution: ['rec', 'Environment record'], artifacts: ['sep', 'Unique path per run'], evidence: ['rec', 'Provenance'] },
    },
    {
      id: 'instructions', group: 'context', name: 'Instruction file',
      what: 'CLAUDE.md or AGENTS.md: stable project instructions that load into each session.',
      use: 'Rules and conventions that every session must see.',
      not: 'It is context, not enforcement. Use a hook or a test to enforce a rule.',
      cells: { source: ['rec', 'Tracked in Git'], files: ['', ''], context: ['rec', 'Reloads every session'], execution: ['', ''], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'handoff', group: 'context', name: 'Handoff document',
      what: 'An explicit restart contract: goal, revision, evidence, open issue, next action.',
      use: 'Before a long pause, a compaction, or a change of agent.',
      not: 'A summary points to evidence. It does not replace evidence.',
      cells: { source: ['rec', 'Names the revision'], files: ['', ''], context: ['rec', 'Restores the task state'], execution: ['', ''], artifacts: ['rec', 'Names run IDs'], evidence: ['rec', 'Links, not proof'] },
    },
    {
      id: 'memory', group: 'context', name: 'Saved memory',
      what: 'Notes that a harness keeps across sessions, such as preferences and learned commands.',
      use: 'Helpful recall of habits and preferences.',
      not: 'It is not an authoritative scientific record. Do not cite it as evidence.',
      cells: { source: ['', ''], files: ['', ''], context: ['rec', 'Helpful recall'], execution: ['', ''], artifacts: ['', ''], evidence: ['', ''] },
    },
    {
      id: 'checks', group: 'evidence', name: 'Independent checks',
      what: 'Tests at increasing independence: self-consistency, another algorithm, an external anchor.',
      use: 'Before any claim leaves the project.',
      not: 'Checks that share an assumption share its errors.',
      cells: { source: ['', ''], files: ['', ''], context: ['', ''], execution: ['', ''], artifacts: ['', ''], evidence: ['rec', 'Tests the claim'] },
    },
    {
      id: 'review', group: 'evidence', name: 'Expert review',
      what: 'A person with domain knowledge judges assumptions, relevance and limits.',
      use: 'Model choice, scope of a claim, and what is worth doing.',
      not: 'A review by the same agent with the same prompt is not independent.',
      cells: { source: ['', ''], files: ['', ''], context: ['', ''], execution: ['', ''], artifacts: ['', ''], evidence: ['rec', 'Judges the claim'] },
    },
  ]);

  /* ---------- Scenarios: choose the smallest adequate mechanism ---------- */
  const SCENARIOS = Object.freeze([
    {
      id: 's1',
      situation: 'You fix one typo in the Fitch function. Nobody else edits the code.',
      options: ['branch', 'worktree', 'clone', 'session'],
      answer: 'branch',
      why: 'One writer and one sequential change need one checkout. A worktree adds a directory to manage and gives nothing back.',
    },
    {
      id: 's2',
      situation: 'Agent A writes the pruning route. Agent B writes the brute-force route. They work at the same time.',
      options: ['branch', 'worktree', 'session', 'stash'],
      answer: 'worktree',
      why: 'Two simultaneous writers need separate working files and indexes. Give each agent a worktree, a branch and a list of owned paths.',
    },
    {
      id: 's3',
      situation: 'You need 200 replicates of the consistency study at one fixed revision.',
      options: ['worktree', 'rundir', 'clone', 'branch'],
      answer: 'rundir',
      why: 'The source does not change. Only the seed and the output change. Use one revision and one run directory with a manifest per run.',
    },
    {
      id: 's4',
      situation: 'A reviewer asks you to reproduce Figure 3 from last month.',
      options: ['rundir', 'worktree', 'memory', 'session'],
      answer: 'worktree',
      why: 'Check out the recorded revision in a detached worktree. Then recreate the environment from the manifest and run the recorded command.',
    },
    {
      id: 's5',
      situation: 'You move the study to a cluster.',
      options: ['worktree', 'clone', 'container', 'branch'],
      answer: 'clone',
      why: 'A different machine needs its own repository. Clone or fetch the revision, recreate the environment, and record the job ID.',
    },
    {
      id: 's6',
      situation: 'Two tasks need different versions of the optimizer library.',
      options: ['branch', 'env', 'session', 'stash'],
      answer: 'env',
      why: 'The files and the packages both differ. Use a worktree for the files and a separate locked environment for each set of packages.',
    },
    {
      id: 's7',
      situation: 'You want a critique of the +I derivation. Nobody edits code.',
      options: ['worktree', 'session', 'clone', 'branch'],
      answer: 'session',
      why: 'A read-only review needs a clean context, not another checkout. Give the new session the derivation and the conventions as explicit inputs.',
    },
    {
      id: 's8',
      situation: 'After a compaction, the agent seems to have lost the rate convention.',
      options: ['memory', 'instructions', 'session', 'stash'],
      answer: 'instructions',
      why: 'A convention that lives only in the conversation can disappear at compaction. Put it in the instruction file and encode it in a unit test.',
    },
    {
      id: 's9',
      situation: 'Two agents agree that the tree is AC|BD.',
      options: ['review', 'session', 'memory', 'rundir'],
      answer: 'review',
      why: 'Agreement is not independence. Run checks that do not share the assumption, and ask an expert about the model and the long branches.',
    },
  ]);

  /* ---------- The task graph of Project QUARTET (proposed workflow) ---------- */
  const TASKS = Object.freeze([
    { id: 'T01', title: 'Question and scope', owner: 'Scientist', where: 'main checkout', deps: [], accept: 'Question, data source and out-of-scope list are written.', evidence: 'README: question' },
    { id: 'T02', title: 'Conventions', owner: 'Scientist + agent', where: 'main checkout', deps: ['T01'], accept: 'Units, labels, topology names and tolerances are fixed in CONVENTIONS.md.', evidence: 'CONVENTIONS.md' },
    { id: 'T03', title: 'Pruning route', owner: 'Subagent A', where: 'worktree q-pruning', deps: ['T02'], accept: 'siteLikelihood passes rung-1 checks.', evidence: 'C1-C7' },
    { id: 'T04', title: 'Brute-force route', owner: 'Subagent B', where: 'worktree q-brute', deps: ['T02'], accept: 'Uses a numerical matrix exponential, not the closed form.', evidence: 'expm unit test' },
    { id: 'T05', title: 'Anchors from the literature', owner: 'Reviewer session', where: 'read-only session', deps: ['T02'], accept: 'Unit and distance anchors come from published formulas, not from our code.', evidence: 'C9-C11' },
    { id: 'T06', title: 'Integrate and mutation-test', owner: 'Agent', where: 'main checkout', deps: ['T03', 'T04', 'T05'], accept: 'All checks pass on M0. Every mutant fails at least one check.', evidence: 'Mutation matrix' },
    { id: 'T07', title: 'Simulator from the unit', owner: 'Subagent C', where: 'worktree q-sim', deps: ['T02'], accept: 'Events are Poisson with mean t. The simulator does not import mu.', evidence: 'simulator source' },
    { id: 'T08', title: 'Validate the simulator', owner: 'Agent', where: 'main checkout', deps: ['T06', 'T07'], accept: 'Simulated class frequencies match exact ones (G-test p > 0.001).', evidence: 'Verification run' },
    { id: 'T09', title: 'Parsimony baseline', owner: 'Agent', where: 'main checkout', deps: ['T02'], accept: 'Fitch lengths agree with hand-counted examples.', evidence: 'Fitch unit test' },
    { id: 'T10', title: 'Consistency study', owner: 'Harness', where: 'results/<run-id>/', deps: ['T06', 'T08', 'T09'], accept: 'Each run has a manifest with source hash and seed.', evidence: 'Study runs' },
    { id: 'T11', title: 'Model adequacy review', owner: 'Scientist + reviewer', where: 'read-only session', deps: ['T10'], accept: 'Goodness of fit is reported. A rate-variation model is tested.', evidence: 'G-test, scenario B' },
    { id: 'T12', title: 'Claim ledger', owner: 'Scientist', where: 'main checkout', deps: ['T10', 'T11'], accept: 'Each claim lists evidence, status and limits.', evidence: 'Claim ledger' },
  ]);

  // Everything downstream of a changed task becomes stale.
  function downstream(taskId) {
    const out = new Set();
    const visit = (id) => {
      for (const t of TASKS) {
        if (t.deps.includes(id) && !out.has(t.id)) {
          out.add(t.id);
          visit(t.id);
        }
      }
    };
    visit(taskId);
    return out;
  }

  function topoOrder() {
    const order = [];
    const done = new Set();
    const visiting = new Set();
    const visit = (id) => {
      if (done.has(id)) return;
      if (visiting.has(id)) throw new Error(`cycle at ${id}`);
      visiting.add(id);
      const t = TASKS.find((x) => x.id === id);
      t.deps.forEach(visit);
      visiting.delete(id);
      done.add(id);
      order.push(id);
    };
    TASKS.forEach((t) => visit(t.id));
    return order;
  }

  function depth(taskId) {
    const t = TASKS.find((x) => x.id === taskId);
    return t.deps.length ? 1 + Math.max(...t.deps.map(depth)) : 0;
  }

  /* ---------- Claims (the ledger) ----------
   * evidence ids refer to elements on the page (see EVIDENCE_IDS).
   * status: supported | rejected | not-tested
   */
  const CLAIMS = Object.freeze([
    { id: 'K1', text: 'The kernel computes JC69 quartet likelihoods correctly.', status: 'supported', evidence: ['mutation-matrix', 'source-identity'], limits: 'Four taxa, JC69 and JC69+I only.' },
    { id: 'K2', text: 'In scenario A, parsimony converges to the wrong tree, AC|BD.', status: 'supported', evidence: ['zone-map', 'study-A'], limits: 'Simulated data. One region of parameter space.' },
    { id: 'K3', text: 'ML under the generating model recovers the true tree and branch lengths.', status: 'supported', evidence: ['infinite-data', 'study-A'], limits: 'Requires the model that made the data.' },
    { id: 'K4', text: 'ML under JC69 fails on data with invariant sites; JC69+I repairs it.', status: 'supported', evidence: ['study-B', 'adequacy'], limits: 'One form of rate variation. Real data have more.' },
    { id: 'K5', text: 'Two agents that agree have verified a result.', status: 'rejected', evidence: ['mutation-matrix'], limits: 'Mutant M1 passes the cross-method check. Agreement shared the error.' },
    { id: 'K6', text: 'These simulations explain the history of any real taxon, such as microsporidia.', status: 'not-tested', evidence: [], limits: 'Historical context only. No real sequence data were analysed.' },
    { id: 'K7', text: 'Schwartz or Anthropic used this exact Git and file layout.', status: 'not-tested', evidence: [], limits: 'The layout is our teaching proposal. The sources describe other practices.' },
    { id: 'K8', text: 'The numbers on this page come from the code that the recorded run tested.', status: 'supported', evidence: ['source-identity'], limits: 'Only while the live hash matches the recorded hash.' },
  ]);

  const EVIDENCE_IDS = Object.freeze(['mutation-matrix', 'source-identity', 'zone-map', 'study-A', 'study-B', 'infinite-data', 'adequacy']);

  /* ---------- Twelve mental models ---------- */
  const MODELS = Object.freeze([
    { n: 1, title: 'State has layers', rule: 'Name the kind of state that changes. Isolate that layer, and only that layer.' },
    { n: 2, title: 'Isolation is not evidence', rule: 'A worktree protects files. It does not make a result true.' },
    { n: 3, title: 'Climb the ladder', rule: 'Each rung of independence catches errors that the rung below cannot see.' },
    { n: 4, title: 'Context is a desk, not a library', rule: 'Files on disk are not in context. Load what the task needs. Write down what must survive.' },
    { n: 5, title: 'Ask, enforce, verify', rule: 'Instructions ask. Hooks and permissions enforce. Checks verify. Do not confuse them.' },
    { n: 6, title: 'Conventions are code', rule: 'One word, one meaning. A convention that lives only in chat will drift.' },
    { n: 7, title: 'A run is a function', rule: 'Output = f(revision, environment, inputs, seed). Record all four.' },
    { n: 8, title: 'Stale by default', rule: 'When an upstream definition changes, mark everything downstream stale until it runs again.' },
    { n: 9, title: 'Agreement is not independence', rule: 'Two agents with the same prompt, helper and convention can share one error.' },
    { n: 10, title: 'Consistency beats confidence', rule: 'More data makes a biased method more confident, not more correct.' },
    { n: 11, title: 'Correct code, wrong science', rule: 'Every check can pass while the model is wrong. Test model adequacy.' },
    { n: 12, title: 'The scientist supplies the taste', rule: 'Agents find many tractable problems. A person decides which ones matter.' },
  ]);

  /* ---------- One word, one meaning ---------- */
  const GLOSSARY = Object.freeze([
    ['Repository', 'The Git database of commits and references for one project.'],
    ['Branch', 'A movable name that points to a commit.'],
    ['Worktree', 'A checkout with its own HEAD, index and working files. It shares the repository.'],
    ['Clone', 'A separate logical repository, often on another machine.'],
    ['Session', 'One conversation with an agent, with its own context window.'],
    ['Context', 'What the agent can see in the current model call.'],
    ['Compaction', 'The harness replaces old conversation with a shorter summary.'],
    ['Memory', 'Notes that a harness keeps across sessions. Helpful recall, not evidence.'],
    ['Instruction file', 'CLAUDE.md or AGENTS.md. Stable instructions that load into each session.'],
    ['Tool', 'A callable function with defined inputs and outputs.'],
    ['Skill', 'A written, reusable procedure, with optional scripts.'],
    ['Hook', 'A command that the harness runs at a lifecycle event. It can block an action.'],
    ['Harness', 'The system that runs the agent, its tools, its records and its routing.'],
    ['Run', 'One execution of one revision, in one environment, with inputs and a seed.'],
    ['Manifest', 'The record that identifies a run.'],
    ['Check', 'A test of one property with a stated tolerance.'],
    ['Claim', 'A statement with a status, evidence and limits.'],
    ['Branch length', 'Expected substitutions per site. In this project, never anything else.'],
  ]);

  /* ---------- Exercises ---------- */
  const EXERCISES = Object.freeze([
    { q: 'Two agents work on different branches in one directory. Are their edits isolated?', a: 'No. A branch is a name, not a directory. Both agents write the same working files and the same index. Give each agent its own worktree.' },
    { q: 'Two worktrees both write /tmp/study.csv. What happens?', a: 'The outputs collide. A worktree separates source files only. Write each run to results/<run-id>/ and record the path in the manifest.' },
    { q: 'Pruning and brute force agree to 1e-17, but the Jukes-Cantor distance check fails. What do you conclude?', a: 'Both routes share one wrong convention: the rate constant. Agreement between them cannot see it. This is mutant M1. Fix the convention, not the algorithms.' },
    { q: 'A session reports "all checks pass" and gives no run record. What is the status of the claim?', a: 'Not verified. Find or make the manifest: source hash, command, parameters, seed, environment. Then run it again.' },
    { q: 'Parsimony gives AC|BD in 100% of replicates at n = 10 000. Is the result strong?', a: 'Not with two long branches. Replicates measure sampling noise, not systematic bias. In the Felsenstein zone a biased method converges to the wrong tree with high confidence.' },
    { q: 'After compaction, the agent writes P_same(t) = 1/4 + 3/4 exp(-4t). Which check catches it, and how do you stop it next time?', a: 'C9, C10 and C11 catch it. Rung 1 and rung 2 cannot. Put the convention in the instruction file and keep the unit anchor in the test suite.' },
    { q: 'ML under JC69 picks AC|BD and every code check passes. Is the tree right?', a: 'Not necessarily. The code can be right while the model is wrong. Test model adequacy, for example with a goodness-of-fit test, and fit a model with rate variation.' },
  ]);

  /* ---------- The research week (a constructed teaching story) ---------- */
  const WEEK = Object.freeze([
    {
      day: 'Day 0', title: 'Frame the question',
      did: 'The scientist writes the question and the out-of-scope list. The agent drafts CONVENTIONS.md and a task graph. The scientist approves both.',
      mech: ['instructions', 'commit'],
      why: 'Conventions come before code. Every later check depends on one meaning for "branch length".',
      out: 'CONVENTIONS.md, TASKS.md, commit 1',
    },
    {
      day: 'Day 1', title: 'Split the work',
      did: 'Two subagents write the pruning route and the brute-force route, each in its own worktree. A read-only session writes anchors from the literature.',
      mech: ['subagent', 'worktree', 'session'],
      why: 'Concurrent edits need separate files. The anchors need a separate mind, so they come from published formulas, not from our code.',
      out: 'Branches kernel/pruning and kernel/brute; checks C1-C11',
    },
    {
      day: 'Day 2', title: 'Run the baseline',
      did: 'The harness runs parsimony on simulated data. It writes one directory and one manifest per run. Parsimony picks AC|BD in every replicate.',
      mech: ['rundir', 'env'],
      why: 'Output must be traceable to revision, environment, inputs and seed. A confident result is a reason to check the method, not to stop.',
      out: 'Runs with manifests; draft claim "AC|BD"',
    },
    {
      day: 'Day 3', title: 'Lose a convention',
      did: 'A long session compacts. The rate convention lived only in the chat. The agent refactors P(t) with mu = 4. Both routes share the constant, so C8 passes. C9, C10 and C11 fail.',
      mech: ['instructions', 'checks', 'handoff'],
      why: 'Compaction drops conversation details. Files survive. The unit anchor catches the drift. The fix moves the convention into the instruction file.',
      out: 'Fix commit; downstream runs marked stale and run again',
    },
    {
      day: 'Day 4', title: 'Review with fresh eyes',
      did: 'A new reviewer session reads only the handoff and the evidence. It names long-branch attraction. ML recovers AB|CD. The scientist asks about invariant sites.',
      mech: ['session', 'review'],
      why: 'A reviewer who did not write the code is less likely to share its assumptions. The model question needs domain taste.',
      out: 'Scenario B; goodness-of-fit test rejects JC69',
    },
    {
      day: 'Day 5', title: 'Write the claims',
      did: 'The scientist writes the claim ledger: each claim with status, evidence and limits. The agent writes a handoff for next week.',
      mech: ['handoff', 'review'],
      why: 'A claim without limits is an advertisement. The handoff lets the next session start from evidence, not from memory.',
      out: 'Claim ledger; STATUS.md',
    },
  ]);

  /* ---------- Tool, skill, agent, hook, harness, scientist ---------- */
  const ROLES = Object.freeze([
    { id: 'tool', name: 'Tool', does: 'Computes a defined result from explicit inputs.', ex: 'fit(counts, topology) returns branch lengths and log-likelihood.', fail: 'Wrong inputs give confident wrong outputs.' },
    { id: 'skill', name: 'Skill', does: 'Describes a reusable procedure, with checks and a report format.', ex: 'consistency-study: fix revision, choose n and replicates, seed, run, report with intervals.', fail: 'A procedure is followed only when it loads into context.' },
    { id: 'agent', name: 'Agent', does: 'Chooses actions inside a bounded task contract.', ex: 'Find why parsimony and ML disagree on scenario A.', fail: 'It can report "verified" without a check. Ask for the run record.' },
    { id: 'hook', name: 'Hook', does: 'Enforces a rule at a lifecycle event, whatever the agent decides.', ex: 'Block a commit while tests/verify.js fails.', fail: 'It enforces only what you encode.' },
    { id: 'harness', name: 'Harness', does: 'Runs agents and jobs, keeps records, routes results to review.', ex: 'The lab on this page: run IDs, manifests, ledger, reproduce button.', fail: 'Good records of a bad method are still a bad method.' },
    { id: 'scientist', name: 'Scientist', does: 'Sets the question. Judges assumptions, relevance and claims.', ex: 'Decides that real alignments need rate variation.', fail: 'No substitute. "Supply the taste."' },
  ]);

  return Object.freeze({
    ENTITIES, RELATIONS, STATES, MECHANISMS, SCENARIOS, TASKS, CLAIMS, EVIDENCE_IDS,
    MODELS, GLOSSARY, EXERCISES, WEEK, ROLES, downstream, topoOrder, depth,
  });
}

const CourseModel = courseModelFactory();
if (typeof module === 'object' && module.exports) {
  module.exports = { CourseModel, courseModelFactory };
}
