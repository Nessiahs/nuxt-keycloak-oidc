import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleUnauthorized } from '../src/runtime/utils/handleUnauthorized'
import { OIDC_ROUTES } from '../src/runtime/constants/path'

// ---------------- HOISTED MOCKS ----------------
const { mockCreateError, mockSendRedirect, mockSetRedirectCookie } = vi.hoisted(() => ({
  mockCreateError: vi.fn((err) => err),
  mockSendRedirect: vi.fn(),
  mockSetRedirectCookie: vi.fn(),
}))

// ---------------- MODULE MOCKS ----------------
vi.mock('h3', () => ({
  createError: mockCreateError,
  sendRedirect: mockSendRedirect,
}))

vi.mock('../src/runtime/utils/setRedirectCookie', () => ({
  setRedirectCookie: mockSetRedirectCookie,
}))

// ---------------- TESTS ----------------
describe('handleUnauthorized', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // API REQUEST → THROW 401
  // ---------------------------------------------------------------------------
  it('throws 401 for non-HTML requests', () => {
    expect(() => handleUnauthorized({} as any, false)).toThrow()

    expect(mockCreateError).toHaveBeenCalledWith({ statusCode: 401 })
    expect(mockSendRedirect).not.toHaveBeenCalled()
    expect(mockSetRedirectCookie).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // HTML REQUEST → REDIRECT
  // ---------------------------------------------------------------------------
  it('sets redirect cookie and redirects for HTML requests', () => {
    handleUnauthorized({} as any, true)

    expect(mockSetRedirectCookie).toHaveBeenCalledTimes(1)
    expect(mockSendRedirect).toHaveBeenCalledWith(expect.anything(), OIDC_ROUTES.login)
  })

  // ---------------------------------------------------------------------------
  // ORDER: COOKIE BEFORE REDIRECT
  // ---------------------------------------------------------------------------
  it('sets cookie before redirect', () => {
    const callOrder: string[] = []

    mockSetRedirectCookie.mockImplementation(() => {
      callOrder.push('cookie')
    })

    mockSendRedirect.mockImplementation(() => {
      callOrder.push('redirect')
    })

    handleUnauthorized({} as any, true)

    expect(callOrder).toEqual(['cookie', 'redirect'])
  })
})
