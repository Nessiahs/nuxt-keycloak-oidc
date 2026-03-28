import { verifyAccessToken } from './verifyAccessToken'
import type { KeycloakJwtToken } from '../../types/keycloak.types'

export type TokenValidationResult = {
  valid: boolean
  payload?: KeycloakJwtToken
}

export async function validateToken(token: string): Promise<TokenValidationResult> {
  try {
    // Verify token signature and extract payload (trusted source)
    const payload = await verifyAccessToken(token)

    // Reject tokens with missing, invalid or non-positive expiration
    // - exp must be a number (JWT spec: seconds since epoch)
    // - exp <= 0 is considered invalid
    if (!payload || typeof payload.exp !== 'number' || payload.exp <= 0) {
      return { valid: false }
    }

    // Convert exp (seconds) → milliseconds and compare with current time
    const isValid = payload.exp * 1000 > Date.now()

    return {
      valid: isValid,
      // Only expose payload if token is still valid to avoid using stale data
      payload: isValid ? payload : undefined,
    }
  } catch {
    // Any verification error (invalid signature, malformed token, etc.)
    // results in an invalid token
    return { valid: false }
  }
}
