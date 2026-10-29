import { counted, int, pct, sec, statValue, yd } from './format.ts'
import { chainTotal, comboStrength, periodicTotal } from './resolve.ts'
import { STAT_INFO } from './stats.ts'
import type { CharStat, Condition, ResolvedAbility, ResolvedEffect } from './types.ts'

/** One number on an ability card, with which way counts as an upgrade so changes can flash. */
export interface NumberLine {
  /** Stable across builds, to compare against the base numbers. */
  key: string
  label: string
  value: number
  format: (n: number) => string
  /** 'up' when more is better (healing), 'down' when less is (cost, cast time). */
  better: 'up' | 'down'
  /** Small print after the value. */
  detail?: string
}

const TARGET: Partial<Record<ResolvedEffect['target'], string>> = {
  lowest: 'lowest-health ally',
  'lowest-missing': 'lowest-health ally without it',
  'next-lowest': 'next most injured ally',
  all: 'every ally in range',
  self: 'you',
  same: 'same target',
  event: 'that ally',
  path: 'allies you dash past',
  origin: 'where you were',
  target: 'enemy under your crosshair',
  afflicted: 'every enemy with your DoTs',
}

export function describeCondition(when: Condition): string {
  const parts: string[] = []
  if (when.targetBelow !== undefined) parts.push(`below ${when.targetBelow}% health`)
  if (when.targetHas !== undefined) parts.push('with your HoT or DoT')
  if (when.inZone) parts.push('in your zone')
  if (when.affected) parts.push('with your HoT or in your zone')
  if (when.targetSelf) parts.push('on you')
  if (when.each !== undefined) parts.push('for each of your effects on it')
  if (when.stacksOf !== undefined) parts.push('for each stack on it')
  if (when.single) parts.push('when it hits only one enemy')
  if (when.alone !== undefined) parts.push('while on only one enemy')
  if (when.perMinion) parts.push('for each minion you command')
  return parts.join(', ')
}

