import { MAX_LEVEL, SLOT_LEVELS } from '../talents/levels.ts'

interface Props {
  level: number
  /** The lowest level the build fits: it can't go below that. */
  needed: number
  onLevel: (level: number) => void
}

/** The character's level, 1 to 60: levels 1–8 open the slots, every level after gives a talent point. */
export function LevelControl({ level, needed, onLevel }: Props) {
  const next =
    level >= MAX_LEVEL ? 'Max level' : level < SLOT_LEVELS ? `Level ${level + 1} opens slot ${level + 1}` : `Level ${level + 1}: +1 point`
  return (
    <div
      className="level"
      role="group"
      aria-label="Character level"
      title={needed > 1 ? `This build needs level ${needed}: empty slots or reset talents to go lower.` : undefined}
    >
      <span className="points__label">Level</span>
      <button
        type="button"
        className="btn level__step"
        aria-label="Level down"
        disabled={level <= needed}
        onClick={() => onLevel(level - 1)}
      >
        −
      </button>
      <input
        type="range"
        className="level__slider"
        aria-label="Level"
        min={1}
        max={MAX_LEVEL}
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
      />
      <button
        type="button"
        className="btn level__step"
        aria-label="Level up"
        disabled={level >= MAX_LEVEL}
        onClick={() => onLevel(level + 1)}
      >
        +
      </button>
      <span className="level__value" aria-live="polite">
        {level}
      </span>
      <span className="level__next">{level === needed && needed > 1 && level < MAX_LEVEL ? 'Lowest for this build' : next}</span>
    </div>
  )
}
