export const HEADER_NAMES = {
  CLIENT_ROUTE: 'x-keycloak-route',
  CONTENT_TYPE: 'Content-Type',
  X_FORWARDED_HOST: 'x-forwarded-host',
  X_FORWARDED_PROTO: 'x-forwarded-proto',
} as const

export const HEADER_VALUES = {
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
} as const
