#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SVG = HERE / "icon.svg"
PNG = HERE / "icon-128.png"
SIZE = 128


def main():
    if not SVG.is_file():
        print(f"error: {SVG} not found", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        ["rsvg-convert", "-w", str(SIZE), "-h", str(SIZE), "-o", str(PNG), str(SVG)],
    )
    if result.returncode != 0:
        print("error: rsvg-convert failed (is librsvg installed?)", file=sys.stderr)
        sys.exit(1)

    print(f"saved {PNG}")


if __name__ == "__main__":
    main()
