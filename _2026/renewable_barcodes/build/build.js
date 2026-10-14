// Inline the sources, the film script and the extracted data into one HTML file.
// Usage: node build/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');

const spec = `const FILM_SPEC = ${JSON.stringify(JSON.parse(src('film.json')))};`;
const data = JSON.parse(src('data.json'));
const dataURI = f => 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'src', f)).toString('base64');
const raw = { YPD: dataURI('raw_YPD.webp'), YPA: dataURI('raw_YPA.webp') };

const files = ['core.js', 'gfx.js', 'domain.js', 'kit.js', 'scenes1.js', 'scenes2.js', 'scenes3.js', 'player.js'];
let js = files.map(src).join('\n');
js = js.replace('/*@DATA@*/ {}', () => JSON.stringify(data)).replace('/*@RAW@*/ {}', () => JSON.stringify(raw));

const html = src('page.html').replace('/*@SPEC@*/', () => spec).replace('/*@JS@*/', () => js);
// standalone file for opening locally; the artifact copy omits the skeleton (the host adds it)
const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
const out = path.join(root, 'renewable_barcodes.html');
fs.writeFileSync(out, standalone);
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'artifact.html'), html);
console.log(`wrote ${out} (${(standalone.length / 1e6).toFixed(2)} MB)`);
