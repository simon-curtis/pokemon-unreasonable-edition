#!/usr/bin/env python3
"""
seed_generator.py - Generate WFC seed grids from high-level map descriptions.

Converts compact route/town descriptions into the verbose JSON seed grids
that the WFC solver consumes. Saves Claude from writing NxM JSON arrays.

Usage:
    # Route with winding path, ledges, water feature
    python3 seed_generator.py route --width 24 --height 30 \\
        --path "S:12,29 -> 12,20 -> 6,14 -> 6,8 -> 12,2 -> N:12,0" \\
        --grass-width 3 \\
        --ledge "4,12:10" --ledge "4,20:10" \\
        --pond "16,10:4x6" \\
        --border 3 \\
        --output /tmp/seed.json

    # Town with buildings
    python3 seed_generator.py town --width 20 --height 20 \\
        --path "S:10,19 -> 10,10 -> N:10,0" \\
        --stamp "pokecenter_petalburg:5,3" \\
        --stamp "house_small_petalburg:12,8" \\
        --border 2 \\
        --output /tmp/seed.json
"""

import argparse
import json
import math
import os
import sys


def parse_path_spec(spec, width, height):
    """Parse a path specification string into a list of waypoints.

    Format: "S:x,y -> x,y -> x,y -> N:x,y"
    S: = south entry, N: = north entry, E: = east, W: = west
    """
    waypoints = []
    for segment in spec.split("->"):
        segment = segment.strip()
        if ":" in segment:
            prefix, coords = segment.split(":", 1)
            x, y = map(int, coords.strip().split(","))
            waypoints.append((x, y, prefix.strip()))
        else:
            x, y = map(int, segment.split(","))
            waypoints.append((x, y, None))
    return waypoints


def bresenham_thick(x0, y0, x1, y1, thickness):
    """Generate tiles along a thick line between two points."""
    tiles = set()
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    steps = max(dx, dy)
    if steps == 0:
        for tx in range(x0 - thickness, x0 + thickness + 1):
            for ty in range(y0 - thickness, y0 + thickness + 1):
                tiles.add((tx, ty))
        return tiles

    for i in range(steps + 1):
        t = i / steps
        cx = round(x0 + t * (x1 - x0))
        cy = round(y0 + t * (y1 - y0))
        for tx in range(cx - thickness, cx + thickness + 1):
            for ty in range(cy - thickness, cy + thickness + 1):
                tiles.add((tx, ty))
    return tiles


def generate_seed_grid(width, height, tileset_pair, paths=None, grass_width=2,
                        ledges=None, ponds=None, stamps=None, border=2,
                        path_width=1):
    """Generate a seed grid from high-level parameters.

    Args:
        width, height: Grid dimensions
        tileset_pair: [primary, secondary] tileset labels
        paths: List of path waypoint lists
        grass_width: Grass border width around paths
        ledges: List of (x, y, length) for south-facing ledges
        ponds: List of (x, y, w, h) for water bodies
        stamps: List of (name, x, y) for building stamps
        border: Tree border thickness
        path_width: Path corridor half-width
    """
    # Start with all null (unconstrained)
    grid = [[None for _ in range(width)] for _ in range(height)]

    # Apply tree border
    for y in range(height):
        for x in range(width):
            if (x < border or x >= width - border or
                    y < border or y >= height - border):
                grid[y][x] = "trees"

    # Apply paths
    path_tiles = set()
    if paths:
        for waypoints in paths:
            for i in range(len(waypoints) - 1):
                x0, y0, _ = waypoints[i]
                x1, y1, _ = waypoints[i + 1]
                path_tiles |= bresenham_thick(x0, y0, x1, y1, path_width)

    # Mark path tiles
    for x, y in path_tiles:
        if 0 <= x < width and 0 <= y < height:
            grid[y][x] = "path"

    # Apply grass around paths
    grass_tiles = set()
    if grass_width > 0 and path_tiles:
        for px, py in path_tiles:
            for dx in range(-grass_width - path_width, grass_width + path_width + 1):
                for dy in range(-grass_width - path_width, grass_width + path_width + 1):
                    gx, gy = px + dx, py + dy
                    if (gx, gy) not in path_tiles:
                        dist = max(abs(dx) - path_width, 0) + max(abs(dy) - path_width, 0)
                        if dist <= grass_width:
                            grass_tiles.add((gx, gy))

    for x, y in grass_tiles:
        if 0 <= x < width and 0 <= y < height:
            in_border = (x < border or x >= width - border or
                         y < border or y >= height - border)
            if grid[y][x] is None or (grid[y][x] == "trees" and not in_border):
                grid[y][x] = "grass"

    # Apply ledges (south-facing by default)
    if ledges:
        for lx, ly, length in ledges:
            for dx in range(length):
                x = lx + dx
                if 0 <= x < width and 0 <= ly < height:
                    grid[ly][x] = "ledge_south"

    # Apply water bodies
    if ponds:
        for px, py, pw, ph in ponds:
            for dy in range(ph):
                for dx in range(pw):
                    x, y = px + dx, py + dy
                    if 0 <= x < width and 0 <= y < height:
                        grid[y][x] = "water"

    # Ensure entry/exit points are path (cut through border)
    if paths:
        for waypoints in paths:
            for x, y, prefix in waypoints:
                if prefix in ("S", "N", "E", "W"):
                    # Clear border at entry/exit
                    for bx in range(max(0, x - path_width),
                                     min(width, x + path_width + 1)):
                        for by in range(max(0, y - 1), min(height, y + 2)):
                            if grid[by][bx] == "trees":
                                grid[by][bx] = "path"

    # Fill remaining null cells with trees (default terrain is forest)
    for y in range(height):
        for x in range(width):
            if grid[y][x] is None:
                grid[y][x] = "trees"

    # Build stamp list
    stamp_list = []
    if stamps:
        for name, sx, sy in stamps:
            stamp_list.append({"name": name, "x": sx, "y": sy})
            # Clear stamp area in grid (stamps handle their own tiles)
            # We don't know stamp dimensions here, so leave as null
            # The WFC solver handles stamp placement

    return {
        "width": width,
        "height": height,
        "tileset_pair": tileset_pair,
        "elevation_default": 3,
        "grid": grid,
        "stamps": stamp_list,
    }


