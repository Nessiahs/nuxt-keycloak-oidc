import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setRedirectCookie } from '../src/runtime/utils/setRedirectCookie'

// ---------------- HOISTED MOCKS ----------------
const { mockGetCookie, mockSetCookie, mockGetRequestURL } = vi.hoisted(() => ({
  mockGetCookie: vi.fn(),
  mockSetCookie: vi.fn(),
  mockGetRequestURL: vi.fn(),
}))

// ---------------- MODULE MOCK ----------------
vi.mock('h3', () => ({
  getCookie: mockGetCookie,
  setCookie: mockSetCookie,
  getRequestURL: mockGetRequestURL,
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
      'redirect_to',
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
      'redirect_to',
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
      'redirect_to',
      '/',
      expect.anything(),
    )
  })
})
