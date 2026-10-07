"""Checks for the model behind the 3D scenes (numpy only; needs node).

  python3 manim/test_landscapes.py

1. The Python model agrees with the film's kernel (src/js/rl.js) on the same
   inputs: softmax, the exact gradient, the estimator's mean and variance,
   the PPO clip and its slope, the tilt, log Z and the regularised objective.
2. The identities the companion narration states hold.
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from landscapes import (Bandit, Leash, kl, ppo_clip, ppo_slope, simplex_point,  # noqa: E402
                        softmax)

HERE = os.path.dirname(os.path.abspath(__file__))
B, L = Bandit(), Leash()
failures = []


def check(name, ok, detail=''):
    print(f"  {'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(name)


rand = np.random.default_rng(0)
logits = [list(map(float, rand.normal(0, 1.5, 3))) for _ in range(8)] + [[0.6, 0.2, -0.3]]
stats = [[z, off, b] for z in logits[:4] for off, b in [(0, 0), (10, 0), (10, 10.4)]]
ppo = [[float(x), float(a)] for x in np.linspace(0.3, 1.7, 15) for a in (-1, -0.4, 0.5, 1)]
betas = [4, 1, 0.5, 0.2, 0.08]
objective = [[list(map(float, softmax(rand.normal(0, 1, 3)))), float(b)] for b in betas]
query = dict(logits=logits, r=list(B.r), stats=stats, ppo=ppo, betas=betas,
             ref=list(L.ref), rLeash=list(L.r), objective=objective)
js = json.loads(subprocess.run(['node', os.path.join(HERE, 'kernel_values.mjs'), json.dumps(query)],
                               capture_output=True, text=True, check=True).stdout)

print('1. the model agrees with the kernel')
close = lambda a, b: np.allclose(np.asarray(a, float), np.asarray(b, float), rtol=1e-12, atol=1e-12)
check('softmax', all(close(softmax(z), j) for z, j in zip(logits, js['softmax'])))
check('exact gradient pi_b (r_b - J)',
      all(close(B.gradient(*Bandit.uv(z)), j) for z, j in zip(logits, js['gradient'])))
check('estimator mean and variance',
      all(close(B.estimator_stats(z, off, b)[0], j['mean']) and close(B.estimator_stats(z, off, b)[1], j['variance'])
          for (z, off, b), j in zip(stats, js['stats'])))
check('PPO clip and slope', all(close(ppo_clip(x, a), j[0]) and close(ppo_slope(np.array(x), a), j[1])
                                for (x, a), j in zip(ppo, js['ppo'])))
check('tilt ref e^(r/beta) / Z', all(close(L.tilt(b), j) for b, j in zip(betas, js['tilt'])))
check('log Z', all(close(L.log_z(b), j) for b, j in zip(betas, js['logZ'])))
check('regularised objective', all(close(L.objective(p, b), j) for (p, b), j in zip(objective, js['objective'])))

print('2. what the narration says')
u0, v0 = Bandit.uv([0.6, 0.2, -0.3])
for off, b in [(0, 0), (10, 0), (10, B.J(u0, v0, 10))]:
    mean = sum(p * g for p, g in B.arrows(u0, v0, off, b))
    check(f'the three arrows average to the gradient (offset {off}, baseline {b:.2f})',
          close(mean, B.gradient_uv(u0, v0)))
grid = np.linspace(-3, 3, 7)
check('adding 10 to every reward lifts J by 10 and leaves its gradient alone',
      all(abs(B.J(u, v, 10) - B.J(u, v) - 10) < 1e-12 for u in grid for v in grid))
s0, s10, sb = B.spread(u0, v0), B.spread(u0, v0, 10), B.spread(u0, v0, 10, B.J(u0, v0, 10))
check('the offset multiplies the spread, the baseline brings it back', s10 > 50 * s0 and sb < 1.01 * s0,
      f'{s0:.3f} -> {s10:.2f} -> {sb:.3f}')
x = np.linspace(0.3, 1.7, 141)
check('the clipped objective never exceeds ratio x advantage',
      all(np.all(ppo_clip(x, a) <= x * a + 1e-15) for a in np.linspace(-1, 1, 21)))
check('flat (zero slope) only past 1 + eps for A > 0 and below 1 - eps for A < 0',
      np.all(ppo_slope(x, 1.0)[x > 1.2001] == 0) and np.all(ppo_slope(x, 1.0)[x < 1.1999] == 1)
      and np.all(ppo_slope(x, -1.0)[x < 0.7999] == 0) and np.all(ppo_slope(x, -1.0)[x > 0.8001] == -1))
S = np.linspace(0, 1, 121)
for beta in betas:
    best = max((L.objective(simplex_point(s, t), beta), s, t) for s in S for t in S[:-1])
    peak = L.objective(L.tilt(beta), beta)
    check(f'beta {beta}: the dome peaks at the tilt, height beta log Z', peak >= best[0] - 1e-12
          and abs(peak - L.peak_height(beta)) < 1e-12, f'peak {peak:.4f}, best on grid {best[0]:.4f}')
check('large beta keeps the peak at the reference, small beta sends it to the top reward',
      kl(L.tilt(50), L.ref) < 1e-3 and L.tilt(0.05)[2] > 0.99)

print(f"{'all passed' if not failures else f'{len(failures)} FAILED'}")
sys.exit(1 if failures else 0)
