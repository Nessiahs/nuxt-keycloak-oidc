import type { ResolvedModuleOptions } from '../../types'

export function resolveCookieOptions(config: ResolvedModuleOptions, maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure: config.cookie.secure,
    path: config.cookie.path,
    domain: config.cookie.domain,
    ...(maxAge !== undefined && { maxAge }),
  }
}
