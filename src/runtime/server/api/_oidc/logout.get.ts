import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'
import { type H3Event, deleteCookie, defineEventHandler, sendRedirect, getRequestURL } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../../../types'

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
  deleteCookie(event, 'kc_access')
  deleteCookie(event, 'kc_refresh')
  deleteCookie(event, 'redirect_to')
  deleteCookie(event, 'kc_state')
  deleteCookie(event, 'kc_verifier')
  deleteCookie(event, 'kc_code_used')

  const url = getRequestURL(event)

  // Build post-logout redirect URL (back to app root)
  const redirect = `${url.protocol}//${url.host}/`

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
