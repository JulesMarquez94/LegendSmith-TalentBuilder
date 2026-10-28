# LegendSmith Talent Builder

A WoW Classic–style talent builder for testing LegendSmith's skill trees. You hold an artifact (one of
eight weapons: two tanks, two healers, two melee and two ranged damage dealers), fill eight slots, and
each slotted ability brings its own talent tree. Trinkets set your stats, every ability shows its live numbers, and a **Test arena** lets
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
| 2–4 | Role abilities: heals for a healer, damage for a damage dealer, tank abilities for a tank | Right click, Q, E |
| 5 | An ultimate (big cooldown). Fervor fits every role | F |
| 6 | A mobility ability, shared by every role | Shift |
| 7 | A group buff for your role: passive, for you and your group | — |
| 8 | Outdoor talents, always there. Empty for now | — |

Click **Change** on slot 1 to switch artifacts; the picker lists them by seat (Tank, Healer, Melee
damage, Ranged damage). Abilities that don't fit the new role come out and refund their points. Click an empty slot (or **Change**) to pick an ability. Picking one that's
already in another slot swaps the two and keeps both builds.

## The artifacts

Two for every seat in a group. Each artifact's `reach` (melee or ranged) and role set its seat, and the
picker groups them by it.

| Seat | Artifact | Resource | Main attack | File |
| --- | --- | --- | --- | --- |
| Tank | **Sword & Shield** (first version) | Rage | Shield Bash | `src/trees/tank/shield.ts` |
| Tank | **Greatsword** (first version) | Momentum | Wide Swing | `src/trees/tank/greatsword.ts` |
| Healer | Lifewarden Staff | Mana | Radiant Bolt | `src/trees/healer/staff.ts` |
| Healer | **Tome of Dawn** (first version) | Light | Dawn Bolt | `src/trees/healer/dawn.ts` |
| Melee damage | Twin Daggers | Combo points | Quick Strike | `src/trees/daggers.ts` |
| Melee damage | **Spear** (first version) | Vigor | Thrust and Sweep | `src/trees/spear.ts` |
| Ranged damage | Tome of Summoning | Imps | Summon Imp | `src/trees/necro/tome.ts` |
| Ranged damage | Ashwood Longbow | Focus | Swift Arrow | `src/trees/bow.ts` |

The four **first versions** were improvised so every seat has two weapons, and are meant to be replaced
by their real designs. Each sets `firstVersion: true`, opens with a `FIRST VERSION` comment and says so
in its description, and the picker tags it. They use the tinted placeholder icons. Each is described
below with its role.

## Rules

- **60 talent points** (one per level) to spend anywhere, but **no more than 12 in any one tree**, as in
  the overview (`POINT_RULES` in `src/trees/index.ts`).
- A tree's talents hold **18 ranks at most** in all (`TREE_RANKS`), so with 12 to spend you always leave
  a third of it: 6, 12, 18. The data test fails on a tree with more. Talents that reach other abilities
  (a whole family) or feed them (synergy) are favoured; tweaks to one ability's own numbers went first.
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

The **Tome of Dawn** (first version) is the shield healer: where the staff heals after the damage, it
wards allies before the hit lands. Its main attack, **Dawn Bolt**, hits for 220 and puts a 350 barrier
(an absorb shield, blue like every shield) on the lowest-health ally for 8 sec; another bolt on the same
ally adds to it. **Light** is its resource: 600, starting full and refilling 15 a second on its own, so
you attack to ward, not to refill. The shared heals cost light unchanged (Mend: 100). Its tree makes
shields bigger and longer, wards more allies per bolt, shields allies when direct heals crit
(Afterglow) and casts direct heals faster. Shields are capped at half the ally's health, and what they
soak counts as healing on the meter.

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

The **Spear** (first version) is melee with reach. Its main attack, **Thrust and Sweep**, alternates (like
Plague) a thrust that hits one enemy for 320 from 8 yd and a sweep that hits it and every enemy within
6 yd of it for 160. **Vigor** starts full at 100, refills 10 a second and counts in tens like focus, so
Harvest costs 20 vigor. It's a large weapon (`traits: ['large']`), so it casts every spell but no
blade or dagger strikes. Its tree: reach, vigor, thrust crits and a bleed (Impale), a wider sweep that
gives vigor per enemy, and Rhythm (a sweep makes the next thrust hit harder).

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
- It **absorbs** everything else you have going, each worth 1/2% more damage per second it had left:
  **Devour** your DoTs on its target, **Soul Feast** your summoned minions (ghouls fall, and set off
  Corpse Explosion), **Collapse** your zones, **Drink Deep** your HoTs. A ghoul with 15 sec left adds 30%.
