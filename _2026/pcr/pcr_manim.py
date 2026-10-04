"""PCR, explained: a narrated Manim companion to _2026/pcr/pcr_explorable.html.

The scenes render the same semantic objects as the HTML page (template, primers,
polymerase, long and exact products, temperature, efficiency, threshold, Ct)
with the same colours and the same geometry as Figure 3.1, so the video and the
interactive figure are two views of one model.
"""
import os

import numpy as np
from manim import *

# ── render config (draft by default; PCR_QUALITY=final for 720p30) ──────────
if os.environ.get("PCR_QUALITY") == "final":
    config.pixel_width, config.pixel_height, config.frame_rate = 1280, 720, 30
else:
    config.pixel_width, config.pixel_height, config.frame_rate = 854, 480, 15
config.frame_width, config.frame_height = 16, 9

# ── semantic model: one colour per role, mirrored from the page's CSS tokens ──
ROLE = {
    "template": "#74AAE4",     # input: template DNA, starting copies N0
    "product": "#F39B4C",      # output: exact-length amplicon, Nn
    "productDim": "#B47D4F",   # long products: one end undefined
    "primer": "#E888BB",       # specification: the primers
    "enzyme": "#5FCBA2",       # operation: the polymerase
    "param": "#AB9EF3",        # knobs: T, n, E
    "readout": "#E7D16B",      # signals: threshold, Ct
    "warn": "#F07173",
    "context": "#8F96A3",      # raw material: dNTPs, base pairs
}
FG, FG_SOFT, FG_FAINT, BG = "#DADDE3", "#AAB0BB", "#6F7682", "#13151A"
config.background_color = BG

# Geometry shared with Figure 3.1: the template spans [X0, X1]; the forward
# primer sits on [FS, FE] and the reverse primer on [RS, RE]; target = [FS, RE].
X0, X1 = -6.6, 6.6
FS, FE, RS, RE = -3.0, -2.2, 2.2, 3.0
TA = 55  # annealing temperature used in the video


def P(x, y):
    return np.array([x, y, 0.0])


def strand(xa, xb, y, role, width=8, opacity=1.0):
    if abs(xb - xa) < 0.01:
        return VMobject()
    return Line(P(xa, y), P(xb, y), color=ROLE[role], stroke_width=width, stroke_opacity=opacity)


def tip(x, y, direction, role, size=0.16):
    """Arrowhead marking a strand's 3' end; direction +1 points right."""
    d = direction
    return Polygon(P(x + d * size * 1.3, y), P(x - d * size * .2, y + size), P(x - d * size * .2, y - size),
                   color=ROLE[role], fill_color=ROLE[role], fill_opacity=1, stroke_width=0)


def rungs(xa, xb, y1, y2, step=0.22, opacity=.55):
    xs = np.arange(min(xa, xb) + step / 2, max(xa, xb), step)
    return VGroup(*[Line(P(x, y1), P(x, y2), color=ROLE["context"], stroke_width=2.2, stroke_opacity=opacity) for x in xs])


def template_strand(y, left_label, right_label):
    """A template strand that continues beyond the frame: solid core, dashed tails, end labels."""
    core = strand(X0, X1, y, "template")
    tails = VGroup(
        DashedLine(P(X0 - .75, y), P(X0, y), color=ROLE["template"], stroke_width=5, dash_length=.08).set_opacity(.45),
        DashedLine(P(X1, y), P(X1 + .75, y), color=ROLE["template"], stroke_width=5, dash_length=.08).set_opacity(.45),
    )
    labels = VGroup(MathTex(left_label, font_size=26, color=ROLE["template"]).move_to(P(X0 - 1.05, y)),
                    MathTex(right_label, font_size=26, color=ROLE["template"]).move_to(P(X1 + 1.05, y)))
    return VGroup(core, tails, labels)


def primer(xs, xe, y, direction):
    body = strand(xs, xe, y, "primer", width=13)
    head = tip(xe if direction > 0 else xs, y, direction, "primer", size=.15)
    return VGroup(body, head)


