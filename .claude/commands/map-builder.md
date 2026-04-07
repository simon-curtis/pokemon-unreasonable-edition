---
description: Map creation expert — new map checklist, map.json templates, file locations, elevation rules, trainer setup. Use when creating or editing maps, trainers, or map.json files.
paths: ["data/maps/**/map.json", "data/maps/map_groups.json", "src/data/trainers.h", "src/data/trainer_parties.h"]
---

# Map Builder

Expert at creating and configuring pokeemerald maps. Handles map.json structure, object placement, trainer registration, and build integration.

$ARGUMENTS

---

## New Map Checklist (ALL required or build fails)

1. **Create map directory**: `data/maps/<Map>/map.json` + `scripts.inc`
2. **Register in `data/maps/map_groups.json`**: add to group + `group_order`. Add to `connections_include_order` if map has connections
3. **Include scripts in `data/event_scripts.s`**: append `.include "data/maps/<Map>/scripts.inc"` — NOT auto-generated, missing = linker error
4. **Flags/vars**: rename `FLAG_UNUSED_*` / `VAR_UNUSED_*` slots in `include/constants/flags.h` / `vars.h`
5. **Heal locations**: add to `src/data/heal_locations.json` if Pokemon Center

`header.inc`, `events.inc`, `connections.inc` are auto-generated from `map.json` — never edit directly.

## map.json Object Templates

### object_events (NPC/trainer)

```json
{
  "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
  "x": 10, "y": 5, "elevation": 3,
  "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
  "movement_range_x": 0, "movement_range_y": 0,
  "trainer_type": "TRAINER_TYPE_NONE",
  "trainer_sight_or_berry_tree_id": "0",
  "script": "Map_EventScript_NPC",
  "flag": "0"
}
```

| Field | Values |
|-------|--------|
| `trainer_type` | `TRAINER_TYPE_NONE` = dialog NPC, `TRAINER_TYPE_NORMAL` = battle trainer |
| `trainer_sight_or_berry_tree_id` | Sight range (1-9) for trainers, "0" for NPCs |
| `flag` | `"0"` = always visible, `"FLAG_HIDE_*"` = hidden until flag cleared |

### warp_events

```json
{"x": 5, "y": 8, "elevation": 0, "dest_map": "MAP_DEST", "dest_warp_id": "0"}
```

Bidirectional. Elevation always 0. `dest_warp_id` = 0-indexed position in destination's warp_events array.

**Building exits:** player auto-walks SOUTH (y+1) out of doors. Exit trigger goes at warp y+1, not y-1.

### coord_events (triggers)

```json
{"type": "trigger", "x": 7, "y": 0, "elevation": 3, "var": "VAR_STATE", "var_value": "0", "script": "..."}
```

**CRITICAL:** cover ALL passable tiles at the boundary. Passage width N = N triggers. Uncovered tile = player bypass.

### bg_events (signs/interactables)

```json
{"type": "sign", "x": 5, "y": 3, "elevation": 0, "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY", "script": "..."}
```

Wall-mounted (PC, TV): target is the blocked wall tile, `player_facing_dir` = `BG_EVENT_PLAYER_FACING_NORTH`. Signs/warps must NOT overlap tiles.

## Elevation Table

| Context | object_events | warp_events | coord_events |
|---------|--------------|-------------|--------------|
| Outdoor | 3 | 0 | 3 |
| Indoor | 3 | 0 | 0 |

Wrong elevation = object exists but cannot be interacted with. **Silent failure.**

## Key File Locations

| What | File | Notes |
|------|------|-------|
| Trainer parties | `src/data/trainer_parties.h` | Append before EOF. Read last entry for format |
| Trainer defs | `src/data/trainers.h` | Append before final `};` |
| Trainer IDs | `include/constants/opponents.h` | Add before `TRAINERS_COUNT`, bump count |
| Species | `include/constants/species.h` | |
| Items | `include/constants/items.h` | |
| Sprites | `include/constants/event_objects.h` | |
| Movement types | `include/constants/event_object_movement.h` | |
| Trainer classes/pics | `include/constants/trainers.h` | |
| Music/SFX | `include/constants/songs.h` | |
| Wild encounters | `src/data/wild_encounters.json` | Not the .h |
| Flags | `include/constants/flags.h` | Grep `FLAG_UNUSED_` |
| Vars | `include/constants/vars.h` | Grep `VAR_UNUSED_` |

## Mandatory Verification

**Always** run the layout viewer before AND after placing objects:

```bash
python3 tools/map-builder/scripts/layout_viewer.py <MapName> --legend
```

Confirm every object is on a passable tile, coord_events cover full passage width, and warp_id indices match array positions in BOTH maps.
