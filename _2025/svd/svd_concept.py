from manim_imports_ext import *
import numpy as np


class SVDIntro(Scene):
    def construct(self):
        title = Text("Singular Value Decomposition")
        title.to_edge(UP)

        equation = Tex(
            R"A = U \Sigma V^{T}",
            tex_to_color_map={
                "U": BLUE_C,
                "\\Sigma": YELLOW,
                "V^{T}": GREEN,
            },
        )
        equation.next_to(title, DOWN, LARGE_BUFF)

        example_matrix = Matrix([[2, 1], [1, 3]])
        example_matrix.set_column_colors(BLUE_C, GREEN)
        example_matrix.next_to(equation, DOWN, LARGE_BUFF)
        example_caption = Tex(
            R"\text{Example matrix whose action we will decompose}",
            font_size=36,
        )
        example_caption.next_to(example_matrix, DOWN, MED_LARGE_BUFF)

        brace = Brace(equation, DOWN, buff=SMALL_BUFF)
        description = VGroup(
            Tex(R"U: \text{orthonormal output directions}", color=BLUE_C),
            Tex(R"\Sigma: \text{singular values (stretch factors)}", color=YELLOW),
            Tex(R"V^{T}: \text{orthonormal input directions}", color=GREEN),
        )
        description.arrange(DOWN, aligned_edge=LEFT)
        description.set_width(5.5)
        description.next_to(brace, DOWN)

        footer = Text("Works for any matrix, rectangular or square.")
        footer.scale(0.7)
        footer.next_to(description, DOWN, LARGE_BUFF)

        self.play(Write(title))
        self.wait()
        self.play(Write(equation))
        self.wait(0.5)
        self.play(Write(example_matrix))
        self.play(FadeIn(example_caption, shift=DOWN))
        self.play(GrowFromCenter(brace))
        self.wait()
        for item in description:
            self.play(Write(item))
            self.wait(0.25)
        self.play(FadeIn(footer, shift=UP))
        self.wait(2)


class SVDGeometricDemo(Scene):
    def construct(self):
        plane = NumberPlane(
            x_range=(-4, 4, 1),
            y_range=(-3, 3, 1),
            background_line_style={
                "stroke_width": 1,
                "stroke_opacity": 0.3,
            },
        )
        plane.add_coordinates()

        unit_circle = Circle(radius=1.5, color=BLUE)
        unit_circle.set_stroke(width=3)

        e1 = Vector(RIGHT, color=YELLOW)
        e2 = Vector(UP, color=GREEN)
        e1_label = always_redraw(
            lambda: Tex(R"\vec{v}_1", color=YELLOW)
            .scale(0.7)
            .next_to(e1.get_end(), RIGHT, SMALL_BUFF)
        )
        e2_label = always_redraw(
            lambda: Tex(R"\vec{v}_2", color=GREEN)
            .scale(0.7)
            .next_to(e2.get_end(), UP, SMALL_BUFF)
        )

        self.add(plane, unit_circle, e1, e2, e1_label, e2_label)

        matrix = np.array([[2, 1.2], [0.6, 1.5]])
        u_matrix, singular_values, vt_matrix = np.linalg.svd(matrix)
        sigma_matrix = np.diag(singular_values)

        matrix_display = Matrix(np.round(matrix, 2))
        matrix_display.scale(0.7)
        matrix_display.to_corner(UL)
        matrix_label = Tex("A", font_size=42)
        matrix_label.next_to(matrix_display, UP, SMALL_BUFF)

        factors = VGroup(
            Tex("V^{T}", color=GREEN),
            Tex("\\Sigma", color=YELLOW),
            Tex("U", color=BLUE_C),
        )
        middle_dot = Tex("\\cdot")
        factor_equation = VGroup(
            factors[0],
            middle_dot.copy(),
            factors[1],
            middle_dot.copy(),
            factors[2],
        )
        factor_equation.arrange(RIGHT, buff=SMALL_BUFF)
        factor_equation.to_edge(UP)

        explanations = VGroup(
            Tex(R"\text{Align inputs with the singular vectors}", color=GREEN, font_size=36),
            Tex(R"\text{Scale by the singular values}", color=YELLOW, font_size=36),
            Tex(R"\text{Rotate into the output basis}", color=BLUE_C, font_size=36),
        )
        explanations.arrange(DOWN, buff=MED_SMALL_BUFF, aligned_edge=LEFT)
        explanations.next_to(factor_equation, DOWN, MED_LARGE_BUFF)

        self.play(FadeIn(factor_equation, shift=DOWN))
        self.play(FadeIn(matrix_display), FadeIn(matrix_label, shift=UP))
        self.wait()

        transform_group = VGroup(plane, unit_circle, e1, e2)

        self.play(Circumscribe(factors[0], color=GREEN))
        self.play(FadeIn(explanations[0], shift=DOWN))
        self.play(ApplyMatrix(vt_matrix, transform_group), run_time=3)
        self.wait()

        self.play(Circumscribe(factors[1], color=YELLOW))
        self.play(ReplacementTransform(explanations[0], explanations[1]))
        self.play(ApplyMatrix(sigma_matrix, transform_group), run_time=3)
        self.wait()

        self.play(Circumscribe(factors[2], color=BLUE_C))
        self.play(ReplacementTransform(explanations[1], explanations[2]))
        self.play(ApplyMatrix(u_matrix, transform_group), run_time=3)
        self.wait(2)

        result_label = Tex(R"A = U \Sigma V^{T}")
        result_label.next_to(factor_equation, DOWN)
        self.play(Write(result_label))
        self.wait()
        self.play(FadeOut(explanations[2], shift=DOWN))
        self.wait(2)


