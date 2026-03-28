import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------- HOISTED MOCKS ----------------
// These mocks are hoisted to ensure they are available
// before any module imports (critical for proper mocking in Vitest)
const { mockFetch, mockGetCookie, mockDiscovery } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetCookie: vi.fn(),
  mockDiscovery: {
    token_endpoint: 'http://token-endpoint',
  },
}))

// Mock Nuxt global $fetch (used internally by refreshToken)
vi.stubGlobal('$fetch', mockFetch)

// ---------------- MODULE MOCKS ----------------
// Mock Nuxt runtime config
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    keycloak: {
      clientId: 'client',
      clientSecret: 'secret',
      url: 'http://localhost',
      realm: 'test',
      enabled: true,
      mode: 'protect-all',
    },
  }),
}))

// Mock cookie access from H3
vi.mock('h3', () => ({
  getCookie: mockGetCookie,
}))

// Mock OIDC discovery call (avoids network + isolates unit)
vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(async () => mockDiscovery),
}))

// ---------------- TESTS ----------------
describe('refreshToken', () => {
  let refreshToken: any

  beforeEach(async () => {
    // Reset all mocks between tests to avoid cross-test pollution
    vi.clearAllMocks()

    // Dynamic import ensures mocks are applied correctly
    const mod = await import('../src/runtime/utils/refreshToken')
    refreshToken = mod.refreshToken
  })

  // ---------------------------------------------------------------------------
  // NO COOKIE
  // ---------------------------------------------------------------------------
  it('returns false if no refresh token cookie is present', async () => {
    // Simulate missing cookie
    mockGetCookie.mockReturnValue(undefined)

    const result = await refreshToken({} as any)

    // Should early exit without calling Keycloak
    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('calls token endpoint and returns response', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    // Simulate successful token refresh
    mockFetch.mockResolvedValue({
      access_token: 'new-token',
    })

    const result = await refreshToken({} as any)

    // Ensure API call happened
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Ensure response is forwarded
    expect(result).toMatchObject({
      access_token: 'new-token',
    })
  })

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------
  it('returns false if fetch fails', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    // Simulate network / server failure
    mockFetch.mockRejectedValue(new Error('fail'))

    const result = await refreshToken({} as any)

    // Errors should be swallowed and return false
    expect(result).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // LOCK / DEDUPLICATION
  // ---------------------------------------------------------------------------
  it('deduplicates concurrent refresh calls', async () => {
    mockGetCookie.mockReturnValue('same-refresh')

    // Create a pending promise to simulate in-flight request
    let resolveFetch: any
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    mockFetch.mockReturnValue(fetchPromise)

    // Trigger two parallel refresh calls with same token
    const p1 = refreshToken({} as any)
    const p2 = refreshToken({} as any)

    // Allow async chain (discovery → fetch) to start
    await Promise.resolve()

    // Only ONE request should be executed (deduplication)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Resolve the shared promise
    resolveFetch({ access_token: 'token' })

    const [r1, r2] = await Promise.all([p1, p2])

    // Both callers receive the same result
    expect(r1).toEqual(r2)
  })

  // ---------------------------------------------------------------------------
  // DIFFERENT TOKENS → NO DEDUP
  // ---------------------------------------------------------------------------
  it('does not deduplicate different refresh tokens', async () => {
    mockFetch.mockResolvedValue({ access_token: 'token' })

    // Simulate different users / sessions
    mockGetCookie.mockReturnValueOnce('r1').mockReturnValueOnce('r2')

    await refreshToken({} as any)
    await refreshToken({} as any)

    // Each token should trigger its own request
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // CLIENT SECRET OPTIONAL
  // ---------------------------------------------------------------------------
  it('does not include client_secret if not configured', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    // Override runtime config to simulate public client
    vi.mocked(await import('#app')).useRuntimeConfig = (() => ({
      keycloak: {
        clientId: 'client',
        url: 'http://localhost',
        realm: 'test',
        enabled: true,
        mode: 'protect-all',
      },
    })) as any

    mockFetch.mockResolvedValue({})

    await refreshToken({} as any)

    const call = mockFetch.mock.calls[0][1]

    // Ensure client_secret is NOT sent
    expect(call.body.toString()).not.toContain('client_secret')
  })

  // ---------------------------------------------------------------------------
  // LOCK RELEASE AFTER FAILURE (CRITICAL EDGE CASE)
  // ---------------------------------------------------------------------------
  it('releases lock after failure', async () => {
    mockGetCookie.mockReturnValue('same-refresh')

    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('fail'))

    const result1 = await refreshToken({} as any)
    expect(result1).toBe(false)

    // Second call should NOT reuse failed promise → must retry
    mockFetch.mockResolvedValueOnce({ access_token: 'new' })

    const result2 = await refreshToken({} as any)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result2).toMatchObject({ access_token: 'new' })
  })
})
