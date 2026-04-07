# CLAUDE.md

**Pokemon Unreasonable Edition** — pokeemerald decompilation fork (GBA ROM hack). C + assembly → GBA ROM via custom toolchain.

## Build

```bash
make -j$(nproc)              # Build ROM (legacy agbcc, default)
make clean                   # Clean everything
```

No test suite. Correctness = `make compare`. Prerequisites: `build-essential binutils-arm-none-eabi git libpng-dev` + `tools/agbcc/`.

Pipeline: `.c → preproc (charmap.txt) → agbcc/gcc → .s → as → .o → ld → .elf → objcopy → .gba`

Asset pipelines: PNG→`gbagfx`→tile data | MIDI→`mid2agb`→asm | WAV→`wav2agb`→samples | `map.json`→`mapjson`→`.inc` (auto-generated)

## C Language: gnu89 (C89 + GNU extensions)

- Variables declared at block top only
- `/* */` comments only, no `//`
- No `for (int i = 0; ...)` — declare before loop
- **No `\uXXXX` or `\xe2` escapes** — agbcc doesn't support them. Prefer rephrasing to avoid quotes (`is` not `'s`)

## Key Architecture

| Directory | Contents |
|-----------|----------|
| `src/` | ~309 C files: battle, overworld, scripting, menus |
| `data/maps/` | 519 maps — `map.json` defines layout/events/warps/NPCs |
| `data/scripts/` | Event scripts (assembly macros from `asm/macros/`) |
| `data/layouts/` | 442 map layouts |
| `include/constants/` | `species.h`, `moves.h`, `flags.h`, `vars.h`, etc. |
| `src/data/` | C data tables: moves, species stats, wild encounters |
| `graphics/` | PNG sources → GBA formats |
| `sound/` | MIDI music, WAV cries, voicegroups |

GBA memory: ROM@0x08000000 (32MB), EWRAM@0x02000000 (256KB), IWRAM@0x03000000 (32KB)

## Preferred Tools

- **`bun`** not `npm` — e.g., `bun install`, `bun add lodash`
- **`bunx`** not `npx` — e.g., `bunx tsc`, `bunx eslint`
- **`uv pip`** not `pip` — e.g., `uv pip install requests`
- **`rg`** not `grep` — use the Grep tool or `rg` directly

Enforced by PreToolUse hook in `~/.claude/hooks/rewrite_commands.sh`.

## Critical Conventions

- `.inc` files in `data/maps/*/` (`header.inc`, `events.inc`, `connections.inc`) are **auto-generated** — edit `map.json` instead
- **NEVER use Write on `.inc` files** — always Edit. Only Write for brand-new files.
- `charmap.txt` defines string encoding; `preproc` converts string literals using it

## Charmap & Quotes

No straight quotes in `.string` literals. Use placeholder workflow:

1. Write: `PLACEHOLDER_LDQUOTE` / `PLACEHOLDER_RDQUOTE` / `PLACEHOLDER_LSQUOTE` / `PLACEHOLDER_RSQUOTE`
2. Run: `python3 tools/map-builder/scripts/fix_curly_quotes.py <file>`

Straight `"` or `'` in `.string` → build error.

## Adding Maps

See `/map-builder` skill. Minimum (all required):

1. Create `data/maps/YourMap/map.json` + `scripts.inc`
2. Register in `data/maps/map_groups.json`
3. Add `.include` in `data/event_scripts.s`
4. Rename `FLAG_UNUSED_*` / `VAR_UNUSED_*` if needed
5. Add to `src/data/heal_locations.json` if Pokemon Center

## Object Placement

**Always run layout viewer before placing objects:**

```bash
python3 tools/map-builder/scripts/layout_viewer.py <MapName> [--legend|--no-objects|--metatiles|--collision]
```

Reads collision bits + metatile behavior, overlays objects from `map.json`. Coordinates: **(x, y)**, origin (0,0) top-left, X→right, Y→down.

- Never guess coords — verify with tool
- Ledges (`=`) are one-way; trace walking paths, use BFS for complex routes
- Re-run viewer after edits to confirm placement

## Event Scripting

See `/script-writer` skill. Key pitfalls:

- `coord_event` fires on **exact** `var_value` match — N states = N triggers
- `MAP_SCRIPT_ON_FRAME_TABLE` fires every frame — must advance var or player freezes
- On-frame: `lockall`/`releaseall` (not `lock`/`release`)
- Use geometric coord comparison, not `GetPlayerFacingDirection`
- `subvar` resolves vars via `VarGet`; `addvar` takes literals only

## Map Making

See `tools/map-builder`

## Story & Tone

Docs in `story/STORY.md`. Starts in Nulltown (replaces Littleroot). Absurdia — Resonance Energy = emotional bonds as electricity. Bureau profits from grief. Nuzlocke is canon.

Dark comedy + Pokemon. `/tone-guide` skill for details. Deadpan delivery, weather-report energy. NPC is never in on the joke.
