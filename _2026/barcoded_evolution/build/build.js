// Inline the sources, narration timing and narration audio into one self-contained HTML file.
// Usage: node build/build.js [--no-audio]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const noAudio = process.argv.includes('--no-audio');
const script = JSON.parse(src('script.json'));
const timingPath = path.join(__dirname, 'assets', 'timing.json'), mp3Path = path.join(__dirname, 'assets', 'narration.mp3');
const timing = fs.existsSync(timingPath) ? JSON.parse(fs.readFileSync(timingPath, 'utf8')) : null;
const audio = !noAudio && fs.existsSync(mp3Path) ? 'data:audio/mpeg;base64,' + fs.readFileSync(mp3Path).toString('base64') : '';
const data = [
  `const SCRIPT = ${JSON.stringify({ gap: script.gap, scenes: script.scenes.map(s => ({ key: s.key, num: s.num, title: s.title, lead: s.lead, tail: s.tail, lines: s.lines.map(l => ({ t: l.t, say: l.say })) })) })};`,
  `const TIMING = ${JSON.stringify(timing)};`,
  `const NARRATION_SRC = ${JSON.stringify(audio)};`,
].join('\n');
const js = ['core.js', 'domain.js', 'draw.js', 'kit.js', 'scenes_a.js', 'scenes_b.js', 'music.js', 'player.js'].map(src).join('\n');
const html = src('page.html').replace('/*@SCRIPT@*/', () => data).replace('/*@JS@*/', () => js);
// standalone file for opening locally; the artifact copy omits the skeleton (the host adds it)
const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
const out = path.join(root, 'evolution_barcoded.html');
fs.writeFileSync(out, standalone);
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'artifact.html'), html);
console.log(`wrote ${out} (${(standalone.length / 1e6).toFixed(2)} MB)`);
