import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'

const {
  mockResolveTokenState,
  mockResolveRefreshTokenState,
  mockRefreshToken,
  mockVerifyAccessToken,
  mockAttachAuthContext,
  mockSetTokenCookie,
  mockGetHeader,
  mockSetRedirectCookie,
} = vi.hoisted(() => ({
  mockResolveTokenState: vi.fn(),
  mockResolveRefreshTokenState: vi.fn(),
  mockRefreshToken: vi.fn(),
  mockVerifyAccessToken: vi.fn(),
  mockAttachAuthContext: vi.fn(),
  mockSetTokenCookie: vi.fn(),
  mockGetHeader: vi.fn(),
  mockSetRedirectCookie: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  getHeader: mockGetHeader,
}))

vi.mock('../src/runtime/utils/resolveTokenState', () => ({
  resolveTokenState: mockResolveTokenState,
  resolveRefreshTokenState: mockResolveRefreshTokenState,
}))

vi.mock('../src/runtime/utils/refreshToken', () => ({
  refreshToken: mockRefreshToken,
}))

vi.mock('../src/runtime/utils/verifyAccessToken', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock('../src/runtime/utils/attachAuthContext', () => ({
  attachAuthContext: mockAttachAuthContext,
}))

vi.mock('../src/runtime/utils/tokenCookie', () => ({
  setTokenCookie: mockSetTokenCookie,
}))

vi.mock('../src/runtime/utils/setRedirectCookie', () => ({
  setRedirectCookie: mockSetRedirectCookie,
}))

describe('session endpoint', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    setKeycloakConfig({
      clientId: 'client',
      cookie: {
        sameSite: 'lax',
        path: '/',
      },
    })
    mockGetHeader.mockReturnValue(undefined)
  })

  it('returns authenticated session from a valid access token', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: true,
      hasRefresh: false,
      accessPayload: {
        sub: 'user-id',
        email: 'user@example.test',
        preferred_username: 'test',
      },
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler({} as any)).resolves.toEqual({
      authenticated: true,
      user: {
        sub: 'user-id',
        email: 'user@example.test',
        email_verified: undefined,
        name: undefined,
        preferred_username: 'test',
        given_name: undefined,
        family_name: undefined,
      },
    })
    expect(mockRefreshToken).not.toHaveBeenCalled()
  })

  it('returns unauthenticated session when no refresh token exists', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: false,
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler({} as any)).resolves.toEqual({
      authenticated: false,
      user: null,
    })
    expect(mockSetRedirectCookie).not.toHaveBeenCalled()
  })

  it('stores the requested SPA route before returning an unauthenticated session', async () => {
    const event = {} as any
    mockGetHeader.mockReturnValue('/dashboard?tab=profile#security')
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: false,
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler(event)).resolves.toEqual({
      authenticated: false,
      user: null,
    })
    expect(mockSetRedirectCookie).toHaveBeenCalledWith(event, '/dashboard?tab=profile#security')
  })

  it('returns unauthenticated session when refresh token validation fails', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: true,
    })
    mockResolveRefreshTokenState.mockResolvedValue({
      hasRefresh: false,
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler({} as any)).resolves.toEqual({
      authenticated: false,
      user: null,
    })
    expect(mockRefreshToken).not.toHaveBeenCalled()
  })

  it('returns unauthenticated session when token refresh fails', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: true,
    })
    mockResolveRefreshTokenState.mockResolvedValue({
      hasRefresh: true,
    })
    mockRefreshToken.mockResolvedValue(false)

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler({} as any)).resolves.toEqual({
      authenticated: false,
      user: null,
    })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
    expect(mockSetTokenCookie).not.toHaveBeenCalled()
  })

  it('refreshes the session and returns safe user data', async () => {
    const event = {} as any

    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: true,
    })
    mockResolveRefreshTokenState.mockResolvedValue({
      hasRefresh: true,
    })
    mockRefreshToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 300,
      refresh_expires_in: 3600,
    })
    mockVerifyAccessToken.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.test',
      preferred_username: 'test',
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler(event)).resolves.toEqual({
      authenticated: true,
      user: {
        sub: 'user-id',
        email: 'user@example.test',
        email_verified: undefined,
        name: undefined,
        preferred_username: 'test',
        given_name: undefined,
        family_name: undefined,
      },
    })
    expect(mockSetRedirectCookie).not.toHaveBeenCalled()
    expect(mockAttachAuthContext).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ sub: 'user-id' }),
    )
    expect(mockSetTokenCookie).toHaveBeenCalledWith(
      event,
      'kc_access',
      'new-access',
      expect.objectContaining({ clientId: 'client' }),
      300,
    )
    expect(mockSetTokenCookie).toHaveBeenCalledWith(
      event,
      'kc_refresh',
      'new-refresh',
      expect.objectContaining({ clientId: 'client' }),
      3600,
    )
  })

  it('does not overwrite refresh cookie when refresh response omits refresh_token', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: true,
    })
    mockResolveRefreshTokenState.mockResolvedValue({
      hasRefresh: true,
    })
    mockRefreshToken.mockResolvedValue({
      access_token: 'new-access',
      expires_in: 300,
    })
    mockVerifyAccessToken.mockResolvedValue({
      sub: 'user-id',
    })

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await handler({} as any)

    expect(mockSetTokenCookie).toHaveBeenCalledTimes(1)
    expect(mockSetTokenCookie).toHaveBeenCalledWith(
      expect.anything(),
      'kc_access',
      'new-access',
      expect.any(Object),
      300,
    )
  })

  it('returns unauthenticated session when refresh fails or returns invalid access token', async () => {
    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: true,
    })
    mockResolveRefreshTokenState.mockResolvedValue({
      hasRefresh: true,
    })
    mockRefreshToken.mockResolvedValue({
      access_token: 'new-access',
      expires_in: 300,
    })
    mockVerifyAccessToken.mockResolvedValue(null)

    const { default: handler } = await import('../src/runtime/server/api/_oidc/session.get')

    await expect(handler({} as any)).resolves.toEqual({
      authenticated: false,
      user: null,
    })
    expect(mockSetTokenCookie).not.toHaveBeenCalled()
  })
})
