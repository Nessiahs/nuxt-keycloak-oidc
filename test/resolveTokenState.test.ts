import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveRefreshTokenState, resolveTokenState } from '../src/runtime/utils/resolveTokenState'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
import { sealTokenCookie } from '../src/runtime/utils/tokenCookie'

// ---------------- HOISTED MOCKS ----------------
const { mockGetCookie, mockValidateToken } = vi.hoisted(() => ({
  mockGetCookie: vi.fn(),
  mockValidateToken: vi.fn(),
}))

// ---------------- MODULE MOCKS ----------------
vi.mock('h3', () => ({
  getCookie: mockGetCookie,
}))

vi.mock('../src/runtime/utils/validateToken', () => ({
  validateToken: mockValidateToken,
}))

// ---------------- TESTS ----------------
describe('resolveTokenState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setKeycloakConfig()
  })

  // ---------------------------------------------------------------------------
  // NO COOKIES
  // ---------------------------------------------------------------------------
  it('returns false for both tokens if no cookies exist', async () => {
    mockGetCookie.mockReturnValue(undefined)

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(false)
    expect(result.hasRefresh).toBe(false)
    expect(result.accessPayload).toBeUndefined()
    expect(mockValidateToken).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // ACCESS TOKEN VALID
  // ---------------------------------------------------------------------------
  it('validates the access token and reports refresh cookie presence', async () => {
    const accessPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken.mockResolvedValueOnce({ valid: true, payload: accessPayload })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toEqual(accessPayload)
    expect(mockValidateToken).toHaveBeenCalledTimes(1)
    expect(mockValidateToken).toHaveBeenCalledWith('access-token')
  })

  it('unseals token cookies before validation when cookieSecret is configured', async () => {
    setKeycloakConfig({ cookieSecret: 'shared-secret' })
    const accessPayload = { exp: 9999999999 }

    mockGetCookie
      .mockReturnValueOnce(sealTokenCookie('access-token', 'shared-secret'))
      .mockReturnValueOnce(sealTokenCookie('refresh-token', 'shared-secret'))

    mockValidateToken.mockResolvedValueOnce({ valid: true, payload: accessPayload })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(true)
    expect(mockValidateToken).toHaveBeenCalledWith('access-token')
  })

  // ---------------------------------------------------------------------------
  // ACCESS INVALID, REFRESH PRESENT
  // ---------------------------------------------------------------------------
  it('does not validate refresh token when access token is invalid', async () => {
    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken.mockResolvedValueOnce({ valid: false })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(false)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toBeUndefined()
    expect(mockValidateToken).toHaveBeenCalledTimes(1)
    expect(mockValidateToken).toHaveBeenCalledWith('access-token')
  })

  // ---------------------------------------------------------------------------
  // ACCESS VALID, REFRESH PRESENT
  // ---------------------------------------------------------------------------
  it('does not validate refresh token on the access token fast path', async () => {
    const accessPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken.mockResolvedValueOnce({ valid: true, payload: accessPayload })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toEqual(accessPayload)
    expect(mockValidateToken).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // ONLY ACCESS COOKIE
  // ---------------------------------------------------------------------------
  it('handles only access cookie present', async () => {
    const accessPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce(undefined)

    mockValidateToken.mockResolvedValueOnce({
      valid: true,
      payload: accessPayload,
    })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(false)
    expect(result.accessPayload).toEqual(accessPayload)
    expect(mockValidateToken).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // ONLY REFRESH COOKIE
  // ---------------------------------------------------------------------------
  it('reports refresh cookie presence without validating it', async () => {
    mockGetCookie.mockReturnValueOnce(undefined).mockReturnValueOnce('refresh-token')

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(false)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toBeUndefined()
    expect(mockValidateToken).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // PAYLOAD ONLY RETURNED WHEN VALID
  // ---------------------------------------------------------------------------
  it('does not expose access payload if token is invalid', async () => {
    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken.mockResolvedValueOnce({ valid: false, payload: { exp: 999 } })

    const result = await resolveTokenState({} as any)

    expect(result.accessPayload).toBeUndefined()
  })
})

describe('resolveRefreshTokenState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setKeycloakConfig()
  })

  it('returns false when no refresh cookie exists', async () => {
    mockGetCookie.mockReturnValue(undefined)

    const result = await resolveRefreshTokenState({} as any)

    expect(result.hasRefresh).toBe(false)
    expect(result.refreshPayload).toBeUndefined()
    expect(mockValidateToken).not.toHaveBeenCalled()
  })

  it('validates refresh token when refresh is needed', async () => {
    const refreshPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValue('refresh-token')
    mockValidateToken.mockResolvedValueOnce({ valid: true, payload: refreshPayload })

    const result = await resolveRefreshTokenState({} as any)

    expect(result.hasRefresh).toBe(true)
    expect(result.refreshCookie).toBe('refresh-token')
    expect(result.refreshPayload).toEqual(refreshPayload)
    expect(mockValidateToken).toHaveBeenCalledWith('refresh-token')
  })

  it('unseals refresh token before validating it', async () => {
    setKeycloakConfig({ cookieSecret: 'shared-secret' })
    const refreshPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValue(sealTokenCookie('refresh-token', 'shared-secret'))
    mockValidateToken.mockResolvedValueOnce({ valid: true, payload: refreshPayload })

    const result = await resolveRefreshTokenState({} as any)

    expect(result.hasRefresh).toBe(true)
    expect(result.refreshCookie).toBe('refresh-token')
    expect(mockValidateToken).toHaveBeenCalledWith('refresh-token')
  })

  it('rejects invalid refresh token when refresh is needed', async () => {
    mockGetCookie.mockReturnValue('refresh-token')
    mockValidateToken.mockResolvedValueOnce({ valid: false })

    const result = await resolveRefreshTokenState({} as any)

    expect(result.hasRefresh).toBe(false)
    expect(result.refreshPayload).toBeUndefined()
  })
})
