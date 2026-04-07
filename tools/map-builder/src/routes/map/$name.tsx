import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { metadataQueryOptions, mapPngQueryOptions, foregroundPngQueryOptions, atlasPngQueryOptions } from '#/lib/queries'
import MapCanvas from '#/components/MapCanvas'
import Toolbar from '#/components/Toolbar'
import { HudButton } from '#/ui/components/HudButton'
import InfoBar from '#/components/InfoBar'
import TilemapPanel from '#/components/TilemapPanel'
import MapListPanel from '#/components/MapListPanel'
import ObjectPropertiesPanel from '#/components/ObjectPropertiesPanel'
import ScriptEditorPanel from '#/components/script-builder/ScriptEditorOverlay'
import ResizeCropOverlay from '#/components/ResizeCropOverlay'
import BuildPanel from '#/components/BuildPanel'
import ChatPanel from '#/components/ChatPanel'
import EntityPalettePanel from '#/components/EntityPalettePanel'
import ScriptNodePalettePanel from '#/components/script-builder/ScriptNodePalettePanel'
import ScriptPropertyPanel from '#/components/script-builder/ScriptPropertyPanel'
import { LeftRail, RightRail, RAIL_WIDTH } from '#/components/SidebarRail'
import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  rightPanelAtom,
  mapListOpenAtom,
  entitiesOpenAtom,
  leftPanelWidthAtom,
  rightPanelWidthAtom,
  scaleAtom,
  scriptEditorOpenAtom,
  scriptNodesOpenAtom,
} from '#/atoms/viewer'
import { useMapDataHotReload } from '#/lib/useMapDataHotReload'
import { useMapStatusBar } from '#/lib/useStatusBarPublisher'
import { useEffect } from 'react'

export const Route = createFileRoute('/map/$name')({
  component: MapViewer,
})

function MapViewer() {
  const { name } = Route.useParams()
  useMapDataHotReload()

  useEffect(() => {
    localStorage.setItem('map-builder-last-map', name)
  }, [name])

  const { data: metadata, isLoading: metaLoading, error: metaError } = useQuery(metadataQueryOptions(name))
  const { data: mapPng, isLoading: pngLoading, error: pngError } = useQuery(mapPngQueryOptions(name))
  const { data: fgPng } = useQuery(foregroundPngQueryOptions(name))
  const { data: atlasPng } = useQuery(atlasPngQueryOptions(name))

  const rightPanel = useAtomValue(rightPanelAtom)
  const mapListOpen = useAtomValue(mapListOpenAtom)
  const entitiesOpen = useAtomValue(entitiesOpenAtom)
  const leftPanelWidth = useAtomValue(leftPanelWidthAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)
  const scale = useAtomValue(scaleAtom)
  const setScale = useSetAtom(scaleAtom)
  const scriptEditorOpen = useAtomValue(scriptEditorOpenAtom)
  const scriptNodesOpen = useAtomValue(scriptNodesOpenAtom)

  useMapStatusBar(metadata)

  const loadError = metaError || pngError

  if (loadError || metaLoading || pngLoading || !metadata || !mapPng) {
    const loadLeftOffset = RAIL_WIDTH + ((mapListOpen || entitiesOpen) ? leftPanelWidth : 0)
    return (
      <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr_auto]">
        <Toolbar mapName={name} width={0} height={0} />
        <div className="relative overflow-hidden min-h-0">
          <div
            className="absolute inset-0 flex items-center justify-center uppercase tracking-widest text-md text-hud-muted"
            style={{ left: loadLeftOffset, right: RAIL_WIDTH }}
          >
            {loadError ? (
              <ErrorDialog mapName={name} error={loadError} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-hud-fg">+ &nbsp; + &nbsp; +</span>
                <span>LOADING {name}</span>
                <span className="text-hud-fg">+ &nbsp; + &nbsp; +</span>
              </div>
            )}
          </div>
          <LeftRail />
          <MapListPanel mapName={name} />
          <RightRail />
        </div>
        <InfoBar />
      </div>
    )
  }

  const leftPanelVisible = scriptEditorOpen ? scriptNodesOpen : (mapListOpen || entitiesOpen)
  const leftOffset = RAIL_WIDTH + (leftPanelVisible ? leftPanelWidth : 0)
  const rightOffset = RAIL_WIDTH + (rightPanel ? rightPanelWidth : 0)

  return (
    <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr_auto]">
      <Toolbar mapName={name} width={metadata.width} height={metadata.height} />
      <div className="relative overflow-hidden min-h-0">
        {scriptEditorOpen ? (
          <div
            className="absolute inset-0 flex flex-col"
            style={{ left: leftOffset, right: rightOffset }}
          >
            <ScriptEditorPanel />
          </div>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ left: leftOffset, right: rightOffset }}
            >
              <MapCanvas mapName={name} metadata={metadata} mapPngBase64={mapPng.png} foregroundPngBase64={fgPng?.png} />
              <ResizeCropOverlay mapName={name} mapWidth={metadata.width} mapHeight={metadata.height} connections={metadata.connections} />
            </div>
            <div
              className="absolute z-40 uppercase tracking-widest"
              style={{ right: rightOffset + 12, bottom: 8 }}
            >
              <HudButton
                className="px-2 text-md"
                onClick={() => {
                  const levels = [1, 2, 3, 4]
                  const next = levels.find((l) => l > scale) ?? levels[0]
                  setScale(next)
                }}
                title="Cycle zoom level"
              >
                {scale % 1 === 0 ? scale : scale.toFixed(1)}x
              </HudButton>
            </div>
          </>
        )}
        <LeftRail />
        {scriptEditorOpen ? (
          <ScriptNodePalettePanel />
        ) : (
          <>
            <MapListPanel mapName={name} />
            <EntityPalettePanel />
          </>
        )}
        <RightRail />
        {scriptEditorOpen ? (
          <ScriptPropertyPanel />
        ) : (
          <>
            <BuildPanel />
            <ChatPanel mapName={name} />
            {atlasPng && (
              <TilemapPanel metadata={metadata} atlasPngBase64={atlasPng.png} />
            )}
            <ObjectPropertiesPanel objects={metadata.objects} mapName={name} mapProperties={metadata.mapProperties} />
          </>
        )}
      </div>
      <InfoBar />
    </div>
  )
}

