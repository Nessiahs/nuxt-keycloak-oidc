import type { KeycloakJwtToken, KeycloakSessionUser } from '../../types/keycloak.types'

// Keep the session endpoint intentionally small and token-free.
// Applications that need roles or custom claims should map them server-side through
// the auth context hook and expose only their own normalized safe data.
export function toSessionUser(payload: KeycloakJwtToken): KeycloakSessionUser {
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    preferred_username: payload.preferred_username,
    given_name: payload.given_name,
    family_name: payload.family_name,
  }
}
