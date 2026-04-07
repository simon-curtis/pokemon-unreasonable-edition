import { useAtomValue, useSetAtom } from 'jotai/react'
import { buildOpenAtom, rightPanelWidthAtom, setRightPanelWidthAtom } from '#/atoms/viewer'
import { runStateAtom, buildLogAtom } from '#/atoms/build'
import ResizablePanel from './ResizablePanel'

const STATE_LABEL = {
  idle: null,
  building: { text: 'Building...', color: 'text-yellow-400' },
  running: { text: 'Emulator running', color: 'text-green-400' },
} as const

export default function BuildPanel() {
  const open = useAtomValue(buildOpenAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)
  const setRightPanelWidth = useSetAtom(setRightPanelWidthAtom)
  const state = useAtomValue(runStateAtom)
  const log = useAtomValue(buildLogAtom)

  if (!open) return null

  const status = STATE_LABEL[state]

  return (
    <ResizablePanel
      side="right"
      width={rightPanelWidth}
      onWidthChange={setRightPanelWidth}
      minWidth={200}
      maxWidth={700}
      offset={44}
    >
      <div className="hud-panel-header">
        <span className="hud-panel-title">Build</span>
        {status && (
          <>
            <span>/</span>
            <span className={status.color}>{status.text}</span>
          </>
        )}
      </div>

      <div className="overflow-y-auto flex-1 font-mono">
        {log.length === 0 && state === 'idle' && (
          <div className="px-3 py-4 text-sm text-hud-muted uppercase tracking-widest text-center">
            No builds yet
          </div>
        )}
        {log.map((entry, i) => (
          <div key={i} className="border-b border-hud-border">
            <div className="px-3 py-1.5 flex items-center gap-2 text-sm uppercase tracking-widest">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${entry.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={entry.ok ? 'text-green-400' : 'text-red-400'}>
                {entry.ok ? 'OK' : 'FAIL'}
              </span>
              <span className="text-hud-muted">{entry.timestamp}</span>
            </div>
            <pre className="px-3 pb-2 text-sm leading-relaxed whitespace-pre-wrap break-all normal-case tracking-normal text-hud-fg">
              <span className="text-hud-muted">$ {entry.command}</span>
              {'\n'}
              {entry.stdout && <span>{entry.stdout}{entry.stdout.endsWith('\n') ? '' : '\n'}</span>}
              {entry.stderr && <span className="text-red-400">{entry.stderr}{'\n'}</span>}
              {!entry.stdout && !entry.stderr && (
                <span className="text-green-400">done — no output{'\n'}</span>
              )}
            </pre>
          </div>
        ))}
      </div>
    </ResizablePanel>
  )
}
