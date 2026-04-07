import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mapDataHotReload } from './src/lib/hot-reload-plugin'
import { aiChatPlugin } from './src/lib/ai-chat-plugin'

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    mapDataHotReload(),
    aiChatPlugin(),
    tanstackStart(),
    viteReact(),
  ],
})
