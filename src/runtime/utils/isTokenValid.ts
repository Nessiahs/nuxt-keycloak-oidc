import { verifyAccessToken } from './verifyAccessToken'

// Determines whether a given access token is still valid based on its expiration time.
// This function relies on verifyAccessToken for signature verification and payload extraction.
export async function isTokenValid(token: string) {
  try {
    // Verify token and extract payload (includes signature validation via JWKS)
    const payload = await verifyAccessToken(token)

    // If no payload or no expiration claim is present,
    // the token cannot be trusted → treat as invalid
    if (!payload?.exp) {
      return false
    }

    // The "exp" claim is defined in seconds since epoch (JWT standard),
    // while Date.now() returns milliseconds → convert exp to ms
    return payload.exp * 1000 > Date.now()
  } catch {
    // Any error during verification (invalid, malformed, expired, etc.)
    // results in an invalid token
    return false
  }
}
