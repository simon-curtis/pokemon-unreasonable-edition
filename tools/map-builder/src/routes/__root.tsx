import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'jotai'
import { useAtomValue } from 'jotai/react'
import { useEffect } from 'react'
import { appStore } from '#/atoms/store'
import { themeAtom } from '#/atoms/theme'
import { migrateAllStorage } from '#/atoms/viewer'

import appCss from '../styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
}

/* Run once at module load — before any atoms read from localStorage */
migrateAllStorage()

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MAP SYSTEM V.1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function ThemeSync() {
  const theme = useAtomValue(themeAtom)
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
  }, [theme])
  return null
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <Provider store={appStore}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <Outlet />
      </QueryClientProvider>
    </Provider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-hud-bg text-hud-fg m-0 overflow-auto text-lg tracking-wide" style={{ fontFamily: "var(--font-hud)" }}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
