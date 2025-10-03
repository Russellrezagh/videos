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

        self.play(FadeIn(factor_equation, shift=DOWN))
        self.wait()

        transform_group = VGroup(plane, unit_circle, e1, e2)

        self.play(Circumscribe(factors[0], color=GREEN))
        self.play(ApplyMatrix(vt_matrix, transform_group), run_time=3)
        self.wait()

        self.play(Circumscribe(factors[1], color=YELLOW))
        self.play(ApplyMatrix(sigma_matrix, transform_group), run_time=3)
        self.wait()

        self.play(Circumscribe(factors[2], color=BLUE_C))
        self.play(ApplyMatrix(u_matrix, transform_group), run_time=3)
        self.wait(2)

        result_label = Tex(R"A = U \Sigma V^{T}")
        result_label.next_to(factor_equation, DOWN)
        self.play(Write(result_label))
        self.wait(2)


class SingularValuesMeaning(Scene):
    def construct(self):
        matrix_example = Matrix([[3, 0], [0, 1]])
        matrix_example.set_column_colors(BLUE, GREEN)
        matrix_example.to_edge(LEFT)

        axes = VGroup(
            Tex(R"Stretch by 3 along \vec{v}_1", color=BLUE),
            Tex(R"Stretch by 1 along \vec{v}_2", color=GREEN),
        )
        axes.arrange(DOWN, aligned_edge=LEFT)
        axes.next_to(matrix_example, RIGHT, LARGE_BUFF)

        ellipse = Ellipse(width=6, height=2, color=YELLOW)
        ellipse.to_edge(DOWN)
        ellipse_caption = Text("Singular values determine the ellipse's radii.")
        ellipse_caption.scale(0.7)
        ellipse_caption.next_to(ellipse, UP, SMALL_BUFF)

        self.play(Write(matrix_example))
        self.wait()
        for item in axes:
            self.play(FadeIn(item, shift=RIGHT))
            self.wait(0.5)
        self.play(Create(ellipse))
        self.play(FadeIn(ellipse_caption, shift=UP))
        self.wait(2)
