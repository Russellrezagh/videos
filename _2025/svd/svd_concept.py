diff --git a//dev/null b/tools/render_scene.py
index 0000000000000000000000000000000000000000..9a9a3327171e4d1e1725f2303a64c6738d65423f 100755
--- a//dev/null
+++ b/tools/render_scene.py
@@ -0,0 +1,132 @@
+#!/usr/bin/env python3
+"""Utility for rendering manim scenes with helpful dependency checks."""
+from __future__ import annotations
+
+import argparse
+import os
+import shutil
+import subprocess
+import sys
+from pathlib import Path
+from typing import List
+
+REPO_ROOT = Path(__file__).resolve().parents[1]
+
+
+def build_parser() -> argparse.ArgumentParser:
+    parser = argparse.ArgumentParser(
+        description=(
+            "Render a scene using manimgl while providing clear guidance when "
+            "dependencies such as manimgl or xvfb-run are missing."
+        )
+    )
+    parser.add_argument(
+        "module",
+        help=(
+            "Path to the Python module that defines the scene. Relative paths "
+            "are resolved from the repository root."
+        ),
+    )
+    parser.add_argument(
+        "scene",
+        help="Name of the Scene subclass to render.",
+    )
+    parser.add_argument(
+        "extra",
+        nargs=argparse.REMAINDER,
+        help="Additional arguments passed directly to manimgl (after --).",
+    )
+    parser.add_argument(
+        "--manimgl",
+        dest="manimgl_binary",
+        help="Path to the manimgl executable. Defaults to the one on PATH.",
+    )
+    parser.add_argument(
+        "--skip-xvfb",
+        action="store_true",
+        help="Disable the xvfb-run wrapper even if it is available.",
+    )
+    parser.add_argument(
+        "--xvfb-screen",
+        default="-screen 0 1920x1080x24",
+        help="Screen configuration string passed to xvfb-run.",
+    )
+    return parser
+
+
+def ensure_module_path(module: str) -> Path:
+    path = Path(module)
+    if not path.is_absolute():
+        path = REPO_ROOT / path
+    if not path.exists():
+        raise FileNotFoundError(f"Could not find scene module at {path}")
+    return path
+
+
+def build_command(args: argparse.Namespace, module_path: Path) -> List[str]:
+    manimgl_path = args.manimgl_binary or shutil.which("manimgl")
+    if not manimgl_path:
+        raise FileNotFoundError(
+            "manimgl executable not found. Install the 3Blue1Brown fork of "
+            "Manim and ensure `manimgl` is on your PATH or pass --manimgl."
+        )
+
+    command: List[str] = []
+    if not args.skip_xvfb:
+        xvfb_path = shutil.which("xvfb-run")
+        if xvfb_path:
+            command.extend([xvfb_path, "-s", args.xvfb_screen])
+        else:
+            print(
+                "[render_scene] xvfb-run not found. Running manimgl without "
+                "virtual display support.",
+                file=sys.stderr,
+            )
+    command.append(manimgl_path)
+    command.append(str(module_path))
+    command.append(args.scene)
+
+    if args.extra:
+        if args.extra[0] == "--":
+            command.extend(args.extra[1:])
+        else:
+            command.extend(args.extra)
+    return command
+
+
+def update_pythonpath(env: dict) -> None:
+    existing = env.get("PYTHONPATH")
+    repo_path = str(REPO_ROOT)
+    if existing:
+        paths = existing.split(os.pathsep)
+        if repo_path not in paths:
+            env["PYTHONPATH"] = os.pathsep.join([repo_path, existing])
+    else:
+        env["PYTHONPATH"] = repo_path
+
+
+def main(argv: list[str] | None = None) -> int:
+    parser = build_parser()
+    args = parser.parse_args(argv)
+
+    try:
+        module_path = ensure_module_path(args.module)
+        command = build_command(args, module_path)
+    except FileNotFoundError as error:
+        print(f"[render_scene] {error}", file=sys.stderr)
+        return 1
+
+    env = os.environ.copy()
+    update_pythonpath(env)
+
+    print("[render_scene] Executing:", " ".join(command))
+    try:
+        process = subprocess.run(command, env=env, check=False)
+    except FileNotFoundError as error:
+        print(f"[render_scene] Failed to execute command: {error}", file=sys.stderr)
+        return 1
+    return process.returncode
+
+
+if __name__ == "__main__":
+    sys.exit(main())

