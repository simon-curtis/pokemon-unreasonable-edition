# Ferro City

**Type:** City (Major)
**Act:** 1
**Population:** ~2,500
**Gym:** Steel-type — Leader Anvil
**Motto:** "Built on Steel. Powered by Feelings." (This is not a metaphor.)

---

## Overview

Ferro City is the first major city the player encounters — an industrial hub built around a massive steel mill that doubles as the region's primary Resonance Energy processing plant. The city is functional, hardworking, and perpetually noisy. Steam vents, grinding metal, sparks flying from the mill. Resonance Energy conduits run along every building like exposed veins, glowing faint blue, humming audibly.

The city is run by Mayor Anvil, who is also the Gym Leader, and who hasn't slept in three days. The Bureau has a visible presence here — the power plant has military-grade security, and Bureau employees monitor the conduit network. Ferro City is where the player gets their first badge and their first real hint that something is wrong.

---

## Layout

Ferro City is a medium-sized city map — roughly 3x the size of Nulltown. It's divided into four quadrants around a central intersection.

### Map Structure

```
                    [Route to Underlake - North Exit]
                            |
                    ┌───────────────┐
                    │  STEEL MILL   │
                    │  (restricted) │
                    └───────┬───────┘
                            |
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    [Residential       [Central          [Commercial
     District]        Intersection]       District]
         │                  │                  │
    ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
    │ Houses  │       │  GYM   │       │ Poke    │
    │ (3-4)   │       │        │       │ Mart    │
    │         │       │        │       │         │
    └─────────┘       └────────┘       │ Pokemon │
                                       │ Center  │
                                       └─────────┘
                            |
                    [Route N-1 - South Exit]
```

### Key Buildings

**1. Steel Mill / Resonance Energy Processing Plant (north, center)**
- The dominant structure. Massive. Takes up the entire north section of the map. Smokestacks, conveyor belts visible through windows, constant noise.
- **Exterior:** A chain-link fence with a guard post. Bureau security. The player is told they need a badge (security clearance) to enter. After getting the Forge Badge, they can enter but there's nothing story-critical here in Act 1 — just NPCs and worldbuilding.
- **Interior (post-badge):** A cavernous industrial floor. Workers operating machinery. Resonance Energy conduits feed into a central converter. Bureau technicians monitor readouts. The energy hum is louder inside. NPCs hint at increasing quotas and stress.

**2. Anvil's Gym (center-south)**
- A building designed to look like a forge. The exterior has an anvil motif above the door. The windows glow orange from the heat inside.
- **Interior:** The gym puzzle involves redirecting power conduits (switch-based puzzle). The gym floor is metal grating over a visible lower level where energy flows. Pulling switches changes which conduits are active, opening and closing doors.
- **Gym Trainers:** 3 trainers (Workers and Engineers) positioned between switch puzzles.
- **Leader Room:** Anvil stands at the back near a massive furnace. His Pokemon rest around him, looking as tired as he does.

**3. Pokemon Center (southeast)**
- Standard healing facility, but the nurse has slightly unsettling dialog about Pokemon that "can't be restored."
- **Interior:** Standard Pokemon Center layout. Healing counter, PC, seating area. A bulletin board has Bureau-approved health tips: "Keep your Pokemon happy! Their emotional wellbeing powers our community!"

**4. Poke Mart (east)**
- Standard shop. Sells Poke Balls, Potions, Antidotes, basic supplies.
- A Bureau promotional poster in the window: "Resonance Energy — Your Bond. Our Power."

**5. Residential Houses (west)**
- 3-4 houses with NPCs providing worldbuilding.
- One house belongs to the factory worker who comments on the mill.
- One house has an old woman who talks about Anvil's exhaustion.
- One house is locked — a Bureau employee lives there, never home.

---

## NPCs

### Key NPCs

