/**
 * One-time migration from old Zustand localStorage keys to individual Jotai atomWithStorage keys.
 * Call this once at app startup. It reads the old bundled key, writes individual keys, and removes the old one.
 */
export function migrateViewerStorage() {
  if (typeof window === 'undefined') return

  const OLD_KEY = 'map-builder-viewer'
  const raw = localStorage.getItem(OLD_KEY)
  if (!raw) return

  try {
    const old = JSON.parse(raw)?.state
    if (!old) return

    const migrations: [string, unknown][] = [
      ['mb:scale', old.scale],
      ['mb:overlays', old.overlays],
      ['mb:mapListOpen', old.mapListOpen],
      ['mb:leftPanelWidth', old.leftPanelWidth],
      ['mb:rightPanel', old.rightPanel],
      ['mb:rightPanelWidth', old.rightPanelWidth],
      ['mb:tilemapScale', old.tilemapScale],
      ['mb:tilemapFilter', old.tilemapFilter],
      ['mb:activeTool', old.activeTool],
      ['mb:entitiesOpen', old.entitiesOpen],
    ]

    for (const [key, value] of migrations) {
      if (value !== undefined && localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    }

    localStorage.removeItem(OLD_KEY)
  } catch {
    /* Malformed data — just remove it */
    localStorage.removeItem(OLD_KEY)
  }
}

export function migrateScriptStorage() {
  if (typeof window === 'undefined') return

  const OLD_KEY = 'script-builder'
  const raw = localStorage.getItem(OLD_KEY)
  if (!raw) return

  try {
    const old = JSON.parse(raw)?.state
    if (!old) return

    const migrations: [string, unknown][] = [
      ['mb:script:paletteOpen', old.paletteOpen],
      ['mb:script:propertyPanelOpen', old.propertyPanelOpen],
      ['mb:script:previewOpen', old.previewOpen],
    ]

    for (const [key, value] of migrations) {
      if (value !== undefined && localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    }

    localStorage.removeItem(OLD_KEY)
  } catch {
    localStorage.removeItem(OLD_KEY)
  }
}

export function migrateChatStorage() {
  if (typeof window === 'undefined') return

  const OLD_KEY = 'map-builder-chat'
  const raw = localStorage.getItem(OLD_KEY)
  if (!raw) return

  try {
    const old = JSON.parse(raw)?.state
    if (!old) return

    if (old.conversations && localStorage.getItem('mb:chat:conversations') === null) {
      localStorage.setItem('mb:chat:conversations', JSON.stringify(old.conversations))
    }
    if (old.activeConversationId && localStorage.getItem('mb:chat:activeConversationId') === null) {
      localStorage.setItem('mb:chat:activeConversationId', JSON.stringify(old.activeConversationId))
    }

    localStorage.removeItem(OLD_KEY)
  } catch {
    localStorage.removeItem(OLD_KEY)
  }
}

export function migrateAllStorage() {
  migrateViewerStorage()
  migrateScriptStorage()
  migrateChatStorage()
}
