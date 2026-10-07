import type { TreeDef } from '../talents/types.ts'

// From "Plague - Skill Tree.pptx". Rows and columns start at 0.
// Per-rank values go in braces, one per rank: "{0.5/1/1.5}".
export const plague: TreeDef = {
  id: 'plague',
  kind: 'damage',
  artFolder: 'Plague',
  background: 'Plague-Background',
  color: '#7ccf3a',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Plague',
    icon: 'Plague',
    castTime: 'Instant',
    range: '30 range',
    description: 'Plague the target. This ability rotates between inflicting Pox, Blight and Malady after each use.',
  },
  effects: [
    {
      name: 'Pox',
      icon: 'Pox',
      castTime: 'Instant',
      range: '30 range',
      description: 'Plague the target, causing X Decay damage over Y sec.',
    },
    {
      name: 'Blight',
      icon: 'Blight',
      castTime: 'Instant',
      range: '30 range',
      description: 'Plague the target, causing X Decay damage over Y sec.',
    },
    {
      name: 'Malady',
      icon: 'Malady',
      castTime: 'Instant',
      range: '30 range',
      description: 'Plague the target, causing X Decay damage over Y sec.',
    },
  ],

  talents: [
    // Row 1
    {
      id: 'lasting-plagues',
      name: 'Lasting Plagues',
      icon: 'Lasting Plagues',
      row: 0,
      col: 1,
      maxRank: 3,
      description: "Increases your plagues' duration by {X/2X/3X} sec.",
    },
    {
      id: 'potent-plagues',
      name: 'Potent Plagues',
      icon: 'Potent Plagues',
      row: 0,
      col: 2,
      maxRank: 3,
      description: "Increases your plagues' damage by {X/2X/3X}%.",
    },

    // Row 2
    {
      id: 'pandemic',
      name: 'Pandemic',
      icon: 'Pandemic',
      row: 1,
      col: 0,
      maxRank: 1,
      description:
        'Your direct damage to a target with a plague spreads a fresh plague to one enemy that does not have one.',
    },
    {
      id: 'volatile-plague',
      name: 'Volatile Plague',
      icon: 'Volatile Plague',
      row: 1,
      col: 1,
      maxRank: 3,
      description:
        'Dealing direct damage shortens the duration of your plagues by {0.5/1/1.5} sec and instantly deals {1/2/3} sec worth of damage.',
    },

    // Row 3
    {
      id: 'critical-condition',
      name: 'Critical Condition',
      icon: 'Critical Condition',
      row: 2,
      col: 0,
      maxRank: 1,
      description: 'Whenever you critically strike a target, your plagues instantly deal 2 sec worth of damage.',
    },
    {
      id: 'aggravating',
      name: 'Aggravating',
      icon: 'Aggravating',
      row: 2,
      col: 2,
      maxRank: 3,
      requires: 'potent-plagues',
      description: 'Direct damage extends the duration of your plagues by {0.2/0.4/0.6} sec.',
    },

    // Row 4
    {
      id: 'terminal',
      name: 'Terminal',
      icon: 'Terminal',
      row: 3,
      col: 0,
      maxRank: 3,
      description: 'Your plagues deal their damage every {0.8/0.6/0.4} sec instead of every 1 sec.',
    },
    {
      id: 'bursting-sores',
      name: 'Bursting Sores',
      icon: 'Bursting Sores',
      row: 3,
      col: 1,
      maxRank: 1,
      requires: 'volatile-plague',
      description: 'When a plague ends, the target takes damage equal to 20 sec worth of damage.',
    },
    {
      id: 'convalescence',
      name: 'Convalescence',
      icon: 'convalescence',
      row: 3,
      col: 3,
      maxRank: 3,
      requires: 'aggravating',
      description: 'Targets take {X/2X/3X}% increased damage from you for each unique damage-over-time effect.',
    },
  ],
}
