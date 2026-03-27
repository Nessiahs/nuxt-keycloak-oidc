import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getKeycloakDiscovery, __resetDiscoveryCache } from '../src/runtime/utils/keycloakDiscovery'

// Mock global $fetch used by Nuxt runtime
const mockFetch = vi.fn()

// Inject mock into global scope
// (Nuxt provides $fetch globally at runtime)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
global.$fetch = mockFetch

// Test config simulating minimal module setup
const config = {
  url: 'http://localhost:8080',
  realm: 'test',
} as any

// Mocked OIDC discovery response
const mockDiscovery = {
  authorization_endpoint: 'auth',
  token_endpoint: 'token',
  userinfo_endpoint: 'userinfo',
  end_session_endpoint: 'logout',
  jwks_uri: 'jwks',
  issuer: 'issuer',
}

describe('getKeycloakDiscovery', () => {
  beforeEach(() => {
    // Reset internal module cache to ensure test isolation
    __resetDiscoveryCache()

    // Clear all mock call history
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset module state (extra safety for singleton caches)
    vi.resetModules()
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('fetches discovery document successfully', async () => {
    // Simulate successful fetch
    mockFetch.mockResolvedValue(mockDiscovery)

    const result = await getKeycloakDiscovery(config)

    // Should return fetched discovery
    expect(result).toEqual(mockDiscovery)

    // Ensure fetch is called exactly once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // CACHING
  // ---------------------------------------------------------------------------
  it('returns cached discovery on subsequent calls', async () => {
    mockFetch.mockResolvedValue(mockDiscovery)

    const first = await getKeycloakDiscovery(config)
    const second = await getKeycloakDiscovery(config)

    // Both calls should return same cached object
    expect(first).toEqual(mockDiscovery)
    expect(second).toEqual(mockDiscovery)

    // Fetch should only happen once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // CONCURRENCY (single flight)
  // ---------------------------------------------------------------------------
  it('deduplicates parallel requests', async () => {
    let resolveFetch: (value: any) => void

    // Create a manually controlled promise to simulate in-flight request
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    mockFetch.mockReturnValue(fetchPromise)

    // Trigger two parallel calls before promise resolves
    const p1 = getKeycloakDiscovery(config)
    const p2 = getKeycloakDiscovery(config)

    // Only one fetch should be executed (single-flight pattern)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Resolve the fetch
    resolveFetch!(mockDiscovery)

    const [r1, r2] = await Promise.all([p1, p2])

    // Both calls should receive the same result
    expect(r1).toEqual(mockDiscovery)
    expect(r2).toEqual(mockDiscovery)
  })

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------
  it('throws when fetch fails', async () => {
    // Simulate network failure
    mockFetch.mockRejectedValue(new Error('network error'))

    // Function should reject (error details are not part of public contract)
    await expect(getKeycloakDiscovery(config)).rejects.toThrow()
  })

  // ---------------------------------------------------------------------------
  // RETRY AFTER FAILURE
  // ---------------------------------------------------------------------------
  it('retries after failed request', async () => {
    // First call fails, second succeeds
    mockFetch.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(mockDiscovery)

    // First call should reject
    await expect(getKeycloakDiscovery(config)).rejects.toThrow()

    // Second call should retry and succeed
    const result = await getKeycloakDiscovery(config)

    expect(result).toEqual(mockDiscovery)

    // Ensure fetch was called twice (retry behavior)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // URL NORMALIZATION
  // ---------------------------------------------------------------------------
  it('removes trailing slash from base url', async () => {
    mockFetch.mockResolvedValue(mockDiscovery)

    await getKeycloakDiscovery({
      url: 'http://localhost:8080/',
      realm: 'test',
    } as any)

    // Ensure trailing slash is removed when building URL
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/realms/test/.well-known/openid-configuration',
    )
  })

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  it('handles multiple rapid calls after cache is set', async () => {
    mockFetch.mockResolvedValue(mockDiscovery)

    // Prime cache
    await getKeycloakDiscovery(config)

    // Multiple rapid calls should all use cached value
    const results = await Promise.all([
      getKeycloakDiscovery(config),
      getKeycloakDiscovery(config),
      getKeycloakDiscovery(config),
    ])

    // All results should be identical
    expect(results.every((r) => r === mockDiscovery)).toBe(true)

    // Fetch should still only have been called once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
