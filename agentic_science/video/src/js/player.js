/*
 * Player: clock, controls, captions, chapters, transcript.
 * When a narration track exists, the audio element IS the clock, so picture
 * and voice cannot drift. Without audio, a frame clock runs at the same rate.
 *
 * URL flags:  ?export   stage only, window.__seek(t) for frame capture
 *             ?script   expose window.__script (beat ids + narration text)
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const exportMode = params.has('export');
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  function readNarration() {
    if (window.__narrationOverride) return window.__narrationOverride;
    const n = document.getElementById('narration-data');
    try {
      const d = JSON.parse((n && n.textContent.trim()) || 'null');
      return d && d.durations ? d : null;
    } catch (e) {
      return null;
    }
  }

  function storage(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  async function boot() {
    if (exportMode) document.body.classList.add('export');
    const status = $('#status');
    try {
      await window.MathJax.startup.promise;
    } catch (e) {
      status.textContent = 'Math renderer failed to start.';
      return;
    }
    try {
      await document.fonts.load('48px KaTeX_Main');
    } catch (e) {
      /* system serif fallback */
    }
    const narr = readNarration();
    const video = window.buildVideo({ world: $('#world'), hud: $('#hud') }, narr ? narr.durations : null);
    video.compile();
    window.__video = video;
    window.__script = video.beats.filter((b) => b.say).map((b) => ({ id: b.id, say: b.say }));
    window.__schedule = { duration: video.duration, beats: video.beats.map((b) => ({ id: b.id, start: b.start, dur: b.dur, say: b.say })) };

    const cap = $('#caption');
    const capText = $('#caption-text');
    const toast = $('#toast');
    let lastBeat = null;
    let lastChapter = null;
    function caption(t) {
      const b = video.beatAt(t);
      const txt = b ? b.cap || b.say : '';
      if (b !== lastBeat) {
        capText.textContent = txt;
        lastBeat = b;
      }
      const ch = video.chapterAt(t);
      if (ch !== lastChapter) {
        lastChapter = ch;
        const i = video.chapters.indexOf(ch) + 1;
        toast.textContent = `Chapter ${i} · ${ch.title}`;
        document.querySelectorAll('.chapters button').forEach((x, j) => x.classList.toggle('now', j === i - 1));
      }
      // the chapter label is part of the picture: visible for 4 s after each chapter starts
      toast.classList.toggle('show', t - ch.start < 4);
    }

    if (exportMode) {
      window.__seek = (t) => {
        video.render(t);
        caption(t);
        return true;
      };
      window.__ready = true;
      video.render(0);
      return;
    }

    /* ---------- clock ---------- */
    let last = performance.now();
    let t = 0;
    let playing = false;
    let rate = 1;
    let audio = null;
    let audioOk = false;
    if (narr && narr.src) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = narr.src;
      audio.addEventListener('canplay', () => {
        audioOk = true;
        status.textContent = 'Narration ready.';
        $('#bigplay-label').textContent = `Play · ${fmt(video.duration)}`;
      }, { once: true });
      audio.addEventListener('error', () => {
        audioOk = false;
        audio = null;
        status.textContent = 'Narration file not found. Playing silently with captions.';
        $('#bigplay-label').textContent = `Play · ${fmt(video.duration)} · captions only`;
      });
    } else {
      status.textContent = 'No narration track in this build. Playing with captions.';
    }
    $('#bigplay-label').textContent = `Play · ${fmt(video.duration)}`;

    const playBtn = $('#play');
    function setPlaying(on) {
      playing = on;
      playBtn.classList.toggle('playing', on);
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      $('#bigplay').hidden = on || t > 0.05;
      if (audio && audioOk) {
        if (on) {
          audio.currentTime = t;
          audio.playbackRate = rate;
          const pr = audio.play();
          if (pr && pr.catch) pr.catch(() => { audioOk = false; status.textContent = 'Audio was blocked. Playing silently with captions.'; });
        } else audio.pause();
      }
      last = performance.now();
    }
    function seek(nt) {
      t = Math.max(0, Math.min(video.duration - 0.01, nt));
      if (audio && audioOk) audio.currentTime = t;
      draw();
    }
    function toggle() {
      if (!playing && t >= video.duration - 0.05) seek(0);
      setPlaying(!playing);
    }

    /* ---------- scrubber ---------- */
    const scrub = $('#scrub');
    const fill = $('#fill');
    const knob = $('#knob');
    const hover = $('#hover');
    const ticks = $('#ticks');
    video.chapters.forEach((ch, i) => {
      if (i === 0) return;
      const s = document.createElement('span');
      s.style.left = `${(100 * ch.start) / video.duration}%`;
      ticks.appendChild(s);
    });
    const frac = (ev) => {
      const r = scrub.getBoundingClientRect();
      return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    };
    let dragging = false;
    scrub.addEventListener('pointerdown', (ev) => {
      dragging = true;
      scrub.setPointerCapture(ev.pointerId);
      seek(frac(ev) * video.duration);
    });
    scrub.addEventListener('pointermove', (ev) => {
      const f = frac(ev);
      const at = f * video.duration;
      hover.style.display = 'block';
      hover.style.left = `${f * 100}%`;
      hover.textContent = `${fmt(at)} · ${video.chapterAt(at).title}`;
      if (dragging) seek(at);
    });
    scrub.addEventListener('pointerup', () => (dragging = false));
    scrub.addEventListener('pointerleave', () => (hover.style.display = 'none'));
    scrub.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight') seek(t + 5);
      if (ev.key === 'ArrowLeft') seek(t - 5);
    });

    /* ---------- chapters + transcript ---------- */
    const list = $('#chapters');
    video.chapters.forEach((ch, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="n">${i + 1} · ${fmt(ch.start)}</span><span class="t"></span>`;
      b.querySelector('.t').textContent = ch.title;
      b.addEventListener('click', () => {
        seek(ch.start + 0.01);
        $('#player').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    const tr = $('#transcript');
    video.chapters.forEach((ch, i) => {
      const h = document.createElement('h3');
      h.textContent = `${i + 1}. ${ch.title}`;
      tr.appendChild(h);
      video.beats.filter((b) => b.say && video.chapterAt(b.start) === ch).forEach((b) => {
        const p = document.createElement('p');
        p.innerHTML = `<span class="ts">${fmt(b.start)}</span>`;
        p.appendChild(document.createTextNode(b.cap || b.say));
        p.addEventListener('click', () => {
          seek(b.start + 0.01);
          $('#player').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        tr.appendChild(p);
      });
    });

    /* ---------- buttons + keys ---------- */
    playBtn.addEventListener('click', toggle);
    $('#bigplay').addEventListener('click', toggle);
    $('#screen').addEventListener('click', (ev) => {
      if (ev.target.closest('#bigplay')) return;
      toggle();
    });
    $('#back').addEventListener('click', () => seek(t - 10));
    $('#fwd').addEventListener('click', () => seek(t + 10));
    const ccBtn = $('#cc');
    let ccOn = storage('tree-agent-cc') !== 'off';
    const applyCc = () => {
      cap.classList.toggle('off', !ccOn);
      ccBtn.classList.toggle('on', ccOn);
      ccBtn.setAttribute('aria-pressed', String(ccOn));
    };
    applyCc();
    ccBtn.addEventListener('click', () => {
      ccOn = !ccOn;
      storage('tree-agent-cc', ccOn ? 'on' : 'off');
      applyCc();
    });
    const speeds = [1, 1.25, 1.5, 0.75];
    $('#speed').addEventListener('click', () => {
      rate = speeds[(speeds.indexOf(rate) + 1) % speeds.length];
      $('#speed').textContent = `${rate}×`;
      if (audio) audio.playbackRate = rate;
    });
    $('#full').addEventListener('click', () => {
      const s = $('#screen');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (s.requestFullscreen) s.requestFullscreen().catch(() => {});
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.target.closest('input, textarea, select')) return;
      const k = ev.key.toLowerCase();
      if (k === ' ' || k === 'k') { ev.preventDefault(); toggle(); }
      else if (k === 'arrowright') seek(t + 5);
      else if (k === 'arrowleft') seek(t - 5);
      else if (k === 'l') seek(t + 10);
      else if (k === 'j') seek(t - 10);
      else if (k === 'c') ccBtn.click();
      else if (k === 'f') $('#full').click();
      else if (/^[1-9]$/.test(k) && video.chapters[Number(k) - 1]) seek(video.chapters[Number(k) - 1].start + 0.01);
    });

    /* ---------- loop ---------- */
    function draw() {
      video.render(t);
      caption(t);
      const f = t / video.duration;
      fill.style.width = `${f * 100}%`;
      knob.style.left = `${f * 100}%`;
      scrub.setAttribute('aria-valuenow', String(Math.round(f * 100)));
      $('#time').textContent = `${fmt(t)} / ${fmt(video.duration)}`;
    }
    function frame(now) {
      if (playing) {
        if (audio && audioOk && !audio.paused) t = audio.currentTime;
        else t += ((now - last) / 1000) * rate;
        if (t >= video.duration - 0.02) {
          t = video.duration - 0.02;
          setPlaying(false);
        }
        draw();
      }
      last = now;
      requestAnimationFrame(frame);
    }
    const start = Number(params.get('t'));
    if (start > 0) t = Math.min(start, video.duration - 1);
    draw();
    // Poster: until the first play, show the title card instead of an empty frame 0.
    const posterBeat = video.beats.find((b) => b.id === 'open.3');
    if (!(start > 0) && posterBeat) {
      video.render(posterBeat.start + posterBeat.dur - 0.2);
      capText.textContent = '';
      toast.classList.remove('show');
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
