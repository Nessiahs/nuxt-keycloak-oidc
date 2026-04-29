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

describe('verifyAccessToken', () => {
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

  it('verifies issuer, audience and clock tolerance on the normal path', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        azp: 'client',
        aud: 'client',
      },
    })

    const { verifyAccessToken } = await import('../src/runtime/utils/verifyAccessToken')

    const payload = await verifyAccessToken('token')

    expect(payload).toMatchObject({
      azp: 'client',
      aud: 'client',
    })

    expect(mockJwtVerify).toHaveBeenCalledWith('token', 'jwks', {
      issuer: 'https://keycloak.test/realms/test',
      audience: 'client',
      clockTolerance: 5,
    })
  })

  it('rejects tokens when jose rejects a non-matching audience', async () => {
    mockJwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'))

    const { verifyAccessToken } = await import('../src/runtime/utils/verifyAccessToken')

    await expect(verifyAccessToken('token')).resolves.toBeNull()
  })

  it('keeps the Keycloak azp guard', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        azp: 'other-client',
        aud: 'client',
      },
    })

    const { verifyAccessToken } = await import('../src/runtime/utils/verifyAccessToken')

    await expect(verifyAccessToken('token')).resolves.toBeNull()
  })

  it('validates audience on the key rotation retry path', async () => {
    mockJwtVerify
      .mockRejectedValueOnce(new JWKSNoMatchingKey('no matching key'))
      .mockResolvedValueOnce({
        payload: {
          azp: 'client',
          aud: 'client',
        },
      })

    const { verifyAccessToken } = await import('../src/runtime/utils/verifyAccessToken')

    await expect(verifyAccessToken('token')).resolves.toMatchObject({
      azp: 'client',
      aud: 'client',
    })

    expect(mockJwtVerify).toHaveBeenLastCalledWith('token', 'jwks', {
      issuer: 'https://keycloak.test/realms/test',
      audience: 'client',
      clockTolerance: 5,
    })
  })
})
