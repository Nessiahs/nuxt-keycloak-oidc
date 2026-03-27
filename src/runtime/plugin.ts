import { defineNuxtPlugin } from '#app'
import type { H3Event } from 'h3'

// Context passed from middleware to the Nuxt hook system
// Contains the original request event and decoded token payload
type KeycloakHookContext = {
  event: H3Event
  payload: unknown
}

export default defineNuxtPlugin((nuxtApp) => {
  // Register hook placeholder to make the hook discoverable
  // Consumers can override this in their own plugins
  nuxtApp.hook('keycloak:auth:context', ({ event: _event, payload: _payload }) => {
    // user hook
  })

  return {
    provide: {
      // Bridge between Nitro (server middleware) and Nuxt hook system
      // Allows server-side code to trigger Nuxt hooks without direct dependency on nuxtApp
      keycloakHook: (ctx: KeycloakHookContext) => nuxtApp.callHook('keycloak:auth:context', ctx),
    },
  }
})