def polymerase():
    blob = Ellipse(width=1.05, height=.52, color=ROLE["enzyme"], stroke_width=2.5).set_fill(ROLE["enzyme"], .25)
    return VGroup(blob, Tex("Taq", font_size=24, color=ROLE["enzyme"]))


def temperature_hud(temp):
    lab = MathTex("T", "=", font_size=38, color=ROLE["param"])
    num = DecimalNumber(temp.get_value(), num_decimal_places=0, font_size=38, color=ROLE["param"])
    unit = MathTex(r"^{\circ}\mathrm{C}", font_size=38, color=ROLE["param"])
    hud = VGroup(lab, num, unit)

    def update(m):
        num.set_value(temp.get_value())
        m.arrange(RIGHT, buff=.12).to_corner(UR, buff=.45)
        unit.align_to(num, UP)
    hud.add_updater(update)
    update(hud)
    return hud


def doubling_levels(k_max):
    """Strand roles of every duplex per cycle: each strand keeps its role and gains a new (product) partner."""
    levels = [[("template", "template")]]
    for _ in range(k_max):
        levels.append([d for pair in levels[-1] for d in ((pair[0], "product"), (pair[1], "product"))])
    return levels


def header(text):
    return Tex(text, font_size=34, color=FG_SOFT).to_corner(UL, buff=.45)


class Scene1_Problem(Scene):
    def construct(self):
        title = Tex("The Polymerase Chain Reaction", font_size=58, color=FG).to_edge(UP, buff=.6)

        def duplex(roles=("template", "template"), width=2.2, scale=1.0):
            g = VGroup(strand(-width / 2, width / 2, .14, roles[0], 7), strand(-width / 2, width / 2, -.14, roles[1], 7),
                       rungs(-width / 2, width / 2, .1, -.1, step=.16))
            return g.scale(scale)
        levels = doubling_levels(3)
        one = duplex().move_to(P(0, 1.0))
        one_lab = Tex("one copy of a gene", font_size=30, color=ROLE["template"]).next_to(one, DOWN, buff=.3)

        line = NumberLine(x_range=[0, 10.5, 1], length=12, color=FG_FAINT, include_numbers=False).move_to(P(0, -2.3))
        ticks = VGroup(*[MathTex(f"10^{{{k}}}", font_size=22, color=FG_FAINT).next_to(line.n2p(k), DOWN, buff=.2) for k in range(0, 11, 2)])
        start_dot = Dot(line.n2p(0), radius=.11, color=ROLE["template"])
        start_lab = Tex("1 copy", font_size=28, color=ROLE["template"]).next_to(start_dot, UP, buff=.25)
        goal = Triangle(color=ROLE["readout"], fill_opacity=1).scale(.13).rotate(PI).next_to(line.n2p(10), UP, buff=.05)
        goal_lab = Tex(r"$\sim 10^{10}$: enough to see", font_size=28, color=ROLE["readout"]).next_to(goal, UP, buff=.15)

        dur = 6.864
        self.add_subcaption("A single copy of a gene is invisible. To see it, measure it, or read it, you need billions of copies.", duration=dur)
        self.play(Write(title), run_time=1.4)
        self.play(Create(one), FadeIn(one_lab, shift=UP * .2), run_time=1.0)
        self.play(Create(line), FadeIn(ticks), GrowFromCenter(start_dot), FadeIn(start_lab), run_time=1.2)
        self.play(FadeIn(goal, shift=DOWN * .2), Write(goal_lab), run_time=1.0)
        self.wait(max(0, dur - 4.6))

        dur = 7.344
        self.add_subcaption("The polymerase chain reaction makes them, by copying one chosen stretch of DNA, and then copying the copies.", duration=dur)
        count = ValueTracker(0)  # log2 of the number of copies
        dot = Dot(line.n2p(0), radius=.11, color=ROLE["product"])
        dot.add_updater(lambda m: m.move_to(line.n2p(count.get_value() * np.log10(2))))
        self.add(dot)
        copies = one
        used = 0
        for k in (1, 2, 3):
            new = VGroup(*[duplex(roles, scale=.62) for roles in levels[k]]).arrange_in_grid(rows=1 if k < 3 else 2, buff=(.35, .3)).move_to(P(0, 1.0))
            anims = [ReplacementTransform(copies, new), count.animate.set_value(k)]
            if k == 1:
                anims.append(FadeOut(one_lab))
            self.play(*anims, run_time=.8)
            copies = new
            used += .8
        eq = MathTex(r"1 \to 2 \to 4 \to 8 \to \cdots \to 2^{n}", font_size=40, color=ROLE["product"]).next_to(copies, DOWN, buff=.45)
        self.play(Write(eq), run_time=1.0)
        doublings = Tex(r"$\approx 33$ doublings", font_size=28, color=ROLE["product"]).next_to(line.n2p(5), UP, buff=.35)
        self.play(count.animate.set_value(33.2), FadeIn(doublings), run_time=1.8, rate_func=smooth)
        used += 2.8
        self.wait(max(0, dur - used))


