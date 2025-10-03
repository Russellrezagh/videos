from manim_imports_ext import *
import numpy as np


class SVDIntro(Scene):
    def construct(self):
        title = Text("Singular Value Decomposition", font_size=52)
        title.to_edge(UP)

        equation = Tex(r"A = U \Sigma V^{T}")
        equation.set_color_by_tex("A", WHITE)
        equation.set_color_by_tex("U", BLUE_C)
        equation.set_color_by_tex("\\Sigma", YELLOW)
        equation.set_color_by_tex("V^{T}", GREEN)
        equation.next_to(title, DOWN, LARGE_BUFF)

        highlight_boxes = VGroup(
            SurroundingRectangle(equation.get_part_by_tex("U"), buff=0.1, color=BLUE_C),
            SurroundingRectangle(equation.get_part_by_tex("\\Sigma"), buff=0.1, color=YELLOW),
            SurroundingRectangle(equation.get_part_by_tex("V^{T}"), buff=0.12, color=GREEN),
        )

        example_matrix = Matrix([[2, 1], [1, 3]])
        example_matrix.set_column_colors(BLUE_C, GREEN)
        example_matrix.next_to(equation, DOWN, LARGE_BUFF)

        example_caption = VGroup(
            Tex(r"\text{Example matrix whose action we will decompose}", font_size=34),
            Tex(r"A = \begin{bmatrix}2 & 1 \\ 1 & 3\end{bmatrix}", font_size=34),
        )
        example_caption.arrange(DOWN, aligned_edge=LEFT)
        example_caption.next_to(example_matrix, DOWN, MED_LARGE_BUFF)

        brace = Brace(equation, DOWN, buff=SMALL_BUFF)
        descriptions = VGroup(
            Tex(r"U:\ \text{outputs an orthonormal basis}", color=BLUE_C),
            Tex(r"\Sigma:\ \text{rescales along principal axes}", color=YELLOW),
            Tex(r"V^{T}:\ \text{aligns to the input basis}", color=GREEN),
        )
        descriptions.arrange(DOWN, aligned_edge=LEFT)
        descriptions.set_width(6)
        descriptions.next_to(brace, DOWN, buff=MED_SMALL_BUFF)

        footer = Text("Works for any matrix, rectangular or square.")
        footer.scale(0.7)
        footer.next_to(descriptions, DOWN, LARGE_BUFF)

        self.play(FadeIn(title, shift=DOWN))
        self.wait(0.5)
        self.play(Write(equation))
        self.wait(0.5)
        self.play(GrowFromCenter(highlight_boxes[0]))
        self.wait(0.3)
        self.play(ReplacementTransform(highlight_boxes[0], highlight_boxes[1]))
        self.wait(0.3)
        self.play(ReplacementTransform(highlight_boxes[1], highlight_boxes[2]))
        self.wait(0.3)
        self.play(FadeOut(highlight_boxes[2]))
        self.play(
            FadeIn(example_matrix, shift=UP),
            FadeIn(example_caption[0], shift=DOWN),
        )
        self.play(FadeIn(example_caption[1], shift=DOWN))
        self.wait(0.5)
        self.play(GrowFromCenter(brace))
        self.wait(0.25)
        for item in descriptions:
            panel = SurroundingRectangle(item, buff=0.2, color=item.get_color(), stroke_width=2)
            self.play(FadeIn(panel, scale=0.95), Write(item))
            self.play(Indicate(item, scale_factor=1.05))
            self.play(FadeOut(panel))
        self.play(FadeIn(footer, shift=UP))
        self.wait(2)


