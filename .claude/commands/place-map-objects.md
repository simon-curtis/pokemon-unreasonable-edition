---
description: Place objects on a map — NPCs, items, warps, triggers, signs. Enforces coordinate system, tile constraints, elevation rules, and warp pairing.
---

# Map Object Placement Skill

You are placing objects on a Pokemon Emerald map. Follow these rules exactly.

## Coordinate System

Grid G is W x H tiles. Position P = (x, y) where x in [0, W), y in [0, H).
Origin (0, 0) = top-left. x+ = east, y+ = south.
Layout viewer column = x, row = y.

## Required: Run Layout Viewer First

Before placing ANY object, run:
```
python3 tools/map-builder/scripts/layout_viewer.py <MapName> --legend
```
Cross-reference 2-3 existing objects in map.json against the viewer grid to verify your coordinate mapping. Column = x, row = y. If they don't match, stop and fix your understanding.

## Tile Properties

Each tile T(x, y) has:
- collision C(x, y) in {passable, blocked}
- elevation E(x, y) in {0..15}

## Placement Constraints

### object_events (NPCs, items, trainers)
- REQUIRE: C(x, y) = passable. Blocked = invisible/unreachable.
- Elevation field = 3 (both outdoor and indoor)

### warp_events (doors, stairs)
- REQUIRE: C(x, y) = passable. Player must step on tile to trigger.
- Elevation field = 0
- Place ON the door/stair tile itself, not adjacent
- warp_id = 0-indexed position in destination map's warp_events array

### coord_events (triggers/barriers)
- REQUIRE: Cover ALL passable tiles at the boundary. Passage width N = N triggers.
- Uncovered passable tile = player bypass. This is a critical error.
- Elevation: outdoor = 3, indoor = 0

### bg_events (signs, PCs, TVs, interactables)
- Place on the TARGET tile the player faces toward, NOT the tile the player stands on
- Wall-mounted (PC, TV): target is the blocked wall tile, player_facing = BG_EVENT_PLAYER_FACING_NORTH
- Freestanding (signs): player_facing = BG_EVENT_PLAYER_FACING_ANY
- REQUIRE: Signs and warps must NOT overlap (use different tiles)

## Elevation Table

| Context | object_events | warp_events | coord_events |
|---------|--------------|-------------|--------------|
| Outdoor | 3            | 0           | 3            |
| Indoor  | 3            | 0           | 0            |

Wrong elevation = object exists but cannot be interacted with. Silent failure.

## Warp Pairing Rules

For maps A (exterior) and B (interior):
- A.warp[i] at (xa, ya) → MAP_B, warp_id: j
- B.warp[j] at (xb, yb) → MAP_A, warp_id: i
- REQUIRE: Bidirectional. warp_id references must be symmetric indices.
- Multi-tile doors: multiple warps in B can reference same warp_id in A.

## Verification Protocol (mandatory)

After editing map.json:
1. Run layout_viewer.py with --legend again
2. Confirm every placed object matches passable/blocked expectation
3. Confirm coord_events cover full passage width (count passable tiles)
4. Confirm warp_id indices match array positions in BOTH maps
5. Report placement summary to user with coordinates and tile status

## String Literals

In scripts.inc, NEVER use straight quotes. Use curly quotes:
- Opening double: " (U+201C)
- Closing double: " (U+201D)
- Opening single/apostrophe: ' (U+2018)
- Closing single/apostrophe: ' (U+2019)

Claude cannot output these characters directly (tokenizer limitation). Use placeholders (`PLACEHOLDER_LDQUOTE` etc.) then run:
```bash
python3 tools/map-builder/scripts/fix_curly_quotes.py <file>
```

## User Context

$ARGUMENTS
