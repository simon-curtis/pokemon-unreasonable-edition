---
description: Writing style guide — character voices, humor flavors, pacing rules. Use when writing dialog, NPC text, or story scripts for Pokemon Unreasonable Edition.
paths: ["data/maps/**/*.inc", "data/text/**"]
---

# Tone & Writing Guide

Dark comedy + Pokemon. Institutional horror played for laughs. Self-aware NPCs in an absurd world.

$ARGUMENTS

---

## Story Context

Absurdia. Resonance Energy = emotional bonds as electricity. The Bureau profits from grief. Nuzlocke is canon (permadeath acknowledged in-world). Read `story/STORY.md` + `story/SCRIPT_ACT*.md` for full context. Check `git log --oneline -10` for recent progress.

## Character Voices

| Character | Voice | Example |
|-----------|-------|---------|
| **NPCs** | Helpful→desperate→broken | "Nobody makes it this far. I talk to trees now." |
| **Bureau** | Corporate jargon, casual surveillance | "Bond metrics baseline. Flagged for monitoring." |
| **Mom** | Guilt-trips, specific grievances | "I love you. Leave." |
| **Thorn** | Deadpan Decidueye professor | "You were standing closest to the door." |
| **Quin** | Toxic positivity, content-creator energy | Rates everything /10 |
| **Signs** | Self-aware, patronizing, legally mandated | |
| **Nuzlocke** | Gen-Z doomspeak | "This route is cooked" "No cap" "Fr fr" |

## NPC Humor — Four Flavors

NPCs don't telegraph which flavor they are. Same sprite, press A, coin flip.

### Anti-Humor
Refuse to be funny. Refuse to engage. The ABSENCE is the joke.
- "Bats." (talk again: "...")
- Empty text box. Just closes.
- "No thank you." (you didn't offer anything)

### Unhinged
One sentence. No explanation. Move on. The player's brain fills in the horror.
- "I found a tooth. Not mine."
- "I'm guarding this spot. No I will not elaborate."
- Wrong emotion for the situation, or wrong situation for the emotion. Never explain the gap.

### Dark
Innocent setup, punchline REFRAMES the entire scene. Player re-reads and goes "oh no."

**Good examples:**
- "I taught my son to swim by\nthrowin him in the deep end.\pBit extreme but he got out\nof that sack eventually"
- "My grandad died peacefully\nin his sleep.\pUnlike the passengers\non his bus"
- "I used to come here with\nmy brother.\pNice spot.\pBit windy" (near a bridge/cliff)
- "My dad took me fishing here\nwhen I was six.\pI sat in the boat for hours.\pHe was a terrible swimmer"

**What makes them work:**
- One word recontextualizes the ENTIRE setup ("sack", "passengers", "swimmer")
- Speaker is CASUAL. Weather-report energy. Not performing horror.
- End on the shortest possible line. "Bit windy" = two words, devastating.
- What the joke DOESN'T say is funnier than what it does.

**What kills dark jokes:**
- Adding a line AFTER the punchline that comments on or explains it
- Setup that already hints at the dark part (misdirection gone = no reveal power)
- Punchlines that are just "dark topic" without reframing. Shock alone isn't a joke.

### Crude
Completely normal Pokemon sentences in accidentally pornographic words. The NPC has ZERO awareness. Write normal sentences that ARE innuendo, not jokes ABOUT innuendo.

**Good examples:**
- "My Squirtle just squirted all\nover my back"
- "Nurse Joy handles my balls\nso carefully.\pI wish my wife did the same"
- "You have to jerk the rod\nreally hard or nothing comes"
- "My Geodude gets rock hard\nevery time I touch him.\pThe Pokédex says that is\nhis ability"
- "I was on top of my Rapidash\nfor three hours.\pMy Cloyster is still steaming"

**What makes them work:**
- Every sentence is a REAL Pokemon scenario in unfortunately chosen words
- The NPC is sincere. Not winking. Not clever. Just talking about their Pokemon.
- Pokemon names, moves, and abilities do the heavy lifting (Squirtle squirts, Harden hardens, balls = Pokéballs)
- One step further than expected while still technically plausible

## Pacing Rules

1. **Punchline is the LAST thing the player reads.** Text box closes. No epilogue. No reaction. No "explaining the joke" line.
2. **Background NPCs**: 1-3 text boxes max. Story NPCs (Mom, Bureau, Thorn) can monologue.
3. **Deadpan delivery.** Speaker never signals "this is edgy" or is proud of being dark.
4. **NEVER explain the joke.** If the NPC comments on how weird they are, the magic dies.
5. **End on the shortest possible line.** Fewer words = harder hit.
6. **If removing the offensive/weird element leaves no structure, it's not a joke** — it's just shock.

## Profanity

Extremely rare. Shock value only. If every NPC swears, none of them are shocking.