- **Gathering Dark**: each time you gain resource, a chance to take 1 sec off its cooldown. A new
  `gain` event fires on every gain, and once per 10% of your maximum you regenerate.
- **Cataclysm** blasts around the target when it spends 3 times its cost or more.
- **Residual Power** gives back part of what it spent, and **Final Word** adds damage per DoT on the
  target (it counts them before Devour eats them).

**Volley** (made for the bow, any damage weapon can cast it): for 10 sec, every ranged hit on a single
enemy (Swift Arrow, Aimed Shot, Doom Bolt) also hits every enemy within 8 yd of it for 30% of the
damage. Melee strikes and area damage don't splash. Its extra hits are tagged `splash` and `aoe`, so its
talents (resource and cooldown per extra hit) and area-damage talents reach them.

**Frenzy**: +15% haste for 8 sec, with no cooldown: you keep it up by paying for
it again. Feeding Frenzy makes every ability you spend on extend it; other talents add crit, regen,
stacking haste and haste for the group. Like every ability it grows in steps on the daggers (4 combo
points: 30% haste).

**Carrion Curse** (made for the book): curses the target with 8 stacks for 20 sec; each hit from one of
your minions (imps, ghouls) takes a stack and deals 90 more damage. Its talents add stacks and damage,
burst when it ends, give back resource or extend your DoTs per stack, and speed your minions up.

**Festering Wound** (any damage weapon): hits for 350 and adds a stack of **Wound Rot**, 35 damage per
stack every second for 6 sec. It's a **stacking DoT** (`maxStacks`): each cast adds a stack, up to 10,
and refreshes them all, so casting it again within 6 sec holds it at full (350 a second). Unlike Festering
Rot's rolling stacks, they all run out together. Its talents raise the cap, add 2 stacks a cast, make
the hit stronger per stack (Twist the Knife), add stacks from any direct damage (Infected), burst the
stacks when they run out, spread one to a neighbour, and make all your DoTs stronger per stack.

**Raise Ghoul** is playable now (it was display-only): a 1.5 sec cast that raises a ghoul for 20 sec,
hitting your target for 90 every 1.5 sec, up to 3 at once (another replaces the oldest). Ghouls are
**summons**, a new effect type: minions of their own that fight in melee around your target and then
fall, unlike the book's imps, which are its resource. They count for Minion power. Its tree: more
minion damage and attack speed, longer-lasting ghouls, more at once (Horde), Grave Rot on their hits,
pools of decay, a Ghoul Lord every 4th cast, and Corpse Explosion when one falls.

The **Ashwood Longbow** shoots from 40 yd. Focus starts empty, up to 100, and only shooting fills it:
**Swift Arrow** is a 1.5 sec cast that hits for 330 and gives 10 focus (hold the key to keep shooting).
Focus counts in **tens**: an artifact can set a `unit`, and every ability's cost and gain is multiplied
by it, so Harvest's cost of 2 is 20 focus and Backstab's 2 is 20 focus back, while the same abilities
cost 2 imps on the book. For that to hold, shared trees may only change costs and gains by a %, never a
flat amount (the data test checks).

The bow's own tree:

| Row | Talent | Ranks | What it does |
| --- | --- | --- | --- |
| 1 | Sharp Eye | 2 | +3/6% critical chance |
| 1 | Fletching | 2 | Swift Arrow gives 2/4 more focus |
| 1 | Deep Quiver | 2 | 20/40 more focus to hold |
| 2 | Piercing Shot (needs Sharp Eye) | 2 | Every critical hit you deal, from any damage, gives 1/2 focus |
| 2 | Steady Aim | 2 | Swift Arrow casts 0.25/0.5 sec slower, and deals and gives 16.67/33.33% more (in proportion to its 1.5 sec) |
| 2 | Double Nock | 2 | +5/10% echo |
| 3 | Rapid Fire (needs Steady Aim) | 2 | After Swift Arrow hits, it casts 0.25/0.5 sec faster until you use any other ability |
| 3 | Focused Mind (needs Fletching) | 2 | 5/10 focus every 5 sec |
| 4 | Overdraw (needs Rapid Fire) | 1 | Abilities cost 50% more focus and deal 50% more damage |
| 4 | Barbed Arrows (needs Focused Mind) | 1 | Swift Arrow leaves a 5 sec bleed (25 a sec) that gives the arrow's focus back over those 5 sec |

