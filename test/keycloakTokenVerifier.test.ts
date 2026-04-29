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

describe('verifyKeycloakToken', () => {
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

  it('verifies tokens with issuer, audience and clock tolerance', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user',
        aud: 'client',
      },
    })

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toMatchObject({
      sub: 'user',
      aud: 'client',
    })

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://keycloak.test/realms/test/certs'),
    )
    expect(mockJwtVerify).toHaveBeenCalledWith('token', 'jwks', {
      issuer: 'https://keycloak.test/realms/test',
      audience: 'client',
      clockTolerance: 5,
    })
  })

  it('reuses the cached verifier for subsequent validations', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        aud: 'client',
      },
    })

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await verifyKeycloakToken('first-token')
    await verifyKeycloakToken('second-token')

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1)
    expect(mockJwtVerify).toHaveBeenCalledTimes(2)
  })

  it('returns null for validation errors that do not require a verifier reset', async () => {
    mockJwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'))

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toBeNull()

    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1)
  })

  it('returns null for non-error validation rejections', async () => {
    mockJwtVerify.mockRejectedValue('invalid token')

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toBeNull()

    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1)
  })

  it('returns null when discovery fails', async () => {
    mockGetKeycloakDiscovery.mockRejectedValue(new Error('discovery failed'))

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toBeNull()

    expect(mockCreateRemoteJWKSet).not.toHaveBeenCalled()
    expect(mockJwtVerify).not.toHaveBeenCalled()
  })

  it('resets the cached verifier and retries once after key rotation', async () => {
    mockJwtVerify
      .mockRejectedValueOnce(new JWKSNoMatchingKey('no matching key'))
      .mockResolvedValueOnce({
        payload: {
          sub: 'user',
          aud: 'client',
        },
      })

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toMatchObject({
      sub: 'user',
      aud: 'client',
    })

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2)
    expect(mockJwtVerify).toHaveBeenCalledTimes(2)
  })

  it.each(['Unsupported "alg"', 'no applicable key'])(
    'resets the cached verifier and retries when jose reports %s',
    async (message) => {
      mockJwtVerify.mockRejectedValueOnce(new Error(message)).mockResolvedValueOnce({
        payload: {
          sub: 'user',
          aud: 'client',
        },
      })

      const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

      await expect(verifyKeycloakToken('token')).resolves.toMatchObject({
        sub: 'user',
        aud: 'client',
      })

      expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2)
      expect(mockJwtVerify).toHaveBeenCalledTimes(2)
    },
  )

  it('returns null when the key rotation retry also fails', async () => {
    mockJwtVerify
      .mockRejectedValueOnce(new JWKSNoMatchingKey('no matching key'))
      .mockRejectedValueOnce(new Error('invalid token'))

    const { verifyKeycloakToken } = await import('../src/runtime/utils/keycloakTokenVerifier')

    await expect(verifyKeycloakToken('token')).resolves.toBeNull()

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2)
    expect(mockJwtVerify).toHaveBeenCalledTimes(2)
  })
})
