#!/usr/bin/env python3
"""
layout_viewer.py - ASCII layout viewer for pokeemerald maps.

Reads collision bits and metatile behavior from the binary layout data
and tileset attributes, then overlays object/event positions from map.json.

Usage:
    python3 tools/map-builder/scripts/layout_viewer.py <MapName>
    python3 tools/map-builder/scripts/layout_viewer.py Route101
    python3 tools/map-builder/scripts/layout_viewer.py Nulltown --legend
    python3 tools/map-builder/scripts/layout_viewer.py Route101 --no-objects
    python3 tools/map-builder/scripts/layout_viewer.py Route101 --metatiles
"""

import argparse
import sys

from maplib import (
    find_layout_for_map,
    parse_map_bin,
    load_metatile_attributes,
    get_behavior,
    classify_tile,
)


def build_object_overlay(map_data):
    overlay = {}

    for obj in map_data.get("object_events", []):
        x, y = obj["x"], obj["y"]
        script = obj.get("script", "")
        gfx = obj.get("graphics_id", "")
        is_trainer = obj.get("trainer_type", "TRAINER_TYPE_NONE") != "TRAINER_TYPE_NONE"

        if "ITEM_BALL" in gfx:
            marker = "I"
        elif is_trainer:
            marker = "T"
        else:
            marker = "N"
        label = script.split("_EventScript_")[-1] if "_EventScript_" in script else script
        overlay[(x, y)] = (marker, label)

    for bg in map_data.get("bg_events", []):
        x, y = bg["x"], bg["y"]
        bg_type = bg.get("type", "")
        if bg_type == "sign":
            script = bg.get("script", "")
            label = script.split("_EventScript_")[-1] if "_EventScript_" in script else script
            overlay[(x, y)] = ("s", label)
        elif bg_type == "hidden_item":
            item = bg.get("item", "?")
            overlay[(x, y)] = ("h", item.replace("ITEM_", ""))

    for coord in map_data.get("coord_events", []):
        x, y = coord["x"], coord["y"]
        if (x, y) not in overlay:
            overlay[(x, y)] = ("!", "trigger")

    for warp in map_data.get("warp_events", []):
        x, y = warp["x"], warp["y"]
        dest = warp.get("dest_map", "?").replace("MAP_", "")
        overlay[(x, y)] = ("W", dest)

    return overlay


def print_reference(map_name, map_data, width, height):
    """Print a compact, paste-friendly object reference for debugging."""
    print(f"## {map_name} ({width}x{height}) — Object Reference")
    print()

    objects = map_data.get("object_events", [])
    if objects:
        print(f"### object_events ({len(objects)})")
        for i, obj in enumerate(objects):
            kind = "item" if "ITEM_BALL" in obj.get("graphics_id", "") else \
                   "trainer" if obj.get("trainer_type", "TRAINER_TYPE_NONE") != "TRAINER_TYPE_NONE" else "npc"
            parts = [
                f"[{i}] {kind} @ ({obj['x']},{obj['y']}) elev={obj.get('elevation', 0)}",
                f"  gfx={obj.get('graphics_id', '?')}  move={obj.get('movement_type', '?')}",
                f"  script={obj.get('script', 'none')}",
            ]
            if obj.get("flag", "0") != "0":
                parts.append(f"  flag={obj['flag']}")
            if kind == "trainer":
                parts.append(f"  sight={obj.get('trainer_sight_or_berry_tree_id', '?')}")
            move_rx = obj.get("movement_range_x", 0)
            move_ry = obj.get("movement_range_y", 0)
            if move_rx or move_ry:
                parts.append(f"  range=({move_rx},{move_ry})")
            print("\n".join(parts))
        print()

    warps = map_data.get("warp_events", [])
    if warps:
        print(f"### warp_events ({len(warps)})")
        for i, w in enumerate(warps):
            dest = w.get("dest_map", "?").replace("MAP_", "")
            print(f"[{i}] ({w['x']},{w['y']}) elev={w.get('elevation', 0)} → {dest} warp_id={w.get('dest_warp_id', '?')}")
        print()

    coords = map_data.get("coord_events", [])
    if coords:
        print(f"### coord_events ({len(coords)})")
        for i, c in enumerate(coords):
            ctype = c.get("type", "?")
            var = c.get("var", "")
            var_val = c.get("var_value", "")
            script = c.get("script", "none")
            print(f"[{i}] {ctype} @ ({c['x']},{c['y']}) elev={c.get('elevation', 0)}  var={var}={var_val}  script={script}")
        print()

    bgs = map_data.get("bg_events", [])
    if bgs:
        print(f"### bg_events ({len(bgs)})")
        for i, bg in enumerate(bgs):
            bg_type = bg.get("type", "?")
            base = f"[{i}] {bg_type} @ ({bg['x']},{bg['y']}) elev={bg.get('elevation', 0)}"
            if bg_type == "sign":
                print(f"{base}  facing={bg.get('player_facing_dir', '?')}  script={bg.get('script', 'none')}")
            elif bg_type == "hidden_item":
                print(f"{base}  item={bg.get('item', '?')}  flag={bg.get('flag', '?')}")
            elif bg_type == "secret_base":
                print(f"{base}  id={bg.get('secret_base_id', '?')}")
            else:
                print(base)
        print()

    scripts = map_data.get("map_scripts", [])
    if scripts:
        print(f"### map_scripts ({len(scripts)})")
        for i, ms in enumerate(scripts):
            stype = ms.get("type", "?")
            if "entries" in ms:
                for entry in ms["entries"]:
                    print(f"[{i}] {stype}  var={entry.get('var', '?')}={entry.get('var_value', '?')}  script={entry.get('script', '?')}")
            else:
                print(f"[{i}] {stype}  script={ms.get('script', '?')}")


