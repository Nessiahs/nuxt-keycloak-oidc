import { navigateTo, useFetch } from '#app'
import type { FetchError } from 'ofetch'
import { OIDC_ROUTES } from '../constants/path'

type UseFetchParameters = Parameters<typeof useFetch<unknown, FetchError>>
type UseFetchOptions = NonNullable<UseFetchParameters[1]>
type ResponseErrorContext = Parameters<NonNullable<UseFetchOptions['onResponseError']>>[0]
type ResponseErrorHandler = NonNullable<UseFetchOptions['onResponseError']>

function toHandlers(handler?: ResponseErrorHandler): ResponseErrorHandler[] {
  if (!handler) {
    return []
  }

  return (Array.isArray(handler) ? handler : [handler]) as ResponseErrorHandler[]
}

function resolveCurrentOrigin(origin?: string): string | undefined {
  const trimmedOrigin = origin?.trim()
  const browserOrigin =
    typeof globalThis.location === 'undefined' ? undefined : globalThis.location.origin

  return trimmedOrigin === '' ? browserOrigin : (trimmedOrigin ?? browserOrigin)
}

export function isInternalKeycloakFetchRequest(
  request: unknown,
  baseURL?: string,
  origin?: string,
): boolean {
  const normalizedOrigin = resolveCurrentOrigin(origin)

  if (typeof request !== 'string' || !normalizedOrigin) {
    return false
  }

  try {
    const appOrigin = new URL(normalizedOrigin).origin
    const normalizedBaseURL = baseURL?.trim()
    const urlBase = normalizedBaseURL ? new URL(normalizedBaseURL, appOrigin).toString() : appOrigin
    const url = new URL(request, urlBase)

    return url.origin === appOrigin
  } catch {
    return false
  }
}

export async function handleKeycloakFetchResponseError(
  context: ResponseErrorContext,
  handler?: ResponseErrorHandler,
) {
  if (
    import.meta.client &&
    context.response.status === 401 &&
    isInternalKeycloakFetchRequest(context.request, context.options.baseURL)
  ) {
    await navigateTo(OIDC_ROUTES.login, { external: true })
    return
  }

  for (const customHandler of toHandlers(handler)) {
    await customHandler(context)
  }
}

export function useKeycloakFetch(
  request: UseFetchParameters[0],
  options?: UseFetchParameters[1],
): ReturnType<typeof useFetch<unknown, FetchError>> {
  const onResponseError = options?.onResponseError

  return useFetch<unknown, FetchError>(request, {
    ...options,
    onResponseError: (context) => handleKeycloakFetchResponseError(context, onResponseError),
  })
}
