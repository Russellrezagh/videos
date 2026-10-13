// ───────────────────────────── the film: timeline, rendering, playback ─────────────────────────────

function buildFilm(script, timing) {
  const scenes = [], lines = [];
  let T = 0;
  script.scenes.forEach((sc, si) => {
    const tm = timing && timing.scenes[si] && timing.scenes[si].key === sc.key ? timing.scenes[si] : null;
    const scene = { key: sc.key, num: sc.num, title: sc.title, start: tm ? tm.start : T, draw: SCENES[sc.key], lines: [] };
    let t = sc.lead;
    sc.lines.forEach((ln, li) => {
      // without measured narration, estimate ~2.4 spoken words per second
      const est = (ln.say || ln.t).split(/\s+/).length / 2.4;
      const start = tm ? tm.lines[li].start : t, dur = tm ? tm.lines[li].dur : est;
      scene.lines.push({ start, dur, t: ln.t });
      lines.push({ i: lines.length, start: scene.start + start, dur, t: ln.t, scene: si });
      t = start + dur + script.gap;
    });
    scene.dur = tm ? tm.dur : t + sc.tail;
    T = scene.start + scene.dur;
    scenes.push(scene);
  });
  const total = timing ? timing.total : T;
  const sceneAt = x => { for (let i = scenes.length - 1; i >= 0; i--) if (x >= scenes[i].start) return scenes[i]; return scenes[0]; };
  return { scenes, lines, total, sceneAt };
}

const FILM = buildFilm(SCRIPT, TIMING);

// static backdrop, painted once
let BACKDROP = null;
function backdrop() {
  if (BACKDROP) return BACKDROP;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = PAL.bg; x.fillRect(0, 0, W, H);
  const gr = x.createRadialGradient(W * 0.5, H * 0.42, 80, W * 0.5, H * 0.5, W * 0.75);
  gr.addColorStop(0, '#12224a'); gr.addColorStop(0.55, '#0a1328'); gr.addColorStop(1, '#050913');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  // flow-cell lattice: the surface every barcode read is made on
  x.fillStyle = 'rgba(140,165,220,0.07)';
  for (let yy = 30; yy < H; yy += 36) for (let xx = (yy / 36 % 2) * 18 + 10; xx < W; xx += 36) { x.beginPath(); x.arc(xx, yy, 1.6, 0, TAU); x.fill(); }
  return (BACKDROP = cv);
}

function renderAt(ctx, T, opts = {}) {
  g = ctx;
  T = clamp(T, 0, FILM.total - 1e-3);
  g.drawImage(backdrop(), 0, 0);
  // drifting motes
  for (let i = 0; i < 46; i++) {
    const x = (hash01(i, 1) * W + T * (6 + hash01(i, 2) * 14)) % W, y = (hash01(i, 3) * H + Math.sin(T * 0.2 + i) * 30 + H) % H;
    g.fillStyle = `rgba(150,180,240,${0.05 + 0.08 * hash01(i, 4)})`; g.beginPath(); g.arc(x, y, 1 + 2.5 * hash01(i, 5), 0, TAU); g.fill();
  }
  const sc = FILM.sceneAt(T), t = T - sc.start;
  const c = i => (sc.lines[i] ? sc.lines[i].start : 1e9);
  g.save();
  try { sc.draw(t, c, sc.dur); } catch (e) { console.error(sc.key, e); }
  g.restore();
  heading(t, sc.num ? `CHAPTER ${sc.num}` : '', sc.num ? sc.title : '', env(t, 0, sc.dur - 0.2, 0.6, 0.5));
  // dip between scenes
  const dip = Math.max(1 - t / 0.45, 1 - (sc.dur - t) / 0.45);
  if (dip > 0) { g.fillStyle = `rgba(4,8,18,${clamp(dip) * 0.92})`; g.fillRect(0, 0, W, H); }
  if (opts.captions !== false) drawCaption(T, sc);
}

function drawCaption(T, sc) {
  const ln = FILM.lines.find(l => T >= l.start - 0.05 && T < l.start + l.dur + 0.5);
  if (!ln) return;
  const a = Math.min(clamp((T - ln.start + 0.05) / 0.25), clamp((ln.start + ln.dur + 0.5 - T) / 0.3));
  g.save(); g.font = font(31, 'body', 500);
  const words = ln.t.split(' '), rows = [];
  let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > 1440 && cur) { rows.push(cur); cur = w; } else cur = tr; }
  rows.push(cur);
  const wMax = Math.max(...rows.map(r => g.measureText(r).width));
  const bh = rows.length * 42 + 26, by = 1046 - bh;
  g.globalAlpha = a * 0.78; g.fillStyle = '#050a16'; rrect(960 - wMax / 2 - 28, by, wMax + 56, bh, 14); g.fill();
  g.globalAlpha = a; g.fillStyle = '#f3f6fc'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  rows.forEach((r, i) => g.fillText(r, 960, by + 44 + i * 42));
  g.restore();
}

