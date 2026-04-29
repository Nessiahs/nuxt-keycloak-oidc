import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'

import type { H3Event } from 'h3'
import {
  getQuery,
  getCookie,
  setCookie,
  deleteCookie,
  sendRedirect,
  setResponseStatus,
  defineEventHandler,
} from 'h3'

import type { KeycloakTokenResponse } from '../../../../types/keycloak.types'
import { COOKIE_NAMES } from '../../../constants/cookies'

import { resolveCookieOptions } from '../../../utils/resolveCookieOptions'
import { OIDC_ROUTES } from '../../../constants/path'
import { resolveAppBaseUrl } from '../../../utils/resolveAppBaseUrl'
import { setTokenCookie } from '../../../utils/tokenCookie'
import { getKeycloakConfig } from '../../../utils/getKeycloakConfig'

export default defineEventHandler(async (event: H3Event) => {
  const config = getKeycloakConfig()
  const discovery = await getKeycloakDiscovery(config)
  const query = getQuery(event)

  const code = query.code as string
  const state = query.state as string

  const storedState = getCookie(event, COOKIE_NAMES.STATE)
  const verifier = getCookie(event, COOKIE_NAMES.VERIFIER)

  if (!code || !state || !storedState || state !== storedState || !verifier) {
    return sendRedirect(event, OIDC_ROUTES.login)
  }

  const usedCode = getCookie(event, COOKIE_NAMES.CODE_USED)
  if (usedCode === code) {
    setResponseStatus(event, 204)
    return
  }

  setCookie(event, COOKIE_NAMES.CODE_USED, code, resolveCookieOptions(config, 6000))

  const redirectUri = new URL(OIDC_ROUTES.callback, resolveAppBaseUrl(event, config)).toString()

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret)
  }

  try {
    const token = await $fetch<KeycloakTokenResponse>(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    setTokenCookie(event, COOKIE_NAMES.ACCESS, token.access_token, config, token.expires_in)

    setTokenCookie(
      event,
      COOKIE_NAMES.REFRESH,
      token.refresh_token,
      config,
      token.refresh_expires_in,
    )

    deleteCookie(event, COOKIE_NAMES.STATE)
    deleteCookie(event, COOKIE_NAMES.VERIFIER)

    const userRedirectUri = getCookie(event, COOKIE_NAMES.REDIRECT_TO) ?? ''

    deleteCookie(event, COOKIE_NAMES.REDIRECT_TO)

    if (!userRedirectUri.startsWith('/')) {
      return sendRedirect(event, '/')
    }

    return sendRedirect(event, userRedirectUri)
  } catch {
    return sendRedirect(event, OIDC_ROUTES.login)
  }
})
