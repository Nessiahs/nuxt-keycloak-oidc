import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
import { OIDC_ROUTES } from '../src/runtime/constants/path'
import { unsealTokenCookie } from '../src/runtime/utils/tokenCookie'

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
    getHeaders: vi.fn(),
    defineEventHandler: (fn: any) => fn,
  }
})

describe('auth callback handler', () => {
  let handler: any
  let h3: any
  let discoveryModule: any

  beforeEach(async () => {
    vi.clearAllMocks()

    setKeycloakConfig({
      clientId: 'test-client',
      clientSecret: 'secret',
      cookie: {
        sameSite: 'lax',
        path: '/',
      },
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

    h3.getCookie.mockImplementation((_: unknown, name: string) => {
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
    h3.getHeaders.mockReturnValue({})
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

  it('seals token cookies when cookieSecret is configured', async () => {
    setKeycloakConfig({
      clientId: 'test-client',
      clientSecret: 'secret',
      cookieSecret: 'shared-secret',
      cookie: {
        sameSite: 'lax',
        path: '/',
      },
    })

    mockFetch.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    const event = {} as any

    await handler(event)

    const accessCookie = h3.setCookie.mock.calls.find((call: any[]) => call[1] === 'kc_access')
    const refreshCookie = h3.setCookie.mock.calls.find((call: any[]) => call[1] === 'kc_refresh')

    expect(accessCookie[2]).not.toBe('access')
    expect(refreshCookie[2]).not.toBe('refresh')
    expect(unsealTokenCookie(accessCookie[2], 'shared-secret')).toBe('access')
    expect(unsealTokenCookie(refreshCookie[2], 'shared-secret')).toBe('refresh')
  })

  it('uses the callback redirect_uri in the token exchange', async () => {
    mockFetch.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    await handler({} as any)

    const body = mockFetch.mock.calls[0][1].body as URLSearchParams

    expect(body.get('redirect_uri')).toBe('https://example.com/api/_oidc/callback')
  })

  it('uses configured baseUrl for the token exchange redirect_uri', async () => {
    setKeycloakConfig({
      clientId: 'test-client',
      clientSecret: 'secret',
      baseUrl: 'https://app.example.test',
      cookie: {
        sameSite: 'lax',
        path: '/',
      },
    })

    mockFetch.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    await handler({} as any)

    const body = mockFetch.mock.calls[0][1].body as URLSearchParams

    expect(body.get('redirect_uri')).toBe('https://app.example.test/api/_oidc/callback')
  })

  // ---------------------------------------------------------------------------
  // INVALID STATE
  // ---------------------------------------------------------------------------
  it('rejects invalid state', async () => {
    h3.getCookie.mockImplementation((_: unknown, name: string) => {
      if (name === 'kc_state') return 'wrong'
      if (name === 'kc_verifier') return 'verifier'
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, OIDC_ROUTES.login)
  })

  // ---------------------------------------------------------------------------
  // MISSING VERIFIER
  // ---------------------------------------------------------------------------
  it('rejects missing verifier', async () => {
    h3.getCookie.mockImplementation((_: unknown, name: string) => {
      if (name === 'kc_state') return 'state123'
      return undefined
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, OIDC_ROUTES.login)
  })

  // ---------------------------------------------------------------------------
  // REPLAY PROTECTION
  // ---------------------------------------------------------------------------
  it('prevents replay of used code', async () => {
    h3.getCookie.mockImplementation((_: unknown, name: string) => {
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

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, OIDC_ROUTES.login)
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

    h3.getCookie.mockImplementation((_: unknown, name: string) => {
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

    h3.getCookie.mockImplementation((_: unknown, name: string) => {
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
