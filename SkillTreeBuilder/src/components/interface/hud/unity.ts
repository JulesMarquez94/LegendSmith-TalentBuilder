// What the Unity game (LoupMr/LegendSmith) has live, so the HUD prototype matches it. A snapshot by
// hand of its main branch: update it when the game changes. Each part names the Unity file it comes
// from, under Assets/_LegendSmith/.

/** The Unity commit this snapshot was read from. */
export const UNITY_SNAPSHOT = { repo: 'LoupMr/LegendSmith', commit: '27da2a1', date: '19 Nov 2026' } as const

/** The HUD is drawn for 1920 × 1080 (Features/HUD/Content/UI/PS_HUD). */
export const REFERENCE = { width: 1920, height: 1080 } as const

/** Keyboard and mouse, or a pad: the HUD's key prompts follow the last device used (HudRules.cs SchemeTracker). */
export type Scheme = 'keyboard' | 'gamepad'

export interface KeyPrompt {
  keyboard: string
  gamepad: string
}

/** The action bar's seven tiles, in control order (Features/HUD/Runtime/View/ActionBar.cs). */
export type ActionSlotId = 'basic' | 'ability1' | 'ability2' | 'ability3' | 'big' | 'mobility' | 'groupBuff'

export interface ActionSlotInfo {
  id: ActionSlotId
  /** Its key (Core/Runtime/Input/LegendSmith.inputactions); none for the passive group buff. */
  key: KeyPrompt | null
  /** The level that opens it (the artifacts' ability sets: Basic 1 … Mobility and the group buff 6). */
  unlock: number
}

export const ACTION_SLOTS: readonly ActionSlotInfo[] = [
  { id: 'basic', key: { keyboard: 'LMB', gamepad: 'LT' }, unlock: 1 },
  { id: 'ability1', key: { keyboard: 'RMB', gamepad: 'RT' }, unlock: 2 },
  { id: 'ability2', key: { keyboard: 'Q', gamepad: 'LB' }, unlock: 3 },
  { id: 'ability3', key: { keyboard: 'E', gamepad: 'RB' }, unlock: 4 },
  { id: 'big', key: { keyboard: 'F', gamepad: 'Y' }, unlock: 5 },
  { id: 'mobility', key: { keyboard: 'Alt', gamepad: 'B' }, unlock: 6 },
  { id: 'groupBuff', key: null, unlock: 6 },
]

/** The other keys the game has (LegendSmith.inputactions, Player map). */
export const KEYS = {
  move: { keyboard: 'WASD', gamepad: 'LS' },
  dodge: { keyboard: 'V', gamepad: 'RS' },
  interact: { keyboard: 'R', gamepad: 'X' },
  character: { keyboard: 'C', gamepad: 'View' },
  menu: { keyboard: 'Esc', gamepad: 'Menu' },
} as const satisfies Record<string, KeyPrompt>

/** A resource bar's look (HudRules.cs ResourceStyle, UI_HUD.uss colours) and its numbers (RES_*.asset, KITS_Abilities). */
export interface ResourceStyle {
  /** The caption on the bar. */
  label: string
  color: string
  /** Combo points: the bar is split into one pip per point. Imps stay a bar whose text is the count. */
  pips: boolean
  max: number
  /** Per second, on its own. */
  regen: number
  startsFull: boolean
}

export type ResourceKey = 'mana' | 'focus' | 'imps' | 'combo' | 'rage' | 'energy'

export const RESOURCES: Record<ResourceKey, ResourceStyle> = {
  mana: { label: 'MANA', color: 'rgb(52 110 230)', pips: false, max: 1000, regen: 8, startsFull: true },
  focus: { label: 'FOCUS', color: 'rgb(96 186 92)', pips: false, max: 100, regen: 0, startsFull: false },
  imps: { label: 'IMPS', color: 'rgb(150 92 200)', pips: false, max: 15, regen: 0, startsFull: false },
  combo: { label: 'COMBO', color: 'rgb(236 150 30)', pips: true, max: 6, regen: 0, startsFull: false },
  // Rage decays 2 a second after 5 sec out of combat; hits give it (RES_Rage).
  rage: { label: 'RAGE', color: 'rgb(212 86 20)', pips: false, max: 100, regen: 0, startsFull: false },
  energy: { label: 'ENERGY', color: 'rgb(232 196 40)', pips: false, max: 100, regen: 0, startsFull: false },
}

