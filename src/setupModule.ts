import type { ResolvedModuleOptions } from './types'

type SetupOptions = Omit<ResolvedModuleOptions, 'enabled'>
// Validates and reports the final resolved configuration.
// This function is intentionally side-effectful (console output + throws)
// to provide clear feedback during module initialization.
export default function setupModule(config: SetupOptions) {
  // Create a sanitized version of the config for logging
  // (never expose sensitive values like clientSecret)
  const safeConfig = {
    url: config.url,
    realm: config.realm,
    clientId: config.clientId,
    clientSecret: config.clientSecret ? '***' : '∅',
  }

  const missing: string[] = []

  // Collect missing required fields
  // These are critical for OIDC to function correctly
  if (!config.url) missing.push('url')
  if (!config.realm) missing.push('realm')
  if (!config.clientId) missing.push('clientId')

  // Fail fast if required configuration is incomplete
  // Include sanitized config to improve debugging experience
  if (missing.length) {
    throw new Error(
      `[nuxt-keycloak] Missing required config: ${missing.join(', ')}\n` +
        `[nuxt-keycloak] Current config: ${JSON.stringify(safeConfig, null, 2)}`,
    )
  }

  // Log resolved (non-sensitive) configuration for visibility
  // Helps debugging especially when ENV overrides are involved
  console.info(
    '[nuxt-keycloak] Resolved configuration:\n' +
      `  🌐 url: ${config.url}\n` +
      `  🏰 realm: ${config.realm}\n` +
      `  🆔 clientId: ${config.clientId}\n` +
      `  🍪 cookie:\n` +
      `    • sameSite: ${config.cookie?.sameSite}\n` +
      `    • secure: ${config.cookie?.secure}\n` +
      `    • path: ${config.cookie?.path}\n` +
      `    • domain: ${config.cookie?.domain}`,
  )

  // Warn if sameSite is set to 'none' without secure=true
  // Browsers (especially Safari) require secure cookies for cross-site usage
  // Otherwise cookies may be silently dropped, leading to broken auth flows
  if (config.cookie.sameSite === 'none' && config.cookie.secure !== true) {
    console.warn(
      '[nuxt-keycloak] sameSite="none" requires secure=true (cookies may be dropped by browsers like Safari)',
    )
  }

  // Inform about security model based on selected mode
  // protect-selected → only explicit routes are protected (less secure)
  // protect-all → everything is protected by default (recommended)
  if (config.mode === 'protect-selected') {
    console.warn(
      '⚠️ [nuxt-keycloak] protect-selected mode active\n' +
        '⚠️ Only specified routes are protected – all others are public\n' +
        '⚠️ Ensure this is intended for your security model',
    )
  } else {
    console.info(
      'ℹ️ [nuxt-keycloak] protect-all mode active\n' +
        'ℹ️ Internal auth routes (/api/auth/*) remain public for authentication flow',
    )
  }

  // Warn if running without a client secret
  // This typically means a public client is used (less secure)
  if (!config.clientSecret) {
    console.warn(
      '⚠️ [nuxt-keycloak] No clientSecret configured\n' +
        '[nuxt-keycloak] Running in public client mode – ensure this is intended\n' +
        '[nuxt-keycloak] Current config: ' +
        JSON.stringify(
          {
            url: config.url || '∅',
            realm: config.realm || '∅',
            clientId: config.clientId || '∅',
            clientSecret: '∅',
          },
          null,
          2,
        ),
    )
  } else {
    // Log masked clientSecret to confirm presence without leaking it
    console.info(`🔐 [nuxt-keycloak] clientSecret configured (${maskSecret(config.clientSecret)})`)
  }
}

// Masks sensitive values before logging
// Keeps last 8 characters hidden (or fully masked if shorter)
function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length)
  }

  return `${secret.slice(0, -8)}${'*'.repeat(8)}`
}
