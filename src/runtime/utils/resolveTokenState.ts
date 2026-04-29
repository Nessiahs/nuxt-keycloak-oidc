import type { H3Event } from 'h3'
import type { TokenValidationResult } from './validateToken'
import { validateToken } from './validateToken'
import type { KeycloakJwtToken } from '../../types/keycloak.types'
import { COOKIE_NAMES } from '../constants/cookies'
import { getTokenCookie } from './tokenCookie'
import { getKeycloakConfig } from './getKeycloakConfig'

type TokenState = {
  hasAccess: boolean
  hasRefresh: boolean
  accessCookie?: string
  refreshCookie?: string
  accessPayload?: KeycloakJwtToken
}

type RefreshTokenState = {
  hasRefresh: boolean
  refreshCookie?: string
  refreshPayload?: KeycloakJwtToken
}

// Shared fallback result to avoid unnecessary async calls
// when no token is present
const invalidResult: TokenValidationResult = {
  valid: false,
  payload: undefined,
}

export async function resolveTokenState(event: H3Event): Promise<TokenState> {
  const config = getKeycloakConfig()

  // Read cookies from request
  const accessCookie = getTokenCookie(event, COOKIE_NAMES.ACCESS, config)
  const refreshCookie = getTokenCookie(event, COOKIE_NAMES.REFRESH, config)

  // Validate only the access token on the request fast path.
  // Refresh tokens are validated by Keycloak only when a refresh is actually needed.
  const accessResult = accessCookie ? await validateToken(accessCookie) : invalidResult

  return {
    // Boolean flags for quick checks in middleware
    hasAccess: accessResult.valid,
    hasRefresh: Boolean(refreshCookie),

    // Expose raw cookies (used later for refresh / context)
    accessCookie,
    refreshCookie,

    // Only expose payload if token is valid
    // → prevents usage of stale or invalid token data
    accessPayload: accessResult.valid ? accessResult.payload : undefined,
  }
}

export async function resolveRefreshTokenState(event: H3Event): Promise<RefreshTokenState> {
  const config = getKeycloakConfig()
  const refreshCookie = getTokenCookie(event, COOKIE_NAMES.REFRESH, config)
  const refreshResult = refreshCookie ? await validateToken(refreshCookie) : invalidResult

  return {
    hasRefresh: refreshResult.valid,
    refreshCookie,
    refreshPayload: refreshResult.valid ? refreshResult.payload : undefined,
  }
}