class Scene2_OneCycle(Scene):
    def construct(self):
        yT0, yB0, yT1, yB1 = .45, -.05, 1.6, -1.3
        yNR, yNF = yT1 - .5, yB1 + .5
        temp, clock = ValueTracker(25), ValueTracker(0)
        clock.add_updater(lambda m, dt: m.increment_value(dt))
        total = 5.952 + 3.984 + 6.936 + 6.768 + 7.848
        tx = lambda c: X0 + (X1 - X0) * min(c, total) / total
        Ty = lambda T: -3.95 + (T - 20) / 80 * 1.2

        hud = temperature_hud(temp)
        head = header("One PCR cycle")
        refs = VGroup()
        for T, lab, role in ((95, "95", "param"), (72, "72", "enzyme"), (TA, str(TA), "primer")):
            refs.add(DashedLine(P(X0, Ty(T)), P(X1, Ty(T)), color=FG_FAINT, stroke_width=1.5, dash_length=.06).set_opacity(.6))
            refs.add(MathTex(lab + r"^{\circ}", font_size=22, color=ROLE[role]).move_to(P(X1 + .5, Ty(T))))
        trace = TracedPath(lambda: P(tx(clock.get_value()), Ty(temp.get_value())), stroke_color=FG_SOFT, stroke_width=3)
        tdot = always_redraw(lambda: Dot(P(tx(clock.get_value()), Ty(temp.get_value())), radius=.07, color=ROLE["param"]))
        strip_lab = MathTex("T", font_size=28, color=ROLE["param"]).move_to(P(X0 - .55, Ty(60)))
        self.add(clock, hud, head, refs, strip_lab, trace, tdot)

        top = template_strand(yT0, "5'", "3'")
        bot = template_strand(yB0, "3'", "5'")
        base_pairs = rungs(X0, X1, yT0 - .05, yB0 + .05)
        guides = VGroup(*[DashedLine(P(x, -2.05), P(x, 2.3), color=ROLE["primer"], stroke_width=1.6, dash_length=.07).set_opacity(.5) for x in (FS, RE)])
        guide_labels = VGroup(Tex("forward primer site", font_size=24, color=ROLE["primer"]).next_to(P(FS, -2.05), DOWN, buff=.08).shift(LEFT * .9),
                              Tex("reverse primer site", font_size=24, color=ROLE["primer"]).next_to(P(RE, -2.05), DOWN, buff=.08).shift(RIGHT * .9))
        target = BraceBetweenPoints(P(FS, yT0 + .12), P(RE, yT0 + .12), direction=UP, color=ROLE["product"])
        target_lab = Tex("target", font_size=30, color=ROLE["product"]).next_to(target, UP, buff=.1)

        dur = 5.952
        self.add_subcaption("Start with one double-stranded template. Only the stretch between two primer sites matters.", duration=dur)
        self.play(Create(top), Create(bot), run_time=1.5)
        self.play(Create(base_pairs, lag_ratio=.02), run_time=1.0)
        self.play(Create(guides), FadeIn(guide_labels), GrowFromCenter(target), FadeIn(target_lab), run_time=1.2)
        self.wait(max(0, dur - 3.7))

        step = Tex("denature", font_size=32, color=ROLE["param"]).next_to(hud, DOWN, buff=.2).align_to(hud, RIGHT)
        dur = 3.984
        self.add_subcaption("Heat it to ninety-five degrees, and the two strands come apart.", duration=dur)
        self.play(temp.animate.set_value(95), FadeIn(step), FadeOut(target), FadeOut(target_lab), run_time=1.0)
        self.play(top.animate.shift(UP * (yT1 - yT0)), bot.animate.shift(DOWN * (yB0 - yB1)), FadeOut(base_pairs), run_time=1.8)
        self.wait(max(0, dur - 2.8))

        pF = primer(FS, FE, yNF, +1)
        pR = primer(RS, RE, yNR, -1)
        pF_rungs = rungs(FS, FE, yNF - .07, yB1 + .07)
        pR_rungs = rungs(RS, RE, yT1 - .07, yNR + .07)
        step2 = Tex("anneal", font_size=32, color=ROLE["primer"]).move_to(step, aligned_edge=RIGHT)
        dur = 6.936
        self.add_subcaption("Cool it down, and two short primers bind their matching sites, with their three-prime ends pointing toward each other.", duration=dur)
        self.play(temp.animate.set_value(TA), ReplacementTransform(step, step2), run_time=1.0)
        self.play(FadeIn(pF, shift=RIGHT * 2.2 + DOWN * .8), FadeIn(pR, shift=LEFT * 2.2 + UP * .8), run_time=1.8)
        self.play(Create(pF_rungs), Create(pR_rungs), run_time=.5)
        self.play(Indicate(pF[1], color=FG, scale_factor=1.6), Indicate(pR[1], color=FG, scale_factor=1.6), run_time=1.0)
        self.wait(max(0, dur - 4.3))

        xF, xR = ValueTracker(FE), ValueTracker(RS)
        newF = always_redraw(lambda: VGroup(strand(FE, xF.get_value(), yNF, "productDim"),
                                            tip(xF.get_value(), yNF, +1, "productDim") if xF.get_value() < X1 - .05 else VMobject(),
                                            rungs(FE, xF.get_value(), yNF - .07, yB1 + .07)))
        newR = always_redraw(lambda: VGroup(strand(xR.get_value(), RS, yNR, "productDim"),
                                            tip(xR.get_value(), yNR, -1, "productDim") if xR.get_value() > X0 + .05 else VMobject(),
                                            rungs(xR.get_value(), RS, yT1 - .07, yNR + .07)))
        polF, polR = polymerase(), polymerase()
        polF.add_updater(lambda m: m.move_to(P(xF.get_value() + .15, (yNF + yB1) / 2)))
        polR.add_updater(lambda m: m.move_to(P(xR.get_value() - .15, (yNR + yT1) / 2)))
        step3 = Tex("extend", font_size=32, color=ROLE["enzyme"]).move_to(step2, aligned_edge=RIGHT)
        dur = 6.768
        self.add_subcaption("At seventy-two degrees, the polymerase extends each primer, reading the template one base at a time.", duration=dur)
        self.add(newF, newR)
        self.play(temp.animate.set_value(72), ReplacementTransform(step2, step3), FadeIn(polF), FadeIn(polR), run_time=.8)
        self.play(xF.animate.set_value(X1), xR.animate.set_value(X0), run_time=5.4, rate_func=linear)
        self.wait(max(0, dur - 6.2))

        over_F = Line(P(RE, yNF), P(X1, yNF))
        over_R = Line(P(X0, yNR), P(FS, yNR))
        brace = BraceBetweenPoints(P(RE, yNF + .22), P(X1, yNF + .22), direction=UP, color=ROLE["productDim"])
        brace_lab = Tex("runs past the far primer", font_size=26, color=ROLE["productDim"]).next_to(brace, UP, buff=.08)
        long_lab = Tex("long product", font_size=28, color=ROLE["productDim"]).move_to(P(-4.8, yNR - .42))
        count = Tex(r"1 duplex $\rightarrow$ 2 duplexes", font_size=36, color=FG).move_to(P(0, 3.55))
        dur = 7.848
        self.add_subcaption("One duplex has become two. But these first copies run past the far primer, so only one of their ends is defined.", duration=dur)
        polF.clear_updaters(); polR.clear_updaters()
        self.play(FadeOut(polF, shift=DOWN * .4), FadeOut(polR, shift=UP * .4), Write(count), run_time=1.2)
        self.play(ShowPassingFlash(over_F.copy().set_stroke(FG, 12), time_width=.6),
                  ShowPassingFlash(over_R.copy().set_stroke(FG, 12), time_width=.6), run_time=1.2)
        self.play(GrowFromCenter(brace), FadeIn(brace_lab), FadeIn(long_lab), run_time=1.0)
        self.wait(max(0, dur - 3.4))


