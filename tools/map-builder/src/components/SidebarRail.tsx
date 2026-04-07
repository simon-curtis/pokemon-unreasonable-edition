import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  type RightPanel,
  mapListOpenAtom,
  setMapListOpenAtom,
  entitiesOpenAtom,
  setEntitiesOpenAtom,
  scriptEditorOpenAtom,
  scriptNodesOpenAtom,
  rightPanelAtom,
  setRightPanelAtom,
} from '#/atoms/viewer'
import { ToggleButton } from '#/ui/components/HudButton'
import { IconMap, IconPalette, IconHammer, IconListDetails, IconComponents, IconSparkles, IconPuzzle, IconSettings } from '@tabler/icons-react'

const RAIL_W = 44

export const RAIL_WIDTH = RAIL_W

export function LeftRail() {
  const mapListOpen = useAtomValue(mapListOpenAtom)
  const setMapListOpen = useSetAtom(setMapListOpenAtom)
  const entitiesOpen = useAtomValue(entitiesOpenAtom)
  const setEntitiesOpen = useSetAtom(setEntitiesOpenAtom)
  const scriptEditorOpen = useAtomValue(scriptEditorOpenAtom)
  const scriptNodesOpen = useAtomValue(scriptNodesOpenAtom)
  const setScriptNodesOpen = useSetAtom(scriptNodesOpenAtom)

  return (
    <div
      className="absolute left-0 top-0 bottom-0 z-50 bg-hud-bg border-r border-hud-border flex flex-col items-center py-2 gap-1"
      style={{ width: RAIL_W }}
    >
      {scriptEditorOpen ? (
        <ToggleButton onClick={() => setScriptNodesOpen(!scriptNodesOpen)} title="Nodes" active={scriptNodesOpen}>
          <IconPuzzle size={16} stroke={1.5} />
        </ToggleButton>
      ) : (
        <>
          <ToggleButton onClick={() => setMapListOpen(!mapListOpen)} title="Maps" active={mapListOpen}>
            <IconMap size={16} stroke={1.5} />
          </ToggleButton>
          <ToggleButton onClick={() => setEntitiesOpen(!entitiesOpen)} title="Entities" active={entitiesOpen}>
            <IconComponents size={16} stroke={1.5} />
          </ToggleButton>
        </>
      )}
    </div>
  )
}

export function RightRail() {
  const rightPanel = useAtomValue(rightPanelAtom)
  const setRightPanel = useSetAtom(setRightPanelAtom)
  const scriptEditorOpen = useAtomValue(scriptEditorOpenAtom)

  const toggle = (panel: RightPanel) => () => setRightPanel(rightPanel === panel ? null : panel)

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-50 bg-hud-bg border-l border-hud-border flex flex-col items-center py-2 gap-1"
      style={{ width: RAIL_W }}
    >
      {scriptEditorOpen ? (
        <ToggleButton onClick={toggle('script-properties')} title="Node Properties" active={rightPanel === 'script-properties'}>
          <IconSettings size={16} stroke={1.5} />
        </ToggleButton>
      ) : (
        <>
          <ToggleButton onClick={toggle('properties')} title="Properties" active={rightPanel === 'properties'}>
            <IconListDetails size={16} stroke={1.5} />
          </ToggleButton>
          <ToggleButton onClick={toggle('tilemap')} title="Tilemap" active={rightPanel === 'tilemap'}>
            <IconPalette size={16} stroke={1.5} />
          </ToggleButton>
          <ToggleButton onClick={toggle('build')} title="Build" active={rightPanel === 'build'}>
            <IconHammer size={16} stroke={1.5} />
          </ToggleButton>
          <ToggleButton onClick={toggle('ai')} title="AI Assistant" active={rightPanel === 'ai'}>
            <IconSparkles size={16} stroke={1.5} />
          </ToggleButton>
        </>
      )}
    </div>
  )
}
