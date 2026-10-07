// Prints the film kernel's values on the inputs test_landscapes.py sends, so
// the Python model behind the 3D scenes can be checked against it.
// usage: node manim/kernel_values.mjs '<json>'
import { createRequire } from 'node:module';

const RL = createRequire(import.meta.url)('../src/js/rl.js');
const q = JSON.parse(process.argv[2]);
const out = {
  softmax: q.logits.map((z) => RL.softmax(z)),
  gradient: q.logits.map((z) => RL.exactGradient(z, q.r)),
  stats: q.stats.map(([z, offset, b]) => RL.estimatorStats(z, q.r.map((x) => x + offset), b)),
  ppo: q.ppo.map(([ratio, A]) => [RL.ppoClip(ratio, A, 0.2), RL.ppoClipSlope(ratio, A, 0.2)]),
  tilt: q.betas.map((beta) => RL.tilt(q.ref, q.rLeash, beta)),
  logZ: q.betas.map((beta) => RL.logPartition(q.ref, q.rLeash, beta)),
  objective: q.objective.map(([pi, beta]) => RL.regularisedObjective(pi, q.ref, q.rLeash, beta)),
};
process.stdout.write(JSON.stringify(out));