class Scene3_ExactCopy(Scene):
    def construct(self):
        y_long, y_new = -.7, -.2
        temp = ValueTracker(72)
        hud = temperature_hud(temp)
        head = header("Cycle 2")
        long_body = strand(FE, X1, y_long, "productDim")
        long_tail = DashedLine(P(X1, y_long), P(X1 + .7, y_long), color=ROLE["productDim"], stroke_width=5, dash_length=.08).set_opacity(.45)
        long_primer = strand(FS, FE, y_long, "primer", width=13)
        long_strand = VGroup(long_primer, long_body, long_tail)
        long_lab = Tex("a long product from cycle 1", font_size=28, color=ROLE["productDim"]).move_to(P(4.4, y_long - .5))
        guides = VGroup(*[DashedLine(P(x, -2.1), P(x, 2.2), color=ROLE["primer"], stroke_width=1.6, dash_length=.07).set_opacity(.45) for x in (FS, RE)])

        pR = primer(RS, RE, y_new, -1)
        pR_rungs = rungs(RS, RE, y_new - .07, y_long + .07)
        xS = ValueTracker(RS)
        newS = always_redraw(lambda: VGroup(strand(xS.get_value(), RS, y_new, "product"),
                                            tip(xS.get_value(), y_new, -1, "product") if xS.get_value() > FS + .05 else VMobject(),
                                            rungs(xS.get_value(), RS, y_new - .07, y_long + .07)))
        pol = polymerase()
        pol.add_updater(lambda m: m.move_to(P(xS.get_value() - .15, (y_new + y_long) / 2 + .62)))

        dur = 7.008
        self.add_subcaption("In the next cycle, a long copy is the template. Copying it stops where it ends, which is at the other primer.", duration=dur)
        self.add(hud, head)
        self.play(FadeIn(long_strand), FadeIn(long_lab), Create(guides), run_time=1.0)
        self.play(temp.animate.set_value(95), run_time=.6)
        self.play(temp.animate.set_value(TA), FadeIn(pR, shift=LEFT * 2 + UP * .8), run_time=1.2)
        self.play(Create(pR_rungs), run_time=.3)
        self.add(newS)
        self.play(temp.animate.set_value(72), FadeIn(pol), run_time=.6)
        self.play(xS.animate.set_value(FS), run_time=2.4, rate_func=linear)
        pol.clear_updaters()
        self.play(pol.animate.shift(LEFT * .5 + UP * .7).set_opacity(0), run_time=.6)
        self.wait(max(0, dur - 6.7))

        exact = BraceBetweenPoints(P(FS, y_new + .25), P(RE, y_new + .25), direction=UP, color=ROLE["product"])
        exact_lab = Tex("exact target length: both ends set by primers", font_size=30, color=ROLE["product"]).next_to(exact, UP, buff=.1)
        ends = Tex("template ends here", font_size=26, color=ROLE["productDim"]).move_to(P(FS - 1.75, y_long))
        dur = 7.68
        self.add_subcaption("So this new strand runs exactly from primer to primer. From now on, exact copies make more exact copies.", duration=dur)
        self.play(GrowFromCenter(exact), Write(exact_lab), run_time=1.2)
        self.play(FadeIn(ends, shift=RIGHT * .2), run_time=.6)
        self.wait(1.0)
        newS.clear_updaters()
        unit = VGroup(strand(FS, RE, .14, "product", 8), strand(FS, RE, -.14, "product", 8), rungs(FS, RE, .1, -.1, step=.2))
        unit.scale(.55).move_to(P(0, 1.6))
        self.play(FadeOut(VGroup(long_strand, long_lab, pR_rungs, ends, exact, exact_lab, guides)), run_time=.6)
        self.play(ReplacementTransform(VGroup(newS, pR), unit), run_time=.8)
        two = VGroup(unit.copy(), unit.copy()).arrange(DOWN, buff=.35).move_to(P(0, .9))
        four = VGroup(*[unit.copy() for _ in range(4)]).arrange_in_grid(rows=2, buff=(.6, .7)).move_to(P(0, .6))
        self.play(ReplacementTransform(unit, two), run_time=.8)
        self.play(ReplacementTransform(two, four), run_time=.8)
        lab = Tex("exact copies template exact copies", font_size=30, color=ROLE["product"]).next_to(four, DOWN, buff=.45)
        self.play(FadeIn(lab, shift=UP * .2), run_time=.6)
        self.wait(max(0, dur - 6.4))


