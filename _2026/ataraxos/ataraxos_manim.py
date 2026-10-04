"""Decisions in the dark: a narrated Manim companion to _2026/ataraxos/ataraxos_explorable.html.

The scenes draw the same semantic objects as the page (public and hidden
information, policy, belief, value, the knobs eta, alpha and beta) in the same
colours, and they run the same toy model: the bluff game of Figures 3.1, 3.2
and 4.1. The self-play paths below come from the same update rule (magnetic
mirror descent) and the same annealed schedule as the page's dynamics lab.
"""
import os

import numpy as np
from manim import *

# ── render config (draft by default; ATA_QUALITY=final for 720p30) ──────────
if os.environ.get("ATA_QUALITY") == "final":
    config.pixel_width, config.pixel_height, config.frame_rate = 1280, 720, 30
else:
    config.pixel_width, config.pixel_height, config.frame_rate = 854, 480, 15
config.frame_width, config.frame_height = 16, 9

# ── semantic model: one colour per role, mirrored from the page's CSS tokens ──
ROLE = {
    "public": "#74AAE4",     # what every player sees
    "hidden": "#E888BB",     # what only one player knows: ranks, set-ups
    "policy": "#F39B4C",     # probabilities of your decisions
    "policyDim": "#B47D4F",  # the opponent's decisions
    "value": "#5FCBA2",      # expected outcomes, equilibrium, search estimates
    "param": "#AB9EF3",      # knobs: step size, pull, magnet, leash
    "belief": "#E7D16B",     # probabilities over hidden information
    "warn": "#F07173",       # exploitability, cycling, errors
    "context": "#8F96A3",    # chance, compute, simulator
}
FG, FG_SOFT, FG_FAINT, BG, SUNK = "#DADDE3", "#AAB0BB", "#6F7682", "#13151A", "#1C1F27"
config.background_color = BG


def P(x, y):
    return np.array([x, y, 0.0])


# ── the bluff game (same numbers as BLUFF in the page) ─────────────────────
P_GEN, WIN, LOSE, TEMPO = .25, 1.0, -.5, .2


def belief(b):
    """Opponent's P(General | advance) when the Scout bluffs with probability b."""
    return P_GEN / (P_GEN + (1 - P_GEN) * b)


def payoff(b, s):
    return P_GEN * (s * WIN + (1 - s) * TEMPO) + (1 - P_GEN) * b * (s * LOSE + (1 - s) * TEMPO)


def exploitability(b, s):
    return max(payoff(0, s), payoff(1, s)) - min(payoff(b, 0), payoff(b, 1))


Q_STAR = (TEMPO - LOSE) / (WIN - LOSE)
B_STAR = P_GEN * (1 - Q_STAR) / ((1 - P_GEN) * Q_STAR)   # 0.381
S_STAR = TEMPO / (TEMPO - LOSE)                         # 0.286


def mmd(p, q1, q0, eta, alpha):
    """One magnetic-mirror-descent step for a two-action policy, magnet = uniform."""
    l1 = (np.log(p) + alpha * eta * np.log(.5) + eta * q1) / (1 + alpha * eta)
    l0 = (np.log(1 - p) + alpha * eta * np.log(.5) + eta * q0) / (1 + alpha * eta)
    m = max(l1, l0)
    return np.exp(l1 - m) / (np.exp(l1 - m) + np.exp(l0 - m))


def self_play(schedule, T, b=.85, s=.85):
    path, ex = [(b, s)], [exploitability(b, s)]
    for t in range(T):
        eta, alpha = schedule(t)
        q_bluff = s * LOSE + (1 - s) * TEMPO
        q = belief(b)
        q_stand = -(q * WIN + (1 - q) * LOSE)
        b2, s2 = mmd(b, q_bluff, 0.0, eta, alpha), mmd(s, q_stand, -TEMPO, eta, alpha)
        b, s = float(np.clip(b2, 1e-9, 1 - 1e-9)), float(np.clip(s2, 1e-9, 1 - 1e-9))
        path.append((b, s))
        ex.append(exploitability(b, s))
    return np.array(path), np.array(ex)


def coordinated(t):
    """The page's annealed schedule: pull alpha and step eta fall together."""
    a = .6 / (1 + t / 25)
    return 30 * a ** 1.3, a


# ── Stratego pieces ─────────────────────────────────────────────────────────
ARMY = ["F", "S", "9", "10"] + ["B"] * 6 + ["2"] * 8 + ["3"] * 5 + ["4"] * 4 + ["5"] * 4 + ["6"] * 4 + ["7"] * 3 + ["8"] * 2


def tile(label, color, side=.3, fill=.28, font=16, label_color=None, stroke=1.6):
    box = RoundedRectangle(corner_radius=side * .16, width=side, height=side, stroke_color=color, stroke_width=stroke)
    box.set_fill(color, fill)
    return VGroup(box, Tex(label, font_size=font, color=label_color or color).move_to(box))


def chess_board(sq=.40):
    squares = VGroup(*[
        Square(sq, stroke_width=0).set_fill("#2A2F3A" if (r + c) % 2 else "#1F232C", 1).move_to(P(c * sq, r * sq))
        for r in range(8) for c in range(8)])
    pieces = VGroup()
    layout = [("K", 6, 0, 1), ("R", 5, 0, 1), ("P", 5, 1, 1), ("P", 6, 1, 1), ("P", 7, 2, 1), ("Q", 3, 2, 1),
              ("N", 5, 2, 1), ("B", 2, 3, 1), ("P", 0, 1, 1), ("P", 3, 3, 1),
              ("K", 6, 7, 0), ("R", 3, 7, 0), ("P", 5, 6, 0), ("P", 6, 6, 0), ("P", 7, 5, 0), ("Q", 1, 5, 0),
              ("N", 2, 5, 0), ("B", 4, 4, 0), ("P", 0, 6, 0), ("P", 3, 4, 0)]
    for letter, c, r, white in layout:
        disc = Circle(radius=sq * .38, stroke_color=ROLE["public"], stroke_width=0 if white else 2)
        disc.set_fill(ROLE["public"] if white else BG, .92 if white else 1)
        txt = Tex(r"\textbf{%s}" % letter, font_size=18, color=BG if white else ROLE["public"])
        pieces.add(VGroup(disc, txt.move_to(disc)).move_to(squares[r * 8 + c]))
    return VGroup(squares, pieces)


