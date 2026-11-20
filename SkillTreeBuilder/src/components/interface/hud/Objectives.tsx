import type { HudSettings } from './settings.ts'
import { clock, type ZoneObjectives } from './world.ts'

const KIND_LABEL: Record<ZoneObjectives['kind'], string> = {
  progression: 'Zone progression',
  open: 'Open zone',
  dungeon: 'Dungeon',
}

/** Seconds left on an event: it counts down from where it was, and starts over when it runs out (made-up events never end). */
const timeLeft = (endsIn: number, t: number) => {
  const span = Math.max(60, endsIn)
  return span - (t % span)
}

/**
 * The objective tracker: no quest log, just what you're doing in the zone you're in. A zone you're
 * going through shows its progression, the step you're on first; a zone you've done shows its events;
 * a dungeon its bosses.
 */
export function Objectives({ objectives: o, t, settings }: { objectives: ZoneObjectives; t: number; settings: HudSettings['objectives'] }) {
  const current = o.steps.findIndex((s) => !s.done)
  const steps = o.steps.filter((_, i) => i >= current || settings.done || current < 0)
  return (
    <section className="hud-objectives" aria-label="Objectives">
      <header className="hud-objectives__head">
        <span className="hud-objectives__kind">{KIND_LABEL[o.kind]}</span>
        <b className="hud-objectives__zone">{o.zone}</b>
        <span className="hud-objectives__title">{o.title}</span>
      </header>
      {settings.progress && steps.length > 0 && (
        <ol className="hud-objectives__steps">
          {steps.map((s) => {
            const now = s === o.steps[current]
            return (
              <li key={s.text} className={s.done ? 'is-done' : now ? 'is-current' : 'is-next'}>
                <span className="hud-objectives__mark" aria-hidden="true">
                  {s.done ? '✓' : now ? '◆' : '◇'}
                </span>
                <span className="hud-objectives__text">
                  {s.text}
                  {s.count && now && (
                    <>
                      <small>
                        {s.count[0]} / {s.count[1]}
                      </small>
                      <span className="hud-objectives__bar">
                        <i style={{ width: `${(s.count[0] / s.count[1]) * 100}%` }} />
                      </span>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {settings.events && o.events.length > 0 && (
        <ul className="hud-objectives__events">
          {o.events.map((e) => (
            <li key={e.name}>
              <span className="hud-objectives__event">
                <b>{e.name}</b>
                {settings.timers && <small>{clock(timeLeft(e.endsIn, t))}</small>}
              </span>
              <span className="hud-objectives__text">{e.text}</span>
              <span className="hud-objectives__bar hud-objectives__bar--event">
                <i style={{ width: `${Math.min(1, e.progress + (t % 120) / 600) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
