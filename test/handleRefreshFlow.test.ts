import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRefreshFlow } from '../src/runtime/utils/handleRefreshFlow'

// ---------------- HOISTED MOCKS ----------------
const { mockRefreshToken, mockVerifyAccessToken, mockAttachAuthContext, mockSetCookie } =
  vi.hoisted(() => ({
    mockRefreshToken: vi.fn(),
    mockVerifyAccessToken: vi.fn(),
    mockAttachAuthContext: vi.fn(),
    mockSetCookie: vi.fn(),
  }))

// ---------------- MODULE MOCKS ----------------
vi.mock('../src/runtime/utils/refreshToken', () => ({
  refreshToken: mockRefreshToken,
}))

vi.mock('../src/runtime/utils/verifyAccessToken', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock('../src/runtime/utils/attachAuthContext', () => ({
  attachAuthContext: mockAttachAuthContext,
}))

vi.mock('h3', () => ({
  setCookie: mockSetCookie,
  createError: vi.fn((err) => err),
}))

// ---------------- TESTS ----------------
describe('handleRefreshFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('refreshes token, sets cookies and attaches context', async () => {
    const payload = { exp: 9999999999 }

    mockRefreshToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 1000,
      refresh_expires_in: 2000,
    })

    mockVerifyAccessToken.mockResolvedValue(payload)

    const result = await handleRefreshFlow({} as any, true)

    expect(result).toBe(true)

    expect(mockAttachAuthContext).toHaveBeenCalledWith(expect.anything(), payload)

    expect(mockSetCookie).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // NO REFRESH RESULT
  // ---------------------------------------------------------------------------
  it('returns false for HTML request if refresh fails', async () => {
    mockRefreshToken.mockResolvedValue(false)

    const result = await handleRefreshFlow({} as any, true)

    expect(result).toBe(false)
  })

  it('throws 401 for API request if refresh fails', async () => {
    mockRefreshToken.mockResolvedValue(false)

    await expect(handleRefreshFlow({} as any, false)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  // ---------------------------------------------------------------------------
  // NO ACCESS TOKEN IN RESPONSE
  // ---------------------------------------------------------------------------
  it('handles missing access_token (HTML)', async () => {
    mockRefreshToken.mockResolvedValue({})

    const result = await handleRefreshFlow({} as any, true)

    expect(result).toBe(false)
  })

  it('throws if access_token missing for API request', async () => {
    mockRefreshToken.mockResolvedValue({})

    await expect(handleRefreshFlow({} as any, false)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  // ---------------------------------------------------------------------------
  // VERIFY FAILS
  // ---------------------------------------------------------------------------
  it('returns false if verify fails (HTML)', async () => {
    mockRefreshToken.mockResolvedValue({
      access_token: 'token',
    })

    mockVerifyAccessToken.mockResolvedValue(null)

    const result = await handleRefreshFlow({} as any, true)

    expect(result).toBe(false)
  })

  it('throws if verify fails (API)', async () => {
    mockRefreshToken.mockResolvedValue({
      access_token: 'token',
    })

    mockVerifyAccessToken.mockResolvedValue(null)

    await expect(handleRefreshFlow({} as any, false)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  // ---------------------------------------------------------------------------
  // NO REFRESH TOKEN IN RESPONSE
  // ---------------------------------------------------------------------------
  it('does not set refresh cookie if refresh_token missing', async () => {
    mockRefreshToken.mockResolvedValue({
      access_token: 'new-access',
      expires_in: 1000,
    })

    mockVerifyAccessToken.mockResolvedValue({ exp: 999999 })

    const result = await handleRefreshFlow({} as any, true)

    expect(result).toBe(true)

    // only access cookie set
    expect(mockSetCookie).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // ORDER: VERIFY BEFORE COOKIE
  // ---------------------------------------------------------------------------
  it('does not set cookies if verify fails', async () => {
    mockRefreshToken.mockResolvedValue({
      access_token: 'token',
    })

    mockVerifyAccessToken.mockResolvedValue(null)

    await handleRefreshFlow({} as any, true)

    expect(mockSetCookie).not.toHaveBeenCalled()
  })
})
