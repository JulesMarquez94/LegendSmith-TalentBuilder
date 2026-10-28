/**
 * The character skill tab: a bigger tree for the character itself, there whatever you hold (talents
 * for the open world: gathering, travel, events). It holds the loadout's last slot, which has nothing
 * to spec yet.
 */
export function CharacterSkills() {
  return (
    <section className="character-skills" aria-label="Character skills">
      <div className="character-skills__name">Character skills</div>
      <p className="character-skills__note">
        A bigger tree for your character itself, there whatever artifact you hold: talents for the open world
        (gathering, travel, events). Nothing to spec yet.
      </p>
      <span className="tag">Coming later</span>
    </section>
  )
}