class SingularValuesMeaning(Scene):
    def construct(self):
        sigma_values = [3, 1]

        sigma_matrix = Matrix([[sigma_values[0], 0], [0, sigma_values[1]]])
        sigma_matrix.set_column_colors(YELLOW, GREEN)
        sigma_matrix.to_corner(UL)
        sigma_title = Tex(R"\Sigma = \begin{bmatrix}3 & 0\\0 & 1\end{bmatrix}", color=YELLOW)
        sigma_title.next_to(sigma_matrix, DOWN, SMALL_BUFF)

        circle = Circle(radius=1.2, color=BLUE)
        circle.set_stroke(width=4)
        circle.move_to(ORIGIN)
        circle_label = Tex("\text{Unit circle}", font_size=36, color=BLUE)
        circle_label.next_to(circle, DOWN)

        ellipse = Ellipse(
            width=2 * sigma_values[0] * circle.radius,
            height=2 * sigma_values[1] * circle.radius,
            color=YELLOW,
        )
        ellipse.set_stroke(width=4)
        ellipse.move_to(circle.get_center())
        ellipse_label = Tex(
            R"\text{Image has radii } \sigma_1, \sigma_2",
            font_size=36,
            color=YELLOW,
        )
        ellipse_label.next_to(ellipse, DOWN)

        semi_major = DoubleArrow(
            LEFT * sigma_values[0] * circle.radius,
            RIGHT * sigma_values[0] * circle.radius,
            color=YELLOW,
        )
        semi_major.next_to(ellipse, UP, buff=SMALL_BUFF)
        semi_major_label = Tex(R"\sigma_1 = 3", color=YELLOW, font_size=36)
        semi_major_label.next_to(semi_major, UP, SMALL_BUFF)

        semi_minor = DoubleArrow(
            DOWN * sigma_values[1] * circle.radius,
            UP * sigma_values[1] * circle.radius,
            color=GREEN,
        )
        semi_minor.next_to(ellipse, RIGHT, buff=MED_SMALL_BUFF)
        semi_minor_label = Tex(R"\sigma_2 = 1", color=GREEN, font_size=36)
        semi_minor_label.next_to(semi_minor, RIGHT, SMALL_BUFF)

        self.play(Write(sigma_matrix))
        self.play(FadeIn(sigma_title, shift=DOWN))
        self.wait()
        self.play(Create(circle), FadeIn(circle_label, shift=DOWN))
        self.wait(0.5)
        self.play(Transform(circle, ellipse, run_time=3))
        self.play(FadeIn(ellipse_label, shift=DOWN))
        self.wait(0.5)
        self.play(GrowFromCenter(semi_major), FadeIn(semi_major_label, shift=UP))
        self.play(GrowFromCenter(semi_minor), FadeIn(semi_minor_label, shift=RIGHT))
        self.wait(2)
