# LegendSmith Talent Builder

A WoW Classic–style talent builder for testing LegendSmith's skill trees. You hold an artifact (a
healer's staff, a summoner's book or twin daggers), fill eight slots, and each slotted ability brings its
own talent tree. Trinkets set your stats, every ability shows its live numbers, and a **Test arena** lets
you play the build against dummies or a boss.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. The page remembers your build and gear in this browser.

## Publish it on GitHub Pages

`.github/workflows/talent-builder-pages.yml` tests and builds the builder, then deploys it to GitHub
Pages whenever `main` changes it or its art. The site is at `https://<user>.github.io/<repo>/`.

Once, in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. To deploy without
a push, run the workflow from the **Actions** tab. On a free GitHub plan, Pages only works for public
repositories.

## Slots

| Slot | Holds | Keyboard |
| --- | --- | --- |
| 1 | The artifact, with its own tree (its main attack) | Left click |
| 2–4 | Role abilities: heals for the staff, damage for the book or the daggers | Right click, Q, E |
| 5 | An ultimate (big cooldown). Fervor fits every role | F |
| 6 | A mobility ability, shared by every role | Shift |
| 7 | A group buff for your role: passive, for you and your group | — |
| 8 | Outdoor talents, always there. Empty for now | — |

Click **Change** on slot 1 to switch artifacts; abilities that don't fit the new role come out and
refund their points. Click an empty slot (or **Change**) to pick an ability. Picking one that's
already in another slot swaps the two and keeps both builds.

## Rules

- **60 talent points** (one per level) to spend anywhere, but **no more than 12 in any one tree**, as in
  the overview (`POINT_RULES` in `src/trees/index.ts`).
- Inside a tree, a row unlocks once **2 points** (`pointsPerRow`) have been spent in the rows above it,
  in any mix: row 2 needs 2, row 3 needs 4, row 4 needs 6.
- A talent at the end of an arrow needs the talent the arrow comes from at **max rank**.
- Click to learn, right-click (or Shift-click) to unlearn. A point can't come back out while
  something below still depends on it.

## The healer kit

The **Lifewarden Staff** uses mana: 1,000 to start, 8 back per second, and its main attack, Radiant
Bolt, restores 16 per hit. Heals cost 80–200, so you weave attacks between heals.

Abilities never hard-code mana: they cost the artifact's **resource**, and shared talent text says
`@resource`, which shows as the held artifact's resource. Another healing weapon with its own resource
can use the same heals and trees. Shared talents give resource back as a **share of your maximum**
(Rainmaker: 0.3% per tick) or of what the cast cost, never as a flat amount of mana, so they mean the
same on any weapon. Only an artifact's own tree may talk in its own units (mana, imps, combo points).

| Slot | Choices |
| --- | --- |
| Heals (pick 3) | Mend (direct heal), Chain Heal (jumps, 6 sec cooldown), Healing Rain (zone, never two on one ally), Renew (HoT), Bloom (pays per ally to heal everyone your HoTs and zones touch), Conduit (passive: your main attack heals) |
| Ultimate | Miracle (instant heal on everyone), Sanctuary (big zone for 12 sec), Lifetide (strong HoT that decays) |
| Mobility | Dash (2 charges), Teleport, Sprint |

Talents aim at **families and tags**, never at another ability: a talent may name its own ability
("Healing Rain's crits…") or a family ("your heal-over-time effects…"), and a data test fails if one
names another ability or leans on one weapon (minions, flat resource). Every tree's "heals more" talent lifts a
whole family: Mend's and Miracle's lift direct heals, Chain Heal's chain heals, Healing Rain's and
Sanctuary's zones, Renew's and Lifetide's HoTs. Each ultimate also has a talent that cuts its cooldown
when you crit with its family. A talent's tooltip lists what it
reaches ("Affects: Renew, Lifetide"). The families are direct heal, HoT, zone, shield, direct damage,
DoT, minion, resource, movement, buff and aura, plus `healing` on every heal, `damage` on every hit,
`aoe` on area damage, slot kinds (`heal`, `cooldown`…) and the ability's own id.

## The damage weapons