def stratego_board(seed=7, sq=.34):
    cells = VGroup()
    lakes = VGroup()
    for r in range(10):
        for c in range(10):
            cell = Square(sq, stroke_color=FG_FAINT, stroke_width=.6).set_fill(SUNK, 1).move_to(P(c * sq, r * sq))
            cells.add(cell)
    for c0 in (2, 6):
        lake = Rectangle(width=2 * sq, height=2 * sq, stroke_width=0).set_fill(ROLE["context"], .35)
        lake.move_to((cells[4 * 10 + c0].get_center() + cells[5 * 10 + c0 + 1].get_center()) / 2)
        lakes.add(lake)
    rng = np.random.default_rng(seed)
    army = list(rng.permutation(ARMY))
    own, enemy = VGroup(), VGroup()
    for r in range(4):
        for c in range(10):
            own.add(tile(army[r * 10 + c], FG_FAINT, side=sq * .84, fill=.0, font=15, label_color=FG_SOFT, stroke=1.1)
                    .move_to(cells[r * 10 + c]))
    for r in range(6, 10):
        for c in range(10):
            enemy.add(tile("?", ROLE["hidden"], side=sq * .84, font=15).move_to(cells[r * 10 + c]))
    return VGroup(VGroup(cells, lakes), enemy, own)


def header(text):
    return Tex(text, font_size=34, color=FG_SOFT).to_corner(UL, buff=.45)


def node(text, color, w=1.7, h=.5, font=24):
    box = RoundedRectangle(corner_radius=.12, width=w, height=h, stroke_color=color, stroke_width=2).set_fill(color, .12)
    return VGroup(box, Tex(text, font_size=font, color=FG).move_to(box))


def polyline(points, color, width=3, opacity=1.0):
    """A path through scene points (3-vectors, e.g. from Axes.c2p)."""
    path = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    path.set_points_as_corners(list(points))
    return path


class Beat(Scene):
    """A scene made of narration segments. Each segment ends at its exact audio time,
    so frame rounding inside a segment never accumulates across the video."""

    def seg(self, text, dur):
        self.add_subcaption(text, duration=dur)
        self.__dict__["_t_end"] = self.__dict__.get("_t_end", 0.0) + dur

    def go(self, *anims, rt, **kwargs):
        self.play(*anims, run_time=rt, **kwargs)

    def hold(self):
        rem = self.__dict__.get("_t_end", 0.0) - self.time
        if rem > .02:
            self.wait(rem)


# ════════════════════════════════════════════════════════════════════════════
class Scene1_Hidden(Beat):
    def construct(self):
        hdr = header("Chess: every piece is in view")
        chess = chess_board().move_to(P(-4.0, -.05))
        lab_c = Tex("perfect information", font_size=30, color=ROLE["public"]).next_to(chess, DOWN, buff=.3)
        self.seg("In chess, both players see every piece. Nothing about the state of the game is hidden.", 5.592)
        self.go(FadeIn(hdr, shift=.1 * RIGHT), FadeIn(chess[0], lag_ratio=.01), rt=1.3)
        self.go(LaggedStart(*[FadeIn(p, scale=.6) for p in chess[1]], lag_ratio=.08), rt=1.6)
        self.go(FadeIn(lab_c, shift=.1 * UP), rt=.7)
        self.hold()

        strat = stratego_board().move_to(P(3.9, -.05))
        lab_s = Tex("imperfect information", font_size=30, color=ROLE["hidden"]).next_to(strat, DOWN, buff=.3)
        self.seg("In Stratego, you see where the enemy pieces stand, but not their ranks. Each player arranges forty hidden pieces.", 7.704)
        self.go(Transform(hdr, header("Stratego: you see where the enemy pieces stand, not what they are")),
                FadeIn(strat[0], lag_ratio=.004), rt=1.2)
        self.go(LaggedStart(*[FadeIn(t, shift=.06 * DOWN) for t in strat[1]], lag_ratio=.03), rt=1.8)
        self.go(LaggedStart(*[FadeIn(t, shift=.06 * UP) for t in strat[2]], lag_ratio=.03), rt=1.8)
        self.go(FadeIn(lab_s, shift=.1 * UP), rt=.7)
        self.hold()

        # the taxonomy: perfect / imperfect is about the state, complete / incomplete about the rules
        cp, ci, ip, ii = P(-1.6, .85), P(4.4, .85), P(-1.6, -1.85), P(4.4, -1.85)
        cells = VGroup(*[Rectangle(width=w, height=h, stroke_color=FG_FAINT, stroke_width=1.2).move_to(c)
                         for c, w, h in ((cp, 6.0, 2.5), (ci, 6.0, 2.5), ((ip + ii) / 2, 12.0, 2.3))])
        col_p = Tex(r"\textbf{perfect}\\you see the whole state", font_size=26, color=ROLE["public"]).move_to(P(-1.6, 2.72))
        col_i = Tex(r"\textbf{imperfect}\\part of the state is hidden", font_size=26, color=ROLE["hidden"]).move_to(P(4.4, 2.72))
        row_c = Tex(r"\textbf{complete}\\all players know\\the rules and payoffs", font_size=24, color=FG).move_to(P(-6.15, .85))
        row_i = Tex(r"\textbf{incomplete}\\some rules or payoffs\\are unknown", font_size=24, color=ROLE["context"]).move_to(P(-6.15, -1.85))
        names = VGroup(Tex(r"chess\\Go\\checkers", font_size=26, color=FG).move_to(cp + RIGHT * 1.55),
                       Tex(r"Stratego\\poker\\Kriegspiel", font_size=26, color=FG).move_to(ci + RIGHT * 1.55))
        hars = Tex(r"Harsanyi (1967): model the unknown rules or payoffs as hidden moves\\of chance. Then an incomplete game becomes an imperfect one.",
                   font_size=24, color=ROLE["context"]).move_to((ip + ii) / 2)
        hl = Rectangle(width=6.0, height=2.5, stroke_color=ROLE["hidden"], stroke_width=4).move_to(ci)
        self.seg("Both players know the rules, so the information is complete. But the state is hidden, so the information is imperfect.", 7.704)
        self.go(FadeOut(lab_c), FadeOut(lab_s), Transform(hdr, header("Two different questions about information")), rt=.6)
        self.go(FadeIn(cells), FadeIn(VGroup(col_p, col_i, row_c, row_i)),
                chess.animate.scale(.58).move_to(cp + LEFT * 1.3), strat.animate.scale(.55).move_to(ci + LEFT * 1.3), rt=1.6)
        self.go(FadeIn(names), rt=.7)
        self.go(FadeIn(hars, shift=.1 * UP), rt=.9)
        self.go(Create(hl), rt=.8)
        self.hold()

        # one information set holds about 10^33 hidden states
        formula = MathTex(r"\frac{40!}{8!\;6!\;5!\;4!\;4!\;4!\;3!\;2!}", r"\approx", r"1.4\times10^{33}", font_size=46)
        formula[2].set_color(ROLE["hidden"])
        formula.move_to(P(0, 2.45))
        side = .46
        view = VGroup(*[tile("?", ROLE["hidden"], side=side, font=22) for _ in range(10)]).arrange(RIGHT, buff=.08).move_to(P(-.6, 1.05))
        view_lab = Tex("what you see", font_size=26, color=ROLE["public"]).next_to(view, LEFT, buff=.35)
        rng = np.random.default_rng(11)
        rows = VGroup()
        for _ in range(4):
            ranks = rng.permutation(ARMY)[:10]
            rows.add(VGroup(*[tile(r, ROLE["hidden"], side=side, fill=.12, font=20) for r in ranks]).arrange(RIGHT, buff=.08))
        rows.arrange(DOWN, buff=.16).next_to(view, DOWN, buff=.42)
        vdots = MathTex(r"\vdots", font_size=36, color=ROLE["hidden"]).next_to(rows, DOWN, buff=.12)
        brace = Brace(VGroup(rows, vdots), LEFT, color=ROLE["hidden"])
        brace_lab = Tex(r"set-ups that\\fit this view", font_size=26, color=ROLE["hidden"]).next_to(brace, LEFT, buff=.2)
        warn = Tex(r"too many to list,\\too many to search", font_size=30, color=ROLE["warn"]).move_to(P(5.9, -.9))
        self.seg("One player can arrange the pieces in about ten to the thirty-three ways. You cannot list them, and you cannot search them all.", 7.56)
        self.go(FadeOut(VGroup(cells, col_p, col_i, row_c, row_i, names, hars, hl, chess, strat)),
                Transform(hdr, header("Behind one view: a huge set of hidden states")), rt=.7)
        self.go(Write(formula), rt=1.5)
        self.go(FadeIn(view, lag_ratio=.05), FadeIn(view_lab), rt=.8)
        self.go(LaggedStart(*[FadeIn(r, shift=.1 * DOWN) for r in rows], lag_ratio=.25), FadeIn(vdots),
                GrowFromCenter(brace), FadeIn(brace_lab), rt=1.7)
        self.go(FadeIn(warn, shift=.1 * LEFT), rt=.7)
        self.hold()


