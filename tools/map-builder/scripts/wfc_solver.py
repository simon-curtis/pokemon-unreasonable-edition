#!/usr/bin/env python3
"""
wfc_solver.py - Wave Function Collapse solver for pokeemerald map generation.

Takes a seed grid (from Claude's zone/structure passes) and fills remaining
cells using WFC with adjacency constraints extracted from vanilla maps.

Seed grid format (JSON):
{
    "width": 20, "height": 20,
    "tileset_pair": ["gTileset_General", "gTileset_Petalburg"],
    "grid": [
        ["grass", "grass", null, "path", ...],   // zone tags or null
        ...
    ],
    "stamps": [
        {"name": "pokecenter_petalburg", "x": 5, "y": 3},
        {"name": "house_small_petalburg", "x": 10, "y": 8}
    ],
    "elevation_default": 3,
    "border_metatile": 1
}

Zone tags: "grass", "water", "path", "trees", "sand", "cave", "ice", null
- null = unconstrained (WFC fills freely)
- Zone tags filter candidates to metatiles with matching behaviors

Usage:
    python3 wfc_solver.py --seed seed.json --output map.bin
    python3 wfc_solver.py --seed seed.json --output map.bin --max-backtracks 2000
    python3 wfc_solver.py --seed seed.json --preview  # ASCII preview, no binary
"""

import argparse
import json
import os
import random
import struct
import sys
import time
from copy import deepcopy

