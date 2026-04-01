import { attachAuthContext } from '../../utils/attachAuthContext'
import { useRuntimeConfig } from '#imports'
import { getRequestURL, defineEventHandler, createError } from 'h3'
import type { ResolvedModuleOptions } from '../../../types'
import { resolveAuthAction } from '../../utils/resolveAuthAction'
import { resolveTokenState } from '../../utils/resolveTokenState'
import { handleRefreshFlow } from '../../utils/handleRefreshFlow'
import { handleUnauthorized } from '../../utils/handleUnauthorized'
import { OIDC_BASE_PATH } from '../../constants/path'

// Global authentication middleware for protecting routes.
// Handles:
// - route protection rules
// - access token validation
// - token refresh flow
// - attaching auth context to the request
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Skip internal OIDC endpoints (login, callback, etc.)
  // to avoid infinite redirect loops
  if (url.pathname.startsWith(OIDC_BASE_PATH)) {
    return
  }

  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  // Route rules (Nuxt routeRules integration)
  const rules = event.context.routeRules || {}

  // Determine whether the route is protected and what action to take
  const check = resolveAuthAction({
    rules,
    mode: config.mode,
    accept: event.node.req.headers['accept'],
  })

  // Fast path: route is public or explicitly allowed
  switch (check.action) {
    case 'allow':
      return

    // API request without auth → return 401 immediately
    case 'unauthorized':
      throw createError({ statusCode: 401 })
  }

  // Resolve current token state (access + refresh)
  const { hasAccess, hasRefresh, accessPayload } = await resolveTokenState(event)

  // No valid access token → force re-authentication
  if (!hasAccess || !accessPayload?.exp) {
    return handleUnauthorized(event, check.isHtmlRequest)
  }

  // Calculate expiration time (JWT exp is in seconds)
  const expiresAt = accessPayload.exp * 1000

  // Trigger refresh slightly before expiry (30s buffer)
  const isExpiringSoon = expiresAt - Date.now() < 30_000

  // Fast path: valid token and not expiring soon
  if (!isExpiringSoon) {
    await attachAuthContext(event, accessPayload)
    return
  }

  // Attempt token refresh if refresh token is available
  if (hasRefresh) {
    const success = await handleRefreshFlow(event, check.isHtmlRequest, config)

    if (success) return

    // Refresh failed → fallback to full re-authentication
    return handleUnauthorized(event, check.isHtmlRequest)
  }

  // No usable refresh token → force login
  return handleUnauthorized(event, check.isHtmlRequest)
})
