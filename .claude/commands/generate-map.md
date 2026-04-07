---
description: Generate a new map from a text description using the WFC pipeline. Use when creating new town, route, or area maps for the ROM hack.
paths: ["tools/map-builder/scripts/*", "data/layouts/layouts.json", "data/maps/map_groups.json"]
---

# Generate Map

Create a new pokeemerald map from a natural language description using the WFC (Wave Function Collapse) pipeline.

$ARGUMENTS

---

## Pipeline Overview

1. **Understand** the request — dimensions, features, tileset, connections
2. **Research** similar existing maps for reference
3. **Generate seed grid** — use seed_generator.py or write JSON manually
4. **Run WFC solver** — fills metatile details
5. **Write map files** — map.bin, map.json, scripts.inc
6. **Verify** — layout viewer + query engine
7. **Iterate** if needed

## Step 1: Understand the Request

Determine from the description:
- **Map type**: town, route, cave, indoor (affects tileset + settings)
- **Dimensions**: small town = 20x20, medium = 30x30, route = 20x40+
- **Tileset pair**: outdoor = gTileset_General + city-specific secondary
- **Key features**: buildings (PokemonCenter, Mart, houses), water, cliffs, grass areas, ledges
- **Connections**: which maps connect and from which edges
- **Entry/exit points**: where the player enters/leaves

## Step 2: Research Reference Maps

Query similar existing maps for structural reference:

```bash
python3 tools/map-builder/scripts/map_query.py <SimilarMap> summary
python3 tools/map-builder/scripts/map_query.py <SimilarMap> buildings
python3 tools/map-builder/scripts/map_query.py <SimilarMap> features
python3 tools/map-builder/scripts/layout_viewer.py <SimilarMap> --legend
```

## Step 3: Generate Seed Grid

### Option A: Seed Generator (preferred for routes)

Use the seed generator for compact route descriptions:

```bash
python3 tools/map-builder/scripts/seed_generator.py route \
    --width 24 --height 30 \
    --path "S:11,29 -> 11,24 -> 7,18 -> 7,14 -> 15,10 -> 15,6 -> 11,2 -> N:11,0" \
    --path-width 2 \
    --grass-width 2 \
    --ledge "5,12:14" \
    --pond "17,13:4x5" \
    --border 2 \
    --preview \
    --output /tmp/seed_<MapName>.json
```

**Seed generator parameters:**
- `--path "S:x,y -> x,y -> N:x,y"` — waypoints with S/N/E/W prefixes for entries/exits
- `--path-width N` — half-width of path corridor (default 1, use 2 for wider routes)
- `--grass-width N` — grass border around paths (default 2)
- `--ledge "x,y:length"` — south-facing ledge row starting at (x,y)
- `--pond "x,y:wxh"` — water body at (x,y) with width x height
- `--stamp "name:x,y"` — place a building stamp
- `--border N` — tree border thickness (default 2)
- `--preview` — show ASCII preview of the seed grid before WFC

### Option B: Manual JSON (for complex towns)

Write a JSON seed grid directly for fine control over building placement and irregular layouts.

**Zone tags:** `"grass"`, `"water"`, `"path"`, `"trees"`, `"sand"`, `"cave"`, `"ice"`, `"open"`, `"blocked"`, `"ledge_south"`, `"ledge_east"`, `"ledge_west"`, `null`

- `null` = unconstrained (WFC fills naturally)
- `"trees"` / `"blocked"` = guaranteed blocked tiles (hard-filtered at collapse)
- `"ledge_south"` etc. = directional ledge tiles (protected from propagation)
- `"water"` = water tiles (protected from propagation)
- `"grass"` = tall grass encounter tiles (protected from propagation)

**Available stamps** (run `python3 tools/map-builder/scripts/stamp_catalog.py list`):
- `pokecenter_*` — Pokemon Center variants (5x3 to 8x5)
- `mart_*` — Pokemart variants (5x3 to 6x5)
- `house_small_*` — Small houses (6x3)
- Gym, specific buildings per city tileset