# ════════════════════════════════════════════════════════════════════════════
class Scene2_Bluff(Beat):
    def construct(self):
        hdr = header("A toy model: the bluff game")
        ctx = Tex("Your hidden piece stands next to an enemy Major (7).", font_size=26, color=FG_SOFT)
        ctx.next_to(hdr, DOWN, buff=.18, aligned_edge=LEFT)
        chance = Dot(P(-6.9, .2), radius=.09, color=ROLE["context"])
        chance_lab = Tex("chance", font_size=22, color=ROLE["context"]).next_to(chance, DOWN, buff=.15)
        gen = tile("9", ROLE["hidden"], side=.6, font=28).move_to(P(-4.7, 1.5))
        sco = tile("2", ROLE["hidden"], side=.6, font=28).move_to(P(-4.7, -1.1))
        gen_lab = Tex("General", font_size=24, color=ROLE["hidden"]).next_to(gen, UP, buff=.12)
        sco_lab = Tex("Scout", font_size=24, color=ROLE["hidden"]).next_to(sco, DOWN, buff=.12)
        e_gen = Line(chance.get_center(), gen.get_left(), color=ROLE["context"], stroke_width=2.5, buff=.12)
        e_sco = Line(chance.get_center(), sco.get_left(), color=ROLE["context"], stroke_width=2.5, buff=.12)
        p_gen = MathTex("0.25", font_size=28, color=ROLE["belief"]).next_to(e_gen.get_center(), UL, buff=.08)
        p_sco = MathTex("0.75", font_size=28, color=ROLE["belief"]).next_to(e_sco.get_center(), DL, buff=.08)
        self.seg("Here is a small version of the problem. Your hidden piece is a General, with probability one quarter, or else a Scout.", 7.56)
        self.go(FadeIn(hdr, shift=.1 * RIGHT), FadeIn(ctx), rt=.9)
        self.go(FadeIn(chance, scale=.5), FadeIn(chance_lab), rt=.5)
        self.go(Create(e_gen), Create(e_sco), FadeIn(gen), FadeIn(sco), FadeIn(gen_lab), FadeIn(sco_lab), rt=1.4)
        self.go(FadeIn(p_gen), FadeIn(p_sco), rt=.8)
        self.hold()

        adv_g = node("advance", ROLE["policy"]).move_to(P(-1.9, 1.5))
        adv_s = node(r"advance \textit{(bluff)}", ROLE["policy"], w=2.3).move_to(P(-1.9, -.35))
        stay = node("stay", ROLE["policy"]).move_to(P(-1.9, -1.95))
        a_g = Arrow(gen.get_right(), adv_g.get_left(), color=ROLE["policy"], stroke_width=3, buff=.1, max_tip_length_to_length_ratio=.15)
        a_b = Arrow(sco.get_right(), adv_s.get_left(), color=ROLE["policy"], stroke_width=3, buff=.1, max_tip_length_to_length_ratio=.15)
        a_s = Arrow(sco.get_right(), stay.get_left(), color=ROLE["policy"], stroke_width=3, buff=.1, max_tip_length_to_length_ratio=.15)
        l_g = MathTex("1", font_size=28, color=ROLE["policy"]).next_to(a_g, UP, buff=.06)
        l_b = MathTex("b", font_size=32, color=ROLE["policy"]).next_to(a_b.get_center(), UL, buff=.06)
        l_s = MathTex("1-b", font_size=28, color=ROLE["policy"]).next_to(a_s.get_center(), DL, buff=.04)
        self.seg("The General always advances. The Scout advances with probability b. That advance is a bluff.", 6.864)
        self.go(GrowArrow(a_g), FadeIn(adv_g), FadeIn(l_g), rt=1.0)
        self.go(GrowArrow(a_b), GrowArrow(a_s), FadeIn(adv_s), FadeIn(stay), rt=1.3)
        self.go(FadeIn(l_b, scale=1.4), FadeIn(l_s), rt=.7)
        self.go(Indicate(adv_s, color=ROLE["policy"], scale_factor=1.08), rt=.9)
        self.hold()

        # the opponent's information set and its belief
        info = DashedVMobject(RoundedRectangle(corner_radius=.2, width=2.75, height=2.75, stroke_color=ROLE["public"], stroke_width=2.5)
                              .move_to((adv_g.get_center() + adv_s.get_center()) / 2), num_dashes=46)
        info_lab = Tex("the opponent sees: an advance", font_size=24, color=ROLE["public"]).next_to(info, UP, buff=.1)
        b = ValueTracker(.2)
        formula = MathTex(r"P(\mathrm{General}\mid\mathrm{advance})", r"=", r"\frac{0.25}{0.25+0.75\,b}", font_size=38)
        formula[0].set_color(ROLE["belief"])
        formula.move_to(P(4.55, 2.55))
        X0, W, YB = 2.3, 4.5, 1.35
        bel_lab = Tex("belief", font_size=26, color=ROLE["belief"]).move_to(P(1.55, YB))
        track = Rectangle(width=W, height=.34, stroke_color=FG_FAINT, stroke_width=1.2).set_fill(SUNK, 1).move_to(P(X0 + W / 2, YB))
        bar = always_redraw(lambda: Rectangle(width=max(.01, W * belief(b.get_value())), height=.34, stroke_width=0)
                            .set_fill(ROLE["belief"], .85).move_to(P(X0, YB), aligned_edge=LEFT))
        bel_num = always_redraw(lambda: DecimalNumber(belief(b.get_value()), num_decimal_places=2, font_size=28, color=FG)
                                .move_to(P(X0 + W + .45, YB)))
        b_read = always_redraw(lambda: VGroup(MathTex("b=", font_size=30, color=ROLE["policy"]),
                                              DecimalNumber(b.get_value(), num_decimal_places=2, font_size=30, color=ROLE["policy"]))
                               .arrange(RIGHT, buff=.1).move_to(P(1.75, YB - .62)))
        self.seg("The opponent sees an advance, but not the rank. By Bayes' rule, more bluffs make a General less likely.", 6.696)
        self.go(Create(info), FadeIn(info_lab), rt=1.0)
        self.go(Write(formula), rt=1.2)
        self.go(FadeIn(bel_lab), FadeIn(track), FadeIn(bar), FadeIn(bel_num), FadeIn(b_read), rt=.6)
        self.go(b.animate.set_value(.9), rt=2.6, rate_func=smooth)
        self.hold()

        # the value of a bluff depends on how often you bluff
        ax = Axes(x_range=[0, 1, .25], y_range=[-.6, .3, .3], x_length=5.4, y_length=2.5, tips=False,
                  axis_config={"color": FG_FAINT, "stroke_width": 1.5, "include_ticks": False}).move_to(P(4.6, -1.7))

        def bluff_value(x):
            if abs(x - B_STAR) < .004:
                return TEMPO - (TEMPO - LOSE) * S_STAR   # the opponent mixes: value 0
            return TEMPO if x < B_STAR else LOSE

        left = Line(ax.c2p(0, TEMPO), ax.c2p(B_STAR, TEMPO), color=ROLE["policy"], stroke_width=4)
        right = Line(ax.c2p(B_STAR, LOSE), ax.c2p(1, LOSE), color=ROLE["policy"], stroke_width=4)
        l_left = Tex(r"opponent retreats: $+0.2$", font_size=22, color=FG_SOFT).next_to(left, UP, buff=.12).align_to(left, LEFT).shift(RIGHT * .18)
        l_right = Tex(r"opponent stands: $-0.5$", font_size=22, color=FG_SOFT).next_to(right, UP, buff=.12)
        y_lab = Tex("value of a bluff", font_size=24, color=ROLE["value"]).next_to(ax, UP, buff=.15).align_to(ax, RIGHT)
        x_lab = MathTex("b", font_size=30, color=ROLE["policy"]).next_to(ax.x_axis.get_right(), RIGHT, buff=.15)
        dot = always_redraw(lambda: Dot(ax.c2p(b.get_value(), bluff_value(b.get_value())), radius=.1, color=ROLE["policy"])
                            .set_stroke(BG, 3, background=True))
        self.seg("So the value of a bluff depends on how often you bluff. A move has no fixed value of its own.", 6.312)
        self.go(Create(ax), FadeIn(y_lab), FadeIn(x_lab), rt=.9)
        self.go(Create(left), Create(right), FadeIn(l_left), FadeIn(l_right), FadeIn(dot), rt=1.2)
        self.go(b.animate.set_value(.1), rt=2.8, rate_func=smooth)
        self.hold()

        vline = DashedLine(ax.c2p(B_STAR, -.6), ax.c2p(B_STAR, .3), color=ROLE["value"], stroke_width=2)
        v_lab = MathTex(r"b^\ast\approx0.38", font_size=28, color=ROLE["value"]).next_to(ax.c2p(B_STAR, -.6), DOWN, buff=.12)
        card = VGroup(
            Tex(r"\textbf{Equilibrium}", font_size=30, color=ROLE["value"]),
            Tex(r"the Scout bluffs with $b^\ast\approx0.38$", font_size=26, color=FG),
            Tex(r"the opponent stands with $s^\ast\approx0.29$", font_size=26, color=FG),
            Tex(r"no player gains by a change alone", font_size=24, color=FG_SOFT),
        ).arrange(DOWN, buff=.12).move_to(P(4.55, 2.55))
        self.seg("At equilibrium, the Scout bluffs about thirty-eight percent of the time, and the opponent stands about twenty-nine percent of the time.", 7.896)
        self.go(b.animate.set_value(B_STAR), rt=1.4, rate_func=smooth)
        self.go(Create(vline), FadeIn(v_lab), rt=.8)
        self.go(FadeOut(formula, shift=.1 * UP), FadeIn(card, shift=.1 * UP), rt=1.2)
        self.hold()


