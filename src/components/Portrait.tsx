import { getCharacter } from '../characters'

interface Props {
  id: string
  size?: number
  showName?: boolean
}

export function Portrait({ id, size = 40, showName = false }: Props) {
  const c = getCharacter(id)
  return (
    <span className="portrait" title={c.label}>
      <img src={c.portrait} alt={c.label} width={size} height={size} loading="lazy" />
      {showName && (
        <span className="portrait-name">
          <span className={`game-tag game-${c.game.toLowerCase()}`}>{c.game}</span> {c.name}
        </span>
      )}
    </span>
  )
}
