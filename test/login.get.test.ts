import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'

// --- HOISTED MOCKS ---
// eslint-disable-next-line no-empty-pattern
const {} = vi.hoisted(() => ({}))

// --- MODULE MOCKS ---
vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<any>('h3')
  return {
    ...actual,
    getRequestURL: vi.fn(),
    setCookie: vi.fn(),
    sendRedirect: vi.fn(),
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth login handler', () => {
  let handler: any
  let mockGetKeycloakDiscovery: any
  let mockGetRequestURL: any
  let mockSetCookie: any
  let mockSendRedirect: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // 🔥 config reset (public client by default)
    setKeycloakConfig({
      clientId: 'test-client',
    })

    const discoveryModule = await import('../src/runtime/utils/keycloakDiscovery')
    const h3 = await import('h3')
    const handlerModule = await import('../src/runtime/server/api/_oidc/login.get')

    handler = handlerModule.default

    mockGetKeycloakDiscovery = discoveryModule.getKeycloakDiscovery
    mockGetRequestURL = h3.getRequestURL
    mockSetCookie = h3.setCookie
    mockSendRedirect = h3.sendRedirect

    // --- setup mocks ---
    mockGetKeycloakDiscovery.mockResolvedValue({
      authorization_endpoint: 'https://keycloak.test/auth',
    })

    mockGetRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })
  })

  // ---------------------------------------------------------------------------
  // REDIRECT
  // ---------------------------------------------------------------------------
  it('redirects to keycloak with correct params', async () => {
    const event = {} as any

    await handler(event)

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
    const event = {} as any

    await handler(event)

    expect(mockSetCookie).toHaveBeenCalledTimes(2)

    const calls = mockSetCookie.mock.calls

    expect(calls[0][1]).toBe('kc_state')
    expect(calls[1][1]).toBe('kc_verifier')

    expect(calls[0][2]).toBeTruthy()
    expect(calls[1][2]).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // RANDOM STATE
  // ---------------------------------------------------------------------------
  it('generates different state values per request', async () => {
    const event = {} as any

    await handler(event)
    const firstState = mockSetCookie.mock.calls[0][2]

    vi.clearAllMocks()

    await handler(event)
    const secondState = mockSetCookie.mock.calls[0][2]

    expect(firstState).not.toEqual(secondState)
  })
})
