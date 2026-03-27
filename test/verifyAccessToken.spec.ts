import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------- HOISTED MOCK ----------------
const { mockJwtVerify } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
}))

// ---------------- MOCKS ----------------
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    keycloak: {
      url: 'http://localhost:8080',
      realm: 'test',
      clientId: 'my-client',
    },
  }),
}))

vi.mock('jose', async () => {
  const actual: any = await vi.importActual('jose')

  return {
    ...actual,
    jwtVerify: mockJwtVerify,
    createRemoteJWKSet: vi.fn(() => 'jwks'),
    errors: {
      JWKSNoMatchingKey: class extends Error {},
    },
  }
})

vi.mock('../src/runtime/utils/keycloakDiscovery', () => ({
  getKeycloakDiscovery: vi.fn(async () => ({
    jwks_uri: 'http://jwks',
    issuer: 'issuer',
  })),
}))

// ---------------- TESTS ----------------
describe('verifyAccessToken', () => {
  let verifyAccessToken: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // dynamic import to ensure mocks are applied
    const mod = await import('../src/runtime/utils/verifyAccessToken')
    verifyAccessToken = mod.verifyAccessToken
  })

  // ---------------------------------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------------------------------
  it('verifies token successfully', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        azp: 'my-client',
        email: 'test@test.com',
      },
    })

    const result = await verifyAccessToken('token')

    expect(result).toMatchObject({
      azp: 'my-client',
      email: 'test@test.com',
    })

    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // WRONG CLIENT
  // ---------------------------------------------------------------------------
  it('returns null if azp does not match clientId', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        azp: 'other-client',
      },
    })

    const result = await verifyAccessToken('token')

    expect(result).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // VERIFY FAILURE (NO RESET)
  // ---------------------------------------------------------------------------
  it('returns null if verification fails with non-reset error', async () => {
    mockJwtVerify.mockRejectedValue(new Error('random error'))

    const result = await verifyAccessToken('token')

    expect(result).toBeNull()
    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // JWKS RESET + RETRY
  // ---------------------------------------------------------------------------
  it('retries verification after JWKS reset error', async () => {
    const { errors } = await import('jose')

    mockJwtVerify.mockRejectedValueOnce(new errors.JWKSNoMatchingKey()).mockResolvedValueOnce({
      payload: {
        azp: 'my-client',
      },
    })

    const result = await verifyAccessToken('token')

    expect(result).toMatchObject({
      azp: 'my-client',
    })

    expect(mockJwtVerify).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // RETRY FAILURE
  // ---------------------------------------------------------------------------
  it('returns null if retry also fails', async () => {
    const { errors } = await import('jose')

    mockJwtVerify
      .mockRejectedValueOnce(new errors.JWKSNoMatchingKey())
      .mockRejectedValueOnce(new Error('still failing'))

    const result = await verifyAccessToken('token')

    expect(result).toBeNull()
    expect(mockJwtVerify).toHaveBeenCalledTimes(2)
  })

  // ---------------------------------------------------------------------------
  // EDGE CASE: INVALID PAYLOAD
  // ---------------------------------------------------------------------------
  it('returns null if payload is missing azp', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {},
    })

    const result = await verifyAccessToken('token')

    expect(result).toBeNull()
  })
})
