import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'
import { type H3Event, deleteCookie, defineEventHandler, sendRedirect } from 'h3'
import { COOKIE_NAMES } from '../../../constants/cookies'
import { resolveAppBaseUrl } from '../../../utils/resolveAppBaseUrl'
import { getKeycloakConfig } from '../../../utils/getKeycloakConfig'
import { resolveCookieOptions } from '../../../utils/resolveCookieOptions'

// Handles logout flow:
// - clears all local session cookies
// - optionally redirects to Keycloak end_session endpoint
// - falls back to local redirect if provider does not support logout
export default defineEventHandler(async (event: H3Event) => {
  const config = getKeycloakConfig()

  // Fetch OIDC discovery (to check logout support)
  const discovery = await getKeycloakDiscovery(config)
  const cookieOptions = resolveCookieOptions(config)

  // Clear all locally stored authentication/session cookies
  deleteCookie(event, COOKIE_NAMES.ACCESS, cookieOptions)
  deleteCookie(event, COOKIE_NAMES.REFRESH, cookieOptions)
  deleteCookie(event, COOKIE_NAMES.REDIRECT_TO, cookieOptions)
  deleteCookie(event, COOKIE_NAMES.STATE, cookieOptions)
  deleteCookie(event, COOKIE_NAMES.VERIFIER, cookieOptions)
  deleteCookie(event, COOKIE_NAMES.CODE_USED, cookieOptions)

  // Build post-logout redirect URL (back to app root)
  const redirect = resolveAppBaseUrl(event, config)

  // If provider does not support OIDC logout, fallback to local redirect
  if (!discovery.end_session_endpoint) {
    return sendRedirect(event, redirect)
  }
  const logoutUrl = new URL(discovery.end_session_endpoint)

  logoutUrl.search = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: redirect,
  }).toString()
  // Redirect user to Keycloak logout endpoint
  return sendRedirect(event, logoutUrl.toString())
})
