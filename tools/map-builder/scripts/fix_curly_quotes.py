#!/usr/bin/env python3
"""Replace PLACEHOLDER_*QUOTE markers with real UTF-8 curly quotes in .inc files.

Usage:
    python3 tools/map-builder/scripts/fix_curly_quotes.py <file>
    python3 tools/map-builder/scripts/fix_curly_quotes.py data/maps/Nulltown/scripts.inc
"""
import sys

REPLACEMENTS = {
    "PLACEHOLDER_LDQUOTE": "\u201c",
    "PLACEHOLDER_RDQUOTE": "\u201d",
    "PLACEHOLDER_LSQUOTE": "\u2018",
    "PLACEHOLDER_RSQUOTE": "\u2019",
}

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    count = 0
    for placeholder, char in REPLACEMENTS.items():
        n = text.count(placeholder)
        if n:
            text = text.replace(placeholder, char)
            count += n

    if count:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Replaced {count} placeholder(s) in {path}")
    else:
        print(f"No placeholders found in {path}")

if __name__ == "__main__":
    main()
