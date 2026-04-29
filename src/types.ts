export interface ModuleOptions {
  enabled: boolean
  url?: string
  realm?: string
  clientId?: string
  clientSecret?: string
  baseUrl?: string
  mode?: 'protect-all' | 'protect-selected'
  cookie?: {
    sameSite?: 'lax' | 'none' | 'strict'
    secure?: boolean
    path?: string
    domain?: string
  }
}

export interface ResolvedModuleOptions {
  enabled: boolean
  url: string
  realm: string
  clientId: string
  clientSecret?: string
  baseUrl?: string
  mode: 'protect-all' | 'protect-selected'
  cookie: {
    sameSite: 'lax' | 'none' | 'strict'
    secure?: boolean
    path: string
    domain?: string
  }
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    keycloak?: ModuleOptions
  }

  interface NuxtOptions {
    keycloak?: ModuleOptions
  }
}
