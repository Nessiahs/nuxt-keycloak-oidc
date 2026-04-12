import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'
import { type H3Event, deleteCookie, defineEventHandler, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../../../types'
import { COOKIE_NAMES } from '../../../constants/cookies'
import { getOrigin } from '../../../utils/getOrigin'

// Handles logout flow:
// - clears all local session cookies
// - optionally redirects to Keycloak end_session endpoint
// - falls back to local redirect if provider does not support logout
export default defineEventHandler(async (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  // Fetch OIDC discovery (to check logout support)
  const discovery = await getKeycloakDiscovery(config)

  // Clear all locally stored authentication/session cookies
  deleteCookie(event, COOKIE_NAMES.ACCESS)
  deleteCookie(event, COOKIE_NAMES.REFRESH)
  deleteCookie(event, COOKIE_NAMES.REDIRECT_TO)
  deleteCookie(event, COOKIE_NAMES.STATE)
  deleteCookie(event, COOKIE_NAMES.VERIFIER)
  deleteCookie(event, COOKIE_NAMES.CODE_USED)

  // Build post-logout redirect URL (back to app root)
  const redirect = getOrigin(event)

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