The **Tome of Summoning** has imps for a resource, up to 15. Its main attack, Summon Imp, adds one, every
imp attacks your target on its own, and its spells are paid for by **sacrificing imps**. Minion power
(from the Tome's own tree) raises all your damage for each imp you command.

| Slot | Choices |
| --- | --- |
| Damage (pick 3) | Plague (free; rotates the Pox, Blight and Malady DoTs), Harvest (no cooldown, only its cost; hits every enemy once per DoT on it), Festering Rot (one DoT that stacks without end, each stack on its own 30 sec timer), Miasma (a zone that makes everyone inside sick), Necrotic Explosion (area burst), Ashfall (a damaging zone) |
| Ultimate | Fervor (you and your group gain 30% haste for 20 sec) |

The **Twin Daggers** build combo points (up to 6) with Quick Strike: hold the key to keep striking.
Fan of Knives and Backstab build them too. **Combo points pay in steps**: an ability that costs 2
spends 4 or 6 if you have them, and every step makes it stronger (two steps hit twice as hard; Rupture
lasts longer instead). The action bar shows how many steps the next press takes (×3). The daggers'
own tree is about that: more combo points to hold (Bandolier), more from each step (Compounding), and
procs on spending 2 or 3 steps at once (Adrenaline, Sleight of Hand, Restless Hands, Encore).

**Spells fit every weapon of their role.** Plague, Harvest, Raise Ghoul or Doom Bolt can be cast with
the book, the daggers or the bow, and cost whatever the weapon holds (Doom Bolt: 3 imps, 30 focus, or
steps of 3 combo points). The only exceptions are **weapon strikes and shots**, whose animation needs a
certain weapon: an ability can set `needs` (a blade, daggers, a large weapon, a bow) and an artifact
lists what it is in `traits`. Backstab, Eviscerate and Rupture need a blade, Fan of Knives daggers, the
bow's shots a bow, and a future cleave would need a large weapon. The picker shows the ones your weapon
can't make at the bottom, dimmed, with what they need. Talents aim only at their own ability or at
families: damage over time, direct damage, area damage, zones, finishers.

An ability can also be **made for** a weapon (`madeFor`: Harvest for the book). That's a label: the
picker shows it and lists the ones made for your weapon first. The Plague tree keeps its art and
layout from the deck, with its X values filled in.

**Doom Bolt** is the big single-target spell, and it **spends all your resource**: its cost (3) is the
minimum, and it grows with everything past it. Spending twice the cost is twice the damage, so 2,000
becomes 10,000 with 15 imps, 6,667 with 100 focus or 4,000 with 6 combo points. Any ability can do
this with `spendsAll`, and the action bar shows how big the next one would be (×4.7). Its tree plays
with that:

- **Hunger** makes what it spends past its cost count for more (`surplus`, +20/40/60%).
- **Devour** ends your DoTs on its target and lands what they had left at once, plus 10/30/50%.
- **Gathering Dark**: each time you gain resource, a chance to take 1 sec off its cooldown. A new
  `gain` event fires on every gain, and once per 10% of your maximum you regenerate.
- **Cataclysm** blasts around the target when it spends 3 times its cost or more.
- **Residual Power** gives back part of what it spent; **Dread**, **Final Word** and **Inevitable** tie
  it to your DoTs; and it has cast time, cooldown, crit and echo talents.

**Raise Ghoul** is playable now (it was display-only): a 1.5 sec cast that raises a ghoul for 20 sec,
hitting your target for 90 every 1.5 sec, up to 3 at once (another replaces the oldest). Ghouls are
**summons**, a new effect type: minions of their own that fight in melee around your target and then
fall, unlike the book's imps, which are its resource. They count for Minion power. Its tree: more
minion damage and attack speed, longer-lasting ghouls, more at once (Horde), Grave Rot on their hits,
pools of decay, a Ghoul Lord every 4th cast, and Corpse Explosion when one falls.

The **Ashwood Longbow** shoots from 40 yd. Focus starts empty, up to 100, and only shooting fills it:
each Swift Arrow gives 10 (hold the key to keep shooting). Focus counts in **tens**: an artifact can set
a `unit`, and every ability's cost and gain is multiplied by it, so Harvest's cost of 2 is 20 focus
and Backstab's 2 is 20 focus back, while the same abilities cost 2 imps on the book. For that to hold,
shared trees may only change costs and gains by a %, never a flat amount (the data test checks). The
bow's own tree adds plain focus: more per arrow, more to hold, focus on crits, and procs when you spend.

| Made for the bow | |
| --- | --- |
| Aimed Shot | 2 sec cast, heavy single-target shot (30 focus) |
| Multi-Shot | hits the target and every enemy within 8 yd (20 focus) |
| Poison Arrow | a 15 sec damage over time (10 focus) |
| Rain of Arrows | a dense 6 sec damaging zone, 20 sec cooldown (30 focus) |

## Group buffs

Every character slots one group buff for their role. It's passive: you and your group get its stats,
and its tree adds more. Healers pick more maximum health or more healing received. Damage dealers pick
Haste, Critical or Power. Tanks get Damage reduction, Dodge or Speed, ready for when there's a tank
weapon.

## Gear and stats

Twelve trinket slots, as in the overview: item level sets Power (a %) and Health, rarity sets the two
stats (common 1% … epic 4%), Echo and Minion power take one of the two, and the name comes from the
pair, so you can't wear two "of Peerlessness" at once. Click a slot to make a test trinket, or pick a
**Gear set** preset. Hover a stat for where it comes from.

- **Power** raises every heal, shield and damage number.
- **Haste** speeds casts, the global cooldown and ticks. It never shortens a duration, so HoTs and zones fit in more ticks.
- **Critical** and **Crit damage** set crit chance and size (crits land for 150% plus Crit damage).
- **Potency** lengthens HoTs, zones, shields and buffs: duration × (1 + Potency).
- **Echo** is a chance to cast an ability again for free. Movement never echoes.
- **Dodge** is a chance to avoid a hit completely. Like Damage reduction it never comes from items; Dash
  talents give it.

The stat sheet shows Power and Health together at the top with the resource, then **Secondary**
(Haste, Critical, Crit damage, Potency), **Defensive** (Damage reduction, Dodge) and **Extra** (Echo,
Minion power, Speed and anything only talents give).

Because no two worn trinkets can share a name, each stat pair can be worn once, so no stat sits on more
than 5 of the 12 trinkets. The common "Critical and Haste" and "Potency and Haste" sets differ by 1%.

**Ability numbers**, under the trees, shows every number on every slotted ability. Numbers flash green
when they improve and red when they drop, with the base (nothing equipped or learned) in grey.

## Test arena

Pick a fight (Practice, Target dummies, a 4-player dungeon boss or an 8-player raid boss), then click the
arena or press an ability key. Healers start on Practice and damage dealers on Target dummies. The boss
fights send waves of adds; when you're a damage dealer, a bot heals the group. Move with W A S D. Heals go to the lowest-health ally in range, zones land on that
ally, and Dash and Teleport go the way you're moving (or toward the crosshair). Hold a key to keep
casting it. Step out of the red pools.

The meter shows healing per ability, overheal and crits, plus where your mana went and came from. The
boss damage slider and "Nobody dies" make it easier or harder. Leaving the arena pauses the fight; change
gear or talents and come back to carry on with the new numbers.

## Editing trees

Everything lives in `src/trees/`:

- `index.ts`: the point rules, the artifacts, the list of trees and the starting loadout.
- `healer/`: the Lifewarden Staff and its heals and ultimates. `mobility.ts`: Dash, Teleport, Sprint.
- `plague.ts`: the Plague tree from `Plague - Skill Tree.pptx`, using the art in `../Art/Plague/`.
- `playtest.ts`: made-up necromancer abilities so every damage slot has options.

**Add a display-only tree:** copy `plague.ts`, set its `kind` (`damage`, `heal`, `cooldown` or
`mobility`) and, for role and cooldown abilities, its `role`, and add it to `TREES`. Point `artFolder` at
a folder in `../Art` and name icons by file name without `.png`. Leave `artFolder` out to use placeholders.

**Per-rank values** go in braces, one per rank: `"by {0.5/1/1.5} sec"` shows 0.5 at rank 1, 1 at rank 2,
and so on. The tooltip shows the current and next rank, like WoW.

**Make a tree playable:** give it a `spec` (cost, cast time, cooldown, charges and a list of effects)
and write its talents with `talent()` from `authoring.ts`, which keeps the text and the numbers in step:

```ts
talent({
  id: 'verdant',
  name: 'Verdant',
  row: 0,
  col: 0,
  per: [6, 12, 18],
  text: 'Your heal-over-time effects heal {}% more.',
  does: (v) => [more('amount', 'hot', v)],
})
```

What a talent can do (`src/game/types.ts`): change a number on whatever it matches (`more`, `plus`,
optionally only when the target is low, has your HoT or stands in your zone), change a character stat
(`stat`), add an effect to an ability (`grant`), or react to an event (`proc`: on cast, heal, crit, hit,
zone tick or expiry) with an action such as restoring mana, applying an effect, extending HoTs,
cutting cooldowns or giving a buff. The arena runs on the same numbers as the tooltips, so a new tree
works there without code changes.

If tree data has a mistake (an unknown `requires`, two talents in one cell, missing art, the wrong number
of rank values, a playable talent with no effects, a tree in the wrong kind of slot), the page lists it at
the top. `npm test` checks the same things, plus the talent rules, gear, the live numbers and the arena.
