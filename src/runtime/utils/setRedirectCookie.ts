import type { H3Event } from 'h3'

export function setRedirectCookie(event: H3Event) {
  if (getCookie(event, 'redirect_to')) {
    return
  }

  const url = getRequestURL(event)

  if (url.pathname.startsWith('/api')) {
    return
  }

  const redirectTarget = url.pathname + url.search

  setCookie(event, 'redirect_to', redirectTarget, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 300,
    path: '/',
  })
}
