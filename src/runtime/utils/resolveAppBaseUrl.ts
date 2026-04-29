import type { H3Event } from 'h3'
import type { ResolvedModuleOptions } from '../../types'
import { getOrigin } from './getOrigin'

export function resolveAppBaseUrl(event: H3Event, config: ResolvedModuleOptions) {
  if (config.baseUrl) {
    return config.baseUrl
  }

  return getOrigin(event)
}
