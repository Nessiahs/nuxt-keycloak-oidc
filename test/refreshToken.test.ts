import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
import { sealTokenCookie } from '../src/runtime/utils/tokenCookie'

// ---------------- HOISTED MOCKS ----------------
const { mockFetch, mockGetCookie, mockDiscovery } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetCookie: vi.fn(),
  mockDiscovery: {
    token_endpoint: 'http://token-endpoint',
  },
}))

vi.stubGlobal('$fetch', mockFetch)

// ---------------- MODULE MOCKS ----------------
vi.mock('h3', () => ({
  getCookie: mockGetCookie,
}))

vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(async () => mockDiscovery),
}))

// ---------------- TESTS ----------------
describe('refreshToken', () => {
  let refreshToken: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // 🔥 reset config (default = public client, NO secret)
    setKeycloakConfig()

    const mod = await import('../src/runtime/utils/refreshToken')
    refreshToken = mod.refreshToken
  })

  // ---------------------------------------------------------------------------
  // NO COOKIE
  // ---------------------------------------------------------------------------
  it('returns false if no refresh token cookie is present', async () => {
    mockGetCookie.mockReturnValue(undefined)

    const result = await refreshToken({} as any)

    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('calls token endpoint and returns response', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    mockFetch.mockResolvedValue({
      access_token: 'new-token',
    })

    const result = await refreshToken({} as any)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      access_token: 'new-token',
    })
  })

  it('unseals refresh token cookies before sending them to Keycloak', async () => {
    setKeycloakConfig({ cookieSecret: 'shared-secret' })
    mockGetCookie.mockReturnValue(sealTokenCookie('refresh-token', 'shared-secret'))

    mockFetch.mockResolvedValue({
      access_token: 'new-token',
    })

    await refreshToken({} as any)

    const call = mockFetch.mock.calls[0][1]

    expect(call.body.get('refresh_token')).toBe('refresh-token')
  })

  it('does not call Keycloak when a sealed refresh cookie cannot be opened', async () => {
    setKeycloakConfig({ cookieSecret: 'shared-secret' })
    mockGetCookie.mockReturnValue(sealTokenCookie('refresh-token', 'other-secret'))

    const result = await refreshToken({} as any)

    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------
  it('returns false if fetch fails', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    mockFetch.mockRejectedValue(new Error('fail'))

    const result = await refreshToken({} as any)

    expect(result).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // LOCK / DEDUPLICATION
  // ---------------------------------------------------------------------------
  it('deduplicates concurrent refresh calls', async () => {
    mockGetCookie.mockReturnValue('same-refresh')

    let resolveFetch: any
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    mockFetch.mockReturnValue(fetchPromise)

    const p1 = refreshToken({} as any)
    const p2 = refreshToken({} as any)

    await Promise.resolve()

    expect(mockFetch).toHaveBeenCalledTimes(1)

    resolveFetch({ access_token: 'token' })

    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1).toEqual(r2)
  })

  // ---------------------------------------------------------------------------
  // DIFFERENT TOKENS → NO DEDUP
  // ---------------------------------------------------------------------------
  it('does not deduplicate different refresh tokens', async () => {
    mockFetch.mockResolvedValue({ access_token: 'token' })

    mockGetCookie.mockReturnValueOnce('r1').mockReturnValueOnce('r2')

    await refreshToken({} as any)
    await refreshToken({} as any)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // CLIENT SECRET OPTIONAL
  // ---------------------------------------------------------------------------
  it('does not include client_secret if not configured', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    // 🔥 default config → NO secret
    setKeycloakConfig()

    mockFetch.mockResolvedValue({})

    await refreshToken({} as any)

    const call = mockFetch.mock.calls[0][1]

    expect(call.body.toString()).not.toContain('client_secret')
  })

  // ---------------------------------------------------------------------------
  // CONFIDENTIAL CLIENT
  // ---------------------------------------------------------------------------
  it('includes client_secret when configured', async () => {
    mockGetCookie.mockReturnValue('refresh-token')

    // 🔥 explicit confidential setup
    setKeycloakConfig({ clientSecret: 'secret' })

    mockFetch.mockResolvedValue({})

    await refreshToken({} as any)

    const call = mockFetch.mock.calls[0][1]

    expect(call.body.toString()).toContain('client_secret=secret')
  })

  // ---------------------------------------------------------------------------
  // LOCK RELEASE AFTER FAILURE
  // ---------------------------------------------------------------------------
  it('releases lock after failure', async () => {
    mockGetCookie.mockReturnValue('same-refresh')

    mockFetch.mockRejectedValueOnce(new Error('fail'))

    const result1 = await refreshToken({} as any)
    expect(result1).toBe(false)

    mockFetch.mockResolvedValueOnce({ access_token: 'new' })

    const result2 = await refreshToken({} as any)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result2).toMatchObject({ access_token: 'new' })
  })
})
