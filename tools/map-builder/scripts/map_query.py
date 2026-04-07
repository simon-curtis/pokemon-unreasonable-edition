#!/usr/bin/env python3
"""
map_query.py - Semantic query engine for pokeemerald maps.

Lets Claude interrogate maps: "how many buildings?", "where are the doors?",
"can the player reach (15,10) from (5,5)?", "what's near the gym?".

All output is JSON to stdout for machine consumption.

Usage:
    python3 map_query.py PetalburgCity summary
    python3 map_query.py PetalburgCity buildings
    python3 map_query.py PetalburgCity doors
    python3 map_query.py PetalburgCity features
    python3 map_query.py PetalburgCity passable_area 15 15
    python3 map_query.py PetalburgCity path 5 5 25 25
    python3 map_query.py PetalburgCity nearby 10 10 5
    python3 map_query.py PetalburgCity metatiles 161 177 178
"""

import argparse
import json
import sys
from collections import deque

from maplib import (
    find_layout_for_map,
    parse_map_bin,
    load_metatile_attributes,
    get_behavior,
    classify_behavior,
    DOOR_BEHAVIORS,
    GRASS_BEHAVIORS,
    WATER_BEHAVIORS,
    LEDGE_BEHAVIORS,
    SAND_BEHAVIORS,
    ICE_BEHAVIORS,
    MB_JUMP_EAST, MB_JUMP_WEST, MB_JUMP_NORTH, MB_JUMP_SOUTH,
    MB_JUMP_NORTHEAST, MB_JUMP_NORTHWEST, MB_JUMP_SOUTHEAST, MB_JUMP_SOUTHWEST,
    MB_COUNTER, MB_PC, MB_TELEVISION, MB_LADDER, MB_CAVE,
)


