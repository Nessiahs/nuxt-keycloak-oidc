import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { FetchContext, FetchResponse } from 'ofetch'

type ResponseErrorContext = FetchContext<unknown> & {
  response: FetchResponse<unknown>
}

const { mockNavigateTo, mockUseFetch } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockUseFetch: vi.fn(),
}))

vi.mock('#app', () => ({
  navigateTo: mockNavigateTo,
  useFetch: mockUseFetch,
}))

function responseErrorContext(status: number, request = '/api/private'): ResponseErrorContext {
  return {
    request,
    options: {
      headers: new Headers(),
    },
    response: {
      status,
    } as FetchResponse<unknown>,
  } as ResponseErrorContext
}

describe('useKeycloakFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFetch.mockReturnValue({
      data: null,
      pending: false,
      error: null,
    })
  })

  it('wraps Nuxt useFetch and preserves the return shape', async () => {
    const { useKeycloakFetch } = await import('../src/runtime/composables/useKeycloakFetch')

    const result = useKeycloakFetch('/api/private')

    expect(result).toEqual({
      data: null,
      pending: false,
      error: null,
    })
    expect(mockUseFetch).toHaveBeenCalledWith('/api/private', {
      onResponseError: expect.any(Function),
    })
  })

  it('passes reactive requests and caller options to useFetch', async () => {
    const { useKeycloakFetch } = await import('../src/runtime/composables/useKeycloakFetch')
    const request = ref('/api/private')
    const options = {
      key: 'private-data',
      query: {
        page: ref(1),
      },
      watch: [request],
    }

    useKeycloakFetch(request, options)

    expect(mockUseFetch).toHaveBeenCalledWith(request, {
      ...options,
      onResponseError: expect.any(Function),
    })
  })

  it('calls custom response error handlers from the wrapped useFetch options for non-auth errors', async () => {
    const customHandler = vi.fn()
    const { useKeycloakFetch } = await import('../src/runtime/composables/useKeycloakFetch')

    useKeycloakFetch('/api/private', {
      onResponseError: customHandler,
    })

    const [, options] = mockUseFetch.mock.calls[0]
    await options.onResponseError(responseErrorContext(403))

    expect(customHandler).toHaveBeenCalled()
  })

  it('does not redirect non-401 responses', async () => {
    const { handleKeycloakFetchResponseError } =
      await import('../src/runtime/composables/useKeycloakFetch')

    await handleKeycloakFetchResponseError(responseErrorContext(403))

    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('does not redirect server-side 401 responses', async () => {
    const { handleKeycloakFetchResponseError } =
      await import('../src/runtime/composables/useKeycloakFetch')

    await handleKeycloakFetchResponseError(responseErrorContext(401))

    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('identifies relative and same-origin app requests as internal keycloak fetch requests', async () => {
    const { isInternalKeycloakFetchRequest } =
      await import('../src/runtime/composables/useKeycloakFetch')
    const origin = 'https://app.example.test'

    expect(isInternalKeycloakFetchRequest('/api/private', undefined, origin)).toBe(true)
    expect(isInternalKeycloakFetchRequest('api/private', undefined, origin)).toBe(true)
    expect(isInternalKeycloakFetchRequest('/dashboard', undefined, origin)).toBe(true)
    expect(
      isInternalKeycloakFetchRequest('https://app.example.test/api/private', undefined, origin),
    ).toBe(true)
    expect(
      isInternalKeycloakFetchRequest('//app.example.test/api/private', undefined, origin),
    ).toBe(true)
    expect(isInternalKeycloakFetchRequest('/private', 'https://app.example.test/api', origin)).toBe(
      true,
    )
    expect(isInternalKeycloakFetchRequest('/private', '/api', origin)).toBe(true)
    expect(isInternalKeycloakFetchRequest('/api/private', '', origin)).toBe(true)
    expect(isInternalKeycloakFetchRequest('/api/private', '   ', origin)).toBe(true)
    expect(isInternalKeycloakFetchRequest('/api/private', undefined, '')).toBe(false)
    expect(isInternalKeycloakFetchRequest('/api/private', undefined, '   ')).toBe(false)
    expect(isInternalKeycloakFetchRequest('//api.example.test/private', undefined, origin)).toBe(
      false,
    )
    expect(
      isInternalKeycloakFetchRequest('https://api.example.test/private', undefined, origin),
    ).toBe(false)
    expect(isInternalKeycloakFetchRequest('/private', 'https://api.example.test', origin)).toBe(
      false,
    )
    expect(
      isInternalKeycloakFetchRequest(
        new Request('https://app.example.test/private'),
        undefined,
        origin,
      ),
    ).toBe(false)
  })
})
