import type { KeycloakJwtToken } from '../../types/keycloak.types'
import { getKeycloakConfig } from './getKeycloakConfig'
import { verifyKeycloakToken } from './keycloakTokenVerifier'

// Verifies the access token using JWKS and returns the decoded payload
// Returns null if verification fails or token is not valid for this client
export function verifyAccessToken(token: string): Promise<KeycloakJwtToken | null> {
  return verifyKeycloakToken(token).then((payload) => {
    if (!payload) {
      return null
    }

    const config = getKeycloakConfig()

    // Ensure token is intended for this client (Keycloak-specific claim).
    // This prevents token reuse across Keycloak clients even when the token has
    // already passed standard issuer, signature and audience validation.
    if (payload.azp !== config.clientId) {
      return null
    }

    return payload
  })
}
