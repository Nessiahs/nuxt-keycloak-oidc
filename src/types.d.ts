import type { ModuleOptions, ResolvedModuleOptions } from './types'

declare module 'nuxt/schema' {
  // 👉 USER CONFIG (nuxt.config.ts)
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }

  // 👉 RUNTIME (after merge)
  interface RuntimeConfig {
    keycloak: ResolvedModuleOptions
  }
}
