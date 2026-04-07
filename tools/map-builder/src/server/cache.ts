/**
 * Centralized server-side cache invalidation.
 * Called by the hot-reload plugin when data files change on disk.
 */

import { clearMapDataCaches } from './map-data'
import { clearTilesetCache } from './tileset'
import { clearRenderCaches } from './functions'

/**
 * Invalidate server-side caches based on which file changed.
 * Only clears caches relevant to the changed file type.
 */
export function invalidateServerCaches(filename: string): void {
  if (filename.endsWith('.json')) {
    /* map.json, layouts.json, map_groups.json */
    clearMapDataCaches()
    clearRenderCaches()
  } else if (filename.endsWith('.bin')) {
    /* blockdata — clear grid cache + rendered PNGs */
    clearMapDataCaches()
    clearRenderCaches()
  } else if (filename.endsWith('.4bpp') || filename.endsWith('.gbapal')) {
    /* tileset graphics/palettes */
    clearTilesetCache()
    clearRenderCaches()
  } else {
    /* unknown — clear everything */
    clearMapDataCaches()
    clearTilesetCache()
    clearRenderCaches()
  }
}
