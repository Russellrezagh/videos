#!/usr/bin/env node
/*
 * Quick health check of a build: narrated lines, length, scenes, papers in
 * order, page errors and TeX errors. Exit code 1 on any error.
 * usage: node video/tools/probe.mjs [page.html] [--scenes a,b]   (default video/dist/index.html)
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(VIDEO, 'dist/index.html');
const only = arg('--scenes', '').split(',').filter(Boolean);
const browser = await chromium.launch();
const p = await browser.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${pathToFileURL(file).href}?export`);
await p.waitForFunction(() => window.__ready === true || window.__texErrors, null, { timeout: 180000 }).catch(() => errors.push('page never became ready'));
const r = await p.evaluate((only) => {
  const v = window.__video;
  if (!v) return null;
  const beats = v.beats.filter((b) => b.say && (!only.length || only.includes(b.scene)));
  const words = beats.reduce((n, b) => n + b.say.split(/\s+/).length, 0);
  return {
    lines: beats.length, words, minutes: +(v.duration / 60).toFixed(2), scenes: v.scenes.length,
    chapters: v.chapters.map((c) => `${c.id}:${((c.scenes.reduce((t, s) => t + s.duration, 0)) / 60).toFixed(1)}m`).join(' '),
    papers: (v.sources || []).map((s) => `${s.key}@${s.from}`), texErrors: window.__texErrors || [], partErrors: window.__partErrors || [],
  };
}, only);
await browser.close();
if (!r) {
  console.log('no video built', errors);
  process.exit(1);
}
console.log(`${r.lines} lines, ${r.words} words, ${r.minutes} min (estimated without narration), ${r.scenes} scenes`);
console.log(`chapters: ${r.chapters}`);
console.log(`papers: ${r.papers.join(' ')}`);
for (const e of r.texErrors) console.log(`TEX ERROR ${e}`);
for (const e of r.partErrors) console.log(`CHAPTER ERROR ${e}`);
for (const e of errors) console.log(`PAGE ERROR ${e}`);
process.exit(r.texErrors.length || r.partErrors.length || errors.length ? 1 : 0);
