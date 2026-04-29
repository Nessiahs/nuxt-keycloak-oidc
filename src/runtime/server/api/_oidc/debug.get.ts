import { defineEventHandler, createError, getCookie } from 'h3'
import { COOKIE_NAMES } from '../../../constants/cookies'
import { getKeycloakConfig } from '../../../utils/getKeycloakConfig'

export default defineEventHandler(async (event) => {
  const config = getKeycloakConfig()

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
    accessToken: !!getCookie(event, COOKIE_NAMES.ACCESS),
    refreshToken: !!getCookie(event, COOKIE_NAMES.REFRESH),
    state: !!getCookie(event, COOKIE_NAMES.STATE),
    verifier: !!getCookie(event, COOKIE_NAMES.VERIFIER),
  }

  // ---------------------------------------------------------------------------
  // SECURITY INFO
  // ---------------------------------------------------------------------------
  const security = {
    pkce: true,
  }

  const cookie = {
    ...config.cookie,
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

    cookie,
    security,

    hints: {
      message: 'This endpoint is only available in dev mode.',
    },
  }
})
