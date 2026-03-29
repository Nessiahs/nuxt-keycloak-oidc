import { defineEventHandler, createError, getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ResolvedModuleOptions } from '../../../../types'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.keycloak as ResolvedModuleOptions

  // ---------------------------------------------------------------------------
  // SECURITY GUARD
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'development') {
    throw createError({ statusCode: 404 })
  }

  // ---------------------------------------------------------------------------
  // HELPER: detect source (env vs runtime)
  // ---------------------------------------------------------------------------
  const resolveSource = (key: string) => {
    const envKey = `NUXT_KEYCLOAK_${key.toUpperCase()}`
    if (process.env[envKey] !== undefined) return 'env'
    return 'runtime'
  }

  // ---------------------------------------------------------------------------
  // SANITIZE CONFIG (NO SECRETS)
  // ---------------------------------------------------------------------------
  const safeConfig = {
    ...config,
    clientSecret: config.clientSecret ? '***' : undefined,
  }

  // ---------------------------------------------------------------------------
  // CONFIG WITH SOURCE INFO
  // ---------------------------------------------------------------------------
  const configWithSource = Object.fromEntries(
    Object.entries(safeConfig).map(([key, value]) => [
      key,
      {
        value,
        source: resolveSource(key),
      },
    ]),
  )

  // ---------------------------------------------------------------------------
  // SESSION / COOKIE STATE
  // ---------------------------------------------------------------------------
  const cookies = {
    accessToken: !!getCookie(event, 'kc_access'),
    refreshToken: !!getCookie(event, 'kc_refresh'),
    state: !!getCookie(event, 'kc_state'),
    verifier: !!getCookie(event, 'kc_verifier'),
  }

  // ---------------------------------------------------------------------------
  // SECURITY INFO
  // ---------------------------------------------------------------------------
  const security = {
    sameSite: 'lax',
    cookiesSecure: true,
    pkce: true,
  }

  // ---------------------------------------------------------------------------
  // RESPONSE
  // ---------------------------------------------------------------------------
  return {
    module: 'nuxt-keycloak-oidc',

    config: configWithSource,

    runtime: {
      nodeEnv: process.env.NODE_ENV,
      mode: config.mode,
    },

    session: cookies,

    security,

    hints: {
      message: 'This endpoint is only available in dev mode.',
    },
  }
})
