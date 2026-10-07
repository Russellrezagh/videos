#!/usr/bin/env node
/*
 * Narration pipeline:
 *   1. the page exports its script (one line per beat)
 *   2. a TTS engine speaks each line     (tools/tts.py; Kokoro-82M by default)
 *   3. the page re-times every beat with the real clip durations (and word
 *      onsets from tools/words.py, so visuals can land on a spoken word)
 *   4. the clips are mixed into one track at those times (tools/mix.py)
 *   5. ffmpeg levels it to -17 LUFS (speech for screens) and encodes video/dist/narration.mp3
 *
 * usage: node video/tools/narrate.mjs --model kokoro-v1.0.onnx --voices voices-v1.0.bin
 *          [--voice af_heart] [--speed 0.95]
 *        node video/tools/narrate.mjs --engine piper --model en_US-lessac-medium.onnx
 * needs: playwright (Chromium), python3 with kokoro-onnx (or piper-tts) and numpy, ffmpeg
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
if (!model) throw new Error('pass --model /path/to/model.onnx (and --voices for kokoro)');
const ttsArgs = ['--engine', arg('--engine', 'kokoro'), '--model', model];
for (const k of ['--voices', '--voice', '--speed', '--length-scale']) if (arg(k)) ttsArgs.push(k, arg(k));
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

execFileSync('python3', [path.join(VIDEO, 'tools/tts.py'), N('script.json'), clips, N('durations.json'), ...ttsArgs], { stdio: 'inherit' });
const durations = JSON.parse(fs.readFileSync(N('durations.json'), 'utf8'));
console.log('2. speech synthesized');
// word onsets let visuals land on a spoken word (needs faster-whisper; cached per clip)
let words = null;
try {
  execFileSync('python3', [path.join(VIDEO, 'tools/words.py'), path.join(clips, 'index.json'), N('words.json')], { stdio: 'inherit' });
  words = JSON.parse(fs.readFileSync(N('words.json'), 'utf8'));
} catch (e) {
  console.log('   (no word timings: visuals fall back to character shares)');
}

const schedule = await fromPage({ fn: (a) => (window.__narrationOverride = a), arg: { durations, words } }, () => window.__schedule);
fs.writeFileSync(N('schedule.json'), JSON.stringify(schedule, null, 1));
console.log(`3. schedule: ${(schedule.duration / 60).toFixed(2)} min`);

const wav = path.join(clips, 'narration.wav');
execFileSync('python3', [path.join(VIDEO, 'tools/mix.py'), N('schedule.json'), path.join(clips, 'index.json'), wav], { stdio: 'inherit' });
fs.mkdirSync(path.join(VIDEO, 'dist'), { recursive: true });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '56k', path.join(VIDEO, 'dist/narration.mp3')], { stdio: 'inherit' });
console.log(`5. dist/narration.mp3  ${(fs.statSync(path.join(VIDEO, 'dist/narration.mp3')).size / 1048576).toFixed(2)} MB`);
