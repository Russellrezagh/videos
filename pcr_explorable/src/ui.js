/*
 * Page wiring: links between words and drawn objects, prediction cards,
 * step-by-step derivations, generated cards, and the figures' mount points.
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- one object, one colour, everywhere ---------- */
  function linkObjects() {
    for (const o of $$('.o[data-obj]')) {
      const obj = PCR.OBJECTS[o.dataset.obj];
      if (obj) o.dataset.role = obj.role;
      o.tabIndex = 0;
      o.title = obj ? obj.def : '';
    }
    let lit = null;
    const light = (obj) => {
      if (lit === obj) return;
      unlight();
      lit = obj;
      for (const n of $$(`[data-obj~="${obj}"]`)) n.classList.add(n.classList.contains('o') ? 'on' : 'lit-glow');
    };
    const unlight = () => {
      if (!lit) return;
      for (const n of $$('.lit-glow, .o.on')) n.classList.remove('lit-glow', 'on');
      lit = null;
    };
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('[data-obj]');
      if (t) light(t.getAttribute('data-obj').split(' ')[0]);
      else unlight();
    });
    document.addEventListener('focusin', (e) => {
      const t = e.target.closest && e.target.closest('[data-obj]');
      if (t) light(t.getAttribute('data-obj').split(' ')[0]);
    });
    document.addEventListener('focusout', unlight);
  }

  function legend() {
    const host = $('#legend');
    for (const [role, r] of Object.entries(PCR.ROLES)) {
      const s = document.createElement('span');
      s.style.setProperty('--sw', `var(${r.token})`);
      s.textContent = r.meaning;
      host.appendChild(s);
      void role;
    }
  }

  function toc() {
    const host = $('#toc');
    for (const sec of $$('section.sec')) {
      const eb = $('.eyebrow span', sec);
      const h = $('h2', sec);
      if (!eb || !h) continue;
      const n = (eb.textContent.match(/§\s*(\d+)/) || [])[1];
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${n ? '§ ' + n : ''}</span><a href="#${sec.id}"></a>`;
      $('a', li).textContent = h.textContent;
      host.appendChild(li);
    }
  }

  /* ---------- prediction cards ---------- */
  function asks() {
    for (const card of $$('.ask')) {
      const ans = card.dataset.answer;
      const a = $('.a', card);
      for (const b of $$('.opts button', card)) {
        b.addEventListener('click', () => {
          for (const x of $$('.opts button', card)) x.classList.remove('right', 'wrong');
          b.classList.add(b.dataset.v === ans ? 'right' : 'wrong');
          if (b.dataset.v === ans) $$('.opts button', card).forEach((x) => (x.disabled = x !== b));
          a.hidden = false;
        });
      }
    }
    for (const g of $$('[data-goto]')) {
      g.addEventListener('click', () => {
        if (window.ANIM) window.ANIM.goto(Number(g.dataset.goto));
        $('#anim-stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      });
    }
  }

  /* ---------- derivations revealed one step at a time ---------- */
  function steps() {
    const list = $('#steps-count');
    const items = $$('li', list);
    let shown = 1;
    const paint = () => items.forEach((li, i) => li.classList.toggle('pending', i >= shown));
    paint();
    $('#steps-next').addEventListener('click', () => {
      shown = Math.min(items.length, shown + 1);
      paint();
    });
    $('#steps-all').addEventListener('click', () => {
      shown = items.length;
      paint();
    });
  }

  /* ---------- the standard-curve worked example, computed ---------- */
  function workedStandard() {
    const std = [[1e6, 15.1], [1e5, 18.4], [1e4, 21.8], [1e3, 25.1]].map(([N0, ct]) => ({ N0, ct }));
    const sc = PCR.standardCurve(std);
    const unknown = sc.quantify(20.0);
    const rows = [
      [`Fit a line to (log₁₀N₀, Ct): slope m = ${sc.slope.toFixed(3)}, intercept b = ${sc.intercept.toFixed(2)}`, `Least squares through the four points; R² = ${sc.r2.toFixed(4)}.`],
      [`E = 10^(−1/m) − 1 = 10^(${(-1 / sc.slope).toFixed(4)}) − 1 = ${(100 * sc.E).toFixed(1)} %`, 'From the slope, as derived above.'],
      [`log₁₀N₀ = (Ct − b) / m = (20.0 − ${sc.intercept.toFixed(2)}) / ${sc.slope.toFixed(3)} = ${Math.log10(unknown).toFixed(3)}`, 'Read the line backwards.'],
      [`N₀ = 10^${Math.log10(unknown).toFixed(3)} ≈ ${Math.round(unknown).toLocaleString('en-US')} copies`, 'Between the 10⁴ and 10⁵ standards, as its Ct (20.0) lies between theirs.'],
    ];
    const host = $('#steps-std');
    for (const [m, why] of rows) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="mono"></span><span class="why"></span>';
      li.firstChild.textContent = m;
      li.lastChild.textContent = why;
      host.appendChild(li);
    }
  }

  /* ---------- misconceptions and exercises from data ---------- */
  const MIS = [
    ['PCR copies the whole genome.', 'It copies only the stretch between the two primers.', 'The polymerase starts only at primers, and exact products end at the other primer site.'],
    ['The product doubles for as long as you keep cycling.', 'Growth slows to a plateau after roughly 25–35 cycles.', 'Primers and dNTPs run low, the enzyme becomes limiting, and products re-pair with each other.'],
    ['The first cycle already makes the target product.', 'The first exact double strands appear in cycle 3.', 'Originals template long strands; long strands template exact ones; exact ones need exact partners.'],
    ['A later Ct means more DNA.', 'A later Ct means less starting DNA.', 'It took more cycles to reach the same threshold; at E = 1, 3.3 cycles later is ten times less.'],
    ['The brightest band at the end had the most template.', 'End-point brightness compresses differences.', 'Every tube converges on the same plateau; quantify in the exponential phase.'],
    ['A colder annealing step is safer: more primers bind.', 'It makes binding less selective: wrong products and primer-dimers.', 'Partial matches stay bound when it is cold enough.'],
    ['Heat must destroy the enzyme, so it is added every cycle.', 'Taq survives the whole run.', 'It comes from a bacterium that lives in hot springs. Early PCR did add fresh enzyme every cycle.'],
  ];
  function misconceptions() {
    const host = $('#mis');
    for (const [looks, actually, because] of MIS) {
      const a = document.createElement('article');
      a.innerHTML = '<dl><dt>Looks like</dt><dd class="looks"></dd><dt>Actually</dt><dd class="actually"></dd><dt>Because</dt><dd></dd></dl>';
      const dds = $$('dd', a);
      dds[0].textContent = looks;
      dds[1].textContent = actually;
      dds[2].textContent = because;
      host.appendChild(a);
    }
  }
  function exercises() {
    const host = $('#exercises');
    const n5 = PCR.closed.amplicons(5);
    const e36 = 10 ** (1 / 3.6) - 1;
    const lam = PCR.dpcrLambda(2000, 20000);
    const EX = [
      ['Starting from one template at E = 1, how many exact double-stranded amplicons are there after 5 cycles?', `2⁵ − 2·5 = ${n5}. (Of 32 double strands, the other 10 still contain a long strand.)`],
      ['A tenfold dilution series shows Ct steps of 3.6 cycles. What is the efficiency?', `Slope −3.6, so E = 10^(1/3.6) − 1 = ${(100 * e36).toFixed(1)} %: just below the usual 90–110 % range, so this assay deserves a second look.`],
      ['Digital PCR: 20,000 droplets, 2,000 positive. How many copies were partitioned?', `p = 0.1, λ = −ln(0.9) = ${lam.toFixed(4)} per droplet, so about ${Math.round(lam * 20000).toLocaleString('en-US')} copies. Counting positives (2,000) would undercount, because some droplets got two.`],
      ['Your primers have Tm 62 °C and 58 °C. Where do you start the annealing step?', 'A few degrees below the lower one, around 54–55 °C, then adjust: raise it if you see extra bands, lower it if the yield is poor. A pair 4 °C apart is acceptable; much wider and one primer is always working off its best temperature.'],
      ['Why does a mismatch at a primer’s 3′ end usually kill the reaction, while an extra tail at its 5′ end does not?', 'The polymerase extends from a paired 3′ end. A mismatched 3′ base is not extended (allele-specific PCR uses this on purpose), while the 5′ end is never touched, so labs append restriction sites or adapters there.'],
    ];
    for (const [q, a] of EX) {
      const li = document.createElement('li');
      li.innerHTML = '<p></p><details class="deeper"><summary>Answer</summary><p></p></details>';
      $('p', li).textContent = q;
      $('details p', li).textContent = a;
      host.appendChild(li);
    }
  }

  /* ---------- code cells show the functions this page runs ---------- */
  function code(id, fn, out) {
    const pre = $(id);
    if (!pre) return;
    const src = fn.toString().split('\n');
    const indent = Math.min(...src.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    pre.textContent = [src[0], ...src.slice(1).map((l) => l.slice(indent))].join('\n');
    if (out) $(out.id).textContent = out.text();
  }

  function numbers() {
    const set = (id, v) => {
      const n = $(id);
      if (n) n.textContent = v;
    };
    set('#contam', PCR.sci(PCR.copies(1, 0.95, 35), 1));
    set('#poisson3', `${(100 * PCR.poissonZero(3)).toFixed(0)} %`);
    set('#transfer', Math.round(1e4 / 1.95 ** 5).toLocaleString('en-US'));
  }

  function figures() {
    FIG.hero(wrapScroll($('#fig-hero'), 640));
    FIG.map(wrapScroll($('#fig-map'), 760));
    const tubeHost = $('#fig-tube');
    tubeHost.classList.add('tube-wrap');
    const art = document.createElement('div');
    const info = document.createElement('p');
    info.className = 'tube-info';
    info.setAttribute('aria-live', 'polite');
    tubeHost.append(art, info);
    FIG.tube(art, info);
    FIG.gel(wrapScroll($('#fig-gel'), 420));
    FIG.timeline($('#fig-time'));
  }
  function wrapScroll(host, minw) {
    host.classList.add('scroll');
    host.style.setProperty('--minw', `${minw}px`);
    return host;
  }

  function boot() {
    figures();
    linkObjects();
    legend();
    toc();
    asks();
    steps();
    workedStandard();
    misconceptions();
    exercises();
    numbers();
    code('#code-census', PCR.census, { id: '#code-census-out', text: () => {
      const c = PCR.census(10);
      return `census(10) → O = ${c.O}, L = ${c.L}, S = ${c.S}; double strands: O:L ${c.OL}, L:S ${c.LS}, amplicons ${c.SS} of ${c.duplexes}`;
    } });
    code('#code-tm', PCR.tmNN);
    if (window.LABS) window.LABS.boot();
    if (window.ANIM) window.ANIM.boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
