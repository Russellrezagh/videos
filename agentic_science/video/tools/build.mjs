#!/usr/bin/env node
/*
 * Build the video page into one self-contained HTML file.
 *
 *   node video/tools/build.mjs                    -> video/dist/index.html
 *   node video/tools/build.mjs --fragment <path>  also write a body-only copy
 *
 * Inlines: MathJax (SVG output), the KaTeX Computer Modern fonts, the QUARTET
 * science code, the engine, the script and the player. If narration exists
 * (narration/durations.json and dist/narration.mp3), the page uses the real
 * clip durations and plays the track as its clock.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.join(VIDEO, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const safeJs = (code, name) => {
  const n = (code.match(/<\/script/gi) || []).length;
  if (n) console.log(`  ${name}: escaped ${n} closing script tag(s)`);
  return code.replace(/<\/script/gi, '<\\/script');
};

let html = read(path.join(VIDEO, 'src/index.html'));

// stylesheet with fonts as data URIs
let css = read(path.join(VIDEO, 'src/css/player.css'));
css = css.replace(/url\('\.\.\/\.\.\/\.\.\/node_modules\/katex\/dist\/fonts\/([^']+)'\)/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(ROOT, 'node_modules/katex/dist/fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});
html = html.replace('<link rel="stylesheet" href="css/player.css">', () => `<style>\n${css}</style>`);

// scripts
const scripts = {
  '../../node_modules/mathjax/es5/tex-svg-full.js': path.join(ROOT, 'node_modules/mathjax/es5/tex-svg-full.js'),
  '../../src/js/kernel.js': path.join(ROOT, 'src/js/kernel.js'),
  '../../src/js/lab.js': path.join(ROOT, 'src/js/lab.js'),
  'js/engine.js': path.join(VIDEO, 'src/js/engine.js'),
  'js/scenes.js': path.join(VIDEO, 'src/js/scenes.js'),
  'js/player.js': path.join(VIDEO, 'src/js/player.js'),
};
for (const [src, file] of Object.entries(scripts)) {
  const tag = `<script src="${src}"></script>`;
  if (!html.includes(tag)) throw new Error(`missing ${tag}`);
  html = html.replace(tag, () => `<script>\n${safeJs(read(file), path.basename(file))}</script>`);
}

// narration
const durFile = path.join(VIDEO, 'narration/durations.json');
const mp3 = path.join(VIDEO, 'dist/narration.mp3');
let narr = null;
if (fs.existsSync(durFile) && fs.existsSync(mp3)) {
  narr = { src: 'narration.mp3', durations: JSON.parse(read(durFile)) };
}
html = html.replace('<script type="application/json" id="narration-data"></script>', () => `<script type="application/json" id="narration-data">${narr ? JSON.stringify(narr) : ''}</script>`);
if (/src="(\.\.\/|js\/)/.test(html)) throw new Error('a local script reference remains');

fs.mkdirSync(path.join(VIDEO, 'dist'), { recursive: true });
fs.writeFileSync(path.join(VIDEO, 'dist/index.html'), html);
console.log(`video/dist/index.html  ${(html.length / 1048576).toFixed(2)} MB  narration: ${narr ? `${Object.keys(narr.durations).length} lines` : 'none (captions only)'}`);

const i = process.argv.indexOf('--fragment');
if (i > 0 && process.argv[i + 1]) {
  const frag = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(process.argv[i + 1], frag);
  console.log(`fragment  ${process.argv[i + 1]}`);
}
