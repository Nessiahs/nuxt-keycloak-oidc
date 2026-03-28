export interface ModuleOptions {
  enabled: boolean
  url?: string
  realm?: string
  clientId?: string
  clientSecret?: string
  mode?: 'protect-all' | 'protect-selected'
}

export interface ResolvedModuleOptions {
  enabled: boolean
  url: string
  realm: string
  clientId: string
  clientSecret?: string
  mode: 'protect-all' | 'protect-selected'
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }
}
