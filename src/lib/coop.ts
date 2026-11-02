import { getCharacter } from '../characters'
import type { CoopRun } from '../types'

export type Winner = 'thomas' | 'craig' | 'tie'

export const pairKey = (t: string, c: string) => `${t}|${c}`
export const total = (r: CoopRun) => r.thomasScore + r.craigScore
export const winner = (r: CoopRun): Winner =>
  r.thomasScore > r.craigScore ? 'thomas' : r.craigScore > r.thomasScore ? 'craig' : 'tie'
export const pairLabel = (t: string, c: string) => `${getCharacter(t).label} (T) + ${getCharacter(c).label} (C)`
