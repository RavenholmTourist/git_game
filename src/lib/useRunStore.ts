import { useCallback, useEffect, useState } from 'react'
import { DATA_PATHS } from '../config'
import type { Settings } from '../types'
import { readJsonFile, writeJsonFile } from './github'

export type Source = 'github' | 'static'

export interface RunStore<T> {
  runs: T[]
  loading: boolean
  saving: boolean
  error: string | null
  source: Source
  reload: () => Promise<void>
  mutate: (fn: (runs: T[]) => T[], message: string) => Promise<void>
}

const cacheKey = (kind: string) => `sor4.cache.${kind}`

function readCache<T>(kind: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(kind)) ?? '[]') as T[]
  } catch {
    return []
  }
}

export function useRunStore<T>(kind: keyof typeof DATA_PATHS, settings: Settings): RunStore<T> {
  const [runs, setRuns] = useState<T[]>(() => readCache<T>(kind))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasToken = Boolean(settings.token)
  const source: Source = hasToken ? 'github' : 'static'

  const commit = useCallback(
    (next: T[]) => {
      setRuns(next)
      localStorage.setItem(cacheKey(kind), JSON.stringify(next))
    },
    [kind],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (hasToken) {
        commit((await readJsonFile<T[]>(settings, DATA_PATHS[kind])).data)
      } else {
        const res = await fetch(`${import.meta.env.BASE_URL}data/${kind}-runs.json`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Could not load ${kind} data (${res.status})`)
        commit((await res.json()) as T[])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [commit, hasToken, kind, settings])

  useEffect(() => {
    void reload()
  }, [reload])

  const mutate = useCallback(
    async (fn: (runs: T[]) => T[], message: string) => {
      if (!hasToken) throw new Error('Add your GitHub token in Settings to save runs.')
      setSaving(true)
      setError(null)
      try {
        const latest = await readJsonFile<T[]>(settings, DATA_PATHS[kind])
        const next = fn(latest.data)
        await writeJsonFile(settings, DATA_PATHS[kind], next, latest.sha, message)
        commit(next)
      } catch (e) {
        setError((e as Error).message)
        throw e
      } finally {
        setSaving(false)
      }
    },
    [commit, hasToken, kind, settings],
  )

  return { runs, loading, saving, error, source, reload, mutate }
}
