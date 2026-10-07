#!/usr/bin/env node
/*
 * End-to-end check: does the page play its voice, in step with its picture?
 *
 * For each window the check jumps to a time, presses Play with a real click,
 * and records what the narration element actually outputs (captureStream +
 * MediaRecorder). Every 100 ms it also samples the voice clock, the picture
 * clock and the narration line of the beat on screen. tools/check_av.py then
 * transcribes the recording with word timestamps (Whisper) and checks each
 * spoken word against the line on screen at that moment.
 *
 * usage: node video/tools/check-av.mjs [URL | FILE.html] [--windows 0:25,442:20,1180:15] [--out DIR]
 *        default: video/dist/index.html. A file is served over a local HTTP
 *        server with range requests (as a real host would; browsers refuse to
 *        record media from file:// pages).
 * needs: playwright (Chromium), python3 with faster-whisper and numpy, ffmpeg
 * exit code 0 only when every window passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const target = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(VIDEO, 'dist/index.html');

// a static server for one folder, with byte ranges so the voice can seek
function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    const size = fs.statSync(file).size;
    const head = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? Number(m[1]) : size - Number(m[2]);
      const b = m[1] && m[2] ? Number(m[2]) : size - 1;
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else {
      res.writeHead(200, { ...head, 'Content-Length': size });
      fs.createReadStream(file).pipe(res);
    }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}
let server = null;
let url = target;
if (!/^https?:/.test(target)) {
  const file = path.resolve(target.replace(/^file:\/\//, ''));
  server = await serve(path.dirname(file));
  url = `http://127.0.0.1:${server.address().port}/${path.basename(file)}`;
}
const windows = arg('--windows', '0:25,442:20,1180:15').split(',').map((w) => w.split(':').map(Number));
const out = arg('--out', fs.mkdtempSync(path.join(os.tmpdir(), 'check-av-')));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__track && window.__seekTo, null, { timeout: 120000 });
const report = { url, track: await page.evaluate(() => window.__track.state), windows: [] };

for (const [start, dur] of windows) {
  await page.evaluate((s) => window.__seekTo(s), start);
  await page.click('#play'); // a real click: the browser's own rule for starting sound
  const rec = await page.evaluate(async (seconds) => {
    const el = window.__track.element();
    const t0 = performance.now();
    while (window.__track.state !== 'playing') {
      if (performance.now() - t0 > 15000) return { error: `voice never started (state ${window.__track.state})` };
      await new Promise((r) => setTimeout(r, 20));
    }
    const stream = el.captureStream();
    if (!stream.getAudioTracks().length) await new Promise((r) => stream.addEventListener('addtrack', r, { once: true }));
    const mr = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    const samples = [];
    let a0 = null;
    let w0 = 0;
    const sample = () => {
      const v = window.__now();
      const beat = window.__video.beatAt(v);
      samples.push({ w: (performance.now() - w0) / 1000, a: el.currentTime, v, say: beat ? beat.say || '' : '' });
    };
    await new Promise((r) => {
      mr.onstart = () => {
        a0 = el.currentTime;
        w0 = performance.now();
        r();
      };
      mr.start();
    });
    const timer = setInterval(sample, 100);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    clearInterval(timer);
    const stopped = new Promise((r) => (mr.onstop = r));
    mr.stop();
    await stopped;
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { a0, samples, b64: btoa(bin) };
  }, dur);
  await page.click('#play'); // pause
  if (rec.error) {
    report.windows.push({ start, error: rec.error });
    continue;
  }
  const webm = path.join(out, `w${start}.webm`);
  fs.writeFileSync(webm, Buffer.from(rec.b64, 'base64'));
  fs.writeFileSync(path.join(out, `w${start}.json`), JSON.stringify({ a0: rec.a0, samples: rec.samples }));
  report.windows.push({ start, webm });
}
await browser.close();
if (server) server.close();
report.errors = errors;
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
try {
  execFileSync('python3', [path.join(VIDEO, 'tools/check_av.py'), path.join(out, 'report.json')], { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