// ───────────────────────────── player UI ─────────────────────────────
(function player() {
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const LINKED = FILM.scenes.find(s => s.key === (location.hash || '').slice(1));
  const state = { T: 0, started: false, playing: false, rate: 1, captions: true, voice: true, music: true, dirty: true, last: 0, recorder: null };
  try { const s = JSON.parse(localStorage.getItem('evb-prefs') || '{}'); Object.assign(state, { captions: s.captions ?? true, voice: s.voice ?? true, music: s.music ?? true }); } catch (e) { /* storage unavailable */ }
  const savePrefs = () => { try { localStorage.setItem('evb-prefs', JSON.stringify({ captions: state.captions, voice: state.voice, music: state.music })); } catch (e) { /* storage unavailable */ } };

  // audio graph, created on the first click
  let ac = null, G = null, musicGain = null, narr = null, recDest = null, done = new Set();
  if (NARRATION_SRC) { narr = new Audio(NARRATION_SRC); narr.preload = 'auto'; }
  function initAudio() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const master = ac.createDynamicsCompressor(); master.connect(ac.destination);
    recDest = ac.createMediaStreamDestination(); master.connect(recDest);
    musicGain = ac.createGain(); musicGain.gain.value = state.music ? 0.85 : 0; musicGain.connect(master);
    G = Score.makeGraph(ac, musicGain);
    if (narr) { try { const src = ac.createMediaElementSource(narr); const ng = ac.createGain(); ng.gain.value = 1.1; src.connect(ng); ng.connect(master); } catch (e) { /* element already routed */ } }
  }
  function resetMusic() { if (ac && G) { Score.stopAll(ac, G); done = new Set(); } }

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
    // on small screens the burned-in captions are too small to read, so they move below the picture
    const small = cv.getBoundingClientRect().width < 700;
    renderAt(ctx, state.T, { captions: state.captions && state.started && !small });
    const sub = $('sub');
    sub.hidden = !(small && state.captions && state.started);
    if (!sub.hidden) { const ln = FILM.lines.find(l => state.T >= l.start - 0.05 && state.T < l.start + l.dur + 0.5); const s = ln ? ln.t : ''; if (sub.textContent !== s) sub.textContent = s; }
  }

  function seek(T) {
    state.T = clamp(T, 0, FILM.total);
    if (narr) { try { narr.currentTime = Math.min(state.T, (narr.duration || 1e9) - 0.05); } catch (e) { /* not loaded yet */ } }
    resetMusic();
    state.dirty = true; syncUI();
  }
  function play() {
    initAudio();
    if (ac && ac.state === 'suspended') ac.resume();
    if (!state.started) { state.started = true; if (!LINKED) seek(0); }
    if (state.T >= FILM.total - 0.1) seek(0);
    state.playing = true; state.last = performance.now();
    if (narr) { narr.playbackRate = state.rate; narr.muted = !state.voice; try { narr.currentTime = state.T; } catch (e) { /* not loaded yet */ } narr.play().catch(() => {}); }
    $('overlay').hidden = true;
    syncUI();
  }
  function pause() {
    state.playing = false;
    if (narr) narr.pause();
    resetMusic();
    syncUI();
  }
  const toggle = () => (state.playing ? pause() : play());

  function tick(now) {
    if (state.playing) {
      const dt = Math.min(0.1, (now - state.last) / 1000);
      state.last = now;
      // the narration track is the master clock whenever it is actually playing
      if (narr && !narr.paused && narr.readyState >= 2 && Math.abs(narr.currentTime - state.T) < 1.5) state.T = narr.currentTime;
      else state.T += dt * state.rate;
      if (state.T >= FILM.total) { state.T = FILM.total; pause(); if (state.recorder) stopRecording(); }
      if (ac && G && state.music) {
        const nowAc = ac.currentTime, T = state.T;
        Score.schedule(ac, G, FILM, T, T + 1.2, f => nowAc + (f - T) / state.rate, state.rate, done);
      }
      state.dirty = true;
      syncUI(true);
    }
    if (state.dirty) { draw(); state.dirty = false; }
    requestAnimationFrame(tick);
  }

  // ── controls
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const bar = $('bar'), fill = $('fill'), tip = $('tip');
  FILM.scenes.forEach(sc => {
    const m = document.createElement('div'); m.className = 'tick'; m.style.left = (sc.start / FILM.total * 100) + '%'; bar.appendChild(m);
    const o = document.createElement('option'); o.value = sc.key; o.textContent = (sc.num ? sc.num + ' · ' : '') + sc.title; $('chapters').appendChild(o);
  });
  let lastUI = 0;
  function syncUI(throttle) {
    const now = performance.now();
    if (throttle && now - lastUI < 120) return;
    lastUI = now;
    fill.style.width = (state.T / FILM.total * 100) + '%';
    $('time').textContent = `${fmt(state.T)} / ${fmt(FILM.total)}`;
    $('play').textContent = state.playing ? 'Pause' : 'Play';
    $('play').setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
    $('chapters').value = FILM.sceneAt(state.T).key;
    for (const [id, on] of [['cc', state.captions], ['voice', state.voice], ['music', state.music]]) $(id).setAttribute('aria-pressed', String(on));
    bar.setAttribute('aria-valuenow', String(Math.round(state.T)));
  }
  const tAt = e => { const r = bar.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * FILM.total; };
  let dragging = false;
  bar.addEventListener('pointerdown', e => { dragging = true; bar.setPointerCapture(e.pointerId); seek(tAt(e)); });
  bar.addEventListener('pointermove', e => {
    const T = tAt(e), sc = FILM.sceneAt(T), r = bar.getBoundingClientRect();
    tip.hidden = false; tip.textContent = `${fmt(T)} · ${sc.title}`;
    tip.style.left = clamp(e.clientX - r.left, 60, r.width - 60) + 'px';
    if (dragging) seek(T);
  });
  bar.addEventListener('pointerleave', () => { tip.hidden = true; });
  bar.addEventListener('pointerup', () => { dragging = false; if (state.playing) play(); });
  bar.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { seek(state.T + 5); e.preventDefault(); } if (e.key === 'ArrowLeft') { seek(state.T - 5); e.preventDefault(); } });
  $('play').onclick = toggle;
  $('start').onclick = play;
  $('chapters').onchange = e => { const sc = FILM.scenes.find(s => s.key === e.target.value); seek(sc.start + 0.01); if (state.playing) play(); };
  $('rate').onchange = e => { state.rate = +e.target.value; if (narr) narr.playbackRate = state.rate; resetMusic(); };
  $('cc').onclick = () => { state.captions = !state.captions; state.dirty = true; savePrefs(); syncUI(); };
  $('voice').onclick = () => { state.voice = !state.voice; if (narr) narr.muted = !state.voice; savePrefs(); syncUI(); };
  $('music').onclick = () => { state.music = !state.music; if (musicGain) musicGain.gain.setTargetAtTime(state.music ? 0.85 : 0, ac.currentTime, 0.2); if (!state.music) resetMusic(); savePrefs(); syncUI(); };
  $('fs').onclick = () => { const el = $('stage'); (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {}); };
  cv.addEventListener('click', toggle);
  const jump = d => { const i = FILM.scenes.indexOf(FILM.sceneAt(state.T)); const sc = FILM.scenes[clamp(i + d, 0, FILM.scenes.length - 1)]; seek(sc.start + 0.01); if (state.playing) play(); };
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('select')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && e.target !== bar) seek(state.T + 5);
    else if (e.key === 'ArrowLeft' && e.target !== bar) seek(state.T - 5);
    else if (e.key === ']') jump(1);
    else if (e.key === '[') jump(-1);
    else if (e.key === 'c') $('cc').click();
    else if (e.key === 'f') $('fs').click();
    else if (e.key === 'm') $('music').click();
  });

  // ── export to WebM (outside sandboxed frames, where downloads are allowed)
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  $('rec').hidden = framed || !window.MediaRecorder || !cv.captureStream;
  function stopRecording() { if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop(); }
  $('rec').onclick = () => {
    if (state.recorder) { pause(); stopRecording(); return; }
    initAudio();
    const stream = cv.captureStream(30);
    if (recDest) recDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      a.download = 'evolution-barcoded.webm'; a.click();
      state.recorder = null; $('rec').textContent = 'Record WebM'; $('rec').classList.remove('on');
    };
    state.recorder = rec; $('rec').textContent = 'Stop recording'; $('rec').classList.add('on');
    seek(0); rec.start(1000); play();
  };

  // deep link to a chapter: #clone, #bottleneck, …
  // behind the start card, show the bloom of barcoded cells (the title is on the card itself)
  if (LINKED) seek(LINKED.start + 0.01); else seek(FILM.scenes[0].lines[2] ? FILM.scenes[0].start + FILM.scenes[0].lines[2].start + 4.6 : 10);
  $('runtime').textContent = fmt(FILM.total);
  bar.setAttribute('aria-valuemax', String(Math.round(FILM.total)));
  FILM.scenes.filter(sc => sc.num).forEach(sc => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + sc.key; a.innerHTML = `<span>${sc.num}</span>`; a.append(sc.title);
    a.onclick = e => { e.preventDefault(); state.started = true; seek(sc.start + 0.01); play(); };
    li.appendChild(a); $('index').appendChild(li);
  });
  $('chaptercount').textContent = String(FILM.scenes.filter(s => s.num).length);

  // test / render hooks
  window.FILM_API = {
    total: FILM.total, scenes: FILM.scenes.map(s => ({ key: s.key, start: s.start, dur: s.dur })),
    renderAt(T, w = 1920) { if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); } const s = cv.width / W; ctx.setTransform(s, 0, 0, s, 0, 0); renderAt(ctx, T, { captions: true }); },
    frame(T, w, q = 0.9) { this.renderAt(T, w); return cv.toDataURL('image/jpeg', q); },
    async score(sr = 32000) { const buf = await Score.renderOffline(FILM, sr); return buf; },
  };
  document.fonts.ready.then(() => { state.dirty = true; });
  requestAnimationFrame(tick);
  syncUI();
})();
