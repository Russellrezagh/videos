"""Three Landscapes: a 3D companion to The Gradient of Reward (Manim CE).

    manim -qh manim/scenes.py Title Logits Clip Dome End

Every surface and point comes from landscapes.py (checked against the film's
kernel by test_landscapes.py); every spoken number from script.py.
"""
import os
import sys

import numpy as np
from manim import (DEGREES, DL, DOWN, DR, LEFT, ORIGIN, OUT, RIGHT, UL, UP, UR, Arrow, Create, DashedLine,
                   Dot, Dot3D, FadeIn, FadeOut, GrowArrow, Line, LaggedStart, Polygon,
                   Prism, ReplacementTransform, Surface, ThreeDAxes, Transform, ValueTracker, VGroup,
                   VMobject, Write, always_redraw, linear, rate_functions, smooth)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import script as SC  # noqa: E402
from landscapes import (TRIANGLE, Bandit, Leash, kl, ppo_clip, ppo_slope, simplex_point,  # noqa: E402
                        to_floor)
from style import (BG, BLUE, DEEP, GOLD, GREEN, GREY, GREY_B, INK, PURPLE, RED, TEAL, YELLOW,  # noqa: E402
                   Voiced, tex, words)

B, L = Bandit(), Leash()


def hud(scene, *ms):
    """Pin to the screen (formulas, readouts); hidden until animated in."""
    scene.add_fixed_in_frame_mobjects(*ms)
    scene.remove(*ms)
    return ms[0] if len(ms) == 1 else ms


def tag(scene, *ms):
    """Labels that sit in the 3D world but always face the camera."""
    scene.add_fixed_orientation_mobjects(*ms)
    scene.remove(*ms)
    return ms[0] if len(ms) == 1 else ms


def readout(get, fmt, size=34, color=INK):
    """A number that follows a tracker, in the film's face (no LaTeX)."""
    m = words(fmt.format(get()), size, color)

    def update(mob):
        mob.become(words(fmt.format(get()), size, color).move_to(mob, aligned_edge=LEFT))
    m.add_updater(update)
    return m


def backed(m, opacity=0.65):
    """A label with a dark card behind it, readable over a surface."""
    m.add_background_rectangle(color=BG, opacity=opacity, buff=0.06)
    return m


def height_colors(surface, values, lo, hi, scale=(DEEP, BLUE, TEAL, YELLOW), opacity=0.9):
    """Colour each face by the model's value at its centre."""
    from manim import ManimColor, interpolate_color
    scale = [ManimColor(c) for c in scale]
    for face, v in zip(surface, values):
        x = np.clip((v - lo) / (hi - lo), 0, 1) * (len(scale) - 1)
        i = min(int(x), len(scale) - 2)
        face.set_fill(interpolate_color(scale[i], scale[i + 1], x - i), opacity=opacity)
    surface.set_stroke(BG, width=0.4, opacity=0.35)
    return surface


