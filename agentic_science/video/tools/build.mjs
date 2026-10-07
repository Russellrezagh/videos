#!/usr/bin/env node
/*
 * Build the video page into one self-contained HTML file.
 *
 *   node video/tools/build.mjs                    -> video/dist/index.html
 *   node video/tools/build.mjs --fragment <path>  also write a body-only copy
 *                                                 with the narration embedded
 *   node video/tools/build.mjs --embed-audio      embed it in dist/index.html too
 *
 * Inlines: MathJax (SVG output), every font (KaTeX for maths, and the OFL
 * notebook faces from @fontsource), the QUARTET
 * science code, the engine, the script and the player. If narration exists
 * (narration/durations.json and dist/narration.mp3), the page uses the real
 * clip durations and plays the track as its clock. The track is either
 * referenced (narration.mp3 next to the page) or embedded as base64, which
 * needs no file host at all: the page then plays its voice anywhere.
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
let fontBytes = 0;
css = css.replace(/url\('\.\.\/\.\.\/\.\.\/node_modules\/([^']+\.woff2)'\)/g, (_, f) => {
  const buf = fs.readFileSync(path.join(ROOT, 'node_modules', f));
  fontBytes += buf.length;
  return `url(data:font/woff2;base64,${buf.toString('base64')})`;
});
if (/url\('\.\./.test(css)) throw new Error('a local url() remains in the stylesheet');
console.log(`  fonts inlined: ${(fontBytes / 1024).toFixed(0)} KB`);
html = html.replace('<link rel="stylesheet" href="css/player.css">', () => `<style>\n${css}</style>`);

// scripts
const scripts = {
  '../../node_modules/mathjax/es5/tex-svg-full.js': path.join(ROOT, 'node_modules/mathjax/es5/tex-svg-full.js'),
  '../../src/js/kernel.js': path.join(ROOT, 'src/js/kernel.js'),
  '../../src/js/lab.js': path.join(ROOT, 'src/js/lab.js'),
  'js/engine.js': path.join(VIDEO, 'src/js/engine.js'),
  'js/notebook.js': path.join(VIDEO, 'src/js/notebook.js'),
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
const wordsFile = path.join(VIDEO, 'narration/words.json');
if (fs.existsSync(durFile) && fs.existsSync(mp3)) {
  narr = { src: 'narration.mp3', durations: JSON.parse(read(durFile)) };
  // word onsets, so visuals can land on a spoken word (tools/words.py)
  if (fs.existsSync(wordsFile)) narr.words = JSON.parse(read(wordsFile));
}
html = html.replace('<script type="application/json" id="narration-data"></script>', () => `<script type="application/json" id="narration-data">${narr ? JSON.stringify(narr) : ''}</script>`);
if (/src="(\.\.\/|js\/)/.test(html)) throw new Error('a local script reference remains');
const SLOT = '<script type="text/plain" id="narration-audio"></script>';
if (!html.includes(SLOT)) throw new Error(`missing ${SLOT}`);
const embedded = () => {
  if (!narr) return html;
  const b64 = fs.readFileSync(mp3).toString('base64');
  return html.replace(SLOT, () => `<script type="text/plain" id="narration-audio">${b64}</script>`);
};
const mb = (s) => `${(s.length / 1048576).toFixed(2)} MB`;

const embedDist = process.argv.includes('--embed-audio');
const dist = embedDist ? embedded() : html;
fs.mkdirSync(path.join(VIDEO, 'dist'), { recursive: true });
fs.writeFileSync(path.join(VIDEO, 'dist/index.html'), dist);
console.log(`video/dist/index.html  ${mb(dist)}  narration: ${narr ? `${Object.keys(narr.durations).length} lines, ${embedDist ? 'embedded' : 'dist/narration.mp3'}` : 'none (captions only)'}`);

const i = process.argv.indexOf('--fragment');
if (i > 0 && process.argv[i + 1]) {
  const frag = embedded()
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  if (frag.length > 16 * 1048576) throw new Error(`fragment is ${mb(frag)}; the artifact limit is 16 MB`);
  fs.writeFileSync(process.argv[i + 1], frag);
  console.log(`fragment  ${process.argv[i + 1]}  ${mb(frag)}  narration ${narr ? 'embedded' : 'none'}`);
}
