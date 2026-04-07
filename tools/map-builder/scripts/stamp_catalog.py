#!/usr/bin/env python3
"""
stamp_catalog.py - Extract and manage building stamp patterns from pokeemerald maps.

Stamps are multi-tile building templates (houses, Pokemon Centers, marts) that
can be placed as atomic units by the WFC solver. Stamps are extracted from
canonical town maps where buildings are known.

Usage:
    # Auto-detect buildings and extract stamps from canonical towns
    python3 stamp_catalog.py extract

    # Extract a specific region from a map
    python3 stamp_catalog.py region PetalburgCity 18 14 4 3

    # List stamps in the catalog
    python3 stamp_catalog.py list

    # Show a stamp as ASCII
    python3 stamp_catalog.py show house_small_petalburg
"""

import argparse
import json
import os
import sys

from maplib import (
    PROJECT_ROOT,
    find_layout_for_map,
    parse_map_bin,
    load_metatile_attributes,
    get_behavior,
    classify_tile,
    DOOR_BEHAVIORS,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(SCRIPT_DIR, "stamp_catalog.json")


def extract_region(map_name, x, y, w, h):
    """Extract a metatile region from a map.

    Returns dict with metatiles (2D grid of IDs), collision, elevation,
    and detected door offsets.
    """
    layout, map_data = find_layout_for_map(map_name)
    grid = parse_map_bin(layout["blockdata_filepath"],
                         layout["width"], layout["height"])
    primary_attrs, secondary_attrs = load_metatile_attributes(
        layout["primary_tileset"], layout["secondary_tileset"]
    )

    metatiles = []
    collisions = []
    elevations = []
    door_offsets = []

    for ry in range(y, y + h):
        mt_row = []
        col_row = []
        elev_row = []
        for rx in range(x, x + w):
            if 0 <= rx < layout["width"] and 0 <= ry < layout["height"]:
                mid, col, elev = grid[ry][rx]
                mt_row.append(mid)
                col_row.append(col)
                elev_row.append(elev)

                behavior = get_behavior(mid, primary_attrs, secondary_attrs)
                if behavior in DOOR_BEHAVIORS:
                    door_offsets.append({"x": rx - x, "y": ry - y})
            else:
                mt_row.append(0)
                col_row.append(1)
                elev_row.append(0)
        metatiles.append(mt_row)
        collisions.append(col_row)
        elevations.append(elev_row)

    return {
        "metatiles": metatiles,
        "collisions": collisions,
        "elevations": elevations,
        "door_offsets": door_offsets,
        "width": w,
        "height": h,
        "source_map": map_name,
        "source_x": x,
        "source_y": y,
        "tileset_pair": [layout["primary_tileset"], layout["secondary_tileset"]],
    }


def render_stamp_ascii(stamp, primary_attrs=None, secondary_attrs=None):
    """Render a stamp as ASCII art for visualization."""
    lines = []
    w = stamp["width"]
    col_header = "  " + "".join(f"{x % 10}" for x in range(w))
    lines.append(col_header)

    for y, row in enumerate(stamp["metatiles"]):
        chars = []
        for x, mid in enumerate(row):
            is_door = any(d["x"] == x and d["y"] == y
                          for d in stamp.get("door_offsets", []))
            if is_door:
                chars.append("D")
            else:
                col = stamp["collisions"][y][x]
                if primary_attrs and secondary_attrs:
                    behavior = get_behavior(mid, primary_attrs, secondary_attrs)
                    chars.append(classify_tile(mid, col, behavior))
                else:
                    chars.append("." if col == 0 else "#")
        lines.append(f"{y:2d} " + "".join(chars))

    return "\n".join(lines)


# Known building regions from canonical towns.
# Format: (map_name, x, y, w, h, stamp_name)
KNOWN_BUILDINGS = [
    # Petalburg City
    ("PetalburgCity", 4, 3, 7, 4, "wally_house"),
    ("PetalburgCity", 11, 5, 7, 4, "petalburg_gym"),
    ("PetalburgCity", 23, 10, 6, 3, "mart_petalburg"),
    ("PetalburgCity", 18, 14, 5, 3, "pokecenter_petalburg"),
    ("PetalburgCity", 7, 17, 6, 3, "house_small_petalburg"),
    ("PetalburgCity", 18, 22, 6, 3, "house2_petalburg"),

    # Oldale Town
    ("OldaleTown", 3, 3, 5, 3, "pokecenter_oldale"),
    ("OldaleTown", 12, 3, 5, 3, "mart_oldale"),

    # Rustboro City
    ("RustboroCity", 26, 5, 8, 5, "pokecenter_rustboro"),
    ("RustboroCity", 9, 28, 5, 4, "mart_rustboro"),

    # Slateport City
    ("SlateportCity", 6, 3, 6, 4, "pokecenter_slateport"),
    ("SlateportCity", 26, 8, 5, 3, "mart_slateport"),

    # Mauville City
    ("MauvilleCity", 20, 5, 6, 4, "pokecenter_mauville"),
    ("MauvilleCity", 6, 15, 5, 3, "mart_mauville"),

    # Lilycove City
    ("LilycoveCity", 44, 4, 8, 5, "pokecenter_lilycove"),
    ("LilycoveCity", 63, 2, 6, 5, "mart_lilycove"),
]


def extract_all_known():
    """Extract all known building stamps from canonical maps."""
    catalog = {"stamps": {}, "metadata": {"source": "auto-extracted from canonical maps"}}

    for map_name, x, y, w, h, name in KNOWN_BUILDINGS:
        try:
            stamp = extract_region(map_name, x, y, w, h)
            stamp["name"] = name
            catalog["stamps"][name] = stamp
            print(f"  Extracted {name} from {map_name} ({w}x{h})")
        except Exception as e:
            print(f"  Warning: failed to extract {name} from {map_name}: {e}",
                  file=sys.stderr)

    return catalog


def load_catalog():
    """Load the stamp catalog from disk."""
    if not os.path.exists(CATALOG_PATH):
        return {"stamps": {}, "metadata": {}}
    with open(CATALOG_PATH) as f:
        return json.load(f)


def save_catalog(catalog):
    """Save the stamp catalog to disk."""
    with open(CATALOG_PATH, "w") as f:
        json.dump(catalog, f, indent=2)
    size = os.path.getsize(CATALOG_PATH)
    print(f"Wrote {CATALOG_PATH} ({size / 1024:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(
        description="Extract and manage building stamp patterns"
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("extract", help="Extract stamps from canonical towns")

    region_parser = sub.add_parser("region", help="Extract a specific region")
    region_parser.add_argument("map_name")
    region_parser.add_argument("x", type=int)
    region_parser.add_argument("y", type=int)
    region_parser.add_argument("w", type=int)
    region_parser.add_argument("h", type=int)
    region_parser.add_argument("--name", default=None)

    sub.add_parser("list", help="List stamps in catalog")

    show_parser = sub.add_parser("show", help="Show a stamp as ASCII")
    show_parser.add_argument("stamp_name")

    args = parser.parse_args()

    if args.command == "extract":
        print("Extracting stamps from canonical towns...")
        catalog = extract_all_known()
        save_catalog(catalog)
        print(f"Extracted {len(catalog['stamps'])} stamps")

    elif args.command == "region":
        stamp = extract_region(args.map_name, args.x, args.y, args.w, args.h)
        name = args.name or f"custom_{args.map_name}_{args.x}_{args.y}"
        stamp["name"] = name
        print(json.dumps(stamp, indent=2))

    elif args.command == "list":
        catalog = load_catalog()
        if not catalog["stamps"]:
            print("No stamps in catalog. Run 'extract' first.")
            return
        for name, stamp in sorted(catalog["stamps"].items()):
            doors = len(stamp.get("door_offsets", []))
            src = stamp.get("source_map", "?")
            tp = stamp.get("tileset_pair", ["?", "?"])
            print(f"  {name:30s} {stamp['width']}x{stamp['height']}  "
                  f"doors={doors}  from={src}  tileset={tp[1]}")

    elif args.command == "show":
        catalog = load_catalog()
        if args.stamp_name not in catalog["stamps"]:
            print(f"Stamp '{args.stamp_name}' not found", file=sys.stderr)
            sys.exit(1)
        stamp = catalog["stamps"][args.stamp_name]
        tp = stamp.get("tileset_pair", [None, None])
        primary_attrs = secondary_attrs = None
        if tp[0] and tp[1]:
            primary_attrs, secondary_attrs = load_metatile_attributes(tp[0], tp[1])
        print(f"Stamp: {args.stamp_name} ({stamp['width']}x{stamp['height']})")
        print(f"Source: {stamp.get('source_map', '?')} "
              f"at ({stamp.get('source_x', '?')}, {stamp.get('source_y', '?')})")
        print(f"Doors: {stamp.get('door_offsets', [])}")
        print()
        print(render_stamp_ascii(stamp, primary_attrs, secondary_attrs))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
