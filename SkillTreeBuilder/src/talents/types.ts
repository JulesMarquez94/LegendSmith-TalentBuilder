/** What an ability slot accepts. */
export type AbilityKind = 'damage' | 'cooldown' | 'mobility'

/** Slot 1 holds the artifact; the rest hold abilities. */
export type SlotKind = 'artifact' | AbilityKind

/** An ability card, like the deck's ability slides. */
export interface AbilityCard {
  name: string
  /** File name (without .png) in the tree's art folder. */
  icon?: string
  castTime: string
  range: string
  cooldown?: string
  description: string
}

export interface TalentDef {
  id: string
  name: string
  /** File name (without .png) in the tree's art folder. */
  icon?: string
  /** 0 = top row. */
  row: number
  /** 0 = left column. */
  col: number
  maxRank: number
  /** Id of a talent that must be at max rank first. Draws an arrow from it. */
  requires?: string
  /**
   * Tooltip text. Put per-rank values in braces, e.g. "by {0.5/1/1.5} sec" —
   * like WoW, the tooltip shows the value for the current (and next) rank.
   */
  description: string
}

/** An ability that can go in a slot, with its talent tree. */
export interface TreeDef {
  id: string
  /** Which slots it fits. */
  kind: AbilityKind
  ability: AbilityCard
  /** Abilities it applies, listed on its card — e.g. Plague's Pox, Blight and Malady. */
  effects?: AbilityCard[]
  /** Made-up content for playtesting; tagged in the builder. */
  playtest?: boolean
  /** Sub-folder of LegendSmith/Art with this tree's PNGs. Leave out to use placeholder art. */
  artFolder?: string
  background?: string
  /** Tint for placeholder icons and background. */
  color?: string
  columns: number
  /** Points that must be spent in the rows above to unlock each next row. */
  pointsPerRow: number
  talents: TalentDef[]
}