def render_grid(tile_grid, primary_attrs, secondary_attrs, overlay, width, height, show_objects):
    tens_header = "    " + "".join(f"{x // 10 if x >= 10 else ' '}" for x in range(width))
    col_header = "    " + "".join(f"{x % 10}" for x in range(width))

    lines = [tens_header, col_header]
    legend_entries = []

    for y in range(height):
        row_chars = []
        for x in range(width):
            if show_objects and (x, y) in overlay:
                marker, label = overlay[(x, y)]
                row_chars.append(marker)
                legend_entries.append(f"  ({x:2d},{y:2d}) {marker} = {label}")
            else:
                metatile_id, collision, elevation = tile_grid[y][x]
                behavior = get_behavior(metatile_id, primary_attrs, secondary_attrs)
                row_chars.append(classify_tile(metatile_id, collision, behavior))
        lines.append(f"{y:3d} " + "".join(row_chars))

    return "\n".join(lines), legend_entries


def main():
    parser = argparse.ArgumentParser(description="ASCII layout viewer for pokeemerald maps")
    parser.add_argument("map_name", help="Map directory name (e.g. Route101, Nulltown)")
    parser.add_argument("--no-objects", action="store_true", help="Hide object/event overlay")
    parser.add_argument("--legend", action="store_true", help="Show object legend below the map")
    parser.add_argument("--metatiles", action="store_true", help="Show raw metatile IDs")
    parser.add_argument("--collision", action="store_true", help="Show raw collision grid")
    parser.add_argument("--reference", action="store_true", help="Print paste-friendly object reference for debugging")
    args = parser.parse_args()

    layout_info, map_data = find_layout_for_map(args.map_name)
    width = layout_info["width"]
    height = layout_info["height"]
    bin_path = layout_info["blockdata_filepath"]

    if args.reference:
        print_reference(args.map_name, map_data, width, height)
        return

    tile_grid = parse_map_bin(bin_path, width, height)

    if args.metatiles:
        print(f"Metatile ID grid ({width}x{height}):")
        for y in range(height):
            row = " ".join(f"{tile_grid[y][x][0]:3d}" for x in range(width))
            print(f"y={y:2d}: {row}")
        return

    if args.collision:
        print(f"Collision grid ({width}x{height}): 0=passable, 1+=blocked")
        col_header = "    " + "".join(f"{x % 10}" for x in range(width))
        print(col_header)
        for y in range(height):
            row = "".join(str(tile_grid[y][x][1]) for x in range(width))
            print(f"{y:3d} " + row)
        return

    primary_attrs, secondary_attrs = load_metatile_attributes(
        layout_info["primary_tileset"], layout_info["secondary_tileset"]
    )

    overlay = build_object_overlay(map_data) if not args.no_objects else {}
    grid_str, legend_entries = render_grid(
        tile_grid, primary_attrs, secondary_attrs, overlay, width, height, not args.no_objects
    )

    print(f"Map: {args.map_name} ({width}x{height})")
    print(f"Layout: {layout_info['id']}")
    print(f"Tilesets: {layout_info['primary_tileset']} + {layout_info['secondary_tileset']}")
    print()
    print(grid_str)
    print()
    print("Tiles: . = passable  G = grass  # = blocked  = = ledge  ~ = water  D = door  , = sand  i = ice")
    if not args.no_objects:
        print("Objects: N = NPC  T = trainer  I = item  s = sign  h = hidden  W = warp  ! = trigger")

    if args.legend and legend_entries:
        print()
        print("Object legend:")
        for entry in legend_entries:
            print(entry)


if __name__ == "__main__":
    main()
