import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { rightPanelAtom } from './layout'

export type ActiveTool = 'select' | 'object' | 'pan' | 'paint'

export interface ObjectId {
  eventArray: string
  eventIndex: number
}

export const activeToolAtom = atomWithStorage<ActiveTool>('mb:activeTool', 'select')
export const selectedObjectAtom = atom<ObjectId | null>(null)
export const resizeModeAtom = atom(false)

export const setActiveToolAtom = atom(null, (get, set, tool: ActiveTool) => {
  set(activeToolAtom, tool)
  set(selectedObjectAtom, null)
  if (tool === 'paint' && get(rightPanelAtom) !== 'tilemap') {
    set(rightPanelAtom, 'tilemap')
  }
})
