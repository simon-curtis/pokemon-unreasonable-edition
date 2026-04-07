import { atom } from 'jotai'
import { mapListOpenAtom, entitiesOpenAtom, rightPanelAtom } from './layout'

export const scriptEditorOpenAtom = atom(false)
export const scriptLabelAtom = atom<string | null>(null)
export const scriptMapNameAtom = atom<string | null>(null)
export const scriptNodesOpenAtom = atom(true)

export const openScriptEditorAtom = atom(null, (_get, set, mapName: string, scriptLabel: string) => {
  set(scriptEditorOpenAtom, true)
  set(scriptMapNameAtom, mapName)
  set(scriptLabelAtom, scriptLabel)
  set(scriptNodesOpenAtom, true)
  set(mapListOpenAtom, false)
  set(entitiesOpenAtom, false)
  set(rightPanelAtom, 'script-properties')
})

export const closeScriptEditorAtom = atom(null, (_get, set) => {
  set(scriptEditorOpenAtom, false)
  set(scriptLabelAtom, null)
  set(scriptMapNameAtom, null)
  set(scriptNodesOpenAtom, false)
  set(rightPanelAtom, 'properties')
})
