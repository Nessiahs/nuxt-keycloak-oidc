import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
// --- mocks ---
vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<any>('h3')
  return {
    ...actual,
    deleteCookie: vi.fn(),
    sendRedirect: vi.fn(),
    getRequestURL: vi.fn(),
    getHeaders: vi.fn(),
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth logout handler', () => {
  let handler: any
  let h3: any
  let discoveryModule: any

  beforeEach(async () => {
    vi.clearAllMocks()

    discoveryModule = await import('../src/runtime/utils/keycloakDiscovery')
    setKeycloakConfig({
      clientId: 'test-client',
    })
    h3 = await import('h3')

    const handlerModule = await import('../src/runtime/server/api/_oidc/logout.get')

    handler = handlerModule.default

    h3.getRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })
    h3.getHeaders.mockReturnValue({})
  })

  // ---------------------------------------------------------------------------
  // COOKIE CLEANUP
  // ---------------------------------------------------------------------------
  it('clears all auth-related cookies', async () => {
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({})

    const event = {} as any

    await handler(event)

    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_access')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_refresh')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'redirect_to')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_state')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_verifier')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_code_used')
  })

  // ---------------------------------------------------------------------------
  // LOCAL REDIRECT
  // ---------------------------------------------------------------------------
  it('redirects locally if no end_session_endpoint exists', async () => {
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({})

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, 'https://example.com/')
  })

  it('uses configured baseUrl for local logout redirect', async () => {
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({})
    setKeycloakConfig({
      clientId: 'test-client',
      baseUrl: 'https://app.example.test',
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, 'https://app.example.test/')
  })

  // ---------------------------------------------------------------------------
  // KEYCLOAK LOGOUT
  // ---------------------------------------------------------------------------
  it('redirects to Keycloak logout endpoint when available', async () => {
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({
      end_session_endpoint: 'https://keycloak.test/logout',
    })

    const event = {} as any

    await handler(event)

    const redirectUrl = h3.sendRedirect.mock.calls[0][1]

    expect(redirectUrl).toContain('https://keycloak.test/logout')
    expect(redirectUrl).toContain('client_id=test-client')
    expect(redirectUrl).toContain('post_logout_redirect_uri=https%3A%2F%2Fexample.com%2F')
  })

  it('uses configured baseUrl for Keycloak post logout redirect', async () => {
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({
      end_session_endpoint: 'https://keycloak.test/logout',
    })
    setKeycloakConfig({
      clientId: 'test-client',
      baseUrl: 'https://app.example.test',
    })

    const event = {} as any

    await handler(event)

    const redirectUrl = h3.sendRedirect.mock.calls[0][1]

    expect(redirectUrl).toContain('post_logout_redirect_uri=https%3A%2F%2Fapp.example.test%2F')
  })
})
