import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'

// --- HOISTED MOCKS ---
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal('$fetch', mockFetch)

// --- MODULE MOCKS ---
vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<any>('h3')
  return {
    ...actual,
    getQuery: vi.fn(),
    getCookie: vi.fn(),
    setCookie: vi.fn(),
    deleteCookie: vi.fn(),
    sendRedirect: vi.fn(),
    setResponseStatus: vi.fn(),
    getRequestURL: vi.fn(),
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth callback handler', () => {
  let handler: any
  let h3: any
  let discoveryModule: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // 🔥 config reset (default public client)
    setKeycloakConfig({
      clientId: 'test-client',
      clientSecret: 'secret', // optional → hier bewusst gesetzt
    })

    discoveryModule = await import('../src/runtime/utils/keycloakDiscovery')
    h3 = await import('h3')

    const handlerModule = await import('../src/runtime/server/api/_oidc/callback.get')
    handler = handlerModule.default

    // --- defaults ---
    discoveryModule.getKeycloakDiscovery.mockResolvedValue({
      token_endpoint: 'https://keycloak.test/token',
    })

    h3.getQuery.mockReturnValue({
      code: 'abc',
      state: 'state123',
    })

    h3.getCookie.mockImplementation((_, name) => {
      const cookies: Record<string, string> = {
        kc_state: 'state123',
        kc_verifier: 'verifier123',
      }
      return cookies[name]
    })

    h3.getRequestURL.mockReturnValue({
      protocol: 'https:',
      host: 'example.com',
    })
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('exchanges code and sets tokens', async () => {
    mockFetch.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    const event = {} as any

    await handler(event)

    expect(mockFetch).toHaveBeenCalled()

    expect(h3.setCookie).toHaveBeenCalledWith(event, 'kc_access', 'access', expect.any(Object))

    expect(h3.setCookie).toHaveBeenCalledWith(event, 'kc_refresh', 'refresh', expect.any(Object))

    expect(h3.sendRedirect).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // INVALID STATE
  // ---------------------------------------------------------------------------
  it('rejects invalid state', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'wrong'
      if (name === 'kc_verifier') return 'verifier'
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  // ---------------------------------------------------------------------------
  // MISSING VERIFIER
  // ---------------------------------------------------------------------------
  it('rejects missing verifier', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'state123'
      return undefined
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  // ---------------------------------------------------------------------------
  // REPLAY PROTECTION
  // ---------------------------------------------------------------------------
  it('prevents replay of used code', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'state123'
      if (name === 'kc_verifier') return 'verifier123'
      if (name === 'kc_code_used') return 'abc'
    })

    const event = {} as any

    await handler(event)

    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 204)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // FETCH FAILURE
  // ---------------------------------------------------------------------------
  it('handles token exchange failure', async () => {
    mockFetch.mockRejectedValue(new Error('fail'))

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  // ---------------------------------------------------------------------------
  // OPEN REDIRECT PROTECTION
  // ---------------------------------------------------------------------------
  it('prevents open redirect', async () => {
    mockFetch.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    h3.getCookie.mockImplementation((_, name) => {
      const cookies: Record<string, string> = {
        kc_state: 'state123',
        kc_verifier: 'verifier123',
        redirect_to: 'https://evil.com',
      }
      return cookies[name]
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/')
  })

  // ---------------------------------------------------------------------------
  // VALID REDIRECT
  // ---------------------------------------------------------------------------
  it('redirects to original path when valid', async () => {
    mockFetch.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    h3.getCookie.mockImplementation((_, name) => {
      const cookies: Record<string, string> = {
        kc_state: 'state123',
        kc_verifier: 'verifier123',
        redirect_to: '/dashboard',
      }
      return cookies[name]
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/dashboard')
  })
})
