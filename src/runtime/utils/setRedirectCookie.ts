import { type H3Event, getCookie, getRequestURL, setCookie } from 'h3'

// Stores the current URL as a short-lived redirect target cookie.
// This is used to return the user to their original page after authentication.
export function setRedirectCookie(event: H3Event) {
  // Do not overwrite an existing redirect target
  // → preserves the original navigation intent across multiple redirects
  if (getCookie(event, 'redirect_to')) {
    return
  }

  const url = getRequestURL(event)

  // Ignore API routes
  // → prevents redirecting users to API endpoints after login
  if (url.pathname.startsWith('/api')) {
    return
  }

  // Combine pathname and query string (search)
  // → ensures query params (e.g. filters, tabs) are preserved
  const redirectTarget = url.pathname + url.search

  // Store redirect target in a secure, short-lived cookie
  setCookie(event, 'redirect_to', redirectTarget, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 300, // 5 minutes
    path: '/',
  })
}
