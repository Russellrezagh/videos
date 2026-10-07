"""The companion's narration, and the numbers it speaks, checked against the model.

  python3 manim/script.py       writes manim/narration/script.json

Each line has an id (act.n), what the voice says, and the caption. Every
number the voice states is computed from landscapes.py here and asserted, so
an edit to the model that changes a number stops the build.
"""
import json
import os

import numpy as np

from landscapes import Bandit, Leash

HERE = os.path.dirname(os.path.abspath(__file__))
B, L = Bandit(), Leash()

# --- the numbers -----------------------------------------------------------
START_Z = [0.6, 0.2, -0.3]                 # the film's bandit (BAND.z)
U0, V0 = Bandit.uv(START_Z)
J10 = B.J(U0, V0, 10)
SPREAD = dict(plain=B.spread(U0, V0), off=B.spread(U0, V0, 10), base=B.spread(U0, V0, 10, J10))
assert round(SPREAD['plain'], 2) == 0.15 and round(SPREAD['off']) == 52 and round(SPREAD['base'], 2) == 0.02
assert SPREAD['off'] / SPREAD['plain'] > 300

CLIMB = dict(start=(-2.0, -1.0), steps=60, lr=1.0, batch=4, offset=10, seeds=range(1, 9))
RUNS = {k: [B.climb(CLIMB['start'], CLIMB['steps'], CLIMB['lr'], batch=CLIMB['batch'], offset=CLIMB['offset'],
                    baseline=k, seed=s) for s in CLIMB['seeds']] for k in ('none', 'mean')}
RUNS['exact'] = [B.climb(CLIMB['start'], CLIMB['steps'], CLIMB['lr'], baseline='exact')]
won = {k: sum(B.J(*p[-1]) > 0.9 for p in v) for k, v in RUNS.items()}
assert won['mean'] == 8 and won['none'] <= 3, won   # "most end on a wrong plateau", "all eight"
wrong = 8 - won['none']

assert np.allclose(L.ref, (0.6, 0.3, 0.1))
assert abs(B.pi(U0, V0)[0] - 0.5) < 0.03 and B.r[2] == 0   # "about half", "forty-one earns nothing"

