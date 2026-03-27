import type { ModuleOptions } from './types'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }
}

export {}
