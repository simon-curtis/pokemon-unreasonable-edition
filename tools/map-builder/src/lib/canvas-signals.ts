import { useSyncExternalStore } from 'react'

function createSignal<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (v: T) => {
      value = v
      listeners.forEach((l) => l())
    },
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

/** Hovered cell index — written by MapCanvas on mouse move, read by status bar */
export const hoverCellSignal = createSignal<number | null>(null)

/** Camera position — written by MapCanvas on pan/zoom, read by ResizeCropOverlay */
export const cameraSignal = createSignal({ x: 0, y: 0 })

/** React hook to subscribe to a signal */
export function useSignal<T>(signal: { subscribe: (l: () => void) => () => void; get: () => T }): T {
  return useSyncExternalStore(signal.subscribe, signal.get, signal.get)
}
