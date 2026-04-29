import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTokenCookie,
  sealTokenCookie,
  setTokenCookie,
  unsealTokenCookie,
} from '../src/runtime/utils/tokenCookie'

const { mockGetCookie, mockSetCookie } = vi.hoisted(() => ({
  mockGetCookie: vi.fn(),
  mockSetCookie: vi.fn(),
}))

vi.mock('h3', () => ({
  getCookie: mockGetCookie,
  setCookie: mockSetCookie,
}))

const config = {
  cookie: {
    sameSite: 'lax',
    path: '/',
  },
} as any

describe('tokenCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores raw token cookies when cookieSecret is not configured', () => {
    setTokenCookie({} as any, 'kc_access', 'access-token', config, 300)

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.anything(),
      'kc_access',
      'access-token',
      expect.objectContaining({ maxAge: 300 }),
    )
  })

  it('reads raw token cookies when cookieSecret is not configured', () => {
    mockGetCookie.mockReturnValue('access-token')

    expect(getTokenCookie({} as any, 'kc_access', config)).toBe('access-token')
  })

  it('seals token cookies when cookieSecret is configured', () => {
    setTokenCookie({} as any, 'kc_access', 'access-token', {
      ...config,
      cookieSecret: 'shared-secret',
    })

    const value = mockSetCookie.mock.calls[0][2]

    expect(value).not.toBe('access-token')
    expect(unsealTokenCookie(value, 'shared-secret')).toBe('access-token')
  })

  it('unseals token cookies with the configured shared secret', () => {
    const sealed = sealTokenCookie('refresh-token', 'shared-secret')

    mockGetCookie.mockReturnValue(sealed)

    expect(
      getTokenCookie({} as any, 'kc_refresh', {
        ...config,
        cookieSecret: 'shared-secret',
      }),
    ).toBe('refresh-token')
  })

  it('rejects sealed token cookies when the secret does not match', () => {
    const sealed = sealTokenCookie('refresh-token', 'shared-secret')

    expect(unsealTokenCookie(sealed, 'other-secret')).toBeUndefined()
  })

  it('rejects malformed sealed token cookies', () => {
    expect(unsealTokenCookie('not-sealed', 'shared-secret')).toBeUndefined()
  })
})
