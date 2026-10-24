import { int, pct } from '../../game/format.ts'
import type { Arena } from '../../game/sim/arena.ts'

const sum = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0)

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/** A healing meter like a WoW damage meter, plus where your resource went and came from. */
export function ArenaMeter({ arena }: { arena: Arena }) {
  const { meter } = arena
  const t = Math.max(1, arena.time)
  const rows = [...meter.rows.values()].sort((a, b) => b.healing - a.healing)
  const hits = [...meter.damageRows.values()].sort((a, b) => b.damage - a.damage)
  const topHit = hits[0]?.damage || 1
  const healing = sum(rows.map((r) => r.healing))
  const overheal = sum(rows.map((r) => r.overheal))
  const top = rows[0]?.healing || 1
  const spent = [...meter.resourceSpent.entries()].sort((a, b) => b[1] - a[1])
  const gained = [...meter.resourceGained.entries()].sort((a, b) => b[1] - a[1])

  return (
    <section className="meter" aria-label="Healing meter">
      <div className="meter__totals">
        <div>
          <span>Time</span>
          <b>{clock(arena.time)}</b>
        </div>
        <div>
          <span>Healing per sec</span>
          <b>{int(healing / t)}</b>
        </div>
        <div>
          <span>Overheal</span>
          <b>{healing + overheal > 0 ? `${pct((overheal / (healing + overheal)) * 100)}%` : '—'}</b>
        </div>
        <div>
          <span>Damage per sec</span>
          <b>{int(meter.damage / t)}</b>
        </div>
      </div>

      {hits.length > 0 && (
        <table className="meter__table">
          <thead>
            <tr>
              <th>Damage</th>
              <th>Total</th>
              <th>Per sec</th>
              <th>Hits</th>
              <th>Crit</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((r) => (
              <tr key={r.name}>
                <td>
                  <span className="meter__bar" style={{ width: `${(r.damage / topHit) * 100}%`, background: r.color }} />
                  <span className="meter__name">{r.name}</span>
                </td>
                <td>{int(r.damage)}</td>
                <td>{int(r.damage / t)}</td>
                <td>{r.hits}</td>
                <td>{`${pct((r.crits / r.hits) * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table className="meter__table" hidden={rows.length === 0 && hits.length > 0}>
        <thead>
          <tr>
            <th>Healing</th>
            <th>Total</th>
            <th>Per sec</th>
            <th>Over</th>
            <th>Crit</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="meter__empty">
                No healing yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <span className="meter__bar" style={{ width: `${(r.healing / top) * 100}%`, background: r.color }} />
                <span className="meter__name">{r.name}</span>
              </td>
              <td>{int(r.healing)}</td>
              <td>{int(r.healing / t)}</td>
              <td>{r.healing + r.overheal > 0 ? `${pct((r.overheal / (r.healing + r.overheal)) * 100)}%` : '—'}</td>
              <td>{r.hits ? `${pct((r.crits / r.hits) * 100)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="meter__resource">
        <div>
          <h3>
            {arena.kit.resource} spent · {int(sum(meter.resourceSpent.values()))}
          </h3>
          <ul>
            {spent.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <b>{int(n)}</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            {arena.kit.resource} gained · {int(sum(meter.resourceGained.values()))}
          </h3>
          <ul>
            {gained.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <b>{int(n)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
