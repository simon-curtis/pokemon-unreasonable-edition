#!/bin/bash
# Pre-build check: Verify MAP_SCRIPT_ON_FRAME_TABLE scripts advance their var
# Catches infinite lockall loops where on-frame keeps re-triggering
# Only checks custom maps (modified by us), not vanilla Emerald scripts

set -euo pipefail

MAPS_DIR="data/maps"
ERRORS=0

# Only check maps we've modified (tracked by git as changed/added)
CUSTOM_MAPS=$(git diff --name-only HEAD -- "$MAPS_DIR" 2>/dev/null | grep 'scripts\.inc' || true)
CUSTOM_MAPS="$CUSTOM_MAPS"$'\n'$(git diff --cached --name-only -- "$MAPS_DIR" 2>/dev/null | grep 'scripts\.inc' || true)
CUSTOM_MAPS="$CUSTOM_MAPS"$'\n'$(git diff --name-only -- "$MAPS_DIR" 2>/dev/null | grep 'scripts\.inc' || true)

# Also check any scripts.inc with on-frame tables in maps that have uncommitted map.json changes
for json in $(git diff --name-only -- "$MAPS_DIR" 2>/dev/null | grep 'map\.json' || true); do
    dir=$(dirname "$json")
    [ -f "$dir/scripts.inc" ] && CUSTOM_MAPS="$CUSTOM_MAPS"$'\n'"$dir/scripts.inc"
done

# Deduplicate and filter to files that actually use on-frame
CUSTOM_MAPS=$(echo "$CUSTOM_MAPS" | sort -u | grep -v '^$' || true)

for script in $CUSTOM_MAPS; do
    [ -f "$script" ] || continue
    grep -q "MAP_SCRIPT_ON_FRAME_TABLE" "$script" || continue

    map_dir=$(dirname "$script")
    map_name=$(basename "$map_dir")

    # Extract on-frame table name
    table=$(grep "MAP_SCRIPT_ON_FRAME_TABLE" "$script" | awk '{print $NF}')
    [ -z "$table" ] && continue

    # Extract each map_script_2 entry: VAR, VALUE, SCRIPT
    while IFS= read -r line; do
        var=$(echo "$line" | awk '{print $2}' | tr -d ',')
        val=$(echo "$line" | awk '{print $3}' | tr -d ',')
        target=$(echo "$line" | awk '{print $4}')

        [ -z "$var" ] || [ -z "$val" ] || [ -z "$target" ] && continue

        # Skip VAR_TEMP_* — reset on map transition, safe to not advance
        case "$var" in VAR_TEMP_*) continue ;; esac

        # Check if the target script (or any script it gotos) sets the var
        if ! grep -q "setvar $var" "$script"; then
            echo "WARNING [$map_name]: on-frame script '$target' (var=$var, val=$val) never calls setvar $var"
            echo "  This will cause an infinite lockall loop (player freeze)"
            ERRORS=$((ERRORS + 1))
        fi
    done < <(sed -n "/^${table}:/,/\.2byte 0/p" "$script" | grep "map_script_2")
done

if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "$ERRORS on-frame issue(s) found. Fix before building."
    exit 1
fi
