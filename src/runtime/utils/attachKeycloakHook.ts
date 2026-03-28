import { useNuxtApp } from '#app'
import type { H3Event } from 'h3'

// Attaches the user-defined Keycloak hook from the Nuxt app instance
// to the current request context.
//
// This allows runtime utilities (e.g. attachAuthContext) to invoke
// user-provided logic without directly depending on Nuxt internals.
export function attachKeycloakHook(event: H3Event) {
  const nuxtApp = useNuxtApp()

  // Expose hook on request context for downstream usage
  // (e.g. event.context.$keycloakHook?.({ event, payload }))
  event.context.$keycloakHook = nuxtApp.$keycloakHook
}
