import {
  defineNuxtModule,
  addImportsDir,
  addPlugin,
  createResolver,
  addServerHandler,
} from '@nuxt/kit'
import type { ModuleOptions, ResolvedModuleOptions } from './types'
import setupModule from './setupModule'
import { OIDC_ROUTES } from './runtime/constants/path'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-keycloak-oidc',
    configKey: 'keycloak',
  },

  // Default module options (applied to `options` only, not runtimeConfig)
  defaults: {
    enabled: false,
    cookie: {
      sameSite: 'lax',
      path: '/',
    },
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
      cookieSecret: '',
      baseUrl: '',
      mode: 'protect-all',
      ...existing,
      cookie: {
        sameSite: undefined,
        secure: undefined,
        path: undefined,
        domain: undefined,
        ...(existing.cookie ?? {}),
      },
    }

    // Current runtime state (defaults + ENV + user runtimeConfig)
    const current = runtime.keycloak as Partial<ResolvedModuleOptions>

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
    runtime.keycloak = {
      ...runtimeOptions,
      cookie: {
        sameSite: runtimeOptions.cookie?.sameSite ?? 'lax',
        path: runtimeOptions.cookie?.path ?? '/',
        secure: runtimeOptions.cookie?.secure,
        domain: runtimeOptions.cookie?.domain,
      },
    }
    const resolvedConfig = runtime.keycloak as ResolvedModuleOptions
    // Validate and log configuration (security checks, warnings, etc.)
    setupModule(resolvedConfig)

    // Register runtime plugin
    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))
    addImportsDir(resolver.resolve('./runtime/composables'))

    addServerHandler({
      route: OIDC_ROUTES.login,
      handler: resolve(runtimeDir, 'server/api/_oidc/login.get'),
    })

    addServerHandler({
      route: OIDC_ROUTES.callback,
      handler: resolve(runtimeDir, 'server/api/_oidc/callback.get'),
    })

    addServerHandler({
      route: OIDC_ROUTES.logout,
      handler: resolve(runtimeDir, 'server/api/_oidc/logout.get'),
    })

    addServerHandler({
      route: OIDC_ROUTES.session,
      handler: resolve(runtimeDir, 'server/api/_oidc/session.get'),
    })

    addServerHandler({
      route: OIDC_ROUTES.debug,
      handler: resolve(runtimeDir, 'server/api/_oidc/debug.get'),
    })

    addServerHandler({
      middleware: true,
      handler: resolve(runtimeDir, 'server/middleware/auth'),
    })
  },
})
