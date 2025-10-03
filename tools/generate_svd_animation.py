#!/usr/bin/env python3
"""Generate an animated GIF demonstrating the SVD transformation."""
from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import animation

DEFAULT_MATRIX = np.array([[2.0, 1.2], [0.6, 1.5]])
DEFAULT_OUTPUT = Path("renders/svd_animation.gif")
DEFAULT_FIGSIZE = (6.0, 6.0)
DEFAULT_DPI = 120


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Create an animation that visualises the action of an SVD as it "
            "successively applies V^T, Σ, and U to the plane."
        )
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Where to write the animation (default: {DEFAULT_OUTPUT}).",
    )
    parser.add_argument(
        "--matrix",
        type=float,
        nargs=4,
        metavar=("a", "b", "c", "d"),
        help="Override the 2x2 matrix entries (row-major order).",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=24,
        help="Frames per second for the animation.",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=12.0,
        help="Total duration of the animation in seconds.",
    )
    parser.add_argument(
        "--figsize",
        type=float,
        nargs=2,
        metavar=("width", "height"),
        default=DEFAULT_FIGSIZE,
        help=(
            "Size of the Matplotlib figure in inches. Lower values shrink the output "
            "resolution (default: %(default)s)."
        ),
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=DEFAULT_DPI,
        help=(
            "Dots per inch for the saved animation. Use a smaller value to reduce the "
            "file size (default: %(default)s)."
        ),
    )
    return parser


def prepare_shapes(num_circle_points: int = 128) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    angles = np.linspace(0, 2 * math.pi, num_circle_points, endpoint=False)
    circle = np.stack([np.cos(angles), np.sin(angles)], axis=1)

    grid_lines: List[np.ndarray] = []
    grid_range = np.linspace(-2, 2, 9)
    for value in grid_range:
        vertical = np.stack([np.full_like(grid_range, value), grid_range], axis=1)
        horizontal = np.stack([grid_range, np.full_like(grid_range, value)], axis=1)
        grid_lines.append(vertical)
        grid_lines.append(horizontal)
    basis = np.array([[1.0, 0.0], [0.0, 1.0]])
    return circle, np.array(grid_lines), basis


def interpolate(current: np.ndarray, target: np.ndarray, alpha: float) -> np.ndarray:
    return current @ ((1 - alpha) * np.eye(2) + alpha * target)


