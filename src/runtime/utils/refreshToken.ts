import { type H3Event, getCookie } from 'h3'
import type { KeycloakTokenResponse } from '../../types/keycloak.types'
import { getKeycloakDiscovery } from './keycloakDiscovery'
import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../types'
import { getHashKey } from './getHashKey'

// In-memory lock map to deduplicate concurrent refresh requests.
// Key = hashed refresh token, Value = in-flight refresh promise.
const refreshLocks = new Map<string, Promise<KeycloakTokenResponse | false>>()

export async function refreshToken(event: H3Event) {
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  // Resolve OIDC endpoints (cached internally)
  const discovery = await getKeycloakDiscovery(config)

  // Read refresh token from cookie
  const refresh = getCookie(event, 'kc_refresh')

  // No refresh token → cannot refresh session
  if (!refresh) return false

  // Derive a stable, non-sensitive key for locking (no raw token in memory)
  const hashKey = getHashKey(refresh, 'rt')

  // If a refresh for this token is already in progress,
  // reuse the existing promise instead of issuing a second request
  if (refreshLocks.has(hashKey)) {
    return refreshLocks.get(hashKey)!
  }

  // Build form-encoded request body for Keycloak token endpoint
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: refresh,
    // Only include client_secret for confidential clients
    ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
  })

  // Create the refresh request promise
  const promise = (async () => {
    try {
      // Perform token refresh against Keycloak
      return await $fetch<KeycloakTokenResponse>(discovery.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000, // prevent hanging requests
        body,
      })
    } catch {
      // Any failure is treated as invalid session / refresh failure
      return false
    } finally {
      // Always release lock (success or failure)
      // to avoid deadlocks and allow future retries
      refreshLocks.delete(hashKey)
    }
  })()

  // Store in-flight promise to deduplicate concurrent calls
  refreshLocks.set(hashKey, promise)

  return promise
}
