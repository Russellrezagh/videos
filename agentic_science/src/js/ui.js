/*
 * Page layer. Renders the plates and labs from the course model (course.js)
 * and runs the science through the kernel (kernel.js) and the lab (lab.js).
 * No science lives here: this file only draws and wires.
 */
(function () {
  'use strict';

  const K = QuartetKernel;
  const Lab = quartetLabFactory(K);
  const C = CourseModel;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TOPO = ['AB|CD', 'AC|BD', 'AD|BC'];
  const STATE_NAME = Object.fromEntries(C.STATES.map((s) => [s.id, s.name]));
  const MECH = Object.fromEntries(C.MECHANISMS.map((m) => [m.id, m]));
  const CELL_WORD = { sep: 'separate', rec: 'records', shr: 'shared', lim: 'limits' };
  const SCENARIOS = {
    A: { tLong: 1.0, tShort: 0.05, pInv: 0, mlI: false, label: 'A' },
    B: { tLong: 0.75, tShort: 0.05, pInv: 0.3, mlI: true, label: 'B' },
    C: { tLong: 0.3, tShort: 0.1, pInv: 0, mlI: false, label: 'C' },
  };
  const NS = [100, 300, 1000, 3000, 10000];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  function h(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    setAttrs(node, attrs);
    append(node, kids);
    return node;
  }
  function s(tag, attrs, ...kids) {
    const node = document.createElementNS(SVGNS, tag);
    setAttrs(node, attrs);
    append(node, kids);
    return node;
  }
  function setAttrs(node, attrs) {
    if (!attrs) return;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  function append(node, kids) {
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
  }
  const clear = (node) => {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  };
  const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
  const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');
  const pct = (x) => `${Math.round(100 * x)}%`;
  const argmax = (a) => a.indexOf(Math.max(...a));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function storageGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage can be unavailable; the page works without it */
    }
  }

  /* ---------- Shared state ---------- */
  const state = {
    recorded: null,
    liveHash: null,
    hashMatches: false,
    matrix: null,
    matrixSource: 'recorded',
  };

  async function loadRecorded() {
    const node = document.getElementById('recorded-run');
    let text = node ? node.textContent.trim() : '';
    if (!text && node && node.dataset.src) {
      try {
        text = await (await fetch(node.dataset.src)).text();
      } catch (e) {
        text = '';
      }
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  /* =========================================================== Theme + rail */
  function initTheme() {
    const btn = $('#theme-toggle');
    const order = ['system', 'light', 'dark'];
    let mode = storageGet('quartet-theme', 'system');
    let ours = false; // only remove a data-theme attribute that this page set
    const apply = () => {
      if (mode === 'system') {
        if (ours) document.documentElement.removeAttribute('data-theme');
        ours = false;
      } else {
        document.documentElement.setAttribute('data-theme', mode);
        ours = true;
      }
      if (btn) btn.textContent = `Theme: ${mode}`;
      document.dispatchEvent(new CustomEvent('themechange'));
    };
    apply();
    if (btn)
      btn.addEventListener('click', () => {
        mode = order[(order.indexOf(mode) + 1) % order.length];
        storageSet('quartet-theme', mode);
        apply();
      });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => document.dispatchEvent(new CustomEvent('themechange'));
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  function initRail() {
    const links = [...document.querySelectorAll('.rail a')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a) => a.classList.remove('active'));
          const a = byId.get(e.target.id);
          if (a) a.classList.add('active');
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    byId.forEach((_, id) => {
      const sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }

  /* =========================================================== Identity */
  function renderIdentity() {
    const rec = state.recorded;
    const live = state.liveHash;
    $('#id-live').textContent = `${live.slice(0, 16)}…`;
    $('#id-live').title = live;
    const status = $('#id-status');
    if (rec) {
      state.hashMatches = rec.sourceHash === live;
      status.textContent = state.hashMatches
        ? 'Matches the recorded run. The tested code is the code on this page.'
        : `Does not match the recorded hash ${rec.sourceHash.slice(0, 16)}…. Treat results as unverified.`;
      status.className = `id-s ${state.hashMatches ? 'ok' : 'bad'}`;
      $('#id-run').textContent = rec.runId;
      const g = $('#id-groups');
      g.textContent = `${rec.summary.passed} of ${rec.summary.groups} check groups passed · ${rec.environment.runtime}`;
      g.className = `id-s ${rec.summary.failed === 0 ? 'ok' : 'bad'}`;
    } else {
      status.textContent = 'No recorded run found. Run node tests/verify.js and build again.';
      status.className = 'id-s bad';
      $('#id-run').textContent = 'missing';
    }
  }

  function renderHeroVerdict() {
    const inf = Lab.infiniteData(SCENARIOS.A);
    const p = argmax(inf.parsimony.share);
    const m = argmax(inf.ml.share);
    const box = $('#hero-verdict');
    const pars = box.querySelector('[data-v="pars"]');
    const ml = box.querySelector('[data-v="ml"]');
    clear(pars).append(
      h('span', { class: p === 0 ? 'good' : 'bad', text: `${TOPO[p]} ${p === 0 ? '(true tree)' : '(wrong)'}` }),
      h('span', { class: 'mono', text: `  · fewest changes per site: ${inf.parsimony.scores.map(f3).join(' / ')}` })
    );
    clear(ml).append(
      h('span', { class: m === 0 ? 'good' : 'bad', text: `${TOPO[m]} ${m === 0 ? '(true tree)' : '(wrong)'}` }),
      h('span', { class: 'mono', text: `  · log-likelihood per site: ${inf.ml.logL.map((x) => x.toFixed(4)).join(' / ')}` })
    );
  }

  /* =========================================================== Ch1 domain model */
  function renderDomainModel() {
    const W = 960;
    const H = 520;
    const cx = 450;
    const cy = 255;
    const loop = ['question', 'task', 'agent', 'workspace', 'revision', 'run', 'check', 'evidence', 'claim'];
    const pos = {};
    loop.forEach((id, i) => {
      const a = ((-90 + 40 * i) * Math.PI) / 180;
      pos[id] = [cx + 330 * Math.cos(a), cy + 170 * Math.sin(a)];
    });
    pos.scientist = [cx, cy];
    pos.convention = [pos.task[0], 38];
    pos.handoff = [870, 72];
    pos.context = [880, 312];
    pos.environment = [pos.run[0], 494];
    pos.manifest = [128, 470];

    const ent = Object.fromEntries(C.ENTITIES.map((e) => [e.id, e]));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Domain model of agentic science' });
    svg.append(
      s('defs', null, s('marker', { id: 'dm-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }))),
      s('ellipse', { class: 'loop-ring', cx, cy, rx: 330, ry: 170 })
    );
    const boxW = (id) => Math.max(84, ent[id].name.length * 8.4 + 30);
    const edgeG = s('g');
    const nodeG = s('g');
    svg.append(edgeG, nodeG);
    const edges = [];

    // clip a line at the boundary of a box centred at p
    const clip = (p, q, id) => {
      const w = boxW(id) / 2 + 4;
      const hh = 15 + 4;
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const t = Math.min(dx ? w / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
      return [p[0] + dx * t, p[1] + dy * t];
    };

    for (const [a, b, label] of C.RELATIONS) {
      const p = pos[a];
      const q = pos[b];
      const start = clip(p, q, a);
      const end = clip(q, p, b);
      const onLoop = loop.includes(a) && loop.includes(b);
      let d;
      let lx;
      let ly;
      if (onLoop) {
        const mx = (start[0] + end[0]) / 2;
        const my = (start[1] + end[1]) / 2;
        const ox = mx - cx;
        const oy = my - cy;
        const len = Math.hypot(ox, oy) || 1;
        const qx = mx + (ox / len) * 22;
        const qy = my + (oy / len) * 22;
        d = `M${start[0]},${start[1]} Q${qx},${qy} ${end[0]},${end[1]}`;
        lx = mx + (ox / len) * 24;
        ly = my + (oy / len) * 24;
      } else {
        d = `M${start[0]},${start[1]} L${end[0]},${end[1]}`;
        // label beside the midpoint, on the side away from the centre
        const mx = (start[0] + end[0]) / 2;
        const my = (start[1] + end[1]) / 2;
        const len = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
        let nx = -(end[1] - start[1]) / len;
        let ny = (end[0] - start[0]) / len;
        if (a === 'scientist' || b === 'scientist') {
          nx = -nx;
          ny = -ny;
        } else if ((mx - cx) * nx + (my - cy) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        lx = mx + nx * 12;
        ly = my + ny * 12 + 4;
      }
      const path = s('path', { d, class: 'rel', 'marker-end': 'url(#dm-arrow)' });
      const text = s('text', { x: lx, y: ly, class: 'rel-label', 'text-anchor': 'middle', text: label });
      edgeG.append(path, text);
      edges.push({ a, b, path, text });
    }

    const nodes = {};
    for (const e of C.ENTITIES) {
      const [x, y] = pos[e.id];
      const w = boxW(e.id);
      const g = s(
        'g',
        { class: 'ent', tabindex: '0', role: 'button', 'aria-label': `${e.name}: ${e.def}`, 'data-id': e.id },
        s('rect', { x: x - w / 2, y: y - 15, width: w, height: 30, rx: 2 }),
        s('rect', { class: `lives-bar lives-${e.lives}`, x: x - w / 2, y: y - 15, width: 6, height: 30 }),
        s('text', { x: x + 3, y: y + 4.5, 'text-anchor': 'middle', text: e.name })
      );
      nodeG.append(g);
      nodes[e.id] = g;
      const pick = () => select(e.id);
      g.addEventListener('click', pick);
      g.addEventListener('mouseenter', () => highlight(e.id));
      g.addEventListener('mouseleave', () => highlight(current));
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pick();
        }
      });
    }

    let current = null;
    function highlight(id) {
      if (!id) {
        edges.forEach((ed) => ['hi', 'dim'].forEach((c) => (ed.path.classList.remove(c), ed.text.classList.remove(c))));
        Object.values(nodes).forEach((g) => g.classList.remove('dim', 'sel'));
        return;
      }
      const linked = new Set([id]);
      edges.forEach((ed) => {
        const on = ed.a === id || ed.b === id;
        if (on) {
          linked.add(ed.a);
          linked.add(ed.b);
        }
        ed.path.classList.toggle('hi', on);
        ed.text.classList.toggle('hi', on);
        ed.path.classList.toggle('dim', !on);
        ed.text.classList.toggle('dim', !on);
      });
      Object.entries(nodes).forEach(([nid, g]) => {
        g.classList.toggle('dim', !linked.has(nid));
        g.classList.toggle('sel', nid === id);
      });
    }
    function select(id) {
      current = id;
      highlight(id);
      const e = ent[id];
      const out = C.RELATIONS.filter((r) => r[0] === id).map((r) => `${e.name} ${r[2]} ${ent[r[1]].name.toLowerCase()}.`);
      const inn = C.RELATIONS.filter((r) => r[1] === id).map((r) => `${ent[r[0]].name} ${r[2]} ${e.name.toLowerCase()}.`);
      const box = clear($('#model-detail'));
      box.append(
        h('p', { class: 'md-lives', html: `<span class="lives-key"><span><i class="lives-${e.lives}"></i>${STATE_NAME[e.lives]}</span></span>` }),
        h('h4', { text: e.name }),
        h('p', { text: e.def }),
        h('p', { class: 'md-ex', text: e.ex }),
        h('ul', null, [...out, ...inn].map((t) => h('li', { text: t })))
      );
    }
    const host = $('#model-svg');
    host.append(svg);
    const key = h('div', { class: 'lives-key' }, C.STATES.map((st) => h('span', null, h('i', { class: `lives-${st.id}` }), st.name)));
    host.append(key);
    clear($('#model-detail')).append(
      h('p', { class: 'md-lives', text: 'Read the loop' }),
      h('h4', { text: 'Question → claim' }),
      h('p', { text: 'Follow the ring clockwise from the top. A question splits into tasks. Agents edit workspaces, commit revisions, and runs execute them. Checks turn runs into evidence, and evidence supports claims that answer the question.' }),
      h('p', { class: 'md-ex', text: 'Select or hover over any entity to see its definition, an example and its relations.' })
    );
  }

  /* =========================================================== Ch2 science */
  function renderAlignment() {
    const sc = SCENARIOS.A;
    const tree = Lab.felsensteinTree(sc.tLong, sc.tShort);
    const keep = 72;
    const { sequences } = Lab.simulateQuartet(tree, keep, 20261006, 0, keep);
    const host = clear($('#alignment'));
    const names = ['A', 'B', 'C', 'D'];
    const support = [];
    for (let i = 0; i < keep; i++) {
      const cls = K.CLASSES[K.classOf(sequences.map((q) => q[i]).map((ch) => 'ACGT'.indexOf(ch)))];
      support.push(cls.label === 'xxyy' ? 1 : cls.label === 'xyxy' ? 2 : cls.label === 'xyyx' ? 3 : 0);
    }
    names.forEach((n, row) => {
      const seq = h('span', { class: 'al-seq' });
      for (let i = 0; i < keep; i++) {
        const ch = sequences[row][i];
        seq.append(h('span', { class: `b-${ch}`, text: ch }));
      }
      host.append(h('div', { class: 'al-row' }, h('span', { class: `al-name${n === 'A' || n === 'C' ? ' long' : ''}`, text: `${n}${n === 'A' || n === 'C' ? ' ·long' : ''}` }), seq));
    });
    const marks = h('span', { class: 'al-seq' });
    support.forEach((v) => marks.append(h('span', { text: v === 1 ? '▲' : v === 2 ? '▼' : v === 3 ? '◆' : '·', style: `color: var(${v === 1 ? '--navy' : v === 2 ? '--burgundy' : '--ink-3'})` })));
    host.append(h('div', { class: 'al-row' }, h('span', { class: 'al-name', text: 'split' }), marks));
    const n1 = support.filter((v) => v === 1).length;
    const n2 = support.filter((v) => v === 2).length;
    const n3 = support.filter((v) => v === 3).length;
    host.append(
      h('p', { class: 'small', style: 'margin-top:8px', html: `In these 72 sites, <strong style="color:var(--navy)">▲ ${n1}</strong> sites support AB|CD, <strong style="color:var(--burgundy)">▼ ${n2}</strong> support AC|BD and ◆ ${n3} support AD|BC. Parsimony counts exactly these sites.` })
    );
  }

  function renderClassTable() {
    const sc = SCENARIOS.A;
    const tree = Lab.felsensteinTree(sc.tLong, sc.tShort);
    const n = 10000;
    const { counts } = Lab.simulateQuartet(tree, n, 20261006);
    const exact = K.makeModel().classProbabilities(tree, 0);
    const supports = { xxyy: 'AB|CD', xyxy: 'AC|BD', xyyx: 'AD|BC' };
    const grid = h('div', { class: 'class-grid' });
    K.CLASSES.forEach((c, i) => {
      grid.append(
        h(
          'div',
          { class: `class-cell${supports[c.label] ? ' inf' : ''}` },
          h('span', { class: 'cl', text: c.label }),
          h('span', { class: 'cm', text: `${c.multiplicity} patterns` }),
          h('span', { class: 'cn', text: `obs ${counts[i]}` }),
          h('span', { class: 'cn ce', text: `exp ${(n * exact[i]).toFixed(0)}` }),
          supports[c.label] ? h('span', { class: 'cs', text: `supports ${supports[c.label]}` }) : null
        )
      );
    });
    const host = clear($('#class-table'));
    host.append(grid, h('p', { class: 'small', style: 'margin-top:6px', text: `Counts in one simulated alignment of ${n.toLocaleString('en')} sites (scenario A), next to the counts expected from exact pattern probabilities. Letters x, y, z, w stand for “some base”: xxyy means A and B share one base and C and D share another.` }));
  }

  /* =========================================================== Ch3 matrix */
  function renderStates() {
    const tb = $('#states-table tbody');
    C.STATES.forEach((st) => tb.append(h('tr', null, h('td', { text: st.name }), h('td', { text: st.where }), h('td', { text: st.ex }), h('td', { text: st.keeps }))));
  }

  function renderMatrix() {
    const table = $('#matrix');
    const groups = { git: 'Git', context: 'Context', runtime: 'Runtime', evidence: 'Evidence' };
    const thead = h('thead', null, h('tr', null, h('th', { text: 'Mechanism' }), C.STATES.map((st) => h('th', { scope: 'col', tabindex: '0', 'data-state': st.id, text: st.name }))));
    const tbody = h('tbody');
    C.MECHANISMS.forEach((m) => {
      const tr = h('tr', { 'data-mech': m.id }, h('th', { scope: 'row', tabindex: '0' }, h('span', { class: 'grp', text: groups[m.group] }), m.name));
      C.STATES.forEach((st) => {
        const [code, note] = m.cells[st.id];
        tr.append(h('td', { 'data-state': st.id, title: note || '' }, code ? h('span', { class: `cell-chip ${code}`, text: CELL_WORD[code] }) : h('span', { class: 'small', text: '·' })));
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);

    const detail = $('#matrix-detail');
    function showMech(id) {
      const m = MECH[id];
      tbody.querySelectorAll('tr').forEach((tr) => tr.classList.toggle('sel', tr.dataset.mech === id));
      table.querySelectorAll('.colsel, thead th.sel').forEach((x) => x.classList.remove('colsel', 'sel'));
      const effects = C.STATES.filter((st) => m.cells[st.id][0]).map((st) => {
        const [code, note] = m.cells[st.id];
        return h('li', null, h('span', { class: `cell-chip ${code}`, text: CELL_WORD[code] }), ` ${st.name}${note ? `: ${note}` : ''}`);
      });
      clear(detail).append(
        h('h4', { text: m.name }),
        h('dl', null, h('dt', { text: 'What' }), h('dd', { text: m.what }), h('dt', { text: 'Use it when' }), h('dd', { text: m.use }), h('dt', { text: 'Not a guarantee' }), h('dd', { text: m.not }), h('dt', { text: 'Effects' }), h('dd', null, h('ul', { class: 'tight', style: 'list-style:none;padding:0;margin:0' }, effects)))
      );
    }
    function showState(id) {
      tbody.querySelectorAll('tr').forEach((tr) => tr.classList.remove('sel'));
      table.querySelectorAll('td').forEach((td) => td.classList.toggle('colsel', td.dataset.state === id));
      table.querySelectorAll('thead th').forEach((th) => th.classList.toggle('sel', th.dataset.state === id));
      const st = C.STATES.find((x) => x.id === id);
      const rows = C.MECHANISMS.filter((m) => m.cells[id][0]).map((m) => {
        const [code, note] = m.cells[id];
        return h('li', null, h('span', { class: `cell-chip ${code}`, text: CELL_WORD[code] }), ` ${m.name}${note ? `: ${note}` : ''}`);
      });
      clear(detail).append(h('h4', { text: st.name }), h('p', { class: 'small', text: `Lives in: ${st.where}. Kept by: ${st.keeps}.` }), h('ul', { class: 'tight', style: 'list-style:none;padding:0;margin:0' }, rows));
    }
    tbody.querySelectorAll('tr').forEach((tr) => {
      const th = tr.querySelector('th');
      const go = () => showMech(tr.dataset.mech);
      tr.addEventListener('click', go);
      th.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          go();
        }
      });
    });
    thead.querySelectorAll('th[data-state]').forEach((th) => {
      const go = () => showState(th.dataset.state);
      th.addEventListener('click', go);
      th.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          go();
        }
      });
    });
    showMech('worktree');
    window.__selectMechanism = (id) => {
      showMech(id);
      document.getElementById('plate-3').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    };
  }

  /* =========================================================== Ch4 worktree stepper */
  const WT_STEPS = [
    {
      title: 'One repository, one checkout',
      cmd: '$ git log --oneline\na1c0  conventions and task graph',
      text: 'The project starts with one checkout. HEAD points to main. The shared object store holds one commit.',
      commits: ['c0'], refs: { main: 'c0' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (stub)' } },
    },
    {
      title: 'Add two worktrees',
      cmd: '$ git worktree add -b kernel/pruning ../q-pruning HEAD\n$ git worktree add -b kernel/brute ../q-brute HEAD',
      text: 'Each new worktree gets its own HEAD, index and files. All three point at the same commit. Git copied no history.',
      commits: ['c0'], refs: { main: 'c0', 'kernel/pruning': 'c0', 'kernel/brute': 'c0' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (stub)' }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js (stub)' }, brute: { head: 'kernel/brute', index: 'clean', files: 'kernel.js (stub)' } },
      active: ['pruning', 'brute'],
    },
    {
      title: 'Agent A commits in its worktree',
      cmd: '$ cd ../q-pruning\n$ $EDITOR src/js/kernel.js\n$ git commit -am "kernel: pruning route"',
      text: 'The new commit p1 appears in the shared store at once. The files in the other two checkouts do not change.',
      commits: ['c0', 'p1'], fresh: 'p1', refs: { main: 'c0', 'kernel/pruning': 'p1', 'kernel/brute': 'c0' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (stub)' }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js + pruning', changed: true }, brute: { head: 'kernel/brute', index: 'clean', files: 'kernel.js (stub)' } },
      active: ['pruning'],
    },
    {
      title: 'Agent B commits in parallel',
      cmd: '$ cd ../q-brute\n$ git commit -am "kernel: brute-force route"',
      text: 'No collision: the two agents never shared working files or an index. Their commits meet only when someone merges them.',
      commits: ['c0', 'p1', 'b1'], fresh: 'b1', refs: { main: 'c0', 'kernel/pruning': 'p1', 'kernel/brute': 'b1' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (stub)' }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js + pruning' }, brute: { head: 'kernel/brute', index: 'clean', files: 'kernel.js + brute', changed: true } },
      active: ['brute'],
    },
    {
      title: 'A collision that Git cannot see',
      cmd: '# both agents run the study at the same time\n$ node study.js > /tmp/study.csv',
      text: 'Both worktrees write one absolute path on one machine. The second run overwrites the first. A worktree isolates source files, not the runtime.',
      commits: ['c0', 'p1', 'b1'], refs: { main: 'c0', 'kernel/pruning': 'p1', 'kernel/brute': 'b1' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (stub)' }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js + pruning' }, brute: { head: 'kernel/brute', index: 'clean', files: 'kernel.js + brute' } },
      active: ['pruning', 'brute'], hazard: true,
    },
    {
      title: 'Integrate and verify in one place',
      cmd: '$ cd ../quartet\n$ git merge kernel/pruning\n$ git merge kernel/brute\n$ node tests/verify.js\n16/16 groups passed',
      text: 'Integration happens in one checkout, on purpose. After the merges, run the whole suite. Two correct halves can still make a wrong whole.',
      commits: ['c0', 'p1', 'b1', 'm1', 'm2'], fresh: 'm2', refs: { main: 'm2', 'kernel/pruning': 'p1', 'kernel/brute': 'b1' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (2 routes)', changed: true }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js + pruning' }, brute: { head: 'kernel/brute', index: 'clean', files: 'kernel.js + brute' } },
      active: ['main'], verified: true,
    },
    {
      title: 'Remove a worktree, keep the branch',
      cmd: '$ git worktree remove ../q-brute\n$ git worktree list\n# kernel/brute still exists until:\n$ git branch -d kernel/brute',
      text: 'Removing a worktree deletes the checkout directory only. The branch and its commits stay. Delete the branch as a separate, deliberate step.',
      commits: ['c0', 'p1', 'b1', 'm1', 'm2'], refs: { main: 'm2', 'kernel/pruning': 'p1', 'kernel/brute': 'b1' },
      co: { main: { head: 'main', index: 'clean', files: 'kernel.js (2 routes)' }, pruning: { head: 'kernel/pruning', index: 'clean', files: 'kernel.js + pruning' } },
      removed: ['brute'],
    },
  ];

  function renderWorktreeStep(i) {
    const st = WT_STEPS[i];
    const W = 760;
    const svg = s('svg', { viewBox: `0 0 ${W} 430`, role: 'img', 'aria-label': `Step ${i + 1}: ${st.title}` });
    svg.append(s('defs', null, s('pattern', { id: 'wt-hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'hatch-line' }))));
    // repository: shared objects and refs
    svg.append(s('rect', { class: 'wt-repo', x: 20, y: 18, width: 720, height: 140 }));
    svg.append(s('rect', { x: 28, y: 26, width: 236, height: 22, fill: 'var(--paper)' }));
    svg.append(s('text', { class: 'wt-k', x: 36, y: 41, text: '.git · SHARED OBJECTS AND REFS' }));
    const cpos = { c0: [80, 100], p1: [210, 72], b1: [210, 128], m1: [330, 86], m2: [450, 100] };
    const parents = { p1: ['c0'], b1: ['c0'], m1: ['c0', 'p1'], m2: ['m1', 'b1'] };
    const has = new Set(st.commits);
    svg.append(s('rect', { x: 40, y: 54, width: 450, height: 96, fill: 'var(--paper)', opacity: 0.85 }));
    st.commits.forEach((c) => {
      (parents[c] || []).forEach((pa) => {
        if (has.has(pa)) svg.append(s('line', { class: 'commit-edge', x1: cpos[pa][0], y1: cpos[pa][1], x2: cpos[c][0], y2: cpos[c][1] }));
      });
    });
    const names = { c0: 'a1c0', p1: 'p1', b1: 'b1', m1: 'm1', m2: 'm2' };
    st.commits.forEach((c) => {
      const [x, y] = cpos[c];
      svg.append(s('circle', { class: `commit${st.fresh === c ? ' new' : ''}`, cx: x, cy: y, r: 9 }));
      svg.append(s('text', { class: 'commit-label', x, y: c === 'b1' ? y + 22 : y - 14, 'text-anchor': 'middle', text: names[c] }));
    });
    svg.append(s('rect', { x: 512, y: 54, width: 216, height: 96, fill: 'var(--paper)', opacity: 0.9 }));
    svg.append(s('text', { class: 'wt-k', x: 524, y: 72, text: 'REFS' }));
    Object.entries(st.refs).forEach(([name, c], r) => {
      svg.append(s('text', { class: 'ref-t', x: 524, y: 94 + r * 20, text: `${name} → ${names[c]}` }));
    });

    // checkouts
    const boxes = [
      ['main', 'quartet (main checkout)', 20],
      ['pruning', '../q-pruning', 267],
      ['brute', '../q-brute', 514],
    ];
    boxes.forEach(([key, title, x]) => {
      const co = st.co[key];
      const removed = st.removed && st.removed.includes(key);
      const exists = Boolean(co);
      const active = st.active && st.active.includes(key);
      const y = 178;
      svg.append(s('path', { class: 'link', d: `M${x + 113},${y} L${x + 113},158` }));
      svg.append(s('rect', { class: `wt-box${exists ? '' : ' ghost'}${active ? ' active' : ''}`, x, y, width: 226, height: 148 }));
      svg.append(s('text', { class: 'wt-title', x: x + 12, y: y + 22, text: title, opacity: exists ? 1 : 0.45 }));
      if (!exists) {
        svg.append(s('text', { class: 'wt-k', x: x + 113, y: y + 84, 'text-anchor': 'middle', text: removed ? 'REMOVED · BRANCH KEPT' : 'NOT CREATED YET' }));
        return;
      }
      const rows = [['HEAD', `→ ${co.head}`], ['INDEX', co.index], ['FILES', co.files]];
      rows.forEach(([k, v], r) => {
        const ry = y + 38 + r * 36;
        svg.append(s('rect', { class: 'wt-row', x: x + 10, y: ry, width: 206, height: 30 }));
        svg.append(s('text', { class: 'wt-k', x: x + 18, y: ry + 19, text: k }));
        svg.append(s('text', { class: `wt-v${k === 'FILES' && co.changed ? ' changed' : ''}`, x: x + 70, y: ry + 19, text: v }));
      });
    });
    // runtime
    svg.append(s('rect', { class: `runtime${st.hazard ? ' hazard' : ''}`, x: 20, y: 350, width: 720, height: 64 }));
    svg.append(s('rect', { x: 28, y: 358, width: 384, height: 20, fill: 'var(--paper)' }));
    svg.append(s('text', { class: 'wt-k', x: 36, y: 372, text: 'SHARED RUNTIME ON THIS HOST · /tmp · ports · caches · GPU' }));
    if (st.hazard) {
      svg.append(s('path', { class: 'link hazard', d: 'M380,326 L470,390' }), s('path', { class: 'link hazard', d: 'M627,326 L540,390' }));
      svg.append(s('rect', { x: 446, y: 386, width: 120, height: 22, fill: 'var(--paper)', stroke: 'var(--burgundy)' }));
      svg.append(s('text', { class: 'hazard-t', x: 506, y: 401, 'text-anchor': 'middle', text: '/tmp/study.csv' }));
      svg.append(s('text', { class: 'hazard-t', x: 438, y: 401, 'text-anchor': 'end', text: 'second run overwrites first ✗' }));
    }
    if (st.verified) {
      svg.append(s('rect', { x: 28, y: 386, width: 420, height: 20, fill: 'var(--paper)' }));
      svg.append(s('text', { class: 'pass-t', x: 36, y: 400, text: '✓ node tests/verify.js · 16/16 groups passed after the merges' }));
    }
    const host = clear($('#wt-svg'));
    host.append(svg);
    $('#wt-count').textContent = `Step ${i + 1} of ${WT_STEPS.length}`;
    $('#wt-title').textContent = st.title;
    $('#wt-cmd').textContent = st.cmd;
    $('#wt-text').textContent = st.text;
    $('#wt-prev').disabled = i === 0;
    $('#wt-next').disabled = i === WT_STEPS.length - 1;
  }

  function initWorktrees() {
    let i = 0;
    renderWorktreeStep(i);
    $('#wt-prev').addEventListener('click', () => renderWorktreeStep((i = Math.max(0, i - 1))));
    $('#wt-next').addEventListener('click', () => renderWorktreeStep((i = Math.min(WT_STEPS.length - 1, i + 1))));
  }

  /* =========================================================== Ch5 scenarios */
  function renderScenarios() {
    const host = $('#scenarios');
    let firstTry = 0;
    let answered = 0;
    const score = $('#scenario-score');
    const update = () => {
      score.textContent = answered ? `${firstTry} of ${answered} answered correctly on the first try · ${C.SCENARIOS.length - answered} left` : `${C.SCENARIOS.length} situations. Choose one mechanism for each.`;
    };
    C.SCENARIOS.forEach((sc, idx) => {
      const why = h('p', { class: 'scen-why', hidden: true });
      const card = h('div', { class: 'scen' }, h('p', { class: 'scen-no', text: `Situation ${idx + 1}` }), h('p', { class: 'scen-q', text: sc.situation }));
      const opts = h('div', { class: 'scen-opts' });
      let tries = 0;
      let solved = false;
      sc.options.forEach((id) => {
        const b = h('button', { type: 'button', text: MECH[id].name });
        b.addEventListener('click', () => {
          if (solved) return;
          tries++;
          if (id === sc.answer) {
            solved = true;
            b.classList.add('right');
            card.classList.add('done-right');
            answered++;
            if (tries === 1) firstTry++;
            why.hidden = false;
            why.textContent = `Yes. ${sc.why}`;
          } else {
            b.classList.add('wrong');
            why.hidden = false;
            why.textContent = `Not this one. ${MECH[id].name}: ${MECH[id].not}`;
          }
          update();
        });
        opts.append(b);
      });
      card.append(opts, why);
      host.append(card);
    });
    update();
  }

  /* =========================================================== Ch6 context lab */
  const CTX_BUDGET = 100;
  const CTX_LIMIT = 90;

  function ctxEvents(mode) {
    const chat = mode === 'chat';
    return [
      {
        log: `Session starts. The harness loads the system prompt, the tools and CLAUDE.md${chat ? '' : ', which imports CONVENTIONS.md'}.`,
        add: [{ id: 'sys', k: 'system', label: 'system + tools', size: 10 }, { id: 'inst', k: 'instruction', label: 'CLAUDE.md', size: 4, pin: true }].concat(chat ? [] : [{ id: 'conv', k: 'instruction', label: 'CONVENTIONS.md', size: 4, pin: true, conv: true }]),
      },
      {
        log: chat ? 'The scientist types: “Branch length is expected substitutions per site, so mu = 4/3.”' : 'The scientist types: “Follow CONVENTIONS.md.” The convention is already in context.',
        add: [{ id: 't1', k: 'turn', label: chat ? 'turn: mu = 4/3' : 'turn', size: chat ? 6 : 3, conv: chat }],
      },
      { log: 'The agent reads src/js/kernel.js.', add: [{ id: 'r1', k: 'read', label: 'kernel.js', size: 12 }] },
      { log: 'The agent writes the pruning route. Checks C1–C8 pass.', add: [{ id: 't2', k: 'turn', label: 'turn: pruning', size: 10 }] },
      { log: 'The agent reads a large study log.', add: [{ id: 'r2', k: 'read', label: 'study.log', size: 22 }] },
      { log: 'Parsimony says AC|BD. The agent and the scientist discuss it.', add: [{ id: 't3', k: 'turn', label: 'turn: AC|BD?', size: 10 }] },
      { log: 'The agent reads a paper excerpt on long-branch attraction.', add: [{ id: 'r3', k: 'read', label: 'paper', size: 18 }] },
      { log: 'The scientist asks for a faster P(t) for the fit.', add: [{ id: 't4', k: 'turn', label: 'turn: refactor', size: 8 }] },
      { act: true, log: 'The agent rewrites P(t).' },
      { check: true, log: 'The agent runs the check suite.' },
    ];
  }

  function initContextLab() {
    let mode = 'chat';
    let step = 0;
    let items = [];
    let lost = false;
    let variant = null;
    const win = $('#ctx-window');
    const log = $('#ctx-log');
    const outcome = $('#ctx-outcome');

    function total() {
      return items.reduce((a, b) => a + b.size, 0);
    }
    function draw() {
      const bar = h('div', { class: 'ctx-bar' });
      items.forEach((it) => bar.append(h('div', { class: `ctx-seg k-${it.k}${it.conv ? ' conv' : ''}`, style: `width:${(100 * it.size) / CTX_BUDGET}%`, title: `${it.label} (${it.size})`, text: it.size >= 6 ? it.label : '' })));
      const limit = h('div', { style: `position:absolute;left:${CTX_LIMIT}%;top:0;bottom:0;border-left:2px dashed var(--burgundy)` });
      bar.append(limit);
      clear(win).append(
        bar,
        h('div', { class: 'ctx-scale' }, h('span', { text: '0' }), h('span', { text: `used ${total()} of ${CTX_BUDGET} · compaction at ${CTX_LIMIT}` }), h('span', { text: String(CTX_BUDGET) })),
        h(
          'div',
          { class: 'ctx-legend' },
          [['system', 'system + tools'], ['instruction', 'instruction files (reload from disk)'], ['turn', 'conversation turns'], ['read', 'file reads'], ['summary', 'compaction summary']].map(([k, t]) => h('span', null, h('i', { class: `ctx-seg k-${k}`, style: 'padding:0' }), t)),
          h('span', null, h('i', { style: 'background:var(--pass)' }), 'carries the rate convention')
        )
      );
    }
    function addLog(text, cls) {
      log.append(h('li', { class: cls || '', text }));
    }
    function hasConvention() {
      return items.some((it) => it.conv);
    }
    function compact() {
      const before = hasConvention();
      const kept = items.filter((it) => it.k === 'system' || it.pin);
      items = kept.concat([{ id: 'sum', k: 'summary', label: 'summary', size: 12 }]);
      addLog(`Context is above ${CTX_LIMIT}% of its budget. The harness compacts it: turns and file reads become one short summary. Instruction files reload from disk.`, 'ev-compact');
      if (before && !hasConvention()) {
        lost = true;
        addLog('The rate convention was only in a conversation turn. The summary keeps the goal and recent results. It does not keep the convention.', 'ev-compact');
      } else if (hasConvention()) {
        addLog('The convention survives: it lives in a file that reloads.', 'ev-good');
      }
    }
    function next() {
      const evs = ctxEvents(mode);
      if (step >= evs.length) return false;
      const ev = evs[step++];
      if (ev.add) {
        items = items.concat(ev.add.map((x) => Object.assign({}, x)));
        addLog(ev.log);
        if (total() > CTX_LIMIT) compact();
      } else if (ev.act) {
        addLog(ev.log);
        if (hasConvention()) {
          variant = K.VARIANTS[0];
          addLog('It finds the convention in context and writes P_same(t) = 1/4 + 3/4·exp(−4t/3).', 'ev-good');
        } else {
          variant = K.VARIANTS[1];
          addLog('It finds no convention in context. It copies P_same(t) = 1/4 + 3/4·exp(−4t) from a textbook that uses other time units. This is mutant M1.', 'ev-compact');
        }
      } else if (ev.check) {
        addLog(ev.log);
        const results = Lab.runChecks(K.makeModel(variant));
        const failed = results.filter((r) => !r.pass);
        clear(outcome);
        if (failed.length) {
          outcome.className = 'ctx-outcome bad';
          outcome.append(
            h('h4', { text: 'Mutant M1 entered the code' }),
            h('p', { text: `The checks ran for real, on the kernel the agent wrote. ${results.length - failed.length} of ${results.length} pass, including the cross-method check C8. ${failed.map((r) => r.id).join(', ')} fail.` }),
            h('p', null, h('code', { text: failed[0].detail })),
            h('p', { class: 'small', html: 'Without rung 3, this error would reach every later result. See <a href="#ch-ladder">chapter 9</a>.' })
          );
        } else {
          outcome.className = 'ctx-outcome good';
          outcome.append(h('h4', { text: 'The convention survived' }), h('p', { text: `All ${results.length} checks pass on the kernel the agent wrote. The convention lives in a file that reloads after compaction.` }), h('p', { class: 'small', text: 'The file asks. The unit anchor C9 verifies. Schwartz reports that agents revert to textbook defaults even when conventions are written down, so keep both.' }));
        }
      }
      draw();
      $('#ctx-step').disabled = step >= evs.length;
      $('#ctx-play').disabled = step >= evs.length;
      return true;
    }
    function reset() {
      step = 0;
      items = [];
      lost = false;
      variant = null;
      clear(log);
      outcome.className = 'ctx-outcome';
      clear(outcome).append(h('p', { class: 'small', text: 'The outcome appears after the agent rewrites P(t) and runs the checks.' }));
      $('#ctx-step').disabled = false;
      $('#ctx-play').disabled = false;
      draw();
      void lost;
    }
    $('#ctx-step').addEventListener('click', next);
    $('#ctx-play').addEventListener('click', async () => {
      $('#ctx-play').disabled = true;
      while (next()) await sleep(reduceMotion ? 0 : 380);
    });
    $('#ctx-reset').addEventListener('click', () => {
      reset();
      next();
    });
    document.querySelectorAll('input[name="ctx-mode"]').forEach((r) =>
      r.addEventListener('change', () => {
        mode = r.value;
        reset();
        next();
      })
    );
    // At rest the session has started, so the window is not empty.
    reset();
    next();
  }

  /* =========================================================== Ch7 manifest */
  function renderManifest() {
    const rec = state.recorded;
    const host = $('#manifest-view');
    if (!rec) {
      host.textContent = 'No recorded run is embedded.';
      return;
    }
    const rows = [
      ['runId', rec.runId, 'Time stamp plus a hash of the run’s identity. Unique, sortable, never reused.'],
      ['command', rec.command, 'The exact command. Not a description of it.'],
      ['startedAt', rec.startedAt, 'UTC. The clock is outside the science code.'],
      ['sourceHash', rec.sourceHash, 'SHA-256 of the science source text. The page recomputes it on load.'],
      ['environment', `${rec.environment.runtime} · V8 ${rec.environment.v8} · ${rec.environment.platform}`, 'Where it ran.'],
      ['params.seed', String(rec.params.seed), 'The base seed. Each replicate derives its own seed from it.'],
      ['summary', `${rec.summary.passed}/${rec.summary.groups} groups passed, ${rec.summary.failed} failed`, 'The result, stated with its denominator.'],
      ['limitations', rec.limitations.join(' '), 'What the run does not show. Part of the record, not an afterthought.'],
    ];
    host.append(h('dl', null, rows.map(([k, v, why]) => [h('dt', { text: k }), h('dd', null, v, h('span', { class: 'why', text: why }))])));
    const p6 = $('#p6-hash');
    if (p6) p6.textContent = rec.sourceHash.slice(0, 8);
    const env = $('#p6-env');
    if (env) env.textContent = rec.environment.runtime;
    const handoff = $('#handoff-text');
    if (handoff) handoff.textContent = handoff.textContent.replace('20261006T053633Z_5a33e906', rec.runId);
    const col = $('#colophon-run');
    if (col) col.textContent = `Recorded run ${rec.runId} · ${rec.environment.runtime} · ${rec.summary.passed}/${rec.summary.groups} groups · ${rec.durationMs} ms · source ${rec.sourceHash.slice(0, 16)}…`;
  }

  /* =========================================================== Ch8 roles */
  function renderRoles() {
    const host = $('#roles');
    C.ROLES.forEach((r) => host.append(h('div', { class: 'role' }, h('h4', { text: r.name }), h('p', { text: r.does, style: 'margin:0' }), h('span', { class: 'r-ex', text: r.ex }), h('span', { class: 'r-fail', text: `Failure: ${r.fail}` }))));
  }

  /* =========================================================== Ch9 ladder + labs */
  const RUNGS = [
    { n: 0, name: 'Run it again', desc: 'Same code, same assumptions. Finds flaky failures only.', checks: '—' },
    { n: 1, name: 'Self-consistency', desc: 'Limits, sums, symmetries. Cheap. Catches gross errors.', checks: 'C1–C7' },
    { n: 2, name: 'Independent algorithm', desc: 'Another route to the same number. Catches algorithm bugs.', checks: 'C8' },
    { n: 3, name: 'External anchor', desc: 'The definition of the unit, a published formula, a generative round trip.', checks: 'C9–C11' },
    { n: 4, name: 'Model adequacy and review', desc: 'Does the model fit the data? Does the claim matter? People decide.', checks: 'G-test · expert' },
  ];

  function renderLadder() {
    const rows = state.matrix;
    const W = 960;
    const H = 420;
    const yOf = (n) => 380 - n * 80;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Ladder of independence' });
    svg.append(s('line', { class: 'rail-line', x1: 60, y1: 18, x2: 60, y2: 404 }), s('line', { class: 'rail-line', x1: 130, y1: 18, x2: 130, y2: 404 }));
    RUNGS.forEach((r) => {
      const y = yOf(r.n);
      svg.append(s('line', { class: 'rung', x1: 60, y1: y, x2: 130, y2: y }));
      svg.append(s('text', { class: 'rung-no', x: 95, y: y - 8, 'text-anchor': 'middle', text: String(r.n) }));
      svg.append(s('text', { class: 'rung-name', x: 152, y: y - 6, text: r.name }));
      svg.append(s('text', { class: 'rung-desc', x: 152, y: y + 12, text: r.desc }));
      svg.append(s('text', { class: 'rung-checks', x: 152, y: y + 28, text: r.checks }));
    });
    const tags = {};
    rows.filter((r) => r.firstRung !== null).forEach((r) => {
      (tags[r.firstRung] = tags[r.firstRung] || []).push(`${r.variant} ${r.name.toLowerCase()}`);
    });
    tags[4] = (tags[4] || []).concat(['S1 wrong model for the data']);
    Object.entries(tags).forEach(([rung, list]) => {
      const y = yOf(Number(rung));
      list.forEach((label, i) => {
        const x = 640 + 0;
        const ty = y - 12 + i * 26 - (list.length - 1) * 13;
        const science = label.startsWith('S1');
        const w = label.length * 6.9 + 20;
        svg.append(s('line', { class: 'mut-string', x1: 600, y1: y, x2: x, y2: ty + 9 }));
        svg.append(s('g', { class: `mut-tag${science ? ' science' : ''}` }, s('rect', { x, y: ty, width: w, height: 20, rx: 2 }), s('text', { x: x + 10, y: ty + 14, text: label })));
      });
    });
    svg.append(s('text', { class: 'rung-checks', x: 640, y: 24, text: 'CAUGHT FIRST AT THIS RUNG' }));
    clear($('#ladder')).append(svg);
  }

  function renderPtLab() {
    const host = $('#pt-chart');
    const W = 560;
    const H = 340;
    const m = { l: 52, r: 16, t: 14, b: 44 };
    const X = (t) => m.l + (t / 2) * (W - m.l - m.r);
    const Y = (p) => H - m.b - (p / 0.8) * (H - m.t - m.b);
    const ref = K.makeModel(K.VARIANTS[0]);
    const mut = K.makeModel(K.VARIANTS[1]);
    const pd = (M, t) => 1 - M.p(t).same;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Probability of difference against branch length, reference and mutant' });
    for (let p = 0; p <= 0.75; p += 0.25) svg.append(s('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p) }));
    const ax = s('g', { class: 'axis' });
    ax.append(s('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }), s('line', { x1: m.l, x2: m.l, y1: Y(0), y2: m.t }));
    [0, 0.5, 1, 1.5, 2].forEach((t) => ax.append(s('line', { x1: X(t), x2: X(t), y1: Y(0), y2: Y(0) + 5 }), s('text', { x: X(t), y: Y(0) + 18, 'text-anchor': 'middle', text: String(t) })));
    [0, 0.25, 0.5, 0.75].forEach((p) => ax.append(s('text', { x: m.l - 8, y: Y(p) + 4, 'text-anchor': 'end', text: p.toFixed(2) })));
    svg.append(ax);
    svg.append(s('text', { class: 'axis-title', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', text: 'branch length t (expected substitutions per site, by convention C-1)' }));
    svg.append(s('text', { class: 'axis-title', x: 14, y: m.t + 4, transform: `rotate(-90 14 ${m.t + 4})`, 'text-anchor': 'end', text: 'p(t) = P(site differs)' }));
    const path = (fn) => {
      let d = '';
      for (let i = 0; i <= 200; i++) {
        const t = (2 * i) / 200;
        d += `${i ? 'L' : 'M'}${X(t).toFixed(2)},${Y(fn(t)).toFixed(2)}`;
      }
      return d;
    };
    svg.append(s('path', { class: 'curve tangent', d: `M${X(0)},${Y(0)} L${X(0.75)},${Y(0.75)}` }));
    svg.append(s('text', { class: 'rung-desc', x: X(0.47) + 4, y: Y(0.43), text: 'slope 1' }));
    svg.append(s('path', { class: 'curve ref', d: path((t) => pd(ref, t)) }));
    svg.append(s('path', { class: 'curve mut', d: path((t) => pd(mut, t)) }));
    svg.append(s('text', { class: 'series-label', x: X(1.55), y: Y(pd(ref, 1.55)) + 20, fill: 'var(--navy)', text: 'M0 reference, μ = 4/3' }));
    svg.append(s('text', { class: 'series-label', x: X(0.9), y: Y(pd(mut, 0.9)) - 10, fill: 'var(--burgundy)', text: 'M1 drift, μ = 4' }));
    const marker = s('line', { class: 'marker-line', y1: Y(0), y2: m.t });
    const d0 = s('circle', { class: 'dot-ref', r: 5 });
    const d1 = s('circle', { class: 'dot-mut', r: 5 });
    svg.append(marker, d0, d1);
    clear(host).append(svg);

    const slider = $('#pt-t');
    const readout = $('#pt-readout');
    const update = () => {
      const t = Number(slider.value);
      $('#pt-t-val').textContent = t.toFixed(2);
      marker.setAttribute('x1', X(t));
      marker.setAttribute('x2', X(t));
      const p0 = pd(ref, t);
      const p1 = pd(mut, t);
      d0.setAttribute('cx', X(t));
      d0.setAttribute('cy', Y(p0));
      d1.setAttribute('cx', X(t));
      d1.setAttribute('cy', Y(p1));
      const dd0 = Lab.jcDistance(p0);
      const dd1 = Lab.jcDistance(p1);
      const slope = (M) => (1 - M.p(1e-7).same) / 1e-7;
      const ok = (d) => (Math.abs(d - t) < 1e-9 ? 'good' : 'bad');
      clear(readout).append(
        h('thead', null, h('tr', null, h('th', { text: '' }), h('th', { text: 'M0' }), h('th', { text: 'M1' }))),
        h(
          'tbody',
          null,
          h('tr', null, h('th', { text: 'p(t)' }), h('td', { text: p0.toFixed(4) }), h('td', { text: p1.toFixed(4) })),
          h('tr', null, h('th', { text: 'JC distance d(p)' }), h('td', { class: ok(dd0), text: Number.isFinite(dd0) ? dd0.toFixed(4) : '—' }), h('td', { class: t > 0 ? ok(dd1) : '', text: Number.isFinite(dd1) ? dd1.toFixed(4) : '∞' })),
          h('tr', null, h('th', { text: 'substitutions per unit t' }), h('td', { class: 'good', text: slope(ref).toFixed(4) }), h('td', { class: 'bad', text: slope(mut).toFixed(4) }))
        )
      );
    };
    slider.addEventListener('input', update);
    update();
  }

  function scienceRow() {
    const rec = state.recorded;
    const ad = rec && rec.adequacy;
    return { variant: 'S1', name: 'Wrong model for the data', science: true, adequacy: ad };
  }

  function renderMutationMatrix() {
    const rows = state.matrix;
    const table = clear($('#mm-table'));
    const checks = Lab.CHECKS;
    const rungStart = new Set(['C1', 'C8', 'C9']);
    const thead = h(
      'thead',
      null,
      h('tr', { class: 'rungs' }, h('th', { text: '' }), h('th', { colspan: 7, class: 'rung-start', text: 'Rung 1 · self-consistency' }), h('th', { colspan: 1, class: 'rung-start', text: 'Rung 2' }), h('th', { colspan: 3, class: 'rung-start', text: 'Rung 3 · anchors' }), h('th', { class: 'rung-start', text: 'Rung 4' })),
      h('tr', null, h('th', { text: 'Kernel' }), checks.map((c) => h('th', { class: rungStart.has(c.id) ? 'rung-start' : '', title: c.name, text: c.id })), h('th', { class: 'rung-start', title: 'Goodness of fit of the best JC69 fit', text: 'G-test' }))
    );
    const tbody = h('tbody');
    const detail = $('#mm-detail');
    const showDetail = (row, r, check) => {
      clear(detail).append(
        h('p', { style: 'margin:0 0 4px', html: `<strong>${row.variant} · ${row.name}</strong> — ${check ? `${check.id} ${check.name} (rung ${check.rung})` : 'G-test'}` }),
        h('p', { class: 'small', style: 'margin:0 0 4px', text: check ? check.claim : '' }),
        h('p', { class: 'mono small', style: 'margin:0', text: `${r.pass ? 'PASS' : 'FAIL'} · ${r.detail}` })
      );
    };
    const ad = state.recorded && state.recorded.adequacy;
    rows.forEach((row) => {
      const tr = h('tr', null, h('th', { scope: 'row' }, h('span', { class: 'vid', text: row.variant }), row.name));
      row.results.forEach((r, i) => {
        const c = checks[i];
        const td = h('td', { class: `${r.pass ? 'pass' : 'fail'}${rungStart.has(c.id) ? ' rung-start' : ''}` });
        const b = h('button', { type: 'button', 'aria-label': `${row.variant} ${c.id} ${r.pass ? 'passes' : 'fails'}`, text: r.pass ? '✓' : '✗' });
        b.addEventListener('click', () => showDetail(row, r, c));
        td.append(b);
        tr.append(td);
      });
      if (row.variant === 'M0' && ad) {
        const r = { pass: ad.jcOnJcData.pValue >= 1e-3, detail: `JC69 fit to JC69 data: G = ${ad.jcOnJcData.G.toFixed(2)}, df ${ad.jcOnJcData.df}, p = ${ad.jcOnJcData.pValue.toFixed(3)}` };
        const td = h('td', { class: `${r.pass ? 'pass' : 'fail'} rung-start` });
        const b = h('button', { type: 'button', text: r.pass ? '✓' : '✗' });
        b.addEventListener('click', () => showDetail(row, r, null));
        td.append(b);
        tr.append(td);
      } else tr.append(h('td', { class: 'na rung-start', title: 'A data-level check. Run on the reference kernel only.', text: 'n/a' }));
      tbody.append(tr);
    });
    // science row: same code as M0, wrong model for the data
    const m0 = rows.find((r) => r.variant === 'M0');
    const sr = scienceRow();
    const tr = h('tr', { class: 'science-row' }, h('th', { scope: 'row' }, h('span', { class: 'vid', text: 'S1' }), 'Correct code, wrong model'));
    m0.results.forEach((r, i) => {
      const c = checks[i];
      const td = h('td', { class: `pass${rungStart.has(c.id) ? ' rung-start' : ''}` });
      const b = h('button', { type: 'button', text: '✓' });
      b.addEventListener('click', () => showDetail({ variant: 'S1', name: 'Correct code, wrong model' }, { pass: true, detail: `Same code as M0. ${r.detail}` }, c));
      td.append(b);
      tr.append(td);
    });
    if (sr.adequacy) {
      const a = sr.adequacy.jcOnIData;
      const r = { pass: false, detail: `JC69 fit to data with 30% invariant sites: G = ${a.G.toFixed(1)}, df ${a.df}, p = ${a.pValue.toExponential(1)}` };
      const td = h('td', { class: 'fail rung-start' });
      const b = h('button', { type: 'button', text: '✗' });
      b.addEventListener('click', () => showDetail({ variant: 'S1', name: 'Correct code, wrong model' }, r, null));
      td.append(b);
      tr.append(td);
    }
    tbody.append(tr);
    table.append(thead, tbody);
  }

  function initMutationLab() {
    $('#mm-run').addEventListener('click', async () => {
      const btn = $('#mm-run');
      btn.disabled = true;
      $('#mm-status').textContent = 'Running 55 checks…';
      await sleep(30);
      const t0 = performance.now();
      const live = Lab.mutationMatrix();
      const ms = Math.round(performance.now() - t0);
      let same = 0;
      let total = 0;
      if (state.recorded) {
        state.recorded.mutationMatrix.forEach((row) => {
          const lr = live.find((x) => x.variant === row.variant);
          row.results.forEach((r, i) => {
            total++;
            if (lr && lr.results[i].pass === r.pass) same++;
          });
        });
      }
      state.matrix = live;
      state.matrixSource = 'live';
      renderMutationMatrix();
      renderLadder();
      $('#mm-status').textContent = state.recorded ? `Live run in ${ms} ms. ${same} of ${total} verdicts match the recorded run.` : `Live run in ${ms} ms.`;
      btn.disabled = false;
    });
  }

  /* =========================================================== Ch10 zone map */
  const zone = { pInv: 0, pick: { tLong: 1.0, tShort: 0.05 }, ml: null, mlFor: null };
  const ZX = { min: 0.02, max: 2.0 };
  const ZY = { min: 0.01, max: 0.4 };

  function zoneGeometry(canvas) {
    const m = { l: 58, r: 12, t: 12, b: 46 };
    return { m, w: canvas.width - m.l - m.r, h: canvas.height - m.t - m.b };
  }

  function drawZone() {
    const canvas = $('#zone-canvas');
    const ctx = canvas.getContext('2d');
    const { m, w, h: hh } = zoneGeometry(canvas);
    const nx = 64;
    const ny = 40;
    const M = K.makeModel();
    const col = { 0: cssVar('--navy-soft'), 1: cssVar('--burgundy-soft'), 2: cssVar('--paper-3') };
    ctx.fillStyle = cssVar('--paper-2');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const tL = ZX.min + ((i + 0.5) / nx) * (ZX.max - ZX.min);
        const tS = ZY.min + ((j + 0.5) / ny) * (ZY.max - ZY.min);
        const fr = M.classProbabilities(Lab.felsensteinTree(tL, tS), zone.pInv);
        const pick = argmax(K.parsimonyChoice(fr));
        ctx.fillStyle = col[pick];
        const x0 = m.l + Math.floor((i / nx) * w);
        const x1 = m.l + Math.floor(((i + 1) / nx) * w);
        const y1 = m.t + hh - Math.floor((j / ny) * hh);
        const y0 = m.t + hh - Math.floor(((j + 1) / ny) * hh);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // ML overlay (hatching where ML under JC69 is wrong)
    if (zone.ml && zone.mlFor === zone.pInv) {
      ctx.save();
      ctx.strokeStyle = cssVar('--burgundy');
      ctx.lineWidth = 1.4;
      zone.ml.forEach((c) => {
        if (c.right) return;
        const x0 = m.l + c.i0 * w;
        const x1 = m.l + c.i1 * w;
        const y0 = m.t + hh - c.j1 * hh;
        const y1 = m.t + hh - c.j0 * hh;
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.beginPath();
        for (let k = -(y1 - y0) - 14; k < x1 - x0 + 14; k += 7) {
          ctx.moveTo(x0 + k, y1);
          ctx.lineTo(x0 + k + (y1 - y0), y0);
        }
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = cssVar('--burgundy');
        ctx.lineWidth = 1.4;
      });
      ctx.restore();
    }
    // axes
    ctx.strokeStyle = cssVar('--ink-3');
    ctx.fillStyle = cssVar('--ink-2');
    ctx.lineWidth = 1;
    ctx.font = `12px ${cssVar('--font-mono') || 'monospace'}`;
    ctx.beginPath();
    ctx.moveTo(m.l, m.t);
    ctx.lineTo(m.l, m.t + hh);
    ctx.lineTo(m.l + w, m.t + hh);
    ctx.stroke();
    ctx.textAlign = 'center';
    [0.02, 0.5, 1.0, 1.5, 2.0].forEach((v) => {
      const x = m.l + ((v - ZX.min) / (ZX.max - ZX.min)) * w;
      ctx.beginPath();
      ctx.moveTo(x, m.t + hh);
      ctx.lineTo(x, m.t + hh + 5);
      ctx.stroke();
      ctx.fillText(v === 0.02 ? '0.02' : v.toFixed(1), x, m.t + hh + 18);
    });
    ctx.textAlign = 'right';
    [0.01, 0.1, 0.2, 0.3, 0.4].forEach((v) => {
      const y = m.t + hh - ((v - ZY.min) / (ZY.max - ZY.min)) * hh;
      ctx.beginPath();
      ctx.moveTo(m.l - 5, y);
      ctx.lineTo(m.l, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(2), m.l - 8, y + 4);
    });
    ctx.font = `12px ${cssVar('--font-ui') || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText('long branches A and C, tLong', m.l + w / 2, canvas.height - 8);
    ctx.save();
    ctx.translate(14, m.t + hh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('short branches and internal, tShort', 0, 0);
    ctx.restore();
    // labels in regions
    ctx.font = `600 13px ${cssVar('--font-ui') || 'sans-serif'}`;
    ctx.textAlign = 'left';
    const zl = 'Felsenstein zone';
    const zx = m.l + w * 0.66;
    const zy = m.t + hh * 0.9;
    ctx.fillStyle = cssVar('--paper');
    ctx.fillRect(zx - 6, zy - 15, ctx.measureText(zl).width + 12, 21);
    ctx.fillStyle = cssVar('--burgundy');
    ctx.fillText(zl, zx, zy);
    // marker
    const px = m.l + ((zone.pick.tLong - ZX.min) / (ZX.max - ZX.min)) * w;
    const py = m.t + hh - ((zone.pick.tShort - ZY.min) / (ZY.max - ZY.min)) * hh;
    ctx.strokeStyle = cssVar('--ink');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, 2 * Math.PI);
    ctx.moveTo(px - 12, py);
    ctx.lineTo(px - 4, py);
    ctx.moveTo(px + 4, py);
    ctx.lineTo(px + 12, py);
    ctx.moveTo(px, py - 12);
    ctx.lineTo(px, py - 4);
    ctx.moveTo(px, py + 4);
    ctx.lineTo(px, py + 12);
    ctx.stroke();
  }

  async function computeZoneML() {
    const btn = $('#zone-ml');
    const status = $('#zone-status');
    btn.disabled = true;
    const M = K.makeModel();
    const nx = 24;
    const ny = 14;
    const cells = [];
    const pInv = zone.pInv;
    let done = 0;
    let wrong = 0;
    let t0 = performance.now();
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const tL = ZX.min + ((i + 0.5) / nx) * (ZX.max - ZX.min);
        const tS = ZY.min + ((j + 0.5) / ny) * (ZY.max - ZY.min);
        const fr = M.classProbabilities(Lab.felsensteinTree(tL, tS), pInv);
        const share = K.mlChoice(fr, M, { tol: 1e-10 }).share;
        const right = share[0] >= 0.5;
        if (!right) wrong++;
        cells.push({ i0: i / nx, i1: (i + 1) / nx, j0: j / ny, j1: (j + 1) / ny, right });
        done++;
        if (performance.now() - t0 > 40) {
          status.textContent = `ML under JC69: ${done} of ${nx * ny} cells…`;
          await sleep(0);
          t0 = performance.now();
          if (zone.pInv !== pInv) {
            btn.disabled = false;
            return;
          }
        }
      }
    }
    zone.ml = cells;
    zone.mlFor = pInv;
    drawZone();
    status.textContent = wrong ? `ML under JC69 picks a wrong tree in ${wrong} of ${nx * ny} cells (hatched). The data have invariant sites; the model does not.` : `ML under JC69 picks the true tree in all ${nx * ny} cells. The model matches the data.`;
    btn.disabled = false;
  }

  function initZone() {
    const canvas = $('#zone-canvas');
    const slider = $('#zone-pinv');
    drawZone();
    slider.addEventListener('input', () => {
      zone.pInv = Number(slider.value);
      $('#zone-pinv-val').textContent = zone.pInv.toFixed(2);
      $('#zone-status').textContent = zone.ml && zone.mlFor !== zone.pInv ? 'The overlay is for another pInv. Compute it again.' : '';
      drawZone();
    });
    $('#zone-ml').addEventListener('click', computeZoneML);
    canvas.addEventListener('click', (ev) => {
      const r = canvas.getBoundingClientRect();
      const sx = ((ev.clientX - r.left) / r.width) * canvas.width;
      const sy = ((ev.clientY - r.top) / r.height) * canvas.height;
      const { m, w, h: hh } = zoneGeometry(canvas);
      const tL = ZX.min + ((sx - m.l) / w) * (ZX.max - ZX.min);
      const tS = ZY.min + ((m.t + hh - sy) / hh) * (ZY.max - ZY.min);
      if (tL < ZX.min || tL > ZX.max || tS < ZY.min || tS > ZY.max) return;
      zone.pick = { tLong: Math.round(tL * 100) / 100, tShort: Math.round(tS * 1000) / 1000 };
      $('#zone-pick').textContent = `Selected: tLong = ${zone.pick.tLong.toFixed(2)}, tShort = ${zone.pick.tShort.toFixed(3)}, pInv = ${zone.pInv.toFixed(2)}. Loaded into Lab 4.`;
      $('#st-long').value = zone.pick.tLong;
      $('#st-short').value = zone.pick.tShort;
      $('#st-pinv').value = zone.pInv;
      document.querySelectorAll('input[name="study-preset"]').forEach((x) => (x.checked = false));
      drawZone();
    });
    document.addEventListener('themechange', () => requestAnimationFrame(drawZone));
  }

  /* =========================================================== Ch10 study harness */
  const ledger = storageGet('quartet-ledger-v1', []);

  function readStudyParams() {
    const methods = ['ml'];
    if ($('#st-mli').checked) methods.push('mlI');
    const num = (id, lo, hi, def) => {
      const v = Number($(id).value);
      return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
    };
    return {
      tLong: num('#st-long', 0.01, 3, 1),
      tShort: num('#st-short', 0.005, 1, 0.05),
      pInv: num('#st-pinv', 0, 0.8, 0),
      ns: NS.slice(),
      replicates: Math.round(num('#st-reps', 5, 200, 40)),
      seed: Math.round(num('#st-seed', 1, 4294967295, 20261006)) >>> 0,
      methods,
    };
  }

  async function runStudy(params) {
    const jobs = Lab.studyJobs(params);
    const results = [];
    const bar = $('#st-bar');
    $('#st-progress').hidden = false;
    let t0 = performance.now();
    for (let i = 0; i < jobs.length; i++) {
      results.push(Lab.runJob(jobs[i], params));
      if (performance.now() - t0 > 35) {
        bar.style.width = `${(100 * (i + 1)) / jobs.length}%`;
        await sleep(0);
        t0 = performance.now();
      }
    }
    bar.style.width = '100%';
    await sleep(120);
    $('#st-progress').hidden = true;
    bar.style.width = '0';
    return Lab.summarize(results, params);
  }

  function drawStudy(summary, params, title) {
    const W = 560;
    const H = 330;
    const m = { l: 50, r: 18, t: 46, b: 44 };
    const X = (n) => m.l + ((Math.log10(n) - 2) / 2) * (W - m.l - m.r);
    const Y = (f) => H - m.b - f * (H - m.t - m.b);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Fraction of replicates that pick the true tree' });
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => svg.append(s('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: Y(f), y2: Y(f) })));
    const ax = s('g', { class: 'axis' });
    ax.append(s('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }), s('line', { x1: m.l, x2: m.l, y1: Y(0), y2: Y(1) }));
    params.ns.forEach((n) => ax.append(s('line', { x1: X(n), x2: X(n), y1: Y(0), y2: Y(0) + 5 }), s('text', { x: X(n), y: Y(0) + 18, 'text-anchor': 'middle', text: n >= 1000 ? `${n / 1000}k` : String(n) })));
    [0, 0.5, 1].forEach((f) => ax.append(s('text', { x: m.l - 8, y: Y(f) + 4, 'text-anchor': 'end', text: f.toFixed(1) })));
    svg.append(ax);
    svg.append(s('text', { class: 'axis-title', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', text: 'sites in the alignment (log scale)' }));
    svg.append(s('text', { class: 'axis-title', x: m.l, y: 12, text: title }));
    const series = [['pars', 'Parsimony'], ['ml', 'ML · JC69'], ['mlI', 'ML · JC69+I']].filter(([k]) => k === 'pars' || params.methods.includes(k));
    series.forEach(([k, label], si) => {
      const lx = m.l + si * 150;
      svg.append(s('line', { class: `s-line s-${k}`, x1: lx, x2: lx + 22, y1: 30, y2: 30 }), s('circle', { class: `s-dot s-${k}`, cx: lx + 11, cy: 30, r: 4 }), s('text', { class: `series-label s-${k}`, x: lx + 30, y: 34, text: label }));
    });
    series.forEach(([k], si) => {
      const pts = summary.map((r) => [X(r.n) + (si - 1) * 4, Y(r[k].share[0]), r[k].ci]);
      svg.append(s('path', { class: `s-line s-${k}`, d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ') }));
      pts.forEach(([x, y, ci]) => {
        svg.append(s('line', { class: `s-ci s-${k}`, x1: x, x2: x, y1: Y(ci[0]), y2: Y(ci[1]) }));
        svg.append(s('circle', { class: `s-dot s-${k}`, cx: x, cy: y, r: 4.2 }));
      });
    });
    clear($('#study-chart')).append(svg);
  }

  function studySummaryTable(summary, params, extra) {
    const host = clear($('#study-summary'));
    const inf = Lab.infiniteData(params);
    const cols = [['pars', 'Parsimony'], ['ml', 'ML JC69'], ['mlI', 'ML JC69+I']].filter(([k]) => k === 'pars' || params.methods.includes(k));
    const infPick = { pars: argmax(inf.parsimony.share), ml: argmax(inf.ml.share), mlI: argmax(inf.mlI.share) };
    host.append(
      h('p', { class: 'small', text: `True tree AB|CD · tLong ${params.tLong}, tShort ${params.tShort}, pInv ${params.pInv} · ${params.replicates} replicates per length · seed ${params.seed}` }),
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', { text: 'sites' }), cols.map(([, l]) => h('th', { text: l })))),
        h(
          'tbody',
          null,
          summary.map((r) => h('tr', null, h('td', { text: r.n.toLocaleString('en') }), cols.map(([k]) => h('td', { text: pct(r[k].share[0]) })))),
          h('tr', null, h('td', { text: '∞ (exact)' }), cols.map(([k]) => h('td', { style: `color:var(${infPick[k] === 0 ? '--pass' : '--burgundy'});font-weight:600`, text: TOPO[infPick[k]] })))
        )
      )
    );
    if (extra) host.append(extra);
  }

  function studyRecordedParams(which) {
    const rec = state.recorded && state.recorded.studies && state.recorded.studies[which];
    return rec ? Object.assign({}, rec.params) : null;
  }

  function compareSummaries(a, b, methods) {
    let n = 0;
    let same = 0;
    a.forEach((row, i) => {
      ['pars', ...methods].forEach((k) => {
        row[k].share.forEach((v, j) => {
          n++;
          if (b[i] && b[i][k] && Math.abs(b[i][k].share[j] - v) < 1e-12) same++;
        });
      });
    });
    return { n, same };
  }

  function addToLedger(manifest) {
    ledger.unshift(manifest);
    while (ledger.length > 20) ledger.pop();
    storageSet('quartet-ledger-v1', ledger);
    renderLedger();
  }

  function renderLedger() {
    const table = clear($('#ledger'));
    table.append(h('thead', null, h('tr', null, ['Run ID', 'Scenario', 'Seed', 'Reps', 'Source', 'True tree at 10k', 'Time', ''].map((t) => h('th', { text: t })))));
    const tb = h('tbody');
    if (!ledger.length) tb.append(h('tr', null, h('td', { class: 'empty', colspan: 8, text: 'No runs yet. Run a study above. Each run adds a row with its manifest.' })));
    ledger.forEach((mf) => {
      const last = mf.results[mf.results.length - 1];
      const at10k = ['pars', ...mf.params.methods].map((k) => `${k === 'pars' ? 'P' : k === 'ml' ? 'ML' : 'ML+I'} ${pct(last[k].share[0])}`).join(' · ');
      const b = h('button', { type: 'button', text: 'Manifest' });
      b.addEventListener('click', () => {
        const pre = $('#ledger-json');
        pre.hidden = false;
        pre.textContent = JSON.stringify(mf, null, 2);
      });
      tb.append(h('tr', null, h('td', { text: mf.runId }), h('td', { text: `${mf.params.tLong}/${mf.params.tShort}/${mf.params.pInv}` }), h('td', { text: mf.params.seed }), h('td', { text: mf.params.replicates }), h('td', { title: mf.sourceHash, text: mf.sourceHash.slice(0, 8) }), h('td', { text: at10k }), h('td', { text: `${mf.durationMs} ms` }), h('td', null, b)));
    });
    table.append(tb);
  }

  function setPreset(key) {
    const p = SCENARIOS[key];
    $('#st-long').value = p.tLong;
    $('#st-short').value = p.tShort;
    $('#st-pinv').value = p.pInv;
    $('#st-mli').checked = p.mlI;
  }

  async function doStudy(params, label, compareTo) {
    const buttons = ['#st-run', '#st-repro-a', '#st-repro-b'].map((id) => $(id));
    buttons.forEach((b) => (b.disabled = true));
    const startedAt = new Date().toISOString();
    const t0 = performance.now();
    const summary = await runStudy(params);
    const durationMs = Math.round(performance.now() - t0);
    let extra = null;
    if (compareTo) {
      const { n, same } = compareSummaries(compareTo.summary, summary, params.methods);
      extra = h('div', { class: `repro ${same === n ? 'ok' : 'bad'}`, text: same === n ? `Reproduced. ${same} of ${n} recorded fractions match exactly, with the same seed and the same source hash.` : `${same} of ${n} recorded fractions match. Check the source hash and the parameters.` });
    }
    drawStudy(summary, params, label);
    studySummaryTable(summary, params, extra);
    addToLedger(
      Lab.makeManifest({
        kind: 'consistency-study',
        command: compareTo ? `page: reproduce ${compareTo.label}` : 'page: run study',
        startedAt,
        durationMs,
        sourceHash: state.liveHash,
        environment: { runtime: navigator.userAgent.split(') ').pop().slice(0, 60) },
        params,
        results: summary,
      })
    );
    buttons.forEach((b) => (b.disabled = false));
  }

  function initStudy() {
    document.querySelectorAll('input[name="study-preset"]').forEach((r) => r.addEventListener('change', () => setPreset(r.value)));
    setPreset('A');
    $('#st-run').addEventListener('click', () => {
      const p = readStudyParams();
      doStudy(p, `Live study · tLong ${p.tLong}, tShort ${p.tShort}, pInv ${p.pInv}`);
    });
    const repro = (which) => {
      const params = studyRecordedParams(which);
      if (!params) return;
      const rec = state.recorded.studies[which];
      $('#st-long').value = params.tLong;
      $('#st-short').value = params.tShort;
      $('#st-pinv').value = params.pInv;
      $('#st-reps').value = params.replicates;
      $('#st-seed').value = params.seed;
      $('#st-mli').checked = params.methods.includes('mlI');
      document.querySelectorAll('input[name="study-preset"]').forEach((x) => (x.checked = x.value === which));
      doStudy(params, `Reproduction of recorded study ${which}`, rec);
    };
    $('#st-repro-a').addEventListener('click', () => repro('A'));
    $('#st-repro-b').addEventListener('click', () => repro('B'));
    // At rest: show the recorded study A.
    const rec = state.recorded && state.recorded.studies && state.recorded.studies.A;
    if (rec) {
      drawStudy(rec.summary, rec.params, 'Recorded study A (verification run)');
      studySummaryTable(rec.summary, rec.params, h('p', { class: 'small', text: 'Recorded by node tests/verify.js. Press “Reproduce recorded study A” to run it again here.' }));
    }
    renderLedger();
  }

  /* =========================================================== Ch11 goodness of fit */
  function runGof() {
    const pInv = Math.min(0.8, Math.max(0, Number($('#gf-pinv').value) || 0));
    const n = Math.min(100000, Math.max(500, Math.round(Number($('#gf-n').value) || 5000)));
    const seed = Math.max(1, Math.round(Number($('#gf-seed').value) || 11)) >>> 0;
    const tree = Lab.felsensteinTree(SCENARIOS.B.tLong, SCENARIOS.B.tShort);
    const { counts } = Lab.simulateQuartet(tree, n, seed, pInv);
    const a = Lab.adequacy(counts);
    const b = Lab.adequacy(counts, { invariant: true });
    const row = (name, r) => {
      const pick = argmax(r.share);
      return h(
        'tr',
        null,
        h('th', { text: name }),
        h('td', { class: pick === 0 ? 'good' : 'bad', text: TOPO[pick] }),
        h('td', { text: r.G.toFixed(2) }),
        h('td', { text: String(r.df) }),
        h('td', { text: r.pValue < 1e-4 ? r.pValue.toExponential(1) : r.pValue.toFixed(4) }),
        h('td', { class: r.pass ? 'good' : 'bad', text: r.pass ? 'fits' : 'rejected' }),
        h('td', { text: r.best.pInv ? r.best.pInv.toFixed(3) : '—' })
      );
    };
    clear($('#gof-table')).append(
      h('thead', null, h('tr', null, ['Model', 'Best tree', 'G', 'df', 'p', 'Verdict', 'pInv fitted'].map((t) => h('th', { text: t })))),
      h('tbody', null, row('JC69', a), row('JC69+I', b)),
      h('caption', { class: 'small', style: 'caption-side:bottom;text-align:left;padding-top:6px', text: `${n.toLocaleString('en')} simulated sites on the scenario-B tree, pInv = ${pInv}, seed ${seed}. True tree AB|CD.` })
    );
  }

  /* =========================================================== Ch12 week + DAG */
  function renderWeek() {
    const host = $('#week');
    C.WEEK.forEach((d, i) => {
      host.append(
        h(
          'div',
          { class: `day${i === 3 ? ' fail' : ''}` },
          h('p', { class: 'day-no', text: d.day }),
          h('h4', { text: d.title }),
          h('p', { text: d.did }),
          h(
            'div',
            { class: 'chips' },
            d.mech.map((id) => {
              const b = h('button', { type: 'button', class: 'chip', text: MECH[id].name, title: 'Show in the matrix (chapter 3)' });
              b.addEventListener('click', () => window.__selectMechanism && window.__selectMechanism(id));
              return b;
            })
          ),
          h('p', { class: 'why', text: d.why }),
          h('p', { class: 'out', text: `→ ${d.out}` })
        )
      );
    });
  }

  function initDag() {
    const status = Object.fromEntries(C.TASKS.map((t) => [t.id, 'ok']));
    let selected = 'T06';
    const colW = 118;
    const rowH = 62;
    const boxW = 104;
    const boxH = 44;
    const cols = {};
    C.TASKS.forEach((t) => (cols[C.depth(t.id)] = (cols[C.depth(t.id)] || []).concat(t.id)));
    const maxRows = Math.max(...Object.values(cols).map((c) => c.length));
    const H = maxRows * rowH + 24;
    const W = Object.keys(cols).length * colW + 10;
    const pos = {};
    Object.entries(cols).forEach(([d, ids]) => {
      ids.forEach((id, r) => {
        const y = 12 + (H - 24 - ids.length * rowH) / 2 + r * rowH;
        pos[id] = [10 + Number(d) * colW, y];
      });
    });

    function draw() {
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Task graph' });
      svg.append(s('defs', null, s('pattern', { id: 'dag-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 6, height: 6, fill: 'var(--warn-soft)' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'dag-hatch-line' }))));
      C.TASKS.forEach((t) => {
        t.deps.forEach((d) => {
          const [x1, y1] = pos[d];
          const [x2, y2] = pos[t.id];
          const ax = x1 + boxW;
          const ay = y1 + boxH / 2;
          const bx = x2;
          const by = y2 + boxH / 2;
          const stale = status[t.id] === 'stale' && status[d] !== 'ok';
          svg.append(s('path', { class: `dep${stale ? ' stale' : ''}`, d: `M${ax},${ay} C ${ax + 22},${ay} ${bx - 22},${by} ${bx},${by}` }));
        });
      });
      C.TASKS.forEach((t) => {
        const [x, y] = pos[t.id];
        const st = status[t.id];
        const g = s(
          'g',
          { class: `task ${st}${selected === t.id ? ' sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': `${t.id} ${t.title}, ${st}` },
          s('rect', { class: 'box', x, y, width: boxW, height: boxH, rx: 2 }),
          s('text', { class: 'tid', x: x + 7, y: y + 14, text: t.id }),
          s('text', { class: `tst ${st === 'ok' ? 'ok' : st === 'changed' ? 'changed' : st === 'running' ? 'changed' : 'stale'}`, x: x + boxW - 7, y: y + 14, 'text-anchor': 'end', text: st === 'ok' ? '✓ CURRENT' : st === 'changed' ? 'CHANGED' : st === 'running' ? 'RUNNING' : 'STALE' }),
          s('text', { class: 'ttl', x: x + 7, y: y + 32, text: t.title.length > 17 ? `${t.title.slice(0, 16)}…` : t.title })
        );
        const pick = () => {
          selected = t.id;
          draw();
          detail();
        };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            pick();
          }
        });
        svg.append(g);
      });
      clear($('#dag-svg')).append(svg);
    }
    function detail() {
      const t = C.TASKS.find((x) => x.id === selected);
      clear($('#dag-detail')).append(
        h('h4', { text: `${t.id} · ${t.title}` }),
        h('dl', null, h('dt', { text: 'Owner' }), h('dd', { text: t.owner }), h('dt', { text: 'Works in' }), h('dd', { text: t.where }), h('dt', { text: 'Needs' }), h('dd', { text: t.deps.length ? t.deps.join(', ') : '—' }), h('dt', { text: 'Accept if' }), h('dd', { text: t.accept }), h('dt', { text: 'Evidence' }), h('dd', { text: t.evidence }), h('dt', { text: 'Status' }), h('dd', { text: status[t.id] }))
      );
    }
    function change(id) {
      status[id] = 'changed';
      const down = C.downstream(id);
      down.forEach((d) => (status[d] = 'stale'));
      const ordered = C.topoOrder().filter((x) => down.has(x));
      $('#dag-status').textContent = `${id} changed. ${down.size} downstream tasks are stale: ${ordered.join(', ')}. Git reports no conflict.`;
      draw();
      detail();
    }
    $('#dag-conv').addEventListener('click', () => change('T02'));
    $('#dag-sim').addEventListener('click', () => change('T07'));
    $('#dag-rerun').addEventListener('click', async () => {
      const order = C.topoOrder().filter((id) => status[id] !== 'ok');
      if (!order.length) {
        $('#dag-status').textContent = 'Nothing is stale. Change a task first.';
        return;
      }
      $('#dag-rerun').disabled = true;
      for (const id of order) {
        status[id] = 'running';
        $('#dag-status').textContent = `Running ${id} again…`;
        draw();
        await sleep(reduceMotion ? 0 : 260);
        status[id] = 'ok';
        draw();
      }
      $('#dag-status').textContent = `${order.length} tasks ran again in dependency order: ${order.join(' → ')}. All tasks are current.`;
      $('#dag-rerun').disabled = false;
      detail();
    });
    draw();
    detail();
  }

  /* =========================================================== Ch13 claims, ch14 card */
  const EVIDENCE_ANCHOR = { 'mutation-matrix': '#mm-lab', 'source-identity': '#identity', 'zone-map': '#zone-lab', 'study-A': '#study-lab', 'study-B': '#study-lab', 'infinite-data': '#plate-1', adequacy: '#fit-lab' };
  function renderClaims() {
    const table = $('#claims');
    table.append(h('thead', null, h('tr', null, ['', 'Claim', 'Status', 'Evidence', 'Limits'].map((t) => h('th', { text: t })))));
    const tb = h('tbody');
    C.CLAIMS.forEach((k) => {
      let status = k.status;
      let limits = k.limits;
      if (k.id === 'K8' && !state.hashMatches) {
        status = 'not-tested';
        limits = 'The live hash does not match the recorded hash on this copy of the page.';
      }
      tb.append(
        h(
          'tr',
          null,
          h('th', { text: k.id }),
          h('td', { text: k.text }),
          h('td', null, h('span', { class: `status ${status}`, text: status.replace('-', ' ') })),
          h('td', null, k.evidence.length ? k.evidence.map((e, i) => [i ? ', ' : '', h('a', { href: EVIDENCE_ANCHOR[e], text: e })]) : '—'),
          h('td', { text: limits })
        )
      );
    });
    table.append(tb);
  }

  function renderCard() {
    const models = $('#models');
    C.MODELS.forEach((m) => models.append(h('li', null, h('span', { class: 'm-n', text: String(m.n).padStart(2, '0') }), h('h4', { text: m.title }), h('p', { text: m.rule }))));
    const ex = $('#exercises');
    C.EXERCISES.forEach((e, i) => ex.append(h('details', { class: 'ex' }, h('summary', { text: `${i + 1}. ${e.q}` }), h('p', { text: e.a }))));
    const gl = $('#glossary');
    C.GLOSSARY.forEach(([t, d]) => gl.append(h('dt', { text: t }), h('dd', { text: d })));
  }

  function initCopy() {
    document.querySelectorAll('button.copy').forEach((b) => {
      b.addEventListener('click', () => {
        const target = document.getElementById(b.dataset.copy);
        const text = target ? target.textContent : '';
        const done = () => {
          b.textContent = 'Copied';
          setTimeout(() => (b.textContent = 'Copy template'), 1600);
        };
        const fallback = () => {
          const range = document.createRange();
          range.selectNodeContents(target);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          b.textContent = 'Selected: press Ctrl+C';
        };
        try {
          navigator.clipboard.writeText(text).then(done, fallback);
        } catch (e) {
          fallback();
        }
      });
    });
  }

  /* =========================================================== Boot */
  function safe(name, fn) {
    try {
      const r = fn();
      if (r && typeof r.catch === 'function') r.catch((e) => console.error(name, e));
    } catch (e) {
      console.error(name, e);
    }
  }

  async function boot() {
    initTheme();
    initRail();
    state.recorded = await loadRecorded();
    state.liveHash = Lab.sourceIdentity([quartetKernelFactory, quartetLabFactory]);
    state.matrix = state.recorded ? state.recorded.mutationMatrix : Lab.mutationMatrix();
    safe('identity', renderIdentity);
    safe('hero', renderHeroVerdict);
    safe('model', renderDomainModel);
    safe('alignment', renderAlignment);
    safe('classes', renderClassTable);
    safe('states', renderStates);
    safe('matrix', renderMatrix);
    safe('worktrees', initWorktrees);
    safe('scenarios', renderScenarios);
    safe('context', initContextLab);
    safe('manifest', renderManifest);
    safe('roles', renderRoles);
    safe('ladder', renderLadder);
    safe('pt', renderPtLab);
    safe('mm', renderMutationMatrix);
    safe('mmlab', initMutationLab);
    safe('zone', initZone);
    safe('study', initStudy);
    safe('gof', () => {
      runGof();
      $('#gf-run').addEventListener('click', runGof);
    });
    safe('week', renderWeek);
    safe('dag', initDag);
    safe('claims', renderClaims);
    safe('card', renderCard);
    safe('copy', initCopy);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