Barbed Arrows' bleed lasts 5 sec, and Potency and duration talents don't lengthen it (`fixedDuration`).
It never stacks: another arrow on a bleeding target adds 5 sec to the one bleed (`addsDuration`).
Over its time it gives back exactly the focus its arrows gave, Fletching and Steady Aim included, through
the `trickle` action: one tick a second in whole focus, with what doesn't divide carried to the next
tick, so 12 focus comes as 2, 2, 3, 2, 3. A second arrow adds its focus and 5 more ticks to the same
trickle (`extends`), so the bleed pays 2 focus a second for longer, not 4. Rapid
Fire's buff has no timer: a buff can set `lostUnless`, and using an ability that doesn't match it ends
the buff.
Focused Mind uses the `second` event, which fires once a second (a proc with `every: 5` goes off every
5 sec).

| Made for the bow | |
| --- | --- |
| Aimed Shot | 2 sec cast, heavy single-target shot (30 focus) |
| Multi-Shot | hits the target and every enemy within 8 yd (20 focus) |
| Poison Arrow | a 15 sec damage over time (10 focus) |
| Rain of Arrows | a dense 6 sec damaging zone, 20 sec cooldown (30 focus) |

## The tanks

A tank's three role slots hold **tank abilities** (`kind: 'tank'`), first versions too
(`src/trees/tank/abilities.ts`). Fervor fills the ultimate slot, mobility is shared, and the tank
group buffs fill slot 7.

| Tank ability | |
| --- | --- |
| Provoke | Taunts the enemy under your crosshair from 30 yd for 6 sec, off the global cooldown (8 sec cooldown) |
| Stand Firm | 40% less damage taken for 8 sec, off the global cooldown (45 sec cooldown) |
| Tremor | Hits every enemy within 8 yd of you for 260 and taunts them for 4 sec (2 points of resource) |
| Shield Block | Needs a shield (`needs: 'shield'`): a 2,000 shield on you for 6 sec, 2 charges (3 points) |

A **taunt** (`taunt` on a damage effect) makes every enemy it hits swing only at you for that long,
even when the boss would hit another tank. In the arena **you take the first tank's place**: you start
where it stood, the boss and its adds hit you, and in fights with a bot healer the bot heals from your
usual spot. In the raid the boss still swaps between you and the off tank every 20 sec, so Provoke
pulls it back.

The **Sword & Shield** (first version) is the block tank: traits `blade` and `shield`. **Rage** starts
empty, holds 100 and counts in tens. **Shield Bash**, its main attack, hits for 300 and gives 10 rage,
and every hit you take gives 5 more (a new stat, `resourceWhenHit`, "Rage when hit"), even one a shield
soaks. Its tree: damage reduction, more rage from bashes and hits, bigger and longer shields, shields
on crits, and damage reduction when you spend rage.

The **Greatsword** (first version) is the parry tank: traits `blade` and `large`, no shield. **Wide
Swing**, its main attack, hits its target and every enemy within 5 yd of it for 220, so it holds packs,
and gives 10 **momentum** (starts empty, holds 100, counts in tens). It **parries** 15% of melee swings
(the boss's and its adds', not pulses or pools), and every parry gives 10 momentum. **Parry** is a new
stat (`parry`) and a new event (`parry`, its enemy is the one that swung), so its tree can strike back
(Riposte), make the next swing hit harder (Counterstroke) and give parry when you spend.

## Group buffs

Every character slots one group buff for their role. It's passive: you and your group get its stats,
and its tree adds more. Healers pick more maximum health or more healing received. Damage dealers pick
Haste, Critical or Power. Tanks get Damage reduction, Dodge or Speed.

## Gear and stats

Twelve trinket slots, as in the overview: item level sets Power (a %) and Health, rarity sets the two
stats (common 1% … epic 4%), Echo and Minion power take one of the two, and the name comes from the
pair, so you can't wear two "of Peerlessness" at once. Click a slot to make a test trinket, or pick a
**Gear set** preset. Hover a stat for where it comes from.

