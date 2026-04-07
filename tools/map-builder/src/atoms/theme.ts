import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const themeAtom = atomWithStorage<'dark' | 'light'>('hud-theme', 'dark')

export const toggleThemeAtom = atom(null, (get, set) => {
  set(themeAtom, get(themeAtom) === 'dark' ? 'light' : 'dark')
})