class Scene4_Counting(Scene):
    def construct(self):
        head = header("Counting copies")

        def glyph(a, b):
            return VGroup(strand(-.38, .38, .05, a, 5), strand(-.38, .38, -.05, b, 5))
        levels = doubling_levels(3)
        cols = VGroup()
        for k, lv in enumerate(levels):
            col = VGroup(*[glyph(*d) for d in lv]).arrange(DOWN, buff=.3)
            col.move_to(P(-6.4 + k * 1.55, .1))
            cols.add(col)
        labels = VGroup(*[MathTex(f"n={k}", font_size=26, color=ROLE["param"]).move_to(P(-6.4 + k * 1.55, -2.75)) for k in range(4)])
        counts = VGroup(*[MathTex(str(2 ** k), font_size=34, color=ROLE["product"]).move_to(P(-6.4 + k * 1.55, 2.55)) for k in range(4)])
        total = MathTex(r"\#\,\text{duplexes}", "=", "2^{n}", font_size=48).move_to(P(3.3, 2.2))
        total[0].set_color(FG); total[2].set_color(ROLE["product"])

        dur = 6.504
        self.add_subcaption("Every strand is a template in the next cycle, so after n cycles there are two to the n duplexes.", duration=dur)
        self.add(head)
        for k in range(4):
            self.play(FadeIn(cols[k], lag_ratio=.1), FadeIn(labels[k]), FadeIn(counts[k]), run_time=.8)
        self.play(Write(total), run_time=1.2)
        self.wait(max(0, dur - 4.4))

        eq1 = MathTex(r"\#\,\text{exact}", "=", "2^{n}", "-", "2", "-", "2(n-1)", font_size=48).move_to(P(3.3, .7))
        eq1[0].set_color(FG); eq1[2].set_color(ROLE["product"]); eq1[4].set_color(ROLE["template"]); eq1[6].set_color(ROLE["productDim"])
        n1 = Tex("originals", font_size=24, color=ROLE["template"]).next_to(eq1[4], DOWN, buff=.3)
        n2 = Tex("long products", font_size=24, color=ROLE["productDim"]).next_to(eq1[6], DOWN, buff=.3)
        eq2 = MathTex(r"\#\,\text{exact}", "=", "2^{n}", "-", "2n", font_size=48).move_to(P(3.3, .7))
        eq2[0].set_color(FG); eq2[2].set_color(ROLE["product"]); eq2[4].set_color(ROLE["productDim"])
        dur = 7.608
        self.add_subcaption("Long products gain only two per cycle. Subtract them, and exact copies number two to the n, minus two n.", duration=dur)
        self.play(Write(eq1), run_time=1.6)
        self.play(FadeIn(n1, shift=UP * .15), FadeIn(n2, shift=UP * .15), run_time=.8)
        self.wait(1.2)
        self.play(FadeOut(n1), FadeOut(n2), TransformMatchingTex(eq1, eq2), run_time=1.5)
        self.wait(max(0, dur - 5.1))

        eq3 = MathTex(r"n = 30:", r"\quad 2^{30} - 60", "=", r"1{,}073{,}741{,}764", font_size=44).move_to(P(3.3, -.9))
        eq3[0].set_color(ROLE["param"]); eq3[3].set_color(ROLE["product"])
        box = SurroundingRectangle(eq3[3], color=ROLE["product"], buff=.12)
        vs = Tex(r"exact copies, against 60 long ones", font_size=28, color=FG_SOFT).next_to(eq3, DOWN, buff=.45)
        dur = 6.024
        self.add_subcaption("After thirty cycles, that is about a billion exact copies, and just sixty long ones.", duration=dur)
        self.play(Write(eq3), run_time=1.6)
        self.play(Create(box), FadeIn(vs), run_time=.9)
        self.wait(max(0, dur - 2.5))


