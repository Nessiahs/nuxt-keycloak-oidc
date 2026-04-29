import { timingSafeEqual } from 'node:crypto'
import type { KeycloakJwtToken } from '../../types/keycloak.types'
import { verifyKeycloakToken } from './keycloakTokenVerifier'

function matchesExpectedNonce(value: unknown, expected: string): boolean {
  if (typeof value !== 'string') return false

  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)

  return (
    valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer)
  )
}

// Validates the OIDC ID token returned by the authorization-code exchange.
// The nonce check binds the ID token to the browser login attempt that created
// the authorization request and rejects injected or replayed ID tokens.
export function verifyIdToken(
  token: string,
  expectedNonce: string,
): Promise<KeycloakJwtToken | null> {
  return verifyKeycloakToken(token).then((payload) => {
    if (!payload) {
      return null
    }

    // jose validates signature, issuer, audience and expiry. Nonce is an OIDC
    // login-flow claim and must be checked against the value stored before the
    // redirect to Keycloak.
    if (!matchesExpectedNonce(payload.nonce, expectedNonce)) {
      return null
    }

    return payload
  })
}