# ════════════════════════════════════════════════════════════════════════════
class Scene3_Damping(Beat):
    def construct(self):
        hdr = header("Learning by self-play")
        ax = Axes(x_range=[0, 1, .25], y_range=[0, 1, .25], x_length=5.6, y_length=5.6, tips=False,
                  axis_config={"color": FG_FAINT, "stroke_width": 1.5}).move_to(P(-3.9, -.25))
        frame = Rectangle(width=5.6, height=5.6, stroke_color=FG_FAINT, stroke_width=1).move_to(ax.c2p(.5, .5))
        x_lab = Tex(r"$b$: you bluff", font_size=26, color=ROLE["policy"]).next_to(ax.c2p(.5, 0), DOWN, buff=.3)
        y_lab = Tex(r"$s$: opponent stands", font_size=26, color=ROLE["policyDim"]).next_to(ax.c2p(0, 1), UP, buff=.12).align_to(frame, LEFT)
        ticks = VGroup(*[MathTex(t, font_size=22, color=FG_FAINT).next_to(ax.c2p(*xy), d, buff=.1)
                         for t, xy, d in (("0", (0, 0), DL), ("1", (1, 0), DOWN), ("1", (0, 1), LEFT))])
        star = Star(n=5, outer_radius=.16, inner_radius=.07, color=ROLE["value"], fill_opacity=1).move_to(ax.c2p(B_STAR, S_STAR))
        star_lab = Tex("equilibrium", font_size=22, color=ROLE["value"]).next_to(star, DR, buff=.05)

        def field_vec(bb, ss):
            db = bb * (1 - bb) * (ss * LOSE + (1 - ss) * TEMPO)
            q = belief(bb)
            ds = ss * (1 - ss) * (-(q * WIN + (1 - q) * LOSE) + TEMPO)
            v = np.array([db, ds])
            return v / (np.linalg.norm(v) + 1e-9)

        arrows = VGroup()
        for bb in (.1, .3, .5, .7, .9):
            for ss in (.1, .3, .5, .7, .9):
                v = field_vec(bb, ss) * .055
                arrows.add(Arrow(ax.c2p(bb - v[0], ss - v[1]), ax.c2p(bb + v[0], ss + v[1]), buff=0, color=ROLE["context"],
                                 stroke_width=2.2, max_tip_length_to_length_ratio=.32, max_stroke_width_to_length_ratio=6))
        txt_a = VGroup(Tex(r"Each update moves $b$ toward a better", font_size=28),
                       Tex(r"reply to $s$, and $s$ toward a better reply to $b$.", font_size=28)
                       ).arrange(DOWN, aligned_edge=LEFT, buff=.12).move_to(P(4.3, 2.55))
        self.seg("Ataraxos learns by self-play. Each policy moves toward the actions that score well against the other.", 6.936)
        self.go(FadeIn(hdr, shift=.1 * RIGHT), Create(ax), Create(frame), FadeIn(x_lab), FadeIn(y_lab), FadeIn(ticks), rt=1.4)
        self.go(FadeIn(star, scale=.4), FadeIn(star_lab), rt=.6)
        self.go(LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=.05), rt=2.0)
        self.go(FadeIn(txt_a, shift=.1 * UP), rt=.9)
        self.hold()

        def path_mob(points, color, width=3, opacity=1.0):
            return polyline([ax.c2p(x, y) for x, y in points], color, width, opacity)

        und_pts, und_ex = self_play(lambda t: (1.2, 0.0), 300)
        und = path_mob(und_pts[:170], ROLE["warn"], 2.6)
        head = Dot(radius=.08, color=ROLE["warn"]).move_to(und.get_start())
        head.add_updater(lambda m: m.move_to(und.get_end()))
        txt_b = Tex(r"No damping: the policies cycle.", font_size=28, color=ROLE["warn"]).next_to(txt_a, DOWN, buff=.4).align_to(txt_a, LEFT)
        self.seg("Without control, the two policies chase each other in circles. They never settle.", 5.424)
        self.add(head)
        self.go(FadeOut(arrows), Create(und), rate_func=linear, rt=4.0)
        self.go(FadeIn(txt_b), rt=.6)
        self.hold()

        head.clear_updaters()
        magnet = Dot(ax.c2p(.5, .5), radius=.11, color=ROLE["param"])
        magnet_lab = MathTex(r"\rho", font_size=34, color=ROLE["param"]).next_to(magnet, UR, buff=.04)
        knobs = VGroup(Tex(r"step size $\eta$: how far one update moves", font_size=28, color=ROLE["param"]),
                       Tex(r"pull $\alpha$: how hard the magnet $\rho$ pulls", font_size=28, color=ROLE["param"]),
                       Tex(r"magnet $\rho$: random play, $b=s=\tfrac12$", font_size=24, color=FG_SOFT)
                       ).arrange(DOWN, aligned_edge=LEFT, buff=.14).move_to(P(4.3, 2.45))
        self.seg("Ataraxos damps each update. A step size, eta, limits how far the policy moves. A pull, alpha, holds it near a random magnet.", 9.384)
        self.go(und.animate.set_stroke(opacity=.18), FadeOut(head), FadeOut(txt_a), FadeOut(txt_b), rt=.8)
        self.go(FadeIn(knobs[0], shift=.1 * UP), rt=.8)
        self.go(FadeIn(knobs[1], shift=.1 * UP), rt=.8)
        self.go(FadeIn(magnet, scale=.4), FadeIn(magnet_lab), FadeIn(knobs[2]), rt=.9)
        pulls = VGroup(*[Arrow(ax.c2p(*xy), ax.c2p(.5 + .55 * (xy[0] - .5), .5 + .55 * (xy[1] - .5)), buff=.05, color=ROLE["param"],
                               stroke_width=2.5, max_tip_length_to_length_ratio=.25)
                         for xy in ((.12, .12), (.88, .12), (.12, .88), (.88, .88))])
        self.go(LaggedStart(*[GrowArrow(a) for a in pulls], lag_ratio=.15), rt=1.4)
        self.go(FadeOut(pulls), rt=.6)
        self.hold()

        eq = MathTex(r"\pi_{t+1}", r"\propto", r"\Big[", r"\pi_t", r"\,\rho^{\alpha\eta}", r"\,e^{\eta q}", r"\Big]", r"^{\frac{1}{1+\alpha\eta}}",
                     font_size=46)
        for i, c in ((0, ROLE["policy"]), (3, ROLE["policy"]), (4, ROLE["param"]), (5, ROLE["value"]), (7, ROLE["param"])):
            eq[i].set_color(c)
        eq.move_to(P(4.3, .85))
        y0 = eq.get_bottom()[1] - .45
        labs = VGroup(Tex("old policy", font_size=22, color=ROLE["policy"]).move_to(P(eq[3].get_x() - .55, y0)),
                      Tex("magnet", font_size=22, color=ROLE["param"]).move_to(P(eq[4].get_x(), y0 - .42)),
                      Tex("action values", font_size=22, color=ROLE["value"]).move_to(P(eq[5].get_x() + .75, y0)))
        ticks_eq = VGroup(*[Line(eq[i].get_bottom() + DOWN * .06, lab.get_top() + UP * .04, color=FG_FAINT, stroke_width=1.2)
                            for i, lab in zip((3, 4, 5), labs)])
        self.seg("The new policy is a weighted mix of the old policy, the magnet, and the exponential of the action values.", 7.056)
        self.go(Write(eq), rt=1.8)
        self.go(LaggedStart(*[AnimationGroup(Create(t), FadeIn(l)) for t, l in zip(ticks_eq, labs)], lag_ratio=.35), rt=1.8)
        self.go(Indicate(eq[7], color=ROLE["param"]), rt=1.0)
        self.hold()

        weak_pts, weak_ex = self_play(lambda t: (1.2, .02), 300)
        strong_pts, strong_ex = self_play(lambda t: (1.2, .15), 300)
        weak = path_mob(weak_pts[:220], ROLE["warn"], 2.4, .9)
        strong = path_mob(strong_pts[:120], FG, 2.6)
        strong_end = Dot(ax.c2p(*strong_pts[-1]), radius=.08, color=FG)
        legend = VGroup(
            Tex(r"$\eta=1.2,\ \alpha=0.02$: weak pull, it keeps circling", font_size=24, color=ROLE["warn"]),
            Tex(r"$\eta=1.2,\ \alpha=0.15$: it settles, but off target", font_size=24, color=FG),
        ).arrange(DOWN, aligned_edge=LEFT, buff=.14).move_to(P(4.3, 2.75))
        self.seg("If the pull is too weak for the step, the path keeps circling. With a strong enough pull, it settles.", 6.096)
        self.go(FadeOut(knobs), FadeOut(und), FadeIn(legend[0]), rt=.6)
        self.go(Create(weak), rate_func=linear, rt=2.4)
        self.go(FadeIn(legend[1]), Create(strong), rate_func=linear, rt=1.8)
        self.go(FadeIn(strong_end, scale=.5), rt=.4)
        self.hold()

        co_pts, co_ex = self_play(coordinated, 300)
        co = path_mob(co_pts, ROLE["value"], 3.2)
        co_end = Dot(ax.c2p(*co_pts[-1]), radius=.09, color=ROLE["value"])
        leg3 = Tex(r"$\alpha$ and $\eta$ fall together: it reaches the equilibrium", font_size=24, color=ROLE["value"])
        leg3.next_to(legend, DOWN, buff=.14, aligned_edge=LEFT)
        ex_ax = Axes(x_range=[0, 300, 100], y_range=[0, .35, .1], x_length=4.6, y_length=1.9, tips=False,
                     axis_config={"color": FG_FAINT, "stroke_width": 1.2, "include_ticks": False}).move_to(P(4.1, -2.15))
        ex_lab = Tex("exploitability", font_size=22, color=ROLE["warn"]).next_to(ex_ax, UP, buff=.08).align_to(ex_ax, LEFT)
        t_lab = Tex("updates", font_size=20, color=FG_FAINT).next_to(ex_ax.x_axis.get_right(), DOWN, buff=.08).shift(LEFT * .35)

        def curve(ex, color, width):
            return polyline([ex_ax.c2p(t, min(.35, e)) for t, e in enumerate(ex)], color, width)

        curves = VGroup(curve(und_ex, ROLE["warn"], 1.6).set_stroke(opacity=.55), curve(strong_ex, FG, 1.8), curve(co_ex, ROLE["value"], 2.6))
        final = MathTex(r"\to 0.01", font_size=26, color=ROLE["value"]).next_to(ex_ax.c2p(300, co_ex[-1]), RIGHT, buff=.1).shift(UP * .1)
        self.seg("Ataraxos reduces the pull and the step together. Then the path walks to the equilibrium, and exploitability goes near zero.", 8.568)
        self.go(weak.animate.set_stroke(opacity=.15), strong.animate.set_stroke(opacity=.35), FadeOut(eq), FadeOut(labs), FadeOut(ticks_eq),
                FadeIn(leg3), rt=.8)
        self.go(Create(co), rate_func=linear, rt=3.0)
        self.go(FadeIn(co_end, scale=.4), Indicate(star, color=ROLE["value"], scale_factor=1.6), rt=1.0)
        self.go(Create(ex_ax), FadeIn(ex_lab), FadeIn(t_lab), rt=.7)
        self.go(Create(curves, lag_ratio=0), rate_func=linear, rt=1.6)
        self.go(FadeIn(final), rt=.5)
        self.hold()


