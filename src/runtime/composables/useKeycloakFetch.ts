import { type UseFetchOptions, useFetch } from '#app'
import type { FetchContext } from 'ofetch'
import { OIDC_ROUTES } from '../constants/path'
import { navigateTo } from '#app'

export const useFetchApi = (url: string, options?: UseFetchOptions<object>) => {
  return useFetch(url, {
    ...options,

    onResponseError(ctx: FetchContext) {
      if (ctx.response?.status === 401 && import.meta.client) {
        navigateTo(OIDC_ROUTES.login, { external: true })
      }
    },
  })
}
