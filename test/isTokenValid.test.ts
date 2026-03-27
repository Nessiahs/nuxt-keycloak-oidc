import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------- HOISTED MOCK ----------------
const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
}))

// Mock dependency
vi.mock('../src/runtime/utils/verifyAccessToken', () => ({
  verifyAccessToken: mockVerify,
}))

describe('isTokenValid', () => {
  let isTokenValid: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // 👉 dynamic import verhindert IDE-Reordering
    const mod = await import('../src/runtime/utils/isTokenValid')
    isTokenValid = mod.isTokenValid
  })

  // ---------------------------------------------------------------------------
  // VALID TOKEN
  // ---------------------------------------------------------------------------
  it('returns true for valid token', async () => {
    mockVerify.mockResolvedValue({
      exp: Math.floor(Date.now() / 1000) + 60,
    })

    const result = await isTokenValid('token')

    expect(result).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // EXPIRED TOKEN
  // ---------------------------------------------------------------------------
  it('returns false for expired token', async () => {
    mockVerify.mockResolvedValue({
      exp: Math.floor(Date.now() / 1000) - 60,
    })

    const result = await isTokenValid('token')

    expect(result).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // MISSING EXP
  // ---------------------------------------------------------------------------
  it('returns false if exp is missing', async () => {
    mockVerify.mockResolvedValue({})

    const result = await isTokenValid('token')

    expect(result).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // VERIFY FAILS
  // ---------------------------------------------------------------------------
  it('returns false if verifyAccessToken throws', async () => {
    mockVerify.mockRejectedValue(new Error('invalid token'))

    const result = await isTokenValid('token')

    expect(result).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // NULL PAYLOAD
  // ---------------------------------------------------------------------------
  it('returns false if verifyAccessToken returns null', async () => {
    mockVerify.mockResolvedValue(null)

    const result = await isTokenValid('token')

    expect(result).toBe(false)
  })
})
