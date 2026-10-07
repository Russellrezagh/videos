"""The three landscapes, as plain functions: no Manim, no drawing.

This is the model the 3D scenes draw. It mirrors ../src/js/rl.js (the film's
tested kernel) term for term, and test_landscapes.py checks it against that
kernel on the same inputs, so the companion film and the main film show the
same numbers.

Landscape 1, the logit plane. A softmax policy over three answers has three
logits, but adding a constant to all three changes nothing, so two numbers
set it: u = z_0 - z_2 and v = z_1 - z_2. The floor is (u, v); the height is
the expected reward J. One REINFORCE sample is one of three arrows (one per
answer a), (r_a - b) times the score of a, drawn with probability pi_a.

Landscape 2, the PPO surrogate over (ratio, advantage).

Landscape 3, the KL-regularised objective E_pi[r] - beta KL(pi || ref) over
the probability simplex of three answers, with its peak at the tilt
ref * exp(r / beta) / Z.
"""
from dataclasses import dataclass

import numpy as np

# ------------------------------------------------------------------ softmax


def softmax(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(z - z.max())
    return e / e.sum()


def kl(p, q):
    p, q = np.asarray(p, float), np.asarray(q, float)
    m = p > 0
    return float(np.sum(p[m] * np.log(p[m] / q[m])))


def score(pi, a):
    """d log pi_a / d z_b = 1[a = b] - pi_b"""
    s = -np.asarray(pi, float).copy()
    s[a] += 1
    return s


# ------------------------------------------------------- landscape 1: logits


@dataclass(frozen=True)
class Bandit:
    """Three answers to "What is 17 x 3?" and what the judge pays for each."""
    labels: tuple = ('51', 'about 50', '41')
    r: tuple = (1.0, 0.3, 0.0)

    @staticmethod
    def logits(u, v):
        return np.array([u, v, 0.0])

    @staticmethod
    def uv(z):
        return float(z[0] - z[2]), float(z[1] - z[2])

    def pi(self, u, v):
        return softmax(self.logits(u, v))

    def J(self, u, v, offset=0.0):
        return float(self.pi(u, v) @ (np.array(self.r) + offset))

    def gradient(self, u, v):
        """dJ/dz_b = pi_b (r_b - J), full three-logit vector"""
        p = self.pi(u, v)
        return p * (np.array(self.r) - p @ np.array(self.r))

    def gradient_uv(self, u, v):
        # with z_2 held at 0, d/du = d/dz_0 and d/dv = d/dz_1
        return self.gradient(u, v)[:2]

    def arrows(self, u, v, offset=0.0, baseline=0.0):
        """The three possible one-sample estimates on the floor, with their
        chances: [(pi_a, (r_a + offset - baseline) * score(a)[:2])]."""
        p = self.pi(u, v)
        r = np.array(self.r) + offset
        return [(float(p[a]), (r[a] - baseline) * score(p, a)[:2]) for a in range(3)]

    def spread(self, u, v, offset=0.0, baseline=0.0):
        """Variance of one sample on the floor: E|g - E g|^2 (trace of the
        covariance of the drawn arrows)."""
        ar = self.arrows(u, v, offset, baseline)
        mean = sum(p * g for p, g in ar)
        return float(sum(p * (g - mean) @ (g - mean) for p, g in ar))

    def estimator_stats(self, z, offset=0.0, baseline=0.0):
        """The kernel's estimatorStats on all three logits: mean, trace."""
        p = softmax(z)
        r = np.array(self.r) + offset
        gs = [(r[a] - baseline) * score(p, a) for a in range(3)]
        mean = sum(p[a] * gs[a] for a in range(3))
        second = sum(p[a] * gs[a] @ gs[a] for a in range(3))
        return mean, float(second - mean @ mean)

    def climb(self, start, steps, lr, batch=4, offset=0.0, baseline='none', seed=1):
        """Gradient ascent on the floor from `start`.
        baseline: 'exact' (the true gradient, no sampling), 'none', or 'mean'
        (the batch mean of the rewards, leave-one-out so it stays unbiased)."""
        rand = np.random.default_rng(seed)
        u, v = start
        path = [(u, v)]
        r = np.array(self.r) + offset
        for _ in range(steps):
            if baseline == 'exact':
                g = self.gradient_uv(u, v)
            else:
                p = self.pi(u, v)
                acts = rand.choice(3, size=batch, p=p)
                rew = r[acts]
                g = np.zeros(2)
                for i, a in enumerate(acts):
                    b = 0.0
                    if baseline == 'mean':
                        b = (rew.sum() - rew[i]) / (batch - 1)
                    g += (rew[i] - b) * score(p, a)[:2] / batch
            u, v = u + lr * g[0], v + lr * g[1]
            path.append((u, v))
        return np.array(path)


# ------------------------------------------------- landscape 2: PPO surrogate


def ppo_clip(ratio, A, eps=0.2):
    return np.minimum(ratio * A, np.clip(ratio, 1 - eps, 1 + eps) * A)


def ppo_slope(ratio, A, eps=0.2):
    """d/d ratio of the clipped objective (the kernel's ppoClipSlope)"""
    unclipped = ratio * A
    clipped = np.clip(ratio, 1 - eps, 1 + eps) * A
    inside = (ratio > 1 - eps) & (ratio < 1 + eps)
    return np.where(unclipped <= clipped, A, np.where(inside, A, 0.0))


# ---------------------------------------------- landscape 3: the KL dome


@dataclass(frozen=True)
class Leash:
    """Three kinds of answer, a reference model, and a proxy reward that
    overrates flattery."""
    labels: tuple = ('vague', 'helpful', 'flattering')
    ref: tuple = (0.6, 0.3, 0.1)
    r: tuple = (0.2, 1.0, 1.5)

    def objective(self, pi, beta):
        pi = np.asarray(pi, float)
        return float(pi @ np.array(self.r) - beta * kl(pi, self.ref))

    def tilt(self, beta):
        """the maximiser: ref * exp(r / beta) / Z"""
        return softmax(np.log(self.ref) + np.array(self.r) / beta)

    def log_z(self, beta):
        x = np.log(self.ref) + np.array(self.r) / beta
        m = x.max()
        return float(m + np.log(np.exp(x - m).sum()))

    def peak_height(self, beta):
        """the value at the peak, beta log Z"""
        return beta * self.log_z(beta)


def simplex_point(s, t):
    """The unit square onto the simplex: t is the weight of the third answer,
    s splits the rest between the first two."""
    return np.array([(1 - t) * (1 - s), (1 - t) * s, t])


TRIANGLE = np.array([[-2.6, -1.5], [2.6, -1.5], [0.0, 3.0]])  # corners on the floor


def to_floor(pi):
    return np.asarray(pi, float) @ TRIANGLE
