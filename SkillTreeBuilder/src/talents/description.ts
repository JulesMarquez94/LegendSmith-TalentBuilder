const RANK_VALUES = /\{([^{}]*)\}/g

/**
 * Fills a description's "{a/b/c}" per-rank values for one rank (1-based):
 * "by {0.5/1/1.5} sec" at rank 2 → "by 1 sec".
 */
export function describeRank(description: string, rank: number): string {
  return description.replace(RANK_VALUES, (_, values: string) => {
    const parts = values.split('/').map((v) => v.trim())
    return parts[Math.min(Math.max(rank, 1), parts.length) - 1]
  })
}

/** How many values each "{…}" group in a description holds. */
export function rankValueCounts(description: string): number[] {
  return [...description.matchAll(RANK_VALUES)].map((m) => m[1].split('/').length)
}
