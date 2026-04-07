import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { getMapList, getMapMetadata, getMapPng, getForegroundPng, getAtlasPng } from '#/server/functions'

export const mapListQueryOptions = queryOptions({
  queryKey: ['maps'],
  queryFn: () => getMapList(),
  staleTime: 5 * 60 * 1000,
})

export const metadataQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['metadata', name],
    queryFn: () => getMapMetadata({ data: { name } }),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    retry: false,
  })

export const mapPngQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['mapPng', name],
    queryFn: () => getMapPng({ data: { name } }),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    retry: false,
  })

export const foregroundPngQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['foregroundPng', name],
    queryFn: () => getForegroundPng({ data: { name } }),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })

export const atlasPngQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['atlasPng', name],
    queryFn: () => getAtlasPng({ data: { name } }),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
