import type { H3Event } from 'h3'
import { createError, setCookie } from 'h3'
import { refreshToken } from './refreshToken'
import { verifyAccessToken } from './verifyAccessToken'
import { attachAuthContext } from './attachAuthContext'
import { COOKIE_NAMES } from '../constants/cookies'
import type { ResolvedModuleOptions } from '../../types'
import { resolveCookieOptions } from './resolveCookieOptions'

// Handles token refresh flow:
// - attempts refresh using refresh_token
// - verifies new access token
// - updates cookies
// - attaches auth context
//
// Returns:
// - true  → refresh successful, request can proceed
// - false → refresh failed (HTML flow → redirect handled by caller)
//
// Throws:
// - 401 error for non-HTML requests (API)
export async function handleRefreshFlow(
  event: H3Event,
  isHtml: boolean,
  config: ResolvedModuleOptions,
): Promise<boolean> {
  // Attempt to refresh tokens via IdP
  const refreshed = await refreshToken(event)

  // Refresh failed or no access token returned
  if (!refreshed || !refreshed.access_token) {
    // API requests → hard fail with 401
    if (!isHtml) throw createError({ statusCode: 401 })

    // HTML requests → let caller handle redirect
    return false
  }

  // Verify the new access token (signature + payload)
  const payload = await verifyAccessToken(refreshed.access_token)

  // Invalid token after refresh → treat as failure
  if (!payload) {
    if (!isHtml) throw createError({ statusCode: 401 })
    return false
  }

  // Attach fresh auth context (based on NEW token)
  // → ensures updated roles/claims are immediately available
  await attachAuthContext(event, payload)

  // Update access token cookie
  setCookie(
    event,
    COOKIE_NAMES.ACCESS,
    refreshed.access_token,
    resolveCookieOptions(config, refreshed.expires_in),
  )

  // Update refresh token cookie only if provided
  // → avoids overwriting with undefined
  if (refreshed.refresh_token) {
    setCookie(
      event,
      COOKIE_NAMES.REFRESH,
      refreshed.refresh_token,
      resolveCookieOptions(config, refreshed.refresh_expires_in),
    )
  }

  return true
}
