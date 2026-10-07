#!/usr/bin/env node
/*
 * Layout linter: measures every narrated beat (middle and end) against the
 * design rules in src/js/engine.js (STYLE), the way a reviewer would check a
 * contact sheet, but on numbers:
 *
 *   off-safe       content outside the safe area (40 px margin)
 *   under-caption  content under the caption box
 *   overlap        two pieces of text or maths overlapping (>12 % of the smaller)
 *   small-text     text smaller than STYLE.type.min at 1080p
 *   thin-line      a stroke thinner than STYLE.stroke.min at 1080p
 *
 * usage: node video/tools/lint-layout.mjs [--page file.html] [--json out.json] [--only scene-id,...] [--quiet]
 * exit code 1 when any off-safe, under-caption or overlap issue is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const only = arg('--only') ? new Set(arg('--only').split(',')) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pageFile = arg('--page') ? path.resolve(arg('--page')) : path.join(VIDEO, 'dist/index.html');
await page.goto(`${pathToFileURL(pageFile).href}?export`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);

const rules = await page.evaluate(() => window.MV && window.MV.STYLE ? window.MV.STYLE : { type: { min: 28 }, stroke: { min: 3.5 }, safe: { x: 920, y: 500 } });

await page.evaluate(() => {
  window.__measure = () => {
    const svg = document.getElementById('stage');
    const root = svg.getScreenCTM();
    const inv = root.inverse();
    const unit = Math.hypot(root.a, root.b);
    const box = (r) => {
      const a = new DOMPoint(r.left, r.top).matrixTransform(inv);
      const b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
      return [a.x, a.y, b.x, b.y].map((v) => Math.round(v));
    };
    const opacity = (n) => {
      let o = 1;
      for (; n && n !== svg; n = n.parentNode) {
        if (n.style && n.style.visibility === 'hidden') return 0;
        const a = n.getAttribute && n.getAttribute('opacity');
        if (a !== null && a !== undefined) o *= Number(a);
      }
      return o;
    };
    const items = [];
    for (const t of svg.querySelectorAll('#world text, #hud text, #over text')) {
      const o = opacity(t);
      if (o < 0.6) continue;
      const spans = [...t.querySelectorAll('tspan')];
      const shown = spans.length ? spans.reduce((s, x) => s + Number(x.getAttribute('fill-opacity') ?? 1), 0) / spans.length : 1;
      if (shown < 0.6) continue;
      const r = t.getBoundingClientRect();
      if (r.width < 1) continue;
      const m = t.getScreenCTM();
      const fs = (Number(t.getAttribute('font-size')) * Math.hypot(m.a, m.b)) / unit;
      // a rubber stamp is meant to land on top of things
      items.push({ kind: 'text', str: t.textContent.slice(0, 48), box: box(r), fs: Math.round(fs), stamp: !!t.closest('[data-stamp]') });
    }
    for (const s of svg.querySelectorAll('#world svg')) {
      if (s.parentNode.closest('#world svg')) continue; // nested MathJax parts
      const o = opacity(s);
      if (o < 0.6) continue;
      const r = s.getBoundingClientRect();
      if (r.width < 1) continue;
      items.push({ kind: 'tex', str: (s.getAttribute('data-tex') || s.closest('[data-tex]')?.getAttribute('data-tex') || 'tex').slice(0, 48), box: box(r) });
    }
    for (const s of svg.querySelectorAll('#world line, #world path, #world polyline, #world rect, #world circle, #world ellipse, #world polygon')) {
      if (s.closest('#world svg')) continue; // glyph paths inside MathJax
      const stroke = s.getAttribute('stroke');
      if (!stroke || stroke === 'none') continue;
      if (Number(s.style.strokeOpacity === '' ? 1 : s.style.strokeOpacity) < 0.5) continue;
      const o = opacity(s);
      if (o < 0.6) continue;
      const r = s.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) continue;
      const m = s.getScreenCTM();
      const sw0 = Number(s.getAttribute('stroke-width') || 1);
      const sw = s.getAttribute('vector-effect') === 'non-scaling-stroke' ? sw0 : (sw0 * Math.hypot(m.a, m.b)) / unit;
      items.push({ kind: 'shape', str: s.tagName, box: box(r), sw: Math.round(sw * 10) / 10, len: Math.round(Math.max(r.width, r.height) / unit) });
    }
    const capEl = document.getElementById('caption-text');
    const cap = capEl && capEl.textContent.trim() && !document.getElementById('caption').classList.contains('off') ? box(capEl.getBoundingClientRect()) : null;
    // the camera is a scale on a scene's group; report the largest one
    const zoom = Math.max(1, ...[...document.querySelectorAll('#world > g')].map((g) => Number((/^scale\(([-\d.]+)\)/.exec(g.getAttribute('transform') || '') || [0, 1])[1])));
    return { items, cap, zoom };
  };
});

const beats = await page.evaluate(() => window.__video.beats.map((b) => ({ id: b.id, start: b.start, dur: b.dur, say: !!b.say })));
const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const area = (a) => Math.max(1, (a[2] - a[0]) * (a[3] - a[1]));
const issues = [];
const stats = { frames: 0, smallText: 0, thinLine: 0 };
for (const b of beats) {
  if (only && !only.has(b.id.split('.')[0])) continue;
  for (const [when, t] of [['mid', b.start + b.dur * 0.5], ['end', b.start + b.dur - 0.06]]) {
    await page.evaluate((x) => window.__seek(x), t);
    const { items, cap, zoom } = await page.evaluate(() => window.__measure());
    stats.frames++;
    const at = `${b.id}@${when}`;
    const S = rules.safe;
    for (const it of items) {
      const [x0, y0, x1, y1] = it.box;
      // a camera zoom into one term pushes the rest out of frame on purpose
      if (when === 'end' && Math.abs(zoom - 1) < 0.02 && (x0 < -S.x - 2 || x1 > S.x + 2 || y0 < -S.y - 25 || y1 > S.y + 25) && it.kind !== 'shape') issues.push({ at, rule: 'off-safe', what: `${it.kind} "${it.str}" [${it.box}]` });
      // in a zoom, lines and curves may run behind the band; text may not
      if (cap && !(zoom > 1.02 && it.kind === 'shape') && inter(it.box, [cap[0] - 12, cap[1] - 12, cap[2] + 12, cap[3] + 12]) > 0) issues.push({ at, rule: 'under-caption', what: `${it.kind} "${it.str}" [${it.box}] vs caption [${cap}]` });
      if (it.kind === 'text' && it.fs < rules.type.min) {
        stats.smallText++;
        issues.push({ at, rule: 'small-text', what: `"${it.str}" ${it.fs}px` });
      }
      if (it.kind === 'shape' && it.sw > 0 && it.sw < rules.stroke.min && it.len > 24) {
        stats.thinLine++;
        issues.push({ at, rule: 'thin-line', what: `${it.str} ${it.sw}px [${it.box}]` });
      }
    }
    const words = items.filter((i) => i.kind !== 'shape' && !i.stamp);
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++) {
        const ov = inter(words[i].box, words[j].box);
        if (ov > 0.12 * Math.min(area(words[i].box), area(words[j].box))) issues.push({ at, rule: 'overlap', what: `"${words[i].str}" × "${words[j].str}"` });
      }
  }
}
await browser.close();

const byRule = {};
for (const i of issues) byRule[i.rule] = (byRule[i.rule] || 0) + 1;
const scenes = {};
for (const i of issues) {
  const s = i.at.split('.')[0];
  (scenes[s] = scenes[s] || {})[i.rule] = ((scenes[s] || {})[i.rule] || 0) + 1;
}
console.log(`${stats.frames} frames checked. Issues by rule:`, JSON.stringify(byRule));
console.log('by scene:', Object.entries(scenes).map(([s, r]) => `${s} ${Object.entries(r).map(([k, v]) => `${k}:${v}`).join(' ')}`).join('\n  '));
if (!process.argv.includes('--quiet')) {
  const seen = new Set();
  for (const i of issues) {
    if (i.rule === 'small-text' || i.rule === 'thin-line') continue;
    const key = `${i.rule}|${i.what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  ${i.rule.padEnd(14)} ${i.at.padEnd(20)} ${i.what}`);
  }
}
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ rules, byRule, issues }, null, 1));
if (errors.length) console.log('page errors:', errors);
process.exit(issues.some((i) => ['off-safe', 'under-caption', 'overlap'].includes(i.rule)) ? 1 : 0);