def parse_ledge_spec(spec):
    """Parse 'x,y:length' ledge specification."""
    pos, length = spec.split(":")
    x, y = map(int, pos.split(","))
    return (x, y, int(length))


def parse_pond_spec(spec):
    """Parse 'x,y:wxh' pond specification."""
    pos, dims = spec.split(":")
    x, y = map(int, pos.split(","))
    w, h = map(int, dims.lower().split("x"))
    return (x, y, w, h)


def parse_stamp_spec(spec):
    """Parse 'name:x,y' stamp specification."""
    name, pos = spec.split(":", 1)
    x, y = map(int, pos.split(","))
    return (name, x, y)


def main():
    parser = argparse.ArgumentParser(
        description="Generate WFC seed grids from high-level descriptions"
    )
    parser.add_argument("type", choices=["route", "town", "cave"],
                        help="Map type")
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--path", action="append", default=[],
                        help="Path spec: 'S:x,y -> x,y -> N:x,y'")
    parser.add_argument("--path-width", type=int, default=1,
                        help="Path corridor half-width (default: 1)")
    parser.add_argument("--grass-width", type=int, default=2,
                        help="Grass border around paths (default: 2)")
    parser.add_argument("--ledge", action="append", default=[],
                        help="South ledge: 'x,y:length'")
    parser.add_argument("--pond", action="append", default=[],
                        help="Water body: 'x,y:wxh'")
    parser.add_argument("--stamp", action="append", default=[],
                        help="Building stamp: 'name:x,y'")
    parser.add_argument("--border", type=int, default=2,
                        help="Tree border thickness (default: 2)")
    parser.add_argument("--tilesets", nargs=2,
                        default=["gTileset_General", "gTileset_Petalburg"],
                        help="Primary and secondary tileset")
    parser.add_argument("--output", "-o", default=None,
                        help="Output path (default: stdout)")
    parser.add_argument("--preview", action="store_true",
                        help="Show ASCII preview of seed grid")
    args = parser.parse_args()

    # Parse path specifications
    paths = [parse_path_spec(p, args.width, args.height) for p in args.path]

    # Parse other specs
    ledges = [parse_ledge_spec(l) for l in args.ledge]
    ponds = [parse_pond_spec(p) for p in args.pond]
    stamps = [parse_stamp_spec(s) for s in args.stamp]

    seed = generate_seed_grid(
        args.width, args.height, args.tilesets,
        paths=paths, grass_width=args.grass_width,
        ledges=ledges, ponds=ponds, stamps=stamps,
        border=args.border, path_width=args.path_width,
    )

    if args.preview:
        # ASCII preview of the seed grid
        zone_chars = {
            "trees": "#", "path": ".", "grass": "G", "water": "~",
            "ledge_south": "=", "ledge_east": ">", "ledge_west": "<",
            "sand": ",", "cave": "c", "ice": "i",
            "open": "o", "blocked": "X", None: " ",
        }
        print(f"Seed grid preview ({args.width}x{args.height}):")
        header = "    " + "".join(f"{x % 10}" for x in range(args.width))
        print(header)
        for y, row in enumerate(seed["grid"]):
            chars = "".join(zone_chars.get(z, "?") for z in row)
            print(f"{y:3d} {chars}")
        print()
        print("Legend: # = trees  . = path  G = grass  ~ = water  = = ledge  (space) = unconstrained")
        if stamps:
            print(f"Stamps: {[s['name'] for s in seed['stamps']]}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(seed, f, indent=2)
        print(f"Wrote {args.output}")
    elif not args.preview:
        json.dump(seed, sys.stdout, indent=2)
        print()


if __name__ == "__main__":
    main()