/** Health on the player bars (UI_HUD.uss .ls-bar--health). */
export const HEALTH_COLOR = 'rgb(196 52 46)'
export const STAMINA_COLOR = 'rgb(124 179 66)'
export const CAST_COLOR = 'rgb(226 182 74)'

/** Stamina: dodging spends it, it comes back 25 a second after 1 sec (DEF_PlayerMovement), and the bar fades 2 sec after it's full (DEF_Hud). */
export const STAMINA = { max: 100, dodgeCost: 25, regen: 25, regenDelay: 1, fadeDelay: 2, fadeDuration: 0.4 } as const

/** An ability only Unity has, with its numbers (Features/Abilities/Content/Data/SwordShield/DEF_Ability_*). */
export interface UnityOnlyAbility {
  name: string
  color: string
  cost: number
  cooldown: number
}

/** An ability in a Unity kit: a builder tree by id (KITS_Abilities imports them), or one only Unity has. */
export type KitEntry = { tree: string } | UnityOnlyAbility

/** A weapon the game has, with the default kit its ability set slots, tile by tile (Features/Abilities/Content/Data/DEF_AbilitySet_*). */
export interface UnityArtifact {
  /** The builder artifact a prototype character holds for it. */
  builderId: string
  name: string
  role: 'Tank' | 'Healer' | 'Damage'
  resource: ResourceKey
  /** Not designed in the builder yet: Unity's own stand-in. */
  provisional?: string
  /** One per action slot, in `ACTION_SLOTS` order. */
  kit: readonly KitEntry[]
}

const unityOnly = (name: string, color: string, cost: number, cooldown: number): UnityOnlyAbility => ({ name, color, cost, cooldown })

/** The five weapons in Unity's ArtifactDefs (Features/Artifacts/Content/Data/ART_*). */
export const UNITY_ARTIFACTS: readonly UnityArtifact[] = [
  {
    builderId: 'lifewarden-staff',
    name: 'Lifewarden Staff',
    role: 'Healer',
    resource: 'mana',
    kit: [
      { tree: 'lifewarden-staff' },
      { tree: 'mend' },
      { tree: 'renew' },
      { tree: 'healing-rain' },
      { tree: 'miracle' },
      { tree: 'dash' },
      { tree: 'vitality-aura' },
    ],
  },
  {
    builderId: 'ashwood-longbow',
    name: 'Ashwood Longbow',
    role: 'Damage',
    resource: 'focus',
    kit: [
      { tree: 'ashwood-longbow' },
      { tree: 'aimed-shot' },
      { tree: 'multi-shot' },
      { tree: 'poison-arrow' },
      { tree: 'fervor' },
      { tree: 'dash' },
      { tree: 'war-cadence' },
    ],
  },
  {
    builderId: 'twin-daggers',
    name: 'Twin Daggers',
    role: 'Damage',
    resource: 'combo',
    kit: [
      { tree: 'twin-daggers' },
      { tree: 'backstab' },
      { tree: 'eviscerate' },
      { tree: 'rupture' },
      { tree: 'fervor' },
      { tree: 'dash' },
      { tree: 'war-cadence' },
    ],
  },
  {
    builderId: 'tome-of-summoning',
    name: 'Tome of Summoning',
    role: 'Damage',
    resource: 'imps',
    kit: [
      { tree: 'tome-of-summoning' },
      { tree: 'plague' },
      { tree: 'harvest' },
      { tree: 'raise-ghoul' },
      { tree: 'fervor' },
      { tree: 'dash' },
      { tree: 'war-cadence' },
    ],
  },
  {
    builderId: 'sword-and-shield',
    name: 'Sword and shield',
    role: 'Tank',
    resource: 'rage',
    provisional: 'Not designed in the Talent Builder: Unity has its own stand-in on rage',
    kit: [
      unityOnly('Slash', '#b9b9b9', 0, 0.7),
      unityOnly('Shield Slam', '#8aa4c8', 15, 6),
      unityOnly('Block', '#7d8fa8', 0, 1),
      unityOnly('Taunt', '#c87a5a', 0, 8),
      unityOnly('Shield Wall', '#9aa7b8', 30, 60),
      unityOnly('Charge', '#d0a050', 0, 15),
      { tree: 'stoneskin' },
    ],
  },
]

