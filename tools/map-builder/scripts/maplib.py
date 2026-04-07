#!/usr/bin/env python3
"""
maplib.py - Shared library for pokeemerald map tools.

Provides tile parsing, tileset loading, behavior lookup, and map data access.
Extracted from layout_viewer.py for reuse across map generation and query tools.
"""

import json
import os
import re
import struct

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

NUM_PRIMARY_METATILES = 512

# ---------------------------------------------------------------------------
# Metatile behavior constants (from include/constants/metatile_behaviors.h)
# ---------------------------------------------------------------------------

MB_NORMAL = 0x00
MB_TALL_GRASS = 0x02
MB_LONG_GRASS = 0x03
MB_DEEP_SAND = 0x06
MB_SHORT_GRASS = 0x07
MB_CAVE = 0x08
MB_LONG_GRASS_SOUTH_EDGE = 0x09
MB_POND_WATER = 0x10
MB_INTERIOR_DEEP_WATER = 0x11
MB_DEEP_WATER = 0x12
MB_WATERFALL = 0x13
MB_SOOTOPOLIS_DEEP_WATER = 0x14
MB_OCEAN_WATER = 0x15
MB_PUDDLE = 0x16
MB_SHALLOW_WATER = 0x17
MB_NO_SURFACING = 0x19
MB_ICE = 0x20
MB_SAND = 0x21
MB_SEAWEED = 0x22
MB_ASHGRASS = 0x24
MB_FOOTPRINTS = 0x25
MB_THIN_ICE = 0x26
MB_CRACKED_ICE = 0x27
MB_HOT_SPRINGS = 0x28

MB_JUMP_EAST = 0x38
MB_JUMP_WEST = 0x39
MB_JUMP_NORTH = 0x3A
MB_JUMP_SOUTH = 0x3B
MB_JUMP_NORTHEAST = 0x3C
MB_JUMP_NORTHWEST = 0x3D
MB_JUMP_SOUTHEAST = 0x3E
MB_JUMP_SOUTHWEST = 0x3F

MB_NON_ANIMATED_DOOR = 0x60
MB_LADDER = 0x61
MB_ANIMATED_DOOR = 0x69

MB_COUNTER = 0x81
MB_PC = 0x84
MB_TELEVISION = 0x87

# Behavior category sets
GRASS_BEHAVIORS = {MB_TALL_GRASS, MB_LONG_GRASS, MB_LONG_GRASS_SOUTH_EDGE, MB_ASHGRASS}
WATER_BEHAVIORS = {
    MB_POND_WATER, MB_INTERIOR_DEEP_WATER, MB_DEEP_WATER, MB_WATERFALL,
    MB_SOOTOPOLIS_DEEP_WATER, MB_OCEAN_WATER, MB_PUDDLE, MB_SHALLOW_WATER,
    MB_NO_SURFACING, MB_SEAWEED,
}
LEDGE_BEHAVIORS = {
    MB_JUMP_EAST, MB_JUMP_WEST, MB_JUMP_NORTH, MB_JUMP_SOUTH,
    MB_JUMP_NORTHEAST, MB_JUMP_NORTHWEST, MB_JUMP_SOUTHEAST, MB_JUMP_SOUTHWEST,
}
DOOR_BEHAVIORS = {MB_NON_ANIMATED_DOOR, MB_ANIMATED_DOOR}
SAND_BEHAVIORS = {MB_DEEP_SAND, MB_SAND, MB_FOOTPRINTS}
ICE_BEHAVIORS = {MB_ICE, MB_THIN_ICE, MB_CRACKED_ICE}

# Map from category name to behavior set
BEHAVIOR_CATEGORIES = {
    "grass": GRASS_BEHAVIORS,
    "water": WATER_BEHAVIORS,
    "ledge": LEDGE_BEHAVIORS,
    "door": DOOR_BEHAVIORS,
    "sand": SAND_BEHAVIORS,
    "ice": ICE_BEHAVIORS,
    "cave": {MB_CAVE},
    "hot_springs": {MB_HOT_SPRINGS},
    "ladder": {MB_LADDER},
    "counter": {MB_COUNTER},
    "pc": {MB_PC},
    "television": {MB_TELEVISION},
}


