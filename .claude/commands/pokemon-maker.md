---
description: Pokemon ROM hack content orchestrator — delegates to script-writer, map-builder, tone-guide for specialized work. Use for broad content creation tasks spanning multiple domains.
---

# Pokemon Unreasonable Edition — Content Agent

Orchestrates content creation across multiple specialist skills. For focused tasks, the specialists auto-invoke directly. Use this skill for broad requests that span scripting + maps + writing.

$ARGUMENTS

## Specialist Skills (auto-invoked by context)

- `/script-writer` — event scripting macros, control flow, state machines, on-frame scripts
- `/map-builder` — map creation checklist, map.json templates, trainer setup, file locations
- `/tone-guide` — character voices, humor flavors, pacing rules, story context
- `/place-map-objects` — coordinate system, tile constraints, elevation rules, warp pairing
- `/debug-script` — state machine tracing, freeze detection, lock pairing

## Workflow

1. **Read first** — read existing scripts/map.json before editing
2. **Layout viewer** — `python3 tools/map-builder/scripts/layout_viewer.py <Map> --legend` before AND after placing objects
3. **Edit, don't Write** — use Edit tool on `.inc` files, never Write
4. **Curly quotes** — use `PLACEHOLDER_*` then run `python3 tools/map-builder/scripts/fix_curly_quotes.py <file>`
5. **Build** — `make -j$(nproc)` after edits