/** The Unity weapon a builder artifact stands for, or undefined when the game doesn't have it yet. */
export const unityArtifact = (builderId: string): UnityArtifact | undefined => UNITY_ARTIFACTS.find((a) => a.builderId === builderId)

/** Live in the game: the HUD shows its Unity kit and resource. */
export const isInUnity = (builderId: string) => unityArtifact(builderId) !== undefined

/** One seat of the offline party: the bots (Features/Bots/Content/Data/DEF_Bots). The player takes the first seat of its role. */
export interface PartySeat {
  name: string
  role: 'Tank' | 'Healer' | 'Damage'
  weapon: string
  resource: ResourceKey
}

export const PARTY_SEATS: readonly PartySeat[] = [
  { name: 'Bram', role: 'Tank', weapon: 'Sword and shield', resource: 'rage' },
  { name: 'Maelis', role: 'Healer', weapon: 'Lifewarden Staff', resource: 'mana' },
  { name: 'Corin', role: 'Damage', weapon: 'Twin Daggers', resource: 'combo' },
  { name: 'Wren', role: 'Damage', weapon: 'Ashwood Longbow', resource: 'focus' },
]

/** Role letters and colours on the party frames (Features/Bots/Content/UI/UI_PartyFrames.uss). */
export const ROLE_STYLE: Record<PartySeat['role'], { letter: string; color: string }> = {
  Tank: { letter: 'T', color: 'rgb(90 140 220 / 0.8)' },
  Healer: { letter: 'H', color: 'rgb(90 200 120 / 0.8)' },
  Damage: { letter: 'D', color: 'rgb(220 90 80 / 0.8)' },
}

/** The other seats' frames, for a player of this role: everyone but the first seat of that role. */
export function otherSeats(role: PartySeat['role']): PartySeat[] {
  const mine = PARTY_SEATS.findIndex((s) => s.role === role)
  return PARTY_SEATS.filter((_, i) => i !== mine)
}

export interface BossPhase {
  name: string
  /** The phase starts when the boss's health drops to this %. */
  fromHealth: number
}

/** A boss of the mine (Features/Bosses/Content/Data/BOSS_*): name, phases and what it casts. */
export interface UnityBoss {
  id: string
  name: string
  summary: string
  phases: readonly BossPhase[]
  /** Its wind-ups, in the order it casts them. */
  casts: readonly string[]
  /** What joins the fight. */
  adds: string
}

export const BOSSES: readonly UnityBoss[] = [
  {
    id: 'snikkit',
    name: 'Snikkit, Gobold Chief',
    summary: 'The gobold boss who held the mine before the Gravehands came.',
    phases: [
      { name: 'The shed', fromHealth: 100 },
      { name: 'First wave', fromHealth: 70 },
      { name: 'Second wave', fromHealth: 40 },
    ],
    casts: ["Chief's cleaver"],
    adds: 'Gobold',
  },
  {
    id: 'malacarne',
    name: 'Overseer Malacarne',
    summary: 'A living Gravehand with a chain of ferals.',
    phases: [
      { name: 'The lift', fromHealth: 100 },
      { name: 'First feral', fromHealth: 75 },
      { name: 'Second feral', fromHealth: 50 },
      { name: 'Last feral', fromHealth: 25 },
    ],
    casts: ['Hook and chain', 'Unchain a feral', 'Steady bleed'],
    adds: 'Feral',
  },
]

