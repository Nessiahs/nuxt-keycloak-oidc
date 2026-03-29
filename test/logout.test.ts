import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getKeycloakDiscovery } from '../src/runtime/utils/keycloakDiscovery'

// --- mocks ---
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    keycloak: {
      clientId: 'test-client',
    },
  }),
}))

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
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth logout handler', () => {
  let handler: any
  let h3: any

  // 👉 sauberer Zugriff auf den Mock
  const mockGetKeycloakDiscovery = vi.mocked(getKeycloakDiscovery)

  beforeEach(async () => {
    vi.clearAllMocks()

    h3 = await import('h3')

    const handlerModule = await import('../src/runtime/server/api/_oicd/logout.get')

    handler = handlerModule.default

    h3.getRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })
  })

  it('clears all auth-related cookies', async () => {
    mockGetKeycloakDiscovery.mockResolvedValue({} as any)

    const event = {} as any

    await handler(event)

    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_access')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_refresh')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'redirect_to')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_state')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_verifier')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'kc_code_used')
  })

  it('redirects locally if no end_session_endpoint exists', async () => {
    mockGetKeycloakDiscovery.mockResolvedValue({} as any)

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, 'https://example.com/')
  })

  it('redirects to Keycloak logout endpoint when available', async () => {
    mockGetKeycloakDiscovery.mockResolvedValue({
      end_session_endpoint: 'https://keycloak.test/logout',
    } as any)

    const event = {} as any

    await handler(event)

    const redirectUrl = h3.sendRedirect.mock.calls[0][1]

    expect(redirectUrl).toContain('https://keycloak.test/logout')
    expect(redirectUrl).toContain('client_id=test-client')
    expect(redirectUrl).toContain('post_logout_redirect_uri=https%3A%2F%2Fexample.com%2F')
  })
})
