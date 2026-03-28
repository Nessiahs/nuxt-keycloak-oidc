import { createHash } from 'node:crypto'

// Generates a deterministic, namespaced hash key for a given input.
// Useful for Map keys, caching, or deduplication without exposing raw values.
export function getHashKey(input: string, prefix = 'key'): string {
  // Prefix provides simple namespacing (e.g. "rt", "user", "cache")
  // to avoid collisions across different domains.
  // SHA-256 ensures a stable, low-collision, fixed-length identifier.
  return `${prefix}:` + createHash('sha256').update(input).digest('hex')
}
