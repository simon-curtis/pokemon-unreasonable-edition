#ifndef GUARD_CONSTANTS_WILD_ENCOUNTER_H
#define GUARD_CONSTANTS_WILD_ENCOUNTER_H

#define LAND_WILD_COUNT     12
#define WATER_WILD_COUNT    5
#define ROCK_WILD_COUNT     5
#define FISH_WILD_COUNT     10

#define NUM_ALTERING_CAVE_TABLES 9

#define WILD_MON_HEADER_COUNT 128

/* Nuzlocke encounter type bits (4 per header entry) */
#define NUZLOCKE_LAND_BIT      (1 << 0)
#define NUZLOCKE_WATER_BIT     (1 << 1)
#define NUZLOCKE_ROCK_SMASH_BIT (1 << 2)
#define NUZLOCKE_FISHING_BIT   (1 << 3)

#define NUZLOCKE_ENCOUNTERS_SIZE (WILD_MON_HEADER_COUNT / 2) /* 4 bits per entry, 2 entries per byte */
#define NUZLOCKE_CAUGHT_FLAGS_SIZE ((WILD_MON_HEADER_COUNT + 7) / 8) /* 1 bit per header */

#endif // GUARD_CONSTANTS_WILD_ENCOUNTER_H