# ════════════════════════════════════════════════════════════════════════════
MOVES = ["attack with Major", "probe with Scout", "retreat Captain", r"Marshal hits ``?''"]
NET = np.array([.55, .30, .149, .001])        # move-network policy
Q_HAT = np.array([.10, .08, .02, .16])        # averaged rollout values: the last one is noise
ALPHA_S, BETA_S = .002, .02


def search_policy(beta):
    logits = (Q_HAT + ALPHA_S * np.log(.25) + beta * np.log(NET)) / (ALPHA_S + beta)
    w = np.exp(logits - logits.max())
    return w / w.sum()


class Scene4_Search(Beat):
    def construct(self):
        hdr = header("Playing a match: beliefs, then search")
        side = .4
        obs_labels = ["?", "?", "8", "?", "?", "?", "B", "?", "?", "?", "?", "?"]
        obs = VGroup(*[tile(l, ROLE["public"] if l != "?" else ROLE["hidden"], side=side, font=20) for l in obs_labels])
        obs.arrange_in_grid(rows=3, cols=4, buff=.07).move_to(P(-6.3, 2.0))
        obs_lab = Tex(r"what you saw\\(public)", font_size=22, color=ROLE["public"]).next_to(obs, DOWN, buff=.15)
        net = node(r"belief\\network", ROLE["belief"], w=1.8, h=1.0, font=24).move_to(P(-3.55, 2.0))
        rng = np.random.default_rng(5)
        samples = VGroup()
        for _ in range(3):
            labs = [l if l != "?" else str(rng.choice(["2", "3", "4", "5", "6", "B", "7", "9", "S", "F"])) for l in obs_labels]
            g = VGroup(*[tile(l, ROLE["hidden"] if o == "?" else ROLE["public"], side=.26, font=14, fill=.18)
                         for l, o in zip(labs, obs_labels)]).arrange_in_grid(rows=3, cols=4, buff=.04)
            samples.add(g)
        samples.arrange(DOWN, buff=.18).move_to(P(-.95, 1.95))
        s_lab = Tex("sampled set-ups", font_size=22, color=ROLE["hidden"]).next_to(samples, UP, buff=.12)
        a1 = Arrow(obs.get_right(), net.get_left(), buff=.12, color=FG_FAINT, stroke_width=2.5, max_tip_length_to_length_ratio=.18)
        a2 = VGroup(*[Arrow(net.get_right(), g.get_left(), buff=.12, color=ROLE["belief"], stroke_width=2, max_tip_length_to_length_ratio=.12)
                      for g in samples])
        self.seg("In a match, a belief network samples possible arrangements of the hidden pieces, given everything seen so far.", 7.32)
        self.go(FadeIn(hdr, shift=.1 * RIGHT), FadeIn(obs, lag_ratio=.05), FadeIn(obs_lab), rt=1.2)
        self.go(GrowArrow(a1), FadeIn(net), rt=1.0)
        self.go(LaggedStart(*[AnimationGroup(GrowArrow(a), FadeIn(g, shift=.1 * RIGHT)) for a, g in zip(a2, samples)], lag_ratio=.4),
                FadeIn(s_lab), rt=2.2)
        self.hold()

        # rollouts from every sample, averaged into one value per move
        q_rows = VGroup()
        for m, q in zip(MOVES, Q_HAT):
            q_rows.add(VGroup(Tex(m, font_size=22, color=FG_SOFT),
                              MathTex(r"\hat q=" + f"{q:+.2f}", font_size=26, color=ROLE["value"])).arrange(RIGHT, buff=.25))
        for r in q_rows:
            r[1].align_to(q_rows[0][1], LEFT)
        q_rows.arrange(DOWN, buff=.17, aligned_edge=RIGHT).move_to(P(5.3, 1.95))
        for r in q_rows:
            r[1].next_to(r[0], RIGHT, buff=.25)
        q_rows.move_to(P(5.3, 1.95))
        fans = VGroup()
        frng = np.random.default_rng(9)
        for g in samples:
            start = g.get_right() + RIGHT * .1
            for k in range(7):
                end = P(2.75, 1.95 + (k - 3) * .26 + frng.normal(0, .05))
                mid = (start + end) / 2 + UP * frng.normal(0, .18)
                fans.add(VMobject(stroke_color=ROLE["value"], stroke_width=1.1, stroke_opacity=.55)
                         .set_points_smoothly([start, mid, end]))
        roll_lab = Tex(r"1,000 rollouts, 40 moves deep", font_size=22, color=ROLE["value"]).move_to(P(1.2, .62))
        brace = Brace(q_rows, LEFT, color=ROLE["value"], buff=.12)
        self.seg("For each sample, the search plays a thousand short games with the policy, and averages the result of each move.", 7.128)
        self.go(LaggedStart(*[Create(f) for f in fans], lag_ratio=.03), FadeIn(roll_lab), rt=2.6)
        self.go(GrowFromCenter(brace), LaggedStart(*[FadeIn(r, shift=.1 * LEFT) for r in q_rows], lag_ratio=.2), rt=1.6)
        self.hold()

        # one damped update with a leash to the network
        formula = MathTex(r"\pi_{\mathrm{search}}", r"\propto", r"\Big[", r"e^{\hat q}", r"\,\rho^{\alpha}", r"\,\pi_\theta^{\beta}", r"\Big]",
                          r"^{\frac{1}{\alpha+\beta}}", font_size=40)
        for i, c in ((0, ROLE["value"]), (3, ROLE["value"]), (4, ROLE["param"]), (5, ROLE["policy"]), (7, ROLE["param"])):
            formula[i].set_color(c)
        formula.move_to(P(-3.6, -.55))
        leash = Tex(r"$\beta$: a leash to the network $\pi_\theta$", font_size=24, color=ROLE["param"]).next_to(formula, DOWN, buff=.22)
        X0, W = .9, 4.4
        beta = ValueTracker(BETA_S)
        bars = VGroup()
        for i, m in enumerate(MOVES):
            y = -.6 - i * .66
            lab = Tex(m, font_size=22, color=FG_SOFT).next_to(P(X0 - .15, y), LEFT, buff=0)
            track = Rectangle(width=W, height=.44, stroke_width=0).set_fill(SUNK, 1).move_to(P(X0 + W / 2, y))
            outline = DashedVMobject(Rectangle(width=max(.02, W * NET[i]), height=.44, stroke_color=FG_SOFT, stroke_width=1.4)
                                     .move_to(P(X0, y), aligned_edge=LEFT), num_dashes=18)
            bars.add(VGroup(lab, track, outline))

        def fill_bars():
            post = search_policy(max(beta.get_value(), 0.0))
            g = VGroup()
            for i in range(4):
                y = -.6 - i * .66
                col = ROLE["warn"] if (i == 3 and post[3] > .5) else ROLE["policy"]
                g.add(Rectangle(width=max(.02, W * post[i]), height=.24, stroke_width=0).set_fill(col, .95)
                      .move_to(P(X0, y), aligned_edge=LEFT))
                g.add(Tex(f"{100 * post[i]:.0f}\\%", font_size=22, color=FG).move_to(P(X0 + W + .42, y)))
            return g

        fills = always_redraw(fill_bars)
        key = Tex(r"outline: network $\pi_\theta$ \quad fill: after search", font_size=20, color=FG_FAINT).move_to(P(X0 + W / 2, -3.25))
        self.seg("Then it makes one damped update of the network policy. A leash, beta, keeps the result near the network.", 6.96)
        self.go(Write(formula), rt=1.5)
        self.go(FadeIn(bars, lag_ratio=.1), FadeIn(key), rt=1.1)
        self.add(fills)
        self.go(FadeIn(fills), rt=.6)
        self.go(FadeIn(leash, shift=.1 * UP), Indicate(formula[5], color=ROLE["policy"]), rt=1.1)
        self.hold()

        b_read = always_redraw(lambda: MathTex(r"\beta=" + f"{beta.get_value():.3f}", font_size=30, color=ROLE["param"])
                               .next_to(leash, DOWN, buff=.22))
        elo = VGroup()
        for i, (name, val, col) in enumerate((("match setting", 2218, ROLE["value"]), ("network alone", 2095, ROLE["policy"]),
                                              (r"no leash, $\beta=0$", 1733, ROLE["warn"]))):
            y = 3.1 - i * .5
            elo.add(VGroup(Tex(name, font_size=22, color=FG_SOFT).next_to(P(-2.3, y), LEFT, buff=0),
                           Rectangle(width=(val - 1600) / 700 * 3.2, height=.3, stroke_width=0).set_fill(col, .9).move_to(P(-2.15, y), aligned_edge=LEFT),
                           Tex(f"Elo {val}", font_size=22, color=FG).move_to(P(-2.15 + (val - 1600) / 700 * 3.2 + .6, y))))
        self.seg("Without the leash, the search trusts noisy estimates, and the rating falls by almost five hundred Elo.", 6.72)
        self.go(FadeOut(VGroup(obs, obs_lab, net, a1, a2, samples, s_lab, fans, roll_lab)), FadeIn(b_read), rt=.7)
        self.go(beta.animate.set_value(0.0), rt=1.8, rate_func=smooth)
        self.go(LaggedStart(*[FadeIn(r, shift=.1 * RIGHT) for r in elo], lag_ratio=.3), rt=1.6)
        self.go(Indicate(elo[2], color=ROLE["warn"], scale_factor=1.05), rt=.9)
        self.hold()


