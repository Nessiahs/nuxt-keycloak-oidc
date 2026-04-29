import type { H3Event } from 'h3'
import { getCookie, setCookie } from 'h3'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { ResolvedModuleOptions } from '../../types'
import { resolveCookieOptions } from './resolveCookieOptions'

const SEALED_PREFIX = 'v1'
const CIPHER_ALGORITHM = 'aes-256-gcm'
const KDF_HASH_ALGORITHM = 'sha256'
const COOKIE_ENCODING = 'base64url'
const TEXT_ENCODING = 'utf8'
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

// Reads token cookies through the configured storage model.
// Without cookieSecret this intentionally stays backwards-compatible and returns
// the raw HttpOnly cookie value. With cookieSecret enabled, every pod can unseal
// the stateless cookie as long as it uses the same shared secret.
export function getTokenCookie(
  event: H3Event,
  name: string,
  config: ResolvedModuleOptions,
): string | undefined {
  const value = getCookie(event, name)

  if (!value) return
  if (!config.cookieSecret) return value

  return unsealTokenCookie(value, config.cookieSecret)
}

// Writes token cookies through the same stateless model used for reads.
// Sealing protects token contents at rest in the browser while avoiding a
// server-side session store, sticky sessions, or Kubernetes pod affinity.
export function setTokenCookie(
  event: H3Event,
  name: string,
  value: string,
  config: ResolvedModuleOptions,
  maxAge?: number,
) {
  const cookieValue = config.cookieSecret ? sealTokenCookie(value, config.cookieSecret) : value

  setCookie(event, name, cookieValue, resolveCookieOptions(config, maxAge))
}

// Cookie format: v1.<iv>.<authTag>.<ciphertext>
// AES-GCM provides authenticated encryption: tampering with any segment causes
// decryption to fail and the token is treated as missing.
export function sealTokenCookie(value: string, secret: string): string {
  // A fresh 96-bit IV is the recommended nonce size for GCM and must never be
  // reused with the same key. randomBytes keeps this stateless and cluster-safe.
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(CIPHER_ALGORITHM, deriveKey(secret), iv, {
    authTagLength: AUTH_TAG_BYTES,
  })

  const encrypted = Buffer.concat([cipher.update(value, TEXT_ENCODING), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    SEALED_PREFIX,
    iv.toString(COOKIE_ENCODING),
    tag.toString(COOKIE_ENCODING),
    encrypted.toString(COOKIE_ENCODING),
  ].join('.')
}

// Fails closed for malformed, tampered, or wrongly-keyed cookies. Callers then
// behave as if no valid token cookie exists, preventing sealed garbage from
// being forwarded to Keycloak.
export function unsealTokenCookie(value: string, secret: string): string | undefined {
  const [version, iv, tag, encrypted] = value.split('.')

  if (version !== SEALED_PREFIX || !iv || !tag || !encrypted) return

  try {
    const decipher = createDecipheriv(
      CIPHER_ALGORITHM,
      deriveKey(secret),
      Buffer.from(iv, COOKIE_ENCODING),
      { authTagLength: AUTH_TAG_BYTES },
    )

    decipher.setAuthTag(Buffer.from(tag, COOKIE_ENCODING))

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, COOKIE_ENCODING)),
      decipher.final(),
    ]).toString(TEXT_ENCODING)
  } catch {
    return undefined
  }
}

// Derives a stable 256-bit AES key from the configured runtime secret.
// This keeps configuration simple for Nuxt users: one shared secret string can
// be injected via NUXT_KEYCLOAK_COOKIE_SECRET across all instances.
function deriveKey(secret: string): Buffer {
  return createHash(KDF_HASH_ALGORITHM).update(secret).digest()
}
