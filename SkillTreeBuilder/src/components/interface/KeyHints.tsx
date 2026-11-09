/** The keys a screen answers to, along its bottom edge: [key, what it does]. */
export function KeyHints({ hints }: { hints: readonly (readonly [string, string])[] }) {
  return (
    <ul className="ui-hints" aria-label="Keys">
      {hints.map(([key, label]) => (
        <li key={`${key} ${label}`}>
          <kbd className="ui-key">{key}</kbd>
          {label}
        </li>
      ))}
    </ul>
  )
}
