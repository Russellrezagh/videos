from manim_imports_ext import *
import numpy as np


def build_matrix_block(label, array, color, font_size=34):
    """Create a text block that mimics a matrix without requiring LaTeX."""

    rows = [
        Text(
            "[" + ", ".join(f"{value:.2f}" for value in row) + "]",
            font_size=font_size,
            color=color,
            font="monospace",
        )
        for row in array
    ]
    matrix_body = VGroup(*rows).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
    if label:
        label_text = Text(label, font_size=font_size + 2, color=color)
        block = VGroup(label_text, matrix_body).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
    else:
        block = matrix_body
    box = SurroundingRectangle(block, buff=0.15, color=color, stroke_width=2)
    return VGroup(block, box)


def build_simple_matrix(array, column_colors=None, font_size=36):
    """Return a basic grid of numbers using Text objects."""

    column_colors = column_colors or []
    rows = []
    for row in array:
        entries = []
        for index, value in enumerate(row):
            color = column_colors[index] if index < len(column_colors) else WHITE
            entries.append(
                Text(str(value), font_size=font_size, color=color, font="monospace")
            )
        row_group = VGroup(*entries).arrange(RIGHT, buff=0.3)
        rows.append(row_group)
    matrix_group = VGroup(*rows).arrange(DOWN, buff=0.25)
    frame = SurroundingRectangle(matrix_group, buff=0.2, color=WHITE)
    return VGroup(matrix_group, frame)


class SVDIntro(Scene):
    def construct(self):
        title = Text("Singular Value Decomposition", font_size=52)
        title.to_edge(UP)

        equation = VGroup(
            Text("A", color=WHITE),
            Text("=", color=WHITE),
            Text("U", color=BLUE_C),
            Text("Σ", color=YELLOW),
            Text("Vᵀ", color=GREEN),
        )
        equation.arrange(RIGHT, buff=0.15)
        equation.next_to(title, DOWN, LARGE_BUFF)

        brace = Brace(equation, DOWN, buff=SMALL_BUFF)
        descriptions = VGroup(
            Text("U: outputs orthonormal directions", color=BLUE_C, font_size=34),
            Text("Σ: scales by singular values", color=YELLOW, font_size=34),
            Text("Vᵀ: aligns with the input basis", color=GREEN, font_size=34),
        )
        descriptions.arrange(DOWN, aligned_edge=LEFT)
        descriptions.set_width(6)
        descriptions.next_to(brace, DOWN, buff=MED_SMALL_BUFF)

        example_matrix = build_simple_matrix([[2, 1], [1, 3]], column_colors=[BLUE_C, GREEN])
        example_matrix.next_to(descriptions, DOWN, LARGE_BUFF)

        decomposition = np.linalg.svd(np.array([[2.0, 1.0], [1.0, 3.0]]))
        u_matrix = build_matrix_block("U =", np.round(decomposition[0], 2), BLUE_C)
        sigma_matrix = build_matrix_block("Σ =", np.diag(np.round(decomposition[1], 2)), YELLOW)
        vt_matrix = build_matrix_block("Vᵀ =", np.round(decomposition[2], 2), GREEN)
        numeric_equation = VGroup(
            Text("A =", font_size=36),
            u_matrix,
            Text("·", font_size=36),
            sigma_matrix,
            Text("·", font_size=36),
            vt_matrix,
        )
        numeric_equation.arrange(RIGHT, buff=0.4, aligned_edge=DOWN)
        numeric_equation.next_to(example_matrix, DOWN, LARGE_BUFF)

        footer = Text("Works for any matrix, rectangular or square.")
        footer.scale(0.7)
        footer.next_to(numeric_equation, DOWN, LARGE_BUFF)

        highlight_boxes = VGroup(
            SurroundingRectangle(equation[2], buff=0.1, color=BLUE_C),
            SurroundingRectangle(equation[3], buff=0.1, color=YELLOW),
            SurroundingRectangle(equation[4], buff=0.12, color=GREEN),
        )

        self.play(FadeIn(title, shift=DOWN))
        self.wait(0.5)
        self.play(FadeIn(equation))
        self.wait(0.5)
        self.play(GrowFromCenter(brace))
        for highlight, description in zip(highlight_boxes, descriptions):
            panel = SurroundingRectangle(description, buff=0.2, color=description.get_color(), stroke_width=2)
            self.play(GrowFromCenter(highlight))
            self.play(FadeIn(panel, scale=0.95), FadeIn(description, shift=RIGHT))
            self.play(Indicate(description, scale_factor=1.05))
            self.play(FadeOut(panel), FadeOut(highlight))

        example_caption = Text("A = [[2, 1], [1, 3]]", font_size=34)
        example_caption.next_to(example_matrix, UP, SMALL_BUFF)

        self.play(
            FadeIn(example_matrix, shift=UP),
            FadeIn(example_caption, shift=DOWN),
        )
        self.wait(0.5)
        self.play(FadeIn(numeric_equation))
        self.wait(0.5)
        self.play(FadeIn(footer, shift=UP))
        self.wait(2)


