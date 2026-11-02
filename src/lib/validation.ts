import { normalizeTime } from './time'

export interface StatsFields {
  level: string
  time: string
}

export function validateStats(f: StatsFields): string | null {
  const level = Number(f.level)
  if (!Number.isInteger(level) || level < 1) return 'Level must be a whole number of 1 or more.'
  if (!normalizeTime(f.time)) return 'Time must look like hh:mm:ss (or mm:ss).'
  return null
}

export function validScore(v: string): boolean {
  return /^\d+$/.test(v.replace(/,/g, ''))
}

export function toScore(v: string): number {
  return Number(v.replace(/,/g, ''))
}
