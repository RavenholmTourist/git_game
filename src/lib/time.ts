export function parseTime(input: string): number | null {
  const parts = input.trim().split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  const [h, m, s] = nums.length === 3 ? nums : [0, ...nums]
  if (m > 59 || s > 59) return null
  return h * 3600 + m * 60 + s
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function normalizeTime(input: string): string | null {
  const secs = parseTime(input)
  return secs === null ? null : formatTime(secs)
}

export function sumTimes(times: string[]): string {
  return formatTime(times.reduce((acc, t) => acc + (parseTime(t) ?? 0), 0))
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB')
}

export function levelColor(level: number, maxLevel = 40): string {
  const t = Math.max(0, Math.min(1, (level - 1) / (maxLevel - 1)))
  const hue = 0 + t * 130
  const light = 28 + t * 14
  return `hsl(${hue.toFixed(0)} 75% ${light.toFixed(0)}%)`
}

export function pickRandom<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null
}