class MapQuery:
    def __init__(self, map_name):
        self.map_name = map_name
        self.layout, self.map_data = find_layout_for_map(map_name)
        self.width = self.layout["width"]
        self.height = self.layout["height"]
        self.grid = parse_map_bin(self.layout["blockdata_filepath"],
                                  self.width, self.height)
        self.primary_attrs, self.secondary_attrs = load_metatile_attributes(
            self.layout["primary_tileset"], self.layout["secondary_tileset"]
        )
        self._behavior_cache = {}

    def _behavior(self, x, y):
        """Get cached behavior for tile at (x, y)."""
        key = (x, y)
        if key not in self._behavior_cache:
            mid = self.grid[y][x][0]
            self._behavior_cache[key] = get_behavior(mid, self.primary_attrs,
                                                      self.secondary_attrs)
        return self._behavior_cache[key]

    def _is_passable(self, x, y):
        """Check if tile at (x, y) is passable (collision == 0)."""
        return self.grid[y][x][1] == 0

    def _in_bounds(self, x, y):
        return 0 <= x < self.width and 0 <= y < self.height

    def _ledge_direction(self, behavior):
        """Return (dx, dy) for a ledge tile, or None."""
        mapping = {
            MB_JUMP_EAST: (1, 0), MB_JUMP_WEST: (-1, 0),
            MB_JUMP_NORTH: (0, -1), MB_JUMP_SOUTH: (0, 1),
            MB_JUMP_NORTHEAST: (1, -1), MB_JUMP_NORTHWEST: (-1, -1),
            MB_JUMP_SOUTHEAST: (1, 1), MB_JUMP_SOUTHWEST: (-1, 1),
        }
        return mapping.get(behavior)

    # ------------------------------------------------------------------
    # BFS reachability (respects ledges as one-way, water as impassable)
    # ------------------------------------------------------------------

    def _bfs_reachable(self, start_x, start_y):
        """BFS from start position. Returns set of reachable (x, y) positions."""
        if not self._in_bounds(start_x, start_y):
            return set()

        visited = set()
        queue = deque([(start_x, start_y)])
        visited.add((start_x, start_y))

        while queue:
            x, y = queue.popleft()
            behavior = self._behavior(x, y)

            # If standing on a ledge, can only move in ledge direction
            ledge_dir = self._ledge_direction(behavior)

            for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
                nx, ny = x + dx, y + dy
                if not self._in_bounds(nx, ny):
                    continue
                if (nx, ny) in visited:
                    continue

                # Ledge: can only jump in the ledge direction
                if ledge_dir and (dx, dy) != ledge_dir:
                    continue

                n_collision = self.grid[ny][nx][1]
                n_behavior = self._behavior(nx, ny)

                # Can't walk into blocked tiles
                if n_collision != 0:
                    continue
                # Can't walk into water without surf
                if n_behavior in WATER_BEHAVIORS:
                    continue

                visited.add((nx, ny))
                queue.append((nx, ny))

        return visited

    def _bfs_path(self, x1, y1, x2, y2):
        """BFS pathfinding from (x1,y1) to (x2,y2).

        Returns (path_list, blocker_info) where path_list is list of (x,y)
        or None if unreachable.
        """
        if not self._in_bounds(x1, y1) or not self._in_bounds(x2, y2):
            return None, "out_of_bounds"

        visited = {}
        queue = deque([(x1, y1)])
        visited[(x1, y1)] = None

        while queue:
            x, y = queue.popleft()
            if (x, y) == (x2, y2):
                # Reconstruct path
                path = []
                pos = (x2, y2)
                while pos is not None:
                    path.append(pos)
                    pos = visited[pos]
                path.reverse()
                return path, None

            behavior = self._behavior(x, y)
            ledge_dir = self._ledge_direction(behavior)

            for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
                nx, ny = x + dx, y + dy
                if not self._in_bounds(nx, ny):
                    continue
                if (nx, ny) in visited:
                    continue
                if ledge_dir and (dx, dy) != ledge_dir:
                    continue

                n_collision = self.grid[ny][nx][1]
                n_behavior = self._behavior(nx, ny)

                if n_collision != 0:
                    continue
                if n_behavior in WATER_BEHAVIORS:
                    continue

                visited[(nx, ny)] = (x, y)
                queue.append((nx, ny))

        # Unreachable — find what's blocking
        blocker = self._identify_blocker(x1, y1, x2, y2)
        return None, blocker

    def _identify_blocker(self, x1, y1, x2, y2):
        """Try to identify what blocks path from (x1,y1) to (x2,y2)."""
        # Check the destination tile itself
        if self._in_bounds(x2, y2):
            collision = self.grid[y2][x2][1]
            behavior = self._behavior(x2, y2)
            if collision != 0:
                return "wall"
            if behavior in WATER_BEHAVIORS:
                return "water"

        # Check tiles between start and dest for barriers
        dx = 1 if x2 > x1 else -1 if x2 < x1 else 0
        dy = 1 if y2 > y1 else -1 if y2 < y1 else 0
        x, y = x1, y1
        for _ in range(max(abs(x2 - x1), abs(y2 - y1)) + 1):
            if self._in_bounds(x, y):
                b = self._behavior(x, y)
                if b in WATER_BEHAVIORS:
                    return "water"
                if b in LEDGE_BEHAVIORS:
                    return "ledge"
            x += dx
            y += dy

        return "unknown_barrier"

    # ------------------------------------------------------------------
    # Feature detection
    # ------------------------------------------------------------------

    def _find_doors(self):
        """Find all door metatiles."""
        doors = []
        for y in range(self.height):
            for x in range(self.width):
                behavior = self._behavior(x, y)
                if behavior in DOOR_BEHAVIORS:
                    # Cross-reference with warps
                    warp_dest = None
                    for warp in self.map_data.get("warp_events", []):
                        if warp["x"] == x and warp["y"] == y:
                            warp_dest = warp.get("dest_map", "")
                            break
                    doors.append({
                        "x": x, "y": y,
                        "metatile_id": self.grid[y][x][0],
                        "warp_dest": warp_dest,
                    })
        return doors

    def _detect_buildings(self):
        """Detect building footprints by scanning upward from each door tile.

        Uses a column-scan approach: from the door, scan upward to find the
        building height, then scan left/right to find the width. This avoids
        the flood-fill problem where border tiles connect everything.
        """
        doors = self._find_doors()
        buildings = []
        visited_doors = set()

        for door in doors:
            dx, dy = door["x"], door["y"]
            if (dx, dy) in visited_doors:
                continue
            visited_doors.add((dx, dy))

            # Scan upward from door to find building top
            top_y = dy
            for scan_y in range(dy - 1, max(dy - 12, -1), -1):
                if not self._in_bounds(dx, scan_y):
                    break
                if self.grid[scan_y][dx][1] == 0:
                    # Hit passable tile — check if it's still building
                    # (some buildings have passable interior tiles)
                    # but if we hit 2 passable rows, stop
                    if scan_y - 1 >= 0 and self.grid[scan_y - 1][dx][1] == 0:
                        break
                top_y = scan_y

            # Scan left from door column to find building left edge
            left_x = dx
            for scan_x in range(dx - 1, max(dx - 10, -1), -1):
                if not self._in_bounds(scan_x, top_y):
                    break
                # Check if this column has blocked tiles at the building's top row
                if self.grid[top_y][scan_x][1] == 0:
                    break
                left_x = scan_x

            # Scan right from door column to find building right edge
            right_x = dx
            for scan_x in range(dx + 1, min(dx + 10, self.width)):
                if not self._in_bounds(scan_x, top_y):
                    break
                if self.grid[top_y][scan_x][1] == 0:
                    break
                right_x = scan_x

            # The building footprint: (left_x, top_y) to (right_x, dy)
            bldg_w = right_x - left_x + 1
            bldg_h = dy - top_y + 1

            # Collect all doors within this footprint
            bldg_doors = [{"x": dx, "y": dy, "warp_dest": door["warp_dest"]}]
            for other_door in doors:
                ox, oy = other_door["x"], other_door["y"]
                if (ox, oy) == (dx, dy):
                    continue
                if left_x <= ox <= right_x and top_y <= oy <= dy + 1:
                    if (ox, oy) not in visited_doors:
                        bldg_doors.append({"x": ox, "y": oy,
                                           "warp_dest": other_door["warp_dest"]})
                        visited_doors.add((ox, oy))

            # Count actual blocked tiles in the footprint
            tile_count = 0
            for by in range(top_y, dy + 1):
                for bx in range(left_x, right_x + 1):
                    if self.grid[by][bx][1] != 0:
                        tile_count += 1

            # Skip tiny "buildings" (just a door tile with no structure)
            if bldg_w < 2 and bldg_h < 2:
                buildings.append({
                    "type": "entrance",
                    "doors": bldg_doors,
                    "x": dx, "y": dy, "width": 1, "height": 1,
                    "tile_count": 0,
                })
                continue

            buildings.append({
                "type": "building",
                "x": left_x, "y": top_y,
                "width": bldg_w,
                "height": bldg_h,
                "tile_count": tile_count,
                "doors": bldg_doors,
            })

        return buildings

    def _classify_regions(self):
        """Identify contiguous regions of the same terrain type."""
        visited = set()
        regions = []

        for y in range(self.height):
            for x in range(self.width):
                if (x, y) in visited:
                    continue
                behavior = self._behavior(x, y)
                category = classify_behavior(behavior)
                collision = self.grid[y][x][1]

                # Only track interesting region types
                if category not in ("grass", "water", "sand", "ice", "cave"):
                    visited.add((x, y))
                    continue

                # Flood-fill same-category region
                region_tiles = set()
                queue = deque([(x, y)])
                while queue:
                    rx, ry = queue.popleft()
                    if (rx, ry) in region_tiles or (rx, ry) in visited:
                        continue
                    if not self._in_bounds(rx, ry):
                        continue
                    rb = self._behavior(rx, ry)
                    rc = classify_behavior(rb)
                    if rc != category:
                        continue
                    region_tiles.add((rx, ry))
                    visited.add((rx, ry))
                    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
                        queue.append((rx + dx, ry + dy))

                if len(region_tiles) >= 2:
                    min_x = min(t[0] for t in region_tiles)
                    max_x = max(t[0] for t in region_tiles)
                    min_y = min(t[1] for t in region_tiles)
                    max_y = max(t[1] for t in region_tiles)
                    regions.append({
                        "type": category,
                        "tile_count": len(region_tiles),
                        "bbox": {"x": min_x, "y": min_y,
                                 "w": max_x - min_x + 1,
                                 "h": max_y - min_y + 1},
                    })

        return sorted(regions, key=lambda r: -r["tile_count"])

    def _find_special_tiles(self):
        """Find interactive/special tiles: counters, PCs, TVs, ladders."""
        specials = []
        check = {
            MB_COUNTER: "counter", MB_PC: "pc",
            MB_TELEVISION: "television", MB_LADDER: "ladder",
        }
        for y in range(self.height):
            for x in range(self.width):
                behavior = self._behavior(x, y)
                if behavior in check:
                    specials.append({
                        "type": check[behavior],
                        "x": x, "y": y,
                        "metatile_id": self.grid[y][x][0],
                    })
        return specials

    # ------------------------------------------------------------------
    # Query dispatch
    # ------------------------------------------------------------------

    def query_summary(self):
        """High-level map summary."""
        passable = sum(1 for y in range(self.height) for x in range(self.width)
                       if self._is_passable(x, y))
        blocked = self.width * self.height - passable

        # Count terrain types
        terrain_counts = {}
        for y in range(self.height):
            for x in range(self.width):
                cat = classify_behavior(self._behavior(x, y))
                terrain_counts[cat] = terrain_counts.get(cat, 0) + 1

        doors = self._find_doors()
        warps = self.map_data.get("warp_events", [])
        npcs = self.map_data.get("object_events", [])
        triggers = self.map_data.get("coord_events", [])
        signs = [bg for bg in self.map_data.get("bg_events", [])
                 if bg.get("type") == "sign"]

        return {
            "map_name": self.map_name,
            "width": self.width,
            "height": self.height,
            "total_tiles": self.width * self.height,
            "passable_tiles": passable,
            "blocked_tiles": blocked,
            "tilesets": {
                "primary": self.layout["primary_tileset"],
                "secondary": self.layout["secondary_tileset"],
            },
            "terrain_counts": terrain_counts,
            "door_count": len(doors),
            "warp_count": len(warps),
            "npc_count": len(npcs),
            "trigger_count": len(triggers),
            "sign_count": len(signs),
            "map_type": self.map_data.get("map_type", ""),
            "music": self.map_data.get("music", ""),
            "weather": self.map_data.get("weather", ""),
        }

    def query_features(self):
        """All semantic features with positions."""
        return {
            "buildings": self._detect_buildings(),
            "terrain_regions": self._classify_regions(),
            "special_tiles": self._find_special_tiles(),
            "doors": self._find_doors(),
            "warps": self.map_data.get("warp_events", []),
            "npcs": [{
                "x": obj["x"], "y": obj["y"],
                "graphics_id": obj.get("graphics_id", ""),
                "script": obj.get("script", ""),
                "is_trainer": obj.get("trainer_type", "TRAINER_TYPE_NONE") != "TRAINER_TYPE_NONE",
            } for obj in self.map_data.get("object_events", [])],
            "signs": [{
                "x": bg["x"], "y": bg["y"],
                "script": bg.get("script", ""),
            } for bg in self.map_data.get("bg_events", []) if bg.get("type") == "sign"],
        }

    def query_buildings(self):
        """Detect and describe building footprints."""
        buildings = self._detect_buildings()
        return {
            "count": len(buildings),
            "buildings": buildings,
        }

    def query_doors(self):
        """All door tiles with positions and linked warps."""
        doors = self._find_doors()
        return {
            "count": len(doors),
            "doors": doors,
        }

    def query_passable_area(self, start_x, start_y):
        """BFS reachability from a point."""
        reachable = self._bfs_reachable(start_x, start_y)

        total_passable = sum(1 for y in range(self.height)
                             for x in range(self.width) if self._is_passable(x, y))

        # Passable tiles not in reachable set (excluding water)
        unreachable = []
        for y in range(self.height):
            for x in range(self.width):
                if self._is_passable(x, y) and (x, y) not in reachable:
                    behavior = self._behavior(x, y)
                    if behavior not in WATER_BEHAVIORS:
                        unreachable.append({"x": x, "y": y,
                                            "type": classify_behavior(behavior)})

        # Bounding box of reachable area
        if reachable:
            rx = [p[0] for p in reachable]
            ry = [p[1] for p in reachable]
            bbox = {"x": min(rx), "y": min(ry),
                    "w": max(rx) - min(rx) + 1, "h": max(ry) - min(ry) + 1}
        else:
            bbox = None

        return {
            "start": {"x": start_x, "y": start_y},
            "reachable_count": len(reachable),
            "total_passable": total_passable,
            "unreachable_passable": unreachable[:50],
            "unreachable_count": len(unreachable),
            "bounding_box": bbox,
        }

    def query_path(self, x1, y1, x2, y2):
        """BFS pathfinding between two points."""
        path, blocker = self._bfs_path(x1, y1, x2, y2)
        result = {
            "from": {"x": x1, "y": y1},
            "to": {"x": x2, "y": y2},
            "reachable": path is not None,
        }
        if path is not None:
            result["distance"] = len(path) - 1
            result["path_length"] = len(path)
            # Only include waypoints for shorter paths
            if len(path) <= 100:
                result["path"] = [{"x": p[0], "y": p[1]} for p in path]
        else:
            result["blocked_by"] = blocker
        return result

    def query_nearby(self, x, y, radius):
        """Features within Manhattan distance radius of (x, y)."""
        result = {
            "center": {"x": x, "y": y},
            "radius": radius,
            "terrain": {},
            "objects": [],
            "doors": [],
            "warps": [],
        }

        # Scan terrain in radius
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if abs(dx) + abs(dy) > radius:
                    continue
                nx, ny_ = x + dx, y + dy
                if not self._in_bounds(nx, ny_):
                    continue
                cat = classify_behavior(self._behavior(nx, ny_))
                result["terrain"][cat] = result["terrain"].get(cat, 0) + 1

        # Objects in radius
        for obj in self.map_data.get("object_events", []):
            ox, oy = obj["x"], obj["y"]
            if abs(ox - x) + abs(oy - y) <= radius:
                result["objects"].append({
                    "x": ox, "y": oy,
                    "distance": abs(ox - x) + abs(oy - y),
                    "graphics_id": obj.get("graphics_id", ""),
                    "script": obj.get("script", ""),
                    "is_trainer": obj.get("trainer_type", "TRAINER_TYPE_NONE") != "TRAINER_TYPE_NONE",
                })

        # Doors in radius
        for door in self._find_doors():
            if abs(door["x"] - x) + abs(door["y"] - y) <= radius:
                result["doors"].append(door)

        # Warps in radius
        for warp in self.map_data.get("warp_events", []):
            wx, wy = warp["x"], warp["y"]
            if abs(wx - x) + abs(wy - y) <= radius:
                result["warps"].append({
                    "x": wx, "y": wy,
                    "distance": abs(wx - x) + abs(wy - y),
                    "dest_map": warp.get("dest_map", ""),
                })

        return result

    def query_metatiles(self, metatile_ids):
        """Find all positions of specific metatile IDs."""
        results = {}
        id_set = set(metatile_ids)
        for y in range(self.height):
            for x in range(self.width):
                mid = self.grid[y][x][0]
                if mid in id_set:
                    mid_str = str(mid)
                    if mid_str not in results:
                        results[mid_str] = []
                    results[mid_str].append({
                        "x": x, "y": y,
                        "collision": self.grid[y][x][1],
                        "elevation": self.grid[y][x][2],
                        "behavior": classify_behavior(self._behavior(x, y)),
                    })
        return {
            "queried_ids": metatile_ids,
            "found": {mid: len(positions) for mid, positions in results.items()},
            "positions": results,
        }


