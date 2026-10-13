// ───────────────────────────── the film: timeline, compositing, playback ─────────────────────────────
// Silent film: each chapter is a list of on-screen text beats; a beat lasts long enough to be read,
// plus a hold for its animation. Visual cues are keyed to beat starts.

function buildFilm(spec) {
  const scenes = [], beats = [];
  let T = 0;
  spec.scenes.forEach((sc, si) => {
    const scene = { key: sc.key, num: sc.num, title: sc.title, start: T, beats: [] };
    let t = sc.lead;
    for (const b of sc.beats) {
      const words = b.t.split(/\s+/).length;
      const dur = spec.beatBase + words / spec.readingRate + (b.hold || 0) * spec.holdScale;
      scene.beats.push({ start: t, dur, t: b.t });
      beats.push({ start: T + t, dur, t: b.t, scene: si });
      t += dur;
    }
    scene.dur = t + sc.tail;
    T += scene.dur;
    scenes.push(scene);
  });
  const sceneAt = x => { for (let i = scenes.length - 1; i >= 0; i--) if (x >= scenes[i].start) return scenes[i]; return scenes[0]; };
  return { scenes, beats, total: T, sceneAt };
}
const FILM = buildFilm(FILM_SPEC);

function beatAt(sc, t) { let k = -1; sc.beats.forEach((b, i) => { if (t >= b.start - 0.01) k = i; }); return k; }

function drawBeatText(sc, t, def) {
  const k = beatAt(sc, t);
  if (k < 0) return;
  const b = sc.beats[k], next = sc.beats[k + 1] ? sc.beats[k + 1].start : sc.dur - 0.2;
  const a = Math.min(clamp((t - b.start) / 0.5), clamp((next - t) / 0.35));
  const size = 32, lh = 1.32, maxW = def.textW || 1420;
  const n = wrapCount(b.t, size, maxW);
  const x = def.textX || 120;
  const y = def.textPos === 'top' ? 200 : 1004 - (n - 1) * size * lh;
  const dy = (1 - ease.out(clamp((t - b.start) / 0.6))) * 10;
  text(b.t, x, y + dy, { size, color: PAL.ink, alpha: a, maxW, lh });
}
function drawTitle(sc, t) {
  if (!sc.num) return;
  const a = clamp((t - 0.2) / 0.8) * clamp((sc.dur - t) / 0.4);
  text(sc.num, 120, 92, { size: 19, fam: 'mono', color: PAL.dim, alpha: a });
  text(sc.title, 166, 92, { size: 26, weight: 500, color: PAL.ink, alpha: a });
}

/** draw film time T; `quiet` keeps only the 3D picture (the poster behind the start card) */
function renderAt(ctx, T, pxW, pxH, quiet = false) {
  g = ctx;
  T = clamp(T, 0, FILM.total - 1e-3);
  const sc = FILM.sceneAt(T), t = T - sc.start, def = SCENES[sc.key] || {};
  const c = i => (sc.beats[i] ? sc.beats[i].start : 1e9);
  g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
  try {
    if (!sc.O) sc.O = def.build ? def.build(def.three ? Stage.group(sc.key) : null) : {};
    if (def.three) {
      Stage.size(pxW, pxH); Stage.show(sc.key);
      def.three(t, c, sc.dur, sc.O);
      g.drawImage(Stage.render(), 0, 0, W, H);
    }
    if (def.flat && !quiet) { g.save(); def.flat(t, c, sc.dur, sc.O); g.restore(); }
  } catch (e) { console.error(sc.key, e); }
  if (quiet) return;
  drawTitle(sc, t);
  drawBeatText(sc, t, def);
  const dip = Math.max(1 - t / 0.5, 1 - (sc.dur - t) / 0.5);
  if (dip > 0) { g.fillStyle = `rgba(0,0,0,${clamp(dip)})`; g.fillRect(0, 0, W, H); }
}

