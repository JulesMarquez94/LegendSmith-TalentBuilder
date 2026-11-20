// What a character brings to the HUD: its seven action slots with their numbers, its resource bar and
// role line, and the minions it can raise. A weapon the Unity game has uses the game's own default kit
// and resource (unity.ts); one only the builder has gets a kit from the builder's trees, in the game's
// slot order, so every prototype character still plays.

import type { Gear } from '../../../game/gear.ts'
import { buildKit, type Kit } from '../../../game/resolve.ts'
import { fits, slotKinds } from '../../../talents/slots.ts'
import type { ArtifactDef, Role, SlotKind, TreeDef } from '../../../talents/types.ts'
import { ARTIFACTS, TREES } from '../../../trees/index.ts'
import {
  ACTION_SLOTS,
  RESOURCES,
  unityArtifact,
  type ActionSlotId,
  type KeyPrompt,
  type KitEntry,
  type ResourceKey,
  type UnityArtifact,
} from './unity.ts'

export interface HudSlot {
  id: ActionSlotId
  key: KeyPrompt | null
  /** The level that opens it. */
  unlock: number
  open: boolean
  /** The group buff: no key, no cooldown. */
  passive: boolean
  name: string
  color: string
  /** The builder tree, for its icon; null for an ability only Unity has. */
  tree: TreeDef | null
  cost: number
  cooldown: number
  castTime: number
  /** Above 1: the count shows in the corner. */
  charges: number
  /** The global cooldown it starts. */
  gcd: number
}

export interface HudResource {
  /** "Mana", "Imps". */
  name: string
  /** The bar's caption: "MANA". */
  label: string
  color: string
  pips: boolean
  max: number
  regen: number
  startsFull: boolean
  /** The game's resource, or null for one only the builder has (Fervor, Light). */
  unity: ResourceKey | null
}

/** Something you raise that the minion counters keep count of (Raise Ghoul's ghouls). */
export interface HudMinion {
  name: string
  max: number
  duration: number
  /** The slot that raises them. */
  slot: ActionSlotId
}

export interface HudKit {
  artifact: ArtifactDef
  /** The game's version of the weapon, or null when the game doesn't have it yet. */
  unity: UnityArtifact | null
  role: 'Tank' | 'Healer' | 'Damage'
  /** "Healer · Lifewarden Staff", above the bars (HudRules.cs RoleText). */
  roleLine: string
  resource: HudResource
  slots: HudSlot[]
  minions: HudMinion[]
  /** The builder's numbers for the open slots: stats for the character screen. */
  kit: Kit
}

const ROLE_NAME: Record<Role, HudKit['role']> = { tank: 'Tank', healer: 'Healer', damage: 'Damage' }

const TREE_BY_ID = new Map(TREES.map((t) => [t.id, t]))

/** The builder's slot kind for each of the game's tiles: the artifact, three role slots, ultimate, mobility, group buff. */
function kindsInGameOrder(artifact: ArtifactDef): SlotKind[] {
  const k = slotKinds(artifact)
  return [k[0], k[1], k[2], k[3], k[5], k[4], k[6]]
}

/**
 * A kit for a weapon the game doesn't have: per tile, the first tree that fits, made for this weapon first,
 * then designed ones, then playable ones. No ability twice.
 */
export function builderKit(artifact: ArtifactDef): KitEntry[] {
  const used = new Set<string>()
  return kindsInGameOrder(artifact).map((kind, i) => {
    if (i === 0) return { tree: artifact.tree?.id ?? '' }
    const score = (t: TreeDef) => (t.madeFor === artifact.id ? 0 : 3) + (t.reviewed ? 0 : 1) + (t.spec ? 0 : 1)
    const pick = TREES.filter((t) => !used.has(t.id) && fits(t, kind, artifact)).sort((a, b) => score(a) - score(b))[0]
    if (!pick) return { name: 'Empty', color: '#555555', cost: 0, cooldown: 0 }
    used.add(pick.id)
    return { tree: pick.id }
  })
}

const RESOURCE_BY_NAME: Record<string, ResourceKey> = { Mana: 'mana', Focus: 'focus', Imps: 'imps', 'Combo points': 'combo' }

/** The HUD for a character holding this artifact at this level, wearing this gear. */
export function hudKit(artifactId: string, level: number, gear: Gear = {}): HudKit {
  const artifact = ARTIFACTS.find((a) => a.id === artifactId) ?? ARTIFACTS[0]
  const unity = unityArtifact(artifact.id) ?? null
  const entries = unity ? unity.kit : builderKit(artifact)
  const open = ACTION_SLOTS.map((s) => level >= s.unlock)
  const trees = entries.map((e) => ('tree' in e ? (TREE_BY_ID.get(e.tree) ?? null) : null))

  // The builder works out the numbers in its own slot order (mobility before the ultimate), for the open slots.
  const builderOrder = [0, 1, 2, 3, 5, 4, 6]
  const kit = buildKit({
    artifact,
    trees: [...builderOrder.map((g) => (open[g] ? trees[g] : null)), null],
    ranks: {},
    gear,
    catalog: TREES,
    level,
  })
  const live = (i: number) => kit.slots[builderOrder.indexOf(i)] ?? null

  const slots: HudSlot[] = ACTION_SLOTS.map((info, i) => {
    const entry = entries[i]
    const tree = trees[i]
    const passive = info.id === 'groupBuff'
    const a = open[i] && tree ? live(i) : null
    const fallback = tree?.spec
    return {
      id: info.id,
      key: info.key,
      unlock: info.unlock,
      open: open[i],
      passive,
      name: tree ? tree.ability.name : 'name' in entry ? entry.name : 'Empty',
      color: tree ? (tree.color ?? '#8a8a8a') : 'color' in entry ? entry.color : '#555555',
      tree,
      cost: passive ? 0 : (a?.cost ?? ('cost' in entry ? entry.cost : (fallback?.cost ?? 0) * (artifact.unit ?? 1))),
      cooldown: passive ? 0 : (a?.cooldown ?? ('cooldown' in entry ? entry.cooldown : (fallback?.cooldown ?? 0))),
      castTime: passive ? 0 : (a?.castTime ?? fallback?.castTime ?? 0),
      charges: a?.charges ?? fallback?.charges ?? 1,
      gcd: passive ? 0 : (a?.gcd ?? fallback?.gcd ?? 1),
    }
  })

  const minions: HudMinion[] = slots.flatMap((s) => {
    const summon = s.tree?.spec?.effects.find((e) => e.type === 'summon')
    return summon && s.open ? [{ name: summon.name ?? 'Minion', max: summon.max ?? 1, duration: summon.duration ?? 0, slot: s.id }] : []
  })

  const unityResource = unity ? unity.resource : RESOURCE_BY_NAME[artifact.resource]
  const style = unityResource ? RESOURCES[unityResource] : null
  const stats = kit.character.stats
  const resource: HudResource = style
    ? { name: unityResource === 'combo' ? 'Combo points' : capitalise(style.label), ...style, unity: unityResource ?? null }
    : {
        name: artifact.resource,
        label: artifact.resource.toUpperCase(),
        color: artifact.color,
        pips: !!artifact.combo,
        max: stats.maxResource,
        regen: stats.resourceRegen,
        startsFull: (artifact.resourceStart ?? stats.maxResource) >= stats.maxResource,
        unity: null,
      }

  const role = unity ? unity.role : ROLE_NAME[artifact.role]
  return {
    artifact,
    unity,
    role,
    roleLine: `${role} · ${unity?.name ?? artifact.name}`,
    resource,
    slots,
    minions,
    kit,
  }
}

const capitalise = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
