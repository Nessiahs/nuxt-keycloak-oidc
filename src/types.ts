export interface ModuleOptions {
  enabled: boolean
  url?: string
  realm?: string
  clientId?: string
  clientSecret?: string
  mode?: 'protect-all' | 'protect-selected'
  protectedRoutes?: string[]
  publicRoutes?: string[]
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }
}