class Scene5_LogLine(Scene):
    def construct(self):
        head = header("From copies to a measurement")
        eqA = MathTex("N_n", "=", "N_0", r"(1+E)^{n}", font_size=50).move_to(P(1.0, 3.35))
        eqA[0].set_color(ROLE["product"]); eqA[2].set_color(ROLE["template"]); eqA[3].set_color(ROLE["param"])
        eqB = MathTex(r"\log N_n", "=", r"\log N_0", "+", "n", r"\log(1+E)", font_size=50).move_to(P(1.0, 3.35))
        eqB[0].set_color(ROLE["product"]); eqB[2].set_color(ROLE["template"]); eqB[4].set_color(ROLE["param"]); eqB[5].set_color(ROLE["param"])

        dur = 6.768
        self.add_subcaption("Real cycles miss a few templates, so each one multiplies the count by one plus E, the efficiency.", duration=dur)
        self.add(head)
        self.play(Write(eqA), run_time=1.6)
        self.play(Indicate(eqA[3], color=ROLE["param"]), run_time=1.0)
        self.play(TransformMatchingTex(eqA, eqB), run_time=1.6)
        self.wait(max(0, dur - 4.2))

        ax = Axes(x_range=[0, 40, 10], y_range=[0, 13, 4], x_length=10.5, y_length=4.9,
                  axis_config={"color": FG_FAINT, "include_tip": False, "stroke_width": 2}).move_to(P(.4, -.85))
        xt = VGroup(*[MathTex(str(v), font_size=24, color=FG_FAINT).next_to(ax.c2p(v, 0), DOWN, buff=.15) for v in (0, 10, 20, 30, 40)])
        yt = VGroup(*[MathTex(f"10^{{{v}}}", font_size=24, color=FG_FAINT).next_to(ax.c2p(0, v), LEFT, buff=.15) for v in (0, 4, 8, 12)])
        xl = MathTex(r"\text{cycle } n", font_size=28, color=ROLE["param"]).next_to(ax.c2p(40, 0), DOWN, buff=.55).shift(LEFT * .6)
        yl = MathTex(r"\text{copies } N_n", font_size=28, color=ROLE["product"]).next_to(ax.c2p(0, 13), UP, buff=.15).shift(RIGHT * .6)

        E, K = .99, 1e12

        def log_curve(n0):
            N, out = n0, [np.log10(n0)]
            for _ in range(40):
                N += E * N * max(0.0, 1 - N / K)
                out.append(np.log10(N))
            arr = np.array(out)
            return lambda x: float(np.interp(x, np.arange(41), arr))
        starts = (6, 5, 4)
        fs = [log_curve(10 ** s) for s in starts]
        curves = VGroup(*[ax.plot(f, x_range=[0, 40, .25], color=ROLE["product"], stroke_width=4).set_stroke(opacity=1 - .22 * i) for i, f in enumerate(fs)])
        n0_dots = VGroup(*[Dot(ax.c2p(0, s), radius=.09, color=ROLE["template"]) for s in starts])

        dur = 7.176
        self.add_subcaption("On a logarithmic axis, that growth is a straight line, and its height records how much template you started with.", duration=dur)
        self.play(Create(ax), FadeIn(xt), FadeIn(yt), FadeIn(xl), FadeIn(yl), run_time=1.2)
        self.play(Create(curves[0]), run_time=1.6)
        self.play(GrowFromCenter(n0_dots[0]), Indicate(eqB[2], color=ROLE["template"]), run_time=.8)
        self.play(Create(curves[1]), Create(curves[2]), GrowFromCenter(n0_dots[1]), GrowFromCenter(n0_dots[2]), run_time=1.6)
        self.wait(max(0, dur - 5.2))

        thr = 10
        thr_line = DashedLine(ax.c2p(0, thr), ax.c2p(40, thr), color=ROLE["readout"], stroke_width=2.5, dash_length=.12)
        thr_lab = Tex("threshold", font_size=26, color=ROLE["readout"]).next_to(ax.c2p(40, thr), UP, buff=.12).shift(LEFT * .9)
        cts = [float(np.interp(thr, [f(x) for x in np.linspace(0, 40, 801)], np.linspace(0, 40, 801))) for f in fs]
        ct_dots = VGroup(*[Dot(ax.c2p(c, thr), radius=.09, color=ROLE["readout"]) for c in cts])
        ct_drops = VGroup(*[DashedLine(ax.c2p(c, thr), ax.c2p(c, 0), color=ROLE["readout"], stroke_width=1.8, dash_length=.07).set_opacity(.7) for c in cts])
        ct_lab = MathTex("C_T", font_size=32, color=ROLE["readout"]).next_to(ax.c2p(cts[1], 0), UP, buff=.18).shift(RIGHT * .32)
        gap = BraceBetweenPoints(ax.c2p(cts[0], thr + .35), ax.c2p(cts[1], thr + .35), direction=UP, color=FG_SOFT)
        gap_lab = MathTex(r"\approx 3.3", font_size=30, color=FG_SOFT).next_to(gap, UP, buff=.08)
        dur = 8.976
        self.add_subcaption("A threshold in the growth phase is crossed at a cycle called C T. Ten times more template crosses it about three point three cycles sooner.", duration=dur)
        self.play(Create(thr_line), FadeIn(thr_lab), run_time=1.0)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in ct_dots], lag_ratio=.25), run_time=.9)
        self.play(Create(ct_drops), FadeIn(ct_lab), run_time=.9)
        self.wait(1.5)
        self.play(GrowFromCenter(gap), Write(gap_lab), run_time=1.2)
        self.wait(max(0, dur - 5.5))

        eqC = MathTex("C_T", "=", r"\frac{\log N_t - \log N_0}{\log(1+E)}", font_size=46).move_to(P(1.0, 3.25))
        eqC[0].set_color(ROLE["readout"])
        dur = 6.0
        self.add_subcaption("That shift is how a real-time PCR test reads the amount of DNA in a sample.", duration=dur)
        self.play(FadeTransform(eqB, eqC), run_time=1.4)
        self.play(Indicate(n0_dots, color=ROLE["template"]), Indicate(ct_dots, color=ROLE["readout"]), run_time=1.2)
        self.wait(max(0, dur - 2.6))