class SVDGeometricDemo(Scene):
    def construct(self):
        matrix = np.array([[2.0, 1.2], [0.6, 1.5]])
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
        plane.prepare_for_nonlinear_transform()

        unit_circle = Circle(radius=1.3, color=BLUE)
        unit_circle.set_stroke(width=3)

        basis_vectors = VGroup(
            Vector(RIGHT, color=YELLOW),
            Vector(UP, color=GREEN),
        )
        basis_labels = VGroup(
            always_redraw(
                lambda: Text("v₁", color=YELLOW, font_size=32)
                .next_to(basis_vectors[0].get_end(), RIGHT, SMALL_BUFF)
            ),
            always_redraw(
                lambda: Text("v₂", color=GREEN, font_size=32)
                .next_to(basis_vectors[1].get_end(), UP, SMALL_BUFF)
            ),
        )

        self.add(plane, unit_circle, basis_vectors, basis_labels)

        matrix_display = build_simple_matrix(np.round(matrix, 2))
        matrix_display.scale(0.7)
        matrix_display.to_corner(UL)
        matrix_label = Text("A", font_size=42)
        matrix_label.next_to(matrix_display, UP, SMALL_BUFF)

        factor_group = VGroup(
            build_matrix_block("Vᵀ =", np.round(vt_matrix, 2), GREEN),
            build_matrix_block("Σ =", np.round(sigma_matrix, 2), YELLOW),
            build_matrix_block("U =", np.round(u_matrix, 2), BLUE_C),
        )
        factor_equation = VGroup(
            Text("A =", font_size=36),
            factor_group[2],
            Text("·", font_size=36),
            factor_group[1],
            Text("·", font_size=36),
            factor_group[0],
        )
        factor_equation.arrange(RIGHT, buff=0.4, aligned_edge=DOWN)
        factor_equation.to_edge(UP)

        explanation_templates = [
            Text("Vᵀ: realign the input directions", color=GREEN, font_size=34),
            Text("Σ: stretch by singular values", color=YELLOW, font_size=34),
            Text("U: rotate to the output basis", color=BLUE_C, font_size=34),
        ]
        explanation_templates = VGroup(*explanation_templates)
        explanation_templates.arrange(DOWN, aligned_edge=LEFT)
        explanation_templates.next_to(factor_equation, DOWN, buff=MED_LARGE_BUFF)

        narration_box = SurroundingRectangle(explanation_templates, buff=0.3, color=GREY_B)

        self.play(FadeIn(factor_equation, shift=DOWN))
        self.play(FadeIn(matrix_display), FadeIn(matrix_label, shift=UP))
        self.play(Create(narration_box), FadeIn(explanation_templates[0]))

        transform_group = VGroup(plane, unit_circle, *basis_vectors)

        # Apply V^T
        self.play(Circumscribe(factor_group[0], color=GREEN))
        self.play(ApplyMatrix(vt_matrix, transform_group), run_time=3)
        self.wait(0.5)

        # Apply Sigma
        self.play(
            ReplacementTransform(explanation_templates[0], explanation_templates[1]),
            narration_box.animate.set_color(YELLOW_E),
            Circumscribe(factor_group[1], color=YELLOW),
        )
        self.play(ApplyMatrix(sigma_matrix, transform_group), run_time=3)
        self.wait(0.5)

        # Apply U
        self.play(
            ReplacementTransform(explanation_templates[1], explanation_templates[2]),
            narration_box.animate.set_color(BLUE_D),
            Circumscribe(factor_group[2], color=BLUE_C),
        )
        self.play(ApplyMatrix(u_matrix, transform_group), run_time=3)
        self.wait(1)

        result_label = Text("A = U Σ Vᵀ")
        result_label.next_to(factor_equation, DOWN, buff=SMALL_BUFF)
        result_box = SurroundingRectangle(result_label, color=WHITE, buff=0.25)
        self.play(Write(result_label), Create(result_box))
        self.wait(2)


class SingularValuesMeaning(Scene):
    def construct(self):
        sigma_values = [3, 1]
        sigma_matrix = build_simple_matrix([[sigma_values[0], 0], [0, sigma_values[1]]], column_colors=[YELLOW, GREEN])
        sigma_matrix.to_corner(UL)
        sigma_title = Text("Σ = [[3, 0], [0, 1]]", color=YELLOW, font_size=34)
        sigma_title.next_to(sigma_matrix, DOWN, SMALL_BUFF)

        plane = NumberPlane(
            x_range=(-4, 4, 1),
            y_range=(-3, 3, 1),
            background_line_style={"stroke_width": 1, "stroke_opacity": 0.2},
        )
        plane.move_to(ORIGIN)

        circle = Circle(radius=1.2, color=BLUE)
        circle.set_stroke(width=4)
        circle_label = Text("Unit circle", font_size=36, color=BLUE)
        circle_label.next_to(circle, DOWN)

        ellipse = circle.copy()
        ellipse.apply_matrix(np.diag(sigma_values))
        ellipse.set_color(YELLOW)
        ellipse_label = Text("Image has radii σ₁, σ₂", font_size=36, color=YELLOW)
        ellipse_label.next_to(ellipse, DOWN)

        semi_major = DoubleArrow(
            LEFT * sigma_values[0] * circle.radius,
            RIGHT * sigma_values[0] * circle.radius,
            color=YELLOW,
        )
        semi_major_label = Text("σ₁ = 3", color=YELLOW, font_size=36)
        semi_major_label.next_to(semi_major, UP, SMALL_BUFF)

        semi_minor = DoubleArrow(
            DOWN * sigma_values[1] * circle.radius,
            UP * sigma_values[1] * circle.radius,
            color=GREEN,
        )
        semi_minor_label = Text("σ₂ = 1", color=GREEN, font_size=36)
        semi_minor_label.next_to(semi_minor, RIGHT, SMALL_BUFF)

        axis_labels = VGroup(
            Text("Stretched by σ₁", color=YELLOW, font_size=30)
            .next_to(RIGHT * sigma_values[0] * circle.radius, RIGHT, buff=0.2),
            Text("Stretched by σ₂", color=GREEN, font_size=30)
            .next_to(UP * sigma_values[1] * circle.radius, UP, buff=0.2),
        )

        self.play(FadeIn(plane))
        self.play(FadeIn(sigma_matrix))
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
