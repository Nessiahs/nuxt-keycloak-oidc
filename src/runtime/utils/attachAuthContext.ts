import type { H3Event } from 'h3'

import type { KeycloakJwtToken } from '../../types/keycloak.types'

// Verifies the access token and attaches a basic auth context to the request.
// This function is intentionally framework-agnostic and relies only on the H3 event,
// making it fully testable and reusable outside of Nuxt-specific APIs.
export async function attachAuthContext(event: H3Event, payload: KeycloakJwtToken) {
  event.context.auth = {
    email: payload?.email,
  }

  // Extension point: allow consumers to customize the auth context
  // without coupling this module to specific identity provider structures
  await event.context.$keycloakHook?.({
    event,
    payload,
  })

  return true
}
