// Render frames at given film times to JPEGs, and report console errors.
// Usage: node build/shots.js <outdir> <t1> <t2> ... | node build/shots.js <outdir> --scenes
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [outdir, ...args] = process.argv.slice(2);
  fs.mkdirSync(outdir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', 'evolution_barcoded.html'));
  await page.waitForFunction(() => window.FILM_API);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  let times = args.map(Number);
  if (args[0] === '--scenes') {
    const sc = await page.evaluate(() => FILM_API.scenes);
    times = sc.flatMap(s => [0.25, 0.5, 0.75].map(f => +(s.start + s.dur * f).toFixed(1)));
  } else if (args[0] === '--keys') {
    // one frame near the end of every beat of the named chapters (comma-separated keys)
    const keys = args[1].split(','), at = Number(args[2] || 0.85);
    const sc = await page.evaluate(() => FILM_API.scenes);
    times = sc.filter(s => keys.includes(s.key)).flatMap(s => s.beats.map((b, i) => {
      const end = i + 1 < s.beats.length ? s.beats[i + 1] : s.dur - 0.6;
      return +(s.start + b + (end - b) * at).toFixed(2);
    }));
  }
  const width = Number(process.env.W || 960);
  await page.screenshot({ path: path.join(outdir, 'page.png') });
  for (const T of times) {
    const url = await page.evaluate(([T, w]) => FILM_API.frame(T, w, 0.85), [T, width]);
    fs.writeFileSync(path.join(outdir, `t${String(T.toFixed(2)).padStart(7, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('frames:', times.length, 'errors:', errors.length ? errors.slice(0, 10) : 'none');
  await browser.close();
})();
