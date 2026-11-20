import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { GEAR_PRESETS, type Gear } from '../../../game/gear.ts'
import { keyTarget } from '../keys.ts'
import type { Character } from '../roster.ts'
import { HudEditor, type Selection } from './HudEditor.tsx'
import {
  ActionBar,
  BossFrame,
  EncounterBar,
  InteractPrompt,
  MicroMenu,
  PartyFrames,
  PlayerBars,
  TargetFrame,
} from './HudParts.tsx'
import { Bags, CharacterScreen } from './HudWindows.tsx'
import { hudKit } from './kit.ts'
import { COLS, isShown, isWindow, loadLayout, PARTS, rectStyle, saveLayout, type HudId, type HudLayout } from './layout.ts'
import { Minimap } from './Minimap.tsx'
import { Objectives } from './Objectives.tsx'
import { stepRange, SETTINGS, withSetting } from './settings.ts'
import { HudSim } from './sim.ts'
import type { MicroAction } from './text.ts'
import { WorldView } from './WorldView.tsx'
import { bossAt, groupAt, objectiveMarkers, objectivesFor, relative, sampleBag, type Situation, type Vec } from './world.ts'

interface Props {
  /** The Interface view is on show: the world runs. */
  running: boolean
  /** Takes the game's keys: off while the game menu or the edit mode is open. */
  active: boolean
  character: Character
  situation: Situation
  editing: boolean
  onEditDone: () => void
  /** The micro menu's Menu button. */
  onMenu: () => void
}

type WindowId = 'character' | 'bags'

/** Something to use with the interact key, a few steps ahead of where you start. */
const CHEST: Vec = { x: 0, y: 6 }
const REACH = 3

/** A character starts in gear that fits its level: nothing at first, an even set later. */
const startingGear = (level: number): Gear =>
  (level >= 50 ? GEAR_PRESETS.find((p) => p.id === 'rare-100') : level >= 30 ? GEAR_PRESETS.find((p) => p.id === 'common-crit') : undefined)?.gear ?? {}

const KEY_SLOT: Record<string, number> = { KeyQ: 2, KeyE: 3, KeyF: 4, AltLeft: 5, AltRight: 5 }

/**
 * The in-game HUD on its grid of blocks, over the world. Every element sits where the saved layout puts
 * it; the edit mode moves, sizes, turns off and sets up each one. The parts the Unity game has look and
 * behave as there (keys, unlock levels, resource bars, boss frame, nameplates); the minimap, objectives,
 * micro menu and bags are new.
 */
