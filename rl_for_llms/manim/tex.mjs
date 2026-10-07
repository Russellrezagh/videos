// TeX -> SVG with MathJax, for Manim scenes on a machine with no LaTeX.
// usage: node manim/tex.mjs   reads manim/formulas.json {id: tex}, writes manim/tex/<id>.svg
// The SVGs have their glyph paths inline (no <use>), and no width/height in
// ex units, so Manim's SVGMobject reads them directly; scenes colour them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const MathJax = await require('mathjax').init({
  loader: { load: ['input/tex-full', 'output/svg'] },
  svg: { fontCache: 'none' },
});
const adaptor = MathJax.startup.adaptor;
const formulas = JSON.parse(fs.readFileSync(path.join(HERE, 'formulas.json'), 'utf8'));
const out = path.join(HERE, 'tex');
fs.mkdirSync(out, { recursive: true });
for (const [id, tex] of Object.entries(formulas)) {
  const node = MathJax.tex2svg(tex, { display: true });
  let svg = adaptor.innerHTML(node);
  if (/merror/.test(svg)) throw new Error(`${id}: TeX error in ${tex}`);
  svg = svg
    .replace(/ (width|height|style)="[^"]*"/g, (m, k, off, s) => (s.lastIndexOf('<svg', off) === s.indexOf('<svg') && off < s.indexOf('>') ? '' : m))
    .replace(/currentColor/g, '#FFFFFF')
    .replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
  fs.writeFileSync(path.join(out, `${id}.svg`), svg);
}
console.log(`${Object.keys(formulas).length} formulas -> manim/tex/`);