from maplib import (
    PROJECT_ROOT,
    NUM_PRIMARY_METATILES,
    load_metatile_attributes,
    get_behavior,
    classify_behavior,
    classify_tile,
    pack_tile,
    BEHAVIOR_CATEGORIES,
    GRASS_BEHAVIORS,
    WATER_BEHAVIORS,
    LEDGE_BEHAVIORS,
    DOOR_BEHAVIORS,
    SAND_BEHAVIORS,
    ICE_BEHAVIORS,
    MB_NORMAL,
    MB_JUMP_SOUTH,
    MB_JUMP_EAST,
    MB_JUMP_WEST,
    MB_CAVE,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONSTRAINTS_PATH = os.path.join(SCRIPT_DIR, "adjacency_db.json")
DEFAULT_CATALOG_PATH = os.path.join(SCRIPT_DIR, "stamp_catalog.json")

# Zone tag -> allowed behavior categories
ZONE_BEHAVIOR_MAP = {
    "grass": {"grass"},
    "water": {"water"},
    "path": {"normal"},
    "trees": set(),         # blocked tiles — collision=1, no specific behavior
    "sand": {"sand"},
    "cave": {"cave"},
    "ice": {"ice"},
    "open": {"normal"},     # generic passable
    "blocked": set(),       # generic blocked
    "ledge_south": {"ledge"},
    "ledge_east": {"ledge"},
    "ledge_west": {"ledge"},
}

# Ledge direction -> metatile behavior constants
LEDGE_DIRECTION_BEHAVIORS = {
    "ledge_south": {MB_JUMP_SOUTH},
    "ledge_east": {MB_JUMP_EAST},
    "ledge_west": {MB_JUMP_WEST},
}


class WFCSolver:
    def __init__(self, width, height, constraints, tileset_key,
                 primary_attrs, secondary_attrs):
        self.width = width
        self.height = height
        self.primary_attrs = primary_attrs
        self.secondary_attrs = secondary_attrs

        # Build allowed metatile set and weights from constraints
        pair_data = constraints.get("constraints", {}).get(tileset_key)
        if not pair_data:
            print(f"Warning: no constraints for {tileset_key}, "
                  f"falling back to all metatiles", file=sys.stderr)
            self.all_metatiles = set(range(NUM_PRIMARY_METATILES))
            self.adj_rules = {"E": {}, "S": {}, "W": {}, "N": {}}
            self.weights = {i: 1 for i in self.all_metatiles}
            self.collision_data = {}
        else:
            self._build_from_constraints(pair_data)

        # Grid of candidate sets
        self.grid = [[set(self.all_metatiles) for _ in range(width)]
                     for _ in range(height)]
        self.collapsed = [[False] * width for _ in range(height)]
        self.result = [[None] * width for _ in range(height)]

        # Provenance tracking: per-cell record of how it was decided
        # Each entry: {"method": str, "sources": [{"x","y","reason"}], "detail": str}
        self.provenance = [[None] * width for _ in range(height)]

        # Metatile -> behavior category cache
        self._behavior_cat_cache = {}

    def _build_from_constraints(self, pair_data):
        """Build adjacency rules and metatile weights from constraint data."""
        adj = pair_data["adjacency"]

        # Collect all metatile IDs seen
        self.all_metatiles = set()
        self.weights = {}

        # Load collision data — passable_ratio per metatile
        self.collision_data = {}
        for mid_str, cdata in pair_data.get("collision", {}).items():
            self.collision_data[int(mid_str)] = cdata.get("passable_ratio", 0.5)

        # Classify metatiles by typical collision
        self.passable_metatiles = set()
        self.blocked_metatiles = set()
        for mid, ratio in self.collision_data.items():
            if ratio > 0.8:
                self.passable_metatiles.add(mid)
            elif ratio < 0.2:
                self.blocked_metatiles.add(mid)

        # E and S are stored directly; derive N and W
        self.adj_rules = {"E": {}, "S": {}, "W": {}, "N": {}}

        for direction, reverse in [("E", "W"), ("S", "N")]:
            if direction not in adj:
                continue
            for src_str, neighbors in adj[direction].items():
                src = int(src_str)
                self.all_metatiles.add(src)
                if src not in self.adj_rules[direction]:
                    self.adj_rules[direction][src] = {}
                for nbr_str, count in neighbors.items():
                    nbr = int(nbr_str)
                    self.all_metatiles.add(nbr)
                    self.adj_rules[direction][src][nbr] = count
                    self.weights[src] = self.weights.get(src, 0) + count
                    self.weights[nbr] = self.weights.get(nbr, 0) + count

                    # Reverse: if A can have B to its East, then B can have A to its West
                    if nbr not in self.adj_rules[reverse]:
                        self.adj_rules[reverse][nbr] = {}
                    self.adj_rules[reverse][nbr][src] = \
                        self.adj_rules[reverse][nbr].get(src, 0) + count

    def _behavior_category(self, metatile_id):
        """Get behavior category for a metatile, cached."""
        if metatile_id not in self._behavior_cat_cache:
            behavior = get_behavior(metatile_id, self.primary_attrs,
                                     self.secondary_attrs)
            self._behavior_cat_cache[metatile_id] = classify_behavior(behavior)
        return self._behavior_cat_cache[metatile_id]

    def _dominant_metatiles(self, candidates, top_n=3):
        """Return the top-N highest-frequency metatiles from candidates.

        Uses self-adjacency count (E + S) as a proxy for how "interior"
        a tile is. Tiles that commonly appear next to themselves are the
        ones that fill large uniform areas.
        """
        scored = []
        for mid in candidates:
            self_count = 0
            for d in ("E", "S"):
                self_count += self.adj_rules.get(d, {}).get(mid, {}).get(mid, 0)
            scored.append((self_count, mid))
        scored.sort(reverse=True)
        # Take top_n, but at minimum include any tile with > 50% of the
        # best tile's score
        if not scored:
            return candidates
        best = scored[0][0]
        threshold = best * 0.5
        result = set()
        for count, mid in scored[:top_n]:
            if count >= threshold or not result:
                result.add(mid)
        return result

    def seed_zone(self, x, y, zone_tag):
        """Record a zone preference for cell (x,y).

        Zone preferences are used as weight boosts during collapse.
        For blocked zones (trees, blocked), a hard filter is also applied
        at collapse time to force blocked metatile selection.
        """
        if zone_tag not in ZONE_BEHAVIOR_MAP:
            return

        preferred = set()

        if zone_tag in ("trees", "blocked"):
            preferred = self.blocked_metatiles & self.all_metatiles
        elif zone_tag in ("path", "open"):
            for mid in self.passable_metatiles:
                cat = self._behavior_category(mid)
                if cat in ("normal",):
                    preferred.add(mid)
        elif zone_tag in LEDGE_DIRECTION_BEHAVIORS:
            # Directional ledge: filter to metatiles with the specific
            # ledge direction behavior
            target_behaviors = LEDGE_DIRECTION_BEHAVIORS[zone_tag]
            for mid in self.all_metatiles:
                behavior = get_behavior(mid, self.primary_attrs, self.secondary_attrs)
                if behavior in target_behaviors:
                    preferred.add(mid)
        else:
            target_cats = ZONE_BEHAVIOR_MAP[zone_tag]
            for mid in self.all_metatiles:
                cat = self._behavior_category(mid)
                if cat in target_cats:
                    preferred.add(mid)

        if not preferred:
            return

        # Store zone preference — collapse_cell uses this for weighting
        if not hasattr(self, '_zone_preferences'):
            self._zone_preferences = {}
        self._zone_preferences[(x, y)] = preferred

        # Store zone tag for hard filtering at collapse time
        if not hasattr(self, '_zone_tags'):
            self._zone_tags = {}
        self._zone_tags[(x, y)] = zone_tag

        # Protect zone metatiles from being eliminated by propagation.
        # For water/grass, protect ALL zone metatiles at the boundary
        # (where adjacency constraints from non-zone tiles will filter),
        # but only the dominant metatile(s) in the interior.
        if zone_tag in ("ledge_south", "ledge_east", "ledge_west"):
            if not hasattr(self, '_protected_metatiles'):
                self._protected_metatiles = {}
            self._protected_metatiles[(x, y)] = preferred
        elif zone_tag in ("water", "grass"):
            if not hasattr(self, '_protected_metatiles'):
                self._protected_metatiles = {}
            # Defer interior vs boundary classification to _finalize_zone_protection
            self._protected_metatiles[(x, y)] = preferred

    def finalize_zone_protection(self):
        """Classify zone cells as interior vs boundary and set protection.

        Interior cells (all 4 neighbors are the same zone) get protected
        with only the dominant metatile(s). Boundary cells (at least one
        neighbor is a different zone or off-grid) keep full zone protection
        so transition tiles can survive adjacency constraints.
        """
        zone_tags = getattr(self, '_zone_tags', {})
        protected = getattr(self, '_protected_metatiles', {})
        if not zone_tags or not protected:
            return

        # Compute dominant tiles per zone tag
        dominant_cache = {}
        for (x, y), tag in zone_tags.items():
            if tag not in dominant_cache and tag in ("water", "grass"):
                prefs = getattr(self, '_zone_preferences', {}).get((x, y))
                if prefs:
                    dominant_cache[tag] = self._dominant_metatiles(prefs)

        for (x, y), tag in zone_tags.items():
            if tag not in ("water", "grass"):
                continue
            dominant = dominant_cache.get(tag)
            if not dominant:
                continue

            # Check if all 4 neighbors are the same zone
            is_interior = True
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny_ = x + dx, y + dy
                if not (0 <= nx < self.width and 0 <= ny_ < self.height):
                    is_interior = False
                    break
                if zone_tags.get((nx, ny_)) != tag:
                    is_interior = False
                    break

            if is_interior:
                protected[(x, y)] = dominant
            # else: keep full preferred set (already assigned)

    def seed_stamp(self, stamp, x, y):
        """Place a stamp at position (x, y), collapsing those cells."""
        for sy, row in enumerate(stamp["metatiles"]):
            for sx, mid in enumerate(row):
                gx, gy = x + sx, y + sy
                if 0 <= gx < self.width and 0 <= gy < self.height:
                    self.grid[gy][gx] = {mid}
                    self.collapsed[gy][gx] = True
                    self.result[gy][gx] = mid

    def stamp_trees(self, tree_cells, protected=None):
        """Place trees as complete column stamps AFTER WFC and pinning.

        Each tree is built column-by-column. For each 2-wide column pair
        (even_x, even_x+1), find contiguous vertical runs of tree zone,
        then stamp the complete tree structure top-to-bottom:

            462  463   crown-tip (above first crown, has top-layer for tree peak)
            468  469   crown
            476  477   trunk-inner (or 484/485 bottom, 486/487 edge)
            468  469   crown (repeats)
            476  477   trunk-inner (repeats)
            ...
            484  485   trunk-bottom (last row)

        If the last trunk row is on a connection edge (in `protected`), use
        interior trunk tiles (476/477) instead of bottom tiles — the tree
        continues into the adjacent map.

        Mandatory neighbor rules (from vanilla analysis):
        - 468 east → 469 ALWAYS (never non-tree)
        - 476 east → 477 ALWAYS
        - 468 south → 476/484/486 ALWAYS (a trunk)
        - 476 north → 468 ALWAYS (a crown)
        """
        CL, CR = 468, 469
        TL, TR = 476, 477
        tl, tr = 484, 485
        tL, tR = 486, 487
        CTIP_L, CTIP_R = 462, 463
        CTIP_GRASS_L, CTIP_GRASS_R = 454, 455  # crown-tip on tall grass

        tree_set = set(tree_cells)
        _protected = protected or set()
        self._crown_tip_cells = set()
        self._stamped_cells = set()

        # Process column PAIRS (even_x, even_x+1)
        # Group tree cells by x-pair
        x_values = sorted(set(x for x, y in tree_set))
        even_xs = sorted(set(x & ~1 for x in x_values))  # round down to even

        for ex in even_xs:
            rx = ex + 1  # right column
            if rx >= self.width:
                continue

            # Find y-rows where BOTH columns are tree zone
            paired_ys = sorted(y for y in range(self.height)
                               if (ex, y) in tree_set and (rx, y) in tree_set)
            if not paired_ys:
                continue

            # Find contiguous runs of paired rows
            runs = []
            run_start = paired_ys[0]
            prev = paired_ys[0]
            for y in paired_ys[1:]:
                if y != prev + 1:
                    runs.append((run_start, prev))
                    run_start = y
                prev = y
            runs.append((run_start, prev))

            # Stamp each run
            for start, end in runs:
                # Ensure run starts on even y (crown row)
                if start % 2 != 0:
                    start += 1
                # Ensure run has even length (crown+trunk pairs)
                length = end - start + 1
                if length < 2:
                    continue
                if length % 2 != 0:
                    end -= 1

                # Check horizontal context for bottom trunk variant
                has_tree_left = ex > 0 and any(
                    (ex - 1, y) in tree_set for y in range(start, end + 1))
                has_tree_right = rx + 1 < self.width and any(
                    (rx + 1, y) in tree_set for y in range(start, end + 1))

                # Place crown-tip ABOVE the first crown (if room)
                # Use grass variant (454/455) when tip lands on a grass zone
                # Check each column independently since L/R may be different zones
                if start > 0:
                    zone_tags = getattr(self, '_zone_tags', {})
                    orig_zones = getattr(self, '_original_zones', {})
                    tip_y = start - 1
                    l_zone = orig_zones.get((ex, tip_y), zone_tags.get((ex, tip_y)))
                    r_zone = orig_zones.get((rx, tip_y), zone_tags.get((rx, tip_y)))
                    tip_l = CTIP_GRASS_L if l_zone == "grass" else CTIP_L
                    tip_r = CTIP_GRASS_R if r_zone == "grass" else CTIP_R
                    l_detail = "crown_tip_grass" if l_zone == "grass" else "crown_tip"
                    r_detail = "crown_tip_grass" if r_zone == "grass" else "crown_tip"
                    self._collapse_to(ex, tip_y, tip_l,
                                      prov_method="stamp_trees",
                                      prov_detail=l_detail)
                    self._collapse_to(rx, tip_y, tip_r,
                                      prov_method="stamp_trees",
                                      prov_detail=r_detail)
                    self._crown_tip_cells.add((ex, start - 1))
                    self._crown_tip_cells.add((rx, start - 1))
                    self._stamped_cells.add((ex, start - 1))
                    self._stamped_cells.add((rx, start - 1))

                # Place crown/trunk pairs
                for y in range(start, end + 1, 2):
                    self._collapse_to(ex, y, CL,
                                      prov_method="stamp_trees",
                                      prov_detail="crown")
                    self._collapse_to(rx, y, CR,
                                      prov_method="stamp_trees",
                                      prov_detail="crown")
                    self._stamped_cells.add((ex, y))
                    self._stamped_cells.add((rx, y))

                    trunk_y = y + 1
                    if trunk_y > end:
                        break

                    self._stamped_cells.add((ex, trunk_y))
                    self._stamped_cells.add((rx, trunk_y))

                    is_last_trunk = (trunk_y + 2 > end)
                    # If last trunk row is on a connection edge, trees continue
                    # into the adjacent map — use interior trunk, not bottom
                    on_conn_edge = (_protected and
                                   (ex, trunk_y) in _protected)
                    if is_last_trunk and not on_conn_edge:
                        self._collapse_to(ex, trunk_y,
                                          tL if not has_tree_left else tl,
                                          prov_method="stamp_trees",
                                          prov_detail="bottom_trunk")
                        self._collapse_to(rx, trunk_y,
                                          tR if not has_tree_right else tr,
                                          prov_method="stamp_trees",
                                          prov_detail="bottom_trunk")
                    else:
                        self._collapse_to(ex, trunk_y, TL,
                                          prov_method="stamp_trees",
                                          prov_detail="trunk")
                        self._collapse_to(rx, trunk_y, TR,
                                          prov_method="stamp_trees",
                                          prov_detail="trunk")

        # Clear any tree-zone cells that weren't part of a valid column pair
        # (but never clear connection-seeded cells)
        for x, y in tree_cells:
            if (x, y) not in self._stamped_cells and (x, y) not in _protected:
                self._collapse_to(x, y, 13,
                                  prov_method="stamp_trees",
                                  prov_detail="unpaired_fallback_grass")

    def _collapse_to(self, x, y, mid, prov_method=None, prov_sources=None,
                      prov_detail=None):
        """Helper to collapse a cell to a specific metatile."""
        self.grid[y][x] = {mid}
        self.collapsed[y][x] = True
        self.result[y][x] = mid
        if prov_method:
            self.provenance[y][x] = {
                "method": prov_method,
                "sources": prov_sources or [],
                "detail": prov_detail,
            }

    def seed_border(self, border_metatile):
        """Bias border/edge tiles toward a specific metatile family.

        Rather than hard-constraining to a single metatile (which causes
        contradictions due to tight adjacency rules), this keeps the
        border metatile and its known neighbors as candidates.
        """
        # Find the metatile and all tiles that commonly appear adjacent to it
        border_family = {border_metatile}
        for direction in ("E", "S", "W", "N"):
            neighbors = self.adj_rules.get(direction, {}).get(border_metatile, {})
            border_family.update(neighbors.keys())

        for x in range(self.width):
            for y in [0, self.height - 1]:
                if not self.collapsed[y][x]:
                    filtered = self.grid[y][x] & border_family
                    if filtered:
                        self.grid[y][x] = filtered
        for y in range(self.height):
            for x in [0, self.width - 1]:
                if not self.collapsed[y][x]:
                    filtered = self.grid[y][x] & border_family
                    if filtered:
                        self.grid[y][x] = filtered

    def _neighbors(self, x, y):
        """Return (direction, nx, ny) for valid neighbors."""
        result = []
        if x > 0:
            result.append(("W", x - 1, y))
        if x < self.width - 1:
            result.append(("E", x + 1, y))
        if y > 0:
            result.append(("N", x, y - 1))
        if y < self.height - 1:
            result.append(("S", x, y + 1))
        return result

    def _allowed_neighbors(self, metatile_id, direction):
        """Get set of metatiles allowed adjacent to metatile_id in direction."""
        rules = self.adj_rules.get(direction, {})
        neighbors = rules.get(metatile_id, {})
        return set(neighbors.keys())

    def propagate(self, start_x, start_y, lenient=False):
        """Arc-consistency propagation from a changed cell.

        If lenient=True (used for stamp propagation), skip edges that would
        create contradictions rather than failing. This handles stamp boundary
        metatiles whose adjacency rules are too narrow for the surrounding context.

        Returns False if a contradiction is detected (and lenient is False).
        """
        queue = [(start_x, start_y)]
        visited = set()

        while queue:
            x, y = queue.pop(0)
            if (x, y) in visited:
                continue
            visited.add((x, y))

            current = self.grid[y][x]
            if not current:
                if lenient:
                    continue
                return False

            for direction, nx, ny in self._neighbors(x, y):
                if self.collapsed[ny][nx]:
                    continue

                # Compute allowed metatiles for neighbor based on current cell
                allowed = set()
                for mid in current:
                    allowed |= self._allowed_neighbors(mid, direction)

                old_candidates = self.grid[ny][nx]
                new_candidates = old_candidates & allowed

                # Preserve protected metatiles (ledges, water, grass zones)
                protected = getattr(self, '_protected_metatiles', {}).get((nx, ny))
                if protected and not new_candidates:
                    # Keep protected metatiles even if adjacency says no
                    new_candidates = old_candidates & protected
                elif protected:
                    # Ensure protected metatiles aren't removed
                    new_candidates = new_candidates | (old_candidates & protected)

                if not new_candidates:
                    if lenient:
                        # Skip this edge — don't constrain the neighbor
                        continue
                    return False

                if len(new_candidates) < len(old_candidates):
                    self.grid[ny][nx] = new_candidates
                    queue.append((nx, ny))

        return True

    def select_cell(self):
        """Select uncollapsed cell with minimum entropy (fewest candidates).

        Priority order:
        1. Passable zone cells (path, grass, open, water) — define the walkable structure
        2. Blocked zone cells (trees, blocked) — fill around the walkable areas
        3. Unconstrained cells — fill remaining gaps

        Returns (x, y) or None if all collapsed.
        """
        zone_prefs = getattr(self, '_zone_preferences', {})

        # Partition cells into priority tiers
        PASSABLE_ZONES = {"path", "grass", "open", "water", "sand", "cave", "ice"}
        tiers = [[], [], []]  # passable zones, blocked zones, unconstrained

        for y in range(self.height):
            for x in range(self.width):
                if self.collapsed[y][x]:
                    continue
                entropy = len(self.grid[y][x])
                if (x, y) in zone_prefs:
                    # Determine which tier based on zone tag
                    prefs = zone_prefs[(x, y)]
                    # Check if this is a passable zone by seeing if preferred
                    # metatiles overlap with passable_metatiles
                    if prefs & self.passable_metatiles:
                        tiers[0].append((entropy, x, y))
                    else:
                        tiers[1].append((entropy, x, y))
                else:
                    tiers[2].append((entropy, x, y))

        for tier in tiers:
            if not tier:
                continue
            min_entropy = min(t[0] for t in tier)
            candidates = [(t[1], t[2]) for t in tier if t[0] == min_entropy]
            return random.choice(candidates)

        return None

    def _contextual_weight(self, candidate, x, y):
        """Compute weight for a candidate metatile based on adjacency counts
        with already-collapsed neighbors.

        For each collapsed neighbor, look up how often `candidate` appears
        adjacent to that neighbor's metatile in the relevant direction.
        Multiply counts across all collapsed neighbors (geometric mean style)
        so tiles with strong co-occurrence in ALL directions dominate.
        """
        REVERSE = {"E": "W", "W": "E", "N": "S", "S": "N"}
        weight = 1.0
        has_neighbor = False
        for direction, nx, ny in self._neighbors(x, y):
            if not self.collapsed[ny][nx]:
                continue
            has_neighbor = True
            nbr_mid = self.result[ny][nx]
            # From neighbor's perspective: if neighbor is to our East,
            # we are to its West. Look up what neighbor allows to its West.
            reverse_dir = REVERSE[direction]
            rules = self.adj_rules.get(reverse_dir, {})
            count = rules.get(nbr_mid, {}).get(candidate, 0)
            # Smoothing: +0.1 avoids zeroing out, but heavily favors
            # high-count adjacencies
            weight *= (count + 0.1)
        if not has_neighbor:
            # No collapsed neighbors yet — use self-adjacency count as proxy
            # for "interior" tiles that form large uniform areas
            self_count = 0
            for d in ("E", "S"):
                self_count += self.adj_rules.get(d, {}).get(candidate, {}).get(candidate, 0)
            return self_count + 1
        return weight

    def collapse_cell(self, x, y):
        """Collapse cell to a single metatile, weighted by neighbor adjacency.

        For blocked zones (trees/blocked): hard-filter to blocked metatiles.
        Uses contextual adjacency co-occurrence counts for weighting.
        """
        candidates = list(self.grid[y][x])
        if not candidates:
            return False

        zone_tag = getattr(self, '_zone_tags', {}).get((x, y))
        zone_prefs = getattr(self, '_zone_preferences', {}).get((x, y))

        # Hard filter for zone types — force pick from preferred set
        if zone_tag in ("trees", "blocked", "ledge_south", "ledge_east",
                         "ledge_west", "water", "grass", "sand") and zone_prefs:
            # For zones with dominant tiles (water, grass), prefer the
            # dominant set to keep interiors uniform
            dominant = getattr(self, '_protected_metatiles', {}).get((x, y))
            if dominant:
                dom_filtered = [mid for mid in candidates if mid in dominant]
                if dom_filtered:
                    candidates = dom_filtered
                else:
                    filtered = [mid for mid in candidates if mid in zone_prefs]
                    if filtered:
                        candidates = filtered
            else:
                filtered = [mid for mid in candidates if mid in zone_prefs]
                if filtered:
                    candidates = filtered

        if len(candidates) == 1:
            chosen = candidates[0]
        else:
            weights = [self._contextual_weight(mid, x, y) for mid in candidates]

            # Cube the weights to sharpen the distribution — makes the
            # highest-frequency tile much more likely to win, preventing
            # edge/transition tiles from appearing in zone interiors
            weights = [w ** 3 for w in weights]

            total = sum(weights)
            if total == 0:
                chosen = random.choice(candidates)
            else:
                chosen = random.choices(candidates, weights=weights, k=1)[0]

        self.grid[y][x] = {chosen}
        self.collapsed[y][x] = True
        self.result[y][x] = chosen
        if not self.provenance[y][x]:
            self.provenance[y][x] = {
                "method": "wfc_collapse",
                "sources": [],
                "detail": f"zone={zone_tag} candidates={len(candidates)}",
            }
        return True

    def solve(self, max_backtracks=1000):
        """Main WFC loop with backtracking.

        Returns True if solved, False if failed after max_backtracks.
        """
        # Propagate from pre-collapsed cells (stamps) with lenient mode.
        # Stamp boundary metatiles often have very narrow adjacency rules
        # that don't accommodate the surrounding context, so we skip edges
        # that would create contradictions.
        for y in range(self.height):
            for x in range(self.width):
                if self.collapsed[y][x]:
                    self.propagate(x, y, lenient=True)

        backtracks = 0
        history = []  # Stack of (x, y, remaining_candidates, grid_snapshot)

        while True:
            cell = self.select_cell()
            if cell is None:
                return True  # All cells collapsed

            x, y = cell
            candidates = list(self.grid[y][x])

            if not candidates:
                # Contradiction — backtrack
                if not history or backtracks >= max_backtracks:
                    return False
                backtracks += 1
                bx, by, remaining, snapshot = history.pop()
                self._restore_snapshot(snapshot)
                if not remaining:
                    continue  # Need to backtrack further

                # Try next candidate — filter to zone-preferred tiles
                zone_prefs = getattr(self, '_zone_preferences', {}).get((bx, by))
                if zone_prefs:
                    remaining = [c for c in remaining if c in zone_prefs]
                if not remaining:
                    continue  # Exhausted zone-valid candidates, backtrack further
                next_candidate = remaining.pop(0)
                self.grid[by][bx] = {next_candidate}
                self.collapsed[by][bx] = True
                self.result[by][bx] = next_candidate
                if remaining:
                    history.append((bx, by, remaining, self._take_snapshot()))
                if not self.propagate(bx, by):
                    continue  # This candidate also failed, loop will backtrack
                continue

            # Save state for potential backtracking
            snapshot = self._take_snapshot()

            # Collapse to first candidate (weighted)
            self.collapse_cell(x, y)
            chosen = self.result[y][x]

            # Build remaining candidates for backtracking:
            # filter to zone-preferred tiles, dominant first
            remaining = [c for c in candidates if c != chosen]
            zone_prefs = getattr(self, '_zone_preferences', {}).get((x, y))
            if zone_prefs:
                remaining = [c for c in remaining if c in zone_prefs]
            dominant = getattr(self, '_protected_metatiles', {}).get((x, y))
            if dominant:
                dom = [c for c in remaining if c in dominant]
                non_dom = [c for c in remaining if c not in dominant]
                remaining = dom + non_dom

            if remaining:
                history.append((x, y, remaining, snapshot))

            if not self.propagate(x, y):
                # Contradiction — try backtracking
                if not history or backtracks >= max_backtracks:
                    return False
                backtracks += 1
                bx, by, remaining, snapshot = history.pop()
                self._restore_snapshot(snapshot)
                if remaining:
                    # Filter to zone-preferred tiles during backtracking
                    zone_prefs = getattr(self, '_zone_preferences', {}).get((bx, by))
                    if zone_prefs:
                        remaining = [c for c in remaining if c in zone_prefs]
                    if not remaining:
                        continue  # Exhausted zone-valid candidates
                    next_candidate = remaining.pop(0)
                    self.grid[by][bx] = {next_candidate}
                    self.collapsed[by][bx] = True
                    self.result[by][bx] = next_candidate
                    if remaining:
                        history.append((bx, by, remaining, self._take_snapshot()))
                    self.propagate(bx, by)

        return backtracks < max_backtracks

    def _take_snapshot(self):
        """Take a snapshot of the grid state for backtracking."""
        return {
            "grid": [[set(self.grid[y][x]) for x in range(self.width)]
                     for y in range(self.height)],
            "collapsed": [row[:] for row in self.collapsed],
            "result": [row[:] for row in self.result],
        }

    def _restore_snapshot(self, snapshot):
        """Restore grid state from a snapshot."""
        self.grid = snapshot["grid"]
        self.collapsed = snapshot["collapsed"]
        self.result = snapshot["result"]

    def post_process(self, x_parity=0):
        """Fix common WFC artifacts after solving.

        Args:
            x_parity: shift for tree left/right alignment (0 or 1).
                      Set to 1 when connection offset is odd.
        """
        zone_tags = getattr(self, '_zone_tags', {})

        TREE_CROWN_L, TREE_CROWN_R = 468, 469
        TREE_TRUNK_L, TREE_TRUNK_R = 476, 477
        PATH_TILE = 1
        TALL_GRASS = 13

        # --- 1. Trees handled by stamp_trees — just protect crown-tip cells ---
        crown_tip_positions = getattr(self, '_crown_tip_cells', set())

        # --- 2. Buffer trees from water ---
        TREE_METATILES = {TREE_CROWN_L, TREE_CROWN_R, TREE_TRUNK_L, TREE_TRUNK_R,
                          484, 485, 486, 487}

        stamped = getattr(self, '_stamped_cells', set())
        water_cells = {(x, y) for (x, y), tag in zone_tags.items() if tag == "water"}
        for wx, wy in water_cells:
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1),
                           (-1, -1), (1, -1), (-1, 1), (1, 1)]:
                nx, ny = wx + dx, wy + dy
                if 0 <= nx < self.width and 0 <= ny < self.height:
                    if (nx, ny) not in stamped and self.result[ny][nx] in TREE_METATILES:
                        self.result[ny][nx] = PATH_TILE
                        self.provenance[ny][nx] = {
                            "method": "post_process",
                            "sources": [{"x": wx, "y": wy, "reason": "water_buffer"}],
                            "detail": "tree_near_water→path",
                        }

        # --- 3. Fix ledge rows: left-end / middle / right-end ---
        LEDGE_LEFT = 213
        LEDGE_MID = 135
        LEDGE_RIGHT = 214

        for y in range(self.height):
            runs = []
            run_start = None
            for x in range(self.width):
                tag = zone_tags.get((x, y))
                if tag in ("ledge_south", "ledge_east", "ledge_west"):
                    if run_start is None:
                        run_start = x
                else:
                    if run_start is not None:
                        runs.append((run_start, x - 1))
                        run_start = None
            if run_start is not None:
                runs.append((run_start, self.width - 1))

            for start, end in runs:
                length = end - start + 1
                if length == 1:
                    self.result[y][start] = LEDGE_MID
                elif length == 2:
                    self.result[y][start] = LEDGE_LEFT
                    self.result[y][end] = LEDGE_RIGHT
                else:
                    self.result[y][start] = LEDGE_LEFT
                    self.result[y][end] = LEDGE_RIGHT
                    for x in range(start + 1, end):
                        self.result[y][x] = LEDGE_MID

        # --- 4. Force grass zones to metatile 13 only ---
        # Protect crown-tip grass tiles (454/455) placed by stamp_trees
        CTIP_GRASS = {454, 455}
        for y in range(self.height):
            for x in range(self.width):
                if zone_tags.get((x, y)) == "grass":
                    if (x, y) in crown_tip_positions:
                        continue
                    mid = self.result[y][x]
                    if mid in CTIP_GRASS:
                        continue
                    cat = self._behavior_category(mid)
                    if cat == "grass" and mid != TALL_GRASS:
                        self.result[y][x] = TALL_GRASS

        # --- 5. Clean stray tiles from path/grass zones ---
        # Decorative tiles that look odd outside tree zones
        STUMP_TILES = {15, 470, 471}
        CTIP_TILES = {462, 463, 454, 455}
        for y in range(self.height):
            for x in range(self.width):
                if (x, y) in crown_tip_positions:
                    continue  # protect crown-tip tiles placed by stamp_trees
                tag = zone_tags.get((x, y))
                mid = self.result[y][x]
                if tag in ("path", "open"):
                    cat = self._behavior_category(mid)
                    if cat == "grass":
                        self.result[y][x] = PATH_TILE
                    elif self.collision_data.get(mid, 0.5) < 0.2:
                        self.result[y][x] = PATH_TILE
                    elif mid in STUMP_TILES | CTIP_TILES:
                        self.result[y][x] = PATH_TILE
                elif tag == "grass":
                    if mid in STUMP_TILES | CTIP_TILES:
                        self.result[y][x] = TALL_GRASS

        # --- 6. Water edge tiles ---
        # Replace water zone boundary tiles with proper shore metatiles
        # matching vanilla patterns (Petalburg, Route103, etc.)
        WATER_INTERIOR = 161   # pond water interior
        WATER_TOP_L    = 176   # top-left corner
        WATER_TOP      = 177   # top edge
        WATER_TOP_R    = 178   # top-right corner
        WATER_LEFT     = 184   # left edge
        WATER_RIGHT    = 186   # right edge

        water_cells = {(x, y) for (x, y), tag in zone_tags.items()
                       if tag == "water"}
        for (x, y) in water_cells:
            # Determine which edges border non-water
            n_water = (x, y - 1) in water_cells
            s_water = (x, y + 1) in water_cells
            w_water = (x - 1, y) in water_cells
            e_water = (x + 1, y) in water_cells

            # Vanilla pattern: vertical edges (184/186) run full height
            # including bottom corners. Top corners use 176/178.
            # Bottom row interior uses alternating 510/511.
            if not w_water and not e_water:
                # Single-width column — use left edge
                self.result[y][x] = WATER_LEFT
            elif not w_water:
                # Left edge runs full height
                self.result[y][x] = WATER_LEFT
            elif not e_water:
                # Right edge runs full height
                self.result[y][x] = WATER_RIGHT
            elif not n_water and not s_water:
                # Single-height row — use top edge
                self.result[y][x] = WATER_TOP
            elif not n_water:
                self.result[y][x] = WATER_TOP
            elif not s_water:
                # Bottom row: still interior water — the south shore
                # tile (metatile 2) below handles the visual bank edge
                self.result[y][x] = WATER_INTERIOR
            else:
                self.result[y][x] = WATER_INTERIOR

        # Second pass: fix top corners (override top edge where it meets
        # left/right edge). Check the cell below for left/right edge.
        for (x, y) in water_cells:
            n_water = (x, y - 1) in water_cells
            w_water = (x - 1, y) in water_cells
            e_water = (x + 1, y) in water_cells
            if not n_water and not w_water:
                self.result[y][x] = WATER_TOP_L
            elif not n_water and not e_water:
                self.result[y][x] = WATER_TOP_R

        # Third pass: place south shoreline (metatile 2) on the row
        # below the water zone — this is the land tile that visually
        # forms the bottom bank of the pond.
        SOUTH_SHORE = 2
        for (x, y) in water_cells:
            s_water = (x, y + 1) in water_cells
            if not s_water:
                sy = y + 1
                if 0 <= sy < self.height and (x, sy) not in water_cells:
                    if zone_tags.get((x, sy)) not in ("trees", "blocked"):
                        self.result[sy][x] = SOUTH_SHORE

        # Update grid to match result
        for y in range(self.height):
            for x in range(self.width):
                if self.result[y][x] is not None:
                    self.grid[y][x] = {self.result[y][x]}

    # align_connection_edge removed — connections are now seeded pre-solve
    # so WFC adjacency rules handle tree pairing and parity naturally.

    def assign_collision_elevation(self, elevation_default=3):
        """Post-solve: determine collision and elevation for each tile.

        Uses collision stats from existing maps to set collision accurately.
        Falls back to behavior-based classification when no stats available.

        Returns 2D grid of packed u16 values.
        """
        packed = []
        for y in range(self.height):
            row = []
            for x in range(self.width):
                mid = self.result[y][x]
                if mid is None:
                    row.append(pack_tile(0, 1, 0))  # blocked fallback
                    continue

                behavior = get_behavior(mid, self.primary_attrs,
                                         self.secondary_attrs)
                cat = classify_behavior(behavior)

                # Use collision data from existing maps first
                passable_ratio = self.collision_data.get(mid)
                if passable_ratio is not None:
                    collision = 0 if passable_ratio > 0.5 else 1
                elif cat in ("water",):
                    collision = 0
                elif cat in ("grass", "sand", "cave", "ice", "normal",
                              "door", "ladder", "hot_springs", "ledge"):
                    collision = 0
                else:
                    collision = 1

                # Elevation
                if cat == "water":
                    elevation = 1  # ELEVATION_SURF
                elif collision == 1:
                    elevation = 0
                else:
                    elevation = elevation_default

                row.append(pack_tile(mid, collision, elevation))
            packed.append(row)
        return packed

    def preview_ascii(self):
        """Generate ASCII preview of current state.

        Uses collision data from existing maps to determine blocked vs passable.
        """
        lines = []
        col_header = "    " + "".join(f"{x % 10}" for x in range(self.width))
        lines.append(col_header)

        for y in range(self.height):
            row_chars = []
            for x in range(self.width):
                if self.collapsed[y][x] and self.result[y][x] is not None:
                    mid = self.result[y][x]
                    behavior = get_behavior(mid, self.primary_attrs,
                                             self.secondary_attrs)
                    # Use collision data from existing maps
                    passable_ratio = self.collision_data.get(mid)
                    if passable_ratio is not None:
                        collision = 0 if passable_ratio > 0.5 else 1
                    else:
                        cat = classify_behavior(behavior)
                        collision = 0 if cat in ("grass", "water", "sand", "cave",
                                                  "ice", "normal", "door", "ladder",
                                                  "ledge", "hot_springs") else 1
                    row_chars.append(classify_tile(mid, collision, behavior))
                else:
                    n = len(self.grid[y][x])
                    if n == 0:
                        row_chars.append("X")  # Contradiction
                    elif n <= 9:
                        row_chars.append(str(n))
                    else:
                        row_chars.append("?")
            lines.append(f"{y:3d} " + "".join(row_chars))

        return "\n".join(lines)


