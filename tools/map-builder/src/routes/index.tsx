import { createFileRoute, redirect } from '@tanstack/react-router'
import { getMapList } from '#/server/functions'

export const Route = createFileRoute('/')({
  async beforeLoad() {
    const lastMap = typeof window !== 'undefined' ? localStorage.getItem('map-builder-last-map') : null
    const { maps } = await getMapList()
    const target = (lastMap && maps.includes(lastMap)) ? lastMap : maps[0]
    if (target) {
      throw redirect({ to: '/map/$name', params: { name: target } })
    }
  },
  component: () => null,
})
