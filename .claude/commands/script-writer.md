---
description: Event scripting reference — macros, control flow, dialog, state machines, on-frame scripts. Use when writing or editing .inc script files.
paths: ["data/maps/**/*.inc", "data/scripts/**", "data/event_scripts.s"]
---

# Event Script Writer

Expert at writing pokeemerald event scripts. All scripts use macros from `asm/macros/event.inc`.

$ARGUMENTS

---

## Labels

- Scripts: `Map_EventScript_Name::`
- Text: `Map_Text_Name:`
- Movement: `Map_Movement_Name:`

Comments: `@` line comments or `/* */` blocks.

## Control Flow

| Macro | Usage |
|-------|-------|
| `lock` / `release` | Lock/release player movement (object_event/coord_event scripts) |
| `lockall` / `releaseall` | Lock/release all (on-frame scripts ONLY) |
| `end` | End script execution |
| `goto label` | Unconditional jump |
| `call label` / `return` | Subroutine call/return |
| `goto_if_eq VAR, VAL, label` | Branch if equal |
| `goto_if_ne VAR, VAL, label` | Branch if not equal |
| `goto_if_ge VAR, VAL, label` | Branch if greater/equal |
| `goto_if_le VAR, VAL, label` | Branch if less/equal |
| `goto_if_set FLAG, label` | Branch if flag set |
| `goto_if_unset FLAG, label` | Branch if flag unset |

## Dialog

| Macro | Effect |
|-------|--------|
| `msgbox label, MSGBOX_DEFAULT` | Show message, wait for button |
| `msgbox label, MSGBOX_YESNO` | Yes/No prompt → VAR_RESULT (YES=1) |
| `msgbox label, MSGBOX_NPC` | NPC dialog (auto lock/faceplayer/release) |
| `msgbox label, MSGBOX_SIGN` | Sign dialog (auto lock/release) |
| `msgbox label, MSGBOX_AUTOCLOSE` | Auto-closing message |
| `faceplayer` | Turn NPC to face player |

## State

| Macro | Notes |
|-------|-------|
| `setvar VAR, VAL` | Set variable |
| `addvar VAR, VAL` | Add literal constant (NOT var) |
| `subvar VAR, VAR2` | Subtract — resolves VAR2 via VarGet |
| `copyvar VAR_DEST, VAR_SRC` | Copy variable |
| `setflag FLAG` | Set flag |
| `clearflag FLAG` | Clear flag |

`subvar` resolves var arguments via `VarGet`; `addvar` only takes literal constants. Plan arithmetic accordingly.

## Objects & Movement

```
addobject ID
removeobject ID
applymovement ID, MovementLabel
waitmovement ID
```

Movement data uses macros from `asm/macros/movement.inc`. Always end with `step_end`.

## Battle & Items

```
trainerbattle_single TRAINER_ID, IntroText, DefeatText
givemon SPECIES, LEVEL, ITEM_NONE, 0, 0, 0
giveitem ITEM, QUANTITY
call Common_EventScript_OutOfCenterPartyHeal
```

## Audio

```
playse SE_PIN
playfanfare MUS_OBTAIN_ITEM
waitfanfare
```

## Text Format

`.string "Line one.\p"` then `.string "Next box.$"`

| Code | Effect |
|------|--------|
| `\n` | Line break (within box) |
| `\p` | New text box |
| `$` | End of string (required) |
| `{PLAYER}` | Player name |

~35 characters per line width. End all strings with `.$`.

**Curly quotes:** No straight quotes in `.string`. Use `PLACEHOLDER_LDQUOTE` / `PLACEHOLDER_RDQUOTE` / `PLACEHOLDER_LSQUOTE` / `PLACEHOLDER_RSQUOTE` then run `python3 tools/map-builder/scripts/fix_curly_quotes.py <file>`. Best practice: rephrase to avoid quotes entirely.

## State Machines

When using `VAR_*` to gate progression:

- `coord_event` triggers fire on **exact** `var_value` match only — N states = N triggers
- Check highest state first via `goto_if_ge` to avoid fall-through bugs
- Always pair `lock`/`release`/`end`
- Trace every `setvar` call across ALL maps — confirm reachability through normal gameplay
- Cross-map gaps: a trigger in map A checking `VAR == 0` needs some script in map A (not just map B) to advance the var

## On-Frame Scripts (CRITICAL)

`MAP_SCRIPT_ON_FRAME_TABLE` fires **every frame** while var matches. Rules:

1. Script **MUST** advance var past the matched value — or player freezes in lockall loop
2. Use `lockall`/`releaseall` (NOT `lock`/`release`)
3. ALL code paths must advance the var, including "already done" early-exit paths

```
@ Example: safe on-frame pattern
map_script_2 VAR_MAP_STATE, 1, Map_EventScript_Cutscene

Map_EventScript_Cutscene::
    lockall
    @ ... do stuff ...
    setvar VAR_MAP_STATE, 2   @ MUST advance past 1
    releaseall
    end
```

## Editing Rules

- **NEVER use Write on `.inc` files** — always use Edit for surgical changes
- Only use Write for brand-new files that don't exist yet
- Leave all unrelated script/text blocks untouched
