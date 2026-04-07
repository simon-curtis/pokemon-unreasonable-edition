import { atom } from 'jotai'
import { buildRom, launchEmulator, stopEmulator, isEmulatorRunning } from '#/server/functions'
import { appStore } from '#/atoms/store'

export interface BuildEntry {
  timestamp: string
  ok: boolean
  command: string
  stdout: string
  stderr: string
}

export type RunState = 'idle' | 'building' | 'running'

export const runStateAtom = atom<RunState>('idle')
export const buildLogAtom = atom<BuildEntry[]>([])

let _pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (_pollTimer !== null) {
    clearInterval(_pollTimer)
    _pollTimer = null
  }
}

const pollEmulatorAtom = atom(null, async (_get, set) => {
  try {
    const { running } = await isEmulatorRunning()
    if (!running) {
      stopPolling()
      set(runStateAtom, 'idle')
    }
  } catch {
    stopPolling()
    set(runStateAtom, 'idle')
  }
})

export const runAtom = atom(null, async (get, set) => {
  if (get(runStateAtom) !== 'idle') return
  set(runStateAtom, 'building')
  const ts = new Date().toLocaleTimeString()
  try {
    const result = await buildRom()
    set(buildLogAtom, (log) => [
      { timestamp: ts, ok: result.ok, command: result.command, stdout: result.stdout, stderr: result.stderr },
      ...log,
    ])
    if (result.ok) {
      await launchEmulator()
      set(runStateAtom, 'running')
      stopPolling()
      _pollTimer = setInterval(() => appStore.set(pollEmulatorAtom), 2000)
    } else {
      set(runStateAtom, 'idle')
    }
  } catch (e: any) {
    set(buildLogAtom, (log) => [
      { timestamp: ts, ok: false, command: 'make', stdout: '', stderr: e.message },
      ...log,
    ])
    set(runStateAtom, 'idle')
  }
})

export const buildAtom = atom(null, async (get, set) => {
  if (get(runStateAtom) !== 'idle') return
  set(runStateAtom, 'building')
  const ts = new Date().toLocaleTimeString()
  try {
    const result = await buildRom()
    set(buildLogAtom, (log) => [
      { timestamp: ts, ok: result.ok, command: result.command, stdout: result.stdout, stderr: result.stderr },
      ...log,
    ])
    set(runStateAtom, 'idle')
  } catch (e: any) {
    set(buildLogAtom, (log) => [
      { timestamp: ts, ok: false, command: 'make', stdout: '', stderr: e.message },
      ...log,
    ])
    set(runStateAtom, 'idle')
  }
})

export const stopAtom = atom(null, async (_get, set) => {
  stopPolling()
  await stopEmulator()
  set(runStateAtom, 'idle')
})