**Design principles:**
- Border 2+ rows of `"trees"` at edges
- Place stamps with 1-2 tiles of `null` or `"path"` clearance around them
- Entry/exit: leave `"path"` gaps in tree border
- Use `null` for transition zones between features

## Step 4: Run WFC Solver

```bash
# Preview first
python3 tools/map-builder/scripts/wfc_solver.py \
    --seed /tmp/seed_<MapName>.json \
    --preview \
    --random-seed <any number>

# Try different random seeds for variety
# When satisfied, generate the binary:
python3 tools/map-builder/scripts/wfc_solver.py \
    --seed /tmp/seed_<MapName>.json \
    --output /tmp/<MapName>_map.bin \
    --random-seed <number>
```

**Troubleshooting:**
- **Too open / not enough trees**: add more `"trees"` zones (they hard-filter to blocked metatiles)
- **Ledges/water missing**: these zones are protected from propagation — verify zone tags are correct
- **Contradictions (X)**: simplify the seed, reduce tight zone clusters, add `null` buffer zones
- **Slow solving**: increase `--max-backtracks 10000`

## Step 5: Write Map Files

```bash
python3 tools/map-builder/scripts/map_writer.py \
    --name <MapName> \
    --seed /tmp/seed_<MapName>.json \
    --music <MUS_CONSTANT> \
    --type <MAP_TYPE> \
    --random-seed <same number as step 4>
```

This creates:
- `data/layouts/<MapName>/map.bin` + `border.bin`
- `data/maps/<MapName>/map.json` (with auto-detected door warps)
- `data/maps/<MapName>/scripts.inc` (skeleton)
- Updates `data/layouts/layouts.json`

## Step 6: Verify

```bash
# Visual check
python3 tools/map-builder/scripts/layout_viewer.py <MapName> --legend

# Reachability from entry point
python3 tools/map-builder/scripts/map_query.py <MapName> passable_area <entry_x> <entry_y>

# Building inventory
python3 tools/map-builder/scripts/map_query.py <MapName> buildings

# Path between entry and key locations
python3 tools/map-builder/scripts/map_query.py <MapName> path <x1> <y1> <x2> <y2>

# What's near the Pokemon Center?
python3 tools/map-builder/scripts/map_query.py <MapName> nearby <x> <y> 5
```

**Must verify:**
- All buildings/exits reachable from entry point
- Doors detected and warps listed
- No isolated passable areas
- Ledge directions correct (player can jump south, not climb back)
- Water bodies fully enclosed

## Step 7: Manual Integration

After generation, complete these steps (build will fail without them):

1. **Register in map_groups.json**: add to appropriate group in `data/maps/map_groups.json`
2. **Include scripts**: add `.include "data/maps/<MapName>/scripts.inc"` to `data/event_scripts.s`
3. **Pair warps**: update `dest_map` and `dest_warp_id` in map.json for each warp
4. **Write scripts**: add NPC dialog, events, triggers to `scripts.inc`
5. **Add flags/vars**: rename `FLAG_UNUSED_*` / `VAR_UNUSED_*` in flags.h/vars.h if needed

## Tileset Reference

| Map Type | Primary | Common Secondary |
|----------|---------|-----------------|
| Small town | gTileset_General | gTileset_Petalburg |
| Large city | gTileset_General | gTileset_Rustboro, gTileset_Slateport, gTileset_Mauville |
| Route | gTileset_General | same as nearest city |
| Cave | gTileset_General | gTileset_Cave |
| Indoor | gTileset_Building | gTileset_GenericBuilding |

## Music Reference

Small towns: `MUS_LITTLEROOT`, `MUS_OLDALE`, `MUS_LAVARIDGE`
Cities: `MUS_PETALBURG`, `MUS_RUSTBORO`, `MUS_SLATEPORT`, `MUS_MAUVILLE`
Routes: `MUS_ROUTE101`, `MUS_ROUTE104`, `MUS_ROUTE110`, `MUS_ROUTE113`