# ════════════════════════════════════════════════════════════════════════════
class Scene5_Results(Beat):
    def construct(self):
        hdr = header("Results")
        games = VGroup()
        for i in range(20):
            col = ROLE["value"] if i < 15 else (ROLE["context"] if i < 19 else ROLE["warn"])
            games.add(RoundedRectangle(corner_radius=.06, width=.52, height=.52, stroke_width=0).set_fill(col, .9))
        games.arrange(RIGHT, buff=.08).move_to(P(-.6, 2.15))
        tags = VGroup(Tex("15 wins", font_size=24, color=ROLE["value"]).next_to(games[7], DOWN, buff=.18),
                      Tex("4 draws", font_size=24, color=ROLE["context"]).next_to(VGroup(games[15], games[18]), DOWN, buff=.18),
                      Tex("1 loss", font_size=24, color=ROLE["warn"]).next_to(games[19], DOWN, buff=.18).shift(RIGHT * .25))
        who = Tex(r"Ataraxos vs Pim Niemeijer (world no.\ 1), classic Stratego, July 2025", font_size=26, color=FG).next_to(games, UP, buff=.25)
        rate = Tex(r"$85\%$", font_size=40, color=ROLE["value"]).next_to(games, RIGHT, buff=.35)
        rate_sub = Tex(r"draw $=\tfrac12$", font_size=20, color=FG_FAINT).next_to(rate, DOWN, buff=.08)
        self.seg("In July 2025, Ataraxos played Pim Niemeijer, the world number one. It won fifteen games, drew four, and lost one.", 8.784)
        self.go(FadeIn(hdr, shift=.1 * RIGHT), FadeIn(who), rt=1.0)
        self.go(LaggedStart(*[FadeIn(g, scale=.5) for g in games], lag_ratio=.12), rt=3.2)
        self.go(FadeIn(tags, lag_ratio=.3), rt=1.2)
        self.go(FadeIn(rate), FadeIn(rate_sub), rt=.7)
        self.hold()

        lo, hi, X0, W = 3, 7, -3.0, 9.0

        def xpos(v):
            return X0 + (np.log10(v) - lo) / (hi - lo) * W

        cost_ax = NumberLine(x_range=[lo, hi, 1], length=W, color=FG_FAINT, include_ticks=True, tick_size=.06).move_to(P(X0 + W / 2, -2.05))
        cost_ticks = VGroup(*[MathTex(t, font_size=22, color=FG_FAINT).next_to(cost_ax.n2p(k), DOWN, buff=.12)
                              for k, t in zip(range(3, 8), [r"\$10^3", r"\$10^4", r"\$10^5", r"\$10^6", r"\$10^7"])])
        dn = Rectangle(width=xpos(3.75e6) - X0, height=.42, stroke_width=0).set_fill(ROLE["context"], .85).move_to(P(X0, -.55), aligned_edge=LEFT)
        at = Rectangle(width=xpos(8e3) - X0, height=.42, stroke_width=0).set_fill(ROLE["policy"], .95).move_to(P(X0, -1.25), aligned_edge=LEFT)
        dn_lab = Tex(r"DeepNash (2022)", font_size=24, color=FG_SOFT).next_to(P(X0 - .2, -.55), LEFT, buff=0)
        at_lab = Tex(r"Ataraxos (2025)", font_size=24, color=FG_SOFT).next_to(P(X0 - .2, -1.25), LEFT, buff=0)
        dn_num = Tex(r"$\approx$ \$3--4.5 million (estimate)", font_size=22, color=BG).move_to(dn.get_right() + LEFT * 1.9)
        at_num = Tex(r"$<$ \$8{,}000", font_size=22, color=FG).next_to(at, RIGHT, buff=.15)
        ratio = Tex(r"about $\tfrac{1}{500}$ of the cost", font_size=30, color=ROLE["policy"]).move_to(P(4.6, -1.25))
        cost_title = Tex("training compute cost (log scale)", font_size=22, color=FG_FAINT).move_to(P(X0 + W / 2, .1))
        self.seg("Training cost less than eight thousand dollars. That is about one five-hundredth of the cost of DeepNash.", 6.744)
        self.go(FadeIn(cost_title), Create(cost_ax), FadeIn(cost_ticks), FadeIn(dn_lab), FadeIn(at_lab), rt=.9)
        self.go(GrowFromEdge(dn, LEFT), GrowFromEdge(at, LEFT), rt=1.4)
        self.go(FadeIn(dn_num), FadeIn(at_num), rt=.6)
        self.go(FadeIn(ratio, shift=.1 * LEFT), rt=.8)
        self.hold()

        def card(title, lines, color):
            body = VGroup(Tex(r"\textbf{" + title + "}", font_size=30, color=color),
                          *[Tex(l, font_size=23, color=FG) for l in lines]).arrange(DOWN, buff=.16)
            box = RoundedRectangle(corner_radius=.18, width=4.5, height=2.7, stroke_color=color, stroke_width=2).set_fill(color, .07)
            return VGroup(box, body.move_to(box).align_to(box, UP).shift(DOWN * .3))

        cards = VGroup(
            card("Barrage Stratego", [r"8 pieces a side,", r"bluffing is central.", r"Beat the world no.\ 1, 3 and 4."], ROLE["hidden"]),
            card("Hanabi", [r"cooperative: you cannot", r"see your own cards.", r"New best score, 2 to 5 players."], ROLE["public"]),
            card("Dou dizhu", [r"one landlord against", r"two peasants.", r"Beat PerfectDou and DouZero."], ROLE["belief"]),
        ).arrange(RIGHT, buff=.4).move_to(P(0, -.2))
        same = Tex("one method, other games with hidden information", font_size=28, color=FG_SOFT).next_to(cards, UP, buff=.4)
        self.seg("The same method also beats top humans at Barrage Stratego, sets a new best score in Hanabi, and beats the best dou dizhu programs.", 8.664)
        self.go(FadeOut(VGroup(games, tags, who, rate, rate_sub, cost_ax, cost_ticks, dn, at, dn_lab, at_lab, dn_num, at_num, ratio, cost_title)),
                rt=.7)
        self.go(FadeIn(same), rt=.6)
        self.go(LaggedStart(*[FadeIn(c, shift=.15 * UP) for c in cards], lag_ratio=.55), rt=3.2)
        self.hold()

        title = Tex(r"\textbf{Decisions in the dark}", font_size=46, color=FG).move_to(P(0, 2.55))
        l1 = VGroup(Tex(r"1.\ Control the learning dynamics", font_size=30, color=ROLE["param"]),
                    MathTex(r"\pi_{t+1}\propto\Big[\pi_t\,\rho^{\alpha\eta}\,e^{\eta q}\Big]^{\frac{1}{1+\alpha\eta}}", font_size=36, color=FG)
                    ).arrange(DOWN, buff=.25).move_to(P(-3.9, .25))
        l2 = VGroup(Tex(r"2.\ Treat search as one more careful update", font_size=30, color=ROLE["value"]),
                    MathTex(r"\pi_{\mathrm{search}}\propto\Big[e^{\hat q}\,\rho^{\alpha}\,\pi_\theta^{\beta}\Big]^{\frac{1}{\alpha+\beta}}", font_size=36, color=FG)
                    ).arrange(DOWN, buff=.25).move_to(P(3.9, .25))
        foot = Tex(r"Read on: the interactive chapter has the labs, the sources and the proofs.", font_size=22, color=FG_FAINT).move_to(P(0, -2.1))
        self.seg("The lesson: when information is hidden, control the learning dynamics, and treat search as one more careful update.", 7.488)
        self.go(FadeOut(cards), FadeOut(same), FadeOut(hdr), rt=.7)
        self.go(FadeIn(title, shift=.1 * DOWN), rt=.8)
        self.go(FadeIn(l1, shift=.1 * UP), rt=1.2)
        self.go(FadeIn(l2, shift=.1 * UP), rt=1.2)
        self.go(FadeIn(foot), rt=.6)
        self.hold()
