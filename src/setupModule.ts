import type { ModuleOptions } from './types'

export default function setupModule(config: ModuleOptions) {
  const safeConfig = {
    url: config.url || '∅',
    realm: config.realm || '∅',
    clientId: config.clientId || '∅',
    clientSecret: config.clientSecret ? '***' : '∅',
  }

  const missing: string[] = []

  if (!config.url) missing.push('url')
  if (!config.realm) missing.push('realm')
  if (!config.clientId) missing.push('clientId')

  if (missing.length) {
    throw new Error(
      `[nuxt-keycloak] Missing required config: ${missing.join(', ')}\n` +
        `[nuxt-keycloak] Current config: ${JSON.stringify(safeConfig, null, 2)}`,
    )
  }

  console.info('[nuxt-keycloak] Resolved configuration:', {
    url: config.url,
    realm: config.realm,
    clientId: config.clientId,
  })

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
    console.info(`🔐 [nuxt-keycloak] clientSecret configured (${maskSecret(config.clientSecret)})`)
  }
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length)
  }

  return `${secret.slice(0, -8)}${'*'.repeat(8)}`
}
