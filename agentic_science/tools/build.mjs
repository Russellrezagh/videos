#!/usr/bin/env node
/*
 * Build: one self-contained HTML file.
 *
 *   node tools/build.mjs                       write dist/index.html
 *   node tools/build.mjs --fragment <path>     also write a body-only fragment
 *                                              (for hosts that add their own
 *                                              <html>/<head>/<body> skeleton)
 *
 * Steps: render every TeX span to MathML with KaTeX, inline the stylesheet
 * and scripts, embed results/verification.json. The output has no runtime
 * dependencies except Google Fonts (optional; system fonts are the fallback).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const katex = require('katex');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

let html = read('src/index.html');
let texCount = 0;

// 1. Equations -> MathML (no fonts or CSS needed at runtime)
const render = (tex, displayMode) => {
  texCount++;
  return katex.renderToString(decode(tex.trim()), { output: 'mathml', displayMode, throwOnError: true, strict: 'error' });
};
html = html.replace(/<div class="tex-block">([\s\S]*?)<\/div>/g, (_, tex) => `<div class="tex-block">${render(tex, true)}</div>`);
html = html.replace(/<span class="tex">([\s\S]*?)<\/span>/g, (_, tex) => `<span class="tex">${render(tex, false)}</span>`);
if (/class="tex(-block)?">[^<]*\\/.test(html)) throw new Error('unrendered TeX remains');

// 2. Stylesheet
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${read('src/css/style.css')}</style>`);

// 3. Scripts
html = html.replace(/<script src="js\/([a-z]+)\.js"><\/script>/g, (_, name) => {
  const code = read(`src/js/${name}.js`);
  if (code.includes('</script')) throw new Error(`${name}.js contains a closing script tag`);
  return `<script>\n${code}</script>`;
});

// 4. The recorded verification run
const recorded = read('results/verification.json');
JSON.parse(recorded);
html = html.replace(
  /<script type="application\/json" id="recorded-run" data-src="[^"]*"><\/script>/,
  () => `<script type="application/json" id="recorded-run">${recorded.trim().replace(/<\//g, '<\\/')}</script>`
);
if (html.includes('src="js/') || html.includes('href="css/')) throw new Error('an external local file is still referenced');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'index.html');
fs.writeFileSync(out, html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(1)} KB  (${texCount} equations rendered)`);

// 5. Optional fragment for hosts that supply the document skeleton
const i = process.argv.indexOf('--fragment');
if (i > 0 && process.argv[i + 1]) {
  const fragment = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(process.argv[i + 1], fragment);
  console.log(`fragment          ${process.argv[i + 1]}`);
}
