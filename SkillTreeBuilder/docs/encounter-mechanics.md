# Encounter mechanics: the visual code and the ability catalog

An overview of what bosses and enemies do to players, written before we add an **Encounters** section
to the site. It has two parts:

1. **The visual code**: how every enemy ability looks, so a player who learns it in one fight reads it
   in every other one.
2. **The catalog**: the classic MMO mechanics we can use, sorted by the role that has to deal with them.

Numbers marked *(start value)* are proposals to playtest, not decisions.

## The rule

**The flavor changes, the code never does.** A fire boss, a shadow boss and a frost boss can all drop
a circle that explodes. Its texture, particles, sound and name change with the boss. Its color, shape and
timing fill don't. If two abilities ask for the same answer, they look the same. If they ask for
different answers, they must look different.

Three more rules come with it:

- **What you see is what hits.** The damage lands on exactly the drawn shape, no wider and no later
  than the fill shows.
- **A color means the same thing everywhere**: on the floor, on a mark over a player, on a boss cast
  bar and on a debuff's border.
- **Color is never the only cue.** Orange and red are hard to tell apart with the most common kinds of
  color blindness, so each severity also has its own outline and glyph (below).

## The visual code

The code has five layers. Each one answers one question for the player.

| Layer | Question | Carried by |
| --- | --- | --- |
| Severity | How bad is it? | Color |
| Action | What do I do? | Shape |
| Timing | When does it go off? | The fill |
| Role | Is it my job? | Role icon on the cast bar |
| Flavor | Which boss is this? | Texture, particles, sound, name |

### 1. Severity: the color

| Color | Means | Rule of thumb *(start value)* | Outline and glyph |
| --- | --- | --- | --- |
| **Orange** | Dangerous: it hurts | One hit, or one second in it, costs up to about 25% of a damage dealer's maximum health. Step out on time and it costs little; stand in it and it costs the healer | Single outline, no glyph |
| **Red** | Lethal | Kills a player from full health (100% or more of their maximum health), or within about 2 sec if it lingers. Only the named answer saves you: being out of it, or the right cooldown | Double outline and a skull glyph in the middle |
| **White** *(proposal)* | Go here | A zone or mark you must step **into**: a soak, a stack, a safe spot | Inward chevrons, or pips for how many players it needs |

Why white for "go here": the arena already gives green to your heals, blue to shields, gold to you and
purple to adds. "Go here" needs a color nobody else uses, and it must never look like a danger.

Colors already taken by the player's side, which enemy abilities must not use:

