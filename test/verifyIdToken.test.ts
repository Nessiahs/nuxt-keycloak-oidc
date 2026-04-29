import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'

const { mockCreateRemoteJWKSet, mockJwtVerify, mockGetKeycloakDiscovery, JWKSNoMatchingKey } =
  vi.hoisted(() => {
    class JWKSNoMatchingKey extends Error {}

    return {
      mockCreateRemoteJWKSet: vi.fn(() => 'jwks'),
      mockJwtVerify: vi.fn(),
      mockGetKeycloakDiscovery: vi.fn(),
      JWKSNoMatchingKey,
    }
  })

vi.mock('jose', () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
  jwtVerify: mockJwtVerify,
  errors: {
    JWKSNoMatchingKey,
  },
}))

vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: mockGetKeycloakDiscovery,
}))

describe('verifyIdToken', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    setKeycloakConfig({
      clientId: 'client',
    })

    mockGetKeycloakDiscovery.mockResolvedValue({
      issuer: 'https://keycloak.test/realms/test',
      jwks_uri: 'https://keycloak.test/realms/test/certs',
    })
  })

  it('verifies issuer, audience, clock tolerance and nonce', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user',
        aud: 'client',
        nonce: 'nonce123',
      },
    })

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    const payload = await verifyIdToken('id-token', 'nonce123')

    expect(payload).toMatchObject({
      sub: 'user',
      nonce: 'nonce123',
    })

    expect(mockJwtVerify).toHaveBeenCalledWith('id-token', 'jwks', {
      issuer: 'https://keycloak.test/realms/test',
      audience: 'client',
      clockTolerance: 5,
    })
  })

  it('rejects id tokens with a mismatched nonce', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        aud: 'client',
        nonce: 'other',
      },
    })

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    await expect(verifyIdToken('id-token', 'nonce123')).resolves.toBeNull()
  })

  it('rejects id tokens without a nonce claim', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        aud: 'client',
      },
    })

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    await expect(verifyIdToken('id-token', 'nonce123')).resolves.toBeNull()
  })

  it('rejects id tokens with a non-string nonce claim', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        aud: 'client',
        nonce: 123,
      },
    })

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    await expect(verifyIdToken('id-token', 'nonce123')).resolves.toBeNull()
  })

  it('rejects invalid id tokens', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid token'))

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    await expect(verifyIdToken('id-token', 'nonce123')).resolves.toBeNull()
  })

  it('retries id token validation after JWKS key rotation', async () => {
    mockJwtVerify
      .mockRejectedValueOnce(new JWKSNoMatchingKey('no matching key'))
      .mockResolvedValueOnce({
        payload: {
          sub: 'user',
          aud: 'client',
          nonce: 'nonce123',
        },
      })

    const { verifyIdToken } = await import('../src/runtime/utils/verifyIdToken')

    await expect(verifyIdToken('id-token', 'nonce123')).resolves.toMatchObject({
      sub: 'user',
      nonce: 'nonce123',
    })
  })
})
