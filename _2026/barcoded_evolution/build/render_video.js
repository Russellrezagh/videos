// Render the film to MP4: every frame is drawn deterministically by the page's own renderer,
// the score is rendered offline with the page's Web Audio code, and both are muxed with the narration.
// Usage: node build/render_video.js <out.mp4> [--width 1280] [--fps 30] [--from 0] [--to <seconds>]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const out = path.resolve(args[0] || 'evolution_barcoded.mp4');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d; };
const width = opt('width', 1280), fps = opt('fps', 30);
const work = path.join(path.dirname(out), 'render_tmp');
fs.mkdirSync(work, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => console.error('page error:', e));
  await page.goto('file://' + path.resolve(__dirname, '..', 'evolution_barcoded.html'));
  await page.waitForFunction(() => window.FILM_API);
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => FILM_API.total);
  const from = opt('from', 0), to = Math.min(opt('to', total), total);

  // 1. score → 16-bit stereo WAV, streamed out of the page in chunks
  const musicWav = path.join(work, 'music.wav');
  if (!fs.existsSync(musicWav)) {
    const sr = 32000;
    const n = await page.evaluate(async sr => { window.__score = await FILM_API.score(sr); return window.__score.length; }, sr);
    const pcm = Buffer.alloc(n * 4);
    for (let off = 0; off < n; off += sr * 20) {
      const b64 = await page.evaluate(([off, len]) => {
        const L = window.__score.getChannelData(0), R = window.__score.getChannelData(1), m = Math.min(len, L.length - off);
        const a = new Int16Array(m * 2);
        for (let i = 0; i < m; i++) { a[2 * i] = Math.max(-1, Math.min(1, L[off + i])) * 32767; a[2 * i + 1] = Math.max(-1, Math.min(1, R[off + i])) * 32767; }
        let s = ''; const u8 = new Uint8Array(a.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
        return btoa(s);
      }, [off, sr * 20]);
      Buffer.from(b64, 'base64').copy(pcm, off * 4);
    }
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
    hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24);
    hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(musicWav, Buffer.concat([hdr, pcm]));
    console.log('score rendered:', (n / sr).toFixed(1), 's');
  }

  // 2. frames → H.264
  const silent = path.join(work, 'video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.floor((to - from) * fps);
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const T = from + f / fps;
    const url = await page.evaluate(([T, w]) => FILM_API.frame(T, w, 0.93), [T, width]);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 20) === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${f}/${N}  film ${T.toFixed(0)}s  elapsed ${el.toFixed(0)}s  eta ${((N - f) * el / Math.max(1, f)).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();

  // 3. mux: narration + score (the score already ducks under the voice)
  const narr = path.resolve(__dirname, 'assets', 'narration.mp3');
  await new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(from), '-t', String(to - from), '-i', narr, '-ss', String(from), '-t', String(to - from), '-i', musicWav,
      '-filter_complex', '[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=1.15[v];[2:a]aresample=48000,volume=0.8[m];[v][m]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
    p.on('close', c => (c ? rej(new Error('mux failed')) : res()));
  });
  console.log('wrote', out);
})();
