import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateToken } from '../src/runtime/utils/validateToken'

import { verifyAccessToken } from '../src/runtime/utils/verifyAccessToken'

// Mock verifyAccessToken
vi.mock('../src/runtime/utils/verifyAccessToken', () => ({
  verifyAccessToken: vi.fn(),
}))

describe('validateToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // VALID TOKEN
  // ---------------------------------------------------------------------------
  it('returns valid true and payload when token is valid', async () => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 60 }

    vi.mocked(verifyAccessToken).mockResolvedValue(payload as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(true)
    expect(result.payload).toEqual(payload)
  })

  // ---------------------------------------------------------------------------
  // EXPIRED TOKEN
  // ---------------------------------------------------------------------------
  it('returns valid false if token is expired', async () => {
    const payload = { exp: Math.floor(Date.now() / 1000) - 60 }

    vi.mocked(verifyAccessToken).mockResolvedValue(payload as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
    expect(result.payload).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // NO EXP CLAIM
  // ---------------------------------------------------------------------------
  it('returns false if exp is missing', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({} as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // VERIFY THROWS
  // ---------------------------------------------------------------------------
  it('returns false if verifyAccessToken throws', async () => {
    vi.mocked(verifyAccessToken).mockRejectedValue(new Error('invalid'))

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns false if token expires exactly now', async () => {
    const payload = { exp: Math.floor(Date.now() / 1000) }

    vi.mocked(verifyAccessToken).mockResolvedValue(payload as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns false if exp is 0', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ exp: 0 } as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns false if exp is not a number', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ exp: 'invalid' } as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns false if verifyAccessToken returns null', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(null as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns false if verifyAccessToken returns undefined', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue(undefined as any)

    const result = await validateToken('token')

    expect(result.valid).toBe(false)
  })

  it('returns consistent results for same token', async () => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 60 }

    vi.mocked(verifyAccessToken).mockResolvedValue(payload as any)

    const r1 = await validateToken('token')
    const r2 = await validateToken('token')

    expect(r1).toEqual(r2)
  })
})
