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

  /*
   * Narration track. While it plays it is the clock, so picture and voice
   * cannot drift.
   *
   * Sources, tried in order until one plays:
   *   1. the embedded MP3 bytes (#narration-audio) as a blob: URL
   *   2. the same bytes as a data: URI
   *   3. narration.mp3 next to the page
   * Hosts differ in which of these their content policy admits, so a source
   * that errors, is refused, or does not start within 12 s is replaced by the
   * next one. When none is left the state is "failed" and the player runs on
   * its own frame clock with captions.
   *
   * States: none | idle | loading | playing | blocked | failed
   *   blocked = the browser refused to start sound without a fresh click.
   */
  function makeTrack(narr, on) {
    const sources = [];
    const emb = document.getElementById('narration-audio');
    const b64 = emb ? emb.textContent.trim() : '';
    if (b64) {
      sources.push(() => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      });
      sources.push(() => `data:audio/mpeg;base64,${b64}`);
    }
    if (narr && narr.src) sources.push(() => narr.src);

    const api = { state: 'none' };
    let el = null;
    let k = -1;
    let want = false; // the viewer asked for playback
    let rate = 1;
    let muted = false;
    let pendingSeek = null;
    let expectAt = null; // where the next 'playing' should start
    let ownPauses = 0; // pause events we caused, still to arrive
    let watchdog = 0;
    const set = (s) => {
      if (api.state === s) return;
      api.state = s;
      on.change(s);
    };

    function seekEl(t) {
      if (!el) return;
      expectAt = t;
      if (el.readyState < 1) {
        pendingSeek = t;
        return;
      }
      try {
        el.currentTime = t;
        pendingSeek = null;
      } catch (e) {
        pendingSeek = t;
      }
    }

    function attach() {
      for (k += 1; k < sources.length; k++) {
        let src;
        try {
          src = sources[k]();
        } catch (e) {
          continue;
        }
        const a = new Audio();
        a.preload = 'auto';
        a.muted = muted;
        a.addEventListener('loadedmetadata', () => {
          if (a === el && pendingSeek != null) seekEl(pendingSeek);
        });
        a.addEventListener('error', () => {
          if (a === el) fail();
        });
        a.addEventListener('playing', () => {
          if (a !== el) return;
          clearTimeout(watchdog);
          // A source that cannot seek (a server without range requests)
          // restarts from 0. Replace it rather than let the picture jump.
          if (expectAt != null && Math.abs(a.currentTime - expectAt) > 1.5) {
            fail();
            return;
          }
          expectAt = null;
          set('playing');
        });
        a.addEventListener('waiting', () => {
          if (a === el && want) set('loading');
        });
        a.addEventListener('pause', () => {
          if (a !== el) return;
          if (ownPauses > 0) {
            ownPauses -= 1;
            return;
          }
          // a pause the viewer did not ask for: a phone call, a headset unplugged
          if (want && !a.ended) {
            want = false;
            set('idle');
            on.interrupted();
          }
        });
        a.addEventListener('ended', () => {
          if (a !== el) return;
          want = false;
          set('idle');
          on.ended();
        });
        a.src = src;
        el = a;
        return true;
      }
      el = null;
      return false;
    }

    function fail() {
      const at = api.time();
      const old = el;
      clearTimeout(watchdog);
      if (old) {
        old.pause();
        old.removeAttribute('src');
      }
      ownPauses = 0;
      if (!attach()) {
        want = false;
        set('failed');
        return;
      }
      seekEl(at);
      if (want) api.play(at, rate);
    }

    api.drives = () => !!el && api.state !== 'failed' && api.state !== 'blocked';
    // Until the voice actually plays from a requested position, report that
    // position, so the picture never jumps to where a failing source landed.
    api.time = () => (!el ? 0 : pendingSeek != null ? pendingSeek : expectAt != null ? expectAt : el.currentTime);
    api.seek = (t) => seekEl(t);
    api.setRate = (r) => {
      rate = r;
      if (el) el.playbackRate = r;
    };
    api.setMuted = (m) => {
      muted = m;
      if (el) el.muted = m;
    };
    api.play = (t, r) => {
      if (!el) return;
      want = true;
      rate = r;
      seekEl(t);
      el.playbackRate = r;
      if (api.state !== 'playing') set('loading');
      const a = el;
      let p;
      try {
        p = a.play();
      } catch (e) {
        p = Promise.reject(e);
      }
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (a === el && want && api.state !== 'playing') fail();
      }, 12000);
      if (p && p.catch) {
        p.catch((e) => {
          if (a !== el || !want) return;
          if (e && e.name === 'NotAllowedError') {
            want = false;
            clearTimeout(watchdog);
            set('blocked');
          } else if (!(e && e.name === 'AbortError')) fail();
        });
      }
    };
    api.pause = () => {
      want = false;
      clearTimeout(watchdog);
      if (el && !el.paused) {
        ownPauses += 1;
        el.pause();
      }
      if (api.state === 'playing' || api.state === 'loading') set('idle');
    };

    if (sources.length && attach()) set('idle');
    else on.change('none');
    return api;
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
    const playBtn = $('#play');
    const sndBtn = $('#snd');
    const label = $('#bigplay-label');
    const TRACK_TEXT = {
      idle: 'Narrated. Press play to start the voice.',
      loading: 'Loading the narration…',
      playing: 'Narration playing.',
      blocked: 'The browser held the sound back. Press play again to start the voice.',
      failed: 'The narration could not play in this viewer. The video runs with captions.',
      none: 'This build has no narration track. The video runs with captions.',
    };
    const track = makeTrack(narr, {
      change(state) {
        status.textContent = TRACK_TEXT[state] || '';
        const silent = state === 'failed' || state === 'none';
        label.textContent = `Play · ${fmt(video.duration)}${silent ? ' · captions only' : ' · with narration'}`;
        sndBtn.disabled = silent;
        if (state === 'blocked') setPlaying(false);
      },
      interrupted() {
        if (playing) setPlaying(false);
      },
      ended() {
        t = video.duration - 0.02;
        setPlaying(false);
        draw();
      },
    });

    window.__track = track; // for tests: state of the narration track

    function setPlaying(on) {
      playing = on;
      playBtn.classList.toggle('playing', on);
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      $('#bigplay').hidden = on || t > 0.05;
      // Called inside the click handler, so the browser counts it as the
      // user's own request to start sound.
      if (on) track.play(t, rate);
      else track.pause();
      last = performance.now();
    }
    function seek(nt) {
      t = Math.max(0, Math.min(video.duration - 0.01, nt));
      track.seek(t);
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
      track.setRate(rate);
    });
    let muted = false;
    sndBtn.addEventListener('click', () => {
      muted = !muted;
      track.setMuted(muted);
      sndBtn.classList.toggle('muted', muted);
      sndBtn.setAttribute('aria-pressed', String(muted));
      sndBtn.setAttribute('aria-label', muted ? 'Turn the voice on' : 'Mute the voice');
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
      else if (k === 'm') sndBtn.click();
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
        // While the voice buffers, the picture waits for it.
        if (track.drives()) t = track.time();
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
