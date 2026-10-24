import type { AbilitySpec, CharStats, Mechanic } from '../game/types.ts'

/** What an ability slot accepts. `buff` is the group buff slot. */
export type AbilityKind = 'damage' | 'heal' | 'cooldown' | 'mobility' | 'buff'

/** Slot 1 holds the artifact; the last slot holds outdoor talents (none yet); the rest hold abilities. */
export type SlotKind = 'artifact' | AbilityKind | 'outdoor'

/**
 * The role an artifact gives you. Role abilities and group buffs belong to one role; mobility and
 * some ultimates (Fervor) are shared.
 */
export type Role = 'damage' | 'healer' | 'tank'

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
  /** What it does at a rank (1-based), for live numbers and the test arena. Leave out on display-only trees. */
  effects?: (rank: number) => Mechanic[]
}

/** An ability that can go in a slot, with its talent tree. */
export interface TreeDef {
  id: string
  /** Which slots it fits. Artifact trees belong to an artifact and go in slot 1. */
  kind: SlotKind
  /** Role, cooldown and buff trees fit only artifacts of this role. Leave out to fit any (mobility, Fervor). */
  role?: Role
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
  /** Numbers and behaviour for live tooltips and the test arena. Trees without one are display-only. */
  spec?: AbilitySpec
}

/** The weapon in slot 1. It sets the role, and so which abilities fit the other slots. */
export interface ArtifactDef {
  id: string
  name: string
  color: string
  role: Role
  /** What the three role slots hold. */
  roleKind: AbilityKind
  /** Shown on the artifact card and in the picker. */
  description: string
  /** Its resource, e.g. "Mana", "Imps", "Combo points". */
  resource: string
  /** How much resource a fight starts with. Default: full. */
  resourceStart?: number
  /** What holding it adds to the character: the staff's mana pool and regeneration. */
  stats?: Partial<CharStats>
  /** Its main attack and talents. Leave out while the artifact is a placeholder. */
  tree?: TreeDef
}
