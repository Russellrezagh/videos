#!/usr/bin/env node
/*
 * Contact sheet: one frame near the end of every narrated beat of the given
 * scenes, tiled into a PNG, so a scene can be reviewed at a glance (and
 * read by an agent that cannot watch video).
 *
 * usage: node video/tools/sheet.mjs --page draft.html --scenes trick,meaning --out sheet.png [--at 0.85] [--cols 3] [--width 2400]
 *   --at   where in each beat to take the frame (0 = start, 1 = end; default 0.85)
 * Each tile is labelled with the beat id. Needs playwright (Chromium) and
 * python3 with Pillow (for tiling).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const page = path.resolve(arg('--page'));
const scenes = arg('--scenes', '').split(',').filter(Boolean);
const out = path.resolve(arg('--out', 'sheet.png'));
const at = Number(arg('--at', 0.85));
const cols = Number(arg('--cols', 3));
const width = Number(arg('--width', 2400));

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${pathToFileURL(page).href}?export`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await p.evaluate(() => document.fonts.ready);
const beats = await p.evaluate((ids) => window.__video.beats.filter((b) => b.say && (!ids.length || ids.includes(b.scene))).map((b) => ({ id: b.id, t: b.start, dur: b.dur })), scenes);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
const files = [];
for (const b of beats) {
  await p.evaluate((t) => window.__video.render(t), b.t + b.dur * at);
  const f = path.join(dir, `${files.length.toString().padStart(3, '0')}.png`);
  await p.locator('#stage').screenshot({ path: f });
  files.push([f, b.id]);
}
await browser.close();
const py = `
import sys, json
from PIL import Image, ImageDraw
files, out, cols, width = json.loads(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
ims = [Image.open(f) for f, _ in files]
w = width // cols
h = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, (h + 34) * rows), (14, 16, 20))
d = ImageDraw.Draw(sheet)
for i, (im, (_, label)) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * (h + 34)
    sheet.paste(im.resize((w, h)), (x, y + 34))
    d.text((x + 8, y + 8), label, fill=(240, 240, 240))
sheet.save(out)
`;
execFileSync('python3', ['-c', py, JSON.stringify(files), out, String(cols), String(width)]);
fs.rmSync(dir, { recursive: true });
console.log(`${out}: ${files.length} beats${errors.length ? `; page errors: ${errors.join(' | ')}` : ''}`);