| Color | Already means |
| --- | --- |
| Green `#8fe3a0` | Your heals and healing zones |
| Blue `#00afd7` | Shields, on anyone, enemies included (a boss's absorb shield is blue too) |
| Gold `#e7b725` | You |
| Purple `#c27be0` | Adds |

Proposed tokens *(start values)*: orange `#ff9a2e`, red `#ff2d2d`, white `#f4f1e8`.

### 2. Action: the shape

The shape tells you what to do. It's the same for every severity.

| Shape | What to do |
| --- | --- |
| Circle on the ground | Get out of it (or into it, if it's white) |
| Ring with a hole (donut) | Get into the hole, close to the enemy |
| Cone from an enemy | Get out of its front (or its back, for a tail swipe) |
| Lane (a long rectangle) | Step sideways out of the lane |
| Whole floor filling, except a white zone | Get into the white zone, or behind cover |
| Ring around a player, chevrons pointing **out** | Spread: that player takes it alone, away from everyone |
| Ring around a player, chevrons pointing **in** | Stack: everyone gathers on that player to share it |
| Line between two characters | Tether: move apart to break it, or stay close, as its color says |
| Arrows on the floor | Knockback or pull, in the arrows' direction |
| Icon over a player's head | That player is targeted: a spike, a bait, a debuff |

### 3. Timing: the fill

Every telegraph starts as an **empty outline, dashed**. A fill grows from its origin to its edge
(from the middle for a circle, from the enemy for a cone or a lane). **When the fill touches the edge,
it goes off.** So the fill always reads as "time left", whatever the ability.

After it goes off:

- A **burst** flashes once and is gone.
- A **lingering zone** stays as a solid fill in its color with a **solid outline**, and no fill animation.
  A dashed outline is never live; a solid one always is.

Minimum warning, from the outline appearing to the fill touching the edge *(start values)*:

| Severity | Warning |
| --- | --- |
| Orange | 1.5 sec |
| Red | 2.5 sec |
| White (soak, stack, safe spot) | 4 sec: players have to walk there |

### 4. Role: the cast bar

Damage you can't dodge has no ground marker. It shows on the **boss's cast bar** instead, and the cast
bar carries:

- the ability's name;
- the **role icon** of who answers it: tank (shield), healer (cross), damage (sword) or everyone
  (group);
- its severity color as the bar's fill;
- a frame that says whether it can be interrupted (once interrupts exist).

Every enemy ability has exactly **one role tag**. The site's catalog filters by it, and a good encounter
gives each role at least one ability that's theirs.

### 5. Flavor: what may change

| Free to change | Never changes |
| --- | --- |
| Texture inside the zone (embers, smoke, frost cracks, bubbling plague) | Severity color |
| Particles and sound | Shape |
| Name | Fill timing and outline style |
| The boss's animation and voice line | Role icon |

The same **red telegraphed circle**, three ways:

| Boss theme | Name | Look |
| --- | --- | --- |
| Fire | Meteor | Embers and a falling rock shadow growing in the fill |
| Shadow (The Hollow King) | Grave Burst | Black smoke curling inward |
| Frost | Avalanche | Ice cracks spreading from the middle |

All three: red, double outline, skull, the fill grows from the middle, 2.5 sec warning, kills from full.

## The catalog

Each table lists one role's mechanics. **Looks like** uses the code above, **Answer** is what the role
does, **Fail** is what happens when nobody does. Example names are flavors; the mechanic is the row.

### Everyone: movement and positioning

| Mechanic | Looks like | Answer | Fail |
| --- | --- | --- | --- |
| **Telegraphed burst** (e.g. Meteor, Grave Burst) | Circle, orange or red, fill from the middle | Leave before the fill reaches the edge | Damage, or death if red |
| **Lingering pool** (e.g. Blight Pool, Burning Ground) | Solid orange circle, solid outline | Don't stand in it; don't heal or fight from it | Damage every second |
| **Frontal cone** (e.g. Breath, Cleave) | Cone from the boss toward the tank, red | Everyone but the tank stays out of the front | Death for anyone in front |
| **Tail swipe** | Cone from the boss's back, orange | Stay out from behind the boss | Damage and a knockback |
| **Out** (point-blank burst) | Circle centered on the boss, red | Run out of melee range | Death for anyone close |
| **In** (donut) | Ring around the boss with a safe hole | Run in close | Damage for anyone far |
| **Charge** | Lane from the boss to a player, red | Step sideways out of the lane | Death for anyone in the lane |
| **Safe spot** (e.g. Ashfall over the whole room) | Whole floor filling red, one white zone (or cover to hide behind) | Get into the white zone, or out of the boss's line of sight | Death |
| **Knockback or pull** | Arrows on the floor | Stand so it doesn't throw you into a zone or off a ledge | Whatever you land in |
| **Chaser** | Orange ring on a marked player; an orange zone follows them | The marked player leads it away from the group | Damage to everyone it reaches |
| **Moving hazards** (orbs, waves) | Faint lanes showing their path, orange or red | Read the path and stand between them | Damage or death |
| **Spread** | Orange ring with outward chevrons around marked players | Marked players move apart; nobody stands in another's ring | Anyone inside a ring takes that hit too |
| **Stack** (shared hit) | White ring with inward chevrons on one player | Everyone gathers inside; the damage is split among them | Too few inside: each takes more (lethal alone) |
| **Soak** (towers) | White circle with pips for the players it needs | Enough players stand in it until it fills; soakers get a debuff that bars the next soak, so they rotate | Not enough soakers: a red burst on everyone |
| **Bait** (drop) | Icon over a marked player, with a timer | Walk to the edge of the room before it ends; it leaves a pool where you stand | A pool in the middle of the group |
| **Tether** | Line between two players, or a player and an add | Orange: move apart to break it. Red: stay close, or it snaps for lethal damage | Damage while it holds, or death when it snaps |
| **Gaze** | Eye icon over the boss on its cast bar | Face away from the boss when the cast ends | A stun or fear |

### Healer

| Mechanic | Looks like | Answer | Fail |
| --- | --- | --- | --- |
| **Damage Volley**: unavoidable bolts that hit every player hard | Cast bar with the healer icon, orange; no ground marker | Top everyone up before it lands, shield ahead of it (Tome of Dawn), big heals or an ultimate (Miracle) after | Anyone who was low dies |
| **Fire Aura**: steady low fire damage on everyone, for the whole fight or a phase | A debuff on every player and a flavored aura around the boss. No zone: nowhere to go | Pace your resource, keep HoTs and zones rolling | The group slowly drains; the healer runs dry |
| **Spike** (e.g. Hex Bolt, Grave Lance) | Orange icon over one or two random non-tanks, and a cast bar | React fast on that ally: a direct heal or a shield | That ally dies |
| **Damage over time** | A ticking debuff on random players, orange border | Heal through it (or cleanse it, once cleanses exist) | Slow damage that piles up |
| **Healing absorb** | A dark bar laid over the target's health ring | Heal it off first: healing fills the bar before health rises | The ally can't be healed up |
| **Ramping damage**: each cast hits harder than the last | A raid debuff whose stacks count up on every cast | Keep up; the healer's output sets the fight's clock | The group falls when healing can't keep pace |
| **Execute** (e.g. Culling) | Cast bar, red, with a health line marked on everyone's health ring | Keep everyone above the line when it lands | Anyone below it dies |
| **Heal the ally** | A friendly NPC at low health, with a timer | Bring them to full before the timer ends | The fight is lost, or the ally turns on you |

### Tank

| Mechanic | Looks like | Answer | Fail |
| --- | --- | --- | --- |
| **Tank buster** | Cast bar with the tank icon, red; red ring on the tank | Time a reduction ability (Stand Firm, Shield Block) to land with it | The tank dies or drops to almost nothing |
| **Wave Break**: an unavoidable blow only the tank's ultimate can block | Cast bar with the tank icon, red, and an "ultimate" mark; on a fixed timer the tank learns | Use the ultimate as it lands | The tank dies |
| **Tank swap**: every hit adds a stack of more damage taken | A stack count on a debuff over the tank, orange, turning red at the swap count | The other tank taunts at the swap count, and the stacks fall off the first | The tank dies under the stacks |
| **Facing** | The boss's frontal cone points at the tank | Turn the boss away from the group | The cone hits the group |
| **Pick up adds** | Adds spawn with an orange line to their target (usually a healer) | Taunt them (Provoke, Tremor) before they reach anyone | Adds hit the healers and damage dealers |
| **Move the boss** | The zone under the boss glows; a buff on the boss | Drag the boss out of the zone that feeds it | The boss hits harder and harder |
| **Shared hit** | White stack ring on both tanks | Both tanks stand together to split it | One tank takes all of it and dies |
| **Knockback on the tank** | Arrows on the floor behind the tank | Keep your back to a wall or to safe ground | The tank lands in a pool, or out of reach of the boss |

### Damage dealers

| Mechanic | Looks like | Answer | Fail |
| --- | --- | --- | --- |
| **Interrupt** | Cast bar with the damage icon and an interruptible frame | Stop the cast (needs an interrupt, see the open questions) | The spell goes off: a heal on the boss, a fear, a volley |
| **Priority add** | An add with its own cast bar, or one walking to the boss | Kill it before it finishes, or before it arrives | Its cast goes off, or it empowers the boss |
| **Shield break** | Blue absorb shield over the boss's health, with a timer | Break the shield in time | The boss heals, or the shield explodes on the group |
| **Burst window** | The boss is exposed: a debuff on it, with a timer | Use your ultimate now (Blood Frenzy, Fervor) | A slower kill, and the next phase comes sooner |
| **Enrage** | An enrage timer on the boss's frame | Kill it before the timer ends (hard enrage), or as its damage grows (soft) | The whole group dies |
| **Linked adds** | Two adds tied by a line, each with a health bar | Bring them down together, within a few seconds of each other | The first one revives |
| **Exploding add** | An orange ring that grows on the add as its health drops | Kill it away from the group; the tank moves it out | Damage to everyone near it |
| **Damage check** | A phase line on the boss's health bar, with a timer | Push the boss past the line before the timer | The deadly phase comes |

## What the arena already does

The arena (`src/game/sim/scenarios.ts`) has a few of these as event kinds. To fit the code:

| Event kind | Mechanic in the catalog | Role | Change needed |
| --- | --- | --- | --- |
| `melee` (with `swap`) | Tank hits; tank swap | Tank | The swap is timed (every 20 sec); a stacking debuff would make it a real tank swap |
| `pulse` | Damage Volley, as one hit | Healer | A volley as several bolts over 2 sec; a cast bar with the healer icon |
| `drain` | Fire Aura | Healer | A debuff on every player so it shows |
| `spike` | Spike | Healer | An orange icon over the target before it lands |
| `pool` | Telegraphed burst, then a lingering pool | Everyone | Drawn red today (`#ff5a46`) though it isn't lethal: **orange**. Its warning is 1.2 sec with a fading fill: **1.5 sec with a fill growing from the middle** |
| `stack` | A gather for heals, with no damage | Everyone | A true stack (a hit shared among those inside) is a new kind |
| `adds` | Pick up adds, priority add | Tank, damage | An orange line to each add's target |

Everything else in the catalog is new to the sim: cones, lanes, donuts, soaks, spreads, tethers, tank
busters and the rest.

## The Encounters section on the site

A proposal for the next step: a new top-level tab, **Encounters**, beside Build, Test arena and Interface.

1. **The code**: the severity colors, the shapes and the fill, each shown as a small animated
   telegraph on the arena floor.
2. **The catalog**: a card for every mechanic, filtered by role (Everyone, Tank, Healer, Damage) and by
   severity. Each card has its animated preview, what you see, what to do, what failing does, and its
   example flavors.
3. **Later**: a card can open the arena on a fight that uses it.

The previews should be drawn by the same code as the arena (`src/components/arena/drawArena.ts`), so
the site and the game can never show two versions of the code.

## Open questions

1. **The "go here" color.** White is proposed; it must be approved before the soak and stack cards.
2. **Exact colors and the second cue.** The hex values, and whether red's double outline and skull are
   enough for color-blind players (check with a protanopia and deuteranopia filter).
3. **Severity thresholds.** 25% for orange and 100% for red are start values.
4. **Tanks have no defensive ultimate.** The tank's ultimate slot only holds Fervor (haste for the
   group), so Wave Break has no answer yet. It needs a tank ultimate that blocks one big hit.
5. **No kit has an interrupt or a cleanse.** The interrupt and damage-over-time rows can wait for
   them, or get another answer for now (a stun from damage, a shield to break).
