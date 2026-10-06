#!/usr/bin/env node
/*
 * Render the video page to an MP4, frame by frame (frame-exact, no screen
 * recording). Each worker owns a contiguous range of frames, seeks the page
 * with window.__seek(t), screenshots, and pipes JPEGs straight into x264.
 *
 * usage: node video/tools/render-mp4.mjs [--fps 30] [--size 1920x1080]
 *          [--workers 3] [--from 0] [--to <seconds>] [--out file.mp4]
 * needs: playwright (Chromium), ffmpeg with libx264; narration.mp3 optional
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const fps = Number(arg('--fps', 30));
const [W, H] = arg('--size', '1920x1080').split('x').map(Number);
const workers = Number(arg('--workers', 3));
const out = path.resolve(arg('--out', path.join(VIDEO, 'dist/the-tree-and-the-agent.mp4')));
const tmp = path.resolve(arg('--tmp', path.join(VIDEO, 'dist/.render')));
const url = `${pathToFileURL(path.join(VIDEO, 'dist/index.html')).href}?export`;
fs.mkdirSync(tmp, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const browser = await chromium.launch();
const probe = await openPage(browser);
const duration = await probe.evaluate(() => window.__video.duration);
await probe.close();
const t0 = Number(arg('--from', 0));
const t1 = Math.min(duration, Number(arg('--to', duration)));
const first = Math.round(t0 * fps);
const last = Math.round(t1 * fps);
const total = last - first;
console.log(`rendering ${total} frames (${(total / fps / 60).toFixed(2)} min) at ${W}x${H}, ${fps} fps, ${workers} workers`);

let done = 0;
const started = Date.now();
const segs = [];
async function work(k) {
  const a = first + Math.floor((k * total) / workers);
  const b = first + Math.floor(((k + 1) * total) / workers);
  const seg = path.join(tmp, `seg${k}.mp4`);
  segs[k] = seg;
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const finished = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${k} exited ${c}`)))));
  const page = await openPage(browser);
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.__seek(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
    if (done % 600 === 0) {
      const rate = done / ((Date.now() - started) / 1000);
      console.log(`  ${done}/${total} frames, ${rate.toFixed(1)} fps, eta ${((total - done) / rate / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await finished;
  await page.close();
}
await Promise.all(Array.from({ length: workers }, (_, k) => work(k)));
await browser.close();

const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
const audio = path.join(VIDEO, 'dist/narration.mp3');
const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list];
if (fs.existsSync(audio) && t0 === 0) args.push('-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '96k', '-shortest');
args.push('-c:v', 'copy', '-movflags', '+faststart', out);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`wrote ${out}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB in ${((Date.now() - started) / 60000).toFixed(1)} min`);
