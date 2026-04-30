import type { H3Event } from 'h3'
import { defineEventHandler } from 'h3'
import { COOKIE_NAMES } from '../../../constants/cookies'
import { attachAuthContext } from '../../../utils/attachAuthContext'
import { getKeycloakConfig } from '../../../utils/getKeycloakConfig'
import { refreshToken } from '../../../utils/refreshToken'
import { resolveRefreshTokenState, resolveTokenState } from '../../../utils/resolveTokenState'
import { setTokenCookie } from '../../../utils/tokenCookie'
import { toSessionUser } from '../../../utils/sessionUser'
import { verifyAccessToken } from '../../../utils/verifyAccessToken'
import type { KeycloakSessionResponse } from '../../../../types/keycloak.types'

const unauthenticatedSession: KeycloakSessionResponse = {
  authenticated: false,
  user: null,
}

export default defineEventHandler(async (event: H3Event): Promise<KeycloakSessionResponse> => {
  const config = getKeycloakConfig()
  const tokenState = await resolveTokenState(event)

  if (tokenState.hasAccess && tokenState.accessPayload) {
    return {
      authenticated: true,
      user: toSessionUser(tokenState.accessPayload),
    }
  }

  if (!tokenState.hasRefresh) {
    return unauthenticatedSession
  }

  const refreshState = await resolveRefreshTokenState(event)

  if (!refreshState.hasRefresh) {
    return unauthenticatedSession
  }

  const refreshed = await refreshToken(event)

  if (!refreshed?.access_token) {
    return unauthenticatedSession
  }

  const payload = await verifyAccessToken(refreshed.access_token)

  if (!payload) {
    return unauthenticatedSession
  }

  await attachAuthContext(event, payload)
  setTokenCookie(event, COOKIE_NAMES.ACCESS, refreshed.access_token, config, refreshed.expires_in)

  if (refreshed.refresh_token) {
    setTokenCookie(
      event,
      COOKIE_NAMES.REFRESH,
      refreshed.refresh_token,
      config,
      refreshed.refresh_expires_in,
    )
  }

  return {
    authenticated: true,
    user: toSessionUser(payload),
  }
})