function ErrorDialog({ mapName, error }: { mapName: string; error: Error }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const message = error.message || String(error)

  const isMissingAsset = message.includes('ENOENT')
  const missingFile = message.match(/open '([^']+)'/)?.[1] || ''
  const isTileset = missingFile.includes('.4bpp') || missingFile.includes('tileset')

  return (
    <div className="border border-hud-border bg-hud-panel max-w-[520px] w-full">
      <div className="px-4 py-2 border-b border-hud-border flex items-center gap-2 text-sm uppercase tracking-widest">
        <span className="text-red-400">!</span>
        <span>Failed to load {mapName}</span>
      </div>
      <div className="px-4 py-3 text-sm uppercase tracking-widest leading-relaxed space-y-3">
        {isMissingAsset ? (
          <>
            <p className="text-hud-muted">
              {isTileset ? (
                <>Build artifacts are missing. Tileset data needs to be compiled before the map viewer can render.</>
              ) : (
                <>A required file was not found.</>
              )}
            </p>
            <div className="bg-hud-bg border border-hud-border px-3 py-2 text-xs normal-case tracking-normal font-mono break-all text-hud-muted">
              {missingFile}
            </div>
            {isTileset && (
              <div className="space-y-1">
                <p>Run from project root:</p>
                <div className="bg-hud-bg border border-hud-border px-3 py-2 text-hud-fg">
                  make -j$(nproc)
                </div>
                <p className="text-hud-muted">Then retry loading.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-hud-bg border border-hud-border px-3 py-2 text-xs normal-case tracking-normal font-mono break-all text-hud-muted">
            {message}
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-t border-hud-border flex items-center gap-2 justify-end">
        <button
          onClick={() => navigate({ to: '/' })}
          className="px-3 py-1 text-sm uppercase tracking-widest border border-hud-border hover:border-hud-fg cursor-pointer bg-transparent text-hud-fg"
        >
          Back
        </button>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
            queryClient.invalidateQueries({ queryKey: ['mapPng', mapName] })
          }}
          className="px-3 py-1 text-sm uppercase tracking-widest border border-hud-border hover:border-hud-active-border hover:bg-hud-active hover:text-hud-active-fg cursor-pointer bg-transparent text-hud-fg"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
