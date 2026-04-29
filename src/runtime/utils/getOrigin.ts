import { getRequestURL, getHeaders, type H3Event } from 'h3'

export const getOrigin = (event: H3Event) => {
  const headers = getHeaders(event)
  const url = getRequestURL(event)

  const protocol = headers['x-forwarded-proto'] || url.protocol.replace(':', '')
  const host = headers['x-forwarded-host'] || url.host

  return `${protocol}://${host}`
}
