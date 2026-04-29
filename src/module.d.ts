import type { ModuleOptions } from './types'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }
}

declare module 'nitropack/types' {
  interface NitroRouteConfig {
    keycloak?: boolean
  }

  interface NitroRouteRules {
    keycloak?: boolean
  }
}

declare module 'nitropack' {
  interface NitroRouteConfig {
    keycloak?: boolean
  }

  interface NitroRouteRules {
    keycloak?: boolean
  }
}

export {}
