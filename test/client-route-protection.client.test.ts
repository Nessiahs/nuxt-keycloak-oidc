import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HEADER_NAMES } from '../src/runtime/constants/headers'
import { OIDC_ROUTES } from '../src/runtime/constants/path'

const {
  mockAddRouteMiddleware,
  mockDefineNuxtRouteMiddleware,
  mockGetRouteRules,
  mockNavigateTo,
  mockUseRuntimeConfig,
  mockFetch,
} = vi.hoisted(() => ({
  mockAddRouteMiddleware: vi.fn(),
  mockDefineNuxtRouteMiddleware: vi.fn((handler) => handler),
  mockGetRouteRules: vi.fn(),
  mockNavigateTo: vi.fn(),
  mockUseRuntimeConfig: vi.fn(),
  mockFetch: vi.fn(),
}))

vi.mock('#app', () => ({
  addRouteMiddleware: mockAddRouteMiddleware,
  defineNuxtRouteMiddleware: mockDefineNuxtRouteMiddleware,
  getRouteRules: mockGetRouteRules,
  navigateTo: mockNavigateTo,
  useRuntimeConfig: mockUseRuntimeConfig,
}))

vi.stubGlobal('$fetch', mockFetch)

async function registerMiddleware() {
  vi.resetModules()
  await import('../src/runtime/client-route-protection.client')

  return mockAddRouteMiddleware.mock.calls[0][1] as (to: {
    path: string
    fullPath?: string
  }) => Promise<unknown>
}

describe('client route protection plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRuntimeConfig.mockReturnValue({
      public: {
        keycloak: {
          mode: 'protect-all',
        },
      },
    })
    mockGetRouteRules.mockReturnValue({})
    mockFetch.mockResolvedValue({
      authenticated: true,
      user: {
        sub: 'user',
      },
    })
  })

  it('registers a global route middleware', async () => {
    await registerMiddleware()

    expect(mockAddRouteMiddleware).toHaveBeenCalledWith(
      'keycloak-client-route-protection',
      expect.any(Function),
      { global: true },
    )
  })

  it('allows public routes without calling the session endpoint', async () => {
    mockGetRouteRules.mockReturnValue({
      keycloak: false,
    })
    const middleware = await registerMiddleware()

    await middleware({ path: '/public' })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('checks the session endpoint for protected routes', async () => {
    const middleware = await registerMiddleware()

    await middleware({ path: '/dashboard' })

    expect(mockGetRouteRules).toHaveBeenCalledWith({ path: '/dashboard' })
    expect(mockFetch).toHaveBeenCalledWith(OIDC_ROUTES.session, {
      credentials: 'include',
      headers: {
        [HEADER_NAMES.CLIENT_ROUTE]: '/dashboard',
      },
    })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('sends the full target route so login can preserve query and hash', async () => {
    const middleware = await registerMiddleware()

    await middleware({
      path: '/dashboard',
      fullPath: '/dashboard?tab=profile#security',
    })

    expect(mockFetch).toHaveBeenCalledWith(OIDC_ROUTES.session, {
      credentials: 'include',
      headers: {
        [HEADER_NAMES.CLIENT_ROUTE]: '/dashboard?tab=profile#security',
      },
    })
  })

  it('redirects unauthenticated protected navigation to login', async () => {
    mockFetch.mockResolvedValue({
      authenticated: false,
      user: null,
    })
    const middleware = await registerMiddleware()

    await middleware({ path: '/dashboard' })

    expect(mockNavigateTo).toHaveBeenCalledWith(OIDC_ROUTES.login, { external: true })
  })

  it('redirects to login when the session check fails', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const middleware = await registerMiddleware()

    await middleware({ path: '/dashboard' })

    expect(mockNavigateTo).toHaveBeenCalledWith(OIDC_ROUTES.login, { external: true })
  })

  it('respects protect-selected mode', async () => {
    mockUseRuntimeConfig.mockReturnValue({
      public: {
        keycloak: {
          mode: 'protect-selected',
        },
      },
    })
    mockGetRouteRules.mockReturnValueOnce({}).mockReturnValueOnce({
      keycloak: true,
    })
    const middleware = await registerMiddleware()

    await middleware({ path: '/dashboard' })
    await middleware({ path: '/admin' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(OIDC_ROUTES.session, {
      credentials: 'include',
      headers: {
        [HEADER_NAMES.CLIENT_ROUTE]: '/admin',
      },
    })
  })
})
