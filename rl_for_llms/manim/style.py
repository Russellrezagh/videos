"""The look of the 3D companion (the film's board palette and type), and the
narrator: each beat is one Kokoro clip, and the picture waits for the voice.
"""
import json
import os
from contextlib import contextmanager

import manimpango
from manim import (DEGREES, SVGMobject, Text, ThreeDScene, config)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# the film's palette (video/src/js/engine.js)
BG = '#0E1014'
INK = '#ECECEC'
BLUE = '#58C4DD'
TEAL = '#5CD0B3'
GREEN = '#83C167'
YELLOW = '#F7D96F'
GOLD = '#F0AC5F'
RED = '#FC6255'
PURPLE = '#A881C9'
PINK = '#D147BD'
GREY = '#888888'
GREY_B = '#BBBBBB'
DEEP = '#1C3F55'      # the low end of a height scale

config.background_color = BG

FONTS = os.path.join(ROOT, 'node_modules/katex/dist/fonts')
for f in ('KaTeX_Main-Regular.ttf', 'KaTeX_Main-Italic.ttf', 'KaTeX_Main-Bold.ttf'):
    manimpango.register_font(os.path.join(FONTS, f))
SERIF = 'KaTeX_Main'


def words(s, size=30, color=INK, **kw):
    """Plain text in the film's face. size is in points at 1080p."""
    return Text(s, font=SERIF, color=color, font_size=size, **kw)


def tex(name, height=0.5, color=INK):
    """A formula typeset by MathJax (manim/tex.mjs), as Manim paths."""
    m = SVGMobject(os.path.join(HERE, 'tex', f'{name}.svg'), height=height)
    m.set_fill(color, opacity=1).set_stroke(width=0)
    return m


class Voiced(ThreeDScene):
    """A ThreeDScene whose beats are narration clips.

        with self.voice('logit.3'):
            self.play(...)          # animations for this line
        # leaving the block waits out the rest of the clip, plus a pause

    The cues (id, start, end, caption) are written next to the clips, so the
    finished film can carry them as subtitles.
    """
    LEAD = 0.15     # the voice starts this long after the beat
    PAUSE = 0.55    # silence after each line

    def setup(self):
        nar = os.path.join(HERE, 'narration')
        self.clips = {c['id']: c['clip'] for c in json.load(open(os.path.join(nar, 'clips', 'index.json')))}
        self.durations = json.load(open(os.path.join(nar, 'durations.json')))
        self.captions = {x['id']: x['cap'] for x in json.load(open(os.path.join(nar, 'script.json')))}
        self.cues = []

    def now(self):
        return self.renderer.time

    @contextmanager
    def voice(self, beat, pause=None):
        clip = self.clips[beat]
        if not os.path.isabs(clip):
            clip = os.path.join(ROOT, clip)
        start = self.now() + self.LEAD
        self.add_sound(clip, time_offset=self.LEAD)
        dur = self.durations[beat]
        self.cues.append({'id': beat, 'start': start, 'end': start + dur, 'cap': self.captions[beat]})
        yield dur
        left = start + dur + (self.PAUSE if pause is None else pause) - self.now()
        if left > 0.02:
            self.wait(left)

    def tear_down(self):
        out = os.path.join(HERE, 'narration', f'{type(self).__name__}.cues.json')
        json.dump({'duration': self.now(), 'cues': self.cues}, open(out, 'w'), indent=1)

    # camera shorthands
    def top_down(self, **kw):
        self.set_camera_orientation(phi=0, theta=-90 * DEGREES, **kw)
