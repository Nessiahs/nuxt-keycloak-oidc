import { getKeycloakDiscovery } from '../../../utils/keycloakDiscovery'

import type { H3Event } from 'h3'
import {
  getQuery,
  getCookie,
  setCookie,
  deleteCookie,
  sendRedirect,
  setResponseStatus,
  getRequestURL,
  defineEventHandler,
} from 'h3'

import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../../../types'
import type { KeycloakTokenResponse } from '../../../../types/keycloak.types'

export default defineEventHandler(async (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions
  const discovery = await getKeycloakDiscovery(config)
  const query = getQuery(event)

  const code = query.code as string
  const state = query.state as string

  const storedState = getCookie(event, 'kc_state')
  const verifier = getCookie(event, 'kc_verifier')

  if (!code || !state || !storedState || state !== storedState || !verifier) {
    return sendRedirect(event, '/api/_oidc/login')
  }

  const usedCode = getCookie(event, 'kc_code_used')
  if (usedCode === code) {
    setResponseStatus(event, 204)
    return
  }

  setCookie(event, 'kc_code_used', code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60,
    path: '/',
  })
  const url = getRequestURL(event)

  const redirectUri = `${url.protocol}//${url.host}/api/_oidc/callback`

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
    const isProd = process.env.NODE_ENV === 'production'

    setCookie(event, 'kc_access', token.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: token.expires_in,
      path: '/',
    })

    setCookie(event, 'kc_refresh', token.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: token.refresh_expires_in,
      path: '/',
    })

    deleteCookie(event, 'kc_state')
    deleteCookie(event, 'kc_verifier')

    const userRedirectUri = getCookie(event, 'redirect_to') ?? ''

    deleteCookie(event, 'redirect_to')

    if (!userRedirectUri.startsWith('/')) {
      return sendRedirect(event, '/')
    }

    return sendRedirect(event, userRedirectUri)
  } catch {
    return sendRedirect(event, '/api/_oidc/login')
  }
})
