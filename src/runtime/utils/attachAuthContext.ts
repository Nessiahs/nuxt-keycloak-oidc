import type { H3Event } from 'h3'
import { verifyAccessToken } from './verifyAccessToken'

// Verifies the access token and attaches a basic auth context to the request.
// This function is intentionally framework-agnostic and relies only on the H3 event,
// making it fully testable and reusable outside of Nuxt-specific APIs.
export async function attachAuthContext(event: H3Event, accessToken: string) {
  try {
    // Validate and decode the access token (e.g. JWT)
    const payload = await verifyAccessToken(accessToken)

    // Attach a minimal default auth context
    // Consumers can extend or override this via the hook below
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
  } catch {
    // Token is invalid, expired, or malformed
    // Caller should treat this as an unauthenticated request
    return false
  }
}
