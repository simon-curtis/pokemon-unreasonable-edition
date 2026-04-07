import { useEffect, useState, type ComponentType } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  type ActiveTool,
  overlaysAtom,
  toggleOverlayAtom,
  activeToolAtom,
  setActiveToolAtom,
  setRightPanelAtom,
  resizeModeAtom,
} from '#/atoms/viewer'
import { themeAtom, toggleThemeAtom } from '#/atoms/theme'
import { runStateAtom, buildAtom, runAtom, stopAtom } from '#/atoms/build'
import type { OverlayState } from '#/lib/types'
import { Separator } from '#/ui/components/Separator'
import { HudButton, ToggleButton } from '#/ui/components/HudButton'
import {
  IconGrid4x4,
  IconShieldOff,
  IconHash,
  IconMountain,
  IconArrowsSplit,
  IconUsers,
  IconFlag,
  IconMarquee,
  IconArrowsMove,
  IconHandGrab,
  IconSun,
  IconMoon,
  IconPlayerPlay,
  IconPlayerStop,
  IconResize,
  IconBrush,
  IconHammer,
} from '@tabler/icons-react'

interface Props {
  mapName: string
  width: number
  height: number
}

const OVERLAYS: { key: keyof OverlayState; Icon: ComponentType<{ size?: number; stroke?: number }>; tip: string }[] = [
  { key: 'grid', Icon: IconGrid4x4, tip: 'Grid overlay' },
  { key: 'collision', Icon: IconShieldOff, tip: 'Collision passability' },
  { key: 'ids', Icon: IconHash, tip: 'Metatile IDs' },
  { key: 'category', Icon: IconMountain, tip: 'Terrain category' },
  { key: 'provenance', Icon: IconArrowsSplit, tip: 'Tile provenance arrows' },
  { key: 'sprites', Icon: IconUsers, tip: 'Sprites (NPCs, trainers, items)' },
  { key: 'events', Icon: IconFlag, tip: 'Events (warps, triggers, signs)' },
]

const TOOLS: { tool: ActiveTool; Icon: typeof IconMarquee; tip: string; shortcut: string }[] = [
  { tool: 'select', Icon: IconMarquee, tip: 'Select cells', shortcut: 'V' },
  { tool: 'paint', Icon: IconBrush, tip: 'Paint tiles', shortcut: 'B' },
  { tool: 'object', Icon: IconArrowsMove, tip: 'Move objects', shortcut: 'O' },
  { tool: 'pan', Icon: IconHandGrab, tip: 'Pan camera', shortcut: 'H' },
]


function BuildButton() {
  const state = useAtomValue(runStateAtom)
  const build = useSetAtom(buildAtom)
  const setRightPanel = useSetAtom(setRightPanelAtom)

  const disabled = state !== 'idle'

  return (
    <HudButton
      onClick={() => {
        setRightPanel('build')
        build()
      }}
      title="Build ROM"
      className={`${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <IconHammer size={16} stroke={1.5} />
    </HudButton>
  )
}

function RunButton() {
  const state = useAtomValue(runStateAtom)
  const run = useSetAtom(runAtom)
  const stop = useSetAtom(stopAtom)
  const setRightPanel = useSetAtom(setRightPanelAtom)

  const handleClick = () => {
    if (state === 'idle') {
      setRightPanel('build')
      run()
    } else if (state === 'running') {
      stop()
    }
    /* building state: button is disabled, no action */
  }

  const Icon = state === 'idle' ? IconPlayerPlay : IconPlayerStop
  const title = state === 'idle'
    ? 'Build & Run'
    : state === 'building'
      ? 'Building...'
      : 'Stop emulator'
  const disabled = state === 'building'

  return (
    <HudButton
      onClick={handleClick}
      title={title}
      className={`${
        state === 'building'
          ? 'text-yellow-400 border-yellow-400/50'
          : state === 'running'
            ? 'text-green-400 border-green-400/50'
            : ''
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <Icon size={16} stroke={1.5} />
    </HudButton>
  )
}

function ThemeToggle() {
  const theme = useAtomValue(themeAtom)
  const toggle = useSetAtom(toggleThemeAtom)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  /* Render server-safe default until hydration completes */
  const Icon = !mounted || theme === 'dark' ? IconMoon : IconSun
  const title = !mounted || theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <HudButton onClick={toggle} title={title}>
      <Icon size={16} stroke={1.5} />
    </HudButton>
  )
}

export default function Toolbar({ mapName, width, height }: Props) {
  const overlays = useAtomValue(overlaysAtom)
  const toggleOverlay = useSetAtom(toggleOverlayAtom)
  const activeTool = useAtomValue(activeToolAtom)
  const setActiveTool = useSetAtom(setActiveToolAtom)
  const enterResize = useSetAtom(resizeModeAtom)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      if (e.key === 'b' || e.key === 'B') setActiveTool('paint')
      if (e.key === 'o' || e.key === 'O') setActiveTool('object')
      if (e.key === 'h' || e.key === 'H') setActiveTool('pan')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="z-50 bg-hud-bg px-5 py-3 flex gap-5 items-center text-md border-b border-hud-border flex-wrap uppercase tracking-widest" style={{ fontFamily: 'var(--font-hud-display)' }}>
      <span className="text-sm text-hud-muted">&#x25C6;</span>
      <span className="text-md text-hud-fg">{mapName}</span>
      <span className="text-hud-muted text-sm tabular-nums">
        {width}&times;{height}
      </span>
      <HudButton onClick={() => enterResize(true)} title="Resize map">
        <IconResize size={14} stroke={1.5} />
      </HudButton>

      <Separator />
      <div className="flex gap-0.5">
        {TOOLS.map(({ tool, Icon, tip, shortcut }) => (
          <ToggleButton
            key={tool}
            onClick={() => setActiveTool(tool)}
            title={`${tip} (${shortcut})`}
            active={activeTool === tool}
          >
            <Icon size={16} stroke={1.5} />
          </ToggleButton>
        ))}
      </div>
      <Separator />

      <div className="flex gap-0.5">
        {OVERLAYS.map(({ key, Icon, tip }) => (
          <ToggleButton
            key={key}
            onClick={() => toggleOverlay(key)}
            title={tip}
            active={overlays[key]}
          >
            <Icon size={16} stroke={1.5} />
          </ToggleButton>
        ))}
      </div>

      <div className="flex-1" />
      <div className="flex gap-0.5">
        <BuildButton />
        <RunButton />
      </div>
      <Separator />
      <ThemeToggle />
      <span className="text-sm text-hud-muted">&#x25C6;</span>
    </div>
  )
}