| NPC | Location | Dialog Summary |
|-----|----------|----------------|
| Factory Worker | Residential district | Pulls levers at the mill. Doesn't understand how the power works. |
| Old Woman | Residential house | Knows Anvil is burning out. Worries about him. |
| Kid near Gym | Outside gym | Enthusiastic about gym puzzle. Mentions the hospital power incident. |
| Bureau Guard | Steel Mill gate | Blocks entry. "Restricted area. Unless you have a badge." |
| Bureau Employee | Outside power plant | Mentions security clearance tied to badges. "Don't ask why." |
| Quin | Outside gym (before gym) | Rival Battle 2 trigger |

### Post-Badge NPCs (Steel Mill interior, optional)

| NPC | Location | Dialog Summary |
|-----|----------|----------------|
| Mill Supervisor | Main floor | Complains about Bureau increasing quotas every quarter |
| Bureau Technician | Monitoring station | Talks about "optimal emotional throughput" |
| Worker on Break | Break room | Mentions hearing strange sounds from the conduits at night |

---

## Gym Details

### Forge Badge Gym

**Type:** Steel
**Puzzle:** Power Conduit Redirection
- 6 switches across 3 rooms, each controlling which conduit paths are active
- Pulling a switch opens one door but may close another
- The correct sequence requires routing power through all three rooms to reach Anvil
- If the player routes power incorrectly, the lights in the gym flicker (cosmetic, no penalty)

**Gym Trainers:**

| Trainer | Team | Levels |
|---------|------|--------|
| Worker Dale | Magnemite, Aron | 10-12 |
| Engineer Portia | Beldum, Bronzor | 11-13 |
| Worker Rivet | Steelix (young) | 13 |

**Leader Anvil:**

| Pokemon | Level | Notes |
|---------|-------|-------|
| Aron | 12 | |
| Magnemite | 13 | |
| Lairon | 15 | Ace — holds Oran Berry |

**Reward:** Forge Badge, TM (Iron Defense or similar)

---

## Wild Pokemon

Ferro City itself has no wild encounters. The closest encounters are on Route N-1 (south) and The Underlake (north).

---

## Items

| Item | Location | Type |
|------|----------|------|
| X Defend | Hidden, behind the gym | Hidden |
| Great Ball | NPC gift (old woman, after gym) | Gift |
| Fresh Water | Poke Mart, discounted | Purchase |

---

## Connections

| Direction | Destination | Method |
|-----------|-------------|--------|
| South | Route N-1 | Walk |
| North | The Underlake | Walk (cave entrance behind Steel Mill) |

---

## Atmosphere & Design Notes

- **Color palette:** Greys, dark blues, orange-red accents from the forge and conduits. Industrial. The Resonance Energy conduits should glow a faint blue that feels slightly wrong — pretty but clinical. Think exposed wiring that happens to be beautiful.
- **Music:** A chugging, rhythmic theme. Industrial percussion. Metallic sounds woven into the melody. Steady, relentless, like a machine that never stops. Should feel like the city itself is working even when you're standing still.
- **Sound design:** Constant ambient noise — metal clanging, steam hissing, the hum of conduits. It should be subtly oppressive. The kind of noise you stop noticing but that wears you down.
- **Tileset:** Metal grating, concrete, chain-link fencing, pipes, steam vents. The buildings are functional, not decorative. This is a working city, not a tourist destination. The gym should feel like it was built from repurposed mill parts.
- **Bureau presence:** More visible here than Route N-1. Guards at the mill, employees near conduits, promotional posters. But still positioned as normal, acceptable. "This is just how things work here."
- **Anvil's character through environment:** His gym should feel like it's maintained by someone who cares but doesn't have time. Small details — a half-eaten sandwich on his desk, a sleeping bag in the corner of the leader room, sticky notes with "URGENT" written on them stuck to every surface.
- **Post-game changes:** The mill runs at reduced capacity. Fewer Bureau employees. Anvil is visibly more relaxed. The conduit hum is quieter. Workers are on break for the first time in months.
