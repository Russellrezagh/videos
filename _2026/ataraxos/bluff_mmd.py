"""Self-play on the bluff game with magnetic mirror descent (MMD).

Companion to ataraxos_explorable.html, section 4. Pure standard library:
    python _2026/ataraxos/bluff_mmd.py
"""
import math

P_GENERAL, WIN, LOSE, TEMPO = 0.25, 1.0, -0.5, 0.2


def belief(b):
    """Opponent's probability that an advancing piece is the General."""
    return P_GENERAL / (P_GENERAL + (1 - P_GENERAL) * b)


def payoff(b, s):
    """Your expected payoff when you bluff with rate b and the opponent stands with rate s."""
    return P_GENERAL * (s * WIN + (1 - s) * TEMPO) + (1 - P_GENERAL) * b * (s * LOSE + (1 - s) * TEMPO)


def exploitability(b, s):
    """Sum of what each player gains by a switch to a best response."""
    return max(payoff(0, s), payoff(1, s)) - min(payoff(b, 0), payoff(b, 1))


def mmd(p, q1, q0, eta, alpha, magnet=0.5):
    """One MMD step for a two-action policy: p is the probability of action 1."""
    l1 = (math.log(p) + alpha * eta * math.log(magnet) + eta * q1) / (1 + alpha * eta)
    l0 = (math.log(1 - p) + alpha * eta * math.log(1 - magnet) + eta * q0) / (1 + alpha * eta)
    m = max(l1, l0)
    return math.exp(l1 - m) / (math.exp(l1 - m) + math.exp(l0 - m))


def self_play(schedule, steps=400, b=0.85, s=0.85):
    """Both players update at the same time; schedule(t) gives (eta, alpha)."""
    trail = []
    for t in range(steps):
        eta, alpha = schedule(t)
        q_bluff = s * LOSE + (1 - s) * TEMPO           # your Scout: bluff vs stay (0)
        q = belief(b)
        q_stand = -(q * WIN + (1 - q) * LOSE)          # opponent: stand vs retreat
        b, s = mmd(b, q_bluff, 0.0, eta, alpha), mmd(s, q_stand, -TEMPO, eta, alpha)
        b, s = min(max(b, 1e-9), 1 - 1e-9), min(max(s, 1e-9), 1 - 1e-9)
        trail.append((b, s))
    swing = max(x[0] for x in trail[-100:]) - min(x[0] for x in trail[-100:])
    return b, s, exploitability(b, s), swing


print("constant settings            b      s   exploitability  swing of b (last 100 steps)")
for eta, alpha in [(4, 0.0), (4, 0.05), (4, 0.15), (20, 0.15), (20, 0.5), (1, 0.05)]:
    b, s, e, swing = self_play(lambda t: (eta, alpha))
    print(f"  eta={eta:>4} alpha={alpha:<5}  {b:6.3f} {s:6.3f}   {e:8.3f}        {swing:6.3f}")

print("annealed schedules")
schedules = {
    "coordinated (eta = 30 alpha^1.3)": lambda t: (30 * (0.6 / (1 + t / 25)) ** 1.3, 0.6 / (1 + t / 25)),
    "regularization falls too fast": lambda t: (20 * (1 + t / 30) ** -0.7, 0.6 * (1 + t / 30) ** -1.6),
}
for name, schedule in schedules.items():
    b, s, e, swing = self_play(schedule)
    print(f"  {name:<34} b={b:.3f} s={s:.3f} exploitability={e:.3f} swing={swing:.3f}")
print("equilibrium: b* = 0.381, s* = 0.286, exploitability 0")
