export type MoveVariant = 'default' | 'alternate'

export interface CoopRun {
  id: string
  loggedAt: string
  thomas: string
  craig: string
  level: number
  time: string
  thomasScore: number
  craigScore: number
}

export interface SoloRun {
  id: string
  loggedAt: string
  character: string
  blitz: MoveVariant
  star: MoveVariant
  level: number
  time: string
  score: number
}

export interface Settings {
  token: string
  owner: string
  repo: string
  branch: string
}
