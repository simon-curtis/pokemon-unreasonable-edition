import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Listens for HMR events from the map-data-hot-reload Vite plugin
 * and invalidates all map-related queries so the viewer refreshes.
 */
export function useMapDataHotReload() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!import.meta.hot) return

    import.meta.hot.on('map-data-change', (data: { file: string }) => {
      console.log('[hot-reload] map data changed:', data.file)
      queryClient.invalidateQueries({ queryKey: ['mapPng'] })
      queryClient.invalidateQueries({ queryKey: ['foregroundPng'] })
      queryClient.invalidateQueries({ queryKey: ['atlasPng'] })
      queryClient.invalidateQueries({ queryKey: ['metadata'] })
      queryClient.invalidateQueries({ queryKey: ['maps'] })
    })
  }, [queryClient])
}
