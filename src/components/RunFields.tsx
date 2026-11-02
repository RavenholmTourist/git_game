import type { StatsFields } from '../lib/validation'

interface Props {
  fields: StatsFields
  onChange: (f: StatsFields) => void
}

export function LevelTimeInputs({ fields, onChange }: Props) {
  return (
    <>
      <label>
        Level reached
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={fields.level}
          onChange={(e) => onChange({ ...fields, level: e.target.value })}
          required
        />
      </label>
      <label>
        Time (hh:mm:ss)
        <input
          placeholder="00:45:19"
          value={fields.time}
          onChange={(e) => onChange({ ...fields, time: e.target.value })}
          required
        />
      </label>
    </>
  )
}
