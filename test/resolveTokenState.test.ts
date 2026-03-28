import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveTokenState } from '../src/runtime/utils/resolveTokenState'

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
    expect(result.refreshPayload).toBeUndefined()
    expect(mockValidateToken).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // BOTH TOKENS VALID
  // ---------------------------------------------------------------------------
  it('returns valid access and refresh tokens with payloads', async () => {
    const accessPayload = { exp: 9999999999 }
    const refreshPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken
      .mockResolvedValueOnce({ valid: true, payload: accessPayload })
      .mockResolvedValueOnce({ valid: true, payload: refreshPayload })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toEqual(accessPayload)
    expect(result.refreshPayload).toEqual(refreshPayload)
  })

  // ---------------------------------------------------------------------------
  // ACCESS INVALID, REFRESH VALID
  // ---------------------------------------------------------------------------
  it('handles invalid access token and valid refresh token', async () => {
    const refreshPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken
      .mockResolvedValueOnce({ valid: false })
      .mockResolvedValueOnce({ valid: true, payload: refreshPayload })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(false)
    expect(result.hasRefresh).toBe(true)
    expect(result.accessPayload).toBeUndefined()
    expect(result.refreshPayload).toEqual(refreshPayload)
  })

  // ---------------------------------------------------------------------------
  // ACCESS VALID, REFRESH INVALID
  // ---------------------------------------------------------------------------
  it('handles valid access token and invalid refresh token', async () => {
    const accessPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken
      .mockResolvedValueOnce({ valid: true, payload: accessPayload })
      .mockResolvedValueOnce({ valid: false })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(true)
    expect(result.hasRefresh).toBe(false)
    expect(result.accessPayload).toEqual(accessPayload)
    expect(result.refreshPayload).toBeUndefined()
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
  it('handles only refresh cookie present', async () => {
    const refreshPayload = { exp: 9999999999 }

    mockGetCookie.mockReturnValueOnce(undefined).mockReturnValueOnce('refresh-token')

    mockValidateToken.mockResolvedValueOnce({
      valid: true,
      payload: refreshPayload,
    })

    const result = await resolveTokenState({} as any)

    expect(result.hasAccess).toBe(false)
    expect(result.hasRefresh).toBe(true)
    expect(result.refreshPayload).toEqual(refreshPayload)
    expect(mockValidateToken).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // PAYLOAD ONLY RETURNED WHEN VALID
  // ---------------------------------------------------------------------------
  it('does not expose payload if token is invalid', async () => {
    mockGetCookie.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

    mockValidateToken
      .mockResolvedValueOnce({ valid: false, payload: { exp: 999 } })
      .mockResolvedValueOnce({ valid: false, payload: { exp: 999 } })

    const result = await resolveTokenState({} as any)

    expect(result.accessPayload).toBeUndefined()
    expect(result.refreshPayload).toBeUndefined()
  })
})
