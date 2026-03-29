import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks ---
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    keycloak: {
      clientId: 'test-client',
      clientSecret: 'secret',
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

// mock fetch
const mockFetch = vi.fn()
global.$fetch = mockFetch as any

describe('auth callback handler', () => {
  let handler: any
  let h3: any
  let discoveryModule: any

  beforeEach(async () => {
    vi.clearAllMocks()

    discoveryModule = await import('../src/runtime/utils/keycloakDiscovery')
    h3 = await import('h3')

    const handlerModule = await import('../src/runtime/server/api/_oicd/callback.get')

    handler = handlerModule.default

    // default mocks
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

  it('exchanges code and sets tokens', async () => {
    global.$fetch.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })

    const event = {} as any

    await handler(event)

    expect(global.$fetch).toHaveBeenCalled()

    expect(h3.setCookie).toHaveBeenCalledWith(event, 'kc_access', 'access', expect.any(Object))

    expect(h3.setCookie).toHaveBeenCalledWith(event, 'kc_refresh', 'refresh', expect.any(Object))

    expect(h3.sendRedirect).toHaveBeenCalled()
  })

  it('rejects invalid state', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'wrong'
      if (name === 'kc_verifier') return 'verifier'
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  it('rejects missing verifier', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'state123'
      return undefined
    })

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  it('prevents replay of used code', async () => {
    h3.getCookie.mockImplementation((_, name) => {
      if (name === 'kc_state') return 'state123'
      if (name === 'kc_verifier') return 'verifier123'
      if (name === 'kc_code_used') return 'abc'
    })

    const event = {} as any

    await handler(event)

    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 204)
    expect(global.$fetch).not.toHaveBeenCalled()
  })

  it('handles token exchange failure', async () => {
    global.$fetch.mockRejectedValue(new Error('fail'))

    const event = {} as any

    await handler(event)

    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/api/auth/login')
  })

  it('prevents open redirect', async () => {
    global.$fetch.mockResolvedValue({
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

  it('redirects to original path when valid', async () => {
    global.$fetch.mockResolvedValue({
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