# ---------------------------------------------------------------------------
# Tileset path resolution
# ---------------------------------------------------------------------------

_tileset_path_map = None


def build_tileset_path_map():
    """Parse tileset headers to build label -> metatile_attributes.bin path mapping."""
    headers_path = os.path.join(PROJECT_ROOT, "src", "data", "tilesets", "headers.h")
    metatiles_path = os.path.join(PROJECT_ROOT, "src", "data", "tilesets", "metatiles.h")

    sym_to_path = {}
    with open(metatiles_path) as f:
        for m in re.finditer(r'const u16 (\w+)\[\] = INCBIN_U16\("([^"]+)"\)', f.read()):
            sym_to_path[m.group(1)] = m.group(2)

    label_to_path = {}
    current_label = None
    with open(headers_path) as f:
        for line in f:
            m = re.match(r'const struct Tileset (\w+)', line)
            if m:
                current_label = m.group(1)
            m = re.match(r'\s*\.metatileAttributes = (\w+)', line)
            if m and current_label:
                sym = m.group(1)
                if sym in sym_to_path:
                    label_to_path[current_label] = sym_to_path[sym]
                current_label = None

    return label_to_path


def find_tileset_attributes_path(tileset_label):
    """Resolve a tileset label (e.g. gTileset_General) to its metatile_attributes.bin path."""
    global _tileset_path_map
    if _tileset_path_map is None:
        _tileset_path_map = build_tileset_path_map()
    path = _tileset_path_map.get(tileset_label)
    if path:
        return os.path.join(PROJECT_ROOT, path)
    return None


def load_metatile_attributes(primary_tileset, secondary_tileset):
    """Load behavior data from both tileset attribute files."""
    import sys
    primary_path = find_tileset_attributes_path(primary_tileset)
    secondary_path = find_tileset_attributes_path(secondary_tileset)

    primary_attrs = b""
    secondary_attrs = b""

    if primary_path:
        with open(primary_path, "rb") as f:
            primary_attrs = f.read()
    else:
        print(f"Warning: could not find attributes for {primary_tileset}", file=sys.stderr)

    if secondary_path:
        with open(secondary_path, "rb") as f:
            secondary_attrs = f.read()
    else:
        print(f"Warning: could not find attributes for {secondary_tileset}", file=sys.stderr)

    return primary_attrs, secondary_attrs


# ---------------------------------------------------------------------------
# Metatile behavior lookup
# ---------------------------------------------------------------------------

def get_behavior(metatile_id, primary_attrs, secondary_attrs):
    """Look up the behavior byte for a metatile ID."""
    if metatile_id < NUM_PRIMARY_METATILES:
        offset = metatile_id * 2
        if offset + 2 <= len(primary_attrs):
            return struct.unpack_from("<H", primary_attrs, offset)[0] & 0xFF
    else:
        offset = (metatile_id - NUM_PRIMARY_METATILES) * 2
        if offset + 2 <= len(secondary_attrs):
            return struct.unpack_from("<H", secondary_attrs, offset)[0] & 0xFF
    return MB_NORMAL


def classify_behavior(behavior):
    """Classify a metatile behavior into a category string.

    Returns one of: "grass", "water", "ledge", "door", "sand", "ice",
    "cave", "hot_springs", "ladder", "counter", "pc", "television",
    "normal", or "unknown".
    """
    for category, behavior_set in BEHAVIOR_CATEGORIES.items():
        if behavior in behavior_set:
            return category
    if behavior == MB_NORMAL:
        return "normal"
    return "unknown"