def main():
    parser = argparse.ArgumentParser(
        description="Semantic query engine for pokeemerald maps"
    )
    parser.add_argument("map_name", help="Map directory name (e.g. PetalburgCity)")
    parser.add_argument("query", choices=[
        "summary", "features", "buildings", "doors",
        "passable_area", "path", "nearby", "metatiles",
    ], help="Query type")
    parser.add_argument("args", nargs="*", help="Query-specific arguments")
    args = parser.parse_args()

    mq = MapQuery(args.map_name)

    if args.query == "summary":
        result = mq.query_summary()
    elif args.query == "features":
        result = mq.query_features()
    elif args.query == "buildings":
        result = mq.query_buildings()
    elif args.query == "doors":
        result = mq.query_doors()
    elif args.query == "passable_area":
        if len(args.args) < 2:
            print("Error: passable_area requires X Y arguments", file=sys.stderr)
            sys.exit(1)
        result = mq.query_passable_area(int(args.args[0]), int(args.args[1]))
    elif args.query == "path":
        if len(args.args) < 4:
            print("Error: path requires X1 Y1 X2 Y2 arguments", file=sys.stderr)
            sys.exit(1)
        result = mq.query_path(int(args.args[0]), int(args.args[1]),
                               int(args.args[2]), int(args.args[3]))
    elif args.query == "nearby":
        if len(args.args) < 3:
            print("Error: nearby requires X Y RADIUS arguments", file=sys.stderr)
            sys.exit(1)
        result = mq.query_nearby(int(args.args[0]), int(args.args[1]),
                                 int(args.args[2]))
    elif args.query == "metatiles":
        if not args.args:
            print("Error: metatiles requires at least one metatile ID", file=sys.stderr)
            sys.exit(1)
        result = mq.query_metatiles([int(a) for a in args.args])

    json.dump(result, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
