export type Game = 'SoR4' | 'SoR1' | 'SoR2' | 'SoR3'

export interface Character {
  id: string
  game: Game
  name: string
  label: string
  portrait: string
  hasAltBlitz: boolean
}

const ROSTER: [Game, string[]][] = [
  ['SoR4', ['Axel', 'Blaze', 'Cherry', 'Floyd', 'Adam', 'Estel', 'Max', 'Shiva']],
  ['SoR1', ['Axel', 'Blaze', 'Adam']],
  ['SoR2', ['Axel', 'Blaze', 'Max', 'Skate']],
  ['SoR3', ['Axel', 'Blaze', 'Skate', 'Zan', 'Shiva', 'Roo']],
]

export const GAMES: Game[] = ROSTER.map(([g]) => g)

export const CHARACTERS: Character[] = ROSTER.flatMap(([game, names]) =>
  names.map((name) => {
    const id = `${game.toLowerCase()}-${name.toLowerCase()}`
    return {
      id,
      game,
      name,
      label: `${game} ${name}`,
      portrait: `${import.meta.env.BASE_URL}img/portraits/${id}.png`,
      hasAltBlitz: game !== 'SoR1',
    }
  }),
)

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]))

export function getCharacter(id: string): Character {
  const c = BY_ID.get(id)
  if (!c) throw new Error(`Unknown character ${id}`)
  return c
}

export function isGameBoundary(index: number): boolean {
  return index > 0 && CHARACTERS[index].game !== CHARACTERS[index - 1].game
}
