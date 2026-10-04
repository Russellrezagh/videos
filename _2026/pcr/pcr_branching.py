"""PCR as a branching process: why Ct values scatter when the template is scarce.

Companion to pcr_explorable.html (section 5.8). Pure standard library; run with
    python _2026/pcr/pcr_branching.py
"""
import math
import random


def binomial(n: int, p: float, rng: random.Random) -> int:
    """Number of molecules (out of n) that get copied this cycle."""
    if n < 1000:
        return sum(rng.random() < p for _ in range(n))
    # Normal approximation is accurate once n is large.
    return max(0, round(rng.gauss(n * p, math.sqrt(n * p * (1 - p)))))


def amplify(n0: int, E: float, cycles: int, rng: random.Random) -> int:
    """Galton-Watson PCR: each molecule is copied with probability E per cycle."""
    N = n0
    for _ in range(cycles):
        N += binomial(N, E, rng)
    return N


def ct(n0: int, E: float, rng: random.Random, early: int = 10, Nt: float = 1e10) -> float:
    """Simulate the random early cycles exactly, then grow deterministically to Nt."""
    N = amplify(n0, E, early, rng)
    return early + math.log(Nt / N) / math.log(1 + E)


rng = random.Random(1983)  # the year PCR was conceived
E = 0.90

print("Eight reactions, each starting from ONE molecule:")
for run in range(8):
    N10 = amplify(1, E, 10, rng)
    print(f"  run {run}:  N_10 = {N10:4d}   Ct = {10 + math.log(1e10 / N10) / math.log(1 + E):5.2f}")
print(f"  expected N_10 = (1+E)^10 = {(1 + E) ** 10:.0f}\n")

print("Spread of Ct over 500 replicates:")
for n0 in (1, 10, 100, 10_000):
    cts = [ct(n0, E, rng) for _ in range(500)]
    m = sum(cts) / len(cts)
    sd = math.sqrt(sum((c - m) ** 2 for c in cts) / (len(cts) - 1))
    print(f"  N0 = {n0:6d}:  mean Ct {m:5.2f}   sd {sd:.2f} cycles")
