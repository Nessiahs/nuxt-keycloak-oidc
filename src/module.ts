import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import type { ModuleOptions } from './types'
import setupModule from './setupModule'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-keycloak-oidc',
    configKey: 'keycloak',
  },

  // Default module options (applied to `options` only, not runtimeConfig)
  defaults: {
    enabled: false,
  },

  setup(options, nuxt) {
    // Early exit if module is disabled
    // No runtime configuration or middleware will be applied
    if (!options.enabled) {
      console.info('⚠️  [nuxt-keycloak-oidc] Module disabled – no page or API protection active')
      return
    }

    const runtime = nuxt.options.runtimeConfig

    // Existing runtimeConfig (can contain values from ENV or user-defined runtimeConfig)
    // We cast to Partial since runtimeConfig is loosely typed by Nuxt
    const existing = (runtime.keycloak || {}) as Partial<ModuleOptions>

    // Initialize runtimeConfig with defaults to ensure:
    // 1. All keys exist (required for Nuxt ENV mapping)
    // 2. ENV values can override defaults
    // 3. User-defined runtimeConfig is preserved
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

    // Current runtime state (defaults + ENV + user runtimeConfig)
    const current = runtime.keycloak as Partial<ModuleOptions>

    // Final merge strategy:
    // - runtimeConfig (ENV / external values)
    // - module options (user config in nuxt.config)
    // Module options take precedence over runtime values
    const runtimeOptions: ModuleOptions = {
      ...current,
      ...options,
    }

    // Persist final resolved configuration back into runtimeConfig
    // This becomes the single source of truth for plugins and middleware
    runtime.keycloak = { ...runtimeOptions }

    // Validate and log configuration (security checks, warnings, etc.)
    setupModule(runtimeOptions)

    // Register runtime plugin
    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
