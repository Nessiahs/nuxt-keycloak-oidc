import { describe, it, expect } from 'vitest'
import { getHashKey } from '../src/runtime/utils/getHashKey'

// Tests for hash key generation used in refresh token locking
describe('getHashKey', () => {
  it('returns deterministic hash for same input', () => {
    // Same input must always produce the same hash (critical for Map keys)
    const input = 'my-refresh-token'

    const h1 = getHashKey(input)
    const h2 = getHashKey(input)

    expect(h1).toBe(h2)
  })

  it('returns different hashes for different inputs', () => {
    // Different tokens should not collide
    const h1 = getHashKey('a')
    const h2 = getHashKey('b')

    expect(h1).not.toBe(h2)
  })

  it('prefixes hash with rt:', () => {
    // Prefix helps distinguish key namespace (e.g. debugging / future extensions)
    const result = getHashKey('token', 'rt')

    expect(result.startsWith('rt:')).toBe(true)
  })
})
