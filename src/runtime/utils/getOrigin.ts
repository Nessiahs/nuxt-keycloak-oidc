import { getRequestURL, getHeaders, type H3Event } from 'h3'
import { HEADER_NAMES } from '../constants/headers'

export const getOrigin = (event: H3Event) => {
  const headers = getHeaders(event)
  const url = getRequestURL(event)

  const protocol = headers[HEADER_NAMES.X_FORWARDED_PROTO] || url.protocol.replace(':', '')
  const host = headers[HEADER_NAMES.X_FORWARDED_HOST] || url.host

  return `${protocol}://${host}`
}
