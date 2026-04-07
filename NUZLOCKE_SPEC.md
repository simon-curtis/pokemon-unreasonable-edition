# Nuzlocke Spec — Pokemon Unreasonable Edition

## Core Rules (Always On)

1. **Permadeath** — Any Pokemon reaching 0 HP (battle, field poison, recoil, self-destruct — anything) stays at 0 HP forever. Eggs exempt.
2. **No revival healing** — `HealPlayerParty()` skips 0 HP Pokemon. Covers Pokemon Centers, mom's house, whiteout warp, all heal sources.
3. **Revive items purged** — Revive, Max Revive, Revival Herb, Sacred Ash removed from all shops (7 marts), item balls (~15 map locations), pickup tables, lottery prizes, Trainer Hill prizes, Battle Pyramid items, Lilycove Lady gifts. Enemy trainers also lose revives.
4. **Ho-Oh held item** — Sacred Ash replaced with a rare useful item (PP Max or similar).

## Encounter Restrictions

5. **One wild encounter per type per map** — Land, water, rock smash, fishing tracked separately per `gWildMonHeaders` entry. ~170 bytes in save block.
6. **Lock on battle start** — Flag set the moment wild battle begins, regardless of outcome.
7. **Wild battles continue after lock** — But throwing any ball (including Safari Balls) is blocked. Message: *"You know the rules, and so do I."* Ball not consumed.
8. **No dupes clause** — You get what you get.
9. **Safari Zone follows same rules** — One encounter per type per Safari map.

## Exemptions

10. **Static/gift/scripted Pokemon** — Starters, legendaries, NPC gifts, in-game NPC trades: all exempt from encounter limits.
11. **Roaming Pokemon** — Latias/Latios exempt, don't burn route encounters.
12. **Battle Frontier** — Deaths in Frontier facilities don't count. Pokemon restored after challenges.
13. **Link trades** — Work normally. Honor system.
14. **Items on dead Pokemon** — Freely recoverable.

## Edge Cases

15. **Dead Pokemon persist** — Stay in party/box at 0 HP. Can be deposited to PC.
16. **Total wipe** — No special game over. Player is softlocked, must restart manually.
17. **Daycare** — Dead Pokemon can be deposited/withdrawn, stay dead. No exploit.

## Implementation Touch Points

### Save Data
- Add `u8 nuzlockeEncounters[WILD_MON_HEADER_COUNT]` to `SaveBlock1` — 4 bits per entry (land, water, rock smash, fishing), one entry per `gWildMonHeaders` index.

### Healing (`src/script_pokemon_util.c`)
- `HealPlayerParty()`: skip Pokemon with `hp == 0`.

### Ball Throwing (`src/battle_script_commands.c`)
- `Cmd_handleballthrow()`: check encounter flag before throw. If set, show quip and cancel. Don't consume ball.
- Safari Ball path (`src/battle_util.c` `HandleAction_SafariZoneBallThrow`): same check.

### Encounter Flagging (`src/wild_encounter.c`)
- `StandardWildEncounter()`, `FishingWildEncounter()`, `RockSmashWildEncounter()`: set the appropriate bit in `nuzlockeEncounters` when wild battle starts.
- `SweetScentWildEncounter()`: same — uses land/water encounter type.

### Revive Item Removal
- **Shops**: Remove ITEM_REVIVE/ITEM_MAX_REVIVE/ITEM_REVIVAL_HERB from mart scripts in: BattleFrontier_Mart, LavaridgeTown_Mart, LavaridgeTown_HerbShop, LilycoveCity_DepartmentStore_2F, FortreeCity_Mart, MossdeepCity_Mart, SootopolisCity_Mart.
- **Item balls**: Remove/replace revive item events in: Route109, Route110, Route114, Route117, Route120, Route121, Route123, Route133, PetalburgCity, AbandonedShip_Rooms2_1F, SafariZone_Southwest, MagmaHideout_4F, NavelRock_Top.
- **Lottery**: Replace ITEM_MAX_REVIVE in `src/lottery_corner.c`.
- **Trainer Hill**: Replace revives in prize tables in `src/trainer_hill.c`.
- **Battle Pyramid**: Replace revives in item tables in `src/battle_pyramid.c`.
- **Lilycove Lady**: Replace revives in `src/data/lilycove_lady.h`.
- **Ho-Oh**: Replace ITEM_SACRED_ASH held item in `src/data/pokemon/species_info.h`.

### Battle Frontier Exemption
- `SaveSelectedParty()` in `src/frontier_util.c`: restore fainted Pokemon HP to pre-challenge values so Frontier deaths don't persist.

### Roamer Exemption
- `TryStartRoamerEncounter()` in `src/roamer.c`: do not set encounter flags when roamer battle triggers.