def classify_tile(metatile_id, collision, behavior):
    """Classify a tile for ASCII display. Returns a single character.

    Used by layout_viewer and other visualization tools.
    """
    if behavior in GRASS_BEHAVIORS:
        return "G"
    if behavior in WATER_BEHAVIORS:
        return "~"
    if behavior in LEDGE_BEHAVIORS:
        return "="
    if behavior in DOOR_BEHAVIORS:
        return "D"
    if behavior in ICE_BEHAVIORS:
        return "i"
    if behavior in SAND_BEHAVIORS:
        return ","
    if behavior == MB_CAVE:
        return "."
    if behavior == MB_HOT_SPRINGS:
        return "~"
    if collision == 0:
        return "."
    return "#"


# ---------------------------------------------------------------------------
# Layout and map data loading
# ---------------------------------------------------------------------------

def load_layouts_json():
    """Load and return the full layouts.json data."""
    layouts_path = os.path.join(PROJECT_ROOT, "data", "layouts", "layouts.json")
    with open(layouts_path) as f:
        return json.load(f)


def load_map_json(map_name):
    """Load and return a map's map.json data."""
    map_json_path = os.path.join(PROJECT_ROOT, "data", "maps", map_name, "map.json")
    with open(map_json_path) as f:
        return json.load(f)


def find_layout_for_map(map_name):
    """Find the layout entry and map data for a given map name.

    Returns (layout_dict, map_data_dict).
    """
    map_data = load_map_json(map_name)
    layout_id = map_data["layout"]
    layouts = load_layouts_json()

    for layout in layouts["layouts"]:
        if layout["id"] == layout_id:
            return layout, map_data

    raise ValueError(f"Layout {layout_id} not found in layouts.json")


def parse_map_bin(bin_path, width, height):
    """Parse map.bin into per-tile (metatile_id, collision, elevation) tuples.

    Args:
        bin_path: Path to map.bin (relative to PROJECT_ROOT or absolute)
        width: Layout width in metatiles
        height: Layout height in metatiles

    Returns:
        2D list [y][x] of (metatile_id, collision, elevation) tuples
    """
    import sys
    if not os.path.isabs(bin_path):
        bin_path = os.path.join(PROJECT_ROOT, bin_path)

    with open(bin_path, "rb") as f:
        data = f.read()

    expected = width * height * 2
    if len(data) < expected:
        print(f"Warning: map.bin is {len(data)} bytes, expected {expected}", file=sys.stderr)

    grid = []
    for y in range(height):
        row = []
        for x in range(width):
            offset = (y * width + x) * 2
            if offset + 2 <= len(data):
                tile = struct.unpack_from("<H", data, offset)[0]
                metatile_id = tile & 0x3FF
                collision = (tile >> 10) & 0x3
                elevation = (tile >> 12) & 0xF
            else:
                metatile_id, collision, elevation = 0, 1, 0
            row.append((metatile_id, collision, elevation))
        grid.append(row)
    return grid


def pack_tile(metatile_id, collision, elevation):
    """Pack metatile_id, collision, and elevation into a u16 value."""
    return (metatile_id & 0x3FF) | ((collision & 0x3) << 10) | ((elevation & 0xF) << 12)


# ---------------------------------------------------------------------------
# Tileset enumeration
# ---------------------------------------------------------------------------

def all_tileset_pairs():
    """Return all unique (primary_tileset, secondary_tileset, [layout_entries]) groups.

    Iterates layouts.json and groups layouts by their tileset pair.
    """
    layouts = load_layouts_json()
    pairs = {}
    for layout in layouts["layouts"]:
        key = (layout["primary_tileset"], layout["secondary_tileset"])
        if key not in pairs:
            pairs[key] = []
        pairs[key].append(layout)

    result = []
    for (primary, secondary), layouts_list in sorted(pairs.items()):
        result.append((primary, secondary, layouts_list))
    return result


def tileset_label_to_dir(label):
    """Convert a tileset label to its directory name.

    e.g. gTileset_General -> primary/general
         gTileset_Cave -> secondary/cave
    """
    path = find_tileset_attributes_path(label)
    if path:
        rel = os.path.relpath(path, os.path.join(PROJECT_ROOT, "data", "tilesets"))
        return os.path.dirname(rel)
    return None
