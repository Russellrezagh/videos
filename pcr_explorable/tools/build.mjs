#!/usr/bin/env node
/*
 * Build the PCR page into one self-contained file.
 *   - TeX in <span class="tex"> and <div class="... tex-d"> is rendered by
 *     KaTeX at build time (no maths library at runtime); \htmlData marks
 *     symbols with the semantic object they stand for.
 *   - KaTeX's stylesheet is inlined with its fonts as data URIs.
 *   - Scripts are inlined in dependency order.
 *   - The narration (dist/voice.mp3 + narration/voice.json), if built, is
 *     embedded as base64.
 * Writes dist/pcr.html (artifact fragment) and dist/standalone.html (a full
 * document for local tests).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KATEX_DIR = path.join(ROOT, '..', 'agentic_science', 'node_modules', 'katex');
const require = createRequire(import.meta.url);
const katex = require(path.join(KATEX_DIR, 'dist', 'katex.js'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let html = read('src/page.html');

// maths
let count = 0;
const tex = (src, display) => {
  count++;
  return katex.renderToString(src.trim(), { displayMode: display, throwOnError: true, strict: 'ignore', trust: (ctx) => ctx.command === '\\htmlData', output: 'htmlAndMathml' });
};
html = html.replace(/<span class="tex">([\s\S]*?)<\/span>/g, (_, s) => tex(s, false));
html = html.replace(/<div class="eq tex-d">([\s\S]*?)<\/div>/g, (_, s) => `<div class="eq">${tex(s, true)}</div>`);

// styles: KaTeX (fonts as data URIs, woff2 only) + the page
let kcss = fs.readFileSync(path.join(KATEX_DIR, 'dist', 'katex.min.css'), 'utf8');
kcss = kcss.replace(/src:url\(fonts\/([^)]+?)\.woff2\) format\("woff2"\)(,url\([^)]+\) format\("[^"]+"\))*/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(KATEX_DIR, 'dist', 'fonts', `${f}.woff2`)).toString('base64');
  return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
});
if (/url\(fonts\//.test(kcss)) throw new Error('a KaTeX font was not inlined');
html = html.replace('<!--STYLE-->', () => `<style>\n${kcss}\n${read('src/style.css')}</style>`);

// narration
const vj = path.join(ROOT, 'narration', 'voice.json');
const vm = path.join(ROOT, 'dist', 'voice.mp3');
let voice = '';
if (fs.existsSync(vj) && fs.existsSync(vm)) {
  const v = JSON.parse(fs.readFileSync(vj, 'utf8'));
  v.b64 = fs.readFileSync(vm).toString('base64');
  voice = `<script type="application/json" id="anim-voice">${JSON.stringify(v)}</script>`;
}
html = html.replace('<!--NARRATION-->', () => voice);

// scripts, in dependency order
const order = ['model.js', 'scene.js', 'figs.js', 'anim.js', 'labs.js', 'ui.js'];
const scripts = order.map((f) => `<script>\n${read(`src/${f}`).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
html = html.replace('<!--SCRIPTS-->', () => scripts);
for (const m of ['<!--STYLE-->', '<!--NARRATION-->', '<!--SCRIPTS-->']) if (html.includes(m)) throw new Error(`unfilled ${m}`);
if (html.indexOf('<title>') > 8192) throw new Error('title is not in the first 8 KB');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'pcr.html'), html);
const standalone = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${html}\n</body></html>`;
fs.writeFileSync(path.join(ROOT, 'dist', 'standalone.html'), standalone);
console.log(`dist/pcr.html  ${(html.length / 1024).toFixed(0)} KB  (${count} formulas, narration ${voice ? 'embedded' : 'none'})`);
