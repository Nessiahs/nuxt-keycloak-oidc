import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { OIDC_ROUTES } from '../src/runtime/constants/path'

const { mockNavigateTo, mockUseFetch, mockRefresh } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockUseFetch: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.mock('#app', () => ({
  navigateTo: mockNavigateTo,
  useFetch: mockUseFetch,
}))

describe('useKeycloakAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefresh.mockResolvedValue(undefined)
  })

  it('exposes authenticated status and user from the session endpoint', async () => {
    mockUseFetch.mockReturnValue({
      data: ref({
        authenticated: true,
        user: {
          sub: 'user-id',
          email: 'user@example.test',
        },
      }),
      pending: ref(false),
      refresh: mockRefresh,
    })

    const { useKeycloakAuth } = await import('../src/runtime/composables/useKeycloakAuth')
    const auth = useKeycloakAuth()

    expect(mockUseFetch).toHaveBeenCalledWith(OIDC_ROUTES.session)
    expect(auth.status.value).toBe('authenticated')
    expect(auth.user.value).toEqual({
      sub: 'user-id',
      email: 'user@example.test',
    })
  })

  it('exposes loading status while the session request is pending', async () => {
    mockUseFetch.mockReturnValue({
      data: ref({
        authenticated: false,
        user: null,
      }),
      pending: ref(true),
      refresh: mockRefresh,
    })

    const { useKeycloakAuth } = await import('../src/runtime/composables/useKeycloakAuth')
    const auth = useKeycloakAuth()

    expect(auth.status.value).toBe('loading')
    expect(auth.user.value).toBeNull()
  })

  it('exposes unauthenticated status when the session is not authenticated', async () => {
    mockUseFetch.mockReturnValue({
      data: ref({
        authenticated: false,
        user: null,
      }),
      pending: ref(false),
      refresh: mockRefresh,
    })

    const { useKeycloakAuth } = await import('../src/runtime/composables/useKeycloakAuth')
    const auth = useKeycloakAuth()

    expect(auth.status.value).toBe('unauthenticated')
    expect(auth.user.value).toBeNull()
  })

  it('redirects to the existing login and logout routes', async () => {
    mockUseFetch.mockReturnValue({
      data: ref({
        authenticated: false,
        user: null,
      }),
      pending: ref(false),
      refresh: mockRefresh,
    })

    const { useKeycloakAuth } = await import('../src/runtime/composables/useKeycloakAuth')
    const auth = useKeycloakAuth()

    auth.login()
    auth.logout()

    expect(mockNavigateTo).toHaveBeenCalledWith(OIDC_ROUTES.login, { external: true })
    expect(mockNavigateTo).toHaveBeenCalledWith(OIDC_ROUTES.logout, { external: true })
  })

  it('exposes the session refresh function', async () => {
    mockUseFetch.mockReturnValue({
      data: ref({
        authenticated: false,
        user: null,
      }),
      pending: ref(false),
      refresh: mockRefresh,
    })

    const { useKeycloakAuth } = await import('../src/runtime/composables/useKeycloakAuth')
    const auth = useKeycloakAuth()

    await auth.refresh()

    expect(mockRefresh).toHaveBeenCalled()
  })
})
