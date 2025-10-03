#!/usr/bin/env python3
"""Materialize the bundled SVD fallback animation without storing binary assets."""
from __future__ import annotations

import argparse
import base64
import lzma
from pathlib import Path
from typing import Iterable, Optional

DEFAULT_DATA_PATH = Path("_2025/svd/svd_animation.b85")
DEFAULT_OUTPUT_PATH = Path("_2025/svd/svd_animation.gif")


def decode_animation_bytes(data_path: Path = DEFAULT_DATA_PATH) -> bytes:
    """Return the GIF bytes stored in *data_path*."""
    if not data_path.exists():
        raise FileNotFoundError(
            f"Encoded animation data not found at {data_path}. Regenerate it via "
            "tools/generate_svd_animation.py."
        )
    encoded = data_path.read_text().split()
    packed = "".join(encoded)
    compressed = base64.b85decode(packed)
    return lzma.decompress(compressed)


def write_animation(
    output_path: Path = DEFAULT_OUTPUT_PATH,
    data_path: Path = DEFAULT_DATA_PATH,
) -> Path:
    """Decode and write the bundled animation to *output_path*."""
    gif_bytes = decode_animation_bytes(data_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(gif_bytes)
    return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Decode the text-encoded SVD fallback animation and write it to disk."
        )
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=(
            "Destination for the GIF (default: %(default)s). The directory will be "
            "created if necessary."
        ),
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help=(
            "Where to read the encoded animation data from (default: %(default)s)."
        ),
    )
    return parser


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    output_path = write_animation(args.output, args.data)
    print(f"[svd_animation_asset] wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
