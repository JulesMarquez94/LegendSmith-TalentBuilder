import type { CSSProperties } from 'react'
import { int, pct } from '../../game/format.ts'
import {
  RARITY_INFO,
  requiredLevel,
  trinketHealth,
  trinketName,
  trinketPower,
  trinketStatValue,
  uniqueName,
  type Trinket,
} from '../../game/gear.ts'
import { STAT_INFO } from '../../game/stats.ts'

/** The overview's item card: name in the rarity colour, Power and Health, then the two stats. */
export function ItemCard({ trinket }: { trinket: Trinket }) {
  const rarity = RARITY_INFO[trinket.rarity]
  const value = trinketStatValue(trinket)
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
        {trinket.stats.map((stat) => (
          <div key={stat} style={{ color: STAT_INFO[stat].color }}>
            <span>{STAT_INFO[stat].label}</span>
            <b>+{value}%</b>
          </div>
        ))}
      </div>
      <div className="item__unique">Unique: “{uniqueName(trinket)}” (only one worn)</div>
    </div>
  )
}