def load_seed_grid(path):
    """Load and validate a seed grid JSON file."""
    with open(path) as f:
        seed = json.load(f)

    required = ["width", "height", "tileset_pair", "grid"]
    for key in required:
        if key not in seed:
            print(f"Error: seed grid missing required key '{key}'", file=sys.stderr)
            sys.exit(1)

    if len(seed["grid"]) != seed["height"]:
        print(f"Error: grid has {len(seed['grid'])} rows but height={seed['height']}",
              file=sys.stderr)
        sys.exit(1)

    for i, row in enumerate(seed["grid"]):
        if len(row) != seed["width"]:
            print(f"Error: grid row {i} has {len(row)} cols but width={seed['width']}",
                  file=sys.stderr)
            sys.exit(1)

    return seed


def write_map_bin(packed_grid, output_path):
    """Write packed u16 grid as little-endian binary."""
    with open(output_path, "wb") as f:
        for row in packed_grid:
            for tile in row:
                f.write(struct.pack("<H", tile))
    size = os.path.getsize(output_path)
    print(f"Wrote {output_path} ({size} bytes)")


def main():
    parser = argparse.ArgumentParser(
        description="WFC solver for pokeemerald map generation"
    )
    parser.add_argument("--seed", required=True, help="Path to seed grid JSON")
    parser.add_argument("--output", "-o", help="Output path for map.bin")
    parser.add_argument("--constraints", default=DEFAULT_CONSTRAINTS_PATH,
                        help="Path to adjacency_db.json")
    parser.add_argument("--catalog", default=DEFAULT_CATALOG_PATH,
                        help="Path to stamp_catalog.json")
    parser.add_argument("--max-backtracks", type=int, default=1000)
    parser.add_argument("--preview", action="store_true",
                        help="Show ASCII preview instead of writing binary")
    parser.add_argument("--random-seed", type=int, default=None,
                        help="Random seed for reproducibility")
    parser.add_argument("--connect", action="append", default=[],
                        help="Pin edge to connected map: 'direction:MapName:offset' "
                             "(e.g. 'down:Nulltown:3')")
    parser.add_argument("--name", default=None,
                        help="Map name — auto-detects connections from existing map.json")
    args = parser.parse_args()

    # Auto-detect connections from existing map.json
    if args.name and not args.connect:
        from maplib import load_map_json
        try:
            map_data = load_map_json(args.name)
            connections = map_data.get("connections") or []
            for conn in connections:
                # Convert MAP_FOO_BAR to FooBar
                map_id = conn["map"]  # e.g. MAP_NULLTOWN
                name_part = map_id.replace("MAP_", "")
                # Convert SNAKE_CASE to PascalCase
                map_name = "".join(w.capitalize() for w in name_part.split("_"))
                spec = f"{conn['direction']}:{map_name}:{conn['offset']}"
                args.connect.append(spec)
                print(f"  Auto-connect: {spec}")
        except Exception:
            pass  # no existing map.json, skip

    if args.random_seed is not None:
        random.seed(args.random_seed)

    # Load inputs
    seed = load_seed_grid(args.seed)
    with open(args.constraints) as f:
        constraints = json.load(f)

    catalog = {}
    if os.path.exists(args.catalog):
        with open(args.catalog) as f:
            catalog = json.load(f)

    primary, secondary = seed["tileset_pair"]
    tileset_key = f"{primary}+{secondary}"
    primary_attrs, secondary_attrs = load_metatile_attributes(primary, secondary)

    print(f"Grid: {seed['width']}x{seed['height']}")
    print(f"Tileset: {tileset_key}")

    # Create solver
    solver = WFCSolver(seed["width"], seed["height"], constraints,
                       tileset_key, primary_attrs, secondary_attrs)

    # Apply border metatile if specified
    if "border_metatile" in seed:
        solver.seed_border(seed["border_metatile"])

    # Apply stamps
    stamps_applied = 0
    for stamp_ref in seed.get("stamps", []):
        stamp_name = stamp_ref["name"]
        stamp_data = catalog.get("stamps", {}).get(stamp_name)
        if stamp_data:
            solver.seed_stamp(stamp_data, stamp_ref["x"], stamp_ref["y"])
            stamps_applied += 1
            print(f"  Placed stamp: {stamp_name} at ({stamp_ref['x']}, {stamp_ref['y']})")
        else:
            print(f"  Warning: stamp '{stamp_name}' not found in catalog",
                  file=sys.stderr)

    # Seed connected map edges BEFORE zone constraints — read the neighbor's
    # edge to determine tree vs non-tree pattern, then seed our border row
    # with the right metatile for our parity. WFC propagates from there.
    from maplib import find_layout_for_map
    TREE_MID_SET = {454, 455, 462, 463, 468, 469, 476, 477, 484, 485, 486, 487}
    CL, CR, TL, TR = 468, 469, 476, 477
    connection_cells = set()
    for conn_spec in args.connect:
        parts = conn_spec.split(":")
        if len(parts) != 3:
            continue
        direction, map_name, conn_offset = parts[0], parts[1], int(parts[2])
        result = find_layout_for_map(map_name)
        if not result:
            continue
        layout_info, _ = result
        map_bin = os.path.join(PROJECT_ROOT,
                                layout_info.get("blockdata_filepath", ""))
        if not os.path.exists(map_bin):
            continue
        with open(map_bin, "rb") as f:
            cdata = f.read()
        cw, ch = layout_info["width"], layout_info["height"]

        if direction == "up":
            src_y = ch - 1
            dst_y = 0
        elif direction == "down":
            src_y = 0
            dst_y = seed["height"] - 1
        else:
            continue

        # Build tree mask from connected edge (pair-aware)
        is_tree = {}
        for cx in range(cw):
            dst_x = cx + conn_offset
            if 0 <= dst_x < seed["width"]:
                src_off = (src_y * cw + cx) * 2
                mid = struct.unpack_from("<H", cdata, src_off)[0] & 0x3FF
                is_tree[dst_x] = mid in TREE_MID_SET
        # Promote pairs: if either column is tree, both are
        for x in sorted(is_tree):
            if is_tree[x]:
                pair = (x & ~1) + (1 - (x & 1))
                if pair in is_tree:
                    is_tree[pair] = True

        # Seed edge row and patch the seed grid so stamp_trees forms
        # full columns naturally — no special-cased tile placement.
        seeded = 0
        crown_row = (dst_y % 2 == 0)
        for dst_x, tree in is_tree.items():
            if tree:
                left = (dst_x % 2 == 0)
                if crown_row:
                    mid = CL if left else CR
                else:
                    mid = TL if left else TR

                # Patch seed grid: mark inward rows as "trees" so the
                # normal zone→tree_cells→stamp_trees pipeline handles it
                if direction == "up":
                    inward = range(dst_y + 1, min(dst_y + 3, len(seed["grid"])))
                else:
                    inward = range(dst_y - 1, max(dst_y - 3, -1), -1)
                for iy in inward:
                    orig = seed["grid"][iy][dst_x]
                    if orig not in ("trees", "blocked"):
                        seed["grid"][iy][dst_x] = "trees"
                        # Remember original zone so crown-tips use correct variant
                        if not hasattr(solver, '_original_zones'):
                            solver._original_zones = {}
                        solver._original_zones[(dst_x, iy)] = orig
            else:
                mid = 1  # path
            solver._collapse_to(dst_x, dst_y, mid,
                                prov_method="connection_seed",
                                prov_detail=f"from={map_name} dir={direction} tree={tree}")
            connection_cells.add((dst_x, dst_y))
            seeded += 1
        print(f"  Seeded {direction} edge from {map_name}: {seeded} cells")

    # Track connection-seeded tree cells — stamp_trees must not clear these
    connection_tree_cells = set()
    TREE_MID_CHECK = {468, 469, 476, 477}
    for (cx, cy) in connection_cells:
        if solver.result[cy][cx] in TREE_MID_CHECK:
            connection_tree_cells.add((cx, cy))

    # Apply zone constraints — tree cells pre-collapsed as placeholder,
    # stamp_trees will overwrite with proper structure after WFC
    zones_applied = 0
    tree_cells = list(connection_tree_cells)
    for y, row in enumerate(seed["grid"]):
        for x, zone in enumerate(row):
            if zone is None or solver.collapsed[y][x]:
                continue
            if zone in ("trees", "blocked"):
                tree_cells.append((x, y))
                if y % 2 == 0:
                    mid = 468 if x % 2 == 0 else 469
                else:
                    mid = 476 if x % 2 == 0 else 477
                solver._collapse_to(x, y, mid,
                                    prov_method="seed_zone",
                                    prov_detail=f"zone={zone}")
            else:
                solver.seed_zone(x, y, zone)
                solver.provenance[y][x] = {
                    "method": "seed_zone",
                    "sources": [],
                    "detail": f"zone={zone}",
                }
                zones_applied += 1

    solver.finalize_zone_protection()

    print(f"  Stamps: {stamps_applied}, Tree cells: {len(tree_cells)}, "
          f"Zones: {zones_applied}")

    # Solve
    print("Solving...")
    t0 = time.time()
    success = solver.solve(max_backtracks=args.max_backtracks)
    elapsed = time.time() - t0

    if success:
        print(f"Solved in {elapsed:.2f}s")

        # 1. Stamp trees as complete columns
        solver.stamp_trees(tree_cells, protected=connection_tree_cells)
        print(f"  Stamped trees: {len(tree_cells)} zone cells, "
              f"{len(solver._crown_tip_cells)} crown-tips")

        # 2. Post-process
        solver.post_process(x_parity=0)
        print("  Post-processing: ledges, water buffers, stray tiles")

        # 4. Crown-tips (LAST step — nothing overwrites after)
        CROWN_SET = {468, 469}
        TRUNK_SET = {476, 477, 484, 485, 486, 487}
        CTIP_SET = {462, 463, 454, 455}

        # 4a. Crown-tips for crowns WITHIN our map
        zone_tags = getattr(solver, '_zone_tags', {})
        orig_zones = getattr(solver, '_original_zones', {})
        for y in range(1, solver.height):
            for x in range(solver.width):
                if solver.result[y][x] in CROWN_SET:
                    above = solver.result[y - 1][x]
                    if above not in CROWN_SET | TRUNK_SET | CTIP_SET:
                        tip_zone = orig_zones.get((x, y - 1), zone_tags.get((x, y - 1)))
                        # Check if the tile above the tip is water
                        above_tip_zone = None
                        if y >= 2:
                            above_tip_zone = orig_zones.get((x, y - 2), zone_tags.get((x, y - 2)))
                        if tip_zone == "water" or above_tip_zone == "water":
                            tip = 648 if x % 2 == 0 else 649
                        elif tip_zone == "grass":
                            tip = 454 if x % 2 == 0 else 455
                        else:
                            tip = 462 if x % 2 == 0 else 463
                        solver.result[y - 1][x] = tip
                        solver.provenance[y - 1][x] = {
                            "method": "crown_tip_fixup",
                            "sources": [{"x": x, "y": y, "reason": "crown_below"}],
                            "detail": f"added_tip_above_crown",
                        }

        # 4b removed: each map is self-contained; the game engine renders
        # connected map tiles at boundaries dynamically.

    else:
        print(f"Failed to solve after {elapsed:.2f}s "
              f"(max backtracks: {args.max_backtracks})")
        print("Try increasing --max-backtracks or simplifying the seed grid")

    if args.preview or not args.output:
        print()
        print(solver.preview_ascii())
        print()
        print("Tiles: . = passable  G = grass  # = blocked  = = ledge  "
              "~ = water  D = door  , = sand  i = ice")
        print("Digits = uncollapsed cells (candidate count), X = contradiction")

    if args.output and success:
        elevation = seed.get("elevation_default", 3)
        packed = solver.assign_collision_elevation(elevation_default=elevation)
        write_map_bin(packed, args.output)

        # Export provenance data alongside the map binary
        prov_path = args.output.replace(".bin", "_provenance.json")
        prov_flat = []
        for y in range(solver.height):
            for x in range(solver.width):
                prov_flat.append(solver.provenance[y][x])
        with open(prov_path, "w") as f:
            json.dump(prov_flat, f)
        print(f"Wrote {prov_path}")


if __name__ == "__main__":
    main()