/** The phase a boss is in at this health %. */
export function phaseAt(boss: Pick<UnityBoss, 'phases'>, health: number): BossPhase {
  let current = boss.phases[0]
  for (const p of boss.phases) if (health <= p.fromHealth) current = p
  return current
}

/** The boss frame's words and colours (Features/Bosses/Content/Data/DEF_BossFrame). */
export const BOSS_FRAME = {
  castLabel: 'Incoming',
  enraged: 'Enraged',
  difficulty: { normal: 'Normal', hard: 'Hard' },
  healthFill: 'rgb(191 41 41)',
  healthBack: 'rgb(41 10 10 / 0.9)',
  tick: 'rgb(255 235 153)',
  tickPassed: 'rgb(255 255 255 / 0.3)',
  castFill: 'rgb(242 166 38)',
  enrage: 'rgb(255 217 140)',
  hard: 'rgb(255 140 51)',
} as const

/** The enemy kinds (Features/Enemies/Content/Data/ENEMY_*). */
export const ENEMY_KINDS = ['Grunt', 'Brute', 'Caster', 'Feral', 'Gobold'] as const

/** Nameplate tuning (Features/Combat/Content/Data/DEF_Nameplates): the editor's defaults. */
export const NAMEPLATES = {
  showDistance: 30,
  targetedShowDistance: 40,
  fadeMetres: 8,
  maxPlates: 12,
  showAtFullHealth: true,
  barWidthPx: 64,
  barHeightPx: 6,
  nameFontPx: 16,
  showName: true,
  showLevel: true,
  enemyName: 'rgb(255 217 217)',
  enemyFill: 'rgb(191 41 41)',
  targetedFill: 'rgb(255 89 64)',
  back: 'rgb(26 8 8 / 0.85)',
} as const

/** The bag holds 30 items (Features/Gear: "Bag n / 30"). */
export const BAG_SIZE = 30

/** The interact prompt's texts (Features/Player/Content/Data/DEF_PlayerInteract). */
export const INTERACT = { release: 'Release', reviving: 'Reviving…', refusal: "Can't do that now" } as const

/** What the action bar says when using a slot fails (HudRules.cs SlotText.Failure). */
export function failureText(
  reason: 'resource' | 'minionCap' | 'stamina' | 'cooldown' | 'noTarget' | 'range' | 'locked',
  resource: ResourceKey,
  unlock = 0,
): string {
  const label = RESOURCES[resource].label.toLowerCase()
  switch (reason) {
    case 'resource':
      return `Not enough ${label}`
    case 'minionCap':
      return `You command as many ${label} as you can`
    case 'stamina':
      return 'Not enough stamina'
    case 'cooldown':
      return 'Not ready yet'
    case 'noTarget':
      return 'No target'
    case 'range':
      return 'Out of range'
    case 'locked':
      return unlock > 0 ? `Unlocks at level ${unlock}` : 'Locked'
  }
}

/** Seconds left on a cooldown, as a slot shows them: whole seconds rounded up from 1, tenths below, empty when over (SlotText.Cooldown). */
export function cooldownText(seconds: number): string {
  if (!(seconds > 0)) return ''
  if (seconds >= 1) return String(Math.ceil(seconds - 1e-6))
  return (Math.ceil(seconds * 10 - 1e-6) / 10).toFixed(1)
}

/** "850 / 1000", rounded half away from zero, negatives as 0 (HudRules.cs BarText.Format). */
export function barText(current: number, max: number): string {
  const whole = (v: number) => (Number.isNaN(v) || v <= 0 ? 0 : Math.round(v))
  return `${whole(current)} / ${whole(max)}`
}
