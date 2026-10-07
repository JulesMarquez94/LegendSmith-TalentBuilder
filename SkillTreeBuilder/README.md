# LegendSmith Talent Builder

A WoW Classic–style talent builder for testing LegendSmith's skill trees. You slot abilities into a
3 × 2 grid, and each slotted ability brings its own talent tree.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Slots

| Slot | Holds |
| --- | --- |
| 1 | The artifact (a Tome of Summoning placeholder for now) |
| 2–4 | Damage abilities |
| 5 | A cooldown ability |
| 6 | A mobility ability |

Click an empty slot (or **Change**) to pick an ability. Picking one that's already in another slot
swaps the two and keeps both builds. Removing or replacing an ability refunds its points.

## Rules

- **80 talent points** to spend anywhere, but **no more than 15 in any one tree** (`POINT_RULES` in
  `src/trees/index.ts`).
- Inside a tree, a row unlocks once **2 points** (`pointsPerRow`) have been spent in the rows above it,
  in any mix: row 2 needs 2, row 3 needs 4, row 4 needs 6.
- A talent at the end of an arrow needs the talent the arrow comes from at **max rank**.
- Click to learn, right-click (or Shift-click) to unlearn. A point can't come back out while
  something below still depends on it.

## Editing trees

Everything lives in `src/trees/`:

- `index.ts`: the point rules, the slot layout, the artifact, the list of trees and the starting loadout.
- `plague.ts`: the Plague tree from `Plague - Skill Tree.pptx`, using the art in `../Art/Plague/`.
- `playtest.ts`: made-up abilities (Bone Spear, Raise Ghoul, Soul Siphon, Blood Frenzy, Army of the
  Dead, Shadow Step, Wraith Walk) so every slot has options. They have no art yet, so the builder draws
  placeholder icons in each tree's `color`.

**Add a tree:** copy `plague.ts`, set its `kind` (`damage`, `cooldown` or `mobility`), and add it to
`TREES`. Point `artFolder` at a folder in `../Art` and name icons by file name without `.png`. Leave
`artFolder` out to use placeholders.

**Per-rank values** go in braces, one per rank: `"by {0.5/1/1.5} sec"` shows 0.5 at rank 1, 1 at rank 2,
and so on. The tooltip shows the current and next rank, like WoW.

If tree data has a mistake (an unknown `requires`, two talents in one cell, missing art, the wrong number
of rank values, a tree in the wrong kind of slot), the page lists it at the top. `npm test` checks the
same things plus the talent rules.