const amount = (n: number) => int(n)
const seconds = (n: number) => `${sec(n)} sec`
const percent = (n: number) => `${pct(n)}%`

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/** `resource` is the artifact's resource in lower case ("mana"). */
function effectLines(e: ResolvedEffect, prefix: string, resource: string): NumberLine[] {
  const key = (k: string) => `${prefix}${e.granted ?? e.index}:${k}`
  const name = e.name ?? e.granted
  const out: NumberLine[] = []
  const heals = !e.hostile && (e.family === 'direct-heal' || e.family === 'hot' || e.family === 'zone')
  const hurts = e.tags.has('damage')
  switch (e.type) {
    case 'heal':
      out.push({
        key: key('amount'),
        label: name ?? 'Heal',
        value: e.amount,
        format: amount,
        better: 'up',
        detail: e.targets > 1 ? `${e.targets} allies` : TARGET[e.target],
      })
      break
    case 'chain':
      out.push({ key: key('amount'), label: name ?? 'Heal', value: e.amount, format: amount, better: 'up', detail: TARGET[e.target] })
      if (e.bounces > 0) {
        out.push({
          key: key('bounces'),
          label: 'Jumps',
          value: e.bounces,
          format: (n) => `${n}×`,
          better: 'up',
          detail: `${yd(e.radius)} yd, −${pct(e.falloff)}% each · ${int(chainTotal(e))} if all land`,
        })
      }
      if (e.targets > 1) out.push({ key: key('targets'), label: 'Allies', value: e.targets, format: String, better: 'up' })
      break
    case 'bloom':
      out.push({ key: key('amount'), label: 'Per ally', value: e.amount, format: amount, better: 'up' })
      out.push({ key: key('extra'), label: `${capital(resource)} per ally`, value: e.extraCost, format: amount, better: 'down' })
      break
    case 'hot':
    case 'dot':
    case 'zone':
      if (e.inflicts) {
        out.push(...effectLines(e.inflicts, `${prefix}inflicts:`, resource))
        out.push({ key: key('duration'), label: 'Zone lasts', value: e.duration, format: seconds, better: 'up' })
        out.push({ key: key('radius'), label: 'Radius', value: e.radius, format: (n) => `${yd(n)} yd`, better: 'up' })
        break
      }
      out.push({
        key: key('amount'),
        label: name ?? (e.type === 'zone' ? 'Per tick, each' : e.rolling ? 'Per tick, per stack' : 'Per tick'),
        value: e.amount,
        format: amount,
        better: 'up',
        detail: `every ${seconds(e.interval)}${e.growth ? `, ${e.growth > 0 ? '+' : ''}${pct(e.growth)}% per tick` : ''}`,
      })
      out.push({
        key: key('duration'),
        label: e.rolling ? 'Each stack lasts' : 'Duration',
        value: e.duration,
        format: seconds,
        better: 'up',
        detail:
          `${e.ticks} ticks${e.instantTicks ? ` + ${e.instantTicks} on landing` : ''}` +
          (e.rolling && e.stacks > 1 ? ` · ${e.stacks} stacks a cast` : '') +
          (e.maxStacks > 0 ? ` · stacks up to ${e.maxStacks}${e.stacks > 1 ? `, ${e.stacks} a cast` : ''}` : ''),
      })
      if (e.type === 'zone') {
        out.push({
          key: key('radius'),
          label: 'Radius',
          value: e.radius,
          format: (n) => `${yd(n)} yd`,
          better: 'up',
          detail: e.follow ? (e.hostile ? 'follows its enemy' : 'follows its ally') : undefined,
        })
        if (e.damageReduction) {
          out.push({ key: key('dr'), label: 'Damage taken inside', value: e.damageReduction, format: (n) => `−${pct(n)}%`, better: 'up' })
        }
      }
      out.push({
        key: key('total'),
        label: e.type === 'zone' ? (e.hostile ? 'Total per enemy' : 'Total per ally') : e.rolling ? 'Total per stack' : 'Total',
        value: periodicTotal(e),
        format: amount,
        better: 'up',
      })
      break
    case 'shield':
      out.push({ key: key('amount'), label: name ?? 'Shield', value: e.amount, format: amount, better: 'up', detail: seconds(e.duration) })
      break
    case 'damage': {
      const where =
        e.target === 'self' ? `everything within ${yd(e.radius)} yd of you` : e.radius > 0 ? `+ everything within ${yd(e.radius)} yd` : TARGET[e.target]
      out.push({
        key: key('amount'),
        label: name ?? 'Damage',
        value: e.amount,
        format: amount,
        better: 'up',
        detail: [e.perEffect !== undefined && 'per DoT on each', where].filter(Boolean).join(' · '),
      })
      if (e.splash > 0) {
        out.push({
          key: key('splash'),
          label: 'Splash',
          value: e.splash,
          format: percent,
          better: 'up',
          detail: `of each hit, to every other enemy within 8 yd${e.soloSplash ? ` · +${pct(e.soloSplash)}% when it hits only one` : ''}`,
        })
      }
      if (e.taunt > 0) {
        out.push({ key: key('taunt'), label: 'Taunt', value: e.taunt, format: seconds, better: 'up', detail: 'they attack only you' })
      }
      break
    }
    case 'minion':
      out.push({
        key: key('amount'),
        label: name ?? 'Minion hit',
        value: e.amount,
        format: amount,
        better: 'up',
        detail: `every ${seconds(e.interval)}, each`,
      })
      if (e.duration > 0) out.push({ key: key('duration'), label: 'Each lasts', value: e.duration, format: seconds, better: 'up' })
      break
    case 'curse':
      out.push({
        key: key('amount'),
        label: `${name ?? 'Curse'} per stack`,
        value: e.amount,
        format: amount,
        better: 'up',
        detail: 'each hit from your minions takes a stack',
      })
      out.push({ key: key('stacks'), label: 'Stacks', value: e.stacks, format: String, better: 'up' })
      out.push({ key: key('duration'), label: 'Lasts', value: e.duration, format: seconds, better: 'up' })
      if (e.splash > 0) {
        out.push({ key: key('splash'), label: 'Splash', value: e.splash, format: percent, better: 'up', detail: 'of each stack, to every other enemy within 8 yd' })
      }
      if (e.keepChance > 0) {
        out.push({ key: key('keepChance'), label: 'Stack kept', value: e.keepChance, format: percent, better: 'up', detail: 'chance a stack bursts and stays' })
      }
      break
    case 'summon':
      out.push({
        key: key('amount'),
        label: `${name ?? 'Minion'} hit`,
        value: e.amount,
        format: amount,
        better: 'up',
        detail: `every ${seconds(e.interval)}, each`,
      })
      out.push({ key: key('duration'), label: 'Lasts', value: e.duration, format: seconds, better: 'up' })
      out.push({ key: key('max'), label: 'At once', value: e.max, format: String, better: 'up', detail: 'one more replaces the oldest' })
      if (e.radius > 0) out.push({ key: key('radius'), label: 'Hits around', value: e.radius, format: (n) => `${yd(n)} yd`, better: 'up', detail: 'every enemy that close to its target' })
      if (e.empower > 0) out.push({ key: key('empower'), label: 'Minions deal', value: e.empower, format: (n) => `+${pct(n)}%`, better: 'up', detail: 'your other minions, while it’s up' })
      if (e.hasten > 0) out.push({ key: key('hasten'), label: 'Minions attack', value: e.hasten, format: (n) => `${pct(n)}% faster`, better: 'up', detail: 'your other minions, while it’s up' })
      if (e.feed > 0) out.push({ key: key('feed'), label: 'Fed', value: e.feed, format: seconds, better: 'up', detail: 'longer for each minion that falls' })
      if (e.meteor > 0) out.push({ key: key('meteor'), label: 'Meteor', value: e.meteor, format: amount, better: 'up', detail: 'at every 5th minion that falls' })
      if (e.sustain > 0) out.push({ key: key('sustain'), label: 'Each attack', value: e.sustain, format: seconds, better: 'up', detail: 'added to your other minions' })
      break
    case 'aura':
      for (const [stat, n] of Object.entries(e.stats ?? {})) {
        out.push({
          key: key(stat),
          label: STAT_INFO[stat as CharStat].label,
          value: n ?? 0,
          format: (v) => `+${statValue(stat as CharStat, v)}`,
          better: 'up',
          detail: 'you and your group',
        })
      }
      break
    case 'restore':
      out.push({
        key: key('restore'),
        label: `${capital(resource)} back`,
        value: e.restore,
        format: (n) => `+${int(n)}`,
        better: 'up',
      })
      break
    case 'move':
      out.push({ key: key('distance'), label: 'Distance', value: e.distance, format: (n) => `${yd(n)} yd`, better: 'up' })
      if (e.returnWindow > 0) {
        out.push({
          key: key('returnWindow'),
          label: 'Go back',
          value: e.returnWindow,
          format: (n) => `within ${sec(n)} sec`,
          better: 'up',
          detail: 'use it again, for free',
        })
      }
      break
    case 'buff':
      for (const [stat, n] of Object.entries(e.buff?.stats ?? {})) {
        const value = stat === 'speed' ? e.speed : (n ?? 0)
        out.push({
          key: key(stat),
          label: STAT_INFO[stat as CharStat].label,
          value,
          format: (v) => `+${statValue(stat as CharStat, v)}`,
          better: 'up',
          detail: e.buff?.group ? 'you and your group' : undefined,
        })
      }
      out.push({ key: key('duration'), label: 'Duration', value: e.duration, format: seconds, better: 'up' })
      break
  }
  if (heals || hurts) {
    out.push({
      key: key('crit'),
      label: 'Crit chance',
      value: e.critChance,
      format: percent,
      better: 'up',
      detail: `crits for ${pct(e.critMultiplier * 100)}%`,
    })
  }
  for (const c of e.conditionals) {
    out.push({
      key: key(`if:${c.source}`),
      label: `+${pct(c.pct)}%`,
      value: c.pct,
      format: percent,
      better: 'up',
      detail: `${describeCondition(c.when)} (${c.source})`,
    })
  }
  return out
}

