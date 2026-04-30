import type { H3Event } from 'h3'
import { setCookie, sendRedirect, defineEventHandler } from 'h3'
import crypto from 'node:crypto'
import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'
import { COOKIE_NAMES } from '../../../constants/cookies'
import { resolveCookieOptions } from '../../../utils/resolveCookieOptions'
import { OIDC_ROUTES } from '../../../constants/path'
import { resolveAppBaseUrl } from '../../../utils/resolveAppBaseUrl'
import { getKeycloakConfig } from '../../../utils/getKeycloakConfig'

// Initiates the Keycloak OAuth2/OIDC login flow.
// Generates PKCE values and state, stores them in secure cookies,
// and redirects the user to the Keycloak authorization endpoint.
export default defineEventHandler(async (event: H3Event) => {
  const config = getKeycloakConfig()

  // Basic config validation (helps during setup / debugging)
  if (!config.clientId) {
    throw new Error('[keycloak] Missing clientId in runtime config')
  }

  // Fetch OIDC discovery document (contains authorization endpoint)
  const discovery = await getKeycloakDiscovery(config)

  // Generate CSRF protection state (random, short-lived)
  const state = crypto.randomBytes(32).toString('hex')

  // Generate OIDC nonce to bind the ID token to this browser login attempt
  const nonce = crypto.randomBytes(32).toString('hex')

  // Generate PKCE verifier & challenge (RFC 7636)
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

  // Store state in secure, httpOnly cookie (prevents CSRF attacks)
  setCookie(event, COOKIE_NAMES.STATE, state, resolveCookieOptions(config, 300))

  // Store nonce for ID token validation during callback
  setCookie(event, COOKIE_NAMES.NONCE, nonce, resolveCookieOptions(config, 300))

  // Store PKCE verifier (used later during token exchange)
  setCookie(event, COOKIE_NAMES.VERIFIER, verifier, resolveCookieOptions(config, 300))

  // Prefer explicit baseUrl for production, fallback to request-derived origin.
  const baseUrl = resolveAppBaseUrl(event, config)
  const redirect = new URL(OIDC_ROUTES.callback, baseUrl).toString()

  // Build authorization request parameters
  const authParams = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    response_mode: 'query',
    redirect_uri: redirect,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  // Redirect user to Keycloak login
  return sendRedirect(event, `${discovery.authorization_endpoint}?${authParams.toString()}`)
})
