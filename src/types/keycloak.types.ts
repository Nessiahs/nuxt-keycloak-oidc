import type { JWTPayload } from 'jose'

export interface KeycloakTokenResponse {
  access_token: string
  expires_in: number
  refresh_expires_in: number
  refresh_token: string
  token_type: 'Bearer'
  id_token?: string
  not_before_policy?: number
  session_state?: string
  scope?: 'openid' | string
}

export interface KeycloakJwtToken extends JWTPayload {
  iat?: number
  auth_time?: number

  jti?: string
  iss?: string
  sub?: string

  typ?: string
  azp?: string
  session_state?: string
  sid?: string

  acr?: string
  scope?: string

  'allowed-origins'?: string[]

  realm_access?: {
    roles: string[]
  }

  resource_access?: Record<
    string,
    {
      roles: string[]
    }
  >

  email_verified?: boolean

  email?: string
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
}