// ───────────────────────────── player UI ─────────────────────────────
(function player() {
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const LINKED = FILM.scenes.find(s => s.key === (location.hash || '').slice(1));
  const state = { T: 0, started: false, playing: false, rate: 1, dirty: true, last: 0, recorder: null };

  function fit() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.round(r.width * dpr)), h = Math.round(w * 9 / 16);
    if (cv.width !== w) { cv.width = w; cv.height = h; }
    state.dirty = true;
  }
  new ResizeObserver(fit).observe(cv);
  function draw() {
    const s = cv.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    renderAt(ctx, state.T, cv.width, cv.height, !state.started);
    const small = cv.getBoundingClientRect().width < 700, sub = $('sub');
    sub.hidden = !(small && state.started);
    if (!sub.hidden) { const sc = FILM.sceneAt(state.T), k = beatAt(sc, state.T - sc.start), s2 = k >= 0 ? sc.beats[k].t : ''; if (sub.textContent !== s2) sub.textContent = s2; }
  }
  function seek(T) { state.T = clamp(T, 0, FILM.total); state.dirty = true; syncUI(); }
  function play() {
    if (!state.started) { state.started = true; if (!LINKED) seek(0); }
    if (state.T >= FILM.total - 0.1) seek(0);
    state.playing = true; state.last = performance.now();
    $('overlay').hidden = true; syncUI();
  }
  function pause() { state.playing = false; syncUI(); }
  const toggle = () => (state.playing ? pause() : play());
  function tick(now) {
    if (state.playing) {
      state.T += Math.min(0.1, (now - state.last) / 1000) * state.rate; state.last = now;
      if (state.T >= FILM.total) { state.T = FILM.total; pause(); if (state.recorder) stopRecording(); }
      state.dirty = true; syncUI(true);
    }
    if (state.dirty) { draw(); state.dirty = false; }
    requestAnimationFrame(tick);
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const bar = $('bar'), fill = $('fill'), tip = $('tip');
  FILM.scenes.forEach(sc => {
    const m = document.createElement('div'); m.className = 'tick'; m.style.left = (sc.start / FILM.total * 100) + '%'; bar.appendChild(m);
    const o = document.createElement('option'); o.value = sc.key; o.textContent = (sc.num ? sc.num + '  ' : '') + sc.title; $('chapters').appendChild(o);
  });
  let lastUI = 0;
  function syncUI(throttle) {
    const now = performance.now(); if (throttle && now - lastUI < 120) return; lastUI = now;
    fill.style.width = (state.T / FILM.total * 100) + '%';
    $('time').textContent = `${fmt(state.T)} / ${fmt(FILM.total)}`;
    $('play').textContent = state.playing ? 'Pause' : 'Play';
    $('chapters').value = FILM.sceneAt(state.T).key;
    bar.setAttribute('aria-valuenow', String(Math.round(state.T)));
  }
  const tAt = e => { const r = bar.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * FILM.total; };
  let dragging = false;
  bar.addEventListener('pointerdown', e => { dragging = true; bar.setPointerCapture(e.pointerId); state.started = true; seek(tAt(e)); });
  bar.addEventListener('pointermove', e => {
    const T = tAt(e), sc = FILM.sceneAt(T), r = bar.getBoundingClientRect();
    tip.hidden = false; tip.textContent = `${fmt(T)}  ${sc.title}`; tip.style.left = clamp(e.clientX - r.left, 80, r.width - 80) + 'px';
    if (dragging) seek(T);
  });
  bar.addEventListener('pointerleave', () => { tip.hidden = true; });
  bar.addEventListener('pointerup', () => { dragging = false; });
  bar.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { seek(state.T + 5); e.preventDefault(); } if (e.key === 'ArrowLeft') { seek(state.T - 5); e.preventDefault(); } });
  $('play').onclick = toggle; $('start').onclick = play;
  $('chapters').onchange = e => { const sc = FILM.scenes.find(s => s.key === e.target.value); state.started = true; seek(sc.start + 0.01); };
  $('rate').onchange = e => { state.rate = +e.target.value; };
  $('fs').onclick = () => { const el = $('stage'); (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {}); };
  cv.addEventListener('click', toggle);
  const jump = d => { const i = FILM.scenes.indexOf(FILM.sceneAt(state.T)); const sc = FILM.scenes[clamp(i + d, 0, FILM.scenes.length - 1)]; state.started = true; seek(sc.start + 0.01); };
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('select')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && e.target !== bar) seek(state.T + 5);
    else if (e.key === 'ArrowLeft' && e.target !== bar) seek(state.T - 5);
    else if (e.key === ']') jump(1); else if (e.key === '[') jump(-1);
    else if (e.key === 'f') $('fs').click();
  });

  // record to WebM where downloads are allowed (opening the file directly, not inside a sandboxed frame)
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  $('rec').hidden = framed || !window.MediaRecorder || !cv.captureStream;
  function stopRecording() { if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop(); }
  $('rec').onclick = () => {
    if (state.recorder) { pause(); stopRecording(); return; }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'evolution-barcoded.webm'; a.click(); state.recorder = null; $('rec').textContent = 'Record WebM'; };
    state.recorder = rec; $('rec').textContent = 'Stop recording'; state.started = true; seek(0); rec.start(1000); play();
  };

  $('runtime').textContent = fmt(FILM.total);
  $('chaptercount').textContent = String(FILM.scenes.filter(s => s.num).length);
  bar.setAttribute('aria-valuemax', String(Math.round(FILM.total)));
  FILM.scenes.filter(sc => sc.num).forEach(sc => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + sc.key; a.innerHTML = `<span>${sc.num}</span>`; a.append(sc.title);
    a.onclick = e => { e.preventDefault(); state.started = true; seek(sc.start + 0.01); play(); };
    li.appendChild(a); $('index').appendChild(li);
  });
  const intro = FILM.scenes[0];
  if (LINKED) seek(LINKED.start + 0.01); else seek(intro.start + (intro.beats[2] ? intro.beats[2].start + 7 : 12));

  window.FILM_API = {
    total: FILM.total, scenes: FILM.scenes.map(s => ({ key: s.key, start: s.start, dur: s.dur, beats: s.beats.map(b => b.start) })),
    frame(T, w = 1920, q = 0.92) {
      if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); }
      const s = cv.width / W; ctx.setTransform(s, 0, 0, s, 0, 0); state.started = true;
      renderAt(ctx, T, cv.width, cv.height); return cv.toDataURL('image/jpeg', q);
    },
  };
  document.fonts.ready.then(() => { state.dirty = true; });
  requestAnimationFrame(tick); syncUI();
})();