# --- the lines ---------------------------------------------------------------
LINES = [
    # Act 1: the logit plane
    ('logit.1', 'This is a companion to The Gradient of Reward: three of its ideas, drawn as landscapes. '
                'The first is the three-answer bandit. Asked seventeen times three, the model says fifty-one, '
                'about fifty, or forty-one.', None),
    ('logit.2', 'Its policy is a softmax over three logits. Adding the same number to all three changes nothing, '
                'so two numbers are enough: how far fifty-one is ahead of forty-one, and how far about fifty is '
                'ahead of forty-one. Those two numbers are the floor.', None),
    ('logit.3', 'Above each point of the floor, raise the expected reward: each answer\'s chance times its reward, '
                'summed. The surface has three plateaus, one for each answer the model can become sure of, with '
                'ramps between them. Training is a climb to the highest.', None),
    ('logit.4', 'Take the policy from the film, where fifty-one has about half the chance. Uphill from it is this '
                'arrow: the exact gradient. We never get to see it. What we get is one sampled answer, and its '
                'reward.', None),
    ('logit.5', 'One sample gives one of three arrows, one per answer: the reward times the score, which pushes the '
                'sampled answer up and the others down. Forty-one earns nothing, so its arrow has no length. Each '
                'arrow turns up as often as its answer does. Here, that is how bright it is.', None),
    ('logit.6', 'Weighted by those chances, the three arrows add up to exactly the uphill arrow. That is the '
                'log-derivative trick, seen from above: noisy pieces, the right average.', None),
    ('logit.7', 'Now add ten to every reward. The ranking is the same, and the surface simply rises by ten, so its '
                'slopes, and the gradient, do not change.', None),
    ('logit.8', 'The three arrows do. Each is scaled by its reward, now about ten, and they swing far out. The '
                'spread of a single sample grows from about zero point one five to about fifty-two: more than three '
                'hundred times larger, with the same average.',
                'The arrows do change. Each is scaled by its reward, now about 10, and they swing far out. The '
                f'spread (variance) of one sample grows from {SPREAD["plain"]:.2f} to {SPREAD["off"]:.0f}: more than '
                '300 times larger, with the same average.'),
    ('logit.9', 'Subtract a baseline, the average reward, and the arrows fall back, to a spread of about zero point '
                'zero two. The average has not changed. Only the noise has.',
                'Subtract a baseline, the average reward, and the arrows fall back, to a spread of '
                f'{SPREAD["base"]:.2f}. The average has not changed. Only the noise has.'),
    ('logit.10', 'Here is what that noise does to training. Eight runs of sixty steps, four samples a step, every '
                 f'reward plus ten. Without a baseline, the runs stagger, and {["", "one", "two", "three", "four", "five", "six", "seven", "eight"][wrong]} '
                 'of the eight end on a wrong plateau: sure of a wrong answer, on flat ground, where no gradient '
                 'can bring them back.',
                 'Here is what that noise does to training. Eight runs of 60 steps, 4 samples a step, every reward '
                 f'+10. Without a baseline the runs stagger, and {wrong} of the 8 end on a wrong plateau: sure of a '
                 'wrong answer, on flat ground, where no gradient can bring them back.'),
    ('logit.11', 'With a leave-one-out baseline, all eight follow the exact path, up to fifty-one.', None),
    # Act 2: the clipped surrogate
    ('clip.1', 'The second landscape is the objective of PPO. After one batch of samples, PPO takes several '
               'gradient steps, so it needs a rule for how far the new policy may move. Two numbers matter for each '
               'token: the ratio of its new probability to its old one, and its advantage.', None),
    ('clip.2', 'With no rule, the objective is the ratio times the advantage. Over this floor, that is a twisted '
               'sheet. Where the advantage is positive, it keeps rising as the ratio grows, without limit.', None),
    ('clip.3', 'PPO takes the smaller of that and a clipped copy, whose ratio is held between zero point eight and '
               'one point two. Where the advantage is positive, the surface turns flat beyond one point two. Where '
               'it is negative, it turns flat below zero point eight.',
               'PPO takes the smaller of that and a clipped copy, whose ratio is held between 0.8 and 1.2. Where '
               'the advantage is positive, the surface turns flat beyond 1.2. Where it is negative, it turns flat '
               'below 0.8.'),
    ('clip.4', 'Flat means zero slope. A token that has already gained enough gets no further push, so one batch '
               'cannot drag the policy far. And the clipped surface never rises above the sheet. It is a '
               'pessimistic estimate of the gain.', None),
    ('clip.5', 'The flat part is on one side only. If a step went the wrong way, and made a good token rarer, the '
               'surface there is still the steep sheet, and the gradient pulls it back.', None),
    # Act 3: the dome over the simplex
    ('dome.1', 'The last landscape is the KL leash. Take a prompt with three kinds of answer: vague, helpful, and '
               'flattering. Every policy over them is a point of this triangle. The corners are certainty. The '
               'middle is an even split.', None),
    ('dome.2', 'The reference model sits here: vague sixty percent of the time, helpful thirty, flattering ten. '
               'The reward model, though, pays most for flattery.',
               'The reference model sits here: vague 60% of the time, helpful 30%, flattering 10%. The reward '
               'model, though, pays most for flattery.'),
    ('dome.3', 'Expected reward over the triangle is a tilted plane, highest at the flattering corner. The KL '
               'divergence from the reference is a bowl: zero at the reference, rising toward the edges.', None),
    ('dome.4', 'The objective is the plane, minus beta times the bowl. Together they make a dome. Its peak has a '
               'closed form: the reference, reweighted by e to the reward over beta, then normalized. The height of '
               'the peak is beta times log Z.', None),
    ('dome.5', 'Now turn the knob. With a large beta the bowl dominates, and the peak stays close to the '
               'reference. As beta shrinks, the bowl flattens, and the peak slides toward the flattering corner: '
               'the answer the reward model overrates.', None),
    ('dome.6', 'That slide is reward over-optimization, in one picture. Beta sets how far the policy may wander '
               'from where it started, and so how far it trusts a reward that is only a model.', None),
]


def script():
    return [{'id': i, 'say': say, 'cap': cap or say} for i, say, cap in LINES]


if __name__ == '__main__':
    out = os.path.join(HERE, 'narration')
    os.makedirs(out, exist_ok=True)
    json.dump(script(), open(os.path.join(out, 'script.json'), 'w'), indent=1, ensure_ascii=False)
    words = sum(len(s.split()) for _, s, _ in LINES)
    print(f'{len(LINES)} lines, {words} words (about {words / 150:.1f} min); '
          f'spread {SPREAD["plain"]:.3f} / {SPREAD["off"]:.2f} / {SPREAD["base"]:.3f}; runs won {won}')
