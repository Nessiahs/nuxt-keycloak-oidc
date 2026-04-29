import { getHeaders, getRequestURL, type H3Event } from 'h3'
import type { ResolvedModuleOptions } from '../../types'

export function resolveAppBaseUrl(event: H3Event, config: ResolvedModuleOptions) {
  if (config.baseUrl) {
    return config.baseUrl
  }

  const headers = getHeaders(event)
  const url = getRequestURL(event)

  const protocol = headers['x-forwarded-proto'] || url.protocol.replace(':', '')
  const host = headers['x-forwarded-host'] || url.host

  return `${protocol}://${host}`
}
