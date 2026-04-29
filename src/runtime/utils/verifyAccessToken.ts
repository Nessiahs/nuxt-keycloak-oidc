import { createRemoteJWKSet, jwtVerify, errors } from 'jose'
import { useRuntimeConfig } from '#imports'

import { getKeycloakDiscovery } from './keycloakDiscovery'
import type { KeycloakJwtToken } from '../../types/keycloak.types'
import type { ResolvedModuleOptions } from '../../types'

// Cached JWKS resolver (public keys) to avoid repeated network calls
// This improves performance and reduces pressure on the identity provider
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

// Cached issuer from OIDC discovery used for token validation
let issuer: string | undefined

// Determines whether a JWKS cache reset is required based on the error
// This is typically needed when:
// - keys have rotated on the identity provider
// - token uses a new algorithm not present in cached JWKS
function shouldResetJWKS(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return (
    error instanceof errors.JWKSNoMatchingKey ||
    error.message.includes('Unsupported "alg"') ||
    error.message.includes('no applicable key')
  )
}

// Clears cached JWKS and issuer so they can be re-fetched
// Used as part of the retry mechanism for key rotation scenarios
function resetJWKS() {
  jwks = null
  issuer = undefined
}

// Lazily initializes JWKS and issuer using OIDC discovery
// Ensures both values are fetched only once and reused across requests
async function getJWKS() {
  const config = useRuntimeConfig().keycloak as ResolvedModuleOptions
  const discovery = await getKeycloakDiscovery(config)

  // Create JWKS resolver once
  // The resolver internally selects the correct key based on token header (kid)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(discovery.jwks_uri))
  }

  // Cache issuer for validation
  if (!issuer) {
    issuer = discovery.issuer
  }

  return { jwks, issuer }
}

// Verifies the access token using JWKS and returns the decoded payload
// Returns null if verification fails or token is not valid for this client
export async function verifyAccessToken(token: string): Promise<KeycloakJwtToken | null> {
  const runtime = useRuntimeConfig()
  const config = runtime.keycloak as ResolvedModuleOptions

  try {
    const { jwks, issuer } = await getJWKS()

    // Verify token signature and issuer
    // jose automatically:
    // - selects correct key from JWKS
    // - validates signature
    // - validates issuer
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: config.clientId,
      clockTolerance: 5,
    })

    // Ensure token is intended for this client (Keycloak-specific claim)
    // Prevents token reuse across different clients
    if (payload.azp !== config.clientId) {
      return null
    }

    return payload as KeycloakJwtToken
  } catch (error) {
    // If error is unrelated to key rotation → fail fast
    if (!shouldResetJWKS(error)) {
      return null
    }

    // 🔥 Key rotation fallback:
    // Clear cached keys and retry verification once
    resetJWKS()

    try {
      const { jwks, issuer } = await getJWKS()

      // Retry verification with stricter validation
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: config.clientId, // standard OIDC audience validation
        clockTolerance: 5, // tolerate small clock drift between systems
      })

      if (payload.azp !== config.clientId) {
        return null
      }

      return payload as KeycloakJwtToken
    } catch {
      // Final failure → treat token as invalid
      return null
    }
  }
}
