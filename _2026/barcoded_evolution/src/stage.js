// ───────────────────────────── 3D stage (three.js) ─────────────────────────────
// One WebGL scene; each chapter owns a group that is shown only while the chapter plays.
// The WebGL frame is drawn into the 2D film canvas, and the 2D overlay (type, plots) goes on top.
const Stage = (() => {
  let R = null, scene, cam, cv;
  const groups = {}, tmpV = new THREE.Vector3();
  function init() {
    cv = document.createElement('canvas');
    R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    R.setClearColor(0x000000, 1);
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 500);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(4, 7, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd2ff, 0.45); rim.position.set(-6, 2, -5); scene.add(rim);
  }
  function size(pw, ph) { if (!R) init(); if (cv.width !== pw || cv.height !== ph) R.setSize(pw, ph, false); }
  function group(key) { if (!R) init(); if (!groups[key]) { groups[key] = new THREE.Group(); scene.add(groups[key]); } return groups[key]; }
  function show(key) { for (const k in groups) groups[k].visible = k === key; }
  /** camera on a sphere around a target: azimuth and elevation in degrees.
   *  panX/panY slide the picture on screen (film pixels) without changing the view direction,
   *  so a subject can sit beside its labels while the camera still circles it. */
  function orbit(tx, ty, tz, dist, az, el, fov = 30, panX = 0, panY = 0) {
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    cam.position.set(tx + dist * Math.cos(e) * Math.sin(a), ty + dist * Math.sin(e), tz + dist * Math.cos(e) * Math.cos(a));
    cam.lookAt(tx, ty, tz);
    cam.fov = fov;
    if (panX || panY) cam.setViewOffset(W, H, -panX, -panY, W, H); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  function render() { R.render(scene, cam); return cv; }
  /** world point → film coordinates */
  function project(x, y, z) { tmpV.set(x, y, z).project(cam); return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H]; }
  function projectObj(obj, lx = 0, ly = 0, lz = 0) { tmpV.set(lx, ly, lz); obj.localToWorld(tmpV); tmpV.project(cam); return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H]; }
  return { init, size, group, show, orbit, render, project, projectObj, get cam() { return cam; } };
})();

// ── materials and builders
const M3 = {
  std(color, o = {}) {
    const op = o.opacity ?? 1;
    return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.55, metalness: 0, transparent: op < 1 || o.fade, opacity: op, depthWrite: o.depthWrite ?? op >= 1, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000 });
  },
  glass() { return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }); },
};
const _o = new THREE.Object3D(), _c = new THREE.Color();
/** a population of cells as one instanced mesh */
function makeCells(n, o = {}) {
  const geo = new THREE.SphereGeometry(1, o.seg ?? 18, Math.round((o.seg ?? 18) * 0.7));
  const mat = M3.std(0xffffff, { rough: 0.5, fade: true });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, _c.set(0xffffff));
  mesh.count = 0;
  return mesh;
}
function setCell(mesh, i, x, y, z, s, color, sy = 0.9) {
  _o.position.set(x, y, z); _o.scale.set(s, s * sy, s * 0.95); _o.rotation.set(0, 0, 0); _o.updateMatrix();
  mesh.setMatrixAt(i, _o.matrix);
  mesh.setColorAt(i, _c.set(color));
}
function doneCells(mesh, count) { mesh.count = count; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }

// Erlenmeyer flask profile (radius, height), base at y = 0
const FLASK_PROFILE = [[0, 0], [1.16, 0], [1.24, 0.07], [1.24, 0.17], [0.4, 1.55], [0.32, 1.72], [0.32, 2.36], [0.4, 2.44]];
function flaskRadiusAt(y) { if (y <= 0.17) return 1.2; if (y >= 1.55) return 0.33; return lerp(1.24, 0.4, (y - 0.17) / (1.55 - 0.17)); }
function makeFlask(o = {}) {
  const grp = new THREE.Group();
  const prof = FLASK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M3.glass());
  const level = o.level ?? 0.95;
  const lp = [new THREE.Vector2(0, 0.03)];
  for (let y = 0.03; y <= level; y += 0.05) lp.push(new THREE.Vector2(flaskRadiusAt(y) - 0.04, y));
  lp.push(new THREE.Vector2(0, level));
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(lp, 72), M3.std(o.liquid ?? 0x2f6fb3, { opacity: o.liquidOpacity ?? 0.33, rough: 0.6, depthWrite: false }));
  grp.add(liquid, glass);
  const cells = makeCells(o.cells ?? 400, { seg: 10 });
  grp.add(cells);
  grp.userData = { glass, liquid, cells, level, seeds: Array.from({ length: o.cells ?? 400 }, (_, i) => [hash01(i, 1), hash01(i, 2), hash01(i, 3)]) };
  return grp;
}
/** fill a flask with n cells at positions fixed by seed; colorOf(i) gives each cell's colour */
function fillFlask(fl, n, t, colorOf = () => 0xe8e8e8, size = 0.045) {
  const { cells, level, seeds } = fl.userData;
  const m = Math.min(n, seeds.length);
  for (let i = 0; i < m; i++) {
    const [a, b, c] = seeds[i], y = 0.06 + b * (level - 0.12), r = (flaskRadiusAt(y) - 0.1) * Math.sqrt(c), th = a * TAU + t * 0.15;
    setCell(cells, i, Math.cos(th) * r, y + Math.sin(t * 0.9 + i) * 0.02, Math.sin(th) * r, size, colorOf(i));
  }
  doneCells(cells, m);
}
/** flask silhouette in the 2D overlay: crisp outlines that face the camera */
function flaskOutline(fl, alpha = 1, col = '#d9d9d9', w = 2) {
  if (alpha <= 0.002) return;
  const camPos = Stage.cam.position, wp = new THREE.Vector3(); fl.getWorldPosition(wp);
  const ang = Math.atan2(camPos.x - wp.x, camPos.z - wp.z);
  const side = (sgn) => FLASK_PROFILE.slice(1).map(([r, y]) => Stage.projectObj(fl, Math.cos(ang) * r * sgn, y, -Math.sin(ang) * r * sgn));
  const right = side(1), left = side(-1);
  poly([...left.slice().reverse(), ...right], col, w, alpha);
  const lip = FLASK_PROFILE[FLASK_PROFILE.length - 1];
  const ring = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU; ring.push(Stage.projectObj(fl, Math.cos(a) * lip[0], lip[1], Math.sin(a) * lip[0])); }
  poly(ring, col, w * 0.8, alpha * 0.8);
}
function makeDish(R = 2, o = {}) {
  const grp = new THREE.Group();
  const agar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.12, 96), M3.std(o.agar ?? 0x6b5a3a, { opacity: 0.55, rough: 0.8 }));
  agar.position.y = 0.06;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.04, 0.32, 96, 1, true), M3.glass());
  wall.position.y = 0.16;
  const colonies = makeCells(o.colonies ?? 200, { seg: 14 });
  grp.add(agar, wall, colonies);
  grp.userData = { agar, wall, colonies, R };
  return grp;
}
/** the dish rim as a crisp 2D ellipse */
function dishOutline(dish, alpha = 1, col = '#bdbdbd', w = 1.5) {
  if (alpha <= 0.002) return;
  const R = dish.userData.R + 0.04, top = [], bot = [];
  for (let k = 0; k <= 72; k++) { const a = k / 72 * TAU; top.push(Stage.projectObj(dish, Math.cos(a) * R, 0.32, Math.sin(a) * R)); }
  poly(top, col, w, alpha);
}
function setColony(dish, i, x, z, r, color) { setCell(dish.userData.colonies, i, x, 0.12 + r * 0.25, z, r, color, 0.4); }
function makeTube(capColor = 0x4ea8ff, o = {}) {
  const grp = new THREE.Group(), r = o.r ?? 0.22, h = o.h ?? 1.1;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true), M3.glass());
  body.position.y = h / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.2, 40, 1, true), M3.glass());
  tip.rotation.x = Math.PI; tip.position.y = -r * 0.6;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, h * 0.22, 40), M3.std(capColor, { rough: 0.6 }));
  cap.position.y = h + h * 0.11;
  const content = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.45, 32), M3.std(o.content ?? 0xd9d2c0, { opacity: 0.55 }));
  content.position.y = h * 0.225;
  grp.add(body, tip, cap, content);
  grp.userData = { body, cap, content, h, r };
  return grp;
}
/** a double helix; bases coloured; rungs outside [h0,h1) drawn grey */
function makeHelix(seq, o = {}) {
  const grp = new THREE.Group(), n = seq.length, rise = o.rise ?? 0.34, R = o.radius ?? 0.9, turn = o.turn ?? 10.5;
  const pts = s => Array.from({ length: n * 4 + 1 }, (_, k) => { const i = k / 4, a = i / turn * TAU + s * 2.2; return new THREE.Vector3(i * rise - n * rise / 2, Math.cos(a) * R, Math.sin(a) * R); });
  const strandMat = M3.std(0xe6e6e6, { rough: 0.35, fade: true });
  const s1 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts(0)), n * 6, 0.07, 8, false), strandMat);
  const s2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts(1)), n * 6, 0.07, 8, false), strandMat);
  const rungGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
  const rungs = new THREE.InstancedMesh(rungGeo, M3.std(0xffffff, { rough: 0.5, fade: true }), n * 2);
  const comp = { A: 'T', T: 'A', C: 'G', G: 'C' };
  const h0 = o.h0 ?? 0, h1 = o.h1 ?? n;
  for (let i = 0; i < n; i++) {
    const a1 = i / turn * TAU, a2 = a1 + 2.2, x = i * rise - n * rise / 2;
    const p1 = new THREE.Vector3(x, Math.cos(a1) * R, Math.sin(a1) * R), p2 = new THREE.Vector3(x, Math.cos(a2) * R, Math.sin(a2) * R), mid = p1.clone().add(p2).multiplyScalar(0.5);
    [[p1, mid, seq[i]], [mid, p2, comp[seq[i]]]].forEach(([a, b, ch], k) => {
      const len = a.distanceTo(b); _o.position.copy(a).add(b).multiplyScalar(0.5); _o.scale.set(1, len, 1);
      _o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); _o.updateMatrix();
      rungs.setMatrixAt(i * 2 + k, _o.matrix);
      rungs.setColorAt(i * 2 + k, _c.set(i >= h0 && i < h1 ? BASE_COL[ch] : '#5a5a5a'));
    });
  }
  grp.add(s1, s2, rungs);
  grp.userData = { strandMat, rungs, n, rise };
  return grp;
}
function setOpacity(obj, a) {
  obj.traverse(m => { if (m.material) { const mats = Array.isArray(m.material) ? m.material : [m.material]; mats.forEach(mt => { if (mt.userData.base === undefined) mt.userData.base = mt.opacity; mt.opacity = mt.userData.base * a; mt.transparent = true; }); } });
  obj.visible = a > 0.003;
}
