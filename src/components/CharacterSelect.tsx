import { CHARACTERS, GAMES } from '../characters'

interface Props {
  value: string
  onChange: (id: string) => void
  id?: string
}

export function CharacterSelect({ value, onChange, id }: Props) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="" disabled>
        Choose…
      </option>
      {GAMES.map((g) => (
        <optgroup key={g} label={g}>
          {CHARACTERS.filter((c) => c.game === g).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
