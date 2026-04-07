import type { Plugin } from 'vite'
import path from 'node:path'
import { watch } from 'node:fs'
import { invalidateServerCaches } from '#/server/cache'

/**
 * Vite plugin that watches data/layouts and data/tilesets for binary changes
 * and pushes HMR events to the client so React Query can refetch.
 * Also invalidates server-side caches so re-fetched data is fresh.
 */
export function mapDataHotReload(): Plugin {
  const dataRoot = path.resolve(__dirname, '../../../../data')

  return {
    name: 'map-data-hot-reload',
    apply: 'serve',

    configureServer(server) {
      const dirs = [
        path.join(dataRoot, 'layouts'),
        path.join(dataRoot, 'tilesets'),
        path.join(dataRoot, 'maps'),
      ]

      for (const dir of dirs) {
        watch(dir, { recursive: true }, (_event, filename) => {
          if (!filename) return
          const ext = path.extname(filename)
          if (!['.bin', '.4bpp', '.gbapal', '.json'].includes(ext)) return

          /* Clear server-side caches so re-fetched data is fresh */
          invalidateServerCaches(filename)

          server.ws.send({
            type: 'custom',
            event: 'map-data-change',
            data: { file: filename },
          })
        })
      }
    },
  }
}
