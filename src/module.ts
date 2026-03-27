import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import type { ModuleOptions } from './types'
import setupModule from './setupModule'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-keycloak-oidc',
    configKey: 'keycloak',
  },

  defaults: {
    enabled: false,
  },

  setup(options, nuxt) {
    if (!options.enabled) {
      console.info('⚠️  [nuxt-keycloak-oidc] Module disabled – no page or API protection active')
      return
    }
    const runtime = nuxt.options.runtimeConfig
    const existing = (runtime.keycloak || {}) as Partial<ModuleOptions>

    nuxt.options.runtimeConfig.keycloak = {
      url: '',
      realm: '',
      clientId: '',
      clientSecret: '',
      publicRoutes: [],
      protectedRoutes: [],
      mode: 'protect-all',
      ...existing,
    }

    const current = runtime.keycloak as Partial<ModuleOptions>

    const runtimeOptions: ModuleOptions = {
      ...current,
      ...options,
      publicRoutes: [...(current.publicRoutes || []), ...(options.publicRoutes || [])],
      protectedRoutes: [...(current.protectedRoutes || []), ...(options.protectedRoutes || [])],
    }

    runtime.keycloak = { ...runtimeOptions }

    setupModule(runtimeOptions)

    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
