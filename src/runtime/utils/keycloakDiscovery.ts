import type { ModuleOptions } from '../../types'
import { createError } from 'h3'

// Minimal subset of the OpenID Connect discovery document
// required for authentication and token verification
type OIDCDiscovery = {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  end_session_endpoint: string
  jwks_uri: string
  issuer: string
}

// Cached discovery document to avoid repeated network calls
let cachedDiscovery: OIDCDiscovery | null = null

// In-flight request promise to prevent duplicate parallel fetches
// (request deduplication / "single flight" pattern)
let discoveryPromise: Promise<OIDCDiscovery> | null = null

export async function getKeycloakDiscovery(config: ModuleOptions) {
  // Return cached discovery if already resolved
  if (cachedDiscovery) {
    return cachedDiscovery
  }

  // If a request is already in progress, reuse it
  if (discoveryPromise) {
    return discoveryPromise
  }

  // Normalize base URL to avoid double slashes
  const base = config.url!.replace(/\/$/, '')

  // Construct OIDC discovery endpoint
  const url = `${base}/realms/${config.realm}/.well-known/openid-configuration`

  // Fetch discovery document and cache result
  discoveryPromise = $fetch<OIDCDiscovery>(url)
    .then((discovery) => {
      // Store resolved discovery for subsequent calls
      cachedDiscovery = discovery
      return discovery
    })
    .catch(() => {
      // Reset promise so future calls can retry
      discoveryPromise = null

      // Surface a meaningful server error
      throw createError({
        status: 503,
        name: 'AutodiscoveryNotAvailable',
        message: `Failed to fetch OIDC discovery from ${url}`,
      })
    })

  return discoveryPromise
}

export function __resetDiscoveryCache() {
  cachedDiscovery = null
  discoveryPromise = null
}