/** Every number on an ability, with the live values: what the numbers panel and tooltips show. */
export function abilityLines(a: ResolvedAbility): NumberLine[] {
  const out: NumberLine[] = []
  if (a.cost > 0) {
    out.push({
      key: 'cost',
      label: capital(a.resource),
      value: a.cost,
      format: int,
      better: 'down',
      detail: a.spendsAll
        ? `at least · spends all, ${pct(a.spendsAll.atFull)}× the effect with a full bar`
        : a.combo && a.combo.maxSteps > 1
          ? `a step · up to ${a.combo.maxSteps} steps for ${pct(comboStrength(a.combo.maxSteps, a.combo.perStep))}× the effect`
          : undefined,
    })
  }
  const aura = a.effects.length > 0 && a.effects.every((e) => e.type === 'aura')
  if (a.autocast > 0) {
    out.push({ key: 'autocast', label: 'Goes off', value: a.autocast, format: (n) => `every ${sec(n)} sec`, better: 'down', detail: 'on its own, for free' })
  } else if (!a.passive && !aura) {
    out.push({
      key: 'cast',
      label: 'Cast',
      value: a.castTime,
      format: (n) => (n > 0 ? seconds(n) : 'Instant'),
      better: 'down',
      detail: a.gcd === 0 ? 'off the global cooldown' : a.tags.has('main-attack') ? `${sec(a.gcd)} sec between attacks` : undefined,
    })
  }
  if (a.cooldown > 0) {
    out.push({
      key: 'cooldown',
      label: a.charges > 1 ? 'Recharge' : 'Cooldown',
      value: a.cooldown,
      format: seconds,
      better: 'down',
      detail: a.charges > 1 ? `${a.charges} charges` : undefined,
    })
  }
  if (a.echo > 0) out.push({ key: 'echo', label: 'Echo', value: a.echo, format: percent, better: 'up', detail: 'chance to cast again' })
  for (const e of a.effects) out.push(...effectLines(e, '', a.resource))
  if (a.minion) out.push(...effectLines(a.minion, 'minion:', a.resource))
  return out
}

/** A short summary for the ability header: "1.5 sec cast · 100 mana · 6 sec cooldown". */
export function abilityMeta(a: ResolvedAbility): string {
  const parts: string[] = []
  if (a.autocast > 0) parts.push(`Passive · every ${sec(a.autocast)} sec`)
  else if (a.passive || a.effects.every((e) => e.type === 'aura')) parts.push('Passive')
  else parts.push(a.castTime > 0 ? `${sec(a.castTime)} sec cast` : 'Instant')
  if (a.cost > 0) {
    const how = a.spendsAll ? ' or more, spends all' : a.combo && a.combo.maxSteps > 1 ? ' a step' : ''
    parts.push(`${counted(a.cost, a.resource)}${how}`)
  }
  if (a.cooldown > 0) parts.push(`${sec(a.cooldown)} sec ${a.charges > 1 ? `recharge · ${a.charges} charges` : 'cooldown'}`)
  if (a.range > 0) parts.push(`${yd(a.range)} yd`)
  return parts.join(' · ')
}