export function Hud({ running, active, character, situation, editing, onEditDone, onMenu }: Props) {
  const [layout, setLayout] = useState<HudLayout>(loadLayout)
  const [before, setBefore] = useState<HudLayout>(layout)
  const [selected, setSelected] = useState<Selection>(null)
  const [wasEditing, setWasEditing] = useState(editing)
  if (editing !== wasEditing) {
    setWasEditing(editing)
    setSelected(null)
    if (editing) setBefore(layout)
  }
  useEffect(() => saveLayout(layout), [layout])

  const [gear, setGear] = useState<Gear>(() => startingGear(character.level))
  const kit = useMemo(() => hudKit(character.artifact, character.level, gear), [character.artifact, character.level, gear])
  const bag = useMemo(() => sampleBag(character.level), [character.level])
  const [sim, setSim] = useState(() => new HudSim(kit, character.level, situation))
  if (sim.kit !== kit || sim.situation !== situation) setSim(new HudSim(kit, character.level, situation))
  const [, setFrame] = useState(0)
  const [open, setOpen] = useState<ReadonlySet<WindowId>>(new Set())
  const toggle = (id: WindowId) =>
    setOpen((o) => {
      const next = new Set(o)
      if (!next.delete(id)) next.add(id)
      return next
    })

  // The block's size in pixels: the grid stays 32 × 18, so everything scales with the screen.
  const grid = useRef<HTMLDivElement>(null)
  const [block, setBlock] = useState(40)
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => setBlock(el.clientWidth / COLS || 40)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The world runs while the view is on show.
  useEffect(() => {
    if (!running) return
    let last = performance.now()
    let id = 0
    const loop = (now: number) => {
      // A frame's timestamp can come before the loop started: never a step back in time.
      sim.tick(Math.min(0.1, Math.max(0, (now - last) / 1000)))
      last = now
      setFrame((f) => (f + 1) % 1_000_000)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [sim, running])

  const near = relative(CHEST, sim.at, sim.heading).distance <= REACH && situation === 'explore'

  // The game's keys: W A S D, Q E F and Alt for the slots, V to dodge, C and B for the windows, R to use.
  const latest = useRef({ sim, open, near, toggle })
  useEffect(() => {
    latest.current = { sim, open, near, toggle }
  })
  useEffect(() => {
    const s = () => latest.current.sim
    if (!active) {
      s().input = { forward: 0, turn: 0 }
      return
    }
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || keyTarget(e.target) === 'text') return
      const sim = s()
      const { open: windows } = latest.current
      if (e.code === 'Escape' && windows.size > 0) {
        e.preventDefault()
        setOpen(new Set())
        return
      }
      if (e.code === 'KeyW') sim.input.forward = 1
      else if (e.code === 'KeyS') sim.input.forward = -1
      else if (e.code === 'KeyA') sim.input.turn = -1
      else if (e.code === 'KeyD') sim.input.turn = 1
      else if (e.repeat) return
      else if (e.code in KEY_SLOT) {
        e.preventDefault()
        sim.use(KEY_SLOT[e.code])
      } else if (e.code === 'KeyV') sim.dodge()
      else if (e.code === 'KeyC') latest.current.toggle('character')
      else if (e.code === 'KeyB') latest.current.toggle('bags')
      else if (e.code === 'KeyM') sim.say('The world map comes later')
      else if (e.code === 'KeyR' && latest.current.near) sim.say('The chest is empty')
      else return
    }
    const up = (e: KeyboardEvent) => {
      const sim = s()
      if ((e.code === 'KeyW' && sim.input.forward > 0) || (e.code === 'KeyS' && sim.input.forward < 0)) sim.input.forward = 0
      if ((e.code === 'KeyA' && sim.input.turn < 0) || (e.code === 'KeyD' && sim.input.turn > 0)) sim.input.turn = 0
    }
    const blur = () => (s().input = { forward: 0, turn: 0 })
    // Capture: Esc closes a window before the game menu hears it.
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [active])

  const settings = layout.settings
  const scheme = settings.actions.prompts
  const boss = sim.boss ?? (editing ? bossAt(42) : null)
  const target = sim.target ?? (editing ? (sim.enemies[0] ?? null) : null)
  const members = groupAt(kit.role, character.level, sim.t, situation === 'boss' || target !== null)
  const objectives = objectivesFor(character.zone, situation, sim.boss)
  const forward = { x: Math.sin(sim.heading), y: Math.cos(sim.heading) }
  const rightOf = { x: Math.cos(sim.heading), y: -Math.sin(sim.heading) }
  const groupAtMap = members.map((m) => ({
    x: sim.at.x + rightOf.x * m.offset.x + forward.x * m.offset.y,
    y: sim.at.y + rightOf.y * m.offset.x + forward.y * m.offset.y,
  }))

  const pick = (action: MicroAction) => {
    if (action === 'menu') onMenu()
    else if (action === 'map') sim.say('The world map comes later')
    else toggle(action)
  }

  const content: Record<HudId, () => ReactNode> = {
    player: () => <PlayerBars kit={kit} sim={sim} settings={settings.player} />,
    actions: () => (
      <ActionBar
        kit={kit}
        sim={sim}
        settings={settings.actions}
        vertical={layout.rects.actions.h > layout.rects.actions.w}
        onUse={(i) => !editing && sim.use(i)}
      />
    ),
    target: () => <TargetFrame target={target} effects={target ? (sim.debuffs.get(target.id) ?? []) : []} now={sim.t} settings={settings.target} />,
    boss: () => boss && <BossFrame boss={boss} settings={settings.boss} />,
    encounter: () => boss && <EncounterBar boss={boss} settings={settings.encounter} />,
    party: () => (
      <PartyFrames
        members={members}
        you={{
          name: character.name,
          role: kit.role,
          health: sim.health,
          maxHealth: sim.maxHealth,
          resourceFill: kit.resource.max > 0 ? sim.resource / kit.resource.max : 0,
          resource: kit.resource.unity ?? '',
        }}
        settings={settings.party}
      />
    ),
    prompt: () => <InteractPrompt text="Open the chest" scheme={scheme} settings={settings.prompt} />,
    character: () => (
      <CharacterScreen
        name={character.name}
        level={character.level}
        appearance={character.appearance}
        kit={kit}
        gear={gear}
        bag={bag}
        scheme={scheme}
        settings={settings.character}
        onGear={setGear}
        onClose={() => toggle('character')}
      />
    ),
    minimap: () => (
      <Minimap
        zone={objectives.zone}
        at={sim.at}
        heading={sim.heading}
        time={sim.clock}
        settings={settings.minimap}
        party={groupAtMap}
        enemies={sim.enemies}
        objectives={[...objectiveMarkers(objectives), ...(situation === 'explore' ? [CHEST] : [])]}
        onZoom={
          editing
            ? undefined
            : (steps) =>
                setLayout((l) => ({
                  ...l,
                  settings: withSetting(l.settings, 'minimap', 'radius', stepRange(SETTINGS.minimap.radius, l.settings.minimap.radius, steps)),
                }))
        }
      />
    ),
    objectives: () => <Objectives objectives={objectives} t={sim.t} settings={settings.objectives} />,
    micro: () => (
      <MicroMenu
        open={open as ReadonlySet<MicroAction>}
        vertical={layout.rects.micro.h > layout.rects.micro.w}
        scheme={scheme}
        settings={settings.micro}
        onPick={pick}
      />
    ),
    bags: () => <Bags items={bag} settings={settings.bags} onClose={() => toggle('bags')} />,
  }

  // In play, an element shows when there's something in it; in the edit mode, every element that's on.
  const visible = (id: HudId) => {
    if (!isShown(layout, id)) return false
    const part = PARTS.find((p) => p.id === id)!
    // A window shows when open, or in the edit mode while it's the one selected.
    if (isWindow(id)) return editing ? selected === id : open.has(id as WindowId)
    if (editing) return true
    // The boss frame stands in for the target frame while the boss is your target.
    if (part.when === 'target') return target !== null && !target.boss
    if (part.when === 'encounter') return boss !== null
    if (part.when === 'interact') return near
    return true
  }

  return (
    <div className="hud" style={{ '--b': `${block}px`, '--px': `${block / 60}px` } as CSSProperties}>
      <WorldView
        sim={sim}
        zone={objectives.zone}
        situation={situation}
        appearance={character.appearance}
        artifact={kit.artifact}
        settings={settings.world}
        onClick={editing ? undefined : (button) => sim.use(button === 0 ? 0 : 1)}
      />
      <div ref={grid} className={editing ? 'hud__grid hud__grid--editing' : 'hud__grid'}>
        {PARTS.filter((p) => visible(p.id)).map((p) => (
          <div key={p.id} className={`hud-part hud-part--${p.id}`} style={rectStyle(layout.rects[p.id])}>
            {content[p.id]()}
          </div>
        ))}
        {editing && (
          <HudEditor
            layout={layout}
            before={before}
            blockPx={block}
            selected={selected}
            onSelect={setSelected}
            onLayout={setLayout}
            onDone={onEditDone}
          />
        )}
      </div>
    </div>
  )
}