def face_centres(u_range, v_range, res):
    """The parameter-space centre of each face, in Surface's order."""
    us = np.linspace(*u_range, res[0] + 1)
    vs = np.linspace(*v_range, res[1] + 1)
    return [((us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2) for i in range(res[0]) for j in range(res[1])]


# =============================================================== title / end


class Title(Voiced):
    def construct(self):
        self.top_down()
        t = words('Three Landscapes', 72)
        s = words('a 3D companion to The Gradient of Reward', 32, GREY_B).next_to(t, DOWN, 0.4)
        m = words('the logit plane  ·  the clipped surrogate  ·  the KL dome', 26, GREY).next_to(s, DOWN, 0.7)
        self.play(FadeIn(t, shift=UP * 0.2), run_time=1.2)
        self.play(FadeIn(s), FadeIn(m), run_time=1)
        self.wait(2.2)
        self.play(FadeOut(VGroup(t, s, m)), run_time=0.8)


class End(Voiced):
    def construct(self):
        self.top_down()
        a = words('Every surface here is computed by landscapes.py,', 32)
        b = words('which is checked against the film’s tested kernel (rl.js).', 32).next_to(a, DOWN, 0.25)
        c = words('Animated with Manim Community · formulas typeset by MathJax · voice: Kokoro-82M', 24, GREY_B)
        c.next_to(b, DOWN, 0.8)
        g = VGroup(a, b, c).move_to(ORIGIN)
        self.play(FadeIn(g), run_time=1)
        self.wait(4)
        self.play(FadeOut(g), run_time=1)


# ====================================================== act 1: the logit plane


class Logits(Voiced):
    R = 7                      # the floor spans u, v in [-R, R]
    RES = (42, 42)

    def construct(self):
        self.top_down()
        R = self.R
        ax = ThreeDAxes(x_range=[-R, R, 1], y_range=[-R, R, 1], z_range=[0, 1, 0.5],
                        x_length=9, y_length=9, z_length=3.0,
                        axis_config=dict(color=GREY, stroke_width=2, include_tip=False, include_ticks=False))
        self.ax = ax
        grid = VGroup(*[Line(ax.c2p(k, -R, 0), ax.c2p(k, R, 0)) for k in range(-R, R + 1)],
                      *[Line(ax.c2p(-R, k, 0), ax.c2p(R, k, 0)) for k in range(-R, R + 1)])
        grid.set_stroke(GREY, 1, opacity=0.25)
        xl = tag(self, backed(words('u : 51 over 41', 26, GREY_B)).move_to(ax.c2p(R + 0.4, -0.9, 0)))
        yl = tag(self, backed(words('v : about 50 over 41', 26, GREY_B)).move_to(ax.c2p(-1.6, R + 0.8, 0)))

        # --- logit.1: the bandit
        answers = VGroup(*[VGroup(words(lab, 40, c), words(f'r = {r:g}', 26, GREY_B))
                           .arrange(DOWN, buff=0.18) for lab, r, c in zip(B.labels, B.r, (GREEN, TEAL, RED))])
        answers.arrange(RIGHT, buff=1.4)
        q = words('What is 17 × 3?', 36).next_to(answers, UP, 0.7)
        intro = hud(self, VGroup(q, answers).move_to(ORIGIN))
        with self.voice('logit.1'):
            self.play(FadeIn(q, shift=DOWN * 0.2), run_time=1)
            self.play(LaggedStart(*[FadeIn(a, shift=UP * 0.2) for a in answers], lag_ratio=0.35), run_time=2.5)

        # --- logit.2: two numbers are the floor
        floor_tex = hud(self, tex('floor', 0.42).to_edge(DOWN, buff=0.5))
        with self.voice('logit.2'):
            self.play(intro.animate.scale(0.6).to_corner(UL, buff=0.4), run_time=1.2)
            self.play(Write(floor_tex), run_time=2)
            self.play(Create(grid, lag_ratio=0.02), Create(VGroup(ax.x_axis, ax.y_axis)), run_time=2.5)
            self.play(FadeIn(xl), FadeIn(yl), run_time=1)

        # --- logit.3: raise the expected reward
        surf = self.surface(lambda u, v: B.J(u, v))
        flat = self.surface(lambda u, v: 0.0, like=surf)
        J_tex = hud(self, tex('J', 0.5).to_corner(UR, buff=0.5))
        plateaus = tag(self, *[backed(words(s, 26, c)).move_to(ax.c2p(*p)) for s, c, p in (
            ('sure of 51', GREEN, (5.2, -4.6, 1.25)), ('sure of about 50', TEAL, (-4.0, 5.4, 0.55)),
            ('sure of 41', RED, (-5.0, -5.0, 0.25)))])
        with self.voice('logit.3'):
            self.play(FadeOut(floor_tex), FadeIn(flat), run_time=1)
            self.move_camera(phi=60 * DEGREES, theta=-70 * DEGREES, zoom=0.8, frame_center=ax.c2p(0.5, 0.5, 0.7),
                             run_time=3,
                             added_anims=[Write(J_tex)])
            self.play(ReplacementTransform(flat, surf), run_time=3.5)
            self.play(LaggedStart(*[FadeIn(p) for p in plateaus], lag_ratio=0.4), run_time=2.5)
            self.begin_ambient_camera_rotation(rate=0.035)
        self.stop_ambient_camera_rotation()

        # --- logit.4: the exact gradient, seen from above
        u0, v0 = SC.U0, SC.V0
        self.K = 3.0          # floor units per unit of gradient, for every arrow below
        P = ax.c2p(u0, v0, 0.02)
        dot = Dot3D(P, radius=0.06, color=INK)
        g = B.gradient_uv(u0, v0)
        grad = self.arrow(g, YELLOW, width=7)
        map_ = self.surface(lambda u, v: 0.0, like=surf)
        for f_map, f in zip(map_, surf):
            f_map.set_fill(f.get_fill_color(), opacity=0.38)
        with self.voice('logit.4'):
            self.play(FadeOut(VGroup(*plateaus, xl, yl)), run_time=0.6)
            self.play(ReplacementTransform(surf, map_), run_time=2.2)
            self.move_camera(phi=0, theta=-90 * DEGREES, zoom=2.3, frame_center=ax.c2p(u0 + 0.6, v0 - 0.2, 0),
                             run_time=2.5)
            self.play(FadeIn(dot, scale=0.5), run_time=0.5)
            self.play(GrowArrow(grad), run_time=1.2)
        self.map_, self.dot = map_, dot

        # --- logit.5: one sample is one of three arrows
        sample_tex = hud(self, tex('sample', 0.5).to_corner(DL, buff=0.5))
        arrows = self.sample_arrows(offset=0, baseline=0, size=15)
        with self.voice('logit.5'):
            self.play(FadeOut(intro), Write(sample_tex), run_time=1.5)
            self.play(LaggedStart(*[GrowArrow(a) for a in arrows[0] if a.get_length() > 0.01],
                                  *[FadeIn(l) for l in arrows[1]], lag_ratio=0.3), run_time=3)

        # --- logit.6: weighted, they add up to the gradient
        avg_tex = hud(self, tex('average', 0.62).next_to(sample_tex, RIGHT, buff=0.9).align_to(sample_tex, DOWN))
        with self.voice('logit.6'):
            self.play(Write(avg_tex), run_time=1.5)
            self.chain(arrows, offset=0, baseline=0)

        # --- logit.7: add ten; a slice through the point, from the side
        inset, slope = self.slice_inset()
        tens = hud(self, words('+10', 22, GOLD).next_to(inset[-1][0], LEFT, 0.12).shift(UP * 0.9))
        plus = hud(self, tex('plus10', 0.45).next_to(inset, UP, 0.35))
        with self.voice('logit.7'):
            self.play(FadeOut(avg_tex), Write(plus), FadeIn(inset), run_time=1.5)
            self.play(inset[-1].animate.shift(UP * 0.9), slope.animate.shift(UP * 0.9), run_time=2.5)
            self.play(FadeIn(tens), run_time=0.6)

        # --- logit.8: the arrows swing far out
        big = self.sample_arrows(offset=10, baseline=0, size=72)
        spread = hud(self, VGroup(words('spread of one sample', 24, GREY_B),
                                  words(f'{SC.SPREAD["plain"]:.2f}', 34, INK)).arrange(DOWN, buff=0.12)
                     .to_corner(UL, buff=0.5))
        with self.voice('logit.8'):
            self.play(FadeIn(spread), run_time=0.8)
            self.move_camera(zoom=0.26, frame_center=ax.c2p(u0 - 2, v0 + 2, 0), run_time=2.5,
                             added_anims=[ReplacementTransform(arrows[0], big[0]),
                                          ReplacementTransform(arrows[1], big[1])])
            self.play(Transform(spread[1], words(f'{SC.SPREAD["off"]:.0f}', 34, RED).move_to(spread[1])),
                      run_time=1)
            self.chain(big, offset=10, baseline=0)

        # --- logit.9: a baseline brings them back
        small = self.sample_arrows(offset=10, baseline=B.J(u0, v0, 10), size=0)
        base_tex = hud(self, tex('baseline', 0.5).move_to(sample_tex, aligned_edge=LEFT))
        with self.voice('logit.9'):
            self.play(ReplacementTransform(sample_tex, base_tex), run_time=1)
            self.move_camera(zoom=2.3, frame_center=ax.c2p(u0 + 0.6, v0 - 0.2, 0), run_time=2.5,
                             added_anims=[ReplacementTransform(big[0], small[0]),
                                          FadeOut(big[1])])
            self.play(Transform(spread[1], words(f'{SC.SPREAD["base"]:.2f}', 34, GREEN).move_to(spread[1])),
                      run_time=1)

        # --- logit.10: training without a baseline
        surf2 = self.surface(lambda u, v: B.J(u, v))
        runs_none = self.runs('none', RED)
        start = Dot3D(self.on_surface(*SC.CLIMB['start']), radius=0.07, color=INK)
        with self.voice('logit.10'):
            self.play(FadeOut(VGroup(small[0], small[1], grad, dot)),
                      FadeOut(VGroup(inset, slope, spread, base_tex, plus, tens)), run_time=1)
            self.move_camera(phi=58 * DEGREES, theta=-70 * DEGREES, zoom=0.92, frame_center=ax.c2p(0.5, 0.5, 0.55),
                             run_time=2.5)
            self.play(ReplacementTransform(map_, surf2), run_time=2)
            self.play(FadeIn(start), FadeIn(VGroup(*plateaus, xl, yl)), run_time=0.6)
            self.play(LaggedStart(*[Create(r) for r in runs_none], lag_ratio=0.12), run_time=6, rate_func=linear)

        # --- logit.11: with a baseline
        runs_mean = self.runs('mean', GREEN)
        exact = self.runs('exact', YELLOW, width=5)
        with self.voice('logit.11', pause=1.2):
            self.play(runs_none.animate.set_stroke(opacity=0.3), run_time=0.5)
            self.play(LaggedStart(*[Create(r) for r in runs_mean], lag_ratio=0.08), Create(exact[0]),
                      run_time=3.2, rate_func=linear)
        self.play(FadeOut(VGroup(surf2, runs_none, runs_mean, exact, start, grid, xl, yl, J_tex,
                                 ax.x_axis, ax.y_axis, *plateaus)), run_time=1.2)

    # ---------------------------------------------------------------- helpers
    def surface(self, f, like=None):
        R, ax = self.R, self.ax
        s = Surface(lambda u, v: ax.c2p(u, v, f(u, v)), u_range=[-R, R], v_range=[-R, R],
                    resolution=self.RES, checkerboard_colors=False, fill_opacity=0.9)
        vals = [B.J(u, v) for u, v in face_centres([-R, R], [-R, R], self.RES)]
        return height_colors(s, vals, 0, 1)

    def on_surface(self, u, v, lift=0.03):
        return self.ax.c2p(u, v, B.J(u, v) + lift)

    def arrow(self, g, color, width=6, at=None, opacity=1.0):
        u0, v0 = (SC.U0, SC.V0) if at is None else at
        if np.linalg.norm(g) < 1e-9:          # an answer that earns nothing: no arrow
            g, opacity = np.array([1e-3, 0.0]), 0.0
        a = self.ax.c2p(u0, v0, 0.03)
        b = self.ax.c2p(u0 + self.K * g[0], v0 + self.K * g[1], 0.03)
        arr = Arrow(a, b, buff=0, stroke_width=width, color=color, max_tip_length_to_length_ratio=0.22,
                    max_stroke_width_to_length_ratio=12)
        arr.set_opacity(opacity)
        return arr

    def sample_arrows(self, offset, baseline, size):
        cols = (GREEN, TEAL, RED)
        out, labels = VGroup(), VGroup()
        ar = B.arrows(SC.U0, SC.V0, offset, baseline)
        top = max(p for p, _ in ar)
        for (p, g), c, lab in zip(ar, cols, B.labels):
            a = self.arrow(g, c, width=5, opacity=0.25 + 0.75 * p / top)
            out.add(a)
            n = np.linalg.norm(g)
            d = g / n if n > 1e-9 else np.array([0.0, -1.0])
            tip = self.ax.c2p(SC.U0 + self.K * g[0] + 0.5 * d[0], SC.V0 + self.K * g[1] + 0.5 * d[1], 0.05)
            if size:
                labels.add(words(f'{lab} · {p:.0%}', size, c).move_to(tip))
        return out, labels

    def chain(self, arrows, offset, baseline):
        """Scale each arrow by its chance and lay them tip to tail: they end
        where the gradient does."""
        ar = B.arrows(SC.U0, SC.V0, offset, baseline)
        at = np.array([SC.U0, SC.V0])
        pieces = VGroup()
        for (p, g), a in zip(ar, arrows[0]):
            piece = self.arrow(p * g, a.get_color(), width=6, at=at)
            pieces.add(piece)
            at = at + self.K * p * g
        ghost = arrows[0].copy()
        self.play(arrows[0].animate.set_opacity(0.12), arrows[1].animate.set_opacity(0.2), run_time=0.6)
        for gh, piece in zip(ghost, pieces):
            self.play(ReplacementTransform(gh, piece), run_time=1.0)
        self.play(pieces.animate.set_opacity(0.0), arrows[0].animate.set_opacity(0.7),
                  arrows[1].animate.set_opacity(1), run_time=0.8)
        self.remove(pieces)

    def slice_inset(self):
        """A side view: J along u through the point, before and after +10."""
        from manim import Axes
        u0, v0 = SC.U0, SC.V0
        box = Axes(x_range=[-4, 6, 2], y_range=[0, 2.4, 1], x_length=3.6, y_length=2.2,
                   axis_config=dict(color=GREY, stroke_width=2, include_tip=False, include_ticks=False))
        curve = box.plot(lambda u: B.J(u, v0), x_range=[-4, 6], color=BLUE, stroke_width=3)
        dj = B.gradient_uv(u0, v0)[0]
        p = box.c2p(u0, B.J(u0, v0))
        slope = Line(box.c2p(u0 - 1.6, B.J(u0, v0) - 1.6 * dj), box.c2p(u0 + 1.6, B.J(u0, v0) + 1.6 * dj),
                     color=YELLOW, stroke_width=3)
        lift = VGroup(curve, Dot(p, radius=0.05, color=INK))
        cap = words('a slice, seen from the side', 18, GREY_B).next_to(box, UP, 0.1)
        g = VGroup(cap, box, lift).to_edge(RIGHT, buff=0.4).shift(DOWN * 1.2)
        slope.shift(lift[1].get_center() - slope.get_center())
        hud(self, g, slope)
        return g, slope

    def runs(self, kind, color, width=2.2):
        paths = VGroup()
        for p in SC.RUNS[kind]:
            p = np.clip(p, -self.R, self.R)
            m = VMobject().set_points_as_corners([self.on_surface(u, v, 0.05) for u, v in p])
            m.set_stroke(color, width, opacity=0.9)
            paths.add(m)
        return paths


# ================================================ act 2: the clipped surrogate


class Clip(Voiced):
    X = (0.2, 1.8)
    Y = (-1.0, 1.0)
    RES = (32, 20)    # grid lines fall on ratio 0.8 and 1.2 and on A = 0

    def construct(self):
        ax = ThreeDAxes(x_range=[*self.X, 0.2], y_range=[*self.Y, 0.5], z_range=[-1.8, 1.8, 0.5],
                        x_length=6.2, y_length=4.6, z_length=6.4,
                        axis_config=dict(color=GREY, stroke_width=2, include_tip=False, include_ticks=False))
        self.ax = ax
        self.set_camera_orientation(phi=70 * DEGREES, theta=-102 * DEGREES, zoom=0.74, frame_center=ax.c2p(1, 0, -0.45))
        floor = Polygon(*[ax.c2p(x, y, -1.8) for x, y in ((0.2, -1), (1.8, -1), (1.8, 1), (0.2, 1))],
                        stroke_color=GREY, stroke_width=1.5, fill_color=GREY, fill_opacity=0.06)
        ticks = VGroup(*[DashedLine(ax.c2p(x, -1, -1.8), ax.c2p(x, 1, -1.8), dash_length=0.08)
                         .set_stroke(GREY_B if x != 1 else INK, 1.5, opacity=0.7) for x in (0.8, 1.0, 1.2)])
        zero = Line(ax.c2p(0.2, 0, -1.8), ax.c2p(1.8, 0, -1.8)).set_stroke(GREY_B, 1.5, opacity=0.6)
        tl = tag(self, *[words(s, 28, GREY_B).move_to(ax.c2p(x, -1.3, -1.8))
                         for s, x in (('0.8', 0.8), ('1', 1.0), ('1.2', 1.2))])
        xl = tag(self, words('ratio ρ', 32, INK).move_to(ax.c2p(1.0, -1.75, -1.8)))
        yl = tag(self, *[backed(words(s, 28, c)).move_to(ax.c2p(0.03, a, 0.2 * a))
                         for s, c, a in (('A = +1', GREEN, 1.0), ('A = −1', RED, -1.0))])
        yname = tag(self, backed(words('advantage A', 30, INK)).move_to(ax.c2p(-0.05, 0.0, 0.0)))

        rho = hud(self, tex('rho', 0.85).to_corner(UL, buff=0.45))
        with self.voice('clip.1'):
            self.play(Create(floor), Create(zero), run_time=1.5)
            self.play(Write(rho), FadeIn(xl), FadeIn(VGroup(*tl)), Create(ticks), run_time=2.5)
            self.play(FadeIn(yname), run_time=1.5)

        sheet = self.surface(lambda x, a: x * a)
        sheet.set_fill(GREY_B, opacity=0.22).set_stroke(GREY_B, 0.6, opacity=0.45)
        sheet_tex = hud(self, tex('sheet', 0.5).to_corner(UR, buff=0.55))
        with self.voice('clip.2'):
            self.play(Write(sheet_tex), run_time=1)
            self.play(Create(sheet), run_time=3.5)
            self.play(FadeIn(VGroup(*yl)), run_time=0.8)
            self.begin_ambient_camera_rotation(rate=0.05)
        self.stop_ambient_camera_rotation()

        clipped = self.surface(lambda x, a: float(ppo_clip(x, a)))
        start = sheet.copy()
        cols = []
        for x, a in face_centres(self.X, self.Y, self.RES):
            s = float(ppo_slope(np.array(x), a))
            cols.append(GREY if s == 0 else (GREEN if a > 0 else RED))
        for face, c in zip(clipped, cols):
            face.set_fill(c, opacity=0.78)
        clipped.set_stroke(BG, 0.5, opacity=0.5)
        clip_tex = hud(self, tex('clipped', 0.5).to_corner(UR, buff=0.55))
        flat_key = hud(self, VGroup(
            VGroup(Dot(color=GREY), words('flat: no push', 22, GREY_B)).arrange(RIGHT, buff=0.15),
            VGroup(Dot(color=GREEN), words('A > 0: push up', 22, GREY_B)).arrange(RIGHT, buff=0.15),
            VGroup(Dot(color=RED), words('A < 0: push down', 22, GREY_B)).arrange(RIGHT, buff=0.15))
            .arrange(DOWN, aligned_edge=LEFT, buff=0.15).to_corner(DL, buff=0.5))
        slices = VGroup(*[self.slice(a) for a in (0.8, -0.8)])
        with self.voice('clip.3'):
            self.play(ReplacementTransform(sheet_tex, clip_tex), run_time=1.2)
            self.add(start)
            self.play(Transform(start, clipped), run_time=3.5)
            self.play(FadeIn(flat_key), run_time=0.8)
            self.play(Create(slices[0]), run_time=2.2)
            self.play(Create(slices[1]), run_time=2.2)
        self.remove(start)
        self.add(clipped)

        # a token with A = 0.8 whose ratio grows from 1 to 1.6
        A = 0.8
        x = ValueTracker(1.0)
        on_clip = always_redraw(lambda: Dot3D(ax.c2p(x.get_value(), A, float(ppo_clip(x.get_value(), A)) + 0.04),
                                              radius=0.12, color=YELLOW))
        on_sheet = always_redraw(lambda: Dot3D(ax.c2p(x.get_value(), A, x.get_value() * A + 0.04),
                                               radius=0.09, color=GREY_B))
        gap = always_redraw(lambda: DashedLine(ax.c2p(x.get_value(), A, float(ppo_clip(x.get_value(), A))),
                                               ax.c2p(x.get_value(), A, x.get_value() * A), dash_length=0.06)
                            .set_stroke(GREY_B, 3))
        slope = hud(self, VGroup(words('slope', 24, GREY_B), readout(lambda: float(ppo_slope(np.array(x.get_value()), A)), '{:.1f}'))
                    .arrange(RIGHT, buff=0.2).to_corner(DR, buff=0.6))
        with self.voice('clip.4'):
            self.move_camera(phi=74 * DEGREES, theta=-92 * DEGREES, zoom=0.84, frame_center=ax.c2p(1.2, 0.4, -0.3),
                             run_time=2)
            self.play(FadeIn(on_clip), FadeIn(on_sheet), FadeIn(slope), run_time=0.8)
            self.add(gap)
            self.play(x.animate.set_value(1.6), run_time=5, rate_func=smooth)
            self.wait(0.5)

        # the correction: a step that went the wrong way
        self.remove(gap)
        pull = VGroup(
            Arrow(ax.c2p(0.5, A, 0.5 * A + 0.08), ax.c2p(0.78, A, 0.78 * A + 0.08), buff=0, color=GREEN,
                  stroke_width=9),
            Arrow(ax.c2p(1.55, -A, -1.55 * A + 0.08), ax.c2p(1.27, -A, -1.27 * A + 0.08), buff=0, color=RED,
                  stroke_width=9))
        with self.voice('clip.5', pause=1.0):
            self.play(x.animate.set_value(0.5), run_time=2)
            self.play(GrowArrow(pull[0]), run_time=1)
            self.play(GrowArrow(pull[1]), run_time=1)
            self.move_camera(theta=-128 * DEGREES, zoom=0.8, frame_center=ax.c2p(1, 0, -0.45), run_time=3)
        self.play(FadeOut(VGroup(clipped, sheet, floor, ticks, zero, pull, on_clip, on_sheet, *tl, xl, *yl, yname,
                                 slices)),
                  FadeOut(VGroup(rho, clip_tex, flat_key, slope)), run_time=1.2)

    def slice(self, A):
        xs = np.linspace(*self.X, 97)
        m = VMobject().set_points_as_corners([self.ax.c2p(x, A, float(ppo_clip(x, A)) + 0.03) for x in xs])
        return m.set_stroke(YELLOW if A > 0 else GOLD, 5)

    def surface(self, f):
        ax = self.ax
        return Surface(lambda x, a: ax.c2p(x, a, f(x, a)), u_range=list(self.X), v_range=list(self.Y),
                       resolution=self.RES, checkerboard_colors=False)


# ==================================================== act 3: the KL dome


class Dome(Voiced):
    S = 1.2           # screen units per unit of objective
    RES = (30, 30)

    def z(self, value):
        """Heights start at the floor, which stands for an objective of -1."""
        return self.S * (max(value, -1.0) + 1.0)

    def at(self, pi, value):
        x, y = to_floor(pi)
        return np.array([x, y, value])

    def surface(self, f, opacity=0.88, colors=True):
        # cosine spacing: finer near the edges, where the KL term is steepest
        s = Surface(lambda s_, t: self.at(edge(s_, t), self.z(f(edge(s_, t)))),
                    u_range=[0, 1], v_range=[0, 0.999], resolution=self.RES, checkerboard_colors=False)
        if colors:
            vals = [f(edge(a, b)) for a, b in face_centres([0, 1], [0, 0.999], self.RES)]
            height_colors(s, vals, -1, 1.5, opacity=opacity)
        return s

    def construct(self):
        self.set_camera_orientation(phi=62 * DEGREES, theta=-62 * DEGREES, zoom=1.15, frame_center=[0.2, 0.25, 0.9])
        corners = [np.array([*c, 0.0]) for c in TRIANGLE]
        tri = Polygon(*corners, stroke_color=GREY_B, stroke_width=2, fill_color=GREY, fill_opacity=0.08)
        cols = (GREY_B, GREEN, PURPLE)
        names = tag(self, *[backed(words(n, 30, c)).move_to(p * 1.2 + np.array([0, 0, -0.1]))
                            for n, c, p in zip(L.labels, cols, corners)])
        mid = Dot3D(to_floor_3(np.ones(3) / 3), radius=0.07, color=INK)
        mid_l = tag(self, words('even split', 22, GREY_B).move_to(to_floor_3(np.ones(3) / 3) + np.array([0, -0.45, 0])))
        with self.voice('dome.1'):
            self.play(Create(tri), run_time=1.5)
            self.play(LaggedStart(*[FadeIn(n) for n in names], lag_ratio=0.3), run_time=1.5)
            self.play(FadeIn(mid), FadeIn(mid_l), run_time=0.8)
            self.play(mid.animate.move_to(corners[1]), run_time=1.5)
            self.play(mid.animate.move_to(to_floor_3(np.ones(3) / 3)), run_time=1.2)

        ref = Dot3D(to_floor_3(L.ref), radius=0.09, color=GOLD)
        ref_l = tag(self, backed(words('reference  60 · 30 · 10', 24, GOLD)).move_to(to_floor_3(L.ref) + np.array([0.2, -0.5, 0])))
        bars = VGroup(*[Prism(dimensions=[0.18, 0.18, self.S * r]).set_fill(c, 0.9).set_stroke(width=0)
                        .move_to(p + np.array([0, 0, self.S * r / 2])) for r, c, p in zip(L.r, cols, corners)])
        bar_l = tag(self, *[words(f'r = {r:g}', 24, c).move_to(p + np.array([0, 0, self.S * r + 0.3]))
                            for r, c, p in zip(L.r, cols, corners)])
        with self.voice('dome.2'):
            self.play(FadeOut(mid), FadeOut(mid_l), run_time=0.5)
            self.play(FadeIn(ref, scale=0.5), FadeIn(ref_l), run_time=1)
            self.play(LaggedStart(*[FadeIn(b, shift=OUT * 0.3) for b in bars], lag_ratio=0.3),
                      LaggedStart(*[FadeIn(b) for b in bar_l], lag_ratio=0.3), run_time=2.5)

        plane = self.surface(lambda p: float(p @ np.array(L.r)), opacity=0.55)
        bowl = Surface(lambda s_, t: self.at(edge(s_, t), min(self.S * kl(edge(s_, t), L.ref), 3.0)),
                       u_range=[0, 1], v_range=[0, 0.999], resolution=self.RES, checkerboard_colors=False)
        bowl.set_fill(PURPLE, opacity=0.4).set_stroke(PURPLE, 0.5, opacity=0.5)
        r_tex = hud(self, tex('reward', 0.5).to_corner(UL, buff=0.5))
        k_tex = hud(self, tex('kl', 0.5).next_to(r_tex, DOWN, 0.35, aligned_edge=LEFT).set_color(PURPLE))
        with self.voice('dome.3'):
            self.play(Write(r_tex), FadeOut(VGroup(*bar_l)), run_time=1)
            self.play(Create(plane), FadeOut(bars), run_time=3)
            self.wait(1)
            self.play(Write(k_tex), run_time=1)
            self.play(Create(bowl), plane.animate.set_fill(opacity=0.15), run_time=3)

        beta = ValueTracker(0.5)
        dome = self.surface(lambda p: L.objective(p, 0.5))
        obj = hud(self, tex('objective', 0.5).to_corner(UL, buff=0.5))
        tilt_t = hud(self, tex('tilt', 0.95).to_corner(UR, buff=0.45))
        height_t = hud(self, tex('height', 0.42).next_to(tilt_t, DOWN, 0.35))

        def peak_point():
            b = beta.get_value()
            return self.at(L.tilt(b), self.z(L.peak_height(b)))

        peak = always_redraw(lambda: Dot3D(peak_point() + np.array([0, 0, 0.05]), radius=0.09, color=YELLOW))
        drop = always_redraw(lambda: DashedLine(peak_point(), peak_point() * np.array([1, 1, 0]), dash_length=0.08)
                             .set_stroke(YELLOW, 2))
        with self.voice('dome.4'):
            self.play(ReplacementTransform(VGroup(r_tex, k_tex), obj), run_time=1.2)
            self.play(ReplacementTransform(plane, dome), FadeOut(bowl), run_time=3)
            self.play(FadeIn(peak), Create(drop), run_time=1)
            self.play(Write(tilt_t), run_time=1.5)
            self.play(Write(height_t), run_time=1.2)

        self.remove(dome)
        live = always_redraw(lambda: self.surface(lambda p: L.objective(p, beta.get_value())))
        self.add(live)
        trail = VMobject().set_points_as_corners([to_floor_3(L.tilt(b)) + np.array([0, 0, 0.02])
                                                   for b in np.exp(np.linspace(np.log(2.5), np.log(0.08), 60))])
        trail.set_stroke(YELLOW, 3, opacity=0.8)
        knob = hud(self, VGroup(words('β =', 30, INK), readout(beta.get_value, '{:.2f}', 36))
                   .arrange(RIGHT, buff=0.18).to_corner(DR, buff=0.6))
        with self.voice('dome.5'):
            self.play(FadeIn(knob), run_time=0.6)
            self.play(beta.animate.set_value(2.5), run_time=3, rate_func=rate_functions.ease_in_out_sine)
            self.add(trail)
            self.play(beta.animate.set_value(0.08), Create(trail), run_time=8,
                      rate_func=rate_functions.ease_in_out_sine)
        with self.voice('dome.6', pause=1.4):
            self.move_camera(theta=-30 * DEGREES, run_time=4, added_anims=[beta.animate.set_value(0.6)])
            self.wait(1)
        knob[1].clear_updaters()
        self.play(FadeOut(VGroup(live, peak, drop, trail, tri, ref, *names, ref_l)),
                  FadeOut(VGroup(obj, tilt_t, height_t, knob)), run_time=1.2)


def edge(s, t):
    """simplex_point on a cosine-spaced grid"""
    c = lambda x: (1 - np.cos(np.pi * x)) / 2
    return simplex_point(c(s), c(t))


def to_floor_3(pi):
    x, y = to_floor(pi)
    return np.array([x, y, 0.0])
