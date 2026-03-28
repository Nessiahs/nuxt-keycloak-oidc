import type { H3Event } from 'h3'

declare module '#app' {
  interface RuntimeNuxtHooks {
    'keycloak:auth:context': (params: { event: H3Event; payload: unknown }) => void | Promise<void>
  }
}
