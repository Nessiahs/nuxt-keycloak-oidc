import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import type { JWTVerifyOptions, JWTVerifyResult } from 'jose'

import type { KeycloakJwtToken } from '../../types/keycloak.types'
import { getKeycloakConfig } from './getKeycloakConfig'
import { getKeycloakDiscovery } from './keycloakDiscovery'

function createTokenVerifier(jwksUri: string) {
  const remoteJwks = createRemoteJWKSet(new URL(jwksUri))

  return {
    verify(token: string, options: JWTVerifyOptions): Promise<JWTVerifyResult> {
      return jwtVerify(token, remoteJwks, options)
    },
  }
}

// The module currently supports one resolved Keycloak configuration per Nuxt app.
// A process-local verifier cache is therefore scoped to that single realm and
// avoids repeated discovery/JWKS setup during token validation.
let tokenVerifier: ReturnType<typeof createTokenVerifier> | undefined
let issuer: string | undefined

function shouldResetTokenVerifier(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return (
    error instanceof errors.JWKSNoMatchingKey ||
    error.message.includes('Unsupported "alg"') ||
    error.message.includes('no applicable key')
  )
}

function resetTokenVerifier() {
  tokenVerifier = undefined
  issuer = undefined
}

async function getTokenVerifier(): Promise<{
  tokenVerifier: ReturnType<typeof createTokenVerifier>
  issuer: string | undefined
}> {
  const config = getKeycloakConfig()
  const discovery = await getKeycloakDiscovery(config)

  if (!tokenVerifier) {
    tokenVerifier = createTokenVerifier(discovery.jwks_uri)
  }

  if (!issuer) {
    issuer = discovery.issuer
  }

  return { tokenVerifier, issuer }
}

async function verifyTokenPayload(token: string): Promise<KeycloakJwtToken | null> {
  const config = getKeycloakConfig()
  const { tokenVerifier, issuer } = await getTokenVerifier()
  const { payload } = await tokenVerifier.verify(token, {
    issuer,
    audience: config.clientId,
    clockTolerance: 5,
  })

  return payload as KeycloakJwtToken
}

export function verifyKeycloakToken(token: string): Promise<KeycloakJwtToken | null> {
  return verifyTokenPayload(token).catch((error) => {
    if (!shouldResetTokenVerifier(error)) {
      return null
    }

    resetTokenVerifier()

    return verifyTokenPayload(token).catch(() => null)
  })
}
