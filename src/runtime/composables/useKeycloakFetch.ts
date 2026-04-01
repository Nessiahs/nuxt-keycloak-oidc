import { type UseFetchOptions, useFetch } from '#app'
import type { FetchContext } from 'ofetch'
import { OIDC_BASE_PATH } from '../constants/path'

export const useFetchApi = (url: string, options?: UseFetchOptions<object>) => {
  return useFetch(url, {
    ...options,

    onResponseError(ctx: FetchContext) {
      if (ctx.response?.status === 401) {
        if (import.meta.client) {
          window.location.href = `${{ OIDC_BASE_PATH }}login`
        }
      }
    },
  })
}
