import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import type { TokenValidationResult } from './validateToken'
import { validateToken } from './validateToken'
import type { KeycloakJwtToken } from '../../types/keycloak.types'

type TokenState = {
  hasAccess: boolean
  hasRefresh: boolean
  accessCookie?: string
  refreshCookie?: string
  accessPayload?: KeycloakJwtToken
  refreshPayload?: KeycloakJwtToken
}

// Shared fallback result to avoid unnecessary async calls
// when no token is present
const invalidResult: TokenValidationResult = {
  valid: false,
  payload: undefined,
}

export async function resolveTokenState(event: H3Event): Promise<TokenState> {
  // Read cookies from request
  const accessCookie = getCookie(event, 'kc_access')
  const refreshCookie = getCookie(event, 'kc_refresh')

  // Validate tokens in parallel for better performance
  // If no cookie is present, use a static invalid result
  const [accessResult, refreshResult] = await Promise.all([
    accessCookie ? validateToken(accessCookie) : invalidResult,
    refreshCookie ? validateToken(refreshCookie) : invalidResult,
  ])

  return {
    // Boolean flags for quick checks in middleware
    hasAccess: accessResult.valid,
    hasRefresh: refreshResult.valid,

    // Expose raw cookies (used later for refresh / context)
    accessCookie,
    refreshCookie,

    // Only expose payload if token is valid
    // → prevents usage of stale or invalid token data
    accessPayload: accessResult.valid ? accessResult.payload : undefined,
    refreshPayload: refreshResult.valid ? refreshResult.payload : undefined,
  }
}
