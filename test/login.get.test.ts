import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
import { COOKIE_NAMES } from '../src/runtime/constants/cookies'

// --- MODULE MOCKS ---
vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<any>('h3')
  return {
    ...actual,
    getRequestURL: vi.fn(),
    getHeaders: vi.fn(),
    setCookie: vi.fn(),
    sendRedirect: vi.fn(),
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth login handler', () => {
  let handler: any
  let mockGetKeycloakDiscovery: any
  let mockGetRequestURL: any
  let mockGetHeaders: any
  let mockSetCookie: any
  let mockSendRedirect: any

  beforeEach(async () => {
    vi.clearAllMocks()

    setKeycloakConfig({
      clientId: 'test-client',
      cookie: {
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    })

    const discoveryModule = await import('../src/runtime/utils/keycloakDiscovery')
    const h3 = await import('h3')
    const handlerModule = await import('../src/runtime/server/api/_oidc/login.get')

    handler = handlerModule.default

    mockGetKeycloakDiscovery = discoveryModule.getKeycloakDiscovery
    mockGetRequestURL = h3.getRequestURL
    mockGetHeaders = h3.getHeaders
    mockSetCookie = h3.setCookie
    mockSendRedirect = h3.sendRedirect

    mockGetKeycloakDiscovery.mockResolvedValue({
      authorization_endpoint: 'https://keycloak.test/auth',
    })

    mockGetRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })

    mockGetHeaders.mockReturnValue({})
  })

  // ---------------------------------------------------------------------------
  // REDIRECT
  // ---------------------------------------------------------------------------
  it('redirects to keycloak with correct params', async () => {
    await handler({} as any)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)

    const redirectUrl = mockSendRedirect.mock.calls[0][1]

    expect(redirectUrl).toContain('https://keycloak.test/auth')
    expect(redirectUrl).toContain('client_id=test-client')
    expect(redirectUrl).toContain('response_type=code')
    expect(redirectUrl).toContain('code_challenge_method=S256')

    expect(redirectUrl).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fapi%2F_oidc%2Fcallback')
  })

  // ---------------------------------------------------------------------------
  // COOKIES
  // ---------------------------------------------------------------------------
  it('sets state and verifier cookies', async () => {
    await handler({} as any)

    expect(mockSetCookie).toHaveBeenCalledTimes(2)

    const calls = mockSetCookie.mock.calls

    expect(calls[0][1]).toBe(COOKIE_NAMES.STATE)
    expect(calls[1][1]).toBe(COOKIE_NAMES.VERIFIER)

    expect(calls[0][2]).toBeTruthy()
    expect(calls[1][2]).toBeTruthy()

    expect(calls[0][3]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 300,
    })
  })

  // ---------------------------------------------------------------------------
  // RANDOM STATE
  // ---------------------------------------------------------------------------
  it('generates different state values per request', async () => {
    const event = {} as any

    await handler(event)
    const firstState = mockSetCookie.mock.calls[0][2]

    vi.clearAllMocks()

    mockGetHeaders.mockReturnValue({})
    mockGetRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })

    await handler(event)
    const secondState = mockSetCookie.mock.calls[0][2]

    expect(firstState).not.toEqual(secondState)
  })
})
