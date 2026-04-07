---
description: Trace a map's event script state machine — var/flag transitions, on-frame loop safety, lock pairing.
---

# Debug Script Tracer

Trace the full state machine for a map's event scripts. Find bugs before they hit the emulator.

$ARGUMENTS

---

## PROCEDURE

1. Read `data/maps/<Map>/scripts.inc` and `data/maps/<Map>/map.json`
2. Extract all `VAR_*` and `FLAG_*` used in the map
3. For each var, grep `setvar.*VAR_NAME` across ALL map scripts (not just this map) to find every transition
4. Build the state transition table:

```
VAR_<MAP>_STATE:
  0 → 1: set in <Map>/scripts.inc:<line> (<context>)
  1 → 2: set in <OtherMap>/scripts.inc:<line> (<context>)
  ...
```

5. For each coord_event trigger: verify the var_value has a reachable setvar path
6. For each MAP_SCRIPT_ON_FRAME_TABLE entry: verify the script advances the var past the matched value

## ON-FRAME LOOP CHECK (CRITICAL)

For every `map_script_2 VAR, VALUE, SCRIPT` entry, trace SCRIPT and confirm:
- Script sets VAR to a value OTHER than any matched value in the table
- This happens in ALL code paths (including the "already done" early-exit path)
- Uses `lockall`/`releaseall` (not `lock`/`release`)

Write out the frame-by-frame execution trace:
```
frame 1: VAR=<matched>, runs SCRIPT, VAR becomes <new>
frame 2: VAR=<new>, no match in table, stops
```

If any path leaves VAR at a matched value → HARD FREEZE BUG. Flag it.

## LOCK PAIRING CHECK

For every script entry point:
- If called from coord_event or object_event: `lock`/`release` OK
- If called from MAP_SCRIPT_ON_FRAME_TABLE: MUST use `lockall`/`releaseall`
- Every `lock`/`lockall` must have exactly one matching `release`/`releaseall` on every code path
- `msgbox MSGBOX_DEFAULT` does NOT contain lock/release internally (it's just message/waitmessage/waitbuttonpress)

## COORD_EVENT COVERAGE CHECK

For each coord_event at position (x, y) with var_value V:
- Trace what state the player is in when they reach (x, y)
- Check if V matches that state
- Remember: building exits auto-walk player SOUTH (y+1 from warp tile). coord_events do NOT fire during auto-walk — trigger must be on a voluntary step tile.

## OUTPUT

Report as a table:
```
State Machine: VAR_<MAP>_STATE
  State | Set Where                    | Triggers/Events Using
  0     | initial                      | coord_event(10,1), coord_event(11,1)
  1     | Nulltown/scripts.inc:92      | coord_event(10,1), coord_event(11,1)
  2     | ThornsLab/scripts.inc:369    | on_frame → Screamer
  ...

Issues Found:
  [FREEZE] on_frame entry for state 3 does not advance var
  [UNREACHABLE] coord_event at (7,15) expects state 2 but player arrives at state 3
  [LOCK] Screamer script uses lock/release but is called from on_frame (needs lockall/releaseall)
```
