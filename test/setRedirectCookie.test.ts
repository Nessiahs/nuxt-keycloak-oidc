import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isSafeRedirectTarget, setRedirectCookie } from '../src/runtime/utils/setRedirectCookie'
import { COOKIE_NAMES } from '../src/runtime/constants/cookies'

// ---------------- HOISTED MOCKS ----------------
const { mockGetCookie, mockSetCookie, mockGetRequestURL } = vi.hoisted(() => ({
  mockGetCookie: vi.fn(),
  mockSetCookie: vi.fn(),
  mockGetRequestURL: vi.fn(),
}))

// ---------------- MODULE MOCKS ----------------
vi.mock('h3', () => ({
  getCookie: mockGetCookie,
  setCookie: mockSetCookie,
  getRequestURL: mockGetRequestURL,
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    keycloak: {
      cookie: {
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  }),
}))

// ---------------- TESTS ----------------
describe('setRedirectCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // HAPPY PATH
  // ---------------------------------------------------------------------------
  it('sets redirect cookie with pathname and query', () => {
    mockGetCookie.mockReturnValue(undefined)

    mockGetRequestURL.mockReturnValue({
      pathname: '/dashboard',
      search: '?tab=profile',
    })

    setRedirectCookie({} as any)

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.anything(),
      COOKIE_NAMES.REDIRECT_TO,
      '/dashboard?tab=profile',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 300,
        path: '/',
      }),
    )
  })

  // ---------------------------------------------------------------------------
  // COOKIE EXISTS
  // ---------------------------------------------------------------------------
  it('does not overwrite existing redirect cookie', () => {
    mockGetCookie.mockReturnValue('/already-set')

    setRedirectCookie({} as any)

    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // API ROUTES
  // ---------------------------------------------------------------------------
  it('does not set cookie for API routes', () => {
    mockGetCookie.mockReturnValue(undefined)

    mockGetRequestURL.mockReturnValue({
      pathname: '/api/users',
      search: '',
    })

    setRedirectCookie({} as any)

    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // NO QUERY
  // ---------------------------------------------------------------------------
  it('sets cookie without query params', () => {
    mockGetCookie.mockReturnValue(undefined)

    mockGetRequestURL.mockReturnValue({
      pathname: '/dashboard',
      search: '',
    })

    setRedirectCookie({} as any)

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.anything(),
      COOKIE_NAMES.REDIRECT_TO,
      '/dashboard',
      expect.anything(),
    )
  })

  // ---------------------------------------------------------------------------
  // ROOT PATH
  // ---------------------------------------------------------------------------
  it('handles root path correctly', () => {
    mockGetCookie.mockReturnValue(undefined)

    mockGetRequestURL.mockReturnValue({
      pathname: '/',
      search: '',
    })

    setRedirectCookie({} as any)

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.anything(),
      COOKIE_NAMES.REDIRECT_TO,
      '/',
      expect.anything(),
    )
  })

  it('sets cookie from an explicit safe SPA target', () => {
    mockGetCookie.mockReturnValue(undefined)

    setRedirectCookie({} as any, '/dashboard?tab=profile#security')

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.anything(),
      COOKIE_NAMES.REDIRECT_TO,
      '/dashboard?tab=profile#security',
      expect.anything(),
    )
    expect(mockGetRequestURL).not.toHaveBeenCalled()
  })

  it('rejects external explicit redirect targets', () => {
    mockGetCookie.mockReturnValue(undefined)

    setRedirectCookie({} as any, 'https://evil.example/dashboard')
    setRedirectCookie({} as any, '//evil.example/dashboard')

    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('rejects explicit API redirect targets', () => {
    mockGetCookie.mockReturnValue(undefined)

    setRedirectCookie({} as any, '/api/users')

    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('validates redirect targets defensively', () => {
    expect(isSafeRedirectTarget('/dashboard?tab=profile#security')).toBe(true)
    expect(isSafeRedirectTarget('/')).toBe(true)
    expect(isSafeRedirectTarget('https://evil.example/dashboard')).toBe(false)
    expect(isSafeRedirectTarget('//evil.example/dashboard')).toBe(false)
    expect(isSafeRedirectTarget('/api/users')).toBe(false)
    expect(isSafeRedirectTarget('/dashboard\nset-cookie:evil=true')).toBe(false)
  })
})
