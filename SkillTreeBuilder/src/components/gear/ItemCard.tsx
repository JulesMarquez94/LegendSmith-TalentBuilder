import type { CSSProperties } from 'react'
import { int, pct } from '../../game/format.ts'
import {
  RARITY_INFO,
  requiredLevel,
  trinketHealth,
  trinketName,
  trinketPower,
  trinketStatValues,
  uniqueName,
  type Trinket,
} from '../../game/gear.ts'
import { STAT_INFO } from '../../game/stats.ts'
import { StatIcon } from '../StatIcon.tsx'

/** The overview's item card: name in the rarity colour, Power and Health, then the two stats. */
export function ItemCard({ trinket }: { trinket: Trinket }) {
  const rarity = RARITY_INFO[trinket.rarity]
  const values = trinketStatValues(trinket)
  return (
    <div className="item" style={{ '--rc': rarity.color } as CSSProperties}>
      <div className="item__name">{trinketName(trinket)}</div>
      <div className="item__row">
        <span>{rarity.label}</span>
        <span>Item level {trinket.itemLevel}</span>
      </div>
      <div className="item__req">Requires level {requiredLevel(trinket.itemLevel)}</div>
      <div className="item__big">
        <div>
          <span>Power</span>
          <b>+{pct(trinketPower(trinket))}%</b>
        </div>
        <div>
          <span>Health</span>
          <b>+{int(trinketHealth(trinket))}</b>
        </div>
      </div>
      <div className="item__stats">
        {trinket.stats.map((stat, i) => (
          <div key={stat} style={{ color: STAT_INFO[stat].color }}>
            <span>
              <StatIcon stat={stat} size={14} />
              {STAT_INFO[stat].label}
            </span>
            <b>+{pct(values[i])}%</b>
          </div>
        ))}
        {trinket.lean !== undefined && (
          <div className="item__lean">Leans toward {STAT_INFO[trinket.stats[trinket.lean]].label}: 150% and 50%</div>
        )}
      </div>
      <div className="item__unique">Unique: “{uniqueName(trinket)}” (only one worn)</div>
    </div>
  )
}