class SVDGeometricDemo(Scene):
    def construct(self):
        matrix = np.array([[2, 1], [1, 3]])
        u_matrix, singular_values, vt_matrix = np.linalg.svd(matrix)
        sigma_matrix = np.diag(singular_values)

        plane = NumberPlane(
            x_range=(-4, 4, 1),
            y_range=(-3, 3, 1),
            background_line_style={
                "stroke_width": 1,
                "stroke_opacity": 0.3,
            },
        )
        plane.add_coordinates()
        plane.prepare_for_nonlinear_transform()

        unit_circle = Circle(radius=1.3, color=BLUE)
        unit_circle.set_stroke(width=3)

        basis_vectors = VGroup(
            Vector(RIGHT, color=YELLOW),
            Vector(UP, color=GREEN),
        )
        basis_labels = VGroup(
            always_redraw(
                lambda: Tex(r"\vec{v}_1", color=YELLOW)
                .scale(0.7)
                .next_to(basis_vectors[0].get_end(), RIGHT, SMALL_BUFF)
            ),
            always_redraw(
                lambda: Tex(r"\vec{v}_2", color=GREEN)
                .scale(0.7)
                .next_to(basis_vectors[1].get_end(), UP, SMALL_BUFF)
            ),
        )

        self.add(plane, unit_circle, basis_vectors, basis_labels)

        matrix_display = Matrix(np.round(matrix, 2))
        matrix_display.scale(0.7)
        matrix_display.to_corner(UL)
        matrix_label = Tex("A", font_size=42)
        matrix_label.next_to(matrix_display, UP, SMALL_BUFF)

        factor_group = VGroup(
            Matrix(np.round(vt_matrix, 2), h_buff=1.2).set_color(GREEN),
            Matrix(np.round(sigma_matrix, 2)).set_color(YELLOW),
            Matrix(np.round(u_matrix, 2), h_buff=1.2).set_color(BLUE_C),
        )
        middle_dots = VGroup(*[Tex("\\cdot") for _ in range(2)])
        factor_equation = VGroup(
            Tex("A"),
            Tex("="),
            factor_group[2],
            middle_dots[0],
            factor_group[1],
            middle_dots[1],
            factor_group[0],
        )
        factor_equation.arrange(RIGHT, buff=0.3)
        factor_equation.to_edge(UP)

        explanations = VGroup(
            Tex(r"V^{T}:\ \text{align with input directions}", color=GREEN, font_size=36),
            Tex(r"\Sigma:\ \text{stretch or shrink}", color=YELLOW, font_size=36),
            Tex(r"U:\ \text{rotate to output basis}", color=BLUE_C, font_size=36),
        )
        explanations.arrange(DOWN, aligned_edge=LEFT)
        explanations.next_to(factor_equation, DOWN, buff=MED_LARGE_BUFF)

        narration_box = SurroundingRectangle(explanations, buff=0.3, color=GREY_B)

        self.play(FadeIn(factor_equation, shift=DOWN))
        self.play(FadeIn(matrix_display), FadeIn(matrix_label, shift=UP))
        self.play(Create(narration_box), FadeIn(explanations[0]))
        self.wait()

        transform_group = VGroup(plane, unit_circle, *basis_vectors)

        # Apply V^T
        self.play(Circumscribe(factor_group[0], color=GREEN))
        self.play(ApplyMatrix(vt_matrix, transform_group), run_time=3)
        self.wait(0.5)

        # Apply Sigma
        self.play(
            ReplacementTransform(explanations[0], explanations[1]),
            narration_box.animate.set_color(YELLOW_E),
            Circumscribe(factor_group[1], color=YELLOW),
        )
        self.play(ApplyMatrix(sigma_matrix, transform_group), run_time=3)
        self.wait(0.5)

        # Apply U
        self.play(
            ReplacementTransform(explanations[1], explanations[2]),
            narration_box.animate.set_color(BLUE_D),
            Circumscribe(factor_group[2], color=BLUE_C),
        )
        self.play(ApplyMatrix(u_matrix, transform_group), run_time=3)
        self.wait(1)

        result_label = Tex(r"A = U \Sigma V^{T}")
        result_label.next_to(factor_equation, DOWN, buff=SMALL_BUFF)
        result_box = SurroundingRectangle(result_label, color=WHITE, buff=0.25)
        self.play(Write(result_label), Create(result_box))
        self.wait(2)


class SingularValuesMeaning(Scene):
    def construct(self):
        sigma_values = [3, 1]
        sigma_matrix = Matrix([[sigma_values[0], 0], [0, sigma_values[1]]])
        sigma_matrix.set_column_colors(YELLOW, GREEN)
        sigma_matrix.to_corner(UL)
        sigma_title = Tex(
            r"\Sigma = \begin{bmatrix}3 & 0\\0 & 1\end{bmatrix}",
            color=YELLOW,
        )
        sigma_title.next_to(sigma_matrix, DOWN, SMALL_BUFF)

        plane = NumberPlane(
            x_range=(-4, 4, 1),
            y_range=(-3, 3, 1),
            background_line_style={"stroke_width": 1, "stroke_opacity": 0.2},
        )
        plane.move_to(ORIGIN)

        circle = Circle(radius=1.2, color=BLUE)
        circle.set_stroke(width=4)
        circle_label = Tex("\\text{Unit circle}", font_size=36, color=BLUE)
        circle_label.next_to(circle, DOWN)

        ellipse = circle.copy()
        ellipse.apply_matrix(np.diag(sigma_values))
        ellipse.set_color(YELLOW)
        ellipse_label = Tex(
            r"\text{Image has radii } \sigma_1, \sigma_2",
            font_size=36,
            color=YELLOW,
        )
        ellipse_label.next_to(ellipse, DOWN)

        semi_major = DoubleArrow(
            LEFT * sigma_values[0] * circle.radius,
            RIGHT * sigma_values[0] * circle.radius,
            color=YELLOW,
        )
        semi_major_label = Tex(r"\sigma_1 = 3", color=YELLOW, font_size=36)
        semi_major_label.next_to(semi_major, UP, SMALL_BUFF)

        semi_minor = DoubleArrow(
            DOWN * sigma_values[1] * circle.radius,
            UP * sigma_values[1] * circle.radius,
            color=GREEN,
        )
        semi_minor_label = Tex(r"\sigma_2 = 1", color=GREEN, font_size=36)
        semi_minor_label.next_to(semi_minor, RIGHT, SMALL_BUFF)

        axis_labels = VGroup(
            Tex(r"\text{Stretched by } \sigma_1", color=YELLOW, font_size=30)
            .next_to(RIGHT * sigma_values[0] * circle.radius, RIGHT, buff=0.2),
            Tex(r"\text{Stretched by } \sigma_2", color=GREEN, font_size=30)
            .next_to(UP * sigma_values[1] * circle.radius, UP, buff=0.2),
        )

        self.play(FadeIn(plane))
        self.play(Write(sigma_matrix))
        self.play(FadeIn(sigma_title, shift=DOWN))
        self.wait(0.5)
        self.play(Create(circle), FadeIn(circle_label, shift=DOWN))
        self.wait(0.5)
        self.play(Transform(circle, ellipse), run_time=3)
        self.play(Transform(circle_label, ellipse_label))
        self.wait(0.5)

        self.play(GrowFromCenter(semi_major))
        self.play(FadeIn(semi_major_label, shift=UP))
        self.play(FadeIn(axis_labels[0], shift=RIGHT))
        self.wait(0.25)
        self.play(GrowFromCenter(semi_minor))
        self.play(FadeIn(semi_minor_label, shift=RIGHT))
        self.play(FadeIn(axis_labels[1], shift=UP))
        self.wait(2)
