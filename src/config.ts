import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  token: '',
  owner: 'RavenholmTourist',
  repo: 'git_game',
  branch: 'main',
}

export const DATA_PATHS = {
  coop: 'public/data/coop-runs.json',
  solo: 'public/data/solo-runs.json',
} as const

export const PLAYERS = { thomas: 'Thomas', craig: 'Craig' } as const
