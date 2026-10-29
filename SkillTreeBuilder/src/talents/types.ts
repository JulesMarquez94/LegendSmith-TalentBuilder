import type { AbilitySpec, CharStats, Mechanic } from '../game/types.ts'

/** What an ability slot accepts. `tank` holds a tank's role abilities; `buff` is the group buff slot. */
export type AbilityKind = 'damage' | 'heal' | 'tank' | 'cooldown' | 'mobility' | 'buff'

/** Slot 1 holds the artifact; the last slot holds the character skill tree (none yet); the rest hold abilities. */
export type SlotKind = 'artifact' | AbilityKind | 'character'

/**
 * The role an artifact gives you. Role abilities and group buffs belong to one role; mobility and
 * some ultimates (Fervor) are shared.
 */
export type Role = 'damage' | 'healer' | 'tank'

/**
 * What a weapon physically is, for abilities whose animation or story needs it: a blade stabs and
 * slices, daggers can be thrown, a large weapon sweeps and cleaves, a bow shoots arrows, a shield
 * bashes and blocks.
 */
export type WeaponTrait = 'blade' | 'dagger' | 'large' | 'bow' | 'staff' | 'book' | 'shield'

/** Whether a weapon fights up close or from range. With the role, it sets your seat in a group. */
export type Reach = 'melee' | 'ranged'

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
   * Id of a talent in the same tree it's a choice with: you can take one or the other, not both.
   * The pair counts once (the bigger one) toward the tree's ranks.
   */
  excludes?: string
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
  /**
   * Its design has had a pass with the game's designer. A tree without it is a work in progress:
   * greyed out and tagged WIP in the picker (still selectable), and tagged WIP in its slot.
   */
  reviewed?: boolean
  /**
   * The artifact it was made with (Harvest: the summoning book), shown as a label in the picker and
   * listed first while you hold that weapon. Not a limit by itself: see `needs`.
   */
  madeFor?: string
  /**
   * Only for weapon strikes and shots, whose animation needs a certain weapon: Backstab needs a blade,
   * Fan of Knives daggers, a cleave a large weapon, arrows a bow. Spells leave it out, so every weapon
   * of the role can cast them (Plague, Raise Ghoul, Doom Bolt).
   */
  needs?: WeaponTrait
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
  /** Up close or from range: the picker groups artifacts by seat (tank, healer, melee or ranged damage). */
  reach: Reach
  /**
   * A first version, improvised until its real design arrives: tagged in the builder. Search for
   * `firstVersion` to find them all.
   */
  firstVersion?: boolean
  /** Shown on the artifact card and in the picker. */
  description: string
  /** What it is, for abilities that need a certain weapon (`needs`). */
  traits: readonly WeaponTrait[]
  /** Its resource, e.g. "Mana", "Imps", "Combo points". */
  resource: string
  /** How much resource a fight starts with. Default: full. */
  resourceStart?: number
  /**
   * How much of its resource one point of an ability's cost or gain is. Abilities are written in points
   * (Harvest costs 2, Backstab gives 2); focus counts in tens, so on the bow Harvest costs 20 focus and
   * Backstab gives 20. Default 1: an imp, a combo point, a point of mana.
   */
  unit?: number
  /**
   * Combo points: every ability that costs something takes as many steps of its cost as you can pay
   * (a cost of 2 spends 4 or 6) and grows with each step. The abilities themselves don't change.
   */
  combo?: boolean
  /** What holding it adds to the character: the staff's mana pool and regeneration. */
  stats?: Partial<CharStats>
  /** Its main attack and talents. Leave out while the artifact is a placeholder. */
  tree?: TreeDef
}
