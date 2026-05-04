import { type H3Event, getCookie, getRequestURL, setCookie } from 'h3'
import { COOKIE_NAMES } from '../constants/cookies'
import { resolveCookieOptions } from './resolveCookieOptions'
import { getKeycloakConfig } from './getKeycloakConfig'

const REDIRECT_VALIDATION_BASE = 'https://app.local'

function hasControlCharacters(target: string): boolean {
  return [...target].some((character) => {
    const code = character.charCodeAt(0)

    return code <= 0x1f || code === 0x7f
  })
}

export function isSafeRedirectTarget(target: string): boolean {
  if (
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.startsWith('/\\') ||
    hasControlCharacters(target)
  ) {
    return false
  }

  const url = new URL(target, REDIRECT_VALIDATION_BASE)

  return !url.pathname.startsWith('/api')
}

// Stores the current URL as a short-lived redirect target cookie.
// This is used to return the user to their original page after authentication.
export function setRedirectCookie(event: H3Event, explicitTarget?: string) {
  // Do not overwrite an existing redirect target
  // → preserves the original navigation intent across multiple redirects
  if (getCookie(event, COOKIE_NAMES.REDIRECT_TO)) {
    return
  }

  const redirectTarget =
    explicitTarget ??
    (() => {
      const url = getRequestURL(event)

      // Combine pathname and query string (search)
      // → ensures query params (e.g. filters, tabs) are preserved
      return url.pathname + url.search
    })()

  // Only store relative application URLs.
  // → client-provided SPA targets must not become open redirects.
  if (!isSafeRedirectTarget(redirectTarget)) {
    return
  }
  const config = getKeycloakConfig()

  // Store redirect target in a secure, short-lived cookie
  setCookie(event, COOKIE_NAMES.REDIRECT_TO, redirectTarget, resolveCookieOptions(config, 300))
}
