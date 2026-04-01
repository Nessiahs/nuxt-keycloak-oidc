import type { H3Event } from 'h3'
import { createError, sendRedirect } from 'h3'
import { setRedirectCookie } from './setRedirectCookie'
import { OIDC_ROUTES } from '../constants/path'

// Handles unauthorized requests depending on request type:
//
// - API requests (non-HTML):
//   → immediately throw 401 (no redirect)
//
// - Browser requests (HTML):
//   → store redirect target and redirect to login endpoint
export function handleUnauthorized(event: H3Event, isHtml: boolean) {
  // Non-HTML requests (e.g. API, fetch)
  // → return proper HTTP error instead of redirect
  if (!isHtml) {
    throw createError({ statusCode: 401 })
  }

  // Persist original target for post-login redirect
  setRedirectCookie(event)

  // Redirect user to login flow
  return sendRedirect(event, OIDC_ROUTES.login)
}
