// Render the silent film to MP4: every frame is drawn deterministically by the page's own renderer
// (FILM_API.frame), so the video matches the browser exactly. No audio track.
// Usage: node build/render_video.js <out.mp4> [--width 1280] [--fps 30] [--crf 21] [--from 0] [--to <seconds>]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const out = path.resolve(args[0] || 'renewable_barcodes.mp4');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d; };
const width = opt('width', 1280), fps = opt('fps', 30), crf = opt('crf', 21);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => console.error('page error:', e));
  await page.goto('file://' + path.resolve(__dirname, '..', 'renewable_barcodes.html'));
  await page.waitForFunction(() => window.FILM_API);
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => FILM_API.total);
  const from = opt('from', 0), to = Math.min(opt('to', total), total);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
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
  console.log('wrote', out);
})();