Each trinket also has a **balance**: even (100% of the rarity's value on both stats) or leaning toward
one stat (150% of it, 50% of the other), so an epic Haste and Critical item is 4% / 4%, 6% / 2% or
2% / 6%. A leaning item's name starts with its stat's word (Quick, Keen, Brutal, Enduring, Echoing,
Lordly): "Quick Ring of Peerlessness". Each balance is **its own item** for the unique rule, so a
Quick, an even and a Keen Peerlessness can all be worn together (stacking Haste 6 + 4 + 2 and Critical
2 + 4 + 6 on epic items); only two of the very same one can't.

The **Gear set** picker has prebuilt sets in two groups:

- **Main stat** (epic, item level 120): one set per stat, Haste, Critical, Crit damage, Potency, Echo
  and Minion power. All 12 items carry the stat: every pair with it leaning toward it (6% each), then
  even (4%), then leaning the other way (2%) to fill the slots. Haste main gives +54% Haste; Echo main
  wears Echo's 4 pairs three times each for +48%.
- **Even split** (100% / 100% on every item): the **Even mix** (epic, item level 120: Haste and Potency
  20%, Critical and Crit damage 16%, Echo and Minion power 12%), plus the older even sets.

Every gear stat has an **icon** (Haste a lightning bolt, Critical a crosshair, Crit damage a burst,
Potency an hourglass, Echo ripples, Minion power a skull). An equipped slot shows its two stats' icons,
the leaned stat's bigger, and the icons also mark the item cards, the forge and the stat sheet.

- **Power** raises every heal, shield and damage number.
- **Haste** speeds casts, the global cooldown and ticks. It never shortens a duration, so HoTs and zones fit in more ticks.
- **Critical** and **Crit damage** set crit chance and size (crits land for 150% plus Crit damage).
- **Potency** lengthens HoTs, zones, shields and buffs: duration × (1 + Potency).
- **Echo** is a chance to cast an ability again for free. Movement never echoes.
- **Dodge** is a chance to avoid a hit completely. Like Damage reduction it never comes from items; Dash
  talents give it.
- **Parry** is a chance to turn aside an enemy's melee swing. It never comes from items: the Greatsword
  and its talents give it.

The stat sheet shows Power and Health together at the top with the resource, then **Secondary**
(Haste, Critical, Crit damage, Potency), **Defensive** (Damage reduction, Dodge, and Parry once
something gives it) and **Extra** (Echo, Minion power, Speed and anything only talents or a weapon
give, like Rage when hit).

Because no two worn trinkets can share a name, each balance of a stat pair can be worn once. An even
set holds each pair once, so no stat sits on more than 5 of its 12 trinkets, and the common "Critical
and Haste" and "Potency and Haste" sets differ by 1%. Mixing balances lets one stat sit on all 12.

**Ability numbers**, under the trees, shows every number on every slotted ability. Numbers flash green
when they improve and red when they drop, with the base (nothing equipped or learned) in grey.

## Test arena

Pick a fight (Practice, Target dummies, a 4-player dungeon boss or an 8-player raid boss), then click the
arena or press an ability key. Healers start on Practice, damage dealers and tanks on Target dummies.
The boss fights send waves of adds; when you're a damage dealer or a tank, a bot heals the group, and a
tank takes the bot tank's place. Move with W A S D. Heals go to the lowest-health ally in range, zones land on that
ally, and Dash and Teleport go the way you're moving (or toward the crosshair). Hold a key to keep
casting it. Step out of the red pools.

The meter shows healing per ability, overheal and crits, plus where your mana went and came from. The
boss damage slider and "Nobody dies" make it easier or harder. Leaving the arena pauses the fight; change
gear or talents and come back to carry on with the new numbers.

## Editing trees

Everything lives in `src/trees/`:

- `index.ts`: the point rules, the artifacts, the list of trees and the starting loadout.
- `healer/`: the Lifewarden Staff, the Tome of Dawn and the heals and ultimates. `mobility.ts`: Dash,
  Teleport, Sprint.
- `tank/`: the Sword & Shield, the Greatsword and the tank abilities. `spear.ts`: the Spear.
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
