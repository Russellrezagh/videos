#!/usr/bin/env node
/*
 * Narration pipeline:
 *   1. the page exports its script (one line per beat)
 *   2. Piper speaks each line            (tools/tts.py)
 *   3. the page re-times every beat with the real clip durations
 *   4. the clips are mixed into one track at those times (tools/mix.py)
 *   5. ffmpeg encodes video/dist/narration.mp3
 *
 * usage: node video/tools/narrate.mjs --model /path/to/en_US-lessac-medium.onnx
 * needs: playwright (Chromium), python3 with piper-tts and numpy, ffmpeg
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const model = arg('--model');
if (!model) throw new Error('pass --model /path/to/voice.onnx');
const clips = arg('--clips', path.join(VIDEO, 'narration/clips'));
const N = (p) => path.join(VIDEO, 'narration', p);
const page = pathToFileURL(path.join(VIDEO, 'src/index.html')).href;

async function fromPage(init, expr) {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  if (init) await p.addInitScript(init.fn, init.arg);
  await p.goto(`${page}?export&script`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const out = await p.evaluate(expr);
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  return out;
}

const script = await fromPage(null, () => window.__script);
fs.writeFileSync(N('script.json'), JSON.stringify(script, null, 1));
console.log(`1. script: ${script.length} lines`);

execFileSync('python3', [path.join(VIDEO, 'tools/tts.py'), N('script.json'), clips, N('durations.json'), '--model', model], { stdio: 'inherit' });
const durations = JSON.parse(fs.readFileSync(N('durations.json'), 'utf8'));
console.log('2. speech synthesized');

const schedule = await fromPage({ fn: (d) => (window.__narrationOverride = { durations: d }), arg: durations }, () => window.__schedule);
fs.writeFileSync(N('schedule.json'), JSON.stringify(schedule, null, 1));
console.log(`3. schedule: ${(schedule.duration / 60).toFixed(2)} min`);

const wav = path.join(clips, 'narration.wav');
execFileSync('python3', [path.join(VIDEO, 'tools/mix.py'), N('schedule.json'), path.join(clips, 'index.json'), wav], { stdio: 'inherit' });
fs.mkdirSync(path.join(VIDEO, 'dist'), { recursive: true });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '48k', path.join(VIDEO, 'dist/narration.mp3')], { stdio: 'inherit' });
console.log(`5. dist/narration.mp3  ${(fs.statSync(path.join(VIDEO, 'dist/narration.mp3')).size / 1048576).toFixed(2)} MB`);