class SVDAnimator:
    def __init__(
        self,
        matrix: np.ndarray,
        total_frames: int,
        figsize: Tuple[float, float] = DEFAULT_FIGSIZE,
    ):
        self.matrix = matrix
        self.total_frames = total_frames
        self.circle, self.grid_lines, self.basis = prepare_shapes()

        u, singular_values, vt = np.linalg.svd(matrix)
        self.phases = [
            ("Apply $V^T$", vt),
            ("Scale by $Σ$", np.diag(singular_values)),
            ("Rotate with $U$", u),
        ]

        self.frames_per_phase = max(1, math.ceil(total_frames / len(self.phases)))
        self.phase_labels: List[str] = []

        self.fig, self.ax = plt.subplots(figsize=figsize)
        self.ax.set_xlim(-5, 5)
        self.ax.set_ylim(-5, 5)
        self.ax.set_aspect("equal")
        self.ax.grid(False)
        self.ax.set_xticks(range(-4, 5))
        self.ax.set_yticks(range(-4, 5))
        self.ax.axhline(0, color="#888888", linewidth=0.5)
        self.ax.axvline(0, color="#888888", linewidth=0.5)
        self.ax.set_title("Singular Value Decomposition")

        self.circle_line, = self.ax.plot([], [], color="#3A7", linewidth=2)
        self.grid_artists = [
            self.ax.plot([], [], color="#cccccc", linewidth=0.6, alpha=0.6)[0]
            for _ in range(len(self.grid_lines))
        ]
        self.basis_artists = [
            self.ax.arrow(0, 0, 0, 0, color=color, width=0.02, length_includes_head=True)
            for color in ("#E0A", "#28C")
        ]
        self.phase_text = self.ax.text(
            0.02,
            0.97,
            "",
            transform=self.ax.transAxes,
            ha="left",
            va="top",
            fontsize=14,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.85),
        )
        self.matrix_text = self.ax.text(
            0.02,
            0.87,
            self.format_matrix("A", matrix),
            transform=self.ax.transAxes,
            ha="left",
            va="top",
            fontsize=12,
            family="monospace",
        )

    @staticmethod
    def format_matrix(label: str, matrix: np.ndarray) -> str:
        return "{} = [\n  [{: .2f}, {: .2f}],\n  [{: .2f}, {: .2f}]\n]".format(
            label,
            matrix[0, 0],
            matrix[0, 1],
            matrix[1, 0],
            matrix[1, 1],
        )

    def current_transform(self, frame: int) -> Tuple[np.ndarray, str]:
        phase_index = min(frame // self.frames_per_phase, len(self.phases) - 1)
        alpha = (frame % self.frames_per_phase) / self.frames_per_phase
        if frame == self.total_frames - 1:
            alpha = 1.0
        transform = np.eye(2)
        for index, (label, matrix) in enumerate(self.phases):
            if index < phase_index:
                transform = transform @ matrix
            elif index == phase_index:
                transform = interpolate(transform, matrix, alpha)
                break
        else:
            label, _ = self.phases[-1]
        return transform, self.phases[phase_index][0]

    def apply_transform(self, points: np.ndarray, transform: np.ndarray) -> np.ndarray:
        return points @ transform.T

    def update(self, frame: int):
        transform, label = self.current_transform(frame)
        transformed_circle = self.apply_transform(self.circle, transform)
        self.circle_line.set_data(transformed_circle[:, 0], transformed_circle[:, 1])

        for artist, line in zip(self.grid_artists, self.grid_lines):
            transformed = self.apply_transform(line, transform)
            artist.set_data(transformed[:, 0], transformed[:, 1])

        transformed_basis = self.apply_transform(self.basis, transform)
        for artist, vector in zip(self.basis_artists, transformed_basis):
            artist.remove()
        self.basis_artists = []
        colors = ("#E0A", "#28C")
        for vector, color in zip(transformed_basis, colors):
            arrow = self.ax.arrow(
                0,
                0,
                vector[0],
                vector[1],
                color=color,
                width=0.02,
                length_includes_head=True,
            )
            self.basis_artists.append(arrow)

        self.phase_text.set_text(label)
        return [
            self.circle_line,
            *self.grid_artists,
            *self.basis_artists,
            self.phase_text,
            self.matrix_text,
        ]

    def animate(self, fps: int, output: Path, dpi: int) -> None:
        writer = self.select_writer(output, fps)
        animation_obj = animation.FuncAnimation(
            self.fig,
            self.update,
            frames=self.total_frames,
            interval=1000 / fps,
            blit=False,
        )
        output.parent.mkdir(parents=True, exist_ok=True)
        animation_obj.save(output, writer=writer, dpi=dpi)

    @staticmethod
    def select_writer(output: Path, fps: int):
        if output.suffix.lower() == ".gif":
            return animation.PillowWriter(fps=fps)
        try:
            return animation.FFMpegWriter(fps=fps)
        except Exception as error:  # pragma: no cover - depends on ffmpeg availability
            raise RuntimeError(
                "FFmpeg is required to write video files. Install it or output a GIF."
            ) from error


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    matrix = DEFAULT_MATRIX
    if args.matrix:
        matrix = np.array(args.matrix, dtype=float).reshape(2, 2)

    total_frames = max(1, int(args.duration * args.fps))
    animator = SVDAnimator(matrix, total_frames, figsize=tuple(args.figsize))
    try:
        animator.animate(args.fps, args.output, dpi=args.dpi)
    except RuntimeError as error:
        print(f"[generate_svd_animation] {error}")
        return 1
    finally:
        plt.close(animator.fig)
    print(f"[generate_svd_animation] Saved animation to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
