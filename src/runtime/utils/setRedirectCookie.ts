import { type H3Event, getCookie, getRequestURL, setCookie } from 'h3'
import { COOKIE_NAMES } from '../constants/cookies'
import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../types'
import { resolveCookieOptions } from './resolveCookieOptions'

// Stores the current URL as a short-lived redirect target cookie.
// This is used to return the user to their original page after authentication.
export function setRedirectCookie(event: H3Event) {
  // Do not overwrite an existing redirect target
  // → preserves the original navigation intent across multiple redirects
  if (getCookie(event, COOKIE_NAMES.REDIRECT_TO)) {
    return
  }

  const url = getRequestURL(event)

  // Ignore API routes
  // → prevents redirecting users to API endpoints after login
  if (url.pathname.startsWith('/api')) {
    return
  }
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  // Combine pathname and query string (search)
  // → ensures query params (e.g. filters, tabs) are preserved
  const redirectTarget = url.pathname + url.search

  // Store redirect target in a secure, short-lived cookie
  setCookie(event, COOKIE_NAMES.REDIRECT_TO, redirectTarget, resolveCookieOptions(config, 300))
}
